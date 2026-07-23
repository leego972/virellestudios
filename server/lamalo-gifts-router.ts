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
  LAMALO_WELCOME_ITEM_NAMES,
} from "./_core/lamaloWelcomeInventory";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const STARTER_OPTION_COUNT = 10;
const STARTER_PICKS = LAMALO_WELCOME_ITEM_NAMES;

const starterSelection = {
  id: wardrobeItems.id,
  name: wardrobeItems.name,
  description: wardrobeItems.description,
  category: wardrobeItems.category,
  subcategory: wardrobeItems.subcategory,
  genderFit: wardrobeItems.genderFit,
  colors: wardrobeItems.colors,
  referencePrompt: wardrobeItems.referencePrompt,
  primaryImageUrl: wardrobeItems.primaryImageUrl,
};

type StarterOutfit = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  genderFit: string | null;
  colors: unknown;
  referencePrompt: string | null;
  primaryImageUrl: string | null;
};

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
 * Prepare only the ten welcome choices needed by this flow. The previous
 * implementation could run the complete 1,400+ item Lamalo seed inside a
 * login-time request, which was slow enough to time out on production.
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
      message:
        "The welcome outfits could not be prepared. Please retry in a moment.",
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

  /** Return exactly ten curated, real Lamalo catalogue choices. */
  getStarterOutfits: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDatabase();

    if (await isDesignerAccount(db, ctx.user.id)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Designer accounts are not eligible for welcome gifts.",
      });
    }

    const lamaloId = await requireLamaloProfileId(db);
    const curated = await db
      .select(starterSelection)
      .from(wardrobeItems)
      .where(
        and(
          eq(wardrobeItems.designerProfileId, lamaloId),
          inArray(wardrobeItems.name, [...STARTER_PICKS]),
          eq(wardrobeItems.visibility, "public"),
          eq(wardrobeItems.status, "active"),
        ),
      );

    const curatedByName = new Map(curated.map(item => [item.name, item]));
    const ordered: StarterOutfit[] = [];

    for (const name of STARTER_PICKS) {
      const item = curatedByName.get(name);
      if (item) ordered.push(item as StarterOutfit);
    }

    if (ordered.length < STARTER_OPTION_COUNT) {
      const fallback = await db
        .select(starterSelection)
        .from(wardrobeItems)
        .where(
          and(
            eq(wardrobeItems.designerProfileId, lamaloId),
            eq(wardrobeItems.visibility, "public"),
            eq(wardrobeItems.status, "active"),
          ),
        )
        .orderBy(asc(wardrobeItems.id))
        .limit(2000);

      const existingIds = new Set(ordered.map(item => item.id));
      const existingNames = new Set(ordered.map(item => item.name));

      for (const item of fallback) {
        if (
          !item.name ||
          existingIds.has(item.id) ||
          existingNames.has(item.name)
        ) {
          continue;
        }

        ordered.push(item as StarterOutfit);
        existingIds.add(item.id);
        existingNames.add(item.name);

        if (ordered.length === STARTER_OPTION_COUNT) break;
      }
    }

    if (ordered.length < STARTER_OPTION_COUNT) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Lamalo needs at least ${STARTER_OPTION_COUNT} active public wardrobe items before the welcome gift can be offered.`,
      });
    }

    return ordered.slice(0, STARTER_OPTION_COUNT);
  }),

  /** Claim two free welcome outfits. Regular studio users only. */
  claimGift: protectedProcedure
    .input(
      z
        .object({
          itemId1: z.number().int().positive(),
          itemId2: z.number().int().positive(),
        })
        .refine(input => input.itemId1 !== input.itemId2, {
          message: "Choose two different outfits.",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await requireDatabase();

      if (await isDesignerAccount(db, ctx.user.id)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Designer accounts are not eligible.",
        });
      }

      const lamaloId = await requireLamaloProfileId(db);
      const selectedIds = [input.itemId1, input.itemId2];

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

        const items = await tx
          .select({ id: wardrobeItems.id })
          .from(wardrobeItems)
          .where(
            and(
              inArray(wardrobeItems.id, selectedIds),
              eq(wardrobeItems.designerProfileId, lamaloId),
              eq(wardrobeItems.visibility, "public"),
              eq(wardrobeItems.status, "active"),
            ),
          );

        if (items.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid Lamalo outfits selected.",
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
            message:
              "Choose outfits that are not already in your welcome gift.",
          });
        }

        if (itemIdsToInsert.length > 0) {
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
        }

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
