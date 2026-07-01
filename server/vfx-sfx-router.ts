import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import * as db from "./db";
import { logger } from "./_core/logger";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { buildVfxPromptInjection, buildSfxPromptInjection } from "./_core/vfxPromptEngine";
import {
  assertDigitalLikenessConsent,
  buildVfxAuditMetadata,
  getSwappysFunnelPricing,
  getSwappysWatermarkMode,
  getVfxCreditCost,
  requireVfxStudioTier,
  VFX_STUDIO_EFFECT_CATALOGUE,
  type VfxJobKind,
  type VfxQuality,
} from "./_core/vfxStudioMiddleware";

const VFX_PACKS = [
  { id: 1, name: "Cinematic Dust & Particles Pro", category: "Particles", description: "Dust, ash, embers, haze and atmosphere layers for invisible cinematic compositing.", fileCount: 847, resolution: "4K ProRes 4444", software: "After Effects, Premiere, DaVinci Resolve, Final Cut", tags: ["dust", "particles", "atmosphere", "4K", "ProRes"], featured: true },
  { id: 2, name: "Practical Action Impact Collection", category: "Action", description: "Controlled studio action accents: sparks, debris, shockwave atmosphere and impact timing elements.", fileCount: 120, resolution: "4K RAW", software: "All major NLEs", tags: ["action", "impact", "sparks", "debris", "4K"], featured: true },
  { id: 3, name: "Smoke & Fire Atmosphere Ultra Pack", category: "Fire & Smoke", description: "Smoke, haze, flame glow, ember drift, heat haze and atmospheric integration layers.", fileCount: 450, resolution: "4K ProRes 4444", software: "After Effects, Premiere, DaVinci, FCPX", tags: ["smoke", "fire", "atmosphere", "haze"] },
  { id: 4, name: "Sci-Fi HUD Overlays Bundle", category: "Sci-Fi", description: "HUDs, holograms, scanner grids and screen-composite interface elements.", fileCount: 200, resolution: "4K", software: "After Effects", tags: ["HUD", "sci-fi", "holographic", "interface"] },
  { id: 5, name: "Rain & Weather Atmosphere Pack", category: "Weather", description: "Rain, snow, fog, lightning glow and storm atmosphere in multiple intensities.", fileCount: 180, resolution: "4K ProRes", software: "All major NLEs", tags: ["rain", "snow", "fog", "weather"] },
  { id: 6, name: "Anamorphic Light Leaks & Flares", category: "Light FX", description: "Anamorphic flares, halation streaks, prism hits and lens-breathing finishing layers.", fileCount: 300, resolution: "4K ProRes 4444", software: "All major NLEs", tags: ["lens flare", "anamorphic", "light leak", "cinematic"], featured: true },
  { id: 7, name: "Cinematic Transitions Mega Pack", category: "Transitions", description: "Whip pans, light burns, film flashes, glitch transitions and ink wipes.", fileCount: 150, resolution: "4K", software: "Premiere, DaVinci, FCPX, After Effects", tags: ["transitions", "whip pan", "flash", "glitch"] },
  { id: 8, name: "Film Grain & Texture Toolkit", category: "Film Textures", description: "Grain, halation, gate weave, print texture and analog finishing references.", fileCount: 90, resolution: "4K+", software: "All major NLEs", tags: ["grain", "texture", "film", "analog"] },
  { id: 9, name: "Magic & Fantasy VFX Arsenal", category: "Fantasy", description: "Portal glows, magical particles, energy wisps and supernatural atmosphere.", fileCount: 250, resolution: "4K", software: "After Effects, Premiere", tags: ["magic", "fantasy", "energy", "particles"] },
  { id: 10, name: "Horror Atmosphere & Makeup Continuity", category: "Horror", description: "Dark ambience layers, grime, makeup continuity and psychological horror finishing.", fileCount: 180, resolution: "4K ProRes 4444", software: "All major NLEs", tags: ["horror", "texture", "makeup", "atmosphere"] },
  { id: 11, name: "Digital Glitch & Data Corruption", category: "Glitch", description: "Signal breakups, datamosh smears, pixel sorting and chromatic offsets.", fileCount: 220, resolution: "4K", software: "All major NLEs", tags: ["glitch", "digital", "datamosh", "chromatic"] },
  { id: 12, name: "Water & Liquid Elements Pro", category: "Water", description: "Water splashes, caustics, ocean spray, droplets and liquid atmosphere.", fileCount: 160, resolution: "4K ProRes", software: "All major NLEs", tags: ["water", "liquid", "splash", "underwater"] },
  { id: 13, name: "Space & Cosmos VFX Suite", category: "Sci-Fi", description: "Space backgrounds, nebulae, asteroid fields, starfields and planetary edges.", fileCount: 200, resolution: "8K", software: "After Effects, Nuke, DaVinci", tags: ["space", "cosmos", "nebula", "stars"] },
  { id: 14, name: "Drone & Aerial Atmosphere Pack", category: "Atmosphere", description: "Aerial mist, cloud layers, horizon haze and large-scale environment depth.", fileCount: 120, resolution: "4K", software: "All major NLEs", tags: ["aerial", "drone", "mist", "clouds"] },
  { id: 15, name: "Neon & Cyberpunk Overlays", category: "Sci-Fi", description: "Neon streaks, wet city reflections, bokeh bloom and neo-noir atmosphere.", fileCount: 180, resolution: "4K ProRes 4444", software: "All major NLEs", tags: ["neon", "cyberpunk", "noir", "bokeh"] },
  { id: 9001, name: "Swappys Digital Double Studio", category: "Digital Double", description: "Actor-approved digital-double, stunt continuity, pickup-match and likeness-continuity workflow for Virelle productions.", fileCount: 1, resolution: "Studio Render", software: "Virelle VFX Studio", tags: ["digital double", "stunt", "continuity", "actor match"], featured: true },
];

const SFX_PACKS = [
  { id: 101, name: "Cinematic Impact & Transition SFX", category: "Cinematic", description: "Whooshes, hits, rises, bass drops, trailer stings and transitions.", fileCount: 200, format: "WAV 96kHz/24-bit", tags: ["impact", "whoosh", "trailer", "cinematic"], featured: true },
  { id: 102, name: "Cinematic Foley Collection", category: "Foley", description: "Footsteps, cloth movement, object handling, doors, surfaces and tactile details.", fileCount: 1200, format: "WAV 96kHz/24-bit", tags: ["foley", "footsteps", "clothing", "props"], featured: true },
  { id: 103, name: "Sci-Fi Sound Design Arsenal", category: "Sci-Fi", description: "Interface sounds, spacecraft ambience, scanner tones and energy hums.", fileCount: 450, format: "WAV 96kHz/24-bit", tags: ["sci-fi", "interface", "spaceship", "futuristic"] },
  { id: 104, name: "World Ambience Library", category: "Ambience", description: "Cities, forests, markets, oceans, rooms, tunnels and exterior ambience beds.", fileCount: 680, format: "WAV 48kHz/24-bit", tags: ["ambience", "world", "nature", "city"] },
  { id: 105, name: "Horror & Psychological Tension", category: "Horror", description: "Tension drones, eerie textures, unsettling room tone and suspense accents.", fileCount: 320, format: "WAV 96kHz/24-bit", tags: ["horror", "tension", "drone", "suspense"] },
  { id: 106, name: "Action Choreography SFX", category: "Action", description: "Movement whooshes, body impacts, falls, fabric snaps and choreography timing accents.", fileCount: 280, format: "WAV 96kHz/24-bit", tags: ["action", "movement", "impact", "timing"] },
  { id: 108, name: "Vehicle & Transportation Pro", category: "Vehicles", description: "Cars, bikes, trucks, trains, aircraft, helicopters, boats and movement layers.", fileCount: 380, format: "WAV 96kHz/24-bit", tags: ["vehicles", "engine", "aircraft", "train"] },
  { id: 109, name: "Crowd & Human Atmosphere Pack", category: "Crowds", description: "Crowd walla, reactions, applause, stadium ambience and intimate gatherings.", fileCount: 240, format: "WAV 96kHz/24-bit", tags: ["crowd", "walla", "audience", "reaction"] },
  { id: 110, name: "Nature & Wildlife Sound Library", category: "Nature", description: "Storms, birdsong, wildlife, insects, wind, rivers and forest ambience.", fileCount: 560, format: "WAV 96kHz/24-bit", tags: ["nature", "wildlife", "birds", "forest"] },
  { id: 112, name: "UI & Digital Interface SFX", category: "UI/Tech", description: "Notifications, loading, errors, typing, scanner beeps and interface sounds.", fileCount: 300, format: "WAV 96kHz/24-bit", tags: ["UI", "digital", "interface", "notification"] },
  { id: 113, name: "Musical Stings & Transitions", category: "Music Stings", description: "Orchestral stings, genre transitions, musical bridges and short cues.", fileCount: 150, format: "WAV 96kHz/24-bit + MIDI", tags: ["sting", "orchestral", "cue", "transition"] },
  { id: 114, name: "Underwater & Deep Sea SFX", category: "Underwater", description: "Bubbles, pressure, whale song, submarine ambience and underwater movement.", fileCount: 180, format: "WAV 96kHz/24-bit", tags: ["underwater", "ocean", "bubbles", "deep sea"] },
];

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
      metadata JSON,
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
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS scene_swappys_exports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sceneId INT NOT NULL,
      projectId INT NOT NULL,
      userId INT NOT NULL,
      sourcePlateUrl TEXT,
      actorReferenceUrl TEXT,
      mode VARCHAR(64) NOT NULL,
      quality VARCHAR(32) NOT NULL,
      visibleWatermarkMode VARCHAR(64) NOT NULL,
      consentConfirmed TINYINT(1) NOT NULL DEFAULT 0,
      consentNotes TEXT,
      creditCost INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      metadata JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sse_scene (sceneId),
      INDEX idx_sse_project (projectId),
      INDEX idx_sse_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  try { await dbConn.execute(sql`ALTER TABLE scene_vfx_data ADD COLUMN metadata JSON NULL`); } catch {}
}

const SWAPPYS_OPERATIONS = new Set([
  "swappys-digital-double",
  "stunt-face-replacement",
  "actor-continuity-match",
  "pickup-scene-match",
  "ai-stunt-insert",
  "performance-polish",
]);

function inferJobKind(operations: string[]): VfxJobKind {
  if (operations.includes("stunt-face-replacement")) return "stunt_face_replacement";
  if (operations.includes("actor-continuity-match")) return "actor_continuity_match";
  if (operations.includes("pickup-scene-match")) return "pickup_scene_match";
  if (operations.includes("ai-stunt-insert")) return "ai_stunt_insert";
  if (operations.some((op) => SWAPPYS_OPERATIONS.has(op))) return "digital_double";
  if (operations.some((op) => op.includes("cleanup") || op.includes("removal"))) return "cleanup";
  if (operations.some((op) => op.includes("composite") || op.includes("replacement") || op.includes("keying"))) return "composite";
  if (operations.some((op) => op.includes("restore") || op.includes("repair") || op.includes("deflicker"))) return "restoration";
  if (operations.some((op) => op.includes("qc") || op.includes("color") || op.includes("grain"))) return "finishing_qc";
  return "general_vfx";
}

function buildStudioPrompt(input: {
  operations: string[];
  intensity: number;
  scene: any;
  actorReferenceUrl?: string | null;
  sourcePlateUrl?: string | null;
  hideVisibleWatermark?: boolean;
  exportQuality: VfxQuality;
  directorNotes?: string | null;
}) {
  const operationText = input.operations.map((op) => op.replace(/-/g, " ")).join(", ");
  const baseDescription = input.scene?.description || input.scene?.actionDescription || "cinematic film scene";
  return [
    `Apply Virelle Studio professional VFX at ${input.intensity}% intensity: ${operationText}.`,
    `Scene context: ${baseDescription}.`,
    input.actorReferenceUrl ? "Use the approved actor reference as the likeness and continuity source." : "",
    input.sourcePlateUrl ? "Use the uploaded source plate as the live-action plate reference." : "",
    input.operations.some((op) => SWAPPYS_OPERATIONS.has(op))
      ? "SWAPPYS DIGITAL DOUBLE: preserve actor identity continuity, body proportions, wardrobe continuity, lighting direction, skin detail, expression, camera perspective, motion blur, lens distortion and grain."
      : "",
    input.hideVisibleWatermark
      ? "Studio export: hide visible watermark for paid production output; keep internal audit/provenance metadata."
      : "Retain visible AI-altered disclosure when exporting marked preview assets.",
    input.exportQuality === "master" ? "Master quality: prioritise temporal consistency, edge fidelity, colour science, artifact removal and editorial handoff quality." : "",
    input.directorNotes?.trim() ? `Director/VFX supervisor notes: ${input.directorNotes.trim()}` : "",
  ].filter(Boolean).join(" ");
}

export const vfxSfxRouter = router({
  listVfxPacks: protectedProcedure.query(() => VFX_PACKS),
  listSfxPacks: protectedProcedure.query(() => SFX_PACKS),
  getStudioEffectCatalogue: protectedProcedure.query(() => VFX_STUDIO_EFFECT_CATALOGUE),
  getSwappysFunnelPricing: protectedProcedure.query(() => getSwappysFunnelPricing()),

  getStudioEntitlements: protectedProcedure.query(({ ctx }) => ({
    pricing: getSwappysFunnelPricing(),
    defaultWatermarkMode: getSwappysWatermarkMode({ product: "virelle_studio", user: ctx.user as any, hideVisibleWatermark: false }),
  })),

  getLibrary: protectedProcedure.query(async ({ ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) return { vfx: [], sfx: [] };
    await ensureTables(dbConn);
    const rows: any = await dbConn.execute(sql`SELECT packId, packType, isActive FROM user_vfx_library WHERE userId = ${ctx.user.id} ORDER BY addedAt DESC`);
    const data: any[] = Array.isArray(rows[0]) ? rows[0] : [];
    const vfxIds = new Map(data.filter(r => r.packType === "vfx").map(r => [Number(r.packId), !!r.isActive]));
    const sfxIds = new Map(data.filter(r => r.packType === "sfx").map(r => [Number(r.packId), !!r.isActive]));
    return {
      vfx: VFX_PACKS.filter(p => vfxIds.has(p.id)).map(p => ({ ...p, isActive: vfxIds.get(p.id) ?? true })),
      sfx: SFX_PACKS.filter(p => sfxIds.has(p.id)).map(p => ({ ...p, isActive: sfxIds.get(p.id) ?? true })),
    };
  }),

  addToLibrary: protectedProcedure
    .input(z.object({ packId: z.number(), packType: z.enum(["vfx", "sfx"]) }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await ensureTables(dbConn);
      await dbConn.execute(sql`INSERT INTO user_vfx_library (userId, packId, packType, isActive) VALUES (${ctx.user.id}, ${input.packId}, ${input.packType}, 1) ON DUPLICATE KEY UPDATE isActive = 1`);
      return { ok: true };
    }),

  removeFromLibrary: protectedProcedure
    .input(z.object({ packId: z.number(), packType: z.enum(["vfx", "sfx"]) }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await dbConn.execute(sql`DELETE FROM user_vfx_library WHERE userId = ${ctx.user.id} AND packId = ${input.packId} AND packType = ${input.packType}`);
      return { ok: true };
    }),

  setPackActive: protectedProcedure
    .input(z.object({ packId: z.number(), packType: z.enum(["vfx", "sfx"]), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await dbConn.execute(sql`UPDATE user_vfx_library SET isActive = ${input.active ? 1 : 0} WHERE userId = ${ctx.user.id} AND packId = ${input.packId} AND packType = ${input.packType}`);
      return { ok: true };
    }),

  getSceneVfxData: protectedProcedure
    .input(z.object({ sceneId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      await ensureTables(dbConn);
      const rows: any = await dbConn.execute(sql`SELECT * FROM scene_vfx_data WHERE sceneId = ${input.sceneId} AND userId = ${ctx.user.id} LIMIT 1`);
      const data = Array.isArray(rows[0]) ? rows[0] : [];
      return data[0] || null;
    }),

  createStudioVfxJob: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sceneId: z.number(),
      operations: z.array(z.string().min(2).max(80)).min(1).max(24),
      intensity: z.number().min(1).max(100).default(75),
      sourcePlateUrl: z.string().url().optional().nullable(),
      actorReferenceUrl: z.string().url().optional().nullable(),
      consentConfirmed: z.boolean().optional().default(false),
      consentNotes: z.string().max(2000).optional().nullable(),
      hideVisibleWatermark: z.boolean().optional().default(false),
      exportQuality: z.enum(["preview", "final", "master"]).default("preview"),
      directorNotes: z.string().max(4000).optional().nullable(),
      runImagePass: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const scene = await db.getSceneById(input.sceneId);
      if (!scene || (scene as any).projectId !== input.projectId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found for this project." });
      }
      const project = await db.getProjectById(input.projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project access denied." });

      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await ensureTables(dbConn);

      const jobKind = inferJobKind(input.operations);
      const hasSwappys = input.operations.some((op) => SWAPPYS_OPERATIONS.has(op));
      if (hasSwappys) requireVfxStudioTier(ctx.user as any, "amateur", "Swappys Digital Double Studio");
      assertDigitalLikenessConsent({ jobKind, consentConfirmed: input.consentConfirmed });

      const watermarkMode = getSwappysWatermarkMode({
        product: hasSwappys ? "virelle_studio" : "standalone",
        user: ctx.user as any,
        hideVisibleWatermark: hasSwappys ? input.hideVisibleWatermark : false,
        standalonePaid: false,
      });

      const creditCost = getVfxCreditCost({
        jobKind,
        quality: input.exportQuality,
        operationCount: input.operations.length,
      });

      let balanceAfter: number | null = null;
      if ((ctx.user as any).role !== "admin") {
        try {
          balanceAfter = await db.deductCredits(ctx.user.id, creditCost, "vfx_studio_render", `VFX Studio ${jobKind} render for scene ${input.sceneId}`);
        } catch (err: any) {
          throw new TRPCError({ code: "PAYMENT_REQUIRED", message: err?.message || "Insufficient credits for VFX Studio render." });
        }
      }

      const prompt = buildStudioPrompt({
        operations: input.operations,
        intensity: input.intensity,
        scene,
        actorReferenceUrl: input.actorReferenceUrl,
        sourcePlateUrl: input.sourcePlateUrl,
        hideVisibleWatermark: input.hideVisibleWatermark,
        exportQuality: input.exportQuality,
        directorNotes: input.directorNotes,
      });

      const metadata = buildVfxAuditMetadata({
        product: hasSwappys ? "virelle_studio" : "virelle_studio",
        jobKind,
        quality: input.exportQuality,
        operations: input.operations,
        watermarkMode,
        consentConfirmed: input.consentConfirmed,
        consentNotes: input.consentNotes || null,
        sourcePlateUrl: input.sourcePlateUrl || null,
        actorReferenceUrl: input.actorReferenceUrl || null,
        estimatedCredits: creditCost,
      });

      let enhancedImageUrl: string | null = null;
      if (input.runImagePass) {
        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const result = await generateImage({
          prompt,
          originalImages: input.sourcePlateUrl
            ? [{ url: input.sourcePlateUrl, mimeType: "image/jpeg" }]
            : (scene as any).thumbnailUrl
              ? [{ url: (scene as any).thumbnailUrl, mimeType: "image/jpeg" }]
              : undefined,
          userOpenAiKey: (userKeys as any).openaiKey || undefined,
        });
        enhancedImageUrl = result?.url || null;
      }

      await db.updateScene(input.sceneId, {
        vfxNotes: prompt,
        retakeInstructions: prompt,
        status: "draft",
      } as any);

      await dbConn.execute(sql`
        INSERT INTO scene_vfx_data (sceneId, userId, vfxPackIds, enhancedImageUrl, sfxPrompt, metadata)
        VALUES (${input.sceneId}, ${ctx.user.id}, ${JSON.stringify(hasSwappys ? [9001] : [])}, ${enhancedImageUrl}, ${prompt}, ${JSON.stringify(metadata)})
        ON DUPLICATE KEY UPDATE
          vfxPackIds = ${JSON.stringify(hasSwappys ? [9001] : [])},
          enhancedImageUrl = COALESCE(${enhancedImageUrl}, enhancedImageUrl),
          sfxPrompt = ${prompt},
          metadata = ${JSON.stringify(metadata)},
          appliedAt = NOW()`);

      let swappysJobId: number | null = null;
      if (hasSwappys) {
        const insertResult: any = await dbConn.execute(sql`
          INSERT INTO scene_swappys_exports
            (sceneId, projectId, userId, sourcePlateUrl, actorReferenceUrl, mode, quality, visibleWatermarkMode, consentConfirmed, consentNotes, creditCost, status, metadata)
          VALUES
            (${input.sceneId}, ${input.projectId}, ${ctx.user.id}, ${input.sourcePlateUrl || null}, ${input.actorReferenceUrl || null}, ${jobKind}, ${input.exportQuality}, ${watermarkMode}, ${input.consentConfirmed ? 1 : 0}, ${input.consentNotes || null}, ${creditCost}, 'queued', ${JSON.stringify(metadata)})`);
        swappysJobId = insertResult?.[0]?.insertId ?? insertResult?.insertId ?? null;
      }

      logger.info(`[VFX Studio] scene=${input.sceneId} kind=${jobKind} ops=${input.operations.length} credits=${creditCost} watermark=${watermarkMode}`);
      return { ok: true, jobKind, swappysJobId, enhancedImageUrl, prompt, watermarkMode, creditCost, balanceAfter, metadata };
    }),

  createSwappysDigitalDoubleJob: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      sceneId: z.number(),
      sourcePlateUrl: z.string().url().optional().nullable(),
      actorReferenceUrl: z.string().url().optional().nullable(),
      consentConfirmed: z.boolean(),
      consentNotes: z.string().max(2000).optional().nullable(),
      hideVisibleWatermark: z.boolean().optional().default(false),
      quality: z.enum(["preview", "final", "master"]).default("preview"),
      mode: z.enum(["digital_double", "stunt_face_replacement", "actor_continuity_match", "pickup_scene_match", "ai_stunt_insert"]).default("digital_double"),
      instructions: z.string().max(4000).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const operationByMode: Record<string, string> = {
        digital_double: "swappys-digital-double",
        stunt_face_replacement: "stunt-face-replacement",
        actor_continuity_match: "actor-continuity-match",
        pickup_scene_match: "pickup-scene-match",
        ai_stunt_insert: "ai-stunt-insert",
      };
      return vfxSfxRouter.createCaller(ctx).createStudioVfxJob({
        projectId: input.projectId,
        sceneId: input.sceneId,
        operations: [operationByMode[input.mode] || "swappys-digital-double"],
        intensity: 85,
        sourcePlateUrl: input.sourcePlateUrl,
        actorReferenceUrl: input.actorReferenceUrl,
        consentConfirmed: input.consentConfirmed,
        consentNotes: input.consentNotes,
        hideVisibleWatermark: input.hideVisibleWatermark,
        exportQuality: input.quality,
        directorNotes: input.instructions,
        runImagePass: true,
      });
    }),

  applyVfxToScene: protectedProcedure
    .input(z.object({ sceneId: z.number(), vfxPackIds: z.array(z.number()).min(1).max(6) }))
    .mutation(async ({ ctx, input }) => {
      const scene = await db.getSceneById(input.sceneId);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      const project = await db.getProjectById((scene as any).projectId, ctx.user.id);
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project access denied." });
      const vfxInjection = buildVfxPromptInjection(input.vfxPackIds);
      return vfxSfxRouter.createCaller(ctx).createStudioVfxJob({
        projectId: (scene as any).projectId,
        sceneId: input.sceneId,
        operations: input.vfxPackIds.map((id) => `library-pack-${id}`),
        intensity: 75,
        sourcePlateUrl: (scene as any).thumbnailUrl || null,
        actorReferenceUrl: null,
        consentConfirmed: false,
        hideVisibleWatermark: false,
        exportQuality: "preview",
        directorNotes: `Apply selected VFX library packs: ${vfxInjection}`,
        runImagePass: true,
      });
    }),

  generateCustomSfx: protectedProcedure
    .input(z.object({ prompt: z.string().min(10).max(500), durationSeconds: z.number().min(1).max(22).default(5), sceneId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userKeys = await db.getUserApiKeys(ctx.user.id);
      const elevenlabsKey = (userKeys as any).elevenlabsKey;
      if (!elevenlabsKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "NO_ELEVENLABS_KEY: Add your ElevenLabs API key in Settings → API Keys to generate custom SFX." });
      try {
        const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
          method: "POST",
          headers: { "xi-api-key": elevenlabsKey, "Content-Type": "application/json" },
          body: JSON.stringify({ text: input.prompt, duration_seconds: input.durationSeconds, prompt_influence: 0.3 }),
        });
        if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `ElevenLabs error: ${await response.text()}` });
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        const { url } = await storagePut(`sfx/${ctx.user.id}/${Date.now()}.mp3`, audioBuffer, "audio/mpeg");
        if (input.sceneId) {
          const dbConn = await db.getDb();
          if (dbConn) {
            await ensureTables(dbConn);
            await dbConn.execute(sql`INSERT INTO scene_vfx_data (sceneId, userId, sfxAudioUrl, sfxPrompt) VALUES (${input.sceneId}, ${ctx.user.id}, ${url}, ${input.prompt}) ON DUPLICATE KEY UPDATE sfxAudioUrl = ${url}, sfxPrompt = ${input.prompt}, appliedAt = NOW()`);
          }
        }
        return { audioUrl: url, prompt: input.prompt };
      } catch (e: any) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "SFX generation failed. Please try again." });
      }
    }),

  suggestVfxForScene: protectedProcedure
    .input(z.object({ sceneId: z.number() }))
    .mutation(async ({ input }) => {
      const scene = await db.getSceneById(input.sceneId);
      if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
      const sceneDesc = [(scene as any).description, (scene as any).actionDescription, (scene as any).vfxNotes].filter(Boolean).join(" | ");
      const reply = await invokeLLM({
        messages: [{
          role: "system",
          content: `You are a senior VFX supervisor. Recommend Virelle VFX Studio operations. Return ONLY JSON: {"operations":[string],"vfxIds":[numbers],"sfxIds":[numbers],"reasoning":"brief","sfxPrompt":"one sentence"}. Available operations: ${JSON.stringify(VFX_STUDIO_EFFECT_CATALOGUE)}. Available VFX packs: ${VFX_PACKS.map(p => `${p.id}:${p.name}`).join(", ")}. Available SFX packs: ${SFX_PACKS.map(p => `${p.id}:${p.name}`).join(", ")}.`,
        }, { role: "user", content: `Scene: ${sceneDesc || "no description provided"}` }],
        maxTokens: 500,
      });
      try {
        const replyText = typeof reply.choices[0]?.message?.content === "string" ? reply.choices[0].message.content : "";
        const parsed = JSON.parse(replyText.replace(/```json|```/g, "").trim());
        return {
          operations: Array.isArray(parsed.operations) ? parsed.operations : [],
          vfxIds: (parsed.vfxIds || []).filter((id: any) => VFX_PACKS.find(p => p.id === id)),
          sfxIds: (parsed.sfxIds || []).filter((id: any) => SFX_PACKS.find(p => p.id === id)),
          reasoning: parsed.reasoning || "",
          sfxPrompt: parsed.sfxPrompt || "",
        };
      } catch {
        return { operations: [], vfxIds: [], sfxIds: [], reasoning: "Could not parse suggestion", sfxPrompt: "" };
      }
    }),

  getProjectVfxTheme: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      await ensureTables(dbConn);
      const rows: any = await dbConn.execute(sql`SELECT * FROM project_vfx_theme WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} LIMIT 1`);
      const data = Array.isArray(rows[0]) ? rows[0] : [];
      if (!data[0]) return null;
      const row = data[0];
      return { vfxPackIds: JSON.parse(row.vfxPackIds || "[]"), sfxPackIds: JSON.parse(row.sfxPackIds || "[]"), themeName: row.themeName };
    }),

  setProjectVfxTheme: protectedProcedure
    .input(z.object({ projectId: z.number(), vfxPackIds: z.array(z.number()), sfxPackIds: z.array(z.number()), themeName: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      const dbConn = await db.getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await ensureTables(dbConn);
      await dbConn.execute(sql`INSERT INTO project_vfx_theme (projectId, userId, vfxPackIds, sfxPackIds, themeName) VALUES (${input.projectId}, ${ctx.user.id}, ${JSON.stringify(input.vfxPackIds)}, ${JSON.stringify(input.sfxPackIds)}, ${input.themeName || null}) ON DUPLICATE KEY UPDATE vfxPackIds = ${JSON.stringify(input.vfxPackIds)}, sfxPackIds = ${JSON.stringify(input.sfxPackIds)}, themeName = ${input.themeName || null}, setAt = NOW()`);
      return { ok: true };
    }),

  getActivePipelineContext: protectedProcedure.query(async ({ ctx }) => {
    const dbConn = await db.getDb();
    if (!dbConn) return { vfxPrompt: "", sfxPrompt: "", activeCount: 0 };
    await ensureTables(dbConn);
    const rows: any = await dbConn.execute(sql`SELECT packId, packType FROM user_vfx_library WHERE userId = ${ctx.user.id} AND isActive = 1`);
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
