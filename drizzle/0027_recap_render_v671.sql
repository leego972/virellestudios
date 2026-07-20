-- v6.71 — Auto Recap MP4 render output. Adds the final-MP4 URL/key columns
-- to the recaps table so the renderer can persist the uploaded asset
-- alongside the existing outputAssetId reference.
--
-- MySQL does not support ADD COLUMN IF NOT EXISTS. Idempotency is handled by
-- run-migrations.mjs, which retries combined ALTER actions individually and
-- safely treats existing columns as already applied.
ALTER TABLE `recaps`
  ADD COLUMN `fileUrl` TEXT,
  ADD COLUMN `fileKey` VARCHAR(512);
