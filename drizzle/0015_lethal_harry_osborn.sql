CREATE TABLE `blog_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(512) NOT NULL,
	`subtitle` varchar(512),
	`content` text NOT NULL,
	`excerpt` text,
	`category` varchar(128) NOT NULL,
	`tags` json,
	`coverImageUrl` text,
	`coverImageAlt` varchar(512),
	`metaTitle` varchar(160),
	`metaDescription` varchar(320),
	`canonicalUrl` varchar(512),
	`articleStatus` enum('draft','scheduled','published','archived') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`scheduledFor` timestamp,
	`viewCount` int NOT NULL DEFAULT 0,
	`generatedByAI` boolean NOT NULL DEFAULT true,
	`generationPrompt` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blog_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_articles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `campaign_send_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`contactId` int NOT NULL,
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`error` text,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_send_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_creator_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pieceId` int NOT NULL,
	`campaignId` int,
	`platform` varchar(64) NOT NULL,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`engagements` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`saves` int NOT NULL DEFAULT 0,
	`videoViews` int NOT NULL DEFAULT 0,
	`ctr` float NOT NULL DEFAULT 0,
	`engagementRate` float NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_creator_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_creator_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`objective` varchar(255),
	`targetAudience` varchar(255),
	`platforms` json,
	`seoKeywords` json,
	`brandVoice` text,
	`aiStrategy` text,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`totalPieces` int NOT NULL DEFAULT 0,
	`publishedPieces` int NOT NULL DEFAULT 0,
	`tiktokLinked` boolean NOT NULL DEFAULT false,
	`seoLinked` boolean NOT NULL DEFAULT true,
	`advertisingLinked` boolean NOT NULL DEFAULT false,
	`startDate` timestamp,
	`endDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_creator_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_creator_pieces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int,
	`platform` varchar(64) NOT NULL,
	`contentType` varchar(64) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'draft',
	`title` varchar(512),
	`headline` varchar(512),
	`body` text NOT NULL,
	`callToAction` varchar(255),
	`hook` varchar(512),
	`videoScript` text,
	`visualDirections` json,
	`hashtags` json,
	`seoKeywords` json,
	`imagePrompt` text,
	`mediaUrl` text,
	`tiktokPublishId` varchar(255),
	`externalPostId` varchar(255),
	`seoScore` int NOT NULL DEFAULT 0,
	`qualityScore` int NOT NULL DEFAULT 0,
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`engagements` int NOT NULL DEFAULT 0,
	`shares` int NOT NULL DEFAULT 0,
	`saves` int NOT NULL DEFAULT 0,
	`videoViews` int NOT NULL DEFAULT 0,
	`aiPrompt` text,
	`aiModel` varchar(64),
	`generationMs` int,
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_creator_pieces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_creator_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pieceId` int NOT NULL,
	`campaignId` int,
	`platform` varchar(64) NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`publishedAt` timestamp,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`failReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_creator_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`description` text,
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`htmlBody` text NOT NULL,
	`adImageUrl` varchar(1024),
	`status` enum('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`openCount` int NOT NULL DEFAULT 0,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `film_adr_tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`userId` int NOT NULL,
	`characterName` varchar(255) NOT NULL,
	`dialogueLine` text NOT NULL,
	`trackType` enum('adr','wild_track','loop_group','walla') NOT NULL DEFAULT 'adr',
	`status` enum('pending','recorded','approved','rejected') NOT NULL DEFAULT 'pending',
	`fileUrl` text,
	`fileKey` varchar(512),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `film_adr_tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `film_foley_tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`foleyType` enum('footsteps','cloth','props','impacts','environmental','custom') NOT NULL DEFAULT 'custom',
	`description` text,
	`fileUrl` text,
	`fileKey` varchar(512),
	`volume` float NOT NULL DEFAULT 0.8,
	`startTime` float NOT NULL DEFAULT 0,
	`status` enum('pending','recorded','approved') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `film_foley_tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `film_mix_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`dialogueBus` float NOT NULL DEFAULT 0.85,
	`musicBus` float NOT NULL DEFAULT 0.7,
	`effectsBus` float NOT NULL DEFAULT 0.75,
	`masterVolume` float NOT NULL DEFAULT 1,
	`dialogueEqLow` float NOT NULL DEFAULT 0,
	`dialogueEqMid` float NOT NULL DEFAULT 0,
	`dialogueEqHigh` float NOT NULL DEFAULT 0,
	`musicEqLow` float NOT NULL DEFAULT 0,
	`musicEqMid` float NOT NULL DEFAULT 0,
	`musicEqHigh` float NOT NULL DEFAULT 0,
	`sfxEqLow` float NOT NULL DEFAULT 0,
	`sfxEqMid` float NOT NULL DEFAULT 0,
	`sfxEqHigh` float NOT NULL DEFAULT 0,
	`reverbRoom` enum('none','small','medium','large','hall','cathedral') NOT NULL DEFAULT 'none',
	`reverbAmount` float NOT NULL DEFAULT 0,
	`compressionRatio` float NOT NULL DEFAULT 1,
	`noiseReduction` boolean NOT NULL DEFAULT false,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `film_mix_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `filmPages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnailUrl` text,
	`trailerUrl` text,
	`filmUrl` text,
	`isPublic` boolean NOT NULL DEFAULT false,
	`showCreatorName` boolean NOT NULL DEFAULT true,
	`showVirelleBranding` boolean NOT NULL DEFAULT true,
	`allowShowcase` boolean NOT NULL DEFAULT true,
	`socialLinks` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filmPages_id` PRIMARY KEY(`id`),
	CONSTRAINT `filmPages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `film_score_cues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`userId` int NOT NULL,
	`cueNumber` varchar(32) NOT NULL,
	`title` varchar(255) NOT NULL,
	`cueType` enum('underscore','source_music','sting','theme','transition','silence') NOT NULL DEFAULT 'underscore',
	`description` text,
	`fileUrl` text,
	`fileKey` varchar(512),
	`volume` float NOT NULL DEFAULT 0.7,
	`fadeIn` float NOT NULL DEFAULT 0,
	`fadeOut` float NOT NULL DEFAULT 0,
	`startTime` float NOT NULL DEFAULT 0,
	`duration` float,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `film_score_cues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `funding_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`country` varchar(128) NOT NULL,
	`organization` varchar(255) NOT NULL,
	`type` varchar(128),
	`supports` text,
	`stage` varchar(255),
	`fundingForm` varchar(255),
	`eligibility` text,
	`officialSite` varchar(512),
	`notes` text,
	`packType` varchar(128),
	`primaryLanguage` varchar(128),
	`packTitle` varchar(512),
	`localizedSections` text,
	`recommendedAttachments` text,
	`tailoringNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `funding_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mailing_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`company` varchar(255),
	`role` varchar(255),
	`notes` text,
	`tags` json DEFAULT ('[]'),
	`status` enum('active','unsubscribed','bounced','invalid') NOT NULL DEFAULT 'active',
	`source` varchar(64) NOT NULL DEFAULT 'manual',
	`unsubscribeToken` varchar(128),
	`lastEmailedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mailing_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `mailing_contacts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `marketing_activity_log` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`action` varchar(128) NOT NULL,
	`description` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_budgets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`month` varchar(7) NOT NULL,
	`channel` varchar(64) NOT NULL,
	`allocated_amount` decimal(10,2) NOT NULL,
	`spent_amount` decimal(10,2) NOT NULL DEFAULT '0',
	`roi` decimal(10,2) DEFAULT '0',
	`reasoning` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_campaigns` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`objective` varchar(128) NOT NULL,
	`status` varchar(64) NOT NULL DEFAULT 'draft',
	`budget` decimal(10,2) NOT NULL,
	`spend` decimal(10,2) NOT NULL DEFAULT '0',
	`start_date` timestamp,
	`end_date` timestamp,
	`target_audiences` json,
	`metrics` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_content` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`campaign_id` int,
	`platform` varchar(64) NOT NULL,
	`type` varchar(64) NOT NULL,
	`headline` varchar(512),
	`body` text NOT NULL,
	`image_url` varchar(1024),
	`video_url` varchar(1024),
	`status` varchar(64) NOT NULL DEFAULT 'pending',
	`scheduled_for` timestamp,
	`published_at` timestamp,
	`platform_post_id` varchar(255),
	`metrics` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_performance` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`channel` varchar(64) NOT NULL,
	`spend` decimal(10,2) NOT NULL DEFAULT '0',
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`conversions` int NOT NULL DEFAULT 0,
	`cpc` decimal(10,2) DEFAULT '0',
	`cpa` decimal(10,2) DEFAULT '0',
	`roi` decimal(10,2) DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_settings` (
	`key` varchar(128) NOT NULL,
	`value` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketing_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `moderationIncidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`contentSnippet` text NOT NULL,
	`violations` json NOT NULL,
	`severity` enum('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'LOW',
	`shouldFreeze` boolean NOT NULL DEFAULT false,
	`shouldReport` boolean NOT NULL DEFAULT false,
	`moderationStatus` enum('pending_review','reviewed_cleared','reviewed_actioned','reported_to_authorities') NOT NULL DEFAULT 'pending_review',
	`reviewedBy` int,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moderationIncidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`notificationType` enum('generation_complete','export_complete','subscription_change','referral_reward','system','welcome','tip') NOT NULL DEFAULT 'system',
	`title` varchar(255) NOT NULL,
	`message` text,
	`link` varchar(512),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectSamples` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectSamples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promoAssets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`content` text NOT NULL,
	`variant` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promoAssets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`totalReferrals` int NOT NULL DEFAULT 0,
	`successfulReferrals` int NOT NULL DEFAULT 0,
	`bonusGenerationsEarned` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `referral_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referralCodeId` int NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int,
	`referredEmail` varchar(320),
	`referralStatus` enum('clicked','registered','rewarded') NOT NULL DEFAULT 'clicked',
	`rewardType` varchar(64),
	`rewardAmount` int,
	`rewardedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_social_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` varchar(64) NOT NULL,
	`displayName` varchar(255),
	`credentials` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTestedAt` timestamp,
	`lastPublishedAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_social_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visualEffects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`subcategory` varchar(128),
	`description` text,
	`previewUrl` text,
	`previewKey` varchar(512),
	`intensity` float DEFAULT 0.8,
	`duration` float,
	`startTime` float DEFAULT 0,
	`layer` enum('background','midground','foreground','overlay') DEFAULT 'overlay',
	`blendMode` varchar(64) DEFAULT 'normal',
	`colorTint` varchar(32),
	`parameters` json,
	`isCustom` int DEFAULT 0,
	`tags` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visualEffects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `role` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `storyImportance` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `screenTime` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `nationality` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `countryOfOrigin` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `cityOfOrigin` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `dateOfBirth` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `zodiacSign` varchar(32);--> statement-breakpoint
ALTER TABLE `characters` ADD `occupation` varchar(255);--> statement-breakpoint
ALTER TABLE `characters` ADD `educationLevel` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `socialClass` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `religion` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `languages` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `personality` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `arcType` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `moralAlignment` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `emotionalRange` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `backstory` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `motivations` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `fears` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `secrets` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `strengths` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `weaknesses` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `speechPattern` varchar(255);--> statement-breakpoint
ALTER TABLE `characters` ADD `accent` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `catchphrase` varchar(512);--> statement-breakpoint
ALTER TABLE `characters` ADD `voiceType` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `voiceId` varchar(255);--> statement-breakpoint
ALTER TABLE `characters` ADD `relationships` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `environmentPreference` varchar(255);--> statement-breakpoint
ALTER TABLE `characters` ADD `preferredWeather` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `preferredSeason` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `preferredTimeOfDay` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `physicalAbilities` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `mentalAbilities` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `specialSkills` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `wardrobe` json;--> statement-breakpoint
ALTER TABLE `characters` ADD `performanceStyle` varchar(128);--> statement-breakpoint
ALTER TABLE `characters` ADD `castingNotes` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `signatureMannerisms` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `voiceDescription` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `isAiActor` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `characters` ADD `aiActorId` varchar(128);--> statement-breakpoint
ALTER TABLE `dialogues` ADD `pacing` varchar(32);--> statement-breakpoint
ALTER TABLE `projects` ADD `cinemaIndustry` varchar(128) DEFAULT 'Hollywood';--> statement-breakpoint
ALTER TABLE `scenes` ADD `lensType` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `focalLength` varchar(64);--> statement-breakpoint
ALTER TABLE `scenes` ADD `depthOfField` varchar(64);--> statement-breakpoint
ALTER TABLE `scenes` ADD `cameraMovement` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `shotType` varchar(64);--> statement-breakpoint
ALTER TABLE `scenes` ADD `frameRate` varchar(32);--> statement-breakpoint
ALTER TABLE `scenes` ADD `aspectRatio` varchar(16);--> statement-breakpoint
ALTER TABLE `scenes` ADD `colorPalette` varchar(255);--> statement-breakpoint
ALTER TABLE `scenes` ADD `colorTemperature` varchar(64);--> statement-breakpoint
ALTER TABLE `scenes` ADD `season` varchar(32);--> statement-breakpoint
ALTER TABLE `scenes` ADD `country` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `city` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `locationDetail` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `foregroundElements` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `backgroundElements` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `characterBlocking` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `emotionalBeat` varchar(255);--> statement-breakpoint
ALTER TABLE `scenes` ADD `actionDescription` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `ambientSound` varchar(255);--> statement-breakpoint
ALTER TABLE `scenes` ADD `sfxNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `musicMood` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `musicTempo` varchar(64);--> statement-breakpoint
ALTER TABLE `scenes` ADD `dialogueLines` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `subtitleText` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `vfxNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `sfxProductionNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `visualEffects` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `props` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `wardrobe` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `makeupNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `stuntNotes` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `budgetEstimate` int;--> statement-breakpoint
ALTER TABLE `scenes` ADD `shootingDays` float;--> statement-breakpoint
ALTER TABLE `scenes` ADD `aiPromptOverride` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `cameraBody` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `lensBrand` varchar(128);--> statement-breakpoint
ALTER TABLE `scenes` ADD `aperture` varchar(16);--> statement-breakpoint
ALTER TABLE `scenes` ADD `multiShotEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `scenes` ADD `multiShotCount` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `scenes` ADD `multiShotData` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `characterEmotions` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `characterActions` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `heroFrameUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `sceneExploreData` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `startFrameUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `endFrameUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `genreMotion` varchar(64) DEFAULT 'auto';--> statement-breakpoint
ALTER TABLE `scenes` ADD `speedRamp` varchar(64) DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `scenes` ADD `visualStyle` varchar(64) DEFAULT 'photorealistic';--> statement-breakpoint
ALTER TABLE `scenes` ADD `retakeInstructions` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `retakeRegion` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `retakeCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `scenes` ADD `lipSyncMode` varchar(64) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `scenes` ADD `lipSyncAudioUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `vfxSuiteOperations` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `vfxSuiteOutputUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `liveActionPlateUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `liveActionCompositeMode` varchar(64) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `scenes` ADD `compositeOutputUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `referenceImages` json;--> statement-breakpoint
ALTER TABLE `scenes` ADD `externalFootageUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `externalFootageType` varchar(32) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `scenes` ADD `externalFootageLabel` varchar(255);--> statement-breakpoint
ALTER TABLE `scenes` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `scenes` ADD `videoJobId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('amateur','independent','creator','studio','pro','industry') DEFAULT 'independent' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','unpaid','trialing','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionCurrentPeriodEnd` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyGenerationsUsed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyGenerationsResetAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `bonusGenerations` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `referralCode` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `referralStats` json;--> statement-breakpoint
ALTER TABLE `users` ADD `userOpenaiKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userRunwayKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userReplicateKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userFalKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userLumaKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userHfToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userElevenlabsKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userSunoKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userByteplusKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userAnthropicKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `userGoogleAiKey` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLlmProvider` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `directorInstructions` text;--> statement-breakpoint
ALTER TABLE `users` ADD `preferredVideoProvider` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `apiKeysUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `timezone` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `companyWebsite` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `professionalRole` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `experienceLevel` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `industryType` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `teamSize` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `preferredGenres` json;--> statement-breakpoint
ALTER TABLE `users` ADD `primaryUseCase` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `portfolioUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `socialLinks` json;--> statement-breakpoint
ALTER TABLE `users` ADD `howDidYouHear` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `marketingOptIn` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingCompleted` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `creditBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalCreditsEarned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `totalCreditsSpent` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `creditsResetAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isFrozen` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `frozenReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `frozenAt` timestamp;