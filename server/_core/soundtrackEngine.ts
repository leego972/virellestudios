/**
 * AI Soundtrack Generation Engine
 * 
 * Generates original film scores and background music for scenes.
 * 
 * Providers (BYOK):
 * 1. Suno AI â Best quality AI music generation (BYOK key required)
 * 2. Udio â Alternative AI music generation (BYOK key required)
 * 3. MusicGen (Replicate) â Open-source music generation via Replicate API
 * 4. Pollinations Audio â Free fallback for basic ambient music
 * 
 * Pipeline:
 * 1. Analyze scene mood, genre, and pacing
 * 2. Generate a music prompt describing the desired score
 * 3. Call the AI music API to generate audio
 * 4. Post-process (normalize volume, trim/loop to match scene duration)
 * 5. Upload to S3
 * 
 * The resulting soundtrack is mixed with dialogue audio and scene video
 * in the final film assembly step.
 */

import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

// âââ Types âââ

export type MusicProvider = "suno" | "udio" | "replicate_musicgen" | "pollinations";

export interface SoundtrackKeys {
  sunoKey?: string | null;
  udioKey?: string | null;
  replicateKey?: string | null;
}

export interface SoundtrackRequest {
  projectId: number;
  sceneId?: number;
  /** What kind of music to generate */
  mood: string;
  genre: string;
  /** Target duration in seconds */
  durationSeconds: number;
  /** Specific instructions (e.g., "building tension", "triumphant climax") */
  instructions?: string;
  /** Tempo preference */
  tempo?: "slow" | "moderate" | "fast" | "variable";
  /** Instruments to feature */
  instruments?: string[];
  /** Whether this is a score (background) or a featured song */
  type?: "score" | "song" | "ambient" | "transition";
}

export interface SoundtrackResult {
  audioUrl: string;
  durationSeconds: number;
  provider: MusicProvider;
  title?: string;
}

// âââ Music Prompt Builder âââ

/**
 * Build a detailed music generation prompt from scene metadata.
 * Different providers have different prompt styles.
 */
function buildMusicPrompt(request: SoundtrackRequest): string {
  const parts: string[] = [];

  // Genre and mood
  parts.push(`${request.genre} film score`);
  parts.push(`${request.mood} mood`);

  // Type-specific instructions
  switch (request.type) {
    case "score":
      parts.push("cinematic orchestral background score");
      break;
    case "song":
      parts.push("featured song with melody");
      break;
    case "ambient":
      parts.push("atmospheric ambient soundscape");
      break;
    case "transition":
      parts.push("short transitional musical cue");
      break;
    default:
      parts.push("cinematic background music");
  }

  // Tempo
  if (request.tempo) {
    const tempoMap = {
      slow: "slow tempo, 60-80 BPM",
      moderate: "moderate tempo, 90-120 BPM",
      fast: "fast tempo, 130-160 BPM",
      variable: "dynamic tempo changes",
    };
    parts.push(tempoMap[request.tempo]);
  }

  // Instruments
  if (request.instruments && request.instruments.length > 0) {
    parts.push(`featuring ${request.instruments.join(", ")}`);
  }

  // Custom instructions
  if (request.instructions) {
    parts.push(request.instructions);
  }

  // Quality anchor
  parts.push("professional production quality, cinematic mixing");

  return parts.join(", ");
}

/**
 * Build genre-specific music prompts for common film genres.
 */
export function getGenreMusicPreset(genre: string, mood: string): {
  prompt: string;
  instruments: string[];
  tempo: "slow" | "moderate" | "fast" | "variable";
} {
  const presets: Record<string, { prompt: string; instruments: string[]; tempo: "slow" | "moderate" | "fast" | "variable" }> = {
    "action": {
      prompt: "epic orchestral action score, driving percussion, brass fanfares, intense strings",
      instruments: ["orchestra", "percussion", "brass", "strings"],
      tempo: "fast",
    },
    "drama": {
      prompt: "emotional dramatic score, sweeping strings, piano, subtle woodwinds",
      instruments: ["piano", "strings", "cello", "woodwinds"],
      tempo: "moderate",
    },
    "horror": {
      prompt: "dark atmospheric horror score, dissonant strings, eerie pads, unsettling drones",
      instruments: ["strings", "synth pads", "prepared piano", "drones"],
      tempo: "slow",
    },
    "comedy": {
      prompt: "light playful comedy score, pizzicato strings, woodwinds, bouncy rhythm",
      instruments: ["pizzicato strings", "clarinet", "flute", "light percussion"],
      tempo: "moderate",
    },
    "romance": {
      prompt: "romantic film score, gentle piano, warm strings, tender melody",
      instruments: ["piano", "violin", "cello", "harp"],
      tempo: "slow",
    },
    "sci-fi": {
      prompt: "futuristic sci-fi score, synthesizers, electronic textures, orchestral hybrid",
      instruments: ["synthesizer", "electronic", "orchestra", "ambient pads"],
      tempo: "variable",
    },
    "thriller": {
      prompt: "tense thriller score, pulsing bass, staccato strings, building suspense",
      instruments: ["bass", "strings", "percussion", "piano"],
      tempo: "variable",
    },
    "fantasy": {
      prompt: "epic fantasy score, full orchestra, choir, Celtic influences, sweeping themes",
      instruments: ["orchestra", "choir", "harp", "flute", "French horn"],
      tempo: "variable",
    },
    "documentary": {
      prompt: "contemplative documentary score, ambient textures, piano, minimal strings",
      instruments: ["piano", "ambient guitar", "light strings", "subtle electronics"],
      tempo: "slow",
    },
    "western": {
      prompt: "western film score, acoustic guitar, harmonica, sweeping strings, Morricone-inspired",
      instruments: ["acoustic guitar", "harmonica", "strings", "trumpet"],
      tempo: "moderate",
    },
  };

  const genreLower = genre.toLowerCase();
  const preset = presets[genreLower] || presets["drama"];

  // Modify based on mood
  if (mood.toLowerCase().includes("tense") || mood.toLowerCase().includes("suspense")) {
    return { ...preset, tempo: "variable" };
  }
  if (mood.toLowerCase().includes("sad") || mood.toLowerCase().includes("melanchol")) {
    return { ...preset, tempo: "slow" };
  }
  if (mood.toLowerCase().includes("exciting") || mood.toLowerCase().includes("energetic")) {
    return { ...preset, tempo: "fast" };
  }

  return preset;
}

// âââ Suno AI âââ

async function generateSunoMusic(
  apiKey: string,
  prompt: string,
  durationSeconds: number
): Promise<Buffer> {
  // Suno API v3.5 endpoint
  const resp = await fetch("https://api.suno.ai/v1/generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      make_instrumental: true,
      duration: Math.min(240, durationSeconds), // Suno max 4 minutes per generation
      model: "chirp-v3.5",
    }),
    signal: AbortSignal.timeout(180000), // 3 min timeout
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Suno API error ${resp.status}: ${errText}`);
  }

  const result = await resp.json() as any;

  // Suno returns a task ID â poll for completion
  const taskId = result.id || result.task_id;
  if (!taskId) {
    // Direct audio response
    if (result.audio_url) {
      const audioResp = await fetch(result.audio_url);
      return Buffer.from(await audioResp.arrayBuffer());
    }
    throw new Error("Suno returned no task ID or audio URL");
  }

  // Poll for completion (up to 3 minutes)
  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise(r => setTimeout(r, 5000));

    const statusResp = await fetch(`https://api.suno.ai/v1/generation/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!statusResp.ok) continue;

    const status = await statusResp.json() as any;
    if (status.status === "complete" && status.audio_url) {
      const audioResp = await fetch(status.audio_url);
      return Buffer.from(await audioResp.arrayBuffer());
    }
    if (status.status === "failed") {
      throw new Error(`Suno generation failed: ${status.error || "unknown"}`);
    }
  }

  throw new Error("Suno generation timed out after 3 minutes");
}

// âââ Replicate MusicGen âââ

async function generateReplicateMusic(
  apiKey: string,
  prompt: string,
  durationSeconds: number
): Promise<Buffer> {
  // Use Meta's MusicGen on Replicate
  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "671ac645ce5e552cc63a54a2bbff63fcf798043055f2a91c1eba73ee738e4e3a",
      input: {
        prompt: prompt,
        duration: Math.min(30, durationSeconds), // MusicGen max ~30s
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "peak",
      },
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`Replicate API error ${resp.status}: ${errText}`);
  }

  const prediction = await resp.json() as any;
  const predictionId = prediction.id;

  // Poll for completion
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(r => setTimeout(r, 3000));

    const statusResp = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!statusResp.ok) continue;

    const status = await statusResp.json() as any;
    if (status.status === "succeeded" && status.output) {
      const audioUrl = typeof status.output === "string" ? status.output : status.output[0];
      const audioResp = await fetch(audioUrl);
      return Buffer.from(await audioResp.arrayBuffer());
    }
    if (status.status === "failed") {
      throw new Error(`MusicGen failed: ${status.error || "unknown"}`);
    }
  }

  throw new Error("MusicGen generation timed out");
}

// âââ Pollinations Audio (Free Fallback) âââ

async function generatePollinationsMusic(
  prompt: string,
  _durationSeconds: number
): Promise<Buffer> {
  // Use Pollinations text-to-audio for basic ambient music
  const encodedPrompt = encodeURIComponent(`instrumental ${prompt}`);
  const url = `https://audio.pollinations.ai/generate?prompt=${encodedPrompt}&format=mp3`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(120000),
  });

  if (!resp.ok) {
    throw new Error(`Pollinations audio failed: ${resp.status}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

// âââ Audio Post-Processing âââ

/**
 * Loop or trim audio to match target duration.
 * If source is shorter than target, loop it with crossfade.
 * If source is longer, trim with fade-out.
 */
async function adjustAudioDuration(
  audioBuffer: Buffer,
  targetDurationSeconds: number,
  inputFormat: string = "mp3"
): Promise<Buffer> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-music-"));

  try {
    const inputPath = path.join(tmpDir, `input.${inputFormat}`);
    const outputPath = path.join(tmpDir, "output.mp3");
    await fs.promises.writeFile(inputPath, audioBuffer);

    // Get source duration
    const { stdout: probeOut } = await execFileAsync("ffprobe", [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      inputPath,
    ], { timeout: 10000 });
    const info = JSON.parse(probeOut);
    const sourceDuration = parseFloat(info.format?.duration || "0");

    if (sourceDuration <= 0) {
      return audioBuffer; // Can't process, return as-is
    }

    if (sourceDuration >= targetDurationSeconds) {
      // Trim with fade-out
      const fadeStart = Math.max(0, targetDurationSeconds - 3);
      await execFileAsync("ffmpeg", [
        "-i", inputPath,
        "-t", String(targetDurationSeconds),
        "-af", `afade=t=out:st=${fadeStart}:d=3`,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath,
      ], { timeout: 30000 });
    } else {
      // Loop to fill target duration with crossfade
      const loopCount = Math.ceil(targetDurationSeconds / sourceDuration);
      const fadeStart = Math.max(0, targetDurationSeconds - 3);
      await execFileAsync("ffmpeg", [
        "-stream_loop", String(loopCount),
        "-i", inputPath,
        "-t", String(targetDurationSeconds),
        "-af", `afade=t=in:st=0:d=2,afade=t=out:st=${fadeStart}:d=3`,
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        "-y",
        outputPath,
      ], { timeout: 30000 });
    }

    return await fs.promises.readFile(outputPath);
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// âââ Provider Selection âââ

function selectMusicProvider(keys: SoundtrackKeys): MusicProvider {
  if (keys.sunoKey) return "suno";
  if (keys.udioKey) return "udio";
  if (keys.replicateKey) return "replicate_musicgen";
  return "pollinations";
}

// âââ Main Entry Point âââ

/**
 * Generate an AI soundtrack for a scene or full film.
 */
export async function generateSoundtrack(
  keys: SoundtrackKeys,
  request: SoundtrackRequest
): Promise<SoundtrackResult> {
  const provider = selectMusicProvider(keys);
  const prompt = buildMusicPrompt(request);

  logger.info(`[Soundtrack] Generating ${request.durationSeconds}s ${request.genre} score via ${provider}`);

  let audioBuffer: Buffer;

  try {
    switch (provider) {
      case "suno":
        audioBuffer = await generateSunoMusic(keys.sunoKey!, prompt, request.durationSeconds);
        break;

      case "replicate_musicgen":
        audioBuffer = await generateReplicateMusic(keys.replicateKey!, prompt, request.durationSeconds);
        break;

      case "pollinations":
      default:
        audioBuffer = await generatePollinationsMusic(prompt, request.durationSeconds);
        break;
    }
  } catch (err: any) {
    logger.error(`[Soundtrack] ${provider} failed:`, err.message);

    // Fallback to Pollinations
    if (provider !== "pollinations") {
      logger.info("[Soundtrack] Falling back to Pollinations...");
      try {
        audioBuffer = await generatePollinationsMusic(prompt, request.durationSeconds);
      } catch {
        throw new Error(`All music generation providers failed. Last error: ${err.message}`);
      }
    } else {
      throw err;
    }
  }

  // Post-process: adjust duration to match target
  if (request.durationSeconds > 0) {
    try {
      audioBuffer = await adjustAudioDuration(audioBuffer, request.durationSeconds);
    } catch (err) {
      logger.warn("[Soundtrack] Duration adjustment failed, using raw audio:", { error: String(err) });
    }
  }

  // Upload to S3
  const sceneLabel = request.sceneId ? `scene-${request.sceneId}` : "film";
  const key = `soundtracks/${request.projectId}/${sceneLabel}-score-${Date.now()}.mp3`;
  const { url: audioUrl } = await storagePut(key, audioBuffer, "audio/mpeg");

  // Get actual duration
  let durationSeconds = request.durationSeconds;
  try {
    const tmpPath = path.join(os.tmpdir(), `probe-${Date.now()}.mp3`);
    await fs.promises.writeFile(tmpPath, audioBuffer);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "quiet", "-print_format", "json", "-show_format", tmpPath,
    ], { timeout: 10000 });
    const info = JSON.parse(stdout);
    durationSeconds = parseFloat(info.format?.duration || String(request.durationSeconds));
    await fs.promises.unlink(tmpPath).catch(() => {});
  } catch { /* use target duration */ }

  logger.info(`[Soundtrack] Generated ${durationSeconds.toFixed(1)}s score via ${provider}`);

  return {
    audioUrl,
    durationSeconds,
    provider,
    title: `${request.genre} ${request.mood} Score`,
  };
}

/**
 * Generate a full film score â multiple tracks for different sections.
 */
export async function generateFilmScore(
  keys: SoundtrackKeys,
  scenes: Array<{
    sceneId: number;
    mood: string;
    durationSeconds: number;
    genre: string;
  }>,
  projectId: number,
  onProgress?: (sceneIndex: number, total: number) => void
): Promise<SoundtrackResult[]> {
  const results: SoundtrackResult[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    try {
      const result = await generateSoundtrack(keys, {
        projectId,
        sceneId: scene.sceneId,
        mood: scene.mood,
        genre: scene.genre,
        durationSeconds: scene.durationSeconds,
        type: "score",
      });
      results.push(result);
    } catch (err: any) {
      logger.error(`[FilmScore] Scene ${scene.sceneId} score failed:`, err.message);
      // Continue â missing scores are not fatal
    }
    onProgress?.(i + 1, scenes.length);
  }

  return results;
}

// âââ Provider Info âââ

export const MUSIC_PROVIDERS = [
  {
    id: "suno" as MusicProvider,
    name: "Suno AI",
    description: "Industry-leading AI music generation. Creates full songs and instrumentals with high production quality.",
    signupUrl: "https://suno.com",
    pricing: "Free tier: 10 songs/day. Pro: $10/mo (500 songs). Premier: $30/mo (2000 songs).",
    quality: "Ultra-premium â indistinguishable from human composers",
    maxDuration: 240,
  },
  {
    id: "replicate_musicgen" as MusicProvider,
    name: "MusicGen (via Replicate)",
    description: "Meta's open-source music generation model. Good for short instrumental cues and ambient music.",
    signupUrl: "https://replicate.com",
    pricing: "Pay per generation (~$0.01-0.05 per clip).",
    quality: "Good â suitable for background scores",
    maxDuration: 30,
  },
  {
    id: "pollinations" as MusicProvider,
    name: "Pollinations Audio (Free)",
    description: "Free AI audio generation. Basic quality but no API key required.",
    signupUrl: "https://pollinations.ai",
    pricing: "FREE",
    quality: "Basic â functional ambient music",
    maxDuration: 60,
  },
];
