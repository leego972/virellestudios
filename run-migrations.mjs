/**
 * run-migrations.mjs
 * -----------------------------------------------------------------------------
 * Applies every migration in drizzle/ against DATABASE_URL, in order, tracked
 * in a __drizzle_migrations table so it's safe to run on every boot -- already
 * applied migrations are skipped automatically.
 *
 * This exists because autoMigrate.ts's runtime ALTER/CREATE logic assumes core
 * tables (users, projects, etc.) already exist -- it was never a bootstrap
 * mechanism for a genuinely empty database. This script is.
 * -----------------------------------------------------------------------------
 */
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}

let connection;

try {
  connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: process.env.DATABASE_CA_CERT
      ? { ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
  });

  const db = drizzle(connection);

  console.log("[migrate] Applying pending migrations from ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Schema is up to date.");
  process.exit(0);
} catch (err) {
  // Connection failures and migration failures both land here now -- neither
  // can crash the process as an unhandled rejection anymore.
  console.error("[migrate] Migration failed:", err.message);
  if (err.code) console.error("[migrate] Error code:", err.code);
  if (err.cause) console.error("[migrate] Underlying database error:", err.cause.message || err.cause);
  process.exit(1);
} finally {
  if (connection) {
    await connection.end().catch(() => {});
  }
}
