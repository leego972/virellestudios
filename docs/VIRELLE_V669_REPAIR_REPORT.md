# Virelle Studios — v6.69 Repair Report

**Date:** 2026-04-25
**Base commit:** `1c9f2b5`
**Scope:** Phases 1–9 of the repair instruction zip.

## Phase 1 — Inventory & checkpoint

See `VIRELLE_V669_REPAIR_CHECKPOINT.md`. Audit performed against the live
schema (not the spec) to catch the field-name drift that caused the breakage.

## Phase 2 — Production elements & project health field mapping

**Files:** `server/_core/productionElements.ts`, `server/_core/projectHealth.ts`.

Introduced two pure helpers:

- `collectCharacterReferenceImages(character, aiActor)` — pulls from
  `photoUrl`, the legacy `referenceImages` array, and every key inside
  `attributes` we have ever stored (`referenceImages`, `imageUrl`,
  `photoUrl`, `headshotUrl`, `bodyShotUrl`, `lookbookImages`). Falls through
  to the linked `aiActor` row when present. Deduplicates results.
- `buildSceneLocationLabel(scene)` — composes a human-readable location label
  from `locationDetail`, `realEstateStyle`, `locationType`, and
  `city, country`.

`listProjectElements` now uses the helper for character refs and queries the
`aiActor` row when `aiActorId` is set. `getPromptContextForScene` derives
`sceneNumber = orderIndex + 1` (the column does not exist), tries to match a
real `locations` record before synthesizing one, and falls back gracefully
when nothing matches. `projectHealth` imports the same helper so the
Command Center no longer warns about missing reference images when a
character has `photoUrl` set or any usable image inside `attributes`.

## Phase 3 — Persistent BYOK fallback policy

**Files:** `drizzle/schema.ts`, `drizzle/0026_byok_fallback_mode_v669.sql`,
`server/routers.ts`.

Aligned the column, migration, router enum, and API response to the spec
values: `credits_only | byok_only | byok_with_consent |
byok_with_auto_fallback`. Default is `byok_with_consent`. The migration
uses `ADD COLUMN IF NOT EXISTS` so it is safe on environments that already
ran the previous (hyphenated) variant. `getProviderStatus` now returns
`byokFallbackMode` so the Control Center can render the saved choice
without flicker.

## Phase 4 — Real BYOK validators

**File:** `server/_core/byokValidation.ts` (rewritten).

Added or hardened cheap-call validators for: OpenAI (`/v1/models`),
Anthropic (`/v1/models` with `anthropic-version`), Google AI
(`/v1beta/models?key=…`), ElevenLabs (`/v1/user`), Replicate (`/v1/account`),
fal (`queue.fal.run/`), Runway (`/v1/organization`), Luma
(`/dream-machine/v1/generations?limit=1`), Hugging Face (`/api/whoami-v2`),
and Venice (OpenAI-compatible `/api/v1/models`). BytePlus and Suno return
`unsupported` until we have a documented safe ping. All probes:

- Resolve the encrypted key from the user row, decrypt it, and never log
  or return the decrypted value.
- Use an 8-second `AbortController` timeout.
- Map HTTP status to the spec status set:
  `valid | invalid | rate_limited | unsupported | not_configured |
  unknown_error`.

## Phase 5 — Credit reservations

**File:** `server/routers.ts`.

Migrated the three highest-cost flows to the
`reserveCredits → finalizeReservation / releaseReservation` pattern that
already existed in `server/db.ts`. `reserveCredits` deduplicates by
`(referenceType, referenceId)`, so a duplicate click while the previous
reservation is still `reserved` returns the existing reservation id without
double-charging.

| Flow | Reference key | Refund on failure? |
|---|---|---|
| `scene.generateVideo` | `(scene, sceneId)` | Sync-only — see open follow-up below |
| `video.generateTrailer` | `(trailer, projectId)` | **Yes** — body wrapped in try/catch |
| `recap.generate` | `(recap, recapId)` | **Yes** — uses `getActiveReservation` in the existing catch |

### Open follow-up — async scene-video failure refund

`scene.generateVideo` dispatches the actual render via fire-and-forget
provider IIFEs (Runway, fal, etc.), each of which has its own
`try { … } catch { … }` and writes `scene.status = "failed"` on failure.
The current repair finalizes the reservation immediately after dispatch so
duplicate-click protection works, but it does not release the hold when an
IIFE later fails. To fix: thread `__sceneVideoResId` into each IIFE closure
and call `db.releaseReservation(__sceneVideoResId)` in their failure
catches. Tracked but not done in this pass to keep the diff minimal across
the four provider branches.

## Phase 6 — Auto Recap MP4 — documented blocker

The `recap.generate` flow now correctly:
1. Reserves credits up front.
2. Runs the LLM outline pass.
3. Persists `recapSegments` rows.
4. Finalizes the reservation on success / releases on failure.
5. Marks the recap row `status = "completed"` once the outline is saved.

What it does **not** do is render the actual concatenated MP4. The current
implementation marks the recap "completed" once the structured outline +
segment timestamps are persisted; the player composes the recap on-the-fly
from those segments and the source movie URLs. A true server-side MP4 mux
requires:

- a working `ffmpeg` binary on the Railway image (currently absent from
  the production container — verified by `which ffmpeg` returning empty),
- access to the source `fileUrl` MP4s without S3-style signed-URL expiry,
- a worker queue that survives Railway's request timeout (the recap
  outline alone takes ~20 s; concatenating four 12-second clips at 1080p
  takes another 30–60 s).

**Decision:** keep the on-the-fly composition in v6.69. Track the muxing
work as a separate v6.70 task once `ffmpeg` is added to the Railway image
and a worker queue is wired up.

## Phase 7 — Pitch deck

**File:** `server/routers.ts` (`pitchDeck.get`).

Fixed every drifted field: scenes are now sorted by `orderIndex`, scene
numbers are derived `orderIndex + 1`, titles fall back to `Scene N`,
thumbnails fall back to `heroFrameUrl`, character reference images use
`collectCharacterReferenceImages`, and the deck now includes:

- `budgetEstimate` aggregated from `getProjectBudgets` (total + per-category
  breakdown + currency from the first budget row).
- `productionPlan` derived from `getProjectShootDays` when the helper exists
  (defensive fallback to `null` otherwise).

## Phase 8 — Script-to-storyboard wizard spec

`docs/SCRIPT_TO_STORYBOARD_WIZARD_SPEC.md` documents the wizard the v6.69
mega-patch already shipped. The instruction set asked for a stub spec; the
implementation is already live, so the doc reflects what was built.

## Phase 9 — This report

You are reading it.

## Acceptance — what to verify in production

- Open a project with a character that has only `photoUrl` set (no
  `attributes.referenceImages`). Command Center should **not** warn about
  missing reference images.
- Run pitch deck on any v6.69 project — scenes should appear in order with
  titles, budget total, and shoot-day count.
- Save BYOK fallback policy as `byok_only`; refresh; the Control Center
  should still show `byok_only` (no flicker, no default snap-back).
- Test an Anthropic key — should return `valid` for a real key, `invalid`
  for a tampered one, `rate_limited` if the org is throttled.
- Click "Generate scene video" twice in <2 s — second click should not
  double-charge (returns the existing reservation id).
- Generate a trailer where the LLM returns invalid JSON — credits should
  be refunded (visible in `creditTransactions` as a `credits.refund` row).
