/**
 * Video Stitcher — Concatenates scene video clips into a single movie file.
 *
 * Pipeline:
 * 1. Download all scene video clips from S3/URLs to temp directory
 * 2. Generate a concat list file for ffmpeg
 * 3. Run ffmpeg to concatenate with re-encoding for consistent format
 * 4. Upload the final MP4 to S3
 * 5. Clean up temp files
 *
 * Supports: fade transitions, soundtrack overlay, subtitles burn-in (future)
 */

import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

export interface StitchInput {
  scenes: Array<{
    videoUrl: string;
    title?: string;
    duration?: number;
    orderIndex: number;
  }>;
  projectTitle: string;
  userId: number;
  projectId: number;
  /** Optional soundtrack URL to overlay */
  soundtrackUrl?: string;
  /** Soundtrack volume 0-100 (default 30 = background level) */
  soundtrackVolume?: number;
}

export interface StitchResult {
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  duration: number;
  mimeType: string;
}

/**
 * Download a file from a URL to a local path.
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(dest, buffer);
}

/**
 * Get video duration using ffprobe.
 */
async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      filePath,
    ], { timeout: 30000 });
    const info = JSON.parse(stdout);
    return parseFloat(info.format?.duration || "0");
  } catch {
    return 0;
  }
}

/**
 * Stitch scene videos into a single movie file.
 */
export async function stitchMovie(input: StitchInput): Promise<StitchResult> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-stitch-"));

  try {
    // Sort scenes by orderIndex
    const sortedScenes = [...input.scenes].sort((a, b) => a.orderIndex - b.orderIndex);

    // Filter to only scenes that have video URLs
    const scenesWithVideo = sortedScenes.filter((s) => s.videoUrl);
    if (scenesWithVideo.length === 0) {
      throw new Error("No scenes have generated video clips. Generate videos for your scenes first.");
    }

    console.log(`[VideoStitcher] Stitching ${scenesWithVideo.length} scenes for "${input.projectTitle}"`);

    // Step 1: Download all scene videos
    const localFiles: string[] = [];
    for (let i = 0; i < scenesWithVideo.length; i++) {
      const scene = scenesWithVideo[i];
      const ext = ".mp4";
      const localPath = path.join(tmpDir, `scene_${String(i).padStart(3, "0")}${ext}`);
      console.log(`[VideoStitcher] Downloading scene ${i + 1}/${scenesWithVideo.length}: ${scene.title || "Untitled"}`);
      await downloadFile(scene.videoUrl, localPath);
      localFiles.push(localPath);
    }

    // Step 2: Re-encode each clip to ensure consistent format (same codec, resolution, framerate)
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
      ], { timeout: 120000 });
      normalizedFiles.push(normalized);
    }

    // Step 3: Concatenate using the concat protocol
    const concatInput = normalizedFiles.map((f) => f).join("|");
    const outputPath = path.join(tmpDir, "final_movie.mp4");

    const ffmpegArgs = [
      "-i", `concat:${concatInput}`,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "22",
      "-c:a", "aac",
      "-b:a", "192k",
      "-movflags", "+faststart",
      "-y",
      outputPath,
    ];

    console.log(`[VideoStitcher] Concatenating ${normalizedFiles.length} clips...`);
    await execFileAsync("ffmpeg", ffmpegArgs, { timeout: 300000 }); // 5 min timeout

    // Step 3b: If soundtrack provided, overlay it
    if (input.soundtrackUrl) {
      const soundtrackPath = path.join(tmpDir, "soundtrack.mp3");
      await downloadFile(input.soundtrackUrl, soundtrackPath);

      const withSoundtrack = path.join(tmpDir, "final_with_soundtrack.mp4");
      const vol = ((input.soundtrackVolume || 30) / 100).toFixed(2);

      await execFileAsync("ffmpeg", [
        "-i", outputPath,
        "-i", soundtrackPath,
        "-filter_complex", `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "-shortest",
        "-y",
        withSoundtrack,
      ], { timeout: 300000 });

      // Replace output with soundtrack version
      await fs.promises.rename(withSoundtrack, outputPath);
    }

    // Step 4: Get final file info
    const stats = await fs.promises.stat(outputPath);
    const duration = await getVideoDuration(outputPath);

    // Step 5: Upload to S3
    const fileKey = `movies/${input.userId}/${input.projectId}/full-film-${Date.now()}.mp4`;
    const fileBuffer = await fs.promises.readFile(outputPath);
    const { url } = await storagePut(fileKey, fileBuffer, "video/mp4");

    console.log(`[VideoStitcher] Upload complete: ${url} (${(stats.size / 1024 / 1024).toFixed(1)} MB, ${duration.toFixed(1)}s)`);

    return {
      fileUrl: url,
      fileKey,
      fileSize: stats.size,
      duration: Math.round(duration),
      mimeType: "video/mp4",
    };
  } finally {
    // Cleanup temp directory
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
