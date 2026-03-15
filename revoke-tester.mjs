/**
 * revoke-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Immediately and permanently removes all 4 tester accounts.
 * Safe to run at any time — accounts that don't exist are skipped cleanly.
 *
 * Usage (from project root, with DATABASE_URL set):
 *   node revoke-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const TESTER_EMAILS = [
  'tester555@gmail.com',
  'tester556@gmail.com',
  'tester557@gmail.com',
  'tester558@gmail.com',
];

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  let removed = 0;

  for (const email of TESTER_EMAILS) {
    const [rows] = await connection.execute(
      'SELECT id, accountExpiresAt FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      console.log(`ℹ️   Not found : ${email}`);
      continue;
    }

    await connection.execute('DELETE FROM users WHERE email = ?', [email]);
    console.log(`✅   Removed   : ${email}`);
    removed++;
  }

  console.log(`\n── ${removed} of ${TESTER_EMAILS.length} tester account(s) removed. ──\n`);

  await connection.end();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
