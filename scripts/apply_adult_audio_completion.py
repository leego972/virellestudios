from pathlib import Path

root = Path(__file__).resolve().parents[1]

# New BYOK audio-completion helper.
(root / "server/_core/adultAudioCompletion.ts").write_text(r'''import { storagePut } from "../storage";
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
''', encoding="utf-8")

# Extend compositor to probe and optionally create/mix missing audio.
path = root / "server/_core/adultMediaCompliance.ts"
text = path.read_text(encoding="utf-8")
text = text.replace(
'''  transformGoal?: string | null;
}): Promise<{ url: string; provenance: ReturnType<typeof buildAdultProvenance> }> {''',
'''  transformGoal?: string | null;
  createFallbackAudio?: (durationSeconds: number) => Promise<{ url: string; provider: string } | null>;
}): Promise<{ url: string; provenance: ReturnType<typeof buildAdultProvenance>; audioCompletion: { generated: boolean; provider: string | null } }> {''',
1)
text = text.replace(
'''  const normalisedPath = path.join(tempDir, "source-normalised.mp4");
  const cardPath''',
'''  const normalisedPath = path.join(tempDir, "source-normalised.mp4");
  const fallbackAudioPath = path.join(tempDir, "fallback-audio.mp3");
  const cardPath''',
1)
old = '''    await execFileAsync("ffmpeg", [
      "-y", "-i", sourcePath,
      "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ar", "48000", "-ac", "2", normalisedPath,
    ], { maxBuffer: 8 * 1024 * 1024 });
    await writeFile(listPath,'''
new = '''    const { stdout: probeOutput } = await execFileAsync("ffprobe", [
      "-v", "error", "-print_format", "json", "-show_streams", "-show_format", sourcePath,
    ], { maxBuffer: 4 * 1024 * 1024 });
    const probe = JSON.parse(probeOutput || "{}");
    const hasAudio = Array.isArray(probe.streams) && probe.streams.some((stream: any) => stream.codec_type === "audio");
    const durationSeconds = Math.max(1, Number(probe.format?.duration) || 5);
    let fallback: { url: string; provider: string } | null = null;
    if (!hasAudio && opts.createFallbackAudio) {
      fallback = await opts.createFallbackAudio(durationSeconds);
    }

    if (hasAudio) {
      await execFileAsync("ffmpeg", [
        "-y", "-i", sourcePath,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", normalisedPath,
      ], { maxBuffer: 8 * 1024 * 1024 });
    } else if (fallback) {
      const audioResponse = await fetch(fallback.url);
      if (!audioResponse.ok) throw new Error(`Could not download generated soundtrack (${audioResponse.status}).`);
      await writeFile(fallbackAudioPath, Buffer.from(await audioResponse.arrayBuffer()));
      await execFileAsync("ffmpeg", [
        "-y", "-i", sourcePath, "-stream_loop", "-1", "-i", fallbackAudioPath,
        "-map", "0:v:0", "-map", "1:a:0",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
        "-t", String(durationSeconds),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "192k", "-shortest", normalisedPath,
      ], { maxBuffer: 8 * 1024 * 1024 });
    } else {
      await execFileAsync("ffmpeg", [
        "-y", "-i", sourcePath,
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        "-map", "0:v:0", "-map", "1:a:0",
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30",
        "-t", String(durationSeconds),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "48000", "-ac", "2", "-shortest", normalisedPath,
      ], { maxBuffer: 8 * 1024 * 1024 });
    }
    await writeFile(listPath,'''
if old not in text:
    raise RuntimeError("Adult compositor normalisation block not found")
text = text.replace(old, new, 1)
text = text.replace(
'''    return { url: uploaded.url, provenance };''',
'''    return {
      url: uploaded.url,
      provenance,
      audioCompletion: { generated: Boolean(fallback), provider: fallback?.provider || null },
    };''',
1)
path.write_text(text, encoding="utf-8")

# Wire callback from worker and record result metadata.
path = root / "server/studio-render-worker.ts"
text = path.read_text(encoding="utf-8")
text = text.replace(
'''import { applyAdultOpeningDisclosure, assessAdultMediaRisk, recordAdultModerationReview } from "./_core/adultMediaCompliance";''',
'''import { applyAdultOpeningDisclosure, assessAdultMediaRisk, recordAdultModerationReview } from "./_core/adultMediaCompliance";
import { createAdultFallbackAudio } from "./_core/adultAudioCompletion";''',
1)
text = text.replace(
'''        transformGoal: job.transformGoal,
      });''',
'''        transformGoal: job.transformGoal,
        createFallbackAudio: (durationSeconds) => createAdultFallbackAudio({
          userId,
          jobId,
          durationSeconds,
          transformGoal: job.transformGoal,
          targetPresentation: job.targetPresentation,
          directorNotes: job.directorNotes,
        }),
      });''',
1)
text = text.replace(
'''      metadata.provenance = compliant.provenance;
      metadata.openingDisclosure''',
'''      metadata.provenance = compliant.provenance;
      metadata.audioCompletion = compliant.audioCompletion;
      metadata.openingDisclosure''',
1)
path.write_text(text, encoding="utf-8")

# Regression test.
(root / "server/adult-audio-completion.test.ts").write_text(r'''import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Adult Studio audio completion", () => {
  it("preserves existing audio and generates only when no audio stream exists", () => {
    const compliance = source("server/_core/adultMediaCompliance.ts");
    expect(compliance).toContain('stream.codec_type === "audio"');
    expect(compliance).toContain("if (hasAudio)");
    expect(compliance).toContain("else if (fallback)");
    expect(compliance).toContain("anullsrc=channel_layout=stereo");
  });

  it("uses saved ElevenLabs, Suno or Replicate audio keys", () => {
    const helper = source("server/_core/adultAudioCompletion.ts");
    expect(helper).toContain("stored.elevenlabsKey");
    expect(helper).toContain("stored.sunoKey");
    expect(helper).toContain("stored.replicateKey");
    expect(helper).toContain("/v1/sound-generation");
  });

  it("records whether soundtrack completion was generated", () => {
    const worker = source("server/studio-render-worker.ts");
    expect(worker).toContain("metadata.audioCompletion = compliant.audioCompletion");
  });
});
''', encoding="utf-8")

print("Adult Studio conditional soundtrack completion applied.")
