import { storagePut } from "../storage";
import * as db from "../db";
import { decryptApiKey } from "./securityEngine";
import { generateSoundtrack } from "./soundtrackEngine";
import { logger } from "./logger";

export type AdultFallbackAudio = {
  url: string;
  provider: "elevenlabs_sound_generation" | "suno" | "replicate_musicgen";
};

function decryptOptional(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  try { return decryptApiKey(value); } catch { return null; }
}

async function generateElevenLabsSoundtrack(
  apiKey: string,
  prompt: string,
  durationSeconds: number,
): Promise<Buffer> {
  const response = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: Math.max(1, Math.min(22, durationSeconds)),
      prompt_influence: 0.45,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs sound generation failed (${response.status}): ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function createAdultFallbackAudio(opts: {
  userId: number;
  jobId: number;
  durationSeconds: number;
  transformGoal?: string | null;
  targetPresentation?: string | null;
  directorNotes?: string | null;
}): Promise<AdultFallbackAudio | null> {
  const stored: any = await db.getUserApiKeys(opts.userId);
  if (!stored) return null;

  const elevenlabsKey = decryptOptional(stored.elevenlabsKey);
  const sunoKey = decryptOptional(stored.sunoKey);
  const replicateKey = decryptOptional(stored.replicateKey);
  if (!elevenlabsKey && !sunoKey && !replicateKey) return null;

  const description = [opts.targetPresentation, opts.directorNotes]
    .filter(Boolean)
    .join(". ")
    .slice(0, 1200);
  const prompt = [
    "Original cinematic instrumental and ambient soundtrack for an adult studio production",
    opts.transformGoal ? `visual transformation: ${opts.transformGoal}` : "synthetic media transformation",
    description || "polished neutral cinematic atmosphere",
    "no speech, no vocals, no recognisable copyrighted melody, professional balanced mix",
  ].join(". ");

  if (elevenlabsKey) {
    try {
      const audio = await generateElevenLabsSoundtrack(elevenlabsKey, prompt, opts.durationSeconds);
      const uploaded = await storagePut(
        `adult-studio/audio/${opts.userId}/${opts.jobId}-elevenlabs.mp3`,
        audio,
        "audio/mpeg",
        { public: true },
      );
      return { url: uploaded.url, provider: "elevenlabs_sound_generation" };
    } catch (error) {
      logger.warn("[AdultAudioCompletion] ElevenLabs generation failed; trying saved music provider.", { error: String(error) });
    }
  }

  if (sunoKey || replicateKey) {
    try {
      const result = await generateSoundtrack(
        { sunoKey, replicateKey, udioKey: null },
        {
          projectId: opts.jobId,
          mood: "cinematic atmospheric",
          genre: "drama",
          durationSeconds: Math.max(1, opts.durationSeconds),
          instructions: prompt,
          tempo: "moderate",
          type: "ambient",
        },
      );
      return {
        url: result.audioUrl,
        provider: result.provider === "suno" ? "suno" : "replicate_musicgen",
      };
    } catch (error) {
      logger.error("[AdultAudioCompletion] Saved music providers failed.", { error: String(error) });
    }
  }

  return null;
}
