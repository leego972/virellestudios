-- 0032 — Project Background Library (v6.32)
  -- Lock recurring locations (e.g. "Jerry's Apartment") so the AI generates
  -- them identically in every scene that references that background.

  CREATE TABLE IF NOT EXISTS projectBackgrounds (
    id               INT          AUTO_INCREMENT PRIMARY KEY,
    projectId        INT          NOT NULL,
    userId           INT          NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      TEXT         NULL,
    referenceImageUrl TEXT        NULL,
    thumbnailUrl     TEXT         NULL,
    styleNotes       TEXT         NULL,
    locationTags     JSON         NULL,
    locked           BOOLEAN      NOT NULL DEFAULT TRUE,
    createdAt        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proj_bg_project (projectId),
    INDEX idx_proj_bg_user    (userId)
  );

  ALTER TABLE scenes
    ADD COLUMN lockedBackgroundId INT NULL AFTER productionNotes;
  