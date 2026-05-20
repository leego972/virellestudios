-- 0038 — Non-human / Creature / Costume Characters (v6.38)
  -- Mystique, Gremlin, T-800, dragons — self-contained costume characters.
  -- NO human actor assignment needed. The costume IS the character.
  -- Upload or AI-generate one reference image, lock it, and the AI MUST
  -- match that exact appearance in every single scene.

  ALTER TABLE characters
    ADD COLUMN isNonHuman               BOOLEAN     NOT NULL DEFAULT FALSE AFTER aiActorId,
    ADD COLUMN costumeType              VARCHAR(64) NULL AFTER isNonHuman,
    ADD COLUMN referenceImageUrl        TEXT        NULL AFTER costumeType,
    ADD COLUMN referenceImageLocked     BOOLEAN     NOT NULL DEFAULT FALSE AFTER referenceImageUrl,
    ADD COLUMN referenceGenerationPrompt TEXT       NULL AFTER referenceImageLocked;
  -- costumeType: creature|monster|robot|alien|puppet|fantasy|mutant|supernatural|other
  