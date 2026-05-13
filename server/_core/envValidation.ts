/**
   * Production environment validation
   * Ensures critical configuration is present before startup.
   * Non-critical vars (email, Stripe price IDs) emit warnings but do not halt startup.
   */

  export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== "production") {
      return; // Skip validation in development
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // ── Critical: auth & security ────────────────────────────────────────────────
    if (!process.env.JWT_SECRET) {
      errors.push("JWT_SECRET is required in production");
    }

    // ── Critical: database ───────────────────────────────────────────────────────
    if (!process.env.DATABASE_URL) {
      errors.push("DATABASE_URL is required in production");
    }

    // ── Critical: Stripe billing keys ────────────────────────────────────────────
    if (!process.env.STRIPE_SECRET_KEY) {
      errors.push("STRIPE_SECRET_KEY is required in production");
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      errors.push("STRIPE_WEBHOOK_SECRET is required in production");
    }

    // ── Warning: Stripe price IDs (required for paid plans, not for app boot) ────
    const tierPriceIds = [
      process.env.STRIPE_INDIE_MONTHLY_PRICE_ID,
      process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
      process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
    ];
    if (!tierPriceIds.some(id => id)) {
      warnings.push("No Stripe tier price IDs configured — paid plan upgrades will not work until STRIPE_INDIE/CREATOR/STUDIO_MONTHLY_PRICE_ID is set");
    }

    // ── Critical: OAuth server ───────────────────────────────────────────────────
    if (!process.env.OAUTH_SERVER_URL) {
      errors.push("OAUTH_SERVER_URL is required in production");
    }

    // ── Warning: email notifications (non-fatal) ─────────────────────────────────
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      warnings.push("GMAIL_USER / GMAIL_APP_PASSWORD not set — email notifications disabled");
    }

    // ── Warning: AI providers ────────────────────────────────────────────────────
    const aiProviders = [
      process.env.OPENAI_API_KEY,
      process.env.GOOGLE_API_KEY,
      process.env.HUGGING_FACE_API_KEY,
    ];
    if (!aiProviders.some(key => key)) {
      warnings.push("No server-side AI provider key set — system AI features will be limited to user BYOK keys");
    }

    // ── Storage backend (warning only) ───────────────────────────────────────────
    const hasForge = !!(process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY);
    const hasS3 =
      !!process.env.AWS_ACCESS_KEY_ID &&
      !!process.env.AWS_SECRET_ACCESS_KEY &&
      !!process.env.AWS_S3_BUCKET;
    if (!hasForge && !hasS3) {
      warnings.push(
        "No storage backend configured — generated videos/images will use raw provider URLs (can expire). " +
        "Set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET or BUILT_IN_FORGE_API_URL + BUILT_IN_FORGE_API_KEY."
      );
    }

    // Print warnings
    if (warnings.length > 0) {
      console.warn("⚠️  Production warnings (app will start, features may be limited):");
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    // Fail startup only on critical errors
    if (errors.length > 0) {
      console.error("❌ PRODUCTION ENVIRONMENT VALIDATION FAILED");
      console.error("Missing critical configuration:");
      errors.forEach(err => console.error(`  - ${err}`));
      console.error("\nSet these environment variables in Railway before deploying.");
      process.exit(1);
    }

    console.log("✅ Production environment validation passed");
  }
  