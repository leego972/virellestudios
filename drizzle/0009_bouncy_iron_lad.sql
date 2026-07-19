CREATE TABLE IF NOT EXISTS `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int,
	`invitedBy` int NOT NULL,
	`email` varchar(320),
	`inviteToken` varchar(128) NOT NULL,
	`collabRole` enum('viewer','editor','producer','director') NOT NULL DEFAULT 'editor',
	`inviteStatus` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`),
	CONSTRAINT `collaborators_inviteToken_unique` UNIQUE(`inviteToken`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `soundEffects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`fileUrl` text,
	`fileKey` varchar(512),
	`duration` float,
	`isCustom` int DEFAULT 0,
	`volume` float DEFAULT 0.8,
	`startTime` float DEFAULT 0,
	`loop` int DEFAULT 0,
	`tags` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `soundEffects_id` PRIMARY KEY(`id`)
);
