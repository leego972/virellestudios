import { router, adminProcedure } from "./_core/trpc";
  import { logger } from "./_core/logger";
  import { getDb } from "./db";
  import {
    designerCollections,
    wardrobeItems,
    fundingSources,
    users,
    crowdfundCampaigns,
    crowdfundRewards
  } from "../drizzle/schema";
  import { nanoid } from "nanoid";
  import bcrypt from "bcryptjs";
  import { eq, sql } from "drizzle-orm";

  // Import seed data
  import { runLamaloSeed } from "./lamalo-seed";
  import { runExecutiveSeed } from "./executive-seed";
  import { runMasterSeed } from "./master-seed";
  import { runSignatureCastSeed, runDiverseCastSeed } from "./signature-cast-seed";
  import { runUniformSeed } from "./uniform-seed";
  import { FUNDING_SOURCES_DATA } from "./funding-seed";

  export const adminSeedingRouter = router({
    /**
     * Seed all marketplace items and collections
     */
    seedMarketplace: adminProcedure.mutation(async ({ ctx }) => {
      try {
        await runLamaloSeed(ctx.user.id);
        return { success: true, message: "Marketplace seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Marketplace seeding error", error);
        return { success: false, message: `Failed to seed marketplace: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed funding sources
     */
    seedFundingSources: adminProcedure.mutation(async () => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        let count = 0;
        for (const source of FUNDING_SOURCES_DATA) {
          const existing = await db.select().from(fundingSources).where(eq(fundingSources.organization, source.name)).limit(1);
          if (!existing.length) { await db.insert(fundingSources).values(source as any); count++; }
        }
        return { success: true, count, message: `Seeded ${count} funding sources` };
      } catch (error) {
        logger.errorWithStack("Funding sources seeding error", error);
        return { success: false, message: `Failed to seed funding sources: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed sample crowdfunding campaigns
     */
    seedCrowdfunding: adminProcedure.mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const samples = [
          {
            userId: ctx.user.id,
            title: "Echoes of Eternity",
            slug: "echoes-of-eternity",
            tagline: "A high-concept sci-fi epic about the last transmission from Earth.",
            description: "In the year 2142, a lone signal technician on a lunar outpost receives a message that shouldn't exist.",
            genre: "Sci-Fi",
            format: "Feature Film",
            goalAmountCents: 5000000,
            raisedAmountCents: 1250000,
            backerCount: 42,
            status: "active",
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            userId: ctx.user.id,
            title: "The Neon Underground",
            slug: "neon-underground",
            tagline: "Cyberpunk noir set in the rain-soaked streets of Neo-Sydney.",
            description: "A private investigator with a cybernetic eye takes on a case that leads him deep into a corporate conspiracy.",
            genre: "Cyberpunk / Noir",
            format: "Short Film",
            goalAmountCents: 1500000,
            raisedAmountCents: 850000,
            backerCount: 128,
            status: "active",
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          }
        ];
        let count = 0;
        for (const sample of samples) {
          const existing = await db.select().from(crowdfundCampaigns).where(eq(crowdfundCampaigns.slug, sample.slug)).limit(1);
          if (!existing.length) {
            const [result] = await db.insert(crowdfundCampaigns).values(sample as any);
            const campaignId = (result as any).insertId;
            await db.insert(crowdfundRewards).values([
              { campaignId, title: "Digital Supporter", description: "Digital copy of the film and your name in the credits.", amountCents: 2500, sortOrder: 1 },
              { campaignId, title: "Executive Producer Credit", description: "On-screen Executive Producer credit and invitation to the premiere.", amountCents: 500000, limitCount: 5, sortOrder: 10 }
            ] as any);
            count++;
          }
        }
        return { success: true, count, message: `Seeded ${count} sample campaigns` };
      } catch (error) {
        logger.errorWithStack("Crowdfunding seeding error", error);
        return { success: false, message: `Failed to seed crowdfunding: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed Executive wardrobe collections
     */
    seedExecutive: adminProcedure.mutation(async ({ ctx }) => {
      try {
        await runExecutiveSeed(ctx.user.id);
        return { success: true, message: "Executive collections seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Executive seeding error", error);
        return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed Master wardrobe collections
     */
    seedMaster: adminProcedure.mutation(async ({ ctx }) => {
      try {
        await runMasterSeed(ctx.user.id);
        return { success: true, message: "Master collections seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Master seeding error", error);
        return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed Signature Cast characters
     */
    seedSignatureCast: adminProcedure.mutation(async ({ ctx }) => {
      try {
        await runSignatureCastSeed(ctx.user.id);
        await runDiverseCastSeed(ctx.user.id);
        return { success: true, message: "Signature & Diverse Cast seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Cast seeding error", error);
        return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed Uniform collections
     */
    seedUniforms: adminProcedure.mutation(async ({ ctx }) => {
      try {
        await runUniformSeed(ctx.user.id);
        return { success: true, message: "Uniform collections seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Uniform seeding error", error);
        return { success: false, message: `Failed: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Seed everything
     */
    seedEverything: adminProcedure.mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");

        // 1. Marketplace (Lamalo + Executive + Master + Uniforms)
        await runLamaloSeed(ctx.user.id);
        await runExecutiveSeed(ctx.user.id);
        await runMasterSeed(ctx.user.id);
        await runUniformSeed(ctx.user.id);

        // 2. Cast
        await runSignatureCastSeed(ctx.user.id);
        await runDiverseCastSeed(ctx.user.id);

        // 3. Funding
        for (const source of FUNDING_SOURCES_DATA) {
          const existing = await db.select().from(fundingSources).where(eq(fundingSources.organization, source.name)).limit(1);
          if (!existing.length) { await db.insert(fundingSources).values(source as any); }
        }

        // 4. Crowdfunding
        const samples = [
          {
            userId: ctx.user.id, title: "Virelle Genesis", slug: "virelle-genesis",
            tagline: "The documentary that started it all.",
            description: "A deep dive into the origins of AI-assisted filmmaking.",
            goalAmountCents: 1000000, raisedAmountCents: 450000, backerCount: 124,
            status: "active", fundingModel: "all_or_nothing",
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            userId: ctx.user.id, title: "Neon Dreams: 2099", slug: "neon-dreams-2099",
            tagline: "A cyberpunk odyssey created entirely with AI.",
            description: "The first feature film to utilize the full Virelle Studios pipeline.",
            goalAmountCents: 5000000, raisedAmountCents: 1200000, backerCount: 850,
            status: "active", fundingModel: "keep_it_all",
            deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          }
        ];
        for (const sample of samples) {
          const existing = await db.select().from(crowdfundCampaigns).where(eq(crowdfundCampaigns.slug, sample.slug)).limit(1);
          if (!existing.length) { await db.insert(crowdfundCampaigns).values(sample as any); }
        }

        return { success: true, message: "Everything seeded successfully" };
      } catch (error) {
        logger.errorWithStack("Complete seeding error", error);
        return { success: false, message: `Failed to complete seeding: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Create beta tester accounts
     */
    createBetaAccounts: adminProcedure.mutation(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const accounts = [
          { email: "beta1@virelle.life", password: "BetaAccess2026!" },
          { email: "beta2@virelle.life", password: "BetaAccess2026!" },
        ];
        const created = [];
        for (const account of accounts) {
          const existing = await db.select().from(users).where(eq(users.email, account.email)).limit(1);
          if (existing.length) {
            await db.update(users).set({ credits: 1000000, role: "user" } as any).where(eq(users.email, account.email));
            created.push({ email: account.email, status: "updated" });
          } else {
            const hashedPassword = await bcrypt.hash(account.password, 10);
            await db.insert(users).values({ id: nanoid() as any, email: account.email, password: hashedPassword, credits: 1000000, role: "user", createdAt: new Date() } as any);
            created.push({ email: account.email, status: "created" });
          }
        }
        return { success: true, accounts: created, message: `Beta accounts ready: ${created.map(a => a.email).join(", ")}` };
      } catch (error) {
        logger.errorWithStack("Beta account creation error", error);
        return { success: false, message: `Failed to create beta accounts: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),

    /**
     * Get detailed seeding status
     */
    getStatus: adminProcedure.query(async () => {
      try {
        const db = await getDb();
        if (!db) return { success: false, message: "DB unavailable" };
        const [collections] = await db.select({ count: sql<number>`count(*)` }).from(designerCollections);
        const [items] = await db.select({ count: sql<number>`count(*)` }).from(wardrobeItems);
        const [sources] = await db.select({ count: sql<number>`count(*)` }).from(fundingSources);
        const [campaigns] = await db.select({ count: sql<number>`count(*)` }).from(crowdfundCampaigns);
        return {
          success: true,
          collections: collections?.count || 0,
          items: items?.count || 0,
          fundingSources: sources?.count || 0,
          campaigns: campaigns?.count || 0,
          message: "Database status retrieved successfully",
        };
      } catch (error) {
        return { success: false, message: `Failed to get status: ${error instanceof Error ? error.message : "Unknown error"}` };
      }
    }),
  });
  