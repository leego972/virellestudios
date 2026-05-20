-- 0034 — Narrative Act Structure (v6.34)
  -- Groups scenes into acts/episodes with story-beat tags and a story clock.

  CREATE TABLE IF NOT EXISTS projectActs (
    id                 INT          AUTO_INCREMENT PRIMARY KEY,
    projectId          INT          NOT NULL,
    userId             INT          NOT NULL,
    name               VARCHAR(255) NOT NULL,
    orderIndex         INT          NOT NULL DEFAULT 0,
    actType            VARCHAR(64)  NOT NULL DEFAULT 'act',
    description        TEXT         NULL,
    colorHex           VARCHAR(7)   NULL,
    isEpisodeBoundary  BOOLEAN      NOT NULL DEFAULT FALSE,
    episodeNumber      INT          NULL,
    episodeTitle       VARCHAR(255) NULL,
    createdAt          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proj_acts_project (projectId)
  );

  ALTER TABLE scenes
    ADD COLUMN actId          INT          NULL AFTER lockedBackgroundId,
    ADD COLUMN storyBeat      VARCHAR(64)  NULL AFTER actId,
    ADD COLUMN storyDay       INT          NULL AFTER storyBeat,
    ADD COLUMN storyTimeOfDay VARCHAR(32)  NULL AFTER storyDay;
  