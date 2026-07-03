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
const JOB_STATUS = ["queued", "waiting_for_provider", "processing", "ready", "broadcast_ready", "completed", "failed", "cancelled"] as const;

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
    if (available.includes(provider)) return provider;
    return null;
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
      message: "BYOK_REQUIRED: Add your own Runway, OpenAI/Sora, Replicate, fal.ai, Luma, Hugging Face, SeedDance or Veo key before using Virelle Broadcast or Studio Render. Virelle membership unlocks the workflow; your provider key pays for rendering.",
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

export const virelleBroadcastRenderRouter = router({
  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const keys = await db.getUserApiKeys(ctx.user.id);
    const status = maskedProviderStatus(keys);
    return {
      ok: true,
      byokRequired: true,
      policy: "Virelle membership unlocks broadcast/render orchestration only. Video generation/render provider costs must use the user's own API key.",
      providers: status,
      hasAnyProvider: Object.values(status).some(Boolean),
      supportedProviders: STRICT_BYOK_PROVIDERS,
    };
  }),

  createStudioRenderJob: protectedProcedure.input(createJobInput).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Studio Render");
    if (!input.consentConfirmed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Consent confirmation is required for likeness, age, gender/presentation and digital-double video rendering." });
    }
    if (!input.sourceVideoUrl && input.sourceImageUrls.length === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Studio Render requires a source video or at least one source image." });
    }
    if (input.projectId) await db.getProjectById(input.projectId, ctx.user.id);
    const provider = await requireStrictByokProvider(ctx.user.id, input.requestedProvider);
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);

    const orchestrationCredits = 8;
    if ((ctx.user as any).role !== "admin") {
      try {
        await db.deductCredits(ctx.user.id, orchestrationCredits, "virelle_studio_render_orchestration", `BYOK Studio Render orchestration: ${input.transformGoal}`);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err?.message || "Insufficient Virelle credits for render orchestration." });
      }
    }

    const metadata = {
      byok: true,
      costPolicy: "provider_cost_paid_by_user_key",
      mode: "studio_render",
      transformGoal: input.transformGoal,
      targetAge: input.targetAge || null,
      targetPresentation: input.targetPresentation || null,
      media: {
        sourceVideoUrl: input.sourceVideoUrl || null,
        referenceVideoUrl: input.referenceVideoUrl || null,
        sourceImageUrls: input.sourceImageUrls,
        referenceImageUrls: input.referenceImageUrls,
      },
      nextWorkerStep: "submit_to_user_byok_provider_then_poll_status",
    };

    const result: any = await dbConn.execute(sql`
      INSERT INTO virelle_video_transform_jobs
        (userId, projectId, sceneId, mode, status, provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls, referenceImageUrls, transformGoal, targetAge, targetPresentation, directorNotes, consentConfirmed, visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
      VALUES
        (${ctx.user.id}, ${input.projectId || null}, ${input.sceneId || null}, 'studio_render', 'queued', ${provider}, ${input.sourceVideoUrl || null}, ${input.referenceVideoUrl || null}, ${JSON.stringify(input.sourceImageUrls)}, ${JSON.stringify(input.referenceImageUrls)}, ${input.transformGoal}, ${input.targetAge || null}, ${input.targetPresentation || null}, ${input.directorNotes || null}, ${input.consentConfirmed ? 1 : 0}, ${input.hideVisibleWatermark ? 'internal_provenance_only' : 'visible_ai_mark_required'}, 1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
    `);
    const jobId = result?.[0]?.insertId ?? result?.insertId ?? null;
    logger.info(`[VirelleRender] queued job=${jobId} user=${ctx.user.id} provider=${provider} goal=${input.transformGoal}`);
    return { ok: true, jobId, status: "queued", mode: "studio_render", provider, byokRequired: true, orchestrationCredits };
  }),

  createBroadcastSession: protectedProcedure.input(createJobInput.extend({
    durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(30),
    channels: z.array(z.object({
      destination: z.enum(BROADCAST_DESTINATIONS),
      ingestUrl: z.string().url().optional().nullable(),
      streamKey: z.string().max(300).optional().nullable(),
    })).min(1).max(5),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast Mode");

    // v6.83: Age verification enforcement for broadcast (especially adult/cam presets)
    if (!(ctx.user as any).isAdultVerified) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "AGE_VERIFICATION_REQUIRED: You must verify that you are 18+ to use Virelle Broadcast. Please complete the verification in your Profile Settings.",
      });
    }

    if (!input.consentConfirmed) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Consent confirmation is required before live/broadcast likeness transformation." });
    }

    // v7.3 — Broadcast avatar age floor: no Swappys avatar under 16 in live broadcast.
    // Child/minor transform goals are fully blocked in broadcast mode, and any
    // explicit targetAge below 16 is rejected regardless of tier or role.
    const BROADCAST_MIN_AVATAR_AGE = 16;
    if (input.transformGoal === "adult_to_child") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "BROADCAST_AGE_FLOOR: Child-transform goals are not permitted in live Broadcast mode. Broadcast avatars must depict a person aged 16 or older.",
      });
    }
    if (input.targetAge != null && input.targetAge < BROADCAST_MIN_AVATAR_AGE) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `BROADCAST_AGE_FLOOR: Broadcast avatar target age must be ${BROADCAST_MIN_AVATAR_AGE} or older. Received ${input.targetAge}.`,
      });
    }
    if (input.transformGoal === "younger_self" && input.targetAge == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `BROADCAST_AGE_FLOOR: \"Younger self\" broadcasts require an explicit target age of ${BROADCAST_MIN_AVATAR_AGE} or older.`,
      });
    }

    const provider = await requireStrictByokProvider(ctx.user.id, input.requestedProvider);
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);

    const BROADCAST_BLOCK_CREDITS: Record<number, number> = { 30: 5, 60: 10, 120: 18 };
    const orchestrationCredits = BROADCAST_BLOCK_CREDITS[input.durationMinutes] ?? 5;
    if ((ctx.user as any).role !== "admin") {
      try {
        await db.deductCredits(ctx.user.id, orchestrationCredits, "virelle_broadcast_orchestration", `BYOK Broadcast orchestration: ${input.destination}`);
      } catch (err: any) {
        throw new TRPCError({ code: "FORBIDDEN", message: err?.message || "Insufficient Virelle credits for broadcast orchestration." });
      }
    }

    const metadata = {
      byok: true,
      costPolicy: "provider_cost_paid_by_user_key",
      mode: "broadcast",
      durationMinutes: input.durationMinutes,
      channels: input.channels,
      destination: input.channels[0].destination,
      transformGoal: input.transformGoal,
      nextWorkerStep: "create_live_transform_bridge_rtmp_webrtc_or_obs",
      safety: {
        consentConfirmed: input.consentConfirmed,
        visibleMark: input.hideVisibleWatermark ? "creator_internal_provenance" : "visible_ai_mark_required",
        broadcastMinAvatarAge: 16,
        ageFloorEnforced: true,
      },
    };

    const result: any = await dbConn.execute(sql`
      INSERT INTO virelle_video_transform_jobs
        (userId, projectId, sceneId, mode, status, provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls, referenceImageUrls, transformGoal, targetAge, targetPresentation, broadcastDestination, ingestUrl, streamKeyMasked, directorNotes, consentConfirmed, visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
      VALUES
        (${ctx.user.id}, ${input.projectId || null}, ${input.sceneId || null}, 'broadcast', 'broadcast_ready', ${provider}, ${input.sourceVideoUrl || null}, ${input.referenceVideoUrl || null}, ${JSON.stringify(input.sourceImageUrls)}, ${JSON.stringify(input.referenceImageUrls)}, ${input.transformGoal}, ${input.targetAge || null}, ${input.targetPresentation || null}, ${input.channels[0].destination}, ${input.channels[0].ingestUrl || null}, ${maskStreamKey(input.channels[0].streamKey)}, ${input.directorNotes || null}, ${input.consentConfirmed ? 1 : 0}, ${input.hideVisibleWatermark ? 'internal_provenance_only' : 'visible_ai_mark_required'}, 1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
    `);
    const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
    logger.info(`[VirelleBroadcast] session=${sessionId} user=${ctx.user.id} provider=${provider} channels=${input.channels.length} primaryDest=${input.channels[0].destination}`);
    return { ok: true, sessionId, status: "broadcast_ready", mode: "broadcast", provider, channels: input.channels.length, primaryDestination: input.channels[0].destination, byokRequired: true, orchestrationCredits };
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
      ORDER BY id DESC
      LIMIT ${input.limit}
    `);
    return Array.isArray(rows[0]) ? rows[0] : rows;
  }),

  getJob: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT * FROM virelle_video_transform_jobs WHERE id = ${input.id} AND userId = ${ctx.user.id} LIMIT 1
    `);
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
      UPDATE virelle_video_transform_jobs
      SET status = 'cancelled', updatedAt = NOW()
      WHERE id = ${input.id} AND userId = ${ctx.user.id} AND status IN ('queued','waiting_for_provider','processing','broadcast_ready')
    `);
    return { ok: true };
  }),
});
