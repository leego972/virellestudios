/**
 * VirÉlle Studios — Autonomous Pipeline tRPC Router
 *
 * Admin-only procedures for controlling the autonomous pipeline:
 *   - Get pipeline status and configuration
 *   - Update pipeline configuration
 *   - Trigger a manual pipeline run
 *   - Trigger individual stages
 *   - Get content creator stats
 *   - Get pipeline run history
 */

import { adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  runAutonomousPipeline,
  startAutonomousPipelineScheduler,
  stopAutonomousPipelineScheduler,
  getPipelineConfig,
  updatePipelineConfig,
  getPipelineStatus,
} from "./autonomous-pipeline";
import type { AdPlatform } from "./content-creator-engine";
import {
  runContentCreatorJob,
  getContentCreatorStats,
  type ContentFormat,
} from "./content-creator-engine";
// runContentCreatorBatch was renamed — shim it using runContentCreatorJob per platform
async function runContentCreatorBatch(
  platforms: AdPlatform[],
  opts?: { generateVideo?: boolean; theme?: string }
) {
  const results = await Promise.allSettled(
    platforms.map(p => runContentCreatorJob(p, "image_post" as ContentFormat, opts))
  );
  return results.map((r, i) => ({
    platform: platforms[i],
    success: r.status === "fulfilled" && (r.value as any)?.success !== false,
    contentId: r.status === "fulfilled" ? (r.value as any)?.contentId : undefined,
    error: r.status === "rejected" ? String(r.reason) : undefined,
  }));
}
import { runAutonomousCycle as runMarketingCycle } from "./marketing-engine";
import { runScheduledSeoOptimization, generateSeoReport } from "./seo-engine";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";

const log = logger;

const AD_PLATFORMS: AdPlatform[] = [
  "instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"
];

export const autonomousRouter = router({

  // ─── Status ───────────────────────────────────────────────────────────────

  /** Get full pipeline status, config, and last run result */
  status: adminProcedure.query(async () => {
    return getPipelineStatus();
  }),

  /** Get content creator statistics */
  contentCreatorStats: adminProcedure.query(async () => {
    return getContentCreatorStats();
  }),

  /** Get pipeline run history from DB */
  runHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { runs: [] };

      try {
        const rows = await db.execute(sql.raw(`
          SELECT cycle_id, stage, status, details, started_at, completed_at
          FROM autonomous_pipeline_log
          ORDER BY started_at DESC
          LIMIT ${input?.limit || 20}
        `));
        return { runs: (rows as any)[0] || [] };
      } catch {
        return { runs: [] };
      }
    }),

  // ─── Configuration ────────────────────────────────────────────────────────

  /** Get current pipeline configuration */
  getConfig: adminProcedure.query(async () => {
    return getPipelineConfig();
  }),

  /** Update pipeline configuration */
  updateConfig: adminProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      cronSchedule: z.string().optional(),
      contentPlatforms: z.array(z.enum(["instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"])).optional(),
      generateVideos: z.boolean().optional(),
      runSeoOptimisation: z.boolean().optional(),
      autoPublish: z.boolean().optional(),
      maxContentPerCycle: z.number().min(1).max(20).optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = updatePipelineConfig(input as any);
      return { success: true, config: updated };
    }),

  // ─── Scheduler ────────────────────────────────────────────────────────────

  /** Start the autonomous scheduler */
  startScheduler: adminProcedure.mutation(async () => {
    startAutonomousPipelineScheduler();
    return { success: true, message: "Autonomous pipeline scheduler started" };
  }),

  /** Stop the autonomous scheduler */
  stopScheduler: adminProcedure.mutation(async () => {
    stopAutonomousPipelineScheduler();
    return { success: true, message: "Autonomous pipeline scheduler stopped" };
  }),

  // ─── Manual triggers ──────────────────────────────────────────────────────

  /** Run the full autonomous pipeline immediately */
  runPipeline: adminProcedure
    .input(z.object({
      generateVideos: z.boolean().optional(),
      platforms: z.array(z.enum(["instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"])).optional(),
      runSeo: z.boolean().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      log.info("[AutonomousRouter] Manual pipeline trigger");
      const result = await runAutonomousPipeline({
        generateVideos: input?.generateVideos,
        contentPlatforms: input?.platforms as AdPlatform[] | undefined,
        runSeoOptimisation: input?.runSeo,
      });
      return result;
    }),

  /** Run only the content creation stage */
  runContentCreation: adminProcedure
    .input(z.object({
      platforms: z.array(z.enum(["instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"])).optional(),
      generateVideos: z.boolean().optional(),
      theme: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const platforms = (input?.platforms as AdPlatform[]) || ["instagram", "tiktok", "facebook", "x_twitter"];
      log.info(`[AutonomousRouter] Manual content creation for: ${platforms.join(", ")}`);
      const results = await runContentCreatorBatch(platforms, {
        generateVideo: input?.generateVideos,
        theme: input?.theme,
      });
      return {
        success: results.some(r => r.success),
        created: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }),

  /** Run content creation for a single platform */
  runSinglePlatformContent: adminProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "facebook", "x_twitter", "linkedin", "youtube_shorts", "pinterest"]),
      generateVideo: z.boolean().optional(),
      theme: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      log.info(`[AutonomousRouter] Single platform content creation: ${input.platform}`);
      const result = await runContentCreatorJob(
        input.platform as AdPlatform,
        "image_post" as ContentFormat,
        { generateVideo: input.generateVideo, theme: input.theme }
      );
      return result;
    }),

  /** Run only the marketing distribution stage */
  runMarketing: adminProcedure.mutation(async () => {
    log.info("[AutonomousRouter] Manual marketing cycle trigger");
    const result = await runMarketingCycle();
    return result;
  }),

  /** Run only the SEO optimisation stage */
  runSeo: adminProcedure.mutation(async () => {
    log.info("[AutonomousRouter] Manual SEO optimisation trigger");
    const report = await runScheduledSeoOptimization();
    if (!report) {
      return { success: false, message: "SEO engine returned null — may be rate-limited or killed" };
    }
    return {
      success: true,
      score: report.score?.overall || 0,
      issues: report.score?.issues?.length || 0,
      recommendations: report.score?.recommendations?.length || 0,
    };
  }),

  /** Generate a full SEO report */
  generateSeoReport: adminProcedure.mutation(async () => {
    log.info("[AutonomousRouter] Generating SEO report");
    const report = await generateSeoReport();
    return report;
  }),

  // ─── Content management ───────────────────────────────────────────────────

  /** List pending/approved content waiting for distribution */
  listPendingContent: adminProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "published", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { content: [] };

      try {
        const status = input?.status || "approved";
        const limit = input?.limit || 20;
        const rows = await db.execute(sql.raw(`
          SELECT id, platform, type, headline, body, image_url, video_url, status, created_at
          FROM marketing_content
          WHERE status = '${status}'
          ORDER BY created_at DESC
          LIMIT ${limit}
        `));
        return { content: (rows as any)[0] || [] };
      } catch (err: unknown) {
        return { content: [], error: String(err) };
      }
    }),

  /** Approve content for distribution */
  approveContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.execute(sql.raw(
        `UPDATE marketing_content SET status = 'approved' WHERE id = ${input.id}`
      ));
      return { success: true };
    }),

  /** Reject/delete content */
  rejectContent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.execute(sql.raw(
        `UPDATE marketing_content SET status = 'rejected' WHERE id = ${input.id}`
      ));
      return { success: true };
    }),

  /** Get marketing activity log */
  activityLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { log: [] };

      try {
        const rows = await db.execute(sql.raw(`
          SELECT id, action, description, metadata, created_at
          FROM marketing_activity_log
          ORDER BY created_at DESC
          LIMIT ${input?.limit || 50}
        `));
        return { log: (rows as any)[0] || [] };
      } catch {
        return { log: [] };
      }
    }),
});

export type AutonomousRouter = typeof autonomousRouter;
