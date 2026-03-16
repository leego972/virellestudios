/**
 * Video Generation Module — Sora API Integration
 * 
 * Generates real video clips using OpenAI's Sora API.
 * Supports text-to-video and image-to-video (first frame reference).
 * Handles async job polling, MP4 download, and S3 upload.
 */
import OpenAI from "openai";
import type { VideoSeconds, VideoSize } from "openai/resources/videos";
import { storagePut } from "../storage";
import { ENV } from "./env";

// Use the real OpenAI API endpoint for Sora (not the proxy)
const openai = new OpenAI({
  apiKey: ENV.openaiApiKey || process.env.OPENAI_API_KEY || "",
  baseURL: "https://api.openai.com/v1",
});

export type VideoGenerationOptions = {
  prompt: string;
  /** Duration in seconds — will be mapped to nearest Sora value: "4", "8", or "12" */
  seconds?: number;
  /** Alias for seconds */
  duration?: number;
  /** Resolution — mapped to Sora sizes */
  resolution?: "1080p" | "720p" | "480p";
  /** Model: "sora-2" (fast) or "sora-2-pro" (production quality) */
  model?: "sora-2" | "sora-2-pro";
  /** Optional first-frame image URL for image-to-video */
  inputImageUrl?: string;
  /** Aspect ratio preference */
  aspectRatio?: "landscape" | "portrait";
};

export type VideoGenerationResult = {
  videoUrl: string;       // S3 URL of the uploaded MP4
  thumbnailUrl?: string;  // S3 URL of the thumbnail
  duration: number;       // Duration in seconds
  soraJobId: string;      // Sora job ID for reference
};

/**
 * Map user-friendly seconds to Sora's allowed values: "4", "8", "12"
 */
function mapToSoraSeconds(seconds: number): VideoSeconds {
  if (seconds <= 5) return "4";
  if (seconds <= 10) return "8";
  return "12";
}

/**
 * Map resolution + aspect ratio to Sora's allowed sizes:
 * "720x1280" (portrait), "1280x720" (landscape), "1024x1792" (tall portrait), "1792x1024" (wide landscape)
 */
function mapToSoraSize(resolution: string, aspect: string = "landscape"): VideoSize {
  if (aspect === "portrait") {
    return resolution === "1080p" ? "1024x1792" : "720x1280";
  }
  return resolution === "1080p" ? "1792x1024" : "1280x720";
}

/**
 * Generate a video clip using OpenAI Sora API.
 * This is an async process — it submits the job, polls for completion,
 * downloads the MP4, and uploads to S3.
 */
export async function generateVideo(
  options: VideoGenerationOptions
): Promise<VideoGenerationResult> {
  const model = options.model || "sora-2";
  const soraSeconds = mapToSoraSeconds(options.seconds || 8);
  const soraSize = mapToSoraSize(options.resolution || "720p", options.aspectRatio || "landscape");

  console.log(`[VideoGen] Starting ${model} job: ${soraSeconds}s at ${soraSize}`);
  console.log(`[VideoGen] Prompt: ${options.prompt.substring(0, 200)}...`);

  // Step 1: Create the video generation job
  const createParams: OpenAI.VideoCreateParams = {
    model,
    prompt: options.prompt,
    seconds: soraSeconds,
    size: soraSize,
  };

  // If we have an input image, download it and pass as input_reference
  if (options.inputImageUrl) {
    try {
      const imgResponse = await fetch(options.inputImageUrl);
      if (imgResponse.ok) {
        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        const blob = new Blob([imgBuffer], { type: "image/png" });
        const file = new File([blob], "first_frame.png", { type: "image/png" });
        createParams.input_reference = file;
      }
    } catch (e) {
      console.warn("[VideoGen] Could not fetch input image, proceeding with text-only:", e);
    }
  }

  let video: OpenAI.Videos.Video;
  try {
    video = await openai.videos.create(createParams);
  } catch (e: any) {
    console.error("[VideoGen] Failed to create video job:", e.message);
    throw new Error(`Video generation failed to start: ${e.message}`);
  }

  const jobId = video.id;
  console.log(`[VideoGen] Job created: ${jobId}, status: ${video.status}`);

  // Step 2: Poll for completion
  const MAX_POLL_TIME = 10 * 60 * 1000; // 10 minutes max
  const POLL_INTERVAL = 15 * 1000; // 15 seconds
  const startTime = Date.now();

  let status = video.status;
  while (status !== "completed" && status !== "failed") {
    if (Date.now() - startTime > MAX_POLL_TIME) {
      throw new Error(`Video generation timed out after 10 minutes (job: ${jobId})`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));

    try {
      const check = await openai.videos.retrieve(jobId);
      status = check.status;
      const progress = check.progress || 0;
      console.log(`[VideoGen] Job ${jobId}: ${status} (${progress}%)`);
    } catch (e: any) {
      console.warn(`[VideoGen] Poll error for ${jobId}:`, e.message);
    }
  }

  if (status === "failed") {
    throw new Error(`Video generation failed (job: ${jobId})`);
  }

  // Step 3: Download the MP4 using the correct SDK method: downloadContent
  console.log(`[VideoGen] Job ${jobId} completed, downloading MP4...`);

  let videoBuffer: Buffer;
  try {
    const contentResponse = await openai.videos.downloadContent(jobId);
    // The response is a standard Response object with the binary video data
    const arrayBuffer = await contentResponse.arrayBuffer();
    videoBuffer = Buffer.from(arrayBuffer);
  } catch (e: any) {
    console.error(`[VideoGen] Failed to download video ${jobId}:`, e.message);
    throw new Error(`Failed to download generated video: ${e.message}`);
  }

  console.log(`[VideoGen] Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB video`);

  // Step 4: Upload MP4 to S3
  const videoKey = `videos/${Date.now()}-${jobId.substring(0, 8)}.mp4`;
  const { url: videoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");
  console.log(`[VideoGen] Uploaded to S3: ${videoUrl}`);

  // Step 5: Try to download thumbnail
  let thumbnailUrl: string | undefined;
  try {
    const thumbResponse = await openai.videos.downloadContent(jobId, { variant: "thumbnail" });
    const thumbArrayBuffer = await thumbResponse.arrayBuffer();
    const thumbBuffer = Buffer.from(thumbArrayBuffer);
    const thumbKey = `thumbnails/${Date.now()}-${jobId.substring(0, 8)}.jpg`;
    const { url: thumbUrl } = await storagePut(thumbKey, thumbBuffer, "image/jpeg");
    thumbnailUrl = thumbUrl;
  } catch (e) {
    console.warn("[VideoGen] Could not download thumbnail, using first frame");
  }

  // Step 6: Clean up from OpenAI storage
  try {
    await openai.videos.delete(jobId);
  } catch (e) {
    // Non-critical, just log
    console.warn("[VideoGen] Could not delete video from OpenAI storage");
  }

  const actualDuration = parseInt(soraSeconds, 10);
  return {
    videoUrl,
    thumbnailUrl,
    duration: actualDuration,
    soraJobId: jobId,
  };
}

/**
 * Generate a video with fallback — if Sora fails, generate a still image instead.
 * Returns both videoUrl (if available) and thumbnailUrl.
 */
export async function generateVideoWithFallback(
  options: VideoGenerationOptions,
  fallbackImageGenerator?: () => Promise<{ url?: string }>
): Promise<{
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  isVideo: boolean;
}> {
  try {
    const result = await generateVideo(options);
    return {
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      isVideo: true,
    };
  } catch (e: any) {
    console.error("[VideoGen] Video generation failed, falling back to image:", e.message);

    if (fallbackImageGenerator) {
      try {
        const imageResult = await fallbackImageGenerator();
        return {
          videoUrl: undefined,
          thumbnailUrl: imageResult.url,
          duration: options.seconds || 10,
          isVideo: false,
        };
      } catch (imgErr: any) {
        console.error("[VideoGen] Image fallback also failed:", imgErr.message);
      }
    }

    throw new Error(`Video generation failed: ${e.message}`);
  }
}

/**
 * Build a cinematic video prompt optimized for Sora.
 * Sora works best with: shot type, subject, action, setting, lighting, camera movement.
 */
export function buildVideoPrompt(
  sceneDescription: string,
  options?: {
    cameraMovement?: string;
    mood?: string;
    lighting?: string;
    timeOfDay?: string;
    weather?: string;
    genre?: string;
    characterAction?: string;
  }
): string {
  const parts: string[] = [];

  // Sora needs concise, specific prompts focused on MOTION and ACTION
  parts.push("Photorealistic cinematic footage, shot on ARRI ALEXA 65, 24fps, anamorphic widescreen");

  if (options?.genre) {
    parts.push(`${options.genre} film style`);
  }

  // Core scene description
  parts.push(sceneDescription);

  // Character action (critical for video — what's MOVING)
  if (options?.characterAction) {
    parts.push(options.characterAction);
  }

  // Camera movement (critical for video feel)
  if (options?.cameraMovement) {
    parts.push(`Camera: ${options.cameraMovement}`);
  } else {
    parts.push("Camera: slow cinematic dolly movement");
  }

  // Lighting and atmosphere
  if (options?.timeOfDay) {
    parts.push(`${options.timeOfDay} lighting`);
  }
  if (options?.weather && options.weather !== "clear") {
    parts.push(`${options.weather} weather`);
  }
  if (options?.lighting) {
    parts.push(`${options.lighting} lighting setup`);
  }
  if (options?.mood) {
    parts.push(`${options.mood} atmosphere`);
  }

  parts.push("natural skin texture with visible pores, photorealistic human rendering, real-world physics");
  parts.push("shallow depth of field, cinematic color grading, Kodak Vision3 film stock look, organic film grain");

  return parts.join(", ");
}
