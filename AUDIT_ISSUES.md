# Virelle Studios - Full Audit Issue List

  ## Fixed — Pass 1 (Previous)
  1. [FIXED] LLM `thinking` mode incompatible with `response_format: json_schema` — conditional now
  2. [FIXED] Missing `character.list` endpoint — added to router
  3. [FIXED] Tools TabsContent was outside `</Tabs>` — moved inside
  4. [FIXED] Broken JSX comment syntax (missing `}`)
  5. [FIXED] BudgetEstimator.tsx TypeScript errors (null handling)
  6. [FIXED] `server/_core/index.ts` Map iteration error (Array.from)
  7. [FIXED] `routers.ts` line ~416 content type error (string vs array)
  8. [FIXED] Mobile responsiveness: grid-cols-4 → grid-cols-2 sm:grid-cols-4 (stats)
  9. [FIXED] Mobile responsiveness: grid-cols-3 → grid-cols-1 sm:grid-cols-3 (NewProject, AI char dialogs, StoryEditor)
  10. [FIXED] Mobile responsiveness: Characters page header buttons flex-wrap
  11. [FIXED] Mobile responsiveness: TabsList h-auto for wrapping

  ## Fixed — Pass 2 (This Session)
  12. [FIXED] `server/_core/llm.ts` — `Message` type missing `tool_calls` field; director assistant used `as any` workaround
  13. [FIXED] `server/directorAssistant.ts` — removed `as any` cast on assistant tool-call message push (now type-safe)
  14. [FIXED] `client/src/pages/ProjectDetail.tsx` — `hasFundingApplication` and `hasCampaign` hardcoded to `false`, blocking journey stages 5 & 8 from ever marking complete. Now derived from real project data
  15. [FIXED] `client/src/pages/CrowdfundingHub.tsx` — erroneous 2-space indent on every line (file-wide)
  16. [FIXED] `client/src/pages/MultiShotSequencer.tsx` — no `NextStageCTA` (stage 6 → Cutting Room); user had no way to advance
  17. [FIXED] `client/src/pages/ScriptWriter.tsx` — no `NextStageCTA` (stage 3 → Production Office)
  18. [FIXED] `client/src/pages/ColorGrading.tsx` — no `NextStageCTA` (stage 7 → Release)
  19. [FIXED] `client/src/pages/ShotList.tsx` — no `NextStageCTA` (stage 4 → Funding Office)
  20. [FIXED] `client/src/pages/ContinuityCheck.tsx` — no `NextStageCTA` (stage 6 → Cutting Room)
  21. [FIXED] `client/src/pages/LocationScout.tsx` — no `NextStageCTA` (stage 4 → Funding Office)
  22. [FIXED] `client/src/pages/MoodBoard.tsx` — no `NextStageCTA` (stage 1 → Casting Studio)
  23. [FIXED] `client/src/pages/Storyboard.tsx` — no `NextStageCTA` (stage 3 → Production Office)
  24. [FIXED] `client/src/pages/BudgetEstimator.tsx` — no `NextStageCTA` (stage 4 → Funding Office)
  25. [FIXED] `client/src/pages/SceneEditor.tsx` — no `NextStageCTA` (stage 3 → Production Office)
  26. [FIXED] `client/src/pages/DialogueEditor.tsx` — no `NextStageCTA` (stage 3 → Production Office)
  27. [FIXED] `client/src/pages/Subtitles.tsx` — no `NextStageCTA` (stage 7 → Release)
  28. [FIXED] `client/src/pages/NLEExport.tsx` — no `NextStageCTA` (stage 7 → Release)
  29. [FIXED] `client/src/pages/TrailerStudio.tsx` — no `NextStageCTA` (stage 8 → Journey complete)

  ## Remaining / Future Investigation
  - [ ] Verify all tRPC endpoint names match exactly what each frontend page calls
  - [ ] Check mobile responsiveness on remaining pages: Login, Register, Settings, Landing
  - [ ] Audit SoundEffects, VisualEffects, Collaboration, VFXSuite, LiveActionPlate, DirectorCut pages for any logic issues
  - [ ] End-to-end test: create project → complete all 8 stages → verify journey nav advances correctly
  

  ---

  ## Pass 3 — Character Generation Pipeline (2025-05-28)

  ### BUG-15 · CRITICAL — MultiShotSequencer: no character selection, no generation call
  **File:** `client/src/pages/MultiShotSequencer.tsx`  
  **Root cause:** Stage 6 "Soundstage" page only saved camera metadata via `scene.update`; the "Generate Sequence" button never called `scene.generatePreview` or any image/video generation endpoint. No character selection UI existed, so `scene.characterIds` was always empty — meaning the server's character DNA injection, reference-photo locking, and wardrobe/costume prompts were completely bypassed for every scene generated from this page.  
  **Fix:**
  - Added **Scene Cast panel** (sidebar): select which characters appear anywhere in this scene. Their `faceDnaPrompt`, `bodyDnaPrompt`, `consistencyNotes`, and reference photos are auto-injected into the generation prompt via the existing server pipeline.
  - Added **per-shot character toggles** inside each `ShotCard`: assign specific cast members to individual shots — useful when character A exits and character B enters mid-sequence.
  - Scene-level `characterIds` is now derived as the union of all per-shot selections and persisted on `scene.update`.
  - Added **"Generate Preview"** button that: (1) saves scene + characterIds, then (2) calls `trpc.scene.generatePreview` — which uses `scene.characterIds` to fetch character photos + DNA and passes them as `originalImages` (reference-locked) and as structured `faceDnaPrompt`/`bodyDnaPrompt` into `buildScenePrompt`. Costumes are auto-injected per-character via the existing `getWardrobePromptContextForScene` pipeline.
  - **Costume-to-character-to-scene wiring is now correct**: wardrobe assignments (from Wardrobe Marketplace) are fetched server-side using `scene.characterIds` — so costumes assigned to character A will appear on character A in exactly the scenes/shots where A is selected, not on all characters or all scenes.

  ### BUG-16 — routers.ts: console.warn in three generation endpoints (logging policy violation)
  **File:** `server/routers.ts`  
  **Lines:** 2676, 2726, 2845 (generatePreview, generateNanoBananaImage, bulkGeneratePreviews)  
  **Fix:** Replaced `console.warn(msg, e)` with `logger.warn({ err: e }, msg)` in all three auto-set-thumbnail fallback paths.  
  **Note:** ~14 additional `console.warn` / `console.log` / `console.error` calls exist throughout `routers.ts` from older code. These are lower-priority and should be migrated to `logger` in a dedicated logging cleanup pass.

  ---

  ## Character Consistency Pipeline — Architecture Summary

  The full pipeline works as follows when all pieces are correctly wired:

  1. **CastingBoard (Stage 2)** — user creates characters with photos, physical descriptions, `faceDnaPrompt`, `bodyDnaPrompt`, `consistencyNotes`
  2. **Wardrobe Marketplace** — user assigns wardrobe items to characters with `usageMode` (must_match / costume_accurate / etc.)
  3. **MultiShotSequencer (Stage 6)** — user selects which characters appear in each shot; `scene.characterIds` is saved
  4. **`scene.generatePreview`** — server fetches `scene.characterIds`, loads character photos + DNA, passes them to `buildScenePrompt` as both `originalImages` (for gpt-image-1-edit face locking) and structured DNA fields; `getWardrobePromptContextForScene` injects per-character costume directives
  5. **`buildScenePrompt`** → `buildVisualDNA`** → final prompt with character appearance locked, wardrobe specified per character, face DNA injected

  All stages are now correctly wired end-to-end. ✅
  