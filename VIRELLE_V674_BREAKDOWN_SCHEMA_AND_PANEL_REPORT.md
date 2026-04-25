# Virelle Studios — v6.74 Breakdown Schema + Continuity Panel Report

This report documents the implementation of **v6.74 — Phase 1‑5** as
specified in `docs/VIRELLE_V674_BREAKDOWN_SCHEMA_AND_PANEL_BRIEF.md`.

---

## Scope

Five phases were implemented end‑to‑end, on top of the v6.71 → v6.73
parity work that was already on `main`:

1. **Phase 1 — Richer breakdown schema in the analyzer.**
   `server/_core/scriptBreakdown.ts` now returns story metadata
   (`title`, `logline`, `genre`, `tone`, `themes`) plus project‑wide
   entities (`characters`, `locations`, `props`) plus per‑scene
   additions (`dialogue`, `props`, `shotSuggestions`, `continuityNotes`).

2. **Phase 2 — Safe normalization + top‑level entity derivation.**
   The analyzer accepts both legacy (`characters: string[]`) and rich
   (`characterNames: string[]` etc.) per‑scene shapes and merges them.
   When the LLM omits the top‑level `characters`/`locations`/`props`
   arrays, the analyzer walks every scene and derives them.

3. **Phase 3 — Apply mutation packs new fields into existing scene
   columns (no new tables).**
   `server/routers.ts → preproduction.applyBreakdownToProject` now
   accepts the rich payload and saves:
   - `props` → `scenes.props` (JSON; already provisioned by autoMigrate)
   - `shotSuggestions` → `scenes.shotList` (JSON; existing column,
     same `{ number, shotType, lens, movement, framing, notes,
     durationSec }` shape used by the structured shot list elsewhere)
   - `continuityNotes` → `scenes.continuityNotes` (TEXT; already
     provisioned by autoMigrate, now also declared in `drizzle/schema.ts`)
   - `dialogue` → `scenes.dialogueText` (existing TEXT column)
   - `productionNotes` keeps the v6.73 "Suggested cast" line and now
     also appends `Props: …` when present.
   Top‑level `characters` and `locations` are now actually created via
   `db.createCharacter` / `db.createLocation` (deduplicated against the
   existing project‑level cast/locations, case‑insensitive).

4. **Phase 4 — Wizard review screen with five sections.**
   `client/src/pages/ScriptBreakdownWizardPage.tsx` step 2 was rebuilt
   into five collapsible sections with per‑row toggles:
   *Story / Characters / Locations / Props / Scenes.* Per‑scene
   sub‑rows surface props, shot suggestions, continuity notes, and the
   condensed dialogue line so the user can spot‑check before approving.
   Deselecting a project‑wide prop or character also strips it from the
   per‑scene payload before the apply mutation is sent.

5. **Phase 5 — Mount `ContinuityWarningsPanel`.**
   `client/src/pages/ProjectCommandCenterPage.tsx` now imports
   `@/components/ContinuityWarningsPanel` and renders it directly below
   the existing `ElementsPanel`, so the workflow reads top‑to‑bottom as
   *what's there → what's missing*.

All five phases passed `pnpm check` and `pnpm build` cleanly.

---

## Files changed

| Path | Change | Notes |
|------|--------|-------|
| `server/_core/scriptBreakdown.ts` | rewritten | Adds rich schema + normalize + entity derivation. Public `analyzeScript` signature unchanged; `BreakdownResult` extended with optional fields; deterministic split also fills the new fields with safe empties. |
| `server/routers.ts` | edit (~12440‑12700) | Extended Zod input for `applyBreakdownToProject`. Added top‑level character/location creation (deduped). Per‑scene save now packs `props`, `shotList`, `continuityNotes`, `dialogueText`. Summary now reports `createdCharacters` / `createdLocations` / failures. |
| `drizzle/schema.ts` | edit (line ~225) | Adds `continuityNotes: text("continuityNotes")` to `scenes` so `InsertScene` accepts it. The DB column is already provisioned by `autoMigrate.ts` (`continuityNotes TEXT NULL`). `props` and `shotList` columns already existed. |
| `client/src/pages/ScriptBreakdownWizardPage.tsx` | rewritten | Step 2 now renders five sections with per‑row toggles. Step 3 summary now reports imported characters/locations alongside reused/new. Apply mutation sends top‑level `characters`/`locations` and rich per‑scene fields. |
| `client/src/pages/ProjectCommandCenterPage.tsx` | edit | Imports and mounts `ContinuityWarningsPanel` below the elements grid. |

---

## Schema — exact storage decisions

Every new field is packed into an **existing scene column** to avoid
new tables and keep this version safely additive:

| Wizard field | Stored on `scenes.` | Type | Provenance |
|---|---|---|---|
| `dialogue` | `dialogueText` | TEXT | existing column (since 0015) |
| `props` | `props` | JSON | existing column (autoMigrate line 1235) |
| `shotSuggestions` | `shotList` | JSON | existing v6.63 column; same `{number, shotType, lens, movement, framing, notes, durationSec}` shape |
| `continuityNotes` | `continuityNotes` | TEXT | autoMigrate line 1067 + now also declared in `drizzle/schema.ts` |
| `characters` (top‑level) | (full row in `characters`) | — | `db.createCharacter` |
| `locations` (top‑level) | (full row in `locations`) | — | `db.createLocation` |

No drizzle‑kit migration was required. The `continuityNotes` column
already exists in production via `autoMigrate.ts`; the schema.ts edit
is purely a TypeScript declaration so `InsertScene` accepts the field.

---

## Backward compatibility

* `analyzeScript`'s **public function signature is unchanged**, only
  the returned object is extended. All new fields are optional / default
  to `null` / `[]`.
* The wizard's `analyzeMut.onSuccess` normalizes every per‑scene field
  with `?? null` / `?? []`, so a v6.73 server (which returns the
  minimal shape) still drives the new UI without crashing.
* The apply Zod input keeps every v6.73 field exactly as it was; the
  v6.74 additions (`dialogue`, `props`, `shotSuggestions`,
  `continuityNotes`, top‑level `characters`/`locations`) are all
  `.optional()`, so older clients calling the mutation continue to work.
* `scenes.shotList` is reused with the same numbered‑object shape that
  the v6.63 production spine already consumes (downstream
  `getProjectScenes` / shot‑list editor consumers are unaffected).

---

## What the apply summary now reports

The mutation response gains four new fields on `summary` (alongside
the existing `reusedCharacters`/`newCharacters`/`reusedLocations`/
`newLocations`/`missingReferences`):

```ts
{
  createdCharacters: string[];           // names actually inserted into characters
  createdLocations: string[];            // names actually inserted into locations
  characterCreateFailures: { name; error }[];  // per‑name failures (non‑fatal)
  locationCreateFailures: { name; error }[];   // per‑name failures (non‑fatal)
}
```

The wizard's step‑3 success card now calls these out individually so
the user knows exactly what was added (vs reused vs still missing).
"Missing references" warnings now also explicitly mention freshly
imported entities so the user knows to attach reference images.

---

## Continuity Warnings Panel placement

`ContinuityWarningsPanel` is dropped into the Command Center directly
below the production elements grid, full width, so the page reads:

```
[ Health cards ]
[ ElementsPanel ][ Quick actions ]
[ ContinuityWarningsPanel  ]      ← v6.74 Phase 4
```

The panel is a pure read (uses the existing
`elements.getProjectReadiness` query) and gracefully degrades when the
project has no scenes yet, prompting the user to run the breakdown
wizard first.

---

## Hard no‑touch list — verified clean

Per the brief, **none** of the following were modified in this
version:

- `client/src/components/StudioOpener.tsx`
- `client/src/components/StudioOpenerLogo.tsx`
- `client/src/components/SiteHead.tsx` *(opener config / brand head)*
- `client/src/assets/branding/*`
- Any export/watermark code path
- Any logo/opener helper

All work is contained inside the script‑breakdown analyzer, the apply
mutation, the script‑breakdown wizard page, the command‑center page,
and a single declaration line in `drizzle/schema.ts`.

---

## Verification

```
pnpm check   →  tsc --noEmit, no errors
pnpm build   →  vite client build OK, esbuild server bundle OK (2.5mb)
```

Manual QA suggestion (per the brief):

1. Open an existing project with a script. Run the breakdown wizard.
2. Confirm step 2 shows five sections with per‑row toggles populated
   from the LLM (or from per‑scene derivation when the LLM is missing).
3. Deselect a prop and confirm it disappears from the per‑scene rows
   that would have used it.
4. Apply in append mode. Confirm:
   - new scenes appear in the project,
   - their `productionNotes` show "Suggested cast: …" and
     "Props: …" lines,
   - their `shotList` is populated with the suggested shots,
   - their `continuityNotes` shows the wizard's continuity text.
5. Confirm any newly imported characters/locations appear in
   `/projects/:id/characters` and `/projects/:id/locations`.
6. Open `/projects/:id/command-center`. Confirm the
   `Continuity Readiness` panel renders below the elements grid and
   surfaces per‑scene warnings.
