/**
 * seed-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a temporary tester account that expires automatically after 48 hours.
 *
 * Account setup:
 *   Email    : tester555@gmail.com
 *   Password : Hello123123
 *   Tier     : creator  (enough to explore all core features)
 *   Credits  : 75       (enough to get hooked — not enough to stay free)
 *   Expires  : NOW() + 48 hours
 *
 * Usage (from project root, with DATABASE_URL set):
 *   node seed-tester.mjs
 *
 * To revoke early:
 *   node revoke-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL environment variable is not set.');
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  const email        = 'tester555@gmail.com';
  const password     = 'Hello123123';
  const name         = 'Tester Account';
  const openId       = `email_${email}`;
  const passwordHash = await bcrypt.hash(password, 12);

  // 48 hours from now
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  // Safely add accountExpiresAt column if it doesn't already exist
  try {
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN accountExpiresAt DATETIME NULL DEFAULT NULL
    `);
    console.log('ℹ️   Added accountExpiresAt column to users table.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      // Column already exists — that's fine
    } else {
      throw err;
    }
  }

  // Check if tester already exists
  const [rows] = await connection.execute(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (rows.length > 0) {
    // Reset password, credits, tier and extend expiry
    await connection.execute(
      `UPDATE users
          SET passwordHash        = ?,
              subscriptionTier    = 'creator',
              subscriptionStatus  = 'active',
              creditBalance       = 75,
              totalCreditsEarned  = 75,
              monthlyGenerationsUsed = 0,
              accountExpiresAt    = ?,
              updatedAt           = NOW()
        WHERE email = ?`,
      [passwordHash, expiresAt, email]
    );
    console.log('✅  Tester account reset — credits refreshed, expiry extended.');
  } else {
    // Create fresh tester account
    await connection.execute(
      `INSERT INTO users
         (openId, name, email, passwordHash, loginMethod, role,
          subscriptionTier, subscriptionStatus,
          creditBalance, totalCreditsEarned, totalCreditsSpent,
          monthlyGenerationsUsed, bonusGenerations,
          accountExpiresAt, lastSignedIn, createdAt, updatedAt)
       VALUES
         (?, ?, ?, ?, 'email', 'user',
          'creator', 'active',
          75, 75, 0,
          0, 0,
          ?, NOW(), NOW(), NOW())`,
      [openId, name, email, passwordHash, expiresAt]
    );
    console.log('✅  Tester account created.');
  }

  // Verify
  const [verify] = await connection.execute(
    'SELECT id, email, role, subscriptionTier, creditBalance, accountExpiresAt FROM users WHERE email = ?',
    [email]
  );
  const user = verify[0];

  console.log('\n── Tester Account Details ──────────────────────────────');
  console.log(`   Email         : ${user.email}`);
  console.log(`   Password      : Hello123123`);
  console.log(`   Role          : ${user.role}`);
  console.log(`   Tier          : ${user.subscriptionTier}`);
  console.log(`   Credits       : ${user.creditBalance}`);
  console.log(`   Expires (UTC) : ${user.accountExpiresAt}`);
  console.log('────────────────────────────────────────────────────────\n');
  console.log('ℹ️   Run  node revoke-tester.mjs  to remove this account early.\n');

  await connection.end();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
