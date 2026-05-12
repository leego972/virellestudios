import { protectedProcedure, router } from "./_core/trpc";
  import { z } from "zod";
  import * as db from "./db";
  import { eq, and } from "drizzle-orm";
  import { renderJobs, promptPacks } from "../drizzle/schema";

  export const byokWorkflowRouter = router({
    // ── Render Jobs ────────────────────────────────────────────────────────────

    createRenderJob: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        sceneId: z.number().int().optional(),
        provider: z.string().max(64),
        taskType: z.enum(["llm", "image", "video", "voice", "music"]),
        estimatedCost: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const [job] = await ctx.db.insert(renderJobs).values({
          userId: ctx.user.id,
          projectId: input.projectId,
          sceneId: input.sceneId ?? null,
          provider: input.provider,
          taskType: input.taskType,
          status: "queued",
          estimatedCost: input.estimatedCost ? String(input.estimatedCost) : null,
        }).$returningId();
        return { id: job.id, status: "queued", message: "Ready to submit through connected provider." };
      }),

    listRenderJobs: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.select().from(renderJobs)
          .where(and(eq(renderJobs.projectId, input.projectId), eq(renderJobs.userId, ctx.user.id)));
      }),

    // ── Prompt Pack ───────────────────────────────────────────────────────────

    savePromptPack: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        name: z.string().max(255),
        packData: z.record(z.unknown()),
      }))
      .mutation(async ({ ctx, input }) => {
        const [pack] = await ctx.db.insert(promptPacks).values({
          userId: ctx.user.id,
          projectId: input.projectId,
          name: input.name,
          packData: input.packData,
        }).$returningId();
        return { id: pack.id };
      }),

    listPromptPacks: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.select().from(promptPacks)
          .where(and(eq(promptPacks.projectId, input.projectId), eq(promptPacks.userId, ctx.user.id)));
      }),

    // ── Exports (no DB needed — generate from project/scene data) ────────────

    exportPromptPack: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const [project] = await ctx.db.select().from(db.schema.projects)
          .where(and(eq(db.schema.projects.id, input.projectId), eq(db.schema.projects.userId, ctx.user.id)));
        if (!project) throw new Error("Project not found");
        const scenes = await ctx.db.select().from(db.schema.scenes)
          .where(eq(db.schema.scenes.projectId, input.projectId));
        const characters = await ctx.db.select().from(db.schema.characters)
          .where(eq(db.schema.characters.projectId, input.projectId));

        return {
          exportFormat: "virelle-prompt-pack-v1",
          exportedAt: new Date().toISOString(),
          project: {
            id: project.id,
            title: project.title,
            genre: project.genre,
            tone: project.tone,
            plotSummary: project.plotSummary,
            setting: project.setting,
            targetAudience: project.targetAudience,
            rating: project.rating,
          },
          characterBible: characters.map(c => ({
            name: (c as any).name,
            description: (c as any).description,
            role: (c as any).role,
          })),
          scenes: scenes.map((s, i) => ({
            sceneNumber: i + 1,
            title: s.title,
            visualPrompt: s.aiPromptOverride || s.description,
            negativePrompt: null,
            cameraAngle: s.cameraAngle,
            cameraMovement: s.cameraMovement,
            lighting: s.lighting,
            mood: s.mood,
            timeOfDay: s.timeOfDay,
            weather: s.weather,
            dialogue: s.dialogueText,
            musicMood: s.musicMood,
            estimatedCost: s.budgetEstimate,
            status: s.status,
            approvalStatus: s.approvalStatus,
          })),
        };
      }),

    exportScreenplay: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const [project] = await ctx.db.select().from(db.schema.projects)
          .where(and(eq(db.schema.projects.id, input.projectId), eq(db.schema.projects.userId, ctx.user.id)));
        if (!project) throw new Error("Project not found");
        const scenes = await ctx.db.select().from(db.schema.scenes)
          .where(eq(db.schema.scenes.projectId, input.projectId));

        const lines: string[] = [
          project.title?.toUpperCase() ?? "UNTITLED",
          "",
          project.plotSummary ? `LOGLINE: ${project.plotSummary}` : "",
          "",
          "=" .repeat(60),
          "",
        ];
        scenes.forEach((s, i) => {
          lines.push(`SCENE ${i + 1}: ${(s.title ?? "").toUpperCase()}`);
          lines.push(`INT./EXT. ${s.locationType ?? "LOCATION"} - ${(s.timeOfDay ?? "DAY").toUpperCase()}`);
          lines.push("");
          if (s.description) lines.push(s.description, "");
          if (s.dialogueText) lines.push(s.dialogueText, "");
          if (s.productionNotes) lines.push(`DIRECTOR'S NOTES: ${s.productionNotes}`, "");
          lines.push("-".repeat(40), "");
        });

        return { text: lines.join("\n"), filename: `${project.title ?? "screenplay"}.txt` };
      }),

    exportShotList: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const [project] = await ctx.db.select().from(db.schema.projects)
          .where(and(eq(db.schema.projects.id, input.projectId), eq(db.schema.projects.userId, ctx.user.id)));
        if (!project) throw new Error("Project not found");
        const scenes = await ctx.db.select().from(db.schema.scenes)
          .where(eq(db.schema.scenes.projectId, input.projectId));

        const header = "sceneNumber,title,location,timeOfDay,cameraAngle,cameraMovement,lighting,mood,visualPrompt,estimatedCost,status";
        const rows = scenes.map((s, i) => [
          i + 1,
          `"${(s.title ?? "").replace(/"/g, '""')}"`,
          `"${(s.locationType ?? "").replace(/"/g, '""')}"`,
          s.timeOfDay ?? "",
          s.cameraAngle ?? "",
          s.cameraMovement ?? "",
          s.lighting ?? "",
          s.mood ?? "",
          `"${((s.aiPromptOverride ?? s.description ?? "")).replace(/"/g, '""')}"`,
          s.budgetEstimate ?? "",
          s.status ?? "",
        ].join(","));

        return { csv: [header, ...rows].join("\n"), filename: `${project.title ?? "shot-list"}.csv` };
      }),
  });
  