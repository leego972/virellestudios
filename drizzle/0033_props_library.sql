-- 0033 — Project Props Library (v6.33)
  -- Lock specific props (phone models, weapons, vehicles, hero objects) so
  -- the AI renders them identically in every scene that uses them.

  CREATE TABLE IF NOT EXISTS projectProps (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    projectId       INT          NOT NULL,
    userId          INT          NOT NULL,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(64)  NULL,
    description     TEXT         NULL,
    referenceImageUrl TEXT        NULL,
    thumbnailUrl    TEXT         NULL,
    colors          JSON         NULL,
    era             VARCHAR(128) NULL,
    styleTags       JSON         NULL,
    locked          BOOLEAN      NOT NULL DEFAULT TRUE,
    createdAt       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proj_props_project (projectId),
    INDEX idx_proj_props_user    (userId)
  );

  CREATE TABLE IF NOT EXISTS propAssignments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    userId          INT          NOT NULL,
    projectId       INT          NOT NULL,
    propId          INT          NOT NULL,
    characterId     INT          NULL,
    fromSceneOrder  INT          NULL,
    toSceneOrder    INT          NULL,
    usageNotes      TEXT         NULL,
    createdAt       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prop_assign_project   (projectId),
    INDEX idx_prop_assign_character (characterId),
    INDEX idx_prop_assign_prop      (propId)
  );
  