# VirElle Studios Pipeline Audit — 2026-06-05

## Scope

This audit checks whether user-facing film-production features are logically connected to the correct production pipeline:

1. Plan
2. Prepare
3. Create
4. Finish / Post-production
5. Release

It also checks route exposure, pipeline continuity, and high-risk areas where a UI feature exists but the backend/export path may not be fully connected.

## Confirmed Good

### A-Z workflow hub exists

`client/src/components/ProjectToolHub.tsx` now exposes a clear production-flow hub:

- Plan
- Prepare
- Create
- Finish
- Release

This is the correct high-level structure for taking a user through a professional film workflow.

### Post-production access exists

The Finish/Post-production section exposes:

- Cutting Room
- Director's Cut
- Visual Effects
- VFX Suite
- Color Grading
- Sound Effects
- Music Score
- Subtitles
- Credits Editor
- NLE Export

This solves the previous access issue where VFX and sound were too hidden.

### Subscription gates exist for major production tools

`client/src/App.tsx` gates many tool pages with `SubscriptionGate`, including:

- Script Writer
- Storyboard
- Credits Editor
- Shot List
- Continuity Check
- Color Grading
- Subtitles
- Sound Effects
- Visual Effects
- Multi-Shot Sequencer
- NLE Export
- VFX Suite
- Live Action Plate
- AI Casting
- Director's Cut
- Trailer Studio
- Music Score

## Issues Found

### P0 — Unreachable routes after catch-all NotFound

In `client/src/App.tsx`, these routes are currently declared after the catch-all `NotFound` route inside the dashboard switch:

```tsx
<Route path="/404" component={NotFound} />
<Route component={NotFound} />
<Route path="/projects/:id/backgrounds" component={BackgroundLibraryPage} />
<Route path="/projects/:id/props" component={PropsLibraryPage} />
<Route path="/projects/:id/narrative" component={NarrativeStructurePage} />
```

The three project routes should be above the catch-all route. Current placement can make them unreachable.

Affected pipeline:

- Plan: Narrative Structure
- Prepare/Create: Backgrounds, Props

Recommended fix:

Move these routes above `/404` and `<Route component={NotFound} />`.

### P1 — Project workflow hub is missing some important pipeline access points

The hub is good, but it does not yet expose all relevant connected tools in the right production stages.

Recommended additions:

#### Plan

- Narrative Structure
- Mood Board
- Script Coverage
- Table Read
- Pitch Deck

#### Prepare

- Wardrobe
- Props Library
- Backgrounds
- Equipment & Props
- Day Out of Days
- Contacts
- Budget Fringes
- Calendar Feed

#### Create

- Continuity Check
- AI Casting
- Collaboration
- Collaborators
- Approval Chain
- Daily Report
- Activity Timeline

#### Finish

- Asset Versions
- Auto Recap

#### Release

- TV Commercial
- Brand Outreach
- Film Comps
- Tax Incentives

This is a UX restructuring issue, not a backend-breaking issue.

### P1 — Accessibility/Auslan pipeline is not fully proven

Confirmed current state:

- Project-level fields exist for `subtitlesEnabled`, `auslanEnabled`, and `auslanPosition`.
- Subtitle management UI exists with AI generation, translation, manual editing, and SRT/VTT export.
- BYOK provider page now surfaces D-ID as the likely provider for sign-language interpreter overlay.

Not yet proven:

- Backend D-ID generation call for an interpreter avatar.
- FFmpeg or equivalent compositor that burns a circular interpreter overlay into exported video.
- Export pipeline enforcement that reads `auslanEnabled` and `auslanPosition` and produces a final accessible MP4.

Recommendation:

Treat subtitles as functional, but treat Auslan interpreter overlay as pending until a server-side export/composite implementation is verified or added.

### P1 — VFX pipeline appears CRUD-connected, but not render-connected

`VisualEffects.tsx` is connected to tRPC procedures:

- `visualEffect.listByProject`
- `visualEffect.presets`
- `visualEffect.create`
- `visualEffect.update`
- `visualEffect.delete`

This means VFX planning/library management is connected.

Not yet proven:

- Whether selected VFX entries are used by scene render, final render, or export pipelines.

Recommendation:

Audit scene generation/export prompts to ensure saved visual effects are injected into rendering prompts.

### P1 — Sound Effects page appears extensive, but actual generation/export integration needs verification

The UI includes preset sounds, ADR/foley concepts, cue labels, reverb options and sound-management controls.

Not yet proven:

- Whether sound cues are mixed into final film export.
- Whether sound effects are attached to scenes and used in NLE export.
- Whether ADR/foley status affects the final project readiness.

Recommendation:

Audit soundEffect/audioCue server procedures and final export pipeline. If missing, add explicit scene-linked sound cue persistence and final export inclusion.

## Recommended Next Patch

Create a safe branch and apply only low-risk routing/UX improvements first:

1. Move Backgrounds / Props / Narrative routes above catch-all NotFound.
2. Expand `ProjectToolHub.tsx` to include missing pipeline tools.
3. Add comments/labels separating pipeline stages in `App.tsx`.
4. Do not touch server export code until export implementation is audited deeper.

## Definition of Done for This Pass

- `pnpm check` passes.
- `pnpm build` passes.
- GitHub CI passes.
- No Railway config changed.
- Project workflow hub exposes all major film-production stages.
- No known user-facing feature is hidden behind a guessed URL.
