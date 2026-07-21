import { logger } from "./logger";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import Redis from "ioredis";

let redis: Redis | null = null;

if (ENV.redisUrl) {
  try {
    redis = new Redis(ENV.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    redis.on("error", err => logger.warn(`[RateLimit] Redis error: ${err.message}`));
  } catch (err) {
    logger.errorWithStack("[RateLimit] Failed to initialize Redis; using in-memory fallback.", err);
    redis = null;
  }
} else if (process.env.NODE_ENV === "production") {
  logger.error("[RateLimit] REDIS_URL not set in production; per-instance in-memory fallback is active.");
} else {
  logger.warn("[RateLimit] REDIS_URL not set; using in-memory storage in development.");
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();
const adminUserIds = new Set<number>();

const FIXED_WINDOW_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return { count, ttl }
`;

export function registerAdminForRateLimit(userId: number): void {
  adminUserIds.add(userId);
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) memoryStore.delete(key);
  }
}, 5 * 60 * 1000).unref();

async function incrementRedisWindow(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
  if (!redis) throw new Error("Redis is unavailable");
  const raw = await redis.eval(FIXED_WINDOW_LUA, 1, key, String(windowMs));
  if (!Array.isArray(raw) || raw.length < 2) throw new Error("Redis returned an invalid rate-limit result");
  return { count: Number(raw[0]), ttl: Number(raw[1]) };
}

function incrementMemoryWindow(key: string, windowMs: number): { count: number; ttl: number } {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { count: 1, ttl: windowMs };
  }
  entry.count += 1;
  return { count: entry.count, ttl: Math.max(0, entry.resetAt - now) };
}

async function consume(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
  if (redis) {
    try {
      return await incrementRedisWindow(key, windowMs);
    } catch (err) {
      logger.errorWithStack("[RateLimit] Redis check failed; using in-memory fallback.", err);
    }
  }
  return incrementMemoryWindow(key, windowMs);
}

function throwRateLimit(ttl: number, publicMessage = false): never {
  const seconds = Math.max(1, Math.ceil(ttl / 1000));
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: publicMessage
      ? `Too many requests. Please try again in ${seconds} seconds.`
      : `Rate limit exceeded. Please try again in ${seconds} seconds.`,
  });
}

export async function checkRateLimit(
  userId: number,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  if (adminUserIds.has(userId)) return;
  const result = await consume(`rl:${userId}:${action}`, windowMs);
  if (result.count > maxRequests) throwRateLimit(result.ttl);
}

export async function rateLimitAI(userId: number) {
  await checkRateLimit(userId, "ai-generation", 10, 60_000);
}

export async function rateLimitUpload(userId: number) {
  await checkRateLimit(userId, "upload", 20, 60_000);
}

export async function rateLimitHeavyAI(userId: number) {
  await checkRateLimit(userId, "heavy-ai", 3, 60_000);
}

export async function rateLimitPublicByIP(
  ip: string,
  action: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const normalizedIp = String(ip || "unknown").slice(0, 128);
  const result = await consume(`rl:ip:${normalizedIp}:${action}`, windowMs);
  if (result.count > maxRequests) throwRateLimit(result.ttl, true);
}
