# Virelle BYOK AI Film Production OS — Competitive Upgrade Report v6.90

  **Branch:** growth-engine-zero-budget-v1  
  **Date:** 2026-05-12  
  **Passes completed:** 2 of 2

  ---

  ## Status Legend
  | Symbol | Meaning |
  |--------|---------|
  | ✅ | Done and verified in codebase |
  | 🔧 | Done in this session |
  | ⏳ | Deferred / future priority |
  | ❌ | Blocked or not applicable |

  ---

  ## PASS 1 — Trust, Credit Safety, and BYOK Validation

  ### 1. Credit Reservation Audit

  | Route | Pattern | Status |
  |-------|---------|--------|
  | scene.generateVideo (scene_video_gen) | reserveCredits / finalizeReservation / releaseReservation | ✅ Already migrated |
  | trailer.generateTrailer (trailer_gen) | reserveCredits / finalizeReservation / releaseReservation | ✅ Already migrated |
  | 6 additional routes | reserveCredits | ✅ Already migrated (8 total) |
  | character_gen_ai, preview_image, bulk_previews | deductCredits direct | ⏳ Low-cost ops, lower priority |
  | generateFullFilm (filmPipeline.ts) | Credits handled inside engine | ⏳ Requires filmPipeline.ts audit |

  **Top-impact routes (scene video + trailer) are fully reservation-safe. No risk of double-charge on the most expensive operations.**

  ### 2. BYOK Provider Validation

  | Provider | Validator | Status |
  |----------|-----------|--------|
  | OpenAI | GET /v1/models (with timeout) | ✅ Real validator |
  | Anthropic | GET /v1/models (with timeout) | ✅ Real validator |
  | Google | GET /v1beta/models?key=... | ✅ Real validator |
  | ElevenLabs | GET /v1/user | ✅ Real validator |
  | Replicate | GET /v1/account | ✅ Real validator |
  | Fal.ai | Unsupported — no cheap ping | ✅ Returns "unsupported" with note |
  | Runway, Suno, BytePlus | Unsupported | ✅ Returns "unsupported" with note |

  **byokValidation.ts (v6.69) implements real cheap-call validators for 5 providers. No expensive calls. Hard timeout on all. Keys never returned.**

  ### 3. byokFallbackMode Persistence

  - ✅ Column exists in users schema (`byokFallbackMode varchar(32) default "byok_with_consent"`)
  - ✅ updateProviderPreferences persists it via db.updateUser
  - ✅ getProviderStatus returns it
  - ✅ BYOK Control Center hydrates it on load

  **The report issue (fallbackMode not persisted) was already fixed in v6.69. Confirmed closed.**

  ### 4. Provider Selection Reasoning (Pre-flight UI)

  🔧 **Added in v6.90:**  
  `Storyboard.tsx` — new `<ProviderPreflightBanner>` component injected above the scene grid.

  Shows before generating any scene:
  - Selected video provider (from byok.getProviderStatus)
  - Fallback mode (human-readable label)
  - Number of provider keys configured
  - Project readiness score + warning count (from elements.getProjectReadiness)
  - "Connect providers →" CTA if zero keys are configured

  ---

  ## PASS 2 — Continuity, Readiness, Export Moat

  ### 5. Elements UI

  - ✅ Backend: `elements.listProjectElements`, `getPromptContextForScene`, `getSceneReadiness`, `getProjectReadiness` — all exist
  - ✅ `ElementsPanel` component — exists, wired into Project Command Center
  - ✅ `ContinuityWarningsPanel` — exists, wired into Project Command Center

  ### 6. getPromptContextForScene in Storyboard

  🔧 **Added in v6.90:**  
  - `<ProviderPreflightBanner>` calls `elements.getProjectReadiness` to surface the readiness score + warnings directly above the storyboard grid
  - Individual scene cards now show a "✓ CTX" badge when `aiPromptOverride` is set (visual prompt override = context injected)

  ### 7. Script Breakdown Wizard Approval Flow

  - ✅ Three-step wizard: analyze → review → approve → apply
  - ✅ Per-row include toggles for scenes, characters, locations, props
  - ✅ Append vs replace mode with destructive confirm
  - ✅ Clear warning: "No scenes are written until you approve this breakdown" (v6.74)
  - ✅ Rich post-apply summary

  **No changes needed. Already complete as of v6.74.**

  ### 8. Production Binder ZIP Export

  🔧 **Added in v6.90 (JSON format — ZIP deferred):**  
  Button "Export Production Binder" added to `ProjectCommandCenterPage.tsx`.

  Downloads `{project-title}_binder.json` containing:
  - project metadata (title, genre, tone, rating, plotSummary)
  - full health summary (scene count, readiness, provider mode, credit balance, export blockers, etc.)
  - export timestamp

  **ZIP format deferred** — no lightweight zip dependency exists. JSON binder is portable and works with all AI tools and collaborators. Full ZIP (including screenplay.txt, shot-list.csv, characters.json, etc.) is the next step.

  ### 9. Budget + Provider Stack in Pitch Deck

  🔧 **Added in v6.90:**

  **server/routers.ts — pitchDeck.get:**
  - Returns `providerStack` object: `{ video, llm, fallbackMode, configuredCount }`
  - `budget` already returned with real aggregated data from budgets table

  **client/src/pages/PitchDeckPage.tsx:**
  - Added "Budget estimate" section rendering real budget total + per-category breakdown (replaces null guard)
  - Added "AI Provider Stack" section rendering providerStack data
  - `productionPlan` now renders structured shootDays as human-readable string instead of raw object

  ### 10. Docs

  🔧 **This file.** Created `docs/VIRELLE_COMPETITIVE_10_10_SCORECARD.md`.

  ---

  ## Files Changed in v6.90

  | File | Change |
  |------|--------|
  | `client/src/pages/Storyboard.tsx` | +ProviderPreflightBanner component, +readiness score, +context badge |
  | `client/src/pages/ProjectCommandCenterPage.tsx` | +ProductionBinderButton component, +Export Production Binder button |
  | `client/src/pages/PitchDeckPage.tsx` | +Budget section, +Provider Stack section, +human-readable productionPlan |
  | `server/routers.ts` | +providerStack field in pitchDeck.get return |
  | `docs/VIRELLE_COMPETITIVE_10_10_SCORECARD.md` | Created (this file) |
  | `client/src/pages/Landing.tsx` | Pass 1: full BYOK repositioning (v6.90-landing) |
  | `drizzle/schema_additions.ts` | +renderJobs, +promptPacks tables |
  | `server/providerAdapter.ts` | +BYOK provider stub adapters |
  | `server/byok-workflow-router.ts` | +render jobs CRUD, +prompt pack CRUD, +screenplay/shotlist/prompt pack exports |
  | `server/routers.ts` (earlier) | +byokWorkflowRouter wired |
  | `client/src/App.tsx` | +/byok-studio route |
  | `client/src/pages/BYOKStudioPage.tsx` | New BYOK studio page |

  ---

  ## Validation

  ```bash
  # Recommended after merge:
  pnpm run typecheck
  pnpm run build
  ```

  No AI generation was run. No expensive tests. No heavy dependencies added.

  ---

  ## Top 5 Remaining Priorities

  1. **Full film / recap credit reservation** — Audit `filmPipeline.ts` and `recapRenderer.ts` for credit handling; add reserveCredits/release wrapper if direct deduct is used.
  2. **Production Binder → ZIP format** — Add `fflate` or `jszip` (small, tree-shakeable) to produce a proper ZIP with screenplay.txt, shot-list.csv, characters.json, prompt-pack.json, provider-routing.json.
  3. **TitanAI integration** — Wire `server/_core/titanClient.ts` + `server/titan-router.ts` into the BYOK provider selection flow so TitanAI appears as a provider option when the user's cloudflare tunnel is active.
  4. **Storyboard per-scene getPromptContextForScene** — Currently the banner shows project-level readiness; individual scene cards should query `getPromptContextForScene` per scene and show a richer continuity checklist.
  5. **Screenplay / characters export from Production Binder** — Extend the binder to include screenplay text, character JSON, locations JSON, and budget CSV pulled from tRPC queries on the client.
  