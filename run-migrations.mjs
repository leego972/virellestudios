import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

/**
 * Production-safe MySQL migration runner.
 *
 * The production database contains legitimate schema changes that were applied
 * before Drizzle's migration journal became authoritative. This runner repairs
 * that mismatch without deleting data. It executes real SQL statements one at
 * a time, tolerates only narrowly-defined "already applied" DDL conflicts, and
 * records a migration only after every statement has completed safely.
 */

const DATABASE_URL = process.env.DATABASE_URL;
const MIGRATIONS_DIR = path.resolve(process.cwd(), "drizzle");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
const MIGRATION_LOCK = "virelle_schema_migrations";

if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}

function normaliseStatement(statement) {
  return statement
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, " ")
    .replace(/^\s*#.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Split a migration file on semicolons that are outside strings, identifiers,
 * and comments. Some historical migration files contain several SQL commands
 * without Drizzle's statement-breakpoint marker, so splitting on that marker
 * alone sends invalid multi-command SQL to mysql2.
 */
function splitSqlStatements(sqlText) {
  const statements = [];
  let buffer = "";
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sqlText.length; index += 1) {
    const char = sqlText[index];
    const next = sqlText[index + 1];

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false;
        buffer += "\n";
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
        buffer += " ";
      }
      continue;
    }

    if (quote) {
      buffer += char;

      if (char === "\\" && index + 1 < sqlText.length) {
        buffer += sqlText[index + 1];
        index += 1;
        continue;
      }

      // SQL escapes quote characters by doubling them: '' / "" / ``.
      if (char === quote && next === quote) {
        buffer += next;
        index += 1;
        continue;
      }

      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      index += 1;
      buffer += " ";
      continue;
    }

    // MySQL requires whitespace after -- for a comment. Drizzle's
    // --> statement-breakpoint marker also matches this rule.
    if (char === "-" && next === "-" && /\s|>/.test(sqlText[index + 2] || "")) {
      inLineComment = true;
      index += 1;
      buffer += " ";
      continue;
    }

    if (char === "#") {
      inLineComment = true;
      buffer += " ";
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === ";") {
      const statement = buffer.trim();
      if (statement) statements.push(statement);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  const trailingStatement = buffer.trim();
  if (trailingStatement) statements.push(trailingStatement);
  return statements;
}

function splitTopLevelCommas(value) {
  const parts = [];
  let buffer = "";
  let quote = null;
  let parentheses = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (quote) {
      buffer += char;
      if (char === "\\" && index + 1 < value.length) {
        buffer += value[index + 1];
        index += 1;
        continue;
      }
      if (char === quote && next === quote) {
        buffer += next;
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === "(") parentheses += 1;
    if (char === ")" && parentheses > 0) parentheses -= 1;

    if (char === "," && parentheses === 0) {
      const part = buffer.trim();
      if (part) parts.push(part);
      buffer = "";
      continue;
    }

    buffer += char;
  }

  const trailingPart = buffer.trim();
  if (trailingPart) parts.push(trailingPart);
  return parts;
}

/**
 * A combined ALTER TABLE can contain several ADD COLUMN operations. If one
 * column already exists, MySQL rejects the complete ALTER and none of the other
 * missing columns are added. On that specific conflict, retry each top-level
 * ALTER action separately so existing columns are skipped while missing ones
 * are still created.
 */
function expandCombinedAlterTable(statement) {
  const match = statement.match(
    /^\s*(ALTER\s+TABLE\s+(?:(?:`(?:``|[^`])+`|[A-Za-z0-9_$]+)(?:\s*\.\s*(?:`(?:``|[^`])+`|[A-Za-z0-9_$]+))?))\s+([\s\S]+?)\s*$/i,
  );
  if (!match) return [statement];

  const [, prefix, actionsText] = match;
  const actions = splitTopLevelCommas(actionsText);
  if (actions.length <= 1) return [statement];
  return actions.map((action) => `${prefix} ${action}`);
}

function isSafelyReconcilableDdlError(statement, error) {
  const sql = normaliseStatement(statement);
  const code = String(error?.code || "");
  const errno = Number(error?.errno);

  if ((code === "ER_TABLE_EXISTS_ERROR" || errno === 1050) && /^CREATE TABLE\b/.test(sql)) {
    return true;
  }

  if ((code === "ER_DUP_FIELDNAME" || errno === 1060) && /^ALTER TABLE\b/.test(sql) && /\bADD\b/.test(sql)) {
    return true;
  }

  if (
    (code === "ER_DUP_KEYNAME" || errno === 1061) &&
    (/^CREATE (UNIQUE )?INDEX\b/.test(sql) || (/^ALTER TABLE\b/.test(sql) && /\bADD\b/.test(sql)))
  ) {
    return true;
  }

  if (
    (code === "ER_FK_DUP_NAME" || errno === 1826) &&
    /^ALTER TABLE\b/.test(sql) &&
    /\bADD\b/.test(sql) &&
    /\b(CONSTRAINT|FOREIGN KEY)\b/.test(sql)
  ) {
    return true;
  }

  if (
    (code === "ER_MULTIPLE_PRI_KEY" || errno === 1068) &&
    /^ALTER TABLE\b/.test(sql) &&
    /\bADD\s+PRIMARY KEY\b/.test(sql)
  ) {
    return true;
  }

  if (
    (code === "ER_CANT_DROP_FIELD_OR_KEY" || errno === 1091) &&
    /^ALTER TABLE\b/.test(sql) &&
    /\bDROP\b/.test(sql)
  ) {
    return true;
  }

  if ((code === "ER_BAD_TABLE_ERROR" || errno === 1051) && /^DROP TABLE\b/.test(sql)) {
    return true;
  }

  return false;
}

async function executeStatement(connection, statement) {
  try {
    await connection.query(statement);
    return 0;
  } catch (error) {
    const expandedStatements = expandCombinedAlterTable(statement);

    if (
      expandedStatements.length > 1 &&
      isSafelyReconcilableDdlError(statement, error)
    ) {
      console.warn(
        `[migrate] Combined ALTER encountered ${error.code || error.errno}; ` +
        `retrying ${expandedStatements.length} actions separately.`,
      );
      let reconciled = 0;
      for (const expandedStatement of expandedStatements) {
        reconciled += await executeStatement(connection, expandedStatement);
      }
      return reconciled;
    }

    if (isSafelyReconcilableDdlError(statement, error)) {
      console.warn(
        `[migrate] Schema operation is already applied (${error.code || error.errno}); continuing.`,
      );
      return 1;
    }

    throw error;
  }
}

async function main() {
  let connection;
  let lockAcquired = false;

  try {
    connection = await mysql.createConnection({
      uri: DATABASE_URL,
      ssl: process.env.DATABASE_CA_CERT
        ? { ca: process.env.DATABASE_CA_CERT }
        : { rejectUnauthorized: false },
    });

    const [lockRows] = await connection.query(
      "SELECT GET_LOCK(?, 60) AS acquired",
      [MIGRATION_LOCK],
    );
    lockAcquired = Number(lockRows?.[0]?.acquired) === 1;
    if (!lockAcquired) {
      throw new Error("Could not acquire the database migration lock within 60 seconds.");
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`hash\` TEXT NOT NULL,
        \`created_at\` BIGINT NOT NULL
      )
    `);

    const journal = JSON.parse(await fs.readFile(JOURNAL_PATH, "utf8"));
    const entries = Array.isArray(journal?.entries)
      ? [...journal.entries].sort((a, b) => Number(a.idx) - Number(b.idx))
      : [];

    if (entries.length === 0) {
      throw new Error(`No migration entries were found in ${JOURNAL_PATH}.`);
    }

    const [appliedRows] = await connection.query(
      "SELECT `hash`, `created_at` FROM `__drizzle_migrations`",
    );
    const appliedHashes = new Set(appliedRows.map((row) => String(row.hash)));
    const appliedTimes = new Set(appliedRows.map((row) => String(row.created_at)));

    let appliedCount = 0;
    let skippedCount = 0;
    let reconciledStatements = 0;

    console.log(`[migrate] Checking ${entries.length} migrations from ./drizzle ...`);

    for (const entry of entries) {
      const migrationPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      const sqlText = await fs.readFile(migrationPath, "utf8");
      const hash = crypto.createHash("sha256").update(sqlText).digest("hex");
      const createdAt = String(entry.when);

      if (appliedHashes.has(hash) || appliedTimes.has(createdAt)) {
        skippedCount += 1;
        continue;
      }

      const statements = splitSqlStatements(sqlText);
      if (statements.length === 0) {
        throw new Error(`Migration ${entry.tag} contains no executable SQL statements.`);
      }

      console.log(`[migrate] Applying ${entry.tag} (${statements.length} statements) ...`);

      for (let index = 0; index < statements.length; index += 1) {
        const statement = statements[index];
        try {
          reconciledStatements += await executeStatement(connection, statement);
        } catch (error) {
          console.error(`[migrate] Failed migration: ${entry.tag}`);
          console.error(`[migrate] Failed statement ${index + 1}/${statements.length}:`, statement);
          throw error;
        }
      }

      await connection.execute(
        "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
        [hash, Number(entry.when)],
      );
      appliedHashes.add(hash);
      appliedTimes.add(createdAt);
      appliedCount += 1;
    }

    console.log(
      `[migrate] Schema is up to date. Applied=${appliedCount}, ` +
      `skipped=${skippedCount}, reconciled=${reconciledStatements}.`,
    );
  } finally {
    if (connection && lockAcquired) {
      await connection.query("SELECT RELEASE_LOCK(?)", [MIGRATION_LOCK]).catch(() => {});
    }
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error("[migrate] Migration failed:", error?.message || error);
  if (error?.code) console.error("[migrate] Error code:", error.code);
  if (error?.errno) console.error("[migrate] Error number:", error.errno);
  if (error?.sqlMessage) console.error("[migrate] Database error:", error.sqlMessage);
  process.exitCode = 1;
});
