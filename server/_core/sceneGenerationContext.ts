import { eq } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { projects, wardrobeAssignments, wardrobeItems } from "../../drizzle/schema";
import { buildCharacterDNA } from "./characterConsistency";
import {
  assertCanonicalSceneSpec,
  compileCanonicalSceneSpec,
  refreshCanonicalSceneFingerprint,
  renderCanonicalScenePrompt,
  type CanonicalSceneCharacter,
  type CanonicalSceneSpec,
} from "./canonicalSceneSpec";
import {
  buildWardrobePromptAnchor,
  findOverlappingWardrobeAssignments,
  hasWardrobeAccess,
  validateWardrobeItemForInventory,
  type WardrobeAssignmentRecord,
  type WardrobeItemRecord,
  type WardrobeLeaseRecord,
} from "./wardrobeContinuity";

export interface WardrobeCharacterBinding {
  characterId: number;
  characterName: string;
  wardrobeItemId?: number;
  assignmentId?: number;
  promptAnchor?: string;
  characterReferenceImageUrl?: string;
  wardrobeReferenceImageUrl?: string;
  faceCoverage: "none" | "partial" | "full";
  identityMode: "auto" | "use_character_face" | "conceal_character_face";
  suppressCharacterFaceReference: boolean;
  explicitChange: boolean;
  carriedForward: boolean;
}

export interface SceneGenerationContext {
  scene: any;
  projectOwnerUserId: number;
  characters: any[];
  canonicalSpec: CanonicalSceneSpec;
  canonicalPrompt: string;
  wardrobeContext?: string;
  wardrobeBindings: WardrobeCharacterBinding[];
  referenceImages: string[];
  characterDescriptions: string[];
  warnings: string[];
}

type InlineWardrobeEntry = {
  characterId?: number;
  wardrobeDescription?: string;
  hairNotes?: string;
  makeupNotes?: string;
  accessories?: string;
};

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function imageFromItem(item: any): string | undefined {
  if (typeof item?.primaryImageUrl === "string" && item.primaryImageUrl.trim()) return item.primaryImageUrl.trim();
  const images = parseJsonValue<unknown[]>(item?.imageUrls, []);
  if (Array.isArray(images)) {
    const first = images.find((value: unknown) => typeof value === "string" && value.trim());
    if (typeof first === "string") return first.trim();
  }
  return undefined;
}

function characterImage(character: any): string | undefined {
  const value = character?.photoUrl || character?.referenceImageUrl || character?.thumbnailUrl;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeInlineWardrobe(value: unknown): InlineWardrobeEntry[] {
  const parsed = parseJsonValue<unknown>(value, []);
  if (Array.isArray(parsed)) return parsed.filter((entry): entry is InlineWardrobeEntry => Boolean(entry && typeof entry === "object"));
  if (parsed && typeof parsed === "object") {
    return Object.entries(parsed as Record<string, unknown>).flatMap(([key, entry]) => {
      if (!entry || typeof entry !== "object") return [];
      const parsedId = Number(key);
      return [{ characterId: Number.isInteger(parsedId) ? parsedId : undefined, ...(entry as InlineWardrobeEntry) }];
    });
  }
  return [];
}

function normalizeCharacterIds(value: unknown): number[] {
  const parsed = parseJsonValue<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];
  return Array.from(new Set(parsed.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
}

function resolveSceneCharacters(scene: any, projectCharacters: any[]): { characters: any[]; explicitIds: number[] } {
  const explicitIds = normalizeCharacterIds(scene.characterIds);
  if (explicitIds.length) {
    return {
      explicitIds,
      characters: projectCharacters.filter((character: any) => explicitIds.includes(character.id)),
    };
  }

  const dialogueLines = parseJsonValue<any[]>(scene.dialogueLines, []);
  const speakerNames = new Set(
    dialogueLines
      .map((line) => String(line?.characterName || line?.speaker || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const searchableText = [
    scene.title,
    scene.description,
    scene.visualDescription,
    scene.actionDescription,
    scene.dialogueText,
    ...dialogueLines.flatMap((line) => [line?.characterName, line?.speaker, line?.text, line?.line]),
  ].filter(Boolean).join(" ").toLowerCase();

  return {
    explicitIds,
    characters: projectCharacters.filter((character: any) => {
      const name = String(character.name || "").trim().toLowerCase();
      return Boolean(name) && (speakerNames.has(name) || searchableText.includes(name));
    }),
  };
}

function assignmentAppliesToScene(assignment: any, sceneId: number, sceneOrder: number): boolean {
  if (assignment.sceneId != null && assignment.sceneId !== sceneId) return false;
  const from = assignment.fromSceneOrder ?? 0;
  const to = assignment.toSceneOrder ?? Number.MAX_SAFE_INTEGER;
  return from <= sceneOrder && to >= sceneOrder;
}

function selectCharacterWardrobeRow(
  rows: any[],
  characterId: number,
  sceneId: number,
  sceneOrder: number,
  hasExplicitInlineOutfit: boolean,
): { row?: any; carriedForward: boolean } {
  const characterRows = rows.filter((row) => row.assignment?.characterId === characterId);
  const exact = characterRows
    .filter((row) => assignmentAppliesToScene(row.assignment, sceneId, sceneOrder))
    .sort((a, b) =>
      Number(Boolean(b.assignment.locked)) - Number(Boolean(a.assignment.locked))
      || (b.assignment.fromSceneOrder ?? 0) - (a.assignment.fromSceneOrder ?? 0),
    )[0];
  if (exact) return { row: exact, carriedForward: false };

  // Character costumes are sticky. When a range ends without a replacement,
  // the latest assigned costume remains in force until the director specifies a
  // new item (structured assignment or explicit inline outfit direction).
  if (hasExplicitInlineOutfit) return { carriedForward: false };
  const previous = characterRows
    .filter((row) => row.assignment?.sceneId == null && (row.assignment?.fromSceneOrder ?? 0) <= sceneOrder)
    .sort((a, b) =>
      (b.assignment.fromSceneOrder ?? 0) - (a.assignment.fromSceneOrder ?? 0)
      || Number(Boolean(b.assignment.locked)) - Number(Boolean(a.assignment.locked)),
    )[0];
  return { row: previous, carriedForward: Boolean(previous) };
}

function uniqueUrls(values: Array<string | null | undefined>, max = 12): string[] {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && /^https?:\/\//i.test(value.trim())).map((value) => value.trim()))).slice(0, max);
}

/**
 * Loads the authoritative scene record and compiles every relevant user input,
 * character identity anchor and wardrobe assignment into one immutable contract.
 * Generation code should consume this context instead of manually selecting fields.
 */
export async function loadSceneGenerationContext(
  sceneId: number,
  projectId: number,
  requestFallback?: Record<string, unknown>,
): Promise<SceneGenerationContext> {
  const scene = await db.getSceneById(sceneId);
  if (!scene) throw new Error(`Scene ${sceneId} was not found.`);
  if (scene.projectId !== projectId) throw new Error(`Scene ${sceneId} does not belong to project ${projectId}.`);

  const dbConn = await getDb();
  if (!dbConn) throw new Error("Database is unavailable.");
  const projectRows = await dbConn.select({ userId: projects.userId }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const projectOwnerUserId = projectRows[0]?.userId;
  if (!projectOwnerUserId) throw new Error(`Project ${projectId} was not found.`);

  const projectCharacters = await db.getProjectCharacters(projectId);
  const sceneOrder = Number.isFinite(Number((scene as any).orderIndex)) ? Number((scene as any).orderIndex) : 0;
  const resolvedCharacters = resolveSceneCharacters(scene, projectCharacters);
  const activeCharacters = resolvedCharacters.characters;
  const leases = await db.getWardrobeLeasesByUser(projectOwnerUserId);
  const activeLeases = leases.filter((lease: any) => lease.status === "active") as WardrobeLeaseRecord[];

  const rows = await dbConn
    .select({ assignment: wardrobeAssignments, item: wardrobeItems })
    .from(wardrobeAssignments)
    .innerJoin(wardrobeItems, eq(wardrobeAssignments.wardrobeItemId, wardrobeItems.id))
    .where(eq(wardrobeAssignments.projectId, projectId));

  const foreignAssignments = (rows as any[]).filter((row) => row.assignment?.userId !== projectOwnerUserId);
  if (foreignAssignments.length) {
    throw new Error(`Project ${projectId} contains wardrobe assignments that do not belong to its owner. Remove or repair assignments ${foreignAssignments.map((row) => row.assignment.id).join(", ")}.`);
  }

  const allAssignmentRecords: WardrobeAssignmentRecord[] = (rows as any[])
    .filter((row) => row.assignment?.characterId)
    .map((row) => ({
      id: row.assignment.id,
      userId: row.assignment.userId,
      projectId: row.assignment.projectId,
      wardrobeItemId: row.assignment.wardrobeItemId,
      characterId: row.assignment.characterId,
      fromSceneOrder: row.assignment.fromSceneOrder ?? 0,
      toSceneOrder: row.assignment.toSceneOrder ?? Number.MAX_SAFE_INTEGER,
      placementNotes: row.assignment.placementNotes,
      locked: row.assignment.locked,
    }));

  const overlaps = findOverlappingWardrobeAssignments(allAssignmentRecords).filter(({ first, second }) => first.locked || second.locked);
  if (overlaps.length) {
    const first = overlaps[0];
    throw new Error(`Conflicting locked wardrobe assignments for character ${first.characterId}: items ${first.first.wardrobeItemId} and ${first.second.wardrobeItemId} overlap.`);
  }

  const applicableRows = (rows as any[]).filter((row) => assignmentAppliesToScene(row.assignment, sceneId, sceneOrder));
  const inlineEntries = normalizeInlineWardrobe((scene as any).wardrobe ?? (scene as any).wardrobeOverrides);
  const wardrobeLines: string[] = [];
  const wardrobeImages: string[] = [];
  const warnings: string[] = [];
  const wardrobeBindings: WardrobeCharacterBinding[] = [];
  if (!resolvedCharacters.explicitIds.length && projectCharacters.length > 0 && activeCharacters.length === 0) {
    warnings.push("No project character was explicitly assigned to this scene or resolved from its dialogue and narrative. The generator will not invent cast members.");
  }
  const canonicalCharacters: CanonicalSceneCharacter[] = [];
  const characterDescriptions: string[] = [];
  const missingCharacterWardrobe: string[] = [];

  for (const character of activeCharacters as any[]) {
    const inline = inlineEntries.find((entry) => entry.characterId === character.id);
    const inlineOutfitChange = Boolean(inline?.wardrobeDescription?.trim());
    const selected = selectCharacterWardrobeRow(rows as any[], character.id, sceneId, sceneOrder, inlineOutfitChange);
    const selectedRow = selected.row;
    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;
    const hasStructuredWardrobeHistory = (rows as any[]).some((row) =>
      row.assignment?.characterId === character.id
      && row.assignment?.sceneId == null
      && (row.assignment?.fromSceneOrder ?? 0) <= sceneOrder,
    );
    const validInlineReplacement = inlineOutfitChange && hasStructuredWardrobeHistory;
    if (!selectedItem && !validInlineReplacement) {
      missingCharacterWardrobe.push(`${character.name} (scene ${sceneOrder + 1})`);
    }
    let wardrobeAnchor: string | undefined;
    let wardrobeReferenceImageUrl: string | undefined;

    if (selectedItem) {
      const itemErrors = validateWardrobeItemForInventory(selectedItem);
      if (!hasWardrobeAccess(projectOwnerUserId, selectedItem, activeLeases)) {
        itemErrors.push("The project owner no longer owns this wardrobe inventory item.");
      }
      if (itemErrors.length) throw new Error(`Assigned wardrobe item ${selectedItem.id} (${selectedItem.name}) is not generation-ready: ${itemErrors.join(" ")}`);
      wardrobeAnchor = buildWardrobePromptAnchor(selectedItem, selectedRow.assignment.placementNotes);
      if (selected.carriedForward) {
        wardrobeAnchor += "; CONTINUITY CARRY-FORWARD: no replacement outfit was specified, therefore this exact costume remains mandatory in this scene.";
      }
      wardrobeReferenceImageUrl = imageFromItem(selectedItem);
      wardrobeLines.push(`CHARACTER ${character.id} — ${character.name} MUST WEAR ONLY: ${wardrobeAnchor}`);
      if (wardrobeReferenceImageUrl) wardrobeImages.push(wardrobeReferenceImageUrl);
    }

    if (inline) {
      const supplement = [
        inline.wardrobeDescription && `explicit scene wardrobe direction: ${inline.wardrobeDescription.trim()}`,
        inline.hairNotes && `hair: ${inline.hairNotes.trim()}`,
        inline.makeupNotes && `makeup: ${inline.makeupNotes.trim()}`,
        inline.accessories && `accessories: ${inline.accessories.trim()}`,
      ].filter(Boolean).join("; ");
      if (supplement) {
        wardrobeAnchor = wardrobeAnchor ? `${wardrobeAnchor}; SCENE-SPECIFIC SUPPLEMENT: ${supplement}` : supplement;
        wardrobeLines.push(`CHARACTER ${character.id} — ${character.name} SCENE CHANGE: ${supplement}`);
      }
    }

    const faceCoverage = (selectedItem?.faceCoverage === "full" || selectedItem?.faceCoverage === "partial")
      ? selectedItem.faceCoverage
      : "none";
    const identityMode = (selectedRow?.assignment?.identityMode || "auto") as "auto" | "use_character_face" | "conceal_character_face";
    const suppressCharacterFaceReference = faceCoverage === "full" || identityMode === "conceal_character_face";
    const identityImageUrl = suppressCharacterFaceReference ? undefined : characterImage(character);
    const explicitChange = inlineOutfitChange || Boolean(selectedRow && (selectedRow.assignment.fromSceneOrder ?? 0) === sceneOrder);
    wardrobeBindings.push({
      characterId: character.id,
      characterName: character.name,
      wardrobeItemId: selectedItem?.id,
      assignmentId: selectedRow?.assignment?.id,
      promptAnchor: wardrobeAnchor,
      characterReferenceImageUrl: identityImageUrl,
      wardrobeReferenceImageUrl,
      faceCoverage,
      identityMode,
      suppressCharacterFaceReference,
      explicitChange,
      carriedForward: selected.carriedForward,
    });

    const dna = buildCharacterDNA(character, wardrobeAnchor ? { wardrobeDescription: wardrobeAnchor } : undefined);
    const visualAnchor = suppressCharacterFaceReference
      ? `[CHARACTER ${character.name}: FULL-COSTUME IDENTITY HARD-LOCK — the assigned costume is the visible identity. The original actor face and face portrait are intentionally suppressed. Render the exact full mask/cowl/helmet from the costume reference with zero exposed facial skin, hairline, eyes, mouth or recognisable uncovered face. Preserve body build and movement continuity: ${dna.attributes.age}, ${dna.attributes.build}${dna.attributes.height ? `, ${dna.attributes.height}` : ""}. ${wardrobeAnchor || "Maintain the assigned full-face costume exactly."}]`
      : dna.promptAnchor;
    characterDescriptions.push(visualAnchor);
    canonicalCharacters.push({
      id: character.id,
      name: character.name,
      visualAnchor,
      wardrobe: character.clothing || undefined,
      wardrobeAnchor,
      blocking: (scene as any).characterBlocking || undefined,
      referenceImageUrl: identityImageUrl,
      wardrobeReferenceImageUrl,
    });
  }

  if (missingCharacterWardrobe.length) {
    throw new Error(`Wardrobe assignment required before generation. Assign a costume to every on-screen character in Project Wardrobe. Missing: ${missingCharacterWardrobe.join(", ")}.`);
  }

  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {
    const item = row.item as WardrobeItemRecord;
    const itemErrors = validateWardrobeItemForInventory(item);
    if (!hasWardrobeAccess(projectOwnerUserId, item, activeLeases)) {
      itemErrors.push("The project owner no longer owns this wardrobe inventory item.");
    }
    if (itemErrors.length) {
      throw new Error(`Scene wardrobe reference ${item.id} (${item.name}) is not generation-ready: ${itemErrors.join(" ")}`);
    }
    wardrobeLines.push(`Scene/set reference: ${buildWardrobePromptAnchor(item, row.assignment.placementNotes)}`);
    const image = imageFromItem(item);
    if (image) wardrobeImages.push(image);
  }

  const mergedScene = {
    ...(requestFallback || {}),
    ...(scene as any),
    id: scene.id,
    orderIndex: sceneOrder,
    characterIds: resolvedCharacters.explicitIds,
    dialogueLines: parseJsonValue<any[]>((scene as any).dialogueLines, []),
    wardrobeOverrides: parseJsonValue<unknown>((scene as any).wardrobeOverrides ?? (scene as any).wardrobe, []),
    wardrobe: parseJsonValue<unknown>((scene as any).wardrobe ?? (scene as any).wardrobeOverrides, []),
    props: parseJsonValue<unknown>((scene as any).props, []),
    visualEffects: parseJsonValue<unknown>((scene as any).visualEffects, []),
    referenceImages: parseJsonValue<unknown[]>((scene as any).referenceImages, []),
  };
  let canonicalSpec = compileCanonicalSceneSpec(mergedScene, canonicalCharacters);
  if (wardrobeLines.length) {
    canonicalSpec.lockedRequirements.push(
      `WARDROBE CHARACTER BINDINGS — garments must never transfer between characters: ${wardrobeLines.join(" | ")}`,
    );
  }
  canonicalSpec.referenceImages = uniqueUrls([
    ...canonicalSpec.referenceImages,
    ...wardrobeBindings.flatMap((binding) => [binding.characterReferenceImageUrl, binding.wardrobeReferenceImageUrl]),
    ...wardrobeImages,
  ]);
  canonicalSpec.validationWarnings.push(...warnings);
  canonicalSpec = refreshCanonicalSceneFingerprint(canonicalSpec);
  assertCanonicalSceneSpec(canonicalSpec);

  return {
    scene,
    projectOwnerUserId,
    characters: activeCharacters,
    canonicalSpec,
    canonicalPrompt: renderCanonicalScenePrompt(canonicalSpec),
    wardrobeContext: wardrobeLines.length ? wardrobeLines.join("\n") : undefined,
    wardrobeBindings,
    referenceImages: canonicalSpec.referenceImages,
    characterDescriptions,
    warnings: canonicalSpec.validationWarnings,
  };
}
