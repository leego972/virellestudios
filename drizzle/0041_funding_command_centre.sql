-- Funding Command Centre: zero-new-service upgrade.
-- Runtime CREATE TABLE IF NOT EXISTS guards live in server/funding-router.ts so
-- existing Render deployments remain self-healing even before drizzle migrate.

CREATE TABLE IF NOT EXISTS funding_source_metadata (
  fundingSourceId INT NOT NULL PRIMARY KEY,
  sourceCategory VARCHAR(32) NOT NULL DEFAULT 'grant',
  listingStatus VARCHAR(32) NOT NULL DEFAULT 'opportunity',
  verificationStatus VARCHAR(32) NOT NULL DEFAULT 'needs_review',
  applicationOpen VARCHAR(16) NOT NULL DEFAULT 'unknown',
  deadlineAt DATETIME NULL,
  rollingDeadline BOOLEAN NOT NULL DEFAULT FALSE,
  fundingMinimum DECIMAL(18,2) NULL,
  fundingMaximum DECIMAL(18,2) NULL,
  currency VARCHAR(16) NULL,
  officialGuidelinesUrl VARCHAR(1024) NULL,
  lastVerifiedAt DATETIME NULL,
  confidence VARCHAR(16) NOT NULL DEFAULT 'unverified',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS funding_profiles (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  projectId INT NOT NULL,
  data LONGTEXT NOT NULL,
  completionScore INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_funding_profile_user_project (userId, projectId),
  KEY idx_funding_profile_project (projectId)
);

CREATE TABLE IF NOT EXISTS funding_drafts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  projectId INT NOT NULL,
  fundingSourceId INT NOT NULL,
  title VARCHAR(255) NULL,
  data LONGTEXT NOT NULL,
  completeness INT NOT NULL DEFAULT 0,
  readiness LONGTEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_funding_draft_user_project (userId, projectId),
  KEY idx_funding_draft_source (fundingSourceId)
);

CREATE TABLE IF NOT EXISTS funding_shortlists (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  projectId INT NOT NULL,
  fundingSourceId INT NOT NULL,
  notes TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_funding_shortlist (userId, projectId, fundingSourceId),
  KEY idx_funding_shortlist_project (projectId)
);

CREATE TABLE IF NOT EXISTS funding_applications (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  projectId INT NULL,
  fundingSourceId INT NOT NULL,
  draftId BIGINT NULL,
  organization VARCHAR(255) NOT NULL,
  country VARCHAR(128) NOT NULL,
  projectTitle VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted',
  formData LONGTEXT NOT NULL,
  emailStatus VARCHAR(32) NOT NULL DEFAULT 'not_requested',
  emailError TEXT NULL,
  notes TEXT NULL,
  deadlineAt DATETIME NULL,
  followUpAt DATETIME NULL,
  submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_funding_application_user (userId, updatedAt),
  KEY idx_funding_application_project (projectId),
  KEY idx_funding_application_source (fundingSourceId)
);

CREATE TABLE IF NOT EXISTS funding_application_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  applicationId BIGINT NOT NULL,
  userId INT NOT NULL,
  eventType VARCHAR(64) NOT NULL,
  fromStatus VARCHAR(32) NULL,
  toStatus VARCHAR(32) NULL,
  note TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_funding_event_application (applicationId, createdAt),
  KEY idx_funding_event_user (userId, createdAt)
);

CREATE TABLE IF NOT EXISTS funding_listing_reports (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fundingSourceId INT NOT NULL,
  userId INT NOT NULL,
  reason VARCHAR(64) NOT NULL,
  details TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_funding_report_source (fundingSourceId, status)
);

CREATE TABLE IF NOT EXISTS funding_reminder_log (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  reminderKey VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_funding_reminder (userId, reminderKey)
);
