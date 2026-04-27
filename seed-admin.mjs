/**
   * seed-admin.mjs
   * ─────────────────────────────────────────────────────────────────────────────
   * Ensures both platform admins exist with full access.
   *
   *   Role  : admin
   *   Tier  : industry (highest, all features)
   *   Credits: 999999 (unlimited)
   *   Expires: never
   *
   * Usage (from project root, with DATABASE_URL set):
   *   node seed-admin.mjs
   * ─────────────────────────────────────────────────────────────────────────────
   */

  import mysql from 'mysql2/promise';
  import bcrypt from 'bcryptjs';

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const ADMINS = [
    { email: 'leego972@gmail.com',       openId: 'email_leego972',      name: 'Lee Gold'    },
    { email: 'brobroplzcheck@gmail.com', openId: 'email_brobroplzcheck', name: 'Admin 2'     },
  ];

  const TIER    = 'industry';
  const ROLE    = 'admin';
  const CREDITS = 999999;

  async function main() {
    const connection = await mysql.createConnection(DATABASE_URL);

    // Ensure accountExpiresAt column exists (safe no-op if already present)
    try {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN accountExpiresAt DATETIME NULL DEFAULT NULL
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    for (const admin of ADMINS) {
      const [rows] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [admin.email]
      );

      if (rows.length > 0) {
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
            WHERE email = ?`,
          [ROLE, TIER, CREDITS, CREDITS, admin.email]
        );
        console.log('♻️   Updated :', admin.email, '→ admin / industry / unlimited');
      } else {
        await connection.execute(
          `INSERT INTO users
             (openId, name, email, loginMethod, role,
              subscriptionTier, subscriptionStatus,
              creditBalance, totalCreditsEarned, totalCreditsSpent,
              monthlyGenerationsUsed, bonusGenerations,
              accountExpiresAt, lastSignedIn, createdAt, updatedAt)
           VALUES
             (?, ?, ?, 'email', ?,
              ?, 'active',
              ?, ?, 0,
              0, 0,
              NULL, NOW(), NOW(), NOW())`,
          [admin.openId, admin.name, admin.email, ROLE, TIER, CREDITS, CREDITS]
        );
        console.log('✅   Created :', admin.email);
      }
    }

    console.log('');
    console.log('── Admin Accounts ───────────────────────────────────────────');
    console.log('   leego972@gmail.com       — admin / industry / unlimited');
    console.log('   brobroplzcheck@gmail.com — admin / industry / unlimited');
    console.log('   (Login via Google OAuth or email if password is set)');
    console.log('─────────────────────────────────────────────────────────────');

    await connection.end();
  }

  main().catch((err) => {
    console.error('❌  Error:', err.message);
    process.exit(1);
  });
  