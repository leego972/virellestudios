import { randomUUID } from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { logger } from "./_core/logger";
import { requireVfxStudioTier } from "./_core/vfxStudioMiddleware";

type StrictByokVideoProvider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "seedance" | "veo3";

const STRICT_BYOK_PROVIDERS = ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"] as const;
const TRANSFORM_GOALS = [
  "appearance_reference",
  "boy_to_girl",
  "girl_to_boy",
  "younger_self",
  "older_self",
  "adult_to_child",
  "child_to_adult",
  "custom_prompt",
] as const;
const BROADCAST_DESTINATIONS = ["rtmp", "rtmp_onlyfans", "rtmp_fansly", "rtmp_chaturbate", "webrtc", "obs", "custom"] as const;

function providerFromUserKeys(keys: any, requestedProvider?: string | null): StrictByokVideoProvider | null {
  const available: StrictByokVideoProvider[] = [];
  if (keys?.runwayKey) available.push("runway");
  if (keys?.openaiKey) available.push("openai");
  if (keys?.replicateKey) available.push("replicate");
  if (keys?.falKey) available.push("fal");
  if (keys?.lumaKey) available.push("luma");
  if (keys?.hfToken) available.push("huggingface");
  if (keys?.byteplusKey) available.push("seedance");
  if (keys?.googleAiKey) available.push("veo3");

  if (requestedProvider) {
    const provider = requestedProvider as StrictByokVideoProvider;
    return available.includes(provider) ? provider : null;
  }
  return available[0] || null;
}

function maskedProviderStatus(keys: any) {
  return {
    runway: Boolean(keys?.runwayKey),
    openai: Boolean(keys?.openaiKey),
    replicate: Boolean(keys?.replicateKey),
    fal: Boolean(keys?.falKey),
    luma: Boolean(keys?.lumaKey),
    huggingface: Boolean(keys?.hfToken),
    seedance: Boolean(keys?.byteplusKey),
    veo3: Boolean(keys?.googleAiKey),
  };
}

async function requireStrictByokProvider(userId: number, requestedProvider?: string | null): Promise<StrictByokVideoProvider> {
  const keys = await db.getUserApiKeys(userId);
  const provider = providerFromUserKeys(keys, requestedProvider);
  if (!provider) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "BYOK_REQUIRED: Add your own Runway, OpenAI/Sora, Replicate, fal.ai, Luma, Hugging Face, SeedDance or Veo key before using Virelle Broadcast or Studio Render.",
    });
  }
  return provider;
}

async function ensureBroadcastRenderTables(dbConn: any) {
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS virelle_video_transform_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      projectId INT NULL,
      sceneId INT NULL,
      mode VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      provider VARCHAR(32) NOT NULL,
      providerJobId VARCHAR(255) NULL,
      sourceVideoUrl TEXT NULL,
      referenceVideoUrl TEXT NULL,
      sourceImageUrls JSON NULL,
      referenceImageUrls JSON NULL,
      transformGoal VARCHAR(64) NOT NULL DEFAULT 'appearance_reference',
      targetAge INT NULL,
      targetPresentation VARCHAR(400) NULL,
      outputVideoUrl TEXT NULL,
      previewImageUrl TEXT NULL,
      broadcastDestination VARCHAR(32) NULL,
      ingestUrl TEXT NULL,
      streamKeyMasked VARCHAR(80) NULL,
      directorNotes TEXT NULL,
      consentConfirmed TINYINT(1) NOT NULL DEFAULT 0,
      visibleWatermarkMode VARCHAR(64) NOT NULL DEFAULT 'internal_provenance_only',
      byokRequired TINYINT(1) NOT NULL DEFAULT 1,
      orchestrationCredits INT NOT NULL DEFAULT 0,
      errorMessage TEXT NULL,
      metadata JSON NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_vvtj_user (userId),
      INDEX idx_vvtj_project (projectId),
      INDEX idx_vvtj_scene (sceneId),
      INDEX idx_vvtj_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function maskStreamKey(key?: string | null) {
  if (!key) return null;
  const clean = key.trim();
  if (clean.length <= 8) return "****";
  return `${clean.slice(0, 3)}…${clean.slice(-4)}`;
}

function parseBridgeUrl(): URL {
  const raw = process.env.BROADCAST_BRIDGE_URL?.trim();
  if (!raw) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "BROADCAST_BRIDGE_NOT_CONFIGURED: Add BROADCAST_BRIDGE_URL and BROADCAST_BRIDGE_TOKEN in Render before starting a live broadcast.",
    });
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid bridge URL");
    return url;
  } catch {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "BROADCAST_BRIDGE_URL must be a credential-free HTTPS URL." });
  }
}

function validateBroadcastChannels(channels: Array<{ destination: typeof BROADCAST_DESTINATIONS[number]; ingestUrl?: string | null; streamKey?: string | null }>) {
  for (const channel of channels) {
    const needsRtmpCredentials = channel.destination.startsWith("rtmp");
    if (needsRtmpCredentials && (!channel.ingestUrl?.trim() || !channel.streamKey?.trim())) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Ingest URL and stream key are required for ${channel.destination}.` });
    }
    if (channel.ingestUrl) {
      let parsed: URL;
      try { parsed = new URL(channel.ingestUrl); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "A broadcast ingest URL is invalid." }); }
      if (!["rtmp:", "rtmps:", "https:", "wss:"].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Broadcast ingest URLs must use RTMP, RTMPS, HTTPS or WSS and cannot contain embedded credentials." });
      }
    }
  }
}

const createJobInput = z.object({
  projectId: z.number().optional().nullable(),
  sceneId: z.number().optional().nullable(),
  sourceVideoUrl: z.string().url().optional().nullable(),
  referenceVideoUrl: z.string().url().optional().nullable(),
  sourceImageUrls: z.array(z.string().url()).max(30).optional().default([]),
  referenceImageUrls: z.array(z.string().url()).max(30).optional().default([]),
  transformGoal: z.enum(TRANSFORM_GOALS).default("appearance_reference"),
  targetAge: z.number().min(1).max(120).optional().nullable(),
  targetPresentation: z.string().max(400).optional().nullable(),
  requestedProvider: z.enum(STRICT_BYOK_PROVIDERS).optional().nullable(),
  directorNotes: z.string().max(6000).optional().nullable(),
  consentConfirmed: z.boolean(),
  hideVisibleWatermark: z.boolean().optional().default(true),
});

type CreateJobInput = z.infer<typeof createJobInput>;

async function assertProjectSceneAccess(userId: number, input: CreateJobInput) {
  if (input.projectId) {
    const project = await db.getProjectById(input.projectId, userId);
    if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project access denied." });
  }
  if (input.sceneId) {
    const scene = await db.getSceneById(input.sceneId);
    if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found." });
    const sceneProjectId = Number((scene as any).projectId);
    const project = await db.getProjectById(sceneProjectId, userId);
    if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Scene access denied." });
    if (input.projectId && sceneProjectId !== input.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Scene does not belong to the selected project." });
    }
  }
}

async function latestSwappysOutput(dbConn: any, userId: number, sceneId?: number | null): Promise<string | null> {
  if (!sceneId) return null;
  try {
    const rows: any = await dbConn.execute(sql`
      SELECT enhancedImageUrl
      FROM scene_vfx_data
      WHERE sceneId = ${sceneId} AND userId = ${userId} AND enhancedImageUrl IS NOT NULL
      LIMIT 1
    `);
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    const value = data?.[0]?.enhancedImageUrl;
    return typeof value === "string" && /^https:\/\//i.test(value) ? value : null;
  } catch (error: any) {
    logger.warn(`[VirelleBroadcast] could not resolve Swappys output for scene=${sceneId}: ${error?.message || "unknown error"}`);
    return null;
  }
}

function withSwappysReference(input: CreateJobInput, swappysOutput: string | null) {
  const refs = [...input.referenceImageUrls];
  if (swappysOutput && !refs.includes(swappysOutput)) refs.unshift(swappysOutput);
  return refs;
}

function safeChannelMetadata(channels: Array<{ destination: string; ingestUrl?: string | null; streamKey?: string | null }>) {
  return channels.map((channel) => ({
    destination: channel.destination,
    ingestUrl: channel.ingestUrl || null,
    streamKeyMasked: maskStreamKey(channel.streamKey),
  }));
}

async function dispatchBroadcastBridge(payload: Record<string, unknown>) {
  const bridgeUrl = parseBridgeUrl();
  const token = process.env.BROADCAST_BRIDGE_TOKEN?.trim();
  if (!token) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "BROADCAST_BRIDGE_TOKEN is not configured in Render." });
  }

  const response = await fetch(bridgeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": String(payload.correlationId || randomUUID()),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null) as any;
  if (!response.ok || body?.ok === false) {
    throw new Error(body?.message || body?.error || `Broadcast bridge returned HTTP ${response.status}`);
  }
  const bridgeSessionId = String(body?.sessionId || body?.bridgeSessionId || body?.jobId || "").trim();
  if (!bridgeSessionId) throw new Error("Broadcast bridge did not return a session identifier.");
  return { bridgeSessionId, bridgeStatus: String(body?.status || "broadcast_ready") };
}

export const virelleBroadcastRenderRouter = router({
  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const keys = await db.getUserApiKeys(ctx.user.id);
    const status = maskedProviderStatus(keys);
    return {
      ok: true,
      byokRequired: true,
      broadcastBridgeConfigured: Boolean(process.env.BROADCAST_BRIDGE_URL && process.env.BROADCAST_BRIDGE_TOKEN),
      policy: "Virelle membership unlocks broadcast/render orchestration. Provider rendering uses the user's own API key.",
      providers: status,
      hasAnyProvider: Object.values(status).some(Boolean),
      supportedProviders: STRICT_BYOK_PROVIDERS,
    };
  }),

  createStudioRenderJob: protectedProcedure.input(createJobInput).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Studio Render");
    if (!input.consentConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Consent confirmation is required for likeness transformation." });
    await assertProjectSceneAccess(ctx.user.id, input);
    const provider = await requireStrictByokProvider(ctx.user.id, input.requestedProvider);
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);

    const swappysOutput = await latestSwappysOutput(dbConn, ctx.user.id, input.sceneId);
    const referenceImages = withSwappysReference(input, swappysOutput);
    if (!input.sourceVideoUrl && input.sourceImageUrls.length === 0 && !swappysOutput) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Studio Render requires source media or a completed Swappys scene output." });
    }

    const orchestrationCredits = 8;
    if ((ctx.user as any).role !== "admin") {
      try { await db.deductCredits(ctx.user.id, orchestrationCredits, "virelle_studio_render_orchestration", `BYOK Studio Render orchestration: ${input.transformGoal}`); }
      catch (error: any) { throw new TRPCError({ code: "FORBIDDEN", message: error?.message || "Insufficient Virelle credits for render orchestration." }); }
    }

    const metadata = {
      byok: true,
      costPolicy: "provider_cost_paid_by_user_key",
      mode: "studio_render",
      transformGoal: input.transformGoal,
      swappysOutputUsed: Boolean(swappysOutput),
      nextWorkerStep: "submit_to_user_byok_provider_then_poll_status",
    };
    const result: any = await dbConn.execute(sql`
      INSERT INTO virelle_video_transform_jobs
        (userId, projectId, sceneId, mode, status, provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls, referenceImageUrls, transformGoal, targetAge, targetPresentation, previewImageUrl, directorNotes, consentConfirmed, visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
      VALUES
        (${ctx.user.id}, ${input.projectId || null}, ${input.sceneId || null}, 'studio_render', 'queued', ${provider}, ${input.sourceVideoUrl || null}, ${input.referenceVideoUrl || null}, ${JSON.stringify(input.sourceImageUrls)}, ${JSON.stringify(referenceImages)}, ${input.transformGoal}, ${input.targetAge || null}, ${input.targetPresentation || null}, ${swappysOutput}, ${input.directorNotes || null}, 1, ${input.hideVisibleWatermark ? 'internal_provenance_only' : 'visible_ai_mark_required'}, 1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
    `);
    const jobId = result?.[0]?.insertId ?? result?.insertId ?? null;
    logger.info(`[VirelleRender] queued job=${jobId} user=${ctx.user.id} provider=${provider} goal=${input.transformGoal} swappysOutput=${Boolean(swappysOutput)}`);
    return { ok: true, jobId, status: "queued", mode: "studio_render", provider, swappysOutputUsed: Boolean(swappysOutput), byokRequired: true, orchestrationCredits };
  }),

  createBroadcastSession: protectedProcedure.input(createJobInput.extend({
    durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(30),
    channels: z.array(z.object({
      destination: z.enum(BROADCAST_DESTINATIONS),
      ingestUrl: z.string().optional().nullable(),
      streamKey: z.string().max(300).optional().nullable(),
    })).min(1).max(5),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast Mode");
    if (!(ctx.user as any).isAdultVerified) {
      throw new TRPCError({ code: "FORBIDDEN", message: "AGE_VERIFICATION_REQUIRED: You must verify that you are 18+ to use Virelle Broadcast." });
    }
    if (!input.consentConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Consent confirmation is required before live likeness transformation." });
    const minAvatarAge = 16;
    if (input.transformGoal === "adult_to_child" || (input.targetAge != null && input.targetAge < minAvatarAge) || (input.transformGoal === "younger_self" && input.targetAge == null)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `BROADCAST_AGE_FLOOR: Live avatars must depict a person aged ${minAvatarAge} or older.` });
    }
    validateBroadcastChannels(input.channels);
    await assertProjectSceneAccess(ctx.user.id, input);
    const provider = await requireStrictByokProvider(ctx.user.id, input.requestedProvider);
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);

    const swappysOutput = await latestSwappysOutput(dbConn, ctx.user.id, input.sceneId);
    const referenceImages = withSwappysReference(input, swappysOutput);
    if (!input.sourceVideoUrl && input.sourceImageUrls.length === 0 && !swappysOutput) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Broadcast requires source media or a completed Swappys scene output." });
    }

    const bridgeUrl = parseBridgeUrl();
    void bridgeUrl;
    const broadcastCredits: Record<number, number> = { 30: 5, 60: 10, 120: 18 };
    const orchestrationCredits = broadcastCredits[input.durationMinutes] ?? 5;
    let creditsDeducted = false;
    if ((ctx.user as any).role !== "admin") {
      try {
        await db.deductCredits(ctx.user.id, orchestrationCredits, "virelle_broadcast_orchestration", `BYOK Broadcast orchestration (${input.durationMinutes}min)`);
        creditsDeducted = true;
      } catch (error: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: error?.message || "Insufficient Virelle credits for broadcast orchestration." });
      }
    }

    const correlationId = randomUUID();
    const safeChannels = safeChannelMetadata(input.channels);
    const metadata = {
      byok: true,
      costPolicy: "provider_cost_paid_by_user_key",
      mode: "broadcast",
      durationMinutes: input.durationMinutes,
      channels: safeChannels,
      transformGoal: input.transformGoal,
      swappysOutputUsed: Boolean(swappysOutput),
      correlationId,
      safety: { consentConfirmed: true, broadcastMinAvatarAge: minAvatarAge, ageFloorEnforced: true },
    };

    const insert: any = await dbConn.execute(sql`
      INSERT INTO virelle_video_transform_jobs
        (userId, projectId, sceneId, mode, status, provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls, referenceImageUrls, transformGoal, targetAge, targetPresentation, previewImageUrl, broadcastDestination, ingestUrl, streamKeyMasked, directorNotes, consentConfirmed, visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
      VALUES
        (${ctx.user.id}, ${input.projectId || null}, ${input.sceneId || null}, 'broadcast', 'processing', ${provider}, ${input.sourceVideoUrl || null}, ${input.referenceVideoUrl || null}, ${JSON.stringify(input.sourceImageUrls)}, ${JSON.stringify(referenceImages)}, ${input.transformGoal}, ${input.targetAge || null}, ${input.targetPresentation || null}, ${swappysOutput}, ${input.channels[0].destination}, ${input.channels[0].ingestUrl || null}, ${maskStreamKey(input.channels[0].streamKey)}, ${input.directorNotes || null}, 1, ${input.hideVisibleWatermark ? 'internal_provenance_only' : 'visible_ai_mark_required'}, 1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
    `);
    const sessionId = insert?.[0]?.insertId ?? insert?.insertId ?? null;

    try {
      const bridge = await dispatchBroadcastBridge({
        correlationId,
        virelleSessionId: sessionId,
        userId: ctx.user.id,
        provider,
        durationMinutes: input.durationMinutes,
        transform: {
          goal: input.transformGoal,
          targetAge: input.targetAge || null,
          targetPresentation: input.targetPresentation || null,
          directorNotes: input.directorNotes || null,
        },
        media: {
          swappysOutputImageUrl: swappysOutput,
          sourceVideoUrl: input.sourceVideoUrl || null,
          referenceVideoUrl: input.referenceVideoUrl || null,
          sourceImageUrls: input.sourceImageUrls,
          referenceImageUrls: referenceImages,
        },
        channels: input.channels,
      });
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs
        SET status = 'broadcast_ready', providerJobId = ${bridge.bridgeSessionId}, errorMessage = NULL, updatedAt = NOW()
        WHERE id = ${sessionId} AND userId = ${ctx.user.id}
      `);
      logger.info(`[VirelleBroadcast] connected session=${sessionId} bridge=${bridge.bridgeSessionId} user=${ctx.user.id} channels=${input.channels.length}`);
      return { ok: true, sessionId, bridgeSessionId: bridge.bridgeSessionId, status: "broadcast_ready", mode: "broadcast", provider, channels: input.channels.length, primaryDestination: input.channels[0].destination, swappysOutputUsed: Boolean(swappysOutput), byokRequired: true, orchestrationCredits };
    } catch (error: any) {
      const safeMessage = String(error?.message || "Broadcast bridge connection failed").slice(0, 1000);
      await dbConn.execute(sql`
        UPDATE virelle_video_transform_jobs SET status = 'failed', errorMessage = ${safeMessage}, updatedAt = NOW()
        WHERE id = ${sessionId} AND userId = ${ctx.user.id}
      `).catch(() => {});
      if (creditsDeducted) {
        await db.addCredits(ctx.user.id, orchestrationCredits, "broadcast_bridge_refund", `Broadcast bridge failed for session ${sessionId}; orchestration credits refunded.`).catch(() => {});
      }
      logger.warn(`[VirelleBroadcast] bridge failed session=${sessionId} user=${ctx.user.id}: ${safeMessage}`);
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: `BROADCAST_BRIDGE_FAILED: ${safeMessage}` });
    }
  }),

  listJobs: protectedProcedure.input(z.object({ projectId: z.number().optional(), sceneId: z.number().optional(), mode: z.enum(["broadcast", "studio_render"]).optional(), limit: z.number().min(1).max(100).default(25) })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT id, projectId, sceneId, mode, status, provider, providerJobId, transformGoal, targetAge, targetPresentation, outputVideoUrl, previewImageUrl, broadcastDestination, ingestUrl, streamKeyMasked, visibleWatermarkMode, byokRequired, orchestrationCredits, errorMessage, metadata, createdAt, updatedAt
      FROM virelle_video_transform_jobs
      WHERE userId = ${ctx.user.id}
        AND (${input.projectId || null} IS NULL OR projectId = ${input.projectId || null})
        AND (${input.sceneId || null} IS NULL OR sceneId = ${input.sceneId || null})
        AND (${input.mode || null} IS NULL OR mode = ${input.mode || null})
      ORDER BY id DESC LIMIT ${input.limit}
    `);
    return Array.isArray(rows[0]) ? rows[0] : rows;
  }),

  getJob: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`SELECT * FROM virelle_video_transform_jobs WHERE id = ${input.id} AND userId = ${ctx.user.id} LIMIT 1`);
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    if (!data?.[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    return data[0];
  }),

  cancelJob: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs SET status = 'cancelled', updatedAt = NOW()
      WHERE id = ${input.id} AND userId = ${ctx.user.id} AND status IN ('queued','waiting_for_provider','processing','broadcast_ready')
    `);
    return { ok: true };
  }),
});
