CREATE TABLE IF NOT EXISTS `movies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`movieType` enum('scene','trailer','film') NOT NULL DEFAULT 'scene',
	`fileUrl` text,
	`fileKey` varchar(512),
	`thumbnailUrl` text,
	`thumbnailKey` varchar(512),
	`duration` int,
	`fileSize` int,
	`mimeType` varchar(128) DEFAULT 'video/mp4',
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `movies_id` PRIMARY KEY(`id`)
);
