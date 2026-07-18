import { router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";
import { wardrobeMarketplaceHardenedRouter } from "./_core/wardrobeMarketplaceHardenedRouter";

/**
 * Preserve the complete established designer marketplace while replacing only
 * the confirmed weak inventory and director-assignment procedures.
 *
 * This deliberately uses the tRPC router record as a composition boundary so
 * no existing designer, marketplace, checkout, membership or custom-item route
 * is copied, renamed or lost.
 */
const legacyRecord = (legacyWardrobeMarketplaceRouter as any)._def.record as Record<string, any>;
const hardenedRecord = (wardrobeMarketplaceHardenedRouter as any)._def.record as Record<string, any>;
const legacyLeasingRecord = legacyRecord.leasing?._def?.record as Record<string, any> | undefined;
const legacyDirectorRecord = legacyRecord.director?._def?.record as Record<string, any> | undefined;
const hardenedInventoryRecord = hardenedRecord.inventory?._def?.record as Record<string, any> | undefined;
const hardenedDirectorRecord = hardenedRecord.director?._def?.record as Record<string, any> | undefined;

if (!legacyLeasingRecord || !legacyDirectorRecord || !hardenedInventoryRecord || !hardenedDirectorRecord) {
  throw new Error("Wardrobe marketplace router composition failed: expected inventory/director records are missing.");
}

export const wardrobeMarketplaceRouter = router({
  ...legacyRecord,

  // Preserve the existing public API name used by UserInventoryPage while
  // returning each purchased collection item as an individually assignable row.
  leasing: router({
    ...legacyLeasingRecord,
    myInventory: hardenedInventoryRecord.listItems,
  }),

  // Replace insecure/ambiguous assignment operations with ownership, range,
  // licence, image-readiness and conflict validation.
  director: router({
    ...legacyDirectorRecord,
    ...hardenedDirectorRecord,
  }),

  // Also expose the item-centric inventory route for new UI clients.
  inventory: hardenedRecord.inventory,
});
