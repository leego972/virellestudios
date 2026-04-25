# Virelle Studios — v6.77 Designer Wardrobe Section
**Build report — implementation against `docs/VIRELLE_V677_DESIGNER_WARDROBE_SECTION_BRIEF.md`**

Brief in repo: `docs/VIRELLE_V677_DESIGNER_WARDROBE_SECTION_BRIEF.md`

---

## What the brief asked for

A premium **Designer Wardrobe** section that becomes the umbrella for everything
a costume / fashion / production designer might bring to a film:

- Fashion (ready-to-wear, runway)
- Costumes (theatrical, character)
- Period costumes (era-accurate)
- Uniforms (military, service, sports, school)
- Fantasy & sci-fi outfits
- Character signature looks
- Accessories — broken out into **jewellery, bags, shoes, hats**
- Fabrics / textiles
- Shopfront / boutique displays
- Set dressing (fashion-led)
- Background-extra wardrobe

Designers maintain their own profile, group items into collections, set
licensing & visibility, and productions attach those items to characters or
scenes so the AI feeds them into every shot it generates.

Free to manage — no credits charged on this page.

---

## What shipped

### 1. Database — migration `drizzle/0028_designer_wardrobe_v677.sql`

Four new tables:

- `designer_profiles` — brand / studio / designer profile (one per user).
- `wardrobe_collections` — designer-owned groupings (season, costume set,
  shopfront capsule, textile catalogue).
- `wardrobe_items` — the actual pieces. Carries `wardrobe_type`, era, colors,
  materials, style tags, primary image + image gallery, reference prompt,
  five usage-permission flags, license type, visibility, optional collection
  link, optional project link.
- `wardrobe_assignments` — links a wardrobe item to a project + (character XOR
  scene), with assignment type, usage mode, placement notes, and
  `prompt_weight` so the AI can prioritise.

Schema is mirrored in `drizzle/schema.ts` and in the auto-migration table list
(`server/_core/autoMigrate.ts`) so a fresh Railway instance creates them on
boot.

### 2. Server CRUD — `server/db.ts`

~18 helpers covering profiles, collections, items, and assignments. Includes
license-aware helpers (`getActiveWardrobeAssignmentsForCharacter`,
`getActiveWardrobeAssignmentsForScene`,
`getWardrobeItemsForProject`).

### 3. AI prompt integration — `server/_core/cinematicPromptEngine.ts`

`buildScenePrompt` accepts an optional `wardrobeContext` block (per-character
wardrobe lines + scene-level wardrobe lines) and emits it under a clearly
labelled **DESIGNER WARDROBE — costume / fashion / set dressing references**
section. The block is cumulative with brands and never overrides the existing
brand allow / forbid logic.

### 4. Router wiring — `server/routers.ts`

- New helper `getWardrobePromptContextForScene(projectId, sceneId, characterIds)`
  pulls the active assignments for a scene and the relevant characters,
  formats them into the shape `cinematicPromptEngine` expects, and is called
  at **all 6 `buildScenePrompt` sites** so wardrobe affects every generation
  path: storyboard, shot list, single-shot, regenerate, and the two
  director-chat shot helpers.
- New `designerWardrobe` router (10 procedures):
  - `getMyProfile`, `upsertProfile`
  - `listCollections`, `createCollection`
  - `listWardrobeItems`, `createWardrobeItem`, `deleteWardrobeItem`
  - `listAssignmentsForProject`
  - `attachToCharacter`, `attachToScene`, `removeAssignment`
  - License guard: attach mutations refuse items whose owner has not
    granted the matching usage permission (e.g. cannot attach to a
    character if `characterWardrobeAllowed === false`).

### 5. Client page — `client/src/pages/DesignerWardrobePage.tsx` (new)

Single page mounted at **two routes**:

- `/designer-wardrobe` — standalone designer library
- `/projects/:projectId/wardrobe` — project-scoped (adds the **Project**
  tab, attach-to-character / attach-to-scene flow, and project-aware default
  visibility)

Tabs: **Browse Library · My Items · My Collections · Project Wardrobe**

- 16 category pills with iconography (Shirt, Crown, Shield, Wand2, Gem,
  ShoppingBag, Footprints, HardHat, Layers, Store, Sofa, Users …)
- Designer profile chip top-right (shows brand mark + tap to edit, or a
  prominent "Set up your designer profile" CTA when missing)
- Item dialog with category, subcategory, era, colors, materials, style
  tags, image, reference prompt, the 5 permission switches, license,
  visibility, and optional collection link
- Collection dialog with type / season / year / cover / license
- Attach dialog: pick character or scene, assignment type (everyday wardrobe,
  costume, scene set dressing, shopfront, background-extra, mood / period /
  uniform reference), usage mode (reference, must-match, inspired-by,
  costume-accurate, period-accurate, background-only, brand-visible),
  placement notes
- Premium dark amber-on-zinc palette throughout, matching `ProjectBrands`

### 6. Routing & navigation

- `client/src/App.tsx` — two new lazy routes registered next to brands.
- `client/src/pages/ProjectCommandCenterPage.tsx` — Quick actions strip now
  includes **"Designer Wardrobe (costumes, fashion, props) →"** under the
  brands link.

---

## Files touched

```
NEW   drizzle/0028_designer_wardrobe_v677.sql
NEW   client/src/pages/DesignerWardrobePage.tsx
EDIT  drizzle/schema.ts
EDIT  server/_core/autoMigrate.ts
EDIT  server/_core/cinematicPromptEngine.ts
EDIT  server/db.ts
EDIT  server/routers.ts
EDIT  client/src/App.tsx
EDIT  client/src/pages/ProjectCommandCenterPage.tsx
NEW   docs/VIRELLE_V677_DESIGNER_WARDROBE_SECTION_BRIEF.md   (the brief)
NEW   docs/VIRELLE_V677_DESIGNER_WARDROBE_REPORT.md          (this file)
```

## Files explicitly NOT touched (per standing instruction)

Gold Virelle Studios watermark, StudioOpener, GoldWatermarkLaunch, opener,
export-watermark, homepage hero, the green Leego logo (handled in a separate
v6.77 commit), any branding asset.

---

## Verification

- `pnpm check` — **PASS** (no TypeScript errors anywhere).
- `pnpm build` — **PASS** (Vite + esbuild bundle, only the standard
  chunk-size warning that is already noisy on the existing build; no errors,
  no failed modules).
- Auto-migration list updated, so the four wardrobe tables are created on
  the next Railway boot without a manual SQL step.
- Six `buildScenePrompt` call sites are wired with `wardrobeContext`; greps
  inside `server/routers.ts` confirm parity.

---

## How a designer / production uses it

1. Designer signs in, opens **Designer Wardrobe** from the sidebar (or from
   `/designer-wardrobe`).
2. Sets up their profile (brand, type, bio, website, IG, contact, logo).
3. Creates one or more collections (e.g. *"SS27"*, *"The Lighthouse — Costumes"*).
4. Adds wardrobe items, choosing a category (jewellery, bag, shoes, hat,
   period costume, uniform, etc.), uploading a primary image, writing the
   AI reference prompt, and ticking the usage permissions they allow.
5. A production opens **Designer Wardrobe** from a project's command centre,
   browses or selects from My Items, clicks **Attach**, and links the piece
   to a character (everyday wardrobe / costume) or to a scene (set dressing,
   shopfront, background extra, mood / period / uniform reference).
6. Every subsequent storyboard, shot list, single shot, regen, or director
   chat shot for that scene/character is generated with the wardrobe block
   appended to the cinematic prompt.

---

*Generated as part of the v6.77 Designer Wardrobe section build.*
