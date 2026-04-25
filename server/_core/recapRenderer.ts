// ============================================================================
// v6.71 — Auto Recap MP4 renderer.
//
// Background worker invoked by the `recap.renderMp4` mutation. Loads the
// recap + its `recapSegments` + the source movies, downloads each source
// video to a temp dir, cuts the segment with ffmpeg, normalizes every clip
// to a common MP4 (1920x1080 / 30fps / H.264 / AAC), concatenates them,
// uploads the final MP4 via `storagePut`, then updates the recap row to
// `render_completed` and finalizes the credit reservation.
//
// Failure semantics (matches the v6.70 scene-video pattern):
//   - any error before the storage upload → recap reverts to
//     `outline_completed`, errorMessage saved, reservation released.
//   - finalizeReservation/releaseReservation are both idempotent (gate on
//     status='reserved') so this is safe under retry.
//
// ffmpeg is required. If it is missing on the host, the renderer returns
// a clear error and the recap is reverted; we never fake a successful
// final MP4. See docs/VIRELLE_V671_RECAP_RENDER_REPORT.md.
// ============================================================================

import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

import * as db from "../db";
import { storagePut } from "../storage";

const execFileAsync = promisify(execFile);

// Cache the ffmpeg-available probe so we do not re-spawn on every render.
let _ffmpegAvailable: boolean | null = null;

export async function isFfmpegAvailable(): Promise<boolean> {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"], { timeout: 5000 });
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
  }
  return _ffmpegAvailable;
}

interface RenderArgs {
  recapId: number;
  reservationId: number | null;
  userId: number;
}

/**
 * Render the final Auto Recap MP4. Long-running; intended to be fired as a
 * background task (`(async () => renderRecapMp4(...))()`) from the mutation.
 * Resolves once the recap row has been updated and the reservation
 * finalized/released. Never throws — errors are persisted to the recap row.
 */
export async function renderRecapMp4(args: RenderArgs): Promise<void> {
  const { recapId, reservationId, userId } = args;
  const tag = `[RecapRender#${recapId}]`;

  // 1. Probe ffmpeg up front. If missing, fail fast and refund.
  if (!(await isFfmpegAvailable())) {
    console.warn(`${tag} ffmpeg is not installed on this host — aborting render.`);
    await safeFail(
      recapId,
      userId,
      reservationId,
      "Final MP4 render is not available on this server because ffmpeg is not installed.",
    );
    return;
  }

  let workDir: string | null = null;
  try {
    // 2. Load recap and segments.
    const recap: any = await db.getRecapById(recapId, userId);
    if (!recap) {
      throw new Error(`Recap ${recapId} not found for user ${userId}.`);
    }
    const segments: any[] = await db.listRecapSegments(recapId);
    if (!segments.length) {
      throw new Error("Recap has no segments to render.");
    }

    // 3. Load every source movie and validate it has a usable fileUrl.
    type SrcMovie = { id: number; fileUrl: string };
    const movieCache = new Map<number, SrcMovie>();
    for (const seg of segments) {
      const id = Number(seg.sourceMovieId);
      if (movieCache.has(id)) continue;
      const movie: any = await (db as any).getMovieById?.(id, userId)
        ?? await (db as any).getMovieByIdRaw?.(id);
      const url: string | null = movie?.fileUrl ?? movie?.videoUrl ?? null;
      if (!movie || !url) {
        throw new Error(
          `Source movie #${id} is missing a downloadable video URL — cannot render recap.`,
        );
      }
      movieCache.set(id, { id, fileUrl: url });
    }

    // 4. Create a temp working directory under /tmp.
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), `virelle-recap-${recapId}-`));
    console.log(`${tag} workDir=${workDir}`);

    // 5. Download every distinct source clip exactly once.
    const downloadedSources = new Map<number, string>();
    for (const [id, src] of movieCache) {
      const localPath = path.join(workDir, `src-${id}.mp4`);
      console.log(`${tag} downloading source #${id}`);
      const resp = await fetch(src.fileUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download source movie #${id}: HTTP ${resp.status}`);
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      await fs.writeFile(localPath, buf);
      downloadedSources.set(id, localPath);
    }

    // 6. For each segment, cut + normalize to a common MP4 so concat is safe.
    //    -ss / -to applied AFTER -i for accurate-cut at the cost of speed,
    //    which is fine for short recap segments. Re-encode to H.264 + AAC at
    //    1920x1080 30fps. Clips may be shorter than requested if the source
    //    is shorter — ffmpeg silently truncates.
    const segmentClips: string[] = [];
    const sortedSegments = segments.slice().sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
    for (let i = 0; i < sortedSegments.length; i++) {
      const seg = sortedSegments[i];
      const sourceId = Number(seg.sourceMovieId);
      const srcPath = downloadedSources.get(sourceId);
      if (!srcPath) {
        throw new Error(`Internal error: source #${sourceId} was not downloaded.`);
      }
      const start = Math.max(0, Number(seg.startTimeSeconds ?? 0));
      const end = Math.max(start + 0.5, Number(seg.endTimeSeconds ?? start + 4));
      const duration = end - start;
      const outPath = path.join(workDir, `seg-${String(i).padStart(3, "0")}.mp4`);
      console.log(`${tag} cutting segment ${i} (src=${sourceId} ${start}s–${end}s)`);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", srcPath,
        "-ss", String(start),
        "-t", String(duration),
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-movflags", "+faststart",
        outPath,
      ], { timeout: 300_000 });
      segmentClips.push(outPath);
    }

    if (!segmentClips.length) {
      throw new Error("No segment clips were produced.");
    }

    // 7. Build a concat list and stitch all segments into the final MP4.
    //    Using the concat demuxer with -c copy is safe because every clip
    //    above was normalized to identical codec/resolution/fps/audio.
    const concatList = path.join(workDir, "concat.txt");
    await fs.writeFile(
      concatList,
      segmentClips.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
    );
    const finalPath = path.join(workDir, "recap.mp4");
    console.log(`${tag} concatenating ${segmentClips.length} segment(s)`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatList,
      "-c", "copy",
      "-movflags", "+faststart",
      finalPath,
    ], { timeout: 300_000 });

    // 8. Upload the final MP4. storagePut throws if no backend is configured;
    //    that surfaces a clean error that the failure path will refund.
    const finalBuf = await fs.readFile(finalPath);
    const relKey = `recaps/${recap.projectId}/${recapId}/recap-${Date.now()}.mp4`;
    console.log(`${tag} uploading final MP4 (${finalBuf.length} bytes)`);
    const uploaded = await storagePut(relKey, finalBuf, "video/mp4");

    // 9. Update the recap row with the final asset.
    await db.updateRecap(recapId, userId, {
      status: "render_completed",
      progress: 100,
      fileUrl: uploaded.url,
      fileKey: uploaded.key,
      errorMessage: null as any,
    } as any);

    // 10. Finalize the reservation (idempotent — only mutates rows still
    //     in 'reserved' state). Mirrors the v6.70 scene-video pattern.
    if (reservationId) {
      try { await db.finalizeReservation(reservationId); } catch {}
    }

    console.log(`${tag} render_completed → ${uploaded.url}`);
  } catch (err: any) {
    const message = err?.message || "Auto Recap MP4 render failed.";
    console.error(`${tag} ${message}`);
    await safeFail(recapId, userId, reservationId, message);
  } finally {
    // 11. Always clean up the temp working directory.
    if (workDir) {
      try { await fs.rm(workDir, { recursive: true, force: true }); } catch {}
    }
  }
}

/**
 * Failure path. Reverts the recap to its prior `outline_completed` state,
 * stores the error message for the UI, and refunds the credit reservation.
 * Never throws — best effort.
 */
async function safeFail(
  recapId: number,
  userId: number,
  reservationId: number | null,
  errorMessage: string,
): Promise<void> {
  try {
    await db.updateRecap(recapId, userId, {
      status: "outline_completed",
      progress: 100,
      errorMessage,
    } as any);
  } catch (e: any) {
    console.warn(`[RecapRender#${recapId}] failed to revert status: ${e?.message}`);
  }
  if (reservationId) {
    try { await db.releaseReservation(reservationId); } catch {}
  }
}
