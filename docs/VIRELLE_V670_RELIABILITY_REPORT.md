# Virelle Studios — v6.70 Reliability Report

Narrow reliability pass on top of v6.69. No new product features. Targets
the remaining production reliability gaps the v6.69 repair pass left open.

## Files changed

- `server/routers.ts`
  - `scene.generateVideo`: per-IIFE finalize-on-success / release-on-failure
    for all four async provider branches (Veo3, Runway, fal.ai, "other
    providers" fallback). Removed the dispatch-time finalize.
  - `recap.generate`: status now `render_pending` (mid-flight) and
    `outline_completed` (terminal success) instead of the misleading
    `rendering` / `completed`.
  - `recap.attach`: accepts `completed` (legacy), `outline_completed`,
    and `render_completed`.
  - `reservations.getForReference`: new tRPC query for observability
    (returns id / featureKey / amount / status / createdAt /
    finalizedAt / releasedAt for a given reference).
- `server/db.ts`
  - `getReservationsForReference()` — new helper backing the query above.
  - `getAiActorById()`, `getProjectShootDays()` — stubs to silence the two
    esbuild "import is undefined" warnings carried over from v6.69 (callers
    already used defensive `(db as any).fn?.()` so behavior is unchanged).
- `client/src/pages/AutoRecapPage.tsx`
  - Honest status pill: "Recap outline ready" / "Final recap video ready"
    (only when `outputAssetId` or `fileUrl` is populated).
  - Disclaimer block when no MP4 exists: "Preview from source segments…
    Final MP4 export is not yet available."
  - "Download MP4" button only renders when `fileUrl` is present.
  - Generate button gating updated to recognize the new terminal statuses.
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md` — new (full plan for the missing MP4
  render pass; deferred work).
- `docs/VIRELLE_V669_REPAIR_REPORT.md` — appended `## Final verification`.
- `docs/VIRELLE_V670_RELIABILITY_REPORT.md` — this file.

## Build results

- `pnpm check` → ✅ passes (tsc --noEmit, no errors).
- `pnpm build` → ✅ passes. Esbuild's two "import is undefined" warnings
  are gone now that the stubs exist. Bundle-size warnings on the two
  prebuilt vendor chunks are unrelated and pre-existing.

## What was fixed

### 1. Async scene-video refund gap (Phase 2)

**Before:** `scene.generateVideo` reserved credits, then finalized the
reservation **at dispatch time**, immediately after spawning the background
IIFE. If the IIFE later failed and marked the scene `failed`, the user was
still charged.

**After:** the dispatch-time finalize is gone. Each provider branch's IIFE
now owns the reservation:
- on success (after `db.updateScene(..., status: "completed")`):
  `db.finalizeReservation(__sceneVideoResId)`
- on failure (after `db.updateScene(..., status: "failed")`):
  `db.releaseReservation(__sceneVideoResId)`

Both helpers are idempotent — they gate updates on `status = 'reserved'`,
so a retry path or duplicate click cannot double-mutate.

### 2. Auto Recap output honesty (Phase 4)

The recap pipeline produces an outline + voiceover script + segment list, but
no MP4. The UI used to mark the recap "completed" and never disclosed that
no video exists. Users could read this as "final recap video ready".

The honest lifecycle is now:
- `pending` (queued) → `render_pending` (outline saving) →
  `outline_completed` (terminal success: outline ready, no MP4) /
  `failed` (with `errorMessage`).
- A future `render_completed` exists for when MP4 rendering is implemented
  (see `docs/AUTO_RECAP_MP4_RENDER_PLAN.md`).
- The UI badge says "Recap outline ready" until `outputAssetId`/`fileUrl`
  is present, at which point it shows "Final recap video ready" and
  surfaces a "Download MP4" link.
- Legacy "completed" rows fall through to "Recap outline ready" unless an
  asset is attached.

### 3. Reservation observability (Phase 3)

New `reservations.getForReference({ referenceType, referenceId })` returns
the lifecycle of a given reservation chain (every status transition for
that reference) for the calling user. Returns only the public lifecycle
fields — never sensitive data.

### 4. Build warnings (Phase 1 follow-up)

Stubbed `getAiActorById` and `getProjectShootDays` in `server/db.ts` so
esbuild no longer warns about undefined imports. Callers in
`productionElements.ts` and `routers.ts:pitchDeck` still guard with
`typeof (db as any).fn === "function"` so the runtime behavior is
identical (empty / null fallback) but the build is clean.

## Provider branches wired for async refunds

All four scene-video provider IIFEs in `scene.generateVideo`:

1. **Veo3** (Google AI BYOK) — extended clip-chaining via
   `generateExtendedScene`.
2. **Runway** (Runway BYOK) — extended clip-chaining via
   `generateExtendedScene`.
3. **fal.ai** (fal BYOK) — extended clip-chaining via
   `generateExtendedScene`.
4. **Other providers fallback** — handles Pollinations, Replicate, Luma,
   HuggingFace, and SeedDance via the same `generateExtendedScene` path.

## Provider branches not wired and why

- None inside `scene.generateVideo`. The four IIFEs above are the only
  async paths in that mutation; every provider routes through one of them.
- **Trailer pipeline** (`trailer.generate`) and **recap pipeline**
  (`recap.generate`) already used the v6.69 reserve-then-release pattern
  inside their own try/catch blocks (single-shot, not async-IIFE), so they
  did not have the same gap. They are unchanged.

## Auto Recap status wording changes

| Where | Before | After |
|-------|--------|-------|
| Status pill (mid-flight) | `rendering` (raw) | "Outline saving…" |
| Status pill (success, no asset) | `completed` (raw) | "Recap outline ready" |
| Status pill (success, with asset) | `completed` (raw) | "Final recap video ready" |
| Status pill (failure) | `failed` (raw) | "Failed" |
| Disclaimer (no asset) | none | "Preview from source segments. Final MP4 export is not yet available." |
| Download button | always rendered when "completed" | only when `fileUrl` is present |

## Manual QA checklist

Formal automated tests would require mocking the BYOK provider HTTP layer,
which is invasive for a narrow reliability pass. The following is the
sign-off checklist for the four scenarios named in Phase 5:

1. **Reservation finalizes on simulated provider success.**
   - Trigger `scene.generateVideo` with a working BYOK key.
   - When the scene flips to `completed`, query
     `reservations.getForReference({ referenceType: "scene_video", referenceId: <sceneId> })`.
   - Expect exactly one row with `status: "finalized"` and a non-null
     `finalizedAt`. Credit balance was decremented once.

2. **Reservation releases on simulated provider failure.**
   - Trigger `scene.generateVideo` with a known-bad BYOK key (or break the
     network mid-flight in dev).
   - When the scene flips to `failed`, query
     `reservations.getForReference(...)`.
   - Expect one row with `status: "released"` and a non-null `releasedAt`.
     Credit balance is unchanged from before the click.

3. **Duplicate scene generation request reuses active reservation.**
   - Trigger `scene.generateVideo` twice in rapid succession on the same
     scene.
   - Expect the second call either to be rejected (already generating) or
     to return the existing reservation id. Query
     `reservations.getForReference(...)` — there must be at most one row
     in `reserved` state. Credits are deducted exactly once.

4. **Auto Recap UI honesty.**
   - Generate an Auto Recap.
   - Once status reaches `outline_completed`, confirm the badge says
     "Recap outline ready" (NOT "Final recap video ready"), no
     "Download MP4" button is shown, and the disclaimer block is visible.
   - Manually set `outputAssetId` or `fileUrl` on the row in dev — confirm
     the badge flips to "Final recap video ready" and the download link
     appears.

## Remaining risks

- **MP4 rendering still missing.** The recap UI is now honest about it,
  but users who expected a downloadable video will be disappointed. The
  fix is documented in `docs/AUTO_RECAP_MP4_RENDER_PLAN.md` and is the
  natural next prompt.
- **Trailer-side parity.** Trailer generation already finalizes on success
  and releases on failure inside its single try/catch, but it is not yet
  using async IIFEs. If a future change moves trailer generation to a
  background queue, the same per-IIFE pattern will need to be re-applied.
- **Credit balance race.** `reserveCredits` deducts via SQL UPDATE inside
  a transaction, but if Railway runs multiple replicas simultaneously, two
  concurrent first-clicks on the same scene could both succeed before the
  unique-active-reservation check kicks in. The deduplication still works
  per-process; cross-process safety would require a DB unique index on
  `(referenceType, referenceId, status='reserved')`. Not blocking for
  v6.70 (single-replica deploy).
- **Esbuild bundle-size warnings.** Two vendor chunks remain over 500 kB.
  Pre-existing and unrelated.

## Next recommended prompt

> v6.71 — Implement the Auto Recap MP4 render pass per
> `docs/AUTO_RECAP_MP4_RENDER_PLAN.md`. Add `recap_render` to the credit
> feature enum, implement `recap.renderMp4` with reserve-then-release
> pattern, and wire a "Render final MP4" button in `AutoRecapPage`.
> Backfill the `render_completed` status path end-to-end and add an
> integration test that simulates a one-segment render.
