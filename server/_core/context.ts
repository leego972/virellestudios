import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { registerAdminForRateLimit } from "./rateLimit";

import { ENV } from "./env";

let JWT_SECRET_KEY = ENV.cookieSecret;

if (!JWT_SECRET_KEY) {
  if (process.env.NODE_ENV === "production") {
    // Hard fail — the fallback key is visible in the public source repo,
    // so any attacker could forge valid JWT tokens for any user.
    throw new Error(
      "[virelle] FATAL: JWT_SECRET env var is not set. " +
      "Add JWT_SECRET to Railway environment variables and redeploy."
    );
  }
  // Development only: ephemeral key so the server starts without full config.
  JWT_SECRET_KEY = "dev-secret-change-me-set-JWT_SECRET-in-railway";
  console.warn(
    "[virelle] WARNING: JWT_SECRET is not set. Using insecure dev fallback. " +
    "Sessions will be invalidated on restart."
  );
}

const secretKey = new TextEncoder().encode(JWT_SECRET_KEY);
const JWT_ISSUER = "virelle-studios";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** True when the user is a tester whose 48-hour window has expired.
   *  They can still read projects and download content, but all
   *  creation / generation / payment mutations are blocked. */
  isExpiredTester: boolean;
};

// Try Manus SDK auth first (for dev environment), then fall back to standalone JWT
async function authenticateFromCookie(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  // Parse cookies manually
  const cookies = new Map<string, string>();
  cookieHeader.split(";").forEach(pair => {
    const [key, ...vals] = pair.trim().split("=");
    if (key) cookies.set(key, vals.join("="));
  });

  const sessionCookie = cookies.get(COOKIE_NAME);
  if (!sessionCookie) return null;

  // Try standalone JWT verification
  try {
    const { payload } = await jwtVerify(sessionCookie, secretKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
    });
    const userId = payload.userId as number;
    if (userId) {
      const user = await db.getUserById(userId);
      return user ?? null;
    }
    // Fallback: check if it's a Manus-style JWT with openId
    const openId = payload.openId as string;
    if (openId) {
      const user = await db.getUserByOpenId(openId);
      return user ?? null;
    }
  } catch {
    // New JWT format failed — try legacy tokens without issuer check
    try {
      const { payload } = await jwtVerify(sessionCookie, secretKey, {
        algorithms: ["HS256"],
      });
      const userId = payload.userId as number;
      if (userId) {
        const user = await db.getUserById(userId);
        return user ?? null;
      }
    } catch {
      // JWT verification failed entirely
    }
  }

  // Try Manus SDK as fallback (for dev environment)
  try {
    const { sdk } = await import("./sdk");
    const user = await sdk.authenticateRequest(req);
    return user;
  } catch {
    // Manus SDK not available or auth failed
  }

  return null;
}

// Create a standalone JWT session token
export async function createSessionToken(userId: number, name: string): Promise<string> {
  const token = await new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
  return token;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateFromCookie(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Enforce temporary account expiry (e.g. tester accounts)
  // Expired testers keep their user object so they can read/download,
  // but isExpiredTester=true lets individual procedures block creation.
  let isExpiredTester = false;
  if (user && (user as any).accountExpiresAt) {
    const expiry = new Date((user as any).accountExpiresAt);
    if (expiry < new Date()) {
      console.log(`[Auth] Tester account ${user.email} has expired — entering read-only grace mode.`);
      isExpiredTester = true;
    }
  }

  // Register admin users for rate limit bypass
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
 *
 * Mounted in front of any `/api/admin/*` handler in `index.ts` so that
 * unauthenticated callers — and authenticated non-admin users — are
 * rejected with HTTP 403 *before* the handler runs. This is the
 * non-tRPC counterpart to the `adminProcedure` guard used inside the
 * tRPC routers.
 *
 * Behaviour:
 *   - Builds a regular request context via `createContext` (cookie →
 *     JWT → user lookup), so it shares the exact same auth path as
 *     every other route in the app.
 *   - 403 if there is no user, or `user.role !== "admin"`. Logs a
 *     warning with the request path + IP for audit visibility.
 *   - 500 if the auth path itself throws (e.g. database outage).
 *   - On success, attaches the resolved user to `req.user` so the
 *     downstream handler can read it without re-running auth.
 */
export const requireAdminExpress = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const ctx = await createContext({ req, res } as any);
    if (!ctx.user || ctx.user.role !== "admin") {
      console.warn(
        `[Admin] Unauthorized access attempt to ${req.path} from ${req.ip}`,
      );
      res.status(403).json({ error: "Forbidden: Admin access required" });
      return;
    }
    (req as any).user = ctx.user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error during admin check" });
  }
};
