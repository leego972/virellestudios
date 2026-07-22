/**
 * Studio Render Worker — BYOK-only video transform job processor.
 *
 * Polls `virelle_video_transform_jobs` WHERE mode='studio_render' AND status='queued'.
 */
import * as db from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { decryptApiKey } from "./_core/securityEngine";
import { generateVideoStrict } from "./_core/byokVideoEngine";
import type { VideoProvider } from "./_core/byokVideoEngine";
import { startComplianceEvidenceWorker } from "./compliance-evidence-worker";
import { assertComplianceArchiveConfiguration } from "./_core/complianceEvidenceGuards";
import { screenContentForReview } from "./_core/complianceEvidence";
import { getMatureAccessStatus } from "./_core/matureAccess";
import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";

const POLL_INTERVAL_MS = 30_000;

const KEY_FIELD_MAP: Record<string, string> = {
  runway: "runwayKey",
  openai: "openaiKey",
  replicate: "replicateKey",
  fal: "falKey",
  luma: "lumaKey",
  huggingface: "hfToken",
  seedance: "byteplusKey",
  veo3: "googleAiKey",
};

function safeJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  try { return JSON.parse(String(value)); } catch { return {}; }
}

async function resolveByokKey(userId: number, provider: string): Promise<string | null> {
  const keys: any = await db.getUserApiKeys(userId);
  if (!keys) return null;
  const field = KEY_FIELD_MAP[provider];
  if (!field) return null;
  const encrypted: string | undefined = keys[field];
  if (!encrypted) return null;
  try { return decryptApiKey(encrypted); } catch { return null; }
}

async function loadProcessingUser(dbConn: any, userId: number): Promise<any> {
  const rows: any = await dbConn.execute(sql`
    SELECT id, role, subscriptionTier, subscriptionStatus, isAdultVerified,
           isFrozen, frozenReason
    FROM users WHERE id=${userId} LIMIT 1
  `);
  return (Array.isArray(rows?.[0]) ? rows[0] : rows)?.[0] || null;
}

async function revalidateJob(dbConn: any, job: any): Promise<void> {
  assertComplianceArchiveConfiguration();
  const user = await loadProcessingUser(dbConn, Number(job.userId));
  if (!user) throw new Error("Render account no longer exists.");
  if (user.isFrozen) {
    throw new Error(user.frozenReason || "This account has been deactivated.");
  }

  const metadata = safeJson(job.metadata);
  const contentMode = job.contentMode === "open_adult"
    ? "open_adult"
    : "standard";
  const workspace = contentMode === "open_adult" ? "adult" : "standard";
  const matureStatus = contentMode === "open_adult"
    ? await getMatureAccessStatus(dbConn, user)
    : null;

  await screenContentForReview({
    userId: Number(job.userId),
    workspace,
    sourceType: "studio_render_worker",
    sourceId: Number(job.id),
    text: [job.targetPresentation, job.directorNotes]
      .filter(Boolean)
      .join("\n"),
    targetAge: job.targetAge == null ? null : Number(job.targetAge),
    allSubjectsAdultsConfirmed: Boolean(job.allSubjectsAdultsConfirmed),
    consentConfirmed: Boolean(job.consentConfirmed),
    aiGeneratedCharactersOnly: Boolean(
      job.aiGeneratedCharactersOnly || metadata.aiGeneratedCharactersOnly,
    ),
    publicFigureLikeness: Boolean(
      job.publicFigureLikeness || metadata.publicFigureLikeness,
    ),
  });

  assertSwappysCreativePolicy({
    user: {
      ...user,
      isAdultVerified: matureStatus?.accessGranted
        ?? Boolean(user.isAdultVerified),
    },
    contentMode,
    consentConfirmed: Boolean(job.consentConfirmed),
    allSubjectsAdultsConfirmed: Boolean(job.allSubjectsAdultsConfirmed),
    transformGoal: job.transformGoal,
    targetAge: job.targetAge == null ? null : Number(job.targetAge),
    targetPresentation: job.targetPresentation,
    directorNotes: job.directorNotes,
    broadcast: false,
  });
}

async function processStudioRenderJob(dbConn: any, job: any): Promise<void> {
  const jobId = Number(job.id);
  logger.info(`[StudioRenderWorker] Processing job ${jobId} — provider: ${job.provider}`);

  try {
    await revalidateJob(dbConn, job);

    const apiKey = await resolveByokKey(Number(job.userId), String(job.provider));
    if (!apiKey) {
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed',
            errorMessage='BYOK_REQUIRED: No valid API key found for provider. Add your own key in Settings → AI Keys.',
            updatedAt=NOW()
        WHERE id=${jobId}
      `);
      logger.warn(`[StudioRenderWorker] Job ${jobId}: BYOK_REQUIRED — no key for ${job.provider}`);
      return;
    }

    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='processing', updatedAt=NOW() WHERE id=${jobId}
    `);

    const parts: string[] = [];
    if (job.transformGoal) parts.push(`Transform goal: ${job.transformGoal}`);
    if (job.targetAge) parts.push(`Target age: ${job.targetAge}`);
    if (job.targetPresentation) parts.push(`Presentation: ${job.targetPresentation}`);
    if (job.directorNotes) parts.push(job.directorNotes);
    const prompt = parts.join(". ") || "Virelle Studio Render — AI video transform";

    const sourceImageUrls: string[] = job.sourceImageUrls
      ? (typeof job.sourceImageUrls === "string"
          ? JSON.parse(job.sourceImageUrls)
          : job.sourceImageUrls)
      : [];

    const request = {
      prompt,
      imageUrl: sourceImageUrls[0],
      duration: 5,
      aspectRatio: "16:9",
    };

    const result = await generateVideoStrict(
      job.provider as VideoProvider,
      apiKey,
      request,
    );

    if (!result?.videoUrl) throw new Error("Provider returned no video URL");

    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='completed', outputVideoUrl=${result.videoUrl}, updatedAt=NOW()
      WHERE id=${jobId}
    `);
    logger.info(`[StudioRenderWorker] Job ${jobId} completed: ${result.videoUrl}`);
  } catch (error: any) {
    const message = String(error?.message ?? error).slice(0, 1000);
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='failed', errorMessage=${message}, updatedAt=NOW()
      WHERE id=${jobId}
    `).catch(() => undefined);
    logger.error(`[StudioRenderWorker] Job ${jobId} failed: ${message}`);
  }
}

async function runStudioRenderCycle(): Promise<void> {
  const dbConn = await db.getDb();
  if (!dbConn) return;
  try {
    const rows: any = await dbConn.execute(sql`
      SELECT * FROM virelle_video_transform_jobs
      WHERE mode='studio_render' AND status='queued'
      ORDER BY createdAt ASC LIMIT 5
    `);
    const jobs: any[] = Array.isArray(rows[0]) ? rows[0] : (rows ?? []);
    if (!jobs.length) return;
    logger.info(`[StudioRenderWorker] ${jobs.length} queued studio render job(s)`);
    for (const job of jobs) await processStudioRenderJob(dbConn, job);
  } catch (error: any) {
    logger.error(`[StudioRenderWorker] Cycle error: ${error?.message}`);
  }
}

export function startStudioRenderWorker(): void {
  // The archive is site-wide and must run even when BYOK studio rendering is disabled.
  startComplianceEvidenceWorker();

  if (!process.env.VIRELLE_BYOK_RENDER_WORKER) {
    logger.info(
      "Studio render worker disabled (VIRELLE_BYOK_RENDER_WORKER not set). Set VIRELLE_BYOK_RENDER_WORKER=true to enable.",
    );
    return;
  }
  logger.info("[StudioRenderWorker] Starting — BYOK-only, no platform fallback, polls every 30s");
  setTimeout(() => runStudioRenderCycle().catch(console.error), 5_000);
  const timer = setInterval(
    () => runStudioRenderCycle().catch(console.error),
    POLL_INTERVAL_MS,
  );
  timer.unref?.();
}
