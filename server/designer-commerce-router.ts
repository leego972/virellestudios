import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { storagePut } from "./storage";
import {
  deleteDeliveryAddress,
  ensurePortalCommerceSchema,
  getSavedAddressById,
  getUserPortal,
  isLamaloBrandName,
  listDeliveryAddresses,
  saveDeliveryAddress,
  setUserPortal,
} from "./_core/portalAccess";

const addressSchema = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  recipientName: z.string().trim().min(2).max(255),
  phone: z.string().trim().max(64).optional().nullable(),
  addressLine1: z.string().trim().min(3).max(255),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(2).max(128),
  stateRegion: z.string().trim().min(2).max(128),
  postalCode: z.string().trim().min(2).max(32),
  country: z.string().trim().min(2).max(128),
  isDefault: z.boolean().optional(),
});

const profileSchema = z.object({
  brandName: z.string().trim().min(2).max(255),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/, "Username may contain letters, numbers, dots, underscores and hyphens."),
  abn: z.string().trim().regex(/^\d{11}$/, "ABN must contain exactly 11 digits."),
  profileType: z.string().trim().max(64).default("designer"),
  bio: z.string().trim().max(2000).optional().nullable(),
  contactEmail: z.string().email().max(320),
  website: z.string().url().max(512).optional().nullable().or(z.literal("")),
  instagram: z.string().trim().max(255).optional().nullable(),
  logoUrl: z.string().max(10 * 1024 * 1024).optional().nullable(),
  businessAddressLine1: z.string().trim().min(3).max(255),
  businessAddressLine2: z.string().trim().max(255).optional().nullable(),
  businessCity: z.string().trim().min(2).max(128),
  businessStateRegion: z.string().trim().min(2).max(128),
  businessPostalCode: z.string().trim().min(2).max(32),
  businessCountry: z.string().trim().min(2).max(128),
});

const listingSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().min(10).max(4000),
  category: z.string().trim().max(64).default("other"),
  wardrobeType: z.string().trim().max(64).default("fashion"),
  subcategory: z.string().trim().max(128).optional().nullable(),
  primaryImageUrl: z.string().min(1).max(10 * 1024 * 1024),
  referencePrompt: z.string().trim().max(4000).optional().nullable(),
  retailPriceAudCents: z.number().int().min(1667, "Physical retail price must be at least A$16.67 so 3% is Stripe-chargeable.").max(100_000_000),
  virtualOnly: z.boolean().default(false),
  collectionId: z.number().int().positive().optional().nullable(),
  publish: z.boolean().default(true),
});

function rowsFrom(result: any): any[] {
  const rows = Array.isArray(result?.[0]) ? result[0] : result;
  return Array.isArray(rows) ? rows : [];
}

function firstRow(result: any): any | undefined {
  return rowsFrom(result)[0];
}

async function connection() {
  await ensurePortalCommerceSchema();
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
  return dbConn;
}

async function requireDesignerProfile(userId: number): Promise<any> {
  const dbConn = await connection();
  const result = await dbConn.execute(sql`SELECT * FROM designerProfiles WHERE userId = ${userId} LIMIT 1`);
  const profile = firstRow(result);
  if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Designer registration is required." });
  if (isLamaloBrandName(profile.brandName)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Lamalo catalogue pricing and listings are managed only by Virelle administration." });
  }
  return profile;
}

async function uploadImage(userId: number, purpose: "logo" | "item", imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    if (/^https:\/\//i.test(imageDataUrl)) return imageDataUrl;
    throw new TRPCError({ code: "BAD_REQUEST", message: "Upload a PNG, JPEG or WebP image." });
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be smaller than 8 MB." });
  }
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const key = `designer-commerce/user-${userId}/${purpose}-${Date.now()}.${extension}`;
  try {
    return (await storagePut(key, buffer, contentType)).url;
  } catch {
    // Backward-compatible fallback for environments where object storage has not
    // yet been configured. The normal Render production path stores in S3/R2.
    return imageDataUrl;
  }
}

async function ensureDesignerCollection(userId: number, profile: any, requestedId?: number | null): Promise<number> {
  const dbConn = await connection();
  if (requestedId) {
    const owned = firstRow(await dbConn.execute(sql`
      SELECT id FROM designerCollections WHERE id = ${requestedId} AND userId = ${userId} AND designerProfileId = ${profile.id} LIMIT 1
    `));
    if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "Collection does not belong to this designer." });
    return Number(owned.id);
  }

  const existing = firstRow(await dbConn.execute(sql`
    SELECT id FROM designerCollections
    WHERE userId = ${userId} AND designerProfileId = ${profile.id}
    ORDER BY published DESC, id ASC LIMIT 1
  `));
  if (existing) return Number(existing.id);

  const ready = profile.membershipStatus === "active" && profile.stripeAccountStatus === "active";
  const result = await dbConn.execute(sql`
    INSERT INTO designerCollections
      (designerProfileId, userId, name, description, collectionType, visibility, licenseType, collectionPriceAud, published, publishedAt)
    VALUES
      (${profile.id}, ${userId}, 'Designer Store', 'Current items available from this designer.', 'fashion_collection',
       ${ready ? "public" : "private"}, 'full_license', NULL, ${ready ? 1 : 0}, ${ready ? new Date() : null})
  `);
  const meta: any = Array.isArray(result) ? result[0] : result;
  return Number(meta.insertId);
}

export const designerCommerceRouter = router({
  portal: router({
    status: protectedProcedure.query(async ({ ctx }) => ({
      portal: await getUserPortal(ctx.user.id, ctx.user.role),
      isAdmin: ctx.user.role === "admin",
    })),
  }),

  addresses: router({
    list: protectedProcedure.query(({ ctx }) => listDeliveryAddresses(ctx.user.id)),
    get: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => getSavedAddressById(ctx.user.id, input.id)),
    create: protectedProcedure
      .input(addressSchema)
      .mutation(async ({ ctx, input }) => ({ id: await saveDeliveryAddress(ctx.user.id, input) })),
    update: protectedProcedure
      .input(addressSchema.extend({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...address } = input;
        return { id: await saveDeliveryAddress(ctx.user.id, address, id) };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDeliveryAddress(ctx.user.id, input.id);
        return { success: true };
      }),
  }),

  purchase: router({
    options: publicProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const dbConn = await connection();
        const item = firstRow(await dbConn.execute(sql`
          SELECT wi.id, wi.name, wi.retailPriceAud, wi.physicalRetailPriceAud, wi.isVirtualOnly,
                 wi.primaryImageUrl, dp.brandName, dp.id AS designerProfileId
          FROM wardrobeItems wi
          LEFT JOIN designerProfiles dp ON dp.id = wi.designerProfileId
          WHERE wi.id = ${input.itemId} AND wi.visibility = 'public' AND wi.status = 'active'
          LIMIT 1
        `));
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });
        return {
          ...item,
          isVirtualOnly: Boolean(item.isVirtualOnly),
          isLamalo: isLamaloBrandName(item.brandName),
          canBuyPhysical: !Boolean(item.isVirtualOnly) && Number(item.physicalRetailPriceAud ?? 0) > 0,
        };
      }),
  }),

  designer: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      await setUserPortal(ctx.user.id, "designer");
      const dbConn = await connection();
      return firstRow(await dbConn.execute(sql`SELECT * FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`)) ?? null;
    }),

    saveProfile: protectedProcedure
      .input(profileSchema)
      .mutation(async ({ ctx, input }) => {
        await setUserPortal(ctx.user.id, "designer");
        const dbConn = await connection();
        const logoUrl = input.logoUrl ? await uploadImage(ctx.user.id, "logo", input.logoUrl) : null;
        const existing = firstRow(await dbConn.execute(sql`SELECT id, brandName FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`));
        if (existing && isLamaloBrandName(existing.brandName)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Lamalo profile details are locked." });
        }
        const usernameOwner = firstRow(await dbConn.execute(sql`
          SELECT userId FROM designerProfiles WHERE username = ${input.username.toLowerCase()} LIMIT 1
        `));
        if (usernameOwner && Number(usernameOwner.userId) !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "That designer username is already in use." });
        }

        if (existing) {
          await dbConn.execute(sql`
            UPDATE designerProfiles SET
              brandName = ${input.brandName}, username = ${input.username.toLowerCase()}, abn = ${input.abn},
              profileType = ${input.profileType}, bio = ${input.bio || null}, contactEmail = ${input.contactEmail.toLowerCase()},
              website = ${input.website || null}, instagram = ${input.instagram || null},
              logoUrl = COALESCE(${logoUrl}, logoUrl),
              businessAddressLine1 = ${input.businessAddressLine1}, businessAddressLine2 = ${input.businessAddressLine2 || null},
              businessCity = ${input.businessCity}, businessStateRegion = ${input.businessStateRegion},
              businessPostalCode = ${input.businessPostalCode}, businessCountry = ${input.businessCountry},
              registrationCompleted = 1, visibility = 'public'
            WHERE id = ${existing.id} AND userId = ${ctx.user.id}
          `);
        } else {
          await dbConn.execute(sql`
            INSERT INTO designerProfiles
              (userId, brandName, displayName, username, abn, profileType, bio, website, instagram, contactEmail, logoUrl,
               businessAddressLine1, businessAddressLine2, businessCity, businessStateRegion, businessPostalCode, businessCountry,
               registrationCompleted, verified, visibility, membershipStatus, stripeAccountStatus)
            VALUES
              (${ctx.user.id}, ${input.brandName}, ${input.username}, ${input.username.toLowerCase()}, ${input.abn}, ${input.profileType},
               ${input.bio || null}, ${input.website || null}, ${input.instagram || null}, ${input.contactEmail.toLowerCase()}, ${logoUrl},
               ${input.businessAddressLine1}, ${input.businessAddressLine2 || null}, ${input.businessCity}, ${input.businessStateRegion},
               ${input.businessPostalCode}, ${input.businessCountry}, 1, 0, 'public', 'none', 'none')
          `);
        }
        return firstRow(await dbConn.execute(sql`SELECT * FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`));
      }),

    uploadLogo: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().min(1).max(12 * 1024 * 1024) }))
      .mutation(async ({ ctx, input }) => ({ url: await uploadImage(ctx.user.id, "logo", input.imageDataUrl) })),

    uploadItemImage: protectedProcedure
      .input(z.object({ imageDataUrl: z.string().min(1).max(12 * 1024 * 1024) }))
      .mutation(async ({ ctx, input }) => ({ url: await uploadImage(ctx.user.id, "item", input.imageDataUrl) })),

    listCollections: protectedProcedure.query(async ({ ctx }) => {
      const profile = await requireDesignerProfile(ctx.user.id);
      const dbConn = await connection();
      return rowsFrom(await dbConn.execute(sql`
        SELECT * FROM designerCollections WHERE userId = ${ctx.user.id} AND designerProfileId = ${profile.id}
        ORDER BY updatedAt DESC, id DESC
      `));
    }),

    listItems: protectedProcedure.query(async ({ ctx }) => {
      const profile = await requireDesignerProfile(ctx.user.id);
      const dbConn = await connection();
      return rowsFrom(await dbConn.execute(sql`
        SELECT wi.*, dc.name AS collectionName
        FROM wardrobeItems wi
        LEFT JOIN designerCollections dc ON dc.id = wi.collectionId
        WHERE wi.userId = ${ctx.user.id} AND wi.designerProfileId = ${profile.id}
        ORDER BY wi.updatedAt DESC, wi.id DESC
      `));
    }),

    createItem: protectedProcedure
      .input(listingSchema)
      .mutation(async ({ ctx, input }) => {
        const profile = await requireDesignerProfile(ctx.user.id);
        if (profile.membershipStatus !== "active") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Activate the designer membership before publishing items." });
        }
        if (input.publish && profile.stripeAccountStatus !== "active") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete Stripe payout onboarding before publishing purchasable items." });
        }
        const dbConn = await connection();
        const collectionId = await ensureDesignerCollection(ctx.user.id, profile, input.collectionId);
        const imageUrl = await uploadImage(ctx.user.id, "item", input.primaryImageUrl);
        const virtualPrice = Math.round(input.retailPriceAudCents * 0.03);
        const prompt = input.referencePrompt?.trim() || `${input.name}. ${input.description}`;
        const visibility = input.publish ? "public" : "private";
        const result = await dbConn.execute(sql`
          INSERT INTO wardrobeItems
            (collectionId, userId, designerProfileId, name, description, category, subcategory, wardrobeType,
             imageUrls, primaryImageUrl, referencePrompt, characterWardrobeAllowed, costumeUseAllowed,
             commercialUseAllowed, licenseType, visibility, status, retailPriceAud, physicalRetailPriceAud,
             isVirtualOnly, virtualPriceRule, virtualBadgeText)
          VALUES
            (${collectionId}, ${ctx.user.id}, ${profile.id}, ${input.name}, ${input.description}, ${input.category},
             ${input.subcategory || null}, ${input.wardrobeType}, CAST(${JSON.stringify([imageUrl])} AS JSON), ${imageUrl}, ${prompt},
             1, 1, 1, 'full_license', ${visibility}, 'active', ${virtualPrice}, ${input.retailPriceAudCents},
             ${input.virtualOnly ? 1 : 0}, 'retail_3_percent', 'Virtual item')
        `);
        const meta: any = Array.isArray(result) ? result[0] : result;
        if (input.publish) {
          await dbConn.execute(sql`
            UPDATE designerCollections SET published = 1, visibility = 'public', publishedAt = COALESCE(publishedAt, CURRENT_TIMESTAMP)
            WHERE id = ${collectionId} AND userId = ${ctx.user.id}
          `);
        }
        return { id: Number(meta.insertId), virtualPriceAudCents: virtualPrice, physicalRetailPriceAudCents: input.retailPriceAudCents };
      }),

    updateItem: protectedProcedure
      .input(listingSchema.extend({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const profile = await requireDesignerProfile(ctx.user.id);
        const dbConn = await connection();
        const existing = firstRow(await dbConn.execute(sql`
          SELECT id FROM wardrobeItems WHERE id = ${input.id} AND userId = ${ctx.user.id} AND designerProfileId = ${profile.id} LIMIT 1
        `));
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found." });
        if (input.publish && (profile.membershipStatus !== "active" || profile.stripeAccountStatus !== "active")) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Active membership and Stripe payouts are required to publish." });
        }
        const collectionId = await ensureDesignerCollection(ctx.user.id, profile, input.collectionId);
        const imageUrl = await uploadImage(ctx.user.id, "item", input.primaryImageUrl);
        const virtualPrice = Math.round(input.retailPriceAudCents * 0.03);
        const prompt = input.referencePrompt?.trim() || `${input.name}. ${input.description}`;
        await dbConn.execute(sql`
          UPDATE wardrobeItems SET
            collectionId = ${collectionId}, name = ${input.name}, description = ${input.description}, category = ${input.category},
            subcategory = ${input.subcategory || null}, wardrobeType = ${input.wardrobeType}, imageUrls = CAST(${JSON.stringify([imageUrl])} AS JSON),
            primaryImageUrl = ${imageUrl}, referencePrompt = ${prompt}, visibility = ${input.publish ? "public" : "private"},
            retailPriceAud = ${virtualPrice}, physicalRetailPriceAud = ${input.retailPriceAudCents},
            isVirtualOnly = ${input.virtualOnly ? 1 : 0}, virtualPriceRule = 'retail_3_percent', virtualBadgeText = 'Virtual item'
          WHERE id = ${input.id} AND userId = ${ctx.user.id} AND designerProfileId = ${profile.id}
        `);
        return { id: input.id, virtualPriceAudCents: virtualPrice, physicalRetailPriceAudCents: input.retailPriceAudCents };
      }),
  }),

  orders: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const profile = await requireDesignerProfile(ctx.user.id);
      const dbConn = await connection();
      return rowsFrom(await dbConn.execute(sql`
        SELECT po.*, wi.name AS itemName, wi.primaryImageUrl
        FROM physicalItemOrders po
        LEFT JOIN wardrobeItems wi ON wi.id = po.wardrobeItemId
        WHERE po.designerProfileId = ${profile.id}
        ORDER BY po.createdAt DESC, po.id DESC
      `));
    }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["paid", "processing", "shipped", "delivered", "cancelled"]),
        trackingNumber: z.string().trim().max(255).optional().nullable(),
        carrier: z.string().trim().max(128).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await requireDesignerProfile(ctx.user.id);
        const dbConn = await connection();
        const result = await dbConn.execute(sql`
          UPDATE physicalItemOrders SET
            status = ${input.status}, trackingNumber = ${input.trackingNumber || null}, carrier = ${input.carrier || null},
            shippedAt = CASE WHEN ${input.status} = 'shipped' AND shippedAt IS NULL THEN CURRENT_TIMESTAMP ELSE shippedAt END,
            deliveredAt = CASE WHEN ${input.status} = 'delivered' AND deliveredAt IS NULL THEN CURRENT_TIMESTAMP ELSE deliveredAt END
          WHERE id = ${input.id} AND designerProfileId = ${profile.id}
        `);
        const meta: any = Array.isArray(result) ? result[0] : result;
        if (!meta || Number(meta.affectedRows ?? 0) < 1) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
        return { success: true };
      }),
  }),
});
