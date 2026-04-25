# Virelle v6.74 — Script Breakdown Schema + Continuity Panel Mount Brief

v6.73 polished the existing wizard and added readiness scoring + `ContinuityWarningsPanel`, but its own report left two important gaps:

1. `analyzeScriptForBreakdown` still returns mostly per-scene character strings; it does not emit rich top-level characters, locations, props, title, logline, genre, tone, or themes.
2. `ContinuityWarningsPanel` exists but is not yet mounted into the Command Center / project workflow.

v6.74 should close those two gaps without touching branding, opener, or watermark assets.

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

## Goal

Make Script-to-Storyboard feel more premium and complete:

```txt
script → rich structured breakdown → top-level characters/locations/props → editable review → apply → readiness panel visible in project Command Center
```

## Phase 1 — Verify current build

Run:

```bash
pnpm check
pnpm build
```

If either fails, fix build errors only before implementing.

## Phase 2 — Extend script breakdown output schema

Find the existing route:

```txt
preproduction.analyzeScriptForBreakdown
```

Do not rename the route.

Extend its LLM prompt/schema to return:

```ts
{
  title?: string;
  logline?: string;
  genre?: string;
  tone?: string;
  themes?: string[];
  characters: Array<{
    name: string;
    role?: string;
    description?: string;
    referenceNeeds?: string[];
  }>;
  locations: Array<{
    name: string;
    type?: string;
    city?: string;
    country?: string;
    description?: string;
    referenceNeeds?: string[];
  }>;
  props: Array<{
    name: string;
    description?: string;
    importance?: "low" | "medium" | "high";
  }>;
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

- Keep backwards compatibility with the old response shape.
- If the LLM still returns old shape, normalize it into the new shape.
- If scene entries use `characters` instead of `characterNames`, map it safely.
- If top-level characters are missing, derive them from all scene character names.
- If top-level locations are missing, derive them from scene location fields.
- If top-level props are missing, derive them from scene props.
- Validate arrays. Never let malformed AI JSON crash the wizard.
- Do not auto-generate images/video.

## Phase 3 — Update applyBreakdownToProject

Extend the existing apply logic so top-level entities are used:

- Reuse/create characters from `breakdown.characters`.
- Reuse/create locations from `breakdown.locations`.
- Save props into scene `props` JSON.
- Save `shotSuggestions` into scene `shotList` JSON.
- Save `continuityNotes` into `productionNotes` or another existing note field if no dedicated field exists.
- Preserve v6.73 append/replace mode and confirmReplace guard.
- Preserve reused/new/missingReferences summary.

Do not create new tables unless absolutely necessary.

## Phase 4 — Wizard review UI

Update `ScriptBreakdownWizardPage.tsx` so the review screen shows separate sections:

1. Project summary
   - title
   - logline
   - genre
   - tone
   - themes

2. Characters
   - name
   - role
   - description
   - reference needs

3. Locations
   - name
   - type
   - city/country
   - description
   - reference needs

4. Props
   - name
   - description
   - importance

5. Scenes
   - order
   - title
   - description
   - location
   - characters
   - props
   - shot suggestions

Do not build a full inline database editor. Keep it a review/edit-light screen.

Required UX:

- user sees all major entities before DB writes
- append remains default
- replace remains guarded by confirm
- show clear warning that no video/image generation happens from this step

## Phase 5 — Mount ContinuityWarningsPanel

`ContinuityWarningsPanel.tsx` exists from v6.73. Mount it into the most appropriate existing page:

Preferred:

```txt
Project Command Center page
```

Alternative if Command Center layout is risky:

```txt
Project detail production/overview area
```

Rules:

- Do not disrupt existing layout.
- Place it near ElementsPanel or project health/readiness area.
- It must be visible after applying script breakdown.
- It must use `elements.getProjectReadiness`.
- Empty state must be clean when project has no scenes.

## Phase 6 — Feature registry / navigation check

Confirm these entries exist and route correctly:

- Script Breakdown / Script-to-Storyboard
- Continuity Readiness
- Production Elements if surfaced

Do not expose broken links.

## Phase 7 — Report

Create:

```txt
docs/VIRELLE_V674_BREAKDOWN_SCHEMA_AND_PANEL_REPORT.md
```

Include:

- files changed
- schema changes to AI response
- normalization/backwards compatibility behavior
- where ContinuityWarningsPanel was mounted
- whether routes were renamed or kept
- build results
- manual QA checklist
- remaining gaps

## Manual QA checklist

1. Open Script-to-Storyboard wizard.
2. Paste a short script with 2 scenes, 2 characters, 1 location, and 2 props.
3. Analyze script.
4. Confirm review shows top-level project summary, characters, locations, props, scenes, and shot suggestions.
5. Apply in append mode.
6. Confirm characters/locations/scenes are created or reused correctly.
7. Confirm scene `props` and `shotList` are saved.
8. Open Command Center / project overview.
9. Confirm ContinuityWarningsPanel is visible and shows readiness warnings.
10. Confirm no video/image generation happened.
11. Confirm no logo/opener/watermark files changed.
12. Run `pnpm check` and `pnpm build`.

## Out of scope

Do not build:

- automatic reference image generation
- storyboard image generation
- video generation
- multi-script merge
- full inline entity editor
- subtitle/credit overlay work
- voiceover/soundtrack generation

## Final verification

Run:

```bash
pnpm check
pnpm build
```

Fix only build/runtime errors. Do not add extra features.
