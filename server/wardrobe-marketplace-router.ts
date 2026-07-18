import { router } from "./_core/trpc";
import { wardrobeMarketplaceRouter as legacyWardrobeMarketplaceRouter } from "./wardrobe-marketplace-router-legacy";
import { wardrobeMarketplaceHardenedRouter } from "./_core/wardrobeMarketplaceHardenedRouter";

/**
 * Preserve the complete established designer marketplace while replacing only
 * the confirmed weak inventory and director-assignment procedures.
 *
 * tRPC's nested router record is intentionally accessed at runtime here. The
 * exported type is kept identical to the established router so all existing
 * client procedures retain precise query/mutation inference. New hardened
 * procedures are backward-compatible with the established public inputs.
 */
const legacyRecord = (legacyWardrobeMarketplaceRouter as any)._def.record as Record<string, any>;
const hardenedRecord = (wardrobeMarketplaceHardenedRouter as any)._def.record as Record<string, any>;
const legacyLeasingRecord = legacyRecord.leasing._def.record as Record<string, any>;
const legacyDirectorRecord = legacyRecord.director._def.record as Record<string, any>;
const hardenedInventoryRecord = hardenedRecord.inventory._def.record as Record<string, any>;
const hardenedDirectorRecord = hardenedRecord.director._def.record as Record<string, any>;

const composedWardrobeMarketplaceRouter = router({
  ...legacyRecord,

  leasing: router({
    ...legacyLeasingRecord,
    myInventory: hardenedInventoryRecord.listItems,
  }),

  director: router({
    ...legacyDirectorRecord,
    ...hardenedDirectorRecord,
  }),

  inventory: hardenedRecord.inventory,
  catalog: hardenedRecord.catalog,
});

// Keep the long-established public contract intact for every existing client.
// Runtime composition above still serves the hardened implementations.
export const wardrobeMarketplaceRouter = composedWardrobeMarketplaceRouter as unknown as typeof legacyWardrobeMarketplaceRouter;
