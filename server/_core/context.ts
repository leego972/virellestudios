import { logger } from "./logger";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import * as db from "../db";
import { registerAdminForRateLimit } from "./rateLimit";

import { ENV } from "./env";

let JWT_SECRET_KEY = ENV.cookieSecret;

if (!JWT_SECRET_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[virelle] FATAL: JWT_SECRET env var is not set. " +
      "Add JWT_SECRET to Railway environment variables and redeploy."
    );
  }
  JWT_SECRET_KEY = "dev-secret-change-me-set-JWT_SECRET-in-railway";
  logger.warn("[virelle] JWT_SECRET not set — using insecure dev fallback. Sessions will be invalidated on restart.");
}

const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
const JWT_ISSUER = "virelle-studios";
const SWAPPYS_MOBILE_AUDIENCE = "swappys-mobile";
const SWAPPYS_MOBILE_SCOPE = "swappys:generate";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** True when the user is a tester whose 48-hour window has expired.
   *  They can still read projects and download content, but all
   *  creation / generation / payment mutations are blocked. */
  isExpiredTester: boolean;
};

function sessionInvalidatedByPasswordChange(user: User, payload: JWTPayload): boolean {
  if (!payload.iat || !(user as any).passwordChangedAt) return false;
  return payload.iat * 1000 < new Date((user as any).passwordChangedAt).getTime();
}

async function userFromVerifiedPayload(payload: JWTPayload): Promise<User | null> {
  const userId = Number(payload.userId || 0);
  if (userId) {
    const user = await db.getUserById(userId);
    if (!user || sessionInvalidatedByPasswordChange(user, payload)) return null;
    return user;
  }

  const openId = typeof payload.openId === "string" ? payload.openId : "";
  if (openId) return (await db.getUserByOpenId(openId)) ?? null;
  return null;
}

// Try Manus SDK auth first (for dev environment), then fall back to standalone JWT
async function authenticateFromCookie(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = new Map<string, string>();
  cookieHeader.split(";").forEach(pair => {
    const [key, ...vals] = pair.trim().split("=");
    if (key) cookies.set(key, vals.join("="));
  });

  const sessionCookie = cookies.get(COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, secretKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
    });
    const user = await userFromVerifiedPayload(payload);
    if (user) return user;
  } catch {
    try {
      const { payload } = await jwtVerify(sessionCookie, secretKey, {
        algorithms: ["HS256"],
      });
      const user = await userFromVerifiedPayload(payload);
      if (user) return user;
    } catch {
      // JWT verification failed entirely.
    }
  }

  try {
    const { sdk } = await import("./sdk");
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

// Create a standalone JWT session token
export async function createSessionToken(userId: number, name: string): Promise<string> {
  return new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

/**
 * Creates a narrowly scoped token for the Swappys daughter app. This token is
 * deliberately not accepted by the global tRPC context, so it cannot be used
 * to call unrelated Virelle procedures.
 */
export async function createSwappysMobileToken(userId: number, name: string): Promise<string> {
  return new SignJWT({ userId, name, scope: SWAPPYS_MOBILE_SCOPE })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(SWAPPYS_MOBILE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Resolves only a valid Swappys-scoped bearer token. Other tRPC procedures do
 * not call this function and therefore cannot be accessed with the mobile token.
 */
export async function authenticateSwappysMobileRequest(req: Request): Promise<User | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: SWAPPYS_MOBILE_AUDIENCE,
    });
    if (payload.scope !== SWAPPYS_MOBILE_SCOPE) return null;
    return userFromVerifiedPayload(payload);
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateFromCookie(opts.req);
  } catch {
    user = null;
  }

  let isExpiredTester = false;
  if (user && (user as any).accountExpiresAt) {
    const expiry = new Date((user as any).accountExpiresAt);
    if (expiry < new Date()) {
      logger.info("[Auth] Tester account expired — read-only grace mode", { email: user.email });
      isExpiredTester = true;
    }
  }

  if (user && user.role === "admin") {
    registerAdminForRateLimit(user.id);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    isExpiredTester,
  };
}

/**
 * Express middleware that gates direct (non-tRPC) admin routes.
 */
export const requireAdminExpress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ctx = await createContext({ req, res } as any);
    if (!ctx.user || ctx.user.role !== "admin") {
      logger.warn(`[Admin] Unauthorized access attempt to ${req.path}`, { ip: req.ip });
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    (req as any).user = ctx.user;
    next();
  } catch {
    res.status(500).json({ error: "Internal server error during admin check" });
  }
};
