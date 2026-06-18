import { getDb } from './db';
  import { designerProfiles, designerCollections, wardrobeItems } from '../drizzle/schema';
  import { eq, and, sql, asc } from 'drizzle-orm';

  function pollinationsUrl(prompt: string): string {
    return (
      'https://image.pollinations.ai/prompt/' +
      encodeURIComponent(prompt) +
      '%2C%20product%20photo%2C%20plain%20white%20background%2C%20studio%20lighting%2C%20fashion%20photography?width=512&height=512&nologo=true&model=flux'
    );
  }

  const ALL_NEW_COLLECTIONS = [
    {
      name: "Emergency Services Essentials",
      description: "Production-ready uniforms for Police, Fire, and Paramedic scenes. Optimized for high-fidelity rendering and continuity.",
      collectionType: "uniform",
      season: "All-Season",
      year: 2026,
      styleTags: ["professional", "emergency", "tactical"],
      collectionPriceAud: 450,
      items: [
        { name: "Police Patrol Uniform (Dark Blue)", category: "uniform", subcategory: "police", genderFit: "unisex", colors: ["dark blue"], retailPriceAud: 300, referencePrompt: "A professional dark blue police patrol uniform with badge and utility belt." },
        { name: "Firefighter Turnout Gear (Tan)", category: "uniform", subcategory: "fire", genderFit: "unisex", colors: ["tan"], retailPriceAud: 300, referencePrompt: "Heavy-duty tan firefighter turnout gear with reflective strips and helmet." },
        { name: "Paramedic Response Uniform (Green/Navy)", category: "uniform", subcategory: "paramedic", genderFit: "unisex", colors: ["green", "navy"], retailPriceAud: 300, referencePrompt: "A high-visibility paramedic response uniform with medical patches." },
        { name: "Hospital Scrub Set (Light Blue)", category: "uniform", subcategory: "nurse", genderFit: "unisex", colors: ["light blue"], retailPriceAud: 300, referencePrompt: "Standard light blue hospital scrubs for nurses and medical staff." },
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
        { name: "Classic Private School Blazer (Navy)", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["navy"], retailPriceAud: 300, referencePrompt: "A classic navy blue school blazer with gold buttons and crest." },
        { name: "Pleated School Skirt (Grey)", category: "uniform", subcategory: "school", genderFit: "female", colors: ["grey"], retailPriceAud: 300, referencePrompt: "A traditional grey pleated school skirt, knee-length." },
        { name: "White School Dress Shirt", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["white"], retailPriceAud: 300, referencePrompt: "A crisp white long-sleeved school dress shirt." },
        { name: "School V-Neck Sweater (Maroon)", category: "uniform", subcategory: "school", genderFit: "unisex", colors: ["maroon"], retailPriceAud: 300, referencePrompt: "A maroon v-neck school sweater with ribbing." },
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
        { name: "Elite Soccer Kit (Home/Away)", category: "sportswear", subcategory: "soccer", genderFit: "unisex", colors: ["red", "white"], retailPriceAud: 300, referencePrompt: "A modern soccer kit including jersey, shorts, and high socks." },
        { name: "Pro-Basketball Uniform (Gold/Purple)", category: "sportswear", subcategory: "basketball", genderFit: "unisex", colors: ["gold", "purple"], retailPriceAud: 300, referencePrompt: "A high-performance basketball jersey and mesh shorts." },
        { name: "Track & Field Compression Set", category: "sportswear", subcategory: "athletics", genderFit: "unisex", colors: ["black", "neon green"], retailPriceAud: 300, referencePrompt: "A sleek compression set for track and field athletes." },
        { name: "Premium Tennis Whites", category: "sportswear", subcategory: "tennis", genderFit: "female", colors: ["white"], retailPriceAud: 300, referencePrompt: "A classic white tennis dress with pleated skirt." },
      ]
    },
    {
      name: "Power & Prestige: Executive Wardrobe",
      description: "Premium tailored suits and professional powersuits for high-stakes corporate and dramatic scenes.",
      collectionType: "fashion",
      season: "All-Season",
      year: 2026,
      styleTags: ["professional", "luxury", "tailored", "corporate"],
      collectionPriceAud: 600,
      items: [
        { name: "The CEO Power Suit (Charcoal)", category: "fashion", subcategory: "menswear", genderFit: "male", colors: ["charcoal"], retailPriceAud: 500, referencePrompt: "A sharp, slim-fit charcoal grey wool suit with a subtle pinstripe, white dress shirt, and silk tie." },
        { name: "Executive Structured Blazer (Emerald)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["emerald"], retailPriceAud: 500, referencePrompt: "A bold emerald green structured blazer with gold buttons, paired with matching tailored trousers." },
        { name: "Classic Navy Three-Piece Suit", category: "fashion", subcategory: "menswear", genderFit: "male", colors: ["navy"], retailPriceAud: 500, referencePrompt: "A traditional navy blue three-piece suit with a silk pocket square and polished leather shoes." },
        { name: "Modern Professional Jumpsuit (Cream)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["cream"], retailPriceAud: 500, referencePrompt: "A sleek, cream-colored professional jumpsuit with a cinched waist and wide-leg trousers." },
        { name: "Double-Breasted Power Jacket (Deep Red)", category: "fashion", subcategory: "womenswear", genderFit: "female", colors: ["deep red"], retailPriceAud: 500, referencePrompt: "A striking deep red double-breasted power jacket with sharp lapels and a tailored fit." },
        { name: "The Boardroom Watch (Silver/Black)", category: "accessory", subcategory: "watches", genderFit: "unisex", colors: ["silver", "black"], retailPriceAud: 150, referencePrompt: "A luxury silver watch with a black leather strap, visible on the wrist under a suit sleeve." },
      ]
    },
    {
      name: "Resort & High-Fashion Swim",
      description: "Luxury resort wear and high-performance competition gear for elite pool and yacht scenes.",
      collectionType: "swimwear",
      season: "Summer",
      year: 2026,
      styleTags: ["luxury", "resort", "performance", "high-fashion"],
      collectionPriceAud: 550,
      items: [
        { name: "Luxury Hardware One-Piece (Gold/Black)", category: "swimwear", subcategory: "swimsuits", genderFit: "female", colors: ["black", "gold"], retailPriceAud: 150, referencePrompt: "A luxury black one-piece swimsuit with gold hardware and elegant cut-outs." },
        { name: "Silk Resort Sarong (Azure)", category: "accessory", subcategory: "cover-ups", genderFit: "female", colors: ["azure"], retailPriceAud: 300, referencePrompt: "A flowing azure blue silk sarong with a tropical print, tied at the waist." },
        { name: "Performance Competition Racing Suit", category: "swimwear", subcategory: "swimsuits", genderFit: "unisex", colors: ["navy", "neon"], retailPriceAud: 150, referencePrompt: "A sleek, hydrodynamic racing swimsuit for professional athletes." },
        { name: "Sheer Designer Kaftan (Cream)", category: "accessory", subcategory: "cover-ups", genderFit: "female", colors: ["cream"], retailPriceAud: 100, referencePrompt: "A sheer cream-colored designer kaftan with intricate lace detailing." },
      ]
    }
  ];

  export async function runMasterSeed(userId: number) {
    const db = (await getDb())!;
    const existing = await db.select({ id: designerProfiles.id }).from(designerProfiles).where(eq(designerProfiles.brandName, "Lamalo Fashion")).limit(1);
    const designerProfileId = existing[0]?.id || 1;

    for (const col of ALL_NEW_COLLECTIONS) {
      // SELECT-first: use canonical (lowest-id) collection to avoid duplicates
      let _colRow = await db.select({ id: designerCollections.id })
        .from(designerCollections)
        .where(and(eq(designerCollections.designerProfileId, designerProfileId), eq(designerCollections.name, col.name)))
        .orderBy(asc(designerCollections.id))
        .limit(1);

      if (!_colRow.length) {
        await db.execute(sql`
          INSERT INTO designerCollections
            (designerProfileId, userId, name, description, collectionType, season, year,
             styleTags, visibility, licenseType, collectionPriceAud, published, publishedAt)
          VALUES
            (${designerProfileId}, ${userId}, ${col.name}, ${col.description},
             ${col.collectionType}, ${col.season ?? null}, ${col.year ?? null},
             ${col.styleTags ? JSON.stringify(col.styleTags) : null},
             ${'public'}, ${'full_license'}, ${col.collectionPriceAud ?? null},
             ${1}, ${new Date()})
        `);
        _colRow = await db.select({ id: designerCollections.id })
          .from(designerCollections)
          .where(and(eq(designerCollections.designerProfileId, designerProfileId), eq(designerCollections.name, col.name)))
          .orderBy(asc(designerCollections.id))
          .limit(1);
      }

      const collectionId: number = _colRow[0]?.id ?? 0;
      if (!collectionId) continue;

      for (const item of col.items) {
        const imgUrl = pollinationsUrl(item.referencePrompt);
        await db.execute(sql`
            INSERT IGNORE INTO wardrobeItems
              (collectionId, userId, designerProfileId, name, description, category,
               subcategory, wardrobeType, genderFit,
               colors, referencePrompt, primaryImageUrl, imageUrls,
               brandPlacementAllowed, shopfrontPlacementAllowed, characterWardrobeAllowed,
               costumeUseAllowed, commercialUseAllowed, licenseType, visibility, status,
               retailPriceAud)
            VALUES
              (${collectionId}, ${userId}, ${designerProfileId},
               ${item.name}, ${item.name}, ${item.category},
               ${item.subcategory ?? null}, ${'fashion'}, ${item.genderFit ?? null},
               ${item.colors ? JSON.stringify(item.colors) : null},
               ${item.referencePrompt ?? null}, ${imgUrl}, ${JSON.stringify([imgUrl])},
               ${0}, ${1}, ${1}, ${1}, ${1},
               ${'full_license'}, ${'public'}, ${'active'},
               ${item.retailPriceAud ?? null})
          `);
      }
    }
  }
  