/**
 * BYOK (Bring Your Own Key) Video Engine
 * 
 * Provider Priority:
 * 1. Pollinations.ai (grok-video) — ALWAYS the default for free users
 * 2. User-provided keys (Runway, Sora, Replicate, fal, Luma, HuggingFace) — ONLY when user explicitly provides their own key
 * 
 * Platform-level Runway/OpenAI keys are NEVER used for video generation automatically.
 * They are reserved for other purposes (LLM scene breakdown, etc.).
 * 
 * Pollinations Key Rotation:
 * - Multiple API keys are rotated round-robin to spread pollen usage
 * - Pollen balance is checked before generation to avoid silent failures
 * - If one key is exhausted, the next key in the pool is tried
 */

import { ENV } from "./env";
import RunwayML, { TaskFailedError } from "@runwayml/sdk";

// ─── Types ───

export type VideoProvider = "runway" | "openai" | "replicate" | "fal" | "luma" | "huggingface" | "pollinations" | "seedance" | "veo3";

export interface UserApiKeys {
  openaiKey?: string | null;
  runwayKey?: string | null;
  replicateKey?: string | null;
  falKey?: string | null;
  lumaKey?: string | null;
  hfToken?: string | null;
  byteplusKey?: string | null;  // BytePlus ModelArk key for SeedDance
  googleAiKey?: string | null;   // Google AI key for Veo 3 video generation
  preferredProvider?: string | null;
}

export interface VideoGenerationRequest {
  prompt: string;
  imageUrl?: string;       // Reference image for image-to-video
  duration?: number;       // Duration in seconds (default 5)
  aspectRatio?: string;    // "16:9", "9:16", "1:1" (default "16:9")
  resolution?: string;     // "720p", "1080p" (default "720p")
  negativePrompt?: string; // What NOT to generate (blur, grain, watermark, etc.)
  seed?: number;           // Seed for reproducible generations
}

export interface VideoGenerationResult {
  provider: VideoProvider;
  videoUrl: string;        // Direct URL to the generated video
  jobId?: string;          // Provider-specific job ID
  durationSeconds?: number;
  thumbnailUrl?: string;
}

// ─── Pollinations Key Rotation Pool ───

const POLLINATIONS_KEY_POOL: string[] = [
  ENV.pollinationsApiKey || "sk_KZ0EBVOHXycDd8YnvEZAvLDGnvhK33SP",
  "sk_FNPdDzSn5ue5VQnUJrBeY7wF2m6nI0ht",
].filter(k => k && k.length > 0);

let pollinationsKeyIndex = 0;

function getNextPollinationsKey(): string {
  if (POLLINATIONS_KEY_POOL.length === 0) return "";
  const key = POLLINATIONS_KEY_POOL[pollinationsKeyIndex % POLLINATIONS_KEY_POOL.length];
  pollinationsKeyIndex++;
  return key;
}

// Check pollen balance for a given key
async function checkPollenBalance(apiKey: string): Promise<{ balance: number; sufficient: boolean }> {
  try {
    // Use the correct gen.pollinations.ai balance endpoint
    const resp = await fetch("https://gen.pollinations.ai/account/balance", {
      headers: { "Authorization": `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return { balance: 0, sufficient: false };
    const data = await resp.json() as any;
    // Response format: { balance: number }
    const balance = data.balance ?? data.pollen?.total ?? 0;
    // grok-video costs ~0.0146 pollen per generation
    return { balance, sufficient: balance >= 0.015 };
  } catch {
    // If we can't check, assume it's fine and let the generation attempt handle errors
    return { balance: -1, sufficient: true };
  }
}

// ─── Provider Detection ───

function getAvailableProviders(keys: UserApiKeys): VideoProvider[] {
  const providers: VideoProvider[] = [];
  // Only add paid providers if user explicitly provides their own key
  if (keys.runwayKey) providers.push("runway");
  if (keys.openaiKey) providers.push("openai");
  if (keys.replicateKey) providers.push("replicate");
  if (keys.falKey) providers.push("fal");
  if (keys.lumaKey) providers.push("luma");
  if (keys.hfToken) providers.push("huggingface");
  if (keys.byteplusKey) providers.push("seedance");
  if (keys.googleAiKey) providers.push("veo3");
  // Pollinations is ALWAYS available as the primary free provider
  providers.push("pollinations");
  return providers;
}

export function selectProvider(keys: UserApiKeys): VideoProvider {
  // If user explicitly set a preferred provider AND provided their own key for it, use it
  if (keys.preferredProvider) {
    const pref = keys.preferredProvider as VideoProvider;
    if (pref === "pollinations") return "pollinations";
    // Only use paid providers if user provided their OWN key (not platform keys)
    const hasOwnKey = (
      (pref === "runway" && keys.runwayKey) ||
      (pref === "openai" && keys.openaiKey) ||
      (pref === "replicate" && keys.replicateKey) ||
      (pref === "fal" && keys.falKey) ||
      (pref === "luma" && keys.lumaKey) ||
      (pref === "huggingface" && keys.hfToken) ||
      (pref === "seedance" && keys.byteplusKey) ||
      (pref === "veo3" && keys.googleAiKey)
    );
    if (hasOwnKey) return pref;
  }

  // Check if user provided ANY of their own paid keys (in priority order)
   if (keys.runwayKey) return "runway";
  if (keys.openaiKey) return "openai";
  if (keys.googleAiKey) return "veo3";
  if (keys.falKey) return "fal";
  if (keys.byteplusKey) return "seedance";
  if (keys.replicateKey) return "replicate";
  if (keys.lumaKey) return "luma";
  if (keys.hfToken) return "huggingface";
  // DEFAULT: Always use Pollinations (free) when user has no keys
  return "pollinations";
}

// ─── Runway ML ───

async function generateWithRunway(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  // Runway SDK requires different endpoints for image-to-video vs text-to-video:
  //   - imageToVideo.create() with gen4_turbo: requires promptImage (HTTPS URL)
  //   - textToVideo.create() with gen4.5: text-only, no image needed
  // gen4_turbo ratio options: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672'
  // gen4.5 ratio options: '1280:720' | '720:1280'
  const hasImage = !!req.imageUrl;
  const ratio16x9 = "1280:720";
  const ratio9x16 = "720:1280";
  const ratio = req.aspectRatio === "9:16" ? ratio9x16 : ratio16x9;
  const duration = 10; // seconds

  // promptText must be a non-empty string of ≤1000 characters
  const promptText = (req.prompt || "cinematic scene").substring(0, 1000).trim() || "cinematic scene";

  const client = new RunwayML({ apiKey: key });

  try {
    let task: any;

    if (hasImage) {
      // Image-to-video: use gen4_turbo via imageToVideo endpoint
      console.log(`[BYOK:Runway] Mode: image-to-video (gen4_turbo) — ref: ${req.imageUrl!.substring(0, 80)}`);
      const createParams: any = {
        model: "gen4_turbo",
        promptImage: req.imageUrl,
        promptText,
        ratio: ratio as any,
        duration,
      };
      if (req.seed !== undefined && req.seed !== null) createParams.seed = req.seed;
      task = await client.imageToVideo.create(createParams);
    } else {
      // Text-to-video: use gen4.5 via textToVideo endpoint (no image required)
      console.log(`[BYOK:Runway] Mode: text-to-video (gen4.5)`);
      const createParams: any = {
        model: "gen4.5",
        promptText,
        ratio: ratio as any,
        duration,
      };
      if (req.seed !== undefined && req.seed !== null) createParams.seed = req.seed;
      task = await (client as any).textToVideo.create(createParams);
    }

    const taskId = (task as any).id;
    if (!taskId) {
      throw new Error(`Runway task creation returned no task ID: ${JSON.stringify(task).substring(0, 200)}`);
    }

    console.log(`[BYOK:Runway] Task submitted: ${taskId} — worker will poll for completion`);
    return { provider: "runway", videoUrl: `runway-pending:${taskId}`, jobId: taskId, durationSeconds: duration };

  } catch (error: any) {
    if (error instanceof TaskFailedError) {
      console.error("[BYOK:Runway] Task failed:", error.taskDetails);
      throw new Error(`Runway video generation failed: ${JSON.stringify(error.taskDetails).substring(0, 300)}`);
    }
    console.error("[BYOK:Runway] Error:", error.message);
    throw new Error(`Runway video generation error: ${error.message}`);
  }
}

// ─── OpenAI Sora ───

async function generateWithOpenAI(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key, baseURL: "https://api.openai.com/v1" });

  // Sora supports up to 20 seconds per clip
  const seconds = String(Math.min(req.duration || 5, 20)) as any;
  const size = req.aspectRatio === "9:16" ? "720x1280" as any : "1280x720" as any;

  const video = await (client as any).videos.create({
    model: "sora-2",
    input: [{ type: "text", text: req.prompt }],
    seconds,
    size,
  });

  console.log(`[BYOK:OpenAI] Video job created: ${video.id}`);

  let result = video;
  const maxWait = 600000;
  const startTime = Date.now();
  while (result.status !== "completed" && Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 5000));
    result = await (client as any).videos.retrieve(result.id);
    console.log(`[BYOK:OpenAI] Job ${result.id} status: ${result.status}`);
    if (result.status === "failed") {
      throw new Error(`Sora generation failed: ${result.error?.message || "Unknown"}`);
    }
  }

  if (result.status !== "completed") {
    throw new Error("Sora generation timed out");
  }

  const downloadResp = await (client as any).videos.content(result.id);
  const chunks: Buffer[] = [];
  for await (const chunk of downloadResp.body) {
    chunks.push(Buffer.from(chunk));
  }
  const videoBuffer = Buffer.concat(chunks);

  const { uploadBufferToS3 } = await import("./s3Upload");
  const videoUrl = await uploadBufferToS3(videoBuffer, `sora-${result.id}.mp4`, "video/mp4");

  return { provider: "openai", videoUrl, jobId: result.id, durationSeconds: parseInt(seconds) };
}

// ─── Replicate ───

async function generateWithReplicate(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  // Wan2.1-T2V-14B: best open-source text-to-video model
  // Supports up to ~20s at 8fps = 161 frames
  const model = "wan-ai/wan2.1-t2v-14b";
  const numFrames = Math.min(Math.max((req.duration || 5) * 8, 16), 161);

  const input: any = {
    prompt: req.prompt,
    num_frames: numFrames,
    guidance_scale: 5.0,
    num_inference_steps: 30,
    fps: 8,
  };

  // Aspect ratio
  if (req.aspectRatio === "9:16") {
    input.width = 480;
    input.height = 848;
  } else if (req.aspectRatio === "1:1") {
    input.width = 480;
    input.height = 480;
  } else {
    input.width = 848;
    input.height = 480;
  }

  if (req.imageUrl) {
    input.image = req.imageUrl;
  }

  const createResp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Replicate API error ${createResp.status}: ${errText}`);
  }

  const prediction = await createResp.json() as any;
  console.log(`[BYOK:Replicate] Prediction created: ${prediction.id} (${numFrames} frames = ~${Math.round(numFrames / 8)}s)`);

  // If already completed (Prefer: wait response)
  if (prediction.status === "succeeded") {
    const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (videoUrl) return { provider: "replicate", videoUrl, jobId: prediction.id, durationSeconds: Math.round(numFrames / 8) };
  }

  const maxWait = 600000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 8000));

    const pollResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    const data = await pollResp.json() as any;

    if (data.status === "succeeded") {
      const videoUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!videoUrl) throw new Error("Replicate succeeded but no output URL");
      return { provider: "replicate", videoUrl, jobId: prediction.id, durationSeconds: Math.round(numFrames / 8) };
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Replicate failed: ${data.error || "Unknown"}`);
    }
    console.log(`[BYOK:Replicate] Prediction ${prediction.id} status: ${data.status}`);
  }
  throw new Error("Replicate prediction timed out after 10 minutes");
}

// ─── fal.ai ───

async function generateWithFal(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  // HunyuanVideo: supports up to ~16s at 8fps (129 frames)
  const model = req.imageUrl ? "fal-ai/hunyuan-video/image-to-video" : "fal-ai/hunyuan-video";
  const numFrames = Math.min(Math.max((req.duration || 5) * 8, 16), 129);
  const actualDuration = Math.round(numFrames / 8);

  const input: any = {
    prompt: req.prompt,
    num_frames: numFrames,
    num_inference_steps: 30,
    aspect_ratio: req.aspectRatio === "9:16" ? "9:16" : "16:9",
    resolution: req.resolution === "1080p" ? "1080p" : "720p",
    enable_safety_checker: false,
  };

  if (req.imageUrl) {
    input.image_url = req.imageUrl;
  }

  console.log(`[BYOK:fal] Submitting ${model} (${numFrames} frames = ~${actualDuration}s)`);

  const submitResp = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!submitResp.ok) {
    const errText = await submitResp.text();
    throw new Error(`fal.ai API error ${submitResp.status}: ${errText}`);
  }

  const submitData = await submitResp.json() as any;
  const requestId = submitData.request_id;
  if (!requestId) throw new Error(`fal.ai: no request_id in response: ${JSON.stringify(submitData)}`);
  console.log(`[BYOK:fal] Request submitted: ${requestId}`);

  const maxWait = 600000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 8000));

    const statusResp = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      headers: { "Authorization": `Key ${key}` },
    });

    if (!statusResp.ok) {
      console.log(`[BYOK:fal] Status check failed (${statusResp.status}), retrying...`);
      continue;
    }

    const statusData = await statusResp.json() as any;

    if (statusData.status === "COMPLETED") {
      const resultResp = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        headers: { "Authorization": `Key ${key}` },
      });
      const resultData = await resultResp.json() as any;
      // Try multiple possible video URL locations in response
      const videoUrl =
        resultData.video?.url ||
        resultData.output?.url ||
        resultData.output?.video?.url ||
        (Array.isArray(resultData.output) ? resultData.output[0] : null);
      if (!videoUrl) throw new Error(`fal.ai completed but no video URL found in: ${JSON.stringify(resultData)}`);
      return { provider: "fal", videoUrl, jobId: requestId, durationSeconds: actualDuration };
    }
    if (statusData.status === "FAILED") {
      throw new Error(`fal.ai failed: ${statusData.error || statusData.detail || "Unknown"}`);
    }
    console.log(`[BYOK:fal] Request ${requestId} status: ${statusData.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
  }
  throw new Error("fal.ai request timed out after 10 minutes");
}

// ─── Luma AI ───

async function generateWithLuma(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const body: any = {
    prompt: req.prompt,
    aspect_ratio: req.aspectRatio === "9:16" ? "9:16" : "16:9",
    loop: false,
  };

  if (req.imageUrl) {
    body.keyframes = { frame0: { type: "image", url: req.imageUrl } };
  }

  const createResp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`Luma API error ${createResp.status}: ${errText}`);
  }

  const createData = await createResp.json() as any;
  const genId = createData.id;
  console.log(`[BYOK:Luma] Generation created: ${genId}`);

  const maxWait = 600000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    await new Promise(r => setTimeout(r, 5000));

    const pollResp = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${genId}`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    const data = await pollResp.json() as any;

    if (data.state === "completed") {
      const videoUrl = data.assets?.video;
      if (!videoUrl) throw new Error("Luma completed but no video URL found");
      return { provider: "luma", videoUrl, jobId: genId, durationSeconds: req.duration || 5 };
    }
    if (data.state === "failed") {
      throw new Error(`Luma failed: ${data.failure_reason || "Unknown"}`);
    }
    console.log(`[BYOK:Luma] Generation ${genId} state: ${data.state}`);
  }
  throw new Error("Luma generation timed out");
}

// ─── Hugging Face ───

async function generateWithHuggingFace(token: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const model = "ali-vilab/text-to-video-ms-1.7b";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token && token !== "free") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const payload = {
    inputs: req.prompt,
    parameters: {
      num_frames: Math.min((req.duration || 5) * 8, 65),
      num_inference_steps: 25,
    },
  };

  const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (resp.status === 503) {
    console.log("[BYOK:HuggingFace] Model is loading, waiting 30s...");
    await new Promise(r => setTimeout(r, 30000));
    return generateWithHuggingFace(token, req);
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HuggingFace API error ${resp.status}: ${errText}`);
  }

  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("video") || contentType.includes("octet-stream")) {
    const videoBuffer = Buffer.from(await resp.arrayBuffer());
    const { uploadBufferToS3 } = await import("./s3Upload");
    const videoUrl = await uploadBufferToS3(videoBuffer, `hf-${Date.now()}.mp4`, "video/mp4");
    return { provider: "huggingface", videoUrl, durationSeconds: req.duration || 5 };
  }

  throw new Error("HuggingFace did not return video data");
}

// ─── Pollinations.ai (FREE — Primary Provider for All Users) ───

async function generateWithPollinations(apiKey: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  // Video models on Pollinations (in order of preference):
  // - grok-video: free with pollen balance
  // - wan: requires pollen balance
  // - ltx-2: requires pollen balance
  const videoModels = ["grok-video", "wan", "ltx-2"];
  
  // Pollinations video max is ~8-10s per clip
  const duration = Math.min(req.duration || 5, 8);
  const encodedPrompt = encodeURIComponent(req.prompt);
  
  // Build query params — use aspectRatio parameter directly (Pollinations supports it)
  const params = new URLSearchParams();
  params.set("duration", String(duration));
  params.set("aspectRatio", req.aspectRatio === "9:16" ? "9:16" : "16:9");

  // Try each key in the rotation pool
  const keysToTry = apiKey ? [apiKey, ...POLLINATIONS_KEY_POOL.filter(k => k !== apiKey)] : POLLINATIONS_KEY_POOL.slice();
  
  for (const model of videoModels) {
    for (const currentKey of keysToTry) {
      try {
        // Check pollen balance before attempting generation
        const { balance, sufficient } = await checkPollenBalance(currentKey);
        if (!sufficient && balance >= 0) {
          console.log(`[BYOK:Pollinations] Key ${currentKey.slice(0, 8)}... has insufficient pollen (${balance}), trying next key`);
          continue;
        }

        console.log(`[BYOK:Pollinations] Trying model: ${model} with key ${currentKey.slice(0, 8)}... (balance: ${balance})`);
        params.set("model", model);
        
        // CORRECT API URL: /video/{prompt} — this is the video generation endpoint
        const url = `https://gen.pollinations.ai/video/${encodedPrompt}?${params.toString()}`;
        
        const headers: Record<string, string> = {};
        if (currentKey) {
          headers["Authorization"] = `Bearer ${currentKey}`;
        }
        
        const resp = await fetch(url, {
          method: "GET",
          headers,
          // Pollinations can take a while for video generation
          signal: AbortSignal.timeout(300000), // 5 minute timeout
        });

        if (resp.status === 402) {
          console.log(`[BYOK:Pollinations] Key ${currentKey.slice(0, 8)}... has insufficient pollen (402), trying next key`);
          continue; // Try next key
        }

        if (resp.status === 401) {
          console.log(`[BYOK:Pollinations] Key ${currentKey.slice(0, 8)}... is invalid (401), trying next key`);
          continue; // Try next key
        }

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "Unknown error");
          console.log(`[BYOK:Pollinations] Model ${model} failed (${resp.status}): ${errText}`);
          continue; // Try next model/key
        }

        const contentType = resp.headers.get("content-type") || "";
        
        // Check if we got a redirect URL or direct video
        if (contentType.includes("video") || contentType.includes("octet-stream")) {
          // Direct video binary response
          const videoBuffer = Buffer.from(await resp.arrayBuffer());
          if (videoBuffer.length < 1000) {
            console.log(`[BYOK:Pollinations] Model ${model} returned too-small response (${videoBuffer.length} bytes), skipping`);
            continue;
          }
          const { uploadBufferToS3 } = await import("./s3Upload");
          const videoUrl = await uploadBufferToS3(videoBuffer, `pollinations-${model}-${Date.now()}.mp4`, "video/mp4");
          console.log(`[BYOK:Pollinations] Video generated successfully with ${model} (${videoBuffer.length} bytes)`);
          return { provider: "pollinations", videoUrl, durationSeconds: duration };
        }
        
        // Some models return a JSON with a URL
        if (contentType.includes("json")) {
          const data = await resp.json() as any;
          if (data.url || data.video_url || data.output) {
            const videoUrl = data.url || data.video_url || data.output;
            console.log(`[BYOK:Pollinations] Video URL received from ${model}: ${videoUrl}`);
            return { provider: "pollinations", videoUrl, durationSeconds: duration };
          }
        }

        // If the response URL itself is the video (redirect)
        if (resp.url && resp.url !== url) {
          console.log(`[BYOK:Pollinations] Redirected to video URL: ${resp.url}`);
          return { provider: "pollinations", videoUrl: resp.url, durationSeconds: duration };
        }

        console.log(`[BYOK:Pollinations] Model ${model} returned unexpected content-type: ${contentType}`);
      } catch (err: any) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
          console.log(`[BYOK:Pollinations] Model ${model} timed out with key ${currentKey.slice(0, 8)}...`);
        } else {
          console.log(`[BYOK:Pollinations] Model ${model} error with key ${currentKey.slice(0, 8)}...: ${err.message}`);
        }
      }
    }
  }

  throw new Error(
    "Video generation failed: All Pollinations API keys have insufficient pollen balance. " +
    "Pollen refreshes weekly on Monday. To generate videos now, you can: " +
    "(1) Wait for your pollen to refresh, " +
    "(2) Purchase pollen at enter.pollinations.ai, or " +
    "(3) Provide your own Runway/Sora API key in Settings for premium video generation."
  );
}

// ─── BytePlus ModelArk (SeedDance) ───

/**
 * Generate video using BytePlus ModelArk SeedDance API.
 * Uses async job submission + polling pattern.
 * 
 * SeedDance 2.0 API is not yet available — using Seedance 1.5 Pro (latest available).
 * The model field will be updated to seedance-2-0 when BytePlus enables it.
 * 
 * API Docs: https://docs.byteplus.com/en/docs/ModelArk/Video_Generation_API
 */
async function generateWithSeedance(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const BYTEPLUS_API_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
  // SeedDance 1.5 Pro supports 5s or 10s; snap to nearest valid value
  const rawDuration = req.duration || 5;
  const duration = rawDuration >= 8 ? 10 : 5;

  // Select model — Seedance 1.5 Pro is the latest available via API
  // Will be upgraded to seedance-2-0 when BytePlus enables it
  const model = "seedance-1-5-pro-251215";

  // Build content array
  const content: any[] = [
    { type: "text", text: req.prompt },
  ];

  // Add image for image-to-video if provided
  if (req.imageUrl) {
    content.push({
      type: "image_url",
      image_url: { url: req.imageUrl },
    });
  }

  // Map aspect ratio to SeedDance resolution parameter
  const resolution = req.aspectRatio === "9:16" ? "720p" : req.resolution === "1080p" ? "1080p" : "720p";

  const createResp = await fetch(`${BYTEPLUS_API_BASE}/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      content,
      parameters: {
        resolution,
        duration: `${duration}s`,
        aspect_ratio: req.aspectRatio || "16:9",
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!createResp.ok) {
    const errText = await createResp.text();
    throw new Error(`SeedDance API error ${createResp.status}: ${errText}`);
  }

  const createData = await createResp.json() as any;
  const taskId = createData.id;
  if (!taskId) throw new Error(`SeedDance: no task ID in response: ${JSON.stringify(createData)}`);
  console.log(`[BYOK:SeedDance] Task created: ${taskId} (model: ${model})`);

  // Poll for completion
  const videoUrl = await pollSeedanceTask(key, taskId, BYTEPLUS_API_BASE);
  return { provider: "seedance", videoUrl, jobId: taskId, durationSeconds: duration };
}

async function pollSeedanceTask(key: string, taskId: string, apiBase: string, maxWaitMs = 600000): Promise<string> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, 8000)); // SeedDance typically takes 30-120s

    const resp = await fetch(`${apiBase}/contents/generations/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      console.log(`[BYOK:SeedDance] Poll error ${resp.status}, retrying...`);
      continue;
    }

    const data = await resp.json() as any;
    const status = data.status;

    if (status === "succeeded") {
      // Extract video URL from response
      const videoUrl =
        data.content?.[0]?.video_url ||
        data.content?.[0]?.url ||
        data.output?.[0]?.url ||
        data.output?.video_url;
      if (!videoUrl) throw new Error(`SeedDance task succeeded but no video URL found in: ${JSON.stringify(data)}`);
      console.log(`[BYOK:SeedDance] Task ${taskId} completed: ${videoUrl}`);
      return videoUrl;
    }

    if (status === "failed") {
      throw new Error(`SeedDance task failed: ${data.error?.message || data.failure || "Unknown error"}`);
    }

    if (status === "expired") {
      throw new Error("SeedDance task expired — exceeded maximum wait time");
    }

    console.log(`[BYOK:SeedDance] Task ${taskId} status: ${status}`);
  }
  throw new Error("SeedDance task timed out after 10 minutes");
}

// ─── Google Veo 3 (via Gemini API) ───
/**
 * Generate video using Google Veo 3.1 via the Gemini API.
 * Uses the generativelanguage.googleapis.com REST endpoint.
 * Returns a pending sentinel — the videoJobWorker polls the operation name.
 */
export async function generateWithVeo3(key: string, req: VideoGenerationRequest): Promise<VideoGenerationResult> {
  const aspectRatio = req.aspectRatio === "9:16" ? "9:16" : "16:9";
  const model = "veo-3.1-generate-preview";
  const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${key}`;

  const body: any = {
    instances: [{ prompt: req.prompt }],
    parameters: {
      aspectRatio,
      durationSeconds: 8,
      personGeneration: "allow_all",
    },
  };

  // Image-to-video: include the reference image as base64 or URL
  if (req.imageUrl) {
    body.instances[0].image = { url: req.imageUrl };
    console.log(`[BYOK:Veo3] Mode: image-to-video with ref: ${req.imageUrl.substring(0, 80)}`);
  } else {
    console.log(`[BYOK:Veo3] Mode: text-to-video`);
  }

  console.log(`[BYOK:Veo3] Submitting Veo 3.1 job: "${req.prompt.substring(0, 100)}..."`);

  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    // Parse quota/billing errors for a cleaner message
    if (resp.status === 429 || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("quota")) {
      throw new Error(`Veo3 quota exceeded — recharge at aistudio.google.com`);
    }
    if (resp.status === 400) {
      // Try to extract the specific validation message
      try {
        const errJson = JSON.parse(errText);
        const msg = errJson?.error?.message || errText.substring(0, 200);
        throw new Error(`Veo3 request error: ${msg}`);
      } catch (e: any) {
        if (e.message.startsWith("Veo3")) throw e;
      }
    }
    throw new Error(`Veo3 API error ${resp.status}: ${errText.substring(0, 200)}`);
  }

  const data = await resp.json() as any;
  const operationName = data.name;
  if (!operationName) {
    throw new Error(`Veo 3: no operation name in response: ${JSON.stringify(data).substring(0, 200)}`);
  }

  console.log(`[BYOK:Veo3] Operation submitted: ${operationName} — worker will poll for completion`);

  // Return a sentinel URL — the job worker will replace this with the real video URL
  return { provider: "veo3", videoUrl: `veo3-pending:${operationName}`, jobId: operationName, durationSeconds: 8 };
}

// ─── Main Entry Point ───

export async function generateVideo(
  keys: UserApiKeys,
  req: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  // Build the ordered list of providers to try, starting with the preferred one
  // and cascading through ALL available providers until one succeeds.
  const preferred = selectProvider(keys);
  console.log(`[BYOK] Selected provider: ${preferred}`);

  // Build key map
  const keyMap: Record<VideoProvider, string | null | undefined> = {
    runway: keys.runwayKey || null,
    openai: keys.openaiKey || null,
    replicate: keys.replicateKey || null,
    fal: keys.falKey || null,
    luma: keys.lumaKey || null,
    huggingface: keys.hfToken || "free",
    seedance: keys.byteplusKey || null,
    veo3: keys.googleAiKey || null,
    pollinations: getNextPollinationsKey(),
  };

  const providerFunctions: Record<VideoProvider, (key: string, req: VideoGenerationRequest) => Promise<VideoGenerationResult>> = {
    runway: generateWithRunway,
    openai: generateWithOpenAI,
    replicate: generateWithReplicate,
    fal: generateWithFal,
    luma: generateWithLuma,
    huggingface: generateWithHuggingFace,
    seedance: generateWithSeedance,
    veo3: generateWithVeo3,
    pollinations: generateWithPollinations,
  };

  // Build ordered cascade: preferred first, then all others with keys, then pollinations last
  const allOrdered: VideoProvider[] = ["runway", "veo3", "openai", "fal", "seedance", "replicate", "luma", "huggingface", "pollinations"];
  const cascade: { provider: VideoProvider; key: string }[] = [];

  // Add preferred first
  const prefKey = keyMap[preferred];
  if (prefKey) cascade.push({ provider: preferred, key: prefKey });

  // Add all others that have keys (skip preferred to avoid duplicates)
  for (const p of allOrdered) {
    if (p === preferred) continue;
    const k = p === "pollinations" ? getNextPollinationsKey() : keyMap[p];
    if (k) cascade.push({ provider: p, key: k });
  }

  // Always ensure pollinations is in the list as final fallback
  if (!cascade.find(c => c.provider === "pollinations")) {
    cascade.push({ provider: "pollinations", key: getNextPollinationsKey() });
  }

  const errors: string[] = [];

  for (const { provider, key } of cascade) {
    try {
      console.log(`[BYOK] Trying provider: ${provider}`);
      const result = await providerFunctions[provider](key, req);
      if (provider !== preferred) {
        console.log(`[BYOK] Succeeded with fallback provider: ${provider}`);
      }
      return result;
    } catch (err: any) {
      const msg = err.message || String(err);
      console.error(`[BYOK:${provider}] Failed: ${msg}`);
      errors.push(`${provider}: ${msg}`);
      // Continue to next provider
    }
  }

  // All providers exhausted — build a short summary
  const shortErrors = errors.map(e => {
    // Truncate each error to 120 chars
    return e.length > 120 ? e.substring(0, 117) + "..." : e;
  });
  throw new Error(
    `Video generation failed — all providers exhausted:\n` +
    shortErrors.map(e => `  • ${e}`).join("\n")
  );
}

// ─── Provider Info (for frontend display) ───

export interface ProviderInfo {
  id: VideoProvider;
  name: string;
  description: string;
  keyPrefix: string;
  signupUrl: string;
  pricing: string;
  models: string;
}

export const VIDEO_PROVIDERS: ProviderInfo[] = [
  {
    id: "pollinations",
    name: "Pollinations.ai (Free)",
    description: "Free AI video generation using grok-video. Default for all users. No API key needed.",
    keyPrefix: "sk_",
    signupUrl: "https://pollinations.ai",
    pricing: "FREE — 1.5 pollen/week on Spore tier. No credit card required.",
    models: "Grok-Video (free with daily pollen grant)",
  },
  {
    id: "runway",
    name: "Runway ML",
    description: "Industry-leading AI video generation. Best quality and consistency. Bring your own key.",
    keyPrefix: "key_",
    signupUrl: "https://app.runwayml.com/settings/api-keys",
    pricing: "From $12/mo (Standard). ~$0.05-0.10 per second of video.",
    models: "Gen-4 Turbo, Gen-3 Alpha",
  },
  {
    id: "openai",
    name: "OpenAI (Sora)",
    description: "OpenAI's Sora video model. Requires Plus/Pro subscription. Bring your own key.",
    keyPrefix: "sk-",
    signupUrl: "https://platform.openai.com/api-keys",
    pricing: "Requires OpenAI Plus ($20/mo) or Pro ($200/mo) for Sora access.",
    models: "Sora 2, Sora 2 Pro",
  },
  {
    id: "fal",
    name: "fal.ai",
    description: "Fast and affordable. Supports HunyuanVideo, Veo3, LTX-Video. Bring your own key.",
    keyPrefix: "",
    signupUrl: "https://fal.ai/dashboard/keys",
    pricing: "Pay-per-use. ~$0.40 per video clip.",
    models: "HunyuanVideo, Google Veo 3, LTX-Video",
  },
  {
    id: "replicate",
    name: "Replicate",
    description: "Run open-source video models in the cloud. Great for Wan2.1. Bring your own key.",
    keyPrefix: "r8_",
    signupUrl: "https://replicate.com/account/api-tokens",
    pricing: "Pay-per-use. Free tier available for some models.",
    models: "Wan2.1, CogVideoX, Stable Video Diffusion",
  },
  {
    id: "luma",
    name: "Luma AI",
    description: "Dream Machine video generation. Great for cinematic content. Bring your own key.",
    keyPrefix: "",
    signupUrl: "https://lumalabs.ai/dream-machine/api",
    pricing: "Pay-per-use. Free trial credits available.",
    models: "Dream Machine 1.5, Dream Machine 2",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "Free inference API with open-source models. Limited but free.",
    keyPrefix: "hf_",
    signupUrl: "https://huggingface.co/settings/tokens",
    pricing: "FREE tier: 300 requests/hour. Pro: $9/mo for more.",
    models: "LTX-Video, Wan2.1, HunyuanVideo (via providers)",
  },
  {
    id: "seedance",
    name: "SeedDance (BytePlus ModelArk)",
    description: "ByteDance's cinematic AI video model. Exceptional motion quality and semantic understanding. Bring your own BytePlus API key.",
    keyPrefix: "",
    signupUrl: "https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey",
    pricing: "Pay-per-use via BytePlus ModelArk. ~$0.10-0.30 per video clip.",
    models: "Seedance 1.5 Pro (API available now) · Seedance 2.0 (coming soon — will auto-upgrade)",
  },
  {
    id: "veo3",
    name: "Google Veo 3 (Gemini API)",
    description: "Google's state-of-the-art video model with native audio. Generates 8-second 720p–4K videos with stunning realism. Bring your own Gemini API key.",
    keyPrefix: "AIza",
    signupUrl: "https://aistudio.google.com/apikey",
    pricing: "Pay-per-use via Google AI Studio. ~$0.35 per video (720p 8s).",
    models: "Veo 3.1 Preview — text-to-video, image-to-video, native audio",
  },
];

export function getProviderInfo(id: VideoProvider): ProviderInfo | undefined {
  return VIDEO_PROVIDERS.find(p => p.id === id);
}

export function validateApiKey(provider: VideoProvider, key: string): { valid: boolean; message: string } {
  if (provider === "pollinations") {
    return { valid: true, message: "Pollinations is free — no key validation needed" };
  }
  
  if (!key || key.trim().length === 0) {
    return { valid: false, message: "API key cannot be empty" };
  }

  const info = getProviderInfo(provider);
  if (!info) return { valid: false, message: "Unknown provider" };

  switch (provider) {
    case "runway":
      if (!key.startsWith("key_")) return { valid: false, message: "Runway keys must start with 'key_'" };
      break;
    case "openai":
      if (!key.startsWith("sk-")) return { valid: false, message: "OpenAI keys must start with 'sk-'" };
      break;
    case "replicate":
      if (!key.startsWith("r8_")) return { valid: false, message: "Replicate keys must start with 'r8_'" };
      break;
    case "huggingface":
      if (!key.startsWith("hf_")) return { valid: false, message: "Hugging Face tokens must start with 'hf_'" };
      break;
    case "veo3":
      if (!key.startsWith("AIza")) return { valid: false, message: "Gemini API keys must start with 'AIza'" };
      break;
    case "seedance":
      // BytePlus API keys don't have a fixed prefix — just check it's non-empty
      if (key.length < 10) return { valid: false, message: "BytePlus API key appears too short" };
      break;
  }

  return { valid: true, message: "Key format looks valid" };
}
