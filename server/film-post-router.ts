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
  projects,
  scenes,
} from "../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { CREDIT_COSTS } from "./_core/subscription";
import { deductCredits } from "./db";

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

  // ─── AI Generation ──────────────────────────────────────────────────────────

  generateAdrSuggestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      context: z.string().optional(), // extra context from user
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deduct credits before generation
      await deductCredits(ctx.user.id, CREDIT_COSTS.film_post_adr_suggest.cost, "film_post_adr_suggest", `AI ADR suggestions for project ${input.projectId}`);

      // Fetch project + scenes for context
      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      const projectScenes = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(asc(scenes.orderIndex));

      const scenesSummary = projectScenes.slice(0, 10).map((s, i) =>
        `Scene ${i + 1}: ${s.title || "Untitled"} — ${s.description?.slice(0, 120) || ""} [Dialogue: ${s.dialogueText?.slice(0, 80) || "none"}]`
      ).join("\n");

      const systemPrompt = `You are a professional ADR (Automated Dialogue Replacement) supervisor with 20+ years of Hollywood experience. You analyze film scenes and identify dialogue that needs ADR recording — lines that were poorly recorded on set, contain background noise, need re-performance, or require wild track coverage.`;

      const userPrompt = `Film: "${project?.title || "Untitled"}" — Genre: ${project?.genre || "Drama"}

Scenes:
${scenesSummary}

${input.context ? `Additional context: ${input.context}\n\n` : ""}Identify 4–6 specific ADR needs for this film. For each, provide:
- characterName: the character speaking
- dialogueLine: the specific line or description of what needs recording
- trackType: one of [adr, wild_track, loop_group, walla]
- notes: brief technical note for the recording session

Return JSON: { "suggestions": [ { "characterName": "...", "dialogueLine": "...", "trackType": "...", "notes": "..." } ] }`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        responseFormat: { type: "json_object" },
        maxTokens: 1200,
      });

      const content = typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : Array.isArray(result.choices[0]?.message?.content)
          ? result.choices[0].message.content.map((p: any) => p.text || "").join("")
          : "{}";

      const parsed = JSON.parse(content);
      return { suggestions: (parsed.suggestions || []) as Array<{ characterName: string; dialogueLine: string; trackType: string; notes: string }> };
    }),

  generateFoleySuggestions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deduct credits before generation
      await deductCredits(ctx.user.id, CREDIT_COSTS.film_post_foley_suggest.cost, "film_post_foley_suggest", `AI Foley suggestions for project ${input.projectId}`);

      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      const projectScenes = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(asc(scenes.orderIndex));

      const scenesSummary = projectScenes.slice(0, 10).map((s, i) =>
        `Scene ${i + 1}: ${s.title || "Untitled"} — ${s.description?.slice(0, 150) || ""} [Location: ${s.locationType || ""}, Weather: ${s.weather || ""}, Mood: ${s.mood || ""}]`
      ).join("\n");

      const systemPrompt = `You are a professional Foley artist and supervisor with 20+ years of Hollywood feature film experience. You analyze film scenes and create detailed Foley recording plans — identifying every sound that needs to be recorded in sync with picture to create a rich, immersive soundscape.`;

      const userPrompt = `Film: "${project?.title || "Untitled"}" — Genre: ${project?.genre || "Drama"}

Scenes:
${scenesSummary}

${input.context ? `Additional context: ${input.context}\n\n` : ""}Identify 5–8 essential Foley tracks for this film. For each, provide:
- name: descriptive name of the sound (e.g. "Hero's leather boots on marble")
- foleyType: one of [footsteps, cloth, props, impacts, environmental, custom]
- description: what the sound is and when it occurs in the film
- notes: recording technique or props needed

Return JSON: { "suggestions": [ { "name": "...", "foleyType": "...", "description": "...", "notes": "..." } ] }`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        responseFormat: { type: "json_object" },
        maxTokens: 1200,
      });

      const content = typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : Array.isArray(result.choices[0]?.message?.content)
          ? result.choices[0].message.content.map((p: any) => p.text || "").join("")
          : "{}";

      const parsed = JSON.parse(content);
      return { suggestions: (parsed.suggestions || []) as Array<{ name: string; foleyType: string; description: string; notes: string }> };
    }),

  generateScoreCues: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      style: z.string().optional(), // e.g. "orchestral", "electronic", "minimal piano"
      context: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deduct credits before generation
      await deductCredits(ctx.user.id, CREDIT_COSTS.film_post_score_gen.cost, "film_post_score_gen", `AI Score cues for project ${input.projectId}`);

      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      const projectScenes = await db.select().from(scenes).where(eq(scenes.projectId, input.projectId)).orderBy(asc(scenes.orderIndex));

      const scenesSummary = projectScenes.slice(0, 12).map((s, i) =>
        `Scene ${i + 1} (${s.title || "Untitled"}): ${s.description?.slice(0, 120) || ""} [Mood: ${s.mood || ""}, Lighting: ${s.lighting || ""}, Duration: ${s.duration || 30}s]`
      ).join("\n");

      const systemPrompt = `You are a professional film composer and music editor with 20+ years of Hollywood experience. You create detailed score cue sheets — mapping music cues to scenes with precise emotional and technical direction for the composer and music editor.`;

      const userPrompt = `Film: "${project?.title || "Untitled"}" — Genre: ${project?.genre || "Drama"}
${input.style ? `Desired score style: ${input.style}` : ""}

Scenes:
${scenesSummary}

${input.context ? `Additional context: ${input.context}\n\n` : ""}Create a score cue sheet with 5–8 music cues for this film. For each cue, provide:
- cueNumber: standard cue number (e.g. "1M1", "2M3")
- title: descriptive cue title (e.g. "The Arrival", "Chase Through the Market")
- cueType: one of [underscore, source_music, sting, theme, transition, silence]
- description: emotional direction and what the music should achieve
- duration: estimated duration in seconds
- notes: instrumentation, tempo, or technical notes for the composer

Return JSON: { "cues": [ { "cueNumber": "...", "title": "...", "cueType": "...", "description": "...", "duration": 0, "notes": "..." } ] }`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        responseFormat: { type: "json_object" },
        maxTokens: 1500,
      });

      const content = typeof result.choices[0]?.message?.content === "string"
        ? result.choices[0].message.content
        : Array.isArray(result.choices[0]?.message?.content)
          ? result.choices[0].message.content.map((p: any) => p.text || "").join("")
          : "{}";

      const parsed = JSON.parse(content);
      return { cues: (parsed.cues || []) as Array<{ cueNumber: string; title: string; cueType: string; description: string; duration: number; notes: string }> };
    }),

  exportMixSummary: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Deduct credits for export
      await deductCredits(ctx.user.id, CREDIT_COSTS.film_post_mix_export.cost, "film_post_mix_export", `Mix summary export for project ${input.projectId}`);

      const [project] = await db.select().from(projects).where(eq(projects.id, input.projectId));
      const [mixSettings] = await db.select().from(filmMixSettings).where(eq(filmMixSettings.projectId, input.projectId));
      const adrList = await db.select().from(filmAdrTracks).where(eq(filmAdrTracks.projectId, input.projectId));
      const foleyList = await db.select().from(filmFoleyTracks).where(eq(filmFoleyTracks.projectId, input.projectId));
      const cueList = await db.select().from(filmScoreCues).where(eq(filmScoreCues.projectId, input.projectId));

      const adrPending = adrList.filter((t: any) => t.status === "pending").length;
      const adrApproved = adrList.filter((t: any) => t.status === "approved").length;
      const foleyPending = foleyList.filter((t: any) => t.status === "pending").length;
      const foleyApproved = foleyList.filter((t: any) => t.status === "approved").length;

      const summary = {
        projectTitle: project?.title || "Untitled",
        exportedAt: new Date().toISOString(),
        mix: mixSettings ? {
          masterVolume: `${Math.round((mixSettings.masterVolume ?? 0.85) * 100)}%`,
          dialogueBus: `${Math.round((mixSettings.dialogueBus ?? 0.9) * 100)}%`,
          musicBus: `${Math.round((mixSettings.musicBus ?? 0.7) * 100)}%`,
          effectsBus: `${Math.round((mixSettings.effectsBus ?? 0.75) * 100)}%`,
          reverbRoom: mixSettings.reverbRoom ?? "none",
          compressionRatio: `${mixSettings.compressionRatio ?? 2}:1`,
          noiseReduction: mixSettings.noiseReduction ?? false,
          notes: mixSettings.notes || "",
        } : null,
        adr: {
          total: adrList.length,
          pending: adrPending,
          approved: adrApproved,
          tracks: adrList.map((t: any) => ({ character: t.characterName, line: t.dialogueLine?.slice(0, 80), status: t.status, type: t.trackType })),
        },
        foley: {
          total: foleyList.length,
          pending: foleyPending,
          approved: foleyApproved,
          tracks: foleyList.map((t: any) => ({ name: t.name, type: t.foleyType, status: t.status })),
        },
        score: {
          total: cueList.length,
          cues: cueList.map((c: any) => ({ number: c.cueNumber, title: c.title, type: c.cueType, duration: c.durationSeconds })),
        },
      };

      return summary;
    }),
});
