import crypto from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import * as db from "./db";
import { logger } from "./_core/logger";
import { requireVfxStudioTier } from "./_core/vfxStudioMiddleware";
import { encryptApiKey } from "./_core/securityEngine";
import { stripe } from "./_core/subscription";
import {
  attachBroadcastReservationToJob,
  createBroadcastMinuteCheckout,
  getBroadcastMinuteWallet,
  releaseBroadcastMinuteReservation,
  reserveBroadcastMinutes,
} from "./_core/broadcastMinutes";
import {
  calculateAge,
  getMatureAccessProfile,
  getMatureAccessStatus,
  legalNamesMatch,
  recordCardNameResult,
  recordCardSession,
  recordIdentitySession,
  recordIdentityVerified,
  recordPhoneVerified,
  upsertMatureAccessProfile,
} from "./_core/matureAccess";
import {
  assertSwappysCreativePolicy,
  SWAPPYS_CONTENT_MODES,
  type SwappysContentMode,
} from "./_core/swappysPolicy";
import {
  confirmModerationViolation,
  dismissModerationIncident,
  getAdminArchiveDownloadUrl,
  listBlacklistedUsers,
  listComplianceAccessLog,
  listComplianceArchive,
  listModerationIncidents,
  screenContentRequest,
  setArchiveLegalHold,
} from "./_core/contentCompliance";
import { runComplianceArchiveCycle } from "./compliance-archive-worker";

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
const ADULT_BROADCAST_DESTINATIONS = new Set([
  "rtmp_onlyfans",
  "rtmp_fansly",
  "rtmp_chaturbate",
]);
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
const PHONE_VERIFY_CONFIGURED = Boolean(
  process.env.TWILIO_ACCOUNT_SID
  && process.env.TWILIO_AUTH_TOKEN
  && process.env.TWILIO_VERIFY_SERVICE_SID,
);
const CONSENT_ATTESTATION_VERSION = "likeness-consent-2026-07";

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
      recordingRequired TINYINT(1) NOT NULL DEFAULT 1,
      broadcastStartedAt DATETIME NULL,
      broadcastCompletedAt DATETIME NULL,
      directorNotes TEXT NULL,
      consentConfirmed TINYINT(1) NOT NULL DEFAULT 0,
      consentAttestationVersion VARCHAR(64) NOT NULL DEFAULT 'likeness-consent-2026-07',
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
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN recordingRequired TINYINT(1) NOT NULL DEFAULT 1`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastStartedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastCompletedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN consentAttestationVersion VARCHAR(64) NOT NULL DEFAULT 'likeness-consent-2026-07'`,
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
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return null;
    }
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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Broadcast ingest URL is invalid.",
    });
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
    if (
      ["rtmp", "rtmp_onlyfans", "rtmp_fansly", "rtmp_chaturbate"]
        .includes(channel.destination)
      && !streamKey
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `A stream key is required for ${channel.destination}.`,
      });
    }
    if (streamKey && streamKey.length > 300) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Stream key is too long.",
      });
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

function safeReturnUrl(raw: string): string {
  const value = new URL(raw);
  const productionHosts = new Set(["virelle.life", "www.virelle.life"]);
  if (
    process.env.NODE_ENV === "production"
    && (value.protocol !== "https:" || !productionHosts.has(value.hostname))
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Return URL must use the Virelle Studios domain.",
    });
  }
  if (!["https:", "http:"].includes(value.protocol)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Return URL is invalid." });
  }
  value.searchParams.set("adult", "1");
  return value.toString();
}

async function twilioVerify(
  verifyPath: string,
  values: Record<string, string>,
): Promise<any> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
  if (!accountSid || !authToken || !serviceSid) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "PHONE_2FA_NOT_CONFIGURED: Twilio Verify must be configured before Adult Studio access can be granted.",
    });
  }
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}${verifyPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(values),
    },
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.warn("[MatureAccess] Twilio Verify request failed", {
      status: response.status,
      code: result?.code,
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result?.message || "Phone verification failed.",
    });
  }
  return result;
}

function bridgeTokenMatches(authorization: unknown): boolean {
  const expected = process.env.BROADCAST_BRIDGE_TOKEN || "";
  const supplied = String(authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 24 || supplied.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
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
        LEFT JOIN scene_vfx_data v
          ON v.sceneId=s.sceneId AND v.userId=s.userId
        WHERE s.id=${input.swappysJobId} AND s.userId=${userId}
        LIMIT 1
      `)
    : await dbConn.execute(sql`
        SELECT s.id, s.projectId, s.sceneId, s.sourcePlateUrl,
               s.actorReferenceUrl, s.consentConfirmed, s.metadata,
               v.enhancedImageUrl
        FROM scene_swappys_exports s
        LEFT JOIN scene_vfx_data v
          ON v.sceneId=s.sceneId AND v.userId=s.userId
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

const matureProfileInput = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().regex(
    /^\+[1-9]\d{7,14}$/,
    "Use international E.164 format, for example +61412345678.",
  ),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2).max(128),
  stateRegion: z.string().trim().min(2).max(128),
  postcode: z.string().trim().min(2).max(32),
  country: z.string().trim().min(2).max(128),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultAttestationAccepted: z.literal(true),
  responsibilityAccepted: z.literal(true),
  consentPolicyAccepted: z.literal(true),
  archiveRetentionAccepted: z.literal(true),
});

async function resolveJobInput(
  dbConn: any,
  userId: number,
  input: CreateJobInput,
) {
  const handoff = await loadSwappysHandoff(dbConn, userId, {
    swappysJobId: input.sourceSwappysJobId,
    sceneId: input.sourceSwappysJobId ? null : input.sceneId,
  });
  const sourceImages = input.sourceImageUrls.length
    ? input.sourceImageUrls
    : handoff?.sourcePlateUrl ? [handoff.sourcePlateUrl] : [];
  const referenceImages = input.referenceImageUrls.length
    ? input.referenceImageUrls
    : [handoff?.enhancedImageUrl, handoff?.actorReferenceUrl]
      .filter(Boolean) as string[];
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
    targetPresentation: input.targetPresentation
      ?? handoff?.targetPresentation
      ?? null,
    contentMode: input.contentMode === "standard" && handoff
      ? handoff.contentMode
      : input.contentMode,
    consentConfirmed: input.consentConfirmed
      || Boolean(handoff?.consentConfirmed),
  };
}

async function validateResolvedJob(
  dbConn: any,
  ctx: any,
  resolved: Awaited<ReturnType<typeof resolveJobInput>>,
  broadcast: boolean,
  aiAssisted = true,
) {
  const workspace = resolved.contentMode === "open_adult" ? "adult" : "standard";
  const matureStatus = workspace === "adult"
    ? await getMatureAccessStatus(dbConn, ctx.user as any)
    : null;
  const policyUser = {
    ...ctx.user,
    isAdultVerified: matureStatus?.accessGranted
      ?? (ctx.user as any).isAdultVerified,
  };
  const policyText = [resolved.targetPresentation, resolved.directorNotes]
    .filter(Boolean)
    .join("\n");

  await screenContentRequest({
    userId: ctx.user.id,
    workspace,
    sourceType: broadcast ? "broadcast_session" : "studio_render",
    sourceId: resolved.sceneId || resolved.projectId || null,
    text: policyText,
    targetAge: resolved.targetAge,
    publicFigureLikeness: resolved.publicFigureLikeness,
  });
  if (!broadcast || aiAssisted) {
    assertSwappysCreativePolicy({
      user: policyUser,
    contentMode: resolved.contentMode,
    consentConfirmed: resolved.consentConfirmed,
    allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
    transformGoal: resolved.transformGoal,
    targetAge: resolved.targetAge,
    targetPresentation: resolved.targetPresentation,
    directorNotes: resolved.directorNotes,
    broadcast,
    publicFigureLikeness: resolved.publicFigureLikeness,
      aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
    });
  }
  return matureStatus;
}

const adminComplianceRouter = router({
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

  runArchiveCycle: adminProcedure.mutation(async () => {
    await runComplianceArchiveCycle();
    return { ok: true };
  }),
});

export const virelleBroadcastRenderRouter = router({
  adminCompliance: adminComplianceRouter,

  getMatureAccessStatus: protectedProcedure.query(async ({ ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const status = await getMatureAccessStatus(dbConn, ctx.user as any);
    return {
      ...status,
      phoneProviderConfigured: PHONE_VERIFY_CONFIGURED,
      stripeConfigured: Boolean(stripe),
      identityVerificationConfigured: Boolean(stripe),
      complianceRetentionDays: Math.max(
        90,
        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),
      ),
      policy: {
        explicitAdultContentAllowedInAdultStudio: true,
        standardExplicitContentAllowed: false,
        sexualisedMinorContentAllowed: false,
        nonSexualAgeAppropriateMinorScenesAllowedInStandard: true,
        realPersonConsentRequired: true,
        publicFigureAdultContentAllowed: false,
        ageRegressionBelow18AllowedInAdultStudio: false,
      },
    };
  }),

  saveMatureAccessProfile: protectedProcedure
    .input(matureProfileInput)
    .mutation(async ({ ctx, input }) => {
      const accountEmail = String(ctx.user.email || "").trim().toLowerCase();
      if (!accountEmail || accountEmail !== input.email.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The Adult Studio email must match the signed-in Virelle account.",
        });
      }
      if (calculateAge(input.dateOfBirth) < 18) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The Adult Studio is available only to individuals aged 18 or older.",
        });
      }
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }
      await upsertMatureAccessProfile(dbConn, ctx.user as any, input);
      return getMatureAccessStatus(dbConn, ctx.user as any);
    }),

  sendMaturePhoneCode: protectedProcedure.mutation(async ({ ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const status = await getMatureAccessStatus(dbConn, ctx.user as any);
    if (!status.paidMembership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "PAID_MEMBERSHIP_REQUIRED: An active paid Virelle membership is required.",
      });
    }
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    if (!profile?.phone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Save your individual legal profile and phone number first.",
      });
    }
    await twilioVerify("/Verifications", {
      To: String(profile.phone),
      Channel: "sms",
    });
    return { ok: true };
  }),

  verifyMaturePhoneCode: protectedProcedure.input(z.object({
    code: z.string().regex(/^\d{4,10}$/),
  })).mutation(async ({ ctx, input }) => {
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    if (!profile?.phone) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Save your phone number first.",
      });
    }
    const result = await twilioVerify("/VerificationCheck", {
      To: String(profile.phone),
      Code: input.code,
    });
    if (result?.status !== "approved") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The phone verification code was not approved.",
      });
    }
    await recordPhoneVerified(dbConn, ctx.user.id);
    return getMatureAccessStatus(dbConn, ctx.user as any);
  }),

  createMatureIdentitySession: protectedProcedure.input(z.object({
    returnUrl: z.string().url().max(1000),
  })).mutation(async ({ ctx, input }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe Identity is not configured.",
      });
    }
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const status = await getMatureAccessStatus(dbConn, ctx.user as any);
    if (
      !status.paidMembership
      || !status.profileComplete
      || !status.adultAgeConfirmed
      || !status.adultAttestationAccepted
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Complete a paid membership and valid individual 18+ profile before identity verification.",
      });
    }
    const returnUrl = safeReturnUrl(input.returnUrl);
    const session: any = await stripe.identity.verificationSessions.create({
      type: "document",
      options: { document: { require_matching_selfie: true } },
      metadata: { userId: String(ctx.user.id), type: "mature_access" },
      return_url: returnUrl,
    } as any);
    await recordIdentitySession(dbConn, ctx.user.id, session.id);
    return { url: session.url, sessionId: session.id };
  }),

  refreshMatureIdentityStatus: protectedProcedure.mutation(async ({ ctx }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe Identity is not configured.",
      });
    }
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    if (!profile?.identityVerificationSessionId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No identity verification session exists.",
      });
    }
    const session: any = await stripe.identity.verificationSessions.retrieve(
      String(profile.identityVerificationSessionId),
    );
    if (
      session?.metadata?.userId
      && Number(session.metadata.userId) !== ctx.user.id
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Identity verification ownership mismatch.",
      });
    }
    if (session.status === "verified") {
      await recordIdentityVerified(dbConn, ctx.user.id);
    }
    return {
      verificationStatus: session.status,
      ...(await getMatureAccessStatus(dbConn, ctx.user as any)),
    };
  }),

  createMatureCardVerification: protectedProcedure.input(z.object({
    returnUrl: z.string().url().max(1000),
  })).mutation(async ({ ctx, input }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured.",
      });
    }
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const status = await getMatureAccessStatus(dbConn, ctx.user as any);
    if (!status.paidMembership || !status.profileComplete) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Complete a paid membership and individual legal profile before card-name verification.",
      });
    }
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    let customerId = String((ctx.user as any).stripeCustomerId || "");
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: String(ctx.user.email || profile.email),
        name: String(profile.fullName),
        phone: String(profile.phone),
        address: {
          line1: String(profile.addressLine1),
          line2: profile.addressLine2
            ? String(profile.addressLine2)
            : undefined,
          city: String(profile.city),
          state: String(profile.stateRegion),
          postal_code: String(profile.postcode),
          country: String(profile.country).length === 2
            ? String(profile.country).toUpperCase()
            : undefined,
        },
        metadata: { userId: String(ctx.user.id) },
      });
      customerId = customer.id;
      await db.updateUser(
        ctx.user.id,
        { stripeCustomerId: customerId } as any,
      );
    }
    const returnUrl = safeReturnUrl(input.returnUrl);
    const separator = returnUrl.includes("?") ? "&" : "?";
    const session: any = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      success_url: `${returnUrl}${separator}adult_card_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}${separator}adult_card_cancelled=1`,
      metadata: {
        userId: String(ctx.user.id),
        type: "mature_access_card_name",
      },
    } as any);
    await recordCardSession(dbConn, ctx.user.id, session.id);
    return { url: session.url, sessionId: session.id };
  }),

  verifyMatureCardSession: protectedProcedure.input(z.object({
    sessionId: z.string().min(8).max(255),
  })).mutation(async ({ ctx, input }) => {
    if (!stripe) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Stripe is not configured.",
      });
    }
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    if (
      !profile
      || String(profile.cardVerificationSessionId || "") !== input.sessionId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Card verification session does not belong to this account.",
      });
    }
    const session: any = await stripe.checkout.sessions.retrieve(
      input.sessionId,
      { expand: ["setup_intent.payment_method"] } as any,
    );
    if (
      session?.metadata?.userId
      && Number(session.metadata.userId) !== ctx.user.id
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Card verification ownership mismatch.",
      });
    }
    if (session.status !== "complete") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Card verification checkout is not complete.",
      });
    }
    const setupIntent = session.setup_intent as any;
    const paymentMethod = setupIntent?.payment_method as any;
    const cardholderName = String(
      paymentMethod?.billing_details?.name
      || session.customer_details?.name
      || "",
    ).trim();
    if (!cardholderName) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Stripe did not return a cardholder name. Repeat verification and enter the legal cardholder name.",
      });
    }
    const matched = legalNamesMatch(String(profile.fullName), cardholderName);
    await recordCardNameResult(
      dbConn,
      ctx.user.id,
      cardholderName,
      matched,
    );
    if (!matched) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cardholder name does not match the registered legal name.",
      });
    }
    return getMatureAccessStatus(dbConn, ctx.user as any);
  }),

  getByokStatus: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast / Studio Render",
    );
    const keys = await db.getUserApiKeys(ctx.user.id);
    const status = maskedProviderStatus(keys);
    return {
      ok: true,
      byokRequired: false,
      byokRequiredForStudioRender: true,
      byokRequiredForAiAssistedBroadcast: true,
      bridgeConfigured: BRIDGE_CONFIGURED,
      recordingRequired: true,
      complianceRetentionDays: Math.max(
        90,
        Number(process.env.COMPLIANCE_RETENTION_DAYS || 90),
      ),
      policy: "Plain direct or managed broadcasting does not require BYOK. Studio Render and AI-assisted live transformations use the user's funded provider key.",
      providers: status,
      hasAnyProvider: Object.values(status).some(Boolean),
      supportedProviders: STRICT_BYOK_PROVIDERS,
      supportedDestinations: BROADCAST_DESTINATIONS,
      contentModes: SWAPPYS_CONTENT_MODES,
    };
  }),

  getBroadcastMinuteWallet: protectedProcedure.query(async ({ ctx }) => {
    requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    return getBroadcastMinuteWallet(dbConn, ctx.user as any);
  }),

  createBroadcastMinuteCheckout: protectedProcedure.input(z.object({
    packId: z.enum(["relay_120", "relay_600", "relay_1500", "relay_3600"]),
    returnUrl: z.string().url().max(1000),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(ctx.user as any, "indie", "Virelle Broadcast");
    const statusDb = await db.getDb();
    if (!statusDb) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    }
    const matureStatus = await getMatureAccessStatus(statusDb, ctx.user as any);
    if (!matureStatus.accessGranted) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Verified Adult Studio access is required to purchase managed broadcast minutes.",
      });
    }
    const returnUrl = safeReturnUrl(input.returnUrl);
    const separator = returnUrl.includes("?") ? "&" : "?";
    return createBroadcastMinuteCheckout({
      user: ctx.user as any,
      packId: input.packId,
      successUrl: returnUrl + separator + "broadcast_minutes=success&pack=" + input.packId,
      cancelUrl: returnUrl + separator + "broadcast_minutes=cancelled",
    });
  }),

  getSwappysHandoff: protectedProcedure.input(z.object({
    swappysJobId: z.number().optional(),
    sceneId: z.number().optional(),
  }).refine(
    (value) => Boolean(value.swappysJobId || value.sceneId),
    "A Swappys job or scene is required.",
  )).query(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "creator",
      "Swappys Broadcast Handoff",
    );
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    const handoff = await loadSwappysHandoff(dbConn, ctx.user.id, input);
    if (!handoff) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No Swappys output was found for this job or scene.",
      });
    }
    if (handoff.contentMode === "open_adult") {
      const matureStatus = await getMatureAccessStatus(dbConn, ctx.user as any);
      if (!matureStatus.accessGranted) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verified Adult Studio access is required for this handoff.",
        });
      }
    }
    return handoff;
  }),

  createStudioRenderJob: protectedProcedure
    .input(createJobInput)
    .mutation(async ({ ctx, input }) => {
      requireVfxStudioTier(
        ctx.user as any,
        "creator",
        "Virelle Studio Render",
      );
      const dbConn = await db.getDb();
      if (!dbConn) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });
      }
      await ensureBroadcastRenderTables(dbConn);
      const resolved = await resolveJobInput(dbConn, ctx.user.id, input);
      const matureStatus = await validateResolvedJob(
        dbConn,
        ctx,
        resolved,
        false,
      );
      if (!resolved.sourceVideoUrl && resolved.sourceImageUrls.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Studio Render requires source video, source images, or a Swappys handoff.",
        });
      }
      if (resolved.projectId) {
        const project = await db.getProjectById(
          resolved.projectId,
          ctx.user.id,
        );
        if (!project) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Project access denied.",
          });
        }
      }
      const provider = await requireStrictByokProvider(
        ctx.user.id,
        resolved.requestedProvider,
      );
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
            message: error?.message
              || "Insufficient Virelle credits for render orchestration.",
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
        policyVersion: "adult-workspace-2026-07",
        consentAttestation: {
          version: CONSENT_ATTESTATION_VERSION,
          acceptedAt: new Date().toISOString(),
          consentConfirmed: resolved.consentConfirmed,
          allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
          aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
        },
        complianceArchive: {
          required: true,
          minimumRetentionDays: 90,
          userDownloadPreserved: true,
        },
        media: {
          sourceVideoUrl: resolved.sourceVideoUrl || null,
          referenceVideoUrl: resolved.referenceVideoUrl || null,
          sourceImageUrls: resolved.sourceImageUrls,
          referenceImageUrls: resolved.referenceImageUrls,
        },
        safety: {
          matureAccessVerified: matureStatus?.accessGranted ?? false,
          sexualisedMinorContentAllowed: false,
          publicFigureAdultContentAllowed: false,
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
           consentAttestationVersion, visibleWatermarkMode, byokRequired,
           orchestrationCredits, metadata)
        VALUES
          (${ctx.user.id}, ${resolved.projectId}, ${resolved.sceneId},
           ${resolved.sourceSwappysJobId}, 'studio_render', 'queued', ${provider},
           ${resolved.sourceVideoUrl}, ${resolved.referenceVideoUrl},
           ${JSON.stringify(resolved.sourceImageUrls)},
           ${JSON.stringify(resolved.referenceImageUrls)},
           ${resolved.transformGoal}, ${resolved.targetAge},
           ${resolved.targetPresentation}, ${resolved.contentMode},
           ${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           ${resolved.publicFigureLikeness ? 1 : 0},
           ${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           ${resolved.directorNotes}, ${resolved.consentConfirmed ? 1 : 0},
           ${CONSENT_ATTESTATION_VERSION},
           ${resolved.hideVisibleWatermark
             ? "internal_provenance_only"
             : "visible_ai_mark_required"},
           1, ${orchestrationCredits}, ${JSON.stringify(metadata)})
      `);
      const jobId = result?.[0]?.insertId ?? result?.insertId ?? null;
      logger.info(
        `[VirelleRender] queued job=${jobId} user=${ctx.user.id} provider=${provider} workspace=${resolved.contentMode}`,
      );
      return {
        ok: true,
        jobId,
        status: "queued",
        mode: "studio_render",
        provider,
        workspace: resolved.contentMode === "open_adult"
          ? "adult"
          : "standard",
        byokRequired: true,
        orchestrationCredits,
        sourceSwappysJobId: resolved.sourceSwappysJobId,
        userDownloadAvailableWhenCompleted: true,
        complianceArchiveRetentionDays: 90,
      };
    }),

  createBroadcastSession: protectedProcedure.input(createJobInput.extend({
    serviceMode: z.enum(["direct", "managed", "ai_assisted"]).default("managed"),
    durationMinutes: z.union([
      z.literal(30),
      z.literal(60),
      z.literal(120),
    ]).default(60),
    channels: z.array(z.object({
      destination: z.enum(BROADCAST_DESTINATIONS),
      ingestUrl: z.string().max(2000).optional().nullable(),
      streamKey: z.string().max(300).optional().nullable(),
    })).min(1).max(5),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast Mode",
    );
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    await ensureBroadcastRenderTables(dbConn);
    const resolved = await resolveJobInput(dbConn, ctx.user.id, input);
    const aiAssisted = input.serviceMode === "ai_assisted";
    const matureStatus = await validateResolvedJob(
      dbConn,
      ctx,
      resolved,
      true,
      aiAssisted,
    );

    if (resolved.contentMode === "open_adult" && input.serviceMode === "direct") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult Studio broadcasts must use managed relay so the required recording and compliance copy can be retained.",
      });
    }
    if (
      resolved.contentMode === "open_adult"
      && ((!resolved.consentConfirmed && !resolved.aiGeneratedCharactersOnly)
        || !resolved.allSubjectsAdultsConfirmed)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Adult broadcasts require consent confirmation and confirmation that every depicted person is at least 18.",
      });
    }
    if (aiAssisted && !resolved.sourceVideoUrl && resolved.sourceImageUrls.length === 0 && !resolved.sourceSwappysJobId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "AI-assisted Broadcast requires source media or a Swappys handoff.",
      });
    }

    if (aiAssisted) {
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
    }

    const normalizedChannels = normalizeChannels(input.channels as BroadcastChannel[]);
    if (
      resolved.contentMode !== "open_adult"
      && normalizedChannels.some((channel) => ADULT_BROADCAST_DESTINATIONS.has(channel.destination))
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Adult-platform broadcast destinations are available only inside the verified Adult Studio.",
      });
    }

    if (input.serviceMode === "direct") {
      const redacted = redactChannels(normalizedChannels);
      const metadata = {
        byok: false,
        serviceMode: "direct",
        costPolicy: "direct_obs_no_virelle_media_charge",
        durationMinutes: 0,
        channels: redacted,
        contentMode: resolved.contentMode,
        recording: { required: false, managedByVirelle: false },
        instructions: [
          "Open OBS Settings, then Stream.",
          "Choose Custom service and paste the destination ingest URL.",
          "Paste the destination stream key directly into OBS.",
          "Start Streaming. Virelle does not receive the stream or charge minutes.",
        ],
      };
      const primary = normalizedChannels[0];
      const result: any = await dbConn.execute(sql`
        INSERT INTO virelle_video_transform_jobs
          (userId, projectId, sceneId, sourceSwappysJobId, mode, status,
           provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls,
           referenceImageUrls, transformGoal, targetAge, targetPresentation,
           contentMode, allSubjectsAdultsConfirmed, publicFigureLikeness,
           aiGeneratedCharactersOnly, broadcastDestination, ingestUrl,
           streamKeyMasked, broadcastChannelsEncrypted, recordingRequired,
           directorNotes, consentConfirmed, consentAttestationVersion,
           visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
        VALUES
          (${ctx.user.id}, ${resolved.projectId}, ${resolved.sceneId},
           ${resolved.sourceSwappysJobId}, 'broadcast', 'direct_ready', 'direct_obs',
           ${resolved.sourceVideoUrl}, ${resolved.referenceVideoUrl},
           ${JSON.stringify(resolved.sourceImageUrls)},
           ${JSON.stringify(resolved.referenceImageUrls)},
           ${resolved.transformGoal}, ${resolved.targetAge},
           ${resolved.targetPresentation}, ${resolved.contentMode},
           ${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           ${resolved.publicFigureLikeness ? 1 : 0},
           ${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           ${primary.destination}, ${primary.ingestUrl},
           ${maskStreamKey(primary.streamKey)}, NULL, 0,
           ${resolved.directorNotes}, ${resolved.consentConfirmed ? 1 : 0},
           ${CONSENT_ATTESTATION_VERSION}, 'none', 0, 0,
           ${JSON.stringify(metadata)})
      `);
      const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
      return {
        ok: true,
        sessionId,
        status: "direct_ready",
        mode: "broadcast",
        serviceMode: "direct",
        provider: "direct_obs",
        channels: redacted,
        bridgeConfigured: false,
        recordingRequired: false,
        byokRequired: false,
        managedMinutesReserved: 0,
        directInstructions: metadata.instructions,
      };
    }

    const provider = aiAssisted
      ? await requireStrictByokProvider(ctx.user.id, resolved.requestedProvider)
      : "relay";
    const reservation = await reserveBroadcastMinutes(
      dbConn,
      ctx.user as any,
      input.durationMinutes,
      {
        serviceMode: input.serviceMode,
        contentMode: resolved.contentMode,
        outputCount: normalizedChannels.length,
      },
    );
    const encryptedChannels = encryptApiKey(JSON.stringify(normalizedChannels));
    const redacted = redactChannels(normalizedChannels);
    const metadata = {
      byok: aiAssisted,
      serviceMode: input.serviceMode,
      reservationKey: reservation.reservationKey,
      costPolicy: aiAssisted
        ? "managed_minutes_plus_provider_cost_paid_by_user_key"
        : "managed_minutes_no_ai_provider_charge",
      mode: "broadcast",
      durationMinutes: input.durationMinutes,
      channels: redacted,
      sourceSwappysJobId: resolved.sourceSwappysJobId,
      contentMode: resolved.contentMode,
      transformGoal: aiAssisted ? resolved.transformGoal : null,
      publicFigureLikeness: resolved.publicFigureLikeness,
      aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
      policyVersion: "adult-workspace-2026-07",
      consentAttestation: {
        version: CONSENT_ATTESTATION_VERSION,
        acceptedAt: new Date().toISOString(),
        consentConfirmed: resolved.consentConfirmed,
        allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
        aiGeneratedCharactersOnly: resolved.aiGeneratedCharactersOnly,
      },
      recording: {
        required: true,
        format: "mp4",
        userDownloadRequired: true,
        privateComplianceCopyRequired: true,
        minimumRetentionDays: 90,
      },
      nextWorkerStep: BRIDGE_CONFIGURED
        ? "submit_to_configured_broadcast_bridge"
        : "await_broadcast_bridge_configuration",
      safety: {
        consentConfirmed: resolved.consentConfirmed,
        allSubjectsAdultsConfirmed: resolved.allSubjectsAdultsConfirmed,
        matureAccessVerified: matureStatus?.accessGranted ?? false,
        sexualisedMinorContentAllowed: false,
        publicFigureAdultContentAllowed: false,
      },
    };
    const primary = normalizedChannels[0];
    try {
      const result: any = await dbConn.execute(sql`
        INSERT INTO virelle_video_transform_jobs
          (userId, projectId, sceneId, sourceSwappysJobId, mode, status,
           provider, sourceVideoUrl, referenceVideoUrl, sourceImageUrls,
           referenceImageUrls, transformGoal, targetAge, targetPresentation,
           contentMode, allSubjectsAdultsConfirmed, publicFigureLikeness,
           aiGeneratedCharactersOnly, broadcastDestination, ingestUrl,
           streamKeyMasked, broadcastChannelsEncrypted, recordingRequired,
           directorNotes, consentConfirmed, consentAttestationVersion,
           visibleWatermarkMode, byokRequired, orchestrationCredits, metadata)
        VALUES
          (${ctx.user.id}, ${resolved.projectId}, ${resolved.sceneId},
           ${resolved.sourceSwappysJobId}, 'broadcast', 'broadcast_ready', ${provider},
           ${resolved.sourceVideoUrl}, ${resolved.referenceVideoUrl},
           ${JSON.stringify(resolved.sourceImageUrls)},
           ${JSON.stringify(resolved.referenceImageUrls)},
           ${resolved.transformGoal}, ${resolved.targetAge},
           ${resolved.targetPresentation}, ${resolved.contentMode},
           ${resolved.allSubjectsAdultsConfirmed ? 1 : 0},
           ${resolved.publicFigureLikeness ? 1 : 0},
           ${resolved.aiGeneratedCharactersOnly ? 1 : 0},
           ${primary.destination}, ${primary.ingestUrl},
           ${maskStreamKey(primary.streamKey)}, ${encryptedChannels}, 1,
           ${resolved.directorNotes}, ${resolved.consentConfirmed ? 1 : 0},
           ${CONSENT_ATTESTATION_VERSION},
           ${resolved.hideVisibleWatermark ? "internal_provenance_only" : "visible_ai_mark_required"},
           ${aiAssisted ? 1 : 0}, 0, ${JSON.stringify(metadata)})
      `);
      const sessionId = result?.[0]?.insertId ?? result?.insertId ?? null;
      await attachBroadcastReservationToJob(dbConn, reservation.reservationKey, sessionId);
      logger.info(
        `[VirelleBroadcast] configured session=${sessionId} user=${ctx.user.id} serviceMode=${input.serviceMode} workspace=${resolved.contentMode} outputs=${normalizedChannels.length}`,
      );
      return {
        ok: true,
        sessionId,
        status: "broadcast_ready",
        mode: "broadcast",
        serviceMode: input.serviceMode,
        provider,
        channels: redacted,
        bridgeConfigured: BRIDGE_CONFIGURED,
        recordingRequired: true,
        userDownloadAvailableWhenCompleted: true,
        complianceArchiveRetentionDays: 90,
        byokRequired: aiAssisted,
        orchestrationCredits: 0,
        managedMinutesReserved: input.durationMinutes,
        remainingManagedMinutes: reservation.availableMinutes,
        sourceSwappysJobId: resolved.sourceSwappysJobId,
      };
    } catch (error) {
      await releaseBroadcastMinuteReservation(
        dbConn,
        reservation.reservationKey,
        "Broadcast configuration failed before the session was created.",
      ).catch(() => undefined);
      throw error;
    }
  }),

  recordBroadcastCompletion: publicProcedure.input(z.object({
    jobId: z.number().int().positive(),
    sessionId: z.string().min(3).max(255),
    status: z.enum(["completed", "failed"]),
    recordingUrl: z.string().url().optional().nullable(),
    previewUrl: z.string().url().optional().nullable(),
    errorMessage: z.string().max(2000).optional().nullable(),
  })).mutation(async ({ ctx, input }) => {
    if (!bridgeTokenMatches(ctx.req.headers.authorization)) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid broadcast bridge credentials.",
      });
    }
    const recordingUrl = input.recordingUrl
      ? safeMediaUrl(input.recordingUrl)
      : null;
    if (input.status === "completed" && !recordingUrl) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A secure HTTPS recording URL is required for completed broadcasts.",
      });
    }
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT id, userId, providerJobId FROM virelle_video_transform_jobs
      WHERE id=${input.jobId} AND mode='broadcast' LIMIT 1
    `);
    const row = (Array.isArray(rows[0]) ? rows[0] : rows)?.[0];
    if (!row || String(row.providerJobId || "") !== input.sessionId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Broadcast session ownership mismatch.",
      });
    }
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status=${input.status},
          outputVideoUrl=${recordingUrl},
          previewImageUrl=COALESCE(${input.previewUrl || null}, previewImageUrl),
          broadcastCompletedAt=${input.status === "completed" ? new Date() : null},
          errorMessage=${input.status === "failed"
            ? input.errorMessage || "Broadcast bridge reported a failure."
            : null},
          updatedAt=NOW()
      WHERE id=${input.jobId}
    `);
    if (input.status === "completed") {
      setTimeout(
        () => runComplianceArchiveCycle().catch(() => undefined),
        100,
      ).unref?.();
    }
    return {
      ok: true,
      status: input.status,
      userDownloadUrl: recordingUrl,
      privateArchiveQueued: input.status === "completed",
    };
  }),

  listJobs: protectedProcedure.input(z.object({
    projectId: z.number().optional(),
    sceneId: z.number().optional(),
    mode: z.enum(["broadcast", "studio_render"]).optional(),
    workspace: z.enum(["standard", "adult"]).optional(),
    limit: z.number().min(1).max(100).default(25),
  })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast / Studio Render",
    );
    const dbConn = await db.getDb();
    if (!dbConn) return [];
    await ensureBroadcastRenderTables(dbConn);
    const contentMode = input.workspace === "adult"
      ? "open_adult"
      : input.workspace === "standard" ? "standard" : null;
    if (contentMode === "open_adult") {
      const matureStatus = await getMatureAccessStatus(dbConn, ctx.user as any);
      if (!matureStatus.accessGranted) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verified Adult Studio access is required.",
        });
      }
    }
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
        AND (${input.projectId || null} IS NULL
          OR projectId=${input.projectId || null})
        AND (${input.sceneId || null} IS NULL
          OR sceneId=${input.sceneId || null})
        AND (${input.mode || null} IS NULL OR mode=${input.mode || null})
        AND (${contentMode} IS NULL OR contentMode=${contentMode})
      ORDER BY id DESC LIMIT ${input.limit}
    `);
    return Array.isArray(rows[0]) ? rows[0] : rows;
  }),

  getJob: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
  })).query(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast / Studio Render",
    );
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    await ensureBroadcastRenderTables(dbConn);
    const rows: any = await dbConn.execute(sql`
      SELECT id, projectId, sceneId, sourceSwappysJobId, mode, status,
             provider, providerJobId, sourceVideoUrl, referenceVideoUrl,
             sourceImageUrls, referenceImageUrls, transformGoal, targetAge,
             targetPresentation, contentMode, outputVideoUrl, previewImageUrl,
             broadcastDestination, ingestUrl, streamKeyMasked, directorNotes,
             consentConfirmed, consentAttestationVersion, visibleWatermarkMode,
             byokRequired, orchestrationCredits, recordingRequired,
             broadcastStartedAt, broadcastCompletedAt, errorMessage, metadata,
             createdAt, updatedAt
      FROM virelle_video_transform_jobs
      WHERE id=${input.id} AND userId=${ctx.user.id} LIMIT 1
    `);
    const data = Array.isArray(rows[0]) ? rows[0] : rows;
    if (!data?.[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    }
    if (data[0].contentMode === "open_adult") {
      const matureStatus = await getMatureAccessStatus(dbConn, ctx.user as any);
      if (!matureStatus.accessGranted) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Verified Adult Studio access is required.",
        });
      }
    }
    return data[0];
  }),

  cancelJob: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
  })).mutation(async ({ ctx, input }) => {
    requireVfxStudioTier(
      ctx.user as any,
      "indie",
      "Virelle Broadcast / Studio Render",
    );
    const dbConn = await db.getDb();
    if (!dbConn) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });
    }
    await ensureBroadcastRenderTables(dbConn);
    const existing: any = await dbConn.execute(sql`
      SELECT mode, metadata FROM virelle_video_transform_jobs
      WHERE id=${input.id} AND userId=${ctx.user.id} LIMIT 1
    `);
    const existingRow = (Array.isArray(existing[0]) ? existing[0] : existing)?.[0];
    await dbConn.execute(sql`
      UPDATE virelle_video_transform_jobs
      SET status='cancelled', updatedAt=NOW()
      WHERE id=${input.id} AND userId=${ctx.user.id}
        AND status IN (
          'queued',
          'waiting_for_provider',
          'processing',
          'broadcast_ready'
        )
    `);
    if (existingRow?.mode === "broadcast") {
      const existingMetadata = safeJson(existingRow.metadata);
      await releaseBroadcastMinuteReservation(
        dbConn,
        existingMetadata?.reservationKey,
        "Broadcast cancelled before managed minutes were consumed.",
      ).catch(() => undefined);
    }
    return { ok: true };
  }),
});
