import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  wardrobeItems,
  wardrobeLeases,
  designerProfiles,
  users,
} from "../drizzle/schema";
import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { runLamaloSeed } from "./lamalo-seed";

const LAMALO_BRAND_NAME = "Lamalo Fashion";
const LAMALO_BRAND_ALIASES = ["Lamalo Fashions", "Lamalo"] as const;
const STARTER_OPTION_COUNT = 10;

/**
 * Ten real, colour-qualified items from the Lamalo catalogue.
 * The seed expands every base garment into separate colour products, so these
 * names intentionally include the exact ` — Colour` suffix stored in MySQL.
 */
const STARTER_PICKS = [
  "Lamalo Premium Tee — Black",
  "Lamalo Bomber Jacket — Olive",
  "Lamalo Suit Jacket — Navy",
  "Lamalo Straight Denim — Indigo",
  "Lamalo Classic Polo — White",
  "Lamalo Structured Blazer — Black",
  "Lamalo Pure Silk Blouse — White",
  "Lamalo Satin Slip Dress — Champagne",
  "Lamalo Wrap Midi Dress — Sage Green",
  "Lamalo Wide-Leg Formal Trouser — Camel",
] as const;

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
  category: string;
  subcategory: string | null;
  genderFit: string | null;
  colors: unknown;
  referencePrompt: string | null;
  primaryImageUrl: string | null;
};

type LamaloProfileRef = { id: number; userId: number };

async function findLamaloProfile(
  db: Awaited<ReturnType<typeof getDb>>,
): Promise<LamaloProfileRef | null> {
  if (!db) return null;
  const exact = await db
    .select({ id: designerProfiles.id, userId: designerProfiles.userId })
    .from(designerProfiles)
    .where(eq(designerProfiles.brandName, LAMALO_BRAND_NAME))
    .orderBy(asc(designerProfiles.id))
    .limit(1);
  if (exact[0]) return exact[0];

  const aliases = await db
    .select({ id: designerProfiles.id, userId: designerProfiles.userId })
    .from(designerProfiles)
    .where(inArray(designerProfiles.brandName, [...LAMALO_BRAND_ALIASES]))
    .orderBy(asc(designerProfiles.id))
    .limit(1);
  return aliases[0] ?? null;
}

async function hasStarterInventory(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  profileId: number,
): Promise<boolean> {
  const rows = await db
    .select({ name: wardrobeItems.name })
    .from(wardrobeItems)
    .where(
      and(
        eq(wardrobeItems.designerProfileId, profileId),
        eq(wardrobeItems.visibility, "public"),
        eq(wardrobeItems.status, "active"),
      ),
    )
    .limit(100);
  return new Set(rows.map(row => row.name).filter(Boolean)).size >= STARTER_OPTION_COUNT;
}

/**
 * Production should already have Lamalo seeded. This self-heals both a missing
 * profile and an existing but empty catalogue. It uses the Lamalo profile owner
 * when available, otherwise the first administrator—never the new member.
 */
async function requireLamaloProfileId(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
): Promise<number> {
  let profile = await findLamaloProfile(db);
  if (profile && await hasStarterInventory(db, profile.id)) return profile.id;

  let ownerUserId = profile?.userId;
  if (!ownerUserId) {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);
    ownerUserId = admins[0]?.id;
  }

  if (!ownerUserId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The Lamalo catalogue has not been initialised and no administrator account is available to initialise it.",
    });
  }

  await runLamaloSeed(ownerUserId);
  profile = await findLamaloProfile(db);
  if (!profile || !(await hasStarterInventory(db, profile.id))) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "The Lamalo catalogue could not be initialised with ten welcome-gift choices.",
    });
  }
  return profile.id;
}

export const lamaloGiftsRouter = router({
  /** Check if this user (non-designer) has already claimed their 2 free outfits. */
  hasClaimedGift: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

    const designer = await db
      .select({ id: designerProfiles.id })
      .from(designerProfiles)
      .where(eq(designerProfiles.userId, ctx.user.id))
      .limit(1);
    if (designer.length > 0) {
      return { eligible: false, claimed: false, reason: "designer_account" };
    }

    const lamalo = await findLamaloProfile(db);
    if (!lamalo) return { eligible: true, claimed: false };

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
      );

    return { eligible: true, claimed: freeLeases.length >= 2 };
  }),

  /** Return exactly ten curated, real Lamalo catalogue choices. */
  getStarterOutfits: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

    const designer = await db
      .select({ id: designerProfiles.id })
      .from(designerProfiles)
      .where(eq(designerProfiles.userId, ctx.user.id))
      .limit(1);
    if (designer.length > 0) {
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
        .limit(100);
      const existingIds = new Set(ordered.map(item => item.id));
    const existingNames = new Set(ordered.map(item => item.name));
    for (const item of fallback) {
      if (!item.name || existingIds.has(item.id) || existingNames.has(item.name)) continue;
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
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

    const designer = await db
      .select({ id: designerProfiles.id })
      .from(designerProfiles)
      .where(eq(designerProfiles.userId, ctx.user.id))
      .limit(1);
    if (designer.length > 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Designer accounts are not eligible.",
      });
    }

    const lamaloId = await requireLamaloProfileId(db);
    const selectedIds = [input.itemId1, input.itemId2];

    const result = await db.transaction(async tx => {
      // Lock the member row so two browser requests cannot claim twice concurrently.
      await tx.execute(sql`SELECT id FROM users WHERE id = ${ctx.user.id} FOR UPDATE`);

      const existing = await tx
        .select({ id: wardrobeLeases.id, wardrobeItemId: wardrobeLeases.wardrobeItemId })
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
          message: "Choose outfits that are not already in your welcome gift.",
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

      return { added: itemIdsToInsert.length, total: existing.length + itemIdsToInsert.length };
    });

    return {
      success: true,
      added: result.added,
      total: result.total,
      message: "Welcome outfits unlocked! They are available in your wardrobe inventory.",
    };
  }),
});
