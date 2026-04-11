/**
 * Video Job Worker — Persistent Background Processor
 *
 * Problem: Railway kills Node.js processes on redeploy, causing Runway jobs
 * that use waitForTaskOutput() to die mid-generation, leaving scenes stuck
 * in "generating" status forever.
 *
 * Solution: Two-phase approach:
 * 1. SUBMIT — Create Runway task, store task ID + all params in DB immediately
 * 2. POLL   — This worker runs on startup and every 15s, polling Runway for
 *             any pending task IDs and completing them.
 *
 * On Railway restart, the worker picks up all pending task IDs from the DB
 * and resumes polling — no generation is ever lost.
 */

import RunwayML, { TaskFailedError } from "@runwayml/sdk";
import * as db from "../db";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Types ───

export interface RunwayJobMetadata {
  runwayTaskId: string;
  runwayApiKey: string;
  sceneId: number;
  projectId: number;
  userId: number;
  prompt: string;
  imageUrl?: string;
  negativePrompt?: string;
  seed?: number;
  ratio: string;
  duration: number;
  referenceImages?: string[];
  aiPromptOverride?: string;
}

// ─── Veo 3 Job Metadata ───

export interface Veo3JobMetadata {
  veo3OperationName: string;
  veo3ApiKey: string;
  sceneId: number;
  projectId: number;
  userId: number;
  prompt: string;
  imageUrl?: string;
}

// ─── fal.ai Job Metadata ───

export interface FalJobMetadata {
  falRequestId: string;
  falModel: string;
  falApiKey: string;
  sceneId: number;
  projectId: number;
  userId: number;
  prompt: string;
  imageUrl?: string;
}

// ─── Poll a single Veo 3 operation ───

async function pollVeo3Operation(apiKey: string, operationName: string): Promise<{
  status: "running" | "succeeded" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[VideoWorker:Veo3] Poll returned ${resp.status}: ${errText.substring(0, 200)}`);
      return { status: "running" }; // Treat HTTP errors as still running
    }
    const data = await resp.json() as any;
    if (!data.done) return { status: "running" };
    if (data.error) {
      return { status: "failed", error: data.error?.message || JSON.stringify(data.error) };
    }
    // Extract video URI from response
    const generatedVideos = data.response?.generateVideoResponse?.generatedSamples
      || data.response?.videos
      || data.response?.generatedVideos
      || [];
    const videoUri = generatedVideos[0]?.video?.uri
      || generatedVideos[0]?.uri
      || generatedVideos[0]?.videoUri;
    if (!videoUri) {
      return { status: "failed", error: `No video URI in response: ${JSON.stringify(data.response).substring(0, 300)}` };
    }
    return { status: "succeeded", videoUrl: videoUri };
  } catch (err: any) {
    console.warn(`[VideoWorker:Veo3] Poll error (treating as running):`, err.message);
    return { status: "running" };
  }
}

// ─── Download and store a completed Veo 3 video ───

async function processCompletedVeo3Video(
  veoVideoUri: string,
  apiKey: string,
  meta: Veo3JobMetadata
): Promise<string> {
  console.log(`[VideoWorker:Veo3] Downloading video for scene ${meta.sceneId}...`);
  // Veo 3 videos are served from Google's Files API — append key for auth
  const downloadUrl = veoVideoUri.includes("?")
    ? `${veoVideoUri}&key=${apiKey}`
    : `${veoVideoUri}?key=${apiKey}`;
  const resp = await fetch(downloadUrl, { signal: AbortSignal.timeout(120000) });
  if (!resp.ok) throw new Error(`Failed to download Veo 3 video: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const s3Key = `scenes/${meta.projectId}/scene-${meta.sceneId}-veo3-${Date.now()}.mp4`;
  let url: string;
  try {
    const result = await storagePut(s3Key, buffer, "video/mp4");
    url = result.url;
  } catch (storageErr: any) {
    console.warn(`[VideoWorker:Veo3] Storage unavailable (${storageErr.message}), using raw CDN URL`);
    url = downloadUrl;
  }
  console.log(`[VideoWorker:Veo3] Video uploaded to S3: ${url}`);
  return url;
}

// ─── Submit a Runway job (non-blocking) ───

/**
 * Submit a Runway Gen-4 Turbo job and return the task ID immediately.
 * The task ID is stored in the DB so the worker can poll it after restarts.
 */
export async function submitRunwayJob(
  apiKey: string,
  params: {
    prompt: string;
    imageUrl?: string;
    negativePrompt?: string;
    seed?: number;
    aspectRatio?: string;
  }
): Promise<string> {
  const ratio = params.aspectRatio === "9:16" ? "720:1280" : "1280:720";
  const duration = 10;

  const client = new RunwayML({ apiKey });

  // Runway API enforces a 1000-character limit on promptText — truncate to avoid 400 errors
  const truncatedPrompt = params.prompt.length > 1000 ? params.prompt.substring(0, 997) + "..." : params.prompt;

  const createParams: any = {
    model: "gen4_turbo",
    promptText: truncatedPrompt,
    ratio: ratio as any,
    duration,
  };

  if (params.imageUrl) {
    createParams.promptImage = params.imageUrl;
    console.log(`[VideoWorker] Runway image-to-video: ${params.imageUrl.substring(0, 80)}`);
  }

  if (params.negativePrompt) {
    createParams.negativePrompt = params.negativePrompt;
  }

  if (params.seed !== undefined && params.seed !== null) {
    createParams.seed = params.seed;
  }

  console.log(`[VideoWorker] Submitting Runway job: "${params.prompt.substring(0, 100)}..."`);

  // Create the task — returns immediately with a task ID
  // Use imageToVideo (gen4_turbo) only when an image is provided; otherwise use textToVideo (gen4.5)
  let task: any;
  if (params.imageUrl) {
    task = await client.imageToVideo.create(createParams);
  } else {
    // Text-to-video: use gen4.5 model via textToVideo endpoint (no promptImage required)
    const textParams: any = {
      model: "gen4.5",
      promptText: createParams.promptText,
      ratio: createParams.ratio,
      duration: createParams.duration,
    };
    if (createParams.seed !== undefined) textParams.seed = createParams.seed;
    console.log(`[VideoWorker] Runway text-to-video (gen4.5) — no image provided`);
    task = await (client as any).textToVideo.create(textParams);
  }

  const taskId = (task as any).id;

  if (!taskId) {
    throw new Error(`Runway task creation returned no task ID: ${JSON.stringify(task).substring(0, 200)}`);
  }

  console.log(`[VideoWorker] Runway task submitted: ${taskId}`);
  return taskId;
}

// ─── Poll a single Runway task ───

async function pollRunwayTask(apiKey: string, taskId: string): Promise<{
  status: "running" | "succeeded" | "failed";
  videoUrl?: string;
  error?: string;
}> {
  const client = new RunwayML({ apiKey });

  try {
    const task = await (client as any).tasks.retrieve(taskId);
    const status = task.status as string;

    if (status === "SUCCEEDED" || status === "succeeded") {
      const videoUrl = task.output?.[0] || task.output?.video || task.output;
      if (videoUrl && typeof videoUrl === "string") {
        return { status: "succeeded", videoUrl };
      }
      return { status: "failed", error: `Task succeeded but no video URL: ${JSON.stringify(task).substring(0, 200)}` };
    }

    if (status === "FAILED" || status === "failed") {
      return { status: "failed", error: `Runway task failed: ${JSON.stringify(task.failure || task.error || task).substring(0, 200)}` };
    }

    // Still running
    return { status: "running" };
  } catch (err: any) {
    console.error(`[VideoWorker] Error polling task ${taskId}:`, err.message);
    return { status: "running" }; // Treat poll errors as "still running" to avoid false failures
  }
}

// ─── Extract last frame from video ───

async function extractLastFrame(videoUrl: string, projectId: number, sceneId: number): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-frame-"));
  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl);
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    const framePath = path.join(tmpDir, "last_frame.jpg");
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_format", videoPath,
    ], { timeout: 15000 });
    const info = JSON.parse(probeOut);
    const duration = parseFloat(info.format?.duration || "0");
    if (duration <= 0) return undefined;

    const seekTime = Math.max(0, duration - 0.1);
    await execFileAsync("ffmpeg", [
      "-ss", String(seekTime), "-i", videoPath,
      "-vframes", "1", "-q:v", "2", "-y", framePath,
    ], { timeout: 15000 });

     const frameBuffer = await fs.promises.readFile(framePath);
    const key = `frames/${projectId}/scene-${sceneId}-lastframe-${Date.now()}.jpg`;
    try {
      const { url } = await storagePut(key, frameBuffer, "image/jpeg");
      return url;
    } catch {
      return undefined; // Storage unavailable — skip frame upload
    }
  } catch {
    return undefined;
  } finally {
    try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
// ─── Process a completed Runway video ───

async function processCompletedVideo(
  runwayVideoUrl: string,
  meta: RunwayJobMetadata
): Promise<string> {
  // Download the Runway video and re-upload to our S3/CloudFront
  console.log(`[VideoWorker] Downloading Runway video for scene ${meta.sceneId}...`);
  const resp = await fetch(runwayVideoUrl);
  if (!resp.ok) throw new Error(`Failed to download Runway video: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());

  const key = `scenes/${meta.projectId}/scene-${meta.sceneId}-${Date.now()}.mp4`;
  let url: string;
  try {
    const result = await storagePut(key, buffer, "video/mp4");
    url = result.url;
  } catch (storageErr: any) {
    console.warn(`[VideoWorker] Storage unavailable (${storageErr.message}), using raw Runway CDN URL`);
    url = runwayVideoUrl;
  }
  console.log(`[VideoWorker] Video uploaded to S3: ${url}`);
  return url;
}

// ─── Main Worker Loop ───

let workerRunning = false;
const POLL_INTERVAL_MS = 15_000; // Poll every 15 seconds

async function runWorkerCycle() {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const dbConn = await getDb();
    if (!dbConn) return;

    // Find all generation jobs with status "processing" (these have a Runway task ID)
    const pendingJobs = await dbConn.execute(
      sql.raw(`SELECT * FROM generationJobs WHERE status = 'processing' AND type = 'scene' ORDER BY createdAt ASC LIMIT 20`)
    );

    const jobs = (pendingJobs as any)[0] as any[];
    if (!jobs || jobs.length === 0) return;

    console.log(`[VideoWorker] Found ${jobs.length} pending job(s) to poll (Runway + Veo 3)`);

    for (const job of jobs) {
      try {
        // Parse metadata: raw SQL returns JSON columns as strings; Drizzle ORM returns objects.
        // Normalise to always work with a parsed object so property access works correctly.
        const meta: any = typeof job.metadata === "string"
          ? (() => { try { return JSON.parse(job.metadata); } catch { return {}; } })()
          : (job.metadata ?? {});

        // ─── Veo 3 Job ───
        if (meta?.veo3OperationName) {
          if (!meta.veo3ApiKey) {
            console.warn(`[VideoWorker:Veo3] Job ${job.id} missing API key — marking failed`);
            await db.updateJob(job.id, { status: "failed", errorMessage: "Missing Veo 3 API key" });
            await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            continue;
          }
          const veo3Result = await pollVeo3Operation(meta.veo3ApiKey, meta.veo3OperationName);
          if (veo3Result.status === "running") {
            const createdAt = new Date(job.createdAt).getTime();
            const ageMs = Date.now() - createdAt;
            if (ageMs > 20 * 60 * 1000) {
              console.warn(`[VideoWorker:Veo3] Job ${job.id} timed out after ${Math.round(ageMs / 60000)}min`);
              await db.updateJob(job.id, { status: "failed", errorMessage: "Veo 3 operation timed out after 20 minutes" });
              await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            }
            continue;
          }
          if (veo3Result.status === "failed") {
            console.error(`[VideoWorker:Veo3] Operation ${meta.veo3OperationName} failed: ${veo3Result.error}`);
            await db.updateJob(job.id, { status: "failed", errorMessage: veo3Result.error });
            await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            continue;
          }
          // Succeeded!
          console.log(`[VideoWorker:Veo3] Operation ${meta.veo3OperationName} succeeded! Processing video...`);
          const veo3FinalUrl = await processCompletedVeo3Video(veo3Result.videoUrl!, meta.veo3ApiKey, meta as Veo3JobMetadata);
          const veo3Thumbnail = await extractLastFrame(veo3FinalUrl, meta.projectId, meta.sceneId);
          await db.updateScene(meta.sceneId, {
            videoUrl: veo3FinalUrl,
            status: "completed",
            ...(veo3Thumbnail ? { thumbnailUrl: veo3Thumbnail } : {}),
          } as any);
          await db.updateJob(job.id, { status: "completed", resultUrl: veo3FinalUrl, progress: 100 });
          try {
            await db.createNotification({
              userId: meta.userId,
              type: "generation_complete",
              title: "Veo 3 video ready!",
              message: `Your Veo 3 scene video is ready.`,
              link: `/projects/${meta.projectId}/scenes`,
            });
          } catch { /* ignore */ }
          console.log(`[VideoWorker:Veo3] Scene ${meta.sceneId} completed: ${veo3FinalUrl}`);
          continue;
        }

        // ─── fal.ai Job ───
        if (meta?.falRequestId) {
          if (!meta.falApiKey || !meta.falModel) {
            console.warn(`[VideoWorker:fal] Job ${job.id} missing fal.ai API key or model — marking failed`);
            await db.updateJob(job.id, { status: "failed", errorMessage: "Missing fal.ai API key or model" });
            await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            continue;
          }
          const { pollFalRequest } = await import("./byokVideoEngine");
          const falResult = await pollFalRequest(meta.falApiKey, meta.falRequestId, meta.falModel);
          if (falResult.status === "running") {
            const createdAt = new Date(job.createdAt).getTime();
            const ageMs = Date.now() - createdAt;
            if (ageMs > 20 * 60 * 1000) {
              console.warn(`[VideoWorker:fal] Job ${job.id} timed out after ${Math.round(ageMs / 60000)}min`);
              await db.updateJob(job.id, { status: "failed", errorMessage: "fal.ai request timed out after 20 minutes" });
              await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            }
            continue;
          }
          if (falResult.status === "failed") {
            console.error(`[VideoWorker:fal] Request ${meta.falRequestId} failed: ${falResult.error}`);
            await db.updateJob(job.id, { status: "failed", errorMessage: falResult.error });
            await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
            continue;
          }
          // Succeeded! Download and store the video
          console.log(`[VideoWorker:fal] Request ${meta.falRequestId} succeeded! Processing video...`);
          let falFinalUrl = falResult.videoUrl!;
          try {
            const falResp = await fetch(falFinalUrl, { signal: AbortSignal.timeout(120000) });
            if (falResp.ok) {
              const buffer = Buffer.from(await falResp.arrayBuffer());
              const s3Key = `scenes/${meta.projectId}/scene-${meta.sceneId}-fal-${Date.now()}.mp4`;
              try {
                const result = await storagePut(s3Key, buffer, "video/mp4");
                falFinalUrl = result.url;
              } catch (storageErr: any) {
                console.warn(`[VideoWorker:fal] Storage unavailable (${storageErr.message}), using raw fal CDN URL`);
              }
            }
          } catch (dlErr: any) {
            console.warn(`[VideoWorker:fal] Video download failed (${dlErr.message}), using raw CDN URL`);
          }
          const falThumbnail = await extractLastFrame(falFinalUrl, meta.projectId, meta.sceneId);
          await db.updateScene(meta.sceneId, {
            videoUrl: falFinalUrl,
            status: "completed",
            ...(falThumbnail ? { thumbnailUrl: falThumbnail } : {}),
          } as any);
          await db.updateJob(job.id, { status: "completed", resultUrl: falFinalUrl, progress: 100 });
          try {
            await db.createNotification({
              userId: meta.userId,
              type: "generation_complete",
              title: "fal.ai video ready!",
              message: `Your scene video is ready.`,
              link: `/projects/${meta.projectId}/scenes`,
            });
          } catch { /* ignore */ }
          console.log(`[VideoWorker:fal] Scene ${meta.sceneId} completed: ${falFinalUrl}`);
          continue;
        }

        // ─── Runway Job ───
        if (!meta?.runwayTaskId || !meta?.runwayApiKey) {
          console.warn(`[VideoWorker] Job ${job.id} missing Runway task ID or API key — marking failed`);
          await db.updateJob(job.id, { status: "failed", errorMessage: "Missing Runway task ID" });
          await db.updateScene(meta?.sceneId, { status: "failed" } as any).catch(() => {});
          continue;
        }

        const result = await pollRunwayTask(meta.runwayApiKey, meta.runwayTaskId);

        if (result.status === "running") {
          // Still running — check if it's been more than 15 minutes (timeout)
          const createdAt = new Date(job.createdAt).getTime();
          const ageMs = Date.now() - createdAt;
          if (ageMs > 15 * 60 * 1000) {
            console.warn(`[VideoWorker] Job ${job.id} (task ${meta.runwayTaskId}) timed out after ${Math.round(ageMs / 60000)}min`);
            await db.updateJob(job.id, { status: "failed", errorMessage: "Runway task timed out after 15 minutes" });
            await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
          }
          // Otherwise just skip — will be polled again next cycle
          continue;
        }

        if (result.status === "failed") {
          console.error(`[VideoWorker] Runway task ${meta.runwayTaskId} failed: ${result.error}`);
          await db.updateJob(job.id, { status: "failed", errorMessage: result.error });
          await db.updateScene(meta.sceneId, { status: "failed" } as any).catch(() => {});
          continue;
        }

        // Succeeded! Process the video
        console.log(`[VideoWorker] Runway task ${meta.runwayTaskId} succeeded! Processing video...`);
        const finalVideoUrl = await processCompletedVideo(result.videoUrl!, meta);

        // Extract thumbnail (last frame for continuity)
        const thumbnailUrl = await extractLastFrame(finalVideoUrl, meta.projectId, meta.sceneId);

        // Update scene with completed video
        await db.updateScene(meta.sceneId, {
          videoUrl: finalVideoUrl,
          status: "completed",
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        } as any);

        // Update job as completed
        await db.updateJob(job.id, { status: "completed", resultUrl: finalVideoUrl, progress: 100 });

        // Auto-set project thumbnail if none
        try {
          if (thumbnailUrl) {
            const project = await dbConn.execute(sql.raw(`SELECT id, thumbnailUrl FROM projects WHERE id = ${meta.projectId} LIMIT 1`));
            const proj = (project as any)[0]?.[0];
            if (proj && !proj.thumbnailUrl) {
              await dbConn.execute(sql.raw(`UPDATE projects SET thumbnailUrl = '${thumbnailUrl.replace(/'/g, "\\'")}' WHERE id = ${meta.projectId}`));
            }
          }
        } catch { /* ignore */ }

        // Send notification to user
        try {
          await db.createNotification({
            userId: meta.userId,
            type: "generation_complete",
            title: "Video generation complete!",
            message: `Your scene video is ready.`,
            link: `/projects/${meta.projectId}/scenes`,
          });
        } catch { /* ignore */ }

        console.log(`[VideoWorker] Scene ${meta.sceneId} completed successfully: ${finalVideoUrl}`);

      } catch (err: any) {
        console.error(`[VideoWorker] Error processing job ${job.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error(`[VideoWorker] Worker cycle error:`, err.message);
  } finally {
    workerRunning = false;
  }
}

// ─── Startup Recovery ───

/**
 * On server startup, find any scenes stuck in "generating" status
 * that DON'T have a corresponding processing job — these were killed
 * mid-generation and need to be reset to "draft" so users can retry.
 */
export async function recoverStuckScenes() {
  try {
    const dbConn = await getDb();
    if (!dbConn) return;

    // Find scenes stuck in "generating" that have no active job
    const stuckScenes = await dbConn.execute(sql.raw(`
      SELECT s.id, s.projectId FROM scenes s
      WHERE s.status = 'generating'
      AND NOT EXISTS (
        SELECT 1 FROM generationJobs j
        WHERE j.sceneId = s.id AND j.status = 'processing'
      )
    `));

    const scenes = (stuckScenes as any)[0] as any[];
    if (scenes && scenes.length > 0) {
      console.log(`[VideoWorker] Recovering ${scenes.length} stuck scene(s) on startup`);
      for (const scene of scenes) {
        await dbConn.execute(sql.raw(`UPDATE scenes SET status = 'draft' WHERE id = ${scene.id}`));
        console.log(`[VideoWorker] Reset stuck scene ${scene.id} to draft`);
      }
    }
  } catch (err: any) {
    console.error(`[VideoWorker] Recovery error:`, err.message);
  }
}

// ─── Start the Worker ───

export function startVideoJobWorker() {
  console.log(`[VideoWorker] Starting persistent video job worker (polling every ${POLL_INTERVAL_MS / 1000}s)`);

  // Run recovery immediately on startup
  recoverStuckScenes().catch(console.error);

  // Start polling loop
  setInterval(() => {
    runWorkerCycle().catch(console.error);
  }, POLL_INTERVAL_MS);

  // Also run immediately
  setTimeout(() => runWorkerCycle().catch(console.error), 2000);
}
