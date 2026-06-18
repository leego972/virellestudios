/**
 * Lip Sync Engine — D-ID Clips API (video-to-video lip sync)
 *
 * Takes an existing scene video URL + dubbed audio URL and returns a new
 * video where the character's mouth movements are animated to match the audio.
 *
 * API reference: https://docs.d-id.com/reference/createclip
 * Auth: D-ID API key (Basic auth — key + ":" base64-encoded)
 *
 * Requirements:
 *   - Scene video must contain a clearly visible human face
 *   - Audio must be a publicly accessible MP3/WAV URL (not a data: URI)
 *   - User must have a D-ID API key set in Settings → API Keys
 */

import { logger } from "./logger";

const DID_API_BASE = "https://api.d-id.com";

export interface LipSyncOptions {
  /** Publicly accessible scene video URL (must show a face) */
  videoUrl: string;
  /** Publicly accessible dubbed audio URL (mp3 or wav) */
  audioUrl: string;
  /** Raw D-ID API key */
  apiKey: string;
}

export interface LipSyncResult {
  /** Lip-synced video URL from D-ID */
  videoUrl: string;
  /** Approximate duration in seconds */
  duration: number;
}

/**
 * Generate a lip-synced video by animating mouth movements in the source
 * video to match the provided audio track.
 *
 * Uses D-ID /clips (video presenter) — distinct from /talks (image presenter).
 * Typical processing time: 30-90 seconds per scene.
 */
export async function generateLipSync(
  options: LipSyncOptions,
): Promise<LipSyncResult> {
  const { videoUrl, audioUrl, apiKey } = options;

  if (!videoUrl) throw new Error("No scene video URL provided for lip sync");
  if (!audioUrl) throw new Error("No audio URL provided for lip sync");
  if (audioUrl.startsWith("data:")) {
    throw new Error(
      "Audio must be a real HTTPS URL for D-ID lip sync. Upload audio to cloud storage first.",
    );
  }

  const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;

  logger.info(`[LipSyncEngine] Creating D-ID clip — video: ${videoUrl.slice(0, 80)} audio: ${audioUrl.slice(0, 80)}`);

  // ── Step 1: Create the clip ────────────────────────────────────────────────
  const createResp = await fetch(`${DID_API_BASE}/clips`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_url: videoUrl,
      script: {
        type: "audio",
        audio_url: audioUrl,
      },
      config: {
        stitch: true,
        result_format: "mp4",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!createResp.ok) {
    const errBody = await createResp.text().catch(() => "unknown error");
    throw new Error(
      `D-ID clip creation failed (${createResp.status}): ${errBody.slice(0, 300)}`,
    );
  }

  const createData = (await createResp.json()) as { id: string };
  const clipId = createData.id;
  if (!clipId) throw new Error("D-ID returned no clip ID");

  logger.info(`[LipSyncEngine] Clip created — ID: ${clipId}, polling for completion...`);

  // ── Step 2: Poll until complete (max 5 minutes) ────────────────────────────
  const MAX_WAIT_MS = 5 * 60 * 1_000;
  const POLL_INTERVAL_MS = 6_000;
  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollResp = await fetch(`${DID_API_BASE}/clips/${clipId}`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);

    if (!pollResp || !pollResp.ok) continue;

    const clip = (await pollResp.json()) as {
      id: string;
      status: string;
      result_url?: string;
      duration?: number;
      error?: { description: string };
    };

    logger.info(`[LipSyncEngine] Clip ${clipId} status: ${clip.status}`);

    if (clip.status === "done" && clip.result_url) {
      logger.info(`[LipSyncEngine] Lip sync complete — ${clip.result_url}`);
      return {
        videoUrl: clip.result_url,
        duration: clip.duration ?? 5,
      };
    }

    if (clip.status === "error") {
      throw new Error(
        `D-ID lip sync failed: ${clip.error?.description ?? "Unknown error"}`,
      );
    }

    // Keep polling for: "created" | "started" | "processing"
  }

  throw new Error(
    `D-ID lip sync timed out after 5 minutes (clip ID: ${clipId})`,
  );
}
