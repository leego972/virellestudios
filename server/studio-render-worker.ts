/**
   * Studio Render Worker — BYOK-only video transform job processor
   *
   * Polls virelle_video_transform_jobs where mode='studio_render' and status='queued'.
   * SAFETY RULE: NEVER uses platform video provider keys. All generation is funded
   * by the user's own BYOK key. If no key exists → fail with BYOK_REQUIRED.
   */
  import * as db from "../db";
  import { sql } from "drizzle-orm";
  import { logger } from "./logger";
  import { decryptApiKey } from "./securityEngine";
  import { generateVideo as generateBYOKVideo } from "./byokVideoEngine";
  import type { VideoProvider, UserApiKeys } from "./byokVideoEngine";

  const POLL_INTERVAL_MS = 30_000;

  async function resolveByokKey(userId: number, provider: string): Promise<string | null> {
    const keys = await db.getUserApiKeys(userId);
    if (!keys) return null;
    const keyMap: Record<string, string | undefined> = {
      runway: (keys as any).runwayKey,
      openai: (keys as any).openaiKey,
      replicate: (keys as any).replicateKey,
      fal: (keys as any).falKey,
      luma: (keys as any).lumaKey,
      huggingface: (keys as any).huggingfaceKey,
      seedance: (keys as any).seedanceKey,
      veo3: (keys as any).veoKey ?? (keys as any).googleKey,
    };
    const encrypted = keyMap[provider];
    if (!encrypted) return null;
    try { return decryptApiKey(encrypted); } catch { return null; }
  }

  function buildUserApiKeys(provider: string, apiKey: string): Partial<UserApiKeys> {
    const providerToField: Record<string, keyof UserApiKeys> = {
      runway: "runwayKey",
      openai: "openaiKey",
      replicate: "replicateKey",
      fal: "falKey",
      luma: "lumaKey",
      huggingface: "huggingfaceKey",
      seedance: "seedanceKey",
      veo3: "veoKey",
    };
    const field = providerToField[provider] ?? "runwayKey";
    return { [field]: apiKey };
  }

  async function processStudioRenderJob(dbConn: any, job: any): Promise<void> {
    const jobId: number = job.id;
    logger.info(`[StudioRenderWorker] Processing job ${jobId} (provider: ${job.provider})`);

    try {
      const apiKey = await resolveByokKey(job.userId, job.provider);
      if (!apiKey) {
        await dbConn.execute(sql`
          UPDATE virelle_video_transform_jobs
          SET status='failed',
              errorMessage='BYOK_REQUIRED: No valid API key found for provider. Add your own provider key in Settings → AI Keys.',
              updatedAt=NOW()
          WHERE id=${jobId}
        `);
        logger.warn(`[StudioRenderWorker] Job ${jobId}: BYOK_REQUIRED — no key for provider ${job.provider}`);
        return;
      }

      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs SET status='processing', updatedAt=NOW() WHERE id=${jobId}
      `);

      const promptParts: string[] = [];
      if (job.transformGoal) promptParts.push(`Transform goal: ${job.transformGoal}`);
      if (job.targetAge) promptParts.push(`Target age: ${job.targetAge}`);
      if (job.targetPresentation) promptParts.push(`Presentation style: ${job.targetPresentation}`);
      if (job.directorNotes) promptParts.push(job.directorNotes);
      const prompt = promptParts.join(". ") || "Virelle Studio Render — AI video transform";

      const sourceImageUrls: string[] = job.sourceImageUrls
        ? (typeof job.sourceImageUrls === "string" ? JSON.parse(job.sourceImageUrls) : job.sourceImageUrls)
        : [];

      const userKeys = buildUserApiKeys(job.provider, apiKey) as UserApiKeys;
      const result = await generateBYOKVideo(
        {
          prompt,
          provider: job.provider as VideoProvider,
          imageUrl: sourceImageUrls[0],
          duration: 5,
          ratio: "16:9",
        },
        userKeys
      );

      if (result?.videoUrl) {
        await dbConn.execute(sql`
          UPDATE virelle_video_transform_jobs
          SET status='completed', outputVideoUrl=${result.videoUrl}, updatedAt=NOW()
          WHERE id=${jobId}
        `);
        logger.info(`[StudioRenderWorker] Job ${jobId} completed — ${result.videoUrl}`);
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
      logger.info(`[StudioRenderWorker] ${jobs.length} queued studio render job(s) found`);
      for (const job of jobs) {
        await processStudioRenderJob(dbConn, job);
      }
    } catch (err: any) {
      logger.error(`[StudioRenderWorker] Cycle error: ${err?.message}`);
    }
  }

  export function startStudioRenderWorker(): void {
    logger.info("[StudioRenderWorker] Starting BYOK Studio Render Worker (polls every 30s)");
    // Initial run after 5s (let DB + migrations finish first)
    setTimeout(() => runStudioRenderCycle().catch(console.error), 5_000);
    setInterval(() => runStudioRenderCycle().catch(console.error), POLL_INTERVAL_MS);
  }
  