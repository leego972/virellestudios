-- Migration 0017: Project Samples
-- Creates the projectSamples table for showcasing AI-generated film samples
CREATE TABLE `projectSamples` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `genre` varchar(64),
  `provider` varchar(64),
  `videoUrl` text NOT NULL,
  `thumbnailUrl` text,
  `durationSeconds` int,
  `displayOrder` int NOT NULL DEFAULT 0,
  `isPublished` boolean NOT NULL DEFAULT true,
  `uploadedBy` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
