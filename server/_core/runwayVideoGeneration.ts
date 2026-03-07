/**
 * Runway ML Video Generation Module
 * 
 * Generates real video clips using Runway's Gen-4.5 model.
 * Supports text-to-video and image-to-video.
 * Uses the official @runwayml/sdk with built-in polling.
 */
import RunwayML, { TaskFailedError } from "@runwayml/sdk";
import { storagePut } from "../storage";
import { ENV } from "./env";

// Initialize the Runway client
// The SDK reads RUNWAYML_API_SECRET env var, but we set it explicitly
const getRunwayClient = (): RunwayML => {
  const apiKey = ENV.runwayApiKey;
  if (!apiKey) {
    throw new Error("Runway API key not configured");
  }
  // Runway API keys must start with 'key_' — fail fast if invalid
  if (!apiKey.startsWith('key_')) {
    throw new Error(`Runway API key invalid (must start with 'key_'). Got: ${apiKey.substring(0, 8)}...`);
  }
  return new RunwayML({ apiKey });
};

export type RunwayVideoOptions = {
  prompt: string;
  /** Duration in seconds (2-10) */
  duration?: number;
  /** Resolution ratio */
  ratio?: "1280:720" | "720:1280";
  /** Model to use */
  model?: "gen4.5" | "gen4_turbo" | "gen3a_turbo";
  /** Optional input image URL for image-to-video */
  inputImageUrl?: string;
};

export type RunwayVideoResult = {
  videoUrl: string;       // S3 URL of the uploaded MP4
  thumbnailUrl?: string;  // S3 URL of the thumbnail (if available)
  duration: number;       // Duration in seconds
  runwayTaskId: string;   // Runway task ID for reference
};

/**
 * Generate a video clip using Runway's Gen-4.5 model.
 * Handles image-to-video and text-to-video modes.
 */
export async function generateRunwayVideo(
  options: RunwayVideoOptions
): Promise<RunwayVideoResult> {
  const client = getRunwayClient();
  const model = options.model || "gen4.5";
  const duration = Math.min(10, Math.max(2, options.duration || 5));
  const ratio = options.ratio || "1280:720";

  console.log(`[RunwayGen] Starting ${model} job: ${duration}s at ${ratio}`);
  console.log(`[RunwayGen] Prompt: ${options.prompt.substring(0, 200)}...`);

  let task: any;

  try {
    if (options.inputImageUrl) {
      // Image-to-video mode
      console.log(`[RunwayGen] Mode: image-to-video with reference: ${options.inputImageUrl.substring(0, 80)}...`);
      task = await client.imageToVideo
        .create({
          model: model as any,
          promptImage: options.inputImageUrl,
          promptText: options.prompt,
          ratio: ratio as any,
          duration,
        })
        .waitForTaskOutput();
    } else {
      // Text-to-video mode — use the textToVideo endpoint
      console.log(`[RunwayGen] Mode: text-to-video`);
      task = await (client as any).textToVideo
        .create({
          model: "gen4.5",
          promptText: options.prompt,
          ratio: ratio as any,
          duration,
        })
        .waitForTaskOutput();
    }
  } catch (error: any) {
    if (error instanceof TaskFailedError) {
      console.error("[RunwayGen] Task failed:", error.taskDetails);
      throw new Error(`Runway video generation failed: ${JSON.stringify(error.taskDetails)}`);
    }
    console.error("[RunwayGen] Error:", error.message);
    throw new Error(`Runway video generation error: ${error.message}`);
  }

  console.log(`[RunwayGen] Task completed:`, JSON.stringify(task).substring(0, 500));

  // Extract the video URL from the task output
  const taskId = task.id || "unknown";
  const outputUrl = task.output?.[0] || task.output?.video || task.output;

  if (!outputUrl || typeof outputUrl !== "string") {
    console.error("[RunwayGen] No output URL in task result:", JSON.stringify(task));
    throw new Error("Runway video generation completed but no video URL returned");
  }

  console.log(`[RunwayGen] Video output URL: ${outputUrl.substring(0, 100)}...`);

  // Download the video from Runway's CDN
  let videoBuffer: Buffer;
  try {
    const response = await fetch(outputUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    videoBuffer = Buffer.from(arrayBuffer);
  } catch (e: any) {
    console.error(`[RunwayGen] Failed to download video:`, e.message);
    throw new Error(`Failed to download Runway video: ${e.message}`);
  }

  console.log(`[RunwayGen] Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB video`);

  // Upload to S3 for permanent storage
  const videoKey = `videos/runway-${Date.now()}-${taskId.substring(0, 8)}.mp4`;
  const { url: s3VideoUrl } = await storagePut(videoKey, videoBuffer, "video/mp4");
  console.log(`[RunwayGen] Uploaded to S3: ${s3VideoUrl}`);

  return {
    videoUrl: s3VideoUrl,
    duration,
    runwayTaskId: taskId,
  };
}

/**
 * Generate video with Runway, with fallback to image generation.
 */
export async function generateRunwayVideoWithFallback(
  options: RunwayVideoOptions,
  fallbackImageGenerator?: () => Promise<{ url?: string }>
): Promise<{
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  isVideo: boolean;
  provider: "runway";
}> {
  try {
    const result = await generateRunwayVideo(options);
    return {
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      isVideo: true,
      provider: "runway",
    };
  } catch (e: any) {
    console.error("[RunwayGen] Video generation failed, falling back to image:", e.message);

    if (fallbackImageGenerator) {
      try {
        const imageResult = await fallbackImageGenerator();
        return {
          videoUrl: undefined,
          thumbnailUrl: imageResult.url,
          duration: options.duration || 5,
          isVideo: false,
          provider: "runway",
        };
      } catch (imgErr: any) {
        console.error("[RunwayGen] Image fallback also failed:", imgErr.message);
      }
    }

    throw new Error(`Runway video generation failed: ${e.message}`);
  }
}
