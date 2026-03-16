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
      name: "moderationIncidents",
      createSQL: `CREATE TABLE IF NOT EXISTS moderationIncidents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        contentType VARCHAR(128) NOT NULL,
        contentSnippet TEXT NOT NULL,
        violations JSON NOT NULL,
        severity ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'LOW',
        shouldFreeze BOOLEAN NOT NULL DEFAULT FALSE,
        shouldReport BOOLEAN NOT NULL DEFAULT FALSE,
        status ENUM('pending_review','reviewed_cleared','reviewed_actioned','reported_to_authorities') NOT NULL DEFAULT 'pending_review',
        reviewedBy INT NULL,
        reviewNotes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    {
      name: "generationJobs",
      createSQL: `CREATE TABLE IF NOT EXISTS generationJobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        type ENUM('full-film','scene','preview') NOT NULL,
        status ENUM('queued','processing','paused','completed','failed') NOT NULL DEFAULT 'queued',
        progress INT DEFAULT 0,
        estimatedSeconds INT NULL,
        resultUrl TEXT NULL,
        errorMessage TEXT NULL,
        metadata JSON NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "scripts",
      createSQL: `CREATE TABLE IF NOT EXISTS scripts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Untitled Script',
        content TEXT NULL,
        version INT NOT NULL DEFAULT 1,
        pageCount INT DEFAULT 0,
        metadata JSON NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "soundtracks",
      createSQL: `CREATE TABLE IF NOT EXISTS soundtracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NULL,
        genre VARCHAR(128) NULL,
        mood VARCHAR(128) NULL,
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        duration INT NULL,
        startTime FLOAT DEFAULT 0,
        volume FLOAT DEFAULT 0.7,
        fadeIn FLOAT DEFAULT 0,
        fadeOut FLOAT DEFAULT 0,
        loop INT DEFAULT 0,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "credits",
      createSQL: `CREATE TABLE IF NOT EXISTS credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        role VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        characterName VARCHAR(255) NULL,
        orderIndex INT NOT NULL DEFAULT 0,
        section ENUM('opening','closing') NOT NULL DEFAULT 'closing',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "locations",
      createSQL: `CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        sceneId INT NULL,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(512) NULL,
        locationType VARCHAR(128) NULL,
        description TEXT NULL,
        referenceImages JSON NULL,
        notes TEXT NULL,
        tags JSON NULL,
        latitude FLOAT NULL,
        longitude FLOAT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "moodBoardItems",
      createSQL: `CREATE TABLE IF NOT EXISTS moodBoardItems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        type ENUM('image','color','text','reference') NOT NULL DEFAULT 'image',
        imageUrl TEXT NULL,
        text TEXT NULL,
        color VARCHAR(32) NULL,
        tags JSON NULL,
        category VARCHAR(128) NULL,
        posX INT DEFAULT 0,
        posY INT DEFAULT 0,
        width INT DEFAULT 200,
        height INT DEFAULT 200,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "subtitles",
      createSQL: `CREATE TABLE IF NOT EXISTS subtitles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        language VARCHAR(32) NOT NULL,
        languageName VARCHAR(128) NOT NULL,
        entries JSON NULL,
        isGenerated INT DEFAULT 0,
        isTranslation INT DEFAULT 0,
        sourceLanguage VARCHAR(32) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "dialogues",
      createSQL: `CREATE TABLE IF NOT EXISTS dialogues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        characterId INT NULL,
        characterName VARCHAR(255) NOT NULL,
        line TEXT NOT NULL,
        emotion VARCHAR(128) NULL,
        direction TEXT NULL,
        orderIndex INT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "budgets",
      createSQL: `CREATE TABLE IF NOT EXISTS budgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        totalEstimate FLOAT DEFAULT 0,
        currency VARCHAR(8) DEFAULT 'USD',
        breakdown JSON NULL,
        aiAnalysis TEXT NULL,
        generatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "soundEffects",
      createSQL: `CREATE TABLE IF NOT EXISTS soundEffects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(128) NOT NULL,
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        duration FLOAT NULL,
        isCustom INT DEFAULT 0,
        volume FLOAT DEFAULT 0.8,
        startTime FLOAT DEFAULT 0,
        loop INT DEFAULT 0,
        tags JSON NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "collaborators",
      createSQL: `CREATE TABLE IF NOT EXISTS collaborators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NULL,
        invitedBy INT NOT NULL,
        email VARCHAR(320) NULL,
        inviteToken VARCHAR(128) NOT NULL UNIQUE,
        role ENUM('viewer','editor','producer','director') NOT NULL DEFAULT 'editor',
        status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "movies",
      createSQL: `CREATE TABLE IF NOT EXISTS movies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        projectId INT NULL,
        movieTitle VARCHAR(255) NULL,
        title VARCHAR(255) NOT NULL,
        sceneNumber INT NULL,
        description TEXT NULL,
        type ENUM('scene','trailer','film') NOT NULL DEFAULT 'scene',
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        thumbnailUrl TEXT NULL,
        thumbnailKey VARCHAR(512) NULL,
        duration INT NULL,
        fileSize INT NULL,
        mimeType VARCHAR(128) DEFAULT 'video/mp4',
        tags JSON NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "directorChats",
      createSQL: `CREATE TABLE IF NOT EXISTS directorChats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        role ENUM('user','assistant','system') NOT NULL,
        content TEXT NOT NULL,
        actionType VARCHAR(128) NULL,
        actionData JSON NULL,
        actionStatus ENUM('pending','executed','failed') DEFAULT 'pending',
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "visualEffects",
      createSQL: `CREATE TABLE IF NOT EXISTS visualEffects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(128) NOT NULL,
        subcategory VARCHAR(128) NULL,
        description TEXT NULL,
        previewUrl TEXT NULL,
        previewKey VARCHAR(512) NULL,
        intensity FLOAT DEFAULT 0.8,
        duration FLOAT NULL,
        startTime FLOAT DEFAULT 0,
        layer ENUM('background','midground','foreground','overlay') DEFAULT 'overlay',
        blendMode VARCHAR(64) DEFAULT 'normal',
        colorTint VARCHAR(32) NULL,
        parameters JSON NULL,
        isCustom INT DEFAULT 0,
        tags JSON NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "credit_transactions",
      createSQL: `CREATE TABLE IF NOT EXISTS credit_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        amount INT NOT NULL,
        action VARCHAR(128) NOT NULL,
        description TEXT NULL,
        balanceAfter INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_credit_tx_user (userId),
        INDEX idx_credit_tx_action (action)
      )`,
    },
    {
      name: "projectSamples",
      createSQL: `CREATE TABLE IF NOT EXISTS projectSamples (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        genre VARCHAR(64) NULL,
        provider VARCHAR(64) NULL,
        videoUrl TEXT NOT NULL,
        thumbnailUrl TEXT NULL,
        durationSeconds INT NULL,
        displayOrder INT NOT NULL DEFAULT 0,
        isPublished BOOLEAN NOT NULL DEFAULT TRUE,
        uploadedBy INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "adCampaigns",
      createSQL: `CREATE TABLE IF NOT EXISTS adCampaigns (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        status ENUM('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
        platforms JSON NOT NULL,
        contentType VARCHAR(64) NOT NULL DEFAULT 'launch_announcement',
        schedule ENUM('once','daily','weekly','biweekly','monthly') NOT NULL DEFAULT 'once',
        generatedContent JSON NOT NULL DEFAULT ('[]'),
        postHistory JSON NOT NULL DEFAULT ('[]'),
        customContext TEXT NULL,
        totalPosts INT NOT NULL DEFAULT 0,
        successfulPosts INT NOT NULL DEFAULT 0,
        startDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_adCampaigns_userId (userId)
      )`,
    },
    {
      name: "marketing_budgets",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_budgets (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        month VARCHAR(7) NOT NULL,
        channel VARCHAR(64) NOT NULL,
        allocated_amount DECIMAL(10,2) NOT NULL,
        spent_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        roi DECIMAL(10,2) DEFAULT 0,
        reasoning TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "marketing_campaigns",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        objective VARCHAR(128) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        budget DECIMAL(10,2) NOT NULL,
        spend DECIMAL(10,2) NOT NULL DEFAULT 0,
        start_date TIMESTAMP NULL,
        end_date TIMESTAMP NULL,
        target_audiences JSON,
        metrics JSON,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "marketing_content",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_content (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT,
        platform VARCHAR(64) NOT NULL,
        type VARCHAR(64) NOT NULL,
        headline VARCHAR(512),
        body TEXT NOT NULL,
        image_url VARCHAR(1024),
        video_url VARCHAR(1024),
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        scheduled_for TIMESTAMP NULL,
        published_at TIMESTAMP NULL,
        platform_post_id VARCHAR(255),
        metrics JSON,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "marketing_performance",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_performance (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL,
        channel VARCHAR(64) NOT NULL,
        spend DECIMAL(10,2) NOT NULL DEFAULT 0,
        impressions INT NOT NULL DEFAULT 0,
        clicks INT NOT NULL DEFAULT 0,
        conversions INT NOT NULL DEFAULT 0,
        cpc DECIMAL(10,2) DEFAULT 0,
        cpa DECIMAL(10,2) DEFAULT 0,
        roi DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "marketing_activity_log",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_activity_log (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(128) NOT NULL,
        description TEXT NOT NULL,
        metadata JSON,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "marketing_settings",
      createSQL: `CREATE TABLE IF NOT EXISTS marketing_settings (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(128) NOT NULL UNIQUE,
        value TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "content_creator_jobs",
      createSQL: `CREATE TABLE IF NOT EXISTS content_creator_jobs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        platform VARCHAR(64),
        prompt TEXT,
        result_image_url VARCHAR(1024),
        result_video_url VARCHAR(1024),
        result_caption TEXT,
        result_hashtags JSON,
        marketing_content_id INT,
        error TEXT,
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "autonomous_pipeline_log",
      createSQL: `CREATE TABLE IF NOT EXISTS autonomous_pipeline_log (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        cycle_id VARCHAR(64) NOT NULL,
        stage VARCHAR(64) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'running',
        details JSON,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL
      )`,
    },
    {
      name: "content_creator_campaigns",
      createSQL: `CREATE TABLE IF NOT EXISTS content_creator_campaigns (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        objective VARCHAR(255),
        targetAudience VARCHAR(255),
        platforms JSON,
        seoKeywords JSON,
        brandVoice TEXT,
        aiStrategy TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        totalPieces INT NOT NULL DEFAULT 0,
        publishedPieces INT NOT NULL DEFAULT 0,
        tiktokLinked TINYINT(1) NOT NULL DEFAULT 0,
        seoLinked TINYINT(1) NOT NULL DEFAULT 1,
        advertisingLinked TINYINT(1) NOT NULL DEFAULT 0,
        startDate TIMESTAMP NULL,
        endDate TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "content_creator_pieces",
      createSQL: `CREATE TABLE IF NOT EXISTS content_creator_pieces (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        campaignId INT NULL,
        platform VARCHAR(64) NOT NULL,
        contentType VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        title VARCHAR(512) NULL,
        headline VARCHAR(512) NULL,
        body TEXT NOT NULL,
        callToAction VARCHAR(255) NULL,
        hook VARCHAR(512) NULL,
        videoScript TEXT NULL,
        visualDirections JSON NULL,
        hashtags JSON NULL,
        seoKeywords JSON NULL,
        imagePrompt TEXT NULL,
        mediaUrl TEXT NULL,
        tiktokPublishId VARCHAR(255) NULL,
        externalPostId VARCHAR(255) NULL,
        seoScore INT NOT NULL DEFAULT 0,
        qualityScore INT NOT NULL DEFAULT 0,
        impressions INT NOT NULL DEFAULT 0,
        clicks INT NOT NULL DEFAULT 0,
        engagements INT NOT NULL DEFAULT 0,
        shares INT NOT NULL DEFAULT 0,
        saves INT NOT NULL DEFAULT 0,
        videoViews INT NOT NULL DEFAULT 0,
        aiPrompt TEXT NULL,
        aiModel VARCHAR(64) NULL,
        generationMs INT NULL,
        scheduledAt TIMESTAMP NULL,
        publishedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "content_creator_schedules",
      createSQL: `CREATE TABLE IF NOT EXISTS content_creator_schedules (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pieceId INT NOT NULL,
        campaignId INT NULL,
        platform VARCHAR(64) NOT NULL,
        scheduledAt TIMESTAMP NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        publishedAt TIMESTAMP NULL,
        retryCount INT NOT NULL DEFAULT 0,
        maxRetries INT NOT NULL DEFAULT 3,
        failReason TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "promo_codes",
      createSQL: `CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(32) NOT NULL UNIQUE,
        discountPercent INT NOT NULL DEFAULT 50,
        maxUses INT NOT NULL DEFAULT 1,
        usedCount INT NOT NULL DEFAULT 0,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        description VARCHAR(255) NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "content_creator_analytics",
      createSQL: `CREATE TABLE IF NOT EXISTS content_creator_analytics (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        pieceId INT NOT NULL,
        campaignId INT NULL,
        platform VARCHAR(64) NOT NULL,
        impressions INT NOT NULL DEFAULT 0,
        clicks INT NOT NULL DEFAULT 0,
        engagements INT NOT NULL DEFAULT 0,
        shares INT NOT NULL DEFAULT 0,
        saves INT NOT NULL DEFAULT 0,
        videoViews INT NOT NULL DEFAULT 0,
        ctr FLOAT NOT NULL DEFAULT 0,
        engagementRate FLOAT NOT NULL DEFAULT 0,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
  ];

  // ─── Columns that may be missing from existing tables ───
  const missingColumns: ColumnCheck[] = [
    // Users table - subscription fields
    { table: "users", column: "subscriptionTier", definition: "ENUM('independent','creator','studio','pro','industry','beta','amateur') NOT NULL DEFAULT 'independent'" },
    { table: "users", column: "stripeCustomerId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "stripeSubscriptionId", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "subscriptionStatus", definition: "ENUM('active','canceled','past_due','unpaid','trialing','none') NOT NULL DEFAULT 'none'" },
    { table: "users", column: "subscriptionCurrentPeriodEnd", definition: "TIMESTAMP NULL" },
    { table: "users", column: "monthlyGenerationsUsed", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "monthlyGenerationsResetAt", definition: "TIMESTAMP NULL" },
    { table: "users", column: "email", definition: "VARCHAR(320) NULL" },
    { table: "users", column: "passwordHash", definition: "VARCHAR(255) NULL" },
    { table: "users", column: "loginMethod", definition: "VARCHAR(64) NULL" },
    // Scenes table - transition & grading (missing from original CREATE TABLE)
    { table: "scenes", column: "transitionType", definition: "VARCHAR(64) NULL DEFAULT 'cut'" },
    { table: "scenes", column: "transitionDuration", definition: "FLOAT NULL DEFAULT 0.5" },
    { table: "scenes", column: "colorGrading", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "productionNotes", definition: "TEXT NULL" },
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
    { table: "users", column: "userByteplusKey", definition: "TEXT NULL" },
    { table: "users", column: "userAnthropicKey", definition: "TEXT NULL" },
    { table: "users", column: "userGoogleAiKey", definition: "TEXT NULL" },
    { table: "users", column: "preferredLlmProvider", definition: "VARCHAR(32) NULL" },
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
    // Users table - promo code tracking
    { table: "users", column: "appliedPromoCode", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "promoDiscountUsed", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
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
    // Users table - content moderation fields
    { table: "users", column: "isFrozen", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "users", column: "frozenReason", definition: "TEXT NULL" },
    { table: "users", column: "frozenAt", definition: "TIMESTAMP NULL" },
    // Credits system
    { table: "users", column: "creditBalance", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "betaExpiresAt", definition: "TIMESTAMP NULL" },
    { table: "users", column: "totalCreditsEarned", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "totalCreditsSpent", definition: "INT NOT NULL DEFAULT 0" },
    { table: "users", column: "creditsResetAt", definition: "TIMESTAMP NULL" },
    // Projects table - cinema industry
    { table: "projects", column: "cinemaIndustry", definition: "VARCHAR(128) NULL DEFAULT 'Hollywood'" },
    // Scenes table - soundtrack fields
    { table: "scenes", column: "soundtrackId", definition: "INT NULL" },
    { table: "scenes", column: "soundtrackVolume", definition: "INT NOT NULL DEFAULT 80" },
    // Scenes table - camera & optics fields
    { table: "scenes", column: "lensType", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "focalLength", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "depthOfField", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "cameraMovement", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "shotType", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "frameRate", definition: "VARCHAR(32) NULL" },
    { table: "scenes", column: "aspectRatio", definition: "VARCHAR(16) NULL" },
    { table: "scenes", column: "colorPalette", definition: "VARCHAR(255) NULL" },
    // Scenes table - additional fields
    { table: "scenes", column: "voiceUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "crowdLevel", definition: "VARCHAR(32) NULL" },
    { table: "scenes", column: "extras", definition: "TEXT NULL" },
    // Scenes table - advanced camera & lens control
    { table: "scenes", column: "cameraBody", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "lensBrand", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "aperture", definition: "VARCHAR(16) NULL" },
    // Scenes table - multi-shot sequencing
    { table: "scenes", column: "multiShotEnabled", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "scenes", column: "multiShotCount", definition: "INT NOT NULL DEFAULT 1" },
    { table: "scenes", column: "multiShotData", definition: "JSON NULL" },
    // Scenes table - character staging & emotion
    { table: "scenes", column: "characterEmotions", definition: "JSON NULL" },
    { table: "scenes", column: "characterActions", definition: "JSON NULL" },
    // Scenes table - 3D scene exploration
    { table: "scenes", column: "heroFrameUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "sceneExploreData", definition: "JSON NULL" },
    { table: "scenes", column: "startFrameUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "endFrameUrl", definition: "TEXT NULL" },
    // Scenes table - genre motion & visual style
    { table: "scenes", column: "genreMotion", definition: "VARCHAR(64) NULL DEFAULT 'auto'" },
    { table: "scenes", column: "speedRamp", definition: "VARCHAR(64) NULL DEFAULT 'normal'" },
    { table: "scenes", column: "visualStyle", definition: "VARCHAR(64) NULL DEFAULT 'photorealistic'" },
    // Scenes table - retakes
    { table: "scenes", column: "retakeInstructions", definition: "TEXT NULL" },
    { table: "scenes", column: "retakeRegion", definition: "JSON NULL" },
    { table: "scenes", column: "retakeCount", definition: "INT NOT NULL DEFAULT 0" },
    // Scenes table - lip sync
    { table: "scenes", column: "lipSyncMode", definition: "VARCHAR(64) NULL DEFAULT 'none'" },
    { table: "scenes", column: "lipSyncAudioUrl", definition: "TEXT NULL" },
    // Scenes table - VFX suite
    { table: "scenes", column: "vfxSuiteOperations", definition: "JSON NULL" },
    { table: "scenes", column: "vfxSuiteOutputUrl", definition: "TEXT NULL" },
    // Scenes table - live action plate integration
    { table: "scenes", column: "liveActionPlateUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "liveActionCompositeMode", definition: "VARCHAR(64) NULL DEFAULT 'none'" },
    { table: "scenes", column: "compositeOutputUrl", definition: "TEXT NULL" },
    // Scenes table - external footage upload
    { table: "scenes", column: "externalFootageUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "externalFootageType", definition: "VARCHAR(32) NULL DEFAULT 'none'" },
    { table: "scenes", column: "externalFootageLabel", definition: "VARCHAR(255) NULL" },
    // Scenes table - location & environment
    { table: "scenes", column: "season", definition: "VARCHAR(32) NULL" },
    { table: "scenes", column: "country", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "city", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "locationDetail", definition: "TEXT NULL" },
    // Scenes table - composition & staging
    { table: "scenes", column: "foregroundElements", definition: "TEXT NULL" },
    { table: "scenes", column: "backgroundElements", definition: "TEXT NULL" },
    { table: "scenes", column: "characterBlocking", definition: "TEXT NULL" },
    { table: "scenes", column: "emotionalBeat", definition: "VARCHAR(255) NULL" },
    { table: "scenes", column: "actionDescription", definition: "TEXT NULL" },
    // Scenes table - sound design
    { table: "scenes", column: "ambientSound", definition: "VARCHAR(255) NULL" },
    { table: "scenes", column: "sfxNotes", definition: "TEXT NULL" },
    { table: "scenes", column: "musicMood", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "musicTempo", definition: "VARCHAR(64) NULL" },
    // Scenes table - dialogue
    { table: "scenes", column: "dialogueLines", definition: "JSON NULL" },
    { table: "scenes", column: "subtitleText", definition: "TEXT NULL" },
    // Scenes table - production
    { table: "scenes", column: "vfxNotes", definition: "TEXT NULL" },
    { table: "scenes", column: "sfxProductionNotes", definition: "TEXT NULL" },
    { table: "scenes", column: "visualEffects", definition: "JSON NULL" },
    { table: "scenes", column: "props", definition: "JSON NULL" },
    { table: "scenes", column: "wardrobe", definition: "JSON NULL" },
    { table: "scenes", column: "makeupNotes", definition: "TEXT NULL" },
    { table: "scenes", column: "stuntNotes", definition: "TEXT NULL" },
    { table: "scenes", column: "budgetEstimate", definition: "INT NULL" },
    { table: "scenes", column: "shootingDays", definition: "FLOAT NULL" },
    { table: "scenes", column: "aiPromptOverride", definition: "TEXT NULL" },
    // Scenes table - additional location fields
    { table: "scenes", column: "realEstateStyle", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "vehicleType", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "colorTemperature", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "shadowDepth", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "thumbnailUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "generatedUrl", definition: "TEXT NULL" },
    { table: "scenes", column: "referenceImages", definition: "JSON NULL" },
    // Characters table - extended profile fields
    { table: "characters", column: "role", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "storyImportance", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "screenTime", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "nationality", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "countryOfOrigin", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "cityOfOrigin", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "dateOfBirth", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "zodiacSign", definition: "VARCHAR(32) NULL" },
    { table: "characters", column: "occupation", definition: "VARCHAR(255) NULL" },
    { table: "characters", column: "educationLevel", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "socialClass", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "religion", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "languages", definition: "JSON NULL" },
    { table: "characters", column: "personality", definition: "JSON NULL" },
    { table: "characters", column: "arcType", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "moralAlignment", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "emotionalRange", definition: "JSON NULL" },
    { table: "characters", column: "backstory", definition: "TEXT NULL" },
    { table: "characters", column: "motivations", definition: "TEXT NULL" },
    { table: "characters", column: "fears", definition: "TEXT NULL" },
    { table: "characters", column: "secrets", definition: "TEXT NULL" },
    { table: "characters", column: "strengths", definition: "JSON NULL" },
    { table: "characters", column: "weaknesses", definition: "JSON NULL" },
    { table: "characters", column: "speechPattern", definition: "VARCHAR(255) NULL" },
    { table: "characters", column: "accent", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "catchphrase", definition: "VARCHAR(512) NULL" },
    { table: "characters", column: "voiceType", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "voiceId", definition: "VARCHAR(255) NULL" },
    { table: "characters", column: "relationships", definition: "JSON NULL" },
    { table: "characters", column: "environmentPreference", definition: "VARCHAR(255) NULL" },
    { table: "characters", column: "preferredWeather", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "preferredSeason", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "preferredTimeOfDay", definition: "VARCHAR(64) NULL" },
    { table: "characters", column: "physicalAbilities", definition: "JSON NULL" },
    { table: "characters", column: "mentalAbilities", definition: "JSON NULL" },
    { table: "characters", column: "specialSkills", definition: "JSON NULL" },
    { table: "characters", column: "wardrobe", definition: "JSON NULL" },
    { table: "characters", column: "performanceStyle", definition: "VARCHAR(128) NULL" },
    { table: "characters", column: "castingNotes", definition: "TEXT NULL" },
    { table: "characters", column: "signatureMannerisms", definition: "TEXT NULL" },
    { table: "characters", column: "voiceDescription", definition: "TEXT NULL" },
    { table: "characters", column: "isAiActor", definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "characters", column: "aiActorId", definition: "VARCHAR(128) NULL" },
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
  // Strategy: Just try ALTER TABLE ADD COLUMN directly — if column exists, MySQL throws
  // "Duplicate column name" which we catch and ignore. This is more reliable than
  // querying INFORMATION_SCHEMA which can have caching/permission issues.
  for (const col of missingColumns) {
    try {
      const alterSQL = `ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.definition}`;
      await db.execute(sql.raw(alterSQL));
      columnsAdded++;
      console.log(`[AutoMigrate] Added column ${col.table}.${col.column}`);
    } catch (err: any) {
      // "Duplicate column name" means it already exists — that's fine
      if (err.message?.includes("Duplicate column") || err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
        // Already exists, skip silently
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

  // ─── Step 3: Ensure all admin accounts have admin role ───
  const adminEmailsToPromote = [
    process.env.ADMIN_EMAIL || "Studiosvirelle@gmail.com",
    "leego972@gmail.com",
    "brobroplzcheck@gmail.com",
    "sisteror555@gmail.com",
  ];
  for (const adminEmail of adminEmailsToPromote) {
    try {
      const [adminRows] = await db.execute(sql.raw(
        `SELECT id, role FROM users WHERE LOWER(email) = '${adminEmail.toLowerCase()}' LIMIT 1`
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
      console.error(`[AutoMigrate] Failed to check/promote admin account ${adminEmail}:`, err.message);
    }
  }
  // ─── Step 4: Seed promo codes (INSERT IGNORE — safe to run repeatedly) ───
  const PROMO_CODES = [
    { code: "VIRELLE50",   description: "50% off — General launch promo" },
    { code: "DIRECTOR50",  description: "50% off — Founding director offer" },
    { code: "STUDIO50",    description: "50% off — Studio partner code" },
    { code: "FILM2025",    description: "50% off — 2025 launch special" },
    { code: "SCENE50",     description: "50% off — Scene builder promo" },
    { code: "CINEMATIC",   description: "50% off — Cinematic creator code" },
    { code: "BETA50",      description: "50% off — Beta tester appreciation" },
    { code: "PREMIERE50",  description: "50% off — Premiere partner code" },
    { code: "REEL50",      description: "50% off — Demo reel promo" },
    { code: "LAUNCH50",    description: "50% off — Platform launch code" },
  ];
  try {
    for (const c of PROMO_CODES) {
      await db.execute(sql.raw(
        `INSERT IGNORE INTO promo_codes (code, discountPercent, maxUses, description) VALUES ('${c.code}', 50, 1, '${c.description}')`
      ));
    }
    console.log(`[AutoMigrate] Promo codes seeded (${PROMO_CODES.length} codes, INSERT IGNORE)`);
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to seed promo codes:`, err.message);
  }
}
