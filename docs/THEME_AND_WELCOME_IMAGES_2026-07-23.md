# Theme and Welcome Gift Verification — 2026-07-23

## Theme semantics

- `light` is the user-facing day mode.
- `dark` is the user-facing night mode.
- The existing stylesheet keeps its legacy selector arrangement: the cream palette is attached to `.dark`, while the black palette is attached to the root selector.
- `ThemeContext` now maps the canonical theme value to those selectors correctly and exposes `data-theme="light|dark"` on the root element.
- Browser `color-scheme` and Safari `theme-color` now follow the canonical theme value.

## Welcome Gift visibility

The Welcome Gift modal no longer relies on ambiguous global `dark:` classes for its colours. It binds directly to the canonical theme and uses explicit scoped palettes:

- Day mode: cream background, dark brown text, dark gold headings and borders.
- Night mode: near-black background, warm cream text, bright gold headings and borders.

All primary body, muted, title and card text pairs are checked at a minimum WCAG AA contrast ratio of 4.5:1 by `scripts/check-lamalo-welcome-contract.mjs`.

## Welcome item images

Ten unique SVG garment illustrations are bundled under `client/public/lamalo/welcome/`. The picker and the permanent wardrobe records use these local paths. There is no remote image-generation dependency in the welcome flow.
