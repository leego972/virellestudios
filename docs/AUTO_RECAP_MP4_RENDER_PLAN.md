# Auto Recap — MP4 Render Plan (v6.70 deferred work)

Status as of v6.70: **outline only**. The Auto Recap pipeline produces a beat
list, segment timing, and an optional voiceover script. It does **not** render
a final MP4. The UI now reflects this honestly (`outline_completed` →
"Recap outline ready"; `Final recap video ready` only appears when an
`outputAssetId`/`fileUrl` is present).

This document is the implementation plan for the missing MP4 render pass. It
is deliberately not implemented in v6.70 to keep the reliability pass narrow.

## Status lifecycle

| status              | meaning                                                          |
|---------------------|------------------------------------------------------------------|
| `pending`           | reservation created, generation queued                           |
| `render_pending`    | outline + segments persisted, MP4 render not yet started          |
| `outline_completed` | terminal — outline ready, no MP4 (today's success state)         |
| `render_completed`  | terminal — MP4 rendered, `outputAssetId` / `fileUrl` populated    |
| `failed`            | terminal — error message in `errorMessage`                       |
| `completed`         | legacy value from pre-v6.70 rows; treated as `outline_completed` unless an asset is attached |

## Render pipeline (planned)

1. **Trigger.** `recap.renderMp4({ recapId })` mutation; only callable when
   `recap.status === "outline_completed"`. Reserves `recap_render` credits via
   `db.reserveCredits(..., { referenceType: "recap_render", referenceId })`.
2. **Worker.** A background job (BullMQ on Redis or a Railway cron consumer)
   pulls render jobs. Concurrency = 2 per node to keep ffmpeg memory under
   control.
3. **Asset assembly.** For each segment in `recap_segments`:
   - download the source clip from the source movie's S3 URL
   - cut to `[startTimeSeconds, endTimeSeconds]` with `ffmpeg -ss -to`
   - normalize to a common codec/resolution (H.264, 1920×1080, 30fps)
4. **Voiceover.** If `voiceoverScript` is present, send it through ElevenLabs
   (BYOK key already on file); save the resulting MP3 to S3.
5. **Concatenation.** Build the concat list and run
   `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4`. Mux the voiceover
   track on top with `-filter_complex amix=inputs=2`.
6. **Upload.** Push the final MP4 to S3 via the existing `upload` router; store
   the asset id back on the recap row as `outputAssetId` and the public URL as
   `fileUrl`.
7. **Finalize.** On success: `db.updateRecap(..., { status: "render_completed" })`
   then `db.finalizeReservation(__renderResId)`. On failure:
   `db.updateRecap(..., { status: "failed", errorMessage })` then
   `db.releaseReservation(__renderResId)` so the user is refunded — same
   pattern v6.70 ships for scene-video.

## Dependencies

- **ffmpeg.** Not currently in the Railway image. Add to the Dockerfile
  (`apt-get install -y ffmpeg`).
- **Worker queue.** Either BullMQ + Redis (already partially used elsewhere)
  or a polling cron procedure. Prefer BullMQ for retry/backoff semantics.
- **S3 / signed URLs.** Reuse `server/_core/upload` helpers; signed PUT for
  the worker, signed GET for the user-facing download link.
- **Output asset table.** `outputAssetId` already exists on the recaps table.
  No schema change needed.

## Credit reservation lifecycle (must mirror scene-video)

- Reserve at render-trigger time (deduct `recap_render` credits).
- Reservation row keyed by `(referenceType: "recap_render", referenceId: recap.id)`
  to dedupe duplicate clicks via `getActiveReservation`.
- Finalize **only** after the MP4 is uploaded and the recap row has been
  updated with the asset id.
- Release on any worker error before finalize (idempotent — finalize and
  release both gate on `status = 'reserved'`).
- Add `recap_render` to the `featureKey` enum in `server/_core/credits.ts`
  with its own price.

## Estimated implementation steps

1. Add ffmpeg to the Railway image; verify with `ffmpeg -version` in a
   one-shot deploy.
2. Add `recap_render` featureKey + price + reservation type.
3. Implement `recap.renderMp4` mutation that reserves credits, enqueues a
   BullMQ job, and returns `{ status: "render_pending" }`.
4. Build the worker module `server/_workers/recapRenderer.ts`. Reuses the
   per-IIFE finalize-on-success / release-on-failure pattern from
   `scene.generateVideo`.
5. Wire UI: a "Render final MP4" button that appears on
   `outline_completed` recaps, plus progress polling on `render_pending`.
6. Integration test: simulate one segment, render, verify `outputAssetId`
   and reservation status transitions to `finalized`.
7. Documentation: replace this plan with a "shipped" note in the v6.71+
   reliability report.

## Risks

- ffmpeg memory pressure on small Railway plans → cap concurrency.
- Source clips may be missing or expired signed URLs → worker must surface a
  clear `errorMessage` and refund the reservation.
- Voiceover BYOK key may be absent → render must succeed without audio
  rather than failing.
