-- 0031 — Wardrobe scene-range assignments
  -- Directors assign costume items to a character for a specific range of
  -- scenes (fromSceneOrder–toSceneOrder inclusive). NULL = all scenes.

  ALTER TABLE wardrobeAssignments
    ADD COLUMN fromSceneOrder INT NULL AFTER sceneId,
    ADD COLUMN toSceneOrder   INT NULL AFTER fromSceneOrder;
  