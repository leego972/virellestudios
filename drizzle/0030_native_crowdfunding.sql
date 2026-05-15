-- ════════════════════════════════════════════════════════════════════
  -- v6.80 — Native Crowdfunding Feature
  -- ════════════════════════════════════════════════════════════════════
  --
  -- Adds native crowdfunding support to Virelle:
  --   • All-or-nothing campaigns (card auth held, captured on goal met)
  --   • Keep-it-all campaigns (immediate capture, creator keeps funds)
  --   • Stripe Connect Express for creator payouts
  --   • 7% platform fee via application_fee_amount
  --
  -- ─────────── How this migration runs in production ──────────────────
  --
  -- Tables are created at boot via server/_core/autoMigrate.ts.
  -- This SQL file is documentation only — NOT auto-applied.
  --
  -- ──────────────────────────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS crowdfundCampaigns (
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
  );

  CREATE TABLE IF NOT EXISTS crowdfundRewards (
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
  );

  CREATE TABLE IF NOT EXISTS crowdfundContributions (
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
  );

  CREATE TABLE IF NOT EXISTS crowdfundPayouts (
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
  );
  