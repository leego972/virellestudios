# Virelle v6.75 — End-to-End QA Checklist

Manual QA pass for the full premium film-production flow. Run through
top-to-bottom on a fresh signed-in account before publishing each
production build. Tick `[x]` when verified.

## Conventions

* **Route** = the wouter path the page is mounted on.
* **Expected** = visible signal that the page rendered without
  white-screen and the primary action works.
* **Pass / Fail** = leave blank; QA tester ticks it.
* **Notes** = optional context (browser, account tier, screenshots).

---

## A. Auth + landing

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| A1 | Visit landing as signed-out user | `/welcome` | Landing renders, "Sign in" + "Get started" CTAs visible | [ ] |  |
| A2 | Register new account | `/register` | Form submits, user is signed in and lands on `/` | [ ] |  |
| A3 | Sign in with existing account | `/login` | Form submits, redirects to `/` | [ ] |  |
| A4 | Forgot password | `/forgot-password` | Form submits, success state shown | [ ] |  |

## B. Dashboard + project list

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| B1 | Open dashboard as signed-in user | `/` | Dashboard renders, no white-screen, no console errors | [ ] |  |
| B2 | Open project list | `/projects` | Project list renders (or shows empty-state CTA) | [ ] |  |
| B3 | Open new project page | `/projects/new` | Project-creation form renders | [ ] |  |
| B4 | Create new project (Film, Episodic, or Series) | `/projects/new` → `/projects/:id` | Project is persisted, redirects to detail page | [ ] |  |

## C. Project detail + command center

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| C1 | Open project detail | `/projects/:id` | Project header + tabs render | [ ] |  |
| C2 | Open command center | `/projects/:id/command-center` | Health cards, Elements panel, Quick actions, **Continuity Warnings** panel all render in order | [ ] |  |
| C3 | Continuity Warnings panel renders even on a fresh project with no scenes | `/projects/:id/command-center` | Empty-state copy ("Run the breakdown first…") shown — no white-screen | [ ] |  |

## D. Script breakdown wizard (v6.74 surface)

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| D1 | Open wizard from Quick actions | `/projects/:projectId/script-breakdown` | Step 1 (paste script) renders | [ ] |  |
| D2 | Paste a short script and submit | (same) | Step 2 review screen renders **before** any DB writes | [ ] |  |
| D3 | Step 2 shows five sections | (same) | *Story / Characters / Locations / Props / Scenes* sections render with per-row toggles | [ ] |  |
| D4 | Per-scene rows surface props, shot suggestions, continuity notes, dialogue snippet | (same) | All rich fields visible | [ ] |  |
| D5 | Deselect a top-level prop | (same) | Prop disappears from per-scene rows that referenced it | [ ] |  |
| D6 | Apply in **Append** mode | step 3 | Success card lists imported characters, locations, scene count | [ ] |  |
| D7 | Verify on `/projects/:id/characters` | `/characters` (or per-project) | New characters visible | [ ] |  |
| D8 | Verify on `/projects/:id/locations` | `/projects/:id/locations` | New locations visible | [ ] |  |
| D9 | Verify continuity panel updates after apply | `/projects/:id/command-center` | Per-scene warnings reflect newly imported entities | [ ] |  |

## E. Scene editor + production elements

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| E1 | Open scene editor | `/projects/:id/scenes` | List of scenes renders | [ ] |  |
| E2 | Open a scene's detail/preflight | (same) | Estimated credits, provider, BYOK mode visible BEFORE the user clicks generate | [ ] |  |
| E3 | Click generate once | (same) | Reservation is created, button switches to a busy state | [ ] |  |
| E4 | Click generate twice rapidly | (same) | The second click is a no-op or returns the existing reservation — **no double charge** | [ ] |  |
| E5 | Force a generation failure (e.g. invalid prompt or simulated provider error) | (same) | Reservation is **released**; balance returns to pre-click value | [ ] |  |

## F. Auto Recap (episodic)

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| F1 | Open recap surface for an episodic project | (recap UI) | Estimate panel shows breakdown + cost | [ ] |  |
| F2 | Click "Create outline" | (recap UI) | Outline persists; status flips to `outline_completed` | [ ] |  |
| F3 | Click "Render MP4" | (recap UI) | Render flips to `render_pending`; reservation is created | [ ] |  |
| F4 | Click "Render MP4" twice rapidly | (recap UI) | Second click returns the existing reservation — **no double charge** | [ ] |  |
| F5 | Cancel an in-flight render | (recap UI) | Reservation is **released**; recap reverts to `outline_completed` | [ ] |  |
| F6 | Render fails (no ffmpeg / no storage / mock failure) | (recap UI) | Reservation is **released**; recap shows clear error message | [ ] |  |

## G. Pitch deck + export

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| G1 | Open pitch deck | `/projects/:projectId/pitch-deck` | Deck renders with project data | [ ] |  |
| G2 | Open press kit | `/projects/:projectId/press-kit` | Press kit renders | [ ] |  |
| G3 | Open distribute / export readiness | `/projects/:id/distribute` | Export readiness checklist renders | [ ] |  |

## H. BYOK + billing

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| H1 | Open BYOK control center | `/settings/byok` | Provider list renders with `configured` / `not_configured` chips, **never** showing the raw key | [ ] |  |
| H2 | Save a fallback mode | (same) | `byokFallbackMode` persists across reload | [ ] |  |
| H3 | Test provider key | (same) | Returns `valid` / `invalid` / `unknown` — **never** echoes the key string | [ ] |  |
| H4 | Open billing/credits page | `/credits` | Current balance + recent transactions render | [ ] |  |
| H5 | Open settings | `/settings` | Settings render; saved values persist | [ ] |  |

## I. No-touch verification

| # | Step | Route | Expected | Pass | Notes |
|---|---|---|---|---|---|
| I1 | Open the opener video | `/opener-preview` | Opener plays, exact same asset/branding as v6.74 | [ ] |  |
| I2 | Watermark on a generated/exported asset | (any export surface) | Watermark placement and styling are unchanged from v6.74 | [ ] |  |
| I3 | Logo on landing/dashboard | `/`, `/welcome` | Logo unchanged | [ ] |  |

## J. Smoke routes (rapid white-screen pass)

Visit each of the following while signed in. **Pass** = page renders
without white-screen and without uncaught console errors. The list
mirrors the high-traffic routes registered in `client/src/App.tsx`.

| # | Route | Pass |
|---|---|---|
| J1 | `/` | [ ] |
| J2 | `/dashboard` | [ ] |
| J3 | `/projects` | [ ] |
| J4 | `/projects/new` | [ ] |
| J5 | `/projects/:id` (any project) | [ ] |
| J6 | `/projects/:id/command-center` | [ ] |
| J7 | `/projects/:projectId/script-breakdown` | [ ] |
| J8 | `/projects/:id/scenes` | [ ] |
| J9 | `/characters` | [ ] |
| J10 | `/projects/:id/locations` | [ ] |
| J11 | `/settings/byok` | [ ] |
| J12 | `/settings` | [ ] |
| J13 | `/credits` | [ ] |
| J14 | `/awaiting-review` | [ ] |
| J15 | `/projects/:projectId/pitch-deck` | [ ] |
| J16 | `/projects/:projectId/press-kit` | [ ] |
| J17 | `/projects/:id/distribute` | [ ] |
| J18 | `/marketplace` | [ ] |
| J19 | `/showcase` | [ ] |

---

## Sign-off

* QA tester: ____________________
* Date: ____________________
* Build SHA: ____________________
* Result: [ ] PASS  [ ] PASS w/ notes  [ ] FAIL
* Notes: ____________________
