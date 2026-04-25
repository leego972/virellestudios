# Virelle Studios — v6.69 Competitive Upgrade Report

**Release:** v6.69
**Branch:** main (Railway deploy via `git push`)
**Theme:** Close the remaining gaps from v6.68's deferred phases. Specifically:
script-to-storyboard breakdown wizard, persistent BYOK fallback policy with
real cheap-call validation, and a cross-project review queue.

---

## 1. What shipped

### 1.1 Script-to-Storyboard Breakdown (Phase 3)
- **New module:** `server/_core/scriptBreakdown.ts` — analyzes a raw script
  using the user's preferred LLM (BYOK respected) and proposes scenes.
  Includes a deterministic regex/heading-based fallback so the wizard works
  even if no LLM is reachable.
- **New procedures:**
  `preproduction.analyzeScriptForBreakdown` (no writes — returns proposal)
  and `preproduction.applyBreakdownToProject` (creates scenes only after the
  user has approved them).
- **New page:** `client/src/pages/ScriptBreakdownWizardPage.tsx` — paste a
  script, review the proposed scene list, and one-click create them.
- **Route:** `/projects/:projectId/script-breakdown`.

### 1.2 BYOK validation + persistent fallback policy (Phase 5)
- **New module:** `server/_core/byokValidation.ts` — performs a true
  cheapest-call ping for OpenAI, Anthropic, ElevenLabs, Replicate and fal.
  Never returns the key string under any circumstance.
- **`byok.testProviderKey`** now uses the live validator instead of a
  shape-only check.
- **`users.byokFallbackMode`** column added (default `byok-with-fallback`)
  via `drizzle/0026_byok_fallback_mode_v669.sql`. The user's choice from
  the BYOK Control Center is now persisted across sessions.

### 1.3 Cross-project review queue (Phase 8)
- **New procedure:** `review.listAwaiting` — surfaces every scene across
  the user's projects whose `approvalStatus = 'pending_review'`, ordered by
  most recently updated.
- **New page:** `client/src/pages/AwaitingReviewPage.tsx` — global inbox
  for things waiting on the user's approval.
- **Route:** `/awaiting-review`.

### 1.4 Project Command Center additions
- The Production Elements panel now renders inside the Command Center.
- Quick-action card with one-click jumps to:
  - Script-to-Scene Breakdown
  - Pitch Deck
  - Awaiting Review

### 1.5 Owner audit
- **New script:** `scripts/owner_audit.ts` — read-only summary of every
  user's BYOK status, plan tier, project count and credit balance. Useful
  for monthly health checks without pulling the production DB into a
  spreadsheet.

### 1.6 Feature registry
- `script-breakdown` and `awaiting-review` added to
  `shared/feature-registry.ts` so the mobile app picks them up
  automatically (web-view fallback until native components exist).

---

## 2. Where v6.69 puts us vs the field

| Capability | StudioBinder | Celtx | Frame.io | Yamdu | ShotGrid | Movie Magic | Final Draft | Virelle v6.69 |
|---|---|---|---|---|---|---|---|---|
| Script breakdown | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | **✓ + AI-proposed, user-approved** |
| Production elements (consistency) | partial | partial | — | partial | ✓ | partial | — | **✓** |
| BYOK with live key validation | — | — | — | — | — | — | — | **✓** |
| Cross-project review inbox | partial | — | ✓ | partial | ✓ | — | — | **✓** |
| Pitch deck builder | — | partial | — | — | — | — | — | **✓** |
| Project command center | partial | — | — | partial | partial | — | — | **✓** |

Every gap called out in the v6.68 deferred-phase list now has a shipped
surface in v6.69.

---

## 3. Files changed

**New:**
- `server/_core/scriptBreakdown.ts`
- `server/_core/byokValidation.ts`
- `drizzle/0026_byok_fallback_mode_v669.sql`
- `scripts/owner_audit.ts`
- `client/src/components/ElementsPanel.tsx`
- `client/src/components/SceneElementTags.tsx`
- `client/src/pages/ScriptBreakdownWizardPage.tsx`
- `client/src/pages/AwaitingReviewPage.tsx`
- `docs/REPLIT_COMPETITIVE_UPGRADE_REPORT_V669.md`

**Edited:**
- `drizzle/schema.ts` (+`byokFallbackMode` on `users`)
- `server/routers.ts` (+`preproduction` router, +`review.listAwaiting`,
  live BYOK validation, persistent fallback mode)
- `client/src/App.tsx` (+2 lazy routes)
- `client/src/pages/ProjectCommandCenterPage.tsx` (+ElementsPanel + quick
  actions)
- `shared/feature-registry.ts` (+2 entries)

---

## 4. Verification

- `pnpm check` — passes.
- `pnpm build` — see release notes for the build hash.
- Migration `0026_byok_fallback_mode_v669.sql` is additive (column with a
  default), safe to apply on prod without downtime.
- All new procedures are user-scoped and project-owner gated.
- BYOK validator never logs or returns the decrypted key.

---

## 5. What's deferred to v6.70+

- Native mobile component for the script-breakdown wizard (currently
  WebView fallback).
- Bulk approve / bulk reject inside the Awaiting Review queue.
- Smart cast suggestions during breakdown (link `characters` proposals to
  the talent table when a name match exists).
- Background job runner for very long scripts (>50k chars) so the wizard
  call returns immediately and progress streams in.
