import { logger } from "./logger";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { SignJWT, jwtVerify } from "jose";
import { registerAdminForRateLimit } from "./rateLimit";
import { findSessionUserById, findSessionUserByOpenId } from "./authDb";

import { ENV } from "./env";

let JWT_SECRET_KEY = ENV.cookieSecret;

if (!JWT_SECRET_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[virelle] FATAL: JWT_SECRET env var is not set. " +
      "Add JWT_SECRET to Render environment variables and redeploy."
    );
  }
  JWT_SECRET_KEY = "dev-secret-change-me-set-JWT_SECRET-in-render";
  logger.warn("[virelle] JWT_SECRET not set — using insecure dev fallback. Sessions will be invalidated on restart.");
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

function asUser(row: Awaited<ReturnType<typeof findSessionUserById>>): User | null {
  return row ? (row as unknown as User) : null;
}

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

  // Current standalone JWT format.
  try {
    const { payload } = await jwtVerify(sessionCookie, secretKey, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
    });

    const userId = Number(payload.userId);
    if (Number.isInteger(userId) && userId > 0) {
      const user = asUser(await findSessionUserById(userId));
      if (!user) return null;
      if (payload.iat && (user as any).passwordChangedAt) {
        if (payload.iat * 1000 < new Date((user as any).passwordChangedAt).getTime()) return null;
      }
      return user;
    }

    const openId = typeof payload.openId === "string" ? payload.openId : "";
    if (openId) {
      const user = await findSessionUserByOpenId(openId);
      return user ? (user as unknown as User) : null;
    }
  } catch {
    // Legacy locally-signed JWT without issuer.
    try {
      const { payload } = await jwtVerify(sessionCookie, secretKey, {
        algorithms: ["HS256"],
      });
      const userId = Number(payload.userId);
      if (Number.isInteger(userId) && userId > 0) {
        const user = asUser(await findSessionUserById(userId));
        if (!user) return null;
        if (payload.iat && (user as any).passwordChangedAt) {
          if (payload.iat * 1000 < new Date((user as any).passwordChangedAt).getTime()) return null;
        }
        return user;
      }
    } catch {
      // Continue to the historical Manus-token fallback below.
    }
  }

  try {
    const { sdk } = await import("./sdk");
    const user = await sdk.authenticateRequest(req);
    return user;
  } catch {
    return null;
  }
}

export async function createSessionToken(userId: number, name: string): Promise<string> {
  return new SignJWT({ userId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateFromCookie(opts.req);
  } catch (error) {
    logger.errorWithStack("[Auth] Session authentication failed", error);
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

/** Express middleware for direct non-tRPC admin routes. */
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
  } catch (err) {
    logger.errorWithStack("[Admin] Authentication check failed", err);
    res.status(500).json({ error: "Internal server error during admin check" });
  }
};
