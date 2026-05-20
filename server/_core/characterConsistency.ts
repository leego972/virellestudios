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
  /** true = non-human: creature/animal/robot. No human actor. */
  isNonHuman?: boolean;
  /** animal | creature | robot | monster | puppet | mutant | alien | supernatural | fantasy */
  costumeType?: string;
  /** Hard-lock: AI must match referenceImageUrl exactly every frame */
  referenceImageLocked?: boolean;
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
  isNonHuman?: boolean | null;
  costumeType?: string | null;
  referenceImageLocked?: boolean | null;
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

  // Build the prompt anchor — a structured, cinematographer-grade descriptor
  // Priority: faceDnaPrompt (from photo analysis) > manual description > auto-built
  // The anchor is structured in sections so the AI model can parse and weight each category.
  const sections: string[] = [];

  // ── Core identity ──
  const identityParts = [`${attrs.age} ${attrs.gender}`];
  if (attrs.ethnicity !== "unspecified") identityParts.push(attrs.ethnicity);
  if (attrs.nationality) identityParts.push(`${attrs.nationality} nationality`);
  sections.push(identityParts.join(", "));

  // ── Face DNA (from photo analysis — highest fidelity) ──
  if (character.faceDnaPrompt) {
    // The faceDnaPrompt is already structured with | separators from the photo analysis
    sections.push(character.faceDnaPrompt);
  } else {
    // Auto-build from structured fields
    const faceSection: string[] = [];
    faceSection.push(`${attrs.faceShape} face`);
    faceSection.push(`${attrs.skinTone} skin`);
    faceSection.push(`${attrs.eyeColor} eyes`);
    faceSection.push(`${attrs.hairLength} ${attrs.hairColor} ${attrs.hairStyle} hair`.trim());
    if (attrs.distinguishingFeatures.length > 0) {
      faceSection.push(`DISTINGUISHING: ${attrs.distinguishingFeatures.join(", ")}`);
    }
    sections.push(faceSection.join(" | "));
  }

  // ── Body DNA ──
  if (character.bodyDnaPrompt) {
    sections.push(character.bodyDnaPrompt);
  } else {
    const bodySection: string[] = [];
    bodySection.push(`${attrs.build} build`);
    if (attrs.height) bodySection.push(attrs.height);
    if (attrs.weight) bodySection.push(attrs.weight);
    if (attrs.fitnessLevel) bodySection.push(`${attrs.fitnessLevel} fitness`);
    if (attrs.posture) bodySection.push(`${attrs.posture} posture`);
    if (bodySection.length > 1) sections.push(bodySection.join(", "));
  }

  // ── Wardrobe — scene-specific override takes priority over character default ──
  if (sceneWardrobeOverride?.wardrobeDescription) {
    const wardrobeParts = [`wearing ${sceneWardrobeOverride.wardrobeDescription}`];
    if (sceneWardrobeOverride.makeupNotes) wardrobeParts.push(`makeup: ${sceneWardrobeOverride.makeupNotes}`);
    if (sceneWardrobeOverride.hairNotes) wardrobeParts.push(`hair: ${sceneWardrobeOverride.hairNotes}`);
    if (sceneWardrobeOverride.accessories) wardrobeParts.push(`accessories: ${sceneWardrobeOverride.accessories}`);
    sections.push(wardrobeParts.join(", "));
  } else if (attrs.clothing) {
    sections.push(`wearing ${attrs.clothing}`);
  } else {
    // ── Default wardrobe: plain black until clothing is purchased & assigned ──
    sections.push(
      "wearing a plain all-black outfit — solid black top, black trousers or skirt, " +
      "black shoes; no visible branding, no pattern, no colour accent; " +
      "placeholder wardrobe — upgrade by leasing from the Virelle wardrobe marketplace"
    );
  }

  // ── Director consistency notes ──
  if (character.consistencyNotes) {
    sections.push(`CONSISTENCY DIRECTIVE: ${character.consistencyNotes}`);
  }

  // ── Photorealism enforcement — always injected, character-specific where possible ──
  sections.push(
    "photorealistic human face with authentic natural imperfections — " +
    "skin with visible pores, micro-wrinkles, subsurface scattering, fine peach fuzz — " +
    "eyes with detailed iris fiber structure, limbal ring, corneal reflections, subtle waterline moisture — " +
    "individual hair strand detail with natural flyaways — " +
    "NOT CGI, NOT AI-generated look, NOT plastic skin"
  );

  // Non-human/creature/animal: Mystique=mutant, Babe=pig, T-800=robot.
  // No human actor needed. Reference image IS their identity.
  let promptAnchor: string;
  if (character.isNonHuman) {
    const typeLabel = character.costumeType
      ? character.costumeType.charAt(0).toUpperCase() + character.costumeType.slice(1)
      : 'Creature';
    const baseDesc = character.description || sections.join(' || ') || 'unique appearance';
    const lockNote = character.referenceImageLocked
      ? ' APPEARANCE HARD-LOCKED — match reference image EXACTLY every frame. Zero deviation.'
      : ' Maintain this creature/animal/robot appearance consistently across all scenes.';
    promptAnchor = `[${typeLabel.toUpperCase()} "${character.name}": ${baseDesc}.${lockNote}]`;
  } else {
    promptAnchor = `[CHARACTER ${character.name}: ${sections.join(' || ')}]`;
  }

  return {
    characterId: character.id,
    name: character.name,
    physicalDescription: character.description || promptAnchor,
    referenceImageUrl: character.referenceImageUrl || character.thumbnailUrl || undefined,
    isNonHuman: character.isNonHuman ?? false,
    costumeType: character.costumeType ?? undefined,
    referenceImageLocked: character.referenceImageLocked ?? false,
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

  // ─── Scene Coherence Context (v6.32+) ─────────────────────────────────────────
  // Injected into every scene prompt so backgrounds, vehicles, props, animals,
  // creatures and character states remain locked across both quick-generate
  // and manual scene-by-scene generation.
  export interface SceneCoherenceContext {
    background?: {
      name: string;
      backgroundType?: string | null; // 'location'|'vehicle'|'vessel'|'aircraft'
      description?: string | null;
      styleNotes?: string | null;
      vehicleMake?: string | null;
      vehicleModel?: string | null;
      vehicleYear?: number | null;
      vehicleColor?: string | null;
      vehicleInterior?: string | null;
      vehicleCondition?: string | null;
      locationTags?: any[] | null;
    } | null;
    props?: Array<{
      name: string; description?: string | null; category?: string | null;
      colors?: any[] | null; characterId?: number | null; usageNotes?: string | null;
    }> | null;
    characterStates?: Array<{
      characterId: number; label: string; stateType: string;
      description: string; promptOverride?: string | null;
    }> | null;
    wardrobeByCharacter?: Record<number, string> | null;
    visualDNA?: {
      genreProfile?: string | null; lensProfile?: string | null;
      lightingStyle?: string | null; colorPalette?: string | null;
      filmStock?: string | null; globalColorGrade?: string | null;
      globalColorGradeLocked?: boolean | null; cinematographer?: string | null;
    } | null;
  }

  function buildBackgroundSection(bg: SceneCoherenceContext['background']): string {
    if (!bg) return '';
    const t = (bg.backgroundType || 'location').toLowerCase();
    if (t === 'vehicle') {
      const tag = [bg.vehicleYear?String(bg.vehicleYear):'', bg.vehicleColor||'',
        `${bg.vehicleMake||''} ${bg.vehicleModel||''}`.trim()].filter(Boolean).join(' ');
      const interior  = bg.vehicleInterior  ? `, ${bg.vehicleInterior} interior`  : '';
      const condition = bg.vehicleCondition ? `, ${bg.vehicleCondition} condition` : '';
      return `[VEHICLE LOCK — "${bg.name}": ${tag}${interior}${condition}. Character operates THIS specific vehicle. NEVER substitute another make, model or colour.]`;
    }
    if (t === 'vessel') return `[VESSEL LOCK — "${bg.name}"${bg.description?' — '+bg.description:''}. Maintain exact hull, rigging and deck condition in all shots.]`;
    if (t === 'aircraft') return `[AIRCRAFT LOCK — "${bg.name}"${bg.description?' — '+bg.description:''}. Maintain livery, registration and interior consistently.]`;
    const parts:string[]=[];
    if(bg.description)parts.push(bg.description);if(bg.styleNotes)parts.push(`Style: ${bg.styleNotes}`);
    if(Array.isArray(bg.locationTags)&&bg.locationTags.length)parts.push(`Tags: ${bg.locationTags.join(', ')}`);
    return `[LOCATION LOCK — "${bg.name}": ${parts.join('. ')}. Visual consistency required across all scenes set here.]`;
  }
  function buildPropsSection(props:SceneCoherenceContext['props']):string{
    if(!props?.length)return'';
    return `[LOCKED PROPS — maintain exact visual identity: ${props.map(p=>[p.name,p.category?`(${p.category})`:'',p.description?`— ${p.description}`:'',Array.isArray(p.colors)&&p.colors.length?`color:${p.colors.join('/')}`:'',p.usageNotes?`[${p.usageNotes}]`:''].filter(Boolean).join(' ')).join(' | ')}]`;
  }
  function buildCharacterStateSection(states:SceneCoherenceContext['characterStates'],charIds:number[]):string{
    if(!states?.length)return'';
    const rel=states.filter(s=>charIds.includes(s.characterId));
    if(!rel.length)return'';
    return `[CHARACTER STATES THIS SCENE: ${rel.map(s=>s.promptOverride||(`${s.label}: ${s.description}`)).join(' | ')}]`;
  }
  function buildWardrobeSection(map:Record<number,string>|null|undefined,charIds:number[]):string{
    if(!map)return'';
    const e=charIds.filter(id=>map[id]).map(id=>map[id]);
    return e.length?`[COSTUME LOCK: ${e.join(' | ')}]`:'';
  }
  function buildVisualDNASection(dna:SceneCoherenceContext['visualDNA']):string{
    if(!dna)return'';
    const p:string[]=[];
    if(dna.genreProfile)p.push(`Genre: ${dna.genreProfile}`);
    if(dna.cinematographer)p.push(`Cinematography after: ${dna.cinematographer}`);
    if(dna.lensProfile)p.push(`Lens: ${dna.lensProfile}`);
    if(dna.lightingStyle)p.push(`Lighting: ${dna.lightingStyle}`);
    if(dna.colorPalette)p.push(`Palette: ${dna.colorPalette}`);
    if(dna.filmStock)p.push(`Film stock: ${dna.filmStock}`);
    if(dna.globalColorGrade&&dna.globalColorGradeLocked)p.push(`Color grade LOCKED: ${dna.globalColorGrade}`);
    return p.length?`[VISUAL DNA LOCK — apply every frame: ${p.join(' | ')}]`:'';
  }

  export function generateConsistentScenePrompt(
  chain: ContinuityChain,
  sceneIndex: number,
  basePrompt: string,
  coherenceCtx?: SceneCoherenceContext
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

  // 3. Inject coherence context (both quick-generate & manual scenes)
  //    Covers: location/vehicle locks, props, creatures/animals, character
  //    states, Visual DNA, wardrobe assignments.
  const coherenceSections: string[] = [withContinuity];
  if (coherenceCtx) {
    for (const s of [
      buildBackgroundSection(coherenceCtx.background),
      buildPropsSection(coherenceCtx.props),
      buildCharacterStateSection(coherenceCtx.characterStates, scene.characterIds),
      buildWardrobeSection(coherenceCtx.wardrobeByCharacter, scene.characterIds),
      buildVisualDNASection(coherenceCtx.visualDNA),
    ]) { if (s) coherenceSections.push(s); }
  }
  const enhancedPrompt = coherenceSections.filter(Boolean).join('\n\n');

  // 4. Reference image: creature/animal hard-lock takes priority over last frame
  //    (Babe stays a pig, not a warthog)
  const nonHumanRef = chain.characters
    .filter(c => scene.characterIds.includes(c.characterId)
      && (c as any).referenceImageLocked && c.referenceImageUrl)
    .map(c => c.referenceImageUrl)[0];
  const referenceImageUrl = nonHumanRef || previousScene?.lastFrameUrl;

  // 5. Character prompt anchors
  const characterPromptAnchors = chain.characters
    .filter(c => scene.characterIds.includes(c.characterId))
    .map(c => c.promptAnchor);

  return { enhancedPrompt, referenceImageUrl, characterPromptAnchors };
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
