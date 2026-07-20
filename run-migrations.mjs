import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

/**
 * Production-safe MySQL migration runner.
 *
 * Why this exists:
 * - The production database can contain schema changes that were applied by the
 *   legacy runtime auto-migrator while Drizzle's migration journal was not
 *   updated.
 * - Re-running a strict Drizzle migration then fails on harmless conflicts such
 *   as "duplicate column", preventing the application from starting.
 *
 * This runner reconciles that state without deleting data:
 * - honours the existing __drizzle_migrations journal;
 * - applies only migrations that are not recorded;
 * - executes each statement separately;
 * - ignores only narrowly-defined, already-applied DDL conflicts;
 * - records a migration only after every statement succeeds or is safely
 *   confirmed as already present.
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
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isSafelyReconcilableDdlError(statement, error) {
  const sql = normaliseStatement(statement);
  const code = String(error?.code || "");
  const errno = Number(error?.errno);

  // Existing table: safe only for CREATE TABLE.
  if ((code === "ER_TABLE_EXISTS_ERROR" || errno === 1050) && /^CREATE TABLE\b/.test(sql)) {
    return true;
  }

  // Existing column: safe only for ALTER TABLE ... ADD.
  if ((code === "ER_DUP_FIELDNAME" || errno === 1060) && /^ALTER TABLE\b/.test(sql) && /\bADD\b/.test(sql)) {
    return true;
  }

  // Existing index/key name: safe only while creating or adding an index/key.
  if (
    (code === "ER_DUP_KEYNAME" || errno === 1061) &&
    (/^CREATE (UNIQUE )?INDEX\b/.test(sql) || (/^ALTER TABLE\b/.test(sql) && /\bADD\b/.test(sql)))
  ) {
    return true;
  }

  // Existing foreign-key constraint name.
  if (
    (code === "ER_FK_DUP_NAME" || errno === 1826) &&
    /^ALTER TABLE\b/.test(sql) &&
    /\bADD\b/.test(sql) &&
    /\b(CONSTRAINT|FOREIGN KEY)\b/.test(sql)
  ) {
    return true;
  }

  // Primary key already exists.
  if (
    (code === "ER_MULTIPLE_PRI_KEY" || errno === 1068) &&
    /^ALTER TABLE\b/.test(sql) &&
    /\bADD\s+PRIMARY KEY\b/.test(sql)
  ) {
    return true;
  }

  // Object was already removed by an earlier/manual schema repair.
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

      // Drizzle identifies applied migrations by timestamp ordering. Checking both
      // timestamp and hash also tolerates historical files whose hash changed after
      // the production schema had already been applied.
      if (appliedHashes.has(hash) || appliedTimes.has(createdAt)) {
        skippedCount += 1;
        continue;
      }

      const statements = sqlText
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      console.log(`[migrate] Applying ${entry.tag} (${statements.length} statements) ...`);

      for (let index = 0; index < statements.length; index += 1) {
        const statement = statements[index];
        try {
          await connection.query(statement);
        } catch (error) {
          if (isSafelyReconcilableDdlError(statement, error)) {
            reconciledStatements += 1;
            console.warn(
              `[migrate] ${entry.tag} statement ${index + 1}/${statements.length} ` +
              `already applied (${error.code || error.errno}); continuing.`,
            );
            continue;
          }

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
