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

// ────────────────────────────────────────────────────────────────────────────
// v6.73 — Scene generation-readiness scoring.
//
// Returns a 0–100 score plus a `warnings` list (soft, recoverable) and a
// `missing` list (hard, must-fix-for-good-output). Pure read. The score is
// intentionally additive and capped at 100 so adding more weight later
// cannot accidentally double-charge a category.
//
// Weights (must sum to 100):
//   +20  description exists and is non-trivial (>= 30 chars)
//   +15  location exists (real record OR scene's own location-ish fields)
//   +15  at least one character attached to the scene
//   +15  attached character has at least one reference image
//   +10  scene props OR productionNotes present
//   +10  shot list present (scene.shotList JSON has >= 1 entry)
//   +15  visual style / camera context present (mood, timeOfDay, or any
//        project-level style anchor)
// ────────────────────────────────────────────────────────────────────────────

export interface SceneReadiness {
  sceneId: number;
  sceneNumber: number;
  title: string;
  score: number;
  warnings: string[];
  missing: string[];
}

export async function computeSceneReadiness(
  sceneId: number,
  userId: number,
): Promise<SceneReadiness | null> {
  const scene: any = await db.getSceneById(sceneId);
  if (!scene) return null;
  const project = await db.getProjectById(scene.projectId, userId);
  if (!project) return null;

  const ctx = await getPromptContextForScene(sceneId, userId);
  const sceneNumber = Number(scene.orderIndex ?? 0) + 1;
  const title = String(scene.title ?? `Scene ${sceneNumber}`).slice(0, 200);

  const warnings: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // 1. Description — +20.
  const desc = String(scene.description ?? "").trim();
  if (desc.length >= 30) {
    score += 20;
  } else if (desc.length > 0) {
    score += 8;
    warnings.push("Scene description is short (under 30 characters).");
  } else {
    missing.push("Scene has no description.");
  }

  // 2. Location — +15.
  if (ctx?.location && ctx.location.name) {
    score += 15;
  } else {
    missing.push("Scene has no location set.");
  }

  // 3. Character attached — +15.
  const hasChar = (ctx?.characters?.length ?? 0) > 0;
  if (hasChar) {
    score += 15;
  } else {
    missing.push("No characters attached to this scene.");
  }

  // 4. Character reference image — +15. Only counts if a character is
  //    attached at all (avoids double-penalty).
  if (hasChar) {
    const anyRef = (ctx!.characters).some(
      (c: any) => Array.isArray(c.referenceImages) && c.referenceImages.length > 0,
    );
    if (anyRef) {
      score += 15;
    } else {
      missing.push("Attached characters have no reference images yet.");
    }
  }

  // 5. Props or production notes — +10.
  const propsArr = asArray<string>((scene as any).props);
  const notes = String((scene as any).productionNotes ?? "").trim();
  if (propsArr.length > 0 || notes.length > 0) {
    score += 10;
  } else {
    warnings.push("No props or production notes set for this scene.");
  }

  // 6. Shot list — +10.
  const shotList = asArray<unknown>((scene as any).shotList);
  if (shotList.length > 0) {
    score += 10;
  } else {
    warnings.push("No shot list — generation will use a single default shot.");
  }

  // 7. Visual style / camera context — +15.
  const mood = String((scene as any).mood ?? "").trim();
  const tod = String((scene as any).timeOfDay ?? "").trim();
  const hasStyleAnchor = (ctx?.styleAnchors?.length ?? 0) > 0;
  if (mood || tod || hasStyleAnchor) {
    score += 15;
  } else {
    warnings.push("No mood/time-of-day/style anchor — output may be visually inconsistent across scenes.");
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    sceneId,
    sceneNumber,
    title,
    score,
    warnings,
    missing,
  };
}
