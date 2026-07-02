# Required Replit Patch — Mount BYOK Broadcast / Studio Render

Date: 2026-07-02
Priority: Critical for Virelle premium broadcast/render access

## Files added

Backend router:

```text
server/virelle-broadcast-render-router.ts
```

Frontend page:

```text
client/src/pages/VirelleBroadcastRender.tsx
```

Docs:

```text
docs/VIRELLE_BYOK_BROADCAST_AND_STUDIO_RENDER_PATCH.md
```

## Backend mount required

In `server/routers.ts`, add the import:

```ts
import { virelleBroadcastRenderRouter } from "./virelle-broadcast-render-router";
```

Then mount inside `appRouter`:

```ts
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

## Frontend route required

Add a route to the app router/navigation that points to:

```ts
client/src/pages/VirelleBroadcastRender.tsx
```

Suggested route path:

```text
/virelle-broadcast-render
```

Suggested nav label:

```text
Broadcast / Studio Render
```

Suggested membership badge:

```text
Creator+
```

## BYOK policy

Do not add platform-provider fallback.

This feature must stay BYOK-only:

- Virelle membership unlocks workflow/orchestration.
- User's own provider key pays for video render/broadcast compute.
- If the user has no provider key, creation must fail with `BYOK_REQUIRED`.

## Required Replit checks

```bash
pnpm install
pnpm check
pnpm build
pnpm check:swappys-mobile
```

## Functional test

1. Login as Creator+ user.
2. Open `/virelle-broadcast-render`.
3. Confirm BYOK status appears.
4. With no provider key, creating Broadcast or Studio Render should fail.
5. Add a provider key in Settings.
6. Create Studio Render job.
7. Confirm `virelle_video_transform_jobs` has `mode='studio_render'`, `byokRequired=1`, and selected provider.
8. Create Broadcast session.
9. Confirm `mode='broadcast'`, `status='broadcast_ready'`, `byokRequired=1`.
