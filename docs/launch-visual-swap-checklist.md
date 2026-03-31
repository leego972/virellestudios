# Launch visual swap checklist

These files were added as production-ready replacements to reduce UI novelty and make the app feel more commercially polished.

## Replacement components added

- `client/src/components/LeegoFooterLaunch.tsx`
- `client/src/components/GoldWatermarkLaunch.tsx`

## Minimal swaps to apply

1. Replace imports of `LeegoFooter` with `LeegoFooterLaunch` on public-facing pages.
2. Replace imports of `GoldWatermark` with `GoldWatermarkLaunch` on public-facing pages where the background watermark currently feels too strong.
3. Keep naming consistent after swap:
   - either rename the new files into the old file names
   - or update imports directly where used

## Why these were added

- The current footer effect is novelty-heavy and reduces enterprise/commercial credibility.
- The current watermark is visually louder than ideal for a premium SaaS-style product surface.
- These replacements intentionally reduce noise and increase polish.

## Suggested next public-facing targets

If time permits, next update these pages:
- `client/src/pages/Landing.tsx`
- `client/src/pages/Pricing.tsx`
- `client/src/pages/DownloadApp.tsx`

Focus on:
- clearer hierarchy
- less visual noise
- more restrained trust-oriented UI
- more disciplined CTA copy
