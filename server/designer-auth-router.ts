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
import { stripe } from "./_core/subscription";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { storagePut } from "./storage";

const DESIGNER_YEARLY_CENTS = 29900;
const FOUNDING_DESIGNER_YEARLY_CENTS = 15000;
const FOUNDING_MEMBER_LIMIT = 50;

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
    return (await storagePut(`designer-commerce/user-${userId}/logo-${Date.now()}.${extension}`, buffer, match[1], { category: "asset" })).url;
  } catch {
    return raw;
  }
}

async function createRequiredDesignerCheckout(userId: number, email: string, dbConn: any) {
  if (!stripe) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Designer registration payment is temporarily unavailable. No account access has been activated.",
    });
  }

  const countResult: any = await dbConn.execute(sql`
    SELECT COUNT(*) AS payingCount
    FROM designerProfiles
    WHERE membershipStatus = 'active' AND membershipSubscriptionId IS NOT NULL
  `);
  const rows = Array.isArray(countResult?.[0]) ? countResult[0] : countResult;
  const payingCount = Number(rows?.[0]?.payingCount ?? 0);
  const isFounding = payingCount < FOUNDING_MEMBER_LIMIT;
  const unitAmount = isFounding ? FOUNDING_DESIGNER_YEARLY_CENTS : DESIGNER_YEARLY_CENTS;
  const publicUrl = (process.env.PUBLIC_APP_URL || "https://virelle.life").replace(/\/$/, "");

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{
      price_data: {
        currency: "aud",
        unit_amount: unitAmount,
        recurring: { interval: "year" },
        product_data: {
          name: isFounding
            ? "Virelle Studios — Founding Designer Partner Membership"
            : "Virelle Studios — Designer Marketplace Membership",
          description: isFounding
            ? `Founding Designer Partner membership, position ${payingCount + 1} of ${FOUNDING_MEMBER_LIMIT}.`
            : "Required annual Designer Marketplace membership.",
          metadata: { type: "designer_membership" },
        },
      },
      quantity: 1,
    }],
    success_url: `${publicUrl}/designer-register?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicUrl}/designer-register?checkout=cancelled`,
    metadata: {
      userId: String(userId),
      type: "designer_membership",
      registrationCheckout: "required",
    },
  });
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

      try {
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
             ${input.businessPostalCode}, ${input.businessCountry}, 1, 0, 'private', 'pending_payment', 'none')
        `);

        const checkout = await createRequiredDesignerCheckout(user.id, email, dbConn);
        if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");

        const token = await createSessionToken(user.id, user.name ?? "");
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        logAuditEvent(user.id, "designer_register_payment_required", clientIp, true, {
          email,
          brandName: input.brandName,
          username: input.username,
          checkoutSessionId: checkout.id,
        });

        return {
          success: true,
          paymentRequired: true,
          user: { id: user.id, email, name: user.name },
          redirect: checkout.url,
          checkoutUrl: checkout.url,
        };
      } catch (error) {
        logger.errorWithStack("[DesignerAuth] Registration checkout failed", error);
        await dbConn.execute(sql`DELETE FROM designerProfiles WHERE userId = ${user.id}`).catch(() => undefined);
        await dbConn.execute(sql`DELETE FROM savedDeliveryAddresses WHERE userId = ${user.id}`).catch(() => undefined);
        await dbConn.execute(sql`DELETE FROM userPortalAccounts WHERE userId = ${user.id}`).catch(() => undefined);
        await dbConn.execute(sql`DELETE FROM users WHERE id = ${user.id}`).catch(() => undefined);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Designer registration could not start the required payment. No account was created.",
        });
      }
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
        if (portal === "designer") {
          const dbConn = await getDb();
          if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable." });
          const result: any = await dbConn.execute(sql`
            SELECT membershipStatus, membershipCurrentPeriodEnd
            FROM designerProfiles WHERE userId = ${Number(user.id)} LIMIT 1
          `);
          const rows = Array.isArray(result?.[0]) ? result[0] : result;
          const profile = rows?.[0];
          const expiresAt = profile?.membershipCurrentPeriodEnd ? new Date(profile.membershipCurrentPeriodEnd) : null;
          if (profile?.membershipStatus !== "active" || (expiresAt && expiresAt.getTime() <= Date.now())) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "An active paid Designer Marketplace membership is required. Complete payment from designer registration.",
            });
          }
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