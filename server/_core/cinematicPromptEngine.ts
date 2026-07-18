export * from "./cinematicPromptEngine-legacy";

import { buildScenePrompt as buildLegacyScenePrompt } from "./cinematicPromptEngine-legacy";

type ScenePromptArgs = Parameters<typeof buildLegacyScenePrompt>;
type SceneInput = ScenePromptArgs[0] & {
  wardrobe?: unknown;
  wardrobeOverrides?: unknown;
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

/**
 * Compatibility wrapper around the established cinematic prompt engine.
 *
 * Two confirmed gaps are closed here without duplicating the mature prompt
 * implementation:
 * 1. A director override no longer returns early and bypasses character,
 *    wardrobe, location, camera, safety and negative-prompt requirements.
 * 2. SceneEditor inline wardrobe values are included in preview-image prompts,
 *    not only the video route.
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

  return directorOverride
    ? [
        `DIRECTOR OVERRIDE — LOCKED: ${directorOverride}`,
        "The override controls narrative and staging, but it does not cancel character identity, exact wardrobe, location, camera, continuity, brand, minor-safety or quality requirements below.",
        built,
      ].join("\n")
    : built;
}
