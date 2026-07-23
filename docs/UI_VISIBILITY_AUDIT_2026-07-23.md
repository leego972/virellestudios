# Virelle Studios UI Visibility Audit — 23 July 2026

## Scope

Static route and shared-component audit of the existing `leego972/virellestudios` web client. The review covered the route groups declared in `client/src/App.tsx`:

- Public, authentication, pricing, legal and marketing pages
- Dashboard and account pages
- Project production, post-production, VFX, audio and broadcast tools
- Funding, marketplace, distribution and community pages
- Administration pages
- Standard Broadcast and verified Adult Studio flows

No page, logo asset, opener component, video-stitching logic or video-opener asset was removed or replaced.

## Findings and fixes

1. **Watermark stacking defect**
   - `GoldWatermarkLaunch` was rendered globally and again by `DashboardLayout`.
   - A fixed `z-index: 0` layer can still paint above unpositioned route content.
   - Added a canonical watermark synchroniser, suppressed duplicate watermark instances and lifted all following application siblings into a higher stacking layer.

2. **Text-button clipping risk**
   - The shared button primitive used fixed heights and a non-shrinking layout.
   - Replaced fixed heights with minimum heights and enabled multiline wrapping for text buttons.
   - Icon-only buttons retain fixed dimensions.

3. **Badge clipping risk**
   - Status badges used `whitespace-nowrap`, `shrink-0` and `overflow-hidden`.
   - Badges now wrap long labels and remain within the viewport.

4. **Card overflow risk**
   - Shared cards and grid headers inherited `min-width: auto`, allowing long content or actions to force horizontal overflow.
   - Added `min-width: 0`, bounded widths, wrapping card footers and a `minmax(0, 1fr)` header column.

5. **Site-wide responsive containment**
   - Added shared rules for route shells, flex/grid children, forms, controls and media.
   - Long text can wrap, form controls stay within their containers and content remains above decorative watermark layers.

## Regression coverage

`client/src/components/ui/visibility-primitives.test.ts` protects the following invariants:

- Standard buttons wrap and are not forced to `shrink-0`
- Icon buttons remain fixed-size
- Badges do not hide long text
- Watermark content-layer and duplicate-suppression rules remain present

## Checkpoint

Branch: `fix/sitewide-visibility-audit-20260723`

This checkpoint contains only visibility, responsive containment and regression-test changes within the existing Virelle Studios repository.
