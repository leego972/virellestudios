# Virelle Studios — Competitive 10/10 Scorecard

_Self-assessed after v6.68 (Replit Competitive Upgrade Master File)._
_Compared against StudioBinder, Celtx, Frame.io, Yamdu, ShotGrid, Movie Magic,
Final Draft, and dedicated AI video tools (Runway, Sora, Luma)._

| # | Category | Score | What's done | What's missing | Next improvement |
|---|---|---|---|---|---|
| 1 | Onboarding | 8 / 10 | Email + password, magic link, project templates, demo data, sample projects | Guided "first film in 5 minutes" walkthrough still relies on the dashboard tour, not an in-product checklist | Bake an in-app onboarding card that points at the new Command Center |
| 2 | Project Command Center | 8 / 10 | New Command Center page (v6.68) shows story / cast / production / post / monetization status with a single Next Best Action CTA | No drag-and-drop reorder of recommended steps; CTA logic is rule-based not learned | Add per-user dismiss/snooze for individual checklist rows |
| 3 | Script-to-shot breakdown | 7 / 10 | Director Assistant generates scene breakdowns; per-scene shot list, props, location, characters all persist | No dedicated "review breakdown then approve" wizard; current flow auto-creates scenes | Add `preproduction.analyzeScriptForBreakdown` + a review screen before scene write |
| 4 | Storyboard | 8 / 10 | Storyboard page already ships; per-scene reference images and mood board feed it | Storyboard frames don't pull in production-elements context yet | Wire the new `elements.getPromptContextForScene` into the storyboard prompt builder |
| 5 | Elements consistency | 8 / 10 | New `productionElements.ts` derives characters / locations / props / mood / project-anchors uniformly; `elements.listProjectElements` + `elements.getPromptContextForScene` exposed via tRPC | No Elements panel UI yet; prompt-builder integration still optional | Add ElementsPanel + SceneElementTags + MissingContinuityWarnings components |
| 6 | BYOK provider control | 9 / 10 | New BYOK Control Center page (v6.68) shows masked status of OpenAI / Anthropic / Google / Venice / Runway / Replicate / fal / Luma / BytePlus / HuggingFace / ElevenLabs / Suno + per-user preferred-provider + advisory fallback policy. `byok.getProviderStatus`, `byok.testProviderKey`, `byok.updateProviderPreferences` shipped. `providerPolicy.chooseGenerationProvider` reused across LLM/video/voice/image. | Live "ping the provider with the cheapest call" validation is shape-only; persisted `byokFallbackMode` column not added yet | Add a column for `byokFallbackMode` and call provider-specific `validateApiKey` from `byokVideoEngine` for true validation |
| 7 | Video generation | 9 / 10 | Existing engine (BYOK + unified video + filmPipeline + videoJobWorker) untouched and working. Tier discount applied on estimates. | Cost-vs-quality picker UI is per-feature, not centralized | Surface `chooseGenerationProvider`'s reasoning in every Generate dialog |
| 8 | Audio / voice / music | 8 / 10 | Soundtrack, dialogue, ADR, foley, mix, score cues all persist; ElevenLabs + Suno BYOK supported | UI for swapping voice cast post-render is multi-step | Add a one-click "regenerate with different voice" |
| 9 | Review / approval | 8 / 10 | `frameComments` + per-scene `approvalStatus` already exist; `review.*` procedures exist | Filtering scenes by review status is buried in Cutting Room | Add an "Awaiting your review" filter chip to ProjectDetail |
| 10 | Auto Recap | 9 / 10 | Full v6.66/v6.67 implementation: estimator with tier discount, generate, polling status, attach/unattach, episodic gating, activity log | Recap audio render not yet wired into existing render pipeline | Add a `render` step that uses `filmCompileJobs` to produce an MP4 recap |
| 11 | Subtitles / credits | 8 / 10 | Subtitles, opening/closing credits, dialogue editor all ship | Subtitle styling presets are limited | Add 3-4 broadcast-ready subtitle style presets |
| 12 | Export / NLE | 8 / 10 | NLE export, aspect ratio sticky preference, multi-shot sequencer all ship | "Export readiness" was scattered across pages | Now surfaced in Command Center post-production card with explicit blockers |
| 13 | Pitch / marketing assets | 9 / 10 | New Pitch Deck page (v6.68) renders title / logline / synopsis / themes / characters / mood board / scenes / production plan with print-to-PDF. Also: poster maker, trailer studio, press kit, social cuts factory, crowdfunding, brand outreach already shipped. | Budget estimate isn't auto-fed into the pitch deck yet | Pull project budget into pitchDeck.get response |
| 14 | Collaboration | 8 / 10 | Collaborators table + collaboration page + per-scene comments + sharing + chain-of-title all ship | Real-time presence (cursors, typing) not implemented | Add a presence layer on top of collaborators |
| 15 | Reliability / credits | 9 / 10 | New `creditReservations` table + reserve/finalize/release helpers (v6.68) prevent double-charge and refund failed jobs; `getActiveReservation` blocks duplicate clicks; `creditTransactions` ledger pre-existing | Existing routes don't use reservations yet — they still call `deductCredits` directly | Migrate the 3 most expensive routes (scene generation, recap render, trailer) to use `reserveCredits` first |
| 16 | Security | 9 / 10 | BYOK keys never returned to frontend (only masked status). Project ownership enforced on every project route via `getProjectById(id, userId)`. Scene ownership goes through project. Sanitize helpers in place. | A full per-route ownership audit hasn't been re-run since v6.63 | Add a one-shot ownership lint that checks every protectedProcedure references userId |

## Overall

- Avg score: **8.4 / 10**.
- Highest: BYOK Control / Reliability / Auto Recap / Pitch Deck (9).
- Lowest: Script-to-shot breakdown wizard (7) — next priority for v6.69.

## Top 5 things to ship next to reach 10/10

1. Dedicated Script-to-Storyboard breakdown wizard with explicit user
   approval before scenes are written (Phase 3 follow-up).
2. ElementsPanel + SceneElementTags UI surfacing the new
   `productionElements` data (Phase 4 follow-up).
3. Migrate scene generation, recap render, and trailer generation to use
   `reserveCredits` / `finalizeReservation` / `releaseReservation` (Phase 6
   integration).
4. True provider-side `testProviderKey` (cheap-call validation per provider
   instead of shape-only).
5. Auto Recap MP4 render via `filmCompileJobs`.
