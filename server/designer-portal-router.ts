import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  designerCollections,
  designerProfiles,
  wardrobeItems,
} from "../drizzle/schema";
import { getDb, getDesignerProfileByUserId } from "./db";
import { rateLimitUpload } from "./_core/rateLimit";
import {
  designerProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { storagePut } from "./storage";

const INTENDED_USE_VALUES = new Set([
  "film",
  "television",
  "live_broadcast",
  "commercials",
  "advertising",
  "theatre",
  "music_video",
  "editorial",
  "social_media",
  "corporate",
  "other",
]);

const intendedUseSchema: z.ZodType<string> = z
  .string()
  .max(64)
  .refine(
    value => INTENDED_USE_VALUES.has(value),
    "Invalid intended use",
  );

const accessModeSchema = z.enum(["designer_only", "hybrid"]);

const profileInputSchema = z.object({
  legalName: z.string().trim().min(2).max(255),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  companyName: z.string().trim().min(1).max(255),
  companyAddress: z.string().trim().min(5).max(1000),
  brandName: z.string().trim().min(1).max(255),
  displayName: z.string().trim().max(255).optional().nullable(),
  profileType: z.string().trim().min(1).max(64).default("designer"),
  intendedUses: z.array(intendedUseSchema).min(1).max(12),
  accessMode: accessModeSchema.default("designer_only"),
  bio: z.string().trim().max(3000).optional().nullable(),
  website: z.string().trim().url().max(512).optional().nullable().or(z.literal("")),
  instagram: z.string().trim().max(255).optional().nullable(),
  contactEmail: z.string().trim().email().max(320).optional().nullable().or(z.literal("")),
  logoUrl: z.string().trim().url().max(2048).optional().nullable().or(z.literal("")),
});

const listingBaseSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: z.string().trim().min(5).max(4000),
  category: z.string().trim().min(1).max(64),
  subcategory: z.string().trim().max(128).optional().nullable(),
  wardrobeType: z.string().trim().min(1).max(64).default("fashion"),
  genderFit: z.string().trim().max(64).optional().nullable(),
  sizeRange: z.string().trim().max(128).optional().nullable(),
  era: z.string().trim().max(128).optional().nullable(),
  colors: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  materials: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  styleTags: z.array(z.string().trim().min(1).max(64)).max(30).default([]),
  primaryImageUrl: z.string().url().max(4096),
  imageUrls: z.array(z.string().url().max(4096)).min(1).max(12),
  retailPriceCents: z.number().int().min(100).max(100_000_000),
  leasePriceCents: z.number().int().min(50).max(100_000_000),
  collectionId: z.number().int().positive().optional().nullable(),
  publish: z.boolean().default(true),
  commercialUseAllowed: z.boolean().default(true),
  brandPlacementAllowed: z.boolean().default(true),
  shopfrontPlacementAllowed: z.boolean().default(true),
  characterWardrobeAllowed: z.boolean().default(true),
  costumeUseAllowed: z.boolean().default(true),
  licenseType: z.string().trim().min(1).max(64).default("full_license"),
  licenseNotes: z.string().trim().max(2000).optional().nullable(),
});

type ProfileDetails = {
  legalName?: string;
  dateOfBirth?: string;
  companyName?: string;
  companyAddress?: string;
  intendedUses?: string[];
  accessMode?: "designer_only" | "hybrid";
  profileCompleted?: boolean;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getProfileDetails(profile: any): ProfileDetails {
  const branding = objectValue(profile?.brandingImages);
  return objectValue(branding.profileDetails) as ProfileDetails;
}

function mergeProfileDetails(profile: any, details: ProfileDetails) {
  const branding = objectValue(profile?.brandingImages);
  const previous = objectValue(branding.profileDetails);
  return {
    ...branding,
    profileDetails: {
      ...previous,
      ...details,
    },
  };
}

function isAdultDate(dateOfBirth: string): boolean {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - dob.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < dob.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 18 && age <= 120;
}

function hasFilmmakerPlan(user: any): boolean {
  const tier = String(user?.subscriptionTier || "free");
  const status = String(user?.subscriptionStatus || "none");
  return (
    ["active", "trialing"].includes(status) &&
    !["free", "beta"].includes(tier)
  );
}

function calculateAccess(profile: any, user: any) {
  const details = getProfileDetails(profile);
  const active = profile?.membershipStatus === "active";
  const savedMode = details.accessMode;
  const accessMode =
    savedMode === "designer_only" || savedMode === "hybrid"
      ? savedMode
      : hasFilmmakerPlan(user)
        ? "hybrid"
        : "designer_only";
  const profileCompleted = Boolean(
    details.legalName &&
      details.dateOfBirth &&
      details.companyName &&
      details.companyAddress &&
      Array.isArray(details.intendedUses) &&
      details.intendedUses.length > 0 &&
      profile?.brandName,
  );
  return {
    active,
    accessMode,
    designerOnly:
      active && accessMode === "designer_only" && user?.role !== "admin",
    profileCompleted,
    details,
  };
}

async function requireActiveProfile(userId: number) {
  const profile = await getDesignerProfileByUserId(userId);
  if (!profile || profile.membershipStatus !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "An active Designer membership is required.",
    });
  }
  return profile;
}

async function requireCompleteProfile(userId: number, user: any) {
  const profile = await requireActiveProfile(userId);
  const access = calculateAccess(profile, user);
  if (!access.profileCompleted) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Complete your Designer profile before publishing listings.",
    });
  }
  return { profile, access };
}

async function assertOwnedCollection(
  collectionId: number | null | undefined,
  userId: number,
) {
  if (!collectionId) return;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [collection] = await db
    .select({ id: designerCollections.id })
    .from(designerCollections)
    .where(
      and(
        eq(designerCollections.id, collectionId),
        eq(designerCollections.userId, userId),
      ),
    )
    .limit(1);
  if (!collection) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "That collection does not belong to this Designer account.",
    });
  }
}

function cleanNullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const designerPortalRouter = router({
  getAccessStatus: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getDesignerProfileByUserId(ctx.user.id);
    const access = calculateAccess(profile, ctx.user);
    return {
      ...access,
      profile: profile ?? null,
      membershipStatus: profile?.membershipStatus ?? "none",
      membershipExpiresAt: profile?.membershipCurrentPeriodEnd ?? null,
    };
  }),

  saveProfile: protectedProcedure
    .input(profileInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!isAdultDate(input.dateOfBirth)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Designer account holders must be at least 18 years old.",
        });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let profile = await getDesignerProfileByUserId(ctx.user.id);
      const details: ProfileDetails = {
        legalName: input.legalName,
        dateOfBirth: input.dateOfBirth,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
        intendedUses: input.intendedUses,
        accessMode: input.accessMode,
        profileCompleted: true,
      };

      if (!profile) {
        await db.insert(designerProfiles).values({
          userId: ctx.user.id,
          brandName: input.brandName,
          displayName: cleanNullable(input.displayName),
          profileType: input.profileType,
          bio: cleanNullable(input.bio),
          website: cleanNullable(input.website),
          instagram: cleanNullable(input.instagram),
          contactEmail:
            cleanNullable(input.contactEmail) || ctx.user.email || null,
          logoUrl: cleanNullable(input.logoUrl),
          visibility: "private",
          membershipStatus: "none",
          brandingImages: { profileDetails: details },
        });
        profile = await getDesignerProfileByUserId(ctx.user.id);
      } else {
        await db
          .update(designerProfiles)
          .set({
            brandName: input.brandName,
            displayName: cleanNullable(input.displayName),
            profileType: input.profileType,
            bio: cleanNullable(input.bio),
            website: cleanNullable(input.website),
            instagram: cleanNullable(input.instagram),
            contactEmail:
              cleanNullable(input.contactEmail) || ctx.user.email || null,
            logoUrl: cleanNullable(input.logoUrl),
            brandingImages: mergeProfileDetails(profile, details),
          })
          .where(
            and(
              eq(designerProfiles.id, profile.id),
              eq(designerProfiles.userId, ctx.user.id),
            ),
          );
        profile = await getDesignerProfileByUserId(ctx.user.id);
      }

      return {
        profile,
        ...calculateAccess(profile, ctx.user),
      };
    }),

  uploadListingImage: designerProcedure
    .input(
      z.object({
        dataUrl: z.string().min(1).max(12 * 1024 * 1024),
        fileName: z.string().trim().max(255).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await rateLimitUpload(ctx.user.id);
      await requireCompleteProfile(ctx.user.id, ctx.user);
      const match = input.dataUrl.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!match) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use a JPG, PNG or WebP image.",
        });
      }
      const [, contentType, encoded] = match;
      const buffer = Buffer.from(encoded, "base64");
      if (buffer.length === 0 || buffer.length > 8 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Each listing image must be under 8 MB.",
        });
      }
      const extension =
        contentType === "image/jpeg"
          ? "jpg"
          : contentType === "image/png"
            ? "png"
            : "webp";
      const key = `designer-listings/${ctx.user.id}/${Date.now()}-${nanoid(
        10,
      )}.${extension}`;
      try {
        const stored = await storagePut(key, buffer, contentType, {
          public: true,
        });
        return {
          url: stored.url,
          key: stored.key,
          fileName: input.fileName ?? null,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Listing storage is not configured or unavailable. The image was not saved.",
          cause: error,
        });
      }
    }),

  listMyListings: designerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(wardrobeItems)
      .where(eq(wardrobeItems.userId, ctx.user.id))
      .orderBy(desc(wardrobeItems.updatedAt));
  }),

  listMyCollections: designerProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(designerCollections)
      .where(eq(designerCollections.userId, ctx.user.id))
      .orderBy(desc(designerCollections.updatedAt));
  }),

  createListing: designerProcedure
    .input(listingBaseSchema)
    .mutation(async ({ ctx, input }) => {
      const { profile } = await requireCompleteProfile(
        ctx.user.id,
        ctx.user,
      );
      await assertOwnedCollection(input.collectionId, ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(wardrobeItems).values({
        userId: ctx.user.id,
        designerProfileId: profile.id,
        collectionId: input.collectionId ?? null,
        name: input.name,
        description: input.description,
        category: input.category,
        subcategory: cleanNullable(input.subcategory),
        wardrobeType: input.wardrobeType,
        genderFit: cleanNullable(input.genderFit),
        sizeRange: cleanNullable(input.sizeRange),
        era: cleanNullable(input.era),
        colors: input.colors,
        materials: input.materials,
        styleTags: input.styleTags,
        primaryImageUrl: input.primaryImageUrl,
        imageUrls: input.imageUrls,
        referencePrompt: input.description,
        retailPriceAud: input.retailPriceCents,
        leasePriceAud: input.leasePriceCents,
        commercialUseAllowed: input.commercialUseAllowed,
        brandPlacementAllowed: input.brandPlacementAllowed,
        shopfrontPlacementAllowed: input.shopfrontPlacementAllowed,
        characterWardrobeAllowed: input.characterWardrobeAllowed,
        costumeUseAllowed: input.costumeUseAllowed,
        licenseType: input.licenseType,
        licenseNotes: cleanNullable(input.licenseNotes),
        visibility: input.publish ? "public" : "private",
        status: input.publish ? "active" : "hidden",
      });
      const id = Number((result as any).insertId ?? 0);
      const [listing] = await db
        .select()
        .from(wardrobeItems)
        .where(
          and(
            eq(wardrobeItems.id, id),
            eq(wardrobeItems.userId, ctx.user.id),
          ),
        )
        .limit(1);
      return listing;
    }),

  updateListing: designerProcedure
    .input(
      listingBaseSchema.partial().extend({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireCompleteProfile(ctx.user.id, ctx.user);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db
        .select()
        .from(wardrobeItems)
        .where(
          and(
            eq(wardrobeItems.id, input.id),
            eq(wardrobeItems.userId, ctx.user.id),
          ),
        )
        .limit(1);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Designer listing not found.",
        });
      }
      await assertOwnedCollection(input.collectionId, ctx.user.id);
      const patch: Record<string, unknown> = {};
      const copyFields = [
        "name",
        "description",
        "category",
        "wardrobeType",
        "colors",
        "materials",
        "styleTags",
        "primaryImageUrl",
        "imageUrls",
        "commercialUseAllowed",
        "brandPlacementAllowed",
        "shopfrontPlacementAllowed",
        "characterWardrobeAllowed",
        "costumeUseAllowed",
        "licenseType",
      ] as const;
      for (const field of copyFields) {
        if (input[field] !== undefined) patch[field] = input[field];
      }
      const nullableFields = [
        "subcategory",
        "genderFit",
        "sizeRange",
        "era",
        "licenseNotes",
      ] as const;
      for (const field of nullableFields) {
        if (input[field] !== undefined) {
          patch[field] = cleanNullable(input[field]);
        }
      }
      if (input.collectionId !== undefined) {
        patch.collectionId = input.collectionId ?? null;
      }
      if (input.retailPriceCents !== undefined) {
        patch.retailPriceAud = input.retailPriceCents;
      }
      if (input.leasePriceCents !== undefined) {
        patch.leasePriceAud = input.leasePriceCents;
      }
      if (input.publish !== undefined) {
        patch.visibility = input.publish ? "public" : "private";
        patch.status = input.publish ? "active" : "hidden";
      }
      if (input.description !== undefined) {
        patch.referencePrompt = input.description;
      }
      if (Object.keys(patch).length > 0) {
        await db
          .update(wardrobeItems)
          .set(patch as any)
          .where(
            and(
              eq(wardrobeItems.id, input.id),
              eq(wardrobeItems.userId, ctx.user.id),
            ),
          );
      }
      const [listing] = await db
        .select()
        .from(wardrobeItems)
        .where(
          and(
            eq(wardrobeItems.id, input.id),
            eq(wardrobeItems.userId, ctx.user.id),
          ),
        )
        .limit(1);
      return listing;
    }),

  retireListing: designerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(wardrobeItems)
        .set({ status: "retired", visibility: "private" })
        .where(
          and(
            eq(wardrobeItems.id, input.id),
            eq(wardrobeItems.userId, ctx.user.id),
          ),
        );
      return { success: true } as const;
    }),
});
