import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { locations, projects, scenes } from "../drizzle/schema";

/**
 * Location Recreation Router
 * 
 * Handles the upload and AI analysis of location videos to recreate them
 * as digital sets for film productions.
 */

export const locationRecreationRouter = router({
  // ── Upload & Analyze Location Video ────────────────────────────────────────
  analyzeVideo: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        videoUrl: z.string().url(),
        locationName: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify project ownership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id)));
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or not owned by you" });

      // Create new location record
      const [newLocation] = await db.insert(locations).values({
        projectId: input.projectId,
        userId: ctx.user.id,
        name: input.locationName,
        videoReference: input.videoUrl,
        isAiRecreation: true,
        aiRecreationStatus: "processing",
        locationType: "interior", // Default, will be refined by AI
      });

      // Trigger AI Analysis (Simulated for now, would use manus-analyze-video or similar)
      // In a real implementation, this would be a background job
      const analysisPrompt = `Analyze this video of a location: ${input.videoUrl}. 
      Extract architectural details, furniture, lighting, and mood. 
      Provide a detailed description for AI set recreation.`;
      
      // Return the location ID and status
      return {
        success: true,
        locationId: newLocation.insertId,
        status: "processing",
        message: "Location video uploaded. AI is analyzing the setting...",
      };
    }),

  // ── Get Recreation Status ──────────────────────────────────────────────────
  getStatus: protectedProcedure
    .input(z.object({ locationId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));
      if (!location) throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });

      return {
        id: location.id,
        status: location.aiRecreationStatus,
        description: location.description,
        visualPrompt: location.aiVisualPrompt,
      };
    }),

  // ── Apply Environment Controls ─────────────────────────────────────────────
  applyEnvironment: protectedProcedure
    .input(
      z.object({
        locationId: z.number().int(),
        timeOfDay: z.enum(["dawn", "morning", "afternoon", "evening", "night", "golden-hour"]).optional(),
        weather: z.enum(["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"]).optional(),
        lighting: z.enum(["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));
      if (!location) throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });

      // Update location with environmental preferences
      await db.update(locations)
        .set({
          bestTimeOfDay: input.timeOfDay,
          weatherPreferences: input.weather ? [input.weather] : undefined,
          // Refine the visual prompt based on environment
          aiVisualPrompt: `${location.aiVisualPrompt || ""}. Set during ${input.timeOfDay || "daytime"} with ${input.weather || "clear"} weather and ${input.lighting || "natural"} lighting.`,
        })
        .where(eq(locations.id, input.locationId));

      return {
        success: true,
        message: `Environment applied: ${input.timeOfDay || "original"} time, ${input.weather || "original"} weather.`,
      };
    }),

  // ── Assign to Scenes ───────────────────────────────────────────────────────
  assignToScenes: protectedProcedure
    .input(
      z.object({
        locationId: z.number().int(),
        sceneIds: z.array(z.number().int()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [location] = await db
        .select()
        .from(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));
      if (!location) throw new TRPCError({ code: "FORBIDDEN", message: "Location not found or not owned by you" });

      // Real assignment: Update scenes with this location and its environment settings
      await db.update(scenes)
        .set({
          locationType: location.name,
          timeOfDay: location.bestTimeOfDay || "afternoon",
          weather: location.weatherPreferences?.[0] || "clear",
        })
        .where(and(
          inArray(scenes.id, input.sceneIds),
          eq(scenes.projectId, location.projectId)
        ));

      return {
        success: true,
        message: `Location "${location.name}" assigned to ${input.sceneIds.length} scenes. Scene continuity (Time/Weather) has been synced.`,
      };
    }),

  // ── List Project Locations ────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const projectLocations = await db
        .select()
        .from(locations)
        .where(and(eq(locations.projectId, input.projectId), eq(locations.userId, ctx.user.id)));

      return projectLocations;
    }),

  // ── Delete Location ───────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ locationId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(locations)
        .where(and(eq(locations.id, input.locationId), eq(locations.userId, ctx.user.id)));

      return { success: true };
    }),
});
