-- Migration 0016: Content Moderation System
-- Adds account freezing fields to users and creates moderationIncidents table

-- Add freezing columns to users table
ALTER TABLE `users`
  ADD COLUMN `isFrozen` boolean NOT NULL DEFAULT false,
  ADD COLUMN `frozenReason` text,
  ADD COLUMN `frozenAt` timestamp;

-- Create moderation incidents table
CREATE TABLE `moderationIncidents` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `contentType` varchar(128) NOT NULL,
  `contentSnippet` text NOT NULL,
  `violations` json NOT NULL,
  `severity` enum('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'LOW',
  `shouldFreeze` boolean NOT NULL DEFAULT false,
  `shouldReport` boolean NOT NULL DEFAULT false,
  `status` enum('pending_review','reviewed_cleared','reviewed_actioned','reported_to_authorities') NOT NULL DEFAULT 'pending_review',
  `reviewedBy` int,
  `reviewNotes` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
