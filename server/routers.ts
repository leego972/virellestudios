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
});

export type AppRouter = typeof appRouter;
