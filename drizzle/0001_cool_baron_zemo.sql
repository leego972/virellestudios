CREATE TABLE IF NOT EXISTS `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`name` varchar(128) NOT NULL,
	`description` text,
	`photoUrl` text,
	`attributes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `generationJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`type` enum('full-film','scene','preview') NOT NULL,
	`status` enum('queued','processing','paused','completed','failed') NOT NULL DEFAULT 'queued',
	`progress` int DEFAULT 0,
	`estimatedSeconds` int,
	`resultUrl` text,
	`errorMessage` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `generationJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`mode` enum('quick','manual') NOT NULL DEFAULT 'quick',
	`rating` enum('G','PG','PG-13','R') DEFAULT 'PG-13',
	`duration` int,
	`genre` varchar(128),
	`plotSummary` text,
	`status` enum('draft','generating','paused','completed','failed') NOT NULL DEFAULT 'draft',
	`thumbnailUrl` text,
	`outputUrl` text,
	`progress` int DEFAULT 0,
	`estimatedTime` int,
	`resolution` varchar(32) DEFAULT '1920x1080',
	`quality` enum('standard','high','ultra') DEFAULT 'high',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`title` varchar(255),
	`description` text,
	`timeOfDay` enum('dawn','morning','afternoon','evening','night','golden-hour') DEFAULT 'afternoon',
	`weather` enum('clear','cloudy','rainy','stormy','snowy','foggy','windy') DEFAULT 'clear',
	`lighting` enum('natural','dramatic','soft','neon','candlelight','studio','backlit','silhouette') DEFAULT 'natural',
	`cameraAngle` enum('wide','medium','close-up','extreme-close-up','birds-eye','low-angle','dutch-angle','over-shoulder','pov') DEFAULT 'medium',
	`locationType` varchar(128),
	`realEstateStyle` varchar(128),
	`vehicleType` varchar(128),
	`mood` varchar(128),
	`characterIds` json,
	`characterPositions` json,
	`dialogueText` text,
	`duration` int DEFAULT 30,
	`thumbnailUrl` text,
	`generatedUrl` text,
	`status` enum('draft','generating','completed','failed') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
