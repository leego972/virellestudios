# Virelle Studios — UX simplification plan

## Objective

Reduce cognitive load without removing functionality or changing routes. The interface should present the production workflow first and move specialist or low-frequency functions behind secondary navigation.

## Primary navigation

Keep the always-visible sidebar limited to these destinations:

### Make
- Projects
- Director's AI
- Characters
- VFX & Sound
- Studio Render

### Finish
- Music
- Dubbing
- Showcase

### Business
- Marketplace
- Funding

### Account
- Credits
- Settings

## Secondary tools

Move these out of the permanent sidebar and expose them through a single `More tools` panel or from relevant project screens:

- Signature Cast
- Poster Maker
- Swappys / Face Swap
- Campaigns

No routes should be deleted. Existing deep links must continue to work.

## Navigation behaviour

- Default desktop sidebar width: 224px.
- Use no more than four visible groups.
- Keep group labels short and plain.
- Use one icon style consistently; avoid mixing decorative and Lucide icons in the same navigation list unless necessary.
- Keep the active item visually distinct without heavy gradients or multiple borders.
- On mobile, close the navigation drawer immediately after route selection.
- Preserve collapsed icon-only mode on desktop.

## Sidebar footer

The persistent footer currently contains too many independent controls. Simplify it to:

1. Credit balance
2. Profile menu

Move the following into the profile menu:

- Language
- Theme
- Change photo
- Sign out

Remove non-essential branding from the functional sidebar footer. Branding may remain in the header or page footer.

## Top bar

Keep only:

- Page title or breadcrumb
- Render queue
- Notifications
- Mobile navigation trigger

Do not duplicate notification or render controls elsewhere.

## Page-level consistency

Every major workspace page should use:

- One page title
- One short supporting sentence
- One primary action
- Secondary actions in an overflow menu
- Consistent max-width and horizontal padding
- Empty states with a single clear next action

## Mobile requirements

- Minimum 44px interactive target height.
- No horizontal page scrolling at 375px and 390px widths.
- Fixed/sticky controls must not cover form actions.
- Avoid multiple floating buttons on the same screen.
- Long tool names should truncate cleanly rather than wrap character-by-character.

## Implementation order

1. Simplify `DashboardLayout.tsx` navigation and footer.
2. Standardise page headers and primary actions.
3. Audit mobile overflow at 375px and 390px.
4. Consolidate duplicate controls.
5. Perform an authenticated navigation smoke test for every retained route.

## Non-goals

- Do not redesign the brand.
- Do not remove routes or features.
- Do not change database or authentication code.
- Do not perform this work during active production recovery if it risks deployment stability.
