/**
 * revoke-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Immediately and permanently removes the tester555@gmail.com account.
 *
 * This script is safe to run at any time — if the account doesn't exist,
 * it exits cleanly with a notice.
 *
 * Usage (from project root, with DATABASE_URL set):
 *   node revoke-tester.mjs
 *
 * This is also called automatically by the server's expired-account cleanup
 * middleware once accountExpiresAt has passed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  const email = 'tester555@gmail.com';

  const [rows] = await connection.execute(
    'SELECT id, accountExpiresAt FROM users WHERE email = ?',
    [email]
  );

  if (rows.length === 0) {
    console.log('ℹ️   Tester account does not exist — nothing to revoke.');
    await connection.end();
    return;
  }

  const user = rows[0];
  await connection.execute('DELETE FROM users WHERE email = ?', [email]);

  console.log(`✅  Tester account (${email}) permanently removed.`);
  console.log(`   Was set to expire: ${user.accountExpiresAt} (UTC)`);

  await connection.end();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
