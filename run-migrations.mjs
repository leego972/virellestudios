/**
 * run-migrations.mjs
 * -----------------------------------------------------------------------------
 * Applies every migration in drizzle/ against DATABASE_URL, in order, tracked
 * in a __drizzle_migrations table so it's safe to run on every boot -- already
 applied migrations are skipped automatically.
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

const connection = await mysql.createConnection({
  uri: DATABASE_URL,
  ssl: process.env.DATABASE_CA_CERT
    ? { ca: process.env.DATABASE_CA_CERT }
    : { rejectUnauthorized: false },
});

const db = drizzle(connection);

try {
  console.log("[migrate] Applying pending migrations from ./drizzle ...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] Schema is up to date.");
  process.exit(0);
} catch (err) {
  console.error("[migrate] Migration failed:", err.message);
  process.exit(1);
} finally {
  await connection.end();
}
