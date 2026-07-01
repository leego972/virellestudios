# Virelle Swappys + VFX Studio Checkpoint

Date: 2026-07-01

## Product split

### Swappys standalone

Purpose: low-friction entry product for new traffic.

Positioning:
- Cheap monthly standalone tool.
- Target price: A$7/month or similar low-cost entry tier.
- Consent-gated.
- Limited/censored compared with Virelle Studios.
- Always visibly marked with Swappys / AI-altered disclosure.
- Used as a trust bridge and lead source for Virelle Studios.

### Virelle Studios VFX Suite

Purpose: professional production environment for serious creators and studios.

Positioning:
- Full VFX workflow inside the film generation pipeline.
- Swappys is only one feature inside the studio suite.
- Creator-or-higher access controls advanced digital-double workflows.
- Visible watermark controls are available inside Virelle only, with consent/audit/provenance metadata retained.
- Virelle credits system should be charged for render actions.

## Repo changes completed

### UI

Updated:
- `client/src/pages/VFXSuite.tsx`

Added:
- Swappys Digital Double section.
- Stunt face replacement.
- Actor continuity match.
- Pickup/reshoot match.
- AI stunt insert.
- Performance polish.
- Professional compositing and plate tools.
- Cleanup and safety tools.
- Action/atmosphere tools.
- Restoration and image-quality tools.
- Finishing and QC tools.
- Actor reference upload.
- Source plate upload.
- Consent checkbox for digital likeness work.
- Visible watermark toggle gated to Creator-or-higher in the UI.
- Export quality selector: preview, final, master.
- Estimated credit cost display.
- Scene metadata persistence through existing `scene.update` flow.
- Regeneration through existing `scene.generateVideo` flow.

### Backend policy module

Added:
- `server/_core/vfxStudioMiddleware.ts`

Defines:
- Swappys standalone vs Virelle Studio product split.
- Tier ranking helpers.
- Swappys watermark policy.
- Consent assertion for actor-likeness workflows.
- Credit-cost estimation for VFX/digital-double jobs.
- VFX Studio professional effect catalogue.
- Audit/provenance metadata builder.
- Swappys funnel pricing structure.

## Next server wiring required

The policy module is intentionally separate and safe. To make it fully enforced server-side for render jobs, wire it into whichever mutation becomes the final render endpoint:

- `scene.generateVideo`, or
- `vfxSfx.applyVfxToScene`, or
- a dedicated `vfxStudio.createRenderJob` endpoint.

Required enforcement at final render time:

1. Load current user.
2. Call `requireVfxStudioTier(user, "amateur", "Swappys Digital Double Studio")` for digital-double operations.
3. Call `assertDigitalLikenessConsent(...)` for all actor-likeness effects.
4. Resolve `getSwappysWatermarkMode(...)`.
5. Calculate credits with `getVfxCreditCost(...)`.
6. Deduct credits using `db.deductCredits(...)`.
7. Store audit metadata from `buildVfxAuditMetadata(...)` in scene/job metadata.
8. Allow visible watermark hiding only for Virelle Creator-or-higher studio exports.

## Safety/brand rule

Standalone Swappys should never become the full professional version. It remains the marked, limited acquisition tool. Virelle Studios is the paid professional environment where advanced controls, credit spending, render quality, and studio audit records live.
