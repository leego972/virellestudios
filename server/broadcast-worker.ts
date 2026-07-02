/**
   * Broadcast Worker — BYOK-only broadcast session bridge
   *
   * Polls virelle_video_transform_jobs where mode='broadcast' and status='broadcast_ready'.
   * Manages RTMP / WebRTC / OBS / custom broadcast session lifecycle.
   * SAFETY RULE: NEVER uses platform video provider keys.
   * Stream keys are used TRANSIENTLY only — never re-stored or logged.
   */
  import * as db from "../db";
  import { sql } from "drizzle-orm";
  import { logger } from "./logger";
  import { decryptApiKey } from "./securityEngine";

  const POLL_INTERVAL_MS = 20_000;

  /** In-memory session registry — cleared on process restart (safe; DB is source of truth) */
  const activeSessions = new Map<number, { startedAt: Date; destination: string; provider: string }>();

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

  async function initiateBroadcastSession(dbConn: any, job: any): Promise<void> {
    const jobId: number = job.id;
    if (activeSessions.has(jobId)) return;

    logger.info(`[BroadcastWorker] Initiating session ${jobId} (dest: ${job.broadcastDestination}, provider: ${job.provider})`);

    try {
      const apiKey = await resolveByokKey(job.userId, job.provider);
      if (!apiKey) {
        await dbConn.execute(sql`
          UPDATE virelle_video_transform_jobs
          SET status='failed',
              errorMessage='BYOK_REQUIRED: No valid API key for provider. Add your own key in Settings → AI Keys.',
              updatedAt=NOW()
          WHERE id=${jobId}
        `);
        logger.warn(`[BroadcastWorker] Session ${jobId}: BYOK_REQUIRED`);
        return;
      }

      const dest: string = job.broadcastDestination ?? "rtmp";
      await dbConn.execute(sql`UPDATE virelle_video_transform_jobs SET status='processing', updatedAt=NOW() WHERE id=${jobId}`);
      activeSessions.set(jobId, { startedAt: new Date(), destination: dest, provider: job.provider });

      /**
       * Broadcast session notes:
       * - RTMP: client sends feed to ingestUrl using stream key (key used transiently, never re-stored)
       * - WebRTC: client-side WebRTC; worker tracks readiness
       * - OBS: bridge instructions delivered to client
       * - custom: handled by client via user's own BYOK key
       * Status: broadcast_ready → processing → completed | failed | cancelled
       */
      logger.info(`[BroadcastWorker] Session ${jobId} activated — ${dest} bridge ready`);
    } catch (err: any) {
      const msg = String(err?.message ?? err).slice(0, 500);
      await dbConn.execute(sql`UPDATE virelle_video_transform_jobs SET status='failed', errorMessage=${msg}, updatedAt=NOW() WHERE id=${jobId}`).catch(() => {});
      activeSessions.delete(jobId);
      logger.error(`[BroadcastWorker] Session ${jobId} failed: ${msg}`);
    }
  }

  async function cleanupFinishedSessions(dbConn: any): Promise<void> {
    for (const [jobId] of activeSessions) {
      try {
        const rows: any = await dbConn.execute(sql`SELECT status FROM virelle_video_transform_jobs WHERE id=${jobId} LIMIT 1`);
        const data: any[] = Array.isArray(rows[0]) ? rows[0] : (rows ?? []);
        const status: string | undefined = data?.[0]?.status;
        if (status === "cancelled" || status === "completed" || status === "failed") {
          activeSessions.delete(jobId);
          logger.info(`[BroadcastWorker] Session ${jobId} removed (status: ${status})`);
        }
      } catch { activeSessions.delete(jobId); }
    }
  }

  async function runBroadcastCycle(): Promise<void> {
    const dbConn = await db.getDb();
    if (!dbConn) return;
    try {
      await cleanupFinishedSessions(dbConn);
      const rows: any = await dbConn.execute(sql`
        SELECT * FROM virelle_video_transform_jobs
        WHERE mode='broadcast' AND status='broadcast_ready'
        ORDER BY createdAt ASC LIMIT 10
      `);
      const sessions: any[] = Array.isArray(rows[0]) ? rows[0] : (rows ?? []);
      if (!sessions.length) return;
      logger.info(`[BroadcastWorker] ${sessions.length} broadcast session(s) ready to activate`);
      for (const session of sessions) await initiateBroadcastSession(dbConn, session);
    } catch (err: any) {
      logger.error(`[BroadcastWorker] Cycle error: ${err?.message}`);
    }
  }

  export function startBroadcastWorker(): void {
    logger.info("[BroadcastWorker] Starting BYOK Broadcast Worker (polls every 20s)");
    setTimeout(() => runBroadcastCycle().catch(console.error), 8_000);
    setInterval(() => runBroadcastCycle().catch(console.error), POLL_INTERVAL_MS);
  }
  