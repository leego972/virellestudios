import * as db from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { decryptApiKey } from "./_core/securityEngine";
import { assertComplianceArchiveConfiguration } from "./_core/complianceEvidenceGuards";

const POLL_INTERVAL_MS = 20_000;
const BRIDGE_RETRY_MINUTES = 5;

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

const ALLOWED_DESTINATIONS = new Set([
  "rtmp",
  "rtmp_onlyfans",
  "rtmp_fansly",
  "rtmp_chaturbate",
  "webrtc",
  "obs",
  "custom",
]);

type BridgeChannel = {
  destination: string;
  ingestUrl: string | null;
  streamKey: string | null;
};

type BridgeResponse = {
  sessionId?: string;
  status?: string;
  outputUrl?: string;
  recordingUrl?: string;
  previewUrl?: string;
};

const activeSessions = new Map<
  number,
  { startedAt: Date; channels: number; provider: string }
>();

function bridgeConfig(): { url: string; token: string } | null {
  const rawUrl = process.env.BROADCAST_BRIDGE_URL;
  const token = process.env.BROADCAST_BRIDGE_TOKEN;
  if (!rawUrl || !token || token.length < 24) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return { url: parsed.toString(), token };
  } catch {
    return null;
  }
}

async function resolveByokKey(userId: number, provider: string): Promise<string | null> {
  const keys: any = await db.getUserApiKeys(userId);
  const field = KEY_FIELD_MAP[provider];
  if (!keys || !field || !keys[field]) return null;
  try {
    const decrypted = decryptApiKey(keys[field]);
    return decrypted || null;
  } catch {
    return null;
  }
}

function decryptChannels(ciphertext: string | null | undefined): BridgeChannel[] {
  if (!ciphertext) throw new Error("Broadcast output credentials are missing.");
  const plaintext = decryptApiKey(ciphertext);
  if (!plaintext) throw new Error("Broadcast output credentials could not be decrypted.");
  let parsed: unknown;
  try { parsed = JSON.parse(plaintext); } catch {
    throw new Error("Broadcast output credentials are corrupt.");
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 5) {
    throw new Error("Broadcast output channel configuration is invalid.");
  }
  return parsed.map((value: any) => {
    if (!value || !ALLOWED_DESTINATIONS.has(String(value.destination))) {
      throw new Error("Broadcast output destination is invalid.");
    }
    return {
      destination: String(value.destination),
      ingestUrl: typeof value.ingestUrl === "string" ? value.ingestUrl : null,
      streamKey: typeof value.streamKey === "string" ? value.streamKey : null,
    };
  });
}

function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

async function markWaitingForBridge(dbConn: any, jobId: number) {
  await dbConn.execute(sql`
    UPDATE virelle_video_transform_jobs
    SET status='waiting_for_provider', errorMessage=NULL, updatedAt=NOW()
    WHERE id=${jobId}
  `);
}

async function submitBridgeSession(
  job: any,
  providerKey: string,
  channels: BridgeChannel[],
): Promise<BridgeResponse> {
  const config = bridgeConfig();
  if (!config) throw new Error("BROADCAST_BRIDGE_NOT_CONFIGURED");

  const payload = {
    jobId: Number(job.id),
    userId: Number(job.userId),
    provider: String(job.provider),
    providerKey,
    sourceSwappysJobId: job.sourceSwappysJobId
      ? Number(job.sourceSwappysJobId)
      : null,
    projectId: job.projectId ? Number(job.projectId) : null,
    sceneId: job.sceneId ? Number(job.sceneId) : null,
    sourceVideoUrl: job.sourceVideoUrl || null,
    referenceVideoUrl: job.referenceVideoUrl || null,
    sourceImageUrls: parseJsonArray(job.sourceImageUrls),
    referenceImageUrls: parseJsonArray(job.referenceImageUrls),
    transformGoal: job.transformGoal,
    targetAge: job.targetAge ?? null,
    targetPresentation: job.targetPresentation ?? null,
    contentMode: job.contentMode || "standard",
    directorNotes: job.directorNotes || null,
    visibleWatermarkMode: job.visibleWatermarkMode,
    outputs: channels,
    recording: {
      required: true,
      userDownloadRequired: true,
      complianceArchiveRequired: true,
      format: "mp4",
      retentionDays: Math.max(
        90,
        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),
      ),
      sessionStartedAt: job.createdAt || new Date().toISOString(),
    },
  };

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Virelle-Bridge-Version": "2",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(
      `Broadcast bridge returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
  const result = await response.json() as BridgeResponse;
  if (!result.sessionId) throw new Error("Broadcast bridge returned no session ID.");
  if (!result.recordingUrl && !result.outputUrl) {
    throw new Error(
      "BROADCAST_RECORDING_URL_REQUIRED: The bridge must return recordingUrl or outputUrl before Virelle will start the broadcast.",
    );
  }
  return result;
}

async function initiateBroadcastSession(dbConn: any, job: any): Promise<void> {
  const jobId = Number(job.id);
  if (activeSessions.has(jobId)) return;

  try {
    assertComplianceArchiveConfiguration();

    const providerKey = await resolveByokKey(Number(job.userId), String(job.provider));
    if (!providerKey) {
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed',
            errorMessage='BYOK_REQUIRED: No valid API key for the selected provider.',
            updatedAt=NOW()
        WHERE id=${jobId}
      `);
      logger.warn(`[BroadcastWorker] Session ${jobId}: missing BYOK key for ${job.provider}`);
      return;
    }

    const channels = decryptChannels(job.broadcastChannelsEncrypted);
    if (!bridgeConfig()) {
      await markWaitingForBridge(dbConn, jobId);
      logger.warn(
        `[BroadcastWorker] Session ${jobId}: bridge configuration missing; output credentials remain encrypted at rest.`,
      );
      return;
    }

    activeSessions.set(jobId, {
      startedAt: new Date(),
      channels: channels.length,
      provider: String(job.provider),
    });
    const bridge = await submitBridgeSession(job, providerKey, channels);
    const recordingUrl = bridge.recordingUrl || bridge.outputUrl!;
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='processing', providerJobId=${bridge.sessionId},
          outputVideoUrl=${recordingUrl},
          previewImageUrl=${bridge.previewUrl || null},
          recordingRequired=1, broadcastStartedAt=COALESCE(broadcastStartedAt, NOW()),
          errorMessage=NULL, updatedAt=NOW()
      WHERE id=${jobId}
    `);
    logger.info(
      `[BroadcastWorker] Session ${jobId} submitted; outputs=${channels.length}, recording URL secured`,
    );
  } catch (error: any) {
    const message = String(error?.message ?? error).slice(0, 500);
    if (message === "BROADCAST_BRIDGE_NOT_CONFIGURED") {
      await markWaitingForBridge(dbConn, jobId);
    } else {
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed', errorMessage=${message}, updatedAt=NOW()
        WHERE id=${jobId}
      `).catch(() => undefined);
      logger.error(`[BroadcastWorker] Session ${jobId} failed: ${message}`);
    }
    activeSessions.delete(jobId);
  }
}

async function cleanupFinishedSessions(dbConn: any): Promise<void> {
  for (const [jobId] of activeSessions) {
    try {
      const rows: any = await dbConn.execute(sql`
        SELECT status FROM virelle_video_transform_jobs WHERE id=${jobId} LIMIT 1
      `);
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      const status = data?.[0]?.status;
      if (["cancelled", "completed", "failed"].includes(status)) {
        activeSessions.delete(jobId);
        logger.info(`[BroadcastWorker] Session ${jobId} removed from active registry (${status})`);
      }
    } catch {
      activeSessions.delete(jobId);
    }
  }
}

async function runBroadcastCycle(): Promise<void> {
  const dbConn = await db.getDb();
  if (!dbConn) return;
  try {
    await cleanupFinishedSessions(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT * FROM virelle_video_transform_jobs
      WHERE mode='broadcast'
        AND (
          status='broadcast_ready'
          OR (
            status='waiting_for_provider'
            AND updatedAt < DATE_SUB(NOW(), INTERVAL ${BRIDGE_RETRY_MINUTES} MINUTE)
          )
        )
      ORDER BY createdAt ASC LIMIT 10
    `);
    const sessions = Array.isArray(rows[0]) ? rows[0] : rows;
    for (const session of sessions) await initiateBroadcastSession(dbConn, session);
  } catch (error: any) {
    logger.error(`[BroadcastWorker] Cycle error: ${error?.message}`);
  }
}

export function startBroadcastWorker(): void {
  logger.info(
    `[BroadcastWorker] Starting — encrypted outputs, mandatory recording, strict BYOK, bridge=${bridgeConfig() ? "configured" : "not configured"}`,
  );
  setTimeout(() => runBroadcastCycle().catch(console.error), 8_000);
  const timer = setInterval(
    () => runBroadcastCycle().catch(console.error),
    POLL_INTERVAL_MS,
  );
  timer.unref?.();
}
