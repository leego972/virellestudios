import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

/**
 * Production environment validation.
 * Logs missing optional configuration as warnings. Critical database protocol
 * mismatches are reported explicitly because this application is MySQL-native.
 */
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const warnings: string[] = [];

  if (!process.env.JWT_SECRET) warnings.push("JWT_SECRET not set — authentication cannot start safely");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    warnings.push("DATABASE_URL not set — all database operations will fail");
  } else if (!/^mysql(\+[^:]*)?:\/\//i.test(databaseUrl)) {
    warnings.push("DATABASE_URL is not a MySQL connection string — use mysql://...; PostgreSQL is not compatible with the current schema and database driver");
  }

  if (!process.env.STRIPE_SECRET_KEY) warnings.push("STRIPE_SECRET_KEY not set — billing disabled");
  if (!process.env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_WEBHOOK_SECRET not set — webhook verification disabled");
  if (!process.env.OAUTH_SERVER_URL) warnings.push("OAUTH_SERVER_URL not set — OAuth login disabled");
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    warnings.push("Gmail credentials not set — password-reset and notification email may be unavailable");
  }

  const tierPriceIds = [
    process.env.STRIPE_INDIE_MONTHLY_PRICE_ID,
    process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
    process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
  ];
  if (!tierPriceIds.some(Boolean)) warnings.push("No Stripe tier price IDs set — paid plan upgrades unavailable");

  const aiProviders = [process.env.OPENAI_API_KEY, process.env.GOOGLE_API_KEY, process.env.HUGGING_FACE_API_KEY];
  if (!aiProviders.some(Boolean)) warnings.push("No server AI keys set — AI features limited to user BYOK keys");

  const hasStorage = Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) ||
    (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY),
  );
  if (!hasStorage) warnings.push("No storage backend — generated media may use expiring provider URLs");

  if (warnings.length > 0) {
    logger.warn("Production configuration warnings:");
    warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  } else {
    logger.info("Production environment validation passed");
  }
}

/**
 * Validates that a URL is safe to fetch server-side.
 * Blocks private/loopback/link-local IP ranges to reduce SSRF exposure.
 */
export function validatePublicUrl(raw: string, fieldName = "url"): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid ${fieldName}: must be a valid URL` });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid ${fieldName}: only http and https are allowed` });
  }

  const hostname = parsed.hostname.toLowerCase();
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^0\.0\.0\.0$/,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  for (const pattern of blocked) {
    if (pattern.test(hostname)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid ${fieldName}: private or reserved addresses are not allowed` });
    }
  }

  return raw;
}
