import { and, asc, eq, like } from "drizzle-orm";
import { getDb } from "../db";
import { designerProfiles, wardrobeItems } from "../../drizzle/schema";

export const LAMALO_BRAND_NAME = "Lamalo Fashion";
export const LAMALO_MINIMUM_360_ANGLES = 6;
export const LAMALO_STANDARD_360_ANGLES = 12;
export const LAMALO_COMPLEX_360_ANGLES = 24;

export interface LamaloVariantMetadata {
  baseDesignName: string;
  selectedColour?: string;
  masterReferenceKey: string;
  angleTarget: number;
  referencePackReady: boolean;
}

function jsonStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => entry.trim());
  }
  if (typeof value === "string" && value.trim()) {
    try {
      return jsonStrings(JSON.parse(value));
    } catch {
      return [value.trim()];
    }
  }
  return [];
}

export function lamaloBaseDesignName(itemName: string): string {
  return String(itemName || "").split(" — ")[0]?.trim() || String(itemName || "").trim();
}

export function lamaloSlug(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function lamaloMasterReferenceKey(baseDesignName: string): string {
  return `lamalo-master:${lamaloSlug(lamaloBaseDesignName(baseDesignName))}`;
}

export function lamaloReferenceAngleTarget(category?: string | null, subcategory?: string | null): number {
  const combined = `${category || ""} ${subcategory || ""}`.toLowerCase();
  if (/outerwear|coat|jacket|blazer|suit|dress|jumpsuit|footwear|shoe|boot|bag|handbag|uniform|armour|costume/.test(combined)) {
    return LAMALO_COMPLEX_360_ANGLES;
  }
  return LAMALO_STANDARD_360_ANGLES;
}

export function buildLamaloVariantTags(input: {
  baseDesignName: string;
  selectedColour: string;
  category?: string | null;
  subcategory?: string | null;
  existingTags?: unknown;
  referencePackReady?: boolean;
}): string[] {
  const angleTarget = lamaloReferenceAngleTarget(input.category, input.subcategory);
  const managedPrefixes = [
    "lamalo-master:",
    "selected-colour:",
    "reference-angle-target:",
    "reference-pack:",
  ];
  const existing = jsonStrings(input.existingTags).filter(
    (tag) => !managedPrefixes.some((prefix) => tag.startsWith(prefix)),
  );
  return Array.from(new Set([
    ...existing,
    "lamalo-colour-sku",
    "separate-purchase",
    "shared-master-geometry",
    lamaloMasterReferenceKey(input.baseDesignName),
    `selected-colour:${lamaloSlug(input.selectedColour)}`,
    `reference-angle-target:${angleTarget}`,
    input.referencePackReady ? "reference-pack:360-ready" : "reference-pack:pending",
  ]));
}

export function wardrobeReferenceImages(item: {
  primaryImageUrl?: string | null;
  imageUrls?: unknown;
}, max = LAMALO_STANDARD_360_ANGLES): string[] {
  const values = [item.primaryImageUrl, ...jsonStrings(item.imageUrls)]
    .filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value.trim()))
    .map((value) => value.trim());
  return Array.from(new Set(values)).slice(0, Math.max(1, max));
}

export function lamaloVariantMetadata(item: {
  name: string;
  colors?: unknown;
  category?: string | null;
  subcategory?: string | null;
  styleTags?: unknown;
  imageUrls?: unknown;
  primaryImageUrl?: string | null;
}): LamaloVariantMetadata {
  const baseDesignName = lamaloBaseDesignName(item.name);
  const tags = jsonStrings(item.styleTags);
  const colours = jsonStrings(item.colors);
  const targetTag = tags.find((tag) => tag.startsWith("reference-angle-target:"));
  const parsedTarget = Number(targetTag?.split(":").pop());
  const angleTarget = Number.isInteger(parsedTarget) && parsedTarget >= LAMALO_MINIMUM_360_ANGLES
    ? parsedTarget
    : lamaloReferenceAngleTarget(item.category, item.subcategory);
  const images = wardrobeReferenceImages(item, LAMALO_COMPLEX_360_ANGLES);
  return {
    baseDesignName,
    selectedColour: colours[0],
    masterReferenceKey: tags.find((tag) => tag.startsWith("lamalo-master:")) || lamaloMasterReferenceKey(baseDesignName),
    angleTarget,
    referencePackReady: tags.includes("reference-pack:360-ready") && images.length >= LAMALO_MINIMUM_360_ANGLES,
  };
}

/**
 * Attaches one approved multi-angle master reference pack to every separately
 * purchasable colour SKU for a Lamalo base design. The colour remains locked by
 * each variant's own colors/referencePrompt fields; only the garment geometry
 * and construction reference set is shared.
 */
export async function applyLamaloMasterReferencePack(input: {
  baseDesignName: string;
  imageUrls: string[];
  primaryImageUrl?: string;
}): Promise<{ updatedVariants: number; referenceImageCount: number }> {
  const imageUrls = Array.from(new Set(input.imageUrls.map((url) => url.trim()).filter((url) => /^https?:\/\//i.test(url))));
  if (imageUrls.length < LAMALO_MINIMUM_360_ANGLES) {
    throw new Error(`A Lamalo master reference pack requires at least ${LAMALO_MINIMUM_360_ANGLES} approved angle images.`);
  }
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const [profile] = await db
    .select({ id: designerProfiles.id })
    .from(designerProfiles)
    .where(eq(designerProfiles.brandName, LAMALO_BRAND_NAME))
    .orderBy(asc(designerProfiles.id))
    .limit(1);
  if (!profile) throw new Error("Lamalo Fashion profile was not found.");

  const baseDesignName = lamaloBaseDesignName(input.baseDesignName);
  const variants = await db
    .select()
    .from(wardrobeItems)
    .where(and(
      eq(wardrobeItems.designerProfileId, profile.id),
      like(wardrobeItems.name, `${baseDesignName} — %`),
    ));
  if (!variants.length) throw new Error(`No Lamalo colour SKUs were found for ${baseDesignName}.`);

  const primaryImageUrl = input.primaryImageUrl?.trim() || imageUrls[0];
  for (const variant of variants) {
    const selectedColour = jsonStrings(variant.colors)[0] || variant.name.split(" — ").pop() || "unspecified";
    const styleTags = buildLamaloVariantTags({
      baseDesignName,
      selectedColour,
      category: variant.category,
      subcategory: variant.subcategory,
      existingTags: variant.styleTags,
      referencePackReady: true,
    });
    const basePrompt = String(variant.referencePrompt || "").replace(/; MASTER 360 REFERENCE PACK:[\s\S]*$/i, "").trim();
    const referencePrompt = `${basePrompt}; MASTER 360 REFERENCE PACK: preserve the exact construction, cut, proportions, seams, hardware, material behaviour and silhouette shown across the attached approved angle images; SELECTED COLOUR HARD-LOCK: ${selectedColour}; never transfer a different colour from the shared master reference pack.`;
    await db.update(wardrobeItems).set({
      primaryImageUrl,
      imageUrls,
      styleTags,
      referencePrompt,
    }).where(eq(wardrobeItems.id, variant.id));
  }

  return { updatedVariants: variants.length, referenceImageCount: imageUrls.length };
}
