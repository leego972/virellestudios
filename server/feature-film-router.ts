/**
 * Feature Film Pipeline Router
 *
 * Provides the full end-to-end feature-film pipeline:
 * 1. Persistent versioned cuts with act grouping and locked states
 * 2. Long-scene orchestration via shot packages (segment → stitch)
 * 3. Continuity tracking (wardrobe, props, time-of-day, character states)
 * 4. Audio plan management (voice assignments, music cues, mix settings)
 * 5. Character arc tracking across scenes
 * 6. Film compile jobs (one-click full-film assembly)
 * 7. Act group management for feature-scale timelines
 */
import { safeJsonExtract } from "./_core/safeParse";
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { rateLimitAI } from "./_core/rateLimit";
import { getDb } from "./db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import {
  featureCuts,
  featureCutScenes,
  actGroups,
  shotPackages,
  continuityRecords,
  featureAudioPlans,
  filmCompileJobs,
  characterArcs,
  scenes,
  projects,
  type InsertFeatureCut,
  type InsertFeatureCutScene,
  type InsertActGroup,
  type InsertShotPackage,
  type InsertContinuityRecord,
  type InsertFeatureAudioPlan,
  type InsertFilmCompileJob,
  type InsertCharacterArc,
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireProjectAccess(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  return project;
}

async function recalcCutDuration(cutId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const cutScenes = await db
    .select({ sceneId: featureCutScenes.sceneId, trimIn: featureCutScenes.trimIn, trimOut: featureCutScenes.trimOut })
    .from(featureCutScenes)
    .where(and(eq(featureCutScenes.cutId, cutId), eq(featureCutScenes.isIncluded, true)));
  if (!cutScenes.length) {
    await db.update(featureCuts).set({ totalDuration: 0, sceneCount: 0 }).where(eq(featureCuts.id, cutId));
    return;
  }
  const sceneIds = cutScenes.map((cs) => cs.sceneId);
  const sceneRows = await db
    .select({ id: scenes.id, duration: scenes.duration })
    .from(scenes)
    .where(sql`${scenes.id} IN (${sql.join(sceneIds.map((id) => sql`${id}`), sql`, `)})`);
  const durationMap = new Map(sceneRows.map((s) => [s.id, s.duration || 0]));
  let total = 0;
  for (const cs of cutScenes) {
    const raw = durationMap.get(cs.sceneId) || 0;
    total += Math.max(0, raw - (cs.trimIn || 0) - (cs.trimOut || 0));
  }
  await db
    .update(featureCuts)
    .set({ totalDuration: total, sceneCount: cutScenes.length })
    .where(eq(featureCuts.id, cutId));
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const featureFilmRouter = router({

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE CUTS — Versioned persistent cut management
  // ══════════════════════════════════════════════════════════════════════════

  /** List all cuts for a project */
  listCuts: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.projectId, input.projectId), eq(featureCuts.userId, ctx.user.id)))
        .orderBy(desc(featureCuts.createdAt));
    }),

  /** Get a single cut with its scenes */
  getCut: protectedProcedure
    .input(z.object({ cutId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });

      const cutSceneRows = await db
        .select()
        .from(featureCutScenes)
        .where(eq(featureCutScenes.cutId, input.cutId))
        .orderBy(asc(featureCutScenes.orderIndex));

      const actGroupRows = await db
        .select()
        .from(actGroups)
        .where(eq(actGroups.cutId, input.cutId))
        .orderBy(asc(actGroups.orderIndex));

      // Enrich with scene data
      const sceneIds = cutSceneRows.map((cs) => cs.sceneId);
      let sceneData: any[] = [];
      if (sceneIds.length > 0) {
        sceneData = await db
          .select()
          .from(scenes)
          .where(sql`${scenes.id} IN (${sql.join(sceneIds.map((id) => sql`${id}`), sql`, `)})`);
      }
      const sceneMap = new Map(sceneData.map((s) => [s.id, s]));

      return {
        cut,
        scenes: cutSceneRows.map((cs) => ({
          ...cs,
          scene: sceneMap.get(cs.sceneId) || null,
        })),
        actGroups: actGroupRows,
      };
    }),

  /** Create a new feature cut */
  createCut: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      targetRuntime: z.number().optional(),
      actStructure: z.enum(["three-act", "five-act", "heros-journey", "nonlinear", "episodic", "two-act"]).optional(),
      version: z.string().optional(),
      notes: z.string().optional(),
      /** If true, populate the cut with all project scenes in current order */
      populateFromProject: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [cut] = await db.insert(featureCuts).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        targetRuntime: input.targetRuntime,
        actStructure: input.actStructure || "three-act",
        version: input.version || "v1.0",
        notes: input.notes,
        isDefault: false,
        isLocked: false,
        totalDuration: 0,
        sceneCount: 0,
      } as InsertFeatureCut);

      const cutId = (cut as any).insertId as number;

      if (input.populateFromProject) {
        const projectScenes = await db
          .select()
          .from(scenes)
          .where(eq(scenes.projectId, input.projectId))
          .orderBy(asc(scenes.orderIndex));

        if (projectScenes.length > 0) {
          const cutSceneValues: InsertFeatureCutScene[] = projectScenes.map((s, i) => ({
            cutId,
            sceneId: s.id,
            orderIndex: i,
            actNumber: 1,
            isIncluded: true,
            trimIn: 0,
            trimOut: 0,
            transitionType: (s.transitionType as string) || "cut",
            transitionDuration: s.transitionDuration || 0,
          }));
          await db.insert(featureCutScenes).values(cutSceneValues);
        }
        await recalcCutDuration(cutId);
      }

      const [newCut] = await db.select().from(featureCuts).where(eq(featureCuts.id, cutId)).limit(1);
      return newCut;
    }),

  /** Update cut metadata */
  updateCut: protectedProcedure
    .input(z.object({
      cutId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      targetRuntime: z.number().optional(),
      actStructure: z.enum(["three-act", "five-act", "heros-journey", "nonlinear", "episodic", "two-act"]).optional(),
      version: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });
      if (cut.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Cut is locked. Unlock before editing." });

      const updates: Partial<InsertFeatureCut> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.targetRuntime !== undefined) updates.targetRuntime = input.targetRuntime;
      if (input.actStructure !== undefined) updates.actStructure = input.actStructure;
      if (input.version !== undefined) updates.version = input.version;
      if (input.notes !== undefined) updates.notes = input.notes;

      await db.update(featureCuts).set(updates).where(eq(featureCuts.id, input.cutId));
      const [updated] = await db.select().from(featureCuts).where(eq(featureCuts.id, input.cutId)).limit(1);
      return updated;
    }),

  /** Lock or unlock a cut */
  lockCut: protectedProcedure
    .input(z.object({ cutId: z.number(), lock: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });

      await db.update(featureCuts).set({
        isLocked: input.lock,
        lockedAt: input.lock ? new Date() : null,
        lockedBy: input.lock ? ctx.user.id : null,
      }).where(eq(featureCuts.id, input.cutId));

      return { success: true, isLocked: input.lock };
    }),

  /** Set a cut as the default (canonical) cut for the project */
  setDefaultCut: protectedProcedure
    .input(z.object({ cutId: z.number(), projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      // Clear existing default
      await db
        .update(featureCuts)
        .set({ isDefault: false })
        .where(and(eq(featureCuts.projectId, input.projectId), eq(featureCuts.userId, ctx.user.id)));
      // Set new default
      await db.update(featureCuts).set({ isDefault: true }).where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Duplicate a cut (create alternate version) */
  duplicateCut: protectedProcedure
    .input(z.object({ cutId: z.number(), newName: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });

      const [newCutResult] = await db.insert(featureCuts).values({
        projectId: cut.projectId,
        userId: ctx.user.id,
        name: input.newName,
        description: cut.description,
        targetRuntime: cut.targetRuntime,
        actStructure: cut.actStructure,
        version: cut.version,
        notes: cut.notes,
        isDefault: false,
        isLocked: false,
        totalDuration: cut.totalDuration,
        sceneCount: cut.sceneCount,
      } as InsertFeatureCut);
      const newCutId = (newCutResult as any).insertId as number;

      // Copy all cut scenes
      const existingScenes = await db
        .select()
        .from(featureCutScenes)
        .where(eq(featureCutScenes.cutId, input.cutId))
        .orderBy(asc(featureCutScenes.orderIndex));

      if (existingScenes.length > 0) {
        await db.insert(featureCutScenes).values(
          existingScenes.map((cs) => ({
            cutId: newCutId,
            sceneId: cs.sceneId,
            orderIndex: cs.orderIndex,
            actNumber: cs.actNumber,
            actLabel: cs.actLabel,
            sequenceLabel: cs.sequenceLabel,
            isIncluded: cs.isIncluded,
            trimIn: cs.trimIn,
            trimOut: cs.trimOut,
            transitionType: cs.transitionType,
            transitionDuration: cs.transitionDuration,
            directorNote: cs.directorNote,
            colorGrade: cs.colorGrade,
          }) as InsertFeatureCutScene
        ));
      }

      // Copy act groups
      const existingActGroups = await db
        .select()
        .from(actGroups)
        .where(eq(actGroups.cutId, input.cutId));
      if (existingActGroups.length > 0) {
        await db.insert(actGroups).values(
          existingActGroups.map((ag) => ({
            cutId: newCutId,
            projectId: ag.projectId,
            actNumber: ag.actNumber,
            label: ag.label,
            description: ag.description,
            targetDuration: ag.targetDuration,
            colorCode: ag.colorCode,
            orderIndex: ag.orderIndex,
          }) as InsertActGroup
        ));
      }

      const [newCut] = await db.select().from(featureCuts).where(eq(featureCuts.id, newCutId)).limit(1);
      return newCut;
    }),

  /** Delete a cut */
  deleteCut: protectedProcedure
    .input(z.object({ cutId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });
      if (cut.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete a locked cut." });

      await db.delete(featureCutScenes).where(eq(featureCutScenes.cutId, input.cutId));
      await db.delete(actGroups).where(eq(actGroups.cutId, input.cutId));
      await db.delete(featureCuts).where(eq(featureCuts.id, input.cutId));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CUT SCENES — Include/exclude, reorder, trim, act assignment
  // ══════════════════════════════════════════════════════════════════════════

  /** Add a scene to a cut */
  addSceneToCut: protectedProcedure
    .input(z.object({
      cutId: z.number(),
      sceneId: z.number(),
      orderIndex: z.number().optional(),
      actNumber: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });
      if (cut.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Cut is locked." });

      // Get max orderIndex if not provided
      let orderIndex = input.orderIndex;
      if (orderIndex === undefined) {
        const [maxRow] = await db
          .select({ maxIdx: sql<number>`MAX(${featureCutScenes.orderIndex})` })
          .from(featureCutScenes)
          .where(eq(featureCutScenes.cutId, input.cutId));
        orderIndex = ((maxRow?.maxIdx as number) || 0) + 1;
      }

      await db.insert(featureCutScenes).values({
        cutId: input.cutId,
        sceneId: input.sceneId,
        orderIndex,
        actNumber: input.actNumber || 1,
        isIncluded: true,
        trimIn: 0,
        trimOut: 0,
        transitionType: "cut",
        transitionDuration: 0,
      } as InsertFeatureCutScene);

      await recalcCutDuration(input.cutId);
      return { success: true };
    }),

  /** Update a cut scene (include/exclude, trim, transition, act, note) */
  updateCutScene: protectedProcedure
    .input(z.object({
      cutSceneId: z.number(),
      isIncluded: z.boolean().optional(),
      orderIndex: z.number().optional(),
      actNumber: z.number().optional(),
      actLabel: z.string().optional(),
      sequenceLabel: z.string().optional(),
      trimIn: z.number().optional(),
      trimOut: z.number().optional(),
      transitionType: z.string().optional(),
      transitionDuration: z.number().optional(),
      directorNote: z.string().optional(),
      colorGrade: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cs] = await db
        .select({ cutId: featureCutScenes.cutId })
        .from(featureCutScenes)
        .where(eq(featureCutScenes.id, input.cutSceneId))
        .limit(1);
      if (!cs) throw new TRPCError({ code: "NOT_FOUND", message: "Cut scene not found" });

      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, cs.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      if (cut.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Cut is locked." });

      const updates: Partial<InsertFeatureCutScene> = {};
      if (input.isIncluded !== undefined) updates.isIncluded = input.isIncluded;
      if (input.orderIndex !== undefined) updates.orderIndex = input.orderIndex;
      if (input.actNumber !== undefined) updates.actNumber = input.actNumber;
      if (input.actLabel !== undefined) updates.actLabel = input.actLabel;
      if (input.sequenceLabel !== undefined) updates.sequenceLabel = input.sequenceLabel;
      if (input.trimIn !== undefined) updates.trimIn = input.trimIn;
      if (input.trimOut !== undefined) updates.trimOut = input.trimOut;
      if (input.transitionType !== undefined) updates.transitionType = input.transitionType;
      if (input.transitionDuration !== undefined) updates.transitionDuration = input.transitionDuration;
      if (input.directorNote !== undefined) updates.directorNote = input.directorNote;
      if (input.colorGrade !== undefined) updates.colorGrade = input.colorGrade;

      await db.update(featureCutScenes).set(updates).where(eq(featureCutScenes.id, input.cutSceneId));
      await recalcCutDuration(cs.cutId);
      return { success: true };
    }),

  /** Reorder scenes in a cut (pass full ordered array of cutSceneIds) */
  reorderCutScenes: protectedProcedure
    .input(z.object({
      cutId: z.number(),
      orderedCutSceneIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });
      if (cut.isLocked) throw new TRPCError({ code: "FORBIDDEN", message: "Cut is locked." });

      for (let i = 0; i < input.orderedCutSceneIds.length; i++) {
        await db
          .update(featureCutScenes)
          .set({ orderIndex: i })
          .where(and(eq(featureCutScenes.id, input.orderedCutSceneIds[i]), eq(featureCutScenes.cutId, input.cutId)));
      }
      await recalcCutDuration(input.cutId);
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // ACT GROUPS — Named act/sequence groupings
  // ══════════════════════════════════════════════════════════════════════════

  /** List act groups for a cut */
  listActGroups: protectedProcedure
    .input(z.object({ cutId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });
      return db
        .select()
        .from(actGroups)
        .where(eq(actGroups.cutId, input.cutId))
        .orderBy(asc(actGroups.orderIndex));
    }),

  /** Create or update act groups for a cut (replaces all) */
  setActGroups: protectedProcedure
    .input(z.object({
      cutId: z.number(),
      projectId: z.number(),
      acts: z.array(z.object({
        actNumber: z.number(),
        label: z.string(),
        description: z.string().optional(),
        targetDuration: z.number().optional(),
        colorCode: z.string().optional(),
        orderIndex: z.number(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [cut] = await db
        .select()
        .from(featureCuts)
        .where(and(eq(featureCuts.id, input.cutId), eq(featureCuts.userId, ctx.user.id)))
        .limit(1);
      if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Cut not found" });

      await db.delete(actGroups).where(eq(actGroups.cutId, input.cutId));
      if (input.acts.length > 0) {
        await db.insert(actGroups).values(
          input.acts.map((a) => ({
            cutId: input.cutId,
            projectId: input.projectId,
            actNumber: a.actNumber,
            label: a.label,
            description: a.description,
            targetDuration: a.targetDuration,
            colorCode: a.colorCode || "#3b82f6",
            orderIndex: a.orderIndex,
          }) as InsertActGroup)
        );
      }
      return { success: true };
    }),

  /** AI-generate act structure for a project */
  generateActStructure: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cutId: z.number(),
      actStructure: z.enum(["three-act", "five-act", "heros-journey", "nonlinear", "episodic", "two-act"]),
    }))
    .mutation(async ({ input, ctx }) => {
      await rateLimitAI(ctx.user.id);
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const projectScenes = await db
        .select({ id: scenes.id, title: scenes.title, description: scenes.description, duration: scenes.duration, orderIndex: scenes.orderIndex })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.orderIndex));

      const sceneList = projectScenes.map((s, i) => `${i + 1}. ${s.title || `Scene ${i + 1}`}: ${s.description?.slice(0, 100) || ""}`).join("\n");

      const actTemplates: Record<string, string> = {
        "three-act": "Act 1 (Setup ~25%), Act 2 (Confrontation ~50%), Act 3 (Resolution ~25%)",
        "five-act": "Act 1 (Exposition), Act 2 (Rising Action), Act 3 (Climax), Act 4 (Falling Action), Act 5 (Denouement)",
        "heros-journey": "Ordinary World, Call to Adventure, Refusal, Meeting the Mentor, Crossing the Threshold, Tests/Allies/Enemies, Approach, Ordeal, Reward, The Road Back, Resurrection, Return with Elixir",
        "nonlinear": "Sequence A, Sequence B, Sequence C (non-chronological)",
        "episodic": "Episode 1, Episode 2, Episode 3...",
        "two-act": "Act 1 (Setup ~40%), Act 2 (Complication & Resolution ~60%)",
      };

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: `You are a professional screenplay structure consultant. Assign scenes to acts based on the ${input.actStructure} structure: ${actTemplates[input.actStructure]}. Return JSON only.` },
          { role: "user", content: `Film: "${project.title}"\nPlot: ${project.plotSummary || project.description || "Not specified"}\n\nScenes:\n${sceneList}\n\nAssign each scene to an act. Return JSON: { acts: [{ actNumber: number, label: string, description: string, targetDuration: number, colorCode: string, sceneIndices: number[] }] }` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "act_structure",
            strict: true,
            schema: {
              type: "object",
              properties: {
                acts: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      actNumber: { type: "integer" },
                      label: { type: "string" },
                      description: { type: "string" },
                      targetDuration: { type: "integer" },
                      colorCode: { type: "string" },
                      sceneIndices: { type: "array", items: { type: "integer" } },
                    },
                    required: ["actNumber", "label", "description", "targetDuration", "colorCode", "sceneIndices"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["acts"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      const parsed = safeJsonExtract<any>(content, {});

      // Apply act assignments to cut scenes
      const cutSceneRows = await db
        .select()
        .from(featureCutScenes)
        .where(eq(featureCutScenes.cutId, input.cutId))
        .orderBy(asc(featureCutScenes.orderIndex));

      for (const act of parsed.acts || []) {
        for (const sceneIdx of act.sceneIndices || []) {
          const cs = cutSceneRows[sceneIdx - 1]; // 1-based
          if (cs) {
            await db
              .update(featureCutScenes)
              .set({ actNumber: act.actNumber, actLabel: act.label })
              .where(eq(featureCutScenes.id, cs.id));
          }
        }
      }

      // Save act groups
      await db.delete(actGroups).where(eq(actGroups.cutId, input.cutId));
      if (parsed.acts?.length > 0) {
        await db.insert(actGroups).values(
          parsed.acts.map((a: any, i: number) => ({
            cutId: input.cutId,
            projectId: input.projectId,
            actNumber: a.actNumber,
            label: a.label,
            description: a.description,
            targetDuration: a.targetDuration,
            colorCode: a.colorCode || "#3b82f6",
            orderIndex: i,
          }) as InsertActGroup)
        );
      }

      return { success: true, acts: parsed.acts };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // SHOT PACKAGES — Long-scene segment orchestration
  // ══════════════════════════════════════════════════════════════════════════

  /** Get all shot packages for a scene */
  getShotPackages: protectedProcedure
    .input(z.object({ sceneId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [scene] = await db
        .select({ projectId: scenes.projectId })
        .from(scenes)
        .where(eq(scenes.id, input.sceneId))
        .limit(1);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      await requireProjectAccess(scene.projectId, ctx.user.id);

      return db
        .select()
        .from(shotPackages)
        .where(and(eq(shotPackages.sceneId, input.sceneId), eq(shotPackages.userId, ctx.user.id)))
        .orderBy(asc(shotPackages.shotIndex));
    }),

  /** Plan shot packages for a long scene (AI-generated sub-shots) */
  planShotPackages: protectedProcedure
    .input(z.object({
      sceneId: z.number(),
      targetDurationSeconds: z.number().min(10).max(600), // up to 10 minutes per scene
      shotDurationSeconds: z.number().min(5).max(30).default(10), // each sub-shot
    }))
    .mutation(async ({ input, ctx }) => {
      await rateLimitAI(ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [scene] = await db
        .select()
        .from(scenes)
        .where(eq(scenes.id, input.sceneId))
        .limit(1);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      await requireProjectAccess(scene.projectId, ctx.user.id);

      const numShots = Math.ceil(input.targetDurationSeconds / input.shotDurationSeconds);

      // AI-generate shot breakdown
      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "You are a Hollywood cinematographer. Break a scene into individual shots for AI video generation. Each shot needs a self-contained visual prompt. Return JSON only." },
          { role: "user", content: `Scene: "${scene.title || "Untitled"}"\nDescription: ${scene.description || ""}\nLocation: ${scene.locationType || ""}\nMood: ${scene.mood || ""}\nLighting: ${scene.lighting || ""}\nTime of day: ${scene.timeOfDay || ""}\nCamera angle: ${scene.cameraAngle || ""}\n\nBreak this into exactly ${numShots} shots of ~${input.shotDurationSeconds}s each. Each shot must be visually continuous with the previous. Vary camera angles for cinematic feel. Return JSON: { shots: [{ index: number, prompt: string, cameraAngle: string, movement: string, description: string }] }` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "shot_breakdown",
            strict: true,
            schema: {
              type: "object",
              properties: {
                shots: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer" },
                      prompt: { type: "string" },
                      cameraAngle: { type: "string" },
                      movement: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["index", "prompt", "cameraAngle", "movement", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["shots"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      const parsed = safeJsonExtract<any>(content, {});

      // Delete existing shot packages for this scene
      await db.delete(shotPackages).where(and(eq(shotPackages.sceneId, input.sceneId), eq(shotPackages.userId, ctx.user.id)));

      // Create new shot packages
      const shotValues: InsertShotPackage[] = (parsed.shots || []).map((shot: any) => ({
        sceneId: input.sceneId,
        projectId: scene.projectId,
        userId: ctx.user.id,
        shotIndex: shot.index,
        prompt: shot.prompt,
        durationSeconds: input.shotDurationSeconds,
        status: "pending",
        retryCount: 0,
        metadata: { cameraAngle: shot.cameraAngle, movement: shot.movement, description: shot.description },
      }));

      if (shotValues.length > 0) {
        await db.insert(shotPackages).values(shotValues);
      }

      const created = await db
        .select()
        .from(shotPackages)
        .where(and(eq(shotPackages.sceneId, input.sceneId), eq(shotPackages.userId, ctx.user.id)))
        .orderBy(asc(shotPackages.shotIndex));

      return { success: true, shotCount: created.length, shots: created };
    }),

  /** Update a shot package status/result */
  updateShotPackage: protectedProcedure
    .input(z.object({
      shotPackageId: z.number(),
      status: z.enum(["pending", "generating", "completed", "failed", "retrying"]).optional(),
      videoUrl: z.string().optional(),
      videoKey: z.string().optional(),
      keyframeUrl: z.string().optional(),
      provider: z.string().optional(),
      errorMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const updates: Partial<InsertShotPackage> = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.videoUrl !== undefined) updates.videoUrl = input.videoUrl;
      if (input.videoKey !== undefined) updates.videoKey = input.videoKey;
      if (input.keyframeUrl !== undefined) updates.keyframeUrl = input.keyframeUrl;
      if (input.provider !== undefined) updates.provider = input.provider;
      if (input.errorMessage !== undefined) updates.errorMessage = input.errorMessage;
      await db
        .update(shotPackages)
        .set(updates)
        .where(and(eq(shotPackages.id, input.shotPackageId), eq(shotPackages.userId, ctx.user.id)));
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CONTINUITY RECORDS — Wardrobe, props, time-of-day, character states
  // ══════════════════════════════════════════════════════════════════════════

  /** Get continuity record for a scene */
  getContinuityRecord: protectedProcedure
    .input(z.object({ sceneId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [scene] = await db
        .select({ projectId: scenes.projectId })
        .from(scenes)
        .where(eq(scenes.id, input.sceneId))
        .limit(1);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      await requireProjectAccess(scene.projectId, ctx.user.id);

      const [record] = await db
        .select()
        .from(continuityRecords)
        .where(and(eq(continuityRecords.sceneId, input.sceneId), eq(continuityRecords.userId, ctx.user.id)))
        .limit(1);
      return record || null;
    }),

  /** Get all continuity records for a project */
  listContinuityRecords: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select()
        .from(continuityRecords)
        .where(and(eq(continuityRecords.projectId, input.projectId), eq(continuityRecords.userId, ctx.user.id)))
        .orderBy(asc(continuityRecords.sceneId));
    }),

  /** Save/update continuity record for a scene */
  saveContinuityRecord: protectedProcedure
    .input(z.object({
      sceneId: z.number(),
      projectId: z.number(),
      wardrobeNotes: z.string().optional(),
      wardrobeImages: z.any().optional(),
      propNotes: z.string().optional(),
      propList: z.any().optional(),
      timeOfDay: z.string().optional(),
      dayNumber: z.number().optional(),
      locationNotes: z.string().optional(),
      characterStates: z.any().optional(),
      dependsOnSceneId: z.number().optional(),
      emotionalCarryover: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select({ id: continuityRecords.id })
        .from(continuityRecords)
        .where(and(eq(continuityRecords.sceneId, input.sceneId), eq(continuityRecords.userId, ctx.user.id)))
        .limit(1);

      const recordData: Partial<InsertContinuityRecord> = {
        sceneId: input.sceneId,
        projectId: input.projectId,
        userId: ctx.user.id,
        lastCheckedAt: new Date(),
      };
      if (input.wardrobeNotes !== undefined) recordData.wardrobeNotes = input.wardrobeNotes;
      if (input.wardrobeImages !== undefined) recordData.wardrobeImages = input.wardrobeImages;
      if (input.propNotes !== undefined) recordData.propNotes = input.propNotes;
      if (input.propList !== undefined) recordData.propList = input.propList;
      if (input.timeOfDay !== undefined) recordData.timeOfDay = input.timeOfDay;
      if (input.dayNumber !== undefined) recordData.dayNumber = input.dayNumber;
      if (input.locationNotes !== undefined) recordData.locationNotes = input.locationNotes;
      if (input.characterStates !== undefined) recordData.characterStates = input.characterStates;
      if (input.dependsOnSceneId !== undefined) recordData.dependsOnSceneId = input.dependsOnSceneId;
      if (input.emotionalCarryover !== undefined) recordData.emotionalCarryover = input.emotionalCarryover;

      if (existing) {
        await db.update(continuityRecords).set(recordData).where(eq(continuityRecords.id, existing.id));
      } else {
        await db.insert(continuityRecords).values(recordData as InsertContinuityRecord);
      }
      return { success: true };
    }),

  /** AI-generate continuity records for all scenes in a project */
  generateContinuityRecords: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await rateLimitAI(ctx.user.id);
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const projectScenes = await db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.orderIndex));

      if (projectScenes.length === 0) return { success: true, count: 0 };

      const sceneList = projectScenes.map((s, i) =>
        `Scene ${i + 1}: "${s.title || "Untitled"}" — ${s.description?.slice(0, 150) || ""} | Location: ${s.locationType || ""} | Time: ${s.timeOfDay || ""} | Characters: ${JSON.stringify(s.characterIds || [])}`
      ).join("\n");

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional script supervisor. Generate continuity records for each scene. Return JSON only." },
          { role: "user", content: `Film: "${project.title}"\n\nScenes:\n${sceneList}\n\nFor each scene, generate continuity data including wardrobe notes, prop list, time of day, day number in story, location notes, character emotional states, and emotional carryover from previous scene. Return JSON: { records: [{ sceneIndex: number, wardrobeNotes: string, propNotes: string, timeOfDay: string, dayNumber: number, locationNotes: string, emotionalCarryover: string }] }` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "continuity_records",
            strict: true,
            schema: {
              type: "object",
              properties: {
                records: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sceneIndex: { type: "integer" },
                      wardrobeNotes: { type: "string" },
                      propNotes: { type: "string" },
                      timeOfDay: { type: "string" },
                      dayNumber: { type: "integer" },
                      locationNotes: { type: "string" },
                      emotionalCarryover: { type: "string" },
                    },
                    required: ["sceneIndex", "wardrobeNotes", "propNotes", "timeOfDay", "dayNumber", "locationNotes", "emotionalCarryover"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["records"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      const parsed = safeJsonExtract<any>(content, {});
      let count = 0;

      for (const record of parsed.records || []) {
        const scene = projectScenes[record.sceneIndex - 1];
        if (!scene) continue;

        const [existing] = await db
          .select({ id: continuityRecords.id })
          .from(continuityRecords)
          .where(and(eq(continuityRecords.sceneId, scene.id), eq(continuityRecords.userId, ctx.user.id)))
          .limit(1);

        const prevScene = record.sceneIndex > 1 ? projectScenes[record.sceneIndex - 2] : null;
        const data: InsertContinuityRecord = {
          sceneId: scene.id,
          projectId: input.projectId,
          userId: ctx.user.id,
          wardrobeNotes: record.wardrobeNotes,
          propNotes: record.propNotes,
          timeOfDay: record.timeOfDay,
          dayNumber: record.dayNumber,
          locationNotes: record.locationNotes,
          emotionalCarryover: record.emotionalCarryover,
          dependsOnSceneId: prevScene?.id || null,
          lastCheckedAt: new Date(),
        };

        if (existing) {
          await db.update(continuityRecords).set(data).where(eq(continuityRecords.id, existing.id));
        } else {
          await db.insert(continuityRecords).values(data);
        }
        count++;
      }

      return { success: true, count };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // FEATURE AUDIO PLANS — Voice assignments, music cues, mix settings
  // ══════════════════════════════════════════════════════════════════════════

  /** Get audio plan for a project */
  getAudioPlan: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [plan] = await db
        .select()
        .from(featureAudioPlans)
        .where(and(eq(featureAudioPlans.projectId, input.projectId), eq(featureAudioPlans.userId, ctx.user.id)))
        .limit(1);
      return plan || null;
    }),

  /** Save/update audio plan for a project */
  saveAudioPlan: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      voiceAssignments: z.any().optional(),
      ambientLayers: z.any().optional(),
      musicCues: z.any().optional(),
      dialogueBus: z.number().min(0).max(1).optional(),
      musicBus: z.number().min(0).max(1).optional(),
      effectsBus: z.number().min(0).max(1).optional(),
      masterVolume: z.number().min(0).max(1).optional(),
      audioPassNotes: z.string().optional(),
      mixStatus: z.enum(["draft", "in-progress", "locked", "final"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select({ id: featureAudioPlans.id })
        .from(featureAudioPlans)
        .where(and(eq(featureAudioPlans.projectId, input.projectId), eq(featureAudioPlans.userId, ctx.user.id)))
        .limit(1);

      const planData: Partial<InsertFeatureAudioPlan> = {
        projectId: input.projectId,
        userId: ctx.user.id,
      };
      if (input.voiceAssignments !== undefined) planData.voiceAssignments = input.voiceAssignments;
      if (input.ambientLayers !== undefined) planData.ambientLayers = input.ambientLayers;
      if (input.musicCues !== undefined) planData.musicCues = input.musicCues;
      if (input.dialogueBus !== undefined) planData.dialogueBus = input.dialogueBus;
      if (input.musicBus !== undefined) planData.musicBus = input.musicBus;
      if (input.effectsBus !== undefined) planData.effectsBus = input.effectsBus;
      if (input.masterVolume !== undefined) planData.masterVolume = input.masterVolume;
      if (input.audioPassNotes !== undefined) planData.audioPassNotes = input.audioPassNotes;
      if (input.mixStatus !== undefined) planData.mixStatus = input.mixStatus;

      if (existing) {
        await db.update(featureAudioPlans).set(planData).where(eq(featureAudioPlans.id, existing.id));
      } else {
        await db.insert(featureAudioPlans).values(planData as InsertFeatureAudioPlan);
      }
      return { success: true };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // CHARACTER ARCS — Tracking character development across scenes
  // ══════════════════════════════════════════════════════════════════════════

  /** List character arcs for a project */
  listCharacterArcs: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select()
        .from(characterArcs)
        .where(and(eq(characterArcs.projectId, input.projectId), eq(characterArcs.userId, ctx.user.id)));
    }),

  /** Save/update a character arc */
  saveCharacterArc: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      characterId: z.number(),
      arcType: z.string().optional(),
      arcSummary: z.string().optional(),
      arcBeats: z.any().optional(),
      startingState: z.string().optional(),
      endingState: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [existing] = await db
        .select({ id: characterArcs.id })
        .from(characterArcs)
        .where(and(
          eq(characterArcs.projectId, input.projectId),
          eq(characterArcs.characterId, input.characterId),
          eq(characterArcs.userId, ctx.user.id)
        ))
        .limit(1);

      const arcData: Partial<InsertCharacterArc> = {
        projectId: input.projectId,
        characterId: input.characterId,
        userId: ctx.user.id,
      };
      if (input.arcType !== undefined) arcData.arcType = input.arcType;
      if (input.arcSummary !== undefined) arcData.arcSummary = input.arcSummary;
      if (input.arcBeats !== undefined) arcData.arcBeats = input.arcBeats;
      if (input.startingState !== undefined) arcData.startingState = input.startingState;
      if (input.endingState !== undefined) arcData.endingState = input.endingState;

      if (existing) {
        await db.update(characterArcs).set(arcData).where(eq(characterArcs.id, existing.id));
      } else {
        await db.insert(characterArcs).values(arcData as InsertCharacterArc);
      }
      return { success: true };
    }),

  /** AI-generate character arcs for all characters in a project */
  generateCharacterArcs: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await rateLimitAI(ctx.user.id);
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { characters } = await import("../drizzle/schema");
      const projectChars = await db
        .select()
        .from(characters)
        .where(eq(characters.projectId, input.projectId));

      if (projectChars.length === 0) return { success: true, count: 0 };

      const projectScenes = await db
        .select({ id: scenes.id, title: scenes.title, description: scenes.description, characterIds: scenes.characterIds })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.orderIndex));

      const charList = projectChars.map((c) => `${c.id}: ${c.name} (${c.role || "character"})`).join("\n");
      const sceneList = projectScenes.map((s, i) =>
        `Scene ${i + 1}: "${s.title || "Untitled"}" — ${s.description?.slice(0, 100) || ""} — Characters: ${JSON.stringify(s.characterIds || [])}`
      ).join("\n");

      const llmResult = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional story analyst. Generate character arc analyses. Return JSON only." },
          { role: "user", content: `Film: "${project.title}"\nPlot: ${project.plotSummary || ""}\n\nCharacters:\n${charList}\n\nScenes:\n${sceneList}\n\nFor each character, generate: arcType (transformation/flat/corruption/disillusionment), arcSummary, startingState, endingState, and 3-5 key arc beats with scene references. Return JSON: { arcs: [{ characterId: number, arcType: string, arcSummary: string, startingState: string, endingState: string, arcBeats: [{ sceneIndex: number, beat: string, emotionalState: string }] }] }` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "character_arcs",
            strict: true,
            schema: {
              type: "object",
              properties: {
                arcs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      characterId: { type: "integer" },
                      arcType: { type: "string" },
                      arcSummary: { type: "string" },
                      startingState: { type: "string" },
                      endingState: { type: "string" },
                      arcBeats: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            sceneIndex: { type: "integer" },
                            beat: { type: "string" },
                            emotionalState: { type: "string" },
                          },
                          required: ["sceneIndex", "beat", "emotionalState"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["characterId", "arcType", "arcSummary", "startingState", "endingState", "arcBeats"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["arcs"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = llmResult.choices[0]?.message?.content;
      const parsed = safeJsonExtract<any>(content, {});
      let count = 0;

      for (const arc of parsed.arcs || []) {
        const char = projectChars.find((c) => c.id === arc.characterId);
        if (!char) continue;

        const [existing] = await db
          .select({ id: characterArcs.id })
          .from(characterArcs)
          .where(and(
            eq(characterArcs.projectId, input.projectId),
            eq(characterArcs.characterId, arc.characterId),
            eq(characterArcs.userId, ctx.user.id)
          ))
          .limit(1);

        const arcData: InsertCharacterArc = {
          projectId: input.projectId,
          characterId: arc.characterId,
          userId: ctx.user.id,
          arcType: arc.arcType,
          arcSummary: arc.arcSummary,
          startingState: arc.startingState,
          endingState: arc.endingState,
          arcBeats: arc.arcBeats,
        };

        if (existing) {
          await db.update(characterArcs).set(arcData).where(eq(characterArcs.id, existing.id));
        } else {
          await db.insert(characterArcs).values(arcData);
        }
        count++;
      }

      return { success: true, count };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // FILM COMPILE JOBS — One-click full-film assembly
  // ══════════════════════════════════════════════════════════════════════════

  /** Get compile job status */
  getCompileJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [job] = await db
        .select()
        .from(filmCompileJobs)
        .where(and(eq(filmCompileJobs.id, input.jobId), eq(filmCompileJobs.userId, ctx.user.id)))
        .limit(1);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Compile job not found" });
      return job;
    }),

  /** List compile jobs for a project */
  listCompileJobs: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      return db
        .select()
        .from(filmCompileJobs)
        .where(and(eq(filmCompileJobs.projectId, input.projectId), eq(filmCompileJobs.userId, ctx.user.id)))
        .orderBy(desc(filmCompileJobs.createdAt));
    }),

  /**
   * Compile a full feature film from a cut.
   * Stitches all included scenes using the existing videoStitcher,
   * prepends the Virelle Studios opener, and saves to My Movies.
   */
  compileFilm: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      cutId: z.number().optional(), // if omitted, uses all project scenes in order
      includeOpener: z.boolean().default(true),
      includeCredits: z.boolean().default(true),
      burnSubtitles: z.boolean().default(false),
      resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
      frameRate: z.number().default(24),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Create compile job record
      const [jobResult] = await db.insert(filmCompileJobs).values({
        projectId: input.projectId,
        cutId: input.cutId || null,
        userId: ctx.user.id,
        status: "queued",
        progress: 0,
        currentStep: "Initializing...",
        includeOpener: input.includeOpener,
        includeCredits: input.includeCredits,
        burnSubtitles: input.burnSubtitles,
        resolution: input.resolution,
        frameRate: input.frameRate,
      } as InsertFilmCompileJob);
      const jobId = (jobResult as any).insertId as number;

      // Run compilation in background
      setImmediate(async () => {
        try {
          await db.update(filmCompileJobs).set({ status: "processing", startedAt: new Date(), currentStep: "Loading scenes..." }).where(eq(filmCompileJobs.id, jobId));

          // Get scenes to compile
          let scenesToCompile: any[] = [];

          if (input.cutId) {
            // Use feature cut scene list
            const cutSceneRows = await db
              .select()
              .from(featureCutScenes)
              .where(and(eq(featureCutScenes.cutId, input.cutId), eq(featureCutScenes.isIncluded, true)))
              .orderBy(asc(featureCutScenes.orderIndex));

            const sceneIds = cutSceneRows.map((cs) => cs.sceneId);
            if (sceneIds.length === 0) {
              await db.update(filmCompileJobs).set({ status: "failed", errorMessage: "No included scenes in cut." }).where(eq(filmCompileJobs.id, jobId));
              return;
            }

            const sceneRows = await db
              .select()
              .from(scenes)
              .where(sql`${scenes.id} IN (${sql.join(sceneIds.map((id) => sql`${id}`), sql`, `)})`);
            const sceneMap = new Map(sceneRows.map((s) => [s.id, s]));

            scenesToCompile = cutSceneRows
              .map((cs) => {
                const s = sceneMap.get(cs.sceneId);
                if (!s) return null;
                return {
                  ...s,
                  trimIn: cs.trimIn,
                  trimOut: cs.trimOut,
                  transitionType: cs.transitionType,
                  transitionDuration: cs.transitionDuration,
                };
              })
              .filter(Boolean);
          } else {
            // Use all project scenes in order
            scenesToCompile = await db
              .select()
              .from(scenes)
              .where(eq(scenes.projectId, input.projectId))
              .orderBy(asc(scenes.orderIndex));
          }

          const scenesWithVideo = scenesToCompile.filter((s: any) => s.videoUrl);
          if (scenesWithVideo.length === 0) {
            await db.update(filmCompileJobs).set({
              status: "failed",
              errorMessage: "No scenes have video clips. Generate scene videos first.",
            }).where(eq(filmCompileJobs.id, jobId));
            return;
          }

          await db.update(filmCompileJobs).set({ progress: 10, currentStep: `Found ${scenesWithVideo.length} scenes with video. Loading opener...` }).where(eq(filmCompileJobs.id, jobId));

          // Fetch Virelle Studios opener scenes
          let openerScenes: any[] = [];
          if (input.includeOpener) {
            try {
              const { sql: drizzleSql } = await import("drizzle-orm");
              const dbConn = await getDb();
              if (!dbConn) throw new Error("DB not available");
              const openerRows = await dbConn.execute(
                drizzleSql`SELECT p.id FROM projects p WHERE p.title LIKE '%Opener%' AND p.userId = ${ctx.user.id} ORDER BY p.id DESC LIMIT 1`
              );
              const openerProj = (Array.isArray(openerRows[0]) ? openerRows[0] : openerRows as any[])?.[0];
              if (openerProj) {
                const opScenes = await dbConn
                  .select()
                  .from(scenes)
                  .where(eq(scenes.projectId, openerProj.id));
                openerScenes = opScenes
                  .filter((s: any) => s.videoUrl && s.status === "completed")
                  .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map((s: any) => ({ videoUrl: s.videoUrl, title: s.title, duration: s.duration, orderIndex: s.orderIndex }));
              }
            } catch (e) {
              console.warn("[CompileFilm] Could not load opener scenes:", e);
            }
          }

          await db.update(filmCompileJobs).set({ progress: 20, currentStep: "Stitching scenes..." }).where(eq(filmCompileJobs.id, jobId));

          // Build scene input list for stitcher
          const userSceneInputs = scenesWithVideo.map((s: any) => ({
            videoUrl: s.videoUrl,
            title: s.title || undefined,
            duration: s.duration || undefined,
            orderIndex: s.orderIndex || 0,
            transition: s.transitionType || "fade",
            transitionDuration: s.transitionDuration || 0.8,
          }));

          const allSceneInputs = [...openerScenes, ...userSceneInputs];

          // Get credits if needed
          let projectCredits: any[] = [];
          if (input.includeCredits) {
            try {
              const { credits } = await import("../drizzle/schema");
              projectCredits = await db
                .select()
                .from(credits)
                .where(eq(credits.projectId, input.projectId));
            } catch (e) {
              console.warn("[CompileFilm] Could not load credits:", e);
            }
          }

          const { stitchMovie } = await import("./_core/videoStitcher");
          const result = await stitchMovie({
            scenes: allSceneInputs,
            projectTitle: project.title,
            userId: ctx.user.id,
            projectId: input.projectId,
            showTitleCard: true,
            titleCardDuration: 5,
            showCredits: projectCredits.length > 0,
            credits: projectCredits.map((c: any) => ({ role: c.role, name: c.name })),
            creditsDuration: Math.max(15, projectCredits.length * 3),
            burnSubtitles: input.burnSubtitles,
            resolution: input.resolution,
            genre: project.genre || undefined,
          });

          await db.update(filmCompileJobs).set({ progress: 90, currentStep: "Saving to My Movies..." }).where(eq(filmCompileJobs.id, jobId));

          // Save to movies table
          const { movies } = await import("../drizzle/schema");
          await db.insert(movies).values({
            userId: ctx.user.id,
            title: project.title,
            description: project.plotSummary || project.description || "",
            type: "film",
            projectId: input.projectId,
            movieTitle: project.title,
            thumbnailUrl: project.thumbnailUrl,
            fileUrl: result.fileUrl,
            fileKey: result.fileKey,
            fileSize: result.fileSize,
            duration: result.duration,
            mimeType: result.mimeType,
            tags: project.genre ? [project.genre] : [],
          } as any);

          await db.update(filmCompileJobs).set({
            status: "completed",
            progress: 100,
            currentStep: "Done",
            resultUrl: result.fileUrl,
            resultKey: result.fileKey,
            resultDuration: result.duration,
            resultFileSize: result.fileSize,
            completedAt: new Date(),
          }).where(eq(filmCompileJobs.id, jobId));

        } catch (err: any) {
          console.error("[CompileFilm] Job failed:", err.message);
          await db.update(filmCompileJobs).set({
            status: "failed",
            errorMessage: err.message,
          }).where(eq(filmCompileJobs.id, jobId)).catch(() => {});
        }
      });

      return { success: true, jobId, message: "Film compilation started. Check job status for progress." };
    }),

  // ══════════════════════════════════════════════════════════════════════════
  // LONGFORM PROJECT MODE — Project-level feature film settings
  // ══════════════════════════════════════════════════════════════════════════

  /** Get feature film summary for a project (cuts, continuity status, audio plan) */
  getFeatureFilmSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [cuts, continuityCount, audioPlans, arcs, compileJobs, projectScenes] = await Promise.all([
        db.select().from(featureCuts).where(and(eq(featureCuts.projectId, input.projectId), eq(featureCuts.userId, ctx.user.id))).orderBy(desc(featureCuts.createdAt)),
        db.select({ count: sql<number>`COUNT(*)` }).from(continuityRecords).where(and(eq(continuityRecords.projectId, input.projectId), eq(continuityRecords.userId, ctx.user.id))),
        db.select().from(featureAudioPlans).where(and(eq(featureAudioPlans.projectId, input.projectId), eq(featureAudioPlans.userId, ctx.user.id))).limit(1),
        db.select().from(characterArcs).where(and(eq(characterArcs.projectId, input.projectId), eq(characterArcs.userId, ctx.user.id))),
        db.select().from(filmCompileJobs).where(and(eq(filmCompileJobs.projectId, input.projectId), eq(filmCompileJobs.userId, ctx.user.id))).orderBy(desc(filmCompileJobs.createdAt)).limit(5),
        db.select({ id: scenes.id, status: scenes.status, videoUrl: sql<string | null>`${scenes.videoUrl}`, duration: scenes.duration }).from(scenes).where(eq(scenes.projectId, input.projectId)),
      ]);

      const totalScenes = projectScenes.length;
      const scenesWithVideo = projectScenes.filter((s: any) => s.videoUrl).length;
      const scenesCompleted = projectScenes.filter((s: any) => s.status === "completed").length;
      const totalDuration = projectScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);

      return {
        project: { id: project.id, title: project.title, genre: project.genre, actStructure: project.actStructure },
        cuts,
        defaultCut: cuts.find((c) => c.isDefault) || cuts[0] || null,
        continuityRecordsCount: (continuityCount[0]?.count as number) || 0,
        audioPlan: audioPlans[0] || null,
        characterArcs: arcs,
        recentCompileJobs: compileJobs,
        sceneStats: { totalScenes, scenesWithVideo, scenesCompleted, totalDurationSeconds: totalDuration },
        readyToCompile: scenesWithVideo > 0,
      };
    }),

  /* ─── Email Press Kit to recipients ─── */
  emailPressKit: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      recipients: z.array(z.string().email()).min(1).max(20),
      kit: z.object({
        tagline: z.string().optional(),
        synopsisShort: z.string().optional(),
        synopsisLong: z.string().optional(),
        directorBio: z.string().optional(),
        productionCompany: z.string().optional(),
        contactEmail: z.string().optional(),
        technicalSpecs: z.string().optional(),
        festivals: z.string().optional(),
        awards: z.string().optional(),
        pressQuotes: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verified project access — prevents unauthorized SMTP abuse
      const project = await requireProjectAccess(input.projectId, ctx.user.id);
      const projectTitle = (project as any).title || "Untitled Project";

      // Lightweight per-user rate limit: max 10 press-kit emails per hour
      try {
        const dbConn = await getDb();
        if (dbConn) {
          const r: any = await dbConn.execute(sql`SELECT COUNT(*) AS n FROM credit_transactions WHERE userId = ${ctx.user.id} AND action = 'press_kit_email' AND createdAt > NOW() - INTERVAL '1 HOUR'`);
          const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
          const n = Number(arr?.[0]?.n || 0);
          if (n >= 10) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Press-kit email limit reached (10/hour). Try again later." });
        }
      } catch (e: any) { if (e instanceof TRPCError) throw e; }

      const nodemailer = (await import("nodemailer")).default;
      const { ENV } = await import("./_core/env");
      const smtpUser = (ENV as any).SMTP_USER;
      const smtpPass = (ENV as any).SMTP_PASS;
      if (!smtpUser || !smtpPass) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Email service is not configured. Contact support." });
      }
      const port = Number((ENV as any).SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: (ENV as any).SMTP_HOST || "smtp.gmail.com",
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      const k = input.kit;
      const shareUrl = `${(ENV as any).PUBLIC_URL || "https://virelle.life"}/projects/${input.projectId}/press-kit`;
      const html = `
<!DOCTYPE html><html><body style="font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:24px;color:#111">
  <div style="text-align:center;border-bottom:2px solid #b8860b;padding-bottom:16px;margin-bottom:24px">
    <div style="text-transform:uppercase;letter-spacing:0.2em;color:#b8860b;font-size:11px">Electronic Press Kit</div>
    <h1 style="font-size:28px;margin:6px 0">${escapeHtml(projectTitle)}</h1>
    ${k.tagline ? `<p style="font-style:italic;margin:0;color:#555">${escapeHtml(k.tagline)}</p>` : ""}
  </div>
  ${section("Logline / Short Synopsis", k.synopsisShort)}
  ${section("Synopsis", k.synopsisLong)}
  ${section("Director's Bio", k.directorBio)}
  ${section("Technical Specs", k.technicalSpecs)}
  ${section("Festivals & Selections", k.festivals)}
  ${section("Awards", k.awards)}
  ${k.pressQuotes ? `<section style="margin-bottom:16px"><h2 style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;border-bottom:1px solid #ddd;padding-bottom:4px">Press</h2><p style="font-style:italic;white-space:pre-wrap">${escapeHtml(k.pressQuotes)}</p></section>` : ""}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#555">
    <p>${k.productionCompany ? `<strong>${escapeHtml(k.productionCompany)}</strong><br>` : ""}${k.contactEmail ? `Contact: <a href="mailto:${escapeHtml(k.contactEmail)}">${escapeHtml(k.contactEmail)}</a>` : ""}</p>
    <p>Live press kit: <a href="${shareUrl}">${shareUrl}</a></p>
    <p style="font-size:10px;color:#999;margin-top:16px">Sent via Virelle Studios on behalf of ${escapeHtml(ctx.user.name || ctx.user.email || "the production")}.</p>
  </div>
</body></html>`.trim();
      try {
        await transporter.sendMail({
          from: `"${ctx.user.name || "Virelle Studios"}" <${smtpUser}>`,
          to: input.recipients.join(", "),
          replyTo: k.contactEmail || ctx.user.email || undefined,
          subject: `Press Kit — ${projectTitle}`,
          html,
        });
        // Record send for rate limiting (zero-cost transaction)
        try {
          const dbConn = await getDb();
          if (dbConn) {
            await dbConn.execute(sql`INSERT INTO credit_transactions (userId, amount, action, description, createdAt) VALUES (${ctx.user.id}, 0, 'press_kit_email', ${`Press kit emailed to ${input.recipients.length} recipient(s) for project ${input.projectId}`}, NOW())`);
          }
        } catch (_) { /* non-critical */ }
      } catch (err: any) {
        if (err instanceof TRPCError) throw err;
        console.error("[FeatureFilmRouter] emailPressKit failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Email delivery failed. Try again later or contact support." });
      }
      return { success: true, message: `Press kit sent to ${input.recipients.length} recipient(s).`, recipients: input.recipients.length };
    }),
});

function escapeHtml(s: string | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function section(title: string, body: string | undefined): string {
  if (!body) return "";
  return `<section style="margin-bottom:16px"><h2 style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;border-bottom:1px solid #ddd;padding-bottom:4px">${title}</h2><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(body)}</p></section>`;
}
