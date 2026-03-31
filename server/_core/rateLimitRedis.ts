/**
 * Redis-based rate limiter for production multi-instance deployments
 * Falls back to in-memory rate limiter if Redis is not available
 * 
 * This module provides a production-safe rate limiting solution that works
 * across multiple server instances and persists across restarts.
 */

import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback (used if Redis is unavailable)
const inMemoryStore = new Map<string, RateLimitEntry>();

// Redis client (lazy-initialized if available)
let redisClient: any = null;
let redisAvailable = false;

/**
 * Initialize Redis connection if available
 * This is called during server startup
 */
export async function initializeRedisRateLimit(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.warn("[RateLimit] REDIS_URL not set — using in-memory rate limiting (not suitable for multi-instance production)");
      return;
    }

    // Lazy import to avoid hard dependency
    const redis = await import("redis");
    redisClient = redis.createClient({ url: redisUrl });
    
    redisClient.on("error", (err: unknown) => {
      logger.error("[RateLimit] Redis connection error:", { error: String(err) });
      redisAvailable = false;
    });

    redisClient.on("connect", () => {
      logger.info("[RateLimit] Connected to Redis");
      redisAvailable = true;
    });

    await redisClient.connect();
  } catch (error) {
    logger.warn("[RateLimit] Redis not available — falling back to in-memory rate limiting", { error: String(error) });
    redisAvailable = false;
  }
}

/**
 * Check rate limit for a given user + action combination
 * Admin users are exempt from all rate limits
 * 
 * @param userId - The user's ID
 * @param action - The action category (e.g., "ai-generation", "upload")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @throws TRPCError with TOO_MANY_REQUESTS code if limit exceeded
 */
export async function checkRateLimitAsync(
  userId: number,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const key = `ratelimit:${userId}:${action}`;
  const now = Date.now();

  if (redisAvailable && redisClient) {
    try {
      // Use Redis for distributed rate limiting
      const count = await redisClient.incr(key);
      
      if (count === 1) {
        // First request in this window — set expiry
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      if (count > maxRequests) {
        const ttl = await redisClient.ttl(key);
        const retryAfterSec = ttl > 0 ? ttl : Math.ceil(windowMs / 1000);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`,
        });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      
      // Redis error — fall back to in-memory
      logger.warn("[RateLimit] Redis error, falling back to in-memory:", { error: String(error) });
      checkRateLimitInMemory(userId, action, maxRequests, windowMs);
    }
  } else {
    // Use in-memory fallback
    checkRateLimitInMemory(userId, action, maxRequests, windowMs);
  }
}

/**
 * In-memory rate limiter (fallback)
 */
function checkRateLimitInMemory(
  userId: number,
  action: string,
  maxRequests: number,
  windowMs: number,
): void {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
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

/**
 * Clean up expired in-memory entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(inMemoryStore.entries())) {
    if (now > entry.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Graceful shutdown
 */
export async function closeRedisRateLimit(): Promise<void> {
  if (redisClient && redisAvailable) {
    try {
      await redisClient.quit();
      logger.info("[RateLimit] Redis connection closed");
    } catch (error) {
      logger.error("[RateLimit] Error closing Redis connection:", { error: String(error) });
    }
  }
}

// ─── Preset rate limit configs ───

/** Auth endpoints: 5 requests per minute */
export async function rateLimitAuth(userId: number) {
  await checkRateLimitAsync(userId, "auth", 5, 60 * 1000);
}

/** AI generation endpoints: 10 requests per minute */
export async function rateLimitAI(userId: number) {
  await checkRateLimitAsync(userId, "ai-generation", 10, 60 * 1000);
}

/** File upload endpoints: 20 requests per minute */
export async function rateLimitUpload(userId: number) {
  await checkRateLimitAsync(userId, "upload", 20, 60 * 1000);
}

/** Heavy generation (quickGenerate, trailer): 3 per minute */
export async function rateLimitHeavyAI(userId: number) {
  await checkRateLimitAsync(userId, "heavy-ai", 3, 60 * 1000);
}

/** Billing endpoints: 10 requests per minute */
export async function rateLimitBilling(userId: number) {
  await checkRateLimitAsync(userId, "billing", 10, 60 * 1000);
}

/** Admin endpoints: 30 requests per minute */
export async function rateLimitAdmin(userId: number) {
  await checkRateLimitAsync(userId, "admin", 30, 60 * 1000);
}
