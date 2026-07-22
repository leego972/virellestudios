/**
 * narrative-router.ts — Narrative Act Structure, Story Clock, Visual DNA,
 * Character State Tracker and persisted storyboard keyframes.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { creationProcedure, protectedProcedure, router } from "./_core/trpc";
import { rateLimitAI } from "./_core/rateLimit";
import { CREDIT_COSTS, requireGenerationQuota } from "./_core/subscription";
import { generateImage } from "./_core/imageGeneration";
import { getDb } from "./db";
import * as dbApi from "./db";
import {
  projectActs,
  projectVisualDNA,
  characterStates,
  scenes,
  shotPackages,
  projects,
} from "../drizzle/schema";

const STORY_BEATS = [
  "hook","inciting_incident","first_turn","midpoint","crisis",
  "climax","resolution","setup","confrontation","falling_action","denouement",
] as const;

const storyboardMetadataSchema = z.object({
  cameraAngle: z.string().max(128).optional(),
  movement: z.string().max(128).optional(),
  description: z.string().max(2000).optional(),
  shotType: z.string().max(128).optional(),
  lens: z.string().max(128).optional(),
  framing: z.string().max(128).optional(),
  notes: z.string().max(2000).optional(),
}).partial();

async function requireOwnedScene(sceneId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [row] = await db
    .select({ scene: scenes, project: projects })
    .from(scenes)
    .innerJoin(projects, eq(projects.id, scenes.projectId))
    .where(and(eq(scenes.id, sceneId), eq(projects.userId, userId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
  return { db, scene: row.scene, project: row.project };
}

async function requireOwnedShot(shotPackageId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [shot] = await db
    .select()
    .from(shotPackages)
    .where(and(eq(shotPackages.id, shotPackageId), eq(shotPackages.userId, userId)))
    .limit(1);
  if (!shot) throw new TRPCError({ code: "NOT_FOUND", message: "Storyboard frame not found" });
  const owned = await requireOwnedScene(shot.sceneId, userId);
  return { ...owned, shot };
}

async function reindexStoryboardShots(sceneId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select({ id: shotPackages.id })
    .from(shotPackages)
    .where(and(eq(shotPackages.sceneId, sceneId), eq(shotPackages.userId, userId)))
    .orderBy(asc(shotPackages.shotIndex), asc(shotPackages.id));
  for (let index = 0; index < rows.length; index += 1) {
    await db
      .update(shotPackages)
      .set({ shotIndex: index + 1, updatedAt: new Date() } as any)
      .where(and(eq(shotPackages.id, rows[index].id), eq(shotPackages.userId, userId)));
  }
}

export const narrativeRouter = router({

  // ── Acts / Episodes ─────────────────────────────────────────────────────

  createAct: protectedProcedure
    .input(z.object({
      projectId:         z.number().int().positive(),
      name:              z.string().min(1).max(255),
      orderIndex:        z.number().int().min(0).default(0),
      actType:           z.enum(["act","episode","chapter","sequence"]).default("act"),
      description:       z.string().max(2000).optional(),
      colorHex:          z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      isEpisodeBoundary: z.boolean().default(false),
      episodeNumber:     z.number().int().positive().optional(),
      episodeTitle:      z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(projectActs).values({
        projectId: input.projectId, userId: ctx.user.id, name: input.name,
        orderIndex: input.orderIndex, actType: input.actType,
        description: input.description ?? null, colorHex: input.colorHex ?? null,
        isEpisodeBoundary: input.isEpisodeBoundary,
        episodeNumber: input.episodeNumber ?? null,
        episodeTitle: input.episodeTitle ?? null,
      });
      return { id: (result as any).insertId as number };
    }),

  listActs: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(projectActs)
        .where(and(eq(projectActs.projectId, input.projectId), eq(projectActs.userId, ctx.user.id)))
        .orderBy(asc(projectActs.orderIndex));
    }),

  updateAct: protectedProcedure
    .input(z.object({
      id:                z.number().int().positive(),
      name:              z.string().min(1).max(255).optional(),
      orderIndex:        z.number().int().min(0).optional(),
      description:       z.string().max(2000).optional(),
      colorHex:          z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      isEpisodeBoundary: z.boolean().optional(),
      episodeNumber:     z.number().int().positive().optional(),
      episodeTitle:      z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...fields } = input;
      await db.update(projectActs).set({ ...fields, updatedAt: new Date() } as any)
        .where(and(eq(projectActs.id, id), eq(projectActs.userId, ctx.user.id)));
      return { ok: true };
    }),

  deleteAct: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(scenes).set({ actId: null } as any).where(eq((scenes as any).actId, input.id));
      await db.delete(projectActs)
        .where(and(eq(projectActs.id, input.id), eq(projectActs.userId, ctx.user.id)));
      return { ok: true };
    }),

  // ── Scene Story Context ──────────────────────────────────────────────────

  updateSceneStoryContext: protectedProcedure
    .input(z.object({
      sceneId:        z.number().int().positive(),
      actId:          z.number().int().positive().nullable().optional(),
      storyBeat:      z.enum(STORY_BEATS).nullable().optional(),
      storyDay:       z.number().int().min(1).max(9999).nullable().optional(),
      storyTimeOfDay: z.enum(["dawn","morning","midday","afternoon","evening","night","unknown"]).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await requireOwnedScene(input.sceneId, ctx.user.id);
      const { sceneId, ...fields } = input;
      await db.update(scenes).set({ ...fields, updatedAt: new Date() } as any).where(eq(scenes.id, sceneId));
      return { ok: true };
    }),

  // ── Visual DNA Lock ──────────────────────────────────────────────────────

  getVisualDNA: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [dna] = await db.select().from(projectVisualDNA)
        .where(and(eq(projectVisualDNA.projectId, input.projectId), eq(projectVisualDNA.userId, ctx.user.id)));
      return dna ?? null;
    }),

  upsertVisualDNA: protectedProcedure
    .input(z.object({
      projectId:              z.number().int().positive(),
      genreProfile:           z.string().max(128).optional(),
      cinematographer:        z.string().max(255).optional(),
      referenceFilms:         z.array(z.string().max(255)).max(10).optional(),
      lensProfile:            z.string().max(128).optional(),
      lightingStyle:          z.string().max(128).optional(),
      colorPalette:           z.string().max(255).optional(),
      colorTemperature:       z.string().max(64).optional(),
      filmStock:              z.string().max(128).optional(),
      aspectRatio:            z.string().max(16).optional(),
      visualNotes:            z.string().max(4000).optional(),
      locked:                 z.boolean().optional(),
      globalColorGrade:       z.string().max(128).optional(),
      globalColorGradeLocked: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { projectId, ...fields } = input;
      const [existing] = await db.select({ id: projectVisualDNA.id }).from(projectVisualDNA)
        .where(and(eq(projectVisualDNA.projectId, projectId), eq(projectVisualDNA.userId, ctx.user.id)));
      if (existing) {
        await db.update(projectVisualDNA).set({ ...fields, updatedAt: new Date() } as any)
          .where(eq(projectVisualDNA.id, existing.id));
        return { id: existing.id };
      }
      const result = await db.insert(projectVisualDNA).values({ projectId, userId: ctx.user.id, ...fields } as any);
      return { id: (result as any).insertId as number };
    }),

  // ── Character State Tracker ──────────────────────────────────────────────

  createCharacterState: protectedProcedure
    .input(z.object({
      projectId:      z.number().int().positive(),
      characterId:    z.number().int().positive(),
      fromSceneOrder: z.number().int().min(0),
      toSceneOrder:   z.number().int().min(0).optional(),
      label:          z.string().min(1).max(255),
      stateType:      z.enum(["appearance","injury","emotional","costume_damage","beard","makeup","other"]).default("appearance"),
      description:    z.string().min(1).max(4000),
      promptOverride: z.string().max(2000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const result = await db.insert(characterStates).values({
        userId: ctx.user.id, projectId: input.projectId,
        characterId: input.characterId, fromSceneOrder: input.fromSceneOrder,
        toSceneOrder: input.toSceneOrder ?? null, label: input.label,
        stateType: input.stateType, description: input.description,
        promptOverride: input.promptOverride ?? null,
      });
      return { id: (result as any).insertId as number };
    }),

  listCharacterStates: protectedProcedure
    .input(z.object({
      projectId:   z.number().int().positive(),
      characterId: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [
        eq(characterStates.projectId, input.projectId),
        eq(characterStates.userId, ctx.user.id),
      ];
      if (input.characterId) conditions.push(eq(characterStates.characterId, input.characterId));
      return db.select().from(characterStates).where(and(...conditions));
    }),

  updateCharacterState: protectedProcedure
    .input(z.object({
      id:             z.number().int().positive(),
      fromSceneOrder: z.number().int().min(0).optional(),
      toSceneOrder:   z.number().int().min(0).nullable().optional(),
      label:          z.string().min(1).max(255).optional(),
      stateType:      z.enum(["appearance","injury","emotional","costume_damage","beard","makeup","other"]).optional(),
      description:    z.string().min(1).max(4000).optional(),
      promptOverride: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, ...fields } = input;
      await db.update(characterStates).set({ ...fields, updatedAt: new Date() } as any)
        .where(and(eq(characterStates.id, id), eq(characterStates.userId, ctx.user.id)));
      return { ok: true };
    }),

  deleteCharacterState: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(characterStates)
        .where(and(eq(characterStates.id, input.id), eq(characterStates.userId, ctx.user.id)));
      return { ok: true };
    }),

  // ── Storyboard Shot Editing & Keyframes ──────────────────────────────────

  addStoryboardShot: protectedProcedure
    .input(z.object({
      sceneId: z.number().int().positive(),
      prompt: z.string().min(1).max(4000),
      durationSeconds: z.number().int().min(1).max(60).default(8),
      negativePrompt: z.string().max(2000).optional(),
      metadata: storyboardMetadataSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, scene } = await requireOwnedScene(input.sceneId, ctx.user.id);
      const existing = await db
        .select({ shotIndex: shotPackages.shotIndex })
        .from(shotPackages)
        .where(and(eq(shotPackages.sceneId, input.sceneId), eq(shotPackages.userId, ctx.user.id)))
        .orderBy(asc(shotPackages.shotIndex));
      const nextIndex = existing.length > 0 ? Math.max(...existing.map(row => row.shotIndex)) + 1 : 1;
      const result = await db.insert(shotPackages).values({
        sceneId: input.sceneId,
        projectId: scene.projectId,
        userId: ctx.user.id,
        shotIndex: nextIndex,
        prompt: input.prompt.trim(),
        negativePrompt: input.negativePrompt?.trim() || null,
        durationSeconds: input.durationSeconds,
        status: "pending",
        retryCount: 0,
        metadata: input.metadata || {},
      } as any);
      return { id: (result as any).insertId as number, shotIndex: nextIndex };
    }),

  updateStoryboardShot: protectedProcedure
    .input(z.object({
      shotPackageId: z.number().int().positive(),
      prompt: z.string().min(1).max(4000).optional(),
      negativePrompt: z.string().max(2000).nullable().optional(),
      durationSeconds: z.number().int().min(1).max(60).optional(),
      metadata: storyboardMetadataSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db, shot } = await requireOwnedShot(input.shotPackageId, ctx.user.id);
      const currentMetadata = shot.metadata && typeof shot.metadata === "object" ? shot.metadata as Record<string, unknown> : {};
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.prompt !== undefined) updates.prompt = input.prompt.trim();
      if (input.negativePrompt !== undefined) updates.negativePrompt = input.negativePrompt?.trim() || null;
      if (input.durationSeconds !== undefined) updates.durationSeconds = input.durationSeconds;
      if (input.metadata !== undefined) updates.metadata = { ...currentMetadata, ...input.metadata };
      await db.update(shotPackages).set(updates as any)
        .where(and(eq(shotPackages.id, input.shotPackageId), eq(shotPackages.userId, ctx.user.id)));
      return { ok: true };
    }),

  reorderStoryboardShots: protectedProcedure
    .input(z.object({
      sceneId: z.number().int().positive(),
      orderedShotPackageIds: z.array(z.number().int().positive()).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await requireOwnedScene(input.sceneId, ctx.user.id);
      const existing = await db
        .select({ id: shotPackages.id })
        .from(shotPackages)
        .where(and(eq(shotPackages.sceneId, input.sceneId), eq(shotPackages.userId, ctx.user.id)));
      const existingIds = new Set(existing.map(row => row.id));
      if (existing.length !== input.orderedShotPackageIds.length || input.orderedShotPackageIds.some(id => !existingIds.has(id))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Storyboard order does not match the scene's saved frames" });
      }
      for (let index = 0; index < input.orderedShotPackageIds.length; index += 1) {
        await db.update(shotPackages)
          .set({ shotIndex: index + 1, updatedAt: new Date() } as any)
          .where(and(eq(shotPackages.id, input.orderedShotPackageIds[index]), eq(shotPackages.userId, ctx.user.id)));
      }
      return { ok: true };
    }),

  deleteStoryboardShot: protectedProcedure
    .input(z.object({ shotPackageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const { db, shot } = await requireOwnedShot(input.shotPackageId, ctx.user.id);
      await db.delete(shotPackages)
        .where(and(eq(shotPackages.id, input.shotPackageId), eq(shotPackages.userId, ctx.user.id)));
      await reindexStoryboardShots(shot.sceneId, ctx.user.id);
      return { ok: true };
    }),

  generateStoryboardKeyframe: creationProcedure
    .input(z.object({ shotPackageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await rateLimitAI(ctx.user.id);
      requireGenerationQuota(ctx.user);
      const { db, shot, scene, project } = await requireOwnedShot(input.shotPackageId, ctx.user.id);
      const cost = CREDIT_COSTS.generate_preview_image.cost;
      try {
        await dbApi.deductCredits(
          ctx.user.id,
          cost,
          "generate_preview_image",
          `Storyboard keyframe for scene ${scene.id}, shot ${shot.shotIndex}`,
        );
      } catch (error: any) {
        if (error?.message?.includes("INSUFFICIENT_CREDITS")) {
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }
        throw error;
      }

      await db.update(shotPackages)
        .set({ status: "generating", errorMessage: null, updatedAt: new Date() } as any)
        .where(eq(shotPackages.id, shot.id));

      try {
        const metadata = shot.metadata && typeof shot.metadata === "object" ? shot.metadata as Record<string, unknown> : {};
        const characters = await dbApi.getProjectCharacters(project.id);
        const sceneCharacterIds = Array.isArray(scene.characterIds) ? scene.characterIds as number[] : [];
        const selectedCharacters = characters.filter(character => sceneCharacterIds.includes(character.id));
        const anchors = selectedCharacters.length > 0 ? selectedCharacters : characters;
        const originalImages = anchors
          .filter(character => !!character.photoUrl)
          .slice(0, 4)
          .map(character => ({ url: character.photoUrl!, mimeType: "image/jpeg" }));
        const userKeys = await dbApi.getUserApiKeys(ctx.user.id);
        const cameraAngle = String(metadata.cameraAngle || scene.cameraAngle || "cinematic eye level");
        const movement = String(metadata.movement || scene.cameraMovement || "static composed frame");
        const description = String(metadata.description || scene.description || "");
        const lens = String(metadata.lens || scene.focalLength || scene.lensType || "cinema lens");
        const shotType = String(metadata.shotType || metadata.framing || scene.shotType || "storyboard coverage");
        const prompt = [
          "Create a polished cinematic storyboard reference frame, not a finished video.",
          `Project: ${project.title}. Genre: ${project.genre || "cinematic drama"}.`,
          `Scene: ${scene.title || `Scene ${scene.orderIndex + 1}`}. ${scene.description || ""}`,
          `Shot ${shot.shotIndex}: ${shot.prompt}.`,
          description ? `Beat: ${description}.` : "",
          `Composition: ${shotType}; camera angle ${cameraAngle}; movement intent ${movement}; lens ${lens}.`,
          `Location: ${scene.locationType || "unspecified"}; time: ${scene.timeOfDay || "unspecified"}; lighting: ${scene.lighting || "cinematic"}; mood: ${scene.mood || "story appropriate"}.`,
          "Preserve character identity, wardrobe, geography, production design and screen direction from the supplied references.",
          "16:9 production storyboard frame, high detail, clean cinematic composition, no captions, no lettering, no UI, no watermark.",
        ].filter(Boolean).join("\n");

        const result = await generateImage({
          prompt,
          originalImages: originalImages.length > 0 ? originalImages : undefined,
          userOpenAiKey: userKeys.openaiKey || undefined,
        });
        if (!result.url) throw new Error("Image provider returned no keyframe URL");

        await db.update(shotPackages)
          .set({
            keyframeUrl: result.url,
            status: "completed",
            provider: "image-generation",
            errorMessage: null,
            updatedAt: new Date(),
          } as any)
          .where(eq(shotPackages.id, shot.id));
        if (!scene.thumbnailUrl) {
          await db.update(scenes).set({ thumbnailUrl: result.url, updatedAt: new Date() } as any).where(eq(scenes.id, scene.id));
        }
        await dbApi.incrementGenerationCount(ctx.user.id);
        return { url: result.url, shotPackageId: shot.id };
      } catch (error) {
        await db.update(shotPackages)
          .set({ status: "failed", errorMessage: String(error), updatedAt: new Date() } as any)
          .where(eq(shotPackages.id, shot.id));
        await dbApi.addCredits(ctx.user.id, cost, "storyboard_keyframe_refund", "Refund — storyboard keyframe generation failed").catch(() => undefined);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Storyboard keyframe generation failed. Credits were refunded." });
      }
    }),
});
