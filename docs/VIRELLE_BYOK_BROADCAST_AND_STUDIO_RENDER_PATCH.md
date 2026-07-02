# Virelle BYOK Broadcast + Studio Render Patch

Date: 2026-07-02
Scope: Virelle premium video transform workflow.

## Product rule

Virelle does **not** pay for user video projects.

Membership unlocks:

- Broadcast Mode access
- Studio Render Mode access
- project workflow
- orchestration
- consent/audit/provenance
- job tracking
- watermark controls

The user's own provider key pays for:

- video generation
- video transformation
- provider render compute
- broadcast transform compute

This is BYOK only.

## New router

Created:

```text
server/virelle-broadcast-render-router.ts
```

Export:

```ts
export const virelleBroadcastRenderRouter = router({ ... })
```

## Membership gate

Both Broadcast Mode and Studio Render Mode require Virelle Creator or higher:

```ts
requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render")
```

## BYOK gate

The router refuses to create premium video jobs unless the user has at least one of their own provider keys:

- Runway
- OpenAI / Sora
- Replicate
- fal.ai
- Luma
- Hugging Face
- SeedDance / BytePlus
- Veo / Google AI

If no user key is available, the endpoint throws:

```text
BYOK_REQUIRED
```

The router does not fall back to platform-funded video generation.

## New job table

The router creates this table if missing:

```text
virelle_video_transform_jobs
```

It tracks:

- userId
- projectId
- sceneId
- mode: `broadcast` or `studio_render`
- status
- BYOK provider
- providerJobId
- source video URL
- reference video URL
- source image URLs
- reference image URLs
- transform goal
- target age
- target presentation
- output video URL
- broadcast destination
- ingest URL
- masked stream key
- consent confirmation
- watermark mode
- orchestration credits
- metadata
- errors

## Added endpoints inside router

```ts
getByokStatus
createStudioRenderJob
createBroadcastSession
listJobs
getJob
cancelJob
```

## Broadcast Mode

`createBroadcastSession` creates a premium live/broadcast session.

Supported destinations:

- RTMP
- WebRTC
- OBS bridge
- custom

Status starts as:

```text
broadcast_ready
```

The next implementation step is the live transform bridge worker:

```text
camera/feed → transform provider or local worker → RTMP/WebRTC/OBS output
```

## Studio Render Mode

`createStudioRenderJob` creates an upload-footage render job.

Status starts as:

```text
queued
```

The next implementation step is the render worker:

```text
source video + reference media → user BYOK provider → transformed video → output URL
```

## Virelle public mobile manifest updated

Updated:

```text
server/_core/securityHeaders.ts
```

The public manifest now declares:

```json
{
  "features": {
    "broadcastMode": true,
    "rtmpBroadcast": true,
    "webRtcBroadcast": true,
    "obsBridge": true,
    "byokVideoRequired": true
  },
  "costPolicy": {
    "byokRequiredForPremiumVideo": true,
    "noPlatformFundedUserVideo": true
  }
}
```

## Verification script updated

Updated:

```text
scripts/check-swappys-mobile-connection.mjs
```

It now fails unless:

- `/api/health` works
- `/api/mobile/features` works
- Creator upgrade is enabled
- Swappys Studio is enabled
- broadcast mode is enabled
- studio render queue is enabled
- BYOK is required
- no platform-funded user video is declared

Run:

```bash
pnpm check:swappys-mobile
```

## Required router mount

Replit must mount the router in `server/routers.ts`:

```ts
import { virelleBroadcastRenderRouter } from "./virelle-broadcast-render-router";

export const appRouter = router({
  system: systemRouter,
  virelleBroadcastRender: virelleBroadcastRenderRouter,
  vfxSfx: vfxSfxRouter,
  auth: router({
    // existing auth router
  }),
  // existing routers...
});
```

Do not rewrite unrelated routers.

## Required Replit checks

```bash
pnpm install
pnpm check
pnpm build
pnpm check:swappys-mobile
```

## What remains after this patch

This patch builds the BYOK-gated product layer and job/status data model.

Still needed:

1. Mount router in `appRouter`.
2. Add frontend controls for Broadcast Mode and Studio Render Mode.
3. Add worker that submits jobs to user BYOK provider.
4. Add RTMP/WebRTC/OBS bridge implementation.
5. Add completed-output playback/download panel.
