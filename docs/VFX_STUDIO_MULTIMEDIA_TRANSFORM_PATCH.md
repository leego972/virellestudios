# Virelle VFX Studio — Multimedia Transform Patch

Date: 2026-07-02
Scope: VFX Studio / Swappys feature only.

## Purpose

This patch aligns Virelle Studios with the new Swappys Mobile multimedia workflow while keeping Virelle as the full professional environment.

Swappys Mobile remains the marked, limited entry product. Virelle Studios supports the same transform categories without the mobile app's entry-product restrictions.

## Added Virelle Studio inputs

The VFX Studio backend now accepts:

- multiple source image URLs
- multiple reference image URLs
- source video URL
- reference video URL
- transform goal
- target age
- target presentation/style
- director/VFX supervisor prompt
- consent confirmation
- Creator+ visible-watermark control
- preview/final/master quality

## Transform goals

Supported transform goals:

- `appearance_reference`
- `boy_to_girl`
- `girl_to_boy`
- `younger_self`
- `older_self`
- `adult_to_child`
- `child_to_adult`
- `custom_prompt`

## Virelle UI changes

Updated:

- `client/src/pages/VFXSuite.tsx`

Added:

- Transform-goal selector
- Target-age input
- Target presentation/style input
- Multiple source image upload
- Multiple reference image upload
- Source video upload
- Reference video upload
- Consent language covering gender, age, childhood-self, stunt, pickup and continuity work
- Media input count included in estimated credit display

## Backend changes

Updated:

- `server/vfx-sfx-router.ts`

Added to `createStudioVfxJob`:

- `sourceImageUrls`
- `referenceImageUrls`
- `sourceVideoUrl`
- `referenceVideoUrl`
- `transformGoal`
- `targetAge`
- `targetPresentation`

The backend stores this in VFX audit metadata and Swappys export metadata.

## Product split

### Swappys Mobile

- marked output
- limited entry tool
- mobile-first preview/recording
- sends serious users to Virelle Creator

### Virelle Studios

- full VFX Studio workflow
- full media/reference intake
- credits charged server-side
- Creator+ watermark controls
- audit/provenance retained
- professional render path

## Debug status

Swappys Mobile ZIP was locally tested after the multimedia patch:

- ZIP integrity passed
- `npm install --ignore-scripts` passed
- `npm run typecheck` passed
- `npx expo config --type public` passed

Virelle repo changes were committed through GitHub connector. Replit should run the final app-level verification:

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

Focus only on VFX Studio files if repairs are needed.
