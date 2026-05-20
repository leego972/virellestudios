/**
   * backgrounds-router.ts — Project Background Library
   *
   * Directors define recurring locations, vehicles, vessels, and aircraft once,
   * lock them, and the AI generates them identically in every scene that
   * references that background.
   */
  import { TRPCError } from "@trpc/server";
  import { z } from "zod";
  import { eq, and, inArray } from "drizzle-orm";
  import { protectedProcedure, router } from "./_core/trpc";
  import { getDb } from "./db";
  import { projectBackgrounds, scenes } from "../drizzle/schema";

  export const backgroundsRouter = router({

    create: protectedProcedure
      .input(z.object({
        projectId:         z.number().int().positive(),
        name:              z.string().min(1).max(255),
        backgroundType:    z.enum(["location","vehicle","vessel","aircraft"]).default("location"),
        description:       z.string().max(4000).optional(),
        referenceImageUrl: z.string().url().max(1024).optional(),
        styleNotes:        z.string().max(2000).optional(),
        locationTags:      z.array(z.string().max(64)).max(20).optional(),
        vehicleMake:       z.string().max(128).optional(),
        vehicleModel:      z.string().max(128).optional(),
        vehicleYear:       z.number().int().min(1900).max(2099).optional(),
        vehicleColor:      z.string().max(128).optional(),
        vehicleCondition:  z.string().max(128).optional(),
        locked:            z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const result = await db.insert(projectBackgrounds).values({
          projectId:         input.projectId,
          userId:            ctx.user.id,
          name:              input.name,
          backgroundType:    input.backgroundType,
          description:       input.description ?? null,
          referenceImageUrl: input.referenceImageUrl ?? null,
          thumbnailUrl:      input.referenceImageUrl ?? null,
          styleNotes:        input.styleNotes ?? null,
          locationTags:      input.locationTags ?? null,
          vehicleMake:       input.vehicleMake ?? null,
          vehicleModel:      input.vehicleModel ?? null,
          vehicleYear:       input.vehicleYear ?? null,
          vehicleColor:      input.vehicleColor ?? null,
          vehicleCondition:  input.vehicleCondition ?? null,
          locked:            input.locked,
        });
        return { id: (result as any).insertId as number };
      }),

    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(projectBackgrounds)
          .where(and(
            eq(projectBackgrounds.projectId, input.projectId),
            eq(projectBackgrounds.userId, ctx.user.id),
          ));
      }),

    update: protectedProcedure
      .input(z.object({
        id:                z.number().int().positive(),
        name:              z.string().min(1).max(255).optional(),
        backgroundType:    z.enum(["location","vehicle","vessel","aircraft"]).optional(),
        description:       z.string().max(4000).optional(),
        referenceImageUrl: z.string().url().max(1024).nullish(),
        styleNotes:        z.string().max(2000).optional(),
        locationTags:      z.array(z.string().max(64)).max(20).optional(),
        vehicleMake:       z.string().max(128).optional(),
        vehicleModel:      z.string().max(128).optional(),
        vehicleYear:       z.number().int().min(1900).max(2099).optional(),
        vehicleColor:      z.string().max(128).optional(),
        vehicleCondition:  z.string().max(128).optional(),
        locked:            z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { id, ...fields } = input;
        const patch: Record<string, any> = { ...fields, updatedAt: new Date() };
        if (fields.referenceImageUrl !== undefined) patch.thumbnailUrl = fields.referenceImageUrl;
        await db.update(projectBackgrounds).set(patch)
          .where(and(
            eq(projectBackgrounds.id, id),
            eq(projectBackgrounds.userId, ctx.user.id),
          ));
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(scenes).set({ lockedBackgroundId: null } as any)
          .where(eq((scenes as any).lockedBackgroundId, input.id));
        await db.delete(projectBackgrounds)
          .where(and(
            eq(projectBackgrounds.id, input.id),
            eq(projectBackgrounds.userId, ctx.user.id),
          ));
        return { ok: true };
      }),

    assignToScene: protectedProcedure
      .input(z.object({
        sceneId:      z.number().int().positive(),
        backgroundId: z.number().int().positive().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(scenes)
          .set({ lockedBackgroundId: input.backgroundId, updatedAt: new Date() } as any)
          .where(eq(scenes.id, input.sceneId));
        return { ok: true };
      }),

    bulkAssignToScenes: protectedProcedure
      .input(z.object({
        sceneIds:     z.array(z.number().int().positive()).min(1).max(200),
        backgroundId: z.number().int().positive().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.update(scenes)
          .set({ lockedBackgroundId: input.backgroundId, updatedAt: new Date() } as any)
          .where(inArray(scenes.id, input.sceneIds));
        return { ok: true };
      }),
  });
  