import { TRPCError } from "@trpc/server";

/**
 * Simple in-memory rate limiter.
 * For production at scale, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given user + action combination.
 * @param userId - The user's ID
 * @param action - The action category (e.g., "ai-generation", "upload")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @throws TRPCError with TOO_MANY_REQUESTS code if limit exceeded
 */
export function checkRateLimit(
  userId: number,
  action: string,
  maxRequests: number,
  windowMs: number,
): void {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
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
export function rateLimitAI(userId: number) {
  checkRateLimit(userId, "ai-generation", 10, 60 * 1000);
}

/** File upload endpoints: 20 requests per minute */
export function rateLimitUpload(userId: number) {
  checkRateLimit(userId, "upload", 20, 60 * 1000);
}

/** Heavy generation (quickGenerate, trailer): 3 per minute */
export function rateLimitHeavyAI(userId: number) {
  checkRateLimit(userId, "heavy-ai", 3, 60 * 1000);
}
