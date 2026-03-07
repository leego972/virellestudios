/**
 * Unified Video Engine
 * 
 * Routes video generation between Sora (OpenAI) and Runway ML.
 * Supports parallel scene generation, automatic failover, and load balancing.
 * 
 * Strategy:
 * - Primary: Runway Gen-4.5 (faster, more consistent)
 * - Secondary: Sora (OpenAI) (backup, different style)
 * - Parallel: Split scenes between both providers for maximum speed
 */
import { generateVideo, generateVideoWithFallback, buildVideoPrompt, type VideoGenerationOptions } from "./videoGeneration";
import { generateRunwayVideo, generateRunwayVideoWithFallback, type RunwayVideoOptions } from "./runwayVideoGeneration";
import { ENV } from "./env";

export type VideoProvider = "runway" | "sora" | "auto";

export type UnifiedVideoOptions = {
  prompt: string;
  seconds?: number;
  resolution?: "1080p" | "720p" | "480p";
  inputImageUrl?: string;
  aspectRatio?: "landscape" | "portrait";
  /** Which provider to use. "auto" will pick the best available. */
  provider?: VideoProvider;
  /** Genre for prompt optimization */
  genre?: string;
  /** Camera movement description */
  cameraMovement?: string;
  /** Mood/atmosphere */
  mood?: string;
  /** Lighting description */
  lighting?: string;
};

export type UnifiedVideoResult = {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  provider: "runway" | "sora";
  jobId: string;
};

/**
 * Check which video providers are available based on configured API keys.
 */
export function getAvailableProviders(): VideoProvider[] {
  const providers: VideoProvider[] = [];
  if (ENV.runwayApiKey) providers.push("runway");
  if (ENV.openaiApiKey) providers.push("sora");
  return providers;
}

/**
 * Generate a video using the unified engine.
 * Automatically selects the best provider and handles failover.
 */
export async function generateUnifiedVideo(
  options: UnifiedVideoOptions
): Promise<UnifiedVideoResult> {
  const provider = options.provider || "auto";
  const available = getAvailableProviders();

  console.log(`[UnifiedVideo] Provider: ${provider}, Available: ${available.join(", ")}`);

  if (available.length === 0) {
    throw new Error("No video generation providers configured. Set OPENAI_API_KEY or RUNWAYML_API_SECRET.");
  }

  // Determine provider order
  let providerOrder: ("runway" | "sora")[];
  if (provider === "runway" && available.includes("runway")) {
    providerOrder = ["runway", ...(available.includes("sora") ? ["sora" as const] : [])];
  } else if (provider === "sora" && available.includes("sora")) {
    providerOrder = ["sora", ...(available.includes("runway") ? ["runway" as const] : [])];
  } else {
    // Auto mode: prefer Runway (faster), fallback to Sora
    providerOrder = [];
    if (available.includes("runway")) providerOrder.push("runway");
    if (available.includes("sora")) providerOrder.push("sora");
  }

  let lastError: Error | null = null;

  for (const p of providerOrder) {
    try {
      if (p === "runway") {
        return await generateWithRunway(options);
      } else {
        return await generateWithSora(options);
      }
    } catch (e: any) {
      console.error(`[UnifiedVideo] ${p} failed:`, e.message);
      lastError = e;
      // Try next provider
    }
  }

  throw lastError || new Error("All video generation providers failed");
}

/**
 * Generate video using Runway ML.
 */
async function generateWithRunway(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
  const runwayOpts: RunwayVideoOptions = {
    prompt: options.prompt,
    duration: Math.min(10, Math.max(2, options.seconds || 5)),
    ratio: options.aspectRatio === "portrait" ? "720:1280" : "1280:720",
    model: "gen4.5",
    inputImageUrl: options.inputImageUrl,
  };

  const result = await generateRunwayVideo(runwayOpts);
  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    provider: "runway",
    jobId: result.runwayTaskId,
  };
}

/**
 * Generate video using OpenAI Sora.
 */
async function generateWithSora(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
  const soraOpts: VideoGenerationOptions = {
    prompt: options.prompt,
    seconds: options.seconds || 8,
    resolution: options.resolution || "1080p",
    model: "sora-2",
    inputImageUrl: options.inputImageUrl,
    aspectRatio: options.aspectRatio || "landscape",
  };

  const result = await generateVideo(soraOpts);
  return {
    videoUrl: result.videoUrl,
    thumbnailUrl: result.thumbnailUrl,
    duration: result.duration,
    provider: "sora",
    jobId: result.soraJobId,
  };
}

/**
 * Generate multiple scene videos in parallel, distributing across providers.
 * This is the key speed optimization — instead of sequential generation,
 * scenes are split between Runway and Sora simultaneously.
 */
export async function generateScenesParallel(
  scenes: Array<{
    sceneIndex: number;
    prompt: string;
    inputImageUrl?: string;
    seconds?: number;
  }>,
  options?: {
    resolution?: "1080p" | "720p" | "480p";
    aspectRatio?: "landscape" | "portrait";
    maxConcurrency?: number;
  }
): Promise<Array<{
  sceneIndex: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  provider: "runway" | "sora";
  error?: string;
}>> {
  const available = getAvailableProviders();
  const maxConcurrency = options?.maxConcurrency || 3;

  console.log(`[UnifiedVideo] Generating ${scenes.length} scenes in parallel (max ${maxConcurrency} concurrent)`);

  // Process scenes with concurrency limit
  const results: Array<{
    sceneIndex: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration: number;
    provider: "runway" | "sora";
    error?: string;
  }> = [];

  // Create a semaphore for concurrency control
  let running = 0;
  const queue = [...scenes];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // Alternate between providers for load balancing
    const provider: VideoProvider = available.length > 1
      ? (i % 2 === 0 ? available[0] : available[1]) as VideoProvider
      : available[0] as VideoProvider;

    const promise = (async () => {
      // Wait for a slot
      while (running >= maxConcurrency) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      running++;

      try {
        console.log(`[UnifiedVideo] Scene ${scene.sceneIndex}: starting with ${provider}`);
        const result = await generateUnifiedVideo({
          prompt: scene.prompt,
          seconds: scene.seconds || 5,
          resolution: options?.resolution || "720p",
          inputImageUrl: scene.inputImageUrl,
          aspectRatio: options?.aspectRatio || "landscape",
          provider,
        });

        results.push({
          sceneIndex: scene.sceneIndex,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          provider: result.provider,
        });
        console.log(`[UnifiedVideo] Scene ${scene.sceneIndex}: completed (${result.provider})`);
      } catch (e: any) {
        console.error(`[UnifiedVideo] Scene ${scene.sceneIndex}: failed:`, e.message);
        results.push({
          sceneIndex: scene.sceneIndex,
          duration: scene.seconds || 5,
          provider: provider as "runway" | "sora",
          error: e.message,
        });
      } finally {
        running--;
      }
    })();

    promises.push(promise);
  }

  await Promise.all(promises);

  // Sort by scene index
  results.sort((a, b) => a.sceneIndex - b.sceneIndex);
  return results;
}

/**
 * Build an optimized video prompt for the unified engine.
 * Adapts the prompt style based on the target provider.
 */
export function buildUnifiedVideoPrompt(
  sceneDescription: string,
  options?: {
    cameraMovement?: string;
    mood?: string;
    lighting?: string;
    timeOfDay?: string;
    weather?: string;
    genre?: string;
    characterAction?: string;
    provider?: VideoProvider;
  }
): string {
  // Both Sora and Runway work best with specific, descriptive prompts
  // focused on motion, action, and cinematic quality
  const parts: string[] = [];

  // Photorealism anchor
  parts.push("Photorealistic cinematic footage, shot on ARRI ALEXA 65, 24fps");

  if (options?.genre) {
    parts.push(`${options.genre} film`);
  }

  // Core scene description
  parts.push(sceneDescription);

  // Character action (critical for video — what's MOVING)
  if (options?.characterAction) {
    parts.push(options.characterAction);
  }

  // Camera movement
  if (options?.cameraMovement) {
    parts.push(`Camera: ${options.cameraMovement}`);
  } else {
    parts.push("Camera: slow cinematic dolly movement");
  }

  // Atmosphere
  if (options?.timeOfDay) parts.push(`${options.timeOfDay} lighting`);
  if (options?.weather && options.weather !== "clear") parts.push(`${options.weather}`);
  if (options?.lighting) parts.push(`${options.lighting}`);
  if (options?.mood) parts.push(`${options.mood} atmosphere`);

  // Photorealism reinforcement
  parts.push("natural skin texture, photorealistic, real-world physics, shallow depth of field, cinematic color grading");

  return parts.join(", ");
}
