/**
 * Extended Scene Generator — Clip Chaining for Industry-Standard Scene Lengths
 * 
 * The core problem: AI video models generate 5-20 second clips per API call.
 * Industry-standard scenes run 30 seconds to 3+ minutes.
 * 
 * Solution: Chain multiple clips per scene with continuity:
 * 1. Break each scene into sub-shots (each ~15s, matching provider maximums)
 * 2. Use the last frame of clip N as the first frame reference for clip N+1
 * 3. Vary camera angles and movements within the scene for cinematic feel
 * 4. Stitch sub-clips into a single scene video
 * 
 * Architecture for a 90-minute film:
 * - 60-90 scenes (avg 60-90 seconds each)
 * - Each scene = 4-6 sub-clips of 15 seconds (provider-capped to 10-20s)
 * - Total clips: ~300-540 clips
 * - Generation time: depends on provider speed
 * 
 * Scene duration is fully user-controlled with no artificial cap.
 * Providers internally cap each clip to their own maximum (10-20s).
 */

import { generateVideo as generateBYOKVideo, selectProvider, type UserApiKeys, type VideoGenerationRequest, type VideoGenerationResult } from "./byokVideoEngine";
import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Types ───

export interface SubShot {
  index: number;
  prompt: string;
  cameraAngle: string;
  cameraMovement: string;
  durationSeconds: number;
  /** URL of the last frame from the previous sub-shot (for continuity) */
  referenceFrameUrl?: string;
}

export interface ExtendedSceneRequest {
  sceneId: number;
  projectId: number;
  /** Full scene description */
  description: string;
  /** Target duration for this scene in seconds */
  targetDurationSeconds: number;
  /** Scene metadata */
  mood?: string;
  lighting?: string;
  timeOfDay?: string;
  weather?: string;
  genre?: string;
  /** Character descriptions for consistency */
  characterDescriptions?: string[];
  /** Location description */
  locationDescription?: string;
  /** Previous scene's last frame URL for scene-to-scene continuity */
  previousSceneLastFrameUrl?: string;
  /** Dialogue audio URL to sync video duration with */
  dialogueAudioUrl?: string;
  dialogueAudioDuration?: number;
}

export interface ExtendedSceneResult {
  videoUrl: string;           // S3 URL of the stitched scene video
  thumbnailUrl?: string;      // First frame thumbnail
  totalDuration: number;      // Actual duration in seconds
  subClipCount: number;       // Number of sub-clips generated
  lastFrameUrl?: string;      // Last frame URL for next scene continuity
  provider: string;
}

// ─── Camera Angle Variations ───
// Cycle through these to create cinematic variety within a single scene

const CAMERA_VARIATIONS = [
  { angle: "wide establishing", movement: "slow dolly forward", description: "Wide establishing shot slowly pushing in" },
  { angle: "medium", movement: "steady tracking right", description: "Medium shot tracking alongside the action" },
  { angle: "close-up", movement: "subtle handheld", description: "Close-up with subtle handheld movement" },
  { angle: "over-shoulder", movement: "slow push in", description: "Over-the-shoulder shot slowly pushing in" },
  { angle: "low angle", movement: "slow tilt up", description: "Low angle looking up, slow tilt" },
  { angle: "wide", movement: "slow pan left to right", description: "Wide shot panning across the scene" },
  { angle: "medium close-up", movement: "orbiting slowly", description: "Medium close-up slowly orbiting the subject" },
  { angle: "birds eye", movement: "descending crane", description: "Bird's eye view descending into the scene" },
];

// ─── Sub-Shot Planning ───

/**
 * Break a scene into sub-shots based on target duration.
 * Uses provider-appropriate clip durations:
 * - Runway / SeedDance: 10s (API only accepts 5 or 10)
 * - Pollinations / HuggingFace: 8s (model limitation)
 * - Sora / Replicate / fal: 15s (supports up to 20s)
 */
export function planSubShots(
  sceneDescription: string,
  targetDurationSeconds: number,
  options?: {
    mood?: string;
    lighting?: string;
    timeOfDay?: string;
    weather?: string;
    genre?: string;
    characterDescriptions?: string[];
    locationDescription?: string;
    /** Active provider — used to select the correct clip duration */
    provider?: string;
  }
): SubShot[] {
  // Select clip duration based on provider capabilities
  // Runway and SeedDance only accept 5s or 10s; always request 10s for maximum coverage
  const provider = options?.provider || "pollinations";
  const clipDuration =
    provider === "runway" || provider === "seedance" ? 10 :
    provider === "pollinations" || provider === "huggingface" ? 8 :
    15; // Sora, Replicate, fal — up to 20s per clip

  const numClips = Math.max(2, Math.ceil(targetDurationSeconds / clipDuration));

  const subShots: SubShot[] = [];

  for (let i = 0; i < numClips; i++) {
    const cameraVar = CAMERA_VARIATIONS[i % CAMERA_VARIATIONS.length];
    const isFirst = i === 0;
    const isLast = i === numClips - 1;

    // Build a specific prompt for this sub-shot
    const promptParts: string[] = [];

    // Cinematic quality anchor
    promptParts.push("Photorealistic cinematic footage, shot on ARRI ALEXA 65, 24fps, anamorphic widescreen");

    if (options?.genre) promptParts.push(`${options.genre} film`);

    // Scene description with camera-specific framing
    if (isFirst) {
      promptParts.push(`Opening shot: ${sceneDescription}`);
    } else if (isLast) {
      promptParts.push(`Closing moment: ${sceneDescription}`);
    } else {
      promptParts.push(sceneDescription);
    }

    // Camera specifics
    promptParts.push(`Camera: ${cameraVar.description}`);
    promptParts.push(`${cameraVar.angle} shot with ${cameraVar.movement}`);

    // Character descriptions for consistency
    if (options?.characterDescriptions && options.characterDescriptions.length > 0) {
      promptParts.push(`Characters: ${options.characterDescriptions.join("; ")}`);
    }

    // Location
    if (options?.locationDescription) {
      promptParts.push(`Location: ${options.locationDescription}`);
    }

    // Atmosphere
    if (options?.timeOfDay) promptParts.push(`${options.timeOfDay} lighting`);
    if (options?.weather && options.weather !== "clear") promptParts.push(`${options.weather} weather`);
    if (options?.lighting) promptParts.push(`${options.lighting} lighting setup`);
    if (options?.mood) promptParts.push(`${options.mood} atmosphere`);

    // Quality reinforcement
    promptParts.push("natural skin texture, photorealistic, real-world physics, shallow depth of field, cinematic color grading, film grain");

    // Duration for this clip — allow up to 20s per clip (providers will cap to their own max)
    const thisDuration = isLast
      ? Math.max(5, targetDurationSeconds - (numClips - 1) * clipDuration)
      : clipDuration;

    subShots.push({
      index: i,
      prompt: promptParts.join(", "),
      cameraAngle: cameraVar.angle,
      cameraMovement: cameraVar.movement,
      durationSeconds: Math.min(20, Math.max(2, thisDuration)),
    });
  }

  return subShots;
}

// ─── Frame Extraction ───

/**
 * Extract the last frame from a video file and upload to S3.
 * This frame is used as the reference image for the next clip's generation.
 */
async function extractLastFrame(videoUrl: string, projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-frame-"));

  try {
    // Download video
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl);
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    // Extract last frame
    const framePath = path.join(tmpDir, "last_frame.jpg");

    // First get duration
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      videoPath,
    ], { timeout: 15000 });
    const info = JSON.parse(probeOut);
    const duration = parseFloat(info.format?.duration || "0");

    if (duration <= 0) return undefined;

    // Extract frame at duration - 0.1s
    const seekTime = Math.max(0, duration - 0.1);
    await execFileAsync("ffmpeg", [
      "-ss", String(seekTime),
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-y",
      framePath,
    ], { timeout: 15000 });

    // Upload to S3
    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `frames/${projectId}/scene-${sceneId}-lastframe-${Date.now()}.jpg`;
    const { url } = await storagePut(key, frameBuffer, "image/jpeg");
    return url;
  } catch (err) {
    console.warn("[ExtendedScene] Failed to extract last frame:", err);
    return undefined;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Extract the first frame from a video for use as thumbnail.
 */
async function extractFirstFrame(videoUrl: string, projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-thumb-"));

  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl);
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    const framePath = path.join(tmpDir, "first_frame.jpg");
    await execFileAsync("ffmpeg", [
      "-i", videoPath,
      "-vframes", "1",
      "-q:v", "2",
      "-y",
      framePath,
    ], { timeout: 15000 });

    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `thumbnails/${projectId}/scene-${sceneId}-thumb-${Date.now()}.jpg`;
    const { url } = await storagePut(key, frameBuffer, "image/jpeg");
    return url;
  } catch {
    return undefined;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Sub-Clip Stitching ───

/**
 * Stitch multiple sub-clips into a single scene video with crossfade transitions.
 */
async function stitchSubClips(
  clipUrls: string[],
  projectId: number,
  sceneId: number
): Promise<{ videoUrl: string; duration: number }> {
  if (clipUrls.length === 0) throw new Error("No clips to stitch");
  if (clipUrls.length === 1) {
    // Single clip — return directly without re-encoding
    // Duration will be measured by the caller via ffprobe if needed
    return { videoUrl: clipUrls[0], duration: 10 };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-stitch-sub-"));

  try {
    // Download all clips
    const localFiles: string[] = [];
    for (let i = 0; i < clipUrls.length; i++) {
      const localPath = path.join(tmpDir, `clip_${String(i).padStart(3, "0")}.mp4`);
      const resp = await fetch(clipUrls[i]);
      if (!resp.ok) continue;
      const buffer = Buffer.from(await resp.arrayBuffer());
      await fs.promises.writeFile(localPath, buffer);
      localFiles.push(localPath);
    }

    if (localFiles.length === 0) throw new Error("Failed to download any clips");

    // Normalize all clips to same format
    const normalizedFiles: string[] = [];
    for (let i = 0; i < localFiles.length; i++) {
      const normalized = path.join(tmpDir, `norm_${String(i).padStart(3, "0")}.ts`);
      await execFileAsync("ffmpeg", [
        "-i", localFiles[i],
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1",
        "-r", "24",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-b:a", "128k",
        "-f", "mpegts",
        "-y",
        normalized,
      ], { timeout: 60000 });
      normalizedFiles.push(normalized);
    }

    // Concatenate
    const concatInput = normalizedFiles.join("|");
    const outputPath = path.join(tmpDir, "scene_stitched.mp4");

    await execFileAsync("ffmpeg", [
      "-i", `concat:${concatInput}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "22",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ], { timeout: 600000 }); // 10-minute timeout for long scenes with many clips

    // Get duration
    let duration = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        outputPath,
      ], { timeout: 10000 });
      const info = JSON.parse(stdout);
      duration = parseFloat(info.format?.duration || "0");
    } catch { /* ignore */ }

    // Upload to S3
    const fileBuffer = await fs.promises.readFile(outputPath);
    const key = `scenes/${projectId}/scene-${sceneId}-extended-${Date.now()}.mp4`;
    const { url } = await storagePut(key, fileBuffer, "video/mp4");

    return { videoUrl: url, duration };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Main Entry Point ───

/**
 * Generate an extended scene video by chaining multiple sub-clips.
 * Supports industry-standard scene lengths: 30 seconds to 3+ minutes.
 * Each sub-clip is ~15s (capped by provider to 10-20s).
 * Clips are stitched together with ffmpeg for seamless playback.
 */
export async function generateExtendedScene(
  keys: UserApiKeys,
  request: ExtendedSceneRequest,
  onProgress?: (clipIndex: number, totalClips: number, clipUrl?: string) => void
): Promise<ExtendedSceneResult> {
  // Detect the active provider so planSubShots uses the correct clip duration
  const activeProvider = selectProvider(keys);
  console.log(`[ExtendedScene] Active provider: ${activeProvider}`);

  // If dialogue audio exists, match video duration to it (with buffer)
  let targetDuration = request.targetDurationSeconds;
  if (request.dialogueAudioDuration && request.dialogueAudioDuration > 0) {
    targetDuration = Math.max(targetDuration, request.dialogueAudioDuration + 2);
  }

  // Plan sub-shots with provider-aware clip durations
  const subShots = planSubShots(
    request.description,
    targetDuration,
    {
      mood: request.mood,
      lighting: request.lighting,
      timeOfDay: request.timeOfDay,
      weather: request.weather,
      genre: request.genre,
      characterDescriptions: request.characterDescriptions,
      locationDescription: request.locationDescription,
      provider: activeProvider,
    }
  );

  console.log(`[ExtendedScene] Scene ${request.sceneId}: ${subShots.length} sub-clips planned for ${targetDuration}s target`);

  // Generate sub-clips sequentially (each uses previous clip's last frame)
  const generatedClipUrls: string[] = [];
  let lastFrameUrl = request.previousSceneLastFrameUrl;

  for (let i = 0; i < subShots.length; i++) {
    const subShot = subShots[i];

    // Use last frame from previous clip as reference for continuity
    if (lastFrameUrl) {
      subShot.referenceFrameUrl = lastFrameUrl;
    }

    try {
      console.log(`[ExtendedScene] Generating sub-clip ${i + 1}/${subShots.length} (${subShot.durationSeconds}s, ${subShot.cameraAngle})`);

      const videoResult = await generateBYOKVideo(keys, {
        prompt: subShot.prompt,
        imageUrl: subShot.referenceFrameUrl,
        duration: subShot.durationSeconds,
        aspectRatio: "16:9",
        resolution: "720p",
      });

      generatedClipUrls.push(videoResult.videoUrl);

      // Extract last frame for next clip's continuity
      lastFrameUrl = await extractLastFrame(videoResult.videoUrl, request.projectId, request.sceneId);

      onProgress?.(i + 1, subShots.length, videoResult.videoUrl);
    } catch (err: any) {
      console.error(`[ExtendedScene] Sub-clip ${i + 1} failed:`, err.message);
      // Continue with remaining clips — partial scene is better than no scene
      onProgress?.(i + 1, subShots.length, undefined);
    }
  }

  if (generatedClipUrls.length === 0) {
    throw new Error("Failed to generate any sub-clips for this scene");
  }

  // Stitch sub-clips into a single scene video
  console.log(`[ExtendedScene] Stitching ${generatedClipUrls.length} sub-clips...`);
  const { videoUrl, duration } = await stitchSubClips(generatedClipUrls, request.projectId, request.sceneId);

  // Extract thumbnail from first clip
  const thumbnailUrl = await extractFirstFrame(generatedClipUrls[0], request.projectId, request.sceneId);

  console.log(`[ExtendedScene] Scene ${request.sceneId} complete: ${duration.toFixed(1)}s from ${generatedClipUrls.length} clips`);

  return {
    videoUrl,
    thumbnailUrl,
    totalDuration: duration,
    subClipCount: generatedClipUrls.length,
    lastFrameUrl,
    provider: "byok",
  };
}

/**
 * Calculate the total number of API calls needed for a full film.
 * Useful for cost estimation and progress tracking.
 */
export function estimateFilmGenerationCalls(
  totalDurationMinutes: number,
  avgSceneDurationSeconds: number = 60,
  clipDurationSeconds: number = 15
): {
  totalScenes: number;
  clipsPerScene: number;
  totalClips: number;
  estimatedMinutes: number;
} {
  const totalSeconds = totalDurationMinutes * 60;
  const totalScenes = Math.ceil(totalSeconds / avgSceneDurationSeconds);
  const clipsPerScene = Math.ceil(avgSceneDurationSeconds / clipDurationSeconds);
  const totalClips = totalScenes * clipsPerScene;
  // Estimate ~30 seconds per clip generation on average
  const estimatedMinutes = Math.ceil((totalClips * 30) / 60);

  return { totalScenes, clipsPerScene, totalClips, estimatedMinutes };
}
