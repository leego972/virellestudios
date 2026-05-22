/**
 * Admin Seeding Router
 * One-click seeding for marketplace items and funding sources
 * Protected by adminProcedure — only accessible to admin accounts
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import { db } from "./db";
import {
  wardrobeItems,
  wardrobeCollections,
  fundingSources,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Import seed data
import { LAMALO_COLLECTIONS, LAMALO_ITEMS } from "./lamalo-seed";
import { FUNDING_SOURCES_DATA } from "./funding-seed";

export const adminSeedingRouter = router({
  /**
   * Seed all marketplace items and collections
   * Returns count of seeded items
   */
  seedMarketplace: adminProcedure.mutation(async ({ ctx }) => {
    try {
      let collectionCount = 0;
      let itemCount = 0;

      // Seed collections
      for (const collection of LAMALO_COLLECTIONS) {
        // Check if collection already exists
        const existing = await db
          .select()
          .from(wardrobeCollections)
          .where(eq(wardrobeCollections.id, collection.id))
          .limit(1);

        if (!existing.length) {
          await db.insert(wardrobeCollections).values(collection);
          collectionCount++;
        }
      }

      // Seed items
      for (const item of LAMALO_ITEMS) {
        // Check if item already exists
        const existing = await db
          .select()
          .from(wardrobeItems)
          .where(eq(wardrobeItems.id, item.id))
          .limit(1);

        if (!existing.length) {
          await db.insert(wardrobeItems).values(item);
          itemCount++;
        }
      }

      // Grant admin user access to all collections
      if (ctx.user?.id) {
        // This would require a wardrobeAccess table or similar
        // For now, we'll just note that the items are seeded
      }

      return {
        success: true,
        collectionsSeeded: collectionCount,
        itemsSeeded: itemCount,
        message: `Seeded ${collectionCount} collections and ${itemCount} items`,
      };
    } catch (error) {
      console.error("Marketplace seeding error:", error);
      return {
        success: false,
        error: "Failed to seed marketplace",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Seed all funding sources
   * Returns count of seeded funding sources
   */
  seedFundingSources: adminProcedure.mutation(async ({ ctx }) => {
    try {
      let sourceCount = 0;

      for (const source of FUNDING_SOURCES_DATA) {
        // Check if source already exists
        const existing = await db
          .select()
          .from(fundingSources)
          .where(eq(fundingSources.id, source.id))
          .limit(1);

        if (!existing.length) {
          await db.insert(fundingSources).values(source);
          sourceCount++;
        }
      }

      return {
        success: true,
        sourcesSeeded: sourceCount,
        message: `Seeded ${sourceCount} funding sources`,
      };
    } catch (error) {
      console.error("Funding sources seeding error:", error);
      return {
        success: false,
        error: "Failed to seed funding sources",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Seed everything at once (marketplace + funding)
   * One-click admin button
   */
  seedEverything: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const marketplaceResult = await db.transaction(async (tx) => {
        let collectionCount = 0;
        let itemCount = 0;

        for (const collection of LAMALO_COLLECTIONS) {
          const existing = await tx
            .select()
            .from(wardrobeCollections)
            .where(eq(wardrobeCollections.id, collection.id))
            .limit(1);

          if (!existing.length) {
            await tx.insert(wardrobeCollections).values(collection);
            collectionCount++;
          }
        }

        for (const item of LAMALO_ITEMS) {
          const existing = await tx
            .select()
            .from(wardrobeItems)
            .where(eq(wardrobeItems.id, item.id))
            .limit(1);

          if (!existing.length) {
            await tx.insert(wardrobeItems).values(item);
            itemCount++;
          }
        }

        return { collectionCount, itemCount };
      });

      const fundingResult = await db.transaction(async (tx) => {
        let sourceCount = 0;

        for (const source of FUNDING_SOURCES_DATA) {
          const existing = await tx
            .select()
            .from(fundingSources)
            .where(eq(fundingSources.id, source.id))
            .limit(1);

          if (!existing.length) {
            await tx.insert(fundingSources).values(source);
            sourceCount++;
          }
        }

        return { sourceCount };
      });

      return {
        success: true,
        marketplace: {
          collectionsSeeded: marketplaceResult.collectionCount,
          itemsSeeded: marketplaceResult.itemCount,
        },
        funding: {
          sourcesSeeded: fundingResult.sourceCount,
        },
        message: `✅ Seeding complete! ${marketplaceResult.collectionCount} collections, ${marketplaceResult.itemCount} items, ${fundingResult.sourceCount} funding sources`,
      };
    } catch (error) {
      console.error("Complete seeding error:", error);
      return {
        success: false,
        error: "Failed to seed data",
        details: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Get seeding status
   * Shows what's already been seeded
   */
  getStatus: adminProcedure.query(async () => {
    try {
      const [collectionCount, itemCount, sourceCount] = await Promise.all([
        db
          .select()
          .from(wardrobeCollections)
          .then((r) => r.length),
        db
          .select()
          .from(wardrobeItems)
          .then((r) => r.length),
        db
          .select()
          .from(fundingSources)
          .then((r) => r.length),
      ]);

      return {
        success: true,
        collections: collectionCount,
        items: itemCount,
        fundingSources: sourceCount,
        message: `Current state: ${collectionCount} collections, ${itemCount} items, ${sourceCount} funding sources`,
      };
    } catch (error) {
      console.error("Status check error:", error);
      return {
        success: false,
        error: "Failed to check status",
      };
    }
  }),
});
