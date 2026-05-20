-- 0035 — Character State Tracker (v6.35)
  -- Tracks physical/appearance changes across scene ranges
  -- (injuries, beard growth, costume damage, emotional arcs).

  CREATE TABLE IF NOT EXISTS characterStates (
    id             INT          AUTO_INCREMENT PRIMARY KEY,
    userId         INT          NOT NULL,
    projectId      INT          NOT NULL,
    characterId    INT          NOT NULL,
    fromSceneOrder INT          NOT NULL,
    toSceneOrder   INT          NULL,
    label          VARCHAR(255) NOT NULL,
    stateType      VARCHAR(64)  NOT NULL DEFAULT 'appearance',
    description    TEXT         NOT NULL,
    promptOverride TEXT         NULL,
    createdAt      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_char_states_project   (projectId),
    INDEX idx_char_states_character (characterId)
  );
  