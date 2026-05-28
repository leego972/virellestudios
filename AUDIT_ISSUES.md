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
  