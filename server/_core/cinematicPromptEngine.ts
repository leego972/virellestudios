export * from "./cinematicPromptEngine-legacy";

import { buildScenePrompt as buildLegacyScenePrompt } from "./cinematicPromptEngine-legacy";

type ScenePromptArgs = Parameters<typeof buildLegacyScenePrompt>;
type SceneInput = ScenePromptArgs[0] & {
  wardrobe?: unknown;
  wardrobeOverrides?: unknown;
  cameraAngle?: string | null;
  cameraMovement?: string | null;
  lensType?: string | null;
  focalLength?: string | null;
  depthOfField?: string | null;
  shotType?: string | null;
  frameRate?: string | null;
  aspectRatio?: string | null;
};
type VisualDNAInput = ScenePromptArgs[1];
type ScenePromptOptions = NonNullable<ScenePromptArgs[2]>;

type InlineWardrobeEntry = {
  characterId?: number;
  characterName?: string;
  wardrobeDescription?: string;
  hairNotes?: string;
  makeupNotes?: string;
  accessories?: string;
};

function normalizeInlineWardrobe(value: unknown): InlineWardrobeEntry[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is InlineWardrobeEntry => Boolean(entry && typeof entry === "object"));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      if (!entry || typeof entry !== "object") return [];
      const parsedId = Number(key);
      return [{
        characterId: Number.isInteger(parsedId) ? parsedId : undefined,
        ...(entry as InlineWardrobeEntry),
      }];
    });
  }
  return [];
}

function renderInlineWardrobe(scene: SceneInput, options?: ScenePromptOptions): string | undefined {
  const entries = normalizeInlineWardrobe(scene.wardrobeOverrides ?? scene.wardrobe);
  if (!entries.length) return undefined;
  const characterById = new Map(
    (options?.characters || [])
      .filter((character) => character.id != null)
      .map((character) => [character.id!, character.name]),
  );
  const lines = entries.flatMap((entry) => {
    const parts = [
      entry.wardrobeDescription?.trim(),
      entry.hairNotes?.trim() && `hair: ${entry.hairNotes.trim()}`,
      entry.makeupNotes?.trim() && `makeup: ${entry.makeupNotes.trim()}`,
      entry.accessories?.trim() && `accessories: ${entry.accessories.trim()}`,
    ].filter(Boolean);
    if (!parts.length) return [];
    const characterName = entry.characterName?.trim()
      || (entry.characterId != null ? characterById.get(entry.characterId) : undefined)
      || (entry.characterId != null ? `Character #${entry.characterId}` : "Character");
    return [`- ${characterName}: ${parts.join("; ")}. HARD LOCK this complete look for the scene.`];
  });
  return lines.length ? `SCENE-EDITOR WARDROBE OVERRIDES:\n${lines.join("\n")}` : undefined;
}

function renderExactCameraLock(scene: SceneInput): string | undefined {
  const requirements = [
    scene.shotType?.trim() && `shot type: ${scene.shotType.trim()}`,
    scene.cameraAngle?.trim() && `camera angle: ${scene.cameraAngle.trim()}`,
    scene.cameraMovement?.trim() && `camera movement: ${scene.cameraMovement.trim()}`,
    scene.lensType?.trim() && `lens type: ${scene.lensType.trim()}`,
    scene.focalLength?.trim() && `focal length: ${scene.focalLength.trim()}`,
    scene.depthOfField?.trim() && `depth of field: ${scene.depthOfField.trim()}`,
    scene.frameRate?.trim() && `frame rate: ${scene.frameRate.trim()}`,
    scene.aspectRatio?.trim() && `aspect ratio: ${scene.aspectRatio.trim()}`,
  ].filter(Boolean);
  if (!requirements.length) return undefined;
  return [
    "DIRECTOR CAMERA SETTINGS — LOCKED; these exact user values override automatic shot grammar:",
    ...requirements.map((requirement) => `- ${requirement}`),
  ].join("\n");
}

/**
 * Compatibility wrapper around the established cinematic prompt engine.
 *
 * Confirmed gaps closed here without duplicating the mature prompt engine:
 * - a director override cannot bypass character, wardrobe, location, camera,
 *   continuity, safety or negative-prompt requirements;
 * - SceneEditor wardrobe values are present in image and video prompts;
 * - exact camera values override the legacy engine's enum/default mapping.
 */
export function buildScenePrompt(
  scene: SceneInput,
  visualDNA: VisualDNAInput,
  options?: ScenePromptOptions,
): string {
  const inlineWardrobe = renderInlineWardrobe(scene, options);
  const mergedWardrobe = [options?.wardrobeContext?.trim(), inlineWardrobe]
    .filter(Boolean)
    .join("\n");
  const directorOverride = scene.aiPromptOverride?.trim();

  const safeScene: ScenePromptArgs[0] = directorOverride
    ? {
        ...scene,
        description: `DIRECTOR'S EXACT SHOT DIRECTION — execute this faithfully: ${directorOverride}`,
        aiPromptOverride: null,
      }
    : scene;

  const built = buildLegacyScenePrompt(
    safeScene,
    visualDNA,
    {
      ...(options || {}),
      wardrobeContext: mergedWardrobe || undefined,
    },
  );
  const cameraLock = renderExactCameraLock(scene);

  return [
    directorOverride && `DIRECTOR OVERRIDE — LOCKED: ${directorOverride}`,
    directorOverride && "The override controls narrative and staging, but it does not cancel character identity, exact wardrobe, location, camera, continuity, brand, minor-safety or quality requirements below.",
    cameraLock,
    built,
  ].filter(Boolean).join("\n");
}
