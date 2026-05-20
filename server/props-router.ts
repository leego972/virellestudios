/**
   * props-router.ts — Project Props Library
   *
   * Lock specific hero objects (phones, weapons, vehicles, coffee mugs) so the
   * AI renders them identically across every scene that uses them.
   * Props can be assigned to a character and/or a scene range so the prompt
   * injection engine knows exactly when each prop should appear.
   */
  import { TRPCError } from "@trpc/server";
  import { z } from "zod";
  import { eq, and } from "drizzle-orm";
  import { protectedProcedure, router } from "./_core/trpc";
  import { getDb } from "./db";
  import { projectProps, propAssignments } from "../drizzle/schema";

  export const propsRouter = router({

    create: protectedProcedure
      .input(z.object({
        projectId:         z.number().int().positive(),
        name:              z.string().min(1).max(255),
        category:          z.string().max(64).optional(),
        description:       z.string().max(4000).optional(),
        referenceImageUrl: z.string().url().max(1024).optional(),
        colors:            z.array(z.string().max(64)).max(10).optional(),
        era:               z.string().max(128).optional(),
        styleTags:         z.array(z.string().max(64)).max(20).optional(),
        locked:            z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const result = await db.insert(projectProps).values({
          projectId: input.projectId, userId: ctx.user.id, name: input.name,
          category: input.category ?? null, description: input.description ?? null,
          referenceImageUrl: input.referenceImageUrl ?? null,
          thumbnailUrl: input.referenceImageUrl ?? null,
          colors: input.colors ?? null, era: input.era ?? null,
          styleTags: input.styleTags ?? null, locked: input.locked,
        });
        return { id: (result as any).insertId as number };
      }),

    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(projectProps)
          .where(and(eq(projectProps.projectId, input.projectId), eq(projectProps.userId, ctx.user.id)));
      }),

    update: protectedProcedure
      .input(z.object({
        id:                z.number().int().positive(),
        name:              z.string().min(1).max(255).optional(),
        category:          z.string().max(64).optional(),
        description:       z.string().max(4000).optional(),
        referenceImageUrl: z.string().url().max(1024).nullish(),
        colors:            z.array(z.string().max(64)).max(10).optional(),
        era:               z.string().max(128).optional(),
        styleTags:         z.array(z.string().max(64)).max(20).optional(),
        locked:            z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const { id, ...fields } = input;
        const patch: Record<string, any> = { ...fields, updatedAt: new Date() };
        if (fields.referenceImageUrl !== undefined) patch.thumbnailUrl = fields.referenceImageUrl;
        await db.update(projectProps).set(patch)
          .where(and(eq(projectProps.id, id), eq(projectProps.userId, ctx.user.id)));
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.delete(propAssignments).where(eq(propAssignments.propId, input.id));
        await db.delete(projectProps)
          .where(and(eq(projectProps.id, input.id), eq(projectProps.userId, ctx.user.id)));
        return { ok: true };
      }),

    assignProp: protectedProcedure
      .input(z.object({
        projectId:      z.number().int().positive(),
        propId:         z.number().int().positive(),
        characterId:    z.number().int().positive().optional(),
        fromSceneOrder: z.number().int().min(0).optional(),
        toSceneOrder:   z.number().int().min(0).optional(),
        usageNotes:     z.string().max(512).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.insert(propAssignments).values({
          userId: ctx.user.id, projectId: input.projectId, propId: input.propId,
          characterId: input.characterId ?? null,
          fromSceneOrder: input.fromSceneOrder ?? null,
          toSceneOrder: input.toSceneOrder ?? null,
          usageNotes: input.usageNotes ?? null,
        });
        return { ok: true };
      }),

    getAssignments: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select({ assignment: propAssignments, prop: projectProps })
          .from(propAssignments)
          .innerJoin(projectProps, eq(propAssignments.propId, projectProps.id))
          .where(and(eq(propAssignments.projectId, input.projectId), eq(propAssignments.userId, ctx.user.id)));
      }),

    removeAssignment: protectedProcedure
      .input(z.object({ assignmentId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await db.delete(propAssignments)
          .where(and(eq(propAssignments.id, input.assignmentId), eq(propAssignments.userId, ctx.user.id)));
        return { ok: true };
      }),
  });
  