import { and, asc, eq, like, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import { designerProfiles, wardrobeItems } from "../../drizzle/schema";

export const LAMALO_BRAND_NAME = "Lamalo Fashion";
export const LAMALO_TURNTABLE_FRAMES = 36;
export const LAMALO_STANDARD_REFERENCE_ANGLES = 12;
export const LAMALO_COMPLEX_REFERENCE_ANGLES = 24;
export const LAMALO_RENDER_PIPELINE_VERSION = 2;

export interface LamaloVariantMetadata {
  baseDesignName: string;
  selectedColour?: string;
  masterReferenceKey: string;
  continuityAngleTarget: number;
  turntableFrameCount: number;
  model3dUrl?: string;
  turntableReady: boolean;
}

export interface LamaloPublishedColourVariant {
  turntableFrameUrls: string[];
  continuityImageUrls: string[];
  primaryImageUrl?: string;
  solidColourHex?: string;
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

function validUrls(value: unknown, max = Number.POSITIVE_INFINITY): string[] {
  return Array.from(new Set(jsonStrings(value)
    .filter((url) => /^https:\/\//i.test(url))))
    .slice(0, max);
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
    .slice(0, 160);
}

export function lamaloMasterReferenceKey(input: string | {
  baseDesignName: string;
  genderFit?: string | null;
  category?: string | null;
  subcategory?: string | null;
}): string {
  if (typeof input === "string") return `lamalo-clothing:${lamaloSlug(lamaloBaseDesignName(input))}`;
  return [
    "lamalo-clothing",
    lamaloSlug(lamaloBaseDesignName(input.baseDesignName)),
    lamaloSlug(input.genderFit || "unisex"),
    lamaloSlug(input.category || "garment"),
    lamaloSlug(input.subcategory || "default"),
  ].join(":");
}

export function lamaloReferenceAngleTarget(category?: string | null, subcategory?: string | null): number {
  const combined = `${category || ""} ${subcategory || ""}`.toLowerCase();
  if (/outerwear|coat|jacket|blazer|suit|dress|jumpsuit|uniform|armour|costume|tracksuit|pyjama/.test(combined)) {
    return LAMALO_COMPLEX_REFERENCE_ANGLES;
  }
  return LAMALO_STANDARD_REFERENCE_ANGLES;
}

export function buildLamaloVariantTags(input: {
  baseDesignName: string;
  selectedColour: string;
  masterReferenceKey?: string;
  category?: string | null;
  subcategory?: string | null;
  existingTags?: unknown;
  turntableReady?: boolean;
}): string[] {
  const angleTarget = lamaloReferenceAngleTarget(input.category, input.subcategory);
  const managedPrefixes = [
    "lamalo-master:",
    "lamalo-clothing:",
    "selected-colour:",
    "reference-angle-target:",
    "reference-pack:",
    "turntable:",
    "render-pipeline:",
  ];
  const existing = jsonStrings(input.existingTags).filter(
    (tag) => !managedPrefixes.some((prefix) => tag.startsWith(prefix)),
  );
  const masterReferenceKey = input.masterReferenceKey || lamaloMasterReferenceKey(input.baseDesignName);
  return Array.from(new Set([
    ...existing,
    "lamalo-colour-sku",
    "separate-purchase",
    "shared-3d-master-geometry",
    masterReferenceKey,
    `selected-colour:${lamaloSlug(input.selectedColour)}`,
    `reference-angle-target:${angleTarget}`,
    `render-pipeline:${LAMALO_RENDER_PIPELINE_VERSION}`,
    input.turntableReady ? "reference-pack:360-ready" : "reference-pack:pending",
    input.turntableReady ? `turntable:${LAMALO_TURNTABLE_FRAMES}-ready` : "turntable:pending",
  ]));
}

/** Canonical 12/24 still references supplied to scene-generation providers. */
export function wardrobeReferenceImages(item: {
  primaryImageUrl?: string | null;
  imageUrls?: unknown;
}, max = LAMALO_STANDARD_REFERENCE_ANGLES): string[] {
  return validUrls([item.primaryImageUrl, ...jsonStrings(item.imageUrls)], Math.max(1, max));
}

/** All 36 deterministic frames used only by the interactive shop turntable. */
export function wardrobeTurntableFrames(item: {
  turntableFrameUrls?: unknown;
}): string[] {
  return validUrls(item.turntableFrameUrls, LAMALO_TURNTABLE_FRAMES);
}

export function lamaloVariantMetadata(item: {
  name: string;
  colors?: unknown;
  category?: string | null;
  subcategory?: string | null;
  genderFit?: string | null;
  styleTags?: unknown;
  imageUrls?: unknown;
  primaryImageUrl?: string | null;
  masterReferenceKey?: string | null;
  model3dUrl?: string | null;
  turntableFrameUrls?: unknown;
  turntableFrameCount?: number | null;
  turntableStatus?: string | null;
}): LamaloVariantMetadata {
  const baseDesignName = lamaloBaseDesignName(item.name);
  const colours = jsonStrings(item.colors);
  const frames = wardrobeTurntableFrames(item);
  const frameCount = Number(item.turntableFrameCount || frames.length || 0);
  const model3dUrl = /^https:\/\//i.test(item.model3dUrl || "") ? item.model3dUrl! : undefined;
  return {
    baseDesignName,
    selectedColour: colours[0],
    masterReferenceKey: item.masterReferenceKey || lamaloMasterReferenceKey({
      baseDesignName,
      genderFit: item.genderFit,
      category: item.category,
      subcategory: item.subcategory,
    }),
    continuityAngleTarget: lamaloReferenceAngleTarget(item.category, item.subcategory),
    turntableFrameCount: frameCount,
    model3dUrl,
    turntableReady: item.turntableStatus === "ready"
      && frameCount === LAMALO_TURNTABLE_FRAMES
      && frames.length === LAMALO_TURNTABLE_FRAMES
      && Boolean(model3dUrl),
  };
}

function assertPublishedVariant(variant: LamaloPublishedColourVariant, colour: string): void {
  const frames = validUrls(variant.turntableFrameUrls);
  if (frames.length !== LAMALO_TURNTABLE_FRAMES) {
    throw new Error(`${colour} requires exactly ${LAMALO_TURNTABLE_FRAMES} HTTPS turntable frames.`);
  }
  const references = validUrls(variant.continuityImageUrls);
  if (![LAMALO_STANDARD_REFERENCE_ANGLES, LAMALO_COMPLEX_REFERENCE_ANGLES].includes(references.length)) {
    throw new Error(`${colour} requires exactly 12 or 24 HTTPS continuity reference images.`);
  }
}

/**
 * Publishes one immutable GLB geometry master plus colour-specific renders to
 * every separately purchasable Lamalo colour SKU. Geometry is shared; product,
 * checkout, selected colour, turntable frames and inventory snapshots remain
 * separate per SKU.
 */
export async function applyLamaloMasterReferencePack(input: {
  baseDesignName: string;
  masterReferenceKey: string;
  model3dUrl: string;
  variantsByColourKey: Record<string, LamaloPublishedColourVariant>;
  genderFit?: string | null;
  category?: string | null;
  subcategory?: string | null;
}): Promise<{ updatedVariants: number; masterReferenceKey: string }> {
  if (!/^https:\/\//i.test(input.model3dUrl)) throw new Error("A public HTTPS GLB URL is required.");
  if (!input.masterReferenceKey.startsWith("lamalo-clothing:")) throw new Error("Invalid Lamalo clothing master reference key.");
  const variantEntries = Object.entries(input.variantsByColourKey);
  if (!variantEntries.length) throw new Error("No colour render variants were supplied.");
  for (const [colourKey, variant] of variantEntries) assertPublishedVariant(variant, colourKey);

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
  const conditions: SQL[] = [
    eq(wardrobeItems.designerProfileId, profile.id),
    like(wardrobeItems.name, `${baseDesignName} — %`),
  ];
  if (input.genderFit) conditions.push(eq(wardrobeItems.genderFit, input.genderFit));
  if (input.category) conditions.push(eq(wardrobeItems.category, input.category));
  if (input.subcategory) conditions.push(eq(wardrobeItems.subcategory, input.subcategory));

  const variants = await db.select().from(wardrobeItems).where(and(...conditions));
  if (!variants.length) throw new Error(`No Lamalo colour SKUs were found for ${input.masterReferenceKey}.`);

  let updatedVariants = 0;
  for (const variant of variants) {
    const selectedColour = jsonStrings(variant.colors)[0] || variant.name.split(" — ").pop() || "unspecified";
    const selectedColourKey = lamaloSlug(selectedColour);
    const published = input.variantsByColourKey[selectedColourKey];
    if (!published) throw new Error(`Published render variant is missing for ${selectedColour}.`);
    const turntableFrameUrls = validUrls(published.turntableFrameUrls);
    const imageUrls = validUrls(published.continuityImageUrls);
    const primaryImageUrl = published.primaryImageUrl || turntableFrameUrls[0];
    const styleTags = buildLamaloVariantTags({
      baseDesignName,
      selectedColour,
      masterReferenceKey: input.masterReferenceKey,
      category: variant.category,
      subcategory: variant.subcategory,
      existingTags: variant.styleTags,
      turntableReady: true,
    });
    const basePrompt = String(variant.referencePrompt || "")
      .replace(/; TRUE 3D MASTER:[\s\S]*$/i, "")
      .replace(/; MASTER 360 REFERENCE PACK:[\s\S]*$/i, "")
      .trim();
    const referencePrompt = `${basePrompt}; TRUE 3D MASTER: preserve the immutable cut, construction, proportions, seams, hardware, closures, material behaviour and silhouette from GLB ${input.model3dUrl}; SELECTED COLOUR HARD-LOCK: ${selectedColour}; use only the colour-specific reference frames attached to this purchased SKU; never substitute another colour.`;
    await db.update(wardrobeItems).set({
      primaryImageUrl,
      imageUrls,
      styleTags,
      referencePrompt,
      masterReferenceKey: input.masterReferenceKey,
      model3dUrl: input.model3dUrl,
      turntableFrameUrls,
      turntableFrameCount: LAMALO_TURNTABLE_FRAMES,
      turntableStatus: "ready",
      turntableUpdatedAt: new Date(),
      renderPipelineVersion: LAMALO_RENDER_PIPELINE_VERSION,
      selectedColourKey,
      solidColourHex: published.solidColourHex || null,
    }).where(eq(wardrobeItems.id, variant.id));
    updatedVariants += 1;
  }

  return { updatedVariants, masterReferenceKey: input.masterReferenceKey };
}
