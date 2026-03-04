/**
 * Character Consistency & Scene Continuity Engine
 * 
 * Solves the two biggest problems in AI film generation:
 * 
 * 1. CHARACTER CONSISTENCY — Same character looks different in every scene
 *    Solution: Build a "character DNA" prompt that is injected into every
 *    scene prompt. Uses reference images + detailed physical descriptions
 *    to anchor the AI model's output.
 * 
 * 2. SCENE-TO-SCENE CONTINUITY — Jarring visual jumps between scenes
 *    Solution: Extract the last frame of each scene and use it as the
 *    reference image (img2vid) for the first shot of the next scene.
 *    Also maintains a "visual state" that tracks what the camera last saw.
 * 
 * This module provides:
 * - Character DNA prompt builder
 * - Scene continuity chain manager
 * - Visual state tracker
 * - Reference image management
 */

import { storagePut } from "../storage";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execFileAsync = promisify(execFile);

// ─── Types ───

export interface CharacterDNA {
  characterId: number;
  name: string;
  /** Detailed physical description — the core consistency anchor */
  physicalDescription: string;
  /** Reference image URL (uploaded photo or AI-generated reference) */
  referenceImageUrl?: string;
  /** Specific attributes for prompt injection */
  attributes: {
    gender: string;
    age: string;
    ethnicity: string;
    skinTone: string;
    build: string;
    height?: string;
    hairColor: string;
    hairStyle: string;
    hairLength: string;
    eyeColor: string;
    faceShape: string;
    distinguishingFeatures: string[];
    clothing?: string;
  };
  /** Compact prompt string (generated from attributes) */
  promptAnchor: string;
}

export interface SceneContinuityState {
  sceneId: number;
  orderIndex: number;
  /** Last frame URL from this scene */
  lastFrameUrl?: string;
  /** Visual description of what the camera last saw */
  lastVisualState: string;
  /** Location/setting of this scene */
  location: string;
  /** Time of day */
  timeOfDay: string;
  /** Weather conditions */
  weather: string;
  /** Characters present in this scene */
  characterIds: number[];
  /** Lighting setup */
  lighting: string;
}

export interface ContinuityChain {
  projectId: number;
  scenes: SceneContinuityState[];
  characters: CharacterDNA[];
}

// ─── Character DNA Builder ───

/**
 * Build a character DNA from database character record.
 * This creates a compact, highly specific prompt string that can be
 * injected into every scene prompt to maintain character appearance.
 */
export function buildCharacterDNA(character: {
  id: number;
  name: string;
  description?: string | null;
  gender?: string | null;
  ageRange?: string | null;
  ethnicity?: string | null;
  nationality?: string | null;
  skinTone?: string | null;
  build?: string | null;
  height?: string | null;
  weight?: string | null;
  fitnessLevel?: string | null;
  posture?: string | null;
  hairColor?: string | null;
  hairStyle?: string | null;
  hairLength?: string | null;
  eyeColor?: string | null;
  faceShape?: string | null;
  distinguishingFeatures?: string | null;
  clothing?: string | null;
  referenceImageUrl?: string | null;
  thumbnailUrl?: string | null;
  // Deep profile fields
  faceDnaPrompt?: string | null;
  bodyDnaPrompt?: string | null;
  consistencyNotes?: string | null;
  deepProfile?: string | null; // JSON string with CharacterAttributesExtended
}, sceneWardrobeOverride?: {
  wardrobeDescription?: string;
  wardrobeCategory?: string;
  makeupNotes?: string;
  hairNotes?: string;
  accessories?: string;
}): CharacterDNA {
  // Parse deep profile if available
  let deepProfile: any = null;
  if (character.deepProfile) {
    try { deepProfile = JSON.parse(character.deepProfile); } catch { /* ignore */ }
  }

  const attrs = {
    gender: character.gender || "unspecified",
    age: character.ageRange || "adult",
    ethnicity: character.ethnicity || deepProfile?.ethnicity || "unspecified",
    nationality: character.nationality || deepProfile?.nationality || undefined,
    skinTone: character.skinTone || "medium",
    build: character.build || "average",
    height: character.height || undefined,
    weight: character.weight || deepProfile?.weight || undefined,
    fitnessLevel: character.fitnessLevel || deepProfile?.fitnessLevel || undefined,
    posture: character.posture || deepProfile?.posture || undefined,
    hairColor: character.hairColor || "dark",
    hairStyle: character.hairStyle || "natural",
    hairLength: character.hairLength || "medium",
    eyeColor: character.eyeColor || "brown",
    faceShape: character.faceShape || "oval",
    distinguishingFeatures: character.distinguishingFeatures
      ? character.distinguishingFeatures.split(",").map(s => s.trim()).filter(Boolean)
      : [],
    clothing: sceneWardrobeOverride?.wardrobeDescription || character.clothing || undefined,
  };

  // Build the prompt anchor — a compact, specific description
  // Priority: faceDnaPrompt > manual description > auto-built
  const parts: string[] = [];

  // If director uploaded a reference photo and we have a face DNA prompt, use it
  if (character.faceDnaPrompt) {
    parts.push(character.faceDnaPrompt);
  } else {
    parts.push(`${attrs.age} ${attrs.gender}`);
    if (attrs.ethnicity !== "unspecified") parts.push(`${attrs.ethnicity}`);
    if (attrs.nationality) parts.push(`${attrs.nationality} nationality`);
    parts.push(`${attrs.skinTone} skin`);
    parts.push(`${attrs.build} build`);
    if (attrs.height) parts.push(`${attrs.height}`);
    if (attrs.weight) parts.push(`${attrs.weight}`);
    if (attrs.fitnessLevel) parts.push(`${attrs.fitnessLevel} fitness`);
    if (attrs.posture) parts.push(`${attrs.posture} posture`);
    parts.push(`${attrs.hairLength} ${attrs.hairColor} ${attrs.hairStyle} hair`);
    parts.push(`${attrs.eyeColor} eyes`);
    parts.push(`${attrs.faceShape} face`);
    if (attrs.distinguishingFeatures.length > 0) {
      parts.push(attrs.distinguishingFeatures.join(", "));
    }
  }

  // Body DNA override
  if (character.bodyDnaPrompt) {
    parts.push(character.bodyDnaPrompt);
  }

  // Wardrobe — scene-specific override takes priority over character default
  if (sceneWardrobeOverride?.wardrobeDescription) {
    parts.push(`wearing ${sceneWardrobeOverride.wardrobeDescription}`);
    if (sceneWardrobeOverride.makeupNotes) parts.push(`makeup: ${sceneWardrobeOverride.makeupNotes}`);
    if (sceneWardrobeOverride.hairNotes) parts.push(`hair styled: ${sceneWardrobeOverride.hairNotes}`);
    if (sceneWardrobeOverride.accessories) parts.push(`accessories: ${sceneWardrobeOverride.accessories}`);
  } else if (attrs.clothing) {
    parts.push(`wearing ${attrs.clothing}`);
  }

  // Consistency notes from director
  if (character.consistencyNotes) {
    parts.push(`[CONSISTENCY: ${character.consistencyNotes}]`);
  }

  const promptAnchor = `[${character.name}: ${parts.join(", ")}]`;

  return {
    characterId: character.id,
    name: character.name,
    physicalDescription: character.description || promptAnchor,
    referenceImageUrl: character.referenceImageUrl || character.thumbnailUrl || undefined,
    attributes: attrs,
    promptAnchor,
  };
}

/**
 * Inject character DNA into a scene prompt.
 * Places character descriptions at the beginning of the prompt
 * to give them maximum weight in the generation.
 */
export function injectCharacterDNA(
  scenePrompt: string,
  characters: CharacterDNA[],
  characterIdsInScene: number[]
): string {
  if (characterIdsInScene.length === 0) return scenePrompt;

  const relevantChars = characters.filter(c => characterIdsInScene.includes(c.characterId));
  if (relevantChars.length === 0) return scenePrompt;

  // Build character block
  const charBlock = relevantChars
    .map(c => c.promptAnchor)
    .join(" ");

  // Inject at the beginning for maximum weight
  return `${charBlock} — ${scenePrompt}`;
}

// ─── Scene Continuity Manager ───

/**
 * Build a continuity-aware prompt for a scene based on the previous scene's state.
 * This ensures visual coherence between consecutive scenes.
 */
export function buildContinuityPrompt(
  scenePrompt: string,
  previousState?: SceneContinuityState,
  currentScene?: {
    location?: string;
    timeOfDay?: string;
    weather?: string;
    lighting?: string;
  }
): string {
  if (!previousState) return scenePrompt;

  const continuityHints: string[] = [];

  // Same location? Maintain visual consistency
  if (currentScene?.location && previousState.location &&
      currentScene.location.toLowerCase() === previousState.location.toLowerCase()) {
    continuityHints.push(`same location as previous shot: ${previousState.location}`);
  }

  // Time continuity
  if (currentScene?.timeOfDay && previousState.timeOfDay &&
      currentScene.timeOfDay === previousState.timeOfDay) {
    continuityHints.push(`consistent ${currentScene.timeOfDay} lighting`);
  }

  // Weather continuity
  if (currentScene?.weather && previousState.weather &&
      currentScene.weather === previousState.weather) {
    continuityHints.push(`same ${currentScene.weather} weather conditions`);
  }

  if (continuityHints.length > 0) {
    return `[Continuity: ${continuityHints.join(", ")}] ${scenePrompt}`;
  }

  return scenePrompt;
}

// ─── Frame Extraction for Continuity ───

/**
 * Extract the last frame from a video URL and return it as a reference image.
 * This frame becomes the starting point for the next scene's generation.
 */
export async function extractContinuityFrame(
  videoUrl: string,
  projectId: number,
  sceneId: number,
  position: "first" | "last" = "last"
): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-continuity-"));

  try {
    // Download video
    const videoPath = path.join(tmpDir, "video.mp4");
    const resp = await fetch(videoUrl, { signal: AbortSignal.timeout(30000) });
    if (!resp.ok) return undefined;
    const buffer = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(videoPath, buffer);

    const framePath = path.join(tmpDir, `${position}_frame.jpg`);

    if (position === "last") {
      // Get duration first
      const { stdout: probeOut } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        videoPath,
      ], { timeout: 15000 });
      const info = JSON.parse(probeOut);
      const duration = parseFloat(info.format?.duration || "0");
      if (duration <= 0) return undefined;

      const seekTime = Math.max(0, duration - 0.1);
      await execFileAsync("ffmpeg", [
        "-ss", String(seekTime),
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        framePath,
      ], { timeout: 15000 });
    } else {
      // First frame
      await execFileAsync("ffmpeg", [
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        framePath,
      ], { timeout: 15000 });
    }

    // Check if frame was created
    try {
      await fs.promises.access(framePath);
    } catch {
      return undefined;
    }

    // Upload to S3
    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `continuity/${projectId}/scene-${sceneId}-${position}-${Date.now()}.jpg`;
    const { url } = await storagePut(key, frameBuffer, "image/jpeg");
    return url;
  } catch (err) {
    console.warn(`[Continuity] Failed to extract ${position} frame:`, err);
    return undefined;
  } finally {
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

// ─── Continuity Chain Builder ───

/**
 * Build a full continuity chain for a project.
 * This is called before film generation to plan the visual flow.
 */
export function buildContinuityChain(
  characters: Array<{
    id: number;
    name: string;
    description?: string | null;
    gender?: string | null;
    ageRange?: string | null;
    ethnicity?: string | null;
    skinTone?: string | null;
    build?: string | null;
    height?: string | null;
    hairColor?: string | null;
    hairStyle?: string | null;
    hairLength?: string | null;
    eyeColor?: string | null;
    faceShape?: string | null;
    distinguishingFeatures?: string | null;
    clothing?: string | null;
    referenceImageUrl?: string | null;
    thumbnailUrl?: string | null;
  }>,
  scenes: Array<{
    id: number;
    orderIndex: number;
    description?: string | null;
    locationType?: string | null;
    timeOfDay?: string | null;
    weather?: string | null;
    lighting?: string | null;
    characterIds?: number[];
  }>,
  projectId: number
): ContinuityChain {
  const characterDNAs = characters.map(c => buildCharacterDNA(c));

  const sceneStates: SceneContinuityState[] = scenes
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map(s => ({
      sceneId: s.id,
      orderIndex: s.orderIndex || 0,
      lastVisualState: s.description || "",
      location: s.locationType || "unknown",
      timeOfDay: s.timeOfDay || "day",
      weather: s.weather || "clear",
      characterIds: s.characterIds || [],
      lighting: s.lighting || "natural",
    }));

  return {
    projectId,
    scenes: sceneStates,
    characters: characterDNAs,
  };
}

/**
 * Generate a consistency-enhanced prompt for a specific scene.
 * Combines character DNA + scene continuity + cinematic prompt.
 */
export function generateConsistentScenePrompt(
  chain: ContinuityChain,
  sceneIndex: number,
  basePrompt: string
): {
  enhancedPrompt: string;
  referenceImageUrl?: string;
  characterPromptAnchors: string[];
} {
  const scene = chain.scenes[sceneIndex];
  if (!scene) return { enhancedPrompt: basePrompt, characterPromptAnchors: [] };

  const previousScene = sceneIndex > 0 ? chain.scenes[sceneIndex - 1] : undefined;

  // 1. Inject character DNA
  const withCharacters = injectCharacterDNA(basePrompt, chain.characters, scene.characterIds);

  // 2. Add continuity hints from previous scene
  const withContinuity = buildContinuityPrompt(withCharacters, previousScene, {
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    lighting: scene.lighting,
  });

  // 3. Get reference image from previous scene (if available)
  const referenceImageUrl = previousScene?.lastFrameUrl;

  // 4. Get character prompt anchors for this scene
  const characterPromptAnchors = chain.characters
    .filter(c => scene.characterIds.includes(c.characterId))
    .map(c => c.promptAnchor);

  return {
    enhancedPrompt: withContinuity,
    referenceImageUrl,
    characterPromptAnchors,
  };
}

/**
 * Update the continuity chain after a scene has been generated.
 * Records the last frame URL and visual state for the next scene.
 */
export function updateContinuityChainAfterGeneration(
  chain: ContinuityChain,
  sceneIndex: number,
  lastFrameUrl?: string,
  lastVisualState?: string
): ContinuityChain {
  const updated = { ...chain, scenes: [...chain.scenes] };
  if (updated.scenes[sceneIndex]) {
    updated.scenes[sceneIndex] = {
      ...updated.scenes[sceneIndex],
      lastFrameUrl: lastFrameUrl || updated.scenes[sceneIndex].lastFrameUrl,
      lastVisualState: lastVisualState || updated.scenes[sceneIndex].lastVisualState,
    };
  }
  return updated;
}
