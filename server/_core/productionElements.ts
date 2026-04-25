// v6.68 / v6.69 — Production Elements consistency layer (Phase 4 + Phase 2 repair).
// Derives a unified "elements" view (characters / locations / props / style /
// references) from the existing characters, locations, moodBoardItems, and
// per-scene fields without introducing a new persistence table. Used by
// generation prompt builders so the LLM/video provider always sees the same
// reference set for related scenes.
//
// v6.69 repair pass:
//   - Character reference images now pull from every actual source on the
//     characters row (photoUrl, attributes.referenceImages, attributes.imageUrl,
//     attributes.photoUrl, attributes.headshotUrl) plus the linked aiActor.
//   - Scene location now uses locationDetail / locationType / city / country /
//     realEstateStyle, and matches against location records by name.
//   - Scene number is derived from orderIndex + 1 (the scenes table has no
//     sceneNumber column).
//   - Every read is defensive — a missing or wrongly-shaped JSON column never
//     throws.

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
  sceneNumber: number;
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
  return asArray<unknown>(v)
    .map((x) => (typeof x === "string" ? x : (x as any)?.url ?? ""))
    .filter((x) => typeof x === "string" && x.trim().length > 0) as string[];
}

function safeJsonObject(v: unknown): Record<string, any> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, any>;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (p && typeof p === "object" && !Array.isArray(p)) return p as Record<string, any>;
    } catch {}
  }
  return {};
}

/**
 * v6.69 — Collect every reference image we can find on a characters row.
 * Includes the linked aiActor's image when present. Deduplicates results.
 */
export function collectCharacterReferenceImages(
  character: any,
  aiActor: any | null = null,
): string[] {
  const refs: string[] = [];
  // Direct fields on the row.
  if (typeof character?.photoUrl === "string" && character.photoUrl.trim().length > 0) {
    refs.push(character.photoUrl);
  }
  // Some legacy projects also stored direct referenceImages JSON arrays.
  refs.push(...asStringArray((character as any)?.referenceImages));
  // attributes is a json blob — referenceImages, imageUrl, photoUrl, headshotUrl,
  // bodyShotUrl, lookbookImages all show up in the wild.
  const attrs = safeJsonObject((character as any)?.attributes);
  refs.push(...asStringArray(attrs.referenceImages));
  refs.push(...asStringArray(attrs.lookbookImages));
  if (typeof attrs.imageUrl === "string" && attrs.imageUrl.trim()) refs.push(attrs.imageUrl);
  if (typeof attrs.photoUrl === "string" && attrs.photoUrl.trim()) refs.push(attrs.photoUrl);
  if (typeof attrs.headshotUrl === "string" && attrs.headshotUrl.trim()) refs.push(attrs.headshotUrl);
  if (typeof attrs.bodyShotUrl === "string" && attrs.bodyShotUrl.trim()) refs.push(attrs.bodyShotUrl);
  // Linked aiActor row if provided.
  if (aiActor) {
    if (typeof aiActor?.photoUrl === "string" && aiActor.photoUrl.trim()) refs.push(aiActor.photoUrl);
    if (typeof aiActor?.headshotUrl === "string" && aiActor.headshotUrl.trim()) refs.push(aiActor.headshotUrl);
    refs.push(...asStringArray((aiActor as any)?.referenceImages));
    refs.push(...asStringArray((aiActor as any)?.lookbookImages));
  }
  // Dedup while preserving order.
  const seen = new Set<string>();
  return refs.filter((u) => {
    const k = u.trim();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * v6.69 — Build a human-readable location label from the actual scene fields
 * that exist (locationDetail / locationType / city / country / realEstateStyle).
 */
export function buildSceneLocationLabel(scene: any): string {
  const parts: string[] = [];
  if (scene?.locationDetail && String(scene.locationDetail).trim()) parts.push(String(scene.locationDetail).trim());
  if (scene?.realEstateStyle && String(scene.realEstateStyle).trim()) parts.push(String(scene.realEstateStyle).trim());
  if (scene?.locationType && String(scene.locationType).trim()) parts.push(String(scene.locationType).trim());
  const cityCountry = [scene?.city, scene?.country].filter((x) => x && String(x).trim()).join(", ");
  if (cityCountry) parts.push(cityCountry);
  return parts.join(" — ");
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
    // v6.69 — try to load the linked aiActor row for image fallbacks.
    let aiActor: any = null;
    if (c.aiActorId) {
      try { aiActor = await (db as any).getAiActorById?.(c.aiActorId); } catch { aiActor = null; }
    }
    out.push({
      type: "character",
      sourceType: "character",
      sourceId: c.id,
      name: c.name ?? "Unnamed character",
      description: c.description ?? null,
      referenceImages: collectCharacterReferenceImages(c, aiActor),
      metadata: { age: c.age, role: c.role, isAiActor: !!c.isAiActor },
    });
  }

  for (const l of locations as any[]) {
    const lAttrs = safeJsonObject((l as any)?.attributes);
    const lRefs: string[] = [];
    if (typeof l.imageUrl === "string" && l.imageUrl.trim()) lRefs.push(l.imageUrl);
    if (typeof l.photoUrl === "string" && l.photoUrl.trim()) lRefs.push(l.photoUrl);
    lRefs.push(...asStringArray((l as any).referenceImages));
    lRefs.push(...asStringArray(lAttrs.referenceImages));
    if (typeof lAttrs.imageUrl === "string" && lAttrs.imageUrl.trim()) lRefs.push(lAttrs.imageUrl);
    out.push({
      type: "location",
      sourceType: "location",
      sourceId: l.id,
      name: l.name ?? "Unnamed location",
      description: l.description ?? null,
      referenceImages: Array.from(new Set(lRefs)),
    });
  }

  for (const m of moodBoard as any[]) {
    const refs: string[] = [];
    if (typeof m?.imageUrl === "string" && m.imageUrl.trim()) refs.push(m.imageUrl);
    refs.push(...asStringArray((m as any).imageUrls));
    out.push({
      type: "style",
      sourceType: "moodBoard",
      sourceId: m.id,
      name: m.title ?? m.label ?? `Mood ${m.id}`,
      description: m.description ?? m.note ?? null,
      referenceImages: Array.from(new Set(refs)),
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
      name: key.replace(/\b\w/g, (m) => m.toUpperCase()),
      description: `Used in ${sceneIds.length} scene${sceneIds.length === 1 ? "" : "s"}.`,
      referenceImages: [],
      metadata: { sceneIds },
    });
  }

  return out;
}

export async function getPromptContextForScene(
  sceneId: number,
  userId: number,
): Promise<PromptContextForScene | null> {
  const scene: any = await db.getSceneById(sceneId);
  if (!scene) return null;
  const project = await db.getProjectById(scene.projectId, userId);
  if (!project) return null;

  const elements = await listProjectElements(scene.projectId, userId);

  // Characters in this scene: characterIds is a json array.
  const sceneCharIds: number[] = asArray<unknown>(scene.characterIds)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
  const characterEls = elements.filter(
    (e) => e.type === "character" && sceneCharIds.includes(Number(e.sourceId)),
  );

  // v6.69 — Location: try a real location record matching the scene fields,
  // otherwise synthesize one from the scene's own location-ish columns.
  const sceneLocLabel = buildSceneLocationLabel(scene);
  let locationEl: ProductionElement | null = null;
  if (sceneLocLabel) {
    const lower = sceneLocLabel.toLowerCase();
    locationEl =
      elements.find((e) => e.type === "location" && lower.includes(e.name.toLowerCase())) ??
      elements.find((e) => e.type === "location" && e.name.toLowerCase().includes(lower)) ??
      null;
  }
  if (!locationEl && sceneLocLabel) {
    locationEl = {
      type: "location",
      sourceType: "scene",
      sourceId: `scene-${scene.id}`,
      name: sceneLocLabel,
      description: scene.locationDetail ?? null,
      referenceImages: asStringArray(scene.referenceImages),
    };
  }
  if (!locationEl) {
    locationEl = elements.find((e) => e.type === "location") ?? null;
  }

  const sceneProps = asArray<string>(scene.props).map((p) => String(p).trim().toLowerCase());
  const propEls = elements.filter(
    (e) => e.type === "prop" && sceneProps.includes(String(e.sourceId)),
  );

  const styleEls = elements.filter((e) => e.type === "style" || e.type === "reference");

  // v6.69 — Continuity: scenes table has NO sceneNumber column, derive from orderIndex.
  const sceneNumber = Number(scene.orderIndex ?? 0) + 1;
  const continuityNotes: string[] = [];
  if (sceneNumber > 1) {
    continuityNotes.push(
      `This scene follows scene ${sceneNumber - 1}; maintain wardrobe, lighting and tone continuity.`,
    );
  }
  const sceneRefs = asStringArray(scene.referenceImages);
  if (sceneRefs.length === 0 && characterEls.length > 0) {
    continuityNotes.push(
      "No scene-level reference images — falling back to character reference images for visual anchor.",
    );
  }

  return {
    sceneId,
    sceneNumber,
    characters: characterEls,
    location: locationEl,
    props: propEls,
    styleAnchors: styleEls,
    continuityNotes,
  };
}
