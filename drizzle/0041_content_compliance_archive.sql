ALTER TABLE `mature_access_profiles`
  ADD COLUMN `adultAttestationAcceptedAt` datetime DEFAULT NULL AFTER `dateOfBirth`,
  ADD COLUMN `archiveRetentionAcceptedAt` datetime DEFAULT NULL AFTER `consentPolicyAcceptedAt`,
  ADD COLUMN `termsVersion` varchar(64) NOT NULL DEFAULT 'adult-workspace-2026-07' AFTER `archiveRetentionAcceptedAt`;

ALTER TABLE `virelle_video_transform_jobs`
  ADD COLUMN `publicFigureLikeness` tinyint(1) NOT NULL DEFAULT 0 AFTER `allSubjectsAdultsConfirmed`,
  ADD COLUMN `aiGeneratedCharactersOnly` tinyint(1) NOT NULL DEFAULT 0 AFTER `publicFigureLikeness`,
  ADD COLUMN `recordingRequired` tinyint(1) NOT NULL DEFAULT 1 AFTER `broadcastChannelsEncrypted`,
  ADD COLUMN `broadcastStartedAt` datetime DEFAULT NULL AFTER `recordingRequired`,
  ADD COLUMN `broadcastCompletedAt` datetime DEFAULT NULL AFTER `broadcastStartedAt`,
  ADD COLUMN `consentAttestationVersion` varchar(64) NOT NULL DEFAULT 'likeness-consent-2026-07' AFTER `consentConfirmed`,
  ADD KEY `idx_vvtj_workspace` (`contentMode`),
  ADD KEY `idx_vvtj_broadcast_started` (`broadcastStartedAt`);

CREATE TABLE IF NOT EXISTS `compliance_media_archive` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `accountName` varchar(255) NOT NULL,
  `sourceType` varchar(80) NOT NULL,
  `sourceTable` varchar(80) NOT NULL,
  `sourceId` varchar(120) NOT NULL,
  `sourceFingerprint` char(64) NOT NULL,
  `workspace` varchar(16) NOT NULL DEFAULT 'standard',
  `mediaKind` varchar(24) NOT NULL DEFAULT 'video',
  `sourceUrl` text NOT NULL,
  `userDownloadUrl` text NOT NULL,
  `archiveObjectKey` varchar(1024) DEFAULT NULL,
  `archiveStatus` varchar(32) NOT NULL DEFAULT 'pending',
  `archiveError` text DEFAULT NULL,
  `mimeType` varchar(128) DEFAULT NULL,
  `startedAt` datetime NOT NULL,
  `completedAt` datetime DEFAULT NULL,
  `retainedUntil` datetime NOT NULL,
  `legalHold` tinyint(1) NOT NULL DEFAULT 0,
  `legalHoldReason` text DEFAULT NULL,
  `archivedAt` datetime DEFAULT NULL,
  `expiredDeletedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_compliance_source_fingerprint` (`sourceFingerprint`),
  KEY `idx_compliance_archive_user` (`userId`),
  KEY `idx_compliance_archive_status` (`archiveStatus`),
  KEY `idx_compliance_archive_retention` (`retainedUntil`, `legalHold`),
  KEY `idx_compliance_archive_workspace` (`workspace`),
  KEY `idx_compliance_archive_started` (`startedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `moderation_incidents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `archiveId` bigint DEFAULT NULL,
  `sourceType` varchar(80) NOT NULL,
  `sourceId` varchar(120) DEFAULT NULL,
  `workspace` varchar(16) NOT NULL DEFAULT 'standard',
  `category` varchar(80) NOT NULL,
  `severity` varchar(24) NOT NULL DEFAULT 'high',
  `status` varchar(32) NOT NULL DEFAULT 'blocked_pending_review',
  `requestSummary` text DEFAULT NULL,
  `evidenceUrl` text DEFAULT NULL,
  `evidenceArchiveKey` varchar(1024) DEFAULT NULL,
  `classifierSignals` json DEFAULT NULL,
  `legalHold` tinyint(1) NOT NULL DEFAULT 1,
  `reviewedBy` int DEFAULT NULL,
  `reviewedAt` datetime DEFAULT NULL,
  `reviewNotes` text DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_moderation_user` (`userId`),
  KEY `idx_moderation_status` (`status`),
  KEY `idx_moderation_category` (`category`),
  KEY `idx_moderation_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `blacklisted_users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `incidentId` bigint NOT NULL,
  `reasonCode` varchar(80) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'active',
  `evidenceSummary` json DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `blacklistedBy` int NOT NULL,
  `blacklistedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blacklisted_user` (`userId`),
  KEY `idx_blacklisted_status` (`status`),
  KEY `idx_blacklisted_incident` (`incidentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `compliance_access_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `adminUserId` int NOT NULL,
  `action` varchar(64) NOT NULL,
  `archiveId` bigint DEFAULT NULL,
  `incidentId` bigint DEFAULT NULL,
  `targetUserId` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ipAddress` varchar(80) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_compliance_access_admin` (`adminUserId`),
  KEY `idx_compliance_access_archive` (`archiveId`),
  KEY `idx_compliance_access_incident` (`incidentId`),
  KEY `idx_compliance_access_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
