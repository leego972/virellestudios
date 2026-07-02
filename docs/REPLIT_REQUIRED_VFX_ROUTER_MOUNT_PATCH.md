# Required Replit Patch — Mount VFX/SFX Router

Date: 2026-07-02
Priority: Critical

## Why this matters

`client/src/pages/VFXSuite.tsx` calls:

```ts
(trpc as any).vfxSfx.createStudioVfxJob.useMutation()
```

The backend file exists:

```ts
server/vfx-sfx-router.ts
```

`server/routers.ts` imports it:

```ts
import { vfxSfxRouter } from "./vfx-sfx-router";
```

But Replit must verify that it is mounted in `appRouter`.

## Required code shape

Inside `server/routers.ts`, near the top of `export const appRouter = router({ ... })`, add:

```ts
export const appRouter = router({
  system: systemRouter,
  vfxSfx: vfxSfxRouter,
  auth: router({
    // existing auth router
  }),
  // existing routers...
});
```

Do not rewrite unrelated routers.

## Verification

After adding the mount, run:

```bash
pnpm check
pnpm build
```

Then confirm the frontend can call:

```ts
trpc.vfxSfx.createStudioVfxJob
trpc.vfxSfx.getStudioEffectCatalogue
trpc.vfxSfx.getSwappysFunnelPricing
```

## Related files

- `server/vfx-sfx-router.ts`
- `client/src/pages/VFXSuite.tsx`
- `server/_core/vfxStudioMiddleware.ts`
- `docs/VFX_STUDIO_MULTIMEDIA_TRANSFORM_PATCH.md`
