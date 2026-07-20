/**
 * seed-admin.mjs
 * -----------------------------------------------------------------------------
 * Ensures the platform owner/admin accounts exist with full access.
 *
 *   Role   : admin
 *   Tier   : industry (highest, all features)
 *   Credits: 999999 (unlimited)
 *   Expires: never
 *
 * Usage (from project root, with DATABASE_URL set):
 *   node seed-admin.mjs
 * -----------------------------------------------------------------------------
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const ADMINS = [
  { email: 'leego972@gmail.com',          openId: 'email_leego972',          name: 'Lee Gold' },
  { email: 'studiosvirelle@gmail.com',   openId: 'email_studiosvirelle',   name: 'Virelle Studios' },
  { email: 'brobroplzcheck@gmail.com',   openId: 'email_brobroplzcheck',   name: 'Admin 2' },
];

const TIER = 'industry';
const ROLE = 'admin';
const CREDITS = 999999;

// If SEED_ADMIN_PASSWORD is set, every admin account gets that password
// set/reset on each boot. OAuth remains available independently.
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || null;
const passwordHash = SEED_ADMIN_PASSWORD
  ? await bcrypt.hash(SEED_ADMIN_PASSWORD, 12)
  : null;

async function main() {
  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: process.env.DATABASE_CA_CERT
      ? { ca: process.env.DATABASE_CA_CERT }
      : { rejectUnauthorized: false },
  });

  try {
    await connection.execute(`
      ALTER TABLE users ADD COLUMN accountExpiresAt DATETIME NULL DEFAULT NULL
    `);
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  }

  for (const admin of ADMINS) {
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) ORDER BY id ASC',
      [admin.email],
    );

    if (rows.length > 0) {
      if (passwordHash) {
        await connection.execute(
          `UPDATE users
              SET role                   = ?,
                  subscriptionTier       = ?,
                  subscriptionStatus     = 'active',
                  creditBalance          = ?,
                  totalCreditsEarned     = ?,
                  monthlyGenerationsUsed = 0,
                  accountExpiresAt       = NULL,
                  passwordHash           = ?,
                  updatedAt              = NOW()
            WHERE LOWER(email) = LOWER(?)`,
          [ROLE, TIER, CREDITS, CREDITS, passwordHash, admin.email],
        );
      } else {
        await connection.execute(
          `UPDATE users
              SET role                   = ?,
                  subscriptionTier       = ?,
                  subscriptionStatus     = 'active',
                  creditBalance          = ?,
                  totalCreditsEarned     = ?,
                  monthlyGenerationsUsed = 0,
                  accountExpiresAt       = NULL,
                  updatedAt              = NOW()
            WHERE LOWER(email) = LOWER(?)`,
          [ROLE, TIER, CREDITS, CREDITS, admin.email],
        );
      }
      console.log('Updated :', admin.email, '-> admin / industry / unlimited');
    } else {
      await connection.execute(
        `INSERT INTO users
           (openId, name, email, loginMethod, role, passwordHash,
            subscriptionTier, subscriptionStatus,
            creditBalance, totalCreditsEarned, totalCreditsSpent,
            monthlyGenerationsUsed, bonusGenerations,
            accountExpiresAt, lastSignedIn, createdAt, updatedAt)
         VALUES
           (?, ?, ?, 'email', ?, ?,
            ?, 'active',
            ?, ?, 0,
            0, 0,
            NULL, NOW(), NOW(), NOW())`,
        [admin.openId, admin.name, admin.email, ROLE, passwordHash, TIER, CREDITS, CREDITS],
      );
      console.log('Created :', admin.email);
    }
  }

  console.log('');
  console.log('-- Admin Accounts ------------------------------------------------');
  for (const admin of ADMINS) {
    console.log(`   ${admin.email} -- admin / industry / unlimited`);
  }
  console.log(passwordHash
    ? '   (Login via email + SEED_ADMIN_PASSWORD, or Google/GitHub OAuth)'
    : '   (Login via Google/GitHub OAuth, or email where a password already exists)');
  console.log('--------------------------------------------------------------------');

  await connection.end();
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
