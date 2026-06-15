---
  name: Wardrobe pipeline gap
  description: Two separate wardrobe systems existed but neither reached the AI generation prompts correctly
  ---

  ## Rule
  Both wardrobe sources (marketplace assignments AND SceneEditor inline overrides) must be explicitly
  read and injected into CharacterDNA + wardrobeContext before each video generation call.

  ## The gaps that existed (now fixed in routers.ts, video gen block ~L3152)

  1. **buildCharacterDNA called without override**: All characters fell back to "plain all-black outfit
     placeholder" even when wardrobe was assigned in the marketplace DB. Fix: loop through
     sceneActiveCharacters, call `db.getWardrobeAssignmentsByCharacter(id)` + `db.getWardrobeItemById`,
     build `_charWardrobeOverrides` Map, pass to `buildCharacterDNA(c, override)`.

  2. **scene.wardrobe JSON never read**: SceneEditor has "Scene Wardrobe Overrides" UI (outfit, hair,
     makeup, accessories per character) saved as `scene.wardrobe` JSON array. This was NEVER parsed
     during generation. Fix: parse `(scene as any).wardrobe` entries after marketplace fetch; fill
     `_charWardrobeOverrides` map gaps; build `_effectiveWardrobeContext` string for prompts.

  3. **Duplicate wardrobeContext fetch**: `getWardrobePromptContextForScene` was called twice at the
     video gen path. Second call removed; `_effectiveWardrobeContext` used for all 9 downstream
     call sites (buildScenePrompt, buildExtendedSceneDescription ×4, generateExtendedScene ×4).

  ## How to apply
  Any future addition to the video generation pipeline that builds character prompts must:
  - Read `_charWardrobeOverrides` (already built) and pass to `buildCharacterDNA`
  - Use `_effectiveWardrobeContext` (not raw `sceneWardrobeContext`) for all prompt fields
  - The single-shot photo path (~L2801) has its own `sceneWardrobeContext` and does NOT yet
    have the inline scene.wardrobe reading — a future session could extend it there too.

  **Why:** Two parallel wardrobe systems existed (marketplace DB assignments vs inline scene JSON)
  with no bridge to the generation pipeline. Characters always got random AI-chosen clothing.
  