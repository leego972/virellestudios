import { getDb } from './db';
import { designerProfiles, designerCollections, wardrobeItems } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';

const UNIFORM_COLLECTIONS = [
  {
    name: "Emergency Services Essentials",
    description: "Production-ready uniforms for Police, Fire, and Paramedic scenes. Optimized for high-fidelity rendering and continuity.",
    collectionType: "uniform",
    season: "All-Season",
    year: 2026,
    styleTags: ["professional", "emergency", "tactical"],
    collectionPriceAud: 450, // 15% discount for bundle
    items: [
      { name: "Police Patrol Uniform (Dark Blue)", category: "uniform", subcategory: "police", genderFit: "unisex", colors: ["dark blue"], retailPriceAud: 30, referencePrompt: "A professional dark blue police patrol uniform with badge and utility belt." },
      { name: "Firefighter Turnout Gear (Tan)", category: "uniform", subcategory: "fire", genderFit: "unisex", colors: ["tan"], retailPriceAud: 30, referencePrompt: "Heavy-duty tan firefighter turnout gear with reflective strips and helmet." },
      { name: "Paramedic Response Uniform (Green/Navy)", category: "uniform", subcategory: "paramedic", genderFit: "unisex", colors: ["green", "navy"], retailPriceAud: 30, referencePrompt: "A high-visibility paramedic response uniform with medical patches." },
      { name: "Hospital Scrub Set (Light Blue)", category: "uniform", subcategory: "nurse", genderFit: "unisex", colors: ["light blue"], retailPriceAud: 30, referencePrompt: "Standard light blue hospital scrubs for nurses and medical staff." },
    ]
  },
  {
    name: "Academic Excellence: School Uniforms",
    description: "Classic primary and secondary school uniforms. Perfect for coming-of-age and educational settings.",
    collectionType: "uniform",
    season: "All-Season",
    year: 2026,
    styleTags: ["academic", "classic", "student"],
    collectionPriceAud: 350,
    items: [
      { name: "Classic Private School Blazer (Navy)", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["navy"], retailPriceAud: 30, referencePrompt: "A classic navy blue school blazer with gold buttons and crest." },
      { name: "Pleated School Skirt (Grey)", category: "uniform", subcategory: "school", genderFit: "female", colors: ["grey"], retailPriceAud: 30, referencePrompt: "A traditional grey pleated school skirt, knee-length." },
      { name: "White School Dress Shirt", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["white"], retailPriceAud: 30, referencePrompt: "A crisp white long-sleeved school dress shirt." },
      { name: "School V-Neck Sweater (Maroon)", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["maroon"], retailPriceAud: 30, referencePrompt: "A maroon v-neck school sweater with ribbing." },
    ]
  },
  {
    name: "Pro-League Sporting Kits",
    description: "High-performance athletic gear for soccer, basketball, and track. Optimized for dynamic movement and rendering.",
    collectionType: "sportswear",
    season: "All-Season",
    year: 2026,
    styleTags: ["athletic", "performance", "sport"],
    collectionPriceAud: 500,
    items: [
      { name: "Elite Soccer Kit (Home/Away)", category: "sportswear", subcategory: "soccer", genderFit: "unisex", colors: ["red", "white"], retailPriceAud: 30, referencePrompt: "A modern soccer kit including jersey, shorts, and high socks." },
      { name: "Pro-Basketball Uniform (Gold/Purple)", category: "sportswear", subcategory: "basketball", genderFit: "unisex", colors: ["gold", "purple"], retailPriceAud: 30, referencePrompt: "A high-performance basketball jersey and mesh shorts." },
      { name: "Track & Field Compression Set", category: "sportswear", subcategory: "athletics", genderFit: "unisex", colors: ["black", "neon green"], retailPriceAud: 30, referencePrompt: "A sleek compression set for track and field athletes." },
      { name: "Premium Tennis Whites", category: "sportswear", subcategory: "tennis", genderFit: "female", colors: ["white"], retailPriceAud: 30, referencePrompt: "A classic white tennis dress with pleated skirt." },
    ]
  }
];

export async function runUniformSeed(userId: number) {
  const db = (await getDb())!;
  const existing = await db.select({ id: designerProfiles.id }).from(designerProfiles).where(eq(designerProfiles.brandName, "Lamalo Fashion")).limit(1);
  const designerProfileId = existing[0]?.id || 1;

  for (const col of UNIFORM_COLLECTIONS) {
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
