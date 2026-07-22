export interface WardrobeItemRecord {
  id: number;
  userId: number;
  collectionId?: number | null;
  name: string;
  primaryImageUrl?: string | null;
  imageUrls?: unknown;
  referencePrompt?: string | null;
  faceCoverage?: string | null;
  colors?: unknown;
  materials?: unknown;
  category?: string | null;
  status?: string | null;
  visibility?: string | null;
  characterWardrobeAllowed?: boolean | null;
}

export interface WardrobeLeaseRecord {
  id: number;
  userId: number;
  wardrobeItemId?: number | null;
  collectionId?: number | null;
  status: string;
}

export interface WardrobeAssignmentRecord {
  id?: number;
  userId: number;
  projectId: number;
  wardrobeItemId: number;
  characterId: number;
  fromSceneOrder: number;
  toSceneOrder: number;
  placementNotes?: string | null;
  locked?: boolean | null;
}

export function hasWardrobeAccess(
  userId: number,
  item: WardrobeItemRecord,
  leases: WardrobeLeaseRecord[],
): boolean {
  if (item.userId === userId) return true;
  return leases.some((lease) =>
    lease.userId === userId
    && lease.status === "active"
    && (
      lease.wardrobeItemId === item.id
      || (item.collectionId != null && lease.collectionId === item.collectionId)
    ),
  );
}

export function validateWardrobeItemForInventory(item: WardrobeItemRecord): string[] {
  const errors: string[] = [];
  if (!item.name?.trim()) errors.push("Wardrobe item has no name.");
  if (item.status && item.status !== "active") errors.push("Wardrobe item is not active.");
  if (item.characterWardrobeAllowed === false) errors.push("Wardrobe item is not licensed for character wardrobe use.");

  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls.filter(Boolean) : [];
  if (!item.primaryImageUrl && imageUrls.length === 0) errors.push("Wardrobe item has no generated or uploaded reference image.");
  if (!item.referencePrompt?.trim()) errors.push("Wardrobe item has no AI reference prompt for reliable generation.");
  return errors;
}

export function validateWardrobeAssignment(
  assignment: WardrobeAssignmentRecord,
  item: WardrobeItemRecord,
  userLeases: WardrobeLeaseRecord[],
): string[] {
  const errors = validateWardrobeItemForInventory(item);
  if (!hasWardrobeAccess(assignment.userId, item, userLeases)) {
    errors.push("User does not own or have an active collection purchase for this wardrobe item.");
  }
  if (!Number.isInteger(assignment.characterId) || assignment.characterId <= 0) errors.push("Character ID is invalid.");
  if (!Number.isInteger(assignment.projectId) || assignment.projectId <= 0) errors.push("Project ID is invalid.");
  if (assignment.fromSceneOrder < 0 || assignment.toSceneOrder < assignment.fromSceneOrder) {
    errors.push("Wardrobe scene range is invalid.");
  }
  return errors;
}

export function findOverlappingWardrobeAssignments(
  assignments: WardrobeAssignmentRecord[],
): Array<{ characterId: number; first: WardrobeAssignmentRecord; second: WardrobeAssignmentRecord }> {
  const overlaps: Array<{ characterId: number; first: WardrobeAssignmentRecord; second: WardrobeAssignmentRecord }> = [];
  const byCharacter = new Map<number, WardrobeAssignmentRecord[]>();

  for (const assignment of assignments) {
    const current = byCharacter.get(assignment.characterId) || [];
    current.push(assignment);
    byCharacter.set(assignment.characterId, current);
  }

  for (const [characterId, rows] of byCharacter) {
    const sorted = [...rows].sort((a, b) => a.fromSceneOrder - b.fromSceneOrder);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].fromSceneOrder > sorted[i].toSceneOrder) break;
        if (sorted[i].wardrobeItemId !== sorted[j].wardrobeItemId) {
          overlaps.push({ characterId, first: sorted[i], second: sorted[j] });
        }
      }
    }
  }
  return overlaps;
}

function renderJsonList(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || undefined;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

export function buildWardrobePromptAnchor(item: WardrobeItemRecord, notes?: string | null): string {
  const colors = renderJsonList(item.colors);
  const materials = renderJsonList(item.materials);
  return [
    `WARDROBE ID ${item.id} — ${item.name}`,
    item.category && `category: ${item.category}`,
    colors && `exact colours: ${colors}`,
    materials && `exact materials: ${materials}`,
    item.referencePrompt && `visual reference: ${item.referencePrompt.trim()}`,
    item.faceCoverage === "full" && "FULL FACE COVERAGE: the costume mask/cowl/helmet completely replaces the visible actor face; no facial skin, hairline, eyes, mouth or uncovered identity may appear",
    item.faceCoverage === "partial" && "PARTIAL FACE COVERAGE: preserve the exact mask/helmet coverage shown in the costume reference",
    item.primaryImageUrl && `reference image: ${item.primaryImageUrl}`,
    notes?.trim() && `placement and fit notes: ${notes.trim()}`,
    "LOCK: preserve the same garment design, cut, colour, material, fit, logos, damage and accessories in every assigned scene until the assignment range ends.",
  ].filter(Boolean).join("; ");
}

export function resolveWardrobeForScene(
  sceneOrder: number,
  characterId: number,
  assignments: WardrobeAssignmentRecord[],
  itemsById: Map<number, WardrobeItemRecord>,
): { item: WardrobeItemRecord; promptAnchor: string; assignment: WardrobeAssignmentRecord } | null {
  const candidates = assignments
    .filter((assignment) =>
      assignment.characterId === characterId
      && assignment.fromSceneOrder <= sceneOrder
      && assignment.toSceneOrder >= sceneOrder,
    )
    .sort((a, b) => Number(Boolean(b.locked)) - Number(Boolean(a.locked)) || b.fromSceneOrder - a.fromSceneOrder);

  const assignment = candidates[0];
  if (!assignment) return null;
  const item = itemsById.get(assignment.wardrobeItemId);
  if (!item) return null;
  return { item, assignment, promptAnchor: buildWardrobePromptAnchor(item, assignment.placementNotes) };
}
