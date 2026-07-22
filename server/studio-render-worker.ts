/**
 * Studio Render Worker — strict BYOK processor.
 *
 * The worker re-validates adult access and content policy immediately before
 * provider submission. This closes the gap between queue time and execution
 * time if a verification is revoked or an account is deactivated.
 */
import * as db from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { decryptApiKey } from "./_core/securityEngine";
import { generateVideoStrict } from "./_core/byokVideoEngine";
import type { VideoProvider } from "./_core/byokVideoEngine";
import { getMatureAccessStatus } from "./_core/matureAccess";
import { screenContentRequest } from "./_core/contentCompliance";
import {
  assertSwappysCreativePolicy,
  swappysCreativePromptDirective,
} from "./_core/swappysPolicy";
import { startComplianceArchiveWorker } from "./compliance-archive-worker";

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

async function resolveByokKey(
  userId: number,
  provider: string,
): Promise<string | null> {
  const keys: any = await db.getUserApiKeys(userId);
  if (!keys) return null;
  const field = KEY_FIELD_MAP[provider];
  if (!field) return null;
  const encrypted: string | undefined = keys[field];
  if (!encrypted) return null;
  try { return decryptApiKey(encrypted); } catch { return null; }
}

async function loadWorkerUser(dbConn: any, userId: number): Promise<any> {
  const result: any = await dbConn.execute(sql`
    SELECT id, role, subscriptionTier, subscriptionStatus,
           isAdultVerified, isFrozen, frozenReason
    FROM users WHERE id=${userId} LIMIT 1
  `);
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return rows?.[0] || null;
}

async function processStudioRenderJob(dbConn: any, job: any): Promise<void> {
  const jobId = Number(job.id);
  const userId = Number(job.userId);
  logger.info(
    `[StudioRenderWorker] Processing job ${jobId} — provider: ${job.provider}`,
  );

  try {
    const metadata = safeJson(job.metadata);
    const workspace = job.contentMode === "open_adult" ? "adult" : "standard";
    const workerUser = await loadWorkerUser(dbConn, userId);
    if (!workerUser) throw new Error("Account no longer exists.");
    if (workerUser.isFrozen) {
      throw new Error(workerUser.frozenReason || "Account is deactivated.");
    }

    if (workspace === "adult") {
      const matureStatus = await getMatureAccessStatus(dbConn, workerUser);
      if (!matureStatus.accessGranted) {
        throw new Error(
          `MATURE_ACCESS_REQUIRED: ${matureStatus.missing.join(", ") || "verification was revoked"}`,
        );
      }
    }

    const policyText = [job.targetPresentation, job.directorNotes]
      .filter(Boolean)
      .join("\n");
    await screenContentRequest({
      userId,
      workspace,
      sourceType: "studio_render_worker",
      sourceId: jobId,
      text: policyText,
      targetAge: job.targetAge == null ? null : Number(job.targetAge),
      publicFigureLikeness: Boolean(job.publicFigureLikeness),
    });
    assertSwappysCreativePolicy({
      user: workerUser,
      contentMode: workspace === "adult" ? "open_adult" : "standard",
      consentConfirmed: Boolean(job.consentConfirmed),
      allSubjectsAdultsConfirmed: Boolean(job.allSubjectsAdultsConfirmed),
      transformGoal: job.transformGoal,
      targetAge: job.targetAge == null ? null : Number(job.targetAge),
      targetPresentation: job.targetPresentation,
      directorNotes: job.directorNotes,
      publicFigureLikeness: Boolean(job.publicFigureLikeness),
      aiGeneratedCharactersOnly: Boolean(job.aiGeneratedCharactersOnly),
    });

    const apiKey = await resolveByokKey(userId, String(job.provider));
    if (!apiKey) {
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed',
            errorMessage='BYOK_REQUIRED: No valid API key found for provider. Add your own key in Settings → AI Keys.',
            updatedAt=NOW()
        WHERE id=${jobId}
      `);
      logger.warn(
        `[StudioRenderWorker] Job ${jobId}: BYOK_REQUIRED — no key for ${job.provider}`,
      );
      return;
    }

    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='processing', updatedAt=NOW() WHERE id=${jobId}
    `);

    const parts: string[] = [
      swappysCreativePromptDirective(
        workspace === "adult" ? "open_adult" : "standard",
      ),
    ];
    if (job.transformGoal) parts.push(`Transform goal: ${job.transformGoal}`);
    if (job.targetAge) parts.push(`Target age: ${job.targetAge}`);
    if (job.targetPresentation) {
      parts.push(`Presentation: ${job.targetPresentation}`);
    }
    if (job.directorNotes) parts.push(String(job.directorNotes));
    if (metadata?.directorPrompt) parts.push(String(metadata.directorPrompt));
    const prompt = parts.join(". ");

    const sourceImageUrls: string[] = job.sourceImageUrls
      ? (typeof job.sourceImageUrls === "string"
          ? JSON.parse(job.sourceImageUrls)
          : job.sourceImageUrls)
      : [];

    const result = await generateVideoStrict(
      job.provider as VideoProvider,
      apiKey,
      {
        prompt,
        imageUrl: sourceImageUrls[0],
        duration: 5,
        aspectRatio: "16:9",
      },
    );

    if (!result?.videoUrl) throw new Error("Provider returned no video URL");

    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='completed', outputVideoUrl=${result.videoUrl}, updatedAt=NOW()
      WHERE id=${jobId}
    `);
    logger.info(
      `[StudioRenderWorker] Job ${jobId} completed and queued for private retention archive.`,
    );
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
    logger.info(
      `[StudioRenderWorker] ${jobs.length} queued studio render job(s)`,
    );
    for (const job of jobs) await processStudioRenderJob(dbConn, job);
  } catch (error: any) {
    logger.error(`[StudioRenderWorker] Cycle error: ${error?.message}`);
  }
}

export function startStudioRenderWorker(): void {
  // Archive retention is site-wide and starts even when BYOK rendering is off.
  startComplianceArchiveWorker();

  if (!process.env.VIRELLE_BYOK_RENDER_WORKER) {
    logger.info(
      "Studio render worker disabled (VIRELLE_BYOK_RENDER_WORKER not set).",
    );
    return;
  }
  logger.info(
    "[StudioRenderWorker] Starting — BYOK-only, policy revalidation, no platform fallback",
  );
  setTimeout(() => runStudioRenderCycle().catch(console.error), 5_000);
  const timer = setInterval(
    () => runStudioRenderCycle().catch(console.error),
    POLL_INTERVAL_MS,
  );
  timer.unref?.();
}
