CREATE TABLE IF NOT EXISTS `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`sceneId` int,
	`name` varchar(255) NOT NULL,
	`address` varchar(512),
	`locationType` varchar(128),
	`description` text,
	`referenceImages` json,
	`notes` text,
	`tags` json,
	`latitude` float,
	`longitude` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `moodBoardItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('image','color','text','reference') NOT NULL DEFAULT 'image',
	`imageUrl` text,
	`text` text,
	`color` varchar(32),
	`tags` json,
	`category` varchar(128),
	`posX` int DEFAULT 0,
	`posY` int DEFAULT 0,
	`width` int DEFAULT 200,
	`height` int DEFAULT 200,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moodBoardItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `subtitles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`language` varchar(32) NOT NULL,
	`languageName` varchar(128) NOT NULL,
	`entries` json,
	`isGenerated` int DEFAULT 0,
	`isTranslation` int DEFAULT 0,
	`sourceLanguage` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subtitles_id` PRIMARY KEY(`id`)
);
