/**
 * Voice Acting Engine — AI-Powered Dialogue Audio Generation
 * 
 * Generates spoken dialogue audio for film scenes using TTS APIs.
 * Supports multiple providers (BYOK):
 * 1. ElevenLabs (premium — most expressive, best for film)
 * 2. OpenAI TTS (high quality, good emotion range)
 * 3. Pollinations TTS (free fallback)
 * 
 * Pipeline per scene:
 * 1. Take dialogue lines with character names + emotions
 * 2. Assign distinct voices to each character
 * 3. Generate audio for each line with appropriate emotion/pacing
 * 4. Stitch dialogue audio with timing gaps (pauses between lines)
 * 5. Upload final scene dialogue audio to S3
 * 
 * The resulting audio track is then mixed with the scene video in the stitcher.
 */

import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Types ───

export type TTSProvider = "elevenlabs" | "openai" | "pollinations";

export interface VoiceActingKeys {
  elevenlabsKey?: string | null;
  openaiKey?: string | null;
}

export interface DialogueLine {
  characterName: string;
  line: string;
  emotion?: string;       // "angry", "whispered", "sarcastic", "sad", "excited", etc.
  direction?: string;     // Stage direction for delivery
  pauseAfterMs?: number;  // Pause after this line in ms (default 800ms)
}

export interface SceneDialogueRequest {
  sceneId: number;
  projectId: number;
  dialogueLines: DialogueLine[];
  /** Map character names to voice configurations */
  characterVoices?: Record<string, CharacterVoice>;
}

export interface CharacterVoice {
  /** ElevenLabs voice ID or OpenAI voice name */
  voiceId?: string;
  /** Voice characteristics for auto-assignment */
  gender?: "male" | "female" | "neutral";
  age?: "young" | "adult" | "elderly";
  accent?: string;
  /** ElevenLabs voice settings */
  stability?: number;      // 0-1 (default 0.5)
  similarityBoost?: number; // 0-1 (default 0.75)
  style?: number;          // 0-1 (default 0.5, ElevenLabs v2 only)
}

export interface VoiceActingResult {
  audioUrl: string;        // S3 URL of the final dialogue audio
  durationSeconds: number; // Total duration of the dialogue track
  provider: TTSProvider;
  lineCount: number;
}

// ─── Voice Presets ───

/** Default voice assignments for OpenAI TTS */
const OPENAI_VOICE_PRESETS: Record<string, string> = {
  "male_young": "echo",
  "male_adult": "onyx",
  "male_elderly": "fable",
  "female_young": "shimmer",
  "female_adult": "nova",
  "female_elderly": "alloy",
  "neutral": "alloy",
};

/** Default ElevenLabs voice IDs (from their free library) */
const ELEVENLABS_VOICE_PRESETS: Record<string, string> = {
  "male_young": "pNInz6obpgDQGcFmaJgB",    // Adam
  "male_adult": "VR6AewLTigWG4xSOukaG",     // Arnold
  "male_elderly": "TxGEqnHWrfWFTfGW9XjX",   // Josh
  "female_young": "EXAVITQu4vr4xnSDxMaL",   // Bella
  "female_adult": "21m00Tcm4TlvDq8ikWAM",   // Rachel
  "female_elderly": "AZnzlk1XvdvUeBnXmlld",  // Domi
  "neutral": "21m00Tcm4TlvDq8ikWAM",        // Rachel
  "narrator": "ErXwobaYiN019PkySvjV",        // Antoni
};

// ─── Provider Detection ───

function selectTTSProvider(keys: VoiceActingKeys): TTSProvider {
  if (keys.elevenlabsKey) return "elevenlabs";
  if (keys.openaiKey) return "openai";
  return "pollinations";
}

function getVoiceForCharacter(
  characterName: string,
  characterVoice: CharacterVoice | undefined,
  provider: TTSProvider,
  characterIndex: number
): string {
  // If explicit voice ID provided, use it
  if (characterVoice?.voiceId) return characterVoice.voiceId;

  // Auto-assign based on gender/age
  const gender = characterVoice?.gender || (characterIndex % 2 === 0 ? "male" : "female");
  const age = characterVoice?.age || "adult";
  const key = `${gender}_${age}`;

  if (provider === "elevenlabs") {
    return ELEVENLABS_VOICE_PRESETS[key] || ELEVENLABS_VOICE_PRESETS["neutral"];
  } else if (provider === "openai") {
    return OPENAI_VOICE_PRESETS[key] || OPENAI_VOICE_PRESETS["neutral"];
  }
  // Pollinations — return a descriptive string
  return `${gender}-${age}`;
}

// ─── ElevenLabs TTS ───

async function generateElevenLabsAudio(
  apiKey: string,
  text: string,
  voiceId: string,
  emotion?: string,
  settings?: { stability?: number; similarityBoost?: number; style?: number }
): Promise<Buffer> {
  // Prepend emotion direction to text for better expressiveness
  let processedText = text;
  if (emotion) {
    // ElevenLabs responds well to SSML-like emotion cues in the text
    const emotionMap: Record<string, string> = {
      "angry": "*speaking with intense anger*",
      "whispered": "*whispering softly*",
      "sarcastic": "*with dripping sarcasm*",
      "sad": "*voice breaking with sadness*",
      "excited": "*with breathless excitement*",
      "scared": "*trembling with fear*",
      "confident": "*speaking with authority*",
      "tender": "*gently, with warmth*",
      "shouting": "*SHOUTING*",
      "laughing": "*laughing*",
      "crying": "*through tears*",
      "cold": "*in a cold, detached tone*",
      "seductive": "*in a low, alluring voice*",
      "panicked": "*in a panicked rush*",
    };
    const prefix = emotionMap[emotion.toLowerCase()] || `*${emotion}*`;
    processedText = `${prefix} ${text}`;
  }

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text: processedText,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: settings?.stability ?? 0.5,
        similarity_boost: settings?.similarityBoost ?? 0.75,
        style: settings?.style ?? 0.5,
        use_speaker_boost: true,
      },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`ElevenLabs TTS error ${resp.status}: ${errText}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

// ─── OpenAI TTS ───

async function generateOpenAIAudio(
  apiKey: string,
  text: string,
  voice: string,
  emotion?: string
): Promise<Buffer> {
  // OpenAI TTS doesn't have explicit emotion control, but responds to text cues
  let processedText = text;
  if (emotion) {
    processedText = `[${emotion}] ${text}`;
  }

  const resp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1-hd",
      input: processedText,
      voice: voice,
      response_format: "mp3",
      speed: 1.0,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI TTS error ${resp.status}: ${errText}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

// ─── Pollinations TTS (Free Fallback) ───

async function generatePollinationsAudio(
  text: string,
  voice: string,
  _emotion?: string
): Promise<Buffer> {
  // Pollinations offers free TTS via their API
  const encodedText = encodeURIComponent(text);
  const url = `https://text.pollinations.ai/speech?text=${encodedText}&voice=${voice}`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) {
    // Fallback: use OpenAI-compatible endpoint on Pollinations
    const fallbackResp = await fetch("https://text.pollinations.ai/openai/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai-audio",
        input: text,
        voice: "nova",
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!fallbackResp.ok) {
      throw new Error(`Pollinations TTS failed: ${resp.status}`);
    }
    return Buffer.from(await fallbackResp.arrayBuffer());
  }

  return Buffer.from(await resp.arrayBuffer());
}

// ─── Audio Stitching ───

/**
 * Stitch multiple audio clips with pauses between them into a single track.
 * Uses ffmpeg to concatenate with silence gaps.
 */
async function stitchDialogueAudio(
  clips: Array<{ buffer: Buffer; pauseAfterMs: number }>,
): Promise<{ buffer: Buffer; durationSeconds: number }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-voice-"));

  try {
    // Write each clip to a temp file
    const clipFiles: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clipPath = path.join(tmpDir, `clip_${String(i).padStart(3, "0")}.mp3`);
      await fs.promises.writeFile(clipPath, clips[i].buffer);
      clipFiles.push(clipPath);

      // Generate silence gap if needed
      if (clips[i].pauseAfterMs > 0 && i < clips.length - 1) {
        const silencePath = path.join(tmpDir, `silence_${String(i).padStart(3, "0")}.mp3`);
        const silenceDuration = clips[i].pauseAfterMs / 1000;
        await execFileAsync("ffmpeg", [
          "-f", "lavfi",
          "-i", `anullsrc=r=44100:cl=stereo`,
          "-t", String(silenceDuration),
          "-c:a", "libmp3lame",
          "-b:a", "128k",
          "-y",
          silencePath,
        ], { timeout: 10000 });
        clipFiles.push(silencePath);
      }
    }

    // Create concat list
    const concatListPath = path.join(tmpDir, "concat.txt");
    const concatContent = clipFiles.map(f => `file '${f}'`).join("\n");
    await fs.promises.writeFile(concatListPath, concatContent);

    // Concatenate all clips
    const outputPath = path.join(tmpDir, "dialogue_track.mp3");
    await execFileAsync("ffmpeg", [
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      "-ar", "44100",
      "-ac", "2",
      "-y",
      outputPath,
    ], { timeout: 120000 });

    // Get duration
    let durationSeconds = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        outputPath,
      ], { timeout: 10000 });
      const info = JSON.parse(stdout);
      durationSeconds = parseFloat(info.format?.duration || "0");
    } catch { /* ignore */ }

    const buffer = await fs.promises.readFile(outputPath);
    return { buffer, durationSeconds };
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Main Entry Point ───

/**
 * Generate voice acting audio for a scene's dialogue.
 * Returns an audio track with all dialogue lines spoken by AI voices.
 */
export async function generateSceneDialogue(
  keys: VoiceActingKeys,
  request: SceneDialogueRequest
): Promise<VoiceActingResult> {
  const provider = selectTTSProvider(keys);
  const { dialogueLines, characterVoices } = request;

  if (dialogueLines.length === 0) {
    throw new Error("No dialogue lines provided");
  }

  console.log(`[VoiceActing] Generating ${dialogueLines.length} lines via ${provider}`);

  // Track unique characters for voice assignment
  const characterIndex = new Map<string, number>();
  let charIdx = 0;
  for (const line of dialogueLines) {
    if (!characterIndex.has(line.characterName)) {
      characterIndex.set(line.characterName, charIdx++);
    }
  }

  // Generate audio for each line
  const clips: Array<{ buffer: Buffer; pauseAfterMs: number }> = [];

  for (let i = 0; i < dialogueLines.length; i++) {
    const line = dialogueLines[i];
    const idx = characterIndex.get(line.characterName) || 0;
    const charVoice = characterVoices?.[line.characterName];
    const voiceId = getVoiceForCharacter(line.characterName, charVoice, provider, idx);

    console.log(`[VoiceActing] Line ${i + 1}/${dialogueLines.length}: ${line.characterName} (${provider}:${voiceId})`);

    let audioBuffer: Buffer;

    try {
      switch (provider) {
        case "elevenlabs":
          audioBuffer = await generateElevenLabsAudio(
            keys.elevenlabsKey!,
            line.line,
            voiceId,
            line.emotion,
            {
              stability: charVoice?.stability,
              similarityBoost: charVoice?.similarityBoost,
              style: charVoice?.style,
            }
          );
          break;

        case "openai":
          audioBuffer = await generateOpenAIAudio(
            keys.openaiKey!,
            line.line,
            voiceId,
            line.emotion
          );
          break;

        case "pollinations":
        default:
          audioBuffer = await generatePollinationsAudio(
            line.line,
            voiceId,
            line.emotion
          );
          break;
      }
    } catch (err: any) {
      console.error(`[VoiceActing] Failed to generate line ${i + 1}:`, err.message);
      // Generate a short silence as placeholder for failed lines
      audioBuffer = Buffer.alloc(0);
      continue; // Skip this line
    }

    if (audioBuffer.length > 0) {
      clips.push({
        buffer: audioBuffer,
        pauseAfterMs: line.pauseAfterMs ?? 800,
      });
    }
  }

  if (clips.length === 0) {
    throw new Error("Failed to generate any dialogue audio");
  }

  // Stitch all clips together with pauses
  const { buffer: finalAudio, durationSeconds } = await stitchDialogueAudio(clips);

  // Upload to S3
  const key = `dialogue/${request.projectId}/scene-${request.sceneId}-dialogue-${Date.now()}.mp3`;
  const { url: audioUrl } = await storagePut(key, finalAudio, "audio/mpeg");

  console.log(`[VoiceActing] Scene dialogue generated: ${durationSeconds.toFixed(1)}s, ${clips.length} lines, via ${provider}`);

  return {
    audioUrl,
    durationSeconds,
    provider,
    lineCount: clips.length,
  };
}

/**
 * Generate narration audio (single voice, for voiceover/intro/outro).
 */
export async function generateNarration(
  keys: VoiceActingKeys,
  text: string,
  options?: {
    voice?: string;
    emotion?: string;
    projectId?: number;
  }
): Promise<{ audioUrl: string; durationSeconds: number; provider: TTSProvider }> {
  const provider = selectTTSProvider(keys);

  let audioBuffer: Buffer;

  switch (provider) {
    case "elevenlabs":
      audioBuffer = await generateElevenLabsAudio(
        keys.elevenlabsKey!,
        text,
        options?.voice || ELEVENLABS_VOICE_PRESETS["narrator"],
        options?.emotion
      );
      break;

    case "openai":
      audioBuffer = await generateOpenAIAudio(
        keys.openaiKey!,
        text,
        options?.voice || "onyx",
        options?.emotion
      );
      break;

    case "pollinations":
    default:
      audioBuffer = await generatePollinationsAudio(
        text,
        options?.voice || "male-adult",
        options?.emotion
      );
      break;
  }

  const key = `narration/${options?.projectId || "general"}/narration-${Date.now()}.mp3`;
  const { url: audioUrl } = await storagePut(key, audioBuffer, "audio/mpeg");

  // Get duration
  let durationSeconds = text.split(" ").length / 2.5; // rough estimate: 2.5 words/sec
  
  return { audioUrl, durationSeconds, provider };
}

// ─── Provider Info ───

export const TTS_PROVIDERS = [
  {
    id: "elevenlabs" as TTSProvider,
    name: "ElevenLabs",
    description: "Industry-leading AI voices with the most natural emotion and expression. Best for film dialogue.",
    keyPrefix: "",
    signupUrl: "https://elevenlabs.io/sign-up",
    pricing: "Free tier: 10K chars/month. Starter: $5/mo (30K chars). Pro: $22/mo (100K chars).",
    quality: "Ultra-premium — indistinguishable from human actors",
  },
  {
    id: "openai" as TTSProvider,
    name: "OpenAI TTS",
    description: "High-quality text-to-speech with 6 distinct voices. Good emotion range.",
    keyPrefix: "sk-",
    signupUrl: "https://platform.openai.com/api-keys",
    pricing: "TTS-1: $15/1M chars. TTS-1-HD: $30/1M chars.",
    quality: "Premium — natural and expressive",
  },
  {
    id: "pollinations" as TTSProvider,
    name: "Pollinations TTS (Free)",
    description: "Free text-to-speech. Basic quality but no API key required.",
    keyPrefix: "",
    signupUrl: "https://pollinations.ai",
    pricing: "FREE",
    quality: "Basic — functional but less expressive",
  },
];
