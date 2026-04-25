# Virelle v6.75 — Launch QA + Production Hardening Brief

v6.74 closed the major workflow gap: rich script breakdown schema + Continuity panel mounted into the project workflow.

v6.75 is not a feature-building pass. It is a launch-readiness pass to make sure the platform is reliable, testable, and commercially safe before more expansion.

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

Verify the complete premium film-production flow end to end:

```txt
create project → script breakdown → production elements/readiness → scene generation preflight → review/approval → auto recap → export/pitch deliverables
```

Fix only issues found during QA. Do not add new product features unless required to make an existing flow usable.

## Phase 1 — Build verification

Run:

```bash
pnpm check
pnpm build
```

If either fails, fix only build errors first.

## Phase 2 — Route smoke audit

Audit the main user-facing routes and make sure they do not white-screen:

- dashboard/home
- project list
- project detail
- project command center
- script breakdown wizard
- scene editor
- characters
- locations
- production elements / continuity readiness
- BYOK control center
- Auto Recap
- Auto Recap MP4 render status
- pitch deck
- export/NLE page if present
- billing/credits page
- settings/API keys page

For each broken route:

- fix import/path/runtime error,
- do not redesign the page,
- do not touch branding/opener/watermark.

## Phase 3 — End-to-end workflow checklist page/doc

Create:

```txt
docs/VIRELLE_V675_END_TO_END_QA_CHECKLIST.md
```

Include a manual QA table with:

- workflow step
- route/page
- expected result
- pass/fail checkbox
- notes

Minimum flows to include:

1. New user / signed-in user can see dashboard.
2. User can create project.
3. User can paste script into Script-to-Storyboard.
4. AI breakdown appears for review before DB writes.
5. Apply breakdown creates/reuses characters, locations, props, scenes.
6. Command Center shows continuity/readiness warnings.
7. Scene generation preflight shows estimated credits/provider/BYOK mode.
8. Scene generation cannot double-charge on duplicate click.
9. Failed async generation releases reservation.
10. Auto Recap outline can be generated for episodic projects.
11. Auto Recap MP4 render can be started or fails safely if ffmpeg/storage unavailable.
12. Auto Recap cancel releases reservation.
13. Pitch Deck loads with project data.
14. Export readiness checklist loads.
15. BYOK settings do not expose raw keys.
16. Billing/credits page shows current balance/transactions.
17. Logo/opener/watermark remain unchanged.

## Phase 4 — Credit/billing audit

Audit expensive operations for one of these patterns:

- cheap sync operation: immediate deduction is acceptable,
- async/heavy operation: reserve → finalize on success → release on failure.

Review at least:

- scene video generation
- trailer generation
- Auto Recap outline
- Auto Recap MP4 render
- full film generation / film compile if present
- script breakdown if it charges credits
- storyboard/image generation if present

Create/append:

```txt
docs/VIRELLE_V675_CREDIT_BILLING_AUDIT.md
```

For each operation record:

- route/procedure name
- cost key
- sync or async
- immediate or reservation billing
- failure refund behavior
- duplicate-click protection
- remaining risk

Fix obvious missing release/finalize bugs only if low-risk.

## Phase 5 — BYOK/security audit

Verify:

- raw API keys are never returned to client,
- decrypted keys are not logged,
- provider validation status is non-sensitive,
- fallback mode is persisted,
- fallback from BYOK to credits requires the saved policy,
- project ownership is enforced on project/scene/recap routes,
- admin-only procedures use admin middleware.

Create/append:

```txt
docs/VIRELLE_V675_SECURITY_BYOK_AUDIT.md
```

Fix obvious leaks or missing ownership checks only.

## Phase 6 — Error/empty state polish

For core production pages only, make sure users see useful messages for:

- no project
- no script
- no scenes
- no characters
- no locations
- no credits
- insufficient credits
- missing BYOK key
- provider validation failed
- render failed
- export not ready

Do not redesign UI. Add concise copy and guards only.

## Phase 7 — Final launch report

Create:

```txt
docs/VIRELLE_V675_LAUNCH_QA_REPORT.md
```

Include:

- files changed
- build results
- routes smoke-tested
- credit/billing audit summary
- BYOK/security audit summary
- manual QA checklist location
- remaining blockers
- recommended final pass
- product readiness score estimate

## Final verification

Run:

```bash
pnpm check
pnpm build
```

Do not run expensive real provider generations unless using a tiny/dev-only test asset.

## Acceptance criteria

- `pnpm check` passes.
- `pnpm build` passes.
- QA checklist document exists.
- credit/billing audit exists.
- BYOK/security audit exists.
- launch QA report exists.
- no logo/opener/watermark files changed.
- no major user-facing route white-screens.
- no raw BYOK secrets exposed.
- expensive async flows have documented billing behavior.
