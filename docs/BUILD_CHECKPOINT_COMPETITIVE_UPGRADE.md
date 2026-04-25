# Virelle Studios — Competitive Upgrade Build Checkpoint (v6.68)

_Phase 0 baseline audit captured before applying the Replit Competitive Upgrade
Master File._

## Build status

| Check | Result |
| --- | --- |
| `pnpm check` (tsc --noEmit) | ✅ EXIT 0 |
| `pnpm run build` (vite + esbuild) | ✅ EXIT 0 (33s, large-chunk warning only) |
| `pnpm test` (vitest) | Skipped per kit guidance ("Do not run expensive AI/render jobs during development unless doing one final minimal smoke test") |

No TypeScript errors, no broken imports, no missing exports, no schema
mismatches. **Phase 1 (Fix build / core breakages) has nothing to do.**

## Files inspected

- `package.json`
- `server/routers.ts` (12,114 lines)
- `server/db.ts` (2,791 lines)
- `drizzle/schema.ts`
- `server/_core/subscription.ts`
- `server/_core/byokVideoEngine.ts`
- `server/_core/unifiedVideoEngine.ts`
- `server/_core/videoJobWorker.ts` _(referenced; not modified)_
- `server/_core/filmPipeline.ts` _(referenced; not modified)_
- `shared/feature-registry.ts`
- `client/src/App.tsx`
- `client/src/pages/ProjectDetail.tsx`, `client/src/pages/AutoRecapPage.tsx`

## Features already present

- BYOK fields on `users` row for OpenAI / Runway / Replicate / fal / Luma /
  Hugging Face / ElevenLabs / Suno / BytePlus / Anthropic / Google AI / Venice.
  `preferredVideoProvider` and `preferredLlmProvider` already persisted.
- Generation engine (`byokVideoEngine`, `unifiedVideoEngine`,
  `videoGeneration`, `videoJobWorker`, `filmPipeline`) — kept untouched per kit
  rule.
- `scenes` table with `shotList`, `props`, `referenceImages`, `characterIds`,
  `videoUrl`, `generatedUrl`, `outputUrl`, `approvalStatus`.
- `frameComments` + per-scene `approvalStatus` (Phase 8 Review/Approval baseline
  already exists; only UX polish would be needed).
- `subtitles`, `soundtracks`, `credits`, `moodBoardItems`, `featureCuts`,
  `filmCompileJobs` — Phase 9 post-production data is already in place.
- Auto Recap MVP (v6.66) + tier-aware estimator + attach mutation + live
  polling (v6.67). Phase 7 is **DONE**.
- Existing `tRPC` routers: project, scenes, characters, locations, mood-board,
  scripts, subtitles, soundtracks, credits, recap, ad-poster, trailer,
  director-cut, casting-board, cutting-room, etc.
- Provider policy helper `server/_core/providerPolicy.ts` (v6.67) —
  `getMaskedProviderStatus`, `chooseGenerationProvider`,
  `creditDiscountForTier`.

## Features partially present

- **Project Command Center**: ProjectDetail page exists but there is no single
  "what is missing / what to do next" surface.
- **BYOK Control Center**: encrypted user fields exist but no settings page
  dedicated to provider status, validation, or fallback policy.
- **Production elements / consistency**: characters, locations, mood board,
  per-scene `referenceImages` and `props` exist, but no unified utility builds
  prompt context for a scene.
- **Credit reservations**: `creditTransactions` ledger exists with
  `deductCredits` / `addCredits`, but no reservation table to hold credits
  during in-flight async jobs.
- **Pitch Deck**: project data is rich enough to assemble a deck but no
  dedicated print-friendly page exists.

## Implementation order applied in v6.68

1. **Phase 0** — this document.
2. **Phase 1** — verified clean; nothing to fix.
3. **Phase 2** — `project.getHealthSummary` + `ProjectCommandCenterPage`.
4. **Phase 4** — `server/_core/productionElements.ts` utility +
   `elements.getPromptContextForScene` procedure.
5. **Phase 5** — `byok.getProviderStatus` / `testProviderKey` /
   `updateProviderPreferences` + `BYOKControlCenterPage`.
6. **Phase 6** — `creditReservations` table + `reserveCredits` /
   `finalizeReservation` / `releaseReservation` / `getActiveReservation` /
   `listUserReservations` helpers.
7. **Phase 7** — already shipped in v6.66 / v6.67.
8. **Phase 9** — export readiness derived inside the Command Center.
9. **Phase 10** — `pitchDeck.get` procedure + `PitchDeckPage` (print-to-PDF).
10. **Phase 11** — feature registry adds `project-command-center`,
    `byok-control-center`, `pitch-deck`.
11. **Phase 14** — competitive scorecard.
12. **Phase 16** — final report.

Phases deferred to a follow-up cycle (would be invasive on shipped surfaces or
would require cross-cutting redesigns):

- **Phase 3** (Script-to-Storyboard breakdown): the existing director /
  scene-breakdown flows already cover this functionally; a dedicated
  reviewable-breakdown wizard is the next polish target.
- **Phase 8** (Review/Approval UX polish): backend already supports it.
- **Phase 12** (UX quality bar) and **Phase 13** (Security audit): handled for
  the new surfaces; sweeping legacy audit deferred.
- **Phase 15** (full vitest run): kit explicitly defers expensive runs.

## Safety boundaries respected

- Generation engine files unchanged.
- No new job queue, no second media/render system.
- BYOK keys never returned to the frontend; only masked status.
- All new procedures are additive (no existing route renamed or removed).
- Migrations are additive `ALTER TABLE … ADD COLUMN` / `CREATE TABLE IF NOT
  EXISTS` only.
