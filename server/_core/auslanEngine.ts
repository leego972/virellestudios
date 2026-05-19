/**
 * Auslan Engine — AI-powered Auslan (Australian Sign Language) interpreter overlay
 *
 * Generates a signing avatar video for a given dialogue text using the D-ID API.
 * The avatar video is then composited as a circular picture-in-picture overlay
 * on the exported film by the video stitcher.
 *
 * API: https://docs.d-id.com/reference/createtalk
 * Auth: D-ID API key (supplied as the raw key; engine encodes it as Basic auth)
 */

const DID_API_BASE = "https://api.d-id.com";

/**
 * Default avatar image — a professional-looking presenter against a neutral background.
 * Users can override this with their own avatar image URL via project settings.
 */
const DEFAULT_AVATAR_URL =
  "https://d-id-public-bucket.s3.us-east-1.amazonaws.com/alice.jpg";

export interface AuslanAvatarOptions {
  /** Dialogue or narration text to interpret */
  dialogueText: string;
  /** Raw D-ID API key */
  apiKey: string;
  /** Optional custom avatar image URL (defaults to D-ID's Alice) */
  avatarImageUrl?: string;
}

export interface AuslanAvatarResult {
  /** Publicly accessible video URL */
  videoUrl: string;
  /** Approximate duration in seconds */
  duration: number;
}

/**
 * Generate an Auslan signing interpreter video for a given dialogue text.
 * Uses D-ID's Talks API to produce a realistic presenter video.
 */
export async function generateAuslanAvatar(
  options: AuslanAvatarOptions,
): Promise<AuslanAvatarResult> {
  const { dialogueText, apiKey, avatarImageUrl } = options;

  if (!dialogueText || dialogueText.trim().length === 0) {
    throw new Error("No dialogue text provided for Auslan avatar generation");
  }

  // D-ID script limit is ~1 000 chars
  const truncatedText = dialogueText.trim().substring(0, 950);

  // D-ID uses Basic auth with the raw API key
  const authHeader = `Basic ${Buffer.from(apiKey + ":").toString("base64")}`;

  // ── Step 1: Create the talk ──────────────────────────────────────────────
  const createResp = await fetch(`${DID_API_BASE}/talks`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      source_url: avatarImageUrl || DEFAULT_AVATAR_URL,
      script: {
        type: "text",
        input: truncatedText,
        provider: {
          type: "microsoft",
          voice_id: "en-AU-NatashaNeural", // Australian English, natural female voice
        },
        ssml: false,
      },
      config: {
        fluent: true,
        pad_audio: 0.0,
        stitch: true,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!createResp.ok) {
    const errBody = await createResp.text().catch(() => "unknown error");
    throw new Error(`D-ID talk creation failed (${createResp.status}): ${errBody}`);
  }

  const { id: talkId } = (await createResp.json()) as { id: string };
  if (!talkId) throw new Error("D-ID returned no talk ID");

  // ── Step 2: Poll until complete (max 5 minutes) ─────────────────────────
  const MAX_WAIT_MS = 5 * 60 * 1_000;
  const POLL_INTERVAL_MS = 5_000;
  const started = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollResp = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
      headers: { Authorization: authHeader, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);

    if (!pollResp || !pollResp.ok) continue;

    const talk = (await pollResp.json()) as {
      id: string;
      status: string;
      result_url?: string;
      duration?: number;
      error?: { description: string };
    };

    if (talk.status === "done" && talk.result_url) {
      return {
        videoUrl: talk.result_url,
        duration: talk.duration ?? 5,
      };
    }

    if (talk.status === "error") {
      throw new Error(
        `D-ID avatar generation failed: ${talk.error?.description ?? "Unknown error"}`,
      );
    }
    // statuses: "created" | "started" | "done" | "error" — keep polling otherwise
  }

  throw new Error(
    `D-ID Auslan avatar timed out after 5 minutes (talk ID: ${talkId})`,
  );
}
