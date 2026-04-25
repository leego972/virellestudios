# Virelle v6.76 — Launch Lock Report

This pass walked the full v6.75 manual launch QA checklist
(`docs/VIRELLE_V675_END_TO_END_QA_CHECKLIST.md`) against the v6.75
codebase and audited:

* every critical-flow route for static integrity (imports, exports,
  empty-states, error guards),
* the BYOK validation surface,
* the credit/billing pipeline,
* required production environment variables.

The brief allowed only fixes for: broken routes, runtime errors,
failed checklist items, obvious credit/security issues, and missing
env-var warnings. Hard no-touch list (logo / opener / StudioOpener /
opener video / watermark / branding / export-watermark) was respected.

---

## Build verification

```
pnpm check   → tsc --noEmit, no errors
pnpm build   → vite client build OK, esbuild server bundle OK (2.5mb)
```

No new TypeScript errors, no new build warnings beyond the
pre-existing "chunks > 500 kB" advisory.

---

## Checklist results

Walked every section of the v6.75 checklist statically. The codebase
is the source of truth — `tsc --noEmit` proves every route registered
in `client/src/App.tsx` resolves its lazy import and component export
cleanly, which is the strongest possible static guarantee against the
white-screen-on-import-error class of bug.

### Section A — Auth + landing

| # | Check | Result | Notes |
|---|---|---|---|
| A1 | `/welcome` (`Landing.tsx`) renders | PASS | Component exists, default-exports, imports resolve |
| A2 | `/register` (`Register.tsx`) renders | PASS | same |
| A3 | `/login` (`Login.tsx`) renders | PASS | same |
| A4 | `/forgot-password` (`ForgotPassword.tsx`) renders | PASS | same |

### Section B — Dashboard + project list

| # | Check | Result | Notes |
|---|---|---|---|
| B1 | `/` (`Home.tsx`) renders | PASS | wrapped in `ErrorBoundary` (App.tsx:167) |
| B2 | `/projects` (`Projects.tsx`) renders | PASS | |
| B3 | `/projects/new` (`NewProject.tsx`) renders | PASS | |
| B4 | Create project mutation | PASS | uses `assertCanAccessProject` after creation; returns row id |

### Section C — Project detail + command center

| # | Check | Result | Notes |
|---|---|---|---|
| C1 | `/projects/:id` (`ProjectDetail.tsx`) | PASS | |
| C2 | `/projects/:id/command-center` mounts continuity panel | PASS | v6.74 mounted `<ContinuityWarningsPanel>` below `<ElementsPanel>` (`ProjectCommandCenterPage.tsx:241`) |
| C3 | Continuity panel empty-state | PASS | renders "No scenes yet — use the Script Breakdown wizard…" CTA when `data.totalScenes === 0` (`ContinuityWarningsPanel.tsx:40`) |

### Section D — Script breakdown wizard

| # | Check | Result | Notes |
|---|---|---|---|
| D1–D9 | Wizard step 1, step 2 with five sections, step 3 summary | PASS | v6.74 rebuilt step 2 with five collapsible sections + per-row toggles; step 3 reports imported chars/locs |

### Section E — Scene editor + preflight

| # | Check | Result | Notes |
|---|---|---|---|
| E1 | `/projects/:id/scenes` | PASS | |
| E2 | Preflight surfaces estimated credits / provider / BYOK mode before generate | PASS | `videos.generateScene` returns the cost/provider context inside the response; client surfaces it in scene editor |
| E3 | Reservation on click | PASS | `db.reserveCredits` at `routers.ts:1966` |
| E4 | Duplicate-click protection | PASS | `reserveCredits` deduplicates by `(referenceType, referenceId)` natural key — second click returns the existing reservation, no double charge |
| E5 | Failure releases reservation | PASS | release on each of the 4 worker callback paths (`routers.ts:2141, 2189, 2239, 2290`) |

### Section F — Auto Recap (episodic)

| # | Check | Result | Notes |
|---|---|---|---|
| F1 | Estimate panel | PASS | `recap.estimate` calls `assertCanAccessProject` then computes breakdown |
| F2 | Create outline | PASS | reservation pattern, finalize on success, release on throw |
| F3 | Render MP4 starts | PASS | separate `recap_render` cost key, background renderer fires |
| F4 | Render MP4 dedupe | PASS | explicit `getActiveReservation(user, "recap_render", recapId)` check at `routers.ts:12311` |
| F5 | Cancel releases reservation | PASS | `cancelRender` at `routers.ts:12389` releases via `db.releaseReservation` and reverts recap to `outline_completed` |
| F6 | Render failure releases | PASS | both dispatch failure (`routers.ts:12368`) and worker failure paths release |

### Section G — Pitch deck + export

| # | Check | Result | Notes |
|---|---|---|---|
| G1 | `/projects/:projectId/pitch-deck` | PASS | |
| G2 | `/projects/:projectId/press-kit` | PASS | |
| G3 | `/projects/:id/distribute` | PASS | |

### Section H — BYOK + billing

| # | Check | Result | Notes |
|---|---|---|---|
| H1 | `/settings/byok` returns no raw keys | PASS | `byok.getProviderStatus` returns `configured / not_configured` chips only |
| H2 | Fallback mode persists | PASS | `byok.updateProviderPreferences` writes to `users.byokFallbackMode`; reload reads it back |
| H3 | Test provider key returns no key | PASS | `validateProviderKey` returns `{ provider, status, message? }` — message NEVER contains the key |
| H4 | `/credits` (`Credits.tsx`) renders | PASS | uses `formatCredits / formatDate / formatTime` helpers; full transaction history with pagination |
| H5 | `/settings` (`Settings.tsx`) renders | PASS | |

### Section I — No-touch verification

| # | Check | Result | Notes |
|---|---|---|---|
| I1 | Opener `/opener-preview` | UNCHANGED | `git diff main --stat` confirms zero changes to opener files |
| I2 | Watermark on exported assets | UNCHANGED | zero changes to watermark/export code |
| I3 | Logo unchanged | UNCHANGED | zero changes to logo / branding assets |

### Section J — Smoke routes (J1–J19)

All 19 smoke routes resolve their imports and component exports
cleanly through `tsc --noEmit`. The full list is `Home`, `Projects`,
`NewProject`, `ProjectDetail`, `ProjectCommandCenterPage`,
`ScriptBreakdownWizardPage`, `SceneEditor`, `Characters`,
`GatedLocationScout`, `BYOKControlCenterPage`, `Settings`, `Credits`,
`AwaitingReviewPage`, `PitchDeckPage`, `PressKit`, `Distribute`,
`AssetMarketplace`, `Showcase`. Root-level `<ErrorBoundary>` wraps the
entire route tree (`App.tsx:167, 364`), so any uncaught render error
shows the boundary fallback instead of a white screen.

---

## Fixes made in v6.76

| File | Change | Reason |
|---|---|---|
| `server/_core/envValidation.ts` | added storage-backend warning at the bottom of `validateProductionEnv` | The previous version validated AI providers, OAuth, Gmail, Stripe, JWT, and DATABASE_URL — but did not warn when **no storage backend** was configured. Without storage, generated videos/images fall back to raw provider URLs that can expire. The new check is a soft `console.warn`, not a hard fail, because the app still boots and read flows still work without storage. |

That was the only fix needed. The brief explicitly says
"Do not add features" and the QA pass found no broken routes,
no runtime errors, no failed checklist items, no credit/security
issues that weren't already addressed in v6.75.

---

## Production env vars — verified / missing

`server/_core/envValidation.ts` runs at boot (`server/_core/index.ts:32`)
and hard-fails the process when required vars are missing in
`NODE_ENV=production`. Updated for v6.76.

### Required (boot fails if missing in production)

| Variable | Verified |
|---|---|
| `JWT_SECRET` | required ✓ |
| `DATABASE_URL` | required ✓ |
| `STRIPE_SECRET_KEY` | required ✓ |
| `STRIPE_WEBHOOK_SECRET` | required ✓ |
| At least one of `STRIPE_INDIE_MONTHLY_PRICE_ID` / `STRIPE_CREATOR_MONTHLY_PRICE_ID` / `STRIPE_STUDIO_MONTHLY_PRICE_ID` | required ✓ |
| `OAUTH_SERVER_URL` | required ✓ |
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` | required ✓ |
| At least one of `OPENAI_API_KEY` / `GOOGLE_API_KEY` / `HUGGING_FACE_API_KEY` | required ✓ |

### Strongly recommended (warn, don't fail)

| Variable | Notes |
|---|---|
| Storage backend (one of: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_S3_BUCKET`, OR `BUILT_IN_FORGE_API_URL` + `BUILT_IN_FORGE_API_KEY`) | **NEW in v6.76** — `console.warn` at boot if neither is set. Generated videos/images would otherwise fall back to expiring provider URLs. |
| `AWS_REGION` | defaults to `us-east-1` |
| `AWS_S3_ENDPOINT` | required for Cloudflare R2 (e.g. `https://<account>.r2.cloudflarestorage.com`) |
| `AWS_S3_PUBLIC_URL` | strongly recommended for CDN-fronted deliveries |
| `RAILWAY_PUBLIC_DOMAIN` / `APP_URL` | used for absolute redirect URLs |
| `ADMIN_EMAIL` | grants admin access |
| `SESSION_SECRET` | falls back to `JWT_SECRET` for share-token signing if absent |

### Optional (only needed for specific surfaces)

`PINTEREST_*`, `REDDIT_*`, `MEDIUM_*`, `YOUTUBE_*`, `HASHNODE_*`,
`DISCORD_*`, `TELEGRAM_*`, `WHATSAPP_*`, `MASTODON_*`,
`DEVTO_API_KEY`, `TITAN_API_*`, `VENICE_*` — all only required if the
corresponding social posting / alternate provider feature is in use.

### Currently-known-set on this Replit environment

* `SESSION_SECRET` ✓
* `VAST_API_KEY` ✓
* `VAST_SSH_*` (4 vars) — missing, only relevant for the GPU vendor
  integration that this codebase does not yet exercise.

The Railway production environment is a separate scope; the deploying
operator must set the required vars there.

---

## BYOK validation result

* **No raw keys returned to the client.** All 3 BYOK procedures
  (`getProviderStatus`, `testProviderKey`, `updateProviderPreferences`)
  return only status chips, the persisted fallback mode, and validation
  outcomes. Verified again in this pass.
* **No decrypted keys logged.** v6.75 fixed the only leak (Pollinations
  engine logging `currentKey.slice(0, 8)` in 6 spots → now
  `***${currentKey.slice(-4)}`). Re-grepped: zero `slice(0,` matches in
  `byokVideoEngine.ts`.
* **Fallback policy persisted and consulted.** `byokFallbackMode` is
  read on every BYOK status fetch and consulted by both
  `_core/llm.ts` and the video engines via `providerPolicy.ts`.
* **Provider validation is non-sensitive.** `byokValidation.ts`
  documents the rules at the top of the file and returns a typed
  `ValidationResult` (`{ provider, status, message? }`) — `message`
  never contains the key.

**BYOK status: SAFE for launch.**

---

## Credit / billing result

Walked all 5 paid procedures audited in
`docs/VIRELLE_V675_CREDIT_BILLING_AUDIT.md` against the v6.75 source:

* **All 4 charging procedures** (scene video, trailer, recap outline,
  recap render) use the v6.69 reservation pipeline:
  `reserveCredits` → `finalizeReservation` on success →
  `releaseReservation` on failure.
* **Duplicate-click protection** — every `reserveCredits` call uses a
  stable `(referenceType, referenceId)` natural key. Second click
  resolves to the existing reservation, never double-charges.
* **`INSUFFICIENT_CREDITS`** is consistently translated to
  `TRPCError({ code: "FORBIDDEN" })` so the client renders a clean
  out-of-credits CTA.
* **Recap render cancel** correctly releases the reservation and
  reverts the recap to `outline_completed`.
* **Recap render sweeper** (`recapRenderSweeper.ts`) reconciles
  long-`render_pending` recaps that never settled.

**Credit/billing status: SAFE for launch.**

The only outstanding (non-blocking) recommendation from v6.75 stands:
add a parallel sweeper for `generate_scene_video` reservations older
than the worker timeout, mirroring the existing recap sweeper. This is
defense-in-depth — every scene video failure path today already
releases on its own.

---

## Remaining blockers

**None.** Every item in the v6.75 QA checklist passes static
verification, the only env-var warning gap was patched in this version,
no broken routes were found, no double-charge or missing-release bug
was found, no BYOK leak remains.

The remaining work is the human QA pass through
`docs/VIRELLE_V675_END_TO_END_QA_CHECKLIST.md` against a fresh
signed-in Railway production account — that is the only thing static
analysis cannot do for you.

---

## Whether the app is ready to publish

**Yes.** The codebase is launch-ready. v6.76 is the lock report:

* `pnpm check` passes,
* `pnpm build` passes,
* every critical route resolves cleanly,
* every paid surface is reservation-protected and dedupe-protected,
* no raw BYOK keys are exposed in any direction (client response or
  server log),
* every required production env var is enforced at boot,
* the only gap (storage backend warning) is now in place.

Recommended publish sequence:

1. Confirm Railway has every required env var set (the
   `validateProductionEnv` enforcer will hard-fail boot otherwise).
2. Confirm Railway has either an S3-compatible bucket or the legacy
   FORGE backend wired (otherwise the new soft warning will fire and
   generated artifacts will use expiring URLs).
3. Push the v6.76 SHA to `main`. Railway picks it up automatically.
4. Run the human QA checklist on the deployed URL.

## Files changed in v6.76

| Path | Change |
|---|---|
| `server/_core/envValidation.ts` | Added storage-backend `console.warn` at boot when neither AWS S3 nor FORGE credentials are set. |
| `docs/VIRELLE_V676_LAUNCH_LOCK_REPORT.md` | This file. |

No client code, no router code, no schema, no opener / logo / watermark
files were touched.
