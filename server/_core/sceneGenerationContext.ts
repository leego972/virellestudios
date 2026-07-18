import { eq } from "drizzle-orm";
import * as db from "../db";
import { getDb } from "../db";
import { wardrobeAssignments, wardrobeItems } from "../../drizzle/schema";
import { buildCharacterDNA } from "./characterConsistency";
import {
  assertCanonicalSceneSpec,
  compileCanonicalSceneSpec,
  renderCanonicalScenePrompt,
  type CanonicalSceneCharacter,
  type CanonicalSceneSpec,
} from "./canonicalSceneSpec";
import {
  buildWardrobePromptAnchor,
  findOverlappingWardrobeAssignments,
  validateWardrobeItemForInventory,
  type WardrobeAssignmentRecord,
  type WardrobeItemRecord,
} from "./wardrobeContinuity";

export interface SceneGenerationContext {
  scene: any;
  characters: any[];
  canonicalSpec: CanonicalSceneSpec;
  canonicalPrompt: string;
  wardrobeContext?: string;
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

function imageFromItem(item: any): string | undefined {
  if (typeof item?.primaryImageUrl === "string" && item.primaryImageUrl.trim()) return item.primaryImageUrl.trim();
  if (Array.isArray(item?.imageUrls)) {
    const first = item.imageUrls.find((value: unknown) => typeof value === "string" && value.trim());
    if (typeof first === "string") return first.trim();
  }
  return undefined;
}

function normalizeInlineWardrobe(value: unknown): InlineWardrobeEntry[] {
  if (Array.isArray(value)) return value.filter((entry): entry is InlineWardrobeEntry => Boolean(entry && typeof entry === "object"));
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
      if (!entry || typeof entry !== "object") return [];
      const parsedId = Number(key);
      return [{ characterId: Number.isInteger(parsedId) ? parsedId : undefined, ...(entry as InlineWardrobeEntry) }];
    });
  }
  return [];
}

function assignmentAppliesToScene(assignment: any, sceneId: number, sceneOrder: number): boolean {
  if (assignment.sceneId != null && assignment.sceneId !== sceneId) return false;
  const from = assignment.fromSceneOrder ?? 0;
  const to = assignment.toSceneOrder ?? Number.MAX_SAFE_INTEGER;
  return from <= sceneOrder && to >= sceneOrder;
}

function uniqueUrls(values: Array<string | null | undefined>, max = 8): string[] {
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

  const projectCharacters = await db.getProjectCharacters(projectId);
  const sceneOrder = Number.isFinite((scene as any).orderIndex) ? Number((scene as any).orderIndex) : 0;
  const activeCharacterIds = Array.isArray((scene as any).characterIds) ? (scene as any).characterIds as number[] : [];
  const activeCharacters = activeCharacterIds.length
    ? projectCharacters.filter((character: any) => activeCharacterIds.includes(character.id))
    : projectCharacters;

  const dbConn = await getDb();
  const rows = dbConn
    ? await dbConn
        .select({ assignment: wardrobeAssignments, item: wardrobeItems })
        .from(wardrobeAssignments)
        .innerJoin(wardrobeItems, eq(wardrobeAssignments.wardrobeItemId, wardrobeItems.id))
        .where(eq(wardrobeAssignments.projectId, projectId))
        .catch(() => [] as any[])
    : [];

  const applicableRows = (rows as any[]).filter((row) => assignmentAppliesToScene(row.assignment, sceneId, sceneOrder));
  const assignmentRecords: WardrobeAssignmentRecord[] = applicableRows
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

  const overlaps = findOverlappingWardrobeAssignments(assignmentRecords).filter(({ first, second }) => first.locked || second.locked);
  if (overlaps.length) {
    const first = overlaps[0];
    throw new Error(
      `Conflicting locked wardrobe assignments for character ${first.characterId}: items ${first.first.wardrobeItemId} and ${first.second.wardrobeItemId} overlap scene ${sceneOrder}.`,
    );
  }

  const inlineEntries = normalizeInlineWardrobe((scene as any).wardrobe ?? (scene as any).wardrobeOverrides);
  const wardrobeLines: string[] = [];
  const wardrobeImages: string[] = [];
  const warnings: string[] = [];
  const canonicalCharacters: CanonicalSceneCharacter[] = [];
  const characterDescriptions: string[] = [];

  for (const character of activeCharacters as any[]) {
    const candidateRows = applicableRows
      .filter((row) => row.assignment?.characterId === character.id)
      .sort((a, b) => Number(Boolean(b.assignment.locked)) - Number(Boolean(a.assignment.locked)) || (b.assignment.fromSceneOrder ?? 0) - (a.assignment.fromSceneOrder ?? 0));
    const selectedRow = candidateRows[0];
    const selectedItem = selectedRow?.item as WardrobeItemRecord | undefined;
    let wardrobeAnchor: string | undefined;
    let wardrobeReferenceImageUrl: string | undefined;

    if (selectedItem) {
      const itemErrors = validateWardrobeItemForInventory(selectedItem);
      if (itemErrors.length) {
        throw new Error(`Assigned wardrobe item ${selectedItem.id} (${selectedItem.name}) is not generation-ready: ${itemErrors.join(" ")}`);
      }
      wardrobeAnchor = buildWardrobePromptAnchor(selectedItem, selectedRow.assignment.placementNotes);
      wardrobeReferenceImageUrl = imageFromItem(selectedItem);
      wardrobeLines.push(`${character.name}: ${wardrobeAnchor}`);
      if (wardrobeReferenceImageUrl) wardrobeImages.push(wardrobeReferenceImageUrl);
    }

    const inline = inlineEntries.find((entry) => entry.characterId === character.id);
    if (inline) {
      const supplement = [
        inline.wardrobeDescription && `scene-specific wardrobe direction: ${inline.wardrobeDescription.trim()}`,
        inline.hairNotes && `hair: ${inline.hairNotes.trim()}`,
        inline.makeupNotes && `makeup: ${inline.makeupNotes.trim()}`,
        inline.accessories && `accessories: ${inline.accessories.trim()}`,
      ].filter(Boolean).join("; ");
      if (supplement) {
        wardrobeAnchor = wardrobeAnchor ? `${wardrobeAnchor}; SCENE-SPECIFIC SUPPLEMENT: ${supplement}` : supplement;
        wardrobeLines.push(`${character.name} scene supplement: ${supplement}`);
      }
    }

    const dna = buildCharacterDNA(character, wardrobeAnchor ? { wardrobeDescription: wardrobeAnchor } : undefined);
    characterDescriptions.push(dna.promptAnchor);
    canonicalCharacters.push({
      id: character.id,
      name: character.name,
      visualAnchor: dna.promptAnchor,
      wardrobe: character.clothing || undefined,
      wardrobeAnchor,
      blocking: (scene as any).characterBlocking || undefined,
      referenceImageUrl: character.photoUrl || character.referenceImageUrl || character.thumbnailUrl || undefined,
      wardrobeReferenceImageUrl,
    });
  }

  for (const row of applicableRows.filter((entry) => !entry.assignment?.characterId)) {
    const item = row.item as WardrobeItemRecord;
    const itemErrors = validateWardrobeItemForInventory(item);
    if (itemErrors.length) {
      warnings.push(`Scene wardrobe reference ${item.id} (${item.name}) skipped: ${itemErrors.join(" ")}`);
      continue;
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
    wardrobeOverrides: (scene as any).wardrobeOverrides ?? (scene as any).wardrobe,
  };
  const canonicalSpec = compileCanonicalSceneSpec(mergedScene, canonicalCharacters);
  if (wardrobeLines.length) {
    canonicalSpec.lockedRequirements.push(`WARDROBE AND COSTUME LOCKS: ${wardrobeLines.join(" | ")}`);
  }
  canonicalSpec.referenceImages = uniqueUrls([
    ...canonicalSpec.referenceImages,
    ...canonicalCharacters.map((character) => character.referenceImageUrl),
    ...wardrobeImages,
  ]);
  canonicalSpec.validationWarnings.push(...warnings);
  assertCanonicalSceneSpec(canonicalSpec);

  return {
    scene,
    characters: activeCharacters,
    canonicalSpec,
    canonicalPrompt: renderCanonicalScenePrompt(canonicalSpec),
    wardrobeContext: wardrobeLines.length ? wardrobeLines.join("\n") : undefined,
    referenceImages: canonicalSpec.referenceImages,
    characterDescriptions,
    warnings: canonicalSpec.validationWarnings,
  };
}
