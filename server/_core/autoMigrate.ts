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
  ];

  // ─── Columns that may be missing from existing tables ───
  const missingColumns: ColumnCheck[] = [
    // Users table - subscription fields
    { table: "users", column: "subscriptionTier", definition: "ENUM('free','pro','industry') NOT NULL DEFAULT 'free'" },
    { table: "users", column: "stripeCustomerId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "stripeSubscriptionId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "subscriptionStatus", definition: "ENUM('active','canceled','past_due','unpaid','trialing','none') NOT NULL DEFAULT 'none'" },
    { table: "users", column: "subscriptionCurrentPeriodEnd", definition: "TIMESTAMP NULL" },
    { table: "users", column: "monthlyGenerationsUsed", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "monthlyGenerationsResetAt", definition: "TIMESTAMP NULL" },
    { table: "users", column: "email", definition: "VARCHAR(320) NULL" },
    { table: "users", column: "passwordHash", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "loginMethod", definition: "VARCHAR(64) NULL" },
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
}
