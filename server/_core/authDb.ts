import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

/**
 * Authentication must remain available even while optional application columns
 * are being added to an older production database. Drizzle's generated
 * `select().from(users)` enumerates every column declared in schema.ts, so one
 * missing optional column makes login and session restoration fail before the
 * password is even checked.
 *
 * Auth uses SELECT * deliberately: MySQL returns the columns that actually
 * exist, while the core identity fields remain stable across every Virelle
 * schema version.
 */

export type AuthUserRow = RowDataPacket & {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  passwordHash?: string | null;
  loginMethod?: string | null;
  role: "user" | "admin";
  accountExpiresAt?: Date | string | null;
  passwordChangedAt?: Date | string | null;
  [key: string]: unknown;
};

let authPool: Pool | null = null;

function getAuthPool(): Pool {
  if (authPool) return authPool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  authPool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0,
    enableKeepAlive: true,
    ssl: process.env.DATABASE_CA_CERT
      ? { ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
  });

  return authPool;
}

function firstRow(rows: RowDataPacket[]): AuthUserRow | null {
  return rows.length > 0 ? (rows[0] as AuthUserRow) : null;
}

export async function findAuthUserByEmail(email: string): Promise<AuthUserRow | null> {
  const pool = getAuthPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM `users` WHERE LOWER(`email`) = LOWER(?) LIMIT 1",
    [email.trim()],
  );
  return firstRow(rows);
}

export async function findSessionUserById(userId: number): Promise<AuthUserRow | null> {
  const pool = getAuthPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM `users` WHERE `id` = ? LIMIT 1",
    [userId],
  );
  return firstRow(rows);
}

export async function findSessionUserByOpenId(openId: string): Promise<AuthUserRow | null> {
  const pool = getAuthPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM `users` WHERE `openId` = ? LIMIT 1",
    [openId],
  );
  return firstRow(rows);
}

export async function markAuthLoginSuccessful(userId: number): Promise<void> {
  const pool = getAuthPool();
  await pool.execute(
    "UPDATE `users` SET `lastSignedIn` = NOW() WHERE `id` = ?",
    [userId],
  );
}
