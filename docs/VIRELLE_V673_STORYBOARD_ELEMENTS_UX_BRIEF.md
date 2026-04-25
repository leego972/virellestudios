# Virelle v6.73 — Script-to-Storyboard + Production Elements UX Brief

This pass improves competitive workflow quality after v6.72 reliability hardening. It should make Virelle feel more like a premium AI film studio: script → breakdown → characters/locations/props → storyboard → generation-ready scenes.

## Hard no-touch areas

Do **not** edit:

- logo files
- `StudioOpener`
- opener video flow
- opener video assets
- watermark components
- watermark placement
- export watermark logic
- homepage/brand hero visuals

## Current state

Existing docs say the Script-to-Storyboard wizard was shipped in v6.69 under:

- `client/src/pages/Wizard/ScriptToStoryboard.tsx`
- `script.breakdown`
- `script.applyBreakdown`

But repo search is inconsistent, so first verify whether those files/routes actually exist on current `main`. If they do not exist, build the minimal production-ready wizard described below. If they do exist, polish and harden them instead of duplicating.

Existing Production Elements foundation exists from v6.68/v6.69:

- `server/_core/productionElements.ts`
- project health / command center context

v6.73 should connect those pieces into a clear UX.

## v6.73 goal

Give users a guided pre-production workflow:

```txt
paste script → AI breakdown → review/edit scenes/characters/locations/props → apply to project → see elements attached to scenes → generate with stronger continuity context
```

## Phase 1 — verify build and current implementation

Run:

```bash
pnpm check
pnpm build
```

Inspect:

- `client/src/pages/Wizard/ScriptToStoryboard.tsx`
- any route that references script/storyboard wizard
- `server/routers.ts` for `script.breakdown` and `script.applyBreakdown`
- `server/_core/productionElements.ts`
- `shared/feature-registry.ts`
- project detail/navigation files

If wizard/routes exist, upgrade them. If missing, implement minimal version.

## Phase 2 — Script-to-Storyboard wizard UX

Add or improve page:

```txt
client/src/pages/Wizard/ScriptToStoryboard.tsx
```

User flow:

1. Paste screenplay/script or load existing project script.
2. Click `Analyze script`.
3. Show reviewable breakdown before writing database rows.
4. Let user edit:
   - project title/logline/tone/genre
   - scene titles/descriptions/order
   - characters
   - locations
   - props
   - scene character assignments
5. Click `Apply to project`.
6. Save scenes/characters/locations using existing tables.
7. Show post-apply summary:
   - created scenes
   - reused characters
   - reused locations
   - missing references
   - next recommended action: `Add reference images` or `Generate storyboard`.

Important UX rules:

- Do not auto-generate expensive video/images from the wizard.
- AI breakdown must be previewed before DB writes.
- Never overwrite existing script/scenes silently.
- If project already has scenes, ask whether to append or replace. Default: append.
- Keep empty states clear.

## Phase 3 — backend procedures

If missing, add or repair:

```ts
script.breakdown
script.applyBreakdown
```

### `script.breakdown`

Input:

```ts
{
  projectId: number;
  scriptText: string;
}
```

Output JSON:

```ts
{
  title?: string;
  logline?: string;
  genre?: string;
  tone?: string;
  themes?: string[];
  characters: Array<{ name: string; role?: string; description?: string }>;
  locations: Array<{ name: string; type?: string; city?: string; country?: string; description?: string }>;
  props: Array<{ name: string; description?: string; importance?: "low" | "medium" | "high" }>;
  scenes: Array<{
    sceneNumber: number;
    title: string;
    description: string;
    locationName?: string;
    locationDetail?: string;
    locationType?: string;
    city?: string;
    country?: string;
    timeOfDay?: string;
    mood?: string;
    dialogueText?: string;
    characterNames: string[];
    props: string[];
    shotSuggestions?: Array<{
      shotType?: string;
      cameraAngle?: string;
      cameraMovement?: string;
      lens?: string;
      description?: string;
      durationSec?: number;
    }>;
    continuityNotes?: string;
  }>;
}
```

Rules:

- Use existing LLM routing/BYOK policy where available.
- Use platform credits only if existing credit policy requires it.
- Do not charge twice for identical script text in the same project if a cache/reservation pattern already exists.
- Return structured JSON only.
- Validate/repair malformed AI output using safe parsing helpers.

### `script.applyBreakdown`

Input:

```ts
{
  projectId: number;
  mode: "append" | "replace";
  breakdown: BreakdownJson;
}
```

Rules:

- Require project ownership/edit access.
- Reuse existing character by case-insensitive name.
- Reuse existing location by case-insensitive name.
- Create scenes in `orderIndex` order.
- Map `sceneNumber` to `orderIndex` (1-based UI → 0-based DB).
- Save shot suggestions into existing `shotList` JSON if available.
- Save props into existing `props` JSON if available.
- Save scene character IDs into existing `characterIds` JSON.
- If mode is replace, do not delete old scenes unless user explicitly confirmed in UI.
- Return detailed summary.

## Phase 4 — Production Elements UX

Add or improve UI components:

```txt
ProductionElementsPanel
SceneElementTags
ContinuityWarningsPanel
```

Expose for each project/scene:

- characters attached to scene
- locations attached to scene
- props attached to scene
- missing reference images
- missing character descriptions
- missing location details
- scenes with no characters
- scenes with no video-generation-ready prompt context

Use existing `productionElements` backend helpers where possible. Do not create a new parallel element system unless absolutely necessary.

## Phase 5 — continuity/prompt readiness

Add a lightweight readiness score per scene:

```ts
{
  sceneId: number;
  score: number; // 0-100
  warnings: string[];
  missing: string[];
}
```

Suggested scoring:

- +20 description exists
- +15 location exists
- +15 at least one character attached
- +15 character reference image exists
- +10 props or production notes exist
- +10 shot list exists
- +15 visual style / camera context exists

Use this in UI before users spend video credits.

## Phase 6 — Feature registry/navigation

Update `shared/feature-registry.ts` if needed:

- Script-to-Storyboard Wizard
- Production Elements
- Continuity Readiness

Do not expose unfinished routes.

## Phase 7 — Docs/report

Create:

```txt
docs/VIRELLE_V673_STORYBOARD_ELEMENTS_UX_REPORT.md
```

Include:

- files changed
- whether wizard existed or was implemented
- routes/procedures added or repaired
- UX components added
- how existing data is reused
- credit behavior
- build results
- manual QA checklist
- remaining gaps

## Manual QA checklist

1. Open project.
2. Open Script-to-Storyboard wizard.
3. Paste a short 2-scene script.
4. Analyze script.
5. Confirm AI output appears for review before DB writes.
6. Edit one scene and one character.
7. Apply as append.
8. Confirm scenes, characters, locations, props were created/reused correctly.
9. Confirm Production Elements panel shows attached characters/locations/props.
10. Confirm continuity warnings show missing reference images/details.
11. Confirm no expensive video generation was triggered.
12. Confirm logo/opener/watermark untouched.
13. Run `pnpm check` and `pnpm build`.

## Remaining out of scope

Do not build in this pass:

- automatic reference image generation
- video generation from storyboard
- shot-level image generation
- multi-script merge
- full visual storyboard render
- voiceover or soundtrack generation
- subtitles/credits overlay work

## Final verification

Run:

```bash
pnpm check
pnpm build
```

Fix only build/runtime errors. Do not add extra features.
