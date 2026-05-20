/**
   * narrative-router.ts — Narrative Act Structure, Story Clock & Visual DNA
   *
   * Organises scenes into acts/episodes with story-beat tags.
   * Manages the story clock (storyDay + storyTimeOfDay per scene).
   * Controls the project-level Visual DNA Lock and Color Grade Lock so
   * cinematography style cannot drift scene-by-scene.
   * Manages the Character State Tracker (injuries, beard, costume damage).
   */
  import { TRPCError } from "@trpc/server";
  import { z } from "zod";
  import { eq, and, asc } from "drizzle-orm";
  import { protectedProcedure, router } from "./_core/trpc";
  import { getDb } from "./db";
  import { projectActs, projectVisualDNA, characterStates, scenes } from "../drizzle/schema";

  const STORY_BEATS = [
    "hook","inciting_incident","first_turn","midpoint","crisis",
    "climax","resolution","setup","confrontation","falling_action","denouement",
  ] as const;

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
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
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
          .where(eq(projectVisualDNA.projectId, projectId));
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
  });
  