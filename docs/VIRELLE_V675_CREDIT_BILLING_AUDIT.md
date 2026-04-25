# Virelle v6.75 — Credit / Billing Audit

Audit of every expensive operation that charges credits, with the
billing pattern (sync vs async, immediate vs reservation), failure
behavior, and duplicate-click protection.

The platform standardised on the **reservation pattern** in v6.69
Phase 5:

* `db.reserveCredits(userId, cost, opName, { projectId, referenceType, referenceId })`
  → returns the existing reservation when `(referenceType, referenceId)`
  is already `reserved` for the same user — this is the duplicate-click
  guard.
* `db.finalizeReservation(reservationId)` → settles the deduction.
* `db.releaseReservation(reservationId)` → refunds the user and is
  idempotent (safe to call twice).

`reserveCredits` throws an error containing `INSUFFICIENT_CREDITS`,
which every call site translates into a `tRPC FORBIDDEN` so the client
can render a clean "out of credits" CTA.

---

## Operations covered

| # | Op (procedure) | Cost key | Sync/Async | Billing | Failure refund | Dup-click | Risk |
|---|---|---|---|---|---|---|---|
| 1 | `videos.generateScene` (`server/routers.ts:1966`) | `generate_scene_video` | async (worker callback) | reservation | release on error/worker failure (`routers.ts:2141, 2189, 2239, 2290`) | dedupe via `reserveCredits` keyed `(scene, sceneId)` | low |
| 2 | `videos.generateTrailer` (`server/routers.ts:3621`) | `trailer_gen` | sync (in-handler) | reservation | release on throw (`routers.ts:3771`) | dedupe via `reserveCredits` keyed `(trailer, projectId)` | low |
| 3 | `recap.create` outline (`server/routers.ts:12190`) | `recap` | sync (LLM call inside handler) | reservation | release on throw (`routers.ts:12224` — also clears stale reservation if a previous attempt left one behind) | dedupe via `reserveCredits` keyed `(recap, recapId)` | low |
| 4 | `recap.renderMp4` (`server/routers.ts:12329`) | `recap_render` (default 20) | async (background `renderRecapMp4`) | reservation | release on dispatch failure (`routers.ts:12368`) and on worker failure inside `recapRenderer` | explicit dedupe via `db.getActiveReservation(user, "recap_render", recapId)` (`routers.ts:12311`) | low |
| 5 | `recap.cancelRender` (around `routers.ts:12380+`) | (refund only) | sync | release | release-only path; sets recap back to `outline_completed` | guarded by recap status | low |
| 6 | Script breakdown (`preproduction.applyBreakdownToProject`) | none | sync | not charged | n/a | n/a | n/a — analysis stage doesn't deduct credits in v6.74; the wizard is free, generation is paid |
| 7 | Storyboard / image generation | n/a in tRPC routers | sync | n/a | n/a | n/a | not a separate paid surface in v6.74; image generation is part of scene/trailer flows |
| 8 | Full-film compile / "generateFilm" | not present | n/a | n/a | n/a | n/a | no top-level compile route in v6.74 codebase |

## Per-operation notes

### 1. Scene video generation (`videos.generateScene`)

```ts
// reserve
__sceneVideoResId = await db.reserveCredits(
  ctx.user.id, videoCredits, "generate_scene_video",
  { projectId, referenceType: "scene", referenceId: input.sceneId },
);
```

Four call-sites finalize/release based on the chosen worker path
(direct, async dispatch, async fallback, queue). All four follow the
same pattern:

```ts
try { await db.finalizeReservation(__sceneVideoResId); } catch {}
// ...vs on failure...
try { await db.releaseReservation(__sceneVideoResId); } catch {}
```

A duplicate click while the previous reservation is still `reserved`
returns the same reservation row (and the same id), so the user is
charged once — even if the second click also fires the worker, the
finalize/release still resolves to the same row.

### 2. Trailer generation

Sync — the entire body is wrapped in a try/catch that releases on any
throw. Lower latency than scene because trailer compilation is a single
ffmpeg pass over already-rendered scene clips.

### 3. Recap outline (`recap.create`)

LLM call wrapped in try/catch with a stale-reservation cleanup at the
top so a previously-failed run cannot keep the user at a blocked
state.

### 4. Recap MP4 render (`recap.renderMp4`)

Most defensive of the four: explicit `getActiveReservation` lookup
before reserving, a separate cost key (`recap_render`), and the
background renderer (`recapRenderer.ts`) finalizes on success and
releases on its own internal failure.

### 5. Recap render cancel

Pure release; flips recap status back to `outline_completed`. The
sweeper (`recapRenderSweeper.ts`) periodically reconciles
long-`render_pending` recaps that never settled and releases their
reservations too.

---

## Findings

* **No double-charge risk found.** All four `reserveCredits` call
  sites are keyed by a stable `(referenceType, referenceId)` pair, so
  duplicate clicks always resolve to the same reservation row.
* **No missing release path found.** Every reservation has a paired
  release on the failure branch (or a sweeper that reconciles stale
  rows for the async render).
* **No missing finalize path found.** Every reservation has a paired
  finalize on the success branch.
* **`INSUFFICIENT_CREDITS` is consistently mapped** to
  `TRPCError({ code: "FORBIDDEN" })` across all four call sites.
* **No `db.deductCredits` direct call found** outside of
  `reserveCredits` / `finalizeReservation` — meaning every paid op
  goes through the reservation pipeline.

## Recommendations (non-blocking)

* The `recap_render` background worker (`recapRenderer.ts`) and the
  scene video worker callbacks rely on `try { … } catch {}` around the
  finalize/release pair. These swallow errors silently — if the DB is
  briefly unavailable, the reservation could end up "reserved" forever.
  The existing `recapRenderSweeper.ts` already mitigates this for
  recaps; consider adding a parallel sweeper for `generate_scene_video`
  reservations older than the worker timeout.
* `CREDIT_COSTS.recap_render?.cost ?? 20` (`routers.ts:12326`) hard-codes
  a fallback. Once `subscription.ts` has a guaranteed entry, the `?? 20`
  can be removed for clarity.

## No fixes required this version

The brief allows fixing only "obvious missing release/finalize bugs".
None were found, so no code changes were made for Phase 4.
