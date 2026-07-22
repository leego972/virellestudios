import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import express, { type Express, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import * as db from "./db";
import { createSessionToken } from "./_core/context";
import { getSessionCookieOptions } from "./_core/cookies";
import { findAuthUserByEmail, markAuthLoginSuccessful } from "./_core/authDb";
import { logger } from "./_core/logger";
import { rateLimitPublicByIP } from "./_core/rateLimit";
import { checkRegistrationFraud, logAuditEvent } from "./_core/securityEngine";
import { ensurePortalCommerceSchema, getUserPortal, saveDeliveryAddress, setUserPortal } from "./_core/portalAccess";
import { getDb } from "./db";
import { storagePut } from "./storage";

function requestIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function allowRequest(req: Request, res: Response, action: string, maxRequests: number): Promise<boolean> {
  try {
    await rateLimitPublicByIP(requestIp(req), action, maxRequests, 15 * 60_000);
    return true;
  } catch {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return false;
  }
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value) && value.length <= 320;
}

async function storeLogo(userId: number, raw: string): Promise<string | null> {
  if (!raw) return null;
  if (/^https:\/\//i.test(raw)) return raw.slice(0, 2048);
  const match = raw.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Brand logo must be a PNG, JPEG or WebP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) throw new Error("Brand logo must be smaller than 8 MB.");
  const extension = match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1];
  try {
    return (await storagePut(`designer-commerce/user-${userId}/logo-${Date.now()}.${extension}`, buffer, match[1])).url;
  } catch {
    return raw;
  }
}

export function registerDesignerAuthRoutes(app: Express): void {
  app.post(
    "/api/designer/auth/register",
    express.json({ limit: "12mb" }),
    async (req: Request, res: Response) => {
      if (!(await allowRequest(req, res, "designer-register", 10))) return;

      const email = text(req.body?.email, 320).toLowerCase();
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const fullName = text(req.body?.fullName, 255);
      const brandName = text(req.body?.brandName, 255);
      const username = text(req.body?.username, 80).toLowerCase();
      const abn = text(req.body?.abn, 32).replace(/\s+/g, "");
      const contactEmail = text(req.body?.contactEmail || email, 320).toLowerCase();
      const profileType = text(req.body?.profileType || "designer", 64);
      const bio = text(req.body?.bio, 2000);
      const website = text(req.body?.website, 512);
      const instagram = text(req.body?.instagram, 255);
      const phone = text(req.body?.phone, 64);
      const addressLine1 = text(req.body?.businessAddressLine1, 255);
      const addressLine2 = text(req.body?.businessAddressLine2, 255);
      const city = text(req.body?.businessCity, 128);
      const stateRegion = text(req.body?.businessStateRegion, 128);
      const postalCode = text(req.body?.businessPostalCode, 32);
      const country = text(req.body?.businessCountry, 128);
      const logoInput = typeof req.body?.logoDataUrl === "string" ? req.body.logoDataUrl : "";

      if (!validEmail(email) || !validEmail(contactEmail) || password.length < 8 || password.length > 128) {
        res.status(400).json({ error: "Enter a valid email and a password of at least 8 characters." });
        return;
      }
      if (!fullName || !brandName || !/^[a-z0-9._-]{3,80}$/i.test(username) || !/^\d{11}$/.test(abn)) {
        res.status(400).json({ error: "Full name, brand name, a valid username and an 11-digit ABN are required." });
        return;
      }
      if (!addressLine1 || !city || !stateRegion || !postalCode || !country || !logoInput) {
        res.status(400).json({ error: "Business address and brand logo are required." });
        return;
      }

      const clientIP = requestIp(req);
      const fraudCheck = checkRegistrationFraud(clientIP, email);
      if (!fraudCheck.allowed) {
        res.status(429).json({ error: fraudCheck.reason || "Registration blocked." });
        return;
      }

      try {
        await ensurePortalCommerceSchema();
        if (await db.getUserByEmail(email)) {
          res.status(409).json({ error: "An account with this email already exists." });
          return;
        }
        const dbConn = await getDb();
        if (!dbConn) throw new Error("Database is unavailable.");
        const [usernameRows] = await dbConn.execute(sql`SELECT userId FROM designerProfiles WHERE username = ${username} LIMIT 1`) as any;
        if (Array.isArray(usernameRows) && usernameRows.length) {
          res.status(409).json({ error: "That designer username is already in use." });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await db.createEmailUser({
          email,
          name: fullName,
          passwordHash,
          phone: phone || undefined,
          companyName: brandName,
          jobTitle: "Designer",
          professionalRole: "designer",
          industryType: "fashion",
          experienceLevel: "professional",
          marketingOptIn: Boolean(req.body?.marketingOptIn),
        });
        if (!user) throw new Error("Failed to create designer account.");

        const logoUrl = await storeLogo(user.id, logoInput);
        await setUserPortal(user.id, "designer");
        await saveDeliveryAddress(user.id, {
          label: "Business address", recipientName: fullName, phone: phone || null,
          addressLine1, addressLine2: addressLine2 || null, city, stateRegion,
          postalCode, country, isDefault: true,
        });
        await saveDeliveryAddress(user.id, {
          label: "Business address",
          recipientName: fullName,
          phone: phone || null,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          stateRegion,
          postalCode,
          country,
          isDefault: true,
        });
        await dbConn.execute(sql`
          INSERT INTO designerProfiles
            (userId, brandName, displayName, username, abn, profileType, bio, website, instagram, contactEmail, logoUrl,
             businessAddressLine1, businessAddressLine2, businessCity, businessStateRegion, businessPostalCode, businessCountry,
             registrationCompleted, verified, visibility, membershipStatus, stripeAccountStatus)
          VALUES
            (${user.id}, ${brandName}, ${username}, ${username}, ${abn}, ${profileType || "designer"}, ${bio || null},
             ${website || null}, ${instagram || null}, ${contactEmail}, ${logoUrl}, ${addressLine1}, ${addressLine2 || null},
             ${city}, ${stateRegion}, ${postalCode}, ${country}, 1, 0, 'public', 'none', 'none')
        `);

        const token = await createSessionToken(user.id, user.name ?? "");
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
        logAuditEvent(user.id, "designer_register_success", clientIP, true, { email, brandName, username });

        try {
          await db.createNotification({
            userId: user.id,
            type: "welcome",
            title: "Designer portal ready",
            message: "Complete membership and Stripe payout onboarding, then publish your first collection.",
            link: "/designer-register",
          });
        } catch {
          // Notification is non-critical.
        }

        res.status(201).json({ success: true, user: { id: user.id, email, name: user.name }, redirect: "/designer-register?account=created" });
      } catch (error) {
        logger.errorWithStack("[DesignerAuth] Registration failed", error);
        res.status(503).json({ error: error instanceof Error ? error.message : "Designer registration is temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/designer/auth/password",
    express.json({ limit: "16kb" }),
    async (req: Request, res: Response) => {
      const email = text(req.body?.email, 320).toLowerCase();
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!validEmail(email) || !password || password.length > 128) {
        res.status(400).json({ error: "Enter a valid designer email and password." });
        return;
      }
      if (!(await allowRequest(req, res, `designer-login:${crypto.createHash("sha256").update(email).digest("hex").slice(0, 20)}`, 12))) return;

      try {
        const user = await findAuthUserByEmail(email);
        if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          res.status(401).json({ error: "Invalid designer email or password." });
          return;
        }
        const portal = await getUserPortal(Number(user.id), user.role);
        if (portal !== "designer" && portal !== "admin") {
          res.status(403).json({ error: "This account is a Virelle production account. Use the standard sign-in page." });
          return;
        }

        const token = await createSessionToken(Number(user.id), user.name || "");
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
        await markAuthLoginSuccessful(Number(user.id)).catch(() => undefined);
        res.status(200).json({ success: true, portal: portal === "admin" ? "admin" : "designer", redirect: "/designer/studio" });
      } catch (error) {
        logger.errorWithStack("[DesignerAuth] Login failed", error);
        res.status(503).json({ error: "Designer sign-in is temporarily unavailable." });
      }
    },
  );
}
