import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { nanoid } from "nanoid";
import { processDirectorMessage } from "./directorAssistant";
import { transcribeAudio } from "./_core/voiceTranscription";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Projects ───
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProjects(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProjectById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        mode: z.enum(["quick", "manual"]),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(300).optional(),
        genre: z.string().optional(),
        plotSummary: z.string().optional(),
        resolution: z.string().optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        // Story & Narrative
        mainPlot: z.string().optional(),
        sidePlots: z.string().optional(),
        plotTwists: z.string().optional(),
        characterArcs: z.string().optional(),
        themes: z.string().optional(),
        setting: z.string().optional(),
        actStructure: z.string().optional(),
        tone: z.string().optional(),
        targetAudience: z.string().optional(),
        openingScene: z.string().optional(),
        climax: z.string().optional(),
        storyResolution: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createProject({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(300).optional(),
        genre: z.string().optional(),
        plotSummary: z.string().optional(),
        status: z.enum(["draft", "generating", "paused", "completed", "failed"]).optional(),
        thumbnailUrl: z.string().optional(),
        resolution: z.string().optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        colorGrading: z.string().optional(),
        colorGradingSettings: z.any().optional(),
        // Story & Narrative
        mainPlot: z.string().optional(),
        sidePlots: z.string().optional(),
        plotTwists: z.string().optional(),
        characterArcs: z.string().optional(),
        themes: z.string().optional(),
        setting: z.string().optional(),
        actStructure: z.string().optional(),
        tone: z.string().optional(),
        targetAudience: z.string().optional(),
        openingScene: z.string().optional(),
        climax: z.string().optional(),
        storyResolution: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Characters ───
  character: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectCharacters(input.projectId);
      }),

    listLibrary: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLibraryCharacters(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCharacterById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number().nullable().optional(),
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        attributes: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCharacter({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        attributes: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateCharacter(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCharacter(input.id);
        return { success: true };
      }),

    // AI Character Generator — create photorealistic portrait from feature selections
    aiGenerate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        projectId: z.number().nullable().optional(),
        features: z.object({
          ageRange: z.string(), // "20s", "30s", "40s", etc.
          gender: z.string(),
          ethnicity: z.string(),
          skinTone: z.string().optional(),
          build: z.string().optional(), // slim, athletic, average, heavy
          height: z.string().optional(), // short, average, tall
          hairColor: z.string(),
          hairStyle: z.string(),
          eyeColor: z.string(),
          facialFeatures: z.string().optional(), // sharp jawline, round face, etc.
          facialHair: z.string().optional(),
          distinguishingMarks: z.string().optional(), // scars, tattoos, freckles
          clothingStyle: z.string().optional(),
          expression: z.string().optional(), // serious, warm, mysterious
          additionalNotes: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        const f = input.features;
        const promptParts = [
          "Ultra-photorealistic Hollywood A-list actor headshot, indistinguishable from a real photograph,",
          "shot on ARRI ALEXA 65 with Zeiss Master Prime lens, shallow depth of field,",
          `${f.gender} in their ${f.ageRange},`,
          `${f.ethnicity} ethnicity,`,
        ];
        if (f.skinTone) promptParts.push(`${f.skinTone} skin tone with natural skin texture and pores,`);
        if (f.build) promptParts.push(`${f.build} build,`);
        if (f.height) promptParts.push(`${f.height} height,`);
        promptParts.push(`${f.hairColor} ${f.hairStyle} hair with individual strand detail,`);
        promptParts.push(`${f.eyeColor} eyes with natural iris detail and light reflections,`);
        if (f.facialFeatures) promptParts.push(`${f.facialFeatures},`);
        if (f.facialHair) promptParts.push(`facial hair: ${f.facialHair},`);
        if (f.distinguishingMarks) promptParts.push(`${f.distinguishingMarks},`);
        if (f.clothingStyle) promptParts.push(`wearing ${f.clothingStyle},`);
        if (f.expression) promptParts.push(`${f.expression} expression with subtle micro-expressions,`);
        if (f.additionalNotes) promptParts.push(f.additionalNotes);
        promptParts.push(
          "three-point Rembrandt lighting with soft key light and subtle fill,",
          "natural skin subsurface scattering, volumetric light,",
          "shot at f/1.4 with cinematic bokeh background,",
          "color graded like a major Hollywood studio production,",
          "16K resolution, hyperdetailed, award-winning portrait photography"
        );

        const result = await generateImage({ prompt: promptParts.join(" ") });

        // Save to character library
        const character = await db.createCharacter({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          name: input.name,
          description: `AI-generated character: ${f.gender}, ${f.ageRange}, ${f.ethnicity}`,
          photoUrl: result.url,
          attributes: { ...f, aiGenerated: true },
        });

        return character;
      }),
  }),

  // ─── Scenes ───
  scene: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectScenes(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSceneById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        orderIndex: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        timeOfDay: z.enum(["dawn", "morning", "afternoon", "evening", "night", "golden-hour"]).optional(),
        weather: z.enum(["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"]).optional(),
        lighting: z.enum(["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"]).optional(),
        cameraAngle: z.enum(["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"]).optional(),
        locationType: z.string().optional(),
        realEstateStyle: z.string().optional(),
        vehicleType: z.string().optional(),
        mood: z.string().optional(),
        characterIds: z.array(z.number()).optional(),
        dialogueText: z.string().optional(),
        duration: z.number().min(1).max(600).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createScene(input);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        orderIndex: z.number().optional(),
        timeOfDay: z.enum(["dawn", "morning", "afternoon", "evening", "night", "golden-hour"]).optional(),
        weather: z.enum(["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"]).optional(),
        lighting: z.enum(["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"]).optional(),
        cameraAngle: z.enum(["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"]).optional(),
        locationType: z.string().optional(),
        realEstateStyle: z.string().optional(),
        vehicleType: z.string().optional(),
        mood: z.string().optional(),
        characterIds: z.array(z.number()).optional(),
        characterPositions: z.any().optional(),
        dialogueText: z.string().optional(),
        duration: z.number().min(1).max(600).optional(),
        status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateScene(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteScene(input.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await db.reorderScenes(input.projectId, input.sceneIds);
        return { success: true };
      }),

    // Generate a preview image for a single scene
    generatePreview: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new Error("Scene not found");

        // Build a cinematic prompt from scene parameters
        const parts: string[] = [
          "Cinematic Hollywood film still,",
          scene.description || "dramatic scene",
        ];
        if (scene.timeOfDay) parts.push(`${scene.timeOfDay} lighting`);
        if (scene.weather && scene.weather !== "clear") parts.push(`${scene.weather} weather`);
        if (scene.lighting) parts.push(`${scene.lighting} lighting setup`);
        if (scene.cameraAngle) parts.push(`${scene.cameraAngle} shot`);
        if (scene.locationType) parts.push(`location: ${scene.locationType}`);
        if (scene.realEstateStyle) parts.push(`setting: ${scene.realEstateStyle}`);
        if (scene.vehicleType && scene.vehicleType !== "None") parts.push(`featuring a ${scene.vehicleType}`);
        if (scene.mood) parts.push(`${scene.mood} mood`);
        parts.push("photorealistic, 8k, cinematic color grading, professional cinematography");

        const prompt = parts.join(", ");

        // Get character photos if any
        const characterIds = (scene.characterIds as number[]) || [];
        const originalImages: Array<{ url: string; mimeType: string }> = [];
        for (const cId of characterIds) {
          const char = await db.getCharacterById(cId);
          if (char?.photoUrl) {
            originalImages.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }

        const result = await generateImage({
          prompt,
          originalImages: originalImages.length > 0 ? originalImages : undefined,
        });

        // Update scene with preview thumbnail
        await db.updateScene(scene.id, { thumbnailUrl: result.url });

        return { url: result.url };
      }),
  }),

  // ─── File Upload ───
  upload: router({
    image: protectedProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string(),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `uploads/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),
  }),

  // ─── Generation ───
  generation: router({
    // Quick generate: AI creates full film from plot + characters
    quickGenerate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        // Create a generation job
        const job = await db.createGenerationJob({
          projectId: project.id,
          type: "full-film",
          status: "processing",
          progress: 0,
          estimatedSeconds: (project.duration || 90) * 2,
        });

        // Update project status
        await db.updateProject(project.id, ctx.user.id, {
          status: "generating",
          progress: 0,
        });

        // Use LLM to break down the plot into scenes
        const characters = await db.getProjectCharacters(project.id);
        const charDescriptions = characters.map(c => `${c.name}: ${c.description || "no description"}`).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Hollywood film director AI. Given a plot summary, break it down into individual scenes for a ${project.duration || 90}-minute ${project.rating || "PG-13"} rated ${project.genre || "Drama"} film. Return JSON with an array of scenes.`,
            },
            {
              role: "user",
              content: `Plot: ${project.plotSummary || project.description || "A compelling story"}\n\nCharacters:\n${charDescriptions}\n\nBreak this into 8-15 scenes. For each scene provide: title, description, timeOfDay (dawn/morning/afternoon/evening/night/golden-hour), weather (clear/cloudy/rainy/stormy/snowy/foggy/windy), lighting (natural/dramatic/soft/neon/candlelight/studio/backlit/silhouette), cameraAngle (wide/medium/close-up/extreme-close-up/birds-eye/low-angle/dutch-angle/over-shoulder/pov), locationType, mood, and estimatedDuration in seconds.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "scene_breakdown",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        timeOfDay: { type: "string" },
                        weather: { type: "string" },
                        lighting: { type: "string" },
                        cameraAngle: { type: "string" },
                        locationType: { type: "string" },
                        mood: { type: "string" },
                        estimatedDuration: { type: "number" },
                      },
                      required: ["title", "description", "timeOfDay", "weather", "lighting", "cameraAngle", "locationType", "mood", "estimatedDuration"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scenes"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "");
        const scenesData = parsed.scenes || [];

        // Create scenes in DB
        for (let i = 0; i < scenesData.length; i++) {
          const s = scenesData[i];
          await db.createScene({
            projectId: project.id,
            orderIndex: i,
            title: s.title,
            description: s.description,
            timeOfDay: s.timeOfDay as any,
            weather: s.weather as any,
            lighting: s.lighting as any,
            cameraAngle: s.cameraAngle as any,
            locationType: s.locationType,
            mood: s.mood,
            duration: s.estimatedDuration || 30,
          });
        }

        // Generate preview for first scene as project thumbnail
        const allScenes = await db.getProjectScenes(project.id);
        if (allScenes.length > 0) {
          try {
            const firstScene = allScenes[0];
            const thumbPrompt = `Cinematic Hollywood movie poster style, ${firstScene.description}, ${firstScene.lighting} lighting, ${firstScene.mood} mood, photorealistic, 8k`;
            const thumbResult = await generateImage({ prompt: thumbPrompt });
            await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: thumbResult.url });
            await db.updateScene(firstScene.id, { thumbnailUrl: thumbResult.url });
          } catch (e) {
            console.error("Failed to generate thumbnail:", e);
          }
        }

        // Update job and project
        await db.updateJob(job.id, { status: "completed", progress: 100 });
        await db.updateProject(project.id, ctx.user.id, {
          status: "completed",
          progress: 100,
        });

        return { jobId: job.id, scenesCreated: scenesData.length };
      }),

    // Generate trailer from existing scenes
    generateTrailer: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const allScenes = await db.getProjectScenes(project.id);
        if (allScenes.length === 0) throw new Error("No scenes to create trailer from");

        const characters = await db.getProjectCharacters(project.id);

        // Create a generation job for the trailer
        const job = await db.createGenerationJob({
          projectId: project.id,
          type: "preview",
          status: "processing",
          progress: 0,
          estimatedSeconds: 60,
          metadata: { trailerType: "cinematic" },
        });

        // Use LLM to select the best scenes for a trailer and create a trailer script
        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} (${s.mood} mood, ${s.locationType})`
        ).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a Hollywood trailer editor. Your STRICT rules:\n1. NEVER spoil key plot twists, endings, character deaths, major reveals, or surprise elements.\n2. ALL trailer content MUST be G-rated regardless of the film's actual rating — absolutely NO violence, gore, sexual content, strong language, drug use, or disturbing imagery.\n3. Focus on building intrigue, mystery, and excitement — tease the premise and characters without giving away what happens.\n4. Select scenes from the FIRST HALF of the film only to avoid late-story spoilers.\n5. Create a sense of wonder and anticipation that makes viewers want to see the film.\n6. Keep the trailer family-friendly and suitable for all audiences.\nReturn JSON.",
            },
            {
              role: "user",
              content: `Film: "${project.title}" (${project.genre || "Drama"}, rated ${project.rating || "PG-13"})\nPlot: ${project.plotSummary || project.description}\n\nAvailable scenes:\n${sceneDescriptions}\n\nSelect 4-6 scenes for a 2-minute trailer. IMPORTANT RULES:\n- ONLY select scenes from the first half of the film (scenes 1 through ${Math.ceil(allScenes.length / 2)}) to avoid spoilers\n- Do NOT reveal any plot twists, endings, or major surprises\n- Rewrite each scene description to be G-RATED and family-friendly even if the original scene contains mature content\n- Focus on establishing the world, characters, and central conflict without resolution\n- Build curiosity and excitement — leave the audience wanting more\n\nFor each scene, provide the scene index (0-based), a G-rated trailer-cut description, and the order they should appear in the trailer.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "trailer_sequence",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  trailerTitle: { type: "string" },
                  tagline: { type: "string" },
                  selectedScenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneIndex: { type: "number" },
                        trailerDescription: { type: "string" },
                        trailerOrder: { type: "number" },
                      },
                      required: ["sceneIndex", "trailerDescription", "trailerOrder"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["trailerTitle", "tagline", "selectedScenes"],
                additionalProperties: false,
              },
            },
          },
        });

        const trailerContent = llmResult.choices[0]?.message?.content;
        const trailerData = JSON.parse(typeof trailerContent === "string" ? trailerContent : "");

        // Generate preview images for each trailer scene
        const trailerScenes = trailerData.selectedScenes || [];
        const trailerImages: string[] = [];

        for (const ts of trailerScenes) {
          const sceneIdx = ts.sceneIndex;
          if (sceneIdx >= 0 && sceneIdx < allScenes.length) {
            const scene = allScenes[sceneIdx];
            try {
              const prompt = `Cinematic Hollywood trailer shot, G-rated family-friendly imagery, ${ts.trailerDescription}, ${scene.lighting || "dramatic"} lighting, ${scene.mood || "epic"} mood, widescreen aspect ratio, photorealistic, 8k, cinematic color grading, no violence, no gore, no mature content, suitable for all audiences`;
              const imgResult = await generateImage({ prompt });
              if (imgResult.url) {
                trailerImages.push(imgResult.url);
                // Also update scene thumbnail if it doesn't have one
                if (!scene.thumbnailUrl) {
                  await db.updateScene(scene.id, { thumbnailUrl: imgResult.url });
                }
              }
            } catch (e) {
              console.error(`Failed to generate trailer image for scene ${sceneIdx}:`, e);
            }
          }
        }

        // Update job with results
        await db.updateJob(job.id, {
          status: "completed",
          progress: 100,
          metadata: {
            trailerType: "cinematic",
            trailerTitle: trailerData.trailerTitle,
            tagline: trailerData.tagline,
            trailerScenes: trailerData.selectedScenes,
            trailerImages,
          },
        });

        return {
          jobId: job.id,
          trailerTitle: trailerData.trailerTitle,
          tagline: trailerData.tagline,
          scenes: trailerData.selectedScenes,
          images: trailerImages,
        };
      }),

    // Get generation job status
    getJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getJobById(input.id);
      }),

    listJobs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectJobs(input.projectId);
      }),

    // Pause/resume generation
    pauseJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.updateJob(input.id, { status: "paused" });
      }),

    resumeJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.updateJob(input.id, { status: "processing" });
      }),
  }),

  // ─── Scripts ───
  script: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectScripts(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getScriptById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createScript({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        pageCount: z.number().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateScript(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteScript(input.id, ctx.user.id);
        return { success: true };
      }),

    // AI: Generate a full screenplay from project details
    aiGenerate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const scenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const charBlock = characters.map(c => {
          const attrs = c.attributes as any;
          return `${c.name.toUpperCase()} — ${c.description || ""} ${attrs?.age ? `Age: ${attrs.age}` : ""} ${attrs?.gender || ""} ${attrs?.role || ""}`;
        }).join("\n");

        const sceneBlock = scenes.map((s, i) =>
          `Scene ${i + 1}: "${s.title || "Untitled"}" — ${s.description || ""} (${s.locationType || ""}, ${s.timeOfDay || ""}, ${s.mood || ""})`
        ).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional Hollywood screenwriter. Write a properly formatted movie screenplay following industry-standard format:\n\n- Scene headings: INT./EXT. LOCATION - TIME OF DAY (all caps)\n- Action lines: Present tense, vivid, concise descriptions\n- Character names: ALL CAPS when first introduced, then CAPS above dialogue\n- Dialogue: Centered under character name\n- Parentheticals: (in parentheses) for delivery direction\n- Transitions: CUT TO:, FADE IN:, FADE OUT., DISSOLVE TO: (right-aligned)\n\nWrite compelling, cinematic dialogue and vivid action descriptions. The script should feel like a real Hollywood production.`,
            },
            {
              role: "user",
              content: `Write a screenplay for:\n\nTitle: ${project.title}\nGenre: ${project.genre || "Drama"}\nRating: ${project.rating || "PG-13"}\nDuration: ${project.duration || 90} minutes\nPlot: ${project.plotSummary || project.description || "An untold story"}\n\nCharacters:\n${charBlock || "(No characters defined yet — create compelling original characters)"}\n\n${sceneBlock ? `Scene Outline:\n${sceneBlock}` : ""}\n\n${input.instructions ? `Additional directions: ${input.instructions}` : ""}\n\nWrite the complete screenplay with proper formatting. Include FADE IN: at the start and FADE OUT. at the end.`,
            },
          ],
        });

        const scriptContent = llmResult.choices[0]?.message?.content || "";
        const pageEstimate = Math.max(1, Math.round((typeof scriptContent === "string" ? scriptContent : "").length / 3000));

        const script = await db.createScript({
          projectId: project.id,
          userId: ctx.user.id,
          title: `${project.title} — Screenplay`,
          content: typeof scriptContent === "string" ? scriptContent : "",
          pageCount: pageEstimate,
          metadata: {
            genre: project.genre,
            rating: project.rating,
            generatedBy: "ai",
            instructions: input.instructions || null,
          },
        });

        return script;
      }),

    // AI: Continue writing / assist with a section
    aiAssist: protectedProcedure
      .input(z.object({
        scriptId: z.number(),
        action: z.enum(["continue", "rewrite", "dialogue", "action-line", "transition"]),
        selectedText: z.string().optional(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const script = await db.getScriptById(input.scriptId);
        if (!script) throw new Error("Script not found");

        const actionPrompts: Record<string, string> = {
          continue: "Continue writing the screenplay from where it left off. Maintain the same tone, style, and formatting. Write the next 2-3 scenes.",
          rewrite: `Rewrite the following section while maintaining proper screenplay format and improving the quality:\n\n${input.selectedText || ""}`,
          dialogue: `Write compelling dialogue for this section. The dialogue should feel natural and cinematic:\n\n${input.selectedText || input.instructions || "Write a dialogue exchange between the main characters."}`,
          "action-line": `Write vivid, cinematic action lines for this moment:\n\n${input.selectedText || input.instructions || "Describe the scene action."}`,
          transition: `Suggest an appropriate scene transition for:\n\n${input.selectedText || input.instructions || "Moving to the next scene."}`,
        };

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional Hollywood screenwriter. Write in proper industry-standard screenplay format. Be vivid, concise, and cinematic.",
            },
            {
              role: "user",
              content: `Current script context (last 2000 chars):\n${(script.content || "").slice(-2000)}\n\n${actionPrompts[input.action]}\n\n${input.instructions ? `Director notes: ${input.instructions}` : ""}`,
            },
          ],
        });

        const result = llmResult.choices[0]?.message?.content || "";
        return { text: typeof result === "string" ? result : "" };
      }),
  }),

  // ─── Soundtracks ───
  soundtrack: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectSoundtracks(input.projectId);
      }),

    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ input }) => {
        return db.getSceneSoundtracks(input.sceneId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSoundtrackById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().nullable().optional(),
        title: z.string().min(1).max(255),
        artist: z.string().max(255).optional(),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        startTime: z.number().min(0).optional(),
        volume: z.number().min(0).max(1).optional(),
        fadeIn: z.number().min(0).optional(),
        fadeOut: z.number().min(0).optional(),
        loop: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSoundtrack({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        artist: z.string().max(255).optional(),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        startTime: z.number().min(0).optional(),
        volume: z.number().min(0).max(1).optional(),
        fadeIn: z.number().min(0).optional(),
        fadeOut: z.number().min(0).optional(),
        loop: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSoundtrack(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSoundtrack(input.id, ctx.user.id);
        return { success: true };
      }),

    // Upload audio file
    uploadAudio: protectedProcedure
      .input(z.object({
        base64: z.string(),
        filename: z.string(),
        contentType: z.string().default("audio/mpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `soundtracks/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
  }),

  // ─── Credits ───
  credit: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectCredits(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        role: z.string().min(1).max(128),
        name: z.string().min(1).max(255),
        characterName: z.string().max(255).optional(),
        orderIndex: z.number().optional(),
        section: z.enum(["opening", "closing"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCredit({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        role: z.string().min(1).max(128).optional(),
        name: z.string().min(1).max(255).optional(),
        characterName: z.string().max(255).optional(),
        orderIndex: z.number().optional(),
        section: z.enum(["opening", "closing"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateCredit(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCredit(input.id);
        return { success: true };
      }),
  }),

  // ─── Project Duplication ───
  projectDuplicate: router({
    duplicate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.duplicateProject(input.projectId, ctx.user.id);
      }),
  }),

  // ─── Shot List Generator ───
  shotList: router({
    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const allScenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} | Time: ${s.timeOfDay} | Location: ${s.locationType} | Camera: ${s.cameraAngle} | Lighting: ${s.lighting} | Weather: ${s.weather} | Mood: ${s.mood} | Duration: ${s.duration}s | Transition: ${s.transitionType || 'cut'}`
        ).join("\n");

        const charList = characters.map(c => `${c.name}: ${c.description || 'no description'}`).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional film production assistant. Generate a detailed, industry-standard shot list from the given scenes. Include shot number, scene reference, shot type, camera movement, lens, framing, action/description, dialogue cues, props needed, wardrobe notes, and special effects. Format as a structured JSON array.",
            },
            {
              role: "user",
              content: `Film: ${project.title} (${project.genre || 'Drama'}, ${project.rating || 'PG-13'})\n\nScenes:\n${sceneDescriptions}\n\nCharacters:\n${charList}\n\nGenerate a professional shot list with 2-4 shots per scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shot_list",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  shots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shotNumber: { type: "string" },
                        sceneTitle: { type: "string" },
                        shotType: { type: "string" },
                        cameraMovement: { type: "string" },
                        lens: { type: "string" },
                        framing: { type: "string" },
                        action: { type: "string" },
                        dialogue: { type: "string" },
                        props: { type: "string" },
                        wardrobe: { type: "string" },
                        vfx: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["shotNumber", "sceneTitle", "shotType", "cameraMovement", "lens", "framing", "action", "dialogue", "props", "wardrobe", "vfx", "notes"],
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
        const parsed = JSON.parse(typeof content === "string" ? content : "");
        return parsed;
      }),
  }),

  // ─── Continuity Check ───
  continuity: router({
    check: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const allScenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} | Time: ${s.timeOfDay} | Location: ${s.locationType} | Weather: ${s.weather} | Characters: ${(s.characterIds as number[] || []).map(id => characters.find(c => c.id === id)?.name || 'Unknown').join(', ')} | Vehicles: ${s.vehicleType || 'none'} | Real Estate: ${s.realEstateStyle || 'none'}`
        ).join("\n");

        const charList = characters.map(c => {
          const attrs = c.attributes as any || {};
          return `${c.name}: ${c.description || ''} | Hair: ${attrs.hairColor || 'unknown'} | Build: ${attrs.build || 'unknown'} | Clothing: ${attrs.clothingStyle || 'unknown'}`;
        }).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional script supervisor / continuity checker for Hollywood films. Analyze the scenes for continuity errors including: wardrobe changes between consecutive scenes, time-of-day inconsistencies, weather changes that don't make sense, character presence/absence issues, prop and vehicle continuity, location logic. Return a JSON array of issues found.",
            },
            {
              role: "user",
              content: `Film: ${project.title}\n\nScenes (in order):\n${sceneDescriptions}\n\nCharacters:\n${charList}\n\nCheck for continuity errors between adjacent scenes and across the film.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "continuity_report",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string" },
                        category: { type: "string" },
                        scenes: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["severity", "category", "scenes", "description", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["issues", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "");
        return parsed;
      }),
  }),

  // ─── Location Scout ───
  location: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectLocations(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLocationById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().nullable().optional(),
        name: z.string().min(1).max(255),
        address: z.string().max(512).optional(),
        locationType: z.string().max(128).optional(),
        description: z.string().optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createLocation({
          ...input,
          userId: ctx.user.id,
          sceneId: input.sceneId ?? null,
          referenceImages: input.referenceImages || [],
          tags: input.tags || [],
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        address: z.string().max(512).optional(),
        locationType: z.string().max(128).optional(),
        description: z.string().optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sceneId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateLocation(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLocation(input.id);
        return { success: true };
      }),

    aiSuggest: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneDescription: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const sceneContext = input.sceneDescription || scenes.map((s, i) => `Scene ${i+1}: ${s.description || s.title} (${s.locationType || 'unspecified'})`).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional film location scout. Suggest ideal filming locations based on the scene descriptions. For each location, provide a name, type, description of the setting, visual characteristics, practical notes for filming, and relevant tags. Return as JSON." },
            { role: "user", content: `Film: ${project.title} (${project.genre || 'Drama'})\n\nScenes:\n${sceneContext}\n\nSuggest 5-8 ideal filming locations.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "location_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        locationType: { type: "string" },
                        description: { type: "string" },
                        visualStyle: { type: "string" },
                        practicalNotes: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "locationType", "description", "visualStyle", "practicalNotes", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["locations"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = llmResult.choices[0]?.message?.content;
        return JSON.parse(typeof content === "string" ? content : "");
      }),

    generateImage: protectedProcedure
      .input(z.object({ description: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { url } = await generateImage({
          prompt: `Professional film location reference photo: ${input.description}. Photorealistic, cinematic lighting, wide establishing shot, ARRI ALEXA camera quality, golden hour atmosphere.`,
        });
        return { url };
      }),
  }),

  // ─── Mood Board ───
  moodBoard: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectMoodBoard(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["image", "color", "text", "reference"]),
        imageUrl: z.string().optional(),
        text: z.string().optional(),
        color: z.string().max(32).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().max(128).optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMoodBoardItem({
          ...input,
          userId: ctx.user.id,
          tags: input.tags || [],
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().optional(),
        color: z.string().max(32).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().max(128).optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMoodBoardItem(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMoodBoardItem(input.id);
        return { success: true };
      }),

    generateImage: protectedProcedure
      .input(z.object({ prompt: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const { url } = await generateImage({
          prompt: `Cinematic mood board reference: ${input.prompt}. Artistic, atmospheric, film production quality.`,
        });
        return { url };
      }),
  }),

  // ─── Subtitles ───
  subtitle: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectSubtitles(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSubtitleById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        language: z.string().min(1).max(32),
        languageName: z.string().min(1).max(128),
        entries: z.array(z.object({
          sceneId: z.number().optional(),
          startTime: z.number(),
          endTime: z.number(),
          text: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSubtitle({
          ...input,
          userId: ctx.user.id,
          entries: input.entries || [],
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        entries: z.array(z.object({
          sceneId: z.number().optional(),
          startTime: z.number(),
          endTime: z.number(),
          text: z.string(),
        })).optional(),
        language: z.string().min(1).max(32).optional(),
        languageName: z.string().min(1).max(128).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSubtitle(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSubtitle(input.id);
        return { success: true };
      }),

    aiGenerate: protectedProcedure
      .input(z.object({ projectId: z.number(), language: z.string().default("en"), languageName: z.string().default("English") }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const characters = await db.getProjectCharacters(input.projectId);

        const sceneContext = scenes.map((s, i) => {
          const charNames = (s.characterIds as number[] || []).map(id => characters.find(c => c.id === id)?.name || 'Unknown').join(', ');
          return `Scene ${i+1} "${s.title}" (${s.duration || 30}s): ${s.description || 'No description'} | Characters: ${charNames} | Dialogue: ${s.dialogueText || 'none'}`;
        }).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional subtitle writer for films. Generate accurate, well-timed subtitles in ${input.languageName} for the given scenes. Each subtitle entry should have a scene reference, start time (seconds from film start), end time, and the subtitle text. Keep subtitles concise (max 2 lines, 42 chars per line). Include both dialogue and important sound descriptions [in brackets]. Return as JSON.` },
            { role: "user", content: `Film: ${project.title} (${project.genre || 'Drama'}, ${project.rating || 'PG-13'})\nTotal Duration: ${project.duration || 90} minutes\n\nScenes:\n${sceneContext}\n\nGenerate subtitles in ${input.languageName} for the entire film.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "subtitle_entries",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "number" },
                        endTime: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["startTime", "endTime", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entries"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "");

        return db.createSubtitle({
          projectId: input.projectId,
          userId: ctx.user.id,
          language: input.language,
          languageName: input.languageName,
          entries: parsed.entries,
          isGenerated: 1,
        });
      }),

    aiTranslate: protectedProcedure
      .input(z.object({
        subtitleId: z.number(),
        targetLanguage: z.string().min(1).max(32),
        targetLanguageName: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const source = await db.getSubtitleById(input.subtitleId);
        if (!source) throw new Error("Source subtitle not found");
        const entries = source.entries as any[] || [];
        const subtitleText = entries.map((e: any) => `[${e.startTime}-${e.endTime}] ${e.text}`).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional film subtitle translator. Translate the following subtitles from ${source.languageName} to ${input.targetLanguageName}. Maintain the exact same timing. Keep translations natural and culturally appropriate. Preserve [sound descriptions] in brackets but translate them. Return as JSON with the same structure.` },
            { role: "user", content: `Translate these subtitles to ${input.targetLanguageName}:\n\n${subtitleText}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "translated_entries",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "number" },
                        endTime: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["startTime", "endTime", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entries"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        const parsed = JSON.parse(typeof content === "string" ? content : "");

        return db.createSubtitle({
          projectId: source.projectId,
          userId: ctx.user.id,
          language: input.targetLanguage,
          languageName: input.targetLanguageName,
          entries: parsed.entries,
          isGenerated: 1,
          isTranslation: 1,
          sourceLanguage: source.language,
        });
      }),
  }),

  // ─── Dialogues ───
  dialogue: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.sceneId) return db.getSceneDialogues(input.sceneId);
        return db.getProjectDialogues(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        characterId: z.number().optional(),
        characterName: z.string().min(1),
        line: z.string().min(1),
        emotion: z.string().optional(),
        direction: z.string().optional(),
        orderIndex: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createDialogue({ ...input, userId: ctx.user.id });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        characterName: z.string().optional(),
        line: z.string().optional(),
        emotion: z.string().optional(),
        direction: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateDialogue(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDialogue(input.id);
        return { success: true };
      }),

    aiSuggest: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        characterName: z.string(),
        characterDescription: z.string().optional(),
        context: z.string().optional(), // previous dialogue lines for context
        emotion: z.string().optional(),
        direction: z.string().optional(), // e.g. "character is nervous"
      }))
      .mutation(async ({ input }) => {
        const project = await db.getProjectById(input.projectId, 0).catch(() => null);
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Hollywood screenwriter specializing in natural, compelling dialogue. Generate dialogue lines for a character in a film.

Rules:
- Write dialogue that sounds natural and authentic to the character
- Match the emotion and tone specified
- Consider the scene context and previous dialogue
- Each line should feel like it belongs in a professional Hollywood production
- Return a JSON object with: { "lines": [{ "line": "...", "emotion": "...", "direction": "..." }] }
- Generate 3 alternative dialogue options
- Keep lines concise and impactful — avoid exposition dumps`,
            },
            {
              role: "user",
              content: `Film: ${project?.title || "Untitled"} (${project?.genre || "Drama"}, ${project?.rating || "PG-13"})
Plot: ${project?.plotSummary || "Not specified"}
Character: ${input.characterName}${input.characterDescription ? ` — ${input.characterDescription}` : ""}
${input.context ? `Previous dialogue:\n${input.context}` : ""}
${input.emotion ? `Emotion: ${input.emotion}` : ""}
${input.direction ? `Direction: ${input.direction}` : ""}

Generate 3 dialogue line options for this character.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "dialogue_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
        return parsed;
      }),

    aiGenerateScene: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number(),
        sceneDescription: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const project = await db.getProjectById(input.projectId, 0).catch(() => null);
        const scene = await db.getSceneById(input.sceneId);
        const chars = await db.getProjectCharacters(input.projectId);
        const charNames = chars.map(c => c.name).join(", ");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Hollywood screenwriter. Generate a complete dialogue sequence for a scene.

Rules:
- Write natural, compelling dialogue for each character
- Include emotion tags and parenthetical directions
- Match the film's tone, genre, and rating
- Create a complete scene with beginning, middle, and end
- Return JSON: { "dialogues": [{ "characterName": "...", "line": "...", "emotion": "...", "direction": "..." }] }
- Generate 5-15 dialogue lines depending on scene complexity`,
            },
            {
              role: "user",
              content: `Film: ${project?.title || "Untitled"} (${project?.genre || "Drama"}, ${project?.rating || "PG-13"})
Plot: ${project?.plotSummary || ""}
Scene: ${scene?.title || ""} — ${scene?.description || input.sceneDescription || ""}
Time: ${scene?.timeOfDay || "afternoon"}, Weather: ${scene?.weather || "clear"}, Mood: ${scene?.mood || "neutral"}
Available Characters: ${charNames || "Generic characters"}

Generate the full dialogue for this scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "scene_dialogue",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  dialogues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        characterName: { type: "string" },
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["characterName", "line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["dialogues"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
        return parsed;
      }),
  }),

  // ─── Budget Estimator ───
  budget: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectBudgets(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBudgetById(input.id);
      }),

    generate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const chars = await db.getProjectCharacters(input.projectId);
        const locations = await db.getProjectLocations(input.projectId);
        const soundtracks = await db.getProjectSoundtracks(input.projectId);

        const sceneDetails = scenes.map(s => `Scene "${s.title}": ${s.locationType || "studio"}, ${s.weather}, ${s.lighting}, vehicles: ${s.vehicleType || "none"}, ${s.duration}s`).join("\n");

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Hollywood production budget analyst. Analyze the film project details and generate a realistic production budget estimate.

Rules:
- Provide realistic Hollywood-scale budget estimates
- Break down into standard production categories
- Consider scene complexity, locations, VFX needs, cast size, equipment
- Include both above-the-line and below-the-line costs
- Return JSON with this exact structure:
{
  "totalEstimate": number,
  "currency": "USD",
  "breakdown": {
    "preProduction": { "label": "Pre-Production", "estimate": number, "items": [{ "name": "...", "cost": number, "notes": "..." }] },
    "cast": { "label": "Cast & Talent", "estimate": number, "items": [...] },
    "crew": { "label": "Crew & Labor", "estimate": number, "items": [...] },
    "locations": { "label": "Locations & Sets", "estimate": number, "items": [...] },
    "equipment": { "label": "Equipment & Technology", "estimate": number, "items": [...] },
    "vfx": { "label": "Visual Effects & CGI", "estimate": number, "items": [...] },
    "music": { "label": "Music & Sound", "estimate": number, "items": [...] },
    "postProduction": { "label": "Post-Production", "estimate": number, "items": [...] },
    "marketing": { "label": "Marketing & Distribution", "estimate": number, "items": [...] },
    "contingency": { "label": "Contingency (10%)", "estimate": number, "items": [...] }
  },
  "analysis": "A 2-3 paragraph analysis of the budget..."
}`,
            },
            {
              role: "user",
              content: `Film: ${project.title}
Genre: ${project.genre || "Drama"}
Rating: ${project.rating}
Duration: ${project.duration || 90} minutes
Plot: ${project.plotSummary || "Not specified"}
Number of scenes: ${scenes.length}
Scene details:\n${sceneDetails || "No scenes defined yet"}
Number of characters: ${chars.length}
Character names: ${chars.map(c => c.name).join(", ") || "None"}
Locations: ${locations.map(l => `${l.name} (${l.locationType})`).join(", ") || "None specified"}
Soundtracks: ${soundtracks.length} tracks
Color Grading: ${project.colorGrading || "natural"}

Generate a detailed production budget estimate.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "budget_estimate",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  totalEstimate: { type: "number" },
                  currency: { type: "string" },
                  breakdown: {
                    type: "object",
                    properties: {
                      preProduction: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      cast: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      crew: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      locations: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      equipment: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      vfx: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      music: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      postProduction: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      marketing: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      contingency: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                    },
                    required: ["preProduction", "cast", "crew", "locations", "equipment", "vfx", "music", "postProduction", "marketing", "contingency"],
                    additionalProperties: false,
                  },
                  analysis: { type: "string" },
                },
                required: ["totalEstimate", "currency", "breakdown", "analysis"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse(response.choices[0].message.content as string || "{}");
        return db.createBudget({
          projectId: input.projectId,
          userId: ctx.user.id,
          totalEstimate: parsed.totalEstimate,
          currency: parsed.currency || "USD",
          breakdown: parsed.breakdown,
          aiAnalysis: parsed.analysis,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBudget(input.id);
        return { success: true };
      }),
   }),

  // ─── Sound Effects Library ───
  soundEffect: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listSoundEffectsByProject(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ input }) => {
        return db.listSoundEffectsByScene(input.sceneId);
      }),
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        isCustom: z.number().optional(),
        volume: z.number().min(0).max(1).optional(),
        startTime: z.number().optional(),
        loop: z.number().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSoundEffect({ ...input, userId: ctx.user!.id });
      }),
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const key = `sfx/${ctx.user!.id}/${input.projectId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sceneId: z.number().optional().nullable(),
        name: z.string().optional(),
        volume: z.number().min(0).max(1).optional(),
        startTime: z.number().optional(),
        loop: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSoundEffect(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSoundEffect(input.id);
        return { success: true };
      }),
    // Standard preset library
    presets: publicProcedure.query(() => {
      return [
        // Footsteps
        { name: "Footsteps - Concrete", category: "footsteps", tags: ["walk", "urban", "street"] },
        { name: "Footsteps - Gravel", category: "footsteps", tags: ["outdoor", "path", "crunch"] },
        { name: "Footsteps - Wood Floor", category: "footsteps", tags: ["indoor", "house", "creak"] },
        { name: "Footsteps - Running", category: "footsteps", tags: ["fast", "chase", "action"] },
        { name: "Footsteps - High Heels", category: "footsteps", tags: ["click", "elegant", "indoor"] },
        { name: "Footsteps - Snow", category: "footsteps", tags: ["crunch", "winter", "cold"] },
        // Weather
        { name: "Light Rain", category: "weather", tags: ["drizzle", "gentle", "calm"] },
        { name: "Heavy Rain", category: "weather", tags: ["downpour", "storm", "intense"] },
        { name: "Thunder Crack", category: "weather", tags: ["storm", "loud", "dramatic"] },
        { name: "Thunder Rolling", category: "weather", tags: ["distant", "rumble", "atmosphere"] },
        { name: "Wind Howling", category: "weather", tags: ["strong", "eerie", "outdoor"] },
        { name: "Wind Gentle Breeze", category: "weather", tags: ["soft", "calm", "nature"] },
        { name: "Hailstorm", category: "weather", tags: ["ice", "pelting", "intense"] },
        // Nature
        { name: "Birds Chirping", category: "nature", tags: ["morning", "forest", "peaceful"] },
        { name: "Ocean Waves", category: "nature", tags: ["beach", "calm", "rhythmic"] },
        { name: "River Stream", category: "nature", tags: ["water", "flowing", "nature"] },
        { name: "Crickets Night", category: "nature", tags: ["evening", "rural", "ambient"] },
        { name: "Wolf Howl", category: "nature", tags: ["night", "wild", "eerie"] },
        { name: "Horse Gallop", category: "nature", tags: ["riding", "western", "fast"] },
        { name: "Dog Barking", category: "nature", tags: ["pet", "alert", "domestic"] },
        // Vehicles
        { name: "Car Engine Start", category: "vehicles", tags: ["ignition", "motor", "drive"] },
        { name: "Car Driving By", category: "vehicles", tags: ["pass", "road", "traffic"] },
        { name: "Car Screech / Brakes", category: "vehicles", tags: ["stop", "emergency", "tires"] },
        { name: "Car Crash", category: "vehicles", tags: ["accident", "impact", "metal"] },
        { name: "Motorcycle Rev", category: "vehicles", tags: ["engine", "loud", "bike"] },
        { name: "Helicopter", category: "vehicles", tags: ["chopper", "blades", "aerial"] },
        { name: "Jet Flyover", category: "vehicles", tags: ["airplane", "fast", "loud"] },
        { name: "Train Horn", category: "vehicles", tags: ["railway", "warning", "loud"] },
        { name: "Boat Motor", category: "vehicles", tags: ["water", "engine", "marine"] },
        // Impacts & Action
        { name: "Explosion Large", category: "impacts", tags: ["blast", "boom", "action"] },
        { name: "Explosion Small", category: "impacts", tags: ["pop", "burst", "minor"] },
        { name: "Gunshot Single", category: "impacts", tags: ["weapon", "shot", "loud"] },
        { name: "Gunshot Burst", category: "impacts", tags: ["automatic", "rapid", "action"] },
        { name: "Punch Hit", category: "impacts", tags: ["fight", "body", "combat"] },
        { name: "Glass Breaking", category: "impacts", tags: ["shatter", "crash", "window"] },
        { name: "Metal Clang", category: "impacts", tags: ["hit", "ring", "sword"] },
        { name: "Sword Clash", category: "impacts", tags: ["metal", "fight", "medieval"] },
        { name: "Whip Crack", category: "impacts", tags: ["snap", "sharp", "fast"] },
        // Doors & Interiors
        { name: "Door Open Creak", category: "doors", tags: ["old", "horror", "slow"] },
        { name: "Door Slam", category: "doors", tags: ["close", "loud", "angry"] },
        { name: "Door Knock", category: "doors", tags: ["tap", "visitor", "entrance"] },
        { name: "Door Lock / Unlock", category: "doors", tags: ["key", "click", "secure"] },
        { name: "Elevator Ding", category: "doors", tags: ["bell", "arrive", "floor"] },
        { name: "Window Open", category: "doors", tags: ["slide", "air", "room"] },
        // Ambient
        { name: "City Traffic", category: "ambient", tags: ["urban", "busy", "cars"] },
        { name: "Crowd Murmur", category: "ambient", tags: ["people", "chatter", "background"] },
        { name: "Restaurant Ambience", category: "ambient", tags: ["dining", "clinking", "chatter"] },
        { name: "Office Ambience", category: "ambient", tags: ["typing", "phone", "work"] },
        { name: "Hospital Ambience", category: "ambient", tags: ["beep", "intercom", "quiet"] },
        { name: "Spaceship Hum", category: "ambient", tags: ["sci-fi", "engine", "space"] },
        { name: "Underwater", category: "ambient", tags: ["bubbles", "muffled", "deep"] },
        { name: "Forest Ambience", category: "ambient", tags: ["trees", "leaves", "peaceful"] },
        // Electronic & UI
        { name: "Phone Ringing", category: "electronic", tags: ["call", "ring", "alert"] },
        { name: "Phone Vibrate", category: "electronic", tags: ["buzz", "notification", "silent"] },
        { name: "Computer Beep", category: "electronic", tags: ["alert", "tech", "interface"] },
        { name: "Alarm Clock", category: "electronic", tags: ["wake", "morning", "beep"] },
        { name: "Camera Shutter", category: "electronic", tags: ["photo", "click", "snap"] },
        { name: "Radio Static", category: "electronic", tags: ["noise", "tuning", "vintage"] },
        // Horror & Suspense
        { name: "Heartbeat", category: "horror", tags: ["pulse", "tension", "suspense"] },
        { name: "Creepy Whisper", category: "horror", tags: ["voice", "eerie", "ghost"] },
        { name: "Chains Rattling", category: "horror", tags: ["metal", "prison", "dark"] },
        { name: "Scream Female", category: "horror", tags: ["terror", "loud", "fear"] },
        { name: "Scream Male", category: "horror", tags: ["terror", "loud", "fear"] },
        { name: "Eerie Drone", category: "horror", tags: ["atmosphere", "dark", "tension"] },
        // Musical
        { name: "Dramatic Stinger", category: "musical", tags: ["hit", "reveal", "impact"] },
        { name: "Suspense Rise", category: "musical", tags: ["tension", "build", "climax"] },
        { name: "Comic Boing", category: "musical", tags: ["funny", "cartoon", "bounce"] },
        { name: "Sad Violin", category: "musical", tags: ["emotional", "cry", "drama"] },
        { name: "Victory Fanfare", category: "musical", tags: ["win", "triumph", "celebration"] },
        { name: "Clock Ticking", category: "musical", tags: ["time", "countdown", "tension"] },
      ];
    }),
  }),

  // ─── Project Collaboration ───
  collaboration: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listCollaboratorsByProject(input.projectId);
      }),
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email().optional(),
        role: z.enum(["viewer", "editor", "producer", "director"]).default("editor"),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(32);
        const collab = await db.createCollaborator({
          projectId: input.projectId,
          invitedBy: ctx.user!.id,
          email: input.email || null,
          inviteToken: token,
          role: input.role,
          status: "pending",
        });
        return { collaborator: collab, inviteToken: token };
      }),
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorByToken(input.token);
        if (!collab) throw new Error("Invalid invite token");
        if (collab.status !== "pending") throw new Error("Invite already used");
        return db.updateCollaborator(collab.id, {
          userId: ctx.user!.id,
          status: "accepted",
        });
      }),
    decline: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorByToken(input.token);
        if (!collab) throw new Error("Invalid invite token");
        return db.updateCollaborator(collab.id, {
          status: "declined",
        });
      }),
    updateRole: protectedProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["viewer", "editor", "producer", "director"]),
      }))
      .mutation(async ({ input }) => {
        return db.updateCollaborator(input.id, { role: input.role });
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCollaborator(input.id);
        return { success: true };
      }),
  }),

  // ─── My Movies ───
  movie: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMovies(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getMovieById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["scene", "trailer", "film"]),
        projectId: z.number().optional(),
        movieTitle: z.string().optional(),
        sceneNumber: z.number().optional(),
        duration: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMovie({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          type: input.type,
          projectId: input.projectId,
          movieTitle: input.movieTitle,
          sceneNumber: input.sceneNumber,
          duration: input.duration,
          tags: input.tags ?? [],
        });
      }),

    // Export project content to My Movies
    exportFromProject: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        exportType: z.enum(["film", "scenes", "trailer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(project.id);
        const created: number[] = [];

        if (input.exportType === "film") {
          // Create a single full film entry
          const movie = await db.createMovie({
            userId: ctx.user.id,
            title: project.title,
            description: project.plotSummary || project.description || "",
            type: "film",
            projectId: project.id,
            movieTitle: project.title,
            thumbnailUrl: project.thumbnailUrl,
            duration: (project.duration || 0) * 60,
            tags: project.genre ? [project.genre] : [],
          });
          created.push(movie.id);
        } else if (input.exportType === "scenes") {
          // Create individual scene entries grouped under the movie title
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const movie = await db.createMovie({
              userId: ctx.user.id,
              title: scene.title || `Scene ${i + 1}`,
              description: scene.description || "",
              type: "scene",
              projectId: project.id,
              movieTitle: project.title,
              sceneNumber: scene.orderIndex || i + 1,
              thumbnailUrl: scene.thumbnailUrl,
              tags: [scene.locationType, scene.mood, scene.timeOfDay].filter(Boolean) as string[],
            });
            created.push(movie.id);
          }
        } else if (input.exportType === "trailer") {
          // Create a trailer entry grouped under the movie title
          const movie = await db.createMovie({
            userId: ctx.user.id,
            title: `${project.title} - Trailer`,
            description: `Official trailer for ${project.title}`,
            type: "trailer",
            projectId: project.id,
            movieTitle: project.title,
            thumbnailUrl: project.thumbnailUrl,
            tags: project.genre ? [project.genre, "trailer"] : ["trailer"],
          });
          created.push(movie.id);
        }
        return { exported: created.length, movieIds: created };
      }),

    upload: protectedProcedure
      .input(z.object({
        movieId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default("video/mp4"),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const suffix = nanoid(8);
        const fileKey = `movies/${ctx.user.id}/${input.movieId}/${input.fileName}-${suffix}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return db.updateMovie(input.movieId, ctx.user.id, {
          fileUrl: url,
          fileKey,
          fileSize: input.fileSize ?? buffer.length,
          mimeType: input.contentType,
        });
      }),

    uploadThumbnail: protectedProcedure
      .input(z.object({
        movieId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const suffix = nanoid(8);
        const fileKey = `movies/${ctx.user.id}/${input.movieId}/thumb-${input.fileName}-${suffix}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return db.updateMovie(input.movieId, ctx.user.id, {
          thumbnailUrl: url,
          thumbnailKey: fileKey,
        });
      }),

    // List movies grouped by movieTitle for folder view
    listGrouped: protectedProcedure.query(async ({ ctx }) => {
      const allMovies = await db.getUserMovies(ctx.user.id);
      // Separate: films without movieTitle go to top level, everything else groups by movieTitle
      const folders: Record<string, typeof allMovies> = {};
      const topLevel: typeof allMovies = [];
      for (const m of allMovies) {
        if (m.type === "film" && !m.movieTitle) {
          topLevel.push(m);
        } else if (m.movieTitle) {
          if (!folders[m.movieTitle]) folders[m.movieTitle] = [];
          folders[m.movieTitle].push(m);
        } else {
          topLevel.push(m);
        }
      }
      return { folders, topLevel };
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: z.enum(["scene", "trailer", "film"]).optional(),
        movieTitle: z.string().optional(),
        sceneNumber: z.number().optional(),
        duration: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateMovie(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMovie(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Director's Assistant Chat
  directorChat: router({
    history: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const messages = await db.getProjectChatHistory(input.projectId, ctx.user.id, 50);
        return messages.reverse(); // oldest first
      }),

    send: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        message: z.string().min(1).max(5000),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Build user message with attachment info if present
        let userContent = input.message;
        if (input.attachmentUrl) {
          userContent += `\n\n[Attached file: ${input.attachmentName || 'file'}](${input.attachmentUrl})`;
        }
        if (input.imageUrls && input.imageUrls.length > 0) {
          userContent += `\n\n[Reference images: ${input.imageUrls.length} image(s) attached]`;
        }

        // Save user message
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: userContent,
        });

        // Get chat history for context
        const history = await db.getProjectChatHistory(input.projectId, ctx.user.id, 20);
        const chatHistory = history.reverse().map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        // Process with AI
        const result = await processDirectorMessage(
          input.projectId,
          ctx.user.id,
          userContent,
          chatHistory,
          input.imageUrls
        );

        // Save assistant response
        const actionSummary = result.actions.length > 0
          ? result.actions.map((a) => a.type).join(",")
          : null;
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "assistant",
          content: result.response,
          actionType: actionSummary,
          actionData: result.actions.length > 0 ? result.actions : undefined,
          actionStatus: result.actions.some((a) => !a.success) ? "failed" : result.actions.length > 0 ? "executed" : "pending",
        });

        return {
          response: result.response,
          actions: result.actions,
        };
      }),

    uploadAttachment: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() || "bin";
        const key = `director-chat/${input.projectId}/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, fileName: input.fileName };
      }),

    clear: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.clearProjectChat(input.projectId, ctx.user.id);
        return { success: true };
      }),

    transcribeVoice: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        audioData: z.string(), // base64 encoded audio
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload audio to S3 first
        const buffer = Buffer.from(input.audioData, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "wav";
        const key = `voice-recordings/${input.projectId}/${nanoid()}.${ext}`;
        const { url: audioUrl } = await storagePut(key, buffer, input.mimeType);

        // Transcribe using Whisper
        const result = await transcribeAudio({
          audioUrl,
          language: "en",
          prompt: "Director giving film production commands. Transcribe exactly what is said.",
        });

        if ("error" in result) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error,
            cause: result,
          });
        }

        return {
          text: result.text,
          language: result.language,
          duration: result.duration,
        };
      }),

    voiceEditText: protectedProcedure
      .input(z.object({
        currentText: z.string().min(1).max(10000),
        editCommand: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a text editor assistant for a film director. The director has dictated some text and now wants to edit it using voice commands.

You will receive:
1. The CURRENT TEXT that the director has dictated
2. An EDIT COMMAND spoken by the director

Your job is to apply the edit command to the current text and return the result.

IMPORTANT: The director may chain multiple commands in a single utterance using "and", "then", "also", commas, or periods. Apply ALL commands sequentially in the order given.

Examples of chained commands:
- "Replace sunset with sunrise and add dramatic music at the end"
- "Delete the first sentence, then make it more dramatic"
- "Fix the grammar and also make it shorter"
- "Change the tone to be more serious, remove the last line, and add a new ending about hope"

Common edit commands include:
- "Replace X with Y" or "Change X to Y" — find and replace text
- "Delete/Remove [text or description]" — remove specified text
- "Add/Append [text] at the end" — add text to the end
- "Insert [text] before/after [reference]" — insert at a specific position
- "Undo" or "Revert" — cannot be handled, return the text unchanged
- "Clear all" or "Start over" — return empty string
- "Make it more [adjective]" — rewrite with that quality
- "Fix grammar" or "Fix spelling" — correct errors
- "Make it shorter" or "Make it longer" — adjust length
- "Read it back" — return the text unchanged (the UI will handle display)

Rules:
- Return ONLY the edited text, nothing else
- Do NOT add explanations, quotes, or markdown
- Apply ALL chained commands in sequence
- Preserve the original meaning and intent unless the command explicitly changes it
- If a command is unclear or cannot be applied, skip it and apply the rest
- If the command says "clear all" or "start over", return exactly: __CLEAR__`,
            },
            {
              role: "user",
              content: `CURRENT TEXT:\n"""\n${input.currentText}\n"""\n\nEDIT COMMAND: "${input.editCommand}"\n\nApply the edit and return only the resulting text:`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const editedText = (typeof rawContent === "string" ? rawContent.trim() : input.currentText) || input.currentText;

        // Handle special commands
        if (editedText === "__CLEAR__") {
          return { editedText: "", command: "clear", applied: true };
        }

        // Detect if text actually changed
        const applied = editedText !== input.currentText;

        return {
          editedText,
          command: input.editCommand,
          applied,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
