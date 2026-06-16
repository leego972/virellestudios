import { logger } from "./logger";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import Redis from "ioredis";

/**
 * Production-safe rate limiting using Redis.
 * Falls back to in-memory Map if Redis is not available (e.g. in dev).
 */

let redis: Redis | null = null;

if (ENV.redisUrl) {
  try {
    redis = new Redis(ENV.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    redis.on("error", (err) => {
      logger.warn(`[RateLimit] Redis error: ${err.message}`);
    });
  } catch (err) {
    logger.errorWithStack("[RateLimit] Failed to initialize Redis — falling back to in-memory rate limiting. Check REDIS_URL.", err);
    redis = null;
  }
} else {
  if (process.env.NODE_ENV === "production") {
    // Warn loudly but do NOT crash — allows the server to start while Redis is
    // being provisioned. In-memory fallback is used until REDIS_URL is set.
    // ACTION REQUIRED: Add REDIS_URL to Railway environment variables.
    logger.error("[RateLimit] REDIS_URL not set in production — in-memory fallback active. NOT safe for multi-instance. Add REDIS_URL to Railway env.");
  } else {
    logger.warn("[RateLimit] REDIS_URL not set — falling back to in-memory storage (dev only).");
  }
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

// Admin user IDs cache — populated on first admin check
const adminUserIds = new Set<number>();

/**
 * Register a user ID as admin so rate limits are bypassed.
 */
export function registerAdminForRateLimit(userId: number): void {
  adminUserIds.add(userId);
}

// Clean up expired memory entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(memoryStore.entries())) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given user + action combination.
 * Admin users are exempt from all rate limits.
 */
export async function checkRateLimit(
  userId: number,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  // Admin users bypass all rate limits
  if (adminUserIds.has(userId)) return;

  const key = `rl:${userId}:${action}`;
  const now = Date.now();

  if (redis) {
    try {
      // Use a Lua script or simple multi for atomic increment + expire
      const results = await redis
        .multi()
        .incr(key)
        .pexpire(key, windowMs)
        .exec();

      if (results && results[0] && results[0][1]) {
        const count = results[0][1] as number;
        if (count > maxRequests) {
          const ttl = await redis.pttl(key);
          const retryAfterSec = Math.ceil(Math.max(ttl, 0) / 1000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
          });
        }
      }
      return;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      logger.errorWithStack("[RateLimit] Redis check failed", err);
      if (process.env.NODE_ENV === "production") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Rate limiting service unavailable.",
        });
      }
    }
  }

  // Fallback to in-memory store — used when Redis is not yet provisioned
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
    });
  }
}

// ─── Preset rate limit configs ───

/** AI generation endpoints: 10 requests per minute */
export async function rateLimitAI(userId: number) {
  await checkRateLimit(userId, "ai-generation", 10, 60 * 1000);
}

/** File upload endpoints: 20 requests per minute */
export async function rateLimitUpload(userId: number) {
  await checkRateLimit(userId, "upload", 20, 60 * 1000);
}

/** Heavy generation (quickGenerate, trailer): 3 per minute */
export async function rateLimitHeavyAI(userId: number) {
  await checkRateLimit(userId, "heavy-ai", 3, 60 * 1000);
}

/**
 * IP-based rate limit for public (unauthenticated) endpoints such as
 * password reset requests. Uses the same Redis / in-memory store as
 * checkRateLimit but keys by IP address instead of userId.
 */
export async function rateLimitPublicByIP(
  ip: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const key = `rl:ip:${ip}:${action}`;
  const now = Date.now();

  if (redis) {
    try {
      const results = await redis
        .multi()
        .incr(key)
        .pexpire(key, windowMs)
        .exec();
      if (results && results[0] && results[0][1]) {
        const count = results[0][1] as number;
        if (count > maxRequests) {
          const ttl = await redis.pttl(key);
          const retryAfterSec = Math.ceil(Math.max(ttl, 0) / 1000);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Too many requests. Please try again in ${retryAfterSec} seconds.` });
        }
      }
      return;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      logger.errorWithStack("[RateLimit] Redis IP check failed", err);
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Too many requests. Please try again in ${retryAfterSec} seconds.` });
  }
}
