-- v6.69 Phase 5 — persist BYOK fallback policy per user.
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `byokFallbackMode` VARCHAR(32) DEFAULT 'byok-with-fallback';
