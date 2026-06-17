import { TRPCError } from "@trpc/server";
import { logger } from "./logger";
/**
   * Production environment validation.
   * Logs missing configuration as warnings but never halts startup â
   * the server degrades gracefully and individual features handle absent vars.
   */

  export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== "production") return;

    const warnings: string[] = [];

    if (!process.env.JWT_SECRET)            warnings.push("JWT_SECRET not set â server will throw a fatal error on startup (set it in Railway Variables)");
    if (!process.env.DATABASE_URL)          warnings.push("DATABASE_URL not set â all DB operations will fail");
    if (!process.env.STRIPE_SECRET_KEY)     warnings.push("STRIPE_SECRET_KEY not set â billing disabled");
    if (!process.env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_WEBHOOK_SECRET not set â webhook verification disabled");
    if (!process.env.OAUTH_SERVER_URL)      warnings.push("OAUTH_SERVER_URL not set â OAuth login disabled");
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      warnings.push("GMAIL credentials not set â email notifications disabled");

    const tierPriceIds = [
      process.env.STRIPE_INDIE_MONTHLY_PRICE_ID,
      process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
      process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
    ];
    if (!tierPriceIds.some(id => id))
      warnings.push("No Stripe tier price IDs set â paid plan upgrades unavailable");

    const aiProviders = [process.env.OPENAI_API_KEY, process.env.GOOGLE_API_KEY, process.env.HUGGING_FACE_API_KEY];
    if (!aiProviders.some(k => k))
      warnings.push("No server AI keys set â AI features limited to user BYOK keys");

    const hasStorage = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET)
      || (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY);
    if (!hasStorage)
      warnings.push("No storage backend â generated media will use raw provider URLs (can expire)");

    if (warnings.length > 0) {
      logger.warn("â ï¸  Production config warnings (server starting anyway):");
      warnings.forEach(w => logger.warn(`  - ${w}`));
    } else {
      logger.info("â Production environment validation passed");
    }
  }
  
  /**
   * Validates that a URL is safe to fetch server-side.
   * Blocks private/loopback/link-local IP ranges to prevent SSRF attacks.
   * Throws a TRPCError if the URL is unsafe.
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

    // Block loopback, private, link-local, and metadata service ranges
    const blocked = [
      /^localhost$/,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,  // AWS/GCP metadata (169.254.169.254)
      /^::1$/,          // IPv6 loopback
      /^fc00:/,         // IPv6 unique local
      /^fe80:/,         // IPv6 link-local
    ];

    for (const pattern of blocked) {
      if (pattern.test(hostname)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid ${fieldName}: private or reserved addresses are not allowed` });
      }
    }

    return raw;
  }
  