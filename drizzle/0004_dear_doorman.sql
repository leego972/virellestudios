CREATE TABLE `credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`characterName` varchar(255),
	`orderIndex` int NOT NULL DEFAULT 0,
	`section` enum('opening','closing') NOT NULL DEFAULT 'closing',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `colorGrading` varchar(128) DEFAULT 'natural';--> statement-breakpoint
ALTER TABLE `projects` ADD `colorGradingSettings` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `transitionType` varchar(64) DEFAULT 'cut';--> statement-breakpoint
ALTER TABLE `scenes` ADD `transitionDuration` float DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE `scenes` ADD `colorGrading` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `productionNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `soundtrackId` int;--> statement-breakpoint
ALTER TABLE `scenes` ADD `soundtrackVolume` int DEFAULT 80;