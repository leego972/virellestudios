import { createHash } from "node:crypto";

export type Nullable<T> = T | null | undefined;

export interface CanonicalSceneCharacter {
  id: number;
  name: string;
  visualAnchor?: string;
  wardrobe?: string;
  wardrobeAnchor?: string;
  state?: string;
  blocking?: string;
  referenceImageUrl?: string;
  wardrobeReferenceImageUrl?: string;
}

export interface CanonicalDialogueLine {
  characterName?: string;
  text?: string;
  line?: string;
  emotion?: string;
  direction?: string;
}

export interface CanonicalSceneInput {
  id: number;
  orderIndex: number;
  title?: Nullable<string>;
  description?: Nullable<string>;
  visualDescription?: Nullable<string>;
  locationType?: Nullable<string>;
  country?: Nullable<string>;
  city?: Nullable<string>;
  locationDetail?: Nullable<string>;
  timeOfDay?: Nullable<string>;
  season?: Nullable<string>;
  weather?: Nullable<string>;
  lighting?: Nullable<string>;
  practicalLights?: Nullable<string>;
  cameraAngle?: Nullable<string>;
  cameraMovement?: Nullable<string>;
  cameraBody?: Nullable<string>;
  lensType?: Nullable<string>;
  lensBrand?: Nullable<string>;
  lensFilter?: Nullable<string>;
  focalLength?: Nullable<string>;
  aperture?: Nullable<string>;
  depthOfField?: Nullable<string>;
  shotType?: Nullable<string>;
  coverageType?: Nullable<string>;
  shootingFormat?: Nullable<string>;
  frameRate?: Nullable<string>;
  aspectRatio?: Nullable<string>;
  resolution?: Nullable<string>;
  colorGrading?: Nullable<string>;
  colorPalette?: Nullable<string>;
  colorTemperature?: Nullable<string>;
  mood?: Nullable<string>;
  emotionalBeat?: Nullable<string>;
  shotIntent?: Nullable<string>;
  dialogueSubtext?: Nullable<string>;
  foregroundElements?: Nullable<string>;
  backgroundElements?: Nullable<string>;
  characterBlocking?: Nullable<string>;
  screenDirection?: Nullable<string>;
  actionDescription?: Nullable<string>;
  vfxElements?: Nullable<string>;
  visualEffects?: unknown;
  vfxNotes?: Nullable<string>;
  makeupNotes?: Nullable<string>;
  stuntNotes?: Nullable<string>;
  productionNotes?: Nullable<string>;
  aiPromptOverride?: Nullable<string>;
  wardrobeOverrides?: unknown;
  wardrobe?: unknown;
  props?: unknown;
  duration?: Nullable<number>;
  characterIds?: number[];
  dialogueLines?: CanonicalDialogueLine[];
  dialogueText?: Nullable<string>;
  sceneType?: Nullable<string>;
  sfxNotes?: Nullable<string>;
  sfxProductionNotes?: Nullable<string>;
  ambientSound?: Nullable<string>;
  musicMood?: Nullable<string>;
  musicTempo?: Nullable<string>;
  transitionType?: Nullable<string>;
  transitionDuration?: Nullable<number>;
  continuityNotes?: Nullable<string>;
  negativePrompt?: Nullable<string>;
  referenceImages?: unknown;
  seed?: Nullable<number>;
}

export interface CanonicalSceneSpec {
  sceneId: number;
  orderIndex: number;
  title: string;
  baseNarrative: string;
  lockedRequirements: string[];
  creativeDirection: string[];
  locationDescription?: string;
  camera: {
    angle?: string;
    movement?: string;
    cameraBody?: string;
    lensType?: string;
    lensBrand?: string;
    lensFilter?: string;
    focalLength?: string;
    aperture?: string;
    depthOfField?: string;
    shotType?: string;
    coverageType?: string;
    shootingFormat?: string;
    frameRate: string;
    aspectRatio: string;
    resolution: string;
    explicit: boolean;
  };
  continuity: {
    blocking?: string;
    screenDirection?: string;
    notes?: string;
    transitionType?: string;
    transitionDurationSeconds?: number;
  };
  characters: CanonicalSceneCharacter[];
  dialogueSpeakers: string[];
  durationSeconds?: number;
  promptOverride?: string;
  negativePrompt?: string;
  referenceImages: string[];
  seed?: number;
  validationErrors: string[];
  validationWarnings: string[];
  fingerprint: string;
}

const clean = (value: Nullable<string>): string | undefined => {
  const result = typeof value === "string" ? value.trim() : "";
  return result || undefined;
};

const add = (target: string[], label: string, value: unknown): void => {
  if (value === null || value === undefined || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  if (typeof value === "object") {
    target.push(`${label}: ${stableStringify(value)}`);
    return;
  }
  target.push(`${label}: ${String(value).trim()}`);
};

function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(",")}}`;
}

function normalizeReferenceImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === "string" && /^https?:\/\//i.test(entry.trim())).map((entry) => entry.trim())));
}

function fingerprintSpec(value: Omit<CanonicalSceneSpec, "fingerprint">): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 24);
}

export function refreshCanonicalSceneFingerprint(spec: CanonicalSceneSpec): CanonicalSceneSpec {
  const { fingerprint: _fingerprint, ...withoutFingerprint } = spec;
  return { ...spec, fingerprint: fingerprintSpec(withoutFingerprint) };
}

export function compileCanonicalSceneSpec(
  scene: CanonicalSceneInput,
  characters: CanonicalSceneCharacter[],
): CanonicalSceneSpec {
  const lockedRequirements: string[] = [];
  const creativeDirection: string[] = [];
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  const title = clean(scene.title) || `Scene ${scene.orderIndex + 1}`;
  const actualNarrative = clean(scene.aiPromptOverride)
    || clean(scene.visualDescription)
    || clean(scene.description)
    || clean(scene.actionDescription);
  const baseNarrative = actualNarrative || title;

  if (!actualNarrative) validationErrors.push("Scene has no usable narrative, visual description, action description, or director override.");
  if (!Number.isInteger(scene.id) || scene.id <= 0) validationErrors.push("Scene ID is invalid.");
  if (!Number.isFinite(scene.orderIndex) || scene.orderIndex < 0) validationErrors.push("Scene order is invalid.");
  if (scene.duration != null && (!Number.isFinite(scene.duration) || scene.duration <= 0)) validationErrors.push("Scene duration must be greater than zero.");

  const requiredCharacterIds = Array.isArray(scene.characterIds) ? scene.characterIds : [];
  const selectedCharacters = requiredCharacterIds.length
    ? characters.filter((character) => requiredCharacterIds.includes(character.id))
    : characters;
  const foundIds = new Set(selectedCharacters.map((character) => character.id));
  const missingCharacterIds = requiredCharacterIds.filter((id) => !foundIds.has(id));
  if (missingCharacterIds.length) validationErrors.push(`Unknown character IDs: ${missingCharacterIds.join(", ")}`);

  const dialogueSpeakers = Array.from(new Set(
    (scene.dialogueLines || [])
      .map((line) => clean(line.characterName))
      .filter((name): name is string => Boolean(name)),
  ));
  const characterNames = new Set(characters.map((character) => character.name.toLowerCase()));
  const unknownSpeakers = dialogueSpeakers.filter((name) => !characterNames.has(name.toLowerCase()));
  if (unknownSpeakers.length) validationErrors.push(`Dialogue speakers are not mapped to project characters: ${unknownSpeakers.join(", ")}`);

  add(lockedRequirements, "Exact narrative action", clean(scene.actionDescription));
  add(lockedRequirements, "Character blocking and eyelines", clean(scene.characterBlocking));
  add(lockedRequirements, "Screen direction and 180-degree-line instruction", clean(scene.screenDirection));
  add(lockedRequirements, "Scene wardrobe overrides", scene.wardrobeOverrides ?? scene.wardrobe);
  add(lockedRequirements, "Required props and set dressing", scene.props);
  add(lockedRequirements, "Foreground elements", clean(scene.foregroundElements));
  add(lockedRequirements, "Background elements", clean(scene.backgroundElements));
  add(lockedRequirements, "VFX elements", scene.vfxElements ?? scene.visualEffects);
  add(lockedRequirements, "VFX execution notes", clean(scene.vfxNotes));
  add(lockedRequirements, "Makeup and prosthetics", clean(scene.makeupNotes));
  add(lockedRequirements, "Stunt and safety choreography", clean(scene.stuntNotes));
  add(lockedRequirements, "Continuity supervisor notes", clean(scene.continuityNotes));

  for (const character of selectedCharacters) {
    const details = [character.visualAnchor, character.wardrobeAnchor, character.wardrobe, character.state, character.blocking].filter(Boolean).join("; ");
    add(lockedRequirements, `Character ${character.name}`, details || "Maintain established identity exactly");
  }

  add(creativeDirection, "Narrative and visual direction", baseNarrative);
  add(creativeDirection, "Shot intent", clean(scene.shotIntent));
  add(creativeDirection, "Emotional beat", clean(scene.emotionalBeat));
  add(creativeDirection, "Dialogue subtext", clean(scene.dialogueSubtext));
  add(creativeDirection, "Mood", clean(scene.mood));
  add(creativeDirection, "Lighting", clean(scene.lighting));
  add(creativeDirection, "Practical lights visible in frame", clean(scene.practicalLights));
  add(creativeDirection, "Colour palette", clean(scene.colorPalette));
  add(creativeDirection, "Colour grade", clean(scene.colorGrading));
  add(creativeDirection, "Colour temperature", clean(scene.colorTemperature));
  add(creativeDirection, "Production notes", clean(scene.productionNotes));
  add(creativeDirection, "Sound effects", clean(scene.sfxNotes));
  add(creativeDirection, "SFX production direction", clean(scene.sfxProductionNotes));
  add(creativeDirection, "Ambient sound", clean(scene.ambientSound));
  add(creativeDirection, "Music mood", clean(scene.musicMood));
  add(creativeDirection, "Music tempo", clean(scene.musicTempo));

  const locationDescription = [clean(scene.locationDetail), clean(scene.locationType), clean(scene.city), clean(scene.country), clean(scene.season), clean(scene.timeOfDay), clean(scene.weather)].filter(Boolean).join(", ") || undefined;
  add(lockedRequirements, "Location, geography and environment", locationDescription);

  const aspectRatio = clean(scene.aspectRatio) || "16:9";
  const frameRate = clean(scene.frameRate) || "24fps";
  const resolution = clean(scene.resolution) || (clean(scene.shootingFormat)?.match(/\b(720p|1080p|2160p|4K|6K|8K)\b/i)?.[1] ?? "1080p");
  const supportedRatios = new Set(["16:9", "9:16", "1:1", "4:3", "3:4", "2.39:1", "21:9"]);
  if (!supportedRatios.has(aspectRatio)) validationWarnings.push(`Aspect ratio ${aspectRatio} may require provider fallback or post-production letterboxing.`);

  const camera = {
    angle: clean(scene.cameraAngle),
    movement: clean(scene.cameraMovement),
    cameraBody: clean(scene.cameraBody),
    lensType: clean(scene.lensType),
    lensBrand: clean(scene.lensBrand),
    lensFilter: clean(scene.lensFilter),
    focalLength: clean(scene.focalLength),
    aperture: clean(scene.aperture),
    depthOfField: clean(scene.depthOfField),
    shotType: clean(scene.shotType),
    coverageType: clean(scene.coverageType),
    shootingFormat: clean(scene.shootingFormat),
    frameRate,
    aspectRatio,
    resolution,
    explicit: Boolean(clean(scene.cameraAngle) || clean(scene.cameraMovement) || clean(scene.lensType) || clean(scene.focalLength) || clean(scene.shotType) || clean(scene.depthOfField)),
  };

  const withoutFingerprint: Omit<CanonicalSceneSpec, "fingerprint"> = {
    sceneId: scene.id,
    orderIndex: scene.orderIndex,
    title,
    baseNarrative,
    lockedRequirements,
    creativeDirection,
    locationDescription,
    camera,
    continuity: {
      blocking: clean(scene.characterBlocking),
      screenDirection: clean(scene.screenDirection),
      notes: clean(scene.continuityNotes),
      transitionType: clean(scene.transitionType),
      transitionDurationSeconds: scene.transitionDuration ?? undefined,
    },
    characters: selectedCharacters,
    dialogueSpeakers,
    durationSeconds: scene.duration ?? undefined,
    promptOverride: clean(scene.aiPromptOverride),
    negativePrompt: clean(scene.negativePrompt),
    referenceImages: normalizeReferenceImages(scene.referenceImages),
    seed: scene.seed ?? undefined,
    validationErrors,
    validationWarnings,
  };

  return { ...withoutFingerprint, fingerprint: fingerprintSpec(withoutFingerprint) };
}

export function renderCanonicalScenePrompt(spec: CanonicalSceneSpec): string {
  const camera = [
    spec.camera.shotType && `shot type ${spec.camera.shotType}`,
    spec.camera.coverageType && `coverage ${spec.camera.coverageType}`,
    spec.camera.angle && `camera angle ${spec.camera.angle}`,
    spec.camera.movement && `camera movement ${spec.camera.movement}`,
    spec.camera.cameraBody && `camera body ${spec.camera.cameraBody}`,
    spec.camera.lensBrand && `lens family ${spec.camera.lensBrand}`,
    spec.camera.lensType && `lens type ${spec.camera.lensType}`,
    spec.camera.lensFilter && `lens filter ${spec.camera.lensFilter}`,
    spec.camera.focalLength && `focal length ${spec.camera.focalLength}`,
    spec.camera.aperture && `aperture ${spec.camera.aperture}`,
    spec.camera.depthOfField && `depth of field ${spec.camera.depthOfField}`,
    spec.camera.shootingFormat && `capture format ${spec.camera.shootingFormat}`,
    `frame rate ${spec.camera.frameRate}`,
    `aspect ratio ${spec.camera.aspectRatio}`,
    `delivery resolution ${spec.camera.resolution}`,
  ].filter(Boolean).join(", ");

  return [
    `SCENE ${spec.orderIndex + 1}: ${spec.title}`,
    `SCENE CONTRACT: ${spec.fingerprint}`,
    "LOCKED REQUIREMENTS — follow exactly; do not alter, omit, substitute, merge, or invent:",
    ...spec.lockedRequirements.map((item) => `- ${item}`),
    `- Camera and delivery: ${camera}`,
    "CREATIVE DIRECTION — interpret cinematically only inside the locked requirements:",
    ...spec.creativeDirection.map((item) => `- ${item}`),
    "CONTINUITY RULE: preserve established character identity, age, face, body, wardrobe, props, injuries, dirt, position, facing direction, eyelines, screen direction, geography, lighting direction, weather and time progression from every supplied reference frame.",
    "LOGIC RULE: complete the described action in coherent cause-and-effect order. Do not reset positions, duplicate characters, teleport props, reverse unexplained actions, or introduce unrequested people, objects or story events.",
  ].join("\n");
}

export function assertCanonicalSceneSpec(spec: CanonicalSceneSpec): void {
  if (spec.validationErrors.length) throw new Error(`Scene ${spec.sceneId} failed pre-generation validation: ${spec.validationErrors.join(" ")}`);
}
