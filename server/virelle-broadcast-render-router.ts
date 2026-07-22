import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as db from "./db";
import { logger } from "./_core/logger";
import { requireVfxStudioTier } from "./_core/vfxStudioMiddleware";
import { encryptApiKey } from "./_core/securityEngine";
import {
  assertSwappysCreativePolicy,
  SWAPPYS_CONTENT_MODES,
  type SwappysContentMode,
} from "./_core/swappysPolicy";
import {
  assertAdultWorkspaceAccess,
  confirmModerationViolation,
  dismissModerationIncident,
  getAdminArchiveDownloadUrl,
  getAdultWorkspaceProfile,
  hasApprovedAdultWorkspace,
  listAdultProfileReviews,
  listBlacklistedUsers,
  listComplianceAccessLog,
  listComplianceArchive,
  listModerationIncidents,
  reviewAdultProfile,
  screenContentRequest,
  setArchiveLegalHold,
  submitAdultWorkspaceProfile,
} from "./_core/complianceArchive";

const STRICT_BYOK_PROVIDERS = [
  "runway",
  "openai",
  "replicate",
  "fal",
  "luma",
  "huggingface",
  "seedance",
  "veo3",
] as const;
type StrictByokVideoProvider = typeof STRICT_BYOK_PROVIDERS[number];

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
type TransformGoal = typeof TRANSFORM_GOALS[number];

const BROADCAST_DESTINATIONS = [
  "rtmp",
  "rtmp_onlyfans",
  "rtmp_fansly",
  "rtmp_chaturbate",
  "webrtc",
  "obs",
  "custom",
] as const;
type BroadcastDestination = typeof BROADCAST_DESTINATIONS[number];

type BroadcastChannel = {
  destination: BroadcastDestination;
  ingestUrl: string | null;
  streamKey: string | null;
};

type SwappysHandoff = {
  id: number;
  projectId: number;
  sceneId: number;
  sourcePlateUrl: string | null;
  actorReferenceUrl: string | null;
  enhancedImageUrl: string | null;
  transformGoal: TransformGoal;
  targetAge: number | null;
  targetPresentation: string | null;
  contentMode: SwappysContentMode;
  consentConfirmed: boolean;
};

const BRIDGE_CONFIGURED = Boolean(
  process.env.BROADCAST_BRIDGE_URL && process.env.BROADCAST_BRIDGE_TOKEN,
);

function providerFromUserKeys(
  keys: any,
  requestedProvider?: string | null,
): StrictByokVideoProvider | null {
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
    return available.includes(requestedProvider as StrictByokVideoProvider)
      ? requestedProvider as StrictByokVideoProvider
      : null;
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

async function requireStrictByokProvider(
  userId: number,
  requestedProvider?: string | null,
): Promise<StrictByokVideoProvider> {
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
      sourceSwappysJobId INT NULL,
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
      contentMode VARCHAR(32) NOT NULL DEFAULT 'standard',
      allSubjectsAdultsConfirmed TINYINT(1) NOT NULL DEFAULT 0,
      publicFigureLikeness TINYINT(1) NOT NULL DEFAULT 0,
      aiGeneratedCharactersOnly TINYINT(1) NOT NULL DEFAULT 0,
      outputVideoUrl TEXT NULL,
      previewImageUrl TEXT NULL,
      broadcastDestination VARCHAR(32) NULL,
      ingestUrl TEXT NULL,
      streamKeyMasked VARCHAR(80) NULL,
      broadcastChannelsEncrypted LONGTEXT NULL,
      broadcastStartedAt DATETIME NULL,
      broadcastCompletedAt DATETIME NULL,
      recordingRequired TINYINT(1) NOT NULL DEFAULT 1,
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
      INDEX idx_vvtj_swappys (sourceSwappysJobId),
      INDEX idx_vvtj_status (status),
      INDEX idx_vvtj_workspace (contentMode),
      INDEX idx_vvtj_broadcast_started (broadcastStartedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const alterations = [
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN sourceSwappysJobId INT NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN contentMode VARCHAR(32) NOT NULL DEFAULT 'standard'`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN allSubjectsAdultsConfirmed TINYINT(1) NOT NULL DEFAULT 0`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN publicFigureLikeness TINYINT(1) NOT NULL DEFAULT 0`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN aiGeneratedCharactersOnly TINYINT(1) NOT NULL DEFAULT 0`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastChannelsEncrypted LONGTEXT NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastStartedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastCompletedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN recordingRequired TINYINT(1) NOT NULL DEFAULT 1`,
  ];
  for (const alteration of alterations) {
    try { await dbConn.execute(alteration); } catch { /* already present */ }
  }
}

function maskStreamKey(key?: string | null) {
  if (!key) return null;
  const clean = key.trim();
  if (clean.length <= 8) return "****";
  return `${clean.slice(0, 3)}…${clean.slice(-4)}`;
}

function safeJson(value: unknown): any {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { return {}; }
}

function safeMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateIngestUrl(
  destination: BroadcastDestination,
  value: string | null,
): string | null {
  if (!value) {
    if (["webrtc", "obs", "custom"].includes(destination)) return null;
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `An ingest URL is required for ${destination}.`,
    });
  }
  let parsed: URL;
  try { parsed = new URL(value); } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Broadcast ingest URL is invalid." });
  }
  if (parsed.username || parsed.password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Do not embed credentials in the ingest URL. Use the stream-key field.",
    });
  }
  const protocol = parsed.protocol.toLowerCase();
  const allowed = destination === "webrtc"
    ? ["https:", "wss:"]
    : destination === "custom"
      ? ["https:", "wss:", "rtmp:", "rtmps:"]
      : ["rtmp:", "rtmps:"];
  if (!allowed.includes(protocol)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${destination} does not support ${protocol} ingest URLs.`,
    });
  }
  const exactHosts: Partial<Record<BroadcastDestination, string>> = {
    rtmp_onlyfans: "live.onlyfans.com",
    rtmp_fansly: "live.fansly.com",
    rtmp_chaturbate: "broadcast.chaturbate.com",
  };
  const expectedHost = exactHosts[destination];
  if (expectedHost && parsed.hostname.toLowerCase() !== expectedHost) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${destination} must use the verified ${expectedHost} ingest host.`,
    });
  }
  return parsed.toString();
}

function normalizeChannels(channels: BroadcastChannel[]): BroadcastChannel[] {
  return channels.map((channel) => {
    const ingestUrl = validateIngestUrl(
      channel.destination,
      channel.ingestUrl?.trim() || null,
    );
    const streamKey = channel.streamKey?.trim() || null;
    if (["rtmp", "rtmp_onlyfans", "rtmp_fansly", "rtmp_chaturbate"].includes(channel.destination)
        && !streamKey) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `A stream key is required for ${channel.destination}.`,
      });
    }
    if (streamKey && streamKey.length > 300) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Stream key is too long." });
    }
    return { destination: channel.destination, ingestUrl, streamKey };
  });
}

function redactChannels(channels: BroadcastChannel[]) {
  return channels.map((channel) => ({
    destination: channel.destination,
    ingestUrl: channel.ingestUrl,
    streamKeyPresent: Boolean(channel.streamKey),
    streamKeyMasked: maskStreamKey(channel.streamKey),
  }));
}

async function loadSwappysHandoff(
  dbConn: any,
  userId: number,
  input: { swappysJobId?: number | null; sceneId?: number | null },
): Promise<SwappysHandoff | null> {
  if (!input.swappysJobId && !input.sceneId) return null;
  const rows: any = input.swappysJobId
    ? await dbConn.execute(sql`
        SELECT s.id, s.projectId, s.sceneId, s.sourcePlateUrl,
               s.actorReferenceUrl, s.consentConfirmed, s.metadata,
               v.enhancedImageUrl
        FROM scene_swappys_exports s
        LEFT JOIN scene_vfx_data v ON v.sceneId=s.sceneId AND v.userId=s.userId
        WHERE s.id=${input.swappysJobId} AND s.userId=${userId}
        LIMIT 1
      `)
    : await dbConn.execute(sql`
        SELECT s.id, s.projectId, s.sceneId, s.sourcePlateUrl,
               s.actorReferenceUrl, s.consentConfirmed, s.metadata,
               v.enhancedImageUrl
        FROM scene_swappys_exports s
        LEFT JOIN scene_vfx_data v ON v.sceneId=s.sceneId AND v.userId=s.userId
        WHERE s.sceneId=${input.sceneId} AND s.userId=${userId}
        ORDER BY s.id DESC LIMIT 1
      `);
  const data = Array.isArray(rows[0]) ? rows[0] : rows;
  const row = data?.[0];
  if (!row) return null;
  const metadata = safeJson(row.metadata);
  const operations: string[] = Array.isArray(metadata?.operations)
    ? metadata.operations
    : [];
  const goal = TRANSFORM_GOALS.includes(metadata?.transform?.goal)
    ? metadata.transform.goal as TransformGoal
    : "appearance_reference";
  return {
    id: Number(row.id),
    projectId: Number(row.projectId),
    sceneId: Number(row.sceneId),
    sourcePlateUrl: safeMediaUrl(row.sourcePlateUrl),
    actorReferenceUrl: safeMediaUrl(row.actorReferenceUrl),
    enhancedImageUrl: safeMediaUrl(row.enhancedImageUrl),
    transformGoal: goal,
    targetAge: typeof metadata?.transform?.targetAge === "number"
      ? metadata.transform.targetAge
      : null,
    targetPresentation: typeof metadata?.transform?.targetPresentation === "string"
      ? metadata.transform.targetPresentation
      : null,
    contentMode: operations.includes("open-adult-creative-mode")
      ? "open_adult"
      : "standard",
    consentConfirmed: Boolean(row.consentConfirmed),
  };
}

const createJobInput = z.object({
  projectId: z.number().optional().nullable(),
  sceneId: z.number().optional().nullable(),
  sourceSwappysJobId: z.number().optional().nullable(),
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
  contentMode: z.enum(SWAPPYS_CONTENT_MODES).default("standard"),
  allSubjectsAdultsConfirmed: z.boolean().optional().default(false),
  publicFigureLikeness: z.boolean().optional().default(false),
  aiGeneratedCharactersOnly: z.boolean().optional().default(false),
  hideVisibleWatermark: z.boolean().optional().default(true),
});
type CreateJobInput = z.infer<typeof createJobInput>;

async function resolveJobInput(dbConn: any, userId: number, input: CreateJobInput) {
  const handoff = await loadSwappysHandoff(dbConn, userId, {
    swappysJobId: input.sourceSwappysJobId,
    sceneId: input.sourceSwappysJobId ? null : input.sceneId,
  });
  const sourceImages = input.sourceImageUrls.length
    ? input.sourceImageUrls
    : handoff?.sourcePlateUrl ? [handoff.sourcePlateUrl] : [];
  const referenceImages = input.referenceImageUrls.length
    ? input.referenceImageUrls
    : [handoff?.enhancedImageUrl, handoff?.actorReferenceUrl].filter(Boolean) as string[];
  return {
    ...input,
    projectId: input.projectId ?? handoff?.projectId ?? null,
    sceneId: input.sceneId ?? handoff?.sceneId ?? null,
    sourceSwappysJobId: input.sourceSwappysJobId ?? handoff?.id ?? null,
    sourceImageUrls: sourceImages,
    referenceImageUrls: referenceImages,
    transformGoal: input.transformGoal === "appearance_reference" && handoff
      ? handoff.transformGoal
      : input.transformGoal,
    targetAge: input.targetAge ?? handoff?.targetAge ?? null,
    targetPresentation: input.targetPresentation ?? handoff?.targetPresentation ?? null,
    contentMode: input.contentMode === "standard" && handoff
      ? handoff.contentMode
      : input.contentMode,
    consentConfirmed: input.consentConfirmed || Boolean(handoff?.consentConfirmed),
  };
}

async function validateResolvedJob(ctx: any, resolved: Awaited<ReturnType<typeof resolveJobInput>>, broadcast: boolean) {
  const workspace = resolved.contentMode === "open_adult" ? "adult" : "standard";
  if (workspace === "adult") await assertAdultWorkspaceAccess(ctx.user.id);

  await screenContentRequest({
    userId: ctx.user.id,
    workspace,
    sourceType: broadcast ? "broadcast_session" : "studio_render",
    sourceId: resolved.sceneId || resolved.projectId || null,
    text: [resolved.targetPresentation, resolved.directorNotes].filter(Boolean).join("\n"),
    targetAge: resolved.targetAge,
    allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
    consentConfirmed: resolved.consentConfirmed,
    publicFigureLikeness: resolved.publicFigureLikeness,
    aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
  });

  assertSwappysCreativePolicy({
    user: ctx.user,
    contentMode: resolved.contentMode,
    consentConfirmed: resolved.consentConfirmed,
    allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
    transformGoal: resolved.transformGoal,
    targetAge: resolved.targetAge,
    targetPresentation: resolved.targetPresentation,
    directorNotes: resolved.directorNotes,
    broadcast,
  });
}

const adultProfileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getAdultWorkspaceProfile(ctx.user.id);
    return {
      profile,
      approved: await hasApprovedAdultWorkspace(ctx.user.id),
      isAdultVerified: Boolean((ctx.user as any).isAdultVerified),
    };
  }),

  submit: protectedProcedure.input(z.object({
    legalFirstName: z.string().trim().min(1).max(120),
    legalLastName: z.string().trim().min(1).max(120),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    residentialAddress1: z.string().trim().min(5).max(255),
    residentialAddress2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(1).max(120),
    stateRegion: z.string().trim().min(1).max(120),
    postalCode: z.string().trim().min(2).max(32),
    country: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(40),
    adultAttestationAccepted: z.literal(true),
    soleResponsibilityAccepted: z.literal(true),
    consentPolicyAccepted: z.literal(true),
    retentionPolicyAccepted: z.literal(true),
  })).mutation(async ({ ctx, input }) => {
    const profile = await submitAdultWorkspaceProfile(ctx.user.id, input);
    return {
      ok: true,
      profile,
      message: "Adult Workspace profile submitted for administrator review.",
    };
  }),
});

const adminComplianceRouter = router({
  listAdultProfiles: adminProcedure.input(z.object({
    limit: z.number().min(1).max(500).default(100),
  })).query(({ input }) => listAdultProfileReviews(input.limit)),

  reviewAdultProfile: adminProcedure.input(z.object({
    userId: z.number().int().positive(),
    decision: z.enum(["approved", "rejected"]),
    notes: z.string().max(4000).optional().nullable(),
  })).mutation(({ ctx, input }) => reviewAdultProfile({
    adminUserId: ctx.user.id,
    userId: input.userId,
    decision: input.decision,
    notes: input.notes,
    ipAddress: ctx.req.ip,
  })),

  listArchive: adminProcedure.input(z.object({
    workspace: z.enum(["all", "standard", "adult"]).default("all"),
    status: z.string().max(40).optional().nullable(),
    userId: z.number().int().positive().optional().nullable(),
    limit: z.number().min(1).max(500).default(100),
  })).query(({ input }) => listComplianceArchive(input)),

  getArchiveDownloadUrl: adminProcedure.input(z.object({
    archiveId: z.number().int().positive(),
  })).mutation(({ ctx, input }) => getAdminArchiveDownloadUrl({
    adminUserId: ctx.user.id,
    archiveId: input.archiveId,
    ipAddress: ctx.req.ip,
  })),

  setLegalHold: adminProcedure.input(z.object({
    archiveId: z.number().int().positive(),
    legalHold: z.boolean(),
    reason: z.string().max(2000).optional().nullable(),
  })).mutation(({ ctx, input }) => setArchiveLegalHold({
    adminUserId: ctx.user.id,
    archiveId: input.archiveId,
    legalHold: input.legalHold,
    reason: input.reason,
    ipAddress: ctx.req.ip,
  })),

  listIncidents: adminProcedure.input(z.object({
    status: z.enum([
      "all",
      "blocked_pending_review",
      "dismissed",
      "confirmed_violation",
    ]).default("all"),
    limit: z.number().min(1).max(500).default(100),
  })).query(({ input }) => listModerationIncidents(input)),

  dismissIncident: adminProcedure.input(z.object({
    incidentId: z.number().int().positive(),
    notes: z.string().trim().min(3).max(4000),
  })).mutation(({ ctx, input }) => dismissModerationIncident({
    adminUserId: ctx.user.id,
    incidentId: input.incidentId,
    notes: input.notes,
    ipAddress: ctx.req.ip,
  })),

  confirmViolation: adminProcedure.input(z.object({
    incidentId: z.number().int().positive(),
    notes: z.string().trim().min(10).max(4000),
    confirmation: z.literal("CONFIRM PERMANENT DEACTIVATION"),
  })).mutation(({ ctx, input }) => confirmModerationViolation({
    adminUserId: ctx.user.id,
    incidentId: input.incidentId,
    notes: input.notes,
    ipAddress: ctx.req.ip,
  })),

  listBlacklistedUsers: adminProcedure.input(z.object({
    limit: z.number().min(1).max(500).default(200),
  })).query(({ input }) => listBlacklistedUsers(input.limit)),

  listAccessLog: adminProcedure.input(z.object({
    limit: z.number().min(1).max(1000).default(200),
  })).query(({ input }) => listComplianceAccessLog(input.limit)),
});

export const virelleBroadcastRenderRouter = router({
  adultProfile: adultProfileRouter,
  adminCompliance: adminComplianceRouter,

  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const keys = await db.getUserApiKeys(ctx.user.id);
    const status = maskedProviderStatus(keys);
    return {
      ok: true,
      byokRequired: true,
      bridgeConfigured: BRIDGE_CONFIGURED,
      policy: "Virelle membership unlocks orchestration. Rendering and live transformation use the user's provider key.",
      providers: status,
      hasAnyProvider: Object.values(status).some(Boolean),
      supportedProviders: STRICT_BYOK_PROVIDERS,
      supportedDestinations: BROADCAST_DESTINATIONS,
      contentModes: SWAPPYS_CONTENT_MODES,
      adultWorkspaceApproved: await hasApprovedAdultWorkspace(ctx.user.id),
      recordingRequired: true,
      complianceRetentionDays: Math.max(
        90,
        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),
      ),
    };
  }),

  getSwappysHandoff: protectedProcedure
    .input(z.object({
      swappysJobId: z.number().optional(),
      sceneId: z.number().optional(),
    }).refine(
      (value) => Boolean(value.swappysJobId || value.sceneId),
      "A Swappys job or scene is required.",
    ))
    .query(async ({ ctx, input }) => {
      requireVfxStudioTier(ctx.user as any, "creator", "Swappys Broadcast Handoff");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const handoff = await loadSwappysHandoff(dbConn, ctx.user.id, input);
      if (!handoff) throw new TRPCError({ code: "NOT_FOUND", message: "No Swappys output was found for this job or scene." });
      if (handoff.contentMode === "open_adult") await assertAdultWorkspaceAccess(ctx.user.id);
      return handoff;
    }),

  createStudioRenderJob: protectedProcedure
    .input(createJobInput)
    .mutation(async ({ ctx, input }) => {
      requireVfxStudioTier(ctx.user as any, "creator", "Virelle Studio Render");
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await ensureBroadcastRenderTables(dbConn);
      const resolved = await resolveJobInput(dbConn, ctx.user.id, input);
      await validateResolvedJob(ctx, resolved, false);

      if (!resolved.sourceVideoUrl && resolved.sourceImageUrls.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Studio Render requires source video, source images, or a Swappys handoff.",
        });
      }
      if (resolved.projectId) {
        const project = await db.getProjectById(resolved.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project access denied." });
      }
      const provider = await requireStrictByokProvider(ctx.user.id, resolved.requestedProvider);
      const orchestrationCredits = 8;
      if ((ctx.user as any).role !== "admin") {
        try {
          await db.deductCredits(
            ctx.user.id,
            orchestrationCredits,
            "virelle_studio_render_orchestration",
            `BYOK Studio Render orchestration: ${resolved.transformGoal}`,
          );
        } catch (error: any) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error?.message || "Insufficient Virelle credits for render orchestration.",
          });
        }
      }
      const metadata = {
        byok: true,
        costPolicy: "provider_cost_paid_by_user_key",
        mode: "studio_render",
        sourceSwappysJobId: resolved.sourceSwappysJobId,
        contentMode: resolved.contentMode,
        transformGoal: resolved.transformGoal,
        targetAge: resolved.targetAge,
        targetPresentation: resolved.targetPresentation,
        publicFigureLikeness: resolved.publicFigureLikeness,
        aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
        complianceArchive: { required: true, retentionDays: 90 },
        media: {
          sourceVideoUrl: resolved.sourceVideoUrl || null,
          referenceVideoUrl: resolved.referenceVideoUrl || null,
          sourceImageUrls: resolved.sourceImageUrls,
          referenceImageUrls: resolved.referenceImageUrls,
        },
        nextWorkerStep: "submit_to_user_byok_provider_then_poll_status",
      };
      const result: any = await dbConn.execute(sql`
        INSERT INTO virelle_video_transform_jobs
          (userId, projectId, sceneId, sourceSwappysJobId, mode, status,
           provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls,
           referenceImageUrls, transformGoal, targetAge, targetPresentation,
           contentMode, allSubjectsAdultsConfirmed, publicFigureLikeness,
           aiGeneratedCharactersOnly, directorNotes, consentConfirmed,
           visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
        VALUES
          (${ctx.user.id}, ${resolved.projectId}, ${resolved.sceneId},
           ${resolved.sourceSwappysJobId}, 'studio_render', 'queued', ${provider},
           ${resolved.sourceVideoUrl}, ${resolved.referenceVideoUrl},
           ${JSON.stringify(resolved.sourceImageUrls)},
           ${JSON.stringify(resolved.referenceImageUrls)}, ${resolved.transformGoal},
           ${resolved.targetAge}, ${resolved.targetPresentation}, ${resolved.contentMode},
           ${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           ${resolved.publicFigureLikeness ? 1 : 0},
           ${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           ${resolved.directorNotes}, ${resolved.consentConfirmed ? 1 : 0},
           ${resolved.hideVisibleWatermark ? "internal_provenance_only" : "visible_ai_mark_required"},
           1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
      `);
      const jobId = result?.[0]?.insertId ?? result?.insertId ?? null;
      logger.info(`[VirelleRender] queued job=${jobId} user=${ctx.user.id} provider=${provider} workspace=${resolved.contentMode}`);
      return {
        ok: true,
        jobId,
        status: "queued",
        mode: "studio_render",
        provider,
        workspace: resolved.contentMode === "open_adult" ? "adult" : "standard",
        byokRequired: true,
        orchestrationCredits,
        sourceSwappysJobId: resolved.sourceSwappysJobId,
      };
    }),

  createBroadcastSession: protectedProcedure.input(createJobInput.extend({
    durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(30),
    channels: z.array(z.object({
      destination: z.enum(BROADCAST_DESTINATIONS),
      ingestUrl: z.string().max(2000).optional().nullable(),
      streamKey: z.string().max(300).optional().nullable(),
    })).min(1).max(5),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast Mode");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    const resolved = await resolveJobInput(dbConn, ctx.user.id, input);
    await validateResolvedJob(ctx, resolved, true);

    const minimumAvatarAge = resolved.contentMode === "open_adult" ? 18 : 16;
    if (resolved.transformGoal === "adult_to_child") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Child-transform goals are not permitted in live Broadcast mode.",
      });
    }
    if (resolved.targetAge != null && resolved.targetAge < minimumAvatarAge) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Broadcast avatar target age must be ${minimumAvatarAge} or older.`,
      });
    }
    if (resolved.transformGoal === "younger_self" && resolved.targetAge == null) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Younger-self broadcasts require an explicit target age of ${minimumAvatarAge} or older.`,
      });
    }

    const normalizedChannels = normalizeChannels(input.channels as BroadcastChannel[]);
    const provider = await requireStrictByokProvider(ctx.user.id, resolved.requestedProvider);
    const orchestrationCredits = ({ 30: 5, 60: 10, 120: 18 } as Record<number, number>)[input.durationMinutes] ?? 5;
    if ((ctx.user as any).role !== "admin") {
      try {
        await db.deductCredits(
          ctx.user.id,
          orchestrationCredits,
          "virelle_broadcast_orchestration",
          `BYOK Broadcast orchestration (${input.durationMinutes}min)`,
        );
      } catch (error: any) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: error?.message || "Insufficient Virelle credits for broadcast orchestration.",
        });
      }
    }

    const encryptedChannels = encryptApiKey(JSON.stringify(normalizedChannels));
    const redacted = redactChannels(normalizedChannels);
    const metadata = {
      byok: true,
      costPolicy: "provider_cost_paid_by_user_key",
      mode: "broadcast",
      durationMinutes: input.durationMinutes,
      channels: redacted,
      sourceSwappysJobId: resolved.sourceSwappysJobId,
      contentMode: resolved.contentMode,
      transformGoal: resolved.transformGoal,
      publicFigureLikeness: resolved.publicFigureLikeness,
      aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
      recording: {
        required: true,
        userDownloadRequired: true,
        complianceArchiveRequired: true,
        retentionDays: 90,
      },
      nextWorkerStep: BRIDGE_CONFIGURED
        ? "submit_to_configured_broadcast_bridge"
        : "await_broadcast_bridge_configuration",
      safety: {
        consentConfirmed: resolved.consentConfirmed,
        allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
        visibleMark: resolved.hideVisibleWatermark
          ? "creator_internal_provenance"
          : "visible_ai_mark_required",
        broadcastMinAvatarAge: minimumAvatarAge,
        ageFloorEnforced: true,
      },
    };
    const primary = normalizedChannels[0];
    const result: any = await dbConn.execute(sql`
      INSERT INTO virelle_video_transform_jobs
        (userId, projectId, sceneId, sourceSwappysJobId, mode, status, provider,
         sourceVideoUrl, referenceVideoUrl, sourceImageUrls, referenceImageUrls,
         transformGoal, targetAge, targetPresentation, contentMode,
         allSubjectsAdultsConfirmed, publicFigureLikeness,
         aiGeneratedCharactersOnly, broadcastDestination, ingestUrl,
         streamKeyMasked, broadcastChannelsEncrypted, recordingRequired,
         directorNotes, consentConfirmed, visibleWatermarkMode, byokRequired,
         orchestrationCredits, metadata)
      VALUES
        (${ctx.user.id}, ${resolved.projectId}, ${resolved.sceneId},
         ${resolved.sourceSwappysJobId}, 'broadcast', 'broadcast_ready', ${provider},
         ${resolved.sourceVideoUrl}, ${resolved.referenceVideoUrl},
         ${JSON.stringify(resolved.sourceImageUrls)},
         ${JSON.stringify(resolved.referenceImageUrls)}, ${resolved.transformGoal},
         ${resolved.targetAge}, ${resolved.targetPresentation}, ${resolved.contentMode},
         ${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
         ${resolved.publicFigureLikeness ? 1 : 0},
         ${resolved.aiGeneratedCharactersOnly ? 1 : 0},
         ${primary.destination}, ${primary.ingestUrl}, ${maskStreamKey(primary.streamKey)},
         ${encryptedChannels}, 1, ${resolved.directorNotes},
         ${resolved.consentConfirmed ? 1 : 0},
         ${resolved.hideVisibleWatermark ? "internal_provenance_only" : "visible_ai_mark_required"},
         1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
    `);
    const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
    logger.info(`[VirelleBroadcast] configured session=${sessionId} user=${ctx.user.id} workspace=${resolved.contentMode} outputs=${normalizedChannels.length}`);
    return {
      ok: true,
      sessionId,
      status: "broadcast_ready",
      mode: "broadcast",
      provider,
      channels: redacted,
      bridgeConfigured: BRIDGE_CONFIGURED,
      recordingRequired: true,
      userDownloadAvailableWhenFinished: true,
      complianceArchiveRetentionDays: 90,
      byokRequired: true,
      orchestrationCredits,
      sourceSwappysJobId: resolved.sourceSwappysJobId,
    };
  }),

  completeBroadcastSession: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    recordingUrl: z.string().url(),
  })).mutation(async ({ ctx, input }) => {
    const recordingUrl = safeMediaUrl(input.recordingUrl);
    if (!recordingUrl) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "A secure HTTPS recording URL is required." });
    }
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT id, contentMode FROM virelle_video_transform_jobs
      WHERE id=${input.id} AND userId=${ctx.user.id} AND mode='broadcast' LIMIT 1
    `);
    const row = (Array.isArray(rows[0]) ? rows[0] : rows)?.[0];
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Broadcast session not found." });
    if (row.contentMode === "open_adult") await assertAdultWorkspaceAccess(ctx.user.id);
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='completed', outputVideoUrl=${recordingUrl},
          broadcastCompletedAt=NOW(), updatedAt=NOW(), errorMessage=NULL
      WHERE id=${input.id} AND userId=${ctx.user.id}
    `);
    return {
      ok: true,
      status: "completed",
      recordingUrl,
      downloadUrl: recordingUrl,
      complianceArchiveQueued: true,
      complianceRetentionDays: 90,
    };
  }),

  listJobs: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    sceneId: z.number().optional(),
    mode: z.enum(["broadcast", "studio_render"]).optional(),
    workspace: z.enum(["standard", "adult"]).optional(),
    limit: z.number().min(1).max(100).default(25),
  })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    await ensureBroadcastRenderTables(dbConn);
    const contentMode = input.workspace === "adult" ? "open_adult"
      : input.workspace === "standard" ? "standard"
      : null;
    if (contentMode === "open_adult") await assertAdultWorkspaceAccess(ctx.user.id);
    const rows: any = await dbConn.execute(sql`
      SELECT id, projectId, sceneId, sourceSwappysJobId, mode, status,
             provider, providerJobId, transformGoal, targetAge,
             targetPresentation, contentMode, outputVideoUrl, previewImageUrl,
             broadcastDestination, ingestUrl, streamKeyMasked,
             visibleWatermarkMode, byokRequired, orchestrationCredits,
             recordingRequired, broadcastStartedAt, broadcastCompletedAt,
             errorMessage, metadata, createdAt, updatedAt
      FROM virelle_video_transform_jobs
      WHERE userId=${ctx.user.id}
        AND (${input.projectId || null} IS NULL OR projectId=${input.projectId || null})
        AND (${input.sceneId || null} IS NULL OR sceneId=${input.sceneId || null})
        AND (${input.mode || null} IS NULL OR mode=${input.mode || null})
        AND (${contentMode} IS NULL OR contentMode=${contentMode})
      ORDER BY id DESC LIMIT ${input.limit}
    `);
    return Array.isArray(rows[0]) ? rows[0] : rows;
  }),

  getJob: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT id, projectId, sceneId, sourceSwappysJobId, mode, status,
             provider, providerJobId, sourceVideoUrl, referenceVideoUrl,
             sourceImageUrls, referenceImageUrls, transformGoal, targetAge,
             targetPresentation, contentMode, outputVideoUrl, previewImageUrl,
             broadcastDestination, ingestUrl, streamKeyMasked, directorNotes,
             consentConfirmed, visibleWatermarkMode, byokRequired,
             orchestrationCredits, recordingRequired, broadcastStartedAt,
             broadcastCompletedAt, errorMessage, metadata, createdAt, updatedAt
      FROM virelle_video_transform_jobs
      WHERE id=${input.id} AND userId=${ctx.user.id} LIMIT 1
    `);
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    if (!data?.[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    if (data[0].contentMode === "open_adult") await assertAdultWorkspaceAccess(ctx.user.id);
    return data[0];
  }),

  cancelJob: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "creator", "Virelle Broadcast / Studio Render");
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    await ensureBroadcastRenderTables(dbConn);
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='cancelled', updatedAt=NOW()
      WHERE id=${input.id} AND userId=${ctx.user.id}
        AND status IN ('queued','waiting_for_provider','processing','broadcast_ready')
    `);
    return { ok: true };
  }),
});
