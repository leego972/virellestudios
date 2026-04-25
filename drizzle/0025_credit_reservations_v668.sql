-- v6.68 Phase 6 — Credit reservations table.
-- Tracks credits set aside for an in-flight async job so duplicate clicks can't
-- double-charge and failed jobs release the held amount back to the user.
CREATE TABLE IF NOT EXISTS `creditReservations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `projectId` INT NULL,
  `referenceType` VARCHAR(64) NULL,
  `referenceId` INT NULL,
  `featureKey` VARCHAR(64) NOT NULL,
  `amount` INT NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'reserved',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `finalizedAt` TIMESTAMP NULL,
  `releasedAt` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_credit_reservations_user_status` (`userId`, `status`),
  INDEX `idx_credit_reservations_ref` (`referenceType`, `referenceId`),
  INDEX `idx_credit_reservations_feature` (`featureKey`)
);
