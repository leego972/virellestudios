import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { designerCollections, designerProfiles, wardrobeItems } from "../../drizzle/schema";
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

function itemIssues(item: any): string[] {
  const issues = validateWardrobeItemForInventory(item as WardrobeItemRecord);
  const images = Array.isArray(item.imageUrls) ? item.imageUrls.filter(usableImage) : [];
  if (!usableImage(item.primaryImageUrl) && images.length === 0) issues.push("Item has no production-ready HTTP image; local/placeholder catalogue images are not accepted.");
  if (!item.retailPriceAud || Number(item.retailPriceAud) <= 0) issues.push("Item has no valid purchase price.");
  if (item.visibility !== "public") issues.push("Item is not public.");
  if (item.status !== "active") issues.push("Item is not active.");
  return Array.from(new Set(issues));
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
      emptyCollections: [],
      unpublishedCollections: [],
      collections: [],
      issues: ["Lamalo Fashion designer profile is missing."],
      auditedAt: new Date().toISOString(),
    };
  }

  const collections = await dbConn.select().from(designerCollections).where(eq(designerCollections.designerProfileId, canonicalProfile.id));
  const collectionNameCounts = new Map<string, number>();
  for (const collection of collections) collectionNameCounts.set(collection.name, (collectionNameCounts.get(collection.name) || 0) + 1);
  const duplicateCollectionNames = Array.from(collectionNameCounts.entries()).filter(([, count]) => count > 1).map(([name]) => name).sort();

  const audits: LamaloCollectionAudit[] = [];
  let itemCount = 0;
  let readyItemCount = 0;
  for (const collection of collections) {
    const items = await dbConn.select().from(wardrobeItems).where(and(eq(wardrobeItems.collectionId, collection.id), eq(wardrobeItems.designerProfileId, canonicalProfile.id)));
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
      issues,
    });
  }

  const emptyCollections = audits.filter((collection) => collection.itemCount === 0).map((collection) => collection.name);
  const unpublishedCollections = audits.filter((collection) => !collection.published || collection.visibility !== "public").map((collection) => collection.name);
  const issues: string[] = [];
  if (collections.length !== EXPECTED_LAMALO_COLLECTION_COUNT) issues.push(`Expected ${EXPECTED_LAMALO_COLLECTION_COUNT} Lamalo collections but found ${collections.length}.`);
  if (duplicateCollectionNames.length) issues.push(`Duplicate collection names: ${duplicateCollectionNames.join(", ")}.`);
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
    emptyCollections,
    unpublishedCollections,
    collections: audits.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
    auditedAt: new Date().toISOString(),
  };
}

export async function repairAndAuditLamaloCatalog(ownerUserId: number): Promise<LamaloCatalogAudit> {
  await runLamaloSeed(ownerUserId);
  const audit = await auditLamaloCatalog();
  if (!audit.healthy) throw new Error(`Lamalo catalogue repair completed but integrity checks still fail: ${audit.issues.join(" ")}`);
  return audit;
}

export async function getLamaloCatalogSummary(): Promise<{ collectionCount: number; itemCount: number; invalidItemCount: number; healthy: boolean }> {
  const audit = await auditLamaloCatalog();
  return { collectionCount: audit.collectionCount, itemCount: audit.itemCount, invalidItemCount: audit.invalidItemCount, healthy: audit.healthy };
}
