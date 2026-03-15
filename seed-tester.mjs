/**
 * seed-tester.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates / resets all temporary tester accounts.
 *
 * Account parameters (all 4):
 *   Tier     : creator
 *   Credits  : 75
 *   Password : Hello123123
 *   Expires  : 48 hours from FIRST LOGIN (clock starts on login, not here)
 *
 * Usage (from project root, with DATABASE_URL set):
 *   node seed-tester.mjs
 *
 * To revoke all accounts early:
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

const TESTERS = [
  { email: 'tester555@gmail.com', openId: 'email_tester555', name: 'Tester 555' },
  { email: 'tester556@gmail.com', openId: 'email_tester556', name: 'Tester 556' },
  { email: 'tester557@gmail.com', openId: 'email_tester557', name: 'Tester 557' },
  { email: 'tester558@gmail.com', openId: 'email_tester558', name: 'Tester 558' },
];

const PASSWORD     = 'Hello123123';
const TIER         = 'creator';
const CREDITS      = 75;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  // Safely add accountExpiresAt column if it doesn't already exist
  try {
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN accountExpiresAt DATETIME NULL DEFAULT NULL
    `);
    console.log('ℹ️   Added accountExpiresAt column to users table.');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  for (const tester of TESTERS) {
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [tester.email]
    );

    if (rows.length > 0) {
      // Reset — clear expiry so clock restarts on next login
      await connection.execute(
        `UPDATE users
            SET passwordHash           = ?,
                subscriptionTier       = ?,
                subscriptionStatus     = 'active',
                creditBalance          = ?,
                totalCreditsEarned     = ?,
                monthlyGenerationsUsed = 0,
                accountExpiresAt       = NULL,
                updatedAt              = NOW()
          WHERE email = ?`,
        [passwordHash, TIER, CREDITS, CREDITS, tester.email]
      );
      console.log(`♻️   Reset    : ${tester.email}`);
    } else {
      // Create fresh — accountExpiresAt NULL; server sets it on first login
      await connection.execute(
        `INSERT INTO users
           (openId, name, email, passwordHash, loginMethod, role,
            subscriptionTier, subscriptionStatus,
            creditBalance, totalCreditsEarned, totalCreditsSpent,
            monthlyGenerationsUsed, bonusGenerations,
            accountExpiresAt, lastSignedIn, createdAt, updatedAt)
         VALUES
           (?, ?, ?, ?, 'email', 'user',
            ?, 'active',
            ?, ?, 0,
            0, 0,
            NULL, NOW(), NOW(), NOW())`,
        [tester.openId, tester.name, tester.email, passwordHash, TIER, CREDITS, CREDITS]
      );
      console.log(`✅   Created  : ${tester.email}`);
    }
  }

  console.log('\n── Tester Accounts ─────────────────────────────────────────');
  console.log('   Password  : Hello123123 (all accounts)');
  console.log('   Tier      : creator');
  console.log('   Credits   : 75');
  console.log('   Expires   : 48 hours from each account\'s first login\n');
  console.log('   tester555@gmail.com');
  console.log('   tester556@gmail.com');
  console.log('   tester557@gmail.com');
  console.log('   tester558@gmail.com');
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('ℹ️   Run  node revoke-tester.mjs  to remove all accounts early.\n');

  await connection.end();
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
