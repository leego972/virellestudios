// v6.68 — Production Elements consistency layer (Phase 4).
// Derives a unified "elements" view (characters / locations / props / style /
// references) from the existing characters, locations, moodBoardItems, and
// per-scene fields without introducing a new persistence table. Used by
// generation prompt builders so the LLM/video provider always sees the same
// reference set for related scenes.

import * as db from "../db";

export type ProductionElementType =
  | "character"
  | "location"
  | "prop"
  | "wardrobe"
  | "style"
  | "reference";

export interface ProductionElement {
  type: ProductionElementType;
  sourceType: "character" | "location" | "scene" | "moodBoard" | "project";
  sourceId: number | string;
  name: string;
  description: string | null;
  referenceImages: string[];
  metadata?: Record<string, unknown>;
}

export interface PromptContextForScene {
  sceneId: number;
  characters: ProductionElement[];
  location: ProductionElement | null;
  props: ProductionElement[];
  styleAnchors: ProductionElement[];
  continuityNotes: string[];
}

function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  return [];
}

function asStringArray(v: unknown): string[] {
  return asArray<unknown>(v).filter((x) => typeof x === "string") as string[];
}

export async function listProjectElements(
  projectId: number,
  userId: number,
): Promise<ProductionElement[]> {
  const project = await db.getProjectById(projectId, userId);
  if (!project) return [];

  const [characters, locations, moodBoard, scenes] = await Promise.all([
    db.getProjectCharacters(projectId).catch(() => []),
    db.getProjectLocations(projectId).catch(() => []),
    db.getProjectMoodBoard(projectId).catch(() => []),
    db.getProjectScenes(projectId).catch(() => []),
  ]);

  const out: ProductionElement[] = [];

  for (const c of characters as any[]) {
    out.push({
      type: "character",
      sourceType: "character",
      sourceId: c.id,
      name: c.name ?? "Unnamed character",
      description: c.description ?? null,
      referenceImages: asStringArray(c.referenceImages),
      metadata: { wardrobe: c.wardrobe, age: c.age, role: c.role },
    });
  }

  for (const l of locations as any[]) {
    out.push({
      type: "location",
      sourceType: "location",
      sourceId: l.id,
      name: l.name ?? "Unnamed location",
      description: l.description ?? null,
      referenceImages: asStringArray(l.referenceImages),
    });
  }

  for (const m of moodBoard as any[]) {
    out.push({
      type: "style",
      sourceType: "moodBoard",
      sourceId: m.id,
      name: m.title ?? m.label ?? `Mood ${m.id}`,
      description: m.description ?? m.note ?? null,
      referenceImages: m.imageUrl ? [String(m.imageUrl)] : asStringArray(m.imageUrls),
    });
  }

  // Project-level reference images become anchor style elements.
  const projectRefs = asStringArray((project as any).referenceImages);
  if (projectRefs.length > 0) {
    out.push({
      type: "reference",
      sourceType: "project",
      sourceId: projectId,
      name: "Project visual anchors",
      description: "Reference images attached at the project level.",
      referenceImages: projectRefs,
    });
  }

  // Per-scene props collapse into prop elements.
  const propIndex = new Map<string, { sceneIds: number[] }>();
  for (const s of scenes as any[]) {
    for (const p of asArray<string>(s.props)) {
      const key = String(p).trim().toLowerCase();
      if (!key) continue;
      if (!propIndex.has(key)) propIndex.set(key, { sceneIds: [] });
      propIndex.get(key)!.sceneIds.push(s.id);
    }
  }
  for (const [key, { sceneIds }] of propIndex.entries()) {
    out.push({
      type: "prop",
      sourceType: "scene",
      sourceId: key,
      name: key,
      description: null,
      referenceImages: [],
      metadata: { appearsInSceneIds: sceneIds },
    });
  }

  return out;
}

export async function getPromptContextForScene(
  sceneId: number,
  userId: number,
): Promise<PromptContextForScene | null> {
  const scene = await db.getProjectSceneById(sceneId);
  if (!scene) return null;
  const projectId = (scene as any).projectId;
  const project = await db.getProjectById(projectId, userId);
  if (!project) return null;

  const elements = await listProjectElements(projectId, userId);
  const characterIds = asArray<number>((scene as any).characterIds).map((n) => Number(n));
  const characterEls = elements.filter(
    (e) => e.type === "character" && characterIds.includes(Number(e.sourceId)),
  );

  // Location: prefer scene.location string match, else first location.
  const sceneLocationName = String((scene as any).location ?? "").trim().toLowerCase();
  let locationEl: ProductionElement | null = null;
  if (sceneLocationName) {
    locationEl = elements.find(
      (e) => e.type === "location" && e.name.toLowerCase() === sceneLocationName,
    ) ?? null;
  }
  if (!locationEl) {
    locationEl = elements.find((e) => e.type === "location") ?? null;
  }

  const sceneProps = asArray<string>((scene as any).props).map((p) =>
    String(p).trim().toLowerCase(),
  );
  const propEls = elements.filter(
    (e) => e.type === "prop" && sceneProps.includes(String(e.sourceId)),
  );

  const styleEls = elements.filter((e) => e.type === "style" || e.type === "reference");

  // Continuity: previous scene reference if available.
  const continuityNotes: string[] = [];
  const sceneNumber = Number((scene as any).sceneNumber ?? 0);
  if (sceneNumber > 1) {
    continuityNotes.push(
      `This scene follows scene ${sceneNumber - 1}; maintain wardrobe, lighting and tone continuity.`,
    );
  }
  const sceneRefs = asStringArray((scene as any).referenceImages);
  if (sceneRefs.length === 0 && characterEls.length > 0) {
    continuityNotes.push(
      "No scene-level reference images — falling back to character reference images for visual anchor.",
    );
  }

  return {
    sceneId,
    characters: characterEls,
    location: locationEl,
    props: propEls,
    styleAnchors: styleEls,
    continuityNotes,
  };
}
