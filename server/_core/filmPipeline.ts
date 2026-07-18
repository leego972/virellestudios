import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { buildNegativePrompt } from "./cinematicPromptEngine";
import {
  estimateFilmGenerationCalls,
  generateExtendedScene,
  type ExtendedSceneResult,
} from "./extendedSceneGenerator";
import {
  generateSceneDialogue,
  type CharacterVoice,
  type DialogueLine,
  type VoiceActingKeys,
  type VoiceActingResult,
} from "./voiceActingEngine";
import {
  generateSoundtrack,
  getGenreMusicPreset,
  type SoundtrackKeys,
} from "./soundtrackEngine";
import type { UserApiKeys } from "./byokVideoEngine";
import { storagePut } from "../storage";
import { logger } from "./logger";
import { loadSceneGenerationContext, type SceneGenerationContext } from "./sceneGenerationContext";
import { reviewGeneratedClip, type VideoQualityPolicy, type VideoQualityReview } from "./videoQualityGate";

const execFileAsync = promisify(execFile);

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
  targetDurationMinutes: number;
  genre: string;
  mood?: string;
  generateDialogue: boolean;
  generateSoundtrack: boolean;
  useCharacterConsistency: boolean;
  useSceneContinuity: boolean;
  batchSize?: number;
  concurrency?: number;
  qualityPolicy?: Extract<VideoQualityPolicy, "standard" | "strict">;
  /** Off by default. Partial assembly requires an explicit caller decision. */
  allowPartialAssembly?: boolean;
}

export interface FilmGenerationInput {
  config: FilmGenerationConfig;
  videoKeys: UserApiKeys;
  voiceKeys: VoiceActingKeys;
  musicKeys: SoundtrackKeys;
  project: {
    id: number;
    title: string;
    plotSummary?: string;
    description?: string;
    genre?: string;
    duration?: number;
    rating?: string;
  };
  characters: Array<{
    id: number;
    name: string;
    description?: string | null;
    gender?: string | null;
    ageRange?: string | null;
    ethnicity?: string | null;
    nationality?: string | null;
    skinTone?: string | null;
    build?: string | null;
    height?: string | null;
    weight?: string | null;
    fitnessLevel?: string | null;
    posture?: string | null;
    hairColor?: string | null;
    hairStyle?: string | null;
    hairLength?: string | null;
    eyeColor?: string | null;
    faceShape?: string | null;
    distinguishingFeatures?: string | null;
    clothing?: string | null;
    referenceImageUrl?: string | null;
    thumbnailUrl?: string | null;
    faceDnaPrompt?: string | null;
    bodyDnaPrompt?: string | null;
    consistencyNotes?: string | null;
    deepProfile?: string | null;
    voiceId?: string | null;
    voiceType?: string | null;
    voiceDescription?: string | null;
    speechPattern?: string | null;
    accent?: string | null;
    role?: string | null;
  }>;
  scenes: Array<{
    id: number;
    orderIndex: number;
    title?: string | null;
    description?: string | null;
    visualDescription?: string | null;
    locationType?: string | null;
    country?: string | null;
    city?: string | null;
    locationDetail?: string | null;
    timeOfDay?: string | null;
    season?: string | null;
    weather?: string | null;
    lighting?: string | null;
    cameraAngle?: string | null;
    cameraMovement?: string | null;
    lensType?: string | null;
    focalLength?: string | null;
    depthOfField?: string | null;
    shotType?: string | null;
    frameRate?: string | null;
    aspectRatio?: string | null;
    colorGrading?: string | null;
    colorPalette?: string | null;
    colorTemperature?: string | null;
    mood?: string | null;
    emotionalBeat?: string | null;
    foregroundElements?: string | null;
    backgroundElements?: string | null;
    characterBlocking?: string | null;
    actionDescription?: string | null;
    vfxElements?: string | null;
    vfxNotes?: string | null;
    makeupNotes?: string | null;
    stuntNotes?: string | null;
    aiPromptOverride?: string | null;
    wardrobeOverrides?: any;
    wardrobe?: any;
    duration?: number | null;
    characterIds?: number[];
    dialogueLines?: DialogueLine[];
    sceneType?: string | null;
    sfxNotes?: string | null;
    sfxProductionNotes?: string | null;
    ambientSound?: string | null;
    musicMood?: string | null;
    musicTempo?: string | null;
    negativePrompt?: string | null;
    seed?: number | null;
  }>;
}

export interface FilmSceneResult {
  sceneId: number;
  orderIndex: number;
  videoUrl?: string;
  dialogueAudioUrl?: string;
  soundtrackUrl?: string;
  duration: number;
  success: boolean;
  error?: string;
  lastFrameUrl?: string;
  sceneContractFingerprint?: string;
  qualityReviews?: VideoQualityReview[];
}

export interface FilmGenerationResult {
  filmUrl?: string;
  totalDuration: number;
  sceneResults: Array<Omit<FilmSceneResult, "orderIndex" | "lastFrameUrl">>;
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

function buildCharacterVoiceMap(characters: FilmGenerationInput["characters"]): Record<string, CharacterVoice> {
  const voices: Record<string, CharacterVoice> = {};
  for (const character of characters) {
    const genderText = (character.gender || "").toLowerCase();
    const gender: CharacterVoice["gender"] = genderText.includes("female")
      ? "female"
      : genderText.includes("male")
        ? "male"
        : "neutral";
    const ageText = (character.ageRange || "").toLowerCase();
    const age: CharacterVoice["age"] = /child|teen|young/.test(ageText)
      ? "young"
      : /elder|senior|old/.test(ageText)
        ? "elderly"
        : "adult";
    const narrator = /narrator|storyteller|god voice/.test((character.role || "").toLowerCase());
    voices[character.name] = {
      voiceId: character.voiceId || (narrator ? "ErXwobaYiN019PkySvjV" : undefined),
      gender,
      age,
      accent: character.accent || undefined,
    };
  }
  return voices;
}

/**
 * Preserves every explicit scene duration. Only scenes without an explicit
 * duration share the remaining target runtime.
 */
function calculateSceneDurations(
  scenes: FilmGenerationInput["scenes"],
  totalDurationMinutes: number,
): Map<number, number> {
  const targetSeconds = Math.max(1, totalDurationMinutes * 60);
  const result = new Map<number, number>();
  const explicit = scenes.filter((scene) => Number(scene.duration) > 0);
  const flexible = scenes.filter((scene) => !(Number(scene.duration) > 0));
  const explicitTotal = explicit.reduce((sum, scene) => sum + Number(scene.duration), 0);

  for (const scene of explicit) result.set(scene.id, Number(scene.duration));
  if (flexible.length === 0) return result;

  const remaining = Math.max(flexible.length * 8, targetSeconds - explicitTotal);
  const weights = flexible.map((scene) => {
    const dialogueWeight = Math.min(2, 1 + (scene.dialogueLines?.length || 0) * 0.06);
    const actionWeight = scene.actionDescription || scene.vfxNotes || scene.stuntNotes ? 1.2 : 1;
    return dialogueWeight * actionWeight;
  });
  const totalWeight = weights.reduce((sum, value) => sum + value, 0) || flexible.length;
  flexible.forEach((scene, index) => result.set(scene.id, Math.max(8, Math.round(remaining * weights[index] / totalWeight))));
  return result;
}

function outputGeometry(aspectRatio: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "9:16": return { width: 1080, height: 1920 };
    case "1:1": return { width: 1080, height: 1080 };
    case "4:3": return { width: 1440, height: 1080 };
    case "3:4": return { width: 1080, height: 1440 };
    case "2.39:1": return { width: 1920, height: 804 };
    case "21:9": return { width: 1920, height: 822 };
    default: return { width: 1920, height: 1080 };
  }
}

function numericFrameRate(value: string): number {
  const match = value.match(/([0-9]+(?:\.[0-9]+)?)/);
  const number = match ? Number(match[1]) : 24;
  return Number.isFinite(number) && number >= 12 && number <= 120 ? number : 24;
}

async function downloadTo(url: string, target: string): Promise<void> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Asset download failed: HTTP ${response.status} for ${url}`);
  await fs.promises.writeFile(target, Buffer.from(await response.arrayBuffer()));
}

async function normalizeSceneForAssembly(
  scene: FilmSceneResult,
  context: SceneGenerationContext,
  outputPath: string,
  tmpDir: string,
): Promise<void> {
  if (!scene.videoUrl) throw new Error(`Scene ${scene.sceneId} has no video URL.`);
  const videoPath = path.join(tmpDir, `scene-${scene.sceneId}-video.mp4`);
  await downloadTo(scene.videoUrl, videoPath);
  const args: string[] = ["-hide_banner", "-loglevel", "error", "-i", videoPath];
  let dialogueIndex: number | undefined;
  let musicIndex: number | undefined;

  if (scene.dialogueAudioUrl) {
    const dialoguePath = path.join(tmpDir, `scene-${scene.sceneId}-dialogue.mp3`);
    await downloadTo(scene.dialogueAudioUrl, dialoguePath);
    dialogueIndex = args.filter((value) => value === "-i").length;
    args.push("-i", dialoguePath);
  }
  if (scene.soundtrackUrl) {
    const musicPath = path.join(tmpDir, `scene-${scene.sceneId}-music.mp3`);
    await downloadTo(scene.soundtrackUrl, musicPath);
    musicIndex = args.filter((value) => value === "-i").length;
    args.push("-i", musicPath);
  }
  let audioMap = "";
  if (dialogueIndex != null && musicIndex != null) {
    args.push("-filter_complex", `[${dialogueIndex}:a]apad=pad_dur=${Math.max(1, scene.duration)},volume=1.0[dialogue];[${musicIndex}:a]apad=pad_dur=${Math.max(1, scene.duration)},volume=0.22[music];[dialogue][music]amix=inputs=2:duration=longest:dropout_transition=2:normalize=0[mix]`);
    audioMap = "[mix]";
  } else if (dialogueIndex != null) {
    args.push("-filter_complex", `[${dialogueIndex}:a]apad=pad_dur=${Math.max(1, scene.duration)},volume=1.0[mix]`);
    audioMap = "[mix]";
  } else if (musicIndex != null) {
    args.push("-filter_complex", `[${musicIndex}:a]apad=pad_dur=${Math.max(1, scene.duration)},volume=0.22[mix]`);
    audioMap = "[mix]";
  } else {
    args.push("-f", "lavfi", "-t", String(Math.max(1, scene.duration)), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
    const silentIndex = args.filter((value) => value === "-i").length - 1;
    audioMap = `${silentIndex}:a`;
  }

  const { width, height } = outputGeometry(context.canonicalSpec.camera.aspectRatio);
  const fps = numericFrameRate(context.canonicalSpec.camera.frameRate);
  args.push(
    "-map", "0:v:0",
    "-map", audioMap,
    "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-ac", "2",
    "-movflags", "+faststart", "-y", outputPath,
  );
  await execFileAsync("ffmpeg", args, { timeout: 10 * 60 * 1000, maxBuffer: 12 * 1024 * 1024 });
}

async function assembleFilm(
  scenes: FilmSceneResult[],
  contexts: Map<number, SceneGenerationContext>,
  projectId: number,
  projectTitle: string,
): Promise<{ filmUrl: string; totalDuration: number; quality: VideoQualityReview }> {
  const ordered = [...scenes].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) throw new Error("No scenes were supplied for film assembly.");
  if (ordered.some((scene) => !scene.success || !scene.videoUrl)) throw new Error("Film assembly was blocked because one or more required scenes are incomplete.");

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-film-assembly-"));
  try {
    const normalized: string[] = [];
    for (const scene of ordered) {
      const context = contexts.get(scene.sceneId);
      if (!context) throw new Error(`Missing generation context for scene ${scene.sceneId}.`);
      const output = path.join(tmpDir, `scene-${String(scene.orderIndex).padStart(4, "0")}.mp4`);
      await normalizeSceneForAssembly(scene, context, output, tmpDir);
      normalized.push(output);
    }

    const concatList = path.join(tmpDir, "film-concat.txt");
    await fs.promises.writeFile(concatList, normalized.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
    const outputPath = path.join(tmpDir, "film.mp4");
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", concatList,
      "-c", "copy", "-movflags", "+faststart",
      "-metadata", `title=${projectTitle}`,
      "-metadata", "artist=Virelle Studios",
      "-metadata", "comment=Generated through the Virelle canonical film pipeline",
      "-y", outputPath,
    ], { timeout: 30 * 60 * 1000, maxBuffer: 12 * 1024 * 1024 });

    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outputPath,
    ], { timeout: 30_000 });
    const totalDuration = Number(stdout.trim()) || 0;
    const file = await fs.promises.readFile(outputPath);
    const stored = await storagePut(`films/${projectId}/${projectTitle.replace(/[^a-zA-Z0-9]+/g, "_")}-${Date.now()}.mp4`, file, "video/mp4");
    const firstContext = contexts.get(ordered[0].sceneId)!;
    const expectedDuration = ordered.reduce((sum, scene) => sum + scene.duration, 0);
    const quality = await reviewGeneratedClip({
      videoUrl: stored.url,
      canonicalSpec: firstContext.canonicalSpec,
      expectedDurationSeconds: expectedDuration,
      policy: "technical",
    });
    if (!quality.pass) throw new Error(`Final film technical validation failed: ${quality.issues.join(" ")}`);
    if (expectedDuration > 0 && Math.abs(totalDuration - expectedDuration) / expectedDuration > 0.08) {
      throw new Error(`Final film duration mismatch: expected approximately ${expectedDuration.toFixed(1)}s, produced ${totalDuration.toFixed(1)}s.`);
    }
    return { filmUrl: stored.url, totalDuration, quality };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function generateDialogueForScene(
  scene: FilmGenerationInput["scenes"][number],
  input: FilmGenerationInput,
): Promise<VoiceActingResult | undefined> {
  if (!input.config.generateDialogue || !scene.dialogueLines?.length) return undefined;
  return generateSceneDialogue(input.voiceKeys, {
    sceneId: scene.id,
    projectId: input.project.id,
    dialogueLines: scene.dialogueLines,
    characterVoices: buildCharacterVoiceMap(input.characters),
    sceneDescription: scene.visualDescription || scene.description || undefined,
    genre: input.config.genre,
  });
}

async function generateOneScene(
  input: FilmGenerationInput,
  scene: FilmGenerationInput["scenes"][number],
  context: SceneGenerationContext,
  targetDuration: number,
  previousFrameUrl: string | undefined,
  qualityPolicy: "standard" | "strict",
  progress: FilmGenerationProgress,
  onProgress?: (progress: FilmGenerationProgress) => void,
): Promise<FilmSceneResult> {
  progress.currentSceneTitle = scene.title || `Scene ${scene.orderIndex + 1}`;
  let dialogue: VoiceActingResult | undefined;
  if (input.config.generateDialogue && scene.dialogueLines?.length) {
    progress.phase = "generating_dialogue";
    onProgress?.({ ...progress });
    dialogue = await generateDialogueForScene(scene, input);
    if (!dialogue) throw new Error(`Dialogue was requested for scene ${scene.id} but no dialogue track was produced.`);
    progress.dialogueLinesGenerated += dialogue.lineCount;
  }

  progress.phase = "generating_scenes";
  onProgress?.({ ...progress });
  const spec = context.canonicalSpec;
  const sceneResult = await generateExtendedScene(input.videoKeys, {
    sceneId: scene.id,
    projectId: input.project.id,
    description: context.canonicalPrompt,
    targetDurationSeconds: Math.max(targetDuration, dialogue?.durationSeconds ? dialogue.durationSeconds + 1.5 : 0),
    mood: scene.mood || input.config.mood,
    lighting: scene.lighting || undefined,
    timeOfDay: scene.timeOfDay || undefined,
    weather: scene.weather || undefined,
    genre: input.config.genre,
    characterDescriptions: context.characterDescriptions,
    locationDescription: spec.locationDescription,
    previousSceneLastFrameUrl: previousFrameUrl,
    dialogueAudioUrl: dialogue?.audioUrl,
    dialogueAudioDuration: dialogue?.durationSeconds,
    referenceImages: context.referenceImages,
    aiPromptOverride: scene.aiPromptOverride || undefined,
    negativePrompt: scene.negativePrompt || spec.negativePrompt || buildNegativePrompt(input.config.genre),
    seed: scene.seed ?? spec.seed,
    sceneType: scene.sceneType || undefined,
    wardrobeContext: context.wardrobeContext,
    sfxNotes: scene.sfxNotes || undefined,
    sfxProductionNotes: scene.sfxProductionNotes || undefined,
    ambientSound: scene.ambientSound || undefined,
    musicMood: scene.musicMood || undefined,
    musicTempo: scene.musicTempo || undefined,
    aspectRatio: spec.camera.aspectRatio,
    resolution: spec.camera.resolution,
    frameRate: spec.camera.frameRate,
    cameraAngle: spec.camera.angle,
    cameraMovement: spec.camera.movement,
    lensType: spec.camera.lensType,
    focalLength: spec.camera.focalLength,
    depthOfField: spec.camera.depthOfField,
    shotType: spec.camera.shotType,
    qualityPolicy,
    maxQualityRegenerations: qualityPolicy === "strict" ? 2 : 1,
    requireAllClips: true,
  }, () => {
    progress.completedClips++;
    onProgress?.({ ...progress });
  });

  let soundtrackUrl: string | undefined;
  if (input.config.generateSoundtrack) {
    progress.phase = "generating_soundtrack";
    onProgress?.({ ...progress });
    const preset = getGenreMusicPreset(input.config.genre, scene.mood || input.config.mood || "neutral");
    const soundtrack = await generateSoundtrack(input.musicKeys, {
      projectId: input.project.id,
      sceneId: scene.id,
      mood: scene.mood || input.config.mood || "neutral",
      genre: input.config.genre,
      durationSeconds: sceneResult.totalDuration,
      instruments: preset.instruments,
      tempo: preset.tempo,
      type: "score",
    });
    if (!soundtrack?.audioUrl) throw new Error(`Soundtrack was requested for scene ${scene.id} but no audio track was produced.`);
    soundtrackUrl = soundtrack.audioUrl;
    progress.soundtrackSegmentsGenerated++;
  }

  return {
    sceneId: scene.id,
    orderIndex: scene.orderIndex,
    videoUrl: sceneResult.videoUrl,
    dialogueAudioUrl: dialogue?.audioUrl,
    soundtrackUrl,
    duration: sceneResult.totalDuration,
    success: true,
    lastFrameUrl: sceneResult.lastFrameUrl,
    sceneContractFingerprint: sceneResult.sceneContractFingerprint,
    qualityReviews: sceneResult.qualityReviews,
  };
}

async function preflightFilm(input: FilmGenerationInput): Promise<{ orderedScenes: FilmGenerationInput["scenes"]; contexts: Map<number, SceneGenerationContext> }> {
  if (!input.scenes.length) throw new Error("Film generation requires at least one scene.");
  const orderedScenes = [...input.scenes].sort((a, b) => a.orderIndex - b.orderIndex);
  const ids = new Set<number>();
  const orders = new Set<number>();
  for (const scene of orderedScenes) {
    if (ids.has(scene.id)) throw new Error(`Duplicate scene ID ${scene.id}.`);
    if (orders.has(scene.orderIndex)) throw new Error(`Duplicate scene order ${scene.orderIndex}. Scene order must be unambiguous.`);
    ids.add(scene.id);
    orders.add(scene.orderIndex);
  }

  const contexts = new Map<number, SceneGenerationContext>();
  for (const scene of orderedScenes) {
    const context = await loadSceneGenerationContext(scene.id, input.project.id, scene as any);
    contexts.set(scene.id, context);
  }

  const ratios = new Set(Array.from(contexts.values()).map((context) => context.canonicalSpec.camera.aspectRatio));
  const frameRates = new Set(Array.from(contexts.values()).map((context) => context.canonicalSpec.camera.frameRate));
  if (ratios.size > 1) throw new Error(`Full-film generation requires one delivery aspect ratio. Found: ${Array.from(ratios).join(", ")}.`);
  if (frameRates.size > 1) throw new Error(`Full-film generation requires one delivery frame rate. Found: ${Array.from(frameRates).join(", ")}.`);
  return { orderedScenes, contexts };
}

export async function generateFullFilm(
  input: FilmGenerationInput,
  onProgress?: (progress: FilmGenerationProgress) => void,
): Promise<FilmGenerationResult> {
  const started = Date.now();
  const qualityPolicy = input.config.qualityPolicy ?? "strict";
  const progress: FilmGenerationProgress = {
    phase: "preparing",
    totalScenes: input.scenes.length,
    completedScenes: 0,
    totalClips: 0,
    completedClips: 0,
    dialogueLinesGenerated: 0,
    soundtrackSegmentsGenerated: 0,
    estimatedTimeRemainingMinutes: 0,
    errors: [],
  };
  onProgress?.({ ...progress });

  const { orderedScenes, contexts } = await preflightFilm(input);
  const durations = calculateSceneDurations(orderedScenes, input.config.targetDurationMinutes);
  const estimate = estimateFilmGenerationCalls(input.config.targetDurationMinutes);
  progress.totalClips = estimate.totalClips;
  progress.estimatedTimeRemainingMinutes = estimate.estimatedMinutes;
  const sceneResults: FilmSceneResult[] = [];
  let previousFrameUrl: string | undefined;

  for (const scene of orderedScenes) {
    const context = contexts.get(scene.id)!;
    try {
      const result = await generateOneScene(
        input,
        scene,
        context,
        durations.get(scene.id) || 30,
        input.config.useSceneContinuity ? previousFrameUrl : undefined,
        qualityPolicy,
        progress,
        onProgress,
      );
      sceneResults.push(result);
      previousFrameUrl = result.lastFrameUrl;
      progress.completedScenes++;
      const elapsedMinutes = Math.max(0.01, (Date.now() - started) / 60_000);
      const rate = progress.completedScenes / elapsedMinutes;
      progress.estimatedTimeRemainingMinutes = Math.max(0, Math.round((orderedScenes.length - progress.completedScenes) / rate));
      onProgress?.({ ...progress });
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[FilmPipeline] Scene ${scene.id} failed: ${message}`);
      progress.errors.push(`Scene "${scene.title || scene.id}" failed: ${message}`);
      sceneResults.push({ sceneId: scene.id, orderIndex: scene.orderIndex, duration: 0, success: false, error: message });
      progress.completedScenes++;
      onProgress?.({ ...progress });
      if (!input.config.allowPartialAssembly) break;
    }
  }

  const requiredFailure = sceneResults.some((scene) => !scene.success) || sceneResults.length !== orderedScenes.length;
  let filmUrl: string | undefined;
  let totalDuration = 0;

  if (!requiredFailure || input.config.allowPartialAssembly) {
    const assemblyScenes = input.config.allowPartialAssembly ? sceneResults.filter((scene) => scene.success) : sceneResults;
    if (assemblyScenes.length > 0) {
      progress.phase = "assembling";
      onProgress?.({ ...progress });
      const assembly = await assembleFilm(assemblyScenes, contexts, input.project.id, input.project.title);
      filmUrl = assembly.filmUrl;
      totalDuration = assembly.totalDuration;
    }
  } else {
    progress.errors.push("Final assembly was blocked because every required scene did not pass generation and quality control.");
  }

  progress.phase = filmUrl ? "complete" : "failed";
  onProgress?.({ ...progress });
  const totalGenerationTimeMinutes = Math.round((Date.now() - started) / 60_000);
  return {
    filmUrl,
    totalDuration,
    sceneResults: sceneResults.map(({ orderIndex: _orderIndex, lastFrameUrl: _lastFrameUrl, ...scene }) => scene),
    stats: {
      totalClipsGenerated: progress.completedClips,
      totalDialogueLinesGenerated: progress.dialogueLinesGenerated,
      totalSoundtrackSegments: progress.soundtrackSegmentsGenerated,
      totalGenerationTimeMinutes,
      videoProvider: input.videoKeys.preferredProvider || "automatic-byok",
      voiceProvider: input.voiceKeys.elevenlabsKey ? "elevenlabs" : input.voiceKeys.openaiKey ? "openai" : "pollinations",
      musicProvider: input.musicKeys.sunoKey ? "suno" : input.musicKeys.replicateKey ? "replicate" : "pollinations",
    },
  };
}

export async function generateSingleScene(
  input: {
    videoKeys: UserApiKeys;
    voiceKeys: VoiceActingKeys;
    musicKeys: SoundtrackKeys;
    projectId: number;
    scene: FilmGenerationInput["scenes"][number];
    characters: FilmGenerationInput["characters"];
    genre: string;
    mood?: string;
    targetDurationSeconds: number;
    previousSceneLastFrameUrl?: string;
    generateDialogue?: boolean;
    generateSoundtrack?: boolean;
    qualityPolicy?: Extract<VideoQualityPolicy, "standard" | "strict">;
  },
): Promise<{
  videoUrl?: string;
  dialogueAudioUrl?: string;
  soundtrackUrl?: string;
  duration: number;
  lastFrameUrl?: string;
  sceneContractFingerprint?: string;
  qualityReviews?: VideoQualityReview[];
}> {
  const filmInput: FilmGenerationInput = {
    config: {
      projectId: input.projectId,
      targetDurationMinutes: input.targetDurationSeconds / 60,
      genre: input.genre,
      mood: input.mood,
      generateDialogue: input.generateDialogue ?? false,
      generateSoundtrack: input.generateSoundtrack ?? false,
      useCharacterConsistency: true,
      useSceneContinuity: Boolean(input.previousSceneLastFrameUrl),
      qualityPolicy: input.qualityPolicy ?? "strict",
    },
    videoKeys: input.videoKeys,
    voiceKeys: input.voiceKeys,
    musicKeys: input.musicKeys,
    project: { id: input.projectId, title: `Project ${input.projectId}`, genre: input.genre },
    characters: input.characters,
    scenes: [input.scene],
  };
  const context = await loadSceneGenerationContext(input.scene.id, input.projectId, input.scene as any);
  const progress: FilmGenerationProgress = {
    phase: "preparing",
    totalScenes: 1,
    completedScenes: 0,
    totalClips: 0,
    completedClips: 0,
    dialogueLinesGenerated: 0,
    soundtrackSegmentsGenerated: 0,
    estimatedTimeRemainingMinutes: 0,
    errors: [],
  };
  const result = await generateOneScene(
    filmInput,
    input.scene,
    context,
    input.targetDurationSeconds,
    input.previousSceneLastFrameUrl,
    input.qualityPolicy ?? "strict",
    progress,
  );
  return {
    videoUrl: result.videoUrl,
    dialogueAudioUrl: result.dialogueAudioUrl,
    soundtrackUrl: result.soundtrackUrl,
    duration: result.duration,
    lastFrameUrl: result.lastFrameUrl,
    sceneContractFingerprint: result.sceneContractFingerprint,
    qualityReviews: result.qualityReviews,
  };
}

export function estimateFilmCost(
  durationMinutes: number,
  options: {
    videoProvider: string;
    voiceProvider: string;
    musicProvider: string;
    dialogueLineCount: number;
  },
): {
  videoCost: { low: number; high: number };
  voiceCost: { low: number; high: number };
  musicCost: { low: number; high: number };
  totalCost: { low: number; high: number };
  totalClips: number;
  estimatedHours: number;
} {
  const estimates = estimateFilmGenerationCalls(durationMinutes);
  const videoRates: Record<string, { low: number; high: number }> = {
    openai: { low: 0.10, high: 0.50 },
    runway: { low: 0.05, high: 0.25 },
    replicate: { low: 0.02, high: 0.10 },
    fal: { low: 0.02, high: 0.08 },
    luma: { low: 0.05, high: 0.20 },
    veo3: { low: 0.08, high: 0.40 },
    seedance: { low: 0.04, high: 0.20 },
    pollinations: { low: 0, high: 0 },
    huggingface: { low: 0, high: 0.01 },
  };
  const voiceRates: Record<string, { low: number; high: number }> = {
    elevenlabs: { low: 0.01, high: 0.05 },
    openai: { low: 0.005, high: 0.02 },
    pollinations: { low: 0, high: 0 },
  };
  const musicRates: Record<string, { low: number; high: number }> = {
    suno: { low: 0, high: 0.10 },
    replicate: { low: 0.01, high: 0.05 },
    pollinations: { low: 0, high: 0 },
  };
  const videoRate = videoRates[options.videoProvider] || videoRates.pollinations;
  const voiceRate = voiceRates[options.voiceProvider] || voiceRates.pollinations;
  const musicRate = musicRates[options.musicProvider] || musicRates.pollinations;
  const videoCost = { low: estimates.totalClips * videoRate.low, high: estimates.totalClips * videoRate.high };
  const voiceCost = { low: options.dialogueLineCount * voiceRate.low, high: options.dialogueLineCount * voiceRate.high };
  const musicCost = { low: estimates.totalScenes * musicRate.low, high: estimates.totalScenes * musicRate.high };
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
