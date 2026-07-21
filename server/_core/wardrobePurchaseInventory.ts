import { and, eq, like } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { wardrobeItems } from "../../drizzle/schema";
import type { WardrobeLeaseRecord } from "./wardrobeContinuity";

export interface PermanentWardrobeCopy {
  leaseId: number;
  leaseType: "item" | "collection";
  sourceWardrobeItemId: number;
  copiedWardrobeItemId: number;
  collectionId?: number | null;
  item: typeof wardrobeItems.$inferSelect;
}

function purchaseCopyMarker(leaseId: number, sourceWardrobeItemId: number): string {
  return `[purchase-copy:${leaseId}:${sourceWardrobeItemId}]`;
}

function permanentLicenceNotes(
  existing: string | null | undefined,
  leaseId: number,
  sourceWardrobeItemId: number,
): string {
  const marker = purchaseCopyMarker(leaseId, sourceWardrobeItemId);
  const prefix = existing?.trim() ? `${existing.trim()}\n` : "";
  return `${prefix}${marker} Permanent buyer-owned wardrobe snapshot. This private copy must not be changed when the original marketplace listing is edited, hidden, retired or deleted.`;
}

function leaseType(value: unknown): "item" | "collection" {
  if (value === "item" || value === "collection") return value;
  throw new Error("Wardrobe purchase has an invalid lease type.");
}

async function findExistingCopy(
  userId: number,
  leaseId: number,
  sourceWardrobeItemId: number,
): Promise<typeof wardrobeItems.$inferSelect | undefined> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const marker = purchaseCopyMarker(leaseId, sourceWardrobeItemId);
  const rows = await dbConn
    .select()
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.userId, userId),
        like(wardrobeItems.licenseNotes, `%${marker}%`),
      ),
    )
    .limit(1);
  return rows[0];
}

async function copyOneItem(
  userId: number,
  lease: WardrobeLeaseRecord & Record<string, any>,
  source: typeof wardrobeItems.$inferSelect,
): Promise<PermanentWardrobeCopy> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");

  const existing = await findExistingCopy(userId, lease.id, source.id);
  if (existing) {
    return {
      leaseId: lease.id,
      leaseType: leaseType((lease as any).leaseType),
      sourceWardrobeItemId: source.id,
      copiedWardrobeItemId: existing.id,
      collectionId: lease.collectionId ?? source.collectionId,
      item: existing,
    };
  }

  if (!source.name?.trim()) {
    throw new Error(`Purchased wardrobe item ${source.id} has no name and cannot be copied into inventory.`);
  }
  if (!source.primaryImageUrl && !(Array.isArray(source.imageUrls) && source.imageUrls.length)) {
    throw new Error(`Purchased wardrobe item ${source.id} has no reference image and cannot be copied into inventory.`);
  }
  if (!source.referencePrompt?.trim()) {
    throw new Error(`Purchased wardrobe item ${source.id} has no generation prompt and cannot be copied into inventory.`);
  }

  const result = await dbConn.insert(wardrobeItems).values({
    collectionId: null,
    userId,
    designerProfileId: source.designerProfileId,
    projectId: null,
    name: source.name,
    description: source.description,
    category: source.category,
    subcategory: source.subcategory,
    wardrobeType: source.wardrobeType,
    genderFit: source.genderFit,
    sizeRange: source.sizeRange,
    era: source.era,
    colors: source.colors,
    materials: source.materials,
    styleTags: source.styleTags,
    imageUrls: source.imageUrls,
    primaryImageUrl: source.primaryImageUrl,
    referencePrompt: source.referencePrompt,
    brandPlacementAllowed: source.brandPlacementAllowed,
    shopfrontPlacementAllowed: source.shopfrontPlacementAllowed,
    characterWardrobeAllowed: source.characterWardrobeAllowed !== false,
    costumeUseAllowed: source.costumeUseAllowed !== false,
    commercialUseAllowed: source.commercialUseAllowed !== false,
    licenseType: "full_license",
    licenseNotes: permanentLicenceNotes(source.licenseNotes, lease.id, source.id),
    visibility: "private",
    status: "active",
    retailPriceAud: 0,
    leasePriceAud: null,
  });

  const copiedWardrobeItemId = Number((result as any).insertId);
  if (!copiedWardrobeItemId) {
    // A simultaneous webhook/browser callback may have created the same marker.
    const concurrent = await findExistingCopy(userId, lease.id, source.id);
    if (!concurrent) throw new Error(`Failed to create permanent inventory copy for wardrobe item ${source.id}.`);
    return {
      leaseId: lease.id,
      leaseType: leaseType((lease as any).leaseType),
      sourceWardrobeItemId: source.id,
      copiedWardrobeItemId: concurrent.id,
      collectionId: lease.collectionId ?? source.collectionId,
      item: concurrent,
    };
  }

  const copied = await db.getWardrobeItemById(copiedWardrobeItemId);
  if (!copied) throw new Error(`Permanent inventory copy ${copiedWardrobeItemId} could not be reloaded.`);

  return {
    leaseId: lease.id,
    leaseType: leaseType((lease as any).leaseType),
    sourceWardrobeItemId: source.id,
    copiedWardrobeItemId,
    collectionId: lease.collectionId ?? source.collectionId,
    item: copied as typeof wardrobeItems.$inferSelect,
  };
}

/**
 * Materialise a paid purchase into private buyer-owned wardrobe rows. The copied
 * rows are immutable snapshots from the buyer's perspective: later designer
 * edits cannot alter a costume already purchased for a production.
 */
export async function ensurePermanentWardrobeCopiesForLease(
  lease: WardrobeLeaseRecord & Record<string, any>,
): Promise<PermanentWardrobeCopy[]> {
  if (lease.status !== "active") return [];
  const type = leaseType((lease as any).leaseType);
  const userId = Number(lease.userId);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Wardrobe purchase has an invalid user ID.");

  let sources: Array<typeof wardrobeItems.$inferSelect> = [];
  if (type === "item") {
    if (!lease.wardrobeItemId) throw new Error("Item purchase is missing its source wardrobe item.");
    const source = await db.getWardrobeItemById(lease.wardrobeItemId);
    if (!source) throw new Error("Purchased wardrobe item no longer exists and no inventory snapshot could be created.");
    sources = [source as typeof wardrobeItems.$inferSelect];
  } else {
    if (!lease.collectionId) throw new Error("Collection purchase is missing its source collection.");
    const collectionItems = await db.getWardrobeItemsByCollection(lease.collectionId);
    sources = collectionItems.filter((item: any) =>
      item.status === "active"
      && item.characterWardrobeAllowed !== false
      && Boolean(item.primaryImageUrl || (Array.isArray(item.imageUrls) && item.imageUrls.length))
      && Boolean(item.referencePrompt?.trim()),
    ) as Array<typeof wardrobeItems.$inferSelect>;
    if (!sources.length) throw new Error("Purchased wardrobe collection contains no generation-ready items to copy.");
  }

  const copies: PermanentWardrobeCopy[] = [];
  for (const source of sources) copies.push(await copyOneItem(userId, lease, source));
  return copies;
}

/** Backfills permanent snapshots for purchases made before snapshot fulfilment existed. */
export async function ensurePermanentWardrobeCopiesForUser(userId: number): Promise<PermanentWardrobeCopy[]> {
  const leases = await db.getWardrobeLeasesByUser(userId);
  const active = leases.filter((lease: any) => lease.status === "active");
  const copies: PermanentWardrobeCopy[] = [];
  for (const lease of active) copies.push(...await ensurePermanentWardrobeCopiesForLease(lease as any));
  return copies;
}
