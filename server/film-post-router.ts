/**
 * Film Post-Production Router
 * Handles professional film post-production audio workflows:
 * - Three-bus mix (Dialogue / Music / Effects) with EQ and reverb
 * - ADR / Dialogue replacement tracks
 * - Foley track management (footsteps, cloth, props, impacts, environmental)
 * - Score cue placement and management
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  filmMixSettings,
  filmAdrTracks,
  filmFoleyTracks,
  filmScoreCues,
} from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";

// ─── Mix Settings ─────────────────────────────────────────────────────────────

const mixSettingsInput = z.object({
  projectId: z.number(),
  dialogueBus: z.number().min(0).max(1).optional(),
  musicBus: z.number().min(0).max(1).optional(),
  effectsBus: z.number().min(0).max(1).optional(),
  masterVolume: z.number().min(0).max(1).optional(),
  dialogueEqLow: z.number().min(-12).max(12).optional(),
  dialogueEqMid: z.number().min(-12).max(12).optional(),
  dialogueEqHigh: z.number().min(-12).max(12).optional(),
  musicEqLow: z.number().min(-12).max(12).optional(),
  musicEqMid: z.number().min(-12).max(12).optional(),
  musicEqHigh: z.number().min(-12).max(12).optional(),
  sfxEqLow: z.number().min(-12).max(12).optional(),
  sfxEqMid: z.number().min(-12).max(12).optional(),
  sfxEqHigh: z.number().min(-12).max(12).optional(),
  reverbRoom: z.enum(["none", "small", "medium", "large", "hall", "cathedral"]).optional(),
  reverbAmount: z.number().min(0).max(1).optional(),
  compressionRatio: z.number().min(1).max(20).optional(),
  noiseReduction: z.boolean().optional(),
  notes: z.string().optional(),
});

export const filmPostRouter = router({
  // ─── Mix Settings ───────────────────────────────────────────────────────────
  getMixSettings: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db
        .select()
        .from(filmMixSettings)
        .where(eq(filmMixSettings.projectId, input.projectId));
      return row ?? null;
    }),

  saveMixSettings: protectedProcedure
    .input(mixSettingsInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { projectId, ...data } = input;
      const [existing] = await db
        .select({ id: filmMixSettings.id })
        .from(filmMixSettings)
        .where(eq(filmMixSettings.projectId, projectId));
      if (existing) {
        await db
          .update(filmMixSettings)
          .set({ ...data })
          .where(eq(filmMixSettings.projectId, projectId));
      } else {
        await db.insert(filmMixSettings).values({
          projectId,
          userId: ctx.user.id,
          ...data,
        });
      }
      const [row] = await db
        .select()
        .from(filmMixSettings)
        .where(eq(filmMixSettings.projectId, projectId));
      return row;
    }),

  resetMixSettings: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .delete(filmMixSettings)
        .where(eq(filmMixSettings.projectId, input.projectId));
      return { success: true };
    }),

  // ─── ADR Tracks ─────────────────────────────────────────────────────────────
  listAdrTracks: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(filmAdrTracks)
        .where(eq(filmAdrTracks.projectId, input.projectId))
        .orderBy(asc(filmAdrTracks.createdAt));
    }),

  createAdrTrack: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sceneId: z.number().optional(),
      characterName: z.string().min(1),
      dialogueLine: z.string().min(1),
      trackType: z.enum(["adr", "wild_track", "loop_group", "walla"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(filmAdrTracks).values({
        ...input,
        userId: ctx.user.id,
        status: "pending",
      });
      const [row] = await db
        .select()
        .from(filmAdrTracks)
        .where(eq(filmAdrTracks.id, (result as any).insertId));
      return row;
    }),

  updateAdrTrack: protectedProcedure
    .input(z.object({
      id: z.number(),
      characterName: z.string().optional(),
      dialogueLine: z.string().optional(),
      trackType: z.enum(["adr", "wild_track", "loop_group", "walla"]).optional(),
      status: z.enum(["pending", "recorded", "approved", "rejected"]).optional(),
      fileUrl: z.string().optional(),
      fileKey: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(filmAdrTracks).set(data).where(eq(filmAdrTracks.id, id));
      const [row] = await db.select().from(filmAdrTracks).where(eq(filmAdrTracks.id, id));
      return row;
    }),

  deleteAdrTrack: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(filmAdrTracks).where(eq(filmAdrTracks.id, input.id));
      return { success: true };
    }),

  // ─── Foley Tracks ───────────────────────────────────────────────────────────
  listFoleyTracks: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(filmFoleyTracks)
        .where(eq(filmFoleyTracks.projectId, input.projectId))
        .orderBy(asc(filmFoleyTracks.createdAt));
    }),

  createFoleyTrack: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sceneId: z.number().optional(),
      name: z.string().min(1),
      foleyType: z.enum(["footsteps", "cloth", "props", "impacts", "environmental", "custom"]).optional(),
      description: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      startTime: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(filmFoleyTracks).values({
        ...input,
        userId: ctx.user.id,
      });
      const [row] = await db
        .select()
        .from(filmFoleyTracks)
        .where(eq(filmFoleyTracks.id, (result as any).insertId));
      return row;
    }),

  updateFoleyTrack: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      foleyType: z.enum(["footsteps", "cloth", "props", "impacts", "environmental", "custom"]).optional(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
      fileKey: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      startTime: z.number().optional(),
      notes: z.string().optional(),
      status: z.enum(["pending", "recorded", "approved"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(filmFoleyTracks).set(data).where(eq(filmFoleyTracks.id, id));
      const [row] = await db.select().from(filmFoleyTracks).where(eq(filmFoleyTracks.id, id));
      return row;
    }),

  deleteFoleyTrack: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(filmFoleyTracks).where(eq(filmFoleyTracks.id, input.id));
      return { success: true };
    }),

  // ─── Score Cues ─────────────────────────────────────────────────────────────
  listScoreCues: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(filmScoreCues)
        .where(eq(filmScoreCues.projectId, input.projectId))
        .orderBy(asc(filmScoreCues.cueNumber));
    }),

  createScoreCue: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sceneId: z.number().optional(),
      cueNumber: z.string().min(1),
      title: z.string().min(1),
      cueType: z.enum(["underscore", "source_music", "sting", "theme", "transition", "silence"]).optional(),
      description: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      fadeIn: z.number().min(0).max(30).optional(),
      fadeOut: z.number().min(0).max(30).optional(),
      startTime: z.number().optional(),
      duration: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [result] = await db.insert(filmScoreCues).values({
        ...input,
        userId: ctx.user.id,
      });
      const [row] = await db
        .select()
        .from(filmScoreCues)
        .where(eq(filmScoreCues.id, (result as any).insertId));
      return row;
    }),

  updateScoreCue: protectedProcedure
    .input(z.object({
      id: z.number(),
      cueNumber: z.string().optional(),
      title: z.string().optional(),
      cueType: z.enum(["underscore", "source_music", "sting", "theme", "transition", "silence"]).optional(),
      description: z.string().optional(),
      fileUrl: z.string().optional(),
      fileKey: z.string().optional(),
      volume: z.number().min(0).max(1).optional(),
      fadeIn: z.number().min(0).max(30).optional(),
      fadeOut: z.number().min(0).max(30).optional(),
      startTime: z.number().optional(),
      duration: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(filmScoreCues).set(data).where(eq(filmScoreCues.id, id));
      const [row] = await db.select().from(filmScoreCues).where(eq(filmScoreCues.id, id));
      return row;
    }),

  deleteScoreCue: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(filmScoreCues).where(eq(filmScoreCues.id, input.id));
      return { success: true };
    }),
});
