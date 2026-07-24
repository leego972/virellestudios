ALTER TABLE wardrobeItems
  ADD COLUMN masterReferenceKey VARCHAR(255) NULL AFTER referencePrompt,
  ADD COLUMN model3dUrl TEXT NULL AFTER masterReferenceKey,
  ADD COLUMN turntableFrameUrls JSON NULL AFTER model3dUrl,
  ADD COLUMN turntableFrameCount INT NOT NULL DEFAULT 0 AFTER turntableFrameUrls,
  ADD COLUMN turntableStatus VARCHAR(32) NOT NULL DEFAULT 'pending' AFTER turntableFrameCount,
  ADD COLUMN turntableUpdatedAt TIMESTAMP NULL AFTER turntableStatus,
  ADD COLUMN renderPipelineVersion INT NOT NULL DEFAULT 0 AFTER turntableUpdatedAt,
  ADD COLUMN selectedColourKey VARCHAR(160) NULL AFTER renderPipelineVersion,
  ADD COLUMN solidColourHex VARCHAR(16) NULL AFTER selectedColourKey;

CREATE INDEX idx_wardrobe_master_reference_key ON wardrobeItems (masterReferenceKey);
CREATE INDEX idx_wardrobe_turntable_status ON wardrobeItems (turntableStatus);
