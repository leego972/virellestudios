/**
 * Admin Seeding Router
 * One-click seeding for marketplace items and funding sources
 * Protected by adminProcedure — only accessible to admin accounts
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  wardrobeItems,
  wardrobeCollections,
  fundingSources,
  users,
} from "../drizzle/schema";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Import seed data
import { runLamaloSeed } from "./lamalo-seed";
import { FUNDING_SOURCES_DATA } from "./funding-seed";

export const adminSeedingRouter = router({
  /**
   * Seed all marketplace items and collections
   * Returns count of seeded items
   */
  seedMarketplace: adminProcedure.mutation(async ({ ctx }) => {
    try {
      // Call the lamalo seed function
      await runLamaloSeed();
      
      return {
        success: true,
        message: "Marketplace seeded successfully",
      };
    } catch (error) {
      console.error("Marketplace seeding error:", error);
      return {
        success: false,
        message: `Failed to seed marketplace: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }),

  /**
   * Seed funding sources
   * Returns count of seeded sources
   */
  seedFundingSources: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      let count = 0;

      for (const source of FUNDING_SOURCES_DATA) {
        // Check if source already exists
        const existing = await db
          .select()
          .from(fundingSources)
          .where(eq(fundingSources.name, source.name))
          .limit(1);

        if (!existing.length) {
          await db.insert(fundingSources).values(source);
          count++;
        }
      }

      return {
        success: true,
        count,
        message: `Seeded ${count} funding sources`,
      };
    } catch (error) {
      console.error("Funding sources seeding error:", error);
      return {
        success: false,
        message: `Failed to seed funding sources: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }),

  /**
   * Seed everything (marketplace + funding sources)
   */
  seedEverything: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      
      // Seed marketplace
      await runLamaloSeed();
      
      // Seed funding sources
      let fundingCount = 0;
      for (const source of FUNDING_SOURCES_DATA) {
        const existing = await db
          .select()
          .from(fundingSources)
          .where(eq(fundingSources.name, source.name))
          .limit(1);

        if (!existing.length) {
          await db.insert(fundingSources).values(source);
          fundingCount++;
        }
      }

      return {
        success: true,
        message: `Seeded marketplace and ${fundingCount} funding sources`,
      };
    } catch (error) {
      console.error("Complete seeding error:", error);
      return {
        success: false,
        message: `Failed to complete seeding: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }),

  /**
   * Create beta tester accounts
   */
  createBetaAccounts: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      const accounts = [
        { email: "beta1@virelle.life", password: "BetaAccess2026!" },
        { email: "beta2@virelle.life", password: "BetaAccess2026!" },
      ];

      const created = [];
      for (const account of accounts) {
        // Check if account exists
        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, account.email))
          .limit(1);

        if (existing.length) {
          // Update existing account with credits
          await db
            .update(users)
            .set({ credits: 1000000, role: "beta" })
            .where(eq(users.email, account.email));
          created.push({ email: account.email, status: "updated" });
        } else {
          // Create new account
          const hashedPassword = await bcrypt.hash(account.password, 10);
          await db.insert(users).values({
            id: nanoid(),
            email: account.email,
            password: hashedPassword,
            credits: 1000000,
            role: "beta",
            createdAt: new Date(),
          });
          created.push({ email: account.email, status: "created" });
        }
      }

      return {
        success: true,
        accounts: created,
        message: `Beta accounts ready: ${created.map((a) => a.email).join(", ")}`,
      };
    } catch (error) {
      console.error("Beta account creation error:", error);
      return {
        success: false,
        message: `Failed to create beta accounts: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }),
});
