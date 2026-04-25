# Script-to-Storyboard Wizard — Spec & Implementation Notes (v6.69)

## Status

**SHIPPED** in v6.69 mega-patch (commit `1c9f2b5`). This document is the
implementation spec/post-build reference for the wizard that already exists
under `client/src/pages/Wizard/ScriptToStoryboard.tsx` and the supporting
`script.breakdown` / `script.applyBreakdown` tRPC routes.

## Goal

Turn a pasted screenplay (or a project's existing script) into a fully
populated **scene list, character list, and location list** in one guided flow,
without forcing the user to type every breakdown by hand.

## Steps

1. **Paste / select script.** The user either pastes a screenplay or picks a
   script already attached to the current project. We never overwrite an
   existing script silently.
2. **Run breakdown.** The wizard calls `script.breakdown` which sends the
   script to the structured-output LLM with a strict JSON schema covering:
   - top-level: `title`, `logline`, `genre`, `tone`, `themes`
   - `scenes[]`: `sceneNumber`, `title`, `description`, `locationDetail`,
     `locationType`, `city`, `country`, `timeOfDay`, `mood`, `dialogueText`,
     `props[]`, `characterNames[]`
   - `characters[]`: `name`, `role`, `description`
   - `locations[]`: `name`, `type`, `city`, `country`, `description`
3. **Review & edit.** The wizard renders an editable preview so the user can
   add/remove scenes, rename characters, and tweak locations before we touch
   the database.
4. **Apply.** `script.applyBreakdown` then writes everything in one atomic
   pass:
   - Reuses any character with the same `name` already on the project
     (case-insensitive).
   - Reuses any location with the same `name` already on the project.
   - Creates scenes in `orderIndex` order, mapping `sceneNumber → orderIndex`.
   - Maps every scene's `characterNames[]` back to character IDs.

## Schema mapping (v6.69 repair-aware)

The `scenes` table has **no** `sceneNumber` column. We persist breakdown
`sceneNumber` into `orderIndex` (1-based in the wizard, 0-based in the DB).
The `characters` table has **no** `referenceImages` column — wizard-generated
characters land with `photoUrl = null` and an empty `attributes` JSON; the user
attaches reference images later from the Casting screen.

## Cost

The wizard reserves credits via `reserveCredits("script_breakdown", …)`
keyed on `(user, script_breakdown, scriptHash)` so re-running the wizard on the
same script in the same minute returns the cached breakdown rather than
double-charging.

## Failure modes

- **LLM returns invalid JSON** → reservation is released, the user sees a
  retry prompt, the script is preserved.
- **applyBreakdown partially succeeds** → the wizard rolls forward (scenes
  already created stay created), shows a toast listing what failed, and lets
  the user retry just the failed rows.
- **User aborts mid-wizard** → reservation is released on unmount.

## Future work (not in v6.69)

- Beat-sheet detection (acts I/II/III) → currently inferred from scene order.
- Automatic reference-image generation per character.
- Multi-script merge (combine two screenplays into one project).
