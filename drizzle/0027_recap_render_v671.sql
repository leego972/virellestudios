-- v6.71 — Auto Recap MP4 render output. Adds the final-MP4 URL/key columns
-- to the recaps table so the renderer can persist the uploaded asset
-- alongside the existing outputAssetId reference.
ALTER TABLE `recaps`
  ADD COLUMN IF NOT EXISTS `fileUrl` TEXT,
  ADD COLUMN IF NOT EXISTS `fileKey` VARCHAR(512);
