# Virelle VFX Studio — Competitor Gap Patch

Date: 2026-07-01
Scope: VFX Studio only.

## Competitive benchmark used

Virelle VFX Studio was benchmarked against the current direction of:

- Runway-style reference-driven video and character consistency.
- Adobe/Firefly/After Effects-style generative editing, finishing and provenance expectations.
- Autodesk Flow Studio / Wonder Dynamics-style AI-assisted character, plate, rigging, lighting and compositing workflows.
- DaVinci Resolve-style finishing, colour, cleanup, restoration, QC and editorial handoff expectations.
- Topaz-style upscale, denoise and restoration expectations.

## Gaps patched

### 1. Digital-double workflow

Patched with:

- Swappys Digital Double.
- Stunt face replacement.
- Actor continuity match.
- Pickup/reshoot match.
- AI stunt insert.
- Performance polish.
- Multi-anchor character lock.
- Temporal consistency pass.

Backend:

- `vfxSfx.createStudioVfxJob`
- `vfxSfx.createSwappysDigitalDoubleJob`
- consent enforcement
- Creator-tier visible watermark controls
- credit deduction
- audit/provenance metadata
- Swappys export record table

### 2. Professional compositing

Patched with:

- AI rotoscope/person isolation.
- Green screen/keying.
- Background replacement.
- Foreground compositing.
- Sky replacement.
- Set extension.
- Crowd multiplication.
- Camera matchmove / plate solve.

### 3. Cleanup and safety post-production

Patched with:

- Object removal/inpainting.
- Wire/rig removal.
- Safety gear cleanup.
- Reflection cleanup.
- Screen replacement.
- Neural matte edge refinement.

### 4. Action and atmosphere effects

Patched with:

- Practical action flash/spark.
- Debris/dust impact.
- Rain/snow/weather layers.
- Fire/smoke atmosphere.
- Cinematic motion blur.
- Anamorphic lens flare.

### 5. Image-quality and restoration workflow

Patched with:

- Scene extension/outpainting.
- 4K upscale.
- 8K upscale.
- Denoising/grain repair.
- Face enhancement/detail recovery.
- Film beauty retouch.
- Subtle de-aging.
- Film damage restoration.
- Deflicker/exposure repair.

### 6. Finishing, QC and editorial handoff

Patched with:

- Colour match to source plate.
- Style transfer.
- Film grain / analog texture.
- Post depth of field/rack focus.
- Cinematic vignette.
- Stabilisation.
- Lens distortion repair.
- Chromatic aberration repair.
- Final QC / continuity pass.
- Render pass provenance.
- Editorial handoff package.

## Files changed

- `server/_core/vfxStudioMiddleware.ts`
- `server/vfx-sfx-router.ts`
- `client/src/pages/VFXSuite.tsx`

## Product structure

### Swappys standalone

Low-cost entry product. Limited and visibly marked.

### Swappys inside Virelle Studios

Professional VFX Studio feature. Creator+ production controls, credits, consent records and audit/provenance metadata.

## Remaining recommended production hardening

- Add real render worker queue for `scene_swappys_exports.status` transitions.
- Add admin render-job monitor for Swappys/VFX Studio jobs.
- Add storage of source plate and actor reference thumbnails for audit review.
- Add optional Content Credentials / C2PA integration when production export files are generated.
- Add a visible job history panel in the VFX Suite UI.
