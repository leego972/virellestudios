/**
 * Advertising Router — VirÉlle Studios
 *
 * Full tRPC router connecting the autonomous advertising-orchestrator,
 * TikTok content pipeline, video generation, and channel management
 * to the admin frontend.
 *
 * All procedures are admin-only since this controls autonomous content
 * generation, budget, and external publishing.
 */

import { z } from "zod";
import { router, adminProcedure } from "./_core/trpc";
import { getAllChannelStatuses } from "./marketing-channels";
import { getExpandedChannelStatuses } from "./expanded-channels";
import {
  runAdvertisingCycle,
  getStrategyOverview,
  getRecentActivity,
  getPerformanceMetrics,
  GROWTH_STRATEGIES,
  startAdvertisingScheduler,
  stopAdvertisingScheduler,
  getChannelPerformanceReport,
  getCrossChannelAttribution,
  getActiveABTests,
  createABTest,
  recordABTestResult,
} from "./advertising-orchestrator";
import {
  runTikTokContentPipeline,
  getTikTokContentStats,
  isTikTokContentConfigured,
  queryCreatorInfo,
  getPostStatus,
} from "./tiktok-content-service";
import {
  generateVideo,
  generateVideoWithFallback,
} from "./_core/videoGeneration";
import { getDb } from "./db";
import {
  marketingContent,
  marketingActivityLog,
  marketingCampaigns,
  marketingPerformance,
  blogArticles,
} from "../drizzle/schema";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";

export const advertisingRouter = router({
  // ══════════════════════════════════════════════════════════════════════════
  // STRATEGY & OVERVIEW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the full advertising strategy overview — budget, channels, schedule
   */
  getStrategy: adminProcedure.query(async () => {
    return getStrategyOverview();
  }),

  /**
   * Get performance metrics for the last N days
   */
  getPerformance: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return getPerformanceMetrics(input.days);
    }),

  /**
   * Get recent advertising activity log
   */
  getActivity: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return getRecentActivity(input.limit);
    }),

  /**
   * Manually trigger one full advertising cycle
   */
  runCycle: adminProcedure.mutation(async () => {
    const result = await runAdvertisingCycle();
    return result;
  }),

  /**
   * Get all growth strategies with cost/impact breakdown
   */
  getStrategies: adminProcedure.query(async () => {
    return GROWTH_STRATEGIES;
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // CONTENT QUEUE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the content queue — all generated content pending review/publishing
   */
  getContentQueue: adminProcedure
    .input(
      z.object({
        status: z.enum(["draft", "approved", "published", "rejected", "all"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const where =
        input.status !== "all"
          ? eq(marketingContent.status, input.status as any)
          : undefined;
      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(marketingContent)
          .where(where)
          .orderBy(desc(marketingContent.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: count() })
          .from(marketingContent)
          .where(where),
      ]);
      return { items, total: Number(totalRows[0]?.count ?? 0) };
    }),

  /**
   * Update the status of a content piece (approve/reject/publish)
   */
  updateContentStatus: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["draft", "approved", "published", "rejected"]),
        publishedUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(marketingContent)
        .set({
          status: input.status as any,
          ...(input.publishedUrl ? { publishedUrl: input.publishedUrl } : {}),
          ...(input.status === "published" ? { publishedAt: new Date() } : {}),
        })
        .where(eq(marketingContent.id, input.id));
      return { success: true };
    }),

  /**
   * Get a single content piece by ID
   */
  getContentById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db
        .select()
        .from(marketingContent)
        .where(eq(marketingContent.id, input.id))
        .limit(1);
      return rows[0] ?? null;
    }),

  /**
   * Get content that can be previewed (approved or published, with body)
   */
  getPreviewableContent: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(marketingContent)
        .where(
          sql`${marketingContent.status} IN ('approved', 'published') AND ${marketingContent.body} IS NOT NULL`
        )
        .orderBy(desc(marketingContent.createdAt))
        .limit(input.limit);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Full dashboard data — strategy + performance + activity + content queue counts
   */
  getDashboard: adminProcedure.query(async () => {
    const db = await getDb();
    const [performance, recentActivity] = await Promise.all([
      getPerformanceMetrics(30),
      getRecentActivity(10),
    ]);

    let contentQueue = { draft: 0, approved: 0, published: 0, rejected: 0 };
    if (db) {
      const contentCounts = await db
        .select({ status: marketingContent.status, count: count() })
        .from(marketingContent)
        .groupBy(marketingContent.status);
      for (const c of contentCounts) {
        if (c.status && c.status in contentQueue) {
          (contentQueue as any)[c.status] = Number(c.count);
        }
      }
    }

    return {
      strategy: getStrategyOverview(),
      performance,
      recentActivity,
      contentQueue,
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // TIKTOK
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get TikTok content posting stats and creator info
   */
  getTikTokStats: adminProcedure.query(async () => {
    const [stats, creatorInfo] = await Promise.all([
      getTikTokContentStats(),
      queryCreatorInfo(),
    ]);
    return { ...stats, creatorInfo, isConfigured: isTikTokContentConfigured() };
  }),

  /**
   * Manually trigger TikTok content generation and posting
   */
  triggerTikTokPost: adminProcedure.mutation(async () => {
    return runTikTokContentPipeline();
  }),

  /**
   * Check the status of a TikTok post by publish_id
   */
  checkTikTokPostStatus: adminProcedure
    .input(z.object({ publishId: z.string() }))
    .query(async ({ input }) => {
      return getPostStatus(input.publishId);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // VIDEO GENERATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a cinematic video from a prompt
   */
  generateVideo: adminProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(1000),
        duration: z.number().min(1).max(8).default(4),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideo({
        prompt: input.prompt,
        duration: input.duration,
        aspectRatio: input.aspectRatio,
      });
    }),

  /**
   * Generate a short-form vertical video (TikTok / YouTube Shorts)
   */
  generateShortVideo: adminProcedure
    .input(
      z.object({
        prompt: z.string().min(5).max(500),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideoWithFallback({
        prompt: input.prompt,
        duration: 6,
        aspectRatio: "9:16",
      });
    }),

  /**
   * Generate a cinematic ad/promo video
   */
  generateAdVideo: adminProcedure
    .input(
      z.object({
        topic: z.string().min(3).max(300),
        cta: z.string().min(3).max(200),
      })
    )
    .mutation(async ({ input }) => {
      return generateVideoWithFallback({
        prompt: `Cinematic promotional video for VirÉlle Studios. Topic: ${input.topic}. Call to action: ${input.cta}. Visually stunning, AI-generated cinematography, professional film quality.`,
        duration: 8,
        aspectRatio: "16:9",
      });
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CHANNEL MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get connection status of all advertising channels (core + expanded)
   */
  getChannelStatuses: adminProcedure.query(() => {
    const core = getAllChannelStatuses();
    const expanded = getExpandedChannelStatuses();
    const freeApiChannels = expanded.filter((c) => c.type === "api_automated");
    const contentQueueChannels = expanded.filter((c) => c.type === "content_queue");
    return {
      core,
      freeApiChannels,
      contentQueueChannels,
      summary: {
        coreConnected: core.filter((c) => c.connected).length,
        coreTotal: core.length,
        freeApiConnected: freeApiChannels.filter((c) => c.connected).length,
        freeApiTotal: freeApiChannels.length,
        contentQueueTotal: contentQueueChannels.length,
      },
    };
  }),

  /**
   * Get channel performance report — success rates, latency, throttle status
   */
  getChannelPerformance: adminProcedure.query(() => {
    return getChannelPerformanceReport();
  }),

  /**
   * Get budget breakdown and cost per channel
   */
  getBudgetBreakdown: adminProcedure.query(async () => {
    const overview = getStrategyOverview();
    const performance = await getPerformanceMetrics(30);
    return {
      monthlyBudget: overview.monthlyBudget,
      currency: overview.currency,
      allocation: overview.budgetAllocation,
      utilization: (performance as any)?.budgetUtilization ?? null,
      freeChannels: overview.freeChannelCount,
      paidChannels: overview.paidChannelCount,
      costBreakdown: GROWTH_STRATEGIES.map((s) => ({
        channel: s.channel,
        costPerMonth: s.costPerMonth,
        frequency: s.frequency,
        impact: s.expectedImpact,
        automatable: s.automatable,
      })),
    };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS-CHANNEL ATTRIBUTION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get cross-channel attribution data — which channels drive the most value
   */
  getCrossChannelAttribution: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      return getCrossChannelAttribution(input.days);
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // A/B TESTING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all active A/B tests
   */
  getABTests: adminProcedure.query(() => {
    return getActiveABTests();
  }),

  /**
   * Create a new A/B test for a channel
   */
  createABTest: adminProcedure
    .input(
      z.object({
        channel: z.string(),
        variantADesc: z.string().min(3).max(500),
        variantBDesc: z.string().min(3).max(500),
      })
    )
    .mutation(({ input }) => {
      return createABTest(input.channel, input.variantADesc, input.variantBDesc);
    }),

  /**
   * Record the result of an A/B test variant
   */
  recordABTestResult: adminProcedure
    .input(
      z.object({
        testId: z.string(),
        variant: z.enum(["A", "B"]),
        success: z.boolean(),
      })
    )
    .mutation(({ input }) => {
      recordABTestResult(input.testId, input.variant, input.success);
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SCHEDULER CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Start the autonomous advertising scheduler
   */
  startScheduler: adminProcedure.mutation(() => {
    startAdvertisingScheduler();
    return { success: true, message: "VirÉlle Studios advertising scheduler started" };
  }),

  /**
   * Stop the autonomous advertising scheduler
   */
  stopScheduler: adminProcedure.mutation(() => {
    stopAdvertisingScheduler();
    return { success: true, message: "VirÉlle Studios advertising scheduler stopped" };
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // BLOG POSTS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get recent blog posts generated by the advertising orchestrator
   */
  getBlogPosts: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };
      const [items, totalRows] = await Promise.all([
        db
          .select()
          .from(blogArticles)
          .orderBy(desc(blogArticles.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db.select({ count: count() }).from(blogArticles),
      ]);
      return { items, total: Number(totalRows[0]?.count ?? 0) };
    }),

  /**
   * Get marketing campaign performance data
   */
  getCampaignPerformance: adminProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(marketingPerformance)
        .orderBy(desc(marketingPerformance.createdAt))
        .limit(100);
    }),
});
