# Virelle Studios — v6.72 Auto Recap Render Hardening Report

Implements the v6.72 brief: harden the v6.71 Auto Recap MP4 renderer so
abandoned `render_pending` recaps cannot trap users or trap credits.

## Files changed

- `server/_core/recapRenderSweeper.ts` — **new**. Exports
  `sweepStuckRecapRenders({ olderThanMinutes, dryRun })`. Finds recaps
  with `status="render_pending"` whose `updatedAt` is older than the
  threshold (default 30 min), looks up the matching `creditReservations`
  row by `(referenceType="recap_render", referenceId=recap.id)`, and
  either dry-run reports or actually releases the reservation + reverts
  the recap to `outline_completed` with a clear `errorMessage`. Per-row
  failures are isolated so one bad row never aborts the whole sweep. No
  DB? Logs a warning and returns a no-op result.
- `server/_core/index.ts` — adds a one-shot boot sweep inside the
  `server.listen` callback. Fires 10 seconds after boot, with a 60-minute
  threshold. Failure is swallowed (logged) so the sweep can never crash
  the API process.
- `server/routers.ts`
  - `recap.cancelRender` (new, `protectedProcedure`): user-facing cancel
    for the current user's own recap. Validates ownership, requires
    `status="render_pending"`, releases the active reservation if any,
    then reverts to `outline_completed` with
    `"Render cancelled by user. Credits were released; you can retry the render."`
    Logs activity. Idempotent against the worker: if the late renderer
    finishes after cancel it will find an already-released reservation
    (release/finalize are gated on `status="reserved"`) so nothing
    misbehaves.
  - `recap.sweepStuckRenders` (new, `adminProcedure`): admin-only
    diagnostic. Wraps `sweepStuckRecapRenders` with
    `{ olderThanMinutes, dryRun }` inputs. Returns the full
    `SweeperResult` so the caller can see exactly which recaps were
    touched.
- `client/src/pages/AutoRecapPage.tsx`
  - Wires `trpc.recap.cancelRender`.
  - Adds a "Cancel render" button beneath the "Rendering MP4…" indicator
    (only visible when `status="render_pending"`). Confirms via
    `window.confirm` before firing. Surfaces mutation errors. The render
    button stays in place above so retry is one click away once the
    recap flips back to `outline_completed`.
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md` — unchanged in this pass (already
  marked SHIPPED in v6.71).
- `docs/VIRELLE_V672_RECAP_RENDER_HARDENING_REPORT.md` — this file.

## Sweeper behavior

```ts
sweepStuckRecapRenders({ olderThanMinutes?: number; dryRun?: boolean })
  → {
    checked: number,           // how many stuck rows matched the cutoff
    repaired: number,          // how many rows were actually reverted
    dryRun: boolean,
    items: Array<{
      recapId,
      reservationId,           // most recent reservation for this recap (if any)
      previousStatus,          // always "render_pending" for matched rows
      action: "would_release" | "released" | "skipped",
      reason: string,
    }>
  }
```

Per-row safety:

- **never** touches `render_completed`, `outline_completed`, `pending`,
  or `failed` recaps,
- **never** deletes `recapSegments` rows,
- **never** deletes the source movies the recap was cut from,
- **never** clears `outline`, `voiceoverScript`, `fileKey`, or `fileUrl`
  (so an already-uploaded MP4 from a finalize-race is preserved),
- **never** double-releases a reservation that is already `finalized` or
  `released` — the dry-run report says "current: finalized" so you can
  see the actual state, and the real run only calls `releaseReservation`
  when status is still `reserved`.

## Default timeout threshold

- **Sweeper default:** `olderThanMinutes = 30`.
- **Boot sweep:** `olderThanMinutes = 60` (more conservative — anything
  younger than 60 min is probably a healthy in-flight render on a sibling
  worker we don't know about).

Both can be overridden by the admin `recap.sweepStuckRenders` call.

## Cancel behavior

`recap.cancelRender({ recapId })`:

1. Loads the recap and validates ownership.
2. Throws `BAD_REQUEST` unless `status === "render_pending"` (so the user
   cannot cancel an outline that is already settled).
3. Finds the active reservation via
   `db.getActiveReservation(userId, "recap_render", recapId)` and
   releases it. Lookup or release errors are logged but do not block the
   status revert.
4. Updates the recap to `status="outline_completed"`,
   `errorMessage="Render cancelled by user. Credits were released; you can retry the render."`
5. Logs `recap.cancelRender` to the activity feed with the recap id and
   the released reservation id.

Race with the late-finishing renderer:

- If `renderRecapMp4` succeeds *after* a cancel, it tries to write
  `status="render_completed"` + `fileUrl` and call `finalizeReservation`.
  The status write succeeds (the user can choose to attach), but
  `finalizeReservation` is gated on `status="reserved"` so the second
  call is a no-op and the user is *not* re-charged.
- If `renderRecapMp4` fails after a cancel, its safeFail path tries to
  release the (already-released) reservation — same gate, same no-op.

## Boot sweep

**Enabled.** Inside the `server.listen` callback in
`server/_core/index.ts`, scheduled via `setTimeout(..., 10_000).unref()`
so it fires once 10 seconds after the server starts accepting traffic.
Threshold is 60 minutes. The promise is wrapped in try/catch so a sweep
failure can never crash the boot path.

Output:

```
[recapSweeper] Boot sweep scheduled (in 10s, threshold=60m)
[recapSweeper] checked=N repaired=M dryRun=false threshold=60m   (only if N > 0)
[recapSweeper] boot sweep: checked=N repaired=M                  (only if N > 0)
```

Quiet by design when there is nothing to repair.

## Admin diagnostic route

`recap.sweepStuckRenders` (`adminProcedure`).

Input:

```ts
{ olderThanMinutes?: number; dryRun?: boolean }
```

Output: full `SweeperResult` (see "Sweeper behavior" above).

Typical use from a tRPC client:

```ts
// dry run with default 30-min threshold
await trpc.recap.sweepStuckRenders.mutate({ dryRun: true });

// real run, only act on recaps stuck for > 2 hours
await trpc.recap.sweepStuckRenders.mutate({ olderThanMinutes: 120 });
```

Non-admin users get `UNAUTHORIZED` from the procedure middleware. Normal
users use `recap.cancelRender` to recover their own stuck recaps.

## Build results

- `pnpm check` — ✅ passes (`tsc --noEmit`, no errors).
- `pnpm build` — ✅ passes. Bundle-size warnings on prebuilt vendor
  chunks are pre-existing and unrelated.

## Manual QA checklist

1. **Stale state simulation.** From a SQL console:
   ```sql
   UPDATE recaps SET status='render_pending', updatedAt=NOW() - INTERVAL '2 hours' WHERE id = <recapId>;
   ```
2. **Dry-run sweep.** Call (admin):
   ```ts
   trpc.recap.sweepStuckRenders.mutate({ dryRun: true })
   ```
   Confirm the result reports `would_release` for the recap and that no
   row was mutated (recap status still `render_pending`, reservation row
   unchanged).
3. **Real sweep.** Call:
   ```ts
   trpc.recap.sweepStuckRenders.mutate({})
   ```
   Confirm:
   - recap row → `status="outline_completed"`, `errorMessage` populated,
   - reservation row → `status="released"`, `releasedAt` set,
   - user's `creditBalance` is back to its pre-render value,
   - the recap's `outline`, `voiceoverScript`, segment rows are intact.
4. **User cancel.** Start a render. While it shows
   "Rendering final MP4…" click "Cancel render" → confirm. Confirm the
   status pill flips back to "Recap outline ready", the credits are
   refunded, and the "Render final MP4" button reappears.
5. **No collateral damage.** Confirm sweeper does NOT touch any recap
   with `status` ∈ {`outline_completed`, `render_completed`, `pending`,
   `failed`}. Confirm finalized/released reservations are not touched
   even if pointed at by an old `render_pending` row.
6. **Hard no-touch.** `git diff --stat` confirms no logo, opener video,
   `StudioOpener`, watermark, branding, or export-watermark file is
   touched.
7. **Build verification.**
   ```bash
   pnpm check
   pnpm build
   ```

## Remaining risks

- **Still no kill-the-ffmpeg-process path.** Cancel refunds + flips
  status, but the worker keeps running until ffmpeg exits naturally. On
  a small recap (few seconds of cuts) this is invisible; on a long recap
  the user may briefly see CPU spent on a render whose result will be
  ignored. A future pass could persist the worker PID (or move to a real
  job queue with cancellation tokens).
- **Multi-replica race.** If two API replicas both schedule a boot sweep
  within the same 10s window they could both attempt to release the
  same reservation. `releaseReservation` is gated on `status="reserved"`
  so only one wins, but both will write a "would_release" log line. This
  is harmless but can look duplicative in logs.
- **No periodic sweep.** v6.72 adds a one-shot boot sweep + admin
  diagnostic only — if the API process never restarts and a render gets
  stuck mid-day, an admin must trigger the sweep manually. Adding a
  setInterval-based periodic sweep is straightforward but explicitly out
  of scope per the brief ("Only run once on boot, not on a tight
  interval.").
- **Cancel does not abort the underlying ffmpeg child.** Documented
  above; mitigated by the safeFail idempotency, but worth knowing if you
  see ffmpeg processes lingering after a cancel.

## Hard no-touch confirmation

`git diff --stat` for v6.72 touches only:

- `client/src/pages/AutoRecapPage.tsx`
- `docs/VIRELLE_V672_RECAP_RENDER_HARDENING_REPORT.md` (new)
- `server/_core/index.ts`
- `server/_core/recapRenderSweeper.ts` (new)
- `server/routers.ts`

No logo, opener video, `StudioOpener`, watermark, branding, or
export-watermark file is touched.
