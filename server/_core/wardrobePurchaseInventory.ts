import { and, eq, like, lte, sql } from "drizzle-orm";
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

type LeaseLike = WardrobeLeaseRecord & Record<string, any>;
type PurchaseMapping = {
  leaseId: number;
  userId: number;
  sourceWardrobeItemId: number;
  copiedWardrobeItemId: number;
};

let mappingTableReady: Promise<void> | undefined;

async function ensureMappingTable(): Promise<void> {
  if (!mappingTableReady) {
    mappingTableReady = (async () => {
      const dbConn = await getDb();
      if (!dbConn) throw new Error("Database is unavailable.");
      await dbConn.execute(sql`
        CREATE TABLE IF NOT EXISTS wardrobePurchaseCopies (
          leaseId INT NOT NULL,
          userId INT NOT NULL,
          sourceWardrobeItemId INT NOT NULL,
          copiedWardrobeItemId INT NOT NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (leaseId, sourceWardrobeItemId),
          UNIQUE KEY uq_wardrobe_purchase_copy_item (copiedWardrobeItemId),
          INDEX idx_wardrobe_purchase_copy_user (userId),
          INDEX idx_wardrobe_purchase_copy_lease (leaseId)
        )
      `);
    })().catch((error) => {
      mappingTableReady = undefined;
      throw error;
    });
  }
  return mappingTableReady;
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
  const suffix = existing?.trim() ? `\n${existing.trim()}` : "";
  return `${marker} Permanent buyer-owned wardrobe snapshot. This private copy must not be changed when the original marketplace listing is edited, hidden, retired or deleted.${suffix}`;
}

function leaseType(value: unknown): "item" | "collection" {
  if (value === "item" || value === "collection") return value;
  throw new Error("Wardrobe purchase has an invalid lease type.");
}

async function mappingsForLease(leaseId: number): Promise<PurchaseMapping[]> {
  await ensureMappingTable();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const [rows] = await dbConn.execute(sql`
    SELECT leaseId, userId, sourceWardrobeItemId, copiedWardrobeItemId
    FROM wardrobePurchaseCopies
    WHERE leaseId = ${leaseId}
  `);
  return (rows as unknown as any[]).map((row) => ({
    leaseId: Number(row.leaseId),
    userId: Number(row.userId),
    sourceWardrobeItemId: Number(row.sourceWardrobeItemId),
    copiedWardrobeItemId: Number(row.copiedWardrobeItemId),
  }));
}

async function mappingForSource(leaseId: number, sourceWardrobeItemId: number): Promise<PurchaseMapping | undefined> {
  return (await mappingsForLease(leaseId)).find((mapping) => mapping.sourceWardrobeItemId === sourceWardrobeItemId);
}

async function removeBrokenMapping(leaseId: number, sourceWardrobeItemId: number): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  await dbConn.execute(sql`
    DELETE FROM wardrobePurchaseCopies
    WHERE leaseId = ${leaseId} AND sourceWardrobeItemId = ${sourceWardrobeItemId}
  `);
}

async function claimMapping(
  leaseId: number,
  userId: number,
  sourceWardrobeItemId: number,
  copiedWardrobeItemId: number,
): Promise<PurchaseMapping> {
  await ensureMappingTable();
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  await dbConn.execute(sql`
    INSERT IGNORE INTO wardrobePurchaseCopies
      (leaseId, userId, sourceWardrobeItemId, copiedWardrobeItemId)
    VALUES
      (${leaseId}, ${userId}, ${sourceWardrobeItemId}, ${copiedWardrobeItemId})
  `);
  const canonical = await mappingForSource(leaseId, sourceWardrobeItemId);
  if (!canonical) throw new Error(`Could not claim inventory mapping for purchase ${leaseId}, item ${sourceWardrobeItemId}.`);
  return canonical;
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
        like(wardrobeItems.licenseNotes, `${marker}%`),
      ),
    )
    .limit(1);
  return rows[0];
}

function asCopy(
  lease: LeaseLike,
  sourceWardrobeItemId: number,
  item: typeof wardrobeItems.$inferSelect,
): PermanentWardrobeCopy {
  return {
    leaseId: lease.id,
    leaseType: leaseType(lease.leaseType),
    sourceWardrobeItemId,
    copiedWardrobeItemId: item.id,
    collectionId: lease.collectionId ?? null,
    item,
  };
}

async function mappedCopy(
  lease: LeaseLike,
  sourceWardrobeItemId: number,
): Promise<PermanentWardrobeCopy | undefined> {
  const mapping = await mappingForSource(lease.id, sourceWardrobeItemId);
  if (!mapping) return undefined;
  const item = await db.getWardrobeItemById(mapping.copiedWardrobeItemId);
  if (!item || item.userId !== lease.userId) {
    await removeBrokenMapping(lease.id, sourceWardrobeItemId);
    return undefined;
  }
  return asCopy(lease, sourceWardrobeItemId, item as typeof wardrobeItems.$inferSelect);
}

async function recoverUnmappedCopy(
  lease: LeaseLike,
  sourceWardrobeItemId: number,
): Promise<PermanentWardrobeCopy | undefined> {
  const existing = await findExistingCopy(Number(lease.userId), lease.id, sourceWardrobeItemId);
  if (!existing) return undefined;
  const mapping = await claimMapping(lease.id, Number(lease.userId), sourceWardrobeItemId, existing.id);
  if (mapping.copiedWardrobeItemId !== existing.id) {
    await db.deleteWardrobeItem(existing.id);
    const canonical = await db.getWardrobeItemById(mapping.copiedWardrobeItemId);
    if (!canonical) throw new Error(`Canonical inventory copy ${mapping.copiedWardrobeItemId} is missing.`);
    return asCopy(lease, sourceWardrobeItemId, canonical as typeof wardrobeItems.$inferSelect);
  }
  return asCopy(lease, sourceWardrobeItemId, existing);
}

async function copyOneItem(
  lease: LeaseLike,
  source: typeof wardrobeItems.$inferSelect,
): Promise<PermanentWardrobeCopy> {
  const userId = Number(lease.userId);
  const alreadyMapped = await mappedCopy(lease, source.id);
  if (alreadyMapped) return alreadyMapped;
  const recovered = await recoverUnmappedCopy(lease, source.id);
  if (recovered) return recovered;

  if (!source.name?.trim()) throw new Error(`Purchased wardrobe item ${source.id} has no name and cannot be copied into inventory.`);
  if (!source.primaryImageUrl && !(Array.isArray(source.imageUrls) && source.imageUrls.length)) {
    throw new Error(`Purchased wardrobe item ${source.id} has no reference image and cannot be copied into inventory.`);
  }
  if (!source.referencePrompt?.trim()) throw new Error(`Purchased wardrobe item ${source.id} has no generation prompt and cannot be copied into inventory.`);

  const created = await db.createWardrobeItem({
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
  } as any);

  const mapping = await claimMapping(lease.id, userId, source.id, created.id);
  if (mapping.copiedWardrobeItemId !== created.id) {
    // Another app instance won the same Stripe webhook/browser callback race.
    // Remove this duplicate and return the database-canonical snapshot.
    await db.deleteWardrobeItem(created.id);
    const canonical = await db.getWardrobeItemById(mapping.copiedWardrobeItemId);
    if (!canonical) throw new Error(`Canonical inventory copy ${mapping.copiedWardrobeItemId} is missing.`);
    return asCopy(lease, source.id, canonical as typeof wardrobeItems.$inferSelect);
  }
  return asCopy(lease, source.id, created as typeof wardrobeItems.$inferSelect);
}

async function sourceItemsForLease(lease: LeaseLike): Promise<Array<typeof wardrobeItems.$inferSelect>> {
  const type = leaseType(lease.leaseType);
  if (type === "item") {
    if (!lease.wardrobeItemId) throw new Error("Item purchase is missing its source wardrobe item.");
    const source = await db.getWardrobeItemById(lease.wardrobeItemId);
    return source ? [source as typeof wardrobeItems.$inferSelect] : [];
  }

  if (!lease.collectionId) throw new Error("Collection purchase is missing its source collection.");
  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const purchaseTime = lease.createdAt ? new Date(lease.createdAt) : new Date();
  const rows = await dbConn.select().from(wardrobeItems).where(and(
    eq(wardrobeItems.collectionId, lease.collectionId),
    lte(wardrobeItems.createdAt, purchaseTime),
  ));
  return rows.filter((item) =>
    item.characterWardrobeAllowed !== false
    && Boolean(item.primaryImageUrl || (Array.isArray(item.imageUrls) && item.imageUrls.length))
    && Boolean(item.referencePrompt?.trim()),
  );
}

/**
 * Materialise a paid purchase into private buyer-owned wardrobe rows. A small
 * mapping table gives cross-process idempotency, while the wardrobe rows remain
 * normal inventory items that the existing character assignment UI can use.
 */
export async function ensurePermanentWardrobeCopiesForLease(
  lease: LeaseLike,
): Promise<PermanentWardrobeCopy[]> {
  if (lease.status !== "active") return [];
  const userId = Number(lease.userId);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("Wardrobe purchase has an invalid user ID.");
  leaseType(lease.leaseType);
  await ensureMappingTable();

  const sources = await sourceItemsForLease(lease);
  const copies: PermanentWardrobeCopy[] = [];
  for (const source of sources) copies.push(await copyOneItem(lease, source));

  // Preserve snapshots whose source listing was subsequently deleted. They are
  // permanent purchases and must remain assignable in the buyer's inventory.
  const mapped = await mappingsForLease(lease.id);
  for (const mapping of mapped) {
    if (copies.some((copy) => copy.sourceWardrobeItemId === mapping.sourceWardrobeItemId)) continue;
    const item = await db.getWardrobeItemById(mapping.copiedWardrobeItemId);
    if (item && item.userId === userId) copies.push(asCopy(lease, mapping.sourceWardrobeItemId, item as typeof wardrobeItems.$inferSelect));
  }

  if (!copies.length) {
    const target = leaseType(lease.leaseType) === "item" ? "item" : "collection";
    throw new Error(`Purchased wardrobe ${target} has no recoverable generation-ready inventory snapshots.`);
  }
  return copies.sort((a, b) => String(a.item.name).localeCompare(String(b.item.name)));
}

/** Backfills permanent snapshots for purchases made before snapshot fulfilment existed. */
export async function ensurePermanentWardrobeCopiesForUser(userId: number): Promise<PermanentWardrobeCopy[]> {
  const leases = await db.getWardrobeLeasesByUser(userId);
  const active = leases.filter((lease: any) => lease.status === "active");
  const copies: PermanentWardrobeCopy[] = [];
  for (const lease of active) copies.push(...await ensurePermanentWardrobeCopiesForLease(lease as LeaseLike));
  return copies;
}
