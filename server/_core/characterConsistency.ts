import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { promisify } from "util";
import { storagePut } from "../storage";
import { logger } from "./logger";

const execFileAsync = promisify(execFile);

export interface CharacterDNA {
  characterId: number;
  name: string;
  physicalDescription: string;
  referenceImageUrl?: string;
  isNonHuman?: boolean;
  costumeType?: string;
  referenceImageLocked?: boolean;
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
  promptAnchor: string;
}

export interface SceneContinuityState {
  sceneId: number;
  orderIndex: number;
  lastFrameUrl?: string;
  lastVisualState: string;
  location: string;
  timeOfDay: string;
  weather: string;
  characterIds: number[];
  lighting: string;
}

export interface ContinuityChain {
  projectId: number;
  scenes: SceneContinuityState[];
  characters: CharacterDNA[];
}

type CharacterRecord = {
  id: number;
  name: string;
  description?: string | null;
  photoUrl?: string | null;
  attributes?: unknown;
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
  distinguishingFeatures?: string | string[] | null;
  clothing?: string | null;
  referenceImageUrl?: string | null;
  thumbnailUrl?: string | null;
  referenceImageLocked?: boolean | null;
  referenceGenerationPrompt?: string | null;
  isNonHuman?: boolean | null;
  costumeType?: string | null;
  faceDnaPrompt?: string | null;
  bodyDnaPrompt?: string | null;
  consistencyNotes?: string | null;
  deepProfile?: unknown;
  role?: string | null;
  storyImportance?: string | null;
  screenTime?: string | null;
  countryOfOrigin?: string | null;
  cityOfOrigin?: string | null;
  dateOfBirth?: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  socialClass?: string | null;
  religion?: string | null;
  languages?: unknown;
  personality?: unknown;
  arcType?: string | null;
  moralAlignment?: string | null;
  emotionalRange?: unknown;
  backstory?: string | null;
  motivations?: string | null;
  fears?: string | null;
  secrets?: string | null;
  strengths?: unknown;
  weaknesses?: unknown;
  speechPattern?: string | null;
  accent?: string | null;
  catchphrase?: string | null;
  voiceType?: string | null;
  voiceDescription?: string | null;
  voiceLanguage?: string | null;
  relationships?: unknown;
  environmentPreference?: string | null;
  preferredWeather?: string | null;
  preferredSeason?: string | null;
  preferredTimeOfDay?: string | null;
  physicalAbilities?: unknown;
  mentalAbilities?: unknown;
  specialSkills?: unknown;
  wardrobe?: unknown;
  performanceStyle?: string | null;
  castingNotes?: string | null;
  signatureMannerisms?: string | null;
};

type SceneWardrobeOverride = {
  wardrobeDescription?: string;
  wardrobeCategory?: string;
  makeupNotes?: string;
  hairNotes?: string;
  accessories?: string;
};

function parseObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, any>
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return undefined;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      const normalized = text(item);
      if (normalized) return [normalized];
      if (item && typeof item === "object") {
        const formatted = formatValue(item);
        return formatted ? [formatted] : [];
      }
      return [];
    });
  }
  const normalized = text(value);
  if (!normalized) return [];
  return normalized.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, char => char.toUpperCase());
}

function formatValue(value: unknown): string {
  const direct = text(value);
  if (direct) return direct;
  if (Array.isArray(value)) return value.map(formatValue).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const preferred = [
      "signature",
      "default",
      "description",
      "traits",
      "temperament",
      "formal",
      "casual",
      "action",
    ];
    const orderedKeys = [
      ...preferred.filter(key => key in object),
      ...Object.keys(object).filter(key => !preferred.includes(key)),
    ];
    return orderedKeys
      .map(key => {
        const formatted = formatValue(object[key]);
        return formatted ? `${humanizeKey(key)}: ${formatted}` : "";
      })
      .filter(Boolean)
      .join("; ");
  }
  return "";
}

function compact(value: unknown, max = 2400): string | undefined {
  const formatted = formatValue(value).replace(/\s+/g, " ").trim();
  if (!formatted) return undefined;
  return formatted.length <= max ? formatted : `${formatted.slice(0, max - 1)}…`;
}

function addSection(sections: string[], label: string, values: unknown[]) {
  const normalized = values
    .map(value => compact(value))
    .filter((value): value is string => Boolean(value));
  if (normalized.length) sections.push(`${label}: ${normalized.join(" | ")}`);
}

/**
 * Build the authoritative character prompt anchor consumed by every scene.
 *
 * Character generation stores visual analysis in the JSON `attributes` column,
 * while manually entered acting and story direction is stored in dedicated
 * columns. This function deliberately merges both sources. Photo-derived DNA
 * and a supplied reference portrait take precedence over generic defaults.
 */
export function buildCharacterDNA(
  character: CharacterRecord,
  sceneWardrobeOverride?: SceneWardrobeOverride,
): CharacterDNA {
  const attributes = parseObject(character.attributes);
  const deepProfile = {
    ...parseObject(character.deepProfile),
    ...parseObject(attributes.deepProfile),
  };

  const age = firstText(
    character.ageRange,
    attributes.ageRange,
    attributes.estimatedAge,
    attributes.age,
    character.dateOfBirth,
    deepProfile.ageRange,
  );
  const gender = firstText(character.gender, attributes.gender, deepProfile.gender);
  const ethnicity = firstText(character.ethnicity, attributes.ethnicity, deepProfile.ethnicity);
  const nationality = firstText(character.nationality, attributes.nationality, deepProfile.nationality);
  const skinTone = firstText(character.skinTone, attributes.skinTone, deepProfile.skinTone);
  const build = firstText(character.build, attributes.build, deepProfile.build);
  const height = firstText(character.height, attributes.height, deepProfile.height);
  const weight = firstText(character.weight, attributes.weight, deepProfile.weight);
  const fitnessLevel = firstText(character.fitnessLevel, attributes.fitnessLevel, deepProfile.fitnessLevel);
  const posture = firstText(character.posture, attributes.posture, deepProfile.posture);
  const hairColor = firstText(character.hairColor, attributes.hairColor, deepProfile.hairColor);
  const hairStyle = firstText(character.hairStyle, attributes.hairStyle, deepProfile.hairStyle);
  const hairLength = firstText(character.hairLength, attributes.hairLength, deepProfile.hairLength);
  const eyeColor = firstText(character.eyeColor, attributes.eyeColor, deepProfile.eyeColor);
  const faceShape = firstText(character.faceShape, attributes.faceShape, deepProfile.faceShape);
  const facialFeatures = firstText(attributes.facialFeatures, attributes.detailedDescription);
  const facialHair = firstText(attributes.facialHair, deepProfile.facialHair);
  const expression = firstText(attributes.expression, attributes.restingExpression);
  const distinguishingFeatures = Array.from(new Set([
    ...list(character.distinguishingFeatures),
    ...list(attributes.distinguishingFeatures),
    ...list(attributes.distinguishingMarks),
    ...list(attributes.skinImperfections),
    ...list(deepProfile.distinguishingFeatures),
  ]));

  const faceDnaPrompt = firstText(character.faceDnaPrompt, attributes.faceDnaPrompt, deepProfile.faceDnaPrompt);
  const bodyDnaPrompt = firstText(character.bodyDnaPrompt, attributes.bodyDnaPrompt, deepProfile.bodyDnaPrompt);
  const directorRequirements = firstText(
    attributes.additionalNotes,
    attributes.directorNotes,
    character.consistencyNotes,
  );

  const wardrobe = firstText(
    sceneWardrobeOverride?.wardrobeDescription,
    character.clothing,
    attributes.clothingStyle,
    attributes.clothing,
    compact(character.wardrobe),
    compact(deepProfile.wardrobe),
  );

  const referenceImageUrl = firstText(
    character.photoUrl,
    attributes.generatedPortraitUrl,
    character.referenceImageUrl,
    attributes.referencePhotoUrl,
    character.thumbnailUrl,
  );
  const generatedFromPhoto = Boolean(attributes.generatedFromPhoto);
  const aiGenerated = Boolean(attributes.aiGenerated);
  const referenceImageLocked = Boolean(
    referenceImageUrl && (
      character.referenceImageLocked
      || generatedFromPhoto
      || aiGenerated
      || attributes.referenceImageLocked
    ),
  );

  const normalizedAttributes = {
    gender: gender || "unspecified",
    age: age || "adult",
    ethnicity: ethnicity || "unspecified",
    skinTone: skinTone || "unspecified",
    build: build || "unspecified",
    height,
    hairColor: hairColor || "unspecified",
    hairStyle: hairStyle || "unspecified",
    hairLength: hairLength || "unspecified",
    eyeColor: eyeColor || "unspecified",
    faceShape: faceShape || "unspecified",
    distinguishingFeatures,
    clothing: wardrobe,
  };

  if (character.isNonHuman) {
    const typeLabel = character.costumeType
      ? character.costumeType.charAt(0).toUpperCase() + character.costumeType.slice(1)
      : "Creature";
    const nonHumanSections: string[] = [];
    addSection(nonHumanSections, "APPEARANCE", [character.description, faceDnaPrompt, bodyDnaPrompt]);
    addSection(nonHumanSections, "DIRECTOR REQUIREMENTS", [directorRequirements, character.castingNotes]);
    addSection(nonHumanSections, "BEHAVIOUR", [character.signatureMannerisms, character.performanceStyle]);
    if (wardrobe) addSection(nonHumanSections, "COSTUME", [wardrobe]);
    if (referenceImageLocked) {
      nonHumanSections.unshift("REFERENCE IMAGE HARD-LOCK: match the supplied identity reference exactly in every frame; zero species, silhouette, material, marking, or colour drift");
    }
    const promptAnchor = `[${typeLabel.toUpperCase()} "${character.name}": ${nonHumanSections.join(" || ") || "unique appearance"}]`;
    return {
      characterId: character.id,
      name: character.name,
      physicalDescription: character.description || faceDnaPrompt || promptAnchor,
      referenceImageUrl,
      isNonHuman: true,
      costumeType: character.costumeType || undefined,
      referenceImageLocked,
      attributes: normalizedAttributes,
      promptAnchor,
    };
  }

  const sections: string[] = [];
  if (referenceImageLocked) {
    sections.push(
      "IDENTITY REFERENCE HARD-LOCK: use the supplied character portrait as the authoritative face and body identity in every frame; preserve facial geometry, age, hairline, marks, skin tone, and recognisable asymmetry",
    );
  }

  addSection(sections, "CORE IDENTITY", [age, gender, ethnicity, nationality && `${nationality} nationality`]);
  addSection(sections, "DIRECT DESCRIPTION", [character.description]);

  if (faceDnaPrompt) {
    addSection(sections, "FACE DNA", [faceDnaPrompt]);
  } else {
    addSection(sections, "FACE", [
      faceShape && `${faceShape} face`,
      skinTone && `${skinTone} skin`,
      eyeColor && `${eyeColor} eyes`,
      [hairLength, hairColor, hairStyle].filter(Boolean).join(" ") || undefined,
      facialFeatures,
      facialHair && `facial hair: ${facialHair}`,
      expression && `expression: ${expression}`,
      distinguishingFeatures.length ? `DISTINGUISHING: ${distinguishingFeatures.join(", ")}` : undefined,
    ]);
  }

  if (bodyDnaPrompt) {
    addSection(sections, "BODY DNA", [bodyDnaPrompt]);
  } else {
    addSection(sections, "BODY", [build, height, weight, fitnessLevel && `${fitnessLevel} fitness`, posture && `${posture} posture`]);
  }

  addSection(sections, "DIRECTOR REQUIREMENTS", [directorRequirements]);
  addSection(sections, "ROLE AND PERFORMANCE", [
    character.role,
    character.storyImportance && `${character.storyImportance} importance`,
    character.screenTime && `${character.screenTime} screen time`,
    character.arcType && `${character.arcType} arc`,
    character.moralAlignment && `${character.moralAlignment} moral alignment`,
    character.performanceStyle && `performance style: ${character.performanceStyle}`,
    character.castingNotes && `casting direction: ${character.castingNotes}`,
    character.signatureMannerisms && `signature mannerisms: ${character.signatureMannerisms}`,
    character.personality && `personality: ${compact(character.personality)}`,
    character.emotionalRange && `emotional range: ${compact(character.emotionalRange)}`,
  ]);
  addSection(sections, "STORY BEHAVIOUR", [
    character.backstory && `backstory: ${character.backstory}`,
    character.motivations && `motivations: ${character.motivations}`,
    character.fears && `fears: ${character.fears}`,
    character.secrets && `secrets: ${character.secrets}`,
    character.strengths && `strengths: ${compact(character.strengths)}`,
    character.weaknesses && `weaknesses: ${compact(character.weaknesses)}`,
    character.relationships && `relationships: ${compact(character.relationships)}`,
  ]);
  addSection(sections, "VOICE AND SPEECH", [
    character.voiceDescription,
    character.voiceType,
    character.accent,
    character.speechPattern,
    character.catchphrase && `catchphrase: ${character.catchphrase}`,
    character.voiceLanguage && `voice language: ${character.voiceLanguage}`,
    character.languages && `languages: ${compact(character.languages)}`,
  ]);
  addSection(sections, "ABILITIES", [
    character.physicalAbilities && `physical: ${compact(character.physicalAbilities)}`,
    character.mentalAbilities && `mental: ${compact(character.mentalAbilities)}`,
    character.specialSkills && `skills: ${compact(character.specialSkills)}`,
  ]);
  addSection(sections, "BACKGROUND CONTEXT", [
    character.occupation && `occupation: ${character.occupation}`,
    character.countryOfOrigin && `origin country: ${character.countryOfOrigin}`,
    character.cityOfOrigin && `origin city: ${character.cityOfOrigin}`,
    character.educationLevel && `education: ${character.educationLevel}`,
    character.socialClass && `social class: ${character.socialClass}`,
    character.religion && `religion: ${character.religion}`,
    character.environmentPreference && `environment preference: ${character.environmentPreference}`,
    character.preferredWeather && `preferred weather: ${character.preferredWeather}`,
    character.preferredSeason && `preferred season: ${character.preferredSeason}`,
    character.preferredTimeOfDay && `preferred time: ${character.preferredTimeOfDay}`,
  ]);

  if (sceneWardrobeOverride?.wardrobeDescription) {
    addSection(sections, "SCENE WARDROBE HARD-LOCK", [
      sceneWardrobeOverride.wardrobeDescription,
      sceneWardrobeOverride.makeupNotes && `makeup: ${sceneWardrobeOverride.makeupNotes}`,
      sceneWardrobeOverride.hairNotes && `hair: ${sceneWardrobeOverride.hairNotes}`,
      sceneWardrobeOverride.accessories && `accessories: ${sceneWardrobeOverride.accessories}`,
    ]);
  } else if (wardrobe) {
    addSection(sections, "WARDROBE", [wardrobe]);
  } else {
    sections.push("WARDROBE: clean, understated, scene-appropriate neutral clothing until an explicit costume is assigned; no visible branding or bold pattern");
  }

  sections.push(
    "REALISM: photorealistic human identity with authentic skin pores, micro-wrinkles, natural asymmetry, detailed living eyes, individual hair strands, and consistent age; not CGI, not plastic skin, not a generic substitute",
  );

  const promptAnchor = `[CHARACTER ${character.name}: ${sections.join(" || ")}]`;
  return {
    characterId: character.id,
    name: character.name,
    physicalDescription: character.description || faceDnaPrompt || promptAnchor,
    referenceImageUrl,
    isNonHuman: false,
    costumeType: character.costumeType || undefined,
    referenceImageLocked,
    attributes: normalizedAttributes,
    promptAnchor,
  };
}

export function injectCharacterDNA(
  scenePrompt: string,
  characters: CharacterDNA[],
  characterIdsInScene: number[],
): string {
  if (characterIdsInScene.length === 0) return scenePrompt;
  const relevantCharacters = characters.filter(character => characterIdsInScene.includes(character.characterId));
  if (relevantCharacters.length === 0) return scenePrompt;
  return `${relevantCharacters.map(character => character.promptAnchor).join(" ")} — ${scenePrompt}`;
}

export function buildContinuityPrompt(
  scenePrompt: string,
  previousState?: SceneContinuityState,
  currentScene?: {
    location?: string;
    timeOfDay?: string;
    weather?: string;
    lighting?: string;
  },
): string {
  if (!previousState) return scenePrompt;
  const continuityHints: string[] = [];
  if (
    currentScene?.location
    && previousState.location
    && currentScene.location.toLowerCase() === previousState.location.toLowerCase()
  ) {
    continuityHints.push(`same location as previous shot: ${previousState.location}`);
  }
  if (currentScene?.timeOfDay && previousState.timeOfDay && currentScene.timeOfDay === previousState.timeOfDay) {
    continuityHints.push(`consistent ${currentScene.timeOfDay} lighting`);
  }
  if (currentScene?.weather && previousState.weather && currentScene.weather === previousState.weather) {
    continuityHints.push(`same ${currentScene.weather} weather conditions`);
  }
  return continuityHints.length
    ? `[Continuity: ${continuityHints.join(", ")}] ${scenePrompt}`
    : scenePrompt;
}

export async function extractContinuityFrame(
  videoUrl: string,
  projectId: number,
  sceneId: number,
  position: "first" | "last" = "last",
): Promise<string | undefined> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "virelle-continuity-"));
  try {
    const videoPath = path.join(tmpDir, "video.mp4");
    const response = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return undefined;
    await fs.promises.writeFile(videoPath, Buffer.from(await response.arrayBuffer()));
    const framePath = path.join(tmpDir, `${position}_frame.jpg`);

    if (position === "last") {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        videoPath,
      ], { timeout: 15_000 });
      const duration = Number.parseFloat(JSON.parse(stdout).format?.duration || "0");
      if (duration <= 0) return undefined;
      await execFileAsync("ffmpeg", [
        "-ss", String(Math.max(0, duration - 0.1)),
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        framePath,
      ], { timeout: 15_000 });
    } else {
      await execFileAsync("ffmpeg", [
        "-i", videoPath,
        "-vframes", "1",
        "-q:v", "2",
        "-y",
        framePath,
      ], { timeout: 15_000 });
    }

    await fs.promises.access(framePath);
    const frameBuffer = await fs.promises.readFile(framePath);
    const key = `continuity/${projectId}/scene-${sceneId}-${position}-${Date.now()}.jpg`;
    return (await storagePut(key, frameBuffer, "image/jpeg")).url;
  } catch (error) {
    logger.warn(`[Continuity] Failed to extract ${position} frame: ${String(error)}`);
    return undefined;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function buildContinuityChain(
  characters: CharacterRecord[],
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
  projectId: number,
): ContinuityChain {
  return {
    projectId,
    characters: characters.map(character => buildCharacterDNA(character)),
    scenes: [...scenes]
      .sort((first, second) => (first.orderIndex || 0) - (second.orderIndex || 0))
      .map(scene => ({
        sceneId: scene.id,
        orderIndex: scene.orderIndex || 0,
        lastVisualState: scene.description || "",
        location: scene.locationType || "unknown",
        timeOfDay: scene.timeOfDay || "day",
        weather: scene.weather || "clear",
        characterIds: scene.characterIds || [],
        lighting: scene.lighting || "natural",
      })),
  };
}

export interface SceneCoherenceContext {
  background?: {
    name: string;
    backgroundType?: string | null;
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
    name: string;
    description?: string | null;
    category?: string | null;
    colors?: any[] | null;
    characterId?: number | null;
    usageNotes?: string | null;
  }> | null;
  characterStates?: Array<{
    characterId: number;
    label: string;
    stateType: string;
    description: string;
    promptOverride?: string | null;
  }> | null;
  wardrobeByCharacter?: Record<number, string> | null;
  visualDNA?: {
    genreProfile?: string | null;
    lensProfile?: string | null;
    lightingStyle?: string | null;
    colorPalette?: string | null;
    filmStock?: string | null;
    globalColorGrade?: string | null;
    globalColorGradeLocked?: boolean | null;
    cinematographer?: string | null;
  } | null;
}

function buildBackgroundSection(background: SceneCoherenceContext["background"]): string {
  if (!background) return "";
  const type = (background.backgroundType || "location").toLowerCase();
  if (type === "vehicle") {
    const tag = [
      background.vehicleYear ? String(background.vehicleYear) : "",
      background.vehicleColor || "",
      `${background.vehicleMake || ""} ${background.vehicleModel || ""}`.trim(),
    ].filter(Boolean).join(" ");
    const interior = background.vehicleInterior ? `, ${background.vehicleInterior} interior` : "";
    const condition = background.vehicleCondition ? `, ${background.vehicleCondition} condition` : "";
    return `[VEHICLE LOCK — "${background.name}": ${tag}${interior}${condition}. Character operates this specific vehicle. Never substitute another make, model, or colour.]`;
  }
  if (type === "vessel") {
    return `[VESSEL LOCK — "${background.name}"${background.description ? ` — ${background.description}` : ""}. Maintain exact hull, rigging, and deck condition in all shots.]`;
  }
  if (type === "aircraft") {
    return `[AIRCRAFT LOCK — "${background.name}"${background.description ? ` — ${background.description}` : ""}. Maintain livery, registration, and interior consistently.]`;
  }
  const parts: string[] = [];
  if (background.description) parts.push(background.description);
  if (background.styleNotes) parts.push(`Style: ${background.styleNotes}`);
  if (Array.isArray(background.locationTags) && background.locationTags.length) {
    parts.push(`Tags: ${background.locationTags.join(", ")}`);
  }
  return `[LOCATION LOCK — "${background.name}": ${parts.join(". ")}. Visual consistency required across all scenes set here.]`;
}

function buildPropsSection(props: SceneCoherenceContext["props"]): string {
  if (!props?.length) return "";
  return `[LOCKED PROPS — maintain exact visual identity: ${props.map(prop => [
    prop.name,
    prop.category ? `(${prop.category})` : "",
    prop.description ? `— ${prop.description}` : "",
    Array.isArray(prop.colors) && prop.colors.length ? `colour: ${prop.colors.join("/")}` : "",
    prop.usageNotes ? `[${prop.usageNotes}]` : "",
  ].filter(Boolean).join(" ")).join(" | ")}]`;
}

function buildCharacterStateSection(
  states: SceneCoherenceContext["characterStates"],
  characterIds: number[],
): string {
  if (!states?.length) return "";
  const relevant = states.filter(state => characterIds.includes(state.characterId));
  return relevant.length
    ? `[CHARACTER STATES THIS SCENE: ${relevant.map(state => state.promptOverride || `${state.label}: ${state.description}`).join(" | ")}]`
    : "";
}

function buildWardrobeSection(
  wardrobeByCharacter: Record<number, string> | null | undefined,
  characterIds: number[],
): string {
  if (!wardrobeByCharacter) return "";
  const entries = characterIds.filter(id => wardrobeByCharacter[id]).map(id => wardrobeByCharacter[id]);
  return entries.length ? `[COSTUME LOCK: ${entries.join(" | ")}]` : "";
}

function buildVisualDNASection(visualDNA: SceneCoherenceContext["visualDNA"]): string {
  if (!visualDNA) return "";
  const parts: string[] = [];
  if (visualDNA.genreProfile) parts.push(`Genre: ${visualDNA.genreProfile}`);
  if (visualDNA.cinematographer) parts.push(`Cinematography after: ${visualDNA.cinematographer}`);
  if (visualDNA.lensProfile) parts.push(`Lens: ${visualDNA.lensProfile}`);
  if (visualDNA.lightingStyle) parts.push(`Lighting: ${visualDNA.lightingStyle}`);
  if (visualDNA.colorPalette) parts.push(`Palette: ${visualDNA.colorPalette}`);
  if (visualDNA.filmStock) parts.push(`Film stock: ${visualDNA.filmStock}`);
  if (visualDNA.globalColorGrade && visualDNA.globalColorGradeLocked) {
    parts.push(`Colour grade locked: ${visualDNA.globalColorGrade}`);
  }
  return parts.length ? `[VISUAL DNA LOCK — apply every frame: ${parts.join(" | ")}]` : "";
}

export function generateConsistentScenePrompt(
  chain: ContinuityChain,
  sceneIndex: number,
  basePrompt: string,
  coherenceContext?: SceneCoherenceContext,
): {
  enhancedPrompt: string;
  referenceImageUrl?: string;
  characterPromptAnchors: string[];
} {
  const scene = chain.scenes[sceneIndex];
  if (!scene) return { enhancedPrompt: basePrompt, characterPromptAnchors: [] };

  const previousScene = sceneIndex > 0 ? chain.scenes[sceneIndex - 1] : undefined;
  const withCharacters = injectCharacterDNA(basePrompt, chain.characters, scene.characterIds);
  const withContinuity = buildContinuityPrompt(withCharacters, previousScene, {
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    lighting: scene.lighting,
  });

  const sections = [withContinuity];
  if (coherenceContext) {
    for (const section of [
      buildBackgroundSection(coherenceContext.background),
      buildPropsSection(coherenceContext.props),
      buildCharacterStateSection(coherenceContext.characterStates, scene.characterIds),
      buildWardrobeSection(coherenceContext.wardrobeByCharacter, scene.characterIds),
      buildVisualDNASection(coherenceContext.visualDNA),
    ]) {
      if (section) sections.push(section);
    }
  }

  const lockedCharacterReference = chain.characters
    .find(character => (
      scene.characterIds.includes(character.characterId)
      && character.referenceImageLocked
      && character.referenceImageUrl
    ))?.referenceImageUrl;

  const characterPromptAnchors = chain.characters
    .filter(character => scene.characterIds.includes(character.characterId))
    .map(character => character.promptAnchor);

  return {
    enhancedPrompt: sections.filter(Boolean).join("\n\n"),
    referenceImageUrl: lockedCharacterReference || previousScene?.lastFrameUrl,
    characterPromptAnchors,
  };
}

export function updateContinuityChainAfterGeneration(
  chain: ContinuityChain,
  sceneIndex: number,
  lastFrameUrl?: string,
  lastVisualState?: string,
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
