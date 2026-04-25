-- v6.69 Phase 3 — Persistent BYOK fallback policy on the users row.
-- Allowed values:
--   credits_only             — never use the user's BYOK key, always charge Virelle credits
--   byok_only                — only use the user's BYOK key, never fall back
--   byok_with_consent        — prefer BYOK, ask the user before falling back to credits (default)
--   byok_with_auto_fallback  — prefer BYOK, silently fall back to credits when the key fails
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `byokFallbackMode` VARCHAR(32) DEFAULT 'byok_with_consent';
