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
  const ratio = params.aspectRatio === "9:16" ? "720:1280" : params.aspectRatio === "1:1" ? "720:720" : "1280:720";
  const duration = 10;

  const client = new RunwayML({ apiKey });

  const createParams: any = {
    model: "gen4_turbo",
    promptText: params.prompt,
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
  const task = await client.imageToVideo.create(createParams);
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
    const { url } = await storagePut(key, frameBuffer, "image/jpeg");
    return url;
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
  const { url } = await storagePut(key, buffer, "video/mp4");
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

    console.log(`[VideoWorker] Found ${jobs.length} pending Runway job(s) to poll`);

    for (const job of jobs) {
      try {
        const meta = job.metadata as RunwayJobMetadata;
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
