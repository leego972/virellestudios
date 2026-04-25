# Virelle v6.71 — Auto Recap MP4 Render Implementation Brief

This is a narrow implementation brief for the next pass. It is designed to save Replit time/credits by removing ambiguity before coding.

## Hard no-touch areas

Do **not** edit any of these areas in v6.71:

- logo files
- `StudioOpener` / opener video flow
- opener video assets
- watermark components
- watermark placement
- export watermark logic
- homepage/brand hero visuals

## Current state

As of v6.70:

- Auto Recap creates a structured recap outline and `recapSegments` rows.
- Auto Recap does **not** create a final MP4.
- UI is honest: `outline_completed` means the outline/segment preview is ready, not a final video.
- `Download MP4` appears only when `fileUrl` exists.
- Credit reservation reliability for scene video has been fixed.

## v6.71 goal

Add a real final MP4 render path for Auto Recap:

```txt
outline_completed recap + recapSegments → render_pending → ffmpeg/worker → render_completed + fileUrl/outputAssetId
```

If ffmpeg or the render worker is not available in the runtime, v6.71 should still ship safe scaffolding and a clear runtime blocker report, but it must not fake a successful final MP4.

## Existing helpers confirmed

- `server/storage.ts` exposes `storagePut(relKey, data, contentType)` and can upload bytes to S3/R2/Forge, returning `{ key, url }`.
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md` already defines the desired lifecycle.
- `AutoRecapPage.tsx` already has honest status labels and only shows MP4 download when `fileUrl` exists.

## Files likely to edit

Expected files:

- `server/routers.ts`
- `server/db.ts`
- `server/_core/subscription.ts`
- `server/_core/recapRenderer.ts` (new)
- `client/src/pages/AutoRecapPage.tsx`
- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md`
- `docs/VIRELLE_V671_RECAP_RENDER_REPORT.md` (new)

Only add migrations if the current `recaps` table does not already contain a usable final URL field.

## Required credit key

Add credit key:

```ts
recap_render: { cost: 20, label: "Render Auto Recap MP4" }
```

Do not change existing prices.

## Backend procedure

Add:

```ts
recap.renderMp4
```

Input:

```ts
{ recapId: number }
```

Validation:

- authenticated user
- recap exists
- user owns/can access the parent project
- recap status is `outline_completed` or legacy `completed` without an asset
- recap has at least one segment
- recap is not already `render_pending` or `render_completed`
- no active reservation exists for `(referenceType: "recap_render", referenceId: recapId)`
- user has enough credits

Flow:

1. Reserve credits using `reserveCredits`.
2. Set recap status to `render_pending`.
3. Start/enqueue render job.
4. Return `{ recapId, status: "render_pending", reservationId }`.

Do not finalize credits in the mutation unless the MP4 is actually rendered synchronously inside the same call. Prefer async job + finalize/release in worker.

## Renderer service

Create:

```txt
server/_core/recapRenderer.ts
```

Export:

```ts
renderRecapMp4({ recapId, reservationId, userId }): Promise<void>
```

Responsibilities:

1. Load recap and segments.
2. Load source movie URLs.
3. Validate all source URLs exist.
4. Create a temp working directory under `/tmp`.
5. Download each source video to temp.
6. Use ffmpeg to cut segments.
7. Normalize clips to common MP4 settings.
8. Concatenate clips into final MP4.
9. Upload final MP4 via `storagePut`.
10. Update recap row:
    - `status = "render_completed"`
    - `fileUrl = uploaded.url` if field exists
    - `outputAssetId` if existing asset model supports it
11. Finalize reservation.
12. Clean temp files.

Failure behavior:

- restore recap to `outline_completed`
- save `errorMessage`
- release reservation
- keep outline and segments intact
- never delete source videos

## ffmpeg handling

Before rendering, check:

```ts
await execFile("ffmpeg", ["-version"])
```

If unavailable:

- set recap back to `outline_completed`
- release reservation
- error message: `Final MP4 render is not available on this server because ffmpeg is not installed.`
- document in `docs/VIRELLE_V671_RECAP_RENDER_REPORT.md`

Do not fake render success.

## Frontend update

In `AutoRecapPage.tsx`:

When recap is `outline_completed` and has no `fileUrl/outputAssetId`:

- show button: `Render final MP4`
- call `recap.renderMp4`

When status is `render_pending`:

- show `Rendering final MP4...`
- poll every 3 seconds

When status is `render_completed` and `fileUrl` exists:

- show `Final recap video ready`
- show `Download MP4`

When render fails:

- show error
- keep outline preview visible
- allow retry render

## Safe minimal fallback if full worker is too risky

If async worker integration is too risky for this pass, implement a synchronous render path guarded by strict limits:

- max 3 segments
- max 45 seconds total
- only available in development/test mode or behind `ENABLE_SYNC_RECAP_RENDER=true`

Production should still prefer worker queue.

## Manual QA checklist

1. Generate Auto Recap outline.
2. Confirm `Render final MP4` appears.
3. Click render with tiny test clips.
4. Reservation becomes `reserved`.
5. Status becomes `render_pending`.
6. On success: status becomes `render_completed`, `fileUrl` populated, reservation finalized.
7. On ffmpeg/source failure: status returns to `outline_completed`, reservation released, outline still visible.
8. Confirm no logo/opener/watermark files changed.

## Final report required

Create:

```txt
docs/VIRELLE_V671_RECAP_RENDER_REPORT.md
```

Include:

- files changed
- whether ffmpeg exists
- whether render is fully enabled or scaffolded
- credit/reservation lifecycle
- QA checklist
- build results
- remaining blockers

## Replit/local final verification

Run:

```bash
pnpm check
pnpm build
```

Do not run expensive provider generations.
