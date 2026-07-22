import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { z } from "zod";
import * as db from "./db";
import { findAuthUserByEmail, markAuthLoginSuccessful } from "./_core/authDb";
import { createSessionToken } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { logger } from "./_core/logger";
import { ensurePortalCommerceSchema, getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";
import { checkRegistrationFraud, logAuditEvent } from "./_core/securityEngine";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { storagePut } from "./storage";

const designerRegistrationSchema = z.object({
  email: z.string().email().max(320).trim(),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(255),
  phone: z.string().trim().max(64).optional(),
  brandName: z.string().trim().min(2).max(255),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
  abn: z.string().trim().transform((value) => value.replace(/\s+/g, "")).pipe(z.string().regex(/^\d{11}$/)),
  contactEmail: z.string().email().max(320).trim(),
  profileType: z.string().trim().max(64).default("designer"),
  bio: z.string().trim().max(2000).optional(),
  website: z.string().url().max(512).optional().or(z.literal("")),
  instagram: z.string().trim().max(255).optional(),
  logoDataUrl: z.string().min(1).max(12 * 1024 * 1024),
  businessAddressLine1: z.string().trim().min(3).max(255),
  businessAddressLine2: z.string().trim().max(255).optional(),
  businessCity: z.string().trim().min(2).max(128),
  businessStateRegion: z.string().trim().min(2).max(128),
  businessPostalCode: z.string().trim().min(2).max(32),
  businessCountry: z.string().trim().min(2).max(128),
  marketingOptIn: z.boolean().optional(),
});

async function storeLogo(userId: number, raw: string): Promise<string> {
  if (/^https:\/\//i.test(raw)) return raw;
  const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Brand logo must be PNG, JPEG or WebP." });
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Brand logo must be smaller than 8 MB." });
  }
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  try {
    return (await storagePut(`designer-commerce/user-${userId}/logo-${Date.now()}.${extension}`, buffer, match[1])).url;
  } catch {
    return raw;
  }
}

export const designerAuthRouter = router({
  register: publicProcedure
    .input(designerRegistrationSchema)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const clientIp = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()
        || ctx.req.socket.remoteAddress
        || "unknown";
      const fraud = checkRegistrationFraud(clientIp, email);
      if (!fraud.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: fraud.reason || "Registration blocked." });
      }

      await ensurePortalCommerceSchema();
      if (await db.getUserByEmail(email)) {
        throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
      }
      const dbConn = await getDb();
      if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
      const [usernameRows] = await dbConn.execute(sql`
        SELECT userId FROM designerProfiles WHERE username = ${input.username.toLowerCase()} LIMIT 1
      `) as any;
      if (Array.isArray(usernameRows) && usernameRows.length) {
        throw new TRPCError({ code: "CONFLICT", message: "That designer username is already in use." });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const user = await db.createEmailUser({
        email,
        name: input.fullName,
        passwordHash,
        phone: input.phone,
        companyName: input.brandName,
        jobTitle: "Designer",
        professionalRole: "designer",
        industryType: "fashion",
        experienceLevel: "professional",
        marketingOptIn: input.marketingOptIn,
      });
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create designer account." });

      const logoUrl = await storeLogo(user.id, input.logoDataUrl);
      await setUserPortal(user.id, "designer");
      await saveDeliveryAddress(user.id, {
        label: "Business address",
        recipientName: input.fullName,
        phone: input.phone || null,
        addressLine1: input.businessAddressLine1,
        addressLine2: input.businessAddressLine2 || null,
        city: input.businessCity,
        stateRegion: input.businessStateRegion,
        postalCode: input.businessPostalCode,
        country: input.businessCountry,
        isDefault: true,
      });
      await dbConn.execute(sql`
        INSERT INTO designerProfiles
          (userId, brandName, displayName, username, abn, profileType, bio, website, instagram, contactEmail, logoUrl,
           businessAddressLine1, businessAddressLine2, businessCity, businessStateRegion, businessPostalCode, businessCountry,
           registrationCompleted, verified, visibility, membershipStatus, stripeAccountStatus)
        VALUES
          (${user.id}, ${input.brandName}, ${input.username}, ${input.username.toLowerCase()}, ${input.abn}, ${input.profileType},
           ${input.bio || null}, ${input.website || null}, ${input.instagram || null}, ${input.contactEmail.toLowerCase()}, ${logoUrl},
           ${input.businessAddressLine1}, ${input.businessAddressLine2 || null}, ${input.businessCity}, ${input.businessStateRegion},
           ${input.businessPostalCode}, ${input.businessCountry}, 1, 0, 'public', 'none', 'none')
      `);

      const token = await createSessionToken(user.id, user.name ?? "");
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      logAuditEvent(user.id, "designer_register_success", clientIp, true, {
        email,
        brandName: input.brandName,
        username: input.username,
      });

      try {
        await db.createNotification({
          userId: user.id,
          type: "welcome",
          title: "Designer portal ready",
          message: "Complete membership and Stripe payout onboarding, then publish your first collection.",
          link: "/designer-register",
        });
      } catch {
        // Non-critical.
      }

      return {
        success: true,
        user: { id: user.id, email, name: user.name },
        redirect: "/designer-register?account=created",
      };
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email().max(320).trim(),
      password: z.string().min(1).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      try {
        const user = await findAuthUserByEmail(email);
        if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid designer email or password." });
        }
        const portal = await getUserPortal(Number(user.id), user.role);
        if (portal !== "designer" && portal !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This is a Virelle production account. Use the standard sign-in page.",
          });
        }
        const token = await createSessionToken(Number(user.id), user.name || "");
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        await markAuthLoginSuccessful(Number(user.id)).catch(() => undefined);
        return {
          success: true,
          portal: portal === "admin" ? "admin" : "designer",
          redirect: "/designer/studio",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.errorWithStack("[DesignerAuth] Login failed", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Designer sign-in is temporarily unavailable." });
      }
    }),
});
