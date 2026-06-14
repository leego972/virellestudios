import { router, protectedProcedure } from "./_core/trpc";
  import { z } from "zod";
  import { TRPCError } from "@trpc/server";
  import { sql } from "drizzle-orm";
  import * as db from "./db";
  import { logger } from "./_core/logger";
  import { generateImage } from "./_core/imageGeneration";
  import { invokeLLM } from "./_core/llm";
  import { storagePut } from "./storage";
  import {
    buildVfxPromptInjection, buildSfxPromptInjection,
    VFX_PACK_PROMPTS, SFX_PACK_PROMPTS,
  } from "./_core/vfxPromptEngine";

  // ─── Pack catalogues ──────────────────────────────────────────────────────────
  const VFX_PACKS = [
    { id: 1,  name: "Cinematic Dust & Particles Pro",    category: "Particles",     description: "847 organic dust, smoke, and particle elements shot on black backgrounds. Hollywood-grade 4K ProRes files used in major feature productions.",                                      fileCount: 847,  resolution: "4K ProRes 4444",    software: "After Effects, Premiere, DaVinci Resolve, Final Cut", tags: ["dust","particles","organic","4K","ProRes"],    featured: true },
    { id: 2,  name: "Hollywood Explosion Collection",    category: "Explosions",    description: "120 real practical explosion elements captured at 96fps with Phantom cameras. Multiple sizes from small blasts to massive detonations.",                                             fileCount: 120,  resolution: "4K RAW",            software: "All major NLEs",                              tags: ["explosions","practical","pyro","Phantom","4K"], featured: true },
    { id: 3,  name: "Smoke & Fire Elements Ultra Pack",  category: "Fire & Smoke",  description: "450 practical smoke and fire elements. Includes colored smoke, campfires, building fires, car fires, and atmospheric haze on black.",                                              fileCount: 450,  resolution: "4K ProRes 4444",    software: "After Effects, Premiere, DaVinci, FCPX",      tags: ["smoke","fire","practical","atmosphere","haze"] },
    { id: 4,  name: "Sci-Fi HUD Overlays Bundle",        category: "Sci-Fi",        description: "200 futuristic HUD, holographic displays, scanning grids, and interface elements. Editable in After Effects with included project files.",                                       fileCount: 200,  resolution: "4K",                software: "After Effects",                               tags: ["HUD","sci-fi","holographic","futuristic","interface"] },
    { id: 5,  name: "Rain & Weather Atmosphere Pack",    category: "Weather",       description: "180 rain, snow, fog, lightning, and storm atmosphere clips. All shot practically, multiple intensities and angles.",                                                              fileCount: 180,  resolution: "4K ProRes",         software: "All major NLEs",                              tags: ["rain","snow","fog","lightning","weather"] },
    { id: 6,  name: "Anamorphic Light Leaks & Flares",  category: "Light FX",      description: "300 real anamorphic lens flares and light leaks captured through Panavision anamorphic glass. The authentic Hollywood flare look.",                                               fileCount: 300,  resolution: "4K ProRes 4444",    software: "All major NLEs",                              tags: ["lens flare","anamorphic","light leak","Panavision","cinematic"], featured: true },
    { id: 7,  name: "Cinematic Transitions Mega Pack",   category: "Transitions",   description: "150 cinematic transitions including whip pans, light burns, film flash, glitch, and ink transitions with alpha channels.",                                                      fileCount: 150,  resolution: "4K",                software: "Premiere, DaVinci, FCPX, After Effects",      tags: ["transitions","whip pan","flash","glitch","ink"] },
    { id: 8,  name: "Film Grain & Texture Toolkit",      category: "Film Textures", description: "90 authentic film grain textures from 8mm through 70mm. Includes ORWO, Kodak, Fuji emulsions recorded directly from film prints.",                                             fileCount: 90,   resolution: "4K+",               software: "All major NLEs",                              tags: ["grain","texture","film","analog","Kodak","35mm"] },
    { id: 9,  name: "Magic & Fantasy VFX Arsenal",       category: "Fantasy",       description: "250 magic spells, energy blasts, portal effects, fairy dust, and mystical particle systems. Includes AE project files.",                                                         fileCount: 250,  resolution: "4K",                software: "After Effects, Premiere",                     tags: ["magic","fantasy","spells","energy","particles"] },
    { id: 10, name: "Blood & Gore Practical Elements",   category: "Horror",        description: "180 practical blood splatter, drips, and gore elements for horror and action productions. All practical, no CG.",                                                                fileCount: 180,  resolution: "4K ProRes 4444",    software: "All major NLEs",                              tags: ["horror","blood","practical","action","splatter"] },
    { id: 11, name: "Digital Glitch & Data Corruption",  category: "Glitch",        description: "220 digital glitch effects, signal corruption, datamosh, pixel sorting, and chromatic aberration elements.",                                                                     fileCount: 220,  resolution: "4K",                software: "All major NLEs",                              tags: ["glitch","digital","datamosh","cyberpunk","chromatic"] },
    { id: 12, name: "Water & Liquid Elements Pro",       category: "Water",         description: "160 water splashes, underwater caustics, ocean waves, rain drops, and liquid pour elements captured at high speed.",                                                             fileCount: 160,  resolution: "4K ProRes",         software: "All major NLEs",                              tags: ["water","liquid","splash","underwater","ocean"] },
    { id: 13, name: "Space & Cosmos VFX Suite",          category: "Sci-Fi",        description: "200 space backgrounds, nebulae, asteroid fields, planet surfaces, star wipes, and deep space elements for sci-fi productions.",                                                  fileCount: 200,  resolution: "8K",                software: "After Effects, Nuke, DaVinci",                tags: ["space","cosmos","nebula","sci-fi","stars","planets"] },
    { id: 14, name: "Drone & Aerial Atmosphere Pack",    category: "Atmosphere",    description: "120 aerial mist, cloud layers, horizon haze, and atmospheric depth elements to add realism to drone footage composites.",                                                       fileCount: 120,  resolution: "4K",                software: "All major NLEs",                              tags: ["aerial","drone","mist","clouds","atmosphere","depth"] },
    { id: 15, name: "Neon & Cyberpunk Overlays",         category: "Sci-Fi",        description: "180 neon light streaks, rain reflections, city light bokeh, and cyberpunk atmosphere elements for neo-noir films.",                                                             fileCount: 180,  resolution: "4K ProRes 4444",    software: "All major NLEs",                              tags: ["neon","cyberpunk","noir","city","bokeh","reflections"] },
  ];

  const SFX_PACKS = [
    { id: 101, name: "Hollywood Explosion Bundle",           category: "Explosions",     description: "340 explosion SFX from small bangs to massive detonations. Includes distant rumbles, close-up blasts, and underwater. Recorded with Sanken CS-3e mics.", fileCount: 340,  format: "WAV 96kHz/24-bit",        tags: ["explosions","bang","blast","boom","action"],            featured: true },
    { id: 102, name: "Cinematic Foley Collection",           category: "Foley",          description: "1,200 detailed foley recordings: footsteps on 40 surfaces, clothing rustles, prop handling, door interactions, and everyday objects. Studio A Foley pit recorded.", fileCount: 1200, format: "WAV 96kHz/24-bit",        tags: ["foley","footsteps","clothing","props","detail"],         featured: true },
    { id: 103, name: "Sci-Fi Sound Design Arsenal",          category: "Sci-Fi",         description: "450 original sci-fi sound design elements: alien ambiences, spaceship engines, laser weapons, force fields, teleportation, and interface sounds.",            fileCount: 450,  format: "WAV 96kHz/24-bit",        tags: ["sci-fi","laser","spaceship","alien","futuristic"] },
    { id: 104, name: "World Ambience Library",               category: "Ambience",       description: "680 atmospheric recordings from 50 countries: jungles, deserts, cities, oceans, forests, markets, and underground spaces. Binaural and stereo versions.",   fileCount: 680,  format: "WAV 48kHz/24-bit",        tags: ["ambience","world","nature","city","atmosphere","binaural"] },
    { id: 105, name: "Horror & Psychological Tension",       category: "Horror",         description: "320 horror stingers, creature vocals, eerie atmospheres, jump scare impacts, and psychological tension drones.",                                               fileCount: 320,  format: "WAV 96kHz/24-bit",        tags: ["horror","stinger","creature","tension","jump scare"] },
    { id: 106, name: "Action & Fight Choreography SFX",      category: "Action",         description: "280 punches, kicks, swooshes, body impacts, bone cracks, and fight choreography sound effects used in Hollywood action productions.",                          fileCount: 280,  format: "WAV 96kHz/24-bit",        tags: ["action","fight","punch","kick","impact","martial arts"] },
    { id: 107, name: "Weapon & Military Arsenal",            category: "Weapons",        description: "420 real firearm recordings: pistols, rifles, shotguns, machine guns, rockets, with indoor/outdoor/suppressed variations for every caliber.",                fileCount: 420,  format: "WAV 96kHz/24-bit",        tags: ["weapons","guns","military","firearms","war"] },
    { id: 108, name: "Vehicle & Transportation Pro",         category: "Vehicles",       description: "380 vehicle SFX: cars (startup to redline), motorcycles, trucks, trains, aircraft from props to jets, helicopters, boats, and spacecraft.",                  fileCount: 380,  format: "WAV 96kHz/24-bit",        tags: ["vehicles","car","engine","aircraft","helicopter","train"] },
    { id: 109, name: "Crowd & Human Atmosphere Pack",        category: "Crowds",         description: "240 crowd walla, reactions (cheer, gasp, scream, applause), protest chants, stadium ambience, and intimate gathering recordings.",                           fileCount: 240,  format: "WAV 96kHz/24-bit",        tags: ["crowd","walla","audience","stadium","reaction"] },
    { id: 110, name: "Nature & Wildlife Sound Library",      category: "Nature",         description: "560 nature recordings: thunderstorms, birdsong from 120 species, wildlife, insects, wind in trees, rivers, and wilderness ambiences.",                       fileCount: 560,  format: "WAV 96kHz/24-bit",        tags: ["nature","wildlife","birds","thunder","forest","ocean"] },
    { id: 111, name: "Cinematic Impact & Transition SFX",   category: "Cinematic",      description: "200 cinematic whooshes, impacts, bass drops, trailer stingers, and transitions used in blockbuster trailers and prestige TV.",                                fileCount: 200,  format: "WAV 96kHz/24-bit",        tags: ["impact","whoosh","trailer","stinger","cinematic","bass"], featured: true },
    { id: 112, name: "UI & Digital Interface SFX",          category: "UI/Tech",        description: "300 digital UI sounds: notifications, loading, errors, typing, scanner beeps, data transfer, and futuristic interface sounds.",                               fileCount: 300,  format: "WAV 96kHz/24-bit",        tags: ["UI","digital","interface","notification","tech"] },
    { id: 113, name: "Musical Stings & Transitions",        category: "Music Stings",   description: "150 orchestral stings, genre transitions, musical bridges, and short cinematic cues for connecting scenes in drama and documentary.",                        fileCount: 150,  format: "WAV 96kHz/24-bit + MIDI", tags: ["sting","orchestral","cue","musical","transition"] },
    { id: 114, name: "Underwater & Deep Sea SFX",           category: "Underwater",     description: "180 realistic underwater sounds: bubbles, pressure, whale song, submarine ambience, diving equipment, and underwater action.",                               fileCount: 180,  format: "WAV 96kHz/24-bit",        tags: ["underwater","ocean","bubbles","whale","deep sea"] },
    { id: 115, name: "Historical & Period Production SFX",  category: "Historical",     description: "250 period-accurate sound effects: medieval battles, horse-drawn carriages, muskets, cannons, forge sounds, and Victorian machinery.",                       fileCount: 250,  format: "WAV 96kHz/24-bit",        tags: ["historical","period","medieval","Victorian","war"] },
  ];

  // ─── DB bootstrap ─────────────────────────────────────────────────────────────
  async function ensureTables(dbConn: any) {
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS user_vfx_library (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        packId INT NOT NULL,
        packType ENUM('vfx','sfx') NOT NULL,
        isActive TINYINT(1) DEFAULT 1,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_pack (userId, packId, packType),
        INDEX idx_uvl_user (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS scene_vfx_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sceneId INT NOT NULL,
        userId INT NOT NULL,
        vfxPackIds JSON,
        sfxPackIds JSON,
        enhancedImageUrl TEXT,
        sfxAudioUrl TEXT,
        sfxPrompt TEXT,
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_scene (sceneId),
        INDEX idx_svd_user (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await dbConn.execute(sql`
      CREATE TABLE IF NOT EXISTS project_vfx_theme (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        userId INT NOT NULL,
        vfxPackIds JSON,
        sfxPackIds JSON,
        themeName VARCHAR(120),
        setAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_project (projectId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  // ─── Router ───────────────────────────────────────────────────────────────────
  export const vfxSfxRouter = router({

    // ── Catalogues (keep backward-compat as public-equivalent) ──────────────────
    listVfxPacks: protectedProcedure.query(() => VFX_PACKS),
    listSfxPacks: protectedProcedure.query(() => SFX_PACKS),

    // ── Library management ───────────────────────────────────────────────────────
    getLibrary: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { vfx: [], sfx: [] };
      await ensureTables(dbConn);
      const rows: any = await dbConn.execute(
        sql`SELECT packId, packType, isActive FROM user_vfx_library WHERE userId = ${ctx.user.id} ORDER BY addedAt DESC`
      );
      const data: any[] = Array.isArray(rows[0]) ? rows[0] : [];
      const vfxIds = new Map(data.filter(r => r.packType === "vfx").map(r => [Number(r.packId), !!r.isActive]));
      const sfxIds = new Map(data.filter(r => r.packType === "sfx").map(r => [Number(r.packId), !!r.isActive]));
      return {
        vfx: VFX_PACKS.filter(p => vfxIds.has(p.id)).map(p => ({ ...p, isActive: vfxIds.get(p.id) ?? true })),
        sfx: SFX_PACKS.filter(p => sfxIds.has(p.id)).map(p => ({ ...p, isActive: sfxIds.get(p.id) ?? true })),
      };
    }),

    addToLibrary: protectedProcedure
      .input(z.object({ packId: z.number(), packType: z.enum(["vfx","sfx"]) }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureTables(dbConn);
        await dbConn.execute(sql`
          INSERT INTO user_vfx_library (userId, packId, packType, isActive)
          VALUES (${ctx.user.id}, ${input.packId}, ${input.packType}, 1)
          ON DUPLICATE KEY UPDATE isActive = 1`);
        logger.info(`[VFX Library] User ${ctx.user.id} added ${input.packType} pack ${input.packId}`);
        return { ok: true };
      }),

    removeFromLibrary: protectedProcedure
      .input(z.object({ packId: z.number(), packType: z.enum(["vfx","sfx"]) }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await dbConn.execute(sql`
          DELETE FROM user_vfx_library WHERE userId = ${ctx.user.id} AND packId = ${input.packId} AND packType = ${input.packType}`);
        return { ok: true };
      }),

    setPackActive: protectedProcedure
      .input(z.object({ packId: z.number(), packType: z.enum(["vfx","sfx"]), active: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await dbConn.execute(sql`
          UPDATE user_vfx_library SET isActive = ${input.active ? 1 : 0}
          WHERE userId = ${ctx.user.id} AND packId = ${input.packId} AND packType = ${input.packType}`);
        return { ok: true };
      }),

    // ── Scene VFX data ───────────────────────────────────────────────────────────
    getSceneVfxData: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        await ensureTables(dbConn);
        const rows: any = await dbConn.execute(
          sql`SELECT * FROM scene_vfx_data WHERE sceneId = ${input.sceneId} AND userId = ${ctx.user.id} LIMIT 1`
        );
        const data = Array.isArray(rows[0]) ? rows[0] : [];
        return data[0] || null;
      }),

    // ── AI VFX application — img2img second pass ─────────────────────────────────
    // This is the core differentiator: instead of manually compositing VFX files
    // in After Effects, Virelle's AI renders the effect directly into the frame.
    applyVfxToScene: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        vfxPackIds: z.array(z.number()).min(1).max(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureTables(dbConn);

        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

        const vfxInjection = buildVfxPromptInjection(input.vfxPackIds);
        const baseDescription = (scene as any).description || "cinematic film scene";
        const enhancedPrompt = [
          "RAW photograph, ultra-photorealistic Hollywood film frame,",
          baseDescription + ",",
          "POST-PRODUCTION VFX APPLIED:",
          vfxInjection + ",",
          "Academy Award-winning cinematography, IMAX quality, 8K resolution,",
          "NOT illustration, NOT CGI-looking, photorealistic practical elements",
        ].join(" ");

        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const result = await generateImage({
          prompt: enhancedPrompt,
          originalImages: (scene as any).thumbnailUrl
            ? [{ url: (scene as any).thumbnailUrl, mimeType: "image/jpeg" }]
            : undefined,
          userOpenAiKey: (userKeys as any).openaiKey || undefined,
        });

        if (!result?.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "VFX render failed. Please try again." });

        await dbConn.execute(sql`
          INSERT INTO scene_vfx_data (sceneId, userId, vfxPackIds, enhancedImageUrl)
          VALUES (${input.sceneId}, ${ctx.user.id}, ${JSON.stringify(input.vfxPackIds)}, ${result.url})
          ON DUPLICATE KEY UPDATE vfxPackIds = ${JSON.stringify(input.vfxPackIds)}, enhancedImageUrl = ${result.url}, appliedAt = NOW()`);

        logger.info(`[VFX] Scene ${input.sceneId} VFX pass complete for user ${ctx.user.id}`);
        return { enhancedImageUrl: result.url, originalImageUrl: (scene as any).thumbnailUrl };
      }),

    // ── AI SFX generation — ElevenLabs Sound Effects API ─────────────────────────
    // Users describe exactly what they need — AI generates a custom audio file.
    // This beats every static SFX library: your sound, your scene, on demand.
    generateCustomSfx: protectedProcedure
      .input(z.object({
        prompt: z.string().min(10).max(500),
        durationSeconds: z.number().min(1).max(22).default(5),
        sceneId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const elevenlabsKey = (userKeys as any).elevenlabsKey;
        if (!elevenlabsKey) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "NO_ELEVENLABS_KEY: Add your ElevenLabs API key in Settings → API Keys to generate custom SFX. Get a free key at elevenlabs.io",
          });
        }

        try {
          const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
            method: "POST",
            headers: { "xi-api-key": elevenlabsKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: input.prompt,
              duration_seconds: input.durationSeconds,
              prompt_influence: 0.3,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `ElevenLabs error: ${errText}` });
          }

          const audioBuffer = Buffer.from(await response.arrayBuffer());
          const key = `sfx/${ctx.user.id}/${Date.now()}.mp3`;
          const { url } = await storagePut(key, audioBuffer, "audio/mpeg");

          // If linked to a scene, save to scene_vfx_data
          if (input.sceneId) {
            const dbConn = await db.getDb();
            if (dbConn) {
              await ensureTables(dbConn);
              await dbConn.execute(sql`
                INSERT INTO scene_vfx_data (sceneId, userId, sfxAudioUrl, sfxPrompt)
                VALUES (${input.sceneId}, ${ctx.user.id}, ${url}, ${input.prompt})
                ON DUPLICATE KEY UPDATE sfxAudioUrl = ${url}, sfxPrompt = ${input.prompt}, appliedAt = NOW()`);
            }
          }

          logger.info(`[SFX] Custom SFX generated for user ${ctx.user.id}: ${input.prompt.slice(0,60)}`);
          return { audioUrl: url, prompt: input.prompt };
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "SFX generation failed. Please try again." });
        }
      }),

    // ── AI VFX/SFX suggestions — AI reads your scene and recommends ───────────────
    // No other platform does this: AI analyses your script/scene and tells you
    // exactly which VFX and SFX packs to apply and why.
    suggestVfxForScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

        const vfxList = VFX_PACKS.map(p => `VFX ${p.id}: ${p.name} (${p.category})`).join("\n");
        const sfxList = SFX_PACKS.map(p => `SFX ${p.id}: ${p.name} (${p.category})`).join("\n");
        const sceneDesc = [(scene as any).description, (scene as any).actionDescription, (scene as any).vfxNotes]
          .filter(Boolean).join(" | ");

        const reply = await invokeLLM([{
          role: "system",
          content: `You are a Hollywood VFX supervisor and sound designer. Analyse this scene and recommend the most impactful VFX and SFX packs. 
  Return ONLY a JSON object: { "vfxIds": [numbers], "sfxIds": [numbers], "reasoning": "brief explanation", "sfxPrompt": "a detailed 1-sentence SFX generation prompt for the scene's key sound moment" }
  Available VFX packs:\n${vfxList}\nAvailable SFX packs:\n${sfxList}`,
        }, {
          role: "user",
          content: `Scene: ${sceneDesc || "no description provided"}`,
        }], { maxTokens: 400, temperature: 0.3 });

        try {
          const parsed = JSON.parse(reply.replace(/```json|\n|```/g, "").trim());
          return {
            vfxIds: (parsed.vfxIds || []).filter((id: any) => VFX_PACKS.find(p => p.id === id)),
            sfxIds: (parsed.sfxIds || []).filter((id: any) => SFX_PACKS.find(p => p.id === id)),
            reasoning: parsed.reasoning || "",
            sfxPrompt: parsed.sfxPrompt || "",
          };
        } catch {
          return { vfxIds: [], sfxIds: [], reasoning: "Could not parse suggestion", sfxPrompt: "" };
        }
      }),

    // ── Project-level VFX theme ───────────────────────────────────────────────────
    // Set a consistent VFX look for your entire film. Every scene generated
    // after this will automatically carry that visual signature.
    getProjectVfxTheme: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        await ensureTables(dbConn);
        const rows: any = await dbConn.execute(
          sql`SELECT * FROM project_vfx_theme WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} LIMIT 1`
        );
        const data = Array.isArray(rows[0]) ? rows[0] : [];
        if (!data[0]) return null;
        const row = data[0];
        return {
          vfxPackIds: JSON.parse(row.vfxPackIds || "[]"),
          sfxPackIds: JSON.parse(row.sfxPackIds || "[]"),
          themeName: row.themeName,
        };
      }),

    setProjectVfxTheme: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        vfxPackIds: z.array(z.number()),
        sfxPackIds: z.array(z.number()),
        themeName: z.string().max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await ensureTables(dbConn);
        await dbConn.execute(sql`
          INSERT INTO project_vfx_theme (projectId, userId, vfxPackIds, sfxPackIds, themeName)
          VALUES (${input.projectId}, ${ctx.user.id}, ${JSON.stringify(input.vfxPackIds)}, ${JSON.stringify(input.sfxPackIds)}, ${input.themeName || null})
          ON DUPLICATE KEY UPDATE
            vfxPackIds = ${JSON.stringify(input.vfxPackIds)},
            sfxPackIds = ${JSON.stringify(input.sfxPackIds)},
            themeName  = ${input.themeName || null},
            setAt      = NOW()`);
        return { ok: true };
      }),

    // ── Active library prompt — used by generation pipeline ────────────────────
    getActivePipelineContext: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return { vfxPrompt: "", sfxPrompt: "", activeCount: 0 };
      await ensureTables(dbConn);
      const rows: any = await dbConn.execute(
        sql`SELECT packId, packType FROM user_vfx_library WHERE userId = ${ctx.user.id} AND isActive = 1`
      );
      const data: any[] = Array.isArray(rows[0]) ? rows[0] : [];
      const vfxIds = data.filter(r => r.packType === "vfx").map(r => Number(r.packId));
      const sfxIds = data.filter(r => r.packType === "sfx").map(r => Number(r.packId));
      return {
        vfxPrompt: buildVfxPromptInjection(vfxIds),
        sfxPrompt: buildSfxPromptInjection(sfxIds),
        activeCount: data.length,
        vfxPackNames: VFX_PACKS.filter(p => vfxIds.includes(p.id)).map(p => p.name),
        sfxPackNames: SFX_PACKS.filter(p => sfxIds.includes(p.id)).map(p => p.name),
      };
    }),
  });
  