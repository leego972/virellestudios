/**
 * VirÉlle Studios — Autonomous Pipeline Orchestrator
 *
 * This is the master controller that runs the full autonomous cycle:
 *
 *   Stage 1 — CONTENT CREATION
 *     → Content Creator Engine generates cinematic images + videos
 *     → Content is saved to marketing_content table with status "approved"
 *
 *   Stage 2 — DISTRIBUTION
 *     → Marketing Engine picks up approved content
 *     → Distributes to all connected social/ad platforms
 *     → Records performance metrics
 *
 *   Stage 3 — SEO OPTIMISATION
 *     → SEO Engine runs a scheduled optimisation cycle
 *     → Updates sitemaps, meta tags, internal links
 *     → Submits new URLs to IndexNow
 *     → Generates content briefs for the blog engine
 *
 *   Stage 4 — REPORTING
 *     → Logs the full cycle to autonomous_pipeline_log
 *     → Returns a summary for the admin dashboard
 *
 * The pipeline can be triggered:
 *   - Automatically via cron (every 6 hours by default)
 *   - Manually via the admin tRPC router
 *   - On-demand per stage
 */

import { getDb } from "./db";
import { logger } from "./_core/logger";
import { sql } from "drizzle-orm";
import { runContentCreatorBatch, processDueSchedules, type AdPlatform } from "./content-creator-engine";
import { runAutonomousCycle as runMarketingCycle } from "./marketing-engine";
import { runScheduledSeoOptimization } from "./seo-engine";
import { postToAllChannels } from "./marketing-channels";
import { marketingContent, marketingActivityLog } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

const log = logger;

// ─── Pipeline configuration ───────────────────────────────────────────────────

export interface PipelineConfig {
  /** Enable/disable the full autonomous pipeline */
  enabled: boolean;
  /** Cron schedule — default: every 6 hours */
  cronSchedule: string;
  /** Platforms to generate content for */
  contentPlatforms: AdPlatform[];
  /** Whether to generate video content (slower, uses Sora/Runway) */
  generateVideos: boolean;
  /** Whether to run SEO optimisation after content distribution */
  runSeoOptimisation: boolean;
  /** Whether to auto-publish content to social platforms */
  autoPublish: boolean;
  /** Max content pieces to generate per cycle */
  maxContentPerCycle: number;
}

const DEFAULT_CONFIG: PipelineConfig = {
  enabled: true,
  cronSchedule: "0 0 */6 * * *", // every 6 hours
  contentPlatforms: ["instagram", "tiktok", "facebook", "x_twitter", "linkedin"],
  generateVideos: false, // disabled by default (expensive)
  runSeoOptimisation: true,
  autoPublish: false, // disabled by default — require manual approval
  maxContentPerCycle: 5,
};

// ─── Pipeline state ───────────────────────────────────────────────────────────

let pipelineConfig: PipelineConfig = { ...DEFAULT_CONFIG };
let isRunning = false;
let lastRunAt: Date | null = null;
let lastRunResult: PipelineRunResult | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

// ─── Pipeline result type ─────────────────────────────────────────────────────

export interface PipelineStageResult {
  stage: string;
  success: boolean;
  details: Record<string, any>;
  durationMs: number;
  error?: string;
}

export interface PipelineRunResult {
  cycleId: string;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  success: boolean;
  stages: PipelineStageResult[];
  summary: {
    contentCreated: number;
    contentPublished: number;
    platformsReached: string[];
    seoOptimised: boolean;
    errors: string[];
  };
}

// ─── Stage 1: Content Creation ────────────────────────────────────────────────

async function runContentCreationStage(
  config: PipelineConfig
): Promise<PipelineStageResult> {
  const start = Date.now();
  log.info("[Pipeline] Stage 1: Content Creation starting...");

  try {
    const platforms = config.contentPlatforms.slice(0, config.maxContentPerCycle);
    const results = await runContentCreatorBatch(platforms, {
      generateVideo: config.generateVideos,
    });

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    log.info(`[Pipeline] Stage 1 complete: ${succeeded.length} content pieces created`);

    return {
      stage: "content_creation",
      success: succeeded.length > 0,
      details: {
        requested: platforms.length,
        created: succeeded.length,
        failed: failed.length,
        platforms: succeeded.map(r => r.platform),
        contentIds: succeeded.map(r => r.contentId).filter(Boolean),
      },
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    log.error("[Pipeline] Stage 1 failed:", { error: String(err) });
    return {
      stage: "content_creation",
      success: false,
      details: {},
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

// ─── Stage 2: Distribution ────────────────────────────────────────────────────

async function runDistributionStage(
  config: PipelineConfig
): Promise<PipelineStageResult> {
  const start = Date.now();
  log.info("[Pipeline] Stage 2: Distribution starting...");

  try {
    // Run the marketing engine's autonomous cycle (handles approved content + campaigns)
    const marketingResult = await runMarketingCycle();

    const platformsReached: string[] = [];

    // If autoPublish is enabled, also directly push approved content to channels
    if (config.autoPublish) {
      const db = await getDb();
      if (db) {
        const approvedContent = await db
          .select()
          .from(marketingContent)
          .where(
            and(
              eq(marketingContent.status, "approved"),
              isNull(marketingContent.publishedAt)
            )
          )
          .limit(10);

        for (const content of approvedContent) {
          try {
            const postResults = await postToAllChannels({
              message: content.body,
              link: "https://virelle.life",
              imageUrl: content.imageUrl || undefined,
            });

            const successfulPlatforms = Object.entries(postResults)
              .filter(([, r]) => r.success)
              .map(([platform]) => platform);

            platformsReached.push(...successfulPlatforms);

            // Mark as published
            await db
              .update(marketingContent)
              .set({
                status: "published",
                publishedAt: new Date(),
              })
              .where(eq(marketingContent.id, content.id));

          } catch (err: unknown) {
            log.error(`[Pipeline] Failed to publish content ${content.id}:`, { error: String(err) });
          }
        }
      }
    }

    log.info(`[Pipeline] Stage 2 complete: ${marketingResult.contentPublished} published`);

    return {
      stage: "distribution",
      success: true,
      details: {
        contentPublished: marketingResult.contentPublished,
        campaignsOptimized: marketingResult.campaignsOptimized,
        budgetReallocated: marketingResult.budgetReallocated,
        platformsReached,
        autoPublishEnabled: config.autoPublish,
      },
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    log.error("[Pipeline] Stage 2 failed:", { error: String(err) });
    return {
      stage: "distribution",
      success: false,
      details: {},
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

// ─── Stage 3: SEO Optimisation ────────────────────────────────────────────────

async function runSeoStage(): Promise<PipelineStageResult> {
  const start = Date.now();
  log.info("[Pipeline] Stage 3: SEO Optimisation starting...");

  try {
    const report = await runScheduledSeoOptimization();

    if (!report) {
      return {
        stage: "seo_optimisation",
        success: false,
        details: { reason: "SEO engine returned null (may be rate-limited or killed)" },
        durationMs: Date.now() - start,
      };
    }

    log.info(`[Pipeline] Stage 3 complete: SEO score ${report.score?.overall || 0}/100`);

    return {
      stage: "seo_optimisation",
      success: true,
      details: {
        overallScore: report.score?.overall || 0,
        issuesFound: report.score?.issues?.length || 0,
        recommendationsCount: report.score?.recommendations?.length || 0,
        pagesAnalyzed: report.publicPages || 0,
        keywordsAnalyzed: report.keywords?.primaryKeywords?.length || 0,
      },
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    log.error("[Pipeline] Stage 3 failed:", { error: String(err) });
    return {
      stage: "seo_optimisation",
      success: false,
      details: {},
      durationMs: Date.now() - start,
      error: String(err),
    };
  }
}

// ─── Stage 4: Logging ─────────────────────────────────────────────────────────

async function logPipelineRun(result: PipelineRunResult): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Log to marketing_activity_log
    await db.insert(marketingActivityLog).values({
      action: "autonomous_pipeline_run",
      description: `Pipeline cycle ${result.cycleId} completed in ${Math.round(result.durationMs / 1000)}s — ${result.summary.contentCreated} content pieces created, ${result.summary.contentPublished} published`,
      metadata: {
        cycleId: result.cycleId,
        success: result.success,
        summary: result.summary,
        stages: result.stages.map(s => ({
          stage: s.stage,
          success: s.success,
          durationMs: s.durationMs,
          error: s.error,
        })),
      } as any,
    } as any);

    // Log to autonomous_pipeline_log table
    for (const stage of result.stages) {
      await db.execute(sql.raw(`
        INSERT INTO autonomous_pipeline_log (cycle_id, stage, status, details, started_at, completed_at)
        VALUES (
          '${result.cycleId}',
          '${stage.stage}',
          '${stage.success ? "completed" : "failed"}',
          '${JSON.stringify(stage.details).replace(/'/g, "''")}',
          '${result.startedAt.toISOString().slice(0, 19).replace("T", " ")}',
          '${result.completedAt.toISOString().slice(0, 19).replace("T", " ")}'
        )
      `));
    }
  } catch (err: unknown) {
    log.error("[Pipeline] Failed to log pipeline run:", { error: String(err) });
  }
}

// ─── Main: Run the full pipeline ─────────────────────────────────────────────

export async function runAutonomousPipeline(
  overrideConfig?: Partial<PipelineConfig>
): Promise<PipelineRunResult> {
  if (isRunning) {
    log.warn("[Pipeline] Pipeline is already running, skipping this trigger");
    return {
      cycleId: "skipped",
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
      success: false,
      stages: [],
      summary: {
        contentCreated: 0,
        contentPublished: 0,
        platformsReached: [],
        seoOptimised: false,
        errors: ["Pipeline already running"],
      },
    };
  }

  const config = { ...pipelineConfig, ...overrideConfig };
  const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date();
  isRunning = true;

  log.info(`[Pipeline] Starting autonomous pipeline cycle ${cycleId}`);

  const stages: PipelineStageResult[] = [];
  const errors: string[] = [];

  try {
    // Stage 1: Content Creation
    const contentStage = await runContentCreationStage(config);
    stages.push(contentStage);
    if (contentStage.error) errors.push(`Content: ${contentStage.error}`);

    // Stage 2: Distribution
    const distributionStage = await runDistributionStage(config);
    stages.push(distributionStage);
    if (distributionStage.error) errors.push(`Distribution: ${distributionStage.error}`);

    // Stage 2b: Process due scheduled content posts (content calendar)
    try {
      const dueResult = await processDueSchedules();
      if (dueResult.processed > 0) {
        log.info(`[Pipeline] Processed ${dueResult.processed} scheduled content posts (${dueResult.published} published, ${dueResult.failed} failed)`);
      }
    } catch (schedErr) {
      log.warn("[Pipeline] processDueSchedules failed (non-critical):", { error: String(schedErr) });
    }

    // Stage 3: SEO (optional)
    if (config.runSeoOptimisation) {
      const seoStage = await runSeoStage();
      stages.push(seoStage);
      if (seoStage.error) errors.push(`SEO: ${seoStage.error}`);
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const result: PipelineRunResult = {
      cycleId,
      startedAt,
      completedAt,
      durationMs,
      success: stages.some(s => s.success),
      stages,
      summary: {
        contentCreated: contentStage.details.created || 0,
        contentPublished: distributionStage.details.contentPublished || 0,
        platformsReached: [
          ...(contentStage.details.platforms || []),
          ...(distributionStage.details.platformsReached || []),
        ],
        seoOptimised: stages.find(s => s.stage === "seo_optimisation")?.success || false,
        errors,
      },
    };

    lastRunAt = completedAt;
    lastRunResult = result;

    await logPipelineRun(result);

    log.info(`[Pipeline] Cycle ${cycleId} complete in ${Math.round(durationMs / 1000)}s`);
    return result;

  } finally {
    isRunning = false;
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Parse a simple cron-like schedule into milliseconds.
 * Supports: "every_6h", "every_12h", "every_24h", "every_1h"
 * Or a full cron string (for display only — actual scheduling uses setInterval).
 */
function parseCronToMs(schedule: string): number {
  if (schedule.includes("*/6")) return 6 * 60 * 60 * 1000;
  if (schedule.includes("*/12")) return 12 * 60 * 60 * 1000;
  if (schedule.includes("*/24") || schedule === "0 0 0 * * *") return 24 * 60 * 60 * 1000;
  if (schedule.includes("*/1") || schedule === "0 0 * * * *") return 60 * 60 * 1000;
  // Default: 6 hours
  return 6 * 60 * 60 * 1000;
}

export function startAutonomousPipelineScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  const intervalMs = parseCronToMs(pipelineConfig.cronSchedule);
  log.info(`[Pipeline] Scheduler started — running every ${Math.round(intervalMs / 3600000)}h`);

  schedulerInterval = setInterval(async () => {
    if (!pipelineConfig.enabled) {
      log.info("[Pipeline] Scheduler tick — pipeline disabled, skipping");
      return;
    }
    log.info("[Pipeline] Scheduler tick — starting autonomous cycle");
    try {
      await runAutonomousPipeline();
    } catch (err: unknown) {
      log.error("[Pipeline] Scheduled run failed:", { error: String(err) });
    }
  }, intervalMs);
}

export function stopAutonomousPipelineScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    log.info("[Pipeline] Scheduler stopped");
  }
}

// ─── Config management ────────────────────────────────────────────────────────

export function getPipelineConfig(): PipelineConfig {
  return { ...pipelineConfig };
}

export function updatePipelineConfig(updates: Partial<PipelineConfig>): PipelineConfig {
  pipelineConfig = { ...pipelineConfig, ...updates };
  // Restart scheduler if schedule changed
  if (updates.cronSchedule && schedulerInterval) {
    startAutonomousPipelineScheduler();
  }
  log.info("[Pipeline] Config updated:", updates);
  return { ...pipelineConfig };
}

export function getPipelineStatus(): {
  isRunning: boolean;
  isSchedulerActive: boolean;
  lastRunAt: Date | null;
  lastRunResult: PipelineRunResult | null;
  config: PipelineConfig;
} {
  return {
    isRunning,
    isSchedulerActive: schedulerInterval !== null,
    lastRunAt,
    lastRunResult,
    config: { ...pipelineConfig },
  };
}
