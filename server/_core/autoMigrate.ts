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
    { table: "users", column: "directorInstructions", definition: "TEXT NULL" }, // Custom instructions for the Director's Assistant AI
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
    // funding_sources extended fields from global fund CSV
    { table: "funding_sources", column: "packType", definition: "VARCHAR(128) NULL" },
    { table: "funding_sources", column: "primaryLanguage", definition: "VARCHAR(128) NULL" },
    { table: "funding_sources", column: "packTitle", definition: "VARCHAR(512) NULL" },
    { table: "funding_sources", column: "localizedSections", definition: "TEXT NULL" },
    { table: "funding_sources", column: "recommendedAttachments", definition: "TEXT NULL" },
    { table: "funding_sources", column: "tailoringNotes", definition: "TEXT NULL" },
    { table: "film_foley_tracks", column: "status", definition: "ENUM('pending','recorded','approved') NOT NULL DEFAULT 'pending'" },
    { table: "dialogues", column: "pacing", definition: "VARCHAR(32) NULL" },
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
  // 94 funding sources from global_film_funding_database CSV with full pack metadata
  try {
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Argentina', 'INCAA', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / credit', 'Argentina', 'https://www.incaa.gob.ar', 'Main Argentinian funder', 'Public Agency Pack', 'Spanish', 'INCAA — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia', 'Screen Australia', 'National public agency', 'Film, TV, online, games', 'Development/Production/Distribution', 'Grant / investment', 'Australia', 'https://www.screenaustralia.gov.au/funding-and-support', 'Main Australian funder', 'Public Agency Pack', 'English', 'Screen Australia — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (NSW)', 'Screen NSW', 'State public agency', 'Film/TV support', 'Development/Production/Post', 'Grant', 'Australia (NSW)', 'https://www.screen.nsw.gov.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screen NSW — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (QLD)', 'Screen Queensland', 'State public agency', 'Film/TV/digital', 'Development/Production/Post', 'Grant / incentive', 'Australia (QLD)', 'https://www.screenqueensland.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screen Queensland — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (SA)', 'South Australian Film Corporation', 'State public agency', 'Film/TV/digital', 'Development/Production', 'Grant / incentive', 'Australia (SA)', 'https://www.safilm.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'South Australian Film Corporation — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (VIC)', 'Film Victoria / Creative Victoria', 'State public agency', 'Film/TV/games/digital', 'Development/Production', 'Grant', 'Australia (VIC)', 'https://creative.vic.gov.au/grants-and-support/programs', 'State support', 'Incentive / Commission Pack', 'English', 'Film Victoria / Creative Victoria — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Australia (WA)', 'Screenwest', 'State public agency', 'Film/TV/digital', 'Development/Production', 'Grant / incentive', 'Australia (WA)', 'https://www.screenwest.com.au', 'State support', 'Incentive / Commission Pack', 'English', 'Screenwest — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Austria', 'Austrian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Austria', 'https://www.filmfonds-wien.at', 'National Austrian fund', 'Public Agency Pack', 'German', 'Austrian Film Institute — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | Regieerklärung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und Liefergegenstände | Publikum / Vertrieb / Wirkung | Erklärungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Belgium', 'VAF / Vlaams Audiovisueel Fonds', 'Regional public agency', 'Flemish film, TV, games', 'Development/Production/Distribution', 'Grant', 'Belgium', 'https://www.vaf.be', 'Flemish fund', 'Public Agency Pack', 'Dutch', 'VAF / Vlaams Audiovisueel Fonds — Aanvraagpakket', 'Aanvrager / Bedrijf | Projecttitel | Formaat / Genre / Duur | Logline | Synopsis / Behandeling | Regieverklaring | Producentenverklaring / Financieringsstrategie | Creatief pakket en kernteam | Budget en financieringsplan | Rechten / rechtenketen | Planning en opleveringen | Publiek / Distributie / Impact | Verklaringen / Handtekeningen', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Brazil', 'ANCINE', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant / investment', 'Brazil', 'https://www.gov.br/ancine', 'Main Brazilian body', 'Public Agency Pack', 'Portuguese', 'ANCINE — Pacote de candidatura', 'Candidato / Empresa | Título do projeto | Formato / Género / Duração | Logline | Sinopse / Tratamento | Declaração do realizador | Declaração do produtor / Estratégia financeira | Pacote criativo e equipa principal | Orçamento e plano financeiro | Direitos / Cadeia de titularidade | Cronograma e entregáveis | Público / Distribuição / Impacto | Declarações / Assinaturas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada', 'Telefilm Canada', 'National public agency', 'Feature film, co-productions', 'Development/Production', 'Grant / equity', 'Canada', 'https://telefilm.ca/en/funding', 'Main Canadian funder', 'Public Agency Pack', 'English', 'Telefilm Canada — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada', 'Canada Media Fund', 'Public/private fund', 'TV, digital, interactive', 'Development/Production', 'Grant / equity', 'Canada', 'https://cmf-fmc.ca/en', 'TV/digital support', 'Public Agency Pack', 'English', 'Canada Media Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Alberta)', 'Alberta Media Fund', 'Provincial agency', 'Film/TV/digital media', 'Production', 'Grant', 'Canada (Alberta)', 'https://www.alberta.ca/alberta-media-fund', 'Alberta support', 'Incentive / Commission Pack', 'English', 'Alberta Media Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (British Columbia)', 'Creative BC', 'Provincial agency', 'Film and TV support', 'Production', 'Tax credit / grants', 'Canada (British Columbia)', 'https://creativebc.com', 'BC support', 'Incentive / Commission Pack', 'English', 'Creative BC — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Ontario)', 'Ontario Creates', 'Provincial agency', 'Film/TV/book/music/games', 'Production', 'Tax credit / funding', 'Canada (Ontario)', 'https://www.ontariocreates.ca', 'Ontario incentives and support', 'Incentive / Commission Pack', 'English', 'Ontario Creates — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Canada (Quebec)', 'SODEC', 'Provincial public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant / investment', 'Canada (Quebec)', 'https://sodec.gouv.qc.ca', 'Major Quebec fund', 'Public Agency Pack', 'French', 'SODEC — Dossier de candidature', 'Candidat / Société | Titre du projet | Format / Genre / Durée | Logline | Synopsis / Traitement | Note d\'intention du réalisateur | Note du producteur / Stratégie de financement | Package créatif et équipe clé | Budget et plan de financement | Droits / Chaîne des droits | Calendrier et livrables | Public / Distribution / Impact | Déclarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Chile', 'Fondo de Fomento Audiovisual', 'National public fund', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Chile', 'https://www.fondosdecultura.cl/fondo-audiovisual', 'National Chilean fund', 'Public Agency Pack', 'Spanish', 'Fondo de Fomento Audiovisual — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Colombia', 'Proimágenes / Fondo para el Desarrollo Cinematográfico', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Colombia', 'https://www.proimagenescolombia.com', 'FDC administrator', 'Public Agency Pack', 'Spanish', 'Proimágenes / FDC — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Council of Europe', 'Eurimages', 'Supranational public fund', 'Feature co-production, distribution, exhibition', 'Development/Production/Distribution', 'Grant / co-production support', 'Council of Europe', 'https://www.coe.int/en/web/eurimages', 'Council of Europe film fund', 'International Co-production Pack', 'English', 'Eurimages — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Croatia', 'HAVC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Croatia', 'https://havc.hr', 'Croatian Audiovisual Centre', 'Public Agency Pack', 'Croatian', 'HAVC — Paket prijave', 'Podnositelj zahtjeva / Tvrtka | Naslov projekta | Format / Žanr / Trajanje | Logline | Sinopsis / Tretman | Izjava redatelja | Izjava producenta / Strategija financiranja | Kreativni paket i ključni tim | Proračun i financijski plan | Prava / lanac prava | Raspored i isporuke | Publika / Distribucija / Utjecaj | Izjave / Potpisi', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Czech Republic', 'Czech Audiovisual Fund', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Czech Republic', 'https://fondkinematografie.cz', 'Formerly Czech Film Fund', 'Public Agency Pack', 'Czech', 'Czech Audiovisual Fund — Přihláška', 'Žadatel / Společnost | Název projektu | Formát / Žánr / Délka | Logline | Synopse / Zpracování | Prohlášení režiséra | Prohlášení producenta / Strategie financování | Kreativní balíček a klíčový tým | Rozpočet a finanční plán | Práva / řetězec práv | Harmonogram a výstupy | Publikum / Distribuce / Dopad | Prohlášení / Podpisy', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Dominican Republic', 'DGCINE', 'National public agency', 'Film support and incentives', 'Production/Distribution', 'Tax incentive / grants', 'Dominican Republic', 'https://dgcine.gob.do', 'Growing Caribbean hub', 'Incentive / Commission Pack', 'Spanish', 'DGCINE — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Sinopsis / Tratamiento | Declaración del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | Coproducción / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Estonia', 'Estonian Film Institute', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Estonia', 'https://www.filminstitute.ee/en', 'National Estonian fund', 'Public Agency Pack', 'Estonian', 'Estonian Film Institute — Taotluspakett', 'Taotleja / Ettevõte | Projekti pealkiri | Formaat / Žanr / Kestus | Logline | Sünopsis / Töötlus | Lavastaja avaldus | Produtsendi avaldus / Rahastamisstrateegia | Loominguline pakett ja põhitiim | Eelarve ja rahastamiskava | Õigused / õiguste ahel | Ajakava ja tarnimised | Publik / Levitamine / Mõju | Avaldused / Allkirjad', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Europe / EU', 'Creative Europe MEDIA', 'Supranational public fund', 'Development, TV/slate, distribution, training, markets', 'Development/Production/Distribution', 'Grant', 'Europe / EU', 'https://culture.ec.europa.eu/creative-europe/actions/media', 'EU audiovisual support', 'International Co-production Pack', 'English', 'Creative Europe MEDIA — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('France', 'CNC', 'National public agency', 'Feature, short, documentary, animation, VR', 'Development/Production/Distribution', 'Grant / advance on receipts', 'France', 'https://www.cnc.fr', 'Main French funder', 'Public Agency Pack', 'French', 'CNC — Dossier de candidature', 'Candidat / Société | Titre du projet | Format / Genre / Durée | Logline | Synopsis / Traitement | Note d\'intention du réalisateur | Note du producteur / Stratégie de financement | Package créatif et équipe clé | Budget et plan de financement | Droits / Chaîne des droits | Calendrier et livrables | Public / Distribution / Impact | Déclarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('France / International', 'Aide aux cinémas du monde', 'International public fund', 'International co-production', 'Development/Production', 'Grant', 'France / International', 'https://www.cnc.fr/professionnels/aides-et-financements/international/aide-aux-cinemas-du-monde', 'International co-pro support', 'International Co-production Pack', 'French', 'Aide aux cinémas du monde — Dossier de candidature', 'Candidat / Société | Titre du projet | Format / Genre / Durée | Logline | Synopsis / Traitement | Note du producteur / Stratégie de financement | Package créatif et équipe clé | Budget et plan de financement | Droits / Chaîne des droits | Calendrier et livrables | Coproduction / Éligibilité | Public / Distribution / Impact | Déclarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany', 'FFA', 'National public agency', 'Feature, documentary, short, animation', 'Development/Production/Distribution', 'Grant / loan', 'Germany', 'https://www.ffa.de', 'German Federal Film Fund', 'Public Agency Pack', 'German', 'FFA — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | Regieerklärung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und Liefergegenstände | Publikum / Vertrieb / Wirkung | Erklärungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany', 'DFFF', 'National public agency', 'Film production incentive', 'Production', 'Tax incentive / grant', 'Germany', 'https://www.ffa.de/foerderung-dfff.html', 'German federal incentive', 'Incentive / Commission Pack', 'German', 'DFFF — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Synopsis / Treatment | Produzentenstatement / Finanzierungsstrategie | Budget und Finanzierungsplan | Zeitplan und Liefergegenstände | Koproduktion / Förderfähigkeit | Erklärungen / Unterschriften', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Bavaria)', 'FFF Bayern', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Bavaria)', 'https://www.fff-bayern.de', 'Bavarian regional fund', 'Public Agency Pack', 'German', 'FFF Bayern — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | Regieerklärung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und Liefergegenstände | Publikum / Vertrieb / Wirkung | Erklärungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Berlin)', 'Medienboard Berlin-Brandenburg', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Berlin)', 'https://www.medienboard.de', 'Berlin-Brandenburg fund', 'Public Agency Pack', 'German', 'Medienboard Berlin-Brandenburg — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | Regieerklärung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und Liefergegenstände | Publikum / Vertrieb / Wirkung | Erklärungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany (Hamburg)', 'MOIN Filmförderung Hamburg Schleswig-Holstein', 'Regional public agency', 'Film and media', 'Development/Production', 'Grant', 'Germany (Hamburg)', 'https://www.moin-filmfoerderung.de', 'Hamburg/Schleswig-Holstein fund', 'Public Agency Pack', 'German', 'MOIN Filmförderung — Antragspaket', 'Antragsteller / Unternehmen | Projekttitel | Format / Genre / Laufzeit | Logline | Synopsis / Treatment | Regieerklärung | Produzentenstatement / Finanzierungsstrategie | Kreativpaket und Kernteam | Budget und Finanzierungsplan | Rechte / Rechtekette | Zeitplan und Liefergegenstände | Publikum / Vertrieb / Wirkung | Erklärungen / Unterschriften', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Germany / International', 'World Cinema Fund', 'International public fund', 'Films from underrepresented regions', 'Development/Production/Post', 'Grant', 'Germany / International', 'https://www.berlinale.de/en/world-cinema-fund', 'Berlinale-linked fund', 'International Co-production Pack', 'English', 'World Cinema Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Hong Kong', 'Film Development Fund', 'Public fund', 'Film production and talent development', 'Development/Production/Training', 'Grant', 'Hong Kong', 'https://www.createhk.gov.hk/en/funding-support/film-development-fund.htm', 'HK public film fund', 'Standard Film Fund Pack', 'Traditional Chinese', 'Film Development Fund — 申請套件', '申請人 / 公司 | 專案名稱 | 形式 / 類型 / 片長 | 一句話簡介 | 劇情簡介 / 處理大綱 | 導演陳述 | 製片陳述 / 融資策略 | 創意資料包與核心團隊 | 預算與融資計畫 | 權利 / 權利鏈 | 時程與交付項目 | 觀眾 / 發行 / 影響力 | 聲明 / 簽名', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Hungary', 'National Film Institute Hungary', 'National public agency', 'Film/TV support', 'Development/Production', 'Grant / incentive', 'Hungary', 'https://nfi.hu/en', 'Main Hungarian agency', 'Public Agency Pack', 'Hungarian', 'National Film Institute Hungary — Pályázati csomag', 'Pályázó / Cég | Projekt címe | Formátum / Műfaj / Játékidő | Logline | Szinopszis / Treatment | Rendezői nyilatkozat | Produceri nyilatkozat / Finanszírozási stratégia | Kreatív csomag és kulcscsapat | Költségvetés és finanszírozási terv | Jogok / chain of title | Ütemterv és leadandók | Közönség / Forgalmazás / Hatás | Nyilatkozatok / Aláírások', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ibero-America', 'Ibermedia', 'Supranational public fund', 'Co-production, development, distribution, training', 'Development/Production/Distribution', 'Grant', 'Ibero-America', 'https://www.programaibermedia.com', 'Multilateral Ibero-American support', 'International Co-production Pack', 'Spanish', 'Ibermedia — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Coproducción / Elegibilidad | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('India', 'Film Bazaar', 'Market / industry platform', 'Project market and co-production access', 'Development/Packaging', 'Market / platform / labs', 'India', 'https://www.filmbazaarindia.com', 'Important funding-access route', 'Standard Film Fund Pack', 'English', 'Film Bazaar — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('India', 'NFDC India', 'National public enterprise', 'Film support', 'Development/Production/Co-production/Market', 'Grant / investment / market support', 'India', 'https://www.nfdcindia.com', 'Main national body', 'Standard Film Fund Pack', 'English', 'NFDC India — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Indonesia', 'Ministry of Education Culture / film support programs', 'Public agency', 'Film and cultural grants', 'Development/Production', 'Grant', 'Indonesia', 'https://kemenparekraf.go.id', 'Fragmented public support', 'Standard Film Fund Pack', 'Indonesian', 'Ministry of Education Culture — Paket aplikasi', 'Pemohon / Perusahaan | Judul proyek | Format / Genre / Durasi | Logline | Sinopsis / Treatment | Pernyataan sutradara | Pernyataan produser / Strategi pembiayaan | Paket kreatif & tim inti | Anggaran & rencana pembiayaan | Hak / rantai hak | Jadwal & penyerahan | Audiens / Distribusi / Dampak | Pernyataan / Tanda tangan', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ireland', 'Fís Éireann/Screen Ireland', 'National public agency', 'Film, TV, animation, docs, shorts', 'Development/Production/Distribution', 'Grant / loan / equity', 'Ireland', 'https://www.screenireland.ie/funding', 'Main Irish funder', 'Public Agency Pack', 'English', 'Fís Éireann/Screen Ireland — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ireland', 'Section 481', 'Tax incentive', 'Film/TV production incentive', 'Production', 'Tax credit', 'Ireland', 'https://www.revenue.ie/en/companies-and-charities/financial-services-and-gambling/film-relief/index.aspx', 'Fiscal incentive', 'Incentive / Commission Pack', 'English', 'Section 481 — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Synopsis / Treatment | Producer Statement / Finance Strategy | Budget & Finance Plan | Schedule & Deliverables | Co-production / Eligibility | Declarations / Signatures', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Gesher Multicultural Film Fund', 'Foundation/public-interest fund', 'Multicultural film support', 'Development/Production', 'Grant', 'Israel', 'https://gesherfilmfund.org.il', 'Israeli multicultural fund', 'Standard Film Fund Pack', 'Hebrew', 'Gesher Multicultural Film Fund — חבילת הגשה', 'המגיש / החברה | שם הפרויקט | פורמט / ז׳אנר / משך | לוגליין | סינופסיס / טריטמנט | הצהרת הבמאי | הצהרת המפיק / אסטרטגיית מימון | חבילה יצירתית וצוות מפתח | תקציב ותכנית מימון | זכויות / שרשרת זכויות | לוח זמנים ומסירות | קהל / הפצה / השפעה | הצהרות / חתימות', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Israel Film Fund', 'National/private public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://www.filmfund.org.il', 'Major Israeli feature fund', 'Standard Film Fund Pack', 'Hebrew', 'Israel Film Fund — חבילת הגשה', 'המגיש / החברה | שם הפרויקט | פורמט / ז׳אנר / משך | לוגליין | סינופסיס / טריטמנט | הצהרת הבמאי | הצהרת המפיק / אסטרטגיית מימון | חבילה יצירתית וצוות מפתח | תקציב ותכנית מימון | זכויות / שרשרת זכויות | לוח זמנים ומסירות | קהל / הפצה / השפעה | הצהרות / חתימות', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'New Fund for Cinema and Television', 'Foundation/public-interest fund', 'Documentary and social-change cinema/TV', 'Development/Production', 'Grant', 'Israel', 'https://nfct.org.il/en', 'Israeli independent fund', 'Documentary Fund Pack', 'Hebrew', 'New Fund for Cinema and Television — חבילת הגשה', 'המגיש / החברה | שם הפרויקט | פורמט / ז׳אנר / משך | לוגליין | סינופסיס / טריטמנט | הצהרת הבמאי | הצהרת המפיק / אסטרטגיית מימון | חבילה יצירתית וצוות מפתח | תקציב ותכנית מימון | לוח זמנים ומסירות | קהל / הפצה / השפעה | דוגמת עבודה | הצהרות / חתימות', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Israel', 'Rabinovich Foundation - Cinema Project', 'Foundation/public-interest fund', 'Feature film support', 'Development/Production', 'Grant', 'Israel', 'https://rabinovichfoundation.org.il', 'Major Israeli cinema fund', 'Standard Film Fund Pack', 'Hebrew', 'Rabinovich Foundation - Cinema Project — חבילת הגשה', 'המגיש / החברה | שם הפרויקט | פורמט / ז׳אנר / משך | לוגליין | סינופסיס / טריטמנט | הצהרת הבמאי | הצהרת המפיק / אסטרטגיית מימון | חבילה יצירתית וצוות מפתח | תקציב ותכנית מימון | זכויות / שרשרת זכויות | לוח זמנים ומסירות | קהל / הפצה / השפעה | הצהרות / חתימות', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Italy', 'Apulia Film Fund / Apulia Film Commission', 'Regional public agency', 'Production support', 'Production', 'Grant / rebate', 'Italy', 'https://www.apuliafilmcommission.it', 'Regional incentive/fund', 'Incentive / Commission Pack', 'Italian', 'Apulia Film Fund / Apulia Film Commission — Pacchetto di candidatura', 'Richiedente / Società | Titolo del progetto | Formato / Genere / Durata | Sinossi / Trattamento | Dichiarazione del produttore / Strategia finanziaria | Budget e piano finanziario | Calendario e consegne | Coproduzione / Ammissibilità | Dichiarazioni / Firme', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Italy', 'DGCA / Direzione Generale Cinema e Audiovisivo', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Tax credit / grants', 'Italy', 'https://cinema.cultura.gov.it', 'Main Italian film body', 'Public Agency Pack', 'Italian', 'DGCA / Direzione Generale Cinema e Audiovisivo — Pacchetto di candidatura', 'Richiedente / Società | Titolo del progetto | Formato / Genere / Durata | Logline | Sinossi / Trattamento | Dichiarazione del regista | Dichiarazione del produttore / Strategia finanziaria | Pacchetto creativo e team chiave | Budget e piano finanziario | Diritti / Catena dei diritti | Calendario e consegne | Pubblico / Distribuzione / Impatto | Dichiarazioni / Firme', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Japan', 'VIPO', 'Public-private support body', 'Co-production, market access, talent', 'Development/Production', 'Grant / support programs', 'Japan', 'https://www.vipo.or.jp/en', 'Japan international support', 'Standard Film Fund Pack', 'Japanese', 'VIPO — 申請パック', '申請者 / 会社 | 企画名 | 形式 / ジャンル / 上映時間 | ログライン | シノプシス / トリートメント | 監督ステートメント | プロデューサー声明 / 資金調達戦略 | 企画資料と主要スタッフ | 予算書・資金計画 | 権利 / 権利証明 | スケジュールと納品物 | 観客 / 配給 / インパクト | 宣誓 / 署名', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Jordan', 'Royal Film Commission - Jordan', 'Public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'Jordan', 'https://royalfilmcommission.jo', 'Jordanian support', 'Standard Film Fund Pack', 'Arabic', 'Royal Film Commission - Jordan — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الجملة التعريفية | الملخص / المعالجة | بيان المخرج | بيان المنتج / استراتيجية التمويل | الحزمة الإبداعية والفريق الرئيسي | الميزانية وخطة التمويل | الحقوق / سلسلة الملكية | الجدول الزمني والتسليمات | الجمهور / التوزيع / الأثر | الإقرارات / التوقيعات', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Kenya', 'Kenya Film Commission', 'Public agency', 'Industry support and incentives', 'Production', 'Incentive / grant / facilitation', 'Kenya', 'https://filminginkenya.go.ke', 'Kenyan screen body', 'Standard Film Fund Pack', 'English', 'Kenya Film Commission — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Latvia', 'National Film Centre of Latvia', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Latvia', 'https://nkc.gov.lv/en', 'National Latvian fund', 'Public Agency Pack', 'Latvian', 'National Film Centre of Latvia — Pieteikuma pakete', 'Pieteicējs / Uzņēmums | Projekta nosaukums | Formāts / Žanrs / Ilgums | Logline | Sinopse / Treatment | Režisora paziņojums | Producenta paziņojums / Finansēšanas stratēģija | Radošais komplekts un galvenā komanda | Budžets un finansēšanas plāns | Tiesības / tiesību ķēde | Grafiks un piegādes | Auditorija / Izplatīšana / Ietekme | Paziņojumi / Paraksti', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Lebanon / MENA', 'AFAC', 'Private/nonprofit arts fund', 'Film and broader arts', 'Development/Production/Post', 'Grant', 'Lebanon / MENA', 'https://www.arabculturefund.org', 'MENA arts fund', 'Standard Film Fund Pack', 'Arabic', 'AFAC — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الجملة التعريفية | الملخص / المعالجة | بيان المخرج | بيان المنتج / استراتيجية التمويل | الحزمة الإبداعية والفريق الرئيسي | الميزانية وخطة التمويل | الحقوق / سلسلة الملكية | الجدول الزمني والتسليمات | الجمهور / التوزيع / الأثر | الإقرارات / التوقيعات', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Luxembourg', 'Film Fund Luxembourg', 'National public agency', 'Film and audiovisual', 'Development/Production', 'Grant / incentive', 'Luxembourg', 'https://www.filmfund.lu', 'Luxembourg support', 'Public Agency Pack', 'French', 'Film Fund Luxembourg — Dossier de candidature', 'Candidat / Société | Titre du projet | Format / Genre / Durée | Logline | Synopsis / Traitement | Note d\'intention du réalisateur | Note du producteur / Stratégie de financement | Package créatif et équipe clé | Budget et plan de financement | Droits / Chaîne des droits | Calendrier et livrables | Public / Distribution / Impact | Déclarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Malaysia', 'FINAS', 'National public agency', 'Film support and incentives', 'Development/Production/Distribution', 'Grant / incentive', 'Malaysia', 'https://www.finas.gov.my/en', 'Malaysian film body', 'Public Agency Pack', 'Malay', 'FINAS — Pakej permohonan', 'Pemohon / Syarikat | Tajuk projek | Format / Genre / Tempoh | Logline | Sinopsis / Treatment | Kenyataan pengarah | Kenyataan penerbit / Strategi pembiayaan | Pakej kreatif & pasukan utama | Bajet & pelan pembiayaan | Hak / rantaian hak milik | Jadual & serahan | Penonton / Pengedaran / Impak | Perakuan / Tandatangan', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Mexico', 'EFICINE', 'Tax incentive', 'Film investment incentive', 'Production/Distribution', 'Tax credit', 'Mexico', 'https://www.imcine.gob.mx/eficine', 'Fiscal incentive', 'Incentive / Commission Pack', 'Spanish', 'EFICINE — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Sinopsis / Tratamiento | Declaración del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | Coproducción / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Mexico', 'IMCINE', 'National public agency', 'Mexican cinema support', 'Development/Production/Distribution', 'Grant', 'Mexico', 'https://www.imcine.gob.mx', 'Main Mexican body', 'Public Agency Pack', 'Spanish', 'IMCINE — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Morocco', 'CCM', 'National public agency', 'Film support and incentives', 'Development/Production', 'Grant / rebate', 'Morocco', 'https://www.ccm.ma', 'Moroccan film body', 'Incentive / Commission Pack', 'Arabic', 'CCM — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الملخص / المعالجة | بيان المنتج / استراتيجية التمويل | الميزانية وخطة التمويل | الجدول الزمني والتسليمات | الإنتاج المشترك / الأهلية | الإقرارات / التوقيعات', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands', 'Netherlands Film Fund', 'National public agency', 'Feature, documentary, shorts, immersive', 'Development/Production/Distribution', 'Grant', 'Netherlands', 'https://www.filmfonds.nl', 'Main Dutch fund', 'Documentary Fund Pack', 'Dutch', 'Netherlands Film Fund — Aanvraagpakket', 'Aanvrager / Bedrijf | Projecttitel | Formaat / Genre / Duur | Logline | Synopsis / Behandeling | Regieverklaring | Producentenverklaring / Financieringsstrategie | Creatief pakket en kernteam | Budget en financieringsplan | Planning en opleveringen | Publiek / Distributie / Impact | Werkvoorbeeld | Verklaringen / Handtekeningen', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands / International', 'Hubert Bals Fund', 'International public/private fund', 'Features, docs, talent from underrepresented regions', 'Development/Production/Post', 'Grant', 'Netherlands / International', 'https://iffr.com/en/hubert-bals-fund', 'Rotterdam-linked fund', 'International Co-production Pack', 'English', 'Hubert Bals Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Netherlands / International', 'IDFA Bertha Fund', 'International documentary fund', 'Creative documentary', 'Development/Production/Post', 'Grant', 'Netherlands / International', 'https://professionals.idfa.nl/training-funding/funding/about-the-idfa-bertha-fund/', 'Documentary-specific', 'Documentary Fund Pack', 'English', 'IDFA Bertha Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('New Zealand', 'New Zealand Film Commission', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'New Zealand', 'https://www.nzfilm.co.nz/funding', 'Main NZ funder', 'Public Agency Pack', 'English', 'New Zealand Film Commission — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Nigeria', 'Nigerian Film Corporation', 'Public agency', 'Film development and training', 'Development/Production', 'Grant / support programs', 'Nigeria', 'https://nigerianfilms.com', 'National institution', 'Standard Film Fund Pack', 'English', 'Nigerian Film Corporation — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Peru', 'DAFO / Ministry of Culture Audiovisual Support', 'National public fund', 'Film support', 'Development/Production/Distribution', 'Grant', 'Peru', 'https://www.gob.pe/cultura', 'Peruvian public support', 'Standard Film Fund Pack', 'Spanish', 'DAFO / Ministry of Culture Audiovisual Support — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Philippines', 'FDCP', 'National public agency', 'Film development and promotion', 'Development/Production/Distribution', 'Grant / support programs', 'Philippines', 'https://www.fdcp.ph', 'Main Philippine screen body', 'Public Agency Pack', 'English', 'FDCP — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Poland', 'Polish Film Institute', 'National public agency', 'Film development and production', 'Development/Production/Distribution', 'Grant', 'Poland', 'https://pisf.pl', 'Main Polish fund', 'Public Agency Pack', 'Polish', 'Polish Film Institute — Pakiet aplikacyjny', 'Wnioskodawca / Firma | Tytuł projektu | Format / Gatunek / Czas trwania | Logline | Synopsis / Treatment | Oświadczenie reżysera | Oświadczenie producenta / Strategia finansowania | Pakiet kreatywny i kluczowy zespół | Budżet i plan finansowania | Prawa / chain of title | Harmonogram i materiały końcowe | Publiczność / Dystrybucja / Wpływ | Oświadczenia / Podpisy', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Portugal', 'ICA Portugal', 'National public agency', 'Film and audiovisual', 'Development/Production/Distribution', 'Grant', 'Portugal', 'https://www.ica-ip.pt', 'National Portuguese fund', 'Public Agency Pack', 'Portuguese', 'ICA Portugal — Pacote de candidatura', 'Candidato / Empresa | Título do projeto | Formato / Género / Duração | Logline | Sinopse / Tratamento | Declaração do realizador | Declaração do produtor / Estratégia financeira | Pacote criativo e equipa principal | Orçamento e plano financeiro | Direitos / Cadeia de titularidade | Cronograma e entregáveis | Público / Distribuição / Impacto | Declarações / Assinaturas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Puerto Rico', 'Puerto Rico Film Commission / Incentive Program', 'Public incentive body', 'Production support', 'Production', 'Tax incentive', 'Puerto Rico', 'https://www.film.pr.gov', 'Key Caribbean incentive body', 'Incentive / Commission Pack', 'Spanish', 'Puerto Rico Film Commission — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Sinopsis / Tratamiento | Declaración del productor / Estrategia financiera | Presupuesto y plan financiero | Calendario y entregables | Coproducción / Elegibilidad | Declaraciones / Firmas', 'Application form; production company details; local spend budget; finance evidence; shooting schedule; script/treatment; vendor plan; residency/tax docs; incentive declarations', 'Use for rebates, commissions, and production incentives. Focus on eligible spend, local hires, schedule, and legal compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Qatar / International', 'Doha Film Institute Grants', 'Private/nonprofit fund', 'Feature, short, experimental, essay, TV/web', 'Development/Production/Post', 'Grant', 'Qatar / International', 'https://www.dohafilm.com/en/funding-industry/funding/grants', 'Well-known MENA grant maker', 'International Co-production Pack', 'Arabic', 'Doha Film Institute Grants — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الجملة التعريفية | الملخص / المعالجة | بيان المنتج / استراتيجية التمويل | الحزمة الإبداعية والفريق الرئيسي | الميزانية وخطة التمويل | الحقوق / سلسلة الملكية | الجدول الزمني والتسليمات | الإنتاج المشترك / الأهلية | الجمهور / التوزيع / الأثر | الإقرارات / التوقيعات', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Romania', 'Romanian Film Centre (CNC)', 'National public agency', 'Film support', 'Development/Production', 'Grant', 'Romania', 'https://cnc.gov.ro', 'Romanian CNC', 'Public Agency Pack', 'Romanian', 'Romanian Film Centre (CNC) — Pachet de aplicație', 'Solicitant / Companie | Titlul proiectului | Format / Gen / Durată | Logline | Sinopsis / Tratament | Declarația regizorului | Declarația producătorului / Strategia de finanțare | Pachet creativ și echipa cheie | Buget și plan de finanțare | Drepturi / lanțul titlului | Calendar și livrabile | Public / Distribuție / Impact | Declarații / Semnături', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Saudi Arabia / International', 'Red Sea Fund', 'Private/festival-linked fund', 'Feature, short, doc, animation, episodic', 'Development/Production/Post', 'Grant', 'Saudi Arabia / International', 'https://redseafilmfest.com/en/red-sea-fund/', 'Jeddah-based festival fund', 'International Co-production Pack', 'Arabic', 'Red Sea Fund — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الجملة التعريفية | الملخص / المعالجة | بيان المنتج / استراتيجية التمويل | الحزمة الإبداعية والفريق الرئيسي | الميزانية وخطة التمويل | الحقوق / سلسلة الملكية | الجدول الزمني والتسليمات | الإنتاج المشترك / الأهلية | الجمهور / التوزيع / الأثر | الإقرارات / التوقيعات', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Singapore', 'IMDA', 'National public agency', 'Media and screen support', 'Development/Production', 'Grant', 'Singapore', 'https://www.imda.gov.sg', 'Singapore screen support', 'Public Agency Pack', 'English', 'IMDA — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Slovenia', 'Slovenian Film Centre', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Slovenia', 'https://www.film-center.si/en', 'National Slovenian fund', 'Public Agency Pack', 'Slovenian', 'Slovenian Film Centre — Prijavni paket', 'Prijavitelj / Podjetje | Naslov projekta | Format / Žanr / Trajanje | Logline | Sinopsis / Treatment | Izjava režiserja | Izjava producenta / Strategija financiranja | Ustvarjalni paket in ključna ekipa | Proračun in finančni načrt | Pravice / veriga pravic | Časovnica in dostave | Občinstvo / Distribucija / Učinek | Izjave / Podpisi', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'Gauteng Film Commission', 'Regional public agency', 'Production and incentives', 'Production', 'Incentive / support', 'South Africa', 'https://www.gautengfilm.org.za', 'Regional support', 'International Co-production Pack', 'English', 'Gauteng Film Commission — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'KZN Film Commission', 'Regional public agency', 'Film support and incentives', 'Development/Production', 'Grant / incentive', 'South Africa', 'https://kznfilm.co.za', 'Regional support', 'International Co-production Pack', 'English', 'KZN Film Commission — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Co-production / Eligibility | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Africa', 'NFVF', 'National public agency', 'Film development, production, marketing, distribution', 'Development/Production/Distribution', 'Grant', 'South Africa', 'https://www.nfvf.co.za', 'Main South African funder', 'Public Agency Pack', 'English', 'NFVF — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('South Korea', 'KOFIC', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant / investment', 'South Korea', 'https://www.kofic.or.kr/eng', 'Korean Film Council', 'Public Agency Pack', 'Korean', 'KOFIC — 신청 패키지', '신청자 / 회사 | 프로젝트 제목 | 형식 / 장르 / 상영시간 | 로그라인 | 시놉시스 / 트리트먼트 | 감독 진술서 | 프로듀서 진술 / 자금 조달 전략 | 크리에이티브 패키지 및 핵심 팀 | 예산 및 자금 계획 | 권리 / 권리 연쇄 | 일정 및 제출물 | 관객 / 배급 / 임팩트 | 진술 / 서명', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Spain', 'ICAA', 'National public agency', 'Cinema and audiovisual', 'Development/Production/Distribution', 'Grant', 'Spain', 'https://www.cultura.gob.es/cultura/areas/cine/mc/icaa', 'Main Spanish agency', 'Public Agency Pack', 'Spanish', 'ICAA — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Spain (Catalonia)', 'ICEC / Catalan Institute for Cultural Companies', 'Regional public agency', 'Audiovisual support', 'Development/Production', 'Grant', 'Spain (Catalonia)', 'https://icec.gencat.cat', 'Catalan support', 'International Co-production Pack', 'Catalan', 'ICEC / Catalan Institute for Cultural Companies — Paquet de sol·licitud', 'Sol·licitant / Empresa | Títol del projecte | Format / Gènere / Durada | Logline | Sinopsi / Tractament | Declaració del productor / Estratègia financera | Paquet creatiu i equip clau | Pressupost i pla financer | Drets / cadena de titularitat | Calendari i lliurables | Coproducció / Elegibilitat | Públic / Distribució / Impacte | Declaracions / Signatures', 'Application form; co-production structure; partner details; rights documents; budget; finance plan with status of other sources; schedule; distribution strategy; signed or draft co-pro agreement; declarations', 'Use for supranational/international funds. Show partner shares, territorial rights, financing status, and treaty/eligibility compliance.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland', 'Federal Office of Culture (Film)', 'National public agency', 'Swiss film support', 'Development/Production/Distribution', 'Grant', 'Switzerland', 'https://www.bak.admin.ch/bak/en/home/cultural-promotion/film.html', 'Federal support', 'Public Agency Pack', 'English', 'Federal Office of Culture (Film) — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland', 'Zurich Film Foundation', 'Regional public agency', 'Feature, documentary, animation', 'Development/Production', 'Grant', 'Switzerland', 'https://www.filmstiftung.ch', 'Major regional fund', 'Documentary Fund Pack', 'English', 'Zurich Film Foundation — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Switzerland / International', 'Visions Sud Est', 'International public fund', 'Feature fiction and documentary from Africa/Asia/LatAm/Eastern Europe', 'Production/Post', 'Grant', 'Switzerland / International', 'https://www.visionssudest.ch', 'Swiss-backed international fund', 'Documentary Fund Pack', 'English', 'Visions Sud Est — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Taiwan', 'TAICCA', 'Public agency', 'Content industry support incl. film/TV', 'Development/Production/Co-production', 'Grant / investment', 'Taiwan', 'https://en.taicca.tw', 'Taiwan content agency', 'Standard Film Fund Pack', 'Traditional Chinese', 'TAICCA — 申請套件', '申請人 / 公司 | 專案名稱 | 形式 / 類型 / 片長 | 一句話簡介 | 劇情簡介 / 處理大綱 | 導演陳述 | 製片陳述 / 融資策略 | 創意資料包與核心團隊 | 預算與融資計畫 | 權利 / 權利鏈 | 時程與交付項目 | 觀眾 / 發行 / 影響力 | 聲明 / 簽名', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Tunisia', 'CNCI Tunisia', 'National public agency', 'Cinema and image support', 'Development/Production', 'Grant', 'Tunisia', 'https://www.culture.gov.tn', 'Tunisian public support', 'Public Agency Pack', 'Arabic', 'CNCI Tunisia — حزمة التقديم', 'المتقدم / الشركة | عنوان المشروع | النوع / التصنيف / المدة | الجملة التعريفية | الملخص / المعالجة | بيان المخرج | بيان المنتج / استراتيجية التمويل | الحزمة الإبداعية والفريق الرئيسي | الميزانية وخطة التمويل | الحقوق / سلسلة الملكية | الجدول الزمني والتسليمات | الجمهور / التوزيع / الأثر | الإقرارات / التوقيعات', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Ukraine', 'Ukrainian State Film Agency', 'National public agency', 'Film support', 'Development/Production/Distribution', 'Grant', 'Ukraine', 'https://usfa.gov.ua', 'National Ukrainian film body', 'Public Agency Pack', 'Ukrainian', 'Ukrainian State Film Agency — Пакет заявки', 'Заявник / Компанія | Назва проєкту | Формат / Жанр / Тривалість | Логлайн | Синопсис / Трітмент | Заява режисера | Заява продюсера / Фінансова стратегія | Творчий пакет і ключова команда | Бюджет і фінансовий план | Права / ланцюг прав | Графік і матеріали | Аудиторія / Дистрибуція / Вплив | Заяви / Підписи', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'BBC Film', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning', 'United Kingdom', 'https://www.bbc.co.uk/bbcfilm', 'Public broadcaster film arm', 'Standard Film Fund Pack', 'English', 'BBC Film — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'BFI', 'National public agency', 'Feature film, shorts, development, distribution, skills', 'Development/Production/Distribution', 'Grant / lottery funding', 'United Kingdom', 'https://www.bfi.org.uk/get-funding-support', 'Main UK public funder', 'Public Agency Pack', 'English', 'BFI — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United Kingdom', 'Film4', 'Broadcaster-backed fund', 'Feature film development and production', 'Development/Production', 'Equity / commissioning / investment', 'United Kingdom', 'https://www.channel4.com/4studio/film4', 'Important UK backer', 'Standard Film Fund Pack', 'English', 'Film4 — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Catapult Film Fund', 'Private/nonprofit fund', 'Documentary', 'Research/Development', 'Grant', 'United States', 'https://catapultfilmfund.org', 'Early-stage doc fund', 'Documentary Fund Pack', 'English', 'Catapult Film Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Ford Foundation JustFilms', 'Private/nonprofit fund', 'Social-issue film and doc', 'Development/Production', 'Grant', 'United States', 'https://www.fordfoundation.org/work/our-grants/justfilms', 'Foundation-backed screen funding', 'Private / Nonprofit Fund Pack', 'English', 'Ford Foundation JustFilms — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; impact or outreach plan where relevant; declarations', 'Use for nonprofit, private, lab, or festival-linked funds. Prioritize artistic voice, urgency, mission fit, and sample quality.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'IDA Enterprise Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production', 'Grant', 'United States', 'https://www.documentary.org/enterprise', 'IDA doc support', 'Documentary Fund Pack', 'English', 'IDA Enterprise Documentary Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'ITVS', 'Public/nonprofit fund', 'Documentary', 'Development/Production', 'Grant / commissioning', 'United States', 'https://itvs.org/funding', 'Public media doc support', 'Documentary Fund Pack', 'English', 'ITVS — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'NEA Media Arts', 'Public arts fund', 'Media arts including film/video', 'Development/Production', 'Grant', 'United States', 'https://www.arts.gov/grants', 'Broad arts funding', 'Standard Film Fund Pack', 'English', 'NEA Media Arts — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Rights / Chain of Title | Schedule & Deliverables | Audience / Distribution / Impact | Declarations / Signatures', 'Application form; project synopsis; director and producer statements; budget; finance plan; schedule; rights documents; team bios; declarations', 'Default feature/short fiction package.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'SFFILM', 'Private/nonprofit fund', 'Independent film', 'Development/Post', 'Grant', 'United States', 'https://sffilm.org/artist-development', 'Artist development and grants', 'Private / Nonprofit Fund Pack', 'English', 'SFFILM — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; project narrative; vision statements; budget; finance plan; work sample; team bios; impact or outreach plan where relevant; declarations', 'Use for nonprofit, private, lab, or festival-linked funds. Prioritize artistic voice, urgency, mission fit, and sample quality.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('United States', 'Sundance Institute Documentary Fund', 'Private/nonprofit fund', 'Documentary', 'Development/Production/Post', 'Grant', 'United States', 'https://www.sundance.org/programs/documentary-fund', 'Major doc fund', 'Documentary Fund Pack', 'English', 'Sundance Institute Documentary Fund — Application Pack', 'Applicant / Company | Project Title | Format / Genre / Runtime | Logline | Synopsis / Treatment | Director Statement | Producer Statement / Finance Strategy | Creative Package & Key Team | Budget & Finance Plan | Schedule & Deliverables | Audience / Distribution / Impact | Work Sample | Declarations / Signatures', 'Application form; documentary proposal; director vision; access status; ethics/safeguarding note if sensitive; teaser or sample reel; budget; finance plan; schedule; team bios; declarations', 'Use for documentary-focused funds. Emphasize access, editorial approach, ethics, sample material, and fundraising strategy.', NOW(), NOW())`));
    await db.execute(sql.raw(`INSERT IGNORE INTO funding_sources (country, organization, type, supports, stage, fundingForm, eligibility, officialSite, notes, packType, primaryLanguage, packTitle, localizedSections, recommendedAttachments, tailoringNotes, createdAt, updatedAt) VALUES ('Uruguay', 'ICAU', 'National public agency', 'Audiovisual support', 'Development/Production/Distribution', 'Grant', 'Uruguay', 'https://icau.mec.gub.uy', 'Uruguayan film body', 'Public Agency Pack', 'Spanish', 'ICAU — Paquete de solicitud', 'Solicitante / Empresa | Título del proyecto | Formato / Género / Duración | Logline | Sinopsis / Tratamiento | Declaración del director | Declaración del productor / Estrategia financiera | Paquete creativo y equipo clave | Presupuesto y plan financiero | Derechos / Cadena de titularidad | Calendario y entregables | Audiencia / Distribución / Impacto | Declaraciones / Firmas', 'Application form; company registration; script or treatment; director statement; producer statement; budget; finance plan; chain of title; schedule; key team CVs; market/distribution note; legal declarations', 'Use for national/state agencies. Stress cultural relevance, economic impact, eligibility, and recoupment assumptions.', NOW(), NOW())`));
    console.log(`[AutoMigrate] Film funding sources seeded (94 sources with pack metadata, INSERT IGNORE)`);
  } catch (err: any) {
    console.error(`[AutoMigrate] Failed to seed funding sources:`, err.message);
  }
}
