import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { projects, wardrobeAssignments, wardrobeItems } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "./trpc";
import {
  buildUserWardrobeInventory,
  removeOwnedWardrobeAssignment,
  validateAndCreateWardrobeAssignment,
} from "./wardrobeInventoryService";

/**
 * Hardened procedures intended to replace the legacy inventory/director
 * procedures while preserving the rest of the existing marketplace router.
 */
export const wardrobeMarketplaceHardenedRouter = router({
  inventory: router({
    listItems: protectedProcedure.query(async ({ ctx }) => buildUserWardrobeInventory(ctx.user.id)),
  }),

  director: router({
    assign: protectedProcedure
      .input(z.object({
        projectId: z.number().int().positive(),
        characterId: z.number().int().positive(),
        wardrobeItemId: z.number().int().positive(),
        fromSceneOrder: z.number().int().min(0),
        toSceneOrder: z.number().int().min(0),
        notes: z.string().max(1000).optional(),
        locked: z.boolean().default(true),
      }))
      .mutation(({ ctx, input }) => validateAndCreateWardrobeAssignment({ userId: ctx.user.id, ...input })),

    list: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
        const project = await dbConn.select().from(projects).where(and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))).limit(1);
        if (!project[0]) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this project." });
        return dbConn
          .select({ assignment: wardrobeAssignments, item: wardrobeItems })
          .from(wardrobeAssignments)
          .leftJoin(wardrobeItems, eq(wardrobeAssignments.wardrobeItemId, wardrobeItems.id))
          .where(and(eq(wardrobeAssignments.projectId, input.projectId), eq(wardrobeAssignments.userId, ctx.user.id)));
      }),

    remove: protectedProcedure
      .input(z.object({ assignmentId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => removeOwnedWardrobeAssignment(ctx.user.id, input.assignmentId)),
  }),
});
