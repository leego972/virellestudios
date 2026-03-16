/**
 * VirÉlle Studios — Content Creator Router
 *
 * tRPC router exposing all Content Creator endpoints:
 *  - Dashboard overview
 *  - Campaign CRUD
 *  - Content piece generation (single + bulk)
 *  - SEO brief import
 *  - Content queue management (approve, reject, schedule)
 *  - TikTok direct publishing
 *  - Analytics
 *  - Content calendar
 *  - Scheduled post processing
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  contentCreatorCampaigns,
  contentCreatorPieces,
  contentCreatorSchedules,
  contentCreatorAnalytics,
} from "../drizzle/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "./_core/logger";
import {
  generateCreatorContent,
  bulkGenerateForCampaign,
  generateSeoContentBriefs,
  publishPieceToTikTok,
  scheduleContentPiece,
  processDueSchedules,
  getContentCreatorDashboard,
  generateCampaignStrategy,
  PLATFORM_CONFIG,
} from "./content-creator-engine";
import { generatePictureAd, autoGeneratePictureAd } from "./_core/pictureAdEngine";
import { postToLinkedIn } from "./_core/socialPostingEngine";

const log = logger;

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const platformEnum = z.enum([
  "tiktok", "instagram", "x_twitter", "linkedin", "facebook",
  "youtube_shorts", "blog", "email", "pinterest", "reddit",
  "discord", "telegram", "medium", "hackernews", "whatsapp",
]);

const contentTypeEnum = z.enum([
  "social_post", "video_script", "photo_carousel", "blog_article",
  "email_campaign", "ad_copy", "reel", "story", "infographic", "thread",
]);

const statusEnum = z.enum(["draft", "review", "approved", "scheduled", "published", "failed", "archived"]);

const campaignStatusEnum = z.enum(["draft", "active", "paused", "completed", "archived"]);

// ─── Router ───────────────────────────────────────────────────────────────────

export const contentCreatorRouter = router({

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: adminProcedure.query(async () => {
    try {
      return await getContentCreatorDashboard();
    } catch (err: any) {
      log.error("[ContentCreatorRouter] dashboard error:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),

  // ─── Platform Config ────────────────────────────────────────────────────────
  getPlatforms: adminProcedure.query(() => {
    return Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      maxChars: cfg.maxChars,
      maxHashtags: cfg.hashtagCount,
      contentTypes: cfg.contentTypes,
    }));
  }),

  // ─── SEO Briefs ─────────────────────────────────────────────────────────────
  getSeoContentBriefs: adminProcedure
    .input(z.object({ count: z.number().min(1).max(20).default(5) }))
    .query(async ({ input }) => {
      try {
        return await generateSeoContentBriefs(input.count);
      } catch (err: any) {
        log.error("[ContentCreatorRouter] getSeoContentBriefs error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ─── Campaign CRUD ──────────────────────────────────────────────────────────
  listCampaigns: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      status: campaignStatusEnum.optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = input.status ? [eq(contentCreatorCampaigns.status, input.status)] : [];
      const campaigns = await db.select().from(contentCreatorCampaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contentCreatorCampaigns.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(contentCreatorCampaigns)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { campaigns, total: Number(countResult?.count || 0) };
    }),

  getCampaign: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const campaigns = await db.select().from(contentCreatorCampaigns)
        .where(eq(contentCreatorCampaigns.id, input.id)).limit(1);

      if (!campaigns[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      return campaigns[0];
    }),

  createCampaign: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      objective: z.string().optional(),
      targetAudience: z.string().optional(),
      platforms: z.array(platformEnum).default([]),
      seoKeywords: z.array(z.string()).default([]),
      brandVoice: z.string().optional(),
      tiktokLinked: z.boolean().default(false),
      seoLinked: z.boolean().default(true),
      advertisingLinked: z.boolean().default(false),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      generateStrategy: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let aiStrategy: string | undefined;
      if (input.generateStrategy && input.objective) {
        try {
          aiStrategy = await generateCampaignStrategy({
            name: input.name,
            objective: input.objective,
            targetAudience: input.targetAudience,
          });
        } catch (err) {
          log.warn("[ContentCreatorRouter] Strategy generation failed:", { error: String(err) });
        }
      }

      const [result] = await db.insert(contentCreatorCampaigns).values({
        name: input.name,
        description: input.description,
        objective: input.objective,
        targetAudience: input.targetAudience,
        platforms: input.platforms,
        seoKeywords: input.seoKeywords,
        brandVoice: input.brandVoice,
        aiStrategy,
        status: "draft",
        tiktokLinked: input.tiktokLinked,
        seoLinked: input.seoLinked,
        advertisingLinked: input.advertisingLinked,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      } as any);

      return { id: (result as any).insertId, success: true };
    }),

  updateCampaign: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      objective: z.string().optional(),
      targetAudience: z.string().optional(),
      platforms: z.array(platformEnum).optional(),
      seoKeywords: z.array(z.string()).optional(),
      brandVoice: z.string().optional(),
      status: campaignStatusEnum.optional(),
      tiktokLinked: z.boolean().optional(),
      seoLinked: z.boolean().optional(),
      advertisingLinked: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updates } = input;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(filteredUpdates).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      await db.update(contentCreatorCampaigns).set(filteredUpdates as any)
        .where(eq(contentCreatorCampaigns.id, id));

      return { success: true };
    }),

  deleteCampaign: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorCampaigns)
        .set({ status: "archived" })
        .where(eq(contentCreatorCampaigns.id, input.id));

      return { success: true };
    }),

  generateCampaignStrategy: adminProcedure
    .input(z.object({
      campaignId: z.number(),
      name: z.string(),
      objective: z.string(),
      platforms: z.array(platformEnum),
      targetAudience: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const strategy = await generateCampaignStrategy({
        name: input.name,
        objective: input.objective,
        targetAudience: input.targetAudience,
      });

      await db.update(contentCreatorCampaigns)
        .set({ aiStrategy: strategy })
        .where(eq(contentCreatorCampaigns.id, input.campaignId));

      return { strategy };
    }),

  // ─── Content Piece Generation ───────────────────────────────────────────────
  generatePiece: adminProcedure
    .input(z.object({
      platform: platformEnum,
      contentType: contentTypeEnum,
      topic: z.string().optional(),
      campaignObjective: z.string().optional(),
      seoKeywords: z.array(z.string()).default([]),
      targetAudience: z.string().optional(),
      brandVoice: z.string().optional(),
      includeImage: z.boolean().default(false),
      campaignId: z.number().optional(),
      saveToDb: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      try {
        const content = await generateCreatorContent({
          platform: input.platform,
          contentType: input.contentType,
          topic: input.topic,
          campaignObjective: input.campaignObjective,
          seoKeywords: input.seoKeywords,
          brandVoice: input.brandVoice,
          includeImage: input.includeImage,
          campaignId: input.campaignId,
        });

        let pieceId: number | undefined;
        if (input.saveToDb) {
          const db = await getDb();
          if (db) {
            const [result] = await db.insert(contentCreatorPieces).values({
              campaignId: input.campaignId,
              platform: input.platform,
              contentType: input.contentType,
              title: content.title,
              headline: content.headline,
              body: content.body,
              callToAction: content.callToAction,
              hashtags: content.hashtags,
              hook: content.hook,
              videoScript: content.videoScript,
              visualDirections: content.visualDirections,
              seoKeywords: content.seoKeywords,
              imagePrompt: content.imagePrompt,
              mediaUrl: content.mediaUrl,
              seoScore: content.seoScore,
              qualityScore: content.qualityScore,
              status: "draft",
              aiPrompt: input.topic || "Single piece generation",
              aiModel: "gpt-4.1-mini",
              generationMs: content.generationMs,
            } as any);
            pieceId = (result as any).insertId;

            if (input.campaignId) {
              await db.update(contentCreatorCampaigns)
                .set({ totalPieces: sql`totalPieces + 1` })
                .where(eq(contentCreatorCampaigns.id, input.campaignId));
            }
          }
        }

        return { ...content, pieceId };
      } catch (err: any) {
        log.error("[ContentCreatorRouter] generatePiece error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  bulkGenerate: adminProcedure
    .input(z.object({
      campaignId: z.number(),
      platforms: z.array(platformEnum),
      topic: z.string().optional(),
      seoKeywords: z.array(z.string()).default([]),
      includeImages: z.boolean().default(false),
      campaignObjective: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await bulkGenerateForCampaign({
          campaignId: input.campaignId,
          platforms: input.platforms,
          topic: input.topic,
          seoKeywords: input.seoKeywords,
          includeImages: input.includeImages,
        });
      } catch (err: any) {
        log.error("[ContentCreatorRouter] bulkGenerate error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ─── Content Queue ──────────────────────────────────────────────────────────
  listPieces: adminProcedure
    .input(z.object({
      campaignId: z.number().optional(),
      platform: platformEnum.optional(),
      status: statusEnum.optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.campaignId) conditions.push(eq(contentCreatorPieces.campaignId, input.campaignId));
      if (input.platform) conditions.push(eq(contentCreatorPieces.platform, input.platform));
      if (input.status) conditions.push(eq(contentCreatorPieces.status, input.status));

      const pieces = await db.select().from(contentCreatorPieces)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contentCreatorPieces.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(contentCreatorPieces)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { pieces, total: Number(countResult?.count || 0) };
    }),

  getPiece: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const pieces = await db.select().from(contentCreatorPieces)
        .where(eq(contentCreatorPieces.id, input.id)).limit(1);

      if (!pieces[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Content piece not found" });
      return pieces[0];
    }),

  updatePieceStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: statusEnum,
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorPieces)
        .set({ status: input.status as any })
        .where(eq(contentCreatorPieces.id, input.id));

      return { success: true };
    }),

  updatePiece: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      headline: z.string().optional(),
      body: z.string().optional(),
      callToAction: z.string().optional(),
      hook: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      seoKeywords: z.array(z.string()).optional(),
      videoScript: z.string().optional(),
      status: statusEnum.optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { id, ...updates } = input;
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      await db.update(contentCreatorPieces)
        .set(filteredUpdates as any)
        .where(eq(contentCreatorPieces.id, id));

      return { success: true };
    }),

  deletePiece: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorPieces)
        .set({ status: "archived" })
        .where(eq(contentCreatorPieces.id, input.id));

      return { success: true };
    }),

  approvePiece: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorPieces)
        .set({ status: "approved" })
        .where(eq(contentCreatorPieces.id, input.id));

      return { success: true };
    }),

  rejectPiece: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorPieces)
        .set({ status: "archived" })
        .where(eq(contentCreatorPieces.id, input.id));

      return { success: true };
    }),

  // ─── Scheduling ─────────────────────────────────────────────────────────────
  schedulePiece: adminProcedure
    .input(z.object({
      pieceId: z.number(),
      scheduledAt: z.string(),
      campaignId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await scheduleContentPiece({
          pieceId: input.pieceId,
          scheduledAt: new Date(input.scheduledAt),
          campaignId: input.campaignId,
        });
      } catch (err: any) {
        log.error("[ContentCreatorRouter] schedulePiece error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  listSchedules: adminProcedure
    .input(z.object({
      campaignId: z.number().optional(),
      platform: platformEnum.optional(),
      status: z.enum(["pending", "processing", "published", "failed", "cancelled"]).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.campaignId) conditions.push(eq(contentCreatorSchedules.campaignId, input.campaignId));
      if (input.platform) conditions.push(eq(contentCreatorSchedules.platform, input.platform));
      if (input.status) conditions.push(eq(contentCreatorSchedules.status, input.status));
      if (input.from) conditions.push(gte(contentCreatorSchedules.scheduledAt, new Date(input.from)));
      if (input.to) conditions.push(lte(contentCreatorSchedules.scheduledAt, new Date(input.to)));

      return db.select().from(contentCreatorSchedules)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(contentCreatorSchedules.scheduledAt)
        .limit(input.limit);
    }),

  cancelSchedule: adminProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(contentCreatorSchedules)
        .set({ status: "cancelled" })
        .where(eq(contentCreatorSchedules.id, input.scheduleId));

      return { success: true };
    }),

  processDueSchedules: adminProcedure.mutation(async () => {
    try {
      return await processDueSchedules();
    } catch (err: any) {
      log.error("[ContentCreatorRouter] processDueSchedules error:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),

  // ─── TikTok Publishing ──────────────────────────────────────────────────────
  publishToTikTok: adminProcedure
    .input(z.object({
      pieceId: z.number(),
      privacyLevel: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]).default("PUBLIC_TO_EVERYONE"),
    }))
    .mutation(async ({ input }) => {
      try {
        return await publishPieceToTikTok({
          pieceId: input.pieceId,
        });
      } catch (err: any) {
        log.error("[ContentCreatorRouter] publishToTikTok error:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // ─── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics: adminProcedure
    .input(z.object({
      campaignId: z.number().optional(),
      platform: platformEnum.optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.campaignId) conditions.push(eq(contentCreatorAnalytics.campaignId, input.campaignId));
      if (input.platform) conditions.push(eq(contentCreatorAnalytics.platform, input.platform));
      if (input.from) conditions.push(gte(contentCreatorAnalytics.createdAt, new Date(input.from)));
      if (input.to) conditions.push(lte(contentCreatorAnalytics.createdAt, new Date(input.to)));

      const rows = await db.select().from(contentCreatorAnalytics)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(contentCreatorAnalytics.createdAt))
        .limit(500);

      const totals = rows.reduce((acc, row) => ({
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        engagements: acc.engagements + row.engagements,
        shares: acc.shares + row.shares,
        saves: acc.saves + row.saves,
        videoViews: acc.videoViews + row.videoViews,
      }), { impressions: 0, clicks: 0, engagements: 0, shares: 0, saves: 0, videoViews: 0 });

      const avgCtr = rows.length > 0 ? rows.reduce((s, r) => s + r.ctr, 0) / rows.length : 0;
      const avgEngagementRate = rows.length > 0 ? rows.reduce((s, r) => s + r.engagementRate, 0) / rows.length : 0;

      const byPlatform: Record<string, typeof totals> = {};
      for (const row of rows) {
        if (!byPlatform[row.platform]) {
          byPlatform[row.platform] = { impressions: 0, clicks: 0, engagements: 0, shares: 0, saves: 0, videoViews: 0 };
        }
        byPlatform[row.platform].impressions += row.impressions;
        byPlatform[row.platform].clicks += row.clicks;
        byPlatform[row.platform].engagements += row.engagements;
        byPlatform[row.platform].shares += row.shares;
        byPlatform[row.platform].saves += row.saves;
        byPlatform[row.platform].videoViews += row.videoViews;
      }

      return { totals, avgCtr, avgEngagementRate, byPlatform, rows: rows.slice(0, 100) };
    }),

  updateAnalytics: adminProcedure
    .input(z.object({
      pieceId: z.number(),
      platform: platformEnum,
      campaignId: z.number().optional(),
      impressions: z.number().default(0),
      clicks: z.number().default(0),
      engagements: z.number().default(0),
      shares: z.number().default(0),
      saves: z.number().default(0),
      videoViews: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const ctr = input.impressions > 0 ? (input.clicks / input.impressions) * 100 : 0;
      const engagementRate = input.impressions > 0 ? (input.engagements / input.impressions) * 100 : 0;

      await db.insert(contentCreatorAnalytics).values({
        pieceId: input.pieceId,
        campaignId: input.campaignId,
        platform: input.platform,
        impressions: input.impressions,
        clicks: input.clicks,
        engagements: input.engagements,
        shares: input.shares,
        saves: input.saves,
        videoViews: input.videoViews,
        ctr,
        engagementRate,
      } as any);

      await db.update(contentCreatorPieces).set({
        impressions: sql`impressions + ${input.impressions}`,
        clicks: sql`clicks + ${input.clicks}`,
        engagements: sql`engagements + ${input.engagements}`,
        shares: sql`shares + ${input.shares}`,
        saves: sql`saves + ${input.saves}`,
        videoViews: sql`videoViews + ${input.videoViews}`,
      }).where(eq(contentCreatorPieces.id, input.pieceId));

      return { success: true, ctr, engagementRate };
    }),

  // ─── Picture Ad Generation ─────────────────────────────────────────────────
  generatePictureAd: adminProcedure
    .input(z.object({
      headline: z.string().min(1).max(200),
      subtext: z.string().max(300).optional(),
      cta: z.string().max(50).optional(),
      brand: z.string().max(100).optional(),
      backgroundImageUrl: z.string().url().optional(),
      backgroundTopic: z.string().max(300).optional(),
      style: z.enum(["minimal", "bold", "cinematic", "gradient", "dark", "light"]).default("cinematic"),
      format: z.enum(["square", "portrait", "story", "landscape", "banner"]).default("square"),
      brandColor: z.string().max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await generatePictureAd(input);
      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Failed to generate picture ad" });
      }
      return result;
    }),

  autoGeneratePictureAd: adminProcedure
    .input(z.object({
      topic: z.string().min(1).max(300),
      platform: z.string().min(1).max(50),
      brandName: z.string().max(100).optional(),
      brandColor: z.string().max(20).optional(),
      style: z.enum(["minimal", "bold", "cinematic", "gradient", "dark", "light"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return await autoGeneratePictureAd(input);
    }),

  // ─── LinkedIn Publishing ───────────────────────────────────────────────────
  publishToLinkedIn: adminProcedure
    .input(z.object({
      text: z.string().min(1).max(3000),
      imageUrl: z.string().url().optional(),
      title: z.string().max(200).optional(),
      pieceId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await postToLinkedIn({
        text: input.text,
        imageUrl: input.imageUrl,
        title: input.title,
      });
      // Update piece status if pieceId provided
      if (input.pieceId && result.success) {
        try {
          const db = await getDb();
          if (db) {
            await db.update(contentCreatorPieces)
              .set({ status: "published", publishedAt: new Date() } as any)
              .where(eq(contentCreatorPieces.id, input.pieceId));
          }
        } catch (_) { /* non-critical */ }
      }
      return result;
    }),

  // ─── Content Calendar ───────────────────────────────────────────────────────
  getCalendar: adminProcedure
    .input(z.object({
      from: z.string(),
      to: z.string(),
      campaignId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [
        gte(contentCreatorSchedules.scheduledAt, new Date(input.from)),
        lte(contentCreatorSchedules.scheduledAt, new Date(input.to)),
      ];
      if (input.campaignId) conditions.push(eq(contentCreatorSchedules.campaignId, input.campaignId));

      const schedules = await db.select().from(contentCreatorSchedules)
        .where(and(...conditions))
        .orderBy(contentCreatorSchedules.scheduledAt)
        .limit(200);

      const pieceIds = [...new Set(schedules.map(s => s.pieceId))];
      const pieces = pieceIds.length > 0
        ? await db.select({
            id: contentCreatorPieces.id,
            title: contentCreatorPieces.title,
            headline: contentCreatorPieces.headline,
            platform: contentCreatorPieces.platform,
            contentType: contentCreatorPieces.contentType,
            status: contentCreatorPieces.status,
            mediaUrl: contentCreatorPieces.mediaUrl,
          }).from(contentCreatorPieces)
            .where(sql`id IN (${sql.join(pieceIds.map(id => sql`${id}`), sql`, `)})`)
        : [];

      const pieceMap = new Map(pieces.map(p => [p.id, p]));

      return schedules.map(s => ({
        ...s,
        piece: pieceMap.get(s.pieceId),
      }));
    }),
});
