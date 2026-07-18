import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  designerCollections,
  designerProfiles,
  wardrobeAssignments,
  wardrobeItems,
  wardrobeLeases,
} from "../../drizzle/schema";
import { runLamaloSeed } from "../lamalo-seed";
import { validateWardrobeItemForInventory, type WardrobeItemRecord } from "./wardrobeContinuity";

export const LAMALO_BRAND_NAME = "Lamalo Fashion";
export const EXPECTED_LAMALO_COLLECTION_COUNT = 26;

export interface LamaloCollectionAudit {
  id: number;
  name: string;
  published: boolean;
  visibility: string;
  coverImageUrl?: string | null;
  itemCount: number;
  readyItemCount: number;
  invalidItemIds: number[];
  duplicateItemNames: string[];
  issues: string[];
}

export interface LamaloCatalogAudit {
  healthy: boolean;
  profileFound: boolean;
  profileId?: number;
  collectionCount: number;
  expectedCollectionCount: number;
  itemCount: number;
  readyItemCount: number;
  invalidItemCount: number;
  duplicateCollectionNames: string[];
  duplicateItemKeys: string[];
  emptyCollections: string[];
  unpublishedCollections: string[];
  collections: LamaloCollectionAudit[];
  issues: string[];
  auditedAt: string;
}

function usableImage(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const url = value.trim();
  return /^https?:\/\//i.test(url) && !/\/lamalo\//i.test(url) && !/placeholder/i.test(url);
}

function stableSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 1;
}

function pollinationsImageUrl(prompt: string, width: number, height: number): string {
  const encoded = encodeURIComponent(prompt.replace(/\s+/g, " ").trim().slice(0, 900));
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux&seed=${stableSeed(prompt)}`;
}

function jsonList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return jsonList(parsed);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function defaultItemPrompt(item: any): string {
  const colors = jsonList(item.colors);
  const materials = jsonList(item.materials);
  return [
    `Professional luxury fashion catalogue photograph of ${item.name}`,
    item.description,
    item.category && `${item.category} garment`,
    colors.length && `exact colours ${colors.join(", ")}`,
    materials.length && `exact materials ${materials.join(", ")}`,
    "single complete item fully visible, front three-quarter view, accurate cut and construction, neutral studio background, soft editorial lighting, realistic fabric texture, no model, no mannequin, no text, no logo, no watermark",
  ].filter(Boolean).join(", ");
}

function categoryPrice(category: string | null | undefined): number {
  switch (String(category || "").toLowerCase()) {
    case "tops": return 100;
    case "bottoms": return 250;
    case "outerwear": return 350;
    case "dresses": return 200;
    case "swimwear": return 150;
    case "footwear": return 300;
    case "accessories": return 100;
    case "watches": return 150;
    case "eyewear": return 100;
    case "bags": return 200;
    case "suits": return 500;
    case "uniforms":
    case "uniform": return 300;
    case "sportswear": return 300;
    case "knitwear": return 200;
    case "lingerie": return 100;
    case "sleepwear": return 100;
    default: return 100;
  }
}

function itemIssues(item: any): string[] {
  const issues = validateWardrobeItemForInventory(item as WardrobeItemRecord);
  const images = jsonList(item.imageUrls).filter(usableImage);
  if (!usableImage(item.primaryImageUrl) && images.length === 0) issues.push("Item has no production-ready HTTP image; local/placeholder catalogue images are not accepted.");
  if (!item.retailPriceAud || Number(item.retailPriceAud) <= 0) issues.push("Item has no valid purchase price.");
  if (item.visibility !== "public") issues.push("Item is not public.");
  if (item.status !== "active") issues.push("Item is not active.");
  if (item.licenseType !== "full_license") issues.push("Item is not configured with the required production licence.");
  return Array.from(new Set(issues));
}

async function repairLamaloRows(profileId: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");

  const profileRows = await dbConn.select().from(designerProfiles).where(eq(designerProfiles.id, profileId)).limit(1);
  const profile = profileRows[0];
  if (!profile) throw new Error("Lamalo profile disappeared during repair.");
  await dbConn.update(designerProfiles).set({
    logoUrl: usableImage(profile.logoUrl)
      ? profile.logoUrl
      : pollinationsImageUrl("Lamalo Fashion luxury black and gold fashion house logo, elegant letter L monogram, clean vector identity, no mockup", 1024, 512),
    verified: true,
    visibility: "public",
    membershipStatus: "active",
  }).where(eq(designerProfiles.id, profileId));

  let collections = await dbConn.select().from(designerCollections).where(eq(designerCollections.designerProfileId, profileId));
  const byCollectionName = new Map<string, typeof collections>();
  for (const collection of collections) {
    const key = collection.name.trim().toLowerCase();
    const group = byCollectionName.get(key) || [];
    group.push(collection);
    byCollectionName.set(key, group);
  }

  for (const group of byCollectionName.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.id - b.id);
    const canonical = sorted[0];
    const duplicateIds = sorted.slice(1).map((collection) => collection.id);
    await dbConn.update(wardrobeItems).set({ collectionId: canonical.id, designerProfileId: profileId }).where(inArray(wardrobeItems.collectionId, duplicateIds));
    await dbConn.update(wardrobeLeases).set({ collectionId: canonical.id }).where(inArray(wardrobeLeases.collectionId, duplicateIds));
    await dbConn.delete(designerCollections).where(inArray(designerCollections.id, duplicateIds));
  }

  collections = await dbConn.select().from(designerCollections).where(eq(designerCollections.designerProfileId, profileId));
  for (const collection of collections) {
    const coverPrompt = `Lamalo Fashion ${collection.name} complete fashion collection editorial campaign, coordinated outfits and accessories, luxury studio presentation, highly realistic textiles, cinematic soft light, clean background, no text, no watermark`;
    await dbConn.update(designerCollections).set({
      coverImageUrl: usableImage(collection.coverImageUrl) ? collection.coverImageUrl : pollinationsImageUrl(coverPrompt, 1280, 720),
      visibility: "public",
      published: true,
      publishedAt: collection.publishedAt || new Date(),
      licenseType: "full_license",
      licenseNotes: collection.licenseNotes || "One-time purchase grants ongoing use in the purchaser's Virelle Studios productions.",
    }).where(eq(designerCollections.id, collection.id));

    let items = await dbConn.select().from(wardrobeItems).where(and(
      eq(wardrobeItems.collectionId, collection.id),
      eq(wardrobeItems.designerProfileId, profileId),
    ));
    const byItemName = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      const group = byItemName.get(key) || [];
      group.push(item);
      byItemName.set(key, group);
    }

    for (const group of byItemName.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.id - b.id);
      const canonical = sorted[0];
      const duplicateIds = sorted.slice(1).map((item) => item.id);
      await dbConn.update(wardrobeAssignments).set({ wardrobeItemId: canonical.id }).where(inArray(wardrobeAssignments.wardrobeItemId, duplicateIds));
      await dbConn.update(wardrobeLeases).set({ wardrobeItemId: canonical.id }).where(inArray(wardrobeLeases.wardrobeItemId, duplicateIds));
      await dbConn.delete(wardrobeItems).where(inArray(wardrobeItems.id, duplicateIds));
    }

    items = await dbConn.select().from(wardrobeItems).where(and(
      eq(wardrobeItems.collectionId, collection.id),
      eq(wardrobeItems.designerProfileId, profileId),
    ));
    for (const item of items) {
      const referencePrompt = item.referencePrompt?.trim() || defaultItemPrompt(item);
      const existingImages = jsonList(item.imageUrls).filter(usableImage);
      const primaryImageUrl = usableImage(item.primaryImageUrl)
        ? item.primaryImageUrl!
        : existingImages[0] || pollinationsImageUrl(referencePrompt, 1024, 1024);
      await dbConn.update(wardrobeItems).set({
        referencePrompt,
        primaryImageUrl,
        imageUrls: existingImages.length ? existingImages : [primaryImageUrl],
        retailPriceAud: Number(item.retailPriceAud) > 0 ? item.retailPriceAud : categoryPrice(item.category),
        designerProfileId: profileId,
        collectionId: collection.id,
        characterWardrobeAllowed: true,
        costumeUseAllowed: true,
        commercialUseAllowed: true,
        licenseType: "full_license",
        visibility: "public",
        status: "active",
      }).where(eq(wardrobeItems.id, item.id));
    }
  }
}

export async function auditLamaloCatalog(): Promise<LamaloCatalogAudit> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");

  const profiles = await dbConn.select().from(designerProfiles).where(eq(designerProfiles.brandName, LAMALO_BRAND_NAME));
  const canonicalProfile = [...profiles].sort((a, b) => a.id - b.id)[0];
  if (!canonicalProfile) {
    return {
      healthy: false,
      profileFound: false,
      collectionCount: 0,
      expectedCollectionCount: EXPECTED_LAMALO_COLLECTION_COUNT,
      itemCount: 0,
      readyItemCount: 0,
      invalidItemCount: 0,
      duplicateCollectionNames: [],
      duplicateItemKeys: [],
      emptyCollections: [],
      unpublishedCollections: [],
      collections: [],
      issues: ["Lamalo Fashion designer profile is missing."],
      auditedAt: new Date().toISOString(),
    };
  }

  const collections = await dbConn.select().from(designerCollections).where(eq(designerCollections.designerProfileId, canonicalProfile.id));
  const collectionNameCounts = new Map<string, number>();
  for (const collection of collections) collectionNameCounts.set(collection.name.trim().toLowerCase(), (collectionNameCounts.get(collection.name.trim().toLowerCase()) || 0) + 1);
  const duplicateCollectionNames = Array.from(collectionNameCounts.entries()).filter(([, count]) => count > 1).map(([name]) => name).sort();

  const audits: LamaloCollectionAudit[] = [];
  const duplicateItemKeys: string[] = [];
  let itemCount = 0;
  let readyItemCount = 0;
  for (const collection of collections) {
    const items = await dbConn.select().from(wardrobeItems).where(and(eq(wardrobeItems.collectionId, collection.id), eq(wardrobeItems.designerProfileId, canonicalProfile.id)));
    const itemNameCounts = new Map<string, number>();
    for (const item of items) itemNameCounts.set(item.name.trim().toLowerCase(), (itemNameCounts.get(item.name.trim().toLowerCase()) || 0) + 1);
    const duplicateItemNames = Array.from(itemNameCounts.entries()).filter(([, count]) => count > 1).map(([name]) => name).sort();
    duplicateItemKeys.push(...duplicateItemNames.map((name) => `${collection.name}::${name}`));

    const invalidItemIds: number[] = [];
    for (const item of items) {
      itemCount++;
      if (itemIssues(item).length === 0) readyItemCount++;
      else invalidItemIds.push(item.id);
    }
    const issues: string[] = [];
    if (items.length === 0) issues.push("Collection contains no generated items.");
    if (!collection.published || collection.visibility !== "public") issues.push("Collection is not published publicly.");
    if (!usableImage(collection.coverImageUrl)) issues.push("Collection cover image is missing or not production-ready.");
    if (duplicateItemNames.length) issues.push(`Duplicate item names: ${duplicateItemNames.join(", ")}.`);
    if (invalidItemIds.length) issues.push(`${invalidItemIds.length} item(s) are not generation-ready.`);
    audits.push({
      id: collection.id,
      name: collection.name,
      published: collection.published,
      visibility: collection.visibility,
      coverImageUrl: collection.coverImageUrl,
      itemCount: items.length,
      readyItemCount: items.length - invalidItemIds.length,
      invalidItemIds,
      duplicateItemNames,
      issues,
    });
  }

  const emptyCollections = audits.filter((collection) => collection.itemCount === 0).map((collection) => collection.name);
  const unpublishedCollections = audits.filter((collection) => !collection.published || collection.visibility !== "public").map((collection) => collection.name);
  const issues: string[] = [];
  if (profiles.length > 1) issues.push(`Expected one Lamalo designer profile but found ${profiles.length}.`);
  if (collections.length !== EXPECTED_LAMALO_COLLECTION_COUNT) issues.push(`Expected ${EXPECTED_LAMALO_COLLECTION_COUNT} Lamalo collections but found ${collections.length}.`);
  if (duplicateCollectionNames.length) issues.push(`Duplicate collection names: ${duplicateCollectionNames.join(", ")}.`);
  if (duplicateItemKeys.length) issues.push(`${duplicateItemKeys.length} duplicate wardrobe item name(s) were found.`);
  if (emptyCollections.length) issues.push(`Empty collections: ${emptyCollections.join(", ")}.`);
  if (unpublishedCollections.length) issues.push(`Unpublished collections: ${unpublishedCollections.join(", ")}.`);
  if (readyItemCount !== itemCount) issues.push(`${itemCount - readyItemCount} wardrobe item(s) are missing a valid image, prompt, price, licence or active/public status.`);
  if (!usableImage(canonicalProfile.logoUrl)) issues.push("Lamalo profile logo image is missing or not production-ready.");

  return {
    healthy: issues.length === 0 && audits.every((collection) => collection.issues.length === 0),
    profileFound: true,
    profileId: canonicalProfile.id,
    collectionCount: collections.length,
    expectedCollectionCount: EXPECTED_LAMALO_COLLECTION_COUNT,
    itemCount,
    readyItemCount,
    invalidItemCount: itemCount - readyItemCount,
    duplicateCollectionNames,
    duplicateItemKeys,
    emptyCollections,
    unpublishedCollections,
    collections: audits.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
    auditedAt: new Date().toISOString(),
  };
}

export async function repairAndAuditLamaloCatalog(ownerUserId: number): Promise<LamaloCatalogAudit> {
  await runLamaloSeed(ownerUserId);
  const profiles = await (await getDb())!.select().from(designerProfiles).where(eq(designerProfiles.brandName, LAMALO_BRAND_NAME));
  const canonicalProfile = [...profiles].sort((a, b) => a.id - b.id)[0];
  if (!canonicalProfile) throw new Error("Lamalo seed completed without creating its designer profile.");
  await repairLamaloRows(canonicalProfile.id);
  const audit = await auditLamaloCatalog();
  if (!audit.healthy) throw new Error(`Lamalo catalogue repair completed but integrity checks still fail: ${audit.issues.join(" ")}`);
  return audit;
}

export async function getLamaloCatalogSummary(): Promise<{ collectionCount: number; itemCount: number; invalidItemCount: number; healthy: boolean }> {
  const audit = await auditLamaloCatalog();
  return { collectionCount: audit.collectionCount, itemCount: audit.itemCount, invalidItemCount: audit.invalidItemCount, healthy: audit.healthy };
}
