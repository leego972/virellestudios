-- v6.66 — Auto Recap ("Previously On" generator for episodic projects)
-- Maps the spec's `episode` to Virelle's `movies` table (a movie of type
-- "film" inside a project where actStructure="episodic" is one episode).

CREATE TABLE IF NOT EXISTS `recaps` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `projectId` INT NOT NULL,
  `targetMovieId` INT NOT NULL,
  `sourceMovieIds` JSON NOT NULL,
  `lengthSeconds` INT NOT NULL DEFAULT 90,
  `style` VARCHAR(32) NOT NULL DEFAULT 'cinematic',
  `resolution` VARCHAR(16) NOT NULL DEFAULT '1080p',
  `includeVoiceover` BOOLEAN NOT NULL DEFAULT FALSE,
  `includeSubtitles` BOOLEAN NOT NULL DEFAULT TRUE,
  `includeOpeningCredits` BOOLEAN NOT NULL DEFAULT FALSE,
  `overlayCreditsOnRecap` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `outputAssetId` INT NULL,
  `creditCost` INT NOT NULL DEFAULT 0,
  `progress` INT NOT NULL DEFAULT 0,
  `errorMessage` TEXT NULL,
  `outline` JSON NULL,
  `voiceoverScript` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_recaps_project` (`projectId`),
  INDEX `idx_recaps_target` (`targetMovieId`),
  INDEX `idx_recaps_user` (`userId`),
  INDEX `idx_recaps_status` (`status`)
);

CREATE TABLE IF NOT EXISTS `recapSegments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `recapId` INT NOT NULL,
  `sourceMovieId` INT NOT NULL,
  `startTimeSeconds` FLOAT NOT NULL DEFAULT 0,
  `endTimeSeconds` FLOAT NOT NULL DEFAULT 0,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `caption` TEXT NULL,
  `reason` TEXT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_recap_segments_recap` (`recapId`)
);
