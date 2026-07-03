/**
   * Studio Render Worker — BYOK-only video transform job processor.
   *
   * Polls `virelle_video_transform_jobs` WHERE mode='studio_render' AND status='queued'.
   *
   * STRICT BYOK POLICY:
   * - NEVER uses platform video provider keys (Runway, OpenAI, Replicate, fal, Luma, etc.).
   * - NEVER falls back to Pollinations for premium Studio Render jobs.
   * - If the user has no BYOK key for the selected provider → fail immediately with BYOK_REQUIRED.
   * - Only the user's own API key is used; all costs are borne by the user's provider account.
   *
   * Provider adapters: runway · openai · replicate · fal · luma · huggingface · seedance · veo3
   */
  import * as db from "./db";
  import { sql } from "drizzle-orm";
  import { logger } from "./_core/logger";
  import { decryptApiKey } from "./_core/securityEngine";
  import { generateVideoStrict } from "./_core/byokVideoEngine";
  import type { VideoProvider, VideoGenerationRequest } from "./_core/byokVideoEngine";

  const POLL_INTERVAL_MS = 30_000;

  const KEY_FIELD_MAP: Record<string, string> = {
    runway:      "runwayKey",
    openai:      "openaiKey",
    replicate:   "replicateKey",
    fal:         "falKey",
    luma:        "lumaKey",
    huggingface: "hfToken",
    seedance:    "byteplusKey",
    veo3:        "googleAiKey",
  };

  async function resolveByokKey(userId: number, provider: string): Promise<string | null> {
    const keys: any = await db.getUserApiKeys(userId);
    if (!keys) return null;
    const field = KEY_FIELD_MAP[provider];
    if (!field) return null;
    const encrypted: string | undefined = keys[field];
    if (!encrypted) return null;
    try { return decryptApiKey(encrypted); } catch { return null; }
  }

  async function processStudioRenderJob(dbConn: any, job: any): Promise<void> {
    const jobId: number = job.id;
    logger.info(`[StudioRenderWorker] Processing job ${jobId} — provider: ${job.provider}`);

    try {
      // ── BYOK enforcement: resolve user's own key only ─────────────────────────
      const apiKey = await resolveByokKey(job.userId, job.provider);
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

      // ── Mark processing ───────────────────────────────────────────────────────
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs SET status='processing', updatedAt=NOW() WHERE id=${jobId}
      `);

      // ── Build prompt from job metadata ────────────────────────────────────────
      const parts: string[] = [];
      if (job.transformGoal)    parts.push(`Transform goal: ${job.transformGoal}`);
      if (job.targetAge)        parts.push(`Target age: ${job.targetAge}`);
      if (job.targetPresentation) parts.push(`Presentation: ${job.targetPresentation}`);
      if (job.directorNotes)    parts.push(job.directorNotes);
      const prompt = parts.join(". ") || "Virelle Studio Render — AI video transform";

      const sourceImageUrls: string[] = job.sourceImageUrls
        ? (typeof job.sourceImageUrls === "string" ? JSON.parse(job.sourceImageUrls) : job.sourceImageUrls)
        : [];

      const req: VideoGenerationRequest = {
        prompt,
        provider: job.provider as VideoProvider,
        imageUrl:  sourceImageUrls[0],
        duration:  5,
        ratio:     "16:9",
      };

      // ── Strict BYOK dispatch — NO cascade, NO Pollinations fallback ───────────
      const result = await generateVideoStrict(job.provider as VideoProvider, apiKey, req);

      if (result?.videoUrl) {
        await dbConn.execute(sql`
          UPDATE virelle_video_transform_jobs
          SET status='completed', outputVideoUrl=${result.videoUrl}, updatedAt=NOW()
          WHERE id=${jobId}
        `);
        logger.info(`[StudioRenderWorker] Job ${jobId} completed: ${result.videoUrl}`);
      } else {
        throw new Error("Provider returned no video URL");
      }
    } catch (err: any) {
      const msg = String(err?.message ?? err).slice(0, 500);
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed', errorMessage=${msg}, updatedAt=NOW()
        WHERE id=${jobId}
      `).catch(() => {});
      logger.error(`[StudioRenderWorker] Job ${jobId} failed: ${msg}`);
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
    } catch (err: any) {
      logger.error(`[StudioRenderWorker] Cycle error: ${err?.message}`);
    }
  }

  export function startStudioRenderWorker(): void {
    logger.info("[StudioRenderWorker] Starting — BYOK-only, no platform fallback, polls every 30s");
    setTimeout(() => runStudioRenderCycle().catch(console.error), 5_000);
    setInterval(() => runStudioRenderCycle().catch(console.error), POLL_INTERVAL_MS);
  }
  