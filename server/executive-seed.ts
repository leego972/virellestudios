import { getDb } from './db';
import { designerProfiles, designerCollections, wardrobeItems } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

const EXECUTIVE_COLLECTIONS = [
  {
    name: "Power & Prestige: Executive Wardrobe",
    description: "Premium tailored suits and professional powersuits for high-stakes corporate and dramatic scenes. Engineered for visual authority and perfect continuity.",
    collectionType: "fashion",
    season: "All-Season",
    year: 2026,
    styleTags: ["professional", "luxury", "tailored", "corporate"],
    collectionPriceAud: 600, // Premium bundle price
    items: [
      { name: "The CEO Power Suit (Charcoal)", category: "fashion", subcategory: "menswear", genderFit: "male", colors: ["charcoal"], retailPriceAud: 40, referencePrompt: "A sharp, slim-fit charcoal grey wool suit with a subtle pinstripe, white dress shirt, and silk tie." },
      { name: "Executive Structured Blazer (Emerald)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["emerald"], retailPriceAud: 40, referencePrompt: "A bold emerald green structured blazer with gold buttons, paired with matching tailored trousers." },
      { name: "Classic Navy Three-Piece Suit", category: "fashion", subcategory: "menswear", genderFit: "male", colors: ["navy"], retailPriceAud: 40, referencePrompt: "A traditional navy blue three-piece suit with a silk pocket square and polished leather shoes." },
      { name: "Modern Professional Jumpsuit (Cream)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["cream"], retailPriceAud: 40, referencePrompt: "A sleek, cream-colored professional jumpsuit with a cinched waist and wide-leg trousers." },
      { name: "Double-Breasted Power Jacket (Deep Red)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["deep red"], retailPriceAud: 40, referencePrompt: "A striking deep red double-breasted power jacket with sharp lapels and a tailored fit." },
      { name: "The Boardroom Watch (Silver/Black)", category: "accessory", subcategory: "watches", genderFit: "unisex", colors: ["silver", "black"], retailPriceAud: 20, referencePrompt: "A luxury silver watch with a black leather strap, visible on the wrist under a suit sleeve." },
    ]
  }
];

export async function runExecutiveSeed(userId: number) {
  const db = (await getDb())!;
  const existing = await db.select({ id: designerProfiles.id }).from(designerProfiles).where(eq(designerProfiles.brandName, "Lamalo Fashion")).limit(1);
  const designerProfileId = existing[0]?.id || 1;

  for (const col of EXECUTIVE_COLLECTIONS) {
    await db.execute(sql`
        INSERT IGNORE INTO designerCollections
          (designerProfileId, userId, name, description, collectionType, season, year,
           styleTags, visibility, licenseType, collectionPriceAud, published, publishedAt)
        VALUES
          (${designerProfileId}, ${userId}, ${col.name}, ${col.description},
           ${col.collectionType}, ${col.season ?? null}, ${col.year ?? null},
           ${col.styleTags ? JSON.stringify(col.styleTags) : null},
           ${'public'}, ${'full_license'}, ${col.collectionPriceAud ?? null},
           ${1}, ${new Date()})
      `);
      const _colRow = await db.select({ id: designerCollections.id })
        .from(designerCollections)
        .where(and(eq(designerCollections.designerProfileId, designerProfileId), eq(designerCollections.name, col.name)))
        .limit(1);
      const collectionId: number = _colRow[0]?.id ?? 0;
      if (!collectionId) continue;

    for (const item of col.items) {
      await db.execute(sql`
          INSERT IGNORE INTO wardrobeItems
            (collectionId, userId, designerProfileId, name, description, category,
             subcategory, wardrobeType, genderFit,
             colors, referencePrompt,
             brandPlacementAllowed, shopfrontPlacementAllowed, characterWardrobeAllowed,
             costumeUseAllowed, commercialUseAllowed, licenseType, visibility, status,
             retailPriceAud)
          VALUES
            (${collectionId}, ${userId}, ${designerProfileId},
             ${item.name}, ${item.name}, ${item.category},
             ${item.subcategory ?? null}, ${'fashion'}, ${item.genderFit ?? null},
             ${item.colors ? JSON.stringify(item.colors) : null},
             ${item.referencePrompt ?? null},
             ${0}, ${1}, ${1}, ${1}, ${1},
             ${'full_license'}, ${'public'}, ${'active'},
             ${item.retailPriceAud ?? null})
        `);
    }
  }
}
