-- v6.63 — Production Spine: shoot schedule, call sheets, crew directory,
-- approval workflow on scenes + movies, structured shot lists per scene,
-- activity timeline. Budget tracker reuses existing `budgets` table.
-- Side-by-side version compare reuses existing shotVersions router.

-- Per-project shoot day (a single day on the schedule with call/wrap times,
-- location reference, weather note, parking + hospital info).
CREATE TABLE IF NOT EXISTS `shootDays` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `userId` INT NOT NULL,
  `dayNumber` INT NOT NULL DEFAULT 1,
  `shootDate` DATE NULL,
  `callTime` VARCHAR(16) NULL,
  `wrapTime` VARCHAR(16) NULL,
  `locationId` INT NULL,
  `weatherNote` VARCHAR(255) NULL,
  `hospitalInfo` TEXT NULL,
  `parkingInfo` TEXT NULL,
  `generalNotes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_shoot_days_project` (`projectId`),
  INDEX `idx_shoot_days_date` (`shootDate`)
);

-- Crew & cast contact directory (cast can ALSO be pulled live from characters
-- table; this stores crew + any extra contacts the call sheet needs).
CREATE TABLE IF NOT EXISTS `crewContacts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `userId` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(128) NULL,
  `department` VARCHAR(128) NULL,
  `email` VARCHAR(320) NULL,
  `phone` VARCHAR(64) NULL,
  `callTimeOverride` VARCHAR(16) NULL,
  `notes` TEXT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_crew_contacts_project` (`projectId`)
);

-- Lightweight project activity timeline. Records who did what, when.
-- Append-only. Used by the Activity page and surfaced inline as audit trail.
CREATE TABLE IF NOT EXISTS `activityLog` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `userId` INT NOT NULL,
  `actor` VARCHAR(255) NULL,
  `eventType` VARCHAR(64) NOT NULL,
  `payload` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_activity_log_project` (`projectId`),
  INDEX `idx_activity_log_event` (`eventType`)
);

-- Scene-level production additions: shoot day assignment, ordering within
-- the day, structured shot list, approval status + audit fields.
ALTER TABLE `scenes` ADD COLUMN `shootDayId` INT NULL;
ALTER TABLE `scenes` ADD COLUMN `shootOrder` INT NOT NULL DEFAULT 0;
ALTER TABLE `scenes` ADD COLUMN `shotList` JSON NULL;
ALTER TABLE `scenes` ADD COLUMN `approvalStatus` VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE `scenes` ADD COLUMN `approvedBy` INT NULL;
ALTER TABLE `scenes` ADD COLUMN `approvedAt` TIMESTAMP NULL;
ALTER TABLE `scenes` ADD COLUMN `approvalNote` TEXT NULL;

-- Movie-level approval (full film / trailer / scene cut).
ALTER TABLE `movies` ADD COLUMN `approvalStatus` VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE `movies` ADD COLUMN `approvedBy` INT NULL;
ALTER TABLE `movies` ADD COLUMN `approvedAt` TIMESTAMP NULL;
ALTER TABLE `movies` ADD COLUMN `approvalNote` TEXT NULL;
