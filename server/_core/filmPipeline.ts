/**
 * Full Film Generation Pipeline — The Master Orchestrator
 * 
 * This is the engine that generates a complete 90-minute film.
 * It orchestrates all sub-systems:
 * 
 * 1. SCREENPLAY PHASE — AI generates the full screenplay
 * 2. SCENE BREAKDOWN — Script is broken into 60-90 detailed scenes
 * 3. CHARACTER SETUP — Build character DNA for consistency
 * 4. CONTINUITY CHAIN — Plan visual flow between scenes
 * 5. VIDEO GENERATION — Generate extended scenes with clip chaining
 * 6. DIALOGUE AUDIO — Generate voice acting for each scene
 * 7. SOUNDTRACK — Generate AI film score
 * 8. FINAL ASSEMBLY — Stitch everything into a single film with audio
 * 
 * Architecture for 90-minute film:
 * - 60-90 scenes (avg 60-90 seconds each)
 * - Each scene = 4-8 sub-clips of 8-10 seconds
 * - Total clips: ~400-700
 * - Dialogue: ~200-400 lines of voice-acted dialogue
 * - Soundtrack: 60-90 individual score segments
 * 
 * Generation is done in BATCHES to manage:
 * - API rate limits
 * - Cost (user can pause/resume)
 * - Progress tracking (real-time updates)
 * 
 * The pipeline supports:
 * - Full auto-generation (concept → finished film)
 * - Scene-by-scene generation (generate one scene at a time)
 * - Re-generation (regenerate specific scenes)
 * - Multi-pass refinement (generate draft, then improve)
 */

import { generateExtendedScene, estimateFilmGenerationCalls, type ExtendedSceneRequest, type ExtendedSceneResult } from "./extendedSceneGenerator";
import { generateSceneDialogue, type VoiceActingKeys, type DialogueLine, type SceneDialogueRequest } from "./voiceActingEngine";
import { generateSoundtrack, type SoundtrackKeys, type SoundtrackRequest, type SoundtrackResult, getGenreMusicPreset } from "./soundtrackEngine";
import { buildContinuityChain, generateConsistentScenePrompt, updateContinuityChainAfterGeneration, extractContinuityFrame, type ContinuityChain, type CharacterDNA } from "./characterConsistency";
import { type UserApiKeys } from "./byokVideoEngine";
import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Types ───

export type FilmGenerationPhase =
  | "preparing"
  | "generating_scenes"
  | "generating_dialogue"
  | "generating_soundtrack"
  | "assembling"
  | "complete"
  | "failed"
  | "paused";

export interface FilmGenerationProgress {
  phase: FilmGenerationPhase;
  totalScenes: number;
  completedScenes: number;
  totalClips: number;
  completedClips: number;
  dialogueLinesGenerated: number;
  soundtrackSegmentsGenerated: number;
  estimatedTimeRemainingMinutes: number;
  currentSceneTitle?: string;
  errors: string[];
}

export interface FilmGenerationConfig {
  projectId: number;
  /** Target film duration in minutes */
  targetDurationMinutes: number;
  /** Film genre for cinematic styling */
  genre: string;
  /** Overall film mood/tone */
  mood?: string;
  /** Whether to generate dialogue audio */
  generateDialogue: boolean;
  /** Whether to generate AI soundtrack */
  generateSoundtrack: boolean;
  /** Whether to use character consistency */
  useCharacterConsistency: boolean;
  /** Whether to use scene-to-scene continuity */
  useSceneContinuity: boolean;
  /** Batch size for parallel scene generation */
  batchSize?: number;
  /** Scene generation concurrency limit */
  concurrency?: number;
}

export interface FilmGenerationInput {
  config: FilmGenerationConfig;
  /** Video generation API keys (BYOK) */
  videoKeys: UserApiKeys;
  /** Voice acting API keys */
  voiceKeys: VoiceActingKeys;
  /** Soundtrack API keys */
  musicKeys: SoundtrackKeys;
  /** Project data */
  project: {
    id: number;
    title: string;
    plotSummary?: string;
    description?: string;
    genre?: string;
    duration?: number;
    rating?: string;
  };
  /** Characters from the project */
  characters: Array<{
    id: number;
    name: string;
    description?: string | null;
    gender?: string | null;
    ageRange?: string | null;
    ethnicity?: string | null;
    skinTone?: string | null;
    build?: string | null;
    height?: string | null;
    hairColor?: string | null;
    hairStyle?: string | null;
    hairLength?: string | null;
    eyeColor?: string | null;
    faceShape?: string | null;
    distinguishingFeatures?: string | null;
    clothing?: string | null;
    referenceImageUrl?: string | null;
    thumbnailUrl?: string | null;
  }>;
  /** Scenes from the project (already broken down) */
  scenes: Array<{
    id: number;
    orderIndex: number;
    title?: string | null;
    description?: string | null;
    visualDescription?: string | null;
    locationType?: string | null;
    timeOfDay?: string | null;
    weather?: string | null;
    lighting?: string | null;
    mood?: string | null;
    duration?: number | null;
    characterIds?: number[];
    dialogueLines?: DialogueLine[];
  }>;
}

export interface FilmGenerationResult {
  /** URL of the final assembled film */
  filmUrl?: string;
  /** Total duration in seconds */
  totalDuration: number;
  /** Per-scene results */
  sceneResults: Array<{
    sceneId: number;
    videoUrl?: string;
    dialogueAudioUrl?: string;
    soundtrackUrl?: string;
    duration: number;
    success: boolean;
    error?: string;
  }>;
  /** Generation statistics */
  stats: {
    totalClipsGenerated: number;
    totalDialogueLinesGenerated: number;
    totalSoundtrackSegments: number;
    totalGenerationTimeMinutes: number;
    videoProvider: string;
    voiceProvider: string;
    musicProvider: string;
  };
}

// ─── Scene Duration Calculator ───

/**
 * Calculate target duration for each scene based on total film duration.
 * Distributes time based on scene importance and dialogue density.
 */
function calculateSceneDurations(
  scenes: FilmGenerationInput["scenes"],
  totalDurationMinutes: number
): Map<number, number> {
  const totalSeconds = totalDurationMinutes * 60;
  const numScenes = scenes.length;

  if (numScenes === 0) return new Map();

  // Base duration per scene
  const baseDuration = totalSeconds / numScenes;

  const durations = new Map<number, number>();

  for (const scene of scenes) {
    let duration = baseDuration;

    // Adjust based on dialogue density
    const dialogueCount = scene.dialogueLines?.length || 0;
    if (dialogueCount > 5) {
      duration *= 1.3; // More dialogue = longer scene
    } else if (dialogueCount === 0) {
      duration *= 0.8; // No dialogue = shorter (visual-only scenes)
    }

    // Adjust based on explicit duration if set
    if (scene.duration && scene.duration > 0) {
      duration = scene.duration;
    }

    // Clamp to reasonable bounds
    duration = Math.max(20, Math.min(180, duration)); // 20s to 3min per scene

    durations.set(scene.id, duration);
  }

  // Normalize to match total target duration
  const currentTotal = Array.from(durations.values()).reduce((a, b) => a + b, 0);
  const scaleFactor = totalSeconds / currentTotal;

  Array.from(durations.entries()).forEach(([id, dur]) => {
    durations.set(id, Math.max(15, Math.round(dur * scaleFactor)));
  });

  return durations;
}

// ─── Final Film Assembly ───

/**
 * Assemble all scene videos, dialogue audio, and soundtrack into a single film.
 * Uses ffmpeg for multi-track mixing and concatenation.
 */
async function assembleFilm(
  sceneResults: Array<{
    sceneId: number;
    videoUrl?: string;
    dialogueAudioUrl?: string;
    soundtrackUrl?: string;
    duration: number;
    orderIndex: number;
  }>,
  projectId: number,
  projectTitle: string
): Promise<{ filmUrl: string; totalDuration: number }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-film-"));

  try {
    // Sort scenes by order
    const sortedScenes = [...sceneResults]
      .filter(s => s.videoUrl)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (sortedScenes.length === 0) {
      throw new Error("No scene videos to assemble");
    }

    console.log(`[FilmPipeline] Assembling ${sortedScenes.length} scenes into final film...`);

    // Download and process each scene
    const processedFiles: string[] = [];

    for (let i = 0; i < sortedScenes.length; i++) {
      const scene = sortedScenes[i];
      console.log(`[FilmPipeline] Processing scene ${i + 1}/${sortedScenes.length}...`);

      // Download video
      const videoPath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}_video.mp4`);
      const videoResp = await fetch(scene.videoUrl!, { signal: AbortSignal.timeout(60000) });
      if (!videoResp.ok) continue;
      await fs.promises.writeFile(videoPath, Buffer.from(await videoResp.arrayBuffer()));

      // Check if we have dialogue and/or soundtrack to mix
      const hasDialogue = !!scene.dialogueAudioUrl;
      const hasSoundtrack = !!scene.soundtrackUrl;

      if (!hasDialogue && !hasSoundtrack) {
        // Just normalize the video
        const normalizedPath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}_final.ts`);
        await execFileAsync("ffmpeg", [
          "-i", videoPath,
          "-c:v", "libx264", "-preset", "fast", "-crf", "23",
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
          "-r", "24",
          "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
          "-f", "mpegts", "-y", normalizedPath,
        ], { timeout: 120000 });
        processedFiles.push(normalizedPath);
        continue;
      }

      // Download audio tracks
      const audioInputs: string[] = ["-i", videoPath];
      let filterParts: string[] = [];
      let audioStreamCount = 1; // video's audio is stream 0

      if (hasDialogue) {
        const dialoguePath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}_dialogue.mp3`);
        const dialogueResp = await fetch(scene.dialogueAudioUrl!, { signal: AbortSignal.timeout(30000) });
        if (dialogueResp.ok) {
          await fs.promises.writeFile(dialoguePath, Buffer.from(await dialogueResp.arrayBuffer()));
          audioInputs.push("-i", dialoguePath);
          audioStreamCount++;
        }
      }

      if (hasSoundtrack) {
        const soundtrackPath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}_soundtrack.mp3`);
        const soundtrackResp = await fetch(scene.soundtrackUrl!, { signal: AbortSignal.timeout(30000) });
        if (soundtrackResp.ok) {
          await fs.promises.writeFile(soundtrackPath, Buffer.from(await soundtrackResp.arrayBuffer()));
          audioInputs.push("-i", soundtrackPath);
          audioStreamCount++;
        }
      }

      // Build ffmpeg filter for audio mixing
      const mixedPath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}_final.ts`);

      if (audioStreamCount === 1) {
        // No additional audio, just normalize video
        await execFileAsync("ffmpeg", [
          ...audioInputs,
          "-c:v", "libx264", "-preset", "fast", "-crf", "23",
          "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
          "-r", "24",
          "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
          "-f", "mpegts", "-y", mixedPath,
        ], { timeout: 120000 });
      } else {
        // Mix audio tracks together
        // Dialogue at full volume, soundtrack at 30% volume
        let filterComplex = "";
        const audioStreams: string[] = [];

        // Video audio (if exists) at low volume
        audioStreams.push(`[0:a]volume=0.3[va]`);
        let mixInputs = "[va]";

        let streamIdx = 1;
        if (hasDialogue && audioStreamCount >= 2) {
          audioStreams.push(`[${streamIdx}:a]volume=1.0[da]`);
          mixInputs += "[da]";
          streamIdx++;
        }
        if (hasSoundtrack && audioStreamCount >= streamIdx + 1) {
          audioStreams.push(`[${streamIdx}:a]volume=0.3[sa]`);
          mixInputs += "[sa]";
        }

        const actualMixCount = mixInputs.split("][").length;
        filterComplex = `${audioStreams.join(";")};${mixInputs}amix=inputs=${actualMixCount}:duration=longest[aout]`;

        try {
          await execFileAsync("ffmpeg", [
            ...audioInputs,
            "-filter_complex", filterComplex,
            "-map", "0:v",
            "-map", "[aout]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-r", "24",
            "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "192k",
            "-f", "mpegts", "-shortest", "-y", mixedPath,
          ], { timeout: 120000 });
        } catch (err) {
          // Fallback: just use video without audio mixing
          console.warn(`[FilmPipeline] Audio mixing failed for scene ${i}, using video only:`, err);
          await execFileAsync("ffmpeg", [
            "-i", videoPath,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
            "-r", "24",
            "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
            "-f", "mpegts", "-y", mixedPath,
          ], { timeout: 120000 });
        }
      }

      processedFiles.push(mixedPath);
    }

    if (processedFiles.length === 0) {
      throw new Error("No scenes were successfully processed");
    }

    // Concatenate all scenes into final film
    console.log(`[FilmPipeline] Concatenating ${processedFiles.length} scenes...`);
    const concatInput = processedFiles.join("|");
    const outputPath = path.join(tmpDir, "final_film.mp4");

    await execFileAsync("ffmpeg", [
      "-i", `concat:${concatInput}`,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "256k",
      "-movflags", "+faststart",
      "-metadata", `title=${projectTitle}`,
      "-metadata", `artist=Virelle Studios`,
      "-metadata", `comment=Generated by Virelle Studios AI Film Pipeline`,
      "-y",
      outputPath,
    ], { timeout: 600000 }); // 10 min timeout for large films

    // Get final duration
    let totalDuration = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet", "-print_format", "json", "-show_format", outputPath,
      ], { timeout: 15000 });
      const info = JSON.parse(stdout);
      totalDuration = parseFloat(info.format?.duration || "0");
    } catch { /* estimate */ }

    // Upload to S3
    const fileBuffer = await fs.promises.readFile(outputPath);
    const fileSize = fileBuffer.length;
    const key = `films/${projectId}/${projectTitle.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.mp4`;
    const { url: filmUrl } = await storagePut(key, fileBuffer, "video/mp4");

    console.log(`[FilmPipeline] Film assembled: ${totalDuration.toFixed(0)}s (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);

    return { filmUrl, totalDuration };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Main Pipeline ───

/**
 * Generate a complete film from start to finish.
 * This is the master orchestrator that calls all sub-systems.
 */
export async function generateFullFilm(
  input: FilmGenerationInput,
  onProgress?: (progress: FilmGenerationProgress) => void
): Promise<FilmGenerationResult> {
  const startTime = Date.now();
  const { config, videoKeys, voiceKeys, musicKeys, project, characters, scenes } = input;

  const progress: FilmGenerationProgress = {
    phase: "preparing",
    totalScenes: scenes.length,
    completedScenes: 0,
    totalClips: 0,
    completedClips: 0,
    dialogueLinesGenerated: 0,
    soundtrackSegmentsGenerated: 0,
    estimatedTimeRemainingMinutes: 0,
    errors: [],
  };

  onProgress?.(progress);

  // ── Step 1: Calculate scene durations ──
  const sceneDurations = calculateSceneDurations(scenes, config.targetDurationMinutes);
  const estimates = estimateFilmGenerationCalls(config.targetDurationMinutes);
  progress.totalClips = estimates.totalClips;
  progress.estimatedTimeRemainingMinutes = estimates.estimatedMinutes;

  console.log(`[FilmPipeline] Starting ${config.targetDurationMinutes}-minute film generation`);
  console.log(`[FilmPipeline] ${scenes.length} scenes, ~${estimates.totalClips} total clips, est. ${estimates.estimatedMinutes} min`);

  // ── Step 2: Build continuity chain ──
  let continuityChain: ContinuityChain | undefined;
  if (config.useCharacterConsistency || config.useSceneContinuity) {
    continuityChain = buildContinuityChain(characters, scenes as any, project.id);
    console.log(`[FilmPipeline] Continuity chain built: ${continuityChain.characters.length} characters, ${continuityChain.scenes.length} scenes`);
  }

  // ── Step 3: Generate scenes ──
  progress.phase = "generating_scenes";
  onProgress?.(progress);

  const sceneResults: Array<{
    sceneId: number;
    orderIndex: number;
    videoUrl?: string;
    dialogueAudioUrl?: string;
    soundtrackUrl?: string;
    duration: number;
    success: boolean;
    error?: string;
    lastFrameUrl?: string;
  }> = [];

  // Sort scenes by order
  const sortedScenes = [...scenes].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  // Process scenes sequentially for continuity (or in batches for speed)
  const batchSize = config.useSceneContinuity ? 1 : (config.batchSize || 3);

  for (let batchStart = 0; batchStart < sortedScenes.length; batchStart += batchSize) {
    const batch = sortedScenes.slice(batchStart, batchStart + batchSize);

    const batchPromises = batch.map(async (scene, batchIdx) => {
      const sceneIdx = batchStart + batchIdx;
      const targetDuration = sceneDurations.get(scene.id) || 60;

      progress.currentSceneTitle = scene.title || `Scene ${sceneIdx + 1}`;
      onProgress?.(progress);

      try {
        // Build consistency-enhanced prompt
        let scenePrompt = scene.visualDescription || scene.description || scene.title || "A cinematic scene";
        let referenceImageUrl: string | undefined;

        if (continuityChain) {
          const consistent = generateConsistentScenePrompt(continuityChain, sceneIdx, scenePrompt);
          scenePrompt = consistent.enhancedPrompt;
          referenceImageUrl = consistent.referenceImageUrl;
        }

        // Get previous scene's last frame for continuity
        const prevResult = sceneResults.find(r => r.orderIndex === (scene.orderIndex || 0) - 1);
        const previousLastFrame = prevResult?.lastFrameUrl || referenceImageUrl;

        // Generate extended scene video
        console.log(`[FilmPipeline] Generating scene ${sceneIdx + 1}/${sortedScenes.length}: "${scene.title}" (${targetDuration}s target)`);

        const sceneResult = await generateExtendedScene(
          videoKeys,
          {
            sceneId: scene.id,
            projectId: project.id,
            description: scenePrompt,
            targetDurationSeconds: targetDuration,
            mood: scene.mood || config.mood,
            lighting: scene.lighting || undefined,
            timeOfDay: scene.timeOfDay || undefined,
            weather: scene.weather || undefined,
            genre: config.genre,
            characterDescriptions: continuityChain?.characters
              .filter(c => (scene.characterIds || []).includes(c.characterId))
              .map(c => c.promptAnchor),
            locationDescription: scene.locationType || undefined,
            previousSceneLastFrameUrl: previousLastFrame,
          },
          (clipIdx, totalClips) => {
            progress.completedClips++;
            onProgress?.(progress);
          }
        );

        // Update continuity chain
        if (continuityChain && sceneResult.lastFrameUrl) {
          continuityChain = updateContinuityChainAfterGeneration(
            continuityChain,
            sceneIdx,
            sceneResult.lastFrameUrl,
            scenePrompt
          );
        }

        // Generate dialogue audio
        let dialogueAudioUrl: string | undefined;
        if (config.generateDialogue && scene.dialogueLines && scene.dialogueLines.length > 0) {
          progress.phase = "generating_dialogue";
          onProgress?.(progress);

          try {
            const dialogueResult = await generateSceneDialogue(voiceKeys, {
              sceneId: scene.id,
              projectId: project.id,
              dialogueLines: scene.dialogueLines,
            });
            dialogueAudioUrl = dialogueResult.audioUrl;
            progress.dialogueLinesGenerated += dialogueResult.lineCount;
          } catch (err: any) {
            console.warn(`[FilmPipeline] Dialogue generation failed for scene ${scene.id}:`, err.message);
            progress.errors.push(`Dialogue failed for scene "${scene.title}": ${err.message}`);
          }
        }

        // Generate soundtrack
        let soundtrackUrl: string | undefined;
        if (config.generateSoundtrack) {
          progress.phase = "generating_soundtrack";
          onProgress?.(progress);

          try {
            const musicPreset = getGenreMusicPreset(config.genre, scene.mood || "neutral");
            const soundtrackResult = await generateSoundtrack(musicKeys, {
              projectId: project.id,
              sceneId: scene.id,
              mood: scene.mood || "neutral",
              genre: config.genre,
              durationSeconds: sceneResult.totalDuration,
              instruments: musicPreset.instruments,
              tempo: musicPreset.tempo,
              type: "score",
            });
            soundtrackUrl = soundtrackResult.audioUrl;
            progress.soundtrackSegmentsGenerated++;
          } catch (err: any) {
            console.warn(`[FilmPipeline] Soundtrack generation failed for scene ${scene.id}:`, err.message);
            progress.errors.push(`Soundtrack failed for scene "${scene.title}": ${err.message}`);
          }
        }

        progress.completedScenes++;
        progress.phase = "generating_scenes";
        onProgress?.(progress);

        // Estimate remaining time
        const elapsed = (Date.now() - startTime) / 60000;
        const rate = progress.completedScenes / elapsed;
        const remaining = (sortedScenes.length - progress.completedScenes) / rate;
        progress.estimatedTimeRemainingMinutes = Math.round(remaining);

        return {
          sceneId: scene.id,
          orderIndex: scene.orderIndex || 0,
          videoUrl: sceneResult.videoUrl,
          dialogueAudioUrl,
          soundtrackUrl,
          duration: sceneResult.totalDuration,
          success: true,
          lastFrameUrl: sceneResult.lastFrameUrl,
        };
      } catch (err: any) {
        console.error(`[FilmPipeline] Scene ${scene.id} failed:`, err.message);
        progress.errors.push(`Scene "${scene.title}" failed: ${err.message}`);
        progress.completedScenes++;
        onProgress?.(progress);

        return {
          sceneId: scene.id,
          orderIndex: scene.orderIndex || 0,
          duration: 0,
          success: false,
          error: err.message,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    sceneResults.push(...batchResults);
  }

  // ── Step 4: Assemble final film ──
  progress.phase = "assembling";
  onProgress?.(progress);

  let filmUrl: string | undefined;
  let totalDuration = 0;

  const successfulScenes = sceneResults.filter(r => r.success && r.videoUrl);

  if (successfulScenes.length > 0) {
    try {
      const assembly = await assembleFilm(
        successfulScenes.map(s => ({
          sceneId: s.sceneId,
          videoUrl: s.videoUrl,
          dialogueAudioUrl: s.dialogueAudioUrl,
          soundtrackUrl: s.soundtrackUrl,
          duration: s.duration,
          orderIndex: s.orderIndex,
        })),
        project.id,
        project.title
      );
      filmUrl = assembly.filmUrl;
      totalDuration = assembly.totalDuration;
    } catch (err: any) {
      console.error("[FilmPipeline] Final assembly failed:", err.message);
      progress.errors.push(`Film assembly failed: ${err.message}`);
    }
  }

  // ── Complete ──
  const endTime = Date.now();
  const totalTimeMinutes = (endTime - startTime) / 60000;

  progress.phase = filmUrl ? "complete" : "failed";
  onProgress?.(progress);

  console.log(`[FilmPipeline] Film generation ${filmUrl ? "COMPLETE" : "FAILED"}`);
  console.log(`[FilmPipeline] ${successfulScenes.length}/${sortedScenes.length} scenes, ${totalDuration.toFixed(0)}s total, ${totalTimeMinutes.toFixed(1)} min elapsed`);

  return {
    filmUrl,
    totalDuration,
    sceneResults: sceneResults.map(r => ({
      sceneId: r.sceneId,
      videoUrl: r.videoUrl,
      dialogueAudioUrl: r.dialogueAudioUrl,
      soundtrackUrl: r.soundtrackUrl,
      duration: r.duration,
      success: r.success,
      error: r.error,
    })),
    stats: {
      totalClipsGenerated: progress.completedClips,
      totalDialogueLinesGenerated: progress.dialogueLinesGenerated,
      totalSoundtrackSegments: progress.soundtrackSegmentsGenerated,
      totalGenerationTimeMinutes: Math.round(totalTimeMinutes),
      videoProvider: "byok",
      voiceProvider: voiceKeys.elevenlabsKey ? "elevenlabs" : voiceKeys.openaiKey ? "openai" : "pollinations",
      musicProvider: musicKeys.sunoKey ? "suno" : musicKeys.replicateKey ? "replicate" : "pollinations",
    },
  };
}

/**
 * Generate a single scene with all audio tracks.
 * Used for scene-by-scene generation or re-generation.
 */
export async function generateSingleScene(
  input: {
    videoKeys: UserApiKeys;
    voiceKeys: VoiceActingKeys;
    musicKeys: SoundtrackKeys;
    projectId: number;
    scene: FilmGenerationInput["scenes"][0];
    characters: FilmGenerationInput["characters"];
    genre: string;
    mood?: string;
    targetDurationSeconds: number;
    previousSceneLastFrameUrl?: string;
    generateDialogue?: boolean;
    generateSoundtrack?: boolean;
  }
): Promise<{
  videoUrl?: string;
  dialogueAudioUrl?: string;
  soundtrackUrl?: string;
  duration: number;
  lastFrameUrl?: string;
}> {
  const { scene, characters, videoKeys, voiceKeys, musicKeys } = input;

  // Build character DNA
  const chain = buildContinuityChain(characters, [scene as any], input.projectId);
  const { enhancedPrompt } = generateConsistentScenePrompt(chain, 0, scene.visualDescription || scene.description || "");

  // Generate video
  const sceneResult = await generateExtendedScene(videoKeys, {
    sceneId: scene.id,
    projectId: input.projectId,
    description: enhancedPrompt,
    targetDurationSeconds: input.targetDurationSeconds,
    mood: scene.mood || input.mood,
    lighting: scene.lighting || undefined,
    timeOfDay: scene.timeOfDay || undefined,
    weather: scene.weather || undefined,
    genre: input.genre,
    characterDescriptions: chain.characters.map(c => c.promptAnchor),
    locationDescription: scene.locationType || undefined,
    previousSceneLastFrameUrl: input.previousSceneLastFrameUrl,
  });

  // Generate dialogue
  let dialogueAudioUrl: string | undefined;
  if (input.generateDialogue && scene.dialogueLines && scene.dialogueLines.length > 0) {
    try {
      const dialogueResult = await generateSceneDialogue(voiceKeys, {
        sceneId: scene.id,
        projectId: input.projectId,
        dialogueLines: scene.dialogueLines,
      });
      dialogueAudioUrl = dialogueResult.audioUrl;
    } catch (err: any) {
      console.warn(`[SingleScene] Dialogue failed:`, err.message);
    }
  }

  // Generate soundtrack
  let soundtrackUrl: string | undefined;
  if (input.generateSoundtrack) {
    try {
      const musicPreset = getGenreMusicPreset(input.genre, scene.mood || "neutral");
      const soundtrackResult = await generateSoundtrack(musicKeys, {
        projectId: input.projectId,
        sceneId: scene.id,
        mood: scene.mood || "neutral",
        genre: input.genre,
        durationSeconds: sceneResult.totalDuration,
        instruments: musicPreset.instruments,
        tempo: musicPreset.tempo,
        type: "score",
      });
      soundtrackUrl = soundtrackResult.audioUrl;
    } catch (err: any) {
      console.warn(`[SingleScene] Soundtrack failed:`, err.message);
    }
  }

  return {
    videoUrl: sceneResult.videoUrl,
    dialogueAudioUrl,
    soundtrackUrl,
    duration: sceneResult.totalDuration,
    lastFrameUrl: sceneResult.lastFrameUrl,
  };
}

/**
 * Get a cost estimate for generating a full film.
 */
export function estimateFilmCost(
  durationMinutes: number,
  options: {
    videoProvider: string;
    voiceProvider: string;
    musicProvider: string;
    dialogueLineCount: number;
  }
): {
  videoCost: { low: number; high: number };
  voiceCost: { low: number; high: number };
  musicCost: { low: number; high: number };
  totalCost: { low: number; high: number };
  totalClips: number;
  estimatedHours: number;
} {
  const estimates = estimateFilmGenerationCalls(durationMinutes);

  // Video cost per clip by provider
  const videoRates: Record<string, { low: number; high: number }> = {
    "openai": { low: 0.10, high: 0.50 },
    "runway": { low: 0.05, high: 0.25 },
    "replicate": { low: 0.02, high: 0.10 },
    "fal": { low: 0.02, high: 0.08 },
    "luma": { low: 0.05, high: 0.20 },
    "pollinations": { low: 0, high: 0 },
    "huggingface": { low: 0, high: 0.01 },
  };

  // Voice cost per line
  const voiceRates: Record<string, { low: number; high: number }> = {
    "elevenlabs": { low: 0.01, high: 0.05 },
    "openai": { low: 0.005, high: 0.02 },
    "pollinations": { low: 0, high: 0 },
  };

  // Music cost per segment
  const musicRates: Record<string, { low: number; high: number }> = {
    "suno": { low: 0, high: 0.10 },
    "replicate": { low: 0.01, high: 0.05 },
    "pollinations": { low: 0, high: 0 },
  };

  const vr = videoRates[options.videoProvider] || videoRates["pollinations"];
  const vor = voiceRates[options.voiceProvider] || voiceRates["pollinations"];
  const mr = musicRates[options.musicProvider] || musicRates["pollinations"];

  const videoCost = {
    low: estimates.totalClips * vr.low,
    high: estimates.totalClips * vr.high,
  };
  const voiceCost = {
    low: options.dialogueLineCount * vor.low,
    high: options.dialogueLineCount * vor.high,
  };
  const musicCost = {
    low: estimates.totalScenes * mr.low,
    high: estimates.totalScenes * mr.high,
  };

  return {
    videoCost,
    voiceCost,
    musicCost,
    totalCost: {
      low: videoCost.low + voiceCost.low + musicCost.low,
      high: videoCost.high + voiceCost.high + musicCost.high,
    },
    totalClips: estimates.totalClips,
    estimatedHours: estimates.estimatedMinutes / 60,
  };
}
