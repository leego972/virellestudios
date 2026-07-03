/**
   * Broadcast Worker — BYOK-only broadcast session bridge.
   *
   * Polls `virelle_video_transform_jobs` WHERE mode='broadcast' AND status='broadcast_ready'.
   *
   * STRICT BYOK POLICY:
   * - NEVER uses platform video provider keys.
   * - NEVER falls back to Pollinations.
   * - Stream keys are used TRANSIENTLY only — never re-stored or logged.
   * - All compute costs are borne by the user's own provider account.
   *
   * Destinations: rtmp · webrtc · obs · custom
   */
  import * as db from "./db";
  import { sql } from "drizzle-orm";
  import { logger } from "./_core/logger";
  import { decryptApiKey } from "./_core/securityEngine";

  const POLL_INTERVAL_MS = 20_000;

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

  /** In-memory session registry — cleared on restart; DB is source of truth */
  const activeSessions = new Map<number, { startedAt: Date; destination: string; provider: string }>();

  async function resolveByokKey(userId: number, provider: string): Promise<string | null> {
    const keys: any = await db.getUserApiKeys(userId);
    if (!keys) return null;
    const field = KEY_FIELD_MAP[provider];
    if (!field) return null;
    const encrypted: string | undefined = keys[field];
    if (!encrypted) return null;
    try { return decryptApiKey(encrypted); } catch { return null; }
  }

  async function initiateBroadcastSession(dbConn: any, job: any): Promise<void> {
    const jobId: number = job.id;
    if (activeSessions.has(jobId)) return;

    logger.info(`[BroadcastWorker] Initiating session ${jobId} — dest: ${job.broadcastDestination}, provider: ${job.provider}`);

    try {
      // ── BYOK enforcement ──────────────────────────────────────────────────────
      const apiKey = await resolveByokKey(job.userId, job.provider);
      if (!apiKey) {
        await dbConn.execute(sql`
          UPDATE virelle_video_transform_jobs
          SET status='failed',
              errorMessage='BYOK_REQUIRED: No valid API key for provider. Add your own key in Settings → AI Keys.',
              updatedAt=NOW()
          WHERE id=${jobId}
        `);
        logger.warn(`[BroadcastWorker] Session ${jobId}: BYOK_REQUIRED — no key for ${job.provider}`);
        return;
      }

      const dest: string = job.broadcastDestination ?? "rtmp";
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs SET status='processing', updatedAt=NOW() WHERE id=${jobId}
      `);
      activeSessions.set(jobId, { startedAt: new Date(), destination: dest, provider: job.provider });

      /**
       * Broadcast session lifecycle:
       * - RTMP: client feeds to ingestUrl using stream key (transient only, never re-stored)
       * - WebRTC: client-side peer connection; worker tracks session readiness
       * - OBS: bridge instructions delivered to client; virtual camera not claimed until real bridge exists
       * - custom: client handles via user's own BYOK key + provider broadcast API
       *
       * The API key is resolved above and used transiently. It is NOT stored here.
       * Status transitions: broadcast_ready → processing → completed | failed | cancelled
       */
      logger.info(`[BroadcastWorker] Session ${jobId} activated — ${dest} bridge ready (provider: ${job.provider})`);
    } catch (err: any) {
      const msg = String(err?.message ?? err).slice(0, 500);
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed', errorMessage=${msg}, updatedAt=NOW()
        WHERE id=${jobId}
      `).catch(() => {});
      activeSessions.delete(jobId);
      logger.error(`[BroadcastWorker] Session ${jobId} failed: ${msg}`);
    }
  }

  async function cleanupFinishedSessions(dbConn: any): Promise<void> {
    for (const [jobId] of activeSessions) {
      try {
        const rows: any = await dbConn.execute(sql`
          SELECT status FROM virelle_video_transform_jobs WHERE id=${jobId} LIMIT 1
        `);
        const data: any[] = Array.isArray(rows[0]) ? rows[0] : (rows ?? []);
        const status: string | undefined = data?.[0]?.status;
        if (status === "cancelled" || status === "completed" || status === "failed") {
          activeSessions.delete(jobId);
          logger.info(`[BroadcastWorker] Session ${jobId} removed from registry (status: ${status})`);
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
      logger.info(`[BroadcastWorker] ${sessions.length} broadcast session(s) ready`);
      for (const session of sessions) await initiateBroadcastSession(dbConn, session);
    } catch (err: any) {
      logger.error(`[BroadcastWorker] Cycle error: ${err?.message}`);
    }
  }

  export function startBroadcastWorker(): void {
    logger.info("[BroadcastWorker] Starting — BYOK-only, no platform fallback, polls every 20s");
    setTimeout(() => runBroadcastCycle().catch(console.error), 8_000);
    setInterval(() => runBroadcastCycle().catch(console.error), POLL_INTERVAL_MS);
  }
  