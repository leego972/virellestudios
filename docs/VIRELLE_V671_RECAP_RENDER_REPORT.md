# Virelle Studios — v6.71 Auto Recap MP4 Render Report

Implementation of the deferred MP4 render pass from v6.70. Adds a real
final-MP4 render path for Auto Recap; the UI no longer shows a "Render
final MP4" placeholder — it triggers an actual ffmpeg cut/concat/upload
flow with proper credit reservation lifecycle.

## Files changed

- `drizzle/0027_recap_render_v671.sql` — **new**. Adds `fileUrl TEXT` and
  `fileKey VARCHAR(512)` columns to the `recaps` table so the renderer can
  persist the uploaded MP4's location.
- `drizzle/schema.ts` — adds `fileUrl` / `fileKey` to the `recaps` model.
- `server/_core/subscription.ts` — adds the `recap_render` credit key
  (cost `20`).
- `server/_core/recapRenderer.ts` — **new**. Self-contained worker that
  probes ffmpeg, downloads source movies, cuts each segment, normalizes
  to 1920×1080 / 30fps / H.264 / AAC, concatenates, uploads via
  `storagePut`, and updates the recap row. Handles its own
  finalize-on-success / release-on-failure for the credit reservation
  (idempotent).
- `server/routers.ts`
  - `recap.renderMp4` (new mutation): validates ownership + status, dedupes
    duplicate clicks via `getActiveReservation`, reserves credits, flips
    the recap to `render_pending`, fires the background renderer, and
    returns immediately so the UI can poll.
  - `recap.generate` (small fix): the brief outline-saving intermediate
    status was renamed from `render_pending` to `outline_pending` so it
    no longer collides with the new live MP4 render state.
- `client/src/pages/AutoRecapPage.tsx`
  - Wires the new mutation, adds a "Render final MP4" button on
    `outline_completed` (or legacy `completed` without an asset).
  - Adds a live "Rendering final MP4…" pulsed indicator while
    `render_pending`.
  - Surfaces render-mutation errors (insufficient credits, bad state,
    ffmpeg missing).
  - Updates the polling stop list and the status-pill labels for the new
    statuses.
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md` — marked as shipped, points at this
  report.
- `docs/VIRELLE_V671_RECAP_RENDER_REPORT.md` — this file.

## ffmpeg availability

The renderer probes ffmpeg up front with `execFile("ffmpeg", ["-version"])`.
The probe result is cached for the process lifetime so we do not re-spawn
on every render.

If ffmpeg is missing on the host:

- the recap is reverted to `outline_completed`,
- `errorMessage` is set to `"Final MP4 render is not available on this server because ffmpeg is not installed."`,
- the credit reservation is released (refunded),
- the outline + segments are kept intact so the user does not lose work.

The Virelle codebase already shells out to ffmpeg in many other places
(`extendedSceneGenerator`, `filmPipeline`, `videoStitcher`,
`soundtrackEngine`, `videoJobWorker`, `characterConsistency`), so the
Railway deploy image is expected to have ffmpeg installed. If it does not,
this renderer fails cleanly with a refund — it never fakes a render.

## Render fully enabled or scaffolded?

**Fully enabled** when ffmpeg + a storage backend (S3 or Forge) are present
on the host. Both are already used elsewhere in the project, so on the
existing Railway deploy this should work end-to-end with no extra setup.

**Scaffolded with safe failure** when ffmpeg or storage is missing — the
mutation succeeds (reserves credits, flips status), the worker fails fast,
the recap is reverted, and the user is refunded.

## Credit / reservation lifecycle

Mirrors the v6.70 scene-video pattern exactly:

1. `recap.renderMp4` validates state, then calls
   `reserveCredits(userId, 20, "recap_render", { referenceType: "recap_render", referenceId: recapId })`.
2. Recap status flips to `render_pending`. The mutation returns
   `{ recapId, status: "render_pending", reservationId }`.
3. Background `renderRecapMp4(...)` runs:
   - on success: writes `status=render_completed`, `fileUrl`, `fileKey`,
     then calls `finalizeReservation(reservationId)`.
   - on any failure: reverts to `outline_completed` with `errorMessage`,
     then calls `releaseReservation(reservationId)`.
4. Both helpers gate on `status='reserved'` so duplicate clicks (handled
   via `getActiveReservation`) and worker retries are safe.

Duplicate-click protection: a second `recap.renderMp4` call while a
reservation is active returns the existing `reservationId` instead of
charging again.

## QA checklist

1. Generate Auto Recap outline. Confirm status pill shows
   "Recap outline ready".
2. Confirm "Render final MP4" button is visible.
3. Click it — confirm status pill flips to "Rendering MP4…" and the
   pulsed indicator appears. The page polls every 3s.
4. Query
   `reservations.getForReference({ referenceType: "recap_render", referenceId: <recapId> })`.
   Expect one row in `reserved` state.
5. **On success:** status pill flips to "Final recap video ready",
   "Download MP4" link appears, `fileUrl` is populated. The reservation
   row above flips to `finalized`.
6. **On ffmpeg/source/storage failure:** status pill flips back to
   "Recap outline ready", error message is shown, outline + segments are
   still visible. The reservation row flips to `released`. Credit balance
   is unchanged from before the click.
7. **Duplicate-click protection:** click "Render final MP4" twice
   quickly — the second call returns the existing reservation id and
   credits are deducted exactly once.
8. Confirm no logo / opener / `StudioOpener` / watermark / branding /
   export-watermark files were touched (`git diff --stat`).

## Build results

- `pnpm check` — ✅ passes (`tsc --noEmit`, no errors).
- `pnpm build` — ✅ passes. Bundle-size warnings on prebuilt vendor chunks
  are pre-existing and unrelated.

## Remaining blockers

- **No worker queue.** The renderer is fired as a fire-and-forget IIFE on
  the API server. For a single-replica Railway deploy this is fine; if you
  scale to multiple replicas the render will run on whichever replica
  served the mutation. Adding BullMQ + Redis is straightforward but out
  of scope for this pass.
- **No retry logic.** If the renderer crashes mid-way (process killed),
  the recap will be left stuck in `render_pending` and the reservation
  in `reserved`. A future pass should add a stuck-job sweeper that
  releases reservations older than N minutes and reverts their recap to
  `outline_completed`.
- **No subtitles / opening-credits overlay yet.** The recap row already
  has `includeSubtitles` and `includeOpeningCredits` flags but the
  current renderer does not act on them — they are ignored. This was
  explicitly out of scope per the brief (only the MP4 cut/concat path).
- **Voiceover not muxed in.** The recap row has `voiceoverScript` and
  `includeVoiceover`, but generating + muxing the audio is its own pass
  (would need an ElevenLabs BYOK round-trip). The renderer currently
  keeps the source audio from the segment cuts.

## Hard no-touch confirmation

`git diff --stat` for v6.71 touches only:

- `client/src/pages/AutoRecapPage.tsx`
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md`
- `docs/VIRELLE_V671_RECAP_RENDER_REPORT.md` (new)
- `drizzle/0027_recap_render_v671.sql` (new)
- `drizzle/schema.ts`
- `server/_core/recapRenderer.ts` (new)
- `server/_core/subscription.ts`
- `server/routers.ts`

No logo, opener video, `StudioOpener`, watermark, branding-asset, or
export-watermark file is touched.
