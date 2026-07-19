CREATE TABLE IF NOT EXISTS `directorChats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`chatRole` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`actionType` varchar(128),
	`actionData` json,
	`actionStatus` enum('pending','executed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directorChats_id` PRIMARY KEY(`id`)
);
