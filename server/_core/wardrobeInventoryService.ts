import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getDb } from "../db";
import { characters, projects, scenes, wardrobeAssignments, wardrobeItems } from "../../drizzle/schema";
import {
  findOverlappingWardrobeAssignments,
  validateWardrobeAssignment,
  type WardrobeAssignmentRecord,
  type WardrobeItemRecord,
  type WardrobeLeaseRecord,
} from "./wardrobeContinuity";
import { ensurePermanentWardrobeCopiesForUser } from "./wardrobePurchaseInventory";

export interface InventoryItemView {
  inventoryKey: string;
  accessSource: "item_purchase" | "collection_purchase" | "designer_owned";
  leaseId?: number;
  collectionId?: number | null;
  collectionName?: string | null;
  item: WardrobeItemRecord & Record<string, unknown>;
  assignable: boolean;
  validationErrors: string[];
}

export async function buildUserWardrobeInventory(userId: number): Promise<InventoryItemView[]> {
  const leases = await db.getWardrobeLeasesByUser(userId);
  const activeLeases = leases.filter((lease: any) => lease.status === "active") as WardrobeLeaseRecord[];
  const permanentCopies = await ensurePermanentWardrobeCopiesForUser(userId);
  const result = new Map<number, InventoryItemView>();
  const collectionNames = new Map<number, string | null>();

  for (const copy of permanentCopies) {
    const item = copy.item as WardrobeItemRecord & Record<string, unknown>;
    const validationErrors = validateWardrobeAssignment({
      userId,
      projectId: 1,
      characterId: 1,
      wardrobeItemId: item.id,
      fromSceneOrder: 0,
      toSceneOrder: 0,
    }, item, activeLeases).filter((error) => !error.includes("Project ID") && !error.includes("Character ID"));

    let collectionName: string | null | undefined;
    if (copy.collectionId) {
      if (!collectionNames.has(copy.collectionId)) {
        const collection = await db.getDesignerCollectionById(copy.collectionId);
        collectionNames.set(copy.collectionId, collection?.name ?? null);
      }
      collectionName = collectionNames.get(copy.collectionId);
    }

    result.set(item.id, {
      inventoryKey: `purchase:${copy.leaseId}:source:${copy.sourceWardrobeItemId}:item:${item.id}`,
      accessSource: copy.leaseType === "collection" ? "collection_purchase" : "item_purchase",
      leaseId: copy.leaseId,
      collectionId: copy.collectionId,
      collectionName,
      item,
      assignable: validationErrors.length === 0,
      validationErrors,
    });
  }

  const dbConn = await getDb();
  if (dbConn) {
    const ownedItems = await dbConn.select().from(wardrobeItems).where(eq(wardrobeItems.userId, userId));
    for (const item of ownedItems) {
      if (result.has(item.id)) continue;
      const validationErrors = validateWardrobeAssignment({
        userId,
        projectId: 1,
        characterId: 1,
        wardrobeItemId: item.id,
        fromSceneOrder: 0,
        toSceneOrder: 0,
      }, item as WardrobeItemRecord, activeLeases).filter((error) => !error.includes("Project ID") && !error.includes("Character ID"));
      result.set(item.id, {
        inventoryKey: `owned:item:${item.id}`,
        accessSource: "designer_owned",
        collectionId: item.collectionId,
        item: item as any,
        assignable: validationErrors.length === 0,
        validationErrors,
      });
    }
  }

  return Array.from(result.values()).sort((a, b) => String(a.item.name).localeCompare(String(b.item.name)));
}

export interface ValidatedAssignmentInput {
  userId: number;
  projectId: number;
  characterId: number;
  wardrobeItemId: number;
  fromSceneOrder: number;
  toSceneOrder: number;
  notes?: string;
  locked?: boolean;
}

export async function validateAndCreateWardrobeAssignment(input: ValidatedAssignmentInput): Promise<{ id: number; success: true }> {
  if (input.toSceneOrder < input.fromSceneOrder) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The ending scene must be at or after the starting scene." });
  }
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });

  const [projectRows, characterRows, sceneRange, item, leases] = await Promise.all([
    dbConn.select().from(projects).where(and(eq(projects.id, input.projectId), eq(projects.userId, input.userId))).limit(1),
    dbConn.select().from(characters).where(and(eq(characters.id, input.characterId), eq(characters.projectId, input.projectId))).limit(1),
    dbConn.select({ minOrder: sql<number>`MIN(${scenes.orderIndex})`, maxOrder: sql<number>`MAX(${scenes.orderIndex})` }).from(scenes).where(eq(scenes.projectId, input.projectId)),
    db.getWardrobeItemById(input.wardrobeItemId),
    db.getWardrobeLeasesByUser(input.userId),
  ]);

  if (!projectRows[0]) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this project." });
  if (!characterRows[0]) throw new TRPCError({ code: "BAD_REQUEST", message: "The selected character does not belong to this project." });
  if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Wardrobe item not found." });

  const minOrder = Number(sceneRange[0]?.minOrder ?? 0);
  const maxOrder = Number(sceneRange[0]?.maxOrder ?? 0);
  if (input.fromSceneOrder < minOrder || input.toSceneOrder > maxOrder) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Scene range must stay within this project (${minOrder} to ${maxOrder}).`,
    });
  }

  const activeLeases = leases.filter((lease: any) => lease.status === "active") as WardrobeLeaseRecord[];
  const assignment: WardrobeAssignmentRecord = {
    userId: input.userId,
    projectId: input.projectId,
    characterId: input.characterId,
    wardrobeItemId: input.wardrobeItemId,
    fromSceneOrder: input.fromSceneOrder,
    toSceneOrder: input.toSceneOrder,
    placementNotes: input.notes,
    locked: input.locked ?? true,
  };
  const validationErrors = validateWardrobeAssignment(assignment, item as WardrobeItemRecord, activeLeases);
  if (validationErrors.length) throw new TRPCError({ code: "BAD_REQUEST", message: validationErrors.join(" ") });

  const existingRows = await dbConn
    .select()
    .from(wardrobeAssignments)
    .where(and(
      eq(wardrobeAssignments.userId, input.userId),
      eq(wardrobeAssignments.projectId, input.projectId),
      eq(wardrobeAssignments.characterId, input.characterId),
      or(
        and(
          lte(wardrobeAssignments.fromSceneOrder, input.toSceneOrder),
          gte(wardrobeAssignments.toSceneOrder, input.fromSceneOrder),
        ),
        eq(wardrobeAssignments.wardrobeItemId, input.wardrobeItemId),
      ),
    ));

  const normalizedExisting: WardrobeAssignmentRecord[] = existingRows.map((row) => ({
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    wardrobeItemId: row.wardrobeItemId,
    characterId: row.characterId!,
    fromSceneOrder: row.fromSceneOrder ?? 0,
    toSceneOrder: row.toSceneOrder ?? Number.MAX_SAFE_INTEGER,
    placementNotes: row.placementNotes,
    locked: row.locked,
  }));
  const conflicts = findOverlappingWardrobeAssignments([...normalizedExisting, assignment]);
  if (conflicts.length) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This character already has a different wardrobe item assigned during part of that scene range. Remove it or choose a non-overlapping range.",
    });
  }

  const exactExisting = existingRows.find((row) =>
    row.wardrobeItemId === input.wardrobeItemId
    && (row.fromSceneOrder ?? 0) === input.fromSceneOrder
    && (row.toSceneOrder ?? Number.MAX_SAFE_INTEGER) === input.toSceneOrder,
  );
  if (exactExisting) {
    await dbConn.update(wardrobeAssignments).set({
      placementNotes: input.notes ?? null,
      locked: input.locked ?? true,
      usageMode: "must_match",
      promptWeight: 100,
    }).where(eq(wardrobeAssignments.id, exactExisting.id));
    return { id: exactExisting.id, success: true };
  }

  const result = await dbConn.insert(wardrobeAssignments).values({
    userId: input.userId,
    projectId: input.projectId,
    characterId: input.characterId,
    wardrobeItemId: input.wardrobeItemId,
    assignmentType: "character_wardrobe",
    fromSceneOrder: input.fromSceneOrder,
    toSceneOrder: input.toSceneOrder,
    placementNotes: input.notes ?? null,
    usageMode: "must_match",
    promptWeight: 100,
    locked: input.locked ?? true,
  });
  return { id: Number((result as any).insertId), success: true };
}

export async function removeOwnedWardrobeAssignment(userId: number, assignmentId: number): Promise<{ success: true }> {
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  const rows = await dbConn.select().from(wardrobeAssignments).where(and(eq(wardrobeAssignments.id, assignmentId), eq(wardrobeAssignments.userId, userId))).limit(1);
  if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Wardrobe assignment not found." });
  await dbConn.delete(wardrobeAssignments).where(and(eq(wardrobeAssignments.id, assignmentId), eq(wardrobeAssignments.userId, userId)));
  return { success: true };
}
