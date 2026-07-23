import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  designerProfiles,
  users,
  wardrobeItems,
  wardrobeLeases,
} from "../drizzle/schema";
import {
  ensureLamaloWelcomeInventory,
  findLamaloWelcomeProfile,
  LAMALO_WELCOME_CHOICES,
} from "./_core/lamaloWelcomeInventory";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const STARTER_OPTION_COUNT = 10;

type LamaloProfileRef = {
  id: number;
  userId: number;
};

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function requireDatabase(): Promise<Database> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable.",
    });
  }
  return db;
}

async function findLamaloProfile(
  db: Database,
): Promise<LamaloProfileRef | null> {
  return findLamaloWelcomeProfile(db);
}

/**
 * Prepare only the ten items needed when a member actually claims the gift.
 * Loading the picker itself never enters this database path.
 */
async function requireLamaloProfileId(db: Database): Promise<number> {
  const profile = await findLamaloProfile(db);
  let ownerUserId = profile?.userId;

  if (!ownerUserId) {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(asc(users.id))
      .limit(1);
    ownerUserId = admins[0]?.id;
  }

  if (!ownerUserId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "The Lamalo welcome collection has not been initialised and no administrator account is available to initialise it.",
    });
  }

  try {
    return await ensureLamaloWelcomeInventory(db, ownerUserId);
  } catch (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The selected welcome outfits could not be saved. Please retry.",
      cause: error,
    });
  }
}

async function isDesignerAccount(db: Database, userId: number): Promise<boolean> {
  const rows = await db
    .select({ id: designerProfiles.id })
    .from(designerProfiles)
    .where(eq(designerProfiles.userId, userId))
    .limit(1);

  return rows.length > 0;
}

export const lamaloGiftsRouter = router({
  /** Check if this regular studio user has already claimed two free outfits. */
  hasClaimedGift: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDatabase();

    if (await isDesignerAccount(db, ctx.user.id)) {
      return {
        eligible: false,
        claimed: false,
        reason: "designer_account" as const,
      };
    }

    const lamalo = await findLamaloProfile(db);
    if (!lamalo) {
      return { eligible: true, claimed: false };
    }

    const freeLeases = await db
      .select({ id: wardrobeLeases.id })
      .from(wardrobeLeases)
      .where(
        and(
          eq(wardrobeLeases.userId, ctx.user.id),
          eq(wardrobeLeases.designerProfileId, lamalo.id),
          eq(wardrobeLeases.amountPaidAud, 0),
          eq(wardrobeLeases.status, "active"),
        ),
      )
      .limit(STARTER_OPTION_COUNT);

    return {
      eligible: true,
      claimed: freeLeases.length >= 2,
    };
  }),

  /**
   * Return the ten curated choices from the application contract. This endpoint
   * intentionally performs no catalogue query, migration or insert, so the
   * picker cannot fail because the production database is behind a revision.
   */
  getStarterOutfits: protectedProcedure.query(() => {
    return LAMALO_WELCOME_CHOICES;
  }),

  /** Claim two free welcome outfits. Regular studio users only. */
  claimGift: protectedProcedure
    .input(
      z
        .object({
          itemId1: z.number().int().min(1).max(STARTER_OPTION_COUNT),
          itemId2: z.number().int().min(1).max(STARTER_OPTION_COUNT),
        })
        .refine(input => input.itemId1 !== input.itemId2, {
          message: "Choose two different outfits.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const selectedChoices = [input.itemId1, input.itemId2].map(id =>
        LAMALO_WELCOME_CHOICES.find(choice => choice.id === id),
      );

      if (selectedChoices.some(choice => !choice)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid Lamalo outfits selected.",
        });
      }

      const selectedNames = selectedChoices.map(choice => choice!.name);
      const db = await requireDatabase();

      if (await isDesignerAccount(db, ctx.user.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Designer accounts are not eligible.",
        });
      }

      const lamaloId = await requireLamaloProfileId(db);

      const result = await db.transaction(async tx => {
        // Serialise claims for this member, including simultaneous browser tabs.
        await tx.execute(
          sql`SELECT id FROM users WHERE id = ${ctx.user.id} FOR UPDATE`,
        );

        const existing = await tx
          .select({
            id: wardrobeLeases.id,
            wardrobeItemId: wardrobeLeases.wardrobeItemId,
          })
          .from(wardrobeLeases)
          .where(
            and(
              eq(wardrobeLeases.userId, ctx.user.id),
              eq(wardrobeLeases.designerProfileId, lamaloId),
              eq(wardrobeLeases.amountPaidAud, 0),
              eq(wardrobeLeases.status, "active"),
            ),
          );

        if (existing.length >= 2) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Welcome gift already claimed.",
          });
        }

        const rows = await tx
          .select({ id: wardrobeItems.id, name: wardrobeItems.name })
          .from(wardrobeItems)
          .where(
            and(
              inArray(wardrobeItems.name, selectedNames),
              eq(wardrobeItems.designerProfileId, lamaloId),
              eq(wardrobeItems.visibility, "public"),
              eq(wardrobeItems.status, "active"),
            ),
          )
          .orderBy(asc(wardrobeItems.id));

        const itemIdByName = new Map<string, number>();
        for (const row of rows) {
          if (!itemIdByName.has(row.name)) itemIdByName.set(row.name, row.id);
        }

        const selectedIds = selectedNames
          .map(name => itemIdByName.get(name))
          .filter((id): id is number => typeof id === "number");

        if (selectedIds.length !== 2) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The selected Lamalo outfits were not created correctly.",
          });
        }

        const existingItemIds = new Set(
          existing
            .map(row => row.wardrobeItemId)
            .filter((id): id is number => typeof id === "number"),
        );
        const remainingSlots = 2 - existing.length;
        const itemIdsToInsert = selectedIds
          .filter(id => !existingItemIds.has(id))
          .slice(0, remainingSlots);

        if (itemIdsToInsert.length !== remainingSlots) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Choose outfits that are not already in your welcome gift.",
          });
        }

        await tx.insert(wardrobeLeases).values(
          itemIdsToInsert.map(wardrobeItemId => ({
            userId: ctx.user.id,
            designerProfileId: lamaloId,
            wardrobeItemId,
            leaseType: "item",
            amountPaidAud: 0,
            designerAmountAud: 0,
            platformFeeAud: 0,
            status: "active",
          })),
        );

        return {
          added: itemIdsToInsert.length,
          total: existing.length + itemIdsToInsert.length,
        };
      });

      return {
        success: true,
        added: result.added,
        total: result.total,
        message:
          "Welcome outfits unlocked! They are available in your wardrobe inventory.",
      };
    }),
});
