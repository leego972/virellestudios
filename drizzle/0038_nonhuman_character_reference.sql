-- 0038 — Non-human / Creature / Costume Characters (v6.38)
  -- Gremlins, monsters, robots, aliens, etc. are self-contained costume characters.
  -- NO human actor needs to be assigned — the costume IS the character.
  -- When referenceImageLocked = TRUE, every scene generation uses the
  -- referenceImageUrl as a hard anchor. The AI CANNOT vary the creature's look.

  ALTER TABLE characters
    ADD COLUMN isNonHuman               BOOLEAN      NOT NULL DEFAULT FALSE AFTER aiActorId,
    ADD COLUMN costumeType              VARCHAR(64)  NULL                   AFTER isNonHuman,
    ADD COLUMN referenceImageUrl        TEXT         NULL                   AFTER costumeType,
    ADD COLUMN referenceImageLocked     BOOLEAN      NOT NULL DEFAULT FALSE AFTER referenceImageUrl,
    ADD COLUMN referenceGenerationPrompt TEXT        NULL                   AFTER referenceImageLocked;

  -- costumeType values: creature | monster | robot | alien | puppet | fantasy | vehicle | other
  -- Example: Gremlin (costumeType=creature), T-800 (costumeType=robot), Daenerys's dragon (costumeType=fantasy)
  