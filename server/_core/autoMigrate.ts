/**
 * Auto-migration module
 * Runs on server startup to ensure the database schema matches the code.
 * Uses ALTER TABLE to add missing columns and CREATE TABLE IF NOT EXISTS for new tables.
 * This is safe to run repeatedly â it only adds what's missing.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { seedGlobalFundingV678 } from "./fundingSourcesV678";
import { logger } from "./logger";

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
    logger.warn("[AutoMigrate] Database not available, skipping migration");
    return;
  }

  logger.info("[AutoMigrate] Checking database schema...");

  // âââ New tables that may not exist âââ
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
        pacing VARCHAR(32) NULL,
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
      // v6.85: Stripe webhook event idempotency ledger.
      // Every Stripe webhook event we receive is recorded here, keyed on the
      // unique stripeEventId. The unique index lets us safely INSERT IGNORE
      // to atomically claim an event for processing â Stripe retries (which
      // reuse the same event.id) become no-ops.
      // resourceType / resourceId capture the underlying object (session,
      // invoice, subscription) so we can additionally answer "has this
      // invoice already been credited?" across event-id boundaries.
      name: "stripe_webhook_events",
      createSQL: `CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stripeEventId VARCHAR(255) NOT NULL UNIQUE,
        eventType VARCHAR(128) NOT NULL,
        resourceType VARCHAR(64) NULL,
        resourceId VARCHAR(255) NULL,
        userId INT NULL,
        creditsGranted INT NOT NULL DEFAULT 0,
        status ENUM('processing','processed','error') NOT NULL DEFAULT 'processing',
        errorMessage TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_stripe_evt_type (eventType),
        INDEX idx_stripe_evt_resource (resourceType, resourceId),
        INDEX idx_stripe_evt_user (userId),
        INDEX idx_stripe_evt_status (status)
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
    {
      name: "film_mix_settings",
      createSQL: `CREATE TABLE IF NOT EXISTS film_mix_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        dialogueBus FLOAT NOT NULL DEFAULT 0.85,
        musicBus FLOAT NOT NULL DEFAULT 0.70,
        effectsBus FLOAT NOT NULL DEFAULT 0.75,
        masterVolume FLOAT NOT NULL DEFAULT 1.0,
        dialogueEqLow FLOAT NOT NULL DEFAULT 0.0,
        dialogueEqMid FLOAT NOT NULL DEFAULT 0.0,
        dialogueEqHigh FLOAT NOT NULL DEFAULT 0.0,
        musicEqLow FLOAT NOT NULL DEFAULT 0.0,
        musicEqMid FLOAT NOT NULL DEFAULT 0.0,
        musicEqHigh FLOAT NOT NULL DEFAULT 0.0,
        sfxEqLow FLOAT NOT NULL DEFAULT 0.0,
        sfxEqMid FLOAT NOT NULL DEFAULT 0.0,
        sfxEqHigh FLOAT NOT NULL DEFAULT 0.0,
        reverbRoom ENUM('none','small','medium','large','hall','cathedral') NOT NULL DEFAULT 'none',
        reverbAmount FLOAT NOT NULL DEFAULT 0.0,
        compressionRatio FLOAT NOT NULL DEFAULT 1.0,
        noiseReduction BOOLEAN NOT NULL DEFAULT FALSE,
        notes TEXT NULL,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_project_mix (projectId)
      )`,
    },
    {
      name: "film_adr_tracks",
      createSQL: `CREATE TABLE IF NOT EXISTS film_adr_tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        characterName VARCHAR(255) NOT NULL,
        dialogueLine TEXT NOT NULL,
        trackType ENUM('adr','wild_track','loop_group','walla') NOT NULL DEFAULT 'adr',
        status ENUM('pending','recorded','approved','rejected') NOT NULL DEFAULT 'pending',
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "film_foley_tracks",
      createSQL: `CREATE TABLE IF NOT EXISTS film_foley_tracks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        foleyType ENUM('footsteps','cloth','props','impacts','environmental','custom') NOT NULL DEFAULT 'custom',
        description TEXT NULL,
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        volume FLOAT NOT NULL DEFAULT 0.8,
        startTime FLOAT NOT NULL DEFAULT 0,
        status ENUM('pending','recorded','approved') NOT NULL DEFAULT 'pending',
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "film_score_cues",
      createSQL: `CREATE TABLE IF NOT EXISTS film_score_cues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        sceneId INT NULL,
        userId INT NOT NULL,
        cueNumber VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        cueType ENUM('underscore','source_music','sting','theme','transition','silence') NOT NULL DEFAULT 'underscore',
        description TEXT NULL,
        fileUrl TEXT NULL,
        fileKey VARCHAR(512) NULL,
        volume FLOAT NOT NULL DEFAULT 0.7,
        fadeIn FLOAT NOT NULL DEFAULT 0.0,
        fadeOut FLOAT NOT NULL DEFAULT 0.0,
        startTime FLOAT NOT NULL DEFAULT 0,
        duration FLOAT NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "assetPurchases",
      createSQL: `CREATE TABLE IF NOT EXISTS assetPurchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        assetId VARCHAR(64) NOT NULL,
        stripeSessionId VARCHAR(255) NULL,
        stripePaymentIntentId VARCHAR(255) NULL,
        amountAud INT NOT NULL,
        status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
        purchasedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "youtubeExports",
      createSQL: `CREATE TABLE IF NOT EXISTS youtubeExports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        movieId INT NULL,
        projectId INT NULL,
        videoUrl TEXT NOT NULL,
        youtubeVideoId VARCHAR(64) NOT NULL,
        youtubeUrl TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        privacyStatus ENUM('public','unlisted','private') NOT NULL DEFAULT 'public',
        status ENUM('pending','uploading','done','failed') NOT NULL DEFAULT 'pending',
        errorMessage TEXT NULL,
        exportedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "directorVision",
      createSQL: `CREATE TABLE IF NOT EXISTS directorVision (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL UNIQUE,
        userId INT NOT NULL,
        cameraSystem VARCHAR(128) NULL,
        lensSet VARCHAR(128) NULL,
        aspectRatio VARCHAR(16) NULL,
        frameRate VARCHAR(16) NULL,
        shootingFormat VARCHAR(64) NULL,
        colorGradeStyle VARCHAR(128) NULL,
        referenceFilms JSON NULL,
        colorPalette JSON NULL,
        lutName VARCHAR(128) NULL,
        movementStyle VARCHAR(128) NULL,
        coverageNotes TEXT NULL,
        lightingStyle VARCHAR(128) NULL,
        soundDesignDirection TEXT NULL,
        musicGenre VARCHAR(128) NULL,
        visualDnaPrompt TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "productionVehicles",
      createSQL: `CREATE TABLE IF NOT EXISTS productionVehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        make VARCHAR(128) NULL,
        model VARCHAR(128) NULL,
        year INT NULL,
        color VARCHAR(128) NULL,
        \`condition\` VARCHAR(64) NULL,
        vehicleRole VARCHAR(64) NOT NULL DEFAULT 'hero',
        vehicleType VARCHAR(64) NULL,
        period VARCHAR(64) NULL,
        specialFeatures TEXT NULL,
        sceneIds JSON NULL,
        aiVisualPrompt TEXT NULL,
        referenceImages JSON NULL,
        notes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "wardrobeItems",
      createSQL: `CREATE TABLE IF NOT EXISTS wardrobeItems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(64) NULL,
        imageUrl TEXT NOT NULL,
        storageKey VARCHAR(512) NULL,
        description TEXT NULL,
        color VARCHAR(128) NULL,
        secondaryColor VARCHAR(128) NULL,
        fabric VARCHAR(128) NULL,
        \`condition\` VARCHAR(64) NULL,
        brand VARCHAR(128) NULL,
        era VARCHAR(128) NULL,
        tags JSON NULL,
        aiGarmentName VARCHAR(255) NULL,
        aiCategory VARCHAR(64) NULL,
        aiStyleProfile TEXT NULL,
        aiPromptSuffix TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "shotListItems",
      createSQL: `CREATE TABLE IF NOT EXISTS shotListItems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        sceneName VARCHAR(255) NOT NULL,
        sceneNumber VARCHAR(32) NULL,
        shotNumber VARCHAR(16) NOT NULL,
        shotType VARCHAR(32) NULL,
        lensLength VARCHAR(32) NULL,
        cameraMovement VARCHAR(64) NULL,
        frameDescription TEXT NULL,
        action TEXT NULL,
        dialogue TEXT NULL,
        estimatedDuration FLOAT NULL,
        lightingNote TEXT NULL,
        directorNote TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
      name: "shootingDays",
      createSQL: `CREATE TABLE IF NOT EXISTS shootingDays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        dayNumber INT NOT NULL,
        locationName VARCHAR(255) NULL,
        scenes JSON NULL,
        callTime VARCHAR(16) NULL,
        wrapTime VARCHAR(16) NULL,
        estimatedPages VARCHAR(32) NULL,
        notes TEXT NULL,
        lightingWindow TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    },
    {
        name: "featureCuts",
        createSQL: `CREATE TABLE IF NOT EXISTS featureCuts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(64) NOT NULL DEFAULT 'v1.0',
          description TEXT NULL,
          isLocked TINYINT(1) NOT NULL DEFAULT 0,
          lockedAt TIMESTAMP NULL,
          lockedBy INT NULL,
          isDefault TINYINT(1) NOT NULL DEFAULT 0,
          totalDuration INT NOT NULL DEFAULT 0,
          sceneCount INT NOT NULL DEFAULT 0,
          targetRuntime INT NULL,
          actStructure ENUM('three-act','five-act','heros-journey','nonlinear','episodic','two-act') NOT NULL DEFAULT 'three-act',
          notes TEXT NULL,
          metadata JSON NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "featureCutScenes",
        createSQL: `CREATE TABLE IF NOT EXISTS featureCutScenes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cutId INT NOT NULL,
          sceneId INT NOT NULL,
          orderIndex INT NOT NULL,
          actNumber INT NOT NULL DEFAULT 1,
          actLabel VARCHAR(128) NULL,
          sequenceLabel VARCHAR(128) NULL,
          isIncluded TINYINT(1) NOT NULL DEFAULT 1,
          trimIn INT NOT NULL DEFAULT 0,
          trimOut INT NOT NULL DEFAULT 0,
          transitionType VARCHAR(64) NOT NULL DEFAULT 'cut',
          transitionDuration FLOAT NOT NULL DEFAULT 0,
          directorNote TEXT NULL,
          colorGrade VARCHAR(64) NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "filmCompileJobs",
        createSQL: `CREATE TABLE IF NOT EXISTS filmCompileJobs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          cutId INT NULL,
          userId INT NOT NULL,
          status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
          progress INT NOT NULL DEFAULT 0,
          currentStep VARCHAR(255) NULL,
          resultUrl TEXT NULL,
          resultKey VARCHAR(512) NULL,
          resultDuration INT NULL,
          resultFileSize INT NULL,
          errorMessage TEXT NULL,
          includeOpener TINYINT(1) NOT NULL DEFAULT 1,
          includeCredits TINYINT(1) NOT NULL DEFAULT 1,
          burnSubtitles TINYINT(1) NOT NULL DEFAULT 0,
          resolution VARCHAR(16) NOT NULL DEFAULT '1080p',
          frameRate INT NOT NULL DEFAULT 24,
          metadata JSON NULL,
          startedAt TIMESTAMP NULL,
          completedAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        // v6.77 â Per-project brand allow/block list. See drizzle/schema.ts.
        name: "projectBrands",
        createSQL: `CREATE TABLE IF NOT EXISTS projectBrands (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          projectId INT NOT NULL,
          name VARCHAR(128) NOT NULL,
          category VARCHAR(64) NULL,
          policy VARCHAR(16) NOT NULL DEFAULT 'allowed',
          notes TEXT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_project_brands_project (projectId),
          INDEX idx_project_brands_user (userId)
        )`,
      },
      // âââ v6.77 Designer Wardrobe (4 tables) âââ
      // Lets designers/costume designers/brands upload wardrobe + costume
      // collections that directors can browse and attach to characters/
      // scenes for prompt context. See drizzle/0028_designer_wardrobe_v677.sql
      // for the canonical migration; these CREATE TABLE statements provision
      // the same schema at runtime so any DB that hasn't run the migration
      // sweep gets the tables on first boot.
      {
        name: "designerProfiles",
        createSQL: `CREATE TABLE IF NOT EXISTS designerProfiles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          brandName VARCHAR(255) NOT NULL,
          displayName VARCHAR(255) NULL,
          profileType VARCHAR(64) NOT NULL DEFAULT 'designer',
          bio TEXT NULL,
          website VARCHAR(512) NULL,
          instagram VARCHAR(255) NULL,
          contactEmail VARCHAR(320) NULL,
          logoUrl TEXT NULL,
          verified BOOLEAN NOT NULL DEFAULT FALSE,
          visibility VARCHAR(32) NOT NULL DEFAULT 'public',
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_designer_profiles_user (userId),
          INDEX idx_designer_profiles_visibility (visibility)
        )`,
      },
      {
        name: "designerCollections",
        createSQL: `CREATE TABLE IF NOT EXISTS designerCollections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          designerProfileId INT NOT NULL,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          collectionType VARCHAR(64) NOT NULL DEFAULT 'wardrobe',
          season VARCHAR(128) NULL,
          year INT NULL,
          styleTags JSON NULL,
          coverImageUrl TEXT NULL,
          visibility VARCHAR(32) NOT NULL DEFAULT 'public',
          licenseType VARCHAR(64) NOT NULL DEFAULT 'reference_only',
          licenseNotes TEXT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_designer_collections_profile (designerProfileId),
          INDEX idx_designer_collections_user (userId),
          INDEX idx_designer_collections_visibility (visibility)
        )`,
      },
      {
        name: "wardrobeItems",
        createSQL: `CREATE TABLE IF NOT EXISTS wardrobeItems (
          id INT AUTO_INCREMENT PRIMARY KEY,
          collectionId INT NULL,
          userId INT NOT NULL,
          designerProfileId INT NULL,
          projectId INT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NULL,
          category VARCHAR(64) NULL,
          subcategory VARCHAR(128) NULL,
          wardrobeType VARCHAR(64) NOT NULL DEFAULT 'wardrobe',
          genderFit VARCHAR(64) NULL,
          sizeRange VARCHAR(128) NULL,
          era VARCHAR(128) NULL,
          colors JSON NULL,
          materials JSON NULL,
          styleTags JSON NULL,
          imageUrls JSON NULL,
          primaryImageUrl TEXT NULL,
          referencePrompt TEXT NULL,
          faceCoverage VARCHAR(16) NOT NULL DEFAULT 'none',
          brandPlacementAllowed BOOLEAN NOT NULL DEFAULT FALSE,
          shopfrontPlacementAllowed BOOLEAN NOT NULL DEFAULT TRUE,
          characterWardrobeAllowed BOOLEAN NOT NULL DEFAULT TRUE,
          costumeUseAllowed BOOLEAN NOT NULL DEFAULT TRUE,
          commercialUseAllowed BOOLEAN NOT NULL DEFAULT FALSE,
          licenseType VARCHAR(64) NOT NULL DEFAULT 'reference_only',
          licenseNotes TEXT NULL,
          visibility VARCHAR(32) NOT NULL DEFAULT 'public',
          status VARCHAR(32) NOT NULL DEFAULT 'active',
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wardrobe_items_collection (collectionId),
          INDEX idx_wardrobe_items_user (userId),
          INDEX idx_wardrobe_items_designer (designerProfileId),
          INDEX idx_wardrobe_items_project (projectId),
          INDEX idx_wardrobe_items_visibility (visibility),
          INDEX idx_wardrobe_items_type (wardrobeType)
        )`,
      },
      {
        name: "wardrobeAssignments",
        createSQL: `CREATE TABLE IF NOT EXISTS wardrobeAssignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          projectId INT NOT NULL,
          wardrobeItemId INT NOT NULL,
          assignmentType VARCHAR(64) NOT NULL,
          characterId INT NULL,
          sceneId INT NULL,
          fromSceneOrder INT NULL,
          toSceneOrder INT NULL,
          identityMode VARCHAR(32) NOT NULL DEFAULT 'auto',
          usageMode VARCHAR(64) NOT NULL DEFAULT 'reference',
          placementNotes TEXT NULL,
          promptWeight INT NOT NULL DEFAULT 50,
          locked BOOLEAN NOT NULL DEFAULT FALSE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wardrobe_assign_project (projectId),
          INDEX idx_wardrobe_assign_user (userId),
          INDEX idx_wardrobe_assign_item (wardrobeItemId),
          INDEX idx_wardrobe_assign_character (characterId),
          INDEX idx_wardrobe_assign_scene (sceneId)
        )`,
      },
    {
        name: "wardrobeLeases",
        createSQL: `CREATE TABLE IF NOT EXISTS wardrobeLeases (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          designerProfileId INT NOT NULL,
          wardrobeItemId INT NULL,
          collectionId INT NULL,
          leaseType VARCHAR(32) NOT NULL,
          stripePaymentIntentId VARCHAR(255) NULL,
          stripeTransferId VARCHAR(255) NULL,
          amountPaidAud INT NOT NULL,
          designerAmountAud INT NOT NULL,
          platformFeeAud INT NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'pending',
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wardrobe_leases_user (userId),
          INDEX idx_wardrobe_leases_designer (designerProfileId),
          INDEX idx_wardrobe_leases_item (wardrobeItemId),
          INDEX idx_wardrobe_leases_collection (collectionId)
        )`,
      },
    {
        name: "crowdfundCampaigns",
        createSQL: `CREATE TABLE IF NOT EXISTS crowdfundCampaigns (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          projectId INT NULL,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          tagline VARCHAR(512) NULL,
          description TEXT NULL,
          posterUrl TEXT NULL,
          videoUrl TEXT NULL,
          genre VARCHAR(128) NULL,
          format VARCHAR(64) NULL,
          goalAmountCents INT NOT NULL,
          raisedAmountCents INT NOT NULL DEFAULT 0,
          backerCount INT NOT NULL DEFAULT 0,
          fundingModel ENUM('all_or_nothing','keep_it_all') NOT NULL DEFAULT 'all_or_nothing',
          status ENUM('draft','active','funded','failed','paid_out','cancelled') NOT NULL DEFAULT 'draft',
          deadline TIMESTAMP NULL,
          launchedAt TIMESTAMP NULL,
          closedAt TIMESTAMP NULL,
          platformFeeBps INT NOT NULL DEFAULT 700,
          stripeConnectAccountId VARCHAR(255) NULL,
          stripeConnectOnboarded BOOLEAN NOT NULL DEFAULT FALSE,
          payoutEmail VARCHAR(320) NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cf_campaigns_user (userId),
          INDEX idx_cf_campaigns_status (status),
          INDEX idx_cf_campaigns_slug (slug)
        )`,
      },
      {
        name: "crowdfundRewards",
        createSQL: `CREATE TABLE IF NOT EXISTS crowdfundRewards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          campaignId INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          amountCents INT NOT NULL,
          limitCount INT NULL,
          claimedCount INT NOT NULL DEFAULT 0,
          estimatedDelivery VARCHAR(128) NULL,
          sortOrder INT NOT NULL DEFAULT 0,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cf_rewards_campaign (campaignId)
        )`,
      },
      {
        name: "crowdfundContributions",
        createSQL: `CREATE TABLE IF NOT EXISTS crowdfundContributions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          campaignId INT NOT NULL,
          userId INT NULL,
          backerEmail VARCHAR(320) NULL,
          backerName VARCHAR(255) NULL,
          rewardId INT NULL,
          amountCents INT NOT NULL,
          platformFeeCents INT NOT NULL,
          message TEXT NULL,
          isAnonymous BOOLEAN NOT NULL DEFAULT FALSE,
          status ENUM('pending','paid','failed','refunded','captured','cancelled') NOT NULL DEFAULT 'pending',
          stripeSessionId VARCHAR(255) NULL,
          stripePaymentIntentId VARCHAR(255) NULL,
          stripeTransferId VARCHAR(255) NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cf_contribs_campaign (campaignId),
          INDEX idx_cf_contribs_user (userId),
          INDEX idx_cf_contribs_session (stripeSessionId)
        )`,
      },
      {
        name: "crowdfundPayouts",
        createSQL: `CREATE TABLE IF NOT EXISTS crowdfundPayouts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          campaignId INT NOT NULL,
          grossAmountCents INT NOT NULL,
          platformFeeCents INT NOT NULL,
          netAmountCents INT NOT NULL,
          stripeTransferId VARCHAR(255) NULL,
          status ENUM('pending','processing','paid','failed') NOT NULL DEFAULT 'pending',
          notes TEXT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cf_payouts_campaign (campaignId)
        )`,
      },
    {
        name: "projectBackgrounds",
        createSQL: `CREATE TABLE IF NOT EXISTS projectBackgrounds (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          backgroundType VARCHAR(32) NOT NULL DEFAULT 'location',
          description TEXT,
          referenceImageUrl TEXT,
          thumbnailUrl TEXT,
          styleNotes TEXT,
          locationTags JSON,
          vehicleMake VARCHAR(128),
          vehicleModel VARCHAR(128),
          vehicleYear INT,
          vehicleColor VARCHAR(128),
          vehicleInterior TEXT,
          vehicleCondition VARCHAR(128),
          locked BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "projectProps",
        createSQL: `CREATE TABLE IF NOT EXISTS projectProps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(64),
          description TEXT,
          referenceImageUrl TEXT,
          thumbnailUrl TEXT,
          colors JSON,
          era VARCHAR(128),
          styleTags JSON,
          locked BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "propAssignments",
        createSQL: `CREATE TABLE IF NOT EXISTS propAssignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT NOT NULL,
          projectId INT NOT NULL,
          propId INT NOT NULL,
          characterId INT,
          fromSceneOrder INT,
          toSceneOrder INT,
          usageNotes TEXT,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "projectActs",
        createSQL: `CREATE TABLE IF NOT EXISTS projectActs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          userId INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          orderIndex INT NOT NULL DEFAULT 0,
          actType VARCHAR(64) NOT NULL DEFAULT 'act',
          description TEXT,
          colorHex VARCHAR(7),
          isEpisodeBoundary BOOLEAN NOT NULL DEFAULT FALSE,
          episodeNumber INT,
          episodeTitle VARCHAR(255),
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
      {
        name: "projectVisualDNA",
        createSQL: `CREATE TABLE IF NOT EXISTS projectVisualDNA (
          id INT AUTO_INCREMENT PRIMARY KEY,
          projectId INT NOT NULL,
          userId INT NOT NULL,
          genreProfile VARCHAR(128),
          cinematographer VARCHAR(255),
          referenceFilms JSON,
          lensProfile VARCHAR(128),
          lightingStyle VARCHAR(128),
          colorPalette VARCHAR(255),
          colorTemperature VARCHAR(64),
          filmStock VARCHAR(128),
          aspectRatio VARCHAR(16),
          visualNotes TEXT,
          locked BOOLEAN NOT NULL DEFAULT FALSE,
          globalColorGrade VARCHAR(128),
          globalColorGradeLocked BOOLEAN NOT NULL DEFAULT FALSE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
      },
  
  ];

  // âââ Columns that may be missing from existing tables âââ
  const missingColumns: ColumnCheck[] = [
    // Character/costume continuity contract
    { table: "wardrobeItems", column: "faceCoverage", definition: "VARCHAR(16) NOT NULL DEFAULT 'none'" },
    { table: "wardrobeAssignments", column: "fromSceneOrder", definition: "INT NULL" },
    { table: "wardrobeAssignments", column: "toSceneOrder", definition: "INT NULL" },
    { table: "wardrobeAssignments", column: "identityMode", definition: "VARCHAR(32) NOT NULL DEFAULT 'auto'" },
    // Projects table â EPK generator needs slug + releaseDate
      { table: "projects", column: "slug", definition: "VARCHAR(255) NULL" },
      { table: "projects", column: "releaseDate", definition: "DATE NULL" },
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
    { table: "scenes", column: "sceneType", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "lensFilter", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "shootingFormat", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "coverageType", definition: "VARCHAR(64) NULL" },
    { table: "scenes", column: "screenDirection", definition: "VARCHAR(32) NULL" },
    { table: "scenes", column: "shotIntent", definition: "TEXT NULL" },
    { table: "scenes", column: "practicalLights", definition: "TEXT NULL" },
    { table: "scenes", column: "dialogueSubtext", definition: "TEXT NULL" },
    { table: "scenes", column: "negativePrompt", definition: "TEXT NULL" },
    { table: "scenes", column: "seed", definition: "INT NULL" },
    { table: "scenes", column: "voiceRoles", definition: "JSON NULL" },
    { table: "scenes", column: "continuityNotes", definition: "TEXT NULL" },
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
    { table: "users", column: "userVeniceKey", definition: "TEXT NULL" },
    { table: "users", column: "userDidKey", definition: "TEXT NULL" },
    { table: "users", column: "preferredLlmProvider", definition: "VARCHAR(32) NULL" },
    { table: "users", column: "directorInstructions", definition: "TEXT NULL" }, // Custom instructions for the Director's Assistant AI
    // v6.76 â BYOK fallback policy persisted per user. Was added in migration
    // 0026_byok_fallback_mode_v669.sql but never registered with autoMigrate,
    // so any production DB that skipped that migration file (or was provisioned
    // afterwards from schema.ts alone) was missing the column. Drizzle's
    // SELECT * still includes the field, which crashes EVERY users query â
    // including the login flow â with "Unknown column 'byokFallbackMode'".
    // Registering it here makes autoMigrate provision it on next boot.
    { table: "users", column: "byokFallbackMode", definition: "VARCHAR(32) DEFAULT 'byok_with_consent'" },
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
    // v6.62 â project-level style anchors
    { table: "projects", column: "referenceImages", definition: "JSON NULL" },
    // v6.62 â sticky NLE export aspect ratio preference per project
    { table: "projects", column: "exportAspectRatio", definition: "VARCHAR(16) NULL DEFAULT '16:9'" },
    // Accessibility â optional subtitle burn-in and Auslan interpreter overlay
    { table: "projects", column: "subtitlesEnabled", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "projects", column: "auslanEnabled", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "projects", column: "auslanPosition", definition: "VARCHAR(16) NULL DEFAULT 'bottom-right'" },
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
    { table: "characters", column: "voiceSampleUrl", definition: "TEXT NULL" },
    { table: "characters", column: "voiceLanguage", definition: "VARCHAR(16) NULL" },
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
    // funding_sources extended fields from global fund CSV
    { table: "funding_sources", column: "packType", definition: "VARCHAR(128) NULL" },
    { table: "funding_sources", column: "primaryLanguage", definition: "VARCHAR(128) NULL" },
    { table: "funding_sources", column: "packTitle", definition: "VARCHAR(512) NULL" },
    { table: "funding_sources", column: "localizedSections", definition: "TEXT NULL" },
    { table: "funding_sources", column: "recommendedAttachments", definition: "TEXT NULL" },
    { table: "funding_sources", column: "tailoringNotes", definition: "TEXT NULL" },
    { table: "film_foley_tracks", column: "status", definition: "ENUM('pending','recorded','approved') NOT NULL DEFAULT 'pending'" },
    { table: "dialogues", column: "pacing", definition: "VARCHAR(32) NULL" },
    // YouTube export tracking on movies
    { table: "movies", column: "youtubeVideoId", definition: "VARCHAR(64) NULL" },
    { table: "movies", column: "youtubeUrl", definition: "TEXT NULL" },
    { table: "movies", column: "youtubeExportedAt", definition: "TIMESTAMP NULL" },
    // Locations â pre-production scout & director variables
    { table: "locations", column: "bestTimeOfDay",       definition: "VARCHAR(64) NULL" },
    { table: "locations", column: "weatherPreferences",  definition: "JSON NULL" },
    { table: "locations", column: "permitStatus",        definition: "VARCHAR(32) NULL DEFAULT 'not_required'" },
    { table: "locations", column: "permitNotes",         definition: "TEXT NULL" },
    { table: "locations", column: "powerAccess",         definition: "BOOLEAN NOT NULL DEFAULT FALSE" },
    { table: "locations", column: "parkingNotes",        definition: "TEXT NULL" },
    { table: "locations", column: "crewCapacity",        definition: "VARCHAR(64) NULL" },
    { table: "locations", column: "shootingConstraints", definition: "TEXT NULL" },
    { table: "locations", column: "seasonalNotes",       definition: "TEXT NULL" },
    { table: "locations", column: "aiVisualPrompt",      definition: "TEXT NULL" },
    { table: "locations", column: "architecturalStyle",  definition: "VARCHAR(128) NULL" },
    { table: "locations", column: "eraOverride",         definition: "VARCHAR(64) NULL" },
    { table: "locations", column: "countryOverride",     definition: "VARCHAR(128) NULL" },
    { table: "locations", column: "socialClass",         definition: "VARCHAR(64) NULL" },
    { table: "directorVision", column: "productionEra",      definition: "VARCHAR(128) NULL" },
    { table: "directorVision", column: "productionCountry",  definition: "VARCHAR(128) NULL" },
    { table: "directorVision", column: "productionSetting",  definition: "TEXT NULL" },
    { table: "directorVision", column: "architecturalStyle", definition: "VARCHAR(128) NULL" },
    { table: "wardrobeItems", column: "sceneRef", definition: "INT NULL" },
    { table: "scenes", column: "userId", definition: "INT NULL" },
    // ââ users (auto-added missing columns) ââ
    { table: "users", column: "openId", definition: "VARCHAR(64) NOT NULL" },
    { table: "users", column: "name", definition: "TEXT NULL" },
    { table: "users", column: "role", definition: "ENUM('user','admin') NOT NULL DEFAULT 'user'" },
    { table: "users", column: "lastSignedIn", definition: "TIMESTAMP NOT NULL" },
    // ââ projects (auto-added missing columns) ââ
    { table: "projects", column: "userId", definition: "INT NOT NULL" },
    { table: "projects", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "projects", column: "description", definition: "TEXT NULL" },
    { table: "projects", column: "mode", definition: "ENUM('quick','manual') NOT NULL DEFAULT 'quick'" },
    { table: "projects", column: "status", definition: "ENUM('draft','generating','paused','completed','failed') NOT NULL DEFAULT 'draft'" },
    // ââ characters (auto-added missing columns) ââ
    { table: "characters", column: "userId", definition: "INT NOT NULL" },
    { table: "characters", column: "projectId", definition: "INT NULL" },
    { table: "characters", column: "name", definition: "VARCHAR(128) NOT NULL" },
    { table: "characters", column: "description", definition: "TEXT NULL" },
    { table: "characters", column: "photoUrl", definition: "TEXT NULL" },
    { table: "characters", column: "attributes", definition: "JSON NULL" },
    // ââ scenes (auto-added missing columns) ââ
    { table: "scenes", column: "projectId", definition: "INT NOT NULL" },
    { table: "scenes", column: "orderIndex", definition: "INT NOT NULL DEFAULT 0" },
    { table: "scenes", column: "title", definition: "VARCHAR(255) NULL" },
    { table: "scenes", column: "description", definition: "TEXT NULL" },
    { table: "scenes", column: "timeOfDay", definition: "ENUM('dawn','morning','afternoon','evening','night','golden-hour') NULL DEFAULT 'afternoon'" },
    { table: "scenes", column: "weather", definition: "ENUM('clear','cloudy','rainy','stormy','snowy','foggy','windy') NULL DEFAULT 'clear'" },
    { table: "scenes", column: "lighting", definition: "ENUM('natural','dramatic','soft','neon','candlelight','studio','backlit','silhouette') NULL DEFAULT 'natural'" },
    { table: "scenes", column: "cameraAngle", definition: "ENUM('wide','medium','close-up','extreme-close-up','birds-eye','low-angle','dutch-angle','over-shoulder','pov') NULL DEFAULT 'medium'" },
    { table: "scenes", column: "locationType", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "mood", definition: "VARCHAR(128) NULL" },
    { table: "scenes", column: "characterIds", definition: "JSON NULL" },
    { table: "scenes", column: "characterPositions", definition: "JSON NULL" },
    { table: "scenes", column: "dialogueText", definition: "TEXT NULL" },
    { table: "scenes", column: "duration", definition: "INT NULL DEFAULT 30" },
    { table: "scenes", column: "status", definition: "ENUM('draft','generating','completed','failed') NOT NULL DEFAULT 'draft'" },
    { table: "scenes", column: "shootDayId", definition: "INT NULL" },
    { table: "scenes", column: "shootOrder", definition: "INT NOT NULL DEFAULT 0" },
    { table: "scenes", column: "shotList", definition: "JSON NULL" },
    { table: "scenes", column: "approvalStatus", definition: "VARCHAR(32) NOT NULL DEFAULT 'pending'" },
    { table: "scenes", column: "approvedBy", definition: "INT NULL" },
    { table: "scenes", column: "approvedAt", definition: "TIMESTAMP NULL" },
    { table: "scenes", column: "approvalNote", definition: "TEXT NULL" },
    // ââ generationJobs (auto-added missing columns) ââ
    { table: "generationJobs", column: "projectId", definition: "INT NOT NULL" },
    { table: "generationJobs", column: "sceneId", definition: "INT NULL" },
    { table: "generationJobs", column: "type", definition: "ENUM('full-film','scene','preview') NOT NULL" },
    { table: "generationJobs", column: "status", definition: "ENUM('queued','processing','paused','completed','failed') NOT NULL DEFAULT 'queued'" },
    { table: "generationJobs", column: "progress", definition: "INT NULL DEFAULT 0" },
    { table: "generationJobs", column: "estimatedSeconds", definition: "INT NULL" },
    { table: "generationJobs", column: "resultUrl", definition: "TEXT NULL" },
    { table: "generationJobs", column: "errorMessage", definition: "TEXT NULL" },
    { table: "generationJobs", column: "metadata", definition: "JSON NULL" },
    // ââ frameComments (auto-added missing columns) ââ
    { table: "frameComments", column: "projectId", definition: "INT NOT NULL" },
    { table: "frameComments", column: "sceneId", definition: "INT NULL" },
    { table: "frameComments", column: "movieId", definition: "INT NULL" },
    { table: "frameComments", column: "userId", definition: "INT NOT NULL" },
    { table: "frameComments", column: "timestampSeconds", definition: "FLOAT NOT NULL" },
    { table: "frameComments", column: "body", definition: "TEXT NOT NULL" },
    { table: "frameComments", column: "resolved", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "frameComments", column: "parentId", definition: "INT NULL" },
    // ââ scripts (auto-added missing columns) ââ
    { table: "scripts", column: "projectId", definition: "INT NOT NULL" },
    { table: "scripts", column: "userId", definition: "INT NOT NULL" },
    { table: "scripts", column: "title", definition: "VARCHAR(255) NOT NULL DEFAULT 'Untitled Script'" },
    { table: "scripts", column: "content", definition: "TEXT NULL" },
    { table: "scripts", column: "version", definition: "INT NOT NULL DEFAULT 1" },
    { table: "scripts", column: "pageCount", definition: "INT NULL DEFAULT 0" },
    { table: "scripts", column: "metadata", definition: "JSON NULL" },
    // ââ soundtracks (auto-added missing columns) ââ
    { table: "soundtracks", column: "projectId", definition: "INT NOT NULL" },
    { table: "soundtracks", column: "sceneId", definition: "INT NULL" },
    { table: "soundtracks", column: "userId", definition: "INT NOT NULL" },
    { table: "soundtracks", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "soundtracks", column: "artist", definition: "VARCHAR(255) NULL" },
    { table: "soundtracks", column: "genre", definition: "VARCHAR(128) NULL" },
    { table: "soundtracks", column: "mood", definition: "VARCHAR(128) NULL" },
    { table: "soundtracks", column: "fileUrl", definition: "TEXT NULL" },
    { table: "soundtracks", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "soundtracks", column: "duration", definition: "INT NULL" },
    { table: "soundtracks", column: "startTime", definition: "FLOAT NULL DEFAULT 0" },
    { table: "soundtracks", column: "volume", definition: "FLOAT NULL" },
    { table: "soundtracks", column: "fadeIn", definition: "FLOAT NULL DEFAULT 0" },
    { table: "soundtracks", column: "fadeOut", definition: "FLOAT NULL DEFAULT 0" },
    { table: "soundtracks", column: "loop", definition: "INT NULL DEFAULT 0" },
    { table: "soundtracks", column: "notes", definition: "TEXT NULL" },
    // ââ credits (auto-added missing columns) ââ
    { table: "credits", column: "projectId", definition: "INT NOT NULL" },
    { table: "credits", column: "userId", definition: "INT NOT NULL" },
    { table: "credits", column: "role", definition: "VARCHAR(128) NOT NULL" },
    { table: "credits", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "credits", column: "characterName", definition: "VARCHAR(255) NULL" },
    { table: "credits", column: "orderIndex", definition: "INT NOT NULL DEFAULT 0" },
    { table: "credits", column: "section", definition: "ENUM('opening','closing') NOT NULL DEFAULT 'closing'" },
    // ââ locations (auto-added missing columns) ââ
    { table: "locations", column: "projectId", definition: "INT NOT NULL" },
    { table: "locations", column: "userId", definition: "INT NOT NULL" },
    { table: "locations", column: "sceneId", definition: "INT NULL" },
    { table: "locations", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "locations", column: "address", definition: "VARCHAR(512) NULL" },
    { table: "locations", column: "locationType", definition: "VARCHAR(128) NULL" },
    { table: "locations", column: "description", definition: "TEXT NULL" },
    { table: "locations", column: "referenceImages", definition: "JSON NULL" },
    { table: "locations", column: "notes", definition: "TEXT NULL" },
    { table: "locations", column: "tags", definition: "JSON NULL" },
    { table: "locations", column: "latitude", definition: "FLOAT NULL" },
    { table: "locations", column: "longitude", definition: "FLOAT NULL" },
    // ââ moodBoardItems (auto-added missing columns) ââ
    { table: "moodBoardItems", column: "projectId", definition: "INT NOT NULL" },
    { table: "moodBoardItems", column: "userId", definition: "INT NOT NULL" },
    { table: "moodBoardItems", column: "type", definition: "ENUM('image','color','text','reference') NOT NULL DEFAULT 'image'" },
    { table: "moodBoardItems", column: "imageUrl", definition: "TEXT NULL" },
    { table: "moodBoardItems", column: "text", definition: "TEXT NULL" },
    { table: "moodBoardItems", column: "color", definition: "VARCHAR(32) NULL" },
    { table: "moodBoardItems", column: "tags", definition: "JSON NULL" },
    { table: "moodBoardItems", column: "category", definition: "VARCHAR(128) NULL" },
    { table: "moodBoardItems", column: "posX", definition: "INT NULL DEFAULT 0" },
    { table: "moodBoardItems", column: "posY", definition: "INT NULL DEFAULT 0" },
    { table: "moodBoardItems", column: "width", definition: "INT NULL DEFAULT 200" },
    { table: "moodBoardItems", column: "height", definition: "INT NULL DEFAULT 200" },
    // ââ subtitles (auto-added missing columns) ââ
    { table: "subtitles", column: "projectId", definition: "INT NOT NULL" },
    { table: "subtitles", column: "userId", definition: "INT NOT NULL" },
    { table: "subtitles", column: "language", definition: "VARCHAR(32) NOT NULL" },
    { table: "subtitles", column: "languageName", definition: "VARCHAR(128) NOT NULL" },
    { table: "subtitles", column: "entries", definition: "JSON NULL" },
    { table: "subtitles", column: "isGenerated", definition: "INT NULL DEFAULT 0" },
    { table: "subtitles", column: "isTranslation", definition: "INT NULL DEFAULT 0" },
    { table: "subtitles", column: "sourceLanguage", definition: "VARCHAR(32) NULL" },
    // ââ dialogues (auto-added missing columns) ââ
    { table: "dialogues", column: "projectId", definition: "INT NOT NULL" },
    { table: "dialogues", column: "sceneId", definition: "INT NULL" },
    { table: "dialogues", column: "userId", definition: "INT NOT NULL" },
    { table: "dialogues", column: "characterId", definition: "INT NULL" },
    { table: "dialogues", column: "characterName", definition: "VARCHAR(255) NOT NULL" },
    { table: "dialogues", column: "line", definition: "TEXT NOT NULL" },
    { table: "dialogues", column: "emotion", definition: "VARCHAR(128) NULL" },
    { table: "dialogues", column: "direction", definition: "TEXT NULL" },
    { table: "dialogues", column: "orderIndex", definition: "INT NOT NULL DEFAULT 0" },
    // ââ budgets (auto-added missing columns) ââ
    { table: "budgets", column: "projectId", definition: "INT NOT NULL" },
    { table: "budgets", column: "userId", definition: "INT NOT NULL" },
    { table: "budgets", column: "totalEstimate", definition: "FLOAT NULL DEFAULT 0" },
    { table: "budgets", column: "currency", definition: "VARCHAR(8) NULL DEFAULT 'USD'" },
    { table: "budgets", column: "breakdown", definition: "JSON NULL" },
    { table: "budgets", column: "aiAnalysis", definition: "TEXT NULL" },
    { table: "budgets", column: "generatedAt", definition: "TIMESTAMP NOT NULL" },
    // ââ soundEffects (auto-added missing columns) ââ
    { table: "soundEffects", column: "projectId", definition: "INT NOT NULL" },
    { table: "soundEffects", column: "sceneId", definition: "INT NULL" },
    { table: "soundEffects", column: "userId", definition: "INT NOT NULL" },
    { table: "soundEffects", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "soundEffects", column: "category", definition: "VARCHAR(128) NOT NULL" },
    { table: "soundEffects", column: "fileUrl", definition: "TEXT NULL" },
    { table: "soundEffects", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "soundEffects", column: "duration", definition: "FLOAT NULL" },
    { table: "soundEffects", column: "isCustom", definition: "INT NULL DEFAULT 0" },
    { table: "soundEffects", column: "volume", definition: "FLOAT NULL" },
    { table: "soundEffects", column: "startTime", definition: "FLOAT NULL DEFAULT 0" },
    { table: "soundEffects", column: "loop", definition: "INT NULL DEFAULT 0" },
    { table: "soundEffects", column: "tags", definition: "JSON NULL" },
    { table: "soundEffects", column: "notes", definition: "TEXT NULL" },
    // ââ collaborators (auto-added missing columns) ââ
    { table: "collaborators", column: "projectId", definition: "INT NOT NULL" },
    { table: "collaborators", column: "userId", definition: "INT NULL" },
    { table: "collaborators", column: "invitedBy", definition: "INT NOT NULL" },
    { table: "collaborators", column: "email", definition: "VARCHAR(320) NULL" },
    { table: "collaborators", column: "inviteToken", definition: "VARCHAR(128) NOT NULL" },
    { table: "collaborators", column: "collabRole", definition: "ENUM('viewer','editor','producer','director') NOT NULL DEFAULT 'editor'" },
    { table: "collaborators", column: "inviteStatus", definition: "ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending'" },
    // ââ movies (auto-added missing columns) ââ
    { table: "movies", column: "userId", definition: "INT NOT NULL" },
    { table: "movies", column: "projectId", definition: "INT NULL" },
    { table: "movies", column: "movieTitle", definition: "VARCHAR(255) NULL" },
    { table: "movies", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "movies", column: "sceneNumber", definition: "INT NULL" },
    { table: "movies", column: "description", definition: "TEXT NULL" },
    { table: "movies", column: "movieType", definition: "ENUM('scene','trailer','film') NOT NULL DEFAULT 'scene'" },
    { table: "movies", column: "fileUrl", definition: "TEXT NULL" },
    { table: "movies", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "movies", column: "thumbnailUrl", definition: "TEXT NULL" },
    { table: "movies", column: "thumbnailKey", definition: "VARCHAR(512) NULL" },
    { table: "movies", column: "duration", definition: "INT NULL" },
    { table: "movies", column: "fileSize", definition: "INT NULL" },
    { table: "movies", column: "mimeType", definition: "VARCHAR(128) NULL DEFAULT 'video/mp4'" },
    { table: "movies", column: "tags", definition: "JSON NULL" },
    { table: "movies", column: "approvalStatus", definition: "VARCHAR(32) NOT NULL DEFAULT 'pending'" },
    { table: "movies", column: "approvedBy", definition: "INT NULL" },
    { table: "movies", column: "approvedAt", definition: "TIMESTAMP NULL" },
    { table: "movies", column: "approvalNote", definition: "TEXT NULL" },
    // ââ directorChats (auto-added missing columns) ââ
    { table: "directorChats", column: "projectId", definition: "INT NOT NULL" },
    { table: "directorChats", column: "userId", definition: "INT NOT NULL" },
    { table: "directorChats", column: "chatRole", definition: "ENUM('user','assistant','system') NOT NULL" },
    { table: "directorChats", column: "content", definition: "TEXT NOT NULL" },
    { table: "directorChats", column: "actionType", definition: "VARCHAR(128) NULL" },
    { table: "directorChats", column: "actionData", definition: "JSON NULL" },
    { table: "directorChats", column: "actionStatus", definition: "ENUM('pending','executed','failed') NULL DEFAULT 'pending'" },
    // ââ visualEffects (auto-added missing columns) ââ
    { table: "visualEffects", column: "projectId", definition: "INT NOT NULL" },
    { table: "visualEffects", column: "sceneId", definition: "INT NULL" },
    { table: "visualEffects", column: "userId", definition: "INT NOT NULL" },
    { table: "visualEffects", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "visualEffects", column: "category", definition: "VARCHAR(128) NOT NULL" },
    { table: "visualEffects", column: "subcategory", definition: "VARCHAR(128) NULL" },
    { table: "visualEffects", column: "description", definition: "TEXT NULL" },
    { table: "visualEffects", column: "previewUrl", definition: "TEXT NULL" },
    { table: "visualEffects", column: "previewKey", definition: "VARCHAR(512) NULL" },
    { table: "visualEffects", column: "intensity", definition: "FLOAT NULL" },
    { table: "visualEffects", column: "duration", definition: "FLOAT NULL" },
    { table: "visualEffects", column: "startTime", definition: "FLOAT NULL DEFAULT 0" },
    { table: "visualEffects", column: "layer", definition: "ENUM('background','midground','foreground','overlay') NULL DEFAULT 'overlay'" },
    { table: "visualEffects", column: "blendMode", definition: "VARCHAR(64) NULL DEFAULT 'normal'" },
    { table: "visualEffects", column: "colorTint", definition: "VARCHAR(32) NULL" },
    { table: "visualEffects", column: "parameters", definition: "JSON NULL" },
    { table: "visualEffects", column: "isCustom", definition: "INT NULL DEFAULT 0" },
    { table: "visualEffects", column: "tags", definition: "JSON NULL" },
    { table: "visualEffects", column: "notes", definition: "TEXT NULL" },
    // ââ password_reset_tokens (auto-added missing columns) ââ
    { table: "password_reset_tokens", column: "userId", definition: "INT NOT NULL" },
    { table: "password_reset_tokens", column: "token", definition: "VARCHAR(128) NOT NULL" },
    { table: "password_reset_tokens", column: "expiresAt", definition: "TIMESTAMP NOT NULL" },
    { table: "password_reset_tokens", column: "used", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    // ââ blog_articles (auto-added missing columns) ââ
    { table: "blog_articles", column: "slug", definition: "VARCHAR(255) NOT NULL" },
    { table: "blog_articles", column: "title", definition: "VARCHAR(512) NOT NULL" },
    { table: "blog_articles", column: "subtitle", definition: "VARCHAR(512) NULL" },
    { table: "blog_articles", column: "content", definition: "TEXT NOT NULL" },
    { table: "blog_articles", column: "excerpt", definition: "TEXT NULL" },
    { table: "blog_articles", column: "category", definition: "VARCHAR(128) NOT NULL" },
    { table: "blog_articles", column: "tags", definition: "JSON NULL" },
    { table: "blog_articles", column: "coverImageUrl", definition: "TEXT NULL" },
    { table: "blog_articles", column: "coverImageAlt", definition: "VARCHAR(512) NULL" },
    { table: "blog_articles", column: "metaTitle", definition: "VARCHAR(160) NULL" },
    { table: "blog_articles", column: "metaDescription", definition: "VARCHAR(320) NULL" },
    { table: "blog_articles", column: "canonicalUrl", definition: "VARCHAR(512) NULL" },
    { table: "blog_articles", column: "articleStatus", definition: "ENUM('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft'" },
    { table: "blog_articles", column: "publishedAt", definition: "TIMESTAMP NULL" },
    { table: "blog_articles", column: "scheduledFor", definition: "TIMESTAMP NULL" },
    { table: "blog_articles", column: "viewCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "blog_articles", column: "generatedByAI", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "blog_articles", column: "generationPrompt", definition: "TEXT NULL" },
    // ââ referral_codes (auto-added missing columns) ââ
    { table: "referral_codes", column: "userId", definition: "INT NOT NULL" },
    { table: "referral_codes", column: "code", definition: "VARCHAR(32) NOT NULL" },
    { table: "referral_codes", column: "totalReferrals", definition: "INT NOT NULL DEFAULT 0" },
    { table: "referral_codes", column: "successfulReferrals", definition: "INT NOT NULL DEFAULT 0" },
    { table: "referral_codes", column: "bonusGenerationsEarned", definition: "INT NOT NULL DEFAULT 0" },
    { table: "referral_codes", column: "isActive", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    // ââ referral_tracking (auto-added missing columns) ââ
    { table: "referral_tracking", column: "referralCodeId", definition: "INT NOT NULL" },
    { table: "referral_tracking", column: "referrerId", definition: "INT NOT NULL" },
    { table: "referral_tracking", column: "referredUserId", definition: "INT NULL" },
    { table: "referral_tracking", column: "referredEmail", definition: "VARCHAR(320) NULL" },
    { table: "referral_tracking", column: "referralStatus", definition: "ENUM('clicked','registered','rewarded') NOT NULL DEFAULT 'clicked'" },
    { table: "referral_tracking", column: "rewardType", definition: "VARCHAR(64) NULL" },
    { table: "referral_tracking", column: "rewardAmount", definition: "INT NULL" },
    { table: "referral_tracking", column: "rewardedAt", definition: "TIMESTAMP NULL" },
    { table: "referral_tracking", column: "ipAddress", definition: "VARCHAR(45) NULL" },
    { table: "referral_tracking", column: "userAgent", definition: "TEXT NULL" },
    // ââ notifications (auto-added missing columns) ââ
    { table: "notifications", column: "userId", definition: "INT NOT NULL" },
    { table: "notifications", column: "notificationType", definition: "TEXT NULL" },
    { table: "notifications", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "notifications", column: "message", definition: "TEXT NULL" },
    { table: "notifications", column: "link", definition: "VARCHAR(512) NULL" },
    { table: "notifications", column: "isRead", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    // ââ moderationIncidents (auto-added missing columns) ââ
    { table: "moderationIncidents", column: "userId", definition: "INT NOT NULL" },
    { table: "moderationIncidents", column: "contentType", definition: "VARCHAR(128) NOT NULL" },
    { table: "moderationIncidents", column: "contentSnippet", definition: "TEXT NOT NULL" },
    { table: "moderationIncidents", column: "violations", definition: "JSON NOT NULL" },
    { table: "moderationIncidents", column: "severity", definition: "ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'LOW'" },
    { table: "moderationIncidents", column: "shouldFreeze", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "moderationIncidents", column: "shouldReport", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "moderationIncidents", column: "moderationStatus", definition: "ENUM('pending_review','reviewed_cleared','reviewed_actioned','reported_to_authorities') NOT NULL DEFAULT 'pending_review'" },
    { table: "moderationIncidents", column: "reviewedBy", definition: "INT NULL" },
    { table: "moderationIncidents", column: "reviewNotes", definition: "TEXT NULL" },
    // ââ credit_transactions (auto-added missing columns) ââ
    { table: "credit_transactions", column: "userId", definition: "INT NOT NULL" },
    { table: "credit_transactions", column: "amount", definition: "INT NOT NULL" },
    { table: "credit_transactions", column: "action", definition: "VARCHAR(128) NOT NULL" },
    { table: "credit_transactions", column: "description", definition: "TEXT NULL" },
    { table: "credit_transactions", column: "balanceAfter", definition: "INT NOT NULL" },
    // ââ projectSamples (auto-added missing columns) ââ
    { table: "projectSamples", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "projectSamples", column: "description", definition: "TEXT NULL" },
    { table: "projectSamples", column: "genre", definition: "VARCHAR(64) NULL" },
    { table: "projectSamples", column: "provider", definition: "VARCHAR(64) NULL" },
    { table: "projectSamples", column: "videoUrl", definition: "TEXT NOT NULL" },
    { table: "projectSamples", column: "thumbnailUrl", definition: "TEXT NULL" },
    { table: "projectSamples", column: "durationSeconds", definition: "INT NULL" },
    { table: "projectSamples", column: "displayOrder", definition: "INT NOT NULL DEFAULT 0" },
    { table: "projectSamples", column: "isPublished", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "projectSamples", column: "uploadedBy", definition: "INT NOT NULL" },
    // ââ marketing_settings (auto-added missing columns) ââ
    { table: "marketing_settings", column: "key", definition: "VARCHAR(128) NULL" },
    { table: "marketing_settings", column: "value", definition: "TEXT NULL" },
    { table: "marketing_settings", column: "updated_at", definition: "TIMESTAMP NOT NULL" },
    // ââ marketing_budgets (auto-added missing columns) ââ
    { table: "marketing_budgets", column: "month", definition: "VARCHAR(7) NOT NULL" },
    { table: "marketing_budgets", column: "channel", definition: "VARCHAR(64) NOT NULL" },
    { table: "marketing_budgets", column: "allocated_amount", definition: "DECIMAL(10,2) NOT NULL" },
    { table: "marketing_budgets", column: "spent_amount", definition: "DECIMAL(10,2) NOT NULL DEFAULT '0'" },
    { table: "marketing_budgets", column: "roi", definition: "DECIMAL(10,2) NULL DEFAULT '0'" },
    { table: "marketing_budgets", column: "reasoning", definition: "TEXT NULL" },
    { table: "marketing_budgets", column: "created_at", definition: "TIMESTAMP NOT NULL" },
    { table: "marketing_budgets", column: "updated_at", definition: "TIMESTAMP NOT NULL" },
    // ââ marketing_campaigns (auto-added missing columns) ââ
    { table: "marketing_campaigns", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "marketing_campaigns", column: "objective", definition: "VARCHAR(128) NOT NULL" },
    { table: "marketing_campaigns", column: "status", definition: "VARCHAR(64) NOT NULL DEFAULT 'draft'" },
    { table: "marketing_campaigns", column: "budget", definition: "DECIMAL(10,2) NOT NULL" },
    { table: "marketing_campaigns", column: "spend", definition: "DECIMAL(10,2) NOT NULL DEFAULT '0'" },
    { table: "marketing_campaigns", column: "start_date", definition: "TIMESTAMP NULL" },
    { table: "marketing_campaigns", column: "end_date", definition: "TIMESTAMP NULL" },
    { table: "marketing_campaigns", column: "target_audiences", definition: "JSON NULL" },
    { table: "marketing_campaigns", column: "metrics", definition: "JSON NULL" },
    { table: "marketing_campaigns", column: "created_at", definition: "TIMESTAMP NOT NULL" },
    { table: "marketing_campaigns", column: "updated_at", definition: "TIMESTAMP NOT NULL" },
    // ââ marketing_content (auto-added missing columns) ââ
    { table: "marketing_content", column: "campaign_id", definition: "INT NULL" },
    { table: "marketing_content", column: "platform", definition: "VARCHAR(64) NOT NULL" },
    { table: "marketing_content", column: "type", definition: "VARCHAR(64) NOT NULL" },
    { table: "marketing_content", column: "headline", definition: "VARCHAR(512) NULL" },
    { table: "marketing_content", column: "body", definition: "TEXT NOT NULL" },
    { table: "marketing_content", column: "image_url", definition: "VARCHAR(1024) NULL" },
    { table: "marketing_content", column: "video_url", definition: "VARCHAR(1024) NULL" },
    { table: "marketing_content", column: "status", definition: "VARCHAR(64) NOT NULL DEFAULT 'pending'" },
    { table: "marketing_content", column: "scheduled_for", definition: "TIMESTAMP NULL" },
    { table: "marketing_content", column: "published_at", definition: "TIMESTAMP NULL" },
    { table: "marketing_content", column: "platform_post_id", definition: "VARCHAR(255) NULL" },
    { table: "marketing_content", column: "metrics", definition: "JSON NULL" },
    { table: "marketing_content", column: "created_at", definition: "TIMESTAMP NOT NULL" },
    { table: "marketing_content", column: "updated_at", definition: "TIMESTAMP NOT NULL" },
    // ââ marketing_performance (auto-added missing columns) ââ
    { table: "marketing_performance", column: "date", definition: "DATE NOT NULL" },
    { table: "marketing_performance", column: "channel", definition: "VARCHAR(64) NOT NULL" },
    { table: "marketing_performance", column: "spend", definition: "DECIMAL(10,2) NOT NULL DEFAULT '0'" },
    { table: "marketing_performance", column: "impressions", definition: "INT NOT NULL DEFAULT 0" },
    { table: "marketing_performance", column: "clicks", definition: "INT NOT NULL DEFAULT 0" },
    { table: "marketing_performance", column: "conversions", definition: "INT NOT NULL DEFAULT 0" },
    { table: "marketing_performance", column: "cpc", definition: "DECIMAL(10,2) NULL DEFAULT '0'" },
    { table: "marketing_performance", column: "cpa", definition: "DECIMAL(10,2) NULL DEFAULT '0'" },
    { table: "marketing_performance", column: "roi", definition: "DECIMAL(10,2) NULL DEFAULT '0'" },
    { table: "marketing_performance", column: "created_at", definition: "TIMESTAMP NOT NULL" },
    // ââ marketing_activity_log (auto-added missing columns) ââ
    { table: "marketing_activity_log", column: "action", definition: "VARCHAR(128) NOT NULL" },
    { table: "marketing_activity_log", column: "description", definition: "TEXT NOT NULL" },
    { table: "marketing_activity_log", column: "metadata", definition: "JSON NULL" },
    { table: "marketing_activity_log", column: "created_at", definition: "TIMESTAMP NOT NULL" },
    // ââ content_creator_campaigns (auto-added missing columns) ââ
    { table: "content_creator_campaigns", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "content_creator_campaigns", column: "description", definition: "TEXT NULL" },
    { table: "content_creator_campaigns", column: "objective", definition: "VARCHAR(255) NULL" },
    { table: "content_creator_campaigns", column: "targetAudience", definition: "VARCHAR(255) NULL" },
    { table: "content_creator_campaigns", column: "platforms", definition: "JSON NULL" },
    { table: "content_creator_campaigns", column: "seoKeywords", definition: "JSON NULL" },
    { table: "content_creator_campaigns", column: "brandVoice", definition: "TEXT NULL" },
    { table: "content_creator_campaigns", column: "aiStrategy", definition: "TEXT NULL" },
    { table: "content_creator_campaigns", column: "status", definition: "VARCHAR(32) NOT NULL DEFAULT 'draft'" },
    { table: "content_creator_campaigns", column: "totalPieces", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_campaigns", column: "publishedPieces", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_campaigns", column: "tiktokLinked", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "content_creator_campaigns", column: "seoLinked", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "content_creator_campaigns", column: "advertisingLinked", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "content_creator_campaigns", column: "startDate", definition: "TIMESTAMP NULL" },
    { table: "content_creator_campaigns", column: "endDate", definition: "TIMESTAMP NULL" },
    // ââ content_creator_pieces (auto-added missing columns) ââ
    { table: "content_creator_pieces", column: "campaignId", definition: "INT NULL" },
    { table: "content_creator_pieces", column: "platform", definition: "VARCHAR(64) NOT NULL" },
    { table: "content_creator_pieces", column: "contentType", definition: "VARCHAR(64) NOT NULL" },
    { table: "content_creator_pieces", column: "status", definition: "VARCHAR(32) NOT NULL DEFAULT 'draft'" },
    { table: "content_creator_pieces", column: "title", definition: "VARCHAR(512) NULL" },
    { table: "content_creator_pieces", column: "headline", definition: "VARCHAR(512) NULL" },
    { table: "content_creator_pieces", column: "body", definition: "TEXT NOT NULL" },
    { table: "content_creator_pieces", column: "callToAction", definition: "VARCHAR(255) NULL" },
    { table: "content_creator_pieces", column: "hook", definition: "VARCHAR(512) NULL" },
    { table: "content_creator_pieces", column: "videoScript", definition: "TEXT NULL" },
    { table: "content_creator_pieces", column: "visualDirections", definition: "JSON NULL" },
    { table: "content_creator_pieces", column: "hashtags", definition: "JSON NULL" },
    { table: "content_creator_pieces", column: "seoKeywords", definition: "JSON NULL" },
    { table: "content_creator_pieces", column: "imagePrompt", definition: "TEXT NULL" },
    { table: "content_creator_pieces", column: "mediaUrl", definition: "TEXT NULL" },
    { table: "content_creator_pieces", column: "tiktokPublishId", definition: "VARCHAR(255) NULL" },
    { table: "content_creator_pieces", column: "externalPostId", definition: "VARCHAR(255) NULL" },
    { table: "content_creator_pieces", column: "seoScore", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "qualityScore", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "impressions", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "clicks", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "engagements", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "shares", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "saves", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "videoViews", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_pieces", column: "aiPrompt", definition: "TEXT NULL" },
    { table: "content_creator_pieces", column: "aiModel", definition: "VARCHAR(64) NULL" },
    { table: "content_creator_pieces", column: "generationMs", definition: "INT NULL" },
    { table: "content_creator_pieces", column: "scheduledAt", definition: "TIMESTAMP NULL" },
    { table: "content_creator_pieces", column: "publishedAt", definition: "TIMESTAMP NULL" },
    // ââ content_creator_schedules (auto-added missing columns) ââ
    { table: "content_creator_schedules", column: "pieceId", definition: "INT NOT NULL" },
    { table: "content_creator_schedules", column: "campaignId", definition: "INT NULL" },
    { table: "content_creator_schedules", column: "platform", definition: "VARCHAR(64) NOT NULL" },
    { table: "content_creator_schedules", column: "scheduledAt", definition: "TIMESTAMP NOT NULL" },
    { table: "content_creator_schedules", column: "status", definition: "VARCHAR(32) NOT NULL DEFAULT 'pending'" },
    { table: "content_creator_schedules", column: "publishedAt", definition: "TIMESTAMP NULL" },
    { table: "content_creator_schedules", column: "retryCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_schedules", column: "maxRetries", definition: "INT NOT NULL DEFAULT 3" },
    { table: "content_creator_schedules", column: "failReason", definition: "TEXT NULL" },
    // ââ content_creator_analytics (auto-added missing columns) ââ
    { table: "content_creator_analytics", column: "pieceId", definition: "INT NOT NULL" },
    { table: "content_creator_analytics", column: "campaignId", definition: "INT NULL" },
    { table: "content_creator_analytics", column: "platform", definition: "VARCHAR(64) NOT NULL" },
    { table: "content_creator_analytics", column: "impressions", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "clicks", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "engagements", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "shares", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "saves", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "videoViews", definition: "INT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "ctr", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "content_creator_analytics", column: "engagementRate", definition: "FLOAT NOT NULL DEFAULT 0" },
    // ââ user_social_credentials (auto-added missing columns) ââ
    { table: "user_social_credentials", column: "userId", definition: "INT NOT NULL" },
    { table: "user_social_credentials", column: "platform", definition: "VARCHAR(64) NOT NULL" },
    { table: "user_social_credentials", column: "displayName", definition: "VARCHAR(255) NULL" },
    { table: "user_social_credentials", column: "credentials", definition: "TEXT NOT NULL" },
    { table: "user_social_credentials", column: "isActive", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "user_social_credentials", column: "lastTestedAt", definition: "TIMESTAMP NULL" },
    { table: "user_social_credentials", column: "lastPublishedAt", definition: "TIMESTAMP NULL" },
    { table: "user_social_credentials", column: "lastError", definition: "TEXT NULL" },
    // ââ mailing_contacts (auto-added missing columns) ââ
    { table: "mailing_contacts", column: "email", definition: "VARCHAR(320) NOT NULL" },
    { table: "mailing_contacts", column: "name", definition: "VARCHAR(255) NULL" },
    { table: "mailing_contacts", column: "company", definition: "VARCHAR(255) NULL" },
    { table: "mailing_contacts", column: "role", definition: "VARCHAR(255) NULL" },
    { table: "mailing_contacts", column: "notes", definition: "TEXT NULL" },
    { table: "mailing_contacts", column: "tags", definition: "JSON NULL" },
    { table: "mailing_contacts", column: "status", definition: "ENUM('active','unsubscribed','bounced','invalid') NOT NULL DEFAULT 'active'" },
    { table: "mailing_contacts", column: "source", definition: "VARCHAR(64) NOT NULL DEFAULT 'manual'" },
    { table: "mailing_contacts", column: "unsubscribeToken", definition: "VARCHAR(128) NULL" },
    { table: "mailing_contacts", column: "lastEmailedAt", definition: "TIMESTAMP NULL" },
    // ââ email_campaigns (auto-added missing columns) ââ
    { table: "email_campaigns", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "email_campaigns", column: "subject", definition: "VARCHAR(512) NOT NULL" },
    { table: "email_campaigns", column: "htmlBody", definition: "TEXT NOT NULL" },
    { table: "email_campaigns", column: "adImageUrl", definition: "VARCHAR(1024) NULL" },
    { table: "email_campaigns", column: "status", definition: "ENUM('draft','sending','sent','failed') NOT NULL DEFAULT 'draft'" },
    { table: "email_campaigns", column: "sentCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "email_campaigns", column: "failedCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "email_campaigns", column: "openCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "email_campaigns", column: "sentAt", definition: "TIMESTAMP NULL" },
    // ââ campaign_send_log (auto-added missing columns) ââ
    { table: "campaign_send_log", column: "campaignId", definition: "INT NOT NULL" },
    { table: "campaign_send_log", column: "contactId", definition: "INT NOT NULL" },
    { table: "campaign_send_log", column: "status", definition: "ENUM('sent','failed','bounced') NOT NULL DEFAULT 'sent'" },
    { table: "campaign_send_log", column: "error", definition: "TEXT NULL" },
    { table: "campaign_send_log", column: "sentAt", definition: "TIMESTAMP NOT NULL" },
    // ââ funding_sources (auto-added missing columns) ââ
    { table: "funding_sources", column: "country", definition: "VARCHAR(128) NOT NULL" },
    { table: "funding_sources", column: "organization", definition: "VARCHAR(255) NOT NULL" },
    { table: "funding_sources", column: "type", definition: "VARCHAR(128) NULL" },
    { table: "funding_sources", column: "supports", definition: "TEXT NULL" },
    { table: "funding_sources", column: "stage", definition: "VARCHAR(255) NULL" },
    { table: "funding_sources", column: "fundingForm", definition: "VARCHAR(255) NULL" },
    { table: "funding_sources", column: "eligibility", definition: "TEXT NULL" },
    { table: "funding_sources", column: "officialSite", definition: "VARCHAR(512) NULL" },
    { table: "funding_sources", column: "notes", definition: "TEXT NULL" },
    // ââ film_mix_settings (auto-added missing columns) ââ
    { table: "film_mix_settings", column: "projectId", definition: "INT NOT NULL" },
    { table: "film_mix_settings", column: "userId", definition: "INT NOT NULL" },
    { table: "film_mix_settings", column: "dialogueBus", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "musicBus", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "effectsBus", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "masterVolume", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "dialogueEqLow", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "dialogueEqMid", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "dialogueEqHigh", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "musicEqLow", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "musicEqMid", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "musicEqHigh", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "sfxEqLow", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "sfxEqMid", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "sfxEqHigh", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "reverbRoom", definition: "ENUM('none','small','medium','large','hall','cathedral') NOT NULL DEFAULT 'none'" },
    { table: "film_mix_settings", column: "reverbAmount", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "compressionRatio", definition: "FLOAT NOT NULL" },
    { table: "film_mix_settings", column: "noiseReduction", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "film_mix_settings", column: "notes", definition: "TEXT NULL" },
    // ââ film_adr_tracks (auto-added missing columns) ââ
    { table: "film_adr_tracks", column: "projectId", definition: "INT NOT NULL" },
    { table: "film_adr_tracks", column: "sceneId", definition: "INT NULL" },
    { table: "film_adr_tracks", column: "userId", definition: "INT NOT NULL" },
    { table: "film_adr_tracks", column: "characterName", definition: "VARCHAR(255) NOT NULL" },
    { table: "film_adr_tracks", column: "dialogueLine", definition: "TEXT NOT NULL" },
    { table: "film_adr_tracks", column: "trackType", definition: "ENUM('adr','wild_track','loop_group','walla') NOT NULL DEFAULT 'adr'" },
    { table: "film_adr_tracks", column: "status", definition: "ENUM('pending','recorded','approved','rejected') NOT NULL DEFAULT 'pending'" },
    { table: "film_adr_tracks", column: "fileUrl", definition: "TEXT NULL" },
    { table: "film_adr_tracks", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "film_adr_tracks", column: "notes", definition: "TEXT NULL" },
    // ââ film_foley_tracks (auto-added missing columns) ââ
    { table: "film_foley_tracks", column: "projectId", definition: "INT NOT NULL" },
    { table: "film_foley_tracks", column: "sceneId", definition: "INT NULL" },
    { table: "film_foley_tracks", column: "userId", definition: "INT NOT NULL" },
    { table: "film_foley_tracks", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "film_foley_tracks", column: "foleyType", definition: "ENUM('footsteps','cloth','props','impacts','environmental','custom') NOT NULL DEFAULT 'custom'" },
    { table: "film_foley_tracks", column: "description", definition: "TEXT NULL" },
    { table: "film_foley_tracks", column: "fileUrl", definition: "TEXT NULL" },
    { table: "film_foley_tracks", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "film_foley_tracks", column: "volume", definition: "FLOAT NOT NULL" },
    { table: "film_foley_tracks", column: "startTime", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "film_foley_tracks", column: "notes", definition: "TEXT NULL" },
    // ââ film_score_cues (auto-added missing columns) ââ
    { table: "film_score_cues", column: "projectId", definition: "INT NOT NULL" },
    { table: "film_score_cues", column: "sceneId", definition: "INT NULL" },
    { table: "film_score_cues", column: "userId", definition: "INT NOT NULL" },
    { table: "film_score_cues", column: "cueNumber", definition: "VARCHAR(32) NOT NULL" },
    { table: "film_score_cues", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "film_score_cues", column: "cueType", definition: "ENUM('underscore','source_music','sting','theme','transition','silence') NOT NULL DEFAULT 'underscore'" },
    { table: "film_score_cues", column: "description", definition: "TEXT NULL" },
    { table: "film_score_cues", column: "fileUrl", definition: "TEXT NULL" },
    { table: "film_score_cues", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "film_score_cues", column: "volume", definition: "FLOAT NOT NULL" },
    { table: "film_score_cues", column: "fadeIn", definition: "FLOAT NOT NULL" },
    { table: "film_score_cues", column: "fadeOut", definition: "FLOAT NOT NULL" },
    { table: "film_score_cues", column: "startTime", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "film_score_cues", column: "duration", definition: "FLOAT NULL" },
    { table: "film_score_cues", column: "notes", definition: "TEXT NULL" },
    // ââ filmPages (auto-added missing columns) ââ
    { table: "filmPages", column: "userId", definition: "INT NOT NULL" },
    { table: "filmPages", column: "projectId", definition: "INT NOT NULL" },
    { table: "filmPages", column: "slug", definition: "VARCHAR(255) NOT NULL" },
    { table: "filmPages", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "filmPages", column: "description", definition: "TEXT NULL" },
    { table: "filmPages", column: "thumbnailUrl", definition: "TEXT NULL" },
    { table: "filmPages", column: "trailerUrl", definition: "TEXT NULL" },
    { table: "filmPages", column: "filmUrl", definition: "TEXT NULL" },
    { table: "filmPages", column: "isPublic", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "filmPages", column: "showCreatorName", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "filmPages", column: "showVirelleBranding", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "filmPages", column: "allowShowcase", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "filmPages", column: "socialLinks", definition: "JSON NULL" },
    // ââ promoAssets (auto-added missing columns) ââ
    { table: "promoAssets", column: "userId", definition: "INT NOT NULL" },
    { table: "promoAssets", column: "projectId", definition: "INT NOT NULL" },
    { table: "promoAssets", column: "type", definition: "VARCHAR(64) NOT NULL" },
    { table: "promoAssets", column: "content", definition: "TEXT NOT NULL" },
    { table: "promoAssets", column: "variant", definition: "VARCHAR(64) NULL" },
    // ââ creatorProfiles (auto-added missing columns) ââ
    { table: "creatorProfiles", column: "userId", definition: "INT NOT NULL" },
    { table: "creatorProfiles", column: "slug", definition: "VARCHAR(255) NOT NULL" },
    { table: "creatorProfiles", column: "profileType", definition: "ENUM('creator','studio') NOT NULL DEFAULT 'creator'" },
    { table: "creatorProfiles", column: "displayName", definition: "VARCHAR(255) NOT NULL" },
    { table: "creatorProfiles", column: "avatarUrl", definition: "TEXT NULL" },
    { table: "creatorProfiles", column: "bio", definition: "TEXT NULL" },
    { table: "creatorProfiles", column: "focusTags", definition: "JSON NULL" },
    { table: "creatorProfiles", column: "socialLinks", definition: "JSON NULL" },
    { table: "creatorProfiles", column: "contactEmail", definition: "VARCHAR(320) NULL" },
    { table: "creatorProfiles", column: "featuredProjectId", definition: "INT NULL" },
    { table: "creatorProfiles", column: "isPublic", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "creatorProfiles", column: "completenessScore", definition: "INT NOT NULL DEFAULT 0" },
    // ââ collections (auto-added missing columns) ââ
    { table: "collections", column: "userId", definition: "INT NOT NULL" },
    { table: "collections", column: "slug", definition: "VARCHAR(255) NOT NULL" },
    { table: "collections", column: "title", definition: "VARCHAR(255) NOT NULL" },
    { table: "collections", column: "description", definition: "TEXT NULL" },
    { table: "collections", column: "coverImageUrl", definition: "TEXT NULL" },
    { table: "collections", column: "isPublic", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    // ââ collectionItems (auto-added missing columns) ââ
    { table: "collectionItems", column: "collectionId", definition: "INT NOT NULL" },
    { table: "collectionItems", column: "projectId", definition: "INT NOT NULL" },
    { table: "collectionItems", column: "orderIndex", definition: "INT NOT NULL DEFAULT 0" },
    // ââ analyticsEvents (auto-added missing columns) ââ
    { table: "analyticsEvents", column: "userId", definition: "INT NOT NULL" },
    { table: "analyticsEvents", column: "entityType", definition: "ENUM('filmPage','creatorProfile','collection') NOT NULL" },
    { table: "analyticsEvents", column: "entityId", definition: "INT NOT NULL" },
    { table: "analyticsEvents", column: "eventType", definition: "ENUM('page_view','video_play','link_click','share_click') NOT NULL" },
    { table: "analyticsEvents", column: "metadata", definition: "JSON NULL" },
    // ââ adminCurationFlags (auto-added missing columns) ââ
    { table: "adminCurationFlags", column: "entityType", definition: "ENUM('project','creatorProfile') NOT NULL" },
    { table: "adminCurationFlags", column: "entityId", definition: "INT NOT NULL" },
    { table: "adminCurationFlags", column: "flagType", definition: "ENUM('featured','staff_pick','hidden','banned') NOT NULL" },
    { table: "adminCurationFlags", column: "adminId", definition: "INT NOT NULL" },
    { table: "adminCurationFlags", column: "notes", definition: "TEXT NULL" },
    // ââ submissionReviews (auto-added missing columns) ââ
    { table: "submissionReviews", column: "projectId", definition: "INT NOT NULL" },
    { table: "submissionReviews", column: "userId", definition: "INT NOT NULL" },
    { table: "submissionReviews", column: "status", definition: "ENUM('pending','approved','declined','featured') NOT NULL DEFAULT 'pending'" },
    { table: "submissionReviews", column: "adminNotes", definition: "TEXT NULL" },
    // ââ conversionEvents (auto-added missing columns) ââ
    { table: "conversionEvents", column: "userId", definition: "INT NULL" },
    { table: "conversionEvents", column: "sessionId", definition: "VARCHAR(255) NULL" },
    { table: "conversionEvents", column: "sourcePath", definition: "VARCHAR(255) NOT NULL" },
    { table: "conversionEvents", column: "targetPath", definition: "VARCHAR(255) NOT NULL" },
    { table: "conversionEvents", column: "eventType", definition: "TEXT NULL" },
    // ââ abuseFlags (auto-added missing columns) ââ
    { table: "abuseFlags", column: "entityId", definition: "INT NOT NULL" },
    { table: "abuseFlags", column: "entityType", definition: "ENUM('filmPage','creatorProfile','collection') NOT NULL" },
    { table: "abuseFlags", column: "reporterId", definition: "INT NULL" },
    { table: "abuseFlags", column: "reason", definition: "VARCHAR(255) NOT NULL" },
    { table: "abuseFlags", column: "status", definition: "ENUM('pending','reviewed','actioned','dismissed') NOT NULL DEFAULT 'pending'" },
    // ââ assetPurchases (auto-added missing columns) ââ
    { table: "assetPurchases", column: "userId", definition: "INT NOT NULL" },
    { table: "assetPurchases", column: "assetId", definition: "VARCHAR(64) NOT NULL" },
    { table: "assetPurchases", column: "stripeSessionId", definition: "VARCHAR(255) NULL" },
    { table: "assetPurchases", column: "stripePaymentIntentId", definition: "VARCHAR(255) NULL" },
    { table: "assetPurchases", column: "amountAud", definition: "INT NOT NULL" },
    { table: "assetPurchases", column: "status", definition: "ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending'" },
    { table: "assetPurchases", column: "purchasedAt", definition: "TIMESTAMP NOT NULL" },
    // ââ signatureCastActors (auto-added missing columns) ââ
    { table: "signatureCastActors", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "signatureCastActors", column: "tier", definition: "ENUM('standard','premium','flagship') NOT NULL DEFAULT 'standard'" },
    { table: "signatureCastActors", column: "includedInPlan", definition: "ENUM('none','indie','amateur','independent') NOT NULL DEFAULT 'none'" },
    { table: "signatureCastActors", column: "pricePersonalAud", definition: "INT NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "priceCreatorAud", definition: "INT NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "priceCommercialAud", definition: "INT NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "priceEpisodicAud", definition: "INT NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "hook", definition: "TEXT NULL" },
    { table: "signatureCastActors", column: "tags", definition: "JSON NULL" },
    { table: "signatureCastActors", column: "chemistryWith", definition: "JSON NULL" },
    { table: "signatureCastActors", column: "portraitUrl", definition: "TEXT NULL" },
    { table: "signatureCastActors", column: "isActive", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "signatureCastActors", column: "isFeatured", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "isRetired", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "signatureCastActors", column: "allowCommercialUse", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "signatureCastActors", column: "noExplicitContent", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    // ââ signatureCastEntitlements (auto-added missing columns) ââ
    { table: "signatureCastEntitlements", column: "userId", definition: "INT NOT NULL" },
    { table: "signatureCastEntitlements", column: "actorId", definition: "VARCHAR(64) NOT NULL" },
    { table: "signatureCastEntitlements", column: "licenseType", definition: "ENUM('personal','creator','commercial','episodic','plan_inclusion') NOT NULL" },
    { table: "signatureCastEntitlements", column: "projectId", definition: "INT NULL" },
    { table: "signatureCastEntitlements", column: "isCommercial", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "signatureCastEntitlements", column: "isEpisodic", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "signatureCastEntitlements", column: "source", definition: "ENUM('subscription','stripe_checkout','admin_comp','promo') NOT NULL DEFAULT 'stripe_checkout'" },
    { table: "signatureCastEntitlements", column: "stripeSessionId", definition: "VARCHAR(255) NULL" },
    { table: "signatureCastEntitlements", column: "stripePaymentIntentId", definition: "VARCHAR(255) NULL" },
    { table: "signatureCastEntitlements", column: "amountPaidAud", definition: "INT NOT NULL DEFAULT 0" },
    { table: "signatureCastEntitlements", column: "status", definition: "ENUM('active','expired','revoked','pending') NOT NULL DEFAULT 'active'" },
    { table: "signatureCastEntitlements", column: "startedAt", definition: "TIMESTAMP NOT NULL" },
    { table: "signatureCastEntitlements", column: "expiresAt", definition: "TIMESTAMP NULL" },
    // ââ signatureCastEvents (auto-added missing columns) ââ
    { table: "signatureCastEvents", column: "userId", definition: "INT NULL" },
    { table: "signatureCastEvents", column: "actorId", definition: "VARCHAR(64) NOT NULL" },
    { table: "signatureCastEvents", column: "event", definition: "TEXT NULL" },
    { table: "signatureCastEvents", column: "licenseType", definition: "VARCHAR(32) NULL" },
    { table: "signatureCastEvents", column: "projectId", definition: "INT NULL" },
    { table: "signatureCastEvents", column: "metadata", definition: "JSON NULL" },
    // ââ featureCuts (auto-added missing columns) ââ
    { table: "featureCuts", column: "projectId", definition: "INT NOT NULL" },
    { table: "featureCuts", column: "userId", definition: "INT NOT NULL" },
    { table: "featureCuts", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "featureCuts", column: "version", definition: "VARCHAR(64) NOT NULL DEFAULT 'v1.0'" },
    { table: "featureCuts", column: "description", definition: "TEXT NULL" },
    { table: "featureCuts", column: "isLocked", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "featureCuts", column: "lockedAt", definition: "TIMESTAMP NULL" },
    { table: "featureCuts", column: "lockedBy", definition: "INT NULL" },
    { table: "featureCuts", column: "isDefault", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "featureCuts", column: "totalDuration", definition: "INT NOT NULL DEFAULT 0" },
    { table: "featureCuts", column: "sceneCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "featureCuts", column: "targetRuntime", definition: "INT NULL" },
    { table: "featureCuts", column: "featureCutActStructure", definition: "ENUM('three-act','five-act','heros-journey','nonlinear','episodic','two-act') NOT NULL DEFAULT 'three-act'" },
    { table: "featureCuts", column: "notes", definition: "TEXT NULL" },
    { table: "featureCuts", column: "metadata", definition: "JSON NULL" },
    // ââ featureCutScenes (auto-added missing columns) ââ
    { table: "featureCutScenes", column: "cutId", definition: "INT NOT NULL" },
    { table: "featureCutScenes", column: "sceneId", definition: "INT NOT NULL" },
    { table: "featureCutScenes", column: "orderIndex", definition: "INT NOT NULL" },
    { table: "featureCutScenes", column: "actNumber", definition: "INT NOT NULL DEFAULT 1" },
    { table: "featureCutScenes", column: "actLabel", definition: "VARCHAR(128) NULL" },
    { table: "featureCutScenes", column: "sequenceLabel", definition: "VARCHAR(128) NULL" },
    { table: "featureCutScenes", column: "isIncluded", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "featureCutScenes", column: "trimIn", definition: "INT NOT NULL DEFAULT 0" },
    { table: "featureCutScenes", column: "trimOut", definition: "INT NOT NULL DEFAULT 0" },
    { table: "featureCutScenes", column: "transitionType", definition: "VARCHAR(64) NOT NULL DEFAULT 'cut'" },
    { table: "featureCutScenes", column: "transitionDuration", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "featureCutScenes", column: "directorNote", definition: "TEXT NULL" },
    { table: "featureCutScenes", column: "colorGrade", definition: "VARCHAR(64) NULL" },
    // ââ actGroups (auto-added missing columns) ââ
    { table: "actGroups", column: "cutId", definition: "INT NOT NULL" },
    { table: "actGroups", column: "projectId", definition: "INT NOT NULL" },
    { table: "actGroups", column: "actNumber", definition: "INT NOT NULL" },
    { table: "actGroups", column: "label", definition: "VARCHAR(128) NOT NULL" },
    { table: "actGroups", column: "description", definition: "TEXT NULL" },
    { table: "actGroups", column: "targetDuration", definition: "INT NULL" },
    { table: "actGroups", column: "colorCode", definition: "VARCHAR(16) NULL DEFAULT '#3b82f6'" },
    { table: "actGroups", column: "orderIndex", definition: "INT NOT NULL" },
    // ââ shotPackages (auto-added missing columns) ââ
    { table: "shotPackages", column: "sceneId", definition: "INT NOT NULL" },
    { table: "shotPackages", column: "projectId", definition: "INT NOT NULL" },
    { table: "shotPackages", column: "userId", definition: "INT NOT NULL" },
    { table: "shotPackages", column: "shotIndex", definition: "INT NOT NULL" },
    { table: "shotPackages", column: "prompt", definition: "TEXT NOT NULL" },
    { table: "shotPackages", column: "negativePrompt", definition: "TEXT NULL" },
    { table: "shotPackages", column: "durationSeconds", definition: "INT NOT NULL DEFAULT 10" },
    { table: "shotPackages", column: "videoUrl", definition: "TEXT NULL" },
    { table: "shotPackages", column: "videoKey", definition: "VARCHAR(512) NULL" },
    { table: "shotPackages", column: "keyframeUrl", definition: "TEXT NULL" },
    { table: "shotPackages", column: "shotPackageStatus", definition: "ENUM('pending','generating','completed','failed','retrying') NOT NULL DEFAULT 'pending'" },
    { table: "shotPackages", column: "provider", definition: "VARCHAR(64) NULL" },
    { table: "shotPackages", column: "errorMessage", definition: "TEXT NULL" },
    { table: "shotPackages", column: "retryCount", definition: "INT NOT NULL DEFAULT 0" },
    { table: "shotPackages", column: "generationJobId", definition: "INT NULL" },
    { table: "shotPackages", column: "metadata", definition: "JSON NULL" },
    // ââ continuityRecords (auto-added missing columns) ââ
    { table: "continuityRecords", column: "projectId", definition: "INT NOT NULL" },
    { table: "continuityRecords", column: "sceneId", definition: "INT NOT NULL" },
    { table: "continuityRecords", column: "userId", definition: "INT NOT NULL" },
    { table: "continuityRecords", column: "wardrobeNotes", definition: "TEXT NULL" },
    { table: "continuityRecords", column: "wardrobeImages", definition: "JSON NULL" },
    { table: "continuityRecords", column: "propNotes", definition: "TEXT NULL" },
    { table: "continuityRecords", column: "propList", definition: "JSON NULL" },
    { table: "continuityRecords", column: "timeOfDay", definition: "VARCHAR(64) NULL" },
    { table: "continuityRecords", column: "dayNumber", definition: "INT NULL" },
    { table: "continuityRecords", column: "locationNotes", definition: "TEXT NULL" },
    { table: "continuityRecords", column: "characterStates", definition: "JSON NULL" },
    { table: "continuityRecords", column: "dependsOnSceneId", definition: "INT NULL" },
    { table: "continuityRecords", column: "emotionalCarryover", definition: "TEXT NULL" },
    { table: "continuityRecords", column: "continuityFlags", definition: "JSON NULL" },
    { table: "continuityRecords", column: "lastCheckedAt", definition: "TIMESTAMP NULL" },
    // ââ featureAudioPlans (auto-added missing columns) ââ
    { table: "featureAudioPlans", column: "projectId", definition: "INT NOT NULL" },
    { table: "featureAudioPlans", column: "userId", definition: "INT NOT NULL" },
    { table: "featureAudioPlans", column: "voiceAssignments", definition: "JSON NULL" },
    { table: "featureAudioPlans", column: "ambientLayers", definition: "JSON NULL" },
    { table: "featureAudioPlans", column: "musicCues", definition: "JSON NULL" },
    { table: "featureAudioPlans", column: "dialogueBus", definition: "FLOAT NULL" },
    { table: "featureAudioPlans", column: "musicBus", definition: "FLOAT NULL" },
    { table: "featureAudioPlans", column: "effectsBus", definition: "FLOAT NULL" },
    { table: "featureAudioPlans", column: "masterVolume", definition: "FLOAT NULL" },
    { table: "featureAudioPlans", column: "audioPassNotes", definition: "TEXT NULL" },
    { table: "featureAudioPlans", column: "featureAudioMixStatus", definition: "ENUM('draft','in-progress','locked','final') NOT NULL DEFAULT 'draft'" },
    // ââ filmCompileJobs (auto-added missing columns) ââ
    { table: "filmCompileJobs", column: "projectId", definition: "INT NOT NULL" },
    { table: "filmCompileJobs", column: "cutId", definition: "INT NULL" },
    { table: "filmCompileJobs", column: "userId", definition: "INT NOT NULL" },
    { table: "filmCompileJobs", column: "filmCompileStatus", definition: "ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued'" },
    { table: "filmCompileJobs", column: "progress", definition: "INT NOT NULL DEFAULT 0" },
    { table: "filmCompileJobs", column: "currentStep", definition: "VARCHAR(255) NULL" },
    { table: "filmCompileJobs", column: "resultUrl", definition: "TEXT NULL" },
    { table: "filmCompileJobs", column: "resultKey", definition: "VARCHAR(512) NULL" },
    { table: "filmCompileJobs", column: "resultDuration", definition: "INT NULL" },
    { table: "filmCompileJobs", column: "resultFileSize", definition: "INT NULL" },
    { table: "filmCompileJobs", column: "errorMessage", definition: "TEXT NULL" },
    { table: "filmCompileJobs", column: "includeOpener", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "filmCompileJobs", column: "includeCredits", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "filmCompileJobs", column: "burnSubtitles", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "filmCompileJobs", column: "resolution", definition: "VARCHAR(16) NOT NULL DEFAULT '1080p'" },
    { table: "filmCompileJobs", column: "frameRate", definition: "INT NOT NULL DEFAULT 24" },
    { table: "filmCompileJobs", column: "metadata", definition: "JSON NULL" },
    { table: "filmCompileJobs", column: "startedAt", definition: "TIMESTAMP NULL" },
    { table: "filmCompileJobs", column: "completedAt", definition: "TIMESTAMP NULL" },
    // ââ characterArcs (auto-added missing columns) ââ
    { table: "characterArcs", column: "projectId", definition: "INT NOT NULL" },
    { table: "characterArcs", column: "characterId", definition: "INT NOT NULL" },
    { table: "characterArcs", column: "userId", definition: "INT NOT NULL" },
    { table: "characterArcs", column: "arcType", definition: "VARCHAR(64) NULL DEFAULT 'transformation'" },
    { table: "characterArcs", column: "arcSummary", definition: "TEXT NULL" },
    { table: "characterArcs", column: "arcBeats", definition: "JSON NULL" },
    { table: "characterArcs", column: "startingState", definition: "TEXT NULL" },
    { table: "characterArcs", column: "endingState", definition: "TEXT NULL" },
    // ââ shootDays (auto-added missing columns) ââ
    { table: "shootDays", column: "projectId", definition: "INT NOT NULL" },
    { table: "shootDays", column: "userId", definition: "INT NOT NULL" },
    { table: "shootDays", column: "dayNumber", definition: "INT NOT NULL DEFAULT 1" },
    { table: "shootDays", column: "shootDate", definition: "DATE NULL" },
    { table: "shootDays", column: "callTime", definition: "VARCHAR(16) NULL" },
    { table: "shootDays", column: "wrapTime", definition: "VARCHAR(16) NULL" },
    { table: "shootDays", column: "locationId", definition: "INT NULL" },
    { table: "shootDays", column: "weatherNote", definition: "VARCHAR(255) NULL" },
    { table: "shootDays", column: "hospitalInfo", definition: "TEXT NULL" },
    { table: "shootDays", column: "parkingInfo", definition: "TEXT NULL" },
    { table: "shootDays", column: "generalNotes", definition: "TEXT NULL" },
    // ââ crewContacts (auto-added missing columns) ââ
    { table: "crewContacts", column: "projectId", definition: "INT NOT NULL" },
    { table: "crewContacts", column: "userId", definition: "INT NOT NULL" },
    { table: "crewContacts", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "crewContacts", column: "role", definition: "VARCHAR(128) NULL" },
    { table: "crewContacts", column: "department", definition: "VARCHAR(128) NULL" },
    { table: "crewContacts", column: "email", definition: "VARCHAR(320) NULL" },
    { table: "crewContacts", column: "phone", definition: "VARCHAR(64) NULL" },
    { table: "crewContacts", column: "callTimeOverride", definition: "VARCHAR(16) NULL" },
    { table: "crewContacts", column: "notes", definition: "TEXT NULL" },
    { table: "crewContacts", column: "sortOrder", definition: "INT NOT NULL DEFAULT 0" },
    // ââ activityLog (auto-added missing columns) ââ
    { table: "activityLog", column: "projectId", definition: "INT NOT NULL" },
    { table: "activityLog", column: "userId", definition: "INT NOT NULL" },
    { table: "activityLog", column: "actor", definition: "VARCHAR(255) NULL" },
    { table: "activityLog", column: "eventType", definition: "VARCHAR(64) NOT NULL" },
    { table: "activityLog", column: "payload", definition: "JSON NULL" },
    // ââ approval_chain (auto-added missing columns) ââ
    { table: "approval_chain", column: "projectId", definition: "INT NOT NULL" },
    { table: "approval_chain", column: "kind", definition: "ENUM('scene','movie') NOT NULL" },
    { table: "approval_chain", column: "entityId", definition: "INT NOT NULL" },
    { table: "approval_chain", column: "fromStatus", definition: "VARCHAR(32) NULL" },
    { table: "approval_chain", column: "toStatus", definition: "VARCHAR(32) NOT NULL" },
    { table: "approval_chain", column: "actor", definition: "INT NOT NULL" },
    { table: "approval_chain", column: "actorName", definition: "VARCHAR(255) NULL" },
    { table: "approval_chain", column: "note", definition: "TEXT NULL" },
    { table: "approval_chain", column: "contentHash", definition: "VARCHAR(128) NOT NULL" },
    { table: "approval_chain", column: "prevSignature", definition: "VARCHAR(128) NULL" },
    { table: "approval_chain", column: "signature", definition: "VARCHAR(128) NOT NULL" },
    // ââ asset_versions (auto-added missing columns) ââ
    { table: "asset_versions", column: "projectId", definition: "INT NOT NULL" },
    { table: "asset_versions", column: "ownerKind", definition: "VARCHAR(32) NOT NULL" },
    { table: "asset_versions", column: "ownerId", definition: "INT NOT NULL" },
    { table: "asset_versions", column: "fieldName", definition: "VARCHAR(64) NOT NULL" },
    { table: "asset_versions", column: "label", definition: "VARCHAR(255) NULL" },
    { table: "asset_versions", column: "url", definition: "TEXT NOT NULL" },
    { table: "asset_versions", column: "mimeType", definition: "VARCHAR(128) NULL" },
    { table: "asset_versions", column: "sizeBytes", definition: "TEXT NULL" },
    { table: "asset_versions", column: "notes", definition: "TEXT NULL" },
    { table: "asset_versions", column: "createdBy", definition: "INT NOT NULL" },
    { table: "asset_versions", column: "createdByName", definition: "VARCHAR(255) NULL" },
    // ââ recaps (auto-added missing columns) ââ
    { table: "recaps", column: "userId", definition: "INT NOT NULL" },
    { table: "recaps", column: "projectId", definition: "INT NOT NULL" },
    { table: "recaps", column: "targetMovieId", definition: "INT NOT NULL" },
    { table: "recaps", column: "sourceMovieIds", definition: "JSON NOT NULL" },
    { table: "recaps", column: "lengthSeconds", definition: "INT NOT NULL DEFAULT 90" },
    { table: "recaps", column: "style", definition: "VARCHAR(32) NOT NULL DEFAULT 'cinematic'" },
    { table: "recaps", column: "resolution", definition: "VARCHAR(16) NOT NULL DEFAULT '1080p'" },
    { table: "recaps", column: "includeVoiceover", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "recaps", column: "includeSubtitles", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "recaps", column: "includeOpeningCredits", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "recaps", column: "overlayCreditsOnRecap", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "recaps", column: "status", definition: "VARCHAR(32) NOT NULL DEFAULT 'pending'" },
    { table: "recaps", column: "outputAssetId", definition: "INT NULL" },
    { table: "recaps", column: "fileUrl", definition: "TEXT NULL" },
    { table: "recaps", column: "fileKey", definition: "VARCHAR(512) NULL" },
    { table: "recaps", column: "creditCost", definition: "INT NOT NULL DEFAULT 0" },
    { table: "recaps", column: "progress", definition: "INT NOT NULL DEFAULT 0" },
    { table: "recaps", column: "errorMessage", definition: "TEXT NULL" },
    { table: "recaps", column: "outline", definition: "JSON NULL" },
    { table: "recaps", column: "voiceoverScript", definition: "TEXT NULL" },
    { table: "recaps", column: "attachedAt", definition: "TIMESTAMP NULL" },
    // ââ recapSegments (auto-added missing columns) ââ
    { table: "recapSegments", column: "recapId", definition: "INT NOT NULL" },
    { table: "recapSegments", column: "sourceMovieId", definition: "INT NOT NULL" },
    { table: "recapSegments", column: "startTimeSeconds", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "recapSegments", column: "endTimeSeconds", definition: "FLOAT NOT NULL DEFAULT 0" },
    { table: "recapSegments", column: "sortOrder", definition: "INT NOT NULL DEFAULT 0" },
    { table: "recapSegments", column: "caption", definition: "TEXT NULL" },
    { table: "recapSegments", column: "reason", definition: "TEXT NULL" },
    // ââ creditReservations (auto-added missing columns) ââ
    { table: "creditReservations", column: "userId", definition: "INT NOT NULL" },
    { table: "creditReservations", column: "projectId", definition: "INT NULL" },
    { table: "creditReservations", column: "referenceType", definition: "VARCHAR(64) NULL" },
    { table: "creditReservations", column: "referenceId", definition: "INT NULL" },
    { table: "creditReservations", column: "featureKey", definition: "VARCHAR(64) NOT NULL" },
    { table: "creditReservations", column: "amount", definition: "INT NOT NULL" },
    { table: "creditReservations", column: "status", definition: "VARCHAR(16) NOT NULL DEFAULT 'reserved'" },
    { table: "creditReservations", column: "finalizedAt", definition: "TIMESTAMP NULL" },
    { table: "creditReservations", column: "releasedAt", definition: "TIMESTAMP NULL" },
    // ââ projectBrands (auto-added missing columns) ââ
    { table: "projectBrands", column: "userId", definition: "INT NOT NULL" },
    { table: "projectBrands", column: "projectId", definition: "INT NOT NULL" },
    { table: "projectBrands", column: "name", definition: "VARCHAR(128) NOT NULL" },
    { table: "projectBrands", column: "category", definition: "VARCHAR(64) NULL" },
    { table: "projectBrands", column: "policy", definition: "VARCHAR(16) NOT NULL DEFAULT 'allowed'" },
    { table: "projectBrands", column: "notes", definition: "TEXT NULL" },
    // ââ designerProfiles (auto-added missing columns) ââ
    { table: "designerProfiles", column: "userId", definition: "INT NOT NULL" },
    { table: "designerProfiles", column: "brandName", definition: "VARCHAR(255) NOT NULL" },
    { table: "designerProfiles", column: "displayName", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "profileType", definition: "VARCHAR(64) NOT NULL DEFAULT 'designer'" },
    { table: "designerProfiles", column: "bio", definition: "TEXT NULL" },
    { table: "designerProfiles", column: "website", definition: "VARCHAR(512) NULL" },
    { table: "designerProfiles", column: "instagram", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "contactEmail", definition: "VARCHAR(320) NULL" },
    { table: "designerProfiles", column: "logoUrl", definition: "TEXT NULL" },
    { table: "designerProfiles", column: "verified", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "designerProfiles", column: "visibility", definition: "VARCHAR(32) NOT NULL DEFAULT 'public'" },
    // ââ designerCollections (auto-added missing columns) ââ
    { table: "designerCollections", column: "designerProfileId", definition: "INT NOT NULL" },
    { table: "designerCollections", column: "userId", definition: "INT NOT NULL" },
    { table: "designerCollections", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "designerCollections", column: "description", definition: "TEXT NULL" },
    { table: "designerCollections", column: "collectionType", definition: "VARCHAR(64) NOT NULL DEFAULT 'wardrobe'" },
    { table: "designerCollections", column: "season", definition: "VARCHAR(128) NULL" },
    { table: "designerCollections", column: "year", definition: "INT NULL" },
    { table: "designerCollections", column: "styleTags", definition: "JSON NULL" },
    { table: "designerCollections", column: "coverImageUrl", definition: "TEXT NULL" },
    { table: "designerCollections", column: "visibility", definition: "VARCHAR(32) NOT NULL DEFAULT 'public'" },
    { table: "designerCollections", column: "licenseType", definition: "VARCHAR(64) NOT NULL DEFAULT 'reference_only'" },
    { table: "designerCollections", column: "licenseNotes", definition: "TEXT NULL" },
    // ââ wardrobeItems (auto-added missing columns) ââ
    { table: "wardrobeItems", column: "collectionId", definition: "INT NULL" },
    { table: "wardrobeItems", column: "userId", definition: "INT NOT NULL" },
    { table: "wardrobeItems", column: "designerProfileId", definition: "INT NULL" },
    { table: "wardrobeItems", column: "projectId", definition: "INT NULL" },
    { table: "wardrobeItems", column: "name", definition: "VARCHAR(255) NOT NULL" },
    { table: "wardrobeItems", column: "description", definition: "TEXT NULL" },
    { table: "wardrobeItems", column: "category", definition: "VARCHAR(64) NULL" },
    { table: "wardrobeItems", column: "subcategory", definition: "VARCHAR(128) NULL" },
    { table: "wardrobeItems", column: "wardrobeType", definition: "VARCHAR(64) NOT NULL DEFAULT 'wardrobe'" },
    { table: "wardrobeItems", column: "genderFit", definition: "VARCHAR(64) NULL" },
    { table: "wardrobeItems", column: "sizeRange", definition: "VARCHAR(128) NULL" },
    { table: "wardrobeItems", column: "era", definition: "VARCHAR(128) NULL" },
    { table: "wardrobeItems", column: "colors", definition: "JSON NULL" },
    { table: "wardrobeItems", column: "materials", definition: "JSON NULL" },
    { table: "wardrobeItems", column: "styleTags", definition: "JSON NULL" },
    { table: "wardrobeItems", column: "imageUrls", definition: "JSON NULL" },
    { table: "wardrobeItems", column: "primaryImageUrl", definition: "TEXT NULL" },
    { table: "wardrobeItems", column: "referencePrompt", definition: "TEXT NULL" },
    { table: "wardrobeItems", column: "brandPlacementAllowed", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "wardrobeItems", column: "shopfrontPlacementAllowed", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "wardrobeItems", column: "characterWardrobeAllowed", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "wardrobeItems", column: "costumeUseAllowed", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "wardrobeItems", column: "commercialUseAllowed", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "wardrobeItems", column: "licenseType", definition: "VARCHAR(64) NOT NULL DEFAULT 'reference_only'" },
    { table: "wardrobeItems", column: "licenseNotes", definition: "TEXT NULL" },
    { table: "wardrobeItems", column: "visibility", definition: "VARCHAR(32) NOT NULL DEFAULT 'public'" },
    { table: "wardrobeItems", column: "status", definition: "VARCHAR(32) NOT NULL DEFAULT 'active'" },
    { table: "wardrobeItems", column: "retailPriceAud", definition: "INT NULL" },
    { table: "wardrobeItems", column: "leasePriceAud", definition: "INT NULL" },
    // Third-party physical and virtual item commerce. Existing Lamalo values are not updated.
    { table: "wardrobeItems", column: "physicalRetailPriceAud", definition: "INT NULL" },
    { table: "wardrobeItems", column: "isVirtualOnly", definition: "TINYINT(1) NOT NULL DEFAULT 1" },
    { table: "wardrobeItems", column: "virtualPriceRule", definition: "VARCHAR(32) NULL" },
    { table: "wardrobeItems", column: "virtualBadgeText", definition: "VARCHAR(64) NULL DEFAULT 'Virtual item'" },
    { table: "wardrobeLeases", column: "purchaseMode", definition: "VARCHAR(16) NOT NULL DEFAULT 'virtual'" },
    { table: "wardrobeLeases", column: "shippingAddressId", definition: "INT NULL" },
    { table: "wardrobeLeases", column: "shippingAddressSnapshot", definition: "JSON NULL" },
    // ââ designerProfiles marketplace columns (v7.0) ââ
    { table: "designerProfiles", column: "stripeAccountId", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "stripeAccountStatus", definition: "VARCHAR(32) NULL DEFAULT 'none'" },
    { table: "designerProfiles", column: "membershipStatus", definition: "VARCHAR(32) NOT NULL DEFAULT 'none'" },
    { table: "designerProfiles", column: "membershipSubscriptionId", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "membershipCurrentPeriodEnd", definition: "TIMESTAMP NULL" },
    { table: "designerProfiles", column: "brandingImages", definition: "JSON NULL" },
    // Designer commerce identity and registered business details
    { table: "designerProfiles", column: "username", definition: "VARCHAR(80) NULL" },
    { table: "designerProfiles", column: "abn", definition: "VARCHAR(32) NULL" },
    { table: "designerProfiles", column: "businessAddressLine1", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "businessAddressLine2", definition: "VARCHAR(255) NULL" },
    { table: "designerProfiles", column: "businessCity", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "businessStateRegion", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "businessPostalCode", definition: "VARCHAR(32) NULL" },
    { table: "designerProfiles", column: "businessCountry", definition: "VARCHAR(128) NULL" },
    { table: "designerProfiles", column: "registrationCompleted", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    // ââ designerCollections marketplace columns (v7.0) ââ
    { table: "designerCollections", column: "collectionPriceAud", definition: "INT NULL" },
    { table: "designerCollections", column: "published", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    { table: "designerCollections", column: "publishedAt", definition: "TIMESTAMP NULL" },
    // ââ wardrobeAssignments (auto-added missing columns) ââ
    { table: "wardrobeAssignments", column: "userId", definition: "INT NOT NULL" },
    { table: "wardrobeAssignments", column: "projectId", definition: "INT NOT NULL" },
    { table: "wardrobeAssignments", column: "wardrobeItemId", definition: "INT NOT NULL" },
    { table: "wardrobeAssignments", column: "assignmentType", definition: "VARCHAR(64) NOT NULL" },
    { table: "wardrobeAssignments", column: "characterId", definition: "INT NULL" },
    { table: "wardrobeAssignments", column: "sceneId", definition: "INT NULL" },
    { table: "wardrobeAssignments", column: "usageMode", definition: "VARCHAR(64) NOT NULL DEFAULT 'reference'" },
    { table: "wardrobeAssignments", column: "placementNotes", definition: "TEXT NULL" },
    { table: "wardrobeAssignments", column: "promptWeight", definition: "INT NOT NULL DEFAULT 50" },
    { table: "wardrobeAssignments", column: "locked", definition: "TINYINT(1) NOT NULL DEFAULT 0" },
    // customItemOrders â character/scene context for AI wardrobe generation
    { table: "customItemOrders", column: "characterId", definition: "INT NULL" },
    { table: "customItemOrders", column: "sceneId",     definition: "INT NULL" },
    { table: "customItemOrders", column: "projectId",   definition: "INT NULL" },
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
        logger.error(`[AutoMigrate] Error creating table ${table.name}: ${err.message}`);
      }
    }
  }

  // Step 2: Add missing columns to existing tables
  // Strategy: Just try ALTER TABLE ADD COLUMN directly â if column exists, MySQL throws
  // "Duplicate column name" which we catch and ignore. This is more reliable than
  // querying INFORMATION_SCHEMA which can have caching/permission issues.
  for (const col of missingColumns) {
    try {
      const alterSQL = `ALTER TABLE \`${col.table}\` ADD COLUMN \`${col.column}\` ${col.definition}`;
      await db.execute(sql.raw(alterSQL));
      columnsAdded++;
      logger.info(`[AutoMigrate] Added column ${col.table}.${col.column}`);
    } catch (err: any) {
      // "Duplicate column name" means it already exists â that's fine
      if (err.message?.includes("Duplicate column") || err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
        // Already exists, skip silently
      } else {
        logger.error(`[AutoMigrate] Error adding column ${col.table}.${col.column}: ${err.message}`);
      }
    }
  }

  if (tablesCreated > 0 || columnsAdded > 0) {
    logger.info(`[AutoMigrate] Migration complete: ${tablesCreated} tables checked, ${columnsAdded} columns added`);
  } else {
    logger.info("[AutoMigrate] Schema is up to date â no changes needed");
  }

  // âââ Step 2b: Add UNIQUE constraint to funding_sources (idempotent) âââ
  try {
    await db.execute(sql.raw(`ALTER TABLE funding_sources ADD UNIQUE INDEX uq_funding_country_org (country(100), organization(100))`));
    logger.info('[AutoMigrate] Added UNIQUE constraint to funding_sources');
  } catch (err: any) {
    // Duplicate key name = constraint already exists â that's fine
    if (!err.message?.includes('Duplicate key name') && !err.message?.includes('already exists')) {
      logger.warn('[AutoMigrate] Could not add UNIQUE to funding_sources:', err.message);
    }
  }

  // âââ Step 3: Admin Role Bootstrap âââ
  // Promote all owner/studio emails to admin on every startup (idempotent)
  const adminEmailsToPromote = [
    (process.env.ADMIN_EMAIL || "studiosvirelle@gmail.com").toLowerCase(),
    "studiosvirelle@gmail.com",
    "studiosvirelle@gmail.com",
  ];
  for (const adminEmailToPromote of [...new Set(adminEmailsToPromote)]) {
    try {
      const [adminRow] = await db.execute(sql.raw(`SELECT id, role FROM users WHERE LOWER(email) = '${adminEmailToPromote}' LIMIT 1`)) as any;
      const adminUser = Array.isArray(adminRow) ? adminRow[0] : adminRow;
      if (adminUser && adminUser.role !== 'admin') {
        await db.execute(sql.raw(`UPDATE users SET role = 'admin' WHERE id = ${adminUser.id}`));
        logger.info(`[AutoMigrate] Promoted ${adminEmailToPromote} to admin`);
      } else if (adminUser) {
        logger.info(`[AutoMigrate] Admin role confirmed for ${adminEmailToPromote}`);
      }
    } catch (err: any) {
      logger.warn(`[AutoMigrate] Admin bootstrap failed for ${adminEmailToPromote}: ${err.message}`);
    }
  }
  // âââ Step 4: Seed promo codes (INSERT IGNORE â safe to run repeatedly) âââ
  const PROMO_CODES = [
    { code: "VIRELLE50",   description: "50% off â General launch promo" },
    { code: "DIRECTOR50",  description: "50% off â Founding director offer" },
    { code: "STUDIO50",    description: "50% off â Studio partner code" },
    { code: "FILM2025",    description: "50% off â 2025 launch special" },
    { code: "SCENE50",     description: "50% off â Scene builder promo" },
    { code: "CINEMATIC",   description: "50% off â Cinematic creator code" },
    { code: "BETA50",      description: "50% off â Beta tester appreciation" },
    { code: "PREMIERE50",  description: "50% off â Premiere partner code" },
    { code: "REEL50",      description: "50% off â Demo reel promo" },
    { code: "LAUNCH50",    description: "50% off â Platform launch code" },
  ];
  try {
    for (const c of PROMO_CODES) {
      await db.execute(sql.raw(
        `INSERT IGNORE INTO promo_codes (code, discountPercent, maxUses, description) VALUES ('${c.code}', 50, 1, '${c.description}')`
      ));
    }
    logger.info(`[AutoMigrate] Promo codes seeded (${PROMO_CODES.length} codes, INSERT IGNORE)`);
  } catch (err: any) {
    logger.error(`[AutoMigrate] Failed to seed promo codes: ${err.message}`);
  }

  // âââ Step 5: Seed beta tester accounts (INSERT IGNORE â safe to run repeatedly) âââ
  // Pre-created accounts with industry-tier (full) access for beta testing.
  // Credentials to hand out:
  //   studiosvirelle@gmail.com / VirelleBeta01!
  //   studiosvirelle@gmail.com / VirelleBeta02!
  //   studiosvirelle@gmail.com / VirelleBeta03!
  //   studiosvirelle@gmail.com / VirelleBeta04!
  //   studiosvirelle@gmail.com / VirelleBeta05!
  //   studiosvirelle@gmail.com / VirelleBeta06!
  //   studiosvirelle@gmail.com / VirelleBeta07!
  //   studiosvirelle@gmail.com / VirelleBeta08!
  //   studiosvirelle@gmail.com / VirelleBeta09!
  //   studiosvirelle@gmail.com / VirelleBeta10!
  const BETA_ACCOUNTS = [
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 01', hash: '$2b$12$kPcp3jQv.2xeT30d3piIKew0I51ENu9IQia9KsTrDAWb3FZWI.YtW' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 02', hash: '$2b$12$OfsynB96qWPpeGC.nEaAL.QYMvFFzgzeTndnTJQ4i7wEmEg4mLhmi' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 03', hash: '$2b$12$1bhSGVJqrEgdQ72rireGp.gStOEPrYx8srWCquhbUpSonJ/wRvo3i' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 04', hash: '$2b$12$IlaXZw8SIWT5cr3DPLtwnO3WzGW/mClrk8yGvhGtkQ6lxFEHVgKWq' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 05', hash: '$2b$12$MtkiCrPMSnJ3vnmpI6f12umwGADADPdVIKK4/9/M/GjOGAfw5Tusi' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 06', hash: '$2b$12$zTfZfdCAYcYkiVZjZ5r7JeB38QsDTSwoubffp.ZK9oF1TqIWAZdEO' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 07', hash: '$2b$12$jTRem0RgWS7WHJPfEyuh4OwUkXO.jIwNSAPYva.LsBQPIrbJOAoFS' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 08', hash: '$2b$12$nUqVX2xYN0V5SRez6rWT/eSSNwQR/BqpKNMSfIHL6UoxJxOhfRxjq' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 09', hash: '$2b$12$UqgWEDWiJzhr2eeqOyk5defWvokvWBT.BzCtpqTuMOPw9S2o6xWwu' },
    { email: 'studiosvirelle@gmail.com', name: 'Beta Tester 10', hash: '$2b$12$Bnw/0cXNuWO6qYNAeBJguelpY6/jldZjYxFN0XtkLUmM/FV3uk0rG' },
  ];
  try {
    for (const u of BETA_ACCOUNTS) {
      await db.execute(sql.raw(
        `INSERT IGNORE INTO users (openId, email, name, passwordHash, loginMethod, role, subscriptionTier, subscriptionStatus, monthlyGenerationsUsed, onboardingCompleted, lastSignedIn, createdAt, updatedAt) VALUES ('email_${u.email}', '${u.email}', '${u.name}', '${u.hash}', 'email', 'user', 'industry', 'active', 0, 1, NOW(), NOW(), NOW())`
      ));
    }
    logger.info(`[AutoMigrate] Beta tester accounts seeded (${BETA_ACCOUNTS.length} accounts, INSERT IGNORE)`);
  } catch (err: any) {
    logger.error(`[AutoMigrate] Failed to seed beta accounts: ${err.message}`);
  }

  // âââ Step 6: Seed film industry outreach contacts (INSERT IGNORE â safe to run repeatedly) âââ
  // 30 public contacts from the film outreach database (Sony, Keshet, HanWay, mk2, LevelK, etc.)
  // Source: film_outreach_database_with_israel.xlsx â public-facing emails only
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
    logger.info(`[AutoMigrate] Film outreach contacts seeded (${FILM_OUTREACH_CONTACTS.length} contacts, INSERT IGNORE)`);
  } catch (err: any) {
    logger.error(`[AutoMigrate] Failed to seed film outreach contacts: ${err.message}`);
  }

  // âââ Step 7: Seed global film funding sources (INSERT IGNORE â safe to run repeatedly) âââ
  // 94 funding sources from global_film_funding_database CSV with full pack metadata.
  // Wrapped in an IIFE so the early `return;` (when rowCount === 94) only short-circuits
  // this seed block, NOT the whole runAutoMigration â the v6.78 expansion seed below
  // still needs to run on every boot.
  await (async () => {
  try {
    // Dedup guard: if the table has more than 94 rows, it means INSERT IGNORE ran without a UNIQUE
    // constraint and created duplicates. Truncate and reseed cleanly.
    const [countRow] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM funding_sources`)) as any;
    const rowCount = Number(countRow?.[0]?.cnt ?? countRow?.cnt ?? 0);
    if (rowCount > 94) {
      logger.info(`[AutoMigrate] funding_sources has ${rowCount} rows (duplicates detected) â truncating and reseeding`);
      await db.execute(sql.raw(`TRUNCATE TABLE funding_sources`));
    } else if (rowCount === 94) {
      logger.info(`[AutoMigrate] funding_sources already has 94 rows â skipping seed`);
      return;
    }
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Argentina', 'INCAA', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / credit', 'Argentina', 'https://www.incaa.gob.ar', 'Main Argentinian funder', 'Public Agency Pack', 'Spanish', 'INCAA â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia', 'Screen Australia', 'National public agency', 'Film, TV, online, games', 'Development/Production/Distribution', 'Grant / investment', 'Australia', 'https://www.screenaustralia.gov.au/funding-and-support', 'Main Australian funder', 'Public Agency Pack', 'English', 'Screen Australia â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (NSW)', 'Screen NSW', 'State public agency', 'Film/TV support', 'Development/Production/Post', 'Grant', 'Australia (NSW)', 'https://www.screen.nsw.gov.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screen NSW â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (QLD)', 'Screen Queensland', 'State public agency', 'Film/TV/digital', 'Development/Production/Post', 'Grant / incentive', 'Australia (QLD)', 'https://www.screenqueensland.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screen Queensland â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (SA)', 'South Australian Film Corporation', 'State public agency', 'Film/TV/digital', 'Development/Production', 'Grant / incentive', 'Australia (SA)', 'https://www.safilm.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'South Australian Film Corporation â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (VIC)', 'Film Victoria / Creative Victoria', 'State public agency', 'Film/TV/games/digital', 'Development/Production', 'Grant', 'Australia (VIC)', 'https://creative.vic.gov.au/grants-and-support/programs', 'State support', 'Incentive / Commission Pack', 'English', 'Film Victoria / Creative Victoria â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (WA)', 'Screenwest', 'State public agency', 'Film/TV/digital', 'Development/Production', 'Grant / incentive', 'Australia (WA)', 'https://www.screenwest.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screenwest â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Austria', 'Austrian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Austria', 'https://www.filmfonds-wien.at', 'National Austrian fund', 'Public Agency Pack', 'German', 'Austrian Film Institute â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | RegieerklÃ¤rung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und LiefergegenstÃ¤nde | Publikum / Vertrieb / Wirkung | ErklÃ¤rungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Belgium', 'VAF / Vlaams Audiovisueel Fonds', 'Regional public agency', 'Flemish film, TV, games', 'Development/Production/Distribution', 'Grant', 'Belgium', 'https://www.vaf.be', 'Flemish fund', 'Public Agency Pack', 'Dutch', 'VAF / Vlaams Audiovisueel Fonds â Aanvraagpakket', 'Aanvrager / Bedrijf | Projecttitel | Formaat / Genre / Duur | Logline | Synopsis / Behandeling | Regieverklaring | Producentenverklaring / Financieringsstrategie | Creatief pakket en kernteam | Budget en financieringsplan | Rechten / rechtenketen | Planning en opleveringen | Publiek / Distributie / Impact | Verklaringen / Handtekeningen', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Brazil', 'ANCINE', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant / investment', 'Brazil', 'https://www.gov.br/ancine', 'Main Brazilian body', 'Public Agency Pack', 'Portuguese', 'ANCINE â Pacote de candidatura', 'Candidato / Empresa | TÃ­tulo do projeto | Formato / GÃ©nero / DuraÃ§Ã£o | Logline | Sinopse / Tratamento | DeclaraÃ§Ã£o do realizador | DeclaraÃ§Ã£o do produtor / EstratÃ©gia financeira | Pacote criativo e equipa principal | OrÃ§amento e plano financeiro | Direitos / Cadeia de titularidade | Cronograma e entregÃ¡veis | PÃºblico / DistribuiÃ§Ã£o / Impacto | DeclaraÃ§Ãµes / Assinaturas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada', 'Telefilm Canada', 'National public agency', 'Feature film, co-productions', 'Development/Production', 'Grant / equity', 'Canada', 'https://telefilm.ca/en/funding', 'Main Canadian funder', 'Public Agency Pack', 'English', 'Telefilm Canada â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada', 'Canada Media Fund', 'Public/private fund', 'TV, digital, interactive', 'Development/Production', 'Grant / equity', 'Canada', 'https://cmf-fmc.ca/en', 'TV/digital support', 'Public Agency Pack', 'English', 'Canada Media Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Alberta)', 'Alberta Media Fund', 'Provincial agency', 'Film/TV/digital media', 'Production', 'Grant', 'Canada (Alberta)', 'https://www.alberta.ca/alberta-media-fund', 'Alberta support', 'Incentive / Commission Pack', 'English', 'Alberta Media Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (British Columbia)', 'Creative BC', 'Provincial agency', 'Film and TV support', 'Production', 'Tax credit / grants', 'Canada (British Columbia)', 'https://creativebc.com', 'BC support', 'Incentive / Commission Pack', 'English', 'Creative BC â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Ontario)', 'Ontario Creates', 'Provincial agency', 'Film/TV/book/music/games', 'Production', 'Tax credit / funding', 'Canada (Ontario)', 'https://www.ontariocreates.ca', 'Ontario incentives and support', 'Incentive / Commission Pack', 'English', 'Ontario Creates â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Quebec)', 'SODEC', 'Provincial public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant / investment', 'Canada (Quebec)', 'https://sodec.gouv.qc.ca', 'Major Quebec fund', 'Public Agency Pack', 'French', 'SODEC â Dossier de candidature', 'Candidat / SociÃ©tÃ© | Titre du projet | Format / Genre / DurÃ©e | Logline | Synopsis / Traitement | Note d\'intention du rÃ©alisateur | Note du producteur / StratÃ©gie de financement | Package crÃ©atif et Ã©quipe clÃ© | Budget et plan de financement | Droits / ChaÃ®ne des droits | Calendrier et livrables | Public / Distribution / Impact | DÃ©clarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Chile', 'Fondo de Fomento Audiovisual', 'National public fund', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Chile', 'https://www.fondosdecultura.cl/fondo-audiovisual', 'National Chilean fund', 'Public Agency Pack', 'Spanish', 'Fondo de Fomento Audiovisual â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Colombia', 'ProimÃ¡genes / Fondo para el Desarrollo CinematogrÃ¡fico', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Colombia', 'https://www.proimagenescolombia.com', 'FDC administrator', 'Public Agency Pack', 'Spanish', 'ProimÃ¡genes / FDC â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Council of Europe', 'Eurimages', 'Supranational public fund', 'Feature co-production, distribution, exhibition', 'Development/Production/Distribution', 'Grant / co-production support', 'Council of Europe', 'https://www.coe.int/en/web/eurimages', 'Council of Europe film fund', 'International Co-production Pack', 'English', 'Eurimages â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Croatia', 'HAVC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Croatia', 'https://havc.hr', 'Croatian Audiovisual Centre', 'Public Agency Pack', 'Croatian', 'HAVC â Paket prijave', 'Podnositelj zahtjeva / Tvrtka | Naslov projekta | Format / Å½anr / Trajanje | Logline | Sinopsis / Tretman | Izjava redatelja | Izjava producenta / Strategija financiranja | Kreativni paket i kljuÄni tim | ProraÄun i financijski plan | Prava / lanac prava | Raspored i isporuke | Publika / Distribucija / Utjecaj | Izjave / Potpisi', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Czech Republic', 'Czech Audiovisual Fund', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Czech Republic', 'https://fondkinematografie.cz', 'Formerly Czech Film Fund', 'Public Agency Pack', 'Czech', 'Czech Audiovisual Fund â PÅihlÃ¡Å¡ka', 'Å½adatel / SpoleÄnost | NÃ¡zev projektu | FormÃ¡t / Å½Ã¡nr / DÃ©lka | Logline | Synopse / ZpracovÃ¡nÃ­ | ProhlÃ¡Å¡enÃ­ reÅ¾isÃ©ra | ProhlÃ¡Å¡enÃ­ producenta / Strategie financovÃ¡nÃ­ | KreativnÃ­ balÃ­Äek a klÃ­ÄovÃ½ tÃ½m | RozpoÄet a finanÄnÃ­ plÃ¡n | PrÃ¡va / ÅetÄzec prÃ¡v | Harmonogram a vÃ½stupy | Publikum / Distribuce / Dopad | ProhlÃ¡Å¡enÃ­ / Podpisy', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Dominican Republic', 'DGCINE', 'National public agency', 'Film support and incentives', 'Production/Distribution', 'Tax incentive / grants', 'Dominican Republic', 'https://dgcine.gob.do', 'Growing Caribbean hub', 'Incentive / Commission Pack', 'Spanish', 'DGCINE â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Sinopsis / Tratamiento | DeclaraciÃ³n del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | CoproducciÃ³n / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Estonia', 'Estonian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Estonia', 'https://www.filminstitute.ee/en', 'National Estonian fund', 'Public Agency Pack', 'Estonian', 'Estonian Film Institute â Taotluspakett', 'Taotleja / EttevÃµte | Projekti pealkiri | Formaat / Å½anr / Kestus | Logline | SÃ¼nopsis / TÃ¶Ã¶tlus | Lavastaja avaldus | Produtsendi avaldus / Rahastamisstrateegia | Loominguline pakett ja pÃµhitiim | Eelarve ja rahastamiskava | Ãigused / Ãµiguste ahel | Ajakava ja tarnimised | Publik / Levitamine / MÃµju | Avaldused / Allkirjad', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Europe / EU', 'Creative Europe MEDIA', 'Supranational public fund', 'Development, TV/slate, distribution, training, markets', 'Development/Production/Distribution', 'Grant', 'Europe / EU', 'https://culture.ec.europa.eu/creative-europe/actions/media', 'EU audiovisual support', 'International Co-production Pack', 'English', 'Creative Europe MEDIA â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('France', 'CNC', 'National public agency', 'Feature, short, documentary, animation, VR', 'Development/Production/Distribution', 'Grant / advance on receipts', 'France', 'https://www.cnc.fr', 'Main French funder', 'Public Agency Pack', 'French', 'CNC â Dossier de candidature', 'Candidat / SociÃ©tÃ© | Titre du projet | Format / Genre / DurÃ©e | Logline | Synopsis / Traitement | Note d\'intention du rÃ©alisateur | Note du producteur / StratÃ©gie de financement | Package crÃ©atif et Ã©quipe clÃ© | Budget et plan de financement | Droits / ChaÃ®ne des droits | Calendrier et livrables | Public / Distribution / Impact | DÃ©clarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('France / International', 'Aide aux cinÃ©mas du monde', 'International public fund', 'International co-production', 'Development/Production', 'Grant', 'France / International', 'https://www.cnc.fr/professionnels/aides-et-financements/international/aide-aux-cinemas-du-monde', 'International co-pro support', 'International Co-production Pack', 'French', 'Aide aux cinÃ©mas du monde â Dossier de candidature', 'Candidat / SociÃ©tÃ© | Titre du projet | Format / Genre / DurÃ©e | Logline | Synopsis / Traitement | Note du producteur / StratÃ©gie de financement | Package crÃ©atif et Ã©quipe clÃ© | Budget et plan de financement | Droits / ChaÃ®ne des droits | Calendrier et livrables | Coproduction / ÃligibilitÃ© | Public / Distribution / Impact | DÃ©clarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany', 'FFA', 'National public agency', 'Feature, documentary, short, animation', 'Development/Production/Distribution', 'Grant / loan', 'Germany', 'https://www.ffa.de', 'German Federal Film Fund', 'Public Agency Pack', 'German', 'FFA â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | RegieerklÃ¤rung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und LiefergegenstÃ¤nde | Publikum / Vertrieb / Wirkung | ErklÃ¤rungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany', 'DFFF', 'National public agency', 'Film production incentive', 'Production', 'Tax incentive / grant', 'Germany', 'https://www.ffa.de/foerderung-dfff.html', 'German federal incentive', 'Incentive / Commission Pack', 'German', 'DFFF â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Synopsis / Treatment | Produzentenstatement / Finanzierungsstrategie | Budget und Finanzierungsplan | Zeitplan und LiefergegenstÃ¤nde | Koproduktion / FÃ¶rderfÃ¤higkeit | ErklÃ¤rungen / Unterschriften', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Bavaria)', 'FFF Bayern', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Bavaria)', 'https://www.fff-bayern.de', 'Bavarian regional fund', 'Public Agency Pack', 'German', 'FFF Bayern â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | RegieerklÃ¤rung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und LiefergegenstÃ¤nde | Publikum / Vertrieb / Wirkung | ErklÃ¤rungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Berlin)', 'Medienboard Berlin-Brandenburg', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Berlin)', 'https://www.medienboard.de', 'Berlin-Brandenburg fund', 'Public Agency Pack', 'German', 'Medienboard Berlin-Brandenburg â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | RegieerklÃ¤rung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und LiefergegenstÃ¤nde | Publikum / Vertrieb / Wirkung | ErklÃ¤rungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Hamburg)', 'MOIN FilmfÃ¶rderung Hamburg Schleswig-Holstein', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Hamburg)', 'https://www.moin-filmfoerderung.de', 'Hamburg/Schleswig-Holstein fund', 'Public Agency Pack', 'German', 'MOIN FilmfÃ¶rderung â Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | RegieerklÃ¤rung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und LiefergegenstÃ¤nde | Publikum / Vertrieb / Wirkung | ErklÃ¤rungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany / International', 'World Cinema Fund', 'International public fund', 'Films from underrepresented regions', 'Development/Production/Post', 'Grant', 'Germany / International', 'https://www.berlinale.de/en/world-cinema-fund', 'Berlinale-linked fund', 'International Co-production Pack', 'English', 'World Cinema Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Hong Kong', 'Film Development Fund', 'Public fund', 'Film production and talent development', 'Development/Production/Training', 'Grant', 'Hong Kong', 'https://www.createhk.gov.hk/en/funding-support/film-development-fund.htm', 'HK public film fund', 'Standard Film Fund Pack', 'Traditional Chinese', 'Film Development Fund â ç³è«å¥ä»¶', 'ç³è«äºº / å¬å¸ | å°æ¡åç¨± | å½¢å¼ / é¡å / çé· | ä¸å¥è©±ç°¡ä» | åæç°¡ä» / èçå¤§ç¶± | å°æ¼é³è¿° | è£½çé³è¿° / èè³ç­ç¥ | åµæè³æåèæ ¸å¿åé | é ç®èèè³è¨ç« | æ¬å© / æ¬å©é | æç¨èäº¤ä»é ç® | è§ç¾ / ç¼è¡ / å½±é¿å | è²æ / ç°½å', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Hungary', 'National Film Institute Hungary', 'National public agency', 'Film/TV support', 'Development/Production', 'Grant / incentive', 'Hungary', 'https://nfi.hu/en', 'Main Hungarian agency', 'Public Agency Pack', 'Hungarian', 'National Film Institute Hungary â PÃ¡lyÃ¡zati csomag', 'PÃ¡lyÃ¡zÃ³ / CÃ©g | Projekt cÃ­me | FormÃ¡tum / MÅ±faj / JÃ¡tÃ©kidÅ | Logline | Szinopszis / Treatment | RendezÅi nyilatkozat | Produceri nyilatkozat / FinanszÃ­rozÃ¡si stratÃ©gia | KreatÃ­v csomag Ã©s kulcscsapat | KÃ¶ltsÃ©gvetÃ©s Ã©s finanszÃ­rozÃ¡si terv | Jogok / chain of title | Ãtemterv Ã©s leadandÃ³k | KÃ¶zÃ¶nsÃ©g / ForgalmazÃ¡s / HatÃ¡s | Nyilatkozatok / AlÃ¡Ã­rÃ¡sok', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ibero-America', 'Ibermedia', 'Supranational public fund', 'Co-production, development, distribution, training', 'Development/Production/Distribution', 'Grant', 'Ibero-America', 'https://www.programaibermedia.com', 'Multilateral Ibero-American support', 'International Co-production Pack', 'Spanish', 'Ibermedia â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | CoproducciÃ³n / Elegibilidad | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('India', 'Film Bazaar', 'Market / industry platform', 'Project market and co-production access', 'Development/Packaging', 'Market / platform / labs', 'India', 'https://www.filmbazaarindia.com', 'Important funding-access route', 'Standard Film Fund Pack', 'English', 'Film Bazaar â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('India', 'NFDC India', 'National public enterprise', 'Film support', 'Development/Production/Co-production/Market', 'Grant / investment / market support', 'India', 'https://www.nfdcindia.com', 'Main national body', 'Standard Film Fund Pack', 'English', 'NFDC India â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Indonesia', 'Ministry of Education Culture / film support programs', 'Public agency', 'Film and cultural grants', 'Development/Production', 'Grant', 'Indonesia', 'https://kemenparekraf.go.id', 'Fragmented public support', 'Standard Film Fund Pack', 'Indonesian', 'Ministry of Education Culture â Paket aplikasi', 'Pemohon / Perusahaan | Judul proyek | Format / Genre / Durasi | Logline | Sinopsis / Treatment | Pernyataan sutradara | Pernyataan produser / Strategi pembiayaan | Paket kreatif & tim inti | Anggaran & rencana pembiayaan | Hak / rantai hak | Jadwal & penyerahan | Audiens / Distribusi / Dampak | Pernyataan / Tanda tangan', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ireland', 'FÃ­s Ãireann/Screen Ireland', 'National public agency', 'Film, TV, animation, docs, shorts', 'Development/Production/Distribution', 'Grant / loan / equity', 'Ireland', 'https://www.screenireland.ie/funding', 'Main Irish funder', 'Public Agency Pack', 'English', 'FÃ­s Ãireann/Screen Ireland â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ireland', 'Section 481', 'Tax incentive', 'Film/TV production incentive', 'Production', 'Tax credit', 'Ireland', 'https://www.revenue.ie/en/companies-and-charities/financial-services-and-gambling/film-relief/index.aspx', 'Fiscal incentive', 'Incentive / Commission Pack', 'English', 'Section 481 â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Gesher Multicultural Film Fund', 'Foundation/public-interest fund', 'Multicultural film support', 'Development/Production', 'Grant', 'Israel', 'https://gesherfilmfund.org.il', 'Israeli multicultural fund', 'Standard Film Fund Pack', 'Hebrew', 'Gesher Multicultural Film Fund â ×××××ª ×××©×', '×××××© / ××××¨× | ×©× ××¤×¨×××§× | ×¤××¨×× / ××³×× ×¨ / ××©× | ××××××× | ×¡×× ××¤×¡××¡ / ××¨×××× × | ××¦××¨×ª ××××× | ××¦××¨×ª ×××¤××§ / ××¡××¨×××××ª ××××× | ××××× ××¦××¨×ª××ª ××¦×××ª ××¤×ª× | ×ª×§×¦×× ××ª×× ××ª ××××× | ××××××ª / ×©×¨×©×¨×ª ××××××ª | ××× ××× ×× ×××¡××¨××ª | ×§×× / ××¤×¦× / ××©×¤×¢× | ××¦××¨××ª / ××ª××××ª', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Israel Film Fund', 'National/private public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://www.filmfund.org.il', 'Major Israeli feature fund', 'Standard Film Fund Pack', 'Hebrew', 'Israel Film Fund â ×××××ª ×××©×', '×××××© / ××××¨× | ×©× ××¤×¨×××§× | ×¤××¨×× / ××³×× ×¨ / ××©× | ××××××× | ×¡×× ××¤×¡××¡ / ××¨×××× × | ××¦××¨×ª ××××× | ××¦××¨×ª ×××¤××§ / ××¡××¨×××××ª ××××× | ××××× ××¦××¨×ª××ª ××¦×××ª ××¤×ª× | ×ª×§×¦×× ××ª×× ××ª ××××× | ××××××ª / ×©×¨×©×¨×ª ××××××ª | ××× ××× ×× ×××¡××¨××ª | ×§×× / ××¤×¦× / ××©×¤×¢× | ××¦××¨××ª / ××ª××××ª', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'New Fund for Cinema and Television', 'Foundation/public-interest fund', 'Documentary and social-change cinema/TV', 'Development/Production', 'Grant', 'Israel', 'https://nfct.org.il/en', 'Israeli independent fund', 'Documentary Fund Pack', 'Hebrew', 'New Fund for Cinema and Television â ×××××ª ×××©×', '×××××© / ××××¨× | ×©× ××¤×¨×××§× | ×¤××¨×× / ××³×× ×¨ / ××©× | ××××××× | ×¡×× ××¤×¡××¡ / ××¨×××× × | ××¦××¨×ª ××××× | ××¦××¨×ª ×××¤××§ / ××¡××¨×××××ª ××××× | ××××× ××¦××¨×ª××ª ××¦×××ª ××¤×ª× | ×ª×§×¦×× ××ª×× ××ª ××××× | ××× ××× ×× ×××¡××¨××ª | ×§×× / ××¤×¦× / ××©×¤×¢× | ×××××ª ×¢×××× | ××¦××¨××ª / ××ª××××ª', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Rabinovich Foundation - Cinema Project', 'Foundation/public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://rabinovichfoundation.org.il', 'Major Israeli cinema fund', 'Standard Film Fund Pack', 'Hebrew', 'Rabinovich Foundation - Cinema Project â ×××××ª ×××©×', '×××××© / ××××¨× | ×©× ××¤×¨×××§× | ×¤××¨×× / ××³×× ×¨ / ××©× | ××××××× | ×¡×× ××¤×¡××¡ / ××¨×××× × | ××¦××¨×ª ××××× | ××¦××¨×ª ×××¤××§ / ××¡××¨×××××ª ××××× | ××××× ××¦××¨×ª××ª ××¦×××ª ××¤×ª× | ×ª×§×¦×× ××ª×× ××ª ××××× | ××××××ª / ×©×¨×©×¨×ª ××××××ª | ××× ××× ×× ×××¡××¨××ª | ×§×× / ××¤×¦× / ××©×¤×¢× | ××¦××¨××ª / ××ª××××ª', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Italy', 'Apulia Film Fund / Apulia Film Commission', 'Regional public agency', 'Production support', 'Production', 'Grant / rebate', 'Italy', 'https://www.apuliafilmcommission.it', 'Regional incentive/fund', 'Incentive / Commission Pack', 'Italian', 'Apulia Film Fund / Apulia Film Commission â Pacchetto di candidatura', 'Richiedente / SocietÃ  | Titolo del progetto | Formato / Genere / Durata | Sinossi / Trattamento | Dichiarazione del produttore / Strategia finanziaria | Budget e piano finanziario | Calendario e consegne | Coproduzione / AmmissibilitÃ  | Dichiarazioni / Firme', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Italy', 'DGCA / Direzione Generale Cinema e Audiovisivo', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Tax credit / grants', 'Italy', 'https://cinema.cultura.gov.it', 'Main Italian film body', 'Public Agency Pack', 'Italian', 'DGCA / Direzione Generale Cinema e Audiovisivo â Pacchetto di candidatura', 'Richiedente / SocietÃ  | Titolo del progetto | Formato / Genere / Durata | Logline | Sinossi / Trattamento | Dichiarazione del regista | Dichiarazione del produttore / Strategia finanziaria | Pacchetto creativo e team chiave | Budget e piano finanziario | Diritti / Catena dei diritti | Calendario e consegne | Pubblico / Distribuzione / Impatto | Dichiarazioni / Firme', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Japan', 'VIPO', 'Public-private support body', 'Co-production, market access, talent', 'Development/Production', 'Grant / support programs', 'Japan', 'https://www.vipo.or.jp/en', 'Japan international support', 'Standard Film Fund Pack', 'Japanese', 'VIPO â ç³è«ããã¯', 'ç³è«è / ä¼ç¤¾ | ä¼ç»å | å½¢å¼ / ã¸ã£ã³ã« / ä¸æ æé | ã­ã°ã©ã¤ã³ | ã·ããã·ã¹ / ããªã¼ãã¡ã³ã | ç£ç£ã¹ãã¼ãã¡ã³ã | ãã­ãã¥ã¼ãµã¼å£°æ / è³éèª¿éæ¦ç¥ | ä¼ç»è³æã¨ä¸»è¦ã¹ã¿ãã | äºç®æ¸ã»è³éè¨ç» | æ¨©å© / æ¨©å©è¨¼æ | ã¹ã±ã¸ã¥ã¼ã«ã¨ç´åç© | è¦³å®¢ / éçµ¦ / ã¤ã³ãã¯ã | å®£èª / ç½²å', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Jordan', 'Royal Film Commission - Jordan', 'Public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'Jordan', 'https://royalfilmcommission.jo', 'Jordanian support', 'Standard Film Fund Pack', 'Arabic', 'Royal Film Commission - Jordan â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙØ¬ÙÙØ© Ø§ÙØªØ¹Ø±ÙÙÙØ© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙØ®Ø±Ø¬ | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­Ø²ÙØ© Ø§ÙØ¥Ø¨Ø¯Ø§Ø¹ÙØ© ÙØ§ÙÙØ±ÙÙ Ø§ÙØ±Ø¦ÙØ³Ù | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­ÙÙÙ / Ø³ÙØ³ÙØ© Ø§ÙÙÙÙÙØ© | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¬ÙÙÙØ± / Ø§ÙØªÙØ²ÙØ¹ / Ø§ÙØ£Ø«Ø± | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Kenya', 'Kenya Film Commission', 'Public agency', 'Industry support and incentives', 'Production', 'Incentive / grant / facilitation', 'Kenya', 'https://filminginkenya.go.ke', 'Kenyan screen body', 'Standard Film Fund Pack', 'English', 'Kenya Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Latvia', 'National Film Centre of Latvia', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Latvia', 'https://nkc.gov.lv/en', 'National Latvian fund', 'Public Agency Pack', 'Latvian', 'National Film Centre of Latvia â Pieteikuma pakete', 'PieteicÄjs / UzÅÄmums | Projekta nosaukums | FormÄts / Å½anrs / Ilgums | Logline | Sinopse / Treatment | ReÅ¾isora paziÅojums | Producenta paziÅojums / FinansÄÅ¡anas stratÄÄ£ija | RadoÅ¡ais komplekts un galvenÄ komanda | BudÅ¾ets un finansÄÅ¡anas plÄns | TiesÄ«bas / tiesÄ«bu Ä·Äde | Grafiks un piegÄdes | Auditorija / IzplatÄ«Å¡ana / Ietekme | PaziÅojumi / Paraksti', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Lebanon / MENA', 'AFAC', 'Private/nonprofit arts fund', 'Film and broader arts', 'Development/Production/Post', 'Grant', 'Lebanon / MENA', 'https://www.arabculturefund.org', 'MENA arts fund', 'Standard Film Fund Pack', 'Arabic', 'AFAC â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙØ¬ÙÙØ© Ø§ÙØªØ¹Ø±ÙÙÙØ© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙØ®Ø±Ø¬ | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­Ø²ÙØ© Ø§ÙØ¥Ø¨Ø¯Ø§Ø¹ÙØ© ÙØ§ÙÙØ±ÙÙ Ø§ÙØ±Ø¦ÙØ³Ù | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­ÙÙÙ / Ø³ÙØ³ÙØ© Ø§ÙÙÙÙÙØ© | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¬ÙÙÙØ± / Ø§ÙØªÙØ²ÙØ¹ / Ø§ÙØ£Ø«Ø± | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Luxembourg', 'Film Fund Luxembourg', 'National public agency', 'Film and audiovisual', 'Development/Production', 'Grant / incentive', 'Luxembourg', 'https://www.filmfund.lu', 'Luxembourg support', 'Public Agency Pack', 'French', 'Film Fund Luxembourg â Dossier de candidature', 'Candidat / SociÃ©tÃ© | Titre du projet | Format / Genre / DurÃ©e | Logline | Synopsis / Traitement | Note d\'intention du rÃ©alisateur | Note du producteur / StratÃ©gie de financement | Package crÃ©atif et Ã©quipe clÃ© | Budget et plan de financement | Droits / ChaÃ®ne des droits | Calendrier et livrables | Public / Distribution / Impact | DÃ©clarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Malaysia', 'FINAS', 'National public agency', 'Film support and incentives', 'Development/Production/Distribution', 'Grant / incentive', 'Malaysia', 'https://www.finas.gov.my/en', 'Malaysian film body', 'Public Agency Pack', 'Malay', 'FINAS â Pakej permohonan', 'Pemohon / Syarikat | Tajuk projek | Format / Genre / Tempoh | Logline | Sinopsis / Treatment | Kenyataan pengarah | Kenyataan penerbit / Strategi pembiayaan | Pakej kreatif & pasukan utama | Bajet & pelan pembiayaan | Hak / rantaian hak milik | Jadual & serahan | Penonton / Pengedaran / Impak | Perakuan / Tandatangan', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Mexico', 'EFICINE', 'Tax incentive', 'Film investment incentive', 'Production/Distribution', 'Tax credit', 'Mexico', 'https://www.imcine.gob.mx/eficine', 'Fiscal incentive', 'Incentive / Commission Pack', 'Spanish', 'EFICINE â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Sinopsis / Tratamiento | DeclaraciÃ³n del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | CoproducciÃ³n / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Mexico', 'IMCINE', 'National public agency', 'Mexican cinema support', 'Development/Production/Distribution', 'Grant', 'Mexico', 'https://www.imcine.gob.mx', 'Main Mexican body', 'Public Agency Pack', 'Spanish', 'IMCINE â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Morocco', 'CCM', 'National public agency', 'Film support and incentives', 'Development/Production', 'Grant / rebate', 'Morocco', 'https://www.ccm.ma', 'Moroccan film body', 'Incentive / Commission Pack', 'Arabic', 'CCM â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¥ÙØªØ§Ø¬ Ø§ÙÙØ´ØªØ±Ù / Ø§ÙØ£ÙÙÙØ© | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands', 'Netherlands Film Fund', 'National public agency', 'Feature, documentary, shorts, immersive', 'Development/Production/Distribution', 'Grant', 'Netherlands', 'https://www.filmfonds.nl', 'Main Dutch fund', 'Documentary Fund Pack', 'Dutch', 'Netherlands Film Fund â Aanvraagpakket', 'Aanvrager / Bedrijf | Projecttitel | Formaat / Genre / Duur | Logline | Synopsis / Behandeling | Regieverklaring | Producentenverklaring / Financieringsstrategie | Creatief pakket en kernteam | Budget en financieringsplan | Planning en opleveringen | Publiek / Distributie / Impact | Werkvoorbeeld | Verklaringen / Handtekeningen', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands / International', 'Hubert Bals Fund', 'International public/private fund', 'Features, docs, talent from underrepresented regions', 'Development/Production/Post', 'Grant', 'Netherlands / International', 'https://iffr.com/en/hubert-bals-fund', 'Rotterdam-linked fund', 'International Co-production Pack', 'English', 'Hubert Bals Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands / International', 'IDFA Bertha Fund', 'International documentary fund', 'Creative documentary', 'Development/Production/Post', 'Grant', 'Netherlands / International', 'https://professionals.idfa.nl/training-funding/funding/about-the-idfa-bertha-fund/', 'Documentary-specific', 'Documentary Fund Pack', 'English', 'IDFA Bertha Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('New Zealand', 'New Zealand Film Commission', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'New Zealand', 'https://www.nzfilm.co.nz/funding', 'Main NZ funder', 'Public Agency Pack', 'English', 'New Zealand Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Nigeria', 'Nigerian Film Corporation', 'Public agency', 'Film development and training', 'Development/Production', 'Grant / support programs', 'Nigeria', 'https://nigerianfilms.com', 'National institution', 'Standard Film Fund Pack', 'English', 'Nigerian Film Corporation â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Peru', 'DAFO / Ministry of Culture Audiovisual Support', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Peru', 'https://www.gob.pe/cultura', 'Peruvian public support', 'Standard Film Fund Pack', 'Spanish', 'DAFO / Ministry of Culture Audiovisual Support â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Philippines', 'FDCP', 'National public agency', 'Film development and promotion', 'Development/Production/Distribution', 'Grant / support programs', 'Philippines', 'https://www.fdcp.ph', 'Main Philippine screen body', 'Public Agency Pack', 'English', 'FDCP â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Poland', 'Polish Film Institute', 'National public agency', 'Film development and production', 'Development/Production/Distribution', 'Grant', 'Poland', 'https://pisf.pl', 'Main Polish fund', 'Public Agency Pack', 'Polish', 'Polish Film Institute â Pakiet aplikacyjny', 'Wnioskodawca / Firma | TytuÅ projektu | Format / Gatunek / Czas trwania | Logline | Synopsis / Treatment | OÅwiadczenie reÅ¼ysera | OÅwiadczenie producenta / Strategia finansowania | Pakiet kreatywny i kluczowy zespÃ³Å | BudÅ¼et i plan finansowania | Prawa / chain of title | Harmonogram i materiaÅy koÅcowe | PublicznoÅÄ / Dystrybucja / WpÅyw | OÅwiadczenia / Podpisy', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Portugal', 'ICA Portugal', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Portugal', 'https://www.ica-ip.pt', 'National Portuguese fund', 'Public Agency Pack', 'Portuguese', 'ICA Portugal â Pacote de candidatura', 'Candidato / Empresa | TÃ­tulo do projeto | Formato / GÃ©nero / DuraÃ§Ã£o | Logline | Sinopse / Tratamento | DeclaraÃ§Ã£o do realizador | DeclaraÃ§Ã£o do produtor / EstratÃ©gia financeira | Pacote criativo e equipa principal | OrÃ§amento e plano financeiro | Direitos / Cadeia de titularidade | Cronograma e entregÃ¡veis | PÃºblico / DistribuiÃ§Ã£o / Impacto | DeclaraÃ§Ãµes / Assinaturas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Puerto Rico', 'Puerto Rico Film Commission / Incentive Program', 'Public incentive body', 'Production support', 'Production', 'Tax incentive', 'Puerto Rico', 'https://www.film.pr.gov', 'Key Caribbean incentive body', 'Incentive / Commission Pack', 'Spanish', 'Puerto Rico Film Commission â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Sinopsis / Tratamiento | DeclaraciÃ³n del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | CoproducciÃ³n / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Qatar / International', 'Doha Film Institute Grants', 'Private/nonprofit fund', 'Feature, short, experimental, essay, TV/web', 'Development/Production/Post', 'Grant', 'Qatar / International', 'https://www.dohafilm.com/en/funding-industry/funding/grants', 'Well-known MENA grant maker', 'International Co-production Pack', 'Arabic', 'Doha Film Institute Grants â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙØ¬ÙÙØ© Ø§ÙØªØ¹Ø±ÙÙÙØ© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­Ø²ÙØ© Ø§ÙØ¥Ø¨Ø¯Ø§Ø¹ÙØ© ÙØ§ÙÙØ±ÙÙ Ø§ÙØ±Ø¦ÙØ³Ù | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­ÙÙÙ / Ø³ÙØ³ÙØ© Ø§ÙÙÙÙÙØ© | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¥ÙØªØ§Ø¬ Ø§ÙÙØ´ØªØ±Ù / Ø§ÙØ£ÙÙÙØ© | Ø§ÙØ¬ÙÙÙØ± / Ø§ÙØªÙØ²ÙØ¹ / Ø§ÙØ£Ø«Ø± | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Romania', 'Romanian Film Centre (CNC)', 'National public agency', 'Film support', 'Development/Production', 'Grant', 'Romania', 'https://cnc.gov.ro', 'Romanian CNC', 'Public Agency Pack', 'Romanian', 'Romanian Film Centre (CNC) â Pachet de aplicaÈie', 'Solicitant / Companie | Titlul proiectului | Format / Gen / DuratÄ | Logline | Sinopsis / Tratament | DeclaraÈia regizorului | DeclaraÈia producÄtorului / Strategia de finanÈare | Pachet creativ Èi echipa cheie | Buget Èi plan de finanÈare | Drepturi / lanÈul titlului | Calendar Èi livrabile | Public / DistribuÈie / Impact | DeclaraÈii / SemnÄturi', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Saudi Arabia / International', 'Red Sea Fund', 'Private/festival-linked fund', 'Feature, short, doc, animation, episodic', 'Development/Production/Post', 'Grant', 'Saudi Arabia / International', 'https://redseafilmfest.com/en/red-sea-fund/', 'Jeddah-based festival fund', 'International Co-production Pack', 'Arabic', 'Red Sea Fund â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙØ¬ÙÙØ© Ø§ÙØªØ¹Ø±ÙÙÙØ© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­Ø²ÙØ© Ø§ÙØ¥Ø¨Ø¯Ø§Ø¹ÙØ© ÙØ§ÙÙØ±ÙÙ Ø§ÙØ±Ø¦ÙØ³Ù | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­ÙÙÙ / Ø³ÙØ³ÙØ© Ø§ÙÙÙÙÙØ© | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¥ÙØªØ§Ø¬ Ø§ÙÙØ´ØªØ±Ù / Ø§ÙØ£ÙÙÙØ© | Ø§ÙØ¬ÙÙÙØ± / Ø§ÙØªÙØ²ÙØ¹ / Ø§ÙØ£Ø«Ø± | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Singapore', 'IMDA', 'National public agency', 'Media and screen support', 'Development/Production', 'Grant', 'Singapore', 'https://www.imda.gov.sg', 'Singapore screen support', 'Public Agency Pack', 'English', 'IMDA â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Slovenia', 'Slovenian Film Centre', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Slovenia', 'https://www.film-center.si/en', 'National Slovenian fund', 'Public Agency Pack', 'Slovenian', 'Slovenian Film Centre â Prijavni paket', 'Prijavitelj / Podjetje | Naslov projekta | Format / Å½anr / Trajanje | Logline | Sinopsis / Treatment | Izjava reÅ¾iserja | Izjava producenta / Strategija financiranja | Ustvarjalni paket in kljuÄna ekipa | ProraÄun in finanÄni naÄrt | Pravice / veriga pravic | Äasovnica in dostave | ObÄinstvo / Distribucija / UÄinek | Izjave / Podpisi', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'Gauteng Film Commission', 'Regional public agency', 'Production and incentives', 'Production', 'Incentive / support', 'South Africa', 'https://www.gautengfilm.org.za', 'Regional support', 'International Co-production Pack', 'English', 'Gauteng Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'KZN Film Commission', 'Regional public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'South Africa', 'https://kznfilm.co.za', 'Regional support', 'International Co-production Pack', 'English', 'KZN Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'NFVF', 'National public agency', 'Film development, production, marketing, distribution', 'Development/Production/Distribution', 'Grant', 'South Africa', 'https://www.nfvf.co.za', 'Main South African funder', 'Public Agency Pack', 'English', 'NFVF â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Korea', 'KOFIC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / investment', 'South Korea', 'https://www.kofic.or.kr/eng', 'Korean Film Council', 'Public Agency Pack', 'Korean', 'KOFIC â ì ì²­ í¨í¤ì§', 'ì ì²­ì / íì¬ | íë¡ì í¸ ì ëª© | íì / ì¥ë¥´ / ìììê° | ë¡ê·¸ë¼ì¸ | ìëìì¤ / í¸ë¦¬í¸ë¨¼í¸ | ê°ë ì§ì ì | íë¡ëì ì§ì  / ìê¸ ì¡°ë¬ ì ëµ | í¬ë¦¬ìì´í°ë¸ í¨í¤ì§ ë° íµì¬ í | ìì° ë° ìê¸ ê³í | ê¶ë¦¬ / ê¶ë¦¬ ì°ì | ì¼ì  ë° ì ì¶ë¬¼ | ê´ê° / ë°°ê¸ / ìí©í¸ | ì§ì  / ìëª', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Spain', 'ICAA', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Grant', 'Spain', 'https://www.cultura.gob.es/cultura/areas/cine/mc/icaa', 'Main Spanish agency', 'Public Agency Pack', 'Spanish', 'ICAA â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Spain (Catalonia)', 'ICEC / Catalan Institute for Cultural Companies', 'Regional public agency', 'Audiovisual support', 'Development/Production', 'Grant', 'Spain (Catalonia)', 'https://icec.gencat.cat', 'Catalan support', 'International Co-production Pack', 'Catalan', 'ICEC / Catalan Institute for Cultural Companies â Paquet de solÂ·licitud', 'SolÂ·licitant / Empresa | TÃ­tol del projecte | Format / GÃ¨nere / Durada | Logline | Sinopsi / Tractament | DeclaraciÃ³ del productor / EstratÃ¨gia financera | Paquet creatiu i equip clau | Pressupost i pla financer | Drets / cadena de titularitat | Calendari i lliurables | CoproducciÃ³ / Elegibilitat | PÃºblic / DistribuciÃ³ / Impacte | Declaracions / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland', 'Federal Office of Culture (Film)', 'National public agency', 'Swiss film support', 'Development/Production/Distribution', 'Grant', 'Switzerland', 'https://www.bak.admin.ch/bak/en/home/cultural-promotion/film.html', 'Federal support', 'Public Agency Pack', 'English', 'Federal Office of Culture (Film) â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland', 'Zurich Film Foundation', 'Regional public agency', 'Feature, documentary, animation', 'Development/Production', 'Grant', 'Switzerland', 'https://www.filmstiftung.ch', 'Major regional fund', 'Documentary Fund Pack', 'English', 'Zurich Film Foundation â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland / International', 'Visions Sud Est', 'International public fund', 'Feature fiction and documentary from Africa/Asia/LatAm/Eastern Europe', 'Production/Post', 'Grant', 'Switzerland / International', 'https://www.visionssudest.ch', 'Swiss-backed international fund', 'Documentary Fund Pack', 'English', 'Visions Sud Est â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Taiwan', 'TAICCA', 'Public agency', 'Content industry support incl. film/TV', 'Development/Production/Co-production', 'Grant / investment', 'Taiwan', 'https://en.taicca.tw', 'Taiwan content agency', 'Standard Film Fund Pack', 'Traditional Chinese', 'TAICCA â ç³è«å¥ä»¶', 'ç³è«äºº / å¬å¸ | å°æ¡åç¨± | å½¢å¼ / é¡å / çé· | ä¸å¥è©±ç°¡ä» | åæç°¡ä» / èçå¤§ç¶± | å°æ¼é³è¿° | è£½çé³è¿° / èè³ç­ç¥ | åµæè³æåèæ ¸å¿åé | é ç®èèè³è¨ç« | æ¬å© / æ¬å©é | æç¨èäº¤ä»é ç® | è§ç¾ / ç¼è¡ / å½±é¿å | è²æ / ç°½å', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Tunisia', 'CNCI Tunisia', 'National public agency', 'Cinema and image support', 'Development/Production', 'Grant', 'Tunisia', 'https://www.culture.gov.tn', 'Tunisian public support', 'Public Agency Pack', 'Arabic', 'CNCI Tunisia â Ø­Ø²ÙØ© Ø§ÙØªÙØ¯ÙÙ', 'Ø§ÙÙØªÙØ¯Ù / Ø§ÙØ´Ø±ÙØ© | Ø¹ÙÙØ§Ù Ø§ÙÙØ´Ø±ÙØ¹ | Ø§ÙÙÙØ¹ / Ø§ÙØªØµÙÙÙ / Ø§ÙÙØ¯Ø© | Ø§ÙØ¬ÙÙØ© Ø§ÙØªØ¹Ø±ÙÙÙØ© | Ø§ÙÙÙØ®Øµ / Ø§ÙÙØ¹Ø§ÙØ¬Ø© | Ø¨ÙØ§Ù Ø§ÙÙØ®Ø±Ø¬ | Ø¨ÙØ§Ù Ø§ÙÙÙØªØ¬ / Ø§Ø³ØªØ±Ø§ØªÙØ¬ÙØ© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­Ø²ÙØ© Ø§ÙØ¥Ø¨Ø¯Ø§Ø¹ÙØ© ÙØ§ÙÙØ±ÙÙ Ø§ÙØ±Ø¦ÙØ³Ù | Ø§ÙÙÙØ²Ø§ÙÙØ© ÙØ®Ø·Ø© Ø§ÙØªÙÙÙÙ | Ø§ÙØ­ÙÙÙ / Ø³ÙØ³ÙØ© Ø§ÙÙÙÙÙØ© | Ø§ÙØ¬Ø¯ÙÙ Ø§ÙØ²ÙÙÙ ÙØ§ÙØªØ³ÙÙÙØ§Øª | Ø§ÙØ¬ÙÙÙØ± / Ø§ÙØªÙØ²ÙØ¹ / Ø§ÙØ£Ø«Ø± | Ø§ÙØ¥ÙØ±Ø§Ø±Ø§Øª / Ø§ÙØªÙÙÙØ¹Ø§Øª', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ukraine', 'Ukrainian State Film Agency', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Ukraine', 'https://usfa.gov.ua', 'National Ukrainian film body', 'Public Agency Pack', 'Ukrainian', 'Ukrainian State Film Agency â ÐÐ°ÐºÐµÑ Ð·Ð°ÑÐ²ÐºÐ¸', 'ÐÐ°ÑÐ²Ð½Ð¸Ðº / ÐÐ¾Ð¼Ð¿Ð°Ð½ÑÑ | ÐÐ°Ð·Ð²Ð° Ð¿ÑÐ¾ÑÐºÑÑ | Ð¤Ð¾ÑÐ¼Ð°Ñ / ÐÐ°Ð½Ñ / Ð¢ÑÐ¸Ð²Ð°Ð»ÑÑÑÑ | ÐÐ¾Ð³Ð»Ð°Ð¹Ð½ | Ð¡Ð¸Ð½Ð¾Ð¿ÑÐ¸Ñ / Ð¢ÑÑÑÐ¼ÐµÐ½Ñ | ÐÐ°ÑÐ²Ð° ÑÐµÐ¶Ð¸ÑÐµÑÐ° | ÐÐ°ÑÐ²Ð° Ð¿ÑÐ¾Ð´ÑÑÐµÑÐ° / Ð¤ÑÐ½Ð°Ð½ÑÐ¾Ð²Ð° ÑÑÑÐ°ÑÐµÐ³ÑÑ | Ð¢Ð²Ð¾ÑÑÐ¸Ð¹ Ð¿Ð°ÐºÐµÑ Ñ ÐºÐ»ÑÑÐ¾Ð²Ð° ÐºÐ¾Ð¼Ð°Ð½Ð´Ð° | ÐÑÐ´Ð¶ÐµÑ Ñ ÑÑÐ½Ð°Ð½ÑÐ¾Ð²Ð¸Ð¹ Ð¿Ð»Ð°Ð½ | ÐÑÐ°Ð²Ð° / Ð»Ð°Ð½ÑÑÐ³ Ð¿ÑÐ°Ð² | ÐÑÐ°ÑÑÐº Ñ Ð¼Ð°ÑÐµÑÑÐ°Ð»Ð¸ | ÐÑÐ´Ð¸ÑÐ¾ÑÑÑ / ÐÐ¸ÑÑÑÐ¸Ð±ÑÑÑÑ / ÐÐ¿Ð»Ð¸Ð² | ÐÐ°ÑÐ²Ð¸ / ÐÑÐ´Ð¿Ð¸ÑÐ¸', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'BBC Film', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning', 'United Kingdom', 'https://www.bbc.co.uk/bbcfilm', 'Public broadcaster film arm', 'Standard Film Fund Pack', 'English', 'BBC Film â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'BFI', 'National public agency', 'Feature film, shorts, development, distribution, skills', 'Development/Production/Distribution', 'Grant / lottery funding', 'United Kingdom', 'https://www.bfi.org.uk/get-funding-support', 'Main UK public funder', 'Public Agency Pack', 'English', 'BFI â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'Film4', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning / investment', 'United Kingdom', 'https://www.channel4.com/4studio/film4', 'Important UK backer', 'Standard Film Fund Pack', 'English', 'Film4 â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Catapult Film Fund', 'Private/nonprofit fund', 'Documentary', 'Research/Development', 'Grant', 'United States', 'https://catapultfilmfund.org', 'Early-stage doc fund', 'Documentary Fund Pack', 'English', 'Catapult Film Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Ford Foundation JustFilms', 'Private/nonprofit fund', 'Social-issue film and doc', 'Development/Production', 'Grant', 'United States', 'https://www.fordfoundation.org/work/our-grants/justfilms', 'Foundation-backed screen funding', 'Private / Nonprofit Fund Pack', 'English', 'Ford Foundation JustFilms â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; impact or outreach plan where relevant; declarations', 'Use for nonprofit, private, lab, or festival-linked funds. Prioritize artistic voice, urgency, mission fit, and sample quality.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'IDA Enterprise Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production', 'Grant', 'United States', 'https://www.documentary.org/enterprise', 'IDA doc support', 'Documentary Fund Pack', 'English', 'IDA Enterprise Documentary Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'ITVS', 'Public/nonprofit fund', 'Documentary', 'Development/Production', 'Grant / commissioning', 'United States', 'https://itvs.org/funding', 'Public media doc support', 'Documentary Fund Pack', 'English', 'ITVS â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'NEA Media Arts', 'Public arts fund', 'Media arts including film/video', 'Development/Production', 'Grant', 'United States', 'https://www.arts.gov/grants', 'Broad arts funding', 'Standard Film Fund Pack', 'English', 'NEA Media Arts â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'SFFILM', 'Private/nonprofit fund', 'Independent film', 'Development/Post', 'Grant', 'United States', 'https://sffilm.org/artist-development', 'Artist development and grants', 'Private / Nonprofit Fund Pack', 'English', 'SFFILM â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; impact or outreach plan where relevant; declarations', 'Use for nonprofit, private, lab, or festival-linked funds. Prioritize artistic voice, urgency, mission fit, and sample quality.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Sundance Institute Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production/Post', 'Grant', 'United States', 'https://www.sundance.org/programs/documentary-fund', 'Major doc fund', 'Documentary Fund Pack', 'English', 'Sundance Institute Documentary Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Uruguay', 'ICAU', 'National public agency', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Uruguay', 'https://icau.mec.gub.uy', 'Uruguayan film body', 'Public Agency Pack', 'Spanish', 'ICAU â Paquete de solicitud', 'Solicitante / Empresa | TÃ­tulo del proyecto | Formato / GÃ©nero / DuraciÃ³n | Logline | Sinopsis / Tratamiento | DeclaraciÃ³n del director | DeclaraciÃ³n del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / DistribuciÃ³n / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    // âââ Expansion pack: high-leverage global funders, US state offices, AI/Web3 rails, crowdfunding âââ
    const expansionInserts: string[] = [
      // â US state film offices / production incentives
      `('United States (CA)', 'California Film Commission', 'State public agency', 'Film and TV production tax credit', 'Production', 'Tax credit', 'United States (CA)', 'https://film.ca.gov', 'CA tax credit program 4.0', 'Incentive / Commission Pack', 'English', 'California Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.')`,
      `('United States (NY)', 'New York State Film Tax Credit', 'State public agency', 'Film/TV production', 'Production/Post', 'Tax credit', 'United States (NY)', 'https://esd.ny.gov/film-tax-credit-program', 'Up to 30% on qualified production costs', 'Incentive / Commission Pack', 'English', 'NY State Film Tax Credit â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Stress local hires, qualified post spend, schedule, and compliance.')`,
      `('United States (NY)', 'NYSCA Electronic Media & Film', 'State arts council', 'Independent film/media', 'Development/Production/Post', 'Grant', 'United States (NY)', 'https://arts.ny.gov', 'New York State Council on the Arts', 'Public Agency Pack', 'English', 'NYSCA Electronic Media & Film â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project narrative; statements; budget; finance plan; team bios; declarations', 'NY-based artists. Emphasize artistic merit and community impact.')`,
      `('United States (GA)', 'Georgia Film Office', 'State public agency', 'Film/TV production', 'Production', 'Tax credit', 'United States (GA)', 'https://www.georgia.org/industries/film-entertainment-production', 'GA 30% transferable production tax credit', 'Incentive / Commission Pack', 'English', 'Georgia Film Office â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; GA Entertainment Promotion Logo', 'Tag final film with GA logo to claim full 30%.')`,
      `('United States (NM)', 'New Mexico Film Office', 'State public agency', 'Film/TV production', 'Production', 'Tax credit', 'United States (NM)', 'https://nmfilm.com', 'NM 25-40% film production tax credit', 'Incentive / Commission Pack', 'English', 'New Mexico Film Office â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Strong rural shoot uplift; emphasize NM-resident hires.')`,
      `('United States (TX)', 'Texas Film Commission', 'State public agency', 'Film/TV/games', 'Production/Post', 'Grant / rebate', 'United States (TX)', 'https://gov.texas.gov/film', 'TX Moving Image Industry Incentive Program', 'Incentive / Commission Pack', 'English', 'Texas Film Commission â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; content review acknowledgement', 'Texas content review applies; structure script accordingly.')`,
      `('United States (LA)', 'Louisiana Entertainment', 'State public agency', 'Film/TV production', 'Production', 'Tax credit', 'United States (LA)', 'https://www.louisianaentertainment.gov', 'LA motion picture production tax credit', 'Incentive / Commission Pack', 'English', 'Louisiana Entertainment â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; LA logo placement', 'Layer with LA logo bonus and music bonus where applicable.')`,
      `('United States (IL)', 'Illinois Film Office', 'State public agency', 'Film/TV production', 'Production', 'Tax credit', 'United States (IL)', 'https://www2.illinois.gov/dceo/whyillinois/FilmInIllinois', 'IL 30% production tax credit', 'Incentive / Commission Pack', 'English', 'Illinois Film Office â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; diversity report', 'IL diversity hiring report required.')`,

      // â US BIPOC / underrepresented filmmaker funds
      `('United States', 'Black Public Media', 'Private/nonprofit fund', 'Black-led documentary and series', 'Development/Production/Post', 'Grant', 'United States', 'https://blackpublicmedia.org', 'Funding for Black creators across docs and digital', 'Documentary Fund Pack', 'English', 'Black Public Media â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Center Black creators and audience. Be specific about distribution and community impact.')`,
      `('United States', 'Latino Public Broadcasting', 'Private/nonprofit fund', 'Latino-led media', 'Development/Production/Post', 'Grant', 'United States', 'https://lpbp.org', 'Funding for Latino creators', 'Documentary Fund Pack', 'English', 'Latino Public Broadcasting â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Latino creator-led; community resonance counts.')`,
      `('United States', 'Center for Asian American Media (CAAM)', 'Private/nonprofit fund', 'Asian American media', 'Development/Production/Post', 'Grant', 'United States', 'https://caamedia.org', 'AAPI documentary and narrative funding', 'Documentary Fund Pack', 'English', 'CAAM â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'AAPI creator-led; specificity over pan-Asian generalities.')`,
      `('United States', 'Vision Maker Media', 'Private/nonprofit fund', 'Native American/Indigenous media', 'Development/Production/Post', 'Grant', 'United States', 'https://visionmakermedia.org', 'Indigenous storyteller funding', 'Documentary Fund Pack', 'English', 'Vision Maker Media â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; tribal letter of support if applicable', 'Indigenous creator-led; tribal sovereignty and protocol respect required.')`,
      `('United States', 'Pacific Islanders in Communications', 'Private/nonprofit fund', 'Pacific Islander media', 'Development/Production/Post', 'Grant', 'United States', 'https://piccom.org', 'Pacific Islander filmmaker funding', 'Documentary Fund Pack', 'English', 'PIC â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Pacific Islander creator-led with cultural protocol.')`,
      `('United States', 'Chicken & Egg Pictures', 'Private/nonprofit fund', 'Women+ documentary filmmakers', 'Development/Production/Post', 'Grant + mentorship', 'United States', 'https://chickeneggpics.org', 'Women+ doc filmmakers, multi-stage support', 'Documentary Fund Pack', 'English', 'Chicken & Egg Pictures â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Identify as woman+. Multi-year mentorship strands.')`,

      // â US doc + indie funds (high-impact, not yet seeded)
      `('United States', 'Tribeca Film Institute', 'Private/nonprofit fund', 'Independent narrative and documentary', 'Development/Production', 'Grant + lab', 'United States', 'https://tribecafilm.com/institute', 'Tribeca-affiliated indie support', 'Private / Nonprofit Fund Pack', 'English', 'Tribeca Film Institute â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; declarations', 'Mission-fit and sample quality matter.')`,
      `('United States', 'Catapult Film Fund', 'Private/nonprofit fund', 'Documentary development', 'Development', 'Grant', 'United States', 'https://catapultfilmfund.org', 'Early-stage documentary grants', 'Documentary Fund Pack', 'English', 'Catapult Film Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Early-stage; emphasize access and creative urgency.')`,
      `('United States', 'Cinereach', 'Private/nonprofit fund', 'Independent narrative and doc', 'Development/Production', 'Grant + lab', 'United States', 'https://cinereach.org', 'Cinereach Project Awards', 'Private / Nonprofit Fund Pack', 'English', 'Cinereach â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; declarations', 'Distinct artistic voice prioritized.')`,
      `('United States', 'Field of Vision', 'Private/nonprofit fund', 'Documentary commissioning', 'Development/Production/Post', 'Commission + grant', 'United States', 'https://fieldofvision.org', 'Visual journalism commissioning', 'Documentary Fund Pack', 'English', 'Field of Vision â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Visual journalism focus; timeliness and editorial bite.')`,
      `('United States', 'Pulitzer Center on Crisis Reporting', 'Private/nonprofit fund', 'Investigative journalism film', 'Development/Production', 'Grant', 'United States', 'https://pulitzercenter.org/grants', 'Reporting grants for film/video journalists', 'Documentary Fund Pack', 'English', 'Pulitzer Center â Reporting Grant Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; reporting plan; ethics; sources; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Crisis/investigative beats. Ethics and source protection emphasized.')`,
      `('United States', 'POV / American Documentary', 'Public/nonprofit fund', 'Documentary broadcast', 'Production/Post/Distribution', 'Commission + acquisition', 'United States', 'https://www.amdoc.org', 'PBS POV doc strand', 'Documentary Fund Pack', 'English', 'POV â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'PBS broadcast standards; rights cleared for US public TV.')`,

      // â UK / EU / international (high-leverage)
      `('United Kingdom', 'BBC Films', 'Public broadcaster development', 'UK feature film', 'Development/Production', 'Co-finance / commission', 'United Kingdom', 'https://www.bbc.co.uk/films', 'BBC feature commissioning slate', 'Public Agency Pack', 'English', 'BBC Films â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Submission via accredited agent typical; script; director note; producer note; team bios; budget summary; finance plan; comparable titles', 'Submission usually via accredited agent or producer relationship.')`,
      `('United Kingdom', 'Film4 Productions', 'Public broadcaster production arm', 'UK feature film', 'Development/Production', 'Co-finance / commission', 'United Kingdom', 'https://www.film4productions.com', 'Film4 development and co-finance', 'Public Agency Pack', 'English', 'Film4 â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Script; director note; producer note; team bios; budget summary; finance plan; comparable titles; UK production company', 'UK production company required; agent intro common.')`,
      `('United Kingdom', 'DocSociety', 'Private/nonprofit fund', 'Documentary, climate, investigative', 'Development/Production/Post', 'Grant + lab', 'United Kingdom', 'https://docsociety.org', 'Climate Story Fund, Sundance/DocSociety partnership', 'Documentary Fund Pack', 'English', 'DocSociety â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access; ethics; teaser; budget; finance plan; schedule; team bios; impact plan', 'Climate or impact orientation favored.')`,
      `('European Union', 'Creative Europe MEDIA', 'Supranational public agency', 'European audiovisual works', 'Development/Production/Distribution', 'Grant', 'European Union', 'https://culture.ec.europa.eu/creative-europe', 'EU MEDIA strand support', 'Public Agency Pack', 'English', 'Creative Europe MEDIA â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Online application; production company details; finance plan; recoupment plan; cultural test; team CVs; rights chain', 'EU-incorporated production company required.')`,
      `('Germany', 'World Cinema Fund (Berlinale)', 'Public/nonprofit fund', 'Films from underserved regions', 'Production/Post', 'Grant', 'Germany / Global', 'https://www.berlinale.de/en/world-cinema-fund', 'Co-production with German producer', 'Public Agency Pack', 'English', 'World Cinema Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production agreement w/ German producer; script; director note; producer note; team bios; budget summary; finance plan; rights chain', 'German co-producer mandatory.')`,
      `('Netherlands', 'Hubert Bals Fund (IFFR)', 'Private/nonprofit fund', 'Films from developing countries', 'Development/Production/Post', 'Grant', 'Netherlands / Global', 'https://iffr.com/en/professionals/hubert-bals-fund', 'IFFR co-production rail', 'Public Agency Pack', 'English', 'Hubert Bals Fund â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; script; director note; producer note; team bios; budget; finance plan', 'Director must be from listed developing country.')`,
      `('Qatar', 'Doha Film Institute Grants', 'Private/nonprofit fund', 'MENA-focused film', 'Development/Production/Post', 'Grant', 'Qatar / MENA', 'https://www.dohafilminstitute.com/financing', 'Spring/Fall grant cycles', 'Public Agency Pack', 'English', 'Doha Film Institute â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; script; director note; producer note; team bios; budget; finance plan; rights chain', 'MENA filmmaker or MENA-set story; quotas vary by category.')`,
      `('Lebanon', 'AFAC Arab Fund for Arts and Culture', 'Private/nonprofit fund', 'Pan-Arab arts including film', 'Development/Production/Post', 'Grant', 'Pan-Arab', 'https://www.arabculturefund.org', 'Documentary and fiction grants', 'Public Agency Pack', 'English', 'AFAC â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; script; director note; producer note; team bios; budget; finance plan', 'Pan-Arab filmmaker or Arab-themed work.')`,
      `('Norway', 'Sorfond', 'Public agency', 'Films from low/middle-income countries', 'Production/Post', 'Grant', 'Norway / Global', 'https://www.sorfond.no', 'Norwegian co-production rail', 'Public Agency Pack', 'English', 'Sorfond â Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; Norwegian co-producer; script; director note; producer note; team bios; budget; finance plan', 'Norwegian co-producer required.')`,

      // â Co-production markets / pitching forums (creative + funding intros)
      `('Germany', 'Berlinale Co-Production Market', 'Co-production market', 'International features in development', 'Development', 'Pitching forum', 'Berlinale-curated', 'https://www.efm-berlinale.de/en/copro-market/copro-market.html', 'Top tier EU/global co-prod intros', 'Lab / Market Pack', 'English', 'Berlinale Co-Production Market â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Project pitch deck; budget; finance plan; producer track record; teaser/sample where available', 'Curated submissions; producer track record matters.')`,
      `('France', 'Cannes Cinefondation L Atelier', 'Co-production market', 'Selected new directors with feature in development', 'Development', 'Pitching forum', 'Cinefondation-selected', 'https://www.cinefondation.com/en/lAtelier', 'Cannes-selected emerging directors', 'Lab / Market Pack', 'English', 'Cannes L Atelier â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Project pitch deck; budget; finance plan; producer track record; teaser/sample where available', 'Cannes selection process; new director focus.')`,
      `('Switzerland', 'Visions du Reel Pitching Forum', 'Co-production market', 'Documentary in development', 'Development/Production', 'Pitching forum', 'Doc-focused', 'https://www.visionsdureel.ch/en/industry', 'Annual doc pitching at Visions du Reel', 'Lab / Market Pack', 'English', 'Visions du Reel Pitching Forum â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Project pitch deck; budget; finance plan; producer track record; teaser/sample where available', 'Documentary projects only.')`,
      `('Denmark', 'CPH:FORUM (CPH:DOX)', 'Co-production market', 'Doc/hybrid in development', 'Development/Production', 'Pitching forum', 'Doc/hybrid focused', 'https://cphdox.dk/forum', 'Top European doc pitching', 'Lab / Market Pack', 'English', 'CPH FORUM â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Project pitch deck; budget; finance plan; producer track record; teaser/sample where available', 'Documentary and hybrid focus.')`,
      `('Canada', 'Hot Docs Forum', 'Co-production market', 'International doc in development', 'Development/Production', 'Pitching forum', 'Doc-focused', 'https://www.hotdocs.ca/i/the-hot-docs-forum', 'Toronto Hot Docs annual industry forum', 'Lab / Market Pack', 'English', 'Hot Docs Forum â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Project pitch deck; budget; finance plan; producer track record; teaser/sample where available', 'Doc projects with strong access and editorial bite.')`,

      // â Crowdfunding rails (NEW pack)
      `('Global', 'Seed&Spark', 'Crowdfunding platform', 'Independent film and series', 'Development/Production/Post', 'Crowdfunding', 'Global', 'https://seedandspark.com', 'Film-specific crowdfunding with all-or-flexible models', 'Crowdfunding Pack', 'English', 'Seed&Spark â Campaign Pack', 'Campaign Title | Funding Goal & Use | Campaign Page Copy | Pitch Video Script | Reward Tiers | Marketing & Outreach Plan | Press Kit | Updates Schedule | Audience Strategy | Risks & Mitigations', 'Campaign page draft; 2-3 minute pitch video; reward tier sheet; team bios; budget summary; outreach plan; sample work', 'Build audience pre-launch; first 48hrs traction is decisive.')`,
      `('Global', 'Kickstarter Film & Video', 'Crowdfunding platform', 'Film, video, episodic', 'Development/Production/Post', 'Crowdfunding', 'Global', 'https://www.kickstarter.com/discover/categories/film%20%26%20video', 'All-or-nothing pledges, large reach', 'Crowdfunding Pack', 'English', 'Kickstarter Film & Video â Campaign Pack', 'Campaign Title | Funding Goal & Use | Campaign Page Copy | Pitch Video Script | Reward Tiers | Marketing & Outreach Plan | Press Kit | Updates Schedule | Audience Strategy | Risks & Mitigations', 'Campaign page draft; 2-3 minute pitch video; reward tier sheet; team bios; budget summary; outreach plan; sample work', 'All-or-nothing model; build audience pre-launch.')`,
      `('Global', 'Indiegogo Film', 'Crowdfunding platform', 'Film, episodic, hybrid', 'Development/Production/Post', 'Crowdfunding', 'Global', 'https://www.indiegogo.com/explore/film', 'Flexible or fixed funding', 'Crowdfunding Pack', 'English', 'Indiegogo Film â Campaign Pack', 'Campaign Title | Funding Goal & Use | Campaign Page Copy | Pitch Video Script | Reward Tiers | Marketing & Outreach Plan | Press Kit | Updates Schedule | Audience Strategy | Risks & Mitigations', 'Campaign page draft; 2-3 minute pitch video; reward tier sheet; team bios; budget summary; outreach plan; sample work', 'Flexible funding option; mix with equity for hybrid raises.')`,

      // â AI filmmaker programs (NEW pack)
      `('Global', 'Runway Studios Hundred Film Fund', 'AI/tech-aligned fund', 'AI-assisted filmmaking', 'Development/Production', 'Grant + tooling', 'Global', 'https://runwayml.com/studios', 'Runway-backed AI filmmaker support', 'AI Filmmaker Pack', 'English', 'Runway Studios â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | AI Tooling Plan | Provenance / C2PA Plan | Declarations / Signatures', 'Project narrative; pitch deck; sample work or proof of concept; AI tooling plan; provenance/C2PA plan; budget; finance plan; team bios; declarations', 'Show genuine AI craft and rights-clean inputs.')`,
      `('United States', 'Stability AI Filmmaker Program', 'AI/tech-aligned fund', 'AI-native short and feature film', 'Development/Production', 'Grant + tooling', 'United States', 'https://stability.ai', 'Stability-backed AI filmmaker support', 'AI Filmmaker Pack', 'English', 'Stability AI â Submission Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | AI Tooling Plan | Provenance / C2PA Plan | Declarations / Signatures', 'Project narrative; pitch deck; sample work or proof of concept; AI tooling plan; provenance/C2PA plan; budget; finance plan; team bios; declarations', 'Demonstrate technical fluency with open-source ecosystems.')`,

      // â Web3 / crypto film capital (NEW pack)
      `('Global', 'Decent.xyz Indie Film Rail', 'Web3 fund/platform', 'Indie film tokenized financing', 'Development/Production/Distribution', 'Token raise / NFT', 'Global', 'https://decent.xyz', 'Tokenized indie film financing rail', 'Web3 Pack', 'English', 'Decent.xyz Indie Film â Submission Pack', 'Project Title | Logline | Synopsis | Director Note | Producer Note | Token Economics | Investor Class | Recoupment Waterfall | Distribution Plan | Provenance / Rights | KYC/AML Plan | Risk Disclosures', 'Pitch deck; token economics one-pager; recoupment waterfall; legal opinion on securities classification; KYC/AML plan; rights chain; teaser/sample', 'Securities counsel mandatory before launch.')`,
      `('Global', 'Glass Protocol', 'Web3 fund/platform', 'Filmmaker NFT-backed releases', 'Distribution', 'NFT release', 'Global', 'https://glass.xyz', 'Filmmaker-direct NFT release rail', 'Web3 Pack', 'English', 'Glass Protocol â Submission Pack', 'Project Title | Logline | Synopsis | Director Note | Producer Note | Token Economics | Investor Class | Recoupment Waterfall | Distribution Plan | Provenance / Rights | KYC/AML Plan | Risk Disclosures', 'Final or near-final film; release strategy; rights chain; provenance docs; community plan', 'NFT release rail; community-first.')`,

      // â Brand-funded content (NEW pack)
      `('Global', 'Branded Content Marketplace (Virelle Curated)', 'Brand partnership desk', 'Brand-funded short and feature', 'Development/Production', 'Sponsorship / co-finance', 'Global', 'https://www.virelle.life/funding', 'Curated brand creative-director directory', 'Brand Partnership Pack', 'English', 'Brand Partnership â Outreach Pack', 'Project Title | Logline | Brand Fit Rationale | Audience Profile | Placement Opportunities (scene-by-scene) | Director Note | Producer Note | Budget & Use of Funds | Distribution & Reach Plan | Brand Safety Statement | Rights / Provenance | Declarations', 'One-page outreach memo; scene-by-scene placement opportunities; audience deck; director sizzle; brand safety statement; rights chain', 'Lead with audience fit, not product placement count.')`,

      // â Streamer originals desks (treat as funders for development/co-finance)
      `('Global', 'Netflix Originals Submissions (via accredited agent)', 'Streamer commissioning', 'Original films and series', 'Development/Production', 'Co-finance / commission', 'Global', 'https://about.netflix.com/en', 'Submissions via accredited agents/managers/lawyers', 'Streamer Commission Pack', 'English', 'Netflix Originals â Submission Pack', 'Applicant / Agent | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Comparable Performance | Declarations / Signatures', 'Submissions only via accredited agent/manager/lawyer; pitch deck; sample materials', 'No unsolicited submissions accepted.')`,
      `('Global', 'A24 Original Submissions (via agent)', 'Studio/distributor commissioning', 'Independent feature films', 'Development/Production', 'Co-finance / acquisition', 'Global', 'https://a24films.com', 'Submissions via accredited agents only', 'Streamer Commission Pack', 'English', 'A24 â Submission Pack', 'Applicant / Agent | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Comparable Performance | Declarations / Signatures', 'Submissions only via accredited agent/manager/lawyer; pitch deck; sample materials', 'Distinct voice and cultural moment matter most.')`,
      `('Global', 'MUBI Productions', 'Streamer commissioning', 'Auteur-led films', 'Development/Production', 'Co-finance / acquisition', 'Global', 'https://mubi.com/notebook/posts/mubi-productions', 'MUBI in-house production arm', 'Streamer Commission Pack', 'English', 'MUBI Productions â Submission Pack', 'Applicant / Agent | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Comparable Performance | Declarations / Signatures', 'Submissions usually via agent/relationship; pitch deck; sample materials', 'Auteur voice prioritized over mass appeal.')`,
    ];
    for (const values of expansionInserts) {
      try {
        await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ${values.replace(/'\)$/, "', NOW(), NOW())")}`));
      } catch (insertErr: any) {
        logger.error(`[AutoMigrate] Funding expansion insert failed: ${insertErr.message}`);
      }
    }
    const [finalCount] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM funding_sources`)) as any;
    const total = finalCount?.[0]?.cnt ?? "?";
    logger.info(`[AutoMigrate] Film funding sources seeded (${total} total sources with pack metadata, INSERT IGNORE)`);
  } catch (err: any) {
    logger.error(`[AutoMigrate] Failed to seed funding sources: ${err.message}`);
  }
  })();

  // âââ Step 8 (v6.78): Seed global film funding sources expansion âââ
  // ~150 official film/cinema funding sources covering the brief's target regions
  // (international labs, North America, UK/Ireland, France, Germany, Nordics,
  //  Benelux, Southern Europe, Central/Eastern Europe, Australia/NZ, East Asia,
  //  South/Southeast Asia, MENA + Israel, Africa, Latin America/Caribbean).
  // Idempotent: INSERT IGNORE against the (country, organization) unique index,
  // and a marker check that fast-paths boot when already applied.
  await seedGlobalFundingV678(db);
}
