CREATE TABLE IF NOT EXISTS `abuseFlags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityId` int NOT NULL,
	`entityType` enum('filmPage','creatorProfile','collection') NOT NULL,
	`reporterId` int,
	`reason` varchar(255) NOT NULL,
	`status` enum('pending','reviewed','actioned','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `abuseFlags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `actGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cutId` int NOT NULL,
	`projectId` int NOT NULL,
	`actNumber` int NOT NULL,
	`label` varchar(128) NOT NULL,
	`description` text,
	`targetDuration` int,
	`colorCode` varchar(16) DEFAULT '#3b82f6',
	`orderIndex` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `adminCurationFlags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` enum('project','creatorProfile') NOT NULL,
	`entityId` int NOT NULL,
	`flagType` enum('featured','staff_pick','hidden','banned') NOT NULL,
	`adminId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminCurationFlags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `analyticsEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('filmPage','creatorProfile','collection') NOT NULL,
	`entityId` int NOT NULL,
	`eventType` enum('page_view','video_play','link_click','share_click') NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyticsEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `assetPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetId` varchar(64) NOT NULL,
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`amountAud` int NOT NULL,
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assetPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `characterArcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`characterId` int NOT NULL,
	`userId` int NOT NULL,
	`arcType` varchar(64) DEFAULT 'transformation',
	`arcSummary` text,
	`arcBeats` json,
	`startingState` text,
	`endingState` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterArcs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collectionItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`projectId` int NOT NULL,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collectionItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`coverImageUrl` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `collections_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `continuityRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int NOT NULL,
	`userId` int NOT NULL,
	`wardrobeNotes` text,
	`wardrobeImages` json,
	`propNotes` text,
	`propList` json,
	`timeOfDay` varchar(64),
	`dayNumber` int,
	`locationNotes` text,
	`characterStates` json,
	`dependsOnSceneId` int,
	`emotionalCarryover` text,
	`continuityFlags` json,
	`lastCheckedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `continuityRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `conversionEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`sourcePath` varchar(255) NOT NULL,
	`targetPath` varchar(255) NOT NULL,
	`eventType` enum('view_to_watch','watch_to_profile','profile_to_signup','showcase_to_film','film_to_create') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversionEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `creatorProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`profileType` enum('creator','studio') NOT NULL DEFAULT 'creator',
	`displayName` varchar(255) NOT NULL,
	`avatarUrl` text,
	`bio` text,
	`focusTags` json,
	`socialLinks` json,
	`contactEmail` varchar(320),
	`featuredProjectId` int,
	`isPublic` boolean NOT NULL DEFAULT false,
	`completenessScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creatorProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `creatorProfiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `creatorProfiles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `featureAudioPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`voiceAssignments` json,
	`ambientLayers` json,
	`musicCues` json,
	`dialogueBus` float DEFAULT 0.9,
	`musicBus` float DEFAULT 0.25,
	`effectsBus` float DEFAULT 0.6,
	`masterVolume` float DEFAULT 1,
	`audioPassNotes` text,
	`featureAudioMixStatus` enum('draft','in-progress','locked','final') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featureAudioPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `featureCutScenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cutId` int NOT NULL,
	`sceneId` int NOT NULL,
	`orderIndex` int NOT NULL,
	`actNumber` int NOT NULL DEFAULT 1,
	`actLabel` varchar(128),
	`sequenceLabel` varchar(128),
	`isIncluded` boolean NOT NULL DEFAULT true,
	`trimIn` int NOT NULL DEFAULT 0,
	`trimOut` int NOT NULL DEFAULT 0,
	`transitionType` varchar(64) NOT NULL DEFAULT 'cut',
	`transitionDuration` float NOT NULL DEFAULT 0,
	`directorNote` text,
	`colorGrade` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featureCutScenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `featureCuts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`version` varchar(64) NOT NULL DEFAULT 'v1.0',
	`description` text,
	`isLocked` boolean NOT NULL DEFAULT false,
	`lockedAt` timestamp,
	`lockedBy` int,
	`isDefault` boolean NOT NULL DEFAULT false,
	`totalDuration` int NOT NULL DEFAULT 0,
	`sceneCount` int NOT NULL DEFAULT 0,
	`targetRuntime` int,
	`featureCutActStructure` enum('three-act','five-act','heros-journey','nonlinear','episodic','two-act') NOT NULL DEFAULT 'three-act',
	`notes` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featureCuts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `filmCompileJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`cutId` int,
	`userId` int NOT NULL,
	`filmCompileStatus` enum('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` varchar(255),
	`resultUrl` text,
	`resultKey` varchar(512),
	`resultDuration` int,
	`resultFileSize` int,
	`errorMessage` text,
	`includeOpener` boolean NOT NULL DEFAULT true,
	`includeCredits` boolean NOT NULL DEFAULT true,
	`burnSubtitles` boolean NOT NULL DEFAULT false,
	`resolution` varchar(16) NOT NULL DEFAULT '1080p',
	`frameRate` int NOT NULL DEFAULT 24,
	`metadata` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filmCompileJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `shotPackages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sceneId` int NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`shotIndex` int NOT NULL,
	`prompt` text NOT NULL,
	`negativePrompt` text,
	`durationSeconds` int NOT NULL DEFAULT 10,
	`videoUrl` text,
	`videoKey` varchar(512),
	`keyframeUrl` text,
	`shotPackageStatus` enum('pending','generating','completed','failed','retrying') NOT NULL DEFAULT 'pending',
	`provider` varchar(64),
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`generationJobId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shotPackages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `signatureCastActors` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`tier` enum('standard','premium','flagship') NOT NULL DEFAULT 'standard',
	`includedInPlan` enum('none','indie','amateur','independent') NOT NULL DEFAULT 'none',
	`pricePersonalAud` int NOT NULL DEFAULT 0,
	`priceCreatorAud` int NOT NULL DEFAULT 0,
	`priceCommercialAud` int NOT NULL DEFAULT 0,
	`priceEpisodicAud` int NOT NULL DEFAULT 0,
	`hook` text,
	`tags` json,
	`chemistryWith` json,
	`portraitUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isRetired` boolean NOT NULL DEFAULT false,
	`allowCommercialUse` boolean NOT NULL DEFAULT true,
	`noExplicitContent` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signatureCastActors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `signatureCastEntitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`actorId` varchar(64) NOT NULL,
	`licenseType` enum('personal','creator','commercial','episodic','plan_inclusion') NOT NULL,
	`projectId` int,
	`isCommercial` boolean NOT NULL DEFAULT false,
	`isEpisodic` boolean NOT NULL DEFAULT false,
	`source` enum('subscription','stripe_checkout','admin_comp','promo') NOT NULL DEFAULT 'stripe_checkout',
	`stripeSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`amountPaidAud` int NOT NULL DEFAULT 0,
	`status` enum('active','expired','revoked','pending') NOT NULL DEFAULT 'active',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signatureCastEntitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `signatureCastEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`actorId` varchar(64) NOT NULL,
	`event` enum('profile_view','unlock_modal_open','checkout_started','checkout_completed','checkout_abandoned','cast_assigned','plan_upgrade_triggered','content_blocked') NOT NULL,
	`licenseType` varchar(32),
	`projectId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `signatureCastEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `submissionReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','declined','featured') NOT NULL DEFAULT 'pending',
	`adminNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissionReviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `subscriptionTier` enum('free','indie','amateur','independent','creator','studio','pro','industry') NOT NULL DEFAULT 'free';