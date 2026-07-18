import { router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";
import { wardrobeMarketplaceHardenedRouter } from "./_core/wardrobeMarketplaceHardenedRouter";

/**
 * Preserve the complete established designer marketplace while replacing only
 * the confirmed weak inventory and director-assignment procedures.
 *
 * Keep the router records fully inferred. Casting these records to `any` would
 * erase the public tRPC contract for every existing designer/marketplace route.
 */
const legacyRecord = legacyWardrobeMarketplaceRouter._def.record;
const hardenedRecord = wardrobeMarketplaceHardenedRouter._def.record;
const legacyLeasingRecord = legacyRecord.leasing._def.record;
const legacyDirectorRecord = legacyRecord.director._def.record;
const hardenedInventoryRecord = hardenedRecord.inventory._def.record;
const hardenedDirectorRecord = hardenedRecord.director._def.record;

export const wardrobeMarketplaceRouter = router({
  ...legacyRecord,

  // Preserve the established API name while expanding collection purchases
  // into individual inventory items that can each be assigned to characters.
  leasing: router({
    ...legacyLeasingRecord,
    myInventory: hardenedInventoryRecord.listItems,
  }),

  // Preserve listByItem and all unrelated director procedures, replacing only
  // the operations that needed ownership/range/conflict hardening.
  director: router({
    ...legacyDirectorRecord,
    ...hardenedDirectorRecord,
  }),

  inventory: hardenedRecord.inventory,
  catalog: hardenedRecord.catalog,
});
