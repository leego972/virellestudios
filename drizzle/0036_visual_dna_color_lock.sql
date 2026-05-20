-- 0036 — Project Visual DNA Lock + Color Grade Lock (v6.36)
  -- Locks cinematography style and color grade at project level.

  CREATE TABLE IF NOT EXISTS projectVisualDNA (
    id                     INT          AUTO_INCREMENT PRIMARY KEY,
    projectId              INT          NOT NULL UNIQUE,
    userId                 INT          NOT NULL,
    genreProfile           VARCHAR(128) NULL,
    cinematographer        VARCHAR(255) NULL,
    referenceFilms         JSON         NULL,
    lensProfile            VARCHAR(128) NULL,
    lightingStyle          VARCHAR(128) NULL,
    colorPalette           VARCHAR(255) NULL,
    colorTemperature       VARCHAR(64)  NULL,
    filmStock              VARCHAR(128) NULL,
    aspectRatio            VARCHAR(16)  NULL,
    visualNotes            TEXT         NULL,
    locked                 BOOLEAN      NOT NULL DEFAULT FALSE,
    globalColorGrade       VARCHAR(128) NULL,
    globalColorGradeLocked BOOLEAN      NOT NULL DEFAULT FALSE,
    createdAt              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_vis_dna_project (projectId)
  );
  