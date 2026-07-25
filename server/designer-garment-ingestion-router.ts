import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { ensurePortalCommerceSchema, isLamaloBrandName } from "./_core/portalAccess";
import { getDb } from "./db";
import { storagePut } from "./storage";

const HTTPS_URL = z.string().url().refine((value) => value.startsWith("https://"), "An HTTPS URL is required.");
const CAPTURE_VERSION = 1;
const PIPELINE_VERSION = 3;

let schemaReady: Promise<void> | undefined;

function rowsFrom(result: any): any[] {
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return Array.isArray(rows) ? rows : [];
}

function firstRow(result: any): any | undefined {
  return rowsFrom(result)[0];
}

async function connection() {
  await ensurePortalCommerceSchema();
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  return db;
}

async function addColumn(table: string, column: string, definition: string): Promise<void> {
  const db = await connection();
  try {
    await db.execute(sql.raw(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`));
  } catch (error: any) {
    const message = String(error?.message ?? "");
    if (error?.code === "ER_DUP_FIELDNAME" || error?.errno === 1060 || message.includes("Duplicate column")) return;
    throw error;
  }
}

async function ensureIngestionSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = await connection();
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS designerGarmentIngestionJobs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          wardrobeItemId INT NOT NULL,
          userId INT NOT NULL,
          designerProfileId INT NOT NULL,
          captureMode VARCHAR(16) NOT NULL,
          sourceAssetUrls JSON NOT NULL,
          colours JSON NULL,
          materials JSON NULL,
          requestedPublish TINYINT(1) NOT NULL DEFAULT 0,
          status VARCHAR(32) NOT NULL DEFAULT 'queued',
          pipelineVersion INT NOT NULL DEFAULT ${PIPELINE_VERSION},
          captureInstructionsVersion INT NOT NULL DEFAULT ${CAPTURE_VERSION},
          outputManifestUrl TEXT NULL,
          outputArchiveUrl TEXT NULL,
          qualityScore INT NULL,
          failureReason TEXT NULL,
          startedAt TIMESTAMP NULL,
          completedAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_designer_ingestion_status (status, createdAt),
          INDEX idx_designer_ingestion_item (wardrobeItemId),
          INDEX idx_designer_ingestion_user (userId)
        )
      `);
      await addColumn("wardrobeItems", "generationReadinessStatus", "VARCHAR(32) NOT NULL DEFAULT 'not_requested'");
      await addColumn("wardrobeItems", "sourceCaptureMode", "VARCHAR(16) NULL");
      await addColumn("wardrobeItems", "sourceAssetUrls", "JSON NULL");
      await addColumn("wardrobeItems", "generationRequestedPublish", "TINYINT(1) NOT NULL DEFAULT 0");
      await addColumn("wardrobeItems", "backendManifestUrl", "TEXT NULL");
      await addColumn("wardrobeItems", "generationQualityScore", "INT NULL");
    })().catch((error) => {
      schemaReady = undefined;
      throw error;
    });
  }
  return schemaReady;
}

async function requireDesigner(userId: number): Promise<any> {
  await ensureIngestionSchema();
  const db = await connection();
  const profile = firstRow(await db.execute(sql`SELECT * FROM designerProfiles WHERE userId = ${userId} LIMIT 1`));
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Designer registration is required." });
  if (isLamaloBrandName(profile.brandName)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Lamalo catalogue processing is managed by Virelle administration." });
  }
  return profile;
}

function requireAdmin(role: unknown): void {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
}

function parseCapture(dataUrl: string): { buffer: Buffer; contentType: string; extension: string; kind: "image" | "video" } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp)|video\/(?:mp4|quicktime|webm));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a PNG, JPEG, WebP, MP4, MOV or WebM file." });
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const kind = contentType.startsWith("image/") ? "image" : "video";
  const maximum = kind === "image" ? 8 * 1024 * 1024 : 18 * 1024 * 1024;
  if (buffer.length > maximum) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: kind === "image" ? "Each image must be smaller than 8 MB." : "The 360 video must be smaller than 18 MB. Record at 720p or trim it to 8–20 seconds.",
    });
  }
  const extension = contentType === "image/jpeg"
    ? "jpg"
    : contentType === "video/quicktime"
      ? "mov"
      : contentType.split("/")[1];
  return { buffer, contentType, extension, kind };
}

function jsonStrings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim());
  if (typeof value === "string" && value.trim()) {
    try { return jsonStrings(JSON.parse(value)); } catch { return [value.trim()]; }
  }
  return [];
}

export const designerGarmentIngestionRouter = router({
  instructions: protectedProcedure.query(() => ({
    version: CAPTURE_VERSION,
    photoOption: {
      title: "Take 3–6 quick photos",
      steps: [
        "Put the garment on a mannequin or hanger against a plain background.",
        "Photograph the front, back and one side or three-quarter angle.",
        "Keep the full garment in frame and use normal, even room light.",
      ],
    },
    videoOption: {
      title: "One photo plus a short 360° video",
      steps: [
        "Take one clear front photo for the shop.",
        "Record an 8–20 second video while slowly walking once around the mannequin.",
        "Keep the full garment visible. Do not zoom or move the mannequin during the video.",
      ],
    },
    note: "Phone photos are sufficient. Virelle creates the hidden 3D and multi-angle generation pack after upload.",
  })),

  uploadCapture: protectedProcedure
    .input(z.object({
      role: z.enum(["cover", "angle", "video"]),
      dataUrl: z.string().min(1).max(28 * 1024 * 1024),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireDesigner(ctx.user.id);
      const parsed = parseCapture(input.dataUrl);
      if (input.role === "video" && parsed.kind !== "video") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a video file for the 360 capture." });
      if (input.role !== "video" && parsed.kind !== "image") throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an image file for this capture." });
      const random = crypto.randomUUID();
      const key = `designer-garment-captures/user-${ctx.user.id}/${Date.now()}-${random}-${input.role}.${parsed.extension}`;
      try {
        const stored = await storagePut(key, parsed.buffer, parsed.contentType, { public: true });
        return { url: stored.url, kind: parsed.kind, bytes: parsed.buffer.length };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "The capture could not be stored. No paid service was called and no charge was made.",
          cause: error,
        });
      }
    }),

  queue: protectedProcedure
    .input(z.object({
      wardrobeItemId: z.number().int().positive(),
      captureMode: z.enum(["photos", "video"]),
      coverImageUrl: HTTPS_URL,
      angleImageUrls: z.array(HTTPS_URL).max(5).default([]),
      videoUrl: HTTPS_URL.optional().nullable(),
      colours: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
      materials: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
      requestedPublish: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const profile = await requireDesigner(ctx.user.id);
      const db = await connection();
      const item = firstRow(await db.execute(sql`
        SELECT id, name, styleTags FROM wardrobeItems
        WHERE id = ${input.wardrobeItemId} AND userId = ${ctx.user.id} AND designerProfileId = ${profile.id}
        LIMIT 1
      `));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Wardrobe item was not found." });

      if (input.captureMode === "photos" && 1 + input.angleImageUrls.length < 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Upload at least three views: front, back and a side or three-quarter view." });
      }
      if (input.captureMode === "video" && !input.videoUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Upload the short 360° video." });
      }

      const sourceAssets = {
        coverImageUrl: input.coverImageUrl,
        angleImageUrls: input.angleImageUrls,
        videoUrl: input.videoUrl || null,
      };
      const currentTags = jsonStrings(item.styleTags).filter((tag) => !tag.startsWith("generation-pack:") && !tag.startsWith("capture-mode:"));
      const nextTags = Array.from(new Set([
        ...currentTags,
        "designer-garment",
        "generation-pack:queued",
        `capture-mode:${input.captureMode}`,
        "shop-display:primary-image-only",
        "backend-reference-pack:hidden",
      ]));

      const existing = firstRow(await db.execute(sql`
        SELECT id FROM designerGarmentIngestionJobs
        WHERE wardrobeItemId = ${input.wardrobeItemId} AND status IN ('queued', 'processing')
        ORDER BY id DESC LIMIT 1
      `));
      let jobId: number;
      if (existing) {
        jobId = Number(existing.id);
        await db.execute(sql`
          UPDATE designerGarmentIngestionJobs SET
            captureMode = ${input.captureMode}, sourceAssetUrls = CAST(${JSON.stringify(sourceAssets)} AS JSON),
            colours = CAST(${JSON.stringify(input.colours)} AS JSON), materials = CAST(${JSON.stringify(input.materials)} AS JSON),
            requestedPublish = ${input.requestedPublish ? 1 : 0}, status = 'queued', failureReason = NULL,
            outputManifestUrl = NULL, outputArchiveUrl = NULL, qualityScore = NULL, startedAt = NULL, completedAt = NULL
          WHERE id = ${jobId}
        `);
      } else {
        const result = await db.execute(sql`
          INSERT INTO designerGarmentIngestionJobs
            (wardrobeItemId, userId, designerProfileId, captureMode, sourceAssetUrls, colours, materials, requestedPublish, status)
          VALUES
            (${input.wardrobeItemId}, ${ctx.user.id}, ${profile.id}, ${input.captureMode}, CAST(${JSON.stringify(sourceAssets)} AS JSON),
             CAST(${JSON.stringify(input.colours)} AS JSON), CAST(${JSON.stringify(input.materials)} AS JSON), ${input.requestedPublish ? 1 : 0}, 'queued')
        `);
        const meta: any = Array.isArray(result) ? result[0] : result;
        jobId = Number(meta.insertId);
      }

      await db.execute(sql`
        UPDATE wardrobeItems SET
          primaryImageUrl = ${input.coverImageUrl}, imageUrls = CAST(${JSON.stringify([input.coverImageUrl])} AS JSON),
          sourceCaptureMode = ${input.captureMode}, sourceAssetUrls = CAST(${JSON.stringify(sourceAssets)} AS JSON),
          generationRequestedPublish = ${input.requestedPublish ? 1 : 0}, generationReadinessStatus = 'queued',
          styleTags = CAST(${JSON.stringify(nextTags)} AS JSON), status = 'processing', visibility = 'private',
          characterWardrobeAllowed = 0, turntableStatus = 'queued', turntableFrameCount = 0,
          renderPipelineVersion = ${PIPELINE_VERSION}
        WHERE id = ${input.wardrobeItemId} AND userId = ${ctx.user.id}
      `);

      return { jobId, status: "queued", message: "Upload complete. The shop will show one image after the hidden generation pack passes quality review." };
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const profile = await requireDesigner(ctx.user.id);
    const db = await connection();
    return rowsFrom(await db.execute(sql`
      SELECT j.*, wi.name AS itemName, wi.primaryImageUrl
      FROM designerGarmentIngestionJobs j
      INNER JOIN wardrobeItems wi ON wi.id = j.wardrobeItemId
      WHERE j.userId = ${ctx.user.id} AND j.designerProfileId = ${profile.id}
      ORDER BY j.updatedAt DESC, j.id DESC
    `));
  }),

  adminExportPending: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await ensureIngestionSchema();
      const db = await connection();
      return rowsFrom(await db.execute(sql`
        SELECT j.*, wi.name, wi.description, wi.category, wi.subcategory, wi.wardrobeType,
               wi.referencePrompt, wi.faceCoverage, dp.brandName
        FROM designerGarmentIngestionJobs j
        INNER JOIN wardrobeItems wi ON wi.id = j.wardrobeItemId
        INNER JOIN designerProfiles dp ON dp.id = j.designerProfileId
        WHERE j.status = 'queued'
        ORDER BY j.createdAt ASC, j.id ASC
        LIMIT ${input.limit}
      `));
    }),

  adminMarkProcessing: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await ensureIngestionSchema();
      const db = await connection();
      await db.execute(sql`UPDATE designerGarmentIngestionJobs SET status = 'processing', startedAt = CURRENT_TIMESTAMP WHERE id = ${input.jobId} AND status = 'queued'`);
      return { success: true };
    }),

  adminComplete: protectedProcedure
    .input(z.object({
      jobId: z.number().int().positive(),
      shopImageUrl: HTTPS_URL,
      model3dUrl: HTTPS_URL,
      continuityImageUrls: z.array(HTTPS_URL).refine((value) => value.length === 12 || value.length === 24, "Exactly 12 or 24 continuity references are required."),
      verificationFrameUrls: z.array(HTTPS_URL).length(36),
      backendManifestUrl: HTTPS_URL,
      outputArchiveUrl: HTTPS_URL.optional().nullable(),
      qualityScore: z.number().int().min(94).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await ensureIngestionSchema();
      const db = await connection();
      const job = firstRow(await db.execute(sql`
        SELECT j.*, wi.name, wi.referencePrompt, wi.styleTags, dp.membershipStatus, dp.stripeAccountStatus
        FROM designerGarmentIngestionJobs j
        INNER JOIN wardrobeItems wi ON wi.id = j.wardrobeItemId
        INNER JOIN designerProfiles dp ON dp.id = j.designerProfileId
        WHERE j.id = ${input.jobId} LIMIT 1
      `));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Ingestion job was not found." });
      const canPublish = Boolean(job.requestedPublish) && job.membershipStatus === "active" && job.stripeAccountStatus === "active";
      const tags = jsonStrings(job.styleTags).filter((tag) => !tag.startsWith("generation-pack:"));
      const nextTags = Array.from(new Set([
        ...tags,
        "generation-pack:ready",
        "true-360-backend-ready",
        "shop-display:primary-image-only",
        "backend-reference-pack:hidden",
      ]));
      const basePrompt = String(job.referencePrompt || `${job.name}.`).trim();
      const referencePrompt = `${basePrompt}; VERIFIED DESIGNER GARMENT PACK: preserve the exact silhouette, cut, seams, panels, closures, pockets, materials, colour placement and coverage from the attached hidden continuity references and immutable GLB; do not redesign or simplify the garment.`;
      const imageUrls = Array.from(new Set([input.shopImageUrl, ...input.continuityImageUrls]));
      const masterKey = `designer-garment:${job.designerProfileId}:${job.wardrobeItemId}`;

      await db.execute(sql`
        UPDATE wardrobeItems SET
          primaryImageUrl = ${input.shopImageUrl}, imageUrls = CAST(${JSON.stringify(imageUrls)} AS JSON),
          referencePrompt = ${referencePrompt}, masterReferenceKey = ${masterKey}, model3dUrl = ${input.model3dUrl},
          turntableFrameUrls = CAST(${JSON.stringify(input.verificationFrameUrls)} AS JSON), turntableFrameCount = 36,
          turntableStatus = 'ready', turntableUpdatedAt = CURRENT_TIMESTAMP, renderPipelineVersion = ${PIPELINE_VERSION},
          generationReadinessStatus = 'ready', backendManifestUrl = ${input.backendManifestUrl},
          generationQualityScore = ${input.qualityScore}, styleTags = CAST(${JSON.stringify(nextTags)} AS JSON),
          characterWardrobeAllowed = 1, status = 'active', visibility = ${canPublish ? "public" : "private"}
        WHERE id = ${job.wardrobeItemId}
      `);
      await db.execute(sql`
        UPDATE designerGarmentIngestionJobs SET
          status = 'approved', outputManifestUrl = ${input.backendManifestUrl}, outputArchiveUrl = ${input.outputArchiveUrl || null},
          qualityScore = ${input.qualityScore}, completedAt = CURRENT_TIMESTAMP, failureReason = NULL
        WHERE id = ${input.jobId}
      `);
      return { success: true, published: canPublish, wardrobeItemId: Number(job.wardrobeItemId) };
    }),

  adminFail: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive(), reason: z.string().trim().min(3).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await ensureIngestionSchema();
      const db = await connection();
      const job = firstRow(await db.execute(sql`SELECT wardrobeItemId FROM designerGarmentIngestionJobs WHERE id = ${input.jobId} LIMIT 1`));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Ingestion job was not found." });
      await db.execute(sql`UPDATE designerGarmentIngestionJobs SET status = 'needs_more_input', failureReason = ${input.reason}, completedAt = CURRENT_TIMESTAMP WHERE id = ${input.jobId}`);
      await db.execute(sql`UPDATE wardrobeItems SET generationReadinessStatus = 'needs_more_input', status = 'processing', visibility = 'private', characterWardrobeAllowed = 0 WHERE id = ${job.wardrobeItemId}`);
      return { success: true };
    }),
});
