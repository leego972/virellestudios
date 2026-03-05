/**
 * Auto-migration module
 * Runs on server startup to ensure the database schema matches the code.
 * Uses ALTER TABLE to add missing columns and CREATE TABLE IF NOT EXISTS for new tables.
 * This is safe to run repeatedly — it only adds what's missing.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";

interface ColumnCheck {
  table: string;
  column: string;
  definition: string;
}

interface TableDefinition {
  name: string;
  createSQL: string;
}

export async function runAutoMigration(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AutoMigrate] Database not available, skipping migration");
    return;
  }

  console.log("[AutoMigrate] Checking database schema...");

  // ─── New tables that may not exist ───
  const newTables: TableDefinition[] = [
    {
      name: "blog_articles",
      createSQL: `CREATE TABLE IF NOT EXISTS blog_articles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(512) NOT NULL,
        subtitle VARCHAR(512),
        content TEXT NOT NULL,
        excerpt TEXT,
        category VARCHAR(128) NOT NULL,
        tags JSON,
        coverImageUrl TEXT,
        coverImageAlt VARCHAR(512),
        metaTitle VARCHAR(160),
        metaDescription VARCHAR(320),
        canonicalUrl VARCHAR(512),
        articleStatus ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
        publishedAt TIMESTAMP NULL,
        scheduledFor TIMESTAMP NULL,
        viewCount INT NOT NULL DEFAULT 0,
        generatedByAI BOOLEAN NOT NULL DEFAULT TRUE,
        generationPrompt TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "referral_codes",
      createSQL: `CREATE TABLE IF NOT EXISTS referral_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        code VARCHAR(32) NOT NULL UNIQUE,
        totalReferrals INT NOT NULL DEFAULT 0,
        successfulReferrals INT NOT NULL DEFAULT 0,
        bonusGenerationsEarned INT NOT NULL DEFAULT 0,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "referral_tracking",
      createSQL: `CREATE TABLE IF NOT EXISTS referral_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referralCodeId INT NOT NULL,
        referrerId INT NOT NULL,
        referredUserId INT,
        referredEmail VARCHAR(320),
        referralStatus ENUM('clicked','registered','rewarded') NOT NULL DEFAULT 'clicked',
        rewardType VARCHAR(64),
        rewardAmount INT,
        rewardedAt TIMESTAMP NULL,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "password_reset_tokens",
      createSQL: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        token VARCHAR(128) NOT NULL UNIQUE,
        expiresAt TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "notifications",
      createSQL: `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        notificationType ENUM('generation_complete','export_complete','subscription_change','referral_reward','system','welcome','tip') NOT NULL DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        link VARCHAR(512),
        isRead BOOLEAN NOT NULL DEFAULT FALSE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_user (userId),
        INDEX idx_notifications_unread (userId, isRead)
      )`,
    },
  ];

  // ─── Columns that may be missing from existing tables ───
  const missingColumns: ColumnCheck[] = [
    // Users table - subscription fields
    { table: "users", column: "subscriptionTier", definition: "ENUM('creator','pro','industry') NOT NULL DEFAULT 'creator'" },
    { table: "users", column: "stripeCustomerId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "stripeSubscriptionId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "subscriptionStatus", definition: "ENUM('active','canceled','past_due','unpaid','trialing','none') NOT NULL DEFAULT 'none'" },
    { table: "users", column: "subscriptionCurrentPeriodEnd", definition: "TIMESTAMP NULL" },
    { table: "users", column: "monthlyGenerationsUsed", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "monthlyGenerationsResetAt", definition: "TIMESTAMP NULL" },
    { table: "users", column: "email", definition: "VARCHAR(320) NULL" },
    { table: "users", column: "passwordHash", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "loginMethod", definition: "VARCHAR(64) NULL" },
    // Scenes table - video generation fields
    { table: "scenes", column: "videoUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "videoJobId", definition: "VARCHAR(255) NULL" },
    // Users table - bonus generations from referrals
    { table: "users", column: "bonusGenerations", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "referralCode", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "referralStats", definition: "JSON NULL" },
    // Users table - BYOK (Bring Your Own Key) for video generation
    { table: "users", column: "userOpenaiKey", definition: "TEXT NULL" },
    { table: "users", column: "userRunwayKey", definition: "TEXT NULL" },
    { table: "users", column: "userReplicateKey", definition: "TEXT NULL" },
    { table: "users", column: "userFalKey", definition: "TEXT NULL" },
    { table: "users", column: "userLumaKey", definition: "TEXT NULL" },
    { table: "users", column: "userHfToken", definition: "TEXT NULL" },
    { table: "users", column: "preferredVideoProvider", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "apiKeysUpdatedAt", definition: "TIMESTAMP NULL" },
    // Users table - BYOK for voice acting and soundtrack
    { table: "users", column: "userElevenlabsKey", definition: "TEXT NULL" },
    { table: "users", column: "userSunoKey", definition: "TEXT NULL" },
    // Users table - profile/onboarding fields (sign-up flow)
    { table: "users", column: "phone", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "avatarUrl", definition: "TEXT NULL" },
    { table: "users", column: "bio", definition: "TEXT NULL" },
    { table: "users", column: "country", definition: "VARCHAR(128) NULL" },
    { table: "users", column: "city", definition: "VARCHAR(128) NULL" },
    { table: "users", column: "timezone", definition: "VARCHAR(64) NULL" },
    { table: "users", column: "companyName", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "companyWebsite", definition: "VARCHAR(512) NULL" },
    { table: "users", column: "jobTitle", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "professionalRole", definition: "VARCHAR(64) NULL" },
    { table: "users", column: "experienceLevel", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "industryType", definition: "VARCHAR(64) NULL" },
    { table: "users", column: "teamSize", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "preferredGenres", definition: "JSON NULL" },
    { table: "users", column: "primaryUseCase", definition: "VARCHAR(128) NULL" },
    { table: "users", column: "portfolioUrl", definition: "VARCHAR(512) NULL" },
    { table: "users", column: "socialLinks", definition: "JSON NULL" },
    { table: "users", column: "howDidYouHear", definition: "VARCHAR(128) NULL" },
    { table: "users", column: "marketingOptIn", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "users", column: "onboardingCompleted", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    // Projects table - story & narrative fields
    { table: "projects", column: "mainPlot", definition: "TEXT NULL" },
    { table: "projects", column: "sidePlots", definition: "TEXT NULL" },
    { table: "projects", column: "plotTwists", definition: "TEXT NULL" },
    { table: "projects", column: "characterArcs", definition: "TEXT NULL" },
    { table: "projects", column: "themes", definition: "TEXT NULL" },
    { table: "projects", column: "setting", definition: "TEXT NULL" },
    { table: "projects", column: "actStructure", definition: "VARCHAR(64) NULL DEFAULT 'three-act'" },
    { table: "projects", column: "tone", definition: "VARCHAR(128) NULL" },
    { table: "projects", column: "targetAudience", definition: "VARCHAR(255) NULL" },
    { table: "projects", column: "openingScene", definition: "TEXT NULL" },
    { table: "projects", column: "climax", definition: "TEXT NULL" },
    { table: "projects", column: "storyResolution", definition: "TEXT NULL" },
    // Projects table - color grading & quality
    { table: "projects", column: "colorGrading", definition: "VARCHAR(128) NULL DEFAULT 'natural'" },
    { table: "projects", column: "colorGradingSettings", definition: "JSON NULL" },
    { table: "projects", column: "quality", definition: "ENUM('standard','high','ultra') NULL DEFAULT 'high'" },
    { table: "projects", column: "resolution", definition: "VARCHAR(32) NULL DEFAULT '1920x1080'" },
    { table: "projects", column: "plotSummary", definition: "TEXT NULL" },
    { table: "projects", column: "genre", definition: "VARCHAR(128) NULL" },
    { table: "projects", column: "duration", definition: "INT NULL" },
    { table: "projects", column: "rating", definition: "ENUM('G','PG','PG-13','R') NULL DEFAULT 'PG-13'" },
    { table: "projects", column: "progress", definition: "INT NOT NULL DEFAULT 0" },
    { table: "projects", column: "estimatedTime", definition: "INT NULL" },
    { table: "projects", column: "thumbnailUrl", definition: "TEXT NULL" },
    { table: "projects", column: "outputUrl", definition: "TEXT NULL" },
    // Scenes table - additional fields
    { table: "scenes", column: "voiceUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "crowdLevel", definition: "VARCHAR(32) NULL" },
    { table: "scenes", column: "extras", definition: "TEXT NULL" },
  ];

  let tablesCreated = 0;
  let columnsAdded = 0;

  // Step 1: Create missing tables
  for (const table of newTables) {
    try {
      await db.execute(sql.raw(table.createSQL));
      tablesCreated++;
    } catch (err: any) {
      // Table already exists is fine
      if (!err.message?.includes("already exists")) {
        console.error(`[AutoMigrate] Error creating table ${table.name}:`, err.message);
      }
    }
  }

  // Step 2: Add missing columns to existing tables
  for (const col of missingColumns) {
    try {
      // Check if column exists
      const [rows] = await db.execute(sql.raw(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${col.table}' AND COLUMN_NAME = '${col.column}'`
      ));
      const count = (rows as any)?.[0]?.cnt ?? (rows as any)?.cnt ?? 0;
      if (Number(count) === 0) {
        await db.execute(sql.raw(
          `ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.definition}`
        ));
        columnsAdded++;
        console.log(`[AutoMigrate] Added column ${col.table}.${col.column}`);
      }
    } catch (err: any) {
      // "Duplicate column name" means it already exists — that's fine
      if (err.message?.includes("Duplicate column")) {
        // Already exists, skip
      } else {
        console.error(`[AutoMigrate] Error adding column ${col.table}.${col.column}:`, err.message);
      }
    }
  }

  if (tablesCreated > 0 || columnsAdded > 0) {
    console.log(`[AutoMigrate] Migration complete: ${tablesCreated} tables checked, ${columnsAdded} columns added`);
  } else {
    console.log("[AutoMigrate] Schema is up to date — no changes needed");
  }

  // ─── Step 3: Ensure admin account has admin role ───
  const adminEmail = process.env.ADMIN_EMAIL || "leego972@gmail.com";
  try {
    const [adminRows] = await db.execute(sql.raw(
      `SELECT id, role FROM users WHERE email = '${adminEmail}' LIMIT 1`
    ));
    const adminUser = (adminRows as any)?.[0];
    if (adminUser && adminUser.role !== "admin") {
      await db.execute(sql.raw(
        `UPDATE users SET role = 'admin' WHERE id = ${adminUser.id}`
      ));
      console.log(`[AutoMigrate] Promoted ${adminEmail} (user ${adminUser.id}) to admin role`);
    } else if (adminUser) {
      console.log(`[AutoMigrate] Admin account ${adminEmail} already has admin role`);
    }
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to check/promote admin account:`, err.message);
  }
}
