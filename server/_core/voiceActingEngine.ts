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
  emotion?: string;       // One of EMOTION_PROFILES keys
  direction?: string;     // Free-text acting direction, e.g. "jaw tight, eyes not leaving the door"
  pacing?: string;        // "slow" | "normal" | "fast" | "staccato" | "trailing"
  pauseAfterMs?: number;  // Pause after this line in ms (default 800ms)
}

export interface SceneDialogueRequest {
  sceneId: number;
  projectId: number;
  dialogueLines: DialogueLine[];
  characterVoices?: Record<string, CharacterVoice>;
  sceneDescription?: string;
  genre?: string;
}

export interface CharacterVoice {
  /** ElevenLabs voice ID or OpenAI voice name */
  voiceId?: string;
  /** Voice characteristics for auto-assignment */
  gender?: "male" | "female" | "neutral";
  age?: "young" | "adult" | "elderly";
  accent?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
}

export interface VoiceActingResult {
  audioUrl: string;        // S3 URL of the final dialogue audio
  durationSeconds: number; // Total duration of the dialogue track
  provider: TTSProvider;
  lineCount: number;
}

// ─── Emotion Profile Registry ─────────────────────────────────────────────────

export interface EmotionProfile {
  prefix: string;
  stability: number;
  similarity: number;
  style: number;
  speedHint: string;
  deliveryNote: string;
}

export const EMOTION_PROFILES: Record<string, EmotionProfile> = {
  neutral:      { prefix: "", stability: 0.55, similarity: 0.75, style: 0.35, speedHint: "natural conversational pace", deliveryNote: "Neutral, natural delivery" },
  happy:        { prefix: "*with genuine warmth and happiness*", stability: 0.45, similarity: 0.75, style: 0.65, speedHint: "slightly upbeat, warm", deliveryNote: "Warm and upbeat — smile in the voice" },
  cheerful:     { prefix: "*brightly, with infectious cheerfulness*", stability: 0.40, similarity: 0.70, style: 0.75, speedHint: "bright, energetic, slightly faster", deliveryNote: "Bright and energetic — light, bouncy delivery" },
  excited:      { prefix: "*with breathless excitement, barely containing it*", stability: 0.30, similarity: 0.70, style: 0.85, speedHint: "fast, breathless, forward-leaning", deliveryNote: "Fast and breathless — energy spilling over" },
  loving:       { prefix: "*softly, with deep tenderness and love*", stability: 0.65, similarity: 0.80, style: 0.55, speedHint: "slow, gentle, intimate", deliveryNote: "Slow and tender — intimate, close delivery" },
  hopeful:      { prefix: "*with quiet, fragile hope*", stability: 0.55, similarity: 0.75, style: 0.50, speedHint: "measured, slightly tentative", deliveryNote: "Measured and earnest — vulnerability beneath the hope" },
  confident:    { prefix: "*speaking with calm, unshakeable authority*", stability: 0.70, similarity: 0.80, style: 0.45, speedHint: "deliberate, unhurried, commanding", deliveryNote: "Deliberate and commanding — no hesitation" },
  proud:        { prefix: "*with unmistakable pride, chin up*", stability: 0.65, similarity: 0.78, style: 0.55, speedHint: "measured, slightly elevated", deliveryNote: "Elevated and self-assured" },
  sad:          { prefix: "*voice heavy with sadness, barely holding together*", stability: 0.60, similarity: 0.80, style: 0.60, speedHint: "slow, heavy, trailing off at ends", deliveryNote: "Heavy and slow — words cost something to say" },
  crying:       { prefix: "*through tears, voice breaking*", stability: 0.35, similarity: 0.75, style: 0.70, speedHint: "halting, broken, uneven rhythm", deliveryNote: "Broken and halting — voice cracks on key words" },
  grief:        { prefix: "*devastated, hollow with grief*", stability: 0.40, similarity: 0.75, style: 0.65, speedHint: "very slow, hollow, almost inward", deliveryNote: "Hollow and devastated — barely audible at times" },
  angry:        { prefix: "*with barely controlled fury, jaw tight*", stability: 0.25, similarity: 0.70, style: 0.90, speedHint: "clipped, tense, each word deliberate and hard", deliveryNote: "Clipped and tense — controlled rage is more frightening than shouting" },
  aggressive:   { prefix: "*aggressively, leaning in, voice raised*", stability: 0.20, similarity: 0.68, style: 0.95, speedHint: "loud, fast, forward-driving, no pauses", deliveryNote: "Loud and driving — physical aggression in the voice" },
  shouting:     { prefix: "*SHOUTING at full volume*", stability: 0.15, similarity: 0.65, style: 1.0, speedHint: "full volume, fast, no restraint", deliveryNote: "Full-volume shout — raw and uncontrolled" },
  bitter:       { prefix: "*with cold, quiet bitterness*", stability: 0.50, similarity: 0.75, style: 0.70, speedHint: "slow and deliberate, each word chosen to wound", deliveryNote: "Cold and deliberate — every word chosen to sting" },
  contemptuous: { prefix: "*dripping with contempt, barely deigning to speak*", stability: 0.55, similarity: 0.75, style: 0.75, speedHint: "slow, dismissive, slightly clipped", deliveryNote: "Dismissive and slow — the other person isn't worth full effort" },
  disgusted:    { prefix: "*with visible disgust, recoiling slightly*", stability: 0.45, similarity: 0.72, style: 0.72, speedHint: "clipped, slightly rushed, pulling away", deliveryNote: "Clipped and recoiling — physical revulsion in the voice" },
  threatening:  { prefix: "*in a low, dangerous tone — a promise, not a warning*", stability: 0.60, similarity: 0.78, style: 0.80, speedHint: "very slow, very quiet, each word landing like a stone", deliveryNote: "Quiet and slow — the quieter the voice, the more dangerous" },
  fearful:      { prefix: "*trembling with fear, voice barely steady*", stability: 0.30, similarity: 0.72, style: 0.75, speedHint: "uneven, slightly fast, voice catching", deliveryNote: "Uneven and catching — fear makes the voice unreliable" },
  panicked:     { prefix: "*in a panicked rush, words tumbling out*", stability: 0.20, similarity: 0.68, style: 0.88, speedHint: "very fast, breathless, no pauses, running together", deliveryNote: "Very fast and breathless — words trip over each other" },
  nervous:      { prefix: "*nervously, with small hesitations*", stability: 0.40, similarity: 0.73, style: 0.55, speedHint: "slightly halting, small pauses mid-sentence", deliveryNote: "Halting with small pauses — the mind working faster than the mouth" },
  surprised:    { prefix: "*genuinely caught off guard, voice jumping slightly*", stability: 0.30, similarity: 0.72, style: 0.78, speedHint: "starts fast then slows as it registers", deliveryNote: "Starts fast then slows — the brain catching up to the mouth" },
  shocked:      { prefix: "*stunned into near-silence, barely able to form words*", stability: 0.35, similarity: 0.73, style: 0.72, speedHint: "very slow, halting, words don't quite form", deliveryNote: "Slow and halting — the mind has gone blank" },
  cold:         { prefix: "*in a cold, detached, clinical tone*", stability: 0.75, similarity: 0.80, style: 0.25, speedHint: "flat, even, no emotional variation", deliveryNote: "Flat and even — emotion has been deliberately removed" },
  resigned:     { prefix: "*with quiet resignation, the fight gone out of them*", stability: 0.65, similarity: 0.78, style: 0.45, speedHint: "slow, flat, trailing off", deliveryNote: "Slow and flat — they've stopped fighting" },
  grumpy:       { prefix: "*grumpily, with low-level irritation*", stability: 0.45, similarity: 0.73, style: 0.60, speedHint: "slightly clipped, low energy, muttering quality", deliveryNote: "Clipped and muttered — low-level irritation throughout" },
  tired:        { prefix: "*exhausted, running on empty*", stability: 0.60, similarity: 0.78, style: 0.40, speedHint: "slow, low energy, slightly slurred at ends of words", deliveryNote: "Slow and low — every word is an effort" },
  bored:        { prefix: "*with flat, undisguised boredom*", stability: 0.70, similarity: 0.78, style: 0.20, speedHint: "monotone, slow, trailing off, barely engaged", deliveryNote: "Monotone and trailing — they'd rather be anywhere else" },
  confused:     { prefix: "*genuinely confused, working it out as they speak*", stability: 0.40, similarity: 0.73, style: 0.50, speedHint: "halting, rising intonation mid-sentence, questioning", deliveryNote: "Halting with rising intonation — thinking out loud" },
  sarcastic:    { prefix: "*with dripping sarcasm, every word a small performance*", stability: 0.45, similarity: 0.73, style: 0.80, speedHint: "slightly slow and deliberate, exaggerated emphasis", deliveryNote: "Deliberate and exaggerated — the performance is the point" },
  mocking:      { prefix: "*mockingly, mimicking or belittling*", stability: 0.40, similarity: 0.70, style: 0.82, speedHint: "exaggerated, slightly sing-song, drawn out", deliveryNote: "Exaggerated and sing-song — cruelty dressed as humour" },
  pleading:     { prefix: "*pleading desperately, voice raw with need*", stability: 0.35, similarity: 0.73, style: 0.72, speedHint: "fast at first, slowing as desperation deepens", deliveryNote: "Raw and urgent — dignity abandoned" },
  desperate:    { prefix: "*with raw, unguarded desperation*", stability: 0.28, similarity: 0.70, style: 0.85, speedHint: "fast and uneven, voice cracking under pressure", deliveryNote: "Fast and cracking — nothing held back" },
  whisper:      { prefix: "*whispering softly, barely above breath*", stability: 0.70, similarity: 0.82, style: 0.30, speedHint: "very slow, intimate, barely audible", deliveryNote: "Barely above breath — intimate and close" },
  seductive:    { prefix: "*in a low, deliberate, alluring voice*", stability: 0.65, similarity: 0.80, style: 0.60, speedHint: "slow, low, each word drawn out slightly", deliveryNote: "Slow and low — every word chosen for effect" },
};

export const EMOTION_STATES = Object.keys(EMOTION_PROFILES);

export const EMOTION_GROUPS: Record<string, string[]> = {
  "Neutral":          ["neutral"],
  "Positive":         ["happy", "cheerful", "excited", "loving", "hopeful", "confident", "proud"],
  "Anger & Tension":  ["angry", "aggressive", "shouting", "bitter", "contemptuous", "disgusted", "threatening"],
  "Sadness & Loss":   ["sad", "crying", "grief", "resigned"],
  "Fear & Anxiety":   ["fearful", "panicked", "nervous", "surprised", "shocked"],
  "Detached":         ["cold", "grumpy", "tired", "bored", "confused"],
  "Performative":     ["sarcastic", "mocking", "pleading", "desperate", "whisper", "seductive"],
};

// ─── Voice Presets ────────────────────────────────────────────────────────────

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

  // Detect narrator / V.O. / god voice / off-screen by character name
  const nameLower = characterName.toLowerCase();
  const isNarratorType =
    nameLower === "narrator" ||
    nameLower === "narration" ||
    nameLower.includes("narrator") ||
    nameLower.includes("god voice") ||
    nameLower.includes("omniscient") ||
    nameLower.includes("storyteller") ||
    nameLower.endsWith("(v.o.)") ||
    nameLower.endsWith("(o.s.)") ||
    nameLower.endsWith("v.o.") ||
    nameLower.endsWith("o.s.");

  if (isNarratorType) {
    if (provider === "elevenlabs") return ELEVENLABS_VOICE_PRESETS["narrator"];
    if (provider === "openai") return OPENAI_VOICE_PRESETS["male_adult"]; // deep, authoritative
    return "male-adult";
  }

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
  direction?: string,
  pacing?: string,
  settings?: { stability?: number; similarityBoost?: number; style?: number }
): Promise<Buffer> {
  const profile = EMOTION_PROFILES[emotion?.toLowerCase() ?? "neutral"] ?? EMOTION_PROFILES["neutral"];
  const cues: string[] = [];
  if (profile.prefix) cues.push(profile.prefix);
  if (direction) cues.push(`*${direction}*`);
  if (pacing && pacing !== "normal") {
    const pacingCues: Record<string, string> = {
      slow: "*speaking slowly and deliberately*",
      fast: "*speaking quickly*",
      staccato: "*each word clipped and separate*",
      trailing: "*voice trailing off at the end*",
    };
    if (pacingCues[pacing]) cues.push(pacingCues[pacing]);
  }
  const processedText = cues.length > 0 ? `${cues.join(" ")} ${text}` : text;

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
        stability:        settings?.stability        ?? profile.stability,
        similarity_boost: settings?.similarityBoost ?? profile.similarity,
        style:            settings?.style            ?? profile.style,
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
  emotion?: string,
  direction?: string,
  pacing?: string
): Promise<Buffer> {
  const profile = EMOTION_PROFILES[emotion?.toLowerCase() ?? "neutral"] ?? EMOTION_PROFILES["neutral"];
  const cues: string[] = [];
  if (emotion && emotion !== "neutral") cues.push(`[${emotion}: ${profile.deliveryNote}]`);
  if (direction) cues.push(`[direction: ${direction}]`);
  if (pacing && pacing !== "normal") cues.push(`[pacing: ${pacing} — ${profile.speedHint}]`);
  const processedText = cues.length > 0 ? `${cues.join(" ")} ${text}` : text;

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
            line.direction,
            line.pacing,
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
            line.emotion,
            line.direction,
            line.pacing
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
 * Infer emotion, pacing, and acting direction from screenplay context using AI.
 * Call this before generating audio to get professional delivery guidance.
 */
export async function inferEmotionFromContext(params: {
  line: string;
  characterName: string;
  characterDescription?: string;
  sceneDescription?: string;
  previousLines?: Array<{ characterName: string; line: string; emotion?: string }>;
  genre?: string;
  invokeLLM: (args: any) => Promise<any>;
}): Promise<{ emotion: string; pacing: string; direction: string; reasoning: string }> {
  const { line, characterName, characterDescription, sceneDescription, previousLines, genre, invokeLLM } = params;
  const contextBlock = previousLines && previousLines.length > 0
    ? previousLines.slice(-4).map(l => `${l.characterName.toUpperCase()}: "${l.line}"${l.emotion ? ` [${l.emotion}]` : ""}`).join("\n")
    : "No prior context";
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a professional film director and voice director with 30 years of Hollywood experience. Analyse a dialogue line in its full dramatic context and determine the precise emotional delivery.\n\nReturn JSON with:\n- emotion: one of: ${EMOTION_STATES.join(", ")}\n- pacing: one of: slow | normal | fast | staccato | trailing\n- direction: concise acting direction (max 12 words) — physical, specific, actable. e.g. "jaw tight, eyes not leaving the door"\n- reasoning: one sentence explaining why this delivery serves the scene\n\nRules:\n- Choose the emotion that serves the SCENE, not just the surface meaning of the words\n- Consider subtext — "I'm fine" after a loss is not "happy"\n- Pacing must reflect the emotional state: panic = fast, grief = slow, cold = flat/normal\n- Direction must be physical and specific, never vague ("with emotion" is not acceptable)\n- Genre matters: a thriller "angry" is colder and more controlled than a melodrama "angry"`,
      },
      {
        role: "user",
        content: `Film genre: ${genre || "Drama"}\nScene: ${sceneDescription || "Not specified"}\nCharacter: ${characterName}${characterDescription ? ` — ${characterDescription}` : ""}\n\nPrevious dialogue:\n${contextBlock}\n\nLine to analyse:\n${characterName.toUpperCase()}: "${line}"`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "emotion_inference",
        strict: true,
        schema: {
          type: "object",
          properties: {
            emotion: { type: "string" },
            pacing: { type: "string" },
            direction: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["emotion", "pacing", "direction", "reasoning"],
          additionalProperties: false,
        },
      },
    },
  });
  const result = JSON.parse(response.choices[0].message.content || "{}");
  if (!EMOTION_PROFILES[result.emotion]) result.emotion = "neutral";
  if (!["slow", "normal", "fast", "staccato", "trailing"].includes(result.pacing)) result.pacing = "normal";
  return result;
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
    direction?: string;
    pacing?: string;
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
        options?.emotion,
        options?.direction,
        options?.pacing
      );
      break;

    case "openai":
      audioBuffer = await generateOpenAIAudio(
        keys.openaiKey!,
        text,
        options?.voice || "onyx",
        options?.emotion,
        options?.direction,
        options?.pacing
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
