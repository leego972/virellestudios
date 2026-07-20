-- ════════════════════════════════════════════════════════════════════
-- v6.78 — Global Film & Cinema Funding Sources expansion
-- ════════════════════════════════════════════════════════════════════
--
-- Canonical / documentation migration for the v6.78 funding sources
-- expansion described in:
--   docs/VIRELLE_V678_GLOBAL_FILM_FUNDING_SOURCES_BRIEF.md
--
-- ─────────── How this seed actually runs in production ─────────────
--
-- Virelle's runtime uses `server/_core/autoMigrate.ts` on boot.
-- The actual seed for v6.78 is in:
--   server/_core/fundingSourcesV678.ts
-- and is invoked from `runAutoMigration()` in autoMigrate.ts.
--
-- This file is intentionally a migration no-op. The executable SELECT below
-- allows the migration journal to record completion without changing data.

SELECT 1;
