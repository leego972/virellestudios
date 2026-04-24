-- v6.62 — Render queue tray, project-level reference images, sticky export
-- aspect ratio, and frame-timestamp comments.

-- Project-level style anchors (fall back when scene.referenceImages is empty).
ALTER TABLE `projects` ADD COLUMN `referenceImages` JSON NULL;

-- Sticky NLE export aspect ratio preset selected per project.
ALTER TABLE `projects` ADD COLUMN `exportAspectRatio` VARCHAR(16) DEFAULT '16:9';

-- Frame-timestamp comments pinned to a specific second of a video.
CREATE TABLE IF NOT EXISTS `frameComments` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `projectId` INT NOT NULL,
  `sceneId` INT NULL,
  `movieId` INT NULL,
  `userId` INT NOT NULL,
  `timestampSeconds` FLOAT NOT NULL,
  `body` TEXT NOT NULL,
  `resolved` BOOLEAN NOT NULL DEFAULT FALSE,
  `parentId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_frame_comments_project` (`projectId`),
  INDEX `idx_frame_comments_scene` (`sceneId`),
  INDEX `idx_frame_comments_movie` (`movieId`)
);
