# Lamalo second Adobe account handoff

## Purpose

Run a second Adobe Firefly production worker without duplicating any work from the existing worker.

## Source of truth

- Repository: `leego972/virellestudios`
- Catalogue source: `server/lamalo-seed.ts`
- Existing completed work: `docs/lamalo-image-production.json`
- Worker A progress: `docs/lamalo-image-production-worker-a.json`
- Worker B progress: `docs/lamalo-image-production-worker-b.json`

## Already complete

The 10 Welcome Gift images recorded in `docs/lamalo-image-production.json` are complete. Do not regenerate them.

## Deterministic catalogue indexing

Expand every Lamalo item colourway from `ALL_COLLECTIONS` in the exact order defined by `server/lamalo-seed.ts`.

Assign a 1-based ordinal to each expanded catalogue colourway:

- First expanded colourway = ordinal 1
- Second expanded colourway = ordinal 2
- Continue sequentially through all 26 collections

Every colourway is a separate item. Do not collapse colours into one product.

## Worker assignments

### Worker A — current Adobe account

Generate only odd ordinals:

`1, 3, 5, 7, ...`

Progress file:

`docs/lamalo-image-production-worker-a.json`

Adobe destination folder:

`Lamalo Catalogue Masters`

### Worker B — second Adobe account

Generate only even ordinals:

`2, 4, 6, 8, ...`

Progress file:

`docs/lamalo-image-production-worker-b.json`

Create an Adobe Creative Cloud folder named:

`Lamalo Catalogue Masters — Worker B`

## Worker B startup instruction

Read this handoff, `server/lamalo-seed.ts`, `docs/lamalo-image-production.json`, and `docs/lamalo-image-production-worker-b.json`.

Create an hourly background task that processes the next 20 uncompleted even-ordinal colourways per run. Use Adobe Firefly to generate one 2048×2048 PNG per colourway with `promptReasoner: quality`.

Required composition:

- One complete garment or accessory
- Fully visible and centred
- Slight three-quarter dimensional form
- Photorealistic material, seams, hardware and construction
- Neutral warm-grey seamless studio background
- Softbox lighting and subtle grounded shadow
- No person, visible mannequin, hanger, rack, unrelated prop, logo, watermark, duplicate item, malformed geometry or cropped component

Visually inspect every result. Regenerate defective outputs.

Save approved assets in `Lamalo Catalogue Masters — Worker B` and update only `docs/lamalo-image-production-worker-b.json` through a GitHub branch and merged pull request.

Do not edit Worker A's progress file. Do not regenerate odd ordinals. Do not regenerate the completed Welcome Gift images.

## Final reconciliation

When both worker files are complete, merge their asset records into the main production manifest and publish the website-ready copies to the selected CDN or object-storage origin.
