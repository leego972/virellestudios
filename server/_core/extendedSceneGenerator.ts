import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import {
  generateVideo as generateBYOKVideo,
  pollFalRequest,
  selectProvider,
  type UserApiKeys,
  type VideoGenerationResult,
  type VideoProvider,
} from "./byokVideoEngine";
import { buildNegativePrompt } from "./cinematicPromptEngine";
import { generateImage } from "./imageGeneration";
import { logger } from "./logger";
import {
  loadSceneGenerationContext,
  type SceneGenerationContext,
} from "./sceneGenerationContext";
import { storagePut } from "../storage";
import { reviewGeneratedClip, type VideoQualityPolicy, type VideoQualityReview } from "./videoQualityGate";
import { refreshCanonicalSceneFingerprint, renderCanonicalScenePrompt, type CanonicalSceneSpec } from "./canonicalSceneSpec";

const execFileAsync = promisify(execFile);

export interface SubShot {
  index: number;
  prompt: string;
  cameraAngle: string;
  cameraMovement: string;
  durationSeconds: number;
  referenceFrameUrl?: string;
  dramaticPurpose?: string;
}

export interface ExtendedSceneRequest {
  sceneId: number;
  projectId: number;
  description: string;
  targetDurationSeconds: number;
  mood?: string;
  lighting?: string;
  timeOfDay?: string;
  weather?: string;
  genre?: string;
  characterDescriptions?: string[];
  locationDescription?: string;
  previousSceneLastFrameUrl?: string;
  dialogueAudioUrl?: string;
  dialogueAudioDuration?: number;
  referenceImages?: string[];
  aiPromptOverride?: string;
  negativePrompt?: string;
  seed?: number;
  sceneType?: "action" | "dialogue" | "emotional" | "horror" | "reveal" | "default" | string;
  wardrobeContext?: string;
  sfxNotes?: string;
  sfxProductionNotes?: string;
  ambientSound?: string;
  musicMood?: string;
  musicTempo?: string;
  aspectRatio?: string;
  resolution?: string;
  frameRate?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lensType?: string;
  focalLength?: string;
  depthOfField?: string;
  shotType?: string;
  qualityPolicy?: VideoQualityPolicy;
  maxQualityRegenerations?: number;
  requireAllClips?: boolean;
}

export interface ExtendedSceneResult {
  videoUrl: string;
  thumbnailUrl?: string;
  totalDuration: number;
  subClipCount: number;
  lastFrameUrl?: string;
  clipsRequested: number;
  provider: string;
  sceneContractFingerprint: string;
  qualityReviews: VideoQualityReview[];
  warnings: string[];
}

type ShotBeat = {
  angle: string;
  movement: string;
  purpose: string;
};

const SHOT_GRAMMAR: Record<string, ShotBeat[]> = {
  action: [
    { angle: "wide establishing", movement: "controlled rapid push-in", purpose: "establish geography and threat" },
    { angle: "medium tracking", movement: "lateral tracking with the action", purpose: "preserve spatial clarity during movement" },
    { angle: "close-up", movement: "subtle handheld pressure", purpose: "show intention and consequence" },
    { angle: "insert detail", movement: "locked macro", purpose: "show the decisive prop or physical action" },
    { angle: "wide master", movement: "pan with action while preserving screen direction", purpose: "complete the action beat without geographic reset" },
    { angle: "medium aftermath", movement: "slow dolly out", purpose: "show the outcome and bridge to the next scene" },
  ],
  dialogue: [
    { angle: "wide two-shot", movement: "slow push toward the conversation", purpose: "establish both characters, eyelines and power relationship" },
    { angle: "over-shoulder", movement: "subtle push toward the speaker", purpose: "preserve the 180-degree line and first perspective" },
    { angle: "medium close-up", movement: "imperceptible handheld breathing", purpose: "capture the listener's reaction" },
    { angle: "reverse over-shoulder", movement: "subtle push toward the reply", purpose: "show the counter-perspective without flipping geography" },
    { angle: "close-up", movement: "ultra-slow push", purpose: "land the emotional or narrative turn" },
    { angle: "wide two-shot", movement: "slow reframe", purpose: "show the changed relationship at scene exit" },
  ],
  emotional: [
    { angle: "wide isolating", movement: "slow pull back", purpose: "establish emotional isolation and environment" },
    { angle: "medium", movement: "slow dolly in", purpose: "move toward the character as emotion develops" },
    { angle: "close-up", movement: "imperceptible handheld breathing", purpose: "capture authentic micro-expression" },
    { angle: "insert hands or meaningful object", movement: "locked macro", purpose: "express emotion through physical detail" },
    { angle: "extreme close-up", movement: "locked hold", purpose: "capture the decisive emotional release" },
    { angle: "wide resolution", movement: "slow pull back", purpose: "show the emotional consequence and exit state" },
  ],
  horror: [
    { angle: "wide deceptively calm", movement: "slow creep forward", purpose: "establish false safety and threatening negative space" },
    { angle: "over-shoulder into darkness", movement: "slow push", purpose: "maintain protagonist geography while approaching danger" },
    { angle: "close-up", movement: "locked tension", purpose: "show fear registering before the reveal" },
    { angle: "wide reveal", movement: "controlled rapid push", purpose: "reveal the threat without losing spatial logic" },
    { angle: "medium unstable", movement: "restrained handheld", purpose: "show the response while preserving readable action" },
    { angle: "wide aftermath", movement: "completely static", purpose: "hold the consequence and continuity exit state" },
  ],
  reveal: [
    { angle: "wide concealed composition", movement: "slow approach", purpose: "establish what the audience initially believes" },
    { angle: "medium reaction", movement: "subtle push", purpose: "prepare the discovery through character attention" },
    { angle: "insert clue", movement: "locked macro", purpose: "show the concrete evidence" },
    { angle: "reverse reveal", movement: "measured pull back", purpose: "reframe the scene with the newly revealed truth" },
    { angle: "close-up reaction", movement: "slow push", purpose: "show the human meaning of the reveal" },
  ],
  default: [
    { angle: "wide establishing", movement: "slow dolly forward", purpose: "establish location, cast and geography" },
    { angle: "medium", movement: "subtle tracking", purpose: "begin the scene action" },
    { angle: "close-up", movement: "slow push", purpose: "show the key emotional or narrative beat" },
    { angle: "insert detail", movement: "locked macro", purpose: "show the required prop, gesture or evidence" },
    { angle: "wide master", movement: "controlled reframe", purpose: "complete the action with spatial continuity" },
    { angle: "medium exit", movement: "slow pull back", purpose: "establish the scene's exit state" },
  ],
};

function inferSceneType(request: ExtendedSceneRequest, spec: CanonicalSceneSpec): string {
  const explicit = String(request.sceneType || "").toLowerCase();
  if (SHOT_GRAMMAR[explicit]) return explicit;
  const haystack = `${request.genre || ""} ${request.mood || ""} ${spec.baseNarrative}`.toLowerCase();
  if (/fight|chase|battle|explosion|escape|attack|action/.test(haystack)) return "action";
  if (/horror|terror|dread|haunt|monster|threat/.test(haystack)) return "horror";
  if (/reveal|discover|realize|twist|secret/.test(haystack)) return "reveal";
  if (/dialogue|conversation|interview|argument|speaks|asks|replies/.test(haystack) || spec.dialogueSpeakers.length > 0) return "dialogue";
  if (/grief|love|cry|emotion|farewell|loss|hope/.test(haystack)) return "emotional";
  return "default";
}

function providerClipDuration(provider: VideoProvider): number {
  switch (provider) {
    case "openai": return 20;
    case "replicate": return 20;
    case "fal": return 15;
    case "runway": return 10;
    case "seedance": return 10;
    case "veo3": return 8;
    case "pollinations": return 8;
    case "luma": return 5;
    case "huggingface": return 5;
    default: return 8;
  }
}

function uniqueUrls(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value.trim())).map((value) => value.trim())));
}

function buildSubShotPrompt(
  spec: CanonicalSceneSpec,
  basePrompt: string,
  beat: ShotBeat,
  index: number,
  total: number,
  explicitCamera: boolean,
): string {
  const angle = explicitCamera && spec.camera.angle ? spec.camera.angle : beat.angle;
  const movement = explicitCamera && spec.camera.movement ? spec.camera.movement : beat.movement;
  const progression = index === 0
    ? "Begin exactly from the supplied opening/reference state. Establish positions before action advances."
    : index === total - 1
      ? "Complete the scene action and hold a clear exit state that can continue into the next scene."
      : "Continue directly from the previous clip's final frame; do not reset characters, props, wardrobe or geography.";

  return [
    basePrompt,
    `SUB-SHOT ${index + 1} OF ${total}`,
    `LOCKED SHOT EXECUTION: angle ${angle}; movement ${movement}; dramatic purpose ${beat.purpose}.`,
    spec.camera.lensType && `LOCKED LENS TYPE: ${spec.camera.lensType}.`,
    spec.camera.focalLength && `LOCKED FOCAL LENGTH: ${spec.camera.focalLength}.`,
    spec.camera.depthOfField && `LOCKED DEPTH OF FIELD: ${spec.camera.depthOfField}.`,
    progression,
    "Render one continuous physically plausible action beat. Preserve exact faces, body proportions, garments, colours, materials, accessories, held props, injuries, dirt, lighting direction, weather and screen direction.",
    "No montage, no jump in time, no new character, no costume substitution, no garment transfer between characters, no duplicate person, no object teleportation, no unexplained camera-side reversal.",
  ].filter(Boolean).join("\n");
}

export function planSubShots(
  spec: CanonicalSceneSpec,
  canonicalPrompt: string,
  targetDurationSeconds: number,
  provider: VideoProvider,
  sceneType: string,
): SubShot[] {
  const clipDuration = providerClipDuration(provider);
  const clipCount = Math.max(1, Math.ceil(targetDurationSeconds / clipDuration));
  const grammar = SHOT_GRAMMAR[sceneType] || SHOT_GRAMMAR.default;
  const shots: SubShot[] = [];
  let remaining = targetDurationSeconds;

  for (let index = 0; index < clipCount; index++) {
    const beat = grammar[index % grammar.length];
    const durationSeconds = Math.max(3, Math.min(clipDuration, remaining));
    const cameraAngle = spec.camera.angle || beat.angle;
    const cameraMovement = spec.camera.movement || beat.movement;
    shots.push({
      index,
      prompt: buildSubShotPrompt(spec, canonicalPrompt, beat, index, clipCount, spec.camera.explicit),
      cameraAngle,
      cameraMovement,
      durationSeconds,
      dramaticPurpose: beat.purpose,
    });
    remaining -= durationSeconds;
  }
  return shots;
}

async function pollRunwaySentinel(apiKey: string, taskId: string): Promise<string> {
  const RunwayML = (await import("@runwayml/sdk")).default;
  const client = new RunwayML({ apiKey });
  const started = Date.now();
  while (Date.now() - started < 18 * 60 * 1000) {
    const task = await Promise.race([
      (client as any).tasks.retrieve(taskId),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Runway status request timed out.")), 30_000)),
    ]);
    const status = String(task.status || "").toLowerCase();
    if (status === "succeeded") {
      const url = task.output?.[0] || task.output?.video || task.output;
      if (typeof url !== "string") throw new Error("Runway completed without a video URL.");
      return url;
    }
    if (status === "failed") throw new Error(`Runway task failed: ${JSON.stringify(task.failure || task.error || task).slice(0, 500)}`);
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`Runway task ${taskId} timed out.`);
}

async function pollVeo3Sentinel(apiKey: string, operationName: string): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < 22 * 60 * 1000) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data.done) {
        if (data.error) throw new Error(`Veo operation failed: ${data.error.message || JSON.stringify(data.error)}`);
        const samples = data.response?.generateVideoResponse?.generatedSamples || data.response?.videos || data.response?.generatedVideos || [];
        const uri = samples[0]?.video?.uri || samples[0]?.uri || samples[0]?.videoUri;
        if (!uri) throw new Error("Veo completed without a video URI.");
        return uri.includes("?") ? `${uri}&key=${apiKey}` : `${uri}?key=${apiKey}`;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(`Veo operation ${operationName} timed out.`);
}

async function pollFalSentinel(apiKey: string, sentinel: string): Promise<string> {
  const [, requestId, ...modelParts] = sentinel.split("|");
  const model = modelParts.join("|");
  if (!requestId || !model) throw new Error("Invalid fal.ai pending sentinel.");
  const started = Date.now();
  while (Date.now() - started < 22 * 60 * 1000) {
    const result = await pollFalRequest(apiKey, requestId, model);
    if (result.status === "succeeded" && result.videoUrl) return result.videoUrl;
    if (result.status === "failed") throw new Error(result.error || "fal.ai generation failed.");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  throw new Error(`fal.ai request ${requestId} timed out.`);
}

async function resolveVideoResult(result: VideoGenerationResult, keys: UserApiKeys): Promise<string> {
  if (result.videoUrl.startsWith("runway-pending:")) {
    if (!keys.runwayKey) throw new Error("Runway task returned pending status without a Runway key.");
    return pollRunwaySentinel(keys.runwayKey, result.videoUrl.slice("runway-pending:".length));
  }
  if (result.videoUrl.startsWith("veo3-pending:")) {
    if (!keys.googleAiKey) throw new Error("Veo task returned pending status without a Google AI key.");
    return pollVeo3Sentinel(keys.googleAiKey, result.videoUrl.slice("veo3-pending:".length));
  }
  if (result.videoUrl.startsWith("fal-pending|")) {
    if (!keys.falKey) throw new Error("fal.ai task returned pending status without a fal.ai key.");
    return pollFalSentinel(keys.falKey, result.videoUrl);
  }
  return result.videoUrl;
}

async function generateRunwayKeyframe(prompt: string, aspectRatio: string): Promise<string | undefined> {
  const [width, height] = aspectRatio === "9:16" ? [720, 1280] : aspectRatio === "1:1" ? [1024, 1024] : [1280, 720];
  const encoded = encodeURIComponent(`${prompt}\nPhotorealistic professional film keyframe. No text, no watermark.`.replace(/[^\x20-\x7E\n]/g, "").slice(0, 900));
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true&model=flux`;
  try {
    const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
    return response.ok ? url : undefined;
  } catch {
    return undefined;
  }
}

function openingReferenceInstructions(context: SceneGenerationContext): string[] {
  const instructions: string[] = [];
  let referenceIndex = 1;
  for (const binding of context.wardrobeBindings) {
    if (binding.characterReferenceImageUrl) {
      instructions.push(`Reference image ${referenceIndex}: exact face and body identity for CHARACTER ${binding.characterId}, ${binding.characterName}.`);
      referenceIndex++;
    }
    if (binding.wardrobeReferenceImageUrl) {
      instructions.push(`Reference image ${referenceIndex}: exact garment assigned only to CHARACTER ${binding.characterId}, ${binding.characterName}; never place it on another person.`);
      referenceIndex++;
    }
  }
  return instructions;
}

async function buildOpeningReferenceFrame(
  keys: UserApiKeys,
  request: ExtendedSceneRequest,
  context: SceneGenerationContext,
  canonicalPrompt: string,
  referenceImages: string[],
): Promise<string | undefined> {
  const bindingsWithCostume = context.wardrobeBindings.filter((binding) => binding.promptAnchor || binding.wardrobeReferenceImageUrl);
  const explicitCostumeChange = context.wardrobeBindings.some((binding) => binding.explicitChange);

  // With no new costume instruction, the previous scene's accepted final frame
  // remains the strongest possible identity, geography and wardrobe anchor.
  if (request.previousSceneLastFrameUrl && !explicitCostumeChange) {
    return request.previousSceneLastFrameUrl;
  }

  if (!bindingsWithCostume.length && request.previousSceneLastFrameUrl) {
    return request.previousSceneLastFrameUrl;
  }
  if (!bindingsWithCostume.length && !referenceImages.length) return undefined;

  // Exact identity/garment pairs must occupy the provider's highest-priority
  // reference slots. The old scene frame follows them only when an outfit change
  // needs spatial continuity without allowing the superseded clothing to win.
  const orderedReferences = uniqueUrls([
    ...context.wardrobeBindings.flatMap((binding) => [
      binding.characterReferenceImageUrl,
      binding.wardrobeReferenceImageUrl,
    ]),
    request.previousSceneLastFrameUrl,
    ...referenceImages,
  ]).slice(0, 4);

  const transitionDirective = explicitCostumeChange
    ? "An explicit outfit change begins in this scene. Preserve the same person, face, body and scene continuity from the previous frame, but replace the old outfit only with the newly assigned costume stated below. Do not retain any superseded garment."
    : "This is the first authoritative scene wardrobe frame. Establish every named character in the exact assigned costume before motion begins.";

  const bindingText = context.wardrobeBindings
    .filter((binding) => binding.promptAnchor)
    .map((binding) => `CHARACTER ${binding.characterId} — ${binding.characterName}: ${binding.promptAnchor}`)
    .join("\n");

  const prompt = [
    "Create one photorealistic opening film keyframe used as the immutable image-to-video reference for this scene.",
    transitionDirective,
    ...openingReferenceInstructions(context),
    "Match each face/body reference to its named character and match each garment reference only to that same named character. Never swap clothes, faces, bodies or accessories between characters.",
    bindingText,
    canonicalPrompt,
    "Show the required characters clearly enough that face identity, complete garment silhouette, exact colour, material, fit, footwear and accessories can be verified. No text, labels, collage borders or watermark in the output.",
  ].filter(Boolean).join("\n");

  try {
    const generated = await generateImage({
      prompt,
      originalImages: orderedReferences.map((url) => ({ url })),
      userOpenAiKey: keys.openaiKey,
    });
    if (generated.url) {
      logger.info(`[ExtendedScene] Scene ${request.sceneId}: opening character/costume reference composed with ${generated.provider || "image provider"}.`);
      return generated.url;
    }
  } catch (error: any) {
    logger.warn(`[ExtendedScene] Scene ${request.sceneId}: opening character/costume composite failed: ${error.message}`);
  }

  // Never reuse the prior scene's old costume when an explicit change was
  // requested. A garment reference is safer than silently preserving old attire.
  if (explicitCostumeChange) {
    return context.wardrobeBindings.find((binding) => binding.wardrobeReferenceImageUrl)?.wardrobeReferenceImageUrl;
  }
  return request.previousSceneLastFrameUrl || referenceImages[0];
}

async function extractFrame(videoUrl: string, position: "first" | "last", projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-frame-"));
  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const response = await fetch(videoUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) return undefined;
    await fs.promises.writeFile(videoPath, Buffer.from(await response.arrayBuffer()));
    const framePath = path.join(tmpDir, `${position}.jpg`);
    const args = position === "last"
      ? ["-sseof", "-0.12", "-i", videoPath, "-frames:v", "1", "-q:v", "2", "-y", framePath]
      : ["-i", videoPath, "-frames:v", "1", "-q:v", "2", "-y", framePath];
    await execFileAsync("ffmpeg", args, { timeout: 30_000 });
    const buffer = await fs.promises.readFile(framePath);
    const key = `${position === "last" ? "frames" : "thumbnails"}/${projectId}/scene-${sceneId}-${position}-${Date.now()}.jpg`;
    const stored = await storagePut(key, buffer, "image/jpeg");
    return stored.url;
  } catch (error: any) {
    logger.warn(`[ExtendedScene] Could not extract ${position} frame: ${error.message}`);
    return undefined;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
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
  const fps = match ? Number(match[1]) : 24;
  return Number.isFinite(fps) && fps >= 12 && fps <= 120 ? fps : 24;
}

async function stitchSubClips(
  clipUrls: string[],
  projectId: number,
  sceneId: number,
  spec: CanonicalSceneSpec,
): Promise<{ videoUrl: string; duration: number }> {
  if (clipUrls.length === 0) throw new Error("No accepted clips were available for scene assembly.");
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-scene-assembly-"));
  try {
    const { width, height } = outputGeometry(spec.camera.aspectRatio);
    const fps = numericFrameRate(spec.camera.frameRate);
    const normalizedFiles: string[] = [];

    for (let index = 0; index < clipUrls.length; index++) {
      const inputPath = path.join(tmpDir, `input-${index}.mp4`);
      const response = await fetch(clipUrls[index], { signal: AbortSignal.timeout(120_000) });
      if (!response.ok) throw new Error(`Could not download accepted clip ${index + 1}: HTTP ${response.status}`);
      await fs.promises.writeFile(inputPath, Buffer.from(await response.arrayBuffer()));
      const outputPath = path.join(tmpDir, `normalized-${index}.mp4`);
      await execFileAsync("ffmpeg", [
        "-hide_banner", "-loglevel", "error",
        "-i", inputPath,
        "-map", "0:v:0", "-map", "0:a?",
        "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=${fps}`,
        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "256k",
        "-movflags", "+faststart",
        "-y", outputPath,
      ], { timeout: 180_000, maxBuffer: 8 * 1024 * 1024 });
      normalizedFiles.push(outputPath);
    }

    const concatList = path.join(tmpDir, "concat.txt");
    await fs.promises.writeFile(concatList, normalizedFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n"));
    const assembledPath = path.join(tmpDir, "scene.mp4");
    await execFileAsync("ffmpeg", [
      "-hide_banner", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", concatList,
      "-c", "copy", "-movflags", "+faststart", "-y", assembledPath,
    ], { timeout: 15 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });

    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", assembledPath,
    ], { timeout: 30_000 });
    const duration = Number(stdout.trim()) || 0;
    const buffer = await fs.promises.readFile(assembledPath);
    const key = `scenes/${projectId}/scene-${sceneId}-${spec.fingerprint}-${Date.now()}.mp4`;
    const stored = await storagePut(key, buffer, "video/mp4");
    return { videoUrl: stored.url, duration };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function generateProviderClip(
  keys: UserApiKeys,
  provider: VideoProvider,
  subShot: SubShot,
  imageUrl: string | undefined,
  spec: CanonicalSceneSpec,
  negativePrompt: string,
  seed: number | undefined,
): Promise<string> {
  let effectiveImage = imageUrl;
  if (!effectiveImage && provider === "runway") effectiveImage = await generateRunwayKeyframe(subShot.prompt, spec.camera.aspectRatio);
  const result = await Promise.race([
    generateBYOKVideo(keys, {
      prompt: subShot.prompt,
      imageUrl: effectiveImage,
      duration: subShot.durationSeconds,
      aspectRatio: ["16:9", "9:16", "1:1"].includes(spec.camera.aspectRatio) ? spec.camera.aspectRatio : "16:9",
      resolution: /720/i.test(spec.camera.resolution) ? "720p" : "1080p",
      negativePrompt,
      seed,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Provider generation timed out after 20 minutes.")), 20 * 60 * 1000)),
  ]);
  return resolveVideoResult(result, keys);
}

export async function generateExtendedScene(
  keys: UserApiKeys,
  request: ExtendedSceneRequest,
  onProgress?: (clipIndex: number, totalClips: number, clipUrl?: string) => void,
): Promise<ExtendedSceneResult> {
  const context = await loadSceneGenerationContext(request.sceneId, request.projectId, {
    description: request.description,
    visualDescription: request.description,
    aiPromptOverride: request.aiPromptOverride,
    duration: request.targetDurationSeconds,
    mood: request.mood,
    lighting: request.lighting,
    timeOfDay: request.timeOfDay,
    weather: request.weather,
    locationType: request.locationDescription,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    frameRate: request.frameRate,
    cameraAngle: request.cameraAngle,
    cameraMovement: request.cameraMovement,
    lensType: request.lensType,
    focalLength: request.focalLength,
    depthOfField: request.depthOfField,
    shotType: request.shotType,
    negativePrompt: request.negativePrompt,
    seed: request.seed,
    sfxNotes: request.sfxNotes,
    sfxProductionNotes: request.sfxProductionNotes,
    ambientSound: request.ambientSound,
    musicMood: request.musicMood,
    musicTempo: request.musicTempo,
  });
  let spec = context.canonicalSpec;
  if (request.wardrobeContext?.trim() && !context.wardrobeContext?.includes(request.wardrobeContext.trim())) {
    spec.lockedRequirements.push(`ADDITIONAL WARDROBE CONTEXT: ${request.wardrobeContext.trim()}`);
  }
  if (request.characterDescriptions?.length) {
    const missingDescriptions = request.characterDescriptions.filter((description) =>
      !context.characterDescriptions.includes(description),
    );
    if (missingDescriptions.length) spec.lockedRequirements.push(`ADDITIONAL CHARACTER DNA: ${missingDescriptions.join(" | ")}`);
  }
  spec = refreshCanonicalSceneFingerprint(spec);
  const canonicalPrompt = renderCanonicalScenePrompt(spec);

  const provider = selectProvider(keys);
  const sceneType = inferSceneType(request, spec);
  const targetDuration = Math.max(
    3,
    request.targetDurationSeconds,
    request.dialogueAudioDuration ? request.dialogueAudioDuration + 1.5 : 0,
  );
  const subShots = planSubShots(spec, canonicalPrompt, targetDuration, provider, sceneType);
  const referenceImages = uniqueUrls([
    ...(request.referenceImages || []),
    ...context.referenceImages,
  ]);
  const openingReferenceFrame = await buildOpeningReferenceFrame(
    keys,
    request,
    context,
    canonicalPrompt,
    referenceImages,
  );
  const negativePrompt = request.negativePrompt || spec.negativePrompt || buildNegativePrompt(request.genre || "Drama");
  const hasBoundWardrobe = context.wardrobeBindings.some((binding) => Boolean(binding.promptAnchor));
  const policy = request.qualityPolicy ?? (hasBoundWardrobe ? "strict" : "standard");
  const maxQualityRegenerations = Math.max(0, Math.min(3, request.maxQualityRegenerations ?? (policy === "strict" ? 2 : 1)));
  const requireAllClips = request.requireAllClips ?? true;
  const acceptedUrls: string[] = [];
  const qualityReviews: VideoQualityReview[] = [];
  let previousFrame = openingReferenceFrame;

  logger.info(`[ExtendedScene] Scene ${request.sceneId}: contract=${spec.fingerprint}, provider=${provider}, clips=${subShots.length}, policy=${policy}, wardrobeBindings=${context.wardrobeBindings.length}`);

  for (let index = 0; index < subShots.length; index++) {
    const subShot = subShots[index];
    let acceptedUrl: string | undefined;
    let correctionPrompt = "";
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxQualityRegenerations; attempt++) {
      try {
        const attemptShot = {
          ...subShot,
          prompt: correctionPrompt ? `${subShot.prompt}\n${correctionPrompt}` : subShot.prompt,
          referenceFrameUrl: previousFrame,
        };
        const imageUrl = previousFrame || (index === 0 ? referenceImages[0] : undefined);
        const clipUrl = await generateProviderClip(
          keys,
          provider,
          attemptShot,
          imageUrl,
          spec,
          negativePrompt,
          spec.seed != null ? spec.seed + index + attempt * 1000 : undefined,
        );
        const review = await reviewGeneratedClip({
          videoUrl: clipUrl,
          canonicalSpec: spec,
          expectedDurationSeconds: subShot.durationSeconds,
          policy,
          previousFrameUrl: previousFrame,
          referenceImages,
          userOpenAiKey: keys.openaiKey,
          clipIndex: index,
          totalClips: subShots.length,
        });
        qualityReviews.push(review);
        if (!review.pass) {
          correctionPrompt = review.correctionPrompt || `QUALITY-CONTROL FAILURE: ${review.issues.join("; ")}. Regenerate and correct every issue.`;
          throw new Error(`Quality gate rejected sub-clip ${index + 1}: ${review.issues.join(" ")}`);
        }
        acceptedUrl = clipUrl;
        break;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[ExtendedScene] Scene ${request.sceneId} clip ${index + 1} attempt ${attempt + 1} failed: ${lastError.message}`);
        if (attempt < maxQualityRegenerations) await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
      }
    }

    if (!acceptedUrl) {
      if (requireAllClips) throw lastError || new Error(`Sub-clip ${index + 1} failed.`);
      continue;
    }

    acceptedUrls.push(acceptedUrl);
    previousFrame = await extractFrame(acceptedUrl, "last", request.projectId, request.sceneId) || previousFrame;
    onProgress?.(index + 1, subShots.length, acceptedUrl);
  }

  if (acceptedUrls.length !== subShots.length && requireAllClips) {
    throw new Error(`Scene ${request.sceneId} is incomplete: ${acceptedUrls.length}/${subShots.length} clips passed quality control.`);
  }
  if (acceptedUrls.length === 0) throw new Error(`Scene ${request.sceneId} produced no accepted clips.`);

  const stitched = await stitchSubClips(acceptedUrls, request.projectId, request.sceneId, spec);
  const finalReview = await reviewGeneratedClip({
    videoUrl: stitched.videoUrl,
    canonicalSpec: spec,
    expectedDurationSeconds: Math.max(3, acceptedUrls.reduce((sum, _, index) => sum + subShots[index].durationSeconds, 0)),
    policy: policy === "strict" ? "strict" : "technical",
    previousFrameUrl: openingReferenceFrame,
    referenceImages,
    userOpenAiKey: keys.openaiKey,
    clipIndex: 0,
    totalClips: 1,
  });
  qualityReviews.push(finalReview);
  if (!finalReview.pass) throw new Error(`Final assembled scene failed quality control: ${finalReview.issues.join(" ")}`);

  const thumbnailUrl = await extractFrame(stitched.videoUrl, "first", request.projectId, request.sceneId);
  const lastFrameUrl = await extractFrame(stitched.videoUrl, "last", request.projectId, request.sceneId) || previousFrame;

  return {
    videoUrl: stitched.videoUrl,
    thumbnailUrl,
    totalDuration: stitched.duration,
    subClipCount: acceptedUrls.length,
    lastFrameUrl,
    clipsRequested: subShots.length,
    provider,
    sceneContractFingerprint: spec.fingerprint,
    qualityReviews,
    warnings: context.warnings,
  };
}

export function estimateFilmGenerationCalls(
  totalDurationMinutes: number,
  avgSceneDurationSeconds = 60,
  clipDurationSeconds = 10,
): {
  totalScenes: number;
  clipsPerScene: number;
  totalClips: number;
  estimatedMinutes: number;
} {
  const totalSeconds = Math.max(1, totalDurationMinutes * 60);
  const totalScenes = Math.max(1, Math.ceil(totalSeconds / Math.max(3, avgSceneDurationSeconds)));
  const clipsPerScene = Math.max(1, Math.ceil(avgSceneDurationSeconds / Math.max(3, clipDurationSeconds)));
  const totalClips = totalScenes * clipsPerScene;
  const estimatedMinutes = Math.ceil((totalClips * 45) / 60);
  return { totalScenes, clipsPerScene, totalClips, estimatedMinutes };
}
