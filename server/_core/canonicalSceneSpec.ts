export type Nullable<T> = T | null | undefined;

export interface CanonicalSceneCharacter {
  id: number;
  name: string;
  visualAnchor?: string;
  wardrobe?: string;
  state?: string;
  blocking?: string;
  referenceImageUrl?: string;
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
  cameraAngle?: Nullable<string>;
  cameraMovement?: Nullable<string>;
  lensType?: Nullable<string>;
  focalLength?: Nullable<string>;
  depthOfField?: Nullable<string>;
  shotType?: Nullable<string>;
  frameRate?: Nullable<string>;
  aspectRatio?: Nullable<string>;
  colorGrading?: Nullable<string>;
  colorPalette?: Nullable<string>;
  colorTemperature?: Nullable<string>;
  mood?: Nullable<string>;
  emotionalBeat?: Nullable<string>;
  foregroundElements?: Nullable<string>;
  backgroundElements?: Nullable<string>;
  characterBlocking?: Nullable<string>;
  actionDescription?: Nullable<string>;
  vfxElements?: Nullable<string>;
  vfxNotes?: Nullable<string>;
  makeupNotes?: Nullable<string>;
  stuntNotes?: Nullable<string>;
  aiPromptOverride?: Nullable<string>;
  wardrobeOverrides?: unknown;
  duration?: Nullable<number>;
  characterIds?: number[];
  dialogueLines?: Array<{ characterName?: string; text?: string }>;
  sceneType?: Nullable<string>;
  sfxNotes?: Nullable<string>;
  ambientSound?: Nullable<string>;
  musicMood?: Nullable<string>;
  musicTempo?: Nullable<string>;
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
    lensType?: string;
    focalLength?: string;
    depthOfField?: string;
    shotType?: string;
    frameRate: string;
    aspectRatio: string;
  };
  characters: CanonicalSceneCharacter[];
  dialogueSpeakers: string[];
  durationSeconds?: number;
  promptOverride?: string;
  seed?: number;
  validationErrors: string[];
  validationWarnings: string[];
}

const clean = (value: Nullable<string>): string | undefined => {
  const result = typeof value === "string" ? value.trim() : "";
  return result || undefined;
};

const add = (target: string[], label: string, value: unknown): void => {
  if (value === null || value === undefined || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  if (typeof value === "object") {
    target.push(`${label}: ${JSON.stringify(value)}`);
    return;
  }
  target.push(`${label}: ${String(value).trim()}`);
};

export function compileCanonicalSceneSpec(
  scene: CanonicalSceneInput,
  characters: CanonicalSceneCharacter[],
): CanonicalSceneSpec {
  const lockedRequirements: string[] = [];
  const creativeDirection: string[] = [];
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  const title = clean(scene.title) || `Scene ${scene.orderIndex + 1}`;
  const baseNarrative = clean(scene.aiPromptOverride)
    || clean(scene.visualDescription)
    || clean(scene.description)
    || clean(scene.actionDescription)
    || title;

  if (!baseNarrative) validationErrors.push("Scene has no usable narrative or visual description.");
  if (!Number.isInteger(scene.id) || scene.id <= 0) validationErrors.push("Scene ID is invalid.");
  if (!Number.isFinite(scene.orderIndex) || scene.orderIndex < 0) validationErrors.push("Scene order is invalid.");
  if (scene.duration != null && (!Number.isFinite(scene.duration) || scene.duration <= 0)) {
    validationErrors.push("Scene duration must be greater than zero.");
  }

  const requiredCharacterIds = scene.characterIds || [];
  const selectedCharacters = requiredCharacterIds.length
    ? characters.filter((character) => requiredCharacterIds.includes(character.id))
    : characters;
  const foundIds = new Set(selectedCharacters.map((character) => character.id));
  const missingCharacterIds = requiredCharacterIds.filter((id) => !foundIds.has(id));
  if (missingCharacterIds.length) {
    validationErrors.push(`Unknown character IDs: ${missingCharacterIds.join(", ")}`);
  }

  const dialogueSpeakers = Array.from(new Set(
    (scene.dialogueLines || [])
      .map((line) => clean(line.characterName))
      .filter((name): name is string => Boolean(name)),
  ));
  const characterNames = new Set(characters.map((character) => character.name.toLowerCase()));
  const unknownSpeakers = dialogueSpeakers.filter((name) => !characterNames.has(name.toLowerCase()));
  if (unknownSpeakers.length) validationErrors.push(`Dialogue speakers are not mapped to project characters: ${unknownSpeakers.join(", ")}`);

  add(lockedRequirements, "Exact action", clean(scene.actionDescription));
  add(lockedRequirements, "Character blocking and eyelines", clean(scene.characterBlocking));
  add(lockedRequirements, "Wardrobe overrides", scene.wardrobeOverrides);
  add(lockedRequirements, "Foreground elements", clean(scene.foregroundElements));
  add(lockedRequirements, "Background elements", clean(scene.backgroundElements));
  add(lockedRequirements, "VFX elements", clean(scene.vfxElements));
  add(lockedRequirements, "VFX execution notes", clean(scene.vfxNotes));
  add(lockedRequirements, "Makeup and prosthetics", clean(scene.makeupNotes));
  add(lockedRequirements, "Stunt requirements", clean(scene.stuntNotes));

  for (const character of selectedCharacters) {
    const details = [character.visualAnchor, character.wardrobe, character.state, character.blocking]
      .filter(Boolean)
      .join("; ");
    add(lockedRequirements, `Character ${character.name}`, details || "Maintain established identity exactly");
  }

  add(creativeDirection, "Narrative and visual direction", baseNarrative);
  add(creativeDirection, "Emotional beat", clean(scene.emotionalBeat));
  add(creativeDirection, "Mood", clean(scene.mood));
  add(creativeDirection, "Lighting", clean(scene.lighting));
  add(creativeDirection, "Colour palette", clean(scene.colorPalette));
  add(creativeDirection, "Colour grade", clean(scene.colorGrading));
  add(creativeDirection, "Colour temperature", clean(scene.colorTemperature));
  add(creativeDirection, "Sound effects", clean(scene.sfxNotes));
  add(creativeDirection, "Ambient sound", clean(scene.ambientSound));
  add(creativeDirection, "Music mood", clean(scene.musicMood));
  add(creativeDirection, "Music tempo", clean(scene.musicTempo));

  const locationDescription = [
    clean(scene.locationDetail),
    clean(scene.locationType),
    clean(scene.city),
    clean(scene.country),
    clean(scene.season),
    clean(scene.timeOfDay),
    clean(scene.weather),
  ].filter(Boolean).join(", ") || undefined;
  add(lockedRequirements, "Location, geography and environment", locationDescription);

  const aspectRatio = clean(scene.aspectRatio) || "16:9";
  const frameRate = clean(scene.frameRate) || "24fps";
  const supportedRatios = new Set(["16:9", "9:16", "1:1", "4:3", "2.39:1", "21:9"]);
  if (!supportedRatios.has(aspectRatio)) validationWarnings.push(`Aspect ratio ${aspectRatio} may not be supported by every provider.`);

  return {
    sceneId: scene.id,
    orderIndex: scene.orderIndex,
    title,
    baseNarrative,
    lockedRequirements,
    creativeDirection,
    locationDescription,
    camera: {
      angle: clean(scene.cameraAngle),
      movement: clean(scene.cameraMovement),
      lensType: clean(scene.lensType),
      focalLength: clean(scene.focalLength),
      depthOfField: clean(scene.depthOfField),
      shotType: clean(scene.shotType),
      frameRate,
      aspectRatio,
    },
    characters: selectedCharacters,
    dialogueSpeakers,
    durationSeconds: scene.duration ?? undefined,
    promptOverride: clean(scene.aiPromptOverride),
    seed: scene.seed ?? undefined,
    validationErrors,
    validationWarnings,
  };
}

export function renderCanonicalScenePrompt(spec: CanonicalSceneSpec): string {
  const camera = [
    spec.camera.shotType && `shot type ${spec.camera.shotType}`,
    spec.camera.angle && `camera angle ${spec.camera.angle}`,
    spec.camera.movement && `camera movement ${spec.camera.movement}`,
    spec.camera.lensType && `lens ${spec.camera.lensType}`,
    spec.camera.focalLength && `focal length ${spec.camera.focalLength}`,
    spec.camera.depthOfField && `depth of field ${spec.camera.depthOfField}`,
    `frame rate ${spec.camera.frameRate}`,
    `aspect ratio ${spec.camera.aspectRatio}`,
  ].filter(Boolean).join(", ");

  return [
    `SCENE ${spec.orderIndex + 1}: ${spec.title}`,
    "LOCKED REQUIREMENTS — follow exactly; do not alter, omit, substitute or invent:",
    ...spec.lockedRequirements.map((item) => `- ${item}`),
    `- Camera and delivery: ${camera}`,
    "CREATIVE DIRECTION — interpret cinematically only within the locked requirements:",
    ...spec.creativeDirection.map((item) => `- ${item}`),
    "CONTINUITY RULE: preserve established character identity, wardrobe, props, injuries, dirt, position, facing direction, eyelines, geography, lighting direction and time progression from the supplied reference frame.",
  ].join("\n");
}

export function assertCanonicalSceneSpec(spec: CanonicalSceneSpec): void {
  if (spec.validationErrors.length) {
    throw new Error(`Scene ${spec.sceneId} failed pre-generation validation: ${spec.validationErrors.join(" ")}`);
  }
}
