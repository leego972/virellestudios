import { z } from "zod";
  import { router, protectedProcedure } from "./_core/trpc";
  import { TRPCError } from "@trpc/server";
  import { getDb } from "./db";
  import { wardrobeItems, wardrobeLeases, designerProfiles, designerCollections, users } from "../drizzle/schema";
  import { eq, and, inArray } from "drizzle-orm";

  /** Curated starter outfit picks from Lamalo Fashion — shown to new studio users */
  const STARTER_PICKS = [
    "Lamalo Linen Shirt",
    "Lamalo Polo Shirt",
    "Lamalo Graphic Tee",
    "Lamalo Chino Trouser",
    "Lamalo Denim Jean",
    "Lamalo Bomber Jacket",
    "Lamalo Canvas Sneaker",
    "Lamalo Jogger Pant",
  ];

  export const lamaloGiftsRouter = router({
    /** Check if this user (non-designer) has already claimed their 2 free outfits */
    hasClaimedGift: protectedProcedure.query(async ({ ctx }) => {
      const db = (await getDb())!;
      // Designers are not eligible
      const designer = await db.select({ id: designerProfiles.id })
        .from(designerProfiles).where(eq(designerProfiles.userId, ctx.user.id)).limit(1);
      if (designer.length > 0) return { eligible: false, claimed: false, reason: "designer_account" };

      // Check for existing free leases from Lamalo Fashion
      const lamalo = await db.select({ id: designerProfiles.id })
        .from(designerProfiles).where(eq(designerProfiles.brandName, "Lamalo Fashion")).limit(1);
      if (!lamalo.length) return { eligible: true, claimed: false };

      const freeLeases = await db.select({ id: wardrobeLeases.id })
        .from(wardrobeLeases)
        .where(and(
          eq(wardrobeLeases.userId, ctx.user.id),
          eq(wardrobeLeases.designerProfileId, lamalo[0].id),
          eq(wardrobeLeases.amountPaidAud, 0),
        ));

      return { eligible: true, claimed: freeLeases.length >= 2 };
    }),

    /** Returns curated Lamalo Fashion starter items for the picker */
    getStarterOutfits: protectedProcedure.query(async ({ ctx }) => {
      const db = (await getDb())!;
      // Must not be a designer
      const designer = await db.select({ id: designerProfiles.id })
        .from(designerProfiles).where(eq(designerProfiles.userId, ctx.user.id)).limit(1);
      if (designer.length > 0) throw new TRPCError({ code: "FORBIDDEN", message: "Designer accounts are not eligible for welcome gifts." });

      // Get Lamalo items from starter picks
      const items = await db.select({
        id: wardrobeItems.id,
        name: wardrobeItems.name,
        description: wardrobeItems.description,
        category: wardrobeItems.category,
        subcategory: wardrobeItems.subcategory,
        genderFit: wardrobeItems.genderFit,
        colors: wardrobeItems.colors,
        referencePrompt: wardrobeItems.referencePrompt,
        primaryImageUrl: wardrobeItems.primaryImageUrl,
      }).from(wardrobeItems)
        .leftJoin(designerCollections, eq(wardrobeItems.collectionId, designerCollections.id))
        .leftJoin(designerProfiles, eq(designerCollections.designerProfileId, designerProfiles.id))
        .where(eq(designerProfiles.brandName, "Lamalo Fashion"))
        .limit(24);

      // Filter to starter picks + sort by them
      const picks = items.filter(i => STARTER_PICKS.includes(i.name));
      const rest  = items.filter(i => !STARTER_PICKS.includes(i.name));
      return [...picks, ...rest].slice(0, 8);
    }),

    /** Claim 2 free welcome outfits. Regular studio users only. */
    claimGift: protectedProcedure
      .input(z.object({
        itemId1: z.number().int(),
        itemId2: z.number().int(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = (await getDb())!;

        // Block designers
        const designer = await db.select({ id: designerProfiles.id })
          .from(designerProfiles).where(eq(designerProfiles.userId, ctx.user.id)).limit(1);
        if (designer.length > 0) throw new TRPCError({ code: "FORBIDDEN", message: "Designer accounts are not eligible." });

        // Get Lamalo Fashion designer profile
        const lamalo = await db.select({ id: designerProfiles.id })
          .from(designerProfiles).where(eq(designerProfiles.brandName, "Lamalo Fashion")).limit(1);
        if (!lamalo.length) throw new TRPCError({ code: "NOT_FOUND", message: "Lamalo Fashion not found." });
        const lamaloId = lamalo[0].id;

        // Block double-claims
        const existing = await db.select({ id: wardrobeLeases.id })
          .from(wardrobeLeases)
          .where(and(eq(wardrobeLeases.userId, ctx.user.id), eq(wardrobeLeases.designerProfileId, lamaloId), eq(wardrobeLeases.amountPaidAud, 0)));
        if (existing.length >= 2) throw new TRPCError({ code: "CONFLICT", message: "Welcome gift already claimed." });

        // Verify both items belong to Lamalo Fashion
        const items = await db.select({ id: wardrobeItems.id })
          .from(wardrobeItems)
          .leftJoin(designerCollections, eq(wardrobeItems.collectionId, designerCollections.id))
          .where(and(
            inArray(wardrobeItems.id, [input.itemId1, input.itemId2]),
            eq(designerCollections.designerProfileId, lamaloId),
          ));
        if (items.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid items selected." });

        // Grant 2 permanent free leases
        const expiresAt = new Date(Date.UTC(2099, 11, 31));
        await db.insert(wardrobeLeases).values([
          { userId: ctx.user.id, designerProfileId: lamaloId, wardrobeItemId: input.itemId1, amountPaidAud: 0, status: "active", leasedAt: new Date(), expiresAt },
          { userId: ctx.user.id, designerProfileId: lamaloId, wardrobeItemId: input.itemId2, amountPaidAud: 0, status: "active", leasedAt: new Date(), expiresAt },
        ]);

        return { success: true, message: "Welcome outfits unlocked! They are available in your wardrobe inventory." };
      }),
  });
  