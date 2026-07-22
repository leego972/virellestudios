import * as db from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { decryptApiKey } from "./_core/securityEngine";
import { getMatureAccessStatus } from "./_core/matureAccess";
import { screenContentRequest } from "./_core/contentCompliance";
import { assertSwappysCreativePolicy } from "./_core/swappysPolicy";
import {
  consumeBroadcastMinuteReservation,
  releaseBroadcastMinuteReservation,
} from "./_core/broadcastMinutes";

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
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return null;
    }
    return { url: parsed.toString(), token };
  } catch {
    return null;
  }
}

function publicAppUrl(): string {
  const raw = process.env.PUBLIC_APP_URL
    || process.env.APP_URL
    || "https://virelle.life";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
      return "https://virelle.life";
    }
    return parsed.origin;
  } catch {
    return "https://virelle.life";
  }
}

function safeJson(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  try { return JSON.parse(String(value)); } catch { return {}; }
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

async function resolveByokKey(
  userId: number,
  provider: string,
): Promise<string | null> {
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
  if (!plaintext) {
    throw new Error("Broadcast output credentials could not be decrypted.");
  }
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
  providerKey: string | null,
  channels: BridgeChannel[],
): Promise<BridgeResponse> {
  const config = bridgeConfig();
  if (!config) throw new Error("BROADCAST_BRIDGE_NOT_CONFIGURED");
  const metadata = safeJson(job.metadata);

  const payload = {
    jobId: Number(job.id),
    userId: Number(job.userId),
    provider: String(job.provider),
    providerKey,
    serviceMode: metadata?.serviceMode || "ai_assisted",
    aiAssisted: (metadata?.serviceMode || "ai_assisted") === "ai_assisted",
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
      format: "mp4",
      userDownloadRequired: true,
      privateComplianceCopyRequired: true,
      minimumRetentionDays: Math.max(
        90,
        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),
      ),
      completionCallback: {
        url: `${publicAppUrl()}/api/trpc/virelleBroadcastRender.recordBroadcastCompletion`,
        protocol: "trpc-json-v1",
        authorization: `Bearer ${config.token}`,
      },
    },
    safety: {
      allSubjectsAdultsConfirmed: Boolean(job.allSubjectsAdultsConfirmed),
      consentConfirmed: Boolean(job.consentConfirmed),
      publicFigureLikeness: Boolean(job.publicFigureLikeness),
      aiGeneratedCharactersOnly: Boolean(job.aiGeneratedCharactersOnly),
      minorsProhibitedInAdultWorkspace: true,
      policyVersion: metadata?.policyVersion || "adult-workspace-2026-07",
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
  if (!result.sessionId) {
    throw new Error("Broadcast bridge returned no session ID.");
  }
  return result;
}

async function initiateBroadcastSession(dbConn: any, job: any): Promise<void> {
  const jobId = Number(job.id);
  const userId = Number(job.userId);
  if (activeSessions.has(jobId)) return;

  try {
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
      sourceType: "broadcast_worker",
      sourceId: jobId,
      text: policyText,
      targetAge: job.targetAge == null ? null : Number(job.targetAge),
      publicFigureLikeness: Boolean(job.publicFigureLikeness),
    });
    const jobMetadata = safeJson(job.metadata);
    const serviceMode = String(jobMetadata?.serviceMode || "ai_assisted");
    const aiAssisted = serviceMode === "ai_assisted";
    if (aiAssisted) {
      assertSwappysCreativePolicy({
        user: workerUser,
      contentMode: workspace === "adult" ? "open_adult" : "standard",
      consentConfirmed: Boolean(job.consentConfirmed),
      allSubjectsAdultsConfirmed: Boolean(job.allSubjectsAdultsConfirmed),
      transformGoal: job.transformGoal,
      targetAge: job.targetAge == null ? null : Number(job.targetAge),
      targetPresentation: job.targetPresentation,
      directorNotes: job.directorNotes,
      broadcast: true,
      publicFigureLikeness: Boolean(job.publicFigureLikeness),
        aiGeneratedCharactersOnly: Boolean(job.aiGeneratedCharactersOnly),
      });
    }

    const providerKey = aiAssisted
      ? await resolveByokKey(userId, String(job.provider))
      : null;
    if (aiAssisted && !providerKey) {
      await releaseBroadcastMinuteReservation(
        dbConn,
        jobMetadata?.reservationKey,
        "AI-assisted broadcast could not start because its BYOK provider key was unavailable.",
      ).catch(() => undefined);
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status='failed',
            errorMessage='BYOK_REQUIRED: No valid API key for the selected provider.',
            updatedAt=NOW()
        WHERE id=${jobId}
      `);
      logger.warn(
        `[BroadcastWorker] Session ${jobId}: missing BYOK key for ${job.provider}`,
      );
      return;
    }

    const channels = decryptChannels(job.broadcastChannelsEncrypted);
    if (!bridgeConfig()) {
      await markWaitingForBridge(dbConn, jobId);
      logger.warn(
        `[BroadcastWorker] Session ${jobId}: bridge configuration missing; credentials remain encrypted at rest.`,
      );
      return;
    }

    activeSessions.set(jobId, {
      startedAt: new Date(),
      channels: channels.length,
      provider: String(job.provider),
    });
    const bridge = await submitBridgeSession(job, providerKey, channels);
    await consumeBroadcastMinuteReservation(
      dbConn,
      jobMetadata?.reservationKey,
      "Managed broadcast accepted by the bridge.",
    );
    const immediateRecording = bridge.recordingUrl || null;
    const completed = Boolean(
      immediateRecording
      && String(bridge.status || "").toLowerCase() === "completed",
    );
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status=${completed ? "completed" : "processing"},
          providerJobId=${bridge.sessionId},
          outputVideoUrl=${immediateRecording || bridge.outputUrl || null},
          previewImageUrl=${bridge.previewUrl || null},
          broadcastStartedAt=COALESCE(broadcastStartedAt, NOW()),
          broadcastCompletedAt=${completed ? new Date() : null},
          errorMessage=NULL,
          updatedAt=NOW()
      WHERE id=${jobId}
    `);
    logger.info(
      `[BroadcastWorker] Session ${jobId} submitted; outputs=${channels.length}, mandatoryRecording=true`,
    );
  } catch (error: any) {
    const message = String(error?.message ?? error).slice(0, 1000);
    if (message === "BROADCAST_BRIDGE_NOT_CONFIGURED") {
      await markWaitingForBridge(dbConn, jobId);
    } else {
      const failedMetadata = safeJson(job.metadata);
      await releaseBroadcastMinuteReservation(
        dbConn,
        failedMetadata?.reservationKey,
        `Broadcast failed before the bridge accepted the session: ${message}`,
      ).catch(() => undefined);
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
        SELECT status FROM virelle_video_transform_jobs
        WHERE id=${jobId} LIMIT 1
      `);
      const data = Array.isArray(rows[0]) ? rows[0] : rows;
      const status = data?.[0]?.status;
      if (["cancelled", "completed", "failed"].includes(status)) {
        activeSessions.delete(jobId);
        logger.info(
          `[BroadcastWorker] Session ${jobId} removed from active registry (${status})`,
        );
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
    for (const session of sessions) {
      await initiateBroadcastSession(dbConn, session);
    }
  } catch (error: any) {
    logger.error(`[BroadcastWorker] Cycle error: ${error?.message}`);
  }
}

export function startBroadcastWorker(): void {
  logger.info(
    `[BroadcastWorker] Starting — encrypted outputs, mandatory managed recording, BYOK only for AI-assisted sessions, bridge=${bridgeConfig() ? "configured" : "not configured"}`,
  );
  setTimeout(() => runBroadcastCycle().catch(console.error), 8_000);
  const timer = setInterval(
    () => runBroadcastCycle().catch(console.error),
    POLL_INTERVAL_MS,
  );
  timer.unref?.();
}
