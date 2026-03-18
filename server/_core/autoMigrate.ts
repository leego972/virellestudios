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
      name: "funding_sources",
      createSQL: `CREATE TABLE IF NOT EXISTS funding_sources (
        id INT AUTO_INCREMENT PRIMARY KEY,
        country VARCHAR(128) NOT NULL,
        organization VARCHAR(255) NOT NULL,
        type VARCHAR(128),
        supports TEXT,
        stage VARCHAR(255),
        fundingForm VARCHAR(255),
        eligibility TEXT,
        officialSite VARCHAR(512),
        notes TEXT,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "mailing_contacts",
      createSQL: `CREATE TABLE IF NOT EXISTS mailing_contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(320) NOT NULL UNIQUE,
        name VARCHAR(255),
        company VARCHAR(255),
        role VARCHAR(255),
        notes TEXT,
        tags JSON,
        status ENUM('active','unsubscribed','bounced','invalid') NOT NULL DEFAULT 'active',
        source VARCHAR(64) NOT NULL DEFAULT 'manual',
        unsubscribeToken VARCHAR(128),
        lastEmailedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "email_campaigns",
      createSQL: `CREATE TABLE IF NOT EXISTS email_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(512) NOT NULL,
        htmlBody TEXT NOT NULL,
        adImageUrl VARCHAR(1024),
        status ENUM('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
        sentCount INT NOT NULL DEFAULT 0,
        failedCount INT NOT NULL DEFAULT 0,
        openCount INT NOT NULL DEFAULT 0,
        sentAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "campaign_send_log",
      createSQL: `CREATE TABLE IF NOT EXISTS campaign_send_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaignId INT NOT NULL,
        contactId INT NOT NULL,
        status ENUM('sent','failed','bounced') NOT NULL DEFAULT 'sent',
        error TEXT,
        sentAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  // ─── Step 5: Seed beta tester accounts (INSERT IGNORE — safe to run repeatedly) ───
  // Pre-created accounts with industry-tier (full) access for beta testing.
  // Credentials to hand out:
  //   beta01@virellestudios.com / VirelleBeta01!
  //   beta02@virellestudios.com / VirelleBeta02!
  //   beta03@virellestudios.com / VirelleBeta03!
  //   beta04@virellestudios.com / VirelleBeta04!
  //   beta05@virellestudios.com / VirelleBeta05!
  //   beta06@virellestudios.com / VirelleBeta06!
  //   beta07@virellestudios.com / VirelleBeta07!
  //   beta08@virellestudios.com / VirelleBeta08!
  //   beta09@virellestudios.com / VirelleBeta09!
  //   beta10@virellestudios.com / VirelleBeta10!
  const BETA_ACCOUNTS = [
    { email: 'beta01@virellestudios.com', name: 'Beta Tester 01', hash: '$2b$12$kPcp3jQv.2xeT30d3piIKew0I51ENu9IQia9KsTrDAWb3FZWI.YtW' },
    { email: 'beta02@virellestudios.com', name: 'Beta Tester 02', hash: '$2b$12$OfsynB96qWPpeGC.nEaAL.QYMvFFzgzeTndnTJQ4i7wEmEg4mLhmi' },
    { email: 'beta03@virellestudios.com', name: 'Beta Tester 03', hash: '$2b$12$1bhSGVJqrEgdQ72rireGp.gStOEPrYx8srWCquhbUpSonJ/wRvo3i' },
    { email: 'beta04@virellestudios.com', name: 'Beta Tester 04', hash: '$2b$12$IlaXZw8SIWT5cr3DPLtwnO3WzGW/mClrk8yGvhGtkQ6lxFEHVgKWq' },
    { email: 'beta05@virellestudios.com', name: 'Beta Tester 05', hash: '$2b$12$MtkiCrPMSnJ3vnmpI6f12umwGADADPdVIKK4/9/M/GjOGAfw5Tusi' },
    { email: 'beta06@virellestudios.com', name: 'Beta Tester 06', hash: '$2b$12$zTfZfdCAYcYkiVZjZ5r7JeB38QsDTSwoubffp.ZK9oF1TqIWAZdEO' },
    { email: 'beta07@virellestudios.com', name: 'Beta Tester 07', hash: '$2b$12$jTRem0RgWS7WHJPfEyuh4OwUkXO.jIwNSAPYva.LsBQPIrbJOAoFS' },
    { email: 'beta08@virellestudios.com', name: 'Beta Tester 08', hash: '$2b$12$nUqVX2xYN0V5SRez6rWT/eSSNwQR/BqpKNMSfIHL6UoxJxOhfRxjq' },
    { email: 'beta09@virellestudios.com', name: 'Beta Tester 09', hash: '$2b$12$UqgWEDWiJzhr2eeqOyk5defWvokvWBT.BzCtpqTuMOPw9S2o6xWwu' },
    { email: 'beta10@virellestudios.com', name: 'Beta Tester 10', hash: '$2b$12$Bnw/0cXNuWO6qYNAeBJguelpY6/jldZjYxFN0XtkLUmM/FV3uk0rG' },
  ];
  try {
    for (const u of BETA_ACCOUNTS) {
      await db.execute(sql.raw(
        `INSERT IGNORE INTO users (openId, email, name, passwordHash, loginMethod, role, subscriptionTier, subscriptionStatus, monthlyGenerationsUsed, onboardingCompleted, lastSignedIn, createdAt, updatedAt) VALUES ('email_${u.email}', '${u.email}', '${u.name}', '${u.hash}', 'email', 'user', 'industry', 'active', 0, 1, NOW(), NOW(), NOW())`
      ));
    }
    console.log(`[AutoMigrate] Beta tester accounts seeded (${BETA_ACCOUNTS.length} accounts, INSERT IGNORE)`);
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to seed beta accounts:`, err.message);
  }

  // ─── Step 6: Seed film industry outreach contacts (INSERT IGNORE — safe to run repeatedly) ───
  // 30 public contacts from the film outreach database (Sony, Keshet, HanWay, mk2, LevelK, etc.)
  // Source: film_outreach_database_with_israel.xlsx — public-facing emails only
  const FILM_OUTREACH_CONTACTS = [
    { email: 'laura_stclair@spe.sony.com', name: 'Laura St Clair', company: 'Sony Pictures Television Formats', role: 'Vice President TV Sales & Intl Production Consultancy' },
    { email: 'stacy_weitz@spe.sony.com', name: 'Stacy Weitz', company: 'Sony Pictures Television Formats', role: 'SVP Communications' },
    { email: 'adam_lubner@spe.sony.com', name: 'Adam Lubner', company: 'Sony Pictures Television Formats', role: 'Executive Director Development Global Scripted Formats' },
    { email: 'sptb2b@spe.sony.com', name: 'SPT Marketing', company: 'Sony Pictures Television', role: 'B2B marketing contact' },
    { email: 'rebecca.e@keshet-tv.com', name: 'Rebecca Duddridge', company: 'Keshet International', role: 'SVP Marketing & Communications' },
    { email: 'maya.klein@keshet-tv.com', name: 'Maya Klein', company: 'Keshet International', role: 'Head of Marketing' },
    { email: 'anke.stoll@keshet-tv.com', name: 'Anke Stoll', company: 'Keshet International', role: 'Sales / market meetings' },
    { email: 'info@keshetinternational.com', name: 'General contact', company: 'Keshet International', role: 'Corporate' },
    { email: 'info@hanwayfilms.com', name: 'Management team', company: 'HanWay Films', role: 'General office' },
    { email: 'films@bankside-films.com', name: 'Stephen Kelliher', company: 'Bankside Films', role: 'Managing Director' },
    { email: 'info@visitfilms.com', name: 'Ryan Kampe', company: 'Visit Films', role: 'President' },
    { email: 'intlsales@mk2.com', name: 'International Sales', company: 'mk2 Films', role: 'Sales team' },
    { email: 'intlmarketing@mk2.com', name: 'International Marketing', company: 'mk2 Films', role: 'Marketing' },
    { email: 'tine.klint@levelk.dk', name: 'Tine Klint', company: 'LevelK', role: 'Founder & CEO' },
    { email: 'debra@levelk.dk', name: 'Debra Liang', company: 'LevelK', role: 'Head of Sales' },
    { email: 'niklas@levelk.dk', name: 'Niklas Teng', company: 'LevelK', role: 'Head of Partnerships / Festivals' },
    { email: 'natascha@levelk.dk', name: 'Natascha Degnova', company: 'LevelK', role: 'Head of PR & Marketing' },
    { email: 'sales@yellowaffair.com', name: 'Sales team', company: 'The Yellow Affair', role: 'Sales' },
    { email: 'contact@yellowaffair.com', name: 'General contact', company: 'The Yellow Affair', role: 'Corporate' },
    { email: 'contact@dogwoof.com', name: 'Anna Godas / Oli Harbottle', company: 'Dogwoof', role: 'CEO / Chief Content Officer' },
    { email: 'office@greenproductions.co.il', name: 'Israel office', company: 'Green Productions', role: 'Production office' },
    { email: 'info@gumfilms.com', name: 'Yoav Roeh / Aurit Zamir', company: 'Gum Films', role: 'Founders' },
    { email: 'office@2-team.com', name: 'Office', company: '2-Team Productions', role: 'Production office' },
    { email: 'mail@jap.co.il', name: 'Office', company: 'July August Productions', role: 'Production office' },
    { email: 'team@myteam.co.il', name: 'Office', company: 'TEAM Productions', role: 'Production office' },
    { email: 'avitalr@unitedking.co.il', name: 'Avital R.', company: 'United King Films', role: 'Distribution contact' },
    { email: 'marek@transfax.co.il', name: 'Marek Rozenbaum', company: 'Transfax Film Productions', role: 'Producer' },
    { email: 'orel@nfct.org.il', name: 'Orel Turner', company: 'New Fund for Cinema and Television', role: 'Executive Director' },
    { email: 'irit@nfct.org.il', name: 'Irit Shimrat', company: 'New Fund for Cinema and Television', role: 'Artistic Director / Intl Relations' },
    { email: 'info@nfct.org.il', name: 'General contact', company: 'New Fund for Cinema and Television', role: 'Office' },
  ];
  try {
    for (const c of FILM_OUTREACH_CONTACTS) {
      const token = require('crypto').randomBytes(32).toString('hex');
      await db.execute(sql.raw(
        `INSERT IGNORE INTO mailing_contacts (email, name, company, role, status, source, unsubscribeToken, createdAt, updatedAt) VALUES ('${c.email}', '${c.name.replace(/'/g, "''")}', '${c.company.replace(/'/g, "''")}', '${c.role.replace(/'/g, "''")}', 'active', 'import', '${token}', NOW(), NOW())`
      ));
    }
    console.log(`[AutoMigrate] Film outreach contacts seeded (${FILM_OUTREACH_CONTACTS.length} contacts, INSERT IGNORE)`);
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to seed film outreach contacts:`, err.message);
  }

  // ─── Step 7: Seed global film funding sources (INSERT IGNORE — safe to run repeatedly) ───
  // 101 funding sources from global_film_funding_database.xlsx
  try {
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Argentina', 'INCAA', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / credit', 'Argentina', 'https://www.incaa.gob.ar', 'Main Argentinian funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia', 'Screen Australia', 'National public agency', 'Film, TV, online, games', 'Development/Production/Distribution', 'Grant / investment', 'Australia', 'https://www.screenaustralia.gov.au/funding-and-support', 'Main Australian funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia (NSW)', 'Screen NSW', 'State public agency', 'Film/TV support', 'Development/Production/Post', 'Grant', 'New South Wales', 'https://www.screen.nsw.gov.au', 'State support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia (Queensland)', 'Screen Queensland', 'State public agency', 'Film/TV support', 'Development/Production/Post', 'Grant', 'Queensland', 'https://screenqueensland.com.au', 'State support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia (South Australia)', 'South Australian Film Corporation', 'State public agency', 'Film/TV support', 'Development/Production', 'Grant / investment', 'South Australia', 'https://www.safilm.com.au', 'State support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia (Victoria)', 'VicScreen', 'State public agency', 'Film/TV/games support', 'Development/Production', 'Grant', 'Victoria', 'https://www.vicscreen.vic.gov.au', 'State support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Australia (Western Australia)', 'Screenwest', 'State public agency', 'Film/TV support', 'Development/Production/Post', 'Grant', 'Western Australia', 'https://www.screenwest.com.au', 'State support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Austria', 'Austrian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Austria', 'https://www.filminstitut.at', 'Main Austrian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Austria', 'FISAplus', 'National incentive', 'Film/TV/streaming incentive', 'Production', 'Cash incentive', 'Austria', 'https://www.aws.at/en/fisaplus', 'Austrian incentive', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Belgium (Flanders)', 'Screen Flanders', 'Regional incentive fund', 'Economic support for audiovisual production', 'Production', 'Cash rebate / grant', 'Flanders', 'https://www.screenflanders.be', 'Production incentive', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Belgium (Flanders)', 'VAF', 'Regional public agency', 'Film, TV, games', 'Development/Production/Promotion', 'Grant', 'Flanders', 'https://www.vaf.be', 'Key Flemish fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Belgium (Wallonia-Brussels)', 'Centre du Cinema et de l''Audiovisuel', 'Regional public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'French Community of Belgium', 'https://audiovisuel.cfwb.be', 'French-speaking Belgium', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Brazil', 'ANCINE / FSA', 'National public agency/fund', 'Audiovisual support', 'Development/Production/Distribution', 'Grant / investment', 'Brazil', 'https://www.gov.br/ancine', 'Main Brazilian screen support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada', 'Canada Media Fund', 'Public-private fund', 'Screen content incl. film/TV overlap', 'Development/Production/Marketing', 'Grant / recoupable', 'Canada', 'https://cmf-fmc.ca', 'Key Canadian screen fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada', 'Telefilm Canada', 'National public agency', 'Features, talent, promotion, export', 'Development/Production/Promotion', 'Grant / investment', 'Canada', 'https://telefilm.ca/en/funding', 'Main Canadian funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada (Alberta)', 'Alberta Media Fund', 'Provincial agency', 'Film/TV/digital media', 'Production', 'Grant', 'Alberta', 'https://www.alberta.ca/alberta-media-fund', 'Alberta support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada (British Columbia)', 'Creative BC', 'Provincial agency', 'Film and TV support', 'Production', 'Tax credit / grants', 'British Columbia', 'https://creativebc.com', 'BC support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada (Ontario)', 'Ontario Creates', 'Provincial agency', 'Film/TV/book/music/games', 'Production', 'Tax credit / funding', 'Ontario', 'https://www.ontariocreates.ca', 'Ontario incentives and support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Canada (Quebec)', 'SODEC', 'Provincial public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant / investment', 'Quebec', 'https://sodec.gouv.qc.ca', 'Major Quebec fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Chile', 'Fondo de Fomento Audiovisual', 'National public fund', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Chile', 'https://www.fondosdecultura.cl/fondo-audiovisual', 'National Chilean fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Colombia', 'Proimágenes / Fondo para el Desarrollo Cinematográfico', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Colombia', 'https://www.proimagenescolombia.com', 'FDC administrator', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Council of Europe', 'Eurimages', 'Supranational public fund', 'Feature co-production, distribution, exhibition', 'Development/Production/Distribution', 'Grant / co-production support', 'Europe', 'https://www.coe.int/en/web/eurimages', 'Council of Europe film fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Croatia', 'HAVC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Croatia', 'https://havc.hr', 'Croatian Audiovisual Centre', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Czech Republic', 'Czech Audiovisual Fund', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Czech Republic', 'https://fondkinematografie.cz', 'Formerly Czech Film Fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Dominican Republic', 'DGCINE', 'National public agency', 'Film support and incentives', 'Production/Distribution', 'Tax incentive / grants', 'Dominican Republic', 'https://dgcine.gob.do', 'Growing Caribbean hub', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Estonia', 'Estonian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Estonia', 'https://www.filminstitute.ee/en', 'National Estonian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Europe / EU', 'Creative Europe MEDIA', 'Supranational public fund', 'Development, TV/slate, distribution, training, markets', 'Development; Production; Distribution; Training', 'Grant', 'Europe / EU', 'https://culture.ec.europa.eu/creative-europe/actions/media', 'EU audiovisual support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('France', 'Aide aux cinémas du monde', 'International co-production fund', 'Feature film co-production', 'Production/Post', 'Grant', 'International with French connection', 'https://www.cnc.fr/professionnels/aides-et-financements/cinema/aide-aux-cinemas-du-monde', 'CNC + Institut francais', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('France', 'CNC', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution/Exhibition', 'Grant / selective aid / tax support', 'France', 'https://www.cnc.fr', 'Main French film body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany', 'DFFF', 'National incentive', 'Production incentive', 'Production', 'Cash rebate', 'Germany', 'https://www.ffa.de/dfff.html', 'German federal incentive', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany', 'FFA', 'National public agency', 'Film production/distribution/exhibition', 'Development/Production/Distribution', 'Grant / automatic/selective support', 'Germany', 'https://www.ffa.de', 'Federal Film Board', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany', 'FFF Bayern', 'Regional public agency', 'Film, games, immersive', 'Development/Production/Distribution', 'Grant', 'Bavaria', 'https://www.fff-bayern.de', 'Major Bavarian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany', 'MOIN Film Fund Hamburg Schleswig-Holstein', 'Regional public agency', 'Film/series support', 'Development/Production', 'Grant', 'Hamburg/Schleswig-Holstein', 'https://www.moin-filmfoerderung.de', 'Regional fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany', 'Medienboard Berlin-Brandenburg', 'Regional public agency', 'Film and media', 'Development/Production/Distribution', 'Grant', 'Berlin-Brandenburg', 'https://www.medienboard.de', 'Major regional fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Germany / International', 'World Cinema Fund', 'International public fund', 'Feature film from regions with weak film infrastructure', 'Development/Production/Distribution', 'Grant', 'Global South / international', 'https://www.berlinale.de/en/world-cinema-fund.html', 'Berlinale-linked', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Greece', 'Creative Greece / Hellenic Film & Audiovisual Center', 'National public agency', 'Film and audiovisual', 'Development/Production', 'Grant / rebate', 'Greece', 'https://creativegreece.gr', 'Current Greek screen body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Hong Kong', 'Film Development Fund', 'Public fund', 'Film production and talent development', 'Development/Production/Training', 'Grant', 'Hong Kong', 'https://www.createhk.gov.hk/en/funding-support/film-development-fund.htm', 'HK public film fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Hungary', 'National Film Institute Hungary', 'National public agency', 'Film/TV support', 'Development/Production', 'Grant / incentive', 'Hungary', 'https://nfi.hu/en', 'Main Hungarian agency', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Ibero-America', 'Ibermedia', 'Supranational public fund', 'Co-production, development, distribution, training', 'Development/Production/Distribution', 'Grant', 'Ibero-America', 'https://www.programaibermedia.com', 'Multilateral Ibero-American support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('India', 'Film Bazaar', 'Market / industry platform', 'Project market and co-production access', 'Development/Packaging', 'Market / platform / labs', 'India', 'https://www.filmbazaarindia.com', 'Important funding-access route', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('India', 'NFDC India', 'National public enterprise', 'Film support', 'Development/Production/Co-production/Market', 'Grant / investment / market support', 'India', 'https://www.nfdcindia.com', 'Main national body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Indonesia', 'Ministry of Education, Culture / film support programs', 'Public agency', 'Film and cultural grants', 'Development/Production', 'Grant', 'Indonesia', 'https://kemenparekraf.go.id', 'Fragmented public support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Ireland', 'Fís Éireann/Screen Ireland', 'National public agency', 'Film, TV, animation, docs, shorts', 'Development/Production/Distribution', 'Grant / loan / equity', 'Ireland', 'https://www.screenireland.ie/funding', 'Main Irish funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Ireland', 'Section 481', 'Tax incentive', 'Film/TV production incentive', 'Production', 'Tax credit', 'Ireland', 'https://www.revenue.ie/en/companies-and-charities/financial-services-and-gambling/film-relief/index.aspx', 'Fiscal incentive', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Israel', 'Gesher Multicultural Film Fund', 'Foundation/public-interest fund', 'Multicultural film support', 'Development/Production', 'Grant', 'Israel', 'https://gesherfilmfund.org.il', 'Israeli multicultural fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Israel', 'Israel Film Fund', 'National/private public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://www.filmfund.org.il', 'Major Israeli feature fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Israel', 'New Fund for Cinema and Television', 'Foundation/public-interest fund', 'Documentary and social-change cinema/TV', 'Development/Production', 'Grant', 'Israel', 'https://nfct.org.il/en', 'Israeli independent fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Israel', 'Rabinovich Foundation - Cinema Project', 'Foundation/public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://rabinovichfoundation.org.il', 'Major Israeli cinema fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Italy', 'Apulia Film Fund / Apulia Film Commission', 'Regional public agency', 'Production support', 'Production', 'Grant / rebate', 'Apulia', 'https://www.apuliafilmcommission.it', 'Regional incentive/fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Italy', 'DGCA / Direzione Generale Cinema e Audiovisivo', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Tax credit / grants', 'Italy', 'https://cinema.cultura.gov.it', 'Main Italian film body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Japan', 'VIPO', 'Public-private support body', 'Co-production, market access, talent', 'Development/Production', 'Grant / support programs', 'Japan', 'https://www.vipo.or.jp/en', 'Japan international support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Jordan', 'Royal Film Commission - Jordan', 'Public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'Jordan', 'https://royalfilmcommission.jo', 'Jordanian support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Kenya', 'Kenya Film Commission', 'Public agency', 'Industry support and incentives', 'Production', 'Incentive / grant / facilitation', 'Kenya', 'https://filminginkenya.go.ke', 'Kenyan screen body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Latvia', 'National Film Centre of Latvia', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Latvia', 'https://nkc.gov.lv/en', 'National Latvian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Lebanon / MENA', 'AFAC', 'Private/nonprofit arts fund', 'Film and broader arts', 'Development/Production/Post', 'Grant', 'Arab region', 'https://www.arabculturefund.org', 'Major Arab arts/film fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Lithuania', 'Lithuanian Film Centre', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Lithuania', 'https://kinas.kultura.lt/en', 'National Lithuanian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Luxembourg', 'Film Fund Luxembourg', 'National public agency', 'Film and audiovisual', 'Development/Production', 'Grant / incentive', 'Luxembourg', 'https://www.filmfund.lu', 'Luxembourg support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Malaysia', 'FINAS', 'National public agency', 'Film support and incentives', 'Development/Production/Distribution', 'Grant / incentive', 'Malaysia', 'https://www.finas.gov.my/en', 'Malaysian film body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Mexico', 'EFICINE', 'Tax incentive', 'Film investment incentive', 'Production/Distribution', 'Tax credit', 'Mexico', 'https://www.imcine.gob.mx/eficine', 'Fiscal incentive', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Mexico', 'IMCINE', 'National public agency', 'Mexican cinema support', 'Development/Production/Distribution', 'Grant', 'Mexico', 'https://www.imcine.gob.mx', 'Main Mexican body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Morocco', 'CCM', 'National public agency', 'Film support and incentives', 'Development/Production', 'Grant / rebate', 'Morocco', 'https://www.ccm.ma', 'Moroccan film body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Netherlands', 'Netherlands Film Fund', 'National public agency', 'Feature, documentary, shorts, immersive', 'Development/Production/Distribution', 'Grant', 'Netherlands', 'https://www.filmfonds.nl', 'Main Dutch fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Netherlands / International', 'Hubert Bals Fund', 'International public/private fund', 'Features, docs, talent from underrepresented regions', 'Development/Production/Post', 'Grant', 'Global South / international', 'https://iffr.com/en/hubert-bals-fund', 'Rotterdam-linked fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Netherlands / International', 'IDFA Bertha Fund', 'International documentary fund', 'Creative documentary', 'Development/Production/Post', 'Grant', 'Africa, Asia, Eastern Europe, Latin America, Caribbean, Oceania', 'https://professionals.idfa.nl/training-funding/funding/about-the-idfa-bertha-fund/', 'Documentary-specific', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('New Zealand', 'New Zealand Film Commission', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'New Zealand', 'https://www.nzfilm.co.nz/funding', 'Main NZ funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Nigeria', 'Nigerian Film Corporation', 'Public agency', 'Film development and training', 'Development/Production', 'Grant / support programs', 'Nigeria', 'https://nigerianfilms.com', 'National institution', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Peru', 'DAFO / Ministry of Culture Audiovisual Support', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Peru', 'https://www.gob.pe/cultura', 'Peruvian public support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Philippines', 'FDCP', 'National public agency', 'Film development and promotion', 'Development/Production/Distribution', 'Grant / support programs', 'Philippines', 'https://www.fdcp.ph', 'Main Philippine screen body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Poland', 'Polish Film Institute', 'National public agency', 'Film development and production', 'Development/Production/Distribution', 'Grant', 'Poland', 'https://pisf.pl', 'Main Polish fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Portugal', 'ICA Portugal', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Portugal', 'https://www.ica-ip.pt', 'National Portuguese fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Puerto Rico', 'Puerto Rico Film Commission / Incentive Program', 'Public incentive body', 'Production support', 'Production', 'Tax incentive', 'Puerto Rico', 'https://www.film.pr.gov', 'Key Caribbean incentive body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Qatar / International', 'Doha Film Institute Grants', 'Private/nonprofit fund', 'Feature, short, experimental, essay, TV/web', 'Development/Production/Post', 'Grant', 'MENA / international eligible projects', 'https://www.dohafilm.com/en/funding-industry/funding/grants', 'Well-known MENA grant maker', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Romania', 'Romanian Film Centre (CNC)', 'National public agency', 'Film support', 'Development/Production', 'Grant', 'Romania', 'https://cnc.gov.ro', 'Romanian CNC', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Saudi Arabia / International', 'Red Sea Fund', 'Private/festival-linked fund', 'Feature, short, doc, animation, episodic', 'Development/Production/Post', 'Grant', 'Arab, African, Asian eligible projects', 'https://redseafilmfest.com/en/red-sea-fund/', 'Major regional fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Serbia', 'Film Center Serbia', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Serbia', 'https://www.fcs.rs', 'National Serbian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Singapore', 'IMDA', 'National public agency', 'Media and screen support', 'Development/Production', 'Grant', 'Singapore', 'https://www.imda.gov.sg', 'Singapore screen support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Slovenia', 'Slovenian Film Centre', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Slovenia', 'https://www.film-center.si/en', 'National Slovenian fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('South Africa', 'Gauteng Film Commission', 'Regional public agency', 'Production and incentives', 'Production', 'Incentive / support', 'Gauteng', 'https://www.gautengfilm.org.za', 'Regional support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('South Africa', 'KZN Film Commission', 'Regional public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'KwaZulu-Natal', 'https://kznfilm.co.za', 'Regional support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('South Africa', 'NFVF', 'National public agency', 'Film development, production, marketing, distribution', 'Development/Production/Distribution', 'Grant', 'South Africa', 'https://www.nfvf.co.za', 'Main South African funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('South Korea', 'KOFIC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / investment', 'South Korea', 'https://www.kofic.or.kr/eng', 'Korean Film Council', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Spain', 'ICAA', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Grant', 'Spain', 'https://www.cultura.gob.es/cultura/areas/cine/mc/icaa', 'Main Spanish agency', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Spain (Catalonia)', 'ICEC / Catalan Institute for Cultural Companies', 'Regional public agency', 'Audiovisual support', 'Development/Production', 'Grant', 'Catalonia', 'https://icec.gencat.cat', 'Catalan support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Switzerland', 'Federal Office of Culture (Film)', 'National public agency', 'Swiss film support', 'Development/Production/Distribution', 'Grant', 'Switzerland', 'https://www.bak.admin.ch/bak/en/home/cultural-promotion/film.html', 'Federal support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Switzerland', 'Zurich Film Foundation', 'Regional public agency', 'Feature, documentary, animation', 'Development/Production', 'Grant', 'Zurich / Switzerland', 'https://www.filmstiftung.ch', 'Major regional fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Switzerland / International', 'Visions Sud Est', 'International public fund', 'Feature fiction and documentary from Africa/Asia/LatAm/Eastern Europe', 'Production/Post', 'Grant', 'Global South / international', 'https://www.visionssudest.ch', 'Swiss-backed international fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Taiwan', 'TAICCA', 'Public agency', 'Content industry support incl. film/TV', 'Development/Production/Co-production', 'Grant / investment', 'Taiwan', 'https://en.taicca.tw', 'Taiwan content agency', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Tunisia', 'CNCI Tunisia', 'National public agency', 'Cinema and image support', 'Development/Production', 'Grant', 'Tunisia', 'https://www.culture.gov.tn', 'Tunisian public support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Ukraine', 'Ukrainian State Film Agency', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Ukraine', 'https://usfa.gov.ua', 'National Ukrainian film body', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United Kingdom', 'BBC Film', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning', 'UK / co-production', 'https://www.bbc.co.uk/bbcfilm', 'Public broadcaster film arm', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United Kingdom', 'BFI', 'National public agency', 'Feature film, shorts, development, distribution, skills', 'Development/Production/Distribution', 'Grant / lottery funding', 'UK', 'https://www.bfi.org.uk/get-funding-support', 'Main UK public funder', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United Kingdom', 'Film4', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning / investment', 'UK / international co-pro', 'https://www.channel4.com/4studio/film4', 'Important UK backer', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'Catapult Film Fund', 'Private/nonprofit fund', 'Documentary', 'Research/Development', 'Grant', 'International', 'https://catapultfilmfund.org', 'Early-stage doc fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'Chicken & Egg Pictures', 'Private/nonprofit fund', 'Documentary', 'Development/Production', 'Grant', 'International', 'https://chickeneggpics.org/grants', 'Doc support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'Ford Foundation JustFilms', 'Private/nonprofit fund', 'Social-issue film and doc', 'Development/Production', 'Grant', 'International', 'https://www.fordfoundation.org/work/our-grants/justfilms', 'Foundation-backed screen funding', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'IDA Enterprise Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production', 'Grant', 'International', 'https://www.documentary.org/enterprise', 'IDA doc support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'ITVS', 'Public/nonprofit fund', 'Documentary', 'Development/Production', 'Grant / commissioning', 'USA', 'https://itvs.org/funding', 'Public media doc support', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'NEA Media Arts', 'Public arts fund', 'Media arts including film/video', 'Development/Production', 'Grant', 'USA', 'https://www.arts.gov/grants', 'Broad arts funding', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'SFFILM', 'Private/nonprofit fund', 'Independent film', 'Development/Post', 'Grant', 'USA / international certain programs', 'https://sffilm.org/artist-development', 'Artist development and grants', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('United States', 'Sundance Institute Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production/Post', 'Grant', 'International', 'https://www.sundance.org/programs/documentary-fund', 'Major doc fund', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, createdAt, updatedAt) VALUES ('Uruguay', 'ICAU', 'National public agency', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Uruguay', 'https://icau.mec.gub.uy', 'Uruguayan film body', NOW(), NOW())`));
    console.log(`[AutoMigrate] Film funding sources seeded (101 sources, INSERT IGNORE)`);
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to seed funding sources:`, err.message);
  }
}
