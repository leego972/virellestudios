import { and, asc, eq, inArray } from "drizzle-orm";
import {
  designerCollections,
  designerProfiles,
  wardrobeItems,
} from "../../drizzle/schema";
import { getDb } from "../db";

export const LAMALO_WELCOME_BRANDS = [
  "Lamalo Fashion",
  "Lamalo Fashions",
  "Lamalo",
] as const;

export const LAMALO_WELCOME_ITEM_NAMES = [
  "Lamalo Premium Tee — Black",
  "Lamalo Bomber Jacket — Olive",
  "Lamalo Suit Jacket — Navy",
  "Lamalo Straight Denim — Indigo",
  "Lamalo Classic Polo — White",
  "Lamalo Structured Blazer — Black",
  "Lamalo Pure Silk Blouse — White",
  "Lamalo Satin Slip Dress — Champagne",
  "Lamalo Wrap Midi Dress — Sage Green",
  "Lamalo Wide-Leg Formal Trouser — Camel",
] as const;

const WELCOME_COLLECTION_NAME = "Lamalo Welcome Collection";
const WELCOME_COLLECTION_DESCRIPTION =
  "Ten production-ready virtual Lamalo garments reserved for the Virelle Studios new-member welcome gift.";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type LamaloWelcomeProfile = {
  id: number;
  userId: number;
};

type WelcomeItemDefinition = {
  name: (typeof LAMALO_WELCOME_ITEM_NAMES)[number];
  description: string;
  category: string;
  subcategory: string;
  genderFit: string;
  color: string;
  materials: string[];
  styleTags: string[];
  prompt: string;
};

const WELCOME_ITEMS: WelcomeItemDefinition[] = [
  {
    name: "Lamalo Premium Tee — Black",
    description: "Premium relaxed-fit Supima cotton crew-neck tee in black.",
    category: "tops",
    subcategory: "t-shirts",
    genderFit: "unisex",
    color: "Black",
    materials: ["Supima cotton"],
    styleTags: ["essential", "minimal", "casual"],
    prompt: "premium black Supima cotton crew-neck t-shirt, relaxed fit",
  },
  {
    name: "Lamalo Bomber Jacket — Olive",
    description: "Olive satin-shell bomber jacket with ribbed collar, cuffs and hem.",
    category: "outerwear",
    subcategory: "jackets",
    genderFit: "unisex",
    color: "Olive",
    materials: ["Satin nylon", "Ribbed knit"],
    styleTags: ["bomber", "streetwear", "minimal"],
    prompt: "olive satin bomber jacket, ribbed collar cuffs and hem",
  },
  {
    name: "Lamalo Suit Jacket — Navy",
    description: "Tailored navy single-breasted suit jacket with a clean modern cut.",
    category: "suits",
    subcategory: "suit-jackets",
    genderFit: "male",
    color: "Navy",
    materials: ["Wool blend"],
    styleTags: ["tailored", "formal", "modern"],
    prompt: "navy tailored single-breasted suit jacket, modern clean cut",
  },
  {
    name: "Lamalo Straight Denim — Indigo",
    description: "Classic indigo straight-leg denim with five-pocket construction.",
    category: "bottoms",
    subcategory: "jeans",
    genderFit: "unisex",
    color: "Indigo",
    materials: ["Cotton denim"],
    styleTags: ["denim", "classic", "everyday"],
    prompt: "indigo straight-leg denim jeans, classic five-pocket construction",
  },
  {
    name: "Lamalo Classic Polo — White",
    description: "White cotton-pique polo with a structured collar and two-button placket.",
    category: "tops",
    subcategory: "polos",
    genderFit: "unisex",
    color: "White",
    materials: ["Cotton pique"],
    styleTags: ["polo", "smart-casual", "classic"],
    prompt: "white cotton pique polo shirt, structured collar, two-button placket",
  },
  {
    name: "Lamalo Structured Blazer — Black",
    description: "Black structured blazer with defined shoulders and a refined silhouette.",
    category: "suits",
    subcategory: "blazers",
    genderFit: "female",
    color: "Black",
    materials: ["Wool blend"],
    styleTags: ["blazer", "tailored", "editorial"],
    prompt: "black structured tailored blazer, defined shoulders, refined silhouette",
  },
  {
    name: "Lamalo Pure Silk Blouse — White",
    description: "Fluid white pure-silk blouse with a softly draped neckline.",
    category: "tops",
    subcategory: "blouses",
    genderFit: "female",
    color: "White",
    materials: ["Pure silk"],
    styleTags: ["silk", "elegant", "minimal"],
    prompt: "white pure silk blouse, softly draped neckline, elegant fluid fabric",
  },
  {
    name: "Lamalo Satin Slip Dress — Champagne",
    description: "Champagne satin slip dress with a bias-cut silhouette and fine straps.",
    category: "dresses",
    subcategory: "slip-dresses",
    genderFit: "female",
    color: "Champagne",
    materials: ["Satin"],
    styleTags: ["slip-dress", "evening", "minimal"],
    prompt: "champagne satin slip dress, bias-cut silhouette, fine straps",
  },
  {
    name: "Lamalo Wrap Midi Dress — Sage Green",
    description: "Sage-green wrap midi dress with a defined waist and fluid skirt.",
    category: "dresses",
    subcategory: "midi-dresses",
    genderFit: "female",
    color: "Sage Green",
    materials: ["Viscose blend"],
    styleTags: ["wrap-dress", "midi", "soft-tailoring"],
    prompt: "sage green wrap midi dress, defined waist, fluid skirt",
  },
  {
    name: "Lamalo Wide-Leg Formal Trouser — Camel",
    description: "Camel wide-leg formal trousers with a high waist and pressed crease.",
    category: "bottoms",
    subcategory: "formal-trousers",
    genderFit: "female",
    color: "Camel",
    materials: ["Wool blend"],
    styleTags: ["wide-leg", "formal", "tailored"],
    prompt: "camel wide-leg formal trousers, high waist, pressed crease",
  },
];

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 1;
}

function welcomeImageUrl(item: WelcomeItemDefinition): string {
  const prompt = [
    `Professional fashion catalogue photograph of ${item.name}`,
    item.prompt,
    "single complete garment fully visible",
    "neutral warm-grey studio background",
    "soft editorial lighting",
    "realistic textile detail",
    "no model",
    "no mannequin",
    "no text",
    "no logo",
    "no watermark",
  ].join(", ");
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true&model=flux&seed=${stableSeed(item.name)}`;
}

export type LamaloWelcomeChoice = {
  id: number;
  name: (typeof LAMALO_WELCOME_ITEM_NAMES)[number];
  description: string;
  category: string;
  subcategory: string;
  genderFit: string;
  colors: string[];
  referencePrompt: string;
  primaryImageUrl: string;
};

/**
 * Stable presentation contract for the welcome picker. These ten choices are
 * deliberately independent of database readiness so the modal always renders.
 * The selected names are resolved to real wardrobe item IDs during claim.
 */
export const LAMALO_WELCOME_CHOICES: LamaloWelcomeChoice[] = WELCOME_ITEMS.map(
  (item, index) => ({
    id: index + 1,
    name: item.name,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    genderFit: item.genderFit,
    colors: [item.color],
    referencePrompt: item.prompt,
    primaryImageUrl: welcomeImageUrl(item),
  }),
);

async function activePublicItemCount(db: Database, profileId: number): Promise<number> {
  const rows = await db
    .select({ name: wardrobeItems.name })
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.designerProfileId, profileId),
        eq(wardrobeItems.visibility, "public"),
        eq(wardrobeItems.status, "active"),
      ),
    )
    .groupBy(wardrobeItems.name)
    .limit(LAMALO_WELCOME_ITEM_NAMES.length);
  return rows.length;
}

export async function findLamaloWelcomeProfile(
  db: Database,
): Promise<LamaloWelcomeProfile | null> {
  const profiles = await db
    .select({ id: designerProfiles.id, userId: designerProfiles.userId })
    .from(designerProfiles)
    .where(inArray(designerProfiles.brandName, [...LAMALO_WELCOME_BRANDS]))
    .orderBy(asc(designerProfiles.id));

  if (profiles.length === 0) return null;

  const ranked = await Promise.all(
    profiles.map(async profile => ({
      profile,
      count: await activePublicItemCount(db, profile.id),
    })),
  );

  ranked.sort((left, right) => right.count - left.count || left.profile.id - right.profile.id);
  return ranked[0]?.profile ?? null;
}

async function createProfile(db: Database, ownerUserId: number): Promise<LamaloWelcomeProfile> {
  const [result] = await db.insert(designerProfiles).values({
    userId: ownerUserId,
    brandName: "Lamalo Fashion",
    displayName: "Lamalo",
    profileType: "brand",
    bio: "Lamalo Fashion is the Virelle Studios in-house virtual fashion label.",
    website: "https://virelle.life/wardrobe-marketplace",
    contactEmail: "wardrobe@virelle.life",
    logoUrl: "/lamalo/lamalo-logo.png",
    verified: true,
    visibility: "public",
  });

  const insertId = Number((result as { insertId?: number }).insertId ?? 0);
  if (insertId > 0) return { id: insertId, userId: ownerUserId };

  const created = await db
    .select({ id: designerProfiles.id, userId: designerProfiles.userId })
    .from(designerProfiles)
    .where(eq(designerProfiles.brandName, "Lamalo Fashion"))
    .orderBy(asc(designerProfiles.id))
    .limit(1);

  if (!created[0]) throw new Error("Could not create the Lamalo welcome profile.");
  return created[0];
}

async function ensureWelcomeCollection(
  db: Database,
  profile: LamaloWelcomeProfile,
): Promise<number> {
  const existing = await db
    .select({ id: designerCollections.id })
    .from(designerCollections)
    .where(
      and(
        eq(designerCollections.designerProfileId, profile.id),
        eq(designerCollections.name, WELCOME_COLLECTION_NAME),
      ),
    )
    .orderBy(asc(designerCollections.id))
    .limit(1);

  if (existing[0]) return existing[0].id;

  const [result] = await db.insert(designerCollections).values({
    designerProfileId: profile.id,
    userId: profile.userId,
    name: WELCOME_COLLECTION_NAME,
    description: WELCOME_COLLECTION_DESCRIPTION,
    collectionType: "fashion_collection",
    season: "All-Season",
    year: 2026,
    styleTags: ["welcome-gift", "virtual-fashion", "production-ready"],
    coverImageUrl: "/lamalo/lamalo-logo.png",
    visibility: "public",
    licenseType: "full_license",
    licenseNotes: "Welcome gift items remain available in the member's Virelle wardrobe inventory.",
  });

  const insertId = Number((result as { insertId?: number }).insertId ?? 0);
  if (insertId > 0) return insertId;

  const created = await db
    .select({ id: designerCollections.id })
    .from(designerCollections)
    .where(
      and(
        eq(designerCollections.designerProfileId, profile.id),
        eq(designerCollections.name, WELCOME_COLLECTION_NAME),
      ),
    )
    .orderBy(asc(designerCollections.id))
    .limit(1);

  if (!created[0]) throw new Error("Could not create the Lamalo welcome collection.");
  return created[0].id;
}

export async function ensureLamaloWelcomeInventory(
  db: Database,
  ownerUserId: number,
): Promise<number> {
  let profile = await findLamaloWelcomeProfile(db);
  if (!profile) profile = await createProfile(db, ownerUserId);

  const collectionId = await ensureWelcomeCollection(db, profile);
  const existing = await db
    .select({ name: wardrobeItems.name })
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.designerProfileId, profile.id),
        inArray(wardrobeItems.name, [...LAMALO_WELCOME_ITEM_NAMES]),
      ),
    );
  const existingNames = new Set(existing.map(item => item.name));
  const missing = WELCOME_ITEMS.filter(item => !existingNames.has(item.name));

  if (missing.length > 0) {
    await db.insert(wardrobeItems).values(
      missing.map(item => {
        const primaryImageUrl = welcomeImageUrl(item);
        return {
          collectionId,
          userId: profile!.userId,
          designerProfileId: profile!.id,
          name: item.name,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          wardrobeType: "fashion",
          genderFit: item.genderFit,
          sizeRange: "XS-XXL",
          era: "Contemporary 2026",
          colors: [item.color],
          materials: item.materials,
          styleTags: item.styleTags,
          imageUrls: [primaryImageUrl],
          primaryImageUrl,
          referencePrompt: item.prompt,
          faceCoverage: "none",
          brandPlacementAllowed: false,
          shopfrontPlacementAllowed: true,
          characterWardrobeAllowed: true,
          costumeUseAllowed: true,
          commercialUseAllowed: true,
          licenseType: "full_license",
          licenseNotes: "Free Virelle Studios welcome-gift virtual wardrobe licence.",
          visibility: "public",
          status: "active",
        };
      }),
    );
  }

  const ready = await db
    .select({ name: wardrobeItems.name })
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.designerProfileId, profile.id),
        inArray(wardrobeItems.name, [...LAMALO_WELCOME_ITEM_NAMES]),
        eq(wardrobeItems.visibility, "public"),
        eq(wardrobeItems.status, "active"),
      ),
    )
    .groupBy(wardrobeItems.name);

  if (ready.length < LAMALO_WELCOME_ITEM_NAMES.length) {
    throw new Error("The ten Lamalo welcome outfits could not be prepared.");
  }

  return profile.id;
}
