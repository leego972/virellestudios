/**
   * seed-auditor.mjs
   * ─────────────────────────────────────────────────────────────────────────────
   * Creates / resets the QA auditor account.
   *
   *   Email    : auditor@virellestudios.com
   *   Password : Audit2026
   *   Role     : admin
   *   Tier     : industry  (highest, all features unlocked)
   *   Credits  : 999999    (effectively unlimited)
   *   Expires  : never
   *
   * Usage (from project root, with DATABASE_URL set):
   *   node seed-auditor.mjs
   * ─────────────────────────────────────────────────────────────────────────────
   */

  import mysql from 'mysql2/promise';
  import bcrypt from 'bcryptjs';

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL environment variable is not set.');
    process.exit(1);
  }

  const EMAIL    = 'auditor@virellestudios.com';
  const OPEN_ID  = 'email_auditor_qa';
  const NAME     = 'QA Auditor';
  const PASSWORD = 'Audit2026';
  const TIER     = 'industry';
  const ROLE     = 'admin';
  const CREDITS  = 999999;

  async function main() {
    const connection = await mysql.createConnection(DATABASE_URL);

    // Ensure accountExpiresAt column exists (safe no-op if already present)
    try {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN accountExpiresAt DATETIME NULL DEFAULT NULL
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') throw err;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const [rows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [EMAIL]
    );

    if (rows.length > 0) {
      await connection.execute(
        `UPDATE users
            SET passwordHash           = ?,
                role                   = ?,
                subscriptionTier       = ?,
                subscriptionStatus     = 'active',
                creditBalance          = ?,
                totalCreditsEarned     = ?,
                monthlyGenerationsUsed = 0,
                accountExpiresAt       = NULL,
                updatedAt              = NOW()
          WHERE email = ?`,
        [passwordHash, ROLE, TIER, CREDITS, CREDITS, EMAIL]
      );
      console.log('♻️   Reset auditor account:', EMAIL);
    } else {
      await connection.execute(
        `INSERT INTO users
           (openId, name, email, passwordHash, loginMethod, role,
            subscriptionTier, subscriptionStatus,
            creditBalance, totalCreditsEarned, totalCreditsSpent,
            monthlyGenerationsUsed, bonusGenerations,
            accountExpiresAt, lastSignedIn, createdAt, updatedAt)
         VALUES
           (?, ?, ?, ?, 'email', ?,
            ?, 'active',
            ?, ?, 0,
            0, 0,
            NULL, NOW(), NOW(), NOW())`,
        [OPEN_ID, NAME, EMAIL, passwordHash, ROLE, TIER, CREDITS, CREDITS]
      );
      console.log('✅   Created auditor account:', EMAIL);
    }

    console.log('');
    console.log('── QA Auditor Account ───────────────────────────────────────');
    console.log('   Email    : auditor@virellestudios.com');
    console.log('   Password : Audit2026');
    console.log('   Role     : admin');
    console.log('   Tier     : industry (all features)');
    console.log('   Credits  : 999,999 (unlimited)');
    console.log('   Expires  : never');
    console.log('─────────────────────────────────────────────────────────────');

    await connection.end();
  }

  main().catch((err) => {
    console.error('❌  Error:', err.message);
    process.exit(1);
  });
  