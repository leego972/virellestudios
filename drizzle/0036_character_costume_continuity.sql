-- 0036 — Mandatory per-character costume continuity and face-covering identity rules
ALTER TABLE wardrobeItems
  ADD COLUMN faceCoverage VARCHAR(16) NOT NULL DEFAULT 'none' AFTER referencePrompt;

ALTER TABLE wardrobeAssignments
  ADD COLUMN identityMode VARCHAR(32) NOT NULL DEFAULT 'auto' AFTER toSceneOrder;
