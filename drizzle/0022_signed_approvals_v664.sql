-- v6.64 — Signed approval chain + asset version stack
-- Append-only ledger of approval state changes, each row signed by hashing
-- (contentHash || prevSignature || actor || timestamp). Tamper-evident.

CREATE TABLE IF NOT EXISTS `approval_chain` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `kind` enum('scene','movie') NOT NULL,
  `entityId` int NOT NULL,
  `fromStatus` varchar(32) DEFAULT NULL,
  `toStatus` varchar(32) NOT NULL,
  `actor` int NOT NULL,
  `actorName` varchar(255) DEFAULT NULL,
  `note` text,
  `contentHash` varchar(128) NOT NULL,
  `prevSignature` varchar(128) DEFAULT NULL,
  `signature` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approval_chain_project_idx` (`projectId`),
  KEY `approval_chain_entity_idx` (`kind`, `entityId`),
  KEY `approval_chain_signature_idx` (`signature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-asset version history. ownerKind tells us what owns this asset
-- (a scene's video, a character's portrait, a project's poster, etc.)
CREATE TABLE IF NOT EXISTS `asset_versions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `projectId` int NOT NULL,
  `ownerKind` varchar(32) NOT NULL,
  `ownerId` int NOT NULL,
  `fieldName` varchar(64) NOT NULL,
  `label` varchar(255) DEFAULT NULL,
  `url` text NOT NULL,
  `mimeType` varchar(128) DEFAULT NULL,
  `sizeBytes` bigint DEFAULT NULL,
  `notes` text,
  `createdBy` int NOT NULL,
  `createdByName` varchar(255) DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `asset_versions_project_idx` (`projectId`),
  KEY `asset_versions_owner_idx` (`ownerKind`, `ownerId`, `fieldName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
