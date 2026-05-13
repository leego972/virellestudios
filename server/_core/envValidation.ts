/**
   * Production environment validation.
   * Logs missing configuration as warnings but never halts startup —
   * the server degrades gracefully and individual features handle absent vars.
   */

  export function validateProductionEnv(): void {
    if (process.env.NODE_ENV !== "production") return;

    const warnings: string[] = [];

    if (!process.env.JWT_SECRET)            warnings.push("JWT_SECRET not set — auth tokens will use empty secret (insecure)");
    if (!process.env.DATABASE_URL)          warnings.push("DATABASE_URL not set — all DB operations will fail");
    if (!process.env.STRIPE_SECRET_KEY)     warnings.push("STRIPE_SECRET_KEY not set — billing disabled");
    if (!process.env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_WEBHOOK_SECRET not set — webhook verification disabled");
    if (!process.env.OAUTH_SERVER_URL)      warnings.push("OAUTH_SERVER_URL not set — OAuth login disabled");
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      warnings.push("GMAIL credentials not set — email notifications disabled");

    const tierPriceIds = [
      process.env.STRIPE_INDIE_MONTHLY_PRICE_ID,
      process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
      process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
    ];
    if (!tierPriceIds.some(id => id))
      warnings.push("No Stripe tier price IDs set — paid plan upgrades unavailable");

    const aiProviders = [process.env.OPENAI_API_KEY, process.env.GOOGLE_API_KEY, process.env.HUGGING_FACE_API_KEY];
    if (!aiProviders.some(k => k))
      warnings.push("No server AI keys set — AI features limited to user BYOK keys");

    const hasStorage = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET)
      || (process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY);
    if (!hasStorage)
      warnings.push("No storage backend — generated media will use raw provider URLs (can expire)");

    if (warnings.length > 0) {
      console.warn("⚠️  Production config warnings (server starting anyway):");
      warnings.forEach(w => console.warn(`  - ${w}`));
    } else {
      console.log("✅ Production environment validation passed");
    }
  }
  