# Virelle v6.72 — Recap Render Hardening Brief

This pass is intentionally narrow: harden the Auto Recap MP4 renderer shipped in v6.71 so failed/stuck renders do not trap users in `render_pending` or leave credits reserved forever.

## Hard no-touch areas

Do **not** edit any of these areas:

- logo files
- `StudioOpener` / opener video flow
- opener video assets
- watermark components
- watermark placement
- export watermark logic
- homepage/brand hero visuals

## Current state

As of v6.71:

- `recap.renderMp4` exists.
- `server/_core/recapRenderer.ts` cuts/concats segments through ffmpeg and uploads via `storagePut`.
- `recap_render` costs 20 credits.
- Success sets `status = "render_completed"` plus `fileUrl` / `fileKey`.
- Failure restores `status = "outline_completed"` and releases the reservation.

Known v6.71 gaps:

1. Fire-and-forget worker: if the API process dies mid-render, the recap can remain stuck in `render_pending`.
2. Reservation can remain `reserved` if the process dies before finalize/release.
3. No retry/cancel controls.
4. No stale job sweeper.
5. No admin/dev diagnostic endpoint for stuck render recovery.

## v6.72 goal

Add guardrails so Auto Recap MP4 renders are recoverable:

```txt
stuck render_pending recap + old reserved reservation → safe release + revert to outline_completed
```

Do not add new creative features. Do not add subtitles/credits overlay or voiceover muxing in this pass.

## Required backend additions

### 1. Sweeper utility

Create:

```txt
server/_core/recapRenderSweeper.ts
```

Export:

```ts
sweepStuckRecapRenders(options?: { olderThanMinutes?: number; dryRun?: boolean }): Promise<{
  checked: number;
  repaired: number;
  dryRun: boolean;
  items: Array<{
    recapId: number;
    reservationId?: number | null;
    previousStatus: string;
    action: "would_release" | "released" | "skipped";
    reason: string;
  }>;
}>
```

Default threshold:

```txt
olderThanMinutes = 30
```

Logic:

- Find recaps with `status = "render_pending"` and `updatedAt` older than threshold.
- For each, look up active reservation with:
  - `referenceType = "recap_render"`
  - `referenceId = recap.id`
  - `status = "reserved"`
- If dryRun:
  - do not mutate
  - report `would_release`
- If not dryRun:
  - set recap back to `outline_completed`
  - set `errorMessage = "Final MP4 render timed out. Credits were released; you can retry the render."`
  - release reservation if present
  - keep outline/segments/fileUrl untouched unless fileUrl is null

Safety:

- Do not touch `render_completed` recaps.
- Do not delete recap segments.
- Do not delete source videos.
- Do not release reservations that are already finalized/released.

### 2. Start sweeper on server boot, if safe

In the central server startup file, run a lightweight sweep once on boot:

```ts
sweepStuckRecapRenders({ olderThanMinutes: 60, dryRun: false }).catch(...)
```

Only run once on boot, not on a tight interval.

If the server has an existing scheduler/cron pattern, use that pattern instead.

### 3. Admin/dev diagnostic procedure

Add protected or admin procedure:

```ts
recap.sweepStuckRenders
```

Input:

```ts
{ olderThanMinutes?: number; dryRun?: boolean }
```

Access:

- admin only if an admin procedure exists
- otherwise protected but only returns/repairs the current user's recaps

Preferred: admin only.

Return the sweeper result.

### 4. User cancel render procedure

Add:

```ts
recap.cancelRender({ recapId })
```

Validation:

- user owns/can access recap project
- recap.status === "render_pending"

Flow:

- set recap back to `outline_completed`
- set `errorMessage = "Final MP4 render was cancelled. Credits were released."`
- release active `recap_render` reservation
- return `{ success: true }`

Important limitation:

If ffmpeg is already running in-process, this may not kill the child process unless the renderer is explicitly cancellable. That is acceptable for v6.72 if documented. The important outcome is user state/credits recover safely.

### 5. Frontend cancel/retry UX

In `AutoRecapPage.tsx`:

When `status === "render_pending"`:

- show `Rendering final MP4...`
- show secondary button: `Cancel render`
- call `recap.cancelRender`

When a render fails or is cancelled:

- keep outline visible
- show retry button `Render final MP4`
- show error message

Do not display `Download MP4` unless `fileUrl` exists.

## Optional but valuable: reservation diagnostics

If `reservations.getForReference` already exists, add small UI/debug copy only in dev/admin contexts. Do not expose raw data to normal users.

## Required docs

Create:

```txt
docs/VIRELLE_V672_RECAP_RENDER_HARDENING_REPORT.md
```

Include:

- files changed
- sweeper behavior
- default timeout threshold
- cancel behavior
- whether boot sweep is enabled
- admin diagnostic route name
- build results
- manual QA checklist
- remaining risks

## Manual QA checklist

1. Start a render, then simulate stale state by setting `recaps.status = "render_pending"` and `updatedAt` older than threshold.
2. Run dry-run sweep. Confirm it reports `would_release` and mutates nothing.
3. Run real sweep. Confirm recap becomes `outline_completed`, reservation becomes `released`, and error message is set.
4. Start a render and click Cancel. Confirm recap becomes `outline_completed` and reservation releases.
5. Confirm completed recaps are untouched by sweeper.
6. Confirm no logo/opener/watermark files changed.
7. Run `pnpm check` and `pnpm build`.

## Replit/local final verification

Run:

```bash
pnpm check
pnpm build
```

Fix only build/runtime errors. Do not add extra features.
