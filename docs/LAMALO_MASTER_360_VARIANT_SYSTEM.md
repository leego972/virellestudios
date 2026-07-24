# Lamalo master 360° reference and colour-SKU system

## Commercial contract

Every colour remains a separate marketplace product.

For example:

- `Lamalo Premium Tee — White`
- `Lamalo Premium Tee — Black`
- `Lamalo Premium Tee — Navy`

Each row has its own item ID, selected colour, Stripe checkout, purchase receipt and permanent buyer-owned wardrobe copy. Buying one colour does not grant another colour.

## Reference-asset contract

The product rows share only the base garment's approved construction reference pack. A reference pack represents one immutable design and contains:

- 12 views for simple garments;
- 24 views for structured or complex garments, footwear, bags, uniforms and outerwear;
- at least six approved views before it can be marked 360-ready;
- front three-quarter, front, back and side as the first four canonical references.

The pack must preserve the same cut, seams, proportions, hardware, closures and material behaviour in every view. It is generated in a neutral master colour so it cannot accidentally replace the separately purchased colour.

## Scene continuity

The selected colour lives in the colour SKU's `colors` and `referencePrompt` fields. The scene compiler adds:

- exact selected-colour hard lock;
- master design identity;
- multi-angle construction lock;
- immutable cut, material, fit and silhouette requirements;
- continuity carry-forward until a replacement costume is assigned.

The user's permanent inventory snapshot copies the exact colour SKU and its current reference pack. Later marketplace edits cannot change an existing production's purchased wardrobe reference.

## Catalogue display

The marketplace groups separate colour SKUs under one base design card. Colour swatches select the concrete item ID that will be purchased. The purchase button identifies the selected colour, and the UI states that the colour is a separate permanent inventory item.

## Added ranges

- Women's lingerie panties: classic brief, bikini brief, high-waist brief, seamless brief, thong, boyshort and lace brief.
- Men's underwear: woven boxer shorts, boxer briefs, trunks, lounge boxers and long-leg boxer briefs.
- Women's swimwear: existing swimwear plus separately purchasable triangle, bandeau and halter bikini tops and classic, high-waist and cheeky bikini bottoms.
- Existing men's swimwear, women's one-pieces, bikini sets, boardshorts, swim trunks and comfort swimwear remain available.

## Production workers

Workers no longer generate one complete source image for every colourway. They traverse base designs in exact seed order, with Worker A taking odd base-design ordinals and Worker B taking even ordinals. Each approved master pack is attached to all separately purchasable colour SKUs for that design.

Existing Adobe asset IDs from the previous per-colour programme remain preserved as legacy evidence. They are not counted as completed 360 reference packs unless they satisfy the new angle and inspection requirements.
