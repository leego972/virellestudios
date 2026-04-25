# Virelle v6.77 — Designer Wardrobe Section Brief

This pass adds a new **Designer Wardrobe** section where fashion designers, costume designers, brands, stylists, wardrobe departments, and production designers can upload wardrobe items and collections for directors to use in films.

In this product, **wardrobe** is the umbrella term. It includes fashion, costumes, period costumes, uniforms, fantasy/sci-fi outfits, character outfits, accessories, jewellery, bags, shoes, hats, fabrics/textiles, shopfront displays, boutique/showroom dressing, wardrobe department references, background-extra clothing, and fashion-led set dressing.

## Visual direction

Make this section feel **premium, cinematic, and fashion-house quality**, but still very simple to use.

The UI should feel like:

```txt
luxury lookbook + production asset library + director-friendly assignment tool
```

Design style:

- elegant cards
- editorial collection covers
- large image previews
- clean filters
- simple attach buttons
- minimal clutter
- clear licensing badges
- clear “Use on character” / “Use in scene” actions
- mobile-friendly grid

Avoid:

- confusing marketplace-heavy UI
- too many tiny controls
- checkout/payment flow
- cluttered admin tables
- anything that changes site branding, logo, opener, or watermark

## Hard no-touch areas

Do **not** edit:

- logo files
- `StudioOpener`
- opener video flow
- opener video assets
- watermark components
- watermark placement
- export watermark logic
- homepage/brand hero visuals

## Product name

User-facing: **Designer Wardrobe**

Use **Wardrobe** as the main navigation/product term, not only “fashion.” Costume use must be supported throughout the schema, UI, and prompt context.

Internal feature keys:

```txt
designer_wardrobe
designer_collections
wardrobe_asset_upload
wardrobe_attach_to_character
wardrobe_attach_to_scene
wardrobe_shopfront_placement
wardrobe_costume_reference
```

## Goal

Build a lean MVP that feels native to Virelle:

```txt
designer/costume designer uploads wardrobe collection → director browses → attach wardrobe pieces to characters/scenes → prompt context includes wardrobe/costume/shopfront/set-dressing references
```

Do not build a full marketplace checkout in this pass. This is a production asset library first, monetization later.

## User roles

Use existing users table/role system if possible.

For MVP, do **not** add a full new account type unless already easy. Instead add designer/wardrobe profile fields and ownership on wardrobe assets.

Designer / costume designer can:

- create a designer/wardrobe profile,
- create collections,
- upload wardrobe/costume items,
- mark visibility public/private/project-only,
- add metadata/licensing notes,
- view where their items are used if the director/project grants visibility.

Director/project owner can:

- browse public wardrobe collections,
- upload private wardrobe/costume items to their project,
- attach wardrobe items to characters,
- attach wardrobe/costume items to scenes,
- mark wardrobe items as shopfront/set-dressing references,
- include selected wardrobe items in generation prompt context.

## Phase 1 — verify current build

Run:

```bash
pnpm check
pnpm build
```

If either fails, fix build errors only before implementing.

## Phase 2 — database / schema

Use Drizzle/MySQL conventions already in the repo.

Add migration:

```txt
drizzle/0028_designer_wardrobe_v677.sql
```

### designerProfiles

Create only if no equivalent exists.

Fields:

```txt
id INT AUTO_INCREMENT PRIMARY KEY
userId INT NOT NULL
brandName VARCHAR(255) NOT NULL
displayName VARCHAR(255)
profileType VARCHAR(64) DEFAULT 'designer'
bio TEXT
website VARCHAR(512)
instagram VARCHAR(255)
contactEmail VARCHAR(320)
logoUrl TEXT
verified BOOLEAN DEFAULT false
visibility VARCHAR(32) DEFAULT 'public'
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

`profileType` values:

```txt
designer
costume_designer
stylist
wardrobe_department
brand
production_designer
other
```

### designerCollections

Fields:

```txt
id INT AUTO_INCREMENT PRIMARY KEY
designerProfileId INT NOT NULL
userId INT NOT NULL
name VARCHAR(255) NOT NULL
description TEXT
collectionType VARCHAR(64) DEFAULT 'wardrobe'
season VARCHAR(128)
year INT
styleTags JSON
coverImageUrl TEXT
visibility VARCHAR(32) DEFAULT 'public'
licenseType VARCHAR(64) DEFAULT 'reference_only'
licenseNotes TEXT
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

`collectionType` values:

```txt
wardrobe
fashion_collection
costume_collection
period_costumes
uniforms
fantasy_sci_fi
retail_shopfront
textiles
accessories
set_dressing
other
```

### wardrobeItems

Fields:

```txt
id INT AUTO_INCREMENT PRIMARY KEY
collectionId INT
userId INT NOT NULL
designerProfileId INT
projectId INT
name VARCHAR(255) NOT NULL
description TEXT
category VARCHAR(64)
subcategory VARCHAR(128)
wardrobeType VARCHAR(64) DEFAULT 'wardrobe'
genderFit VARCHAR(64)
sizeRange VARCHAR(128)
era VARCHAR(128)
colors JSON
materials JSON
styleTags JSON
imageUrls JSON
primaryImageUrl TEXT
referencePrompt TEXT
brandPlacementAllowed BOOLEAN DEFAULT false
shopfrontPlacementAllowed BOOLEAN DEFAULT true
characterWardrobeAllowed BOOLEAN DEFAULT true
costumeUseAllowed BOOLEAN DEFAULT true
commercialUseAllowed BOOLEAN DEFAULT false
licenseType VARCHAR(64) DEFAULT 'reference_only'
licenseNotes TEXT
visibility VARCHAR(32) DEFAULT 'public'
status VARCHAR(32) DEFAULT 'active'
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

`wardrobeType` values:

```txt
fashion
costume
period_costume
uniform
fantasy_sci_fi
character_signature
background_extra
accessory
textile
shopfront_display
set_dressing
other
```

Category examples:

```txt
outerwear
top
bottom
dress
suit
shoes
accessory
jewellery
bag
hat
uniform
costume
armour
robe
fabric
set_dressing
shopfront_display
other
```

### wardrobeAssignments

Connect wardrobe items to projects, characters, or scenes.

Fields:

```txt
id INT AUTO_INCREMENT PRIMARY KEY
userId INT NOT NULL
projectId INT NOT NULL
wardrobeItemId INT NOT NULL
assignmentType VARCHAR(64) NOT NULL
characterId INT
sceneId INT
usageMode VARCHAR(64) DEFAULT 'reference'
placementNotes TEXT
promptWeight INT DEFAULT 50
locked BOOLEAN DEFAULT false
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
```

Assignment types:

```txt
character_wardrobe
character_costume
scene_set_dressing
shopfront_display
background_extra
mood_reference
period_reference
uniform_reference
```

Usage modes:

```txt
reference
must_match
inspired_by
background_only
brand_visible
costume_accurate
period_accurate
```

## Phase 3 — Drizzle schema

Update `drizzle/schema.ts` with:

- `designerProfiles`
- `designerCollections`
- `wardrobeItems`
- `wardrobeAssignments`
- inferred types

Do not rename existing `characters.wardrobe` or `scenes.wardrobe`. These continue working. New tables complement them.

## Phase 4 — backend router

Add router section:

```txt
designerWardrobe
```

Procedures:

- `designerWardrobe.getMyProfile`
- `designerWardrobe.upsertProfile`
- `designerWardrobe.createCollection`
- `designerWardrobe.listCollections`
- `designerWardrobe.createWardrobeItem`
- `designerWardrobe.listWardrobeItems`
- `designerWardrobe.attachToCharacter`
- `designerWardrobe.attachToScene`
- `designerWardrobe.listAssignmentsForProject`
- `designerWardrobe.removeAssignment`

Rules:

- validate project ownership before attaching anything to a project
- public items visible to authenticated users
- private items only visible to owner unless project-linked
- license notes must be returned before directors use items
- no raw unsafe HTML
- for MVP, image URL entry is acceptable if direct upload is heavy

## Phase 5 — prompt context integration

Update existing prompt-context utilities without replacing the generation engine.

Add helper:

```ts
getWardrobePromptContextForScene(sceneId, userId)
```

It should return concise prompt context:

```txt
Character wardrobe/costume references:
- Character A should wear: [item name], [referencePrompt], colors/materials, usageMode.

Scene set dressing / shopfront:
- Boutique front or costume room displays: [collection/item names], style tags, placement notes.

Rules:
- Respect commercial/license notes.
- Do not overuse brand logos unless brandPlacementAllowed is true.
- For costume_accurate / period_accurate, preserve era, materials, silhouette, and cultural details.
```

Important:

- Keep context short.
- Use item names/descriptions/referencePrompt/styleTags.
- Include image URLs as reference images only if existing generation provider supports reference images.
- Do not send private designer assets into prompts for projects that do not have access.
- Do not alter actual generation engine selection.

## Phase 6 — frontend pages/components

Add pages:

```txt
client/src/pages/DesignerWardrobePage.tsx
```

Optional if simple:

```txt
client/src/pages/DesignerCollectionPage.tsx
```

Add components if useful:

```txt
DesignerProfileCard
WardrobeCollectionCard
WardrobeItemCard
WardrobeAttachDialog
WardrobeAssignmentsPanel
```

### Designer Wardrobe main page

Routes:

```txt
/designer-wardrobe
/projects/:projectId/wardrobe
```

Tabs:

```txt
Browse Collections
My Designer Profile
My Collections
Project Wardrobe
Assignments
```

MVP UI fields:

- create/edit profile
- create collection
- add item via image URL(s) + metadata
- browse/filter by category/type/style/color/era
- attach item to character
- attach item to scene/shopfront
- view assignments

### Fancy but user-friendly UI requirements

Make the UI feel polished without making it hard to use:

- top hero panel with “Designer Wardrobe” and a short director-friendly explanation
- large visual collection cards with cover image, collection type, designer name, license badge
- wardrobe item cards with primary image, wardrobe type, category, colors, license badge, visibility badge
- quick filters: All, Fashion, Costume, Period, Uniforms, Accessories, Shopfront, Project-only, Mine
- one primary action per card: `Use in project`
- attach dialog with two clear choices: `Use on character` or `Use in scene/shopfront`
- visible licensing note before assignment
- clear empty state: “Add your first wardrobe item” / “No public wardrobe collections yet”
- mobile-friendly 1-column cards, desktop 3-column grid
- no hidden destructive actions
- no confusing marketplace checkout

If direct upload is heavy, support image URL first and show clear copy: “Direct upload can be added next; for now paste hosted image URLs.”

## Phase 7 — project workflow integration

Add a card/link in project tools/production area:

```txt
Designer Wardrobe
```

The director should find it from project detail/command center.

Add `WardrobeAssignmentsPanel` near Production Elements if low risk.

## Phase 8 — feature registry

Update `shared/feature-registry.ts`:

```ts
{
  id: 'designer-wardrobe',
  label: 'Designer Wardrobe',
  icon: '👗',
  category: 'Production',
  webPath: '/designer-wardrobe',
  description: 'Upload and assign wardrobe, costume, and shopfront looks',
  minTier: 'indie',
  hasNative: false,
  isNew: true,
}
```

## Phase 9 — permissions / safety

Rules:

- user edits only their own designer profile, collections, and wardrobe items
- project owner/editor can attach visible wardrobe items to their project
- private wardrobe items can only be used by owner unless explicitly project-linked
- public items can be browsed by authenticated users
- hidden/private items must not leak through search
- contact email visible only if profile visibility allows it
- license notes visible to directors before use

## Phase 10 — docs/report

Create:

```txt
docs/VIRELLE_V677_DESIGNER_WARDROBE_REPORT.md
```

Include:

- files changed
- tables added
- routes/procedures added
- UI pages/components added
- prompt integration points
- direct upload support status
- license/permission behavior
- build results
- manual QA checklist
- remaining gaps

## Manual QA checklist

1. Create designer/wardrobe profile.
2. Create fashion collection.
3. Create costume collection.
4. Add wardrobe item with image URL and metadata.
5. Browse public collection as a director.
6. Attach fashion item to a character.
7. Attach costume item to a character.
8. Attach item to a shopfront scene.
9. Confirm assignments appear in project wardrobe panel.
10. Confirm scene prompt context includes wardrobe/costume/shopfront details.
11. Confirm private item does not appear publicly.
12. Confirm brand-visible usage is blocked unless allowed.
13. Confirm costume/period fields appear in prompt context.
14. Confirm license notes are visible before use.
15. Confirm no expensive AI/video generation is triggered by browsing/assigning.
16. Confirm logo/opener/watermark untouched.
17. Run `pnpm check` and `pnpm build`.

## Out of scope for MVP

Do not build yet unless trivial:

- full paid marketplace checkout
- designer payouts
- contracts/e-signatures
- automatic logo placement
- AI try-on previews
- direct 3D garment simulation
- native mobile UI
- automated legal clearance
- public SEO storefront pages

## Final verification

Run:

```bash
pnpm check
pnpm build
```

Fix only build/runtime errors. Do not add unrelated features.
