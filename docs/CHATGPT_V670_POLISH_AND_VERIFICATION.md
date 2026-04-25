# ChatGPT v6.70 Polish & Verification Handoff

This branch intentionally avoids logo, opener video, watermark, branding assets, and export watermark logic.

## Scope

Safe work completed from ChatGPT side:

- Reviewed the current v6.70 reliability pass.
- Confirmed the latest main branch already includes the intended reliability work:
  - scene-video reservations finalize on async provider success,
  - scene-video reservations release on async provider failure,
  - `reservations.getForReference` exists for lifecycle debugging,
  - Auto Recap no longer implies that a final MP4 exists when only an outline/segment preview exists,
  - `AUTO_RECAP_MP4_RENDER_PLAN.md` exists for the deferred MP4 renderer.
- Created this handoff so Replit only needs to run verification/build checks, not design the pass again.

## Files explicitly not touched

Do not edit these areas in this verification pass unless there is a direct build failure inside them:

- logo files
- `StudioOpener` or opener video flow
- opener video assets
- watermark components
- watermark placement
- watermark/export logic
- homepage/brand hero visuals

## Current reliability status to verify

Replit/local verification should confirm:

1. `pnpm check` passes.
2. `pnpm build` passes.
3. `scene.generateVideo` does not finalize credit reservation at dispatch time.
4. Each async scene-video provider branch finalizes reservation only on success.
5. Each async scene-video provider branch releases reservation on failure.
6. `reservations.getForReference` is scoped to the current authenticated user and returns only non-sensitive lifecycle fields.
7. Auto Recap status labels are honest:
   - outline/segments only → `Recap outline ready`,
   - no `Download MP4` unless `fileUrl` exists,
   - final MP4 wording only when `outputAssetId` or `fileUrl` exists.

## Minimal Replit command

Use Replit only for this:

```txt
Pull the latest branch/PR. Run pnpm check and pnpm build. Fix only compile/build errors. Do not add features. Do not touch logo, opener video, watermark, branding assets, or export watermark logic.
```

## Next product pass

After this verification passes, the next real product pass should be:

```txt
v6.71 — Auto Recap MP4 render pass
```

That pass should implement the deferred render path described in:

- `docs/AUTO_RECAP_MP4_RENDER_PLAN.md`

## Manual QA checklist

- Generate a recap and confirm it says `Recap outline ready`, not final video ready.
- Confirm no `Download MP4` button appears until `fileUrl` exists.
- Trigger scene generation success in a safe dev environment and confirm the reservation finalizes.
- Trigger scene generation failure in a safe dev environment and confirm the reservation releases.
- Confirm logo/opener/watermark are unchanged.
