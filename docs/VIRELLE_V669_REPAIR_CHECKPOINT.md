# Virelle Studios — v6.69 Repair Checkpoint

**Date:** 2026-04-25
**Base commit:** `1c9f2b5` (v6.69 mega-patch shipped)
**Repair scope:** Phases 1–9 of `virelle_v669_repair_instruction.md`.

## Audit findings (before repair)

These were the concrete defects the repair pass set out to fix:

1. **Schema/code drift — character reference images.** `productionElements.ts`
   and `projectHealth.ts` both read a non-existent `characters.referenceImages`
   column. The actual columns are `photoUrl` (varchar) and `attributes` (json,
   which holds `referenceImages`, `imageUrl`, `photoUrl`, `headshotUrl`,
   `bodyShotUrl`, `lookbookImages`). Linked `aiActor` rows were never
   considered.

2. **Schema/code drift — scene location & numbering.** Same files (and the
   pitch-deck router) read `scene.location`, `scene.sceneNumber`, and
   `scene.sceneTitle`. None of those columns exist. Real columns:
   `locationDetail`, `locationType`, `city`, `country`, `realEstateStyle`,
   `orderIndex`, `title`.

3. **`pitchDeck.get` was broken.** It sorted scenes by the missing
   `sceneNumber` and pulled `s.sceneTitle` and `s.posterUrl` (also missing).
   The deck rendered with no scene titles and arbitrary order.

4. **BYOK fallback policy used the wrong values.** The schema column,
   migration, router enum, and frontend selector used
   `byok-only / byok-with-fallback / credits-only`. The instruction spec
   requires `credits_only / byok_only / byok_with_consent /
   byok_with_auto_fallback`, with `byok_with_consent` as the default.

5. **`byok.getProviderStatus` did not return `byokFallbackMode`.** The BYOK
   Control Center had to guess the saved value, causing flicker on load.

6. **BYOK validators were stubs for most providers.** Only OpenAI, Anthropic,
   ElevenLabs, Replicate, and fal had any real ping; Google AI, Runway, Luma,
   Hugging Face, Venice, BytePlus, and Suno fell back to a fake "valid"
   response that hid invalid keys.

7. **Credit reservations were not used by the three highest-cost flows.**
   `scene_video`, `trailer_gen`, and `auto_recap` all called `deductCredits`
   directly with no atomic dedup and no release-on-failure path. Duplicate
   clicks double-charged users and async failures left users charged.

## What was fixed

- **Phase 2** (`server/_core/productionElements.ts`,
  `server/_core/projectHealth.ts`): introduced
  `collectCharacterReferenceImages(c, aiActor)` and `buildSceneLocationLabel(s)`.
  Every reference-image source is now considered. Location is composed from
  the real columns. `sceneNumber` is derived as `orderIndex + 1`.
  `projectHealth` now imports the same helper so the Command Center stops
  falsely warning about missing reference images when `photoUrl` is set.

- **Phase 3** (`drizzle/schema.ts`, `drizzle/0026_byok_fallback_mode_v669.sql`,
  `server/routers.ts`): switched `users.byokFallbackMode` to the spec values
  with `byok_with_consent` as the default. The router enum and the
  `getProviderStatus` response now match.

- **Phase 4** (`server/_core/byokValidation.ts`): rewrote the validator to
  cover OpenAI, Anthropic, Google AI, ElevenLabs, Replicate, fal, Runway,
  Luma, Hugging Face, and Venice with real cheap-call probes. BytePlus and
  Suno return `unsupported` (truthful) rather than a fake `valid`.
  Decrypted keys are never logged or returned. Status values match the spec
  set: `valid | invalid | rate_limited | unsupported | not_configured |
  unknown_error`.

- **Phase 5** (`server/routers.ts`): migrated `scene.generateVideo`,
  `video.generateTrailer`, and `recap.generate` to the
  `reserveCredits / finalizeReservation / releaseReservation` pattern.
  Duplicate clicks are now blocked atomically by
  `(referenceType, referenceId)`. Trailer and recap refund credits when the
  sync flow throws. Scene-video finalizes after dispatch (matching pre-v6.69
  behavior for async failures, with the open follow-up tracked in the
  repair report).

- **Phase 7** (`server/routers.ts`): rewrote `pitchDeck.get` to sort by
  `orderIndex`, derive a 1-based `sceneNumber`, fall back to
  `Scene N` titles, pull `getProjectBudgets` (with category aggregation),
  pull `getProjectShootDays` defensively, and use
  `collectCharacterReferenceImages` for character refs.

- **Phase 8** (`docs/SCRIPT_TO_STORYBOARD_WIZARD_SPEC.md`): wrote the spec
  doc that the instruction set asked for. The wizard itself was already
  shipped in the v6.69 mega-patch.

- **Phase 1 + 9**: this checkpoint plus `VIRELLE_V669_REPAIR_REPORT.md`.

## Out of scope for this pass

- Auto Recap MP4 muxing (Phase 6). The recap router builds the structured
  outline and persists segments correctly, but the actual MP4 render still
  routes through the existing job worker. See `VIRELLE_V669_REPAIR_REPORT.md`
  for the documented blocker.
- Scene-video async-failure refund. The dispatch-time reservation prevents
  duplicate charges but does not release the hold when a background provider
  IIFE later sets the scene to `failed`. Wiring release into every provider
  branch is a follow-up.
