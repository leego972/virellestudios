/**
 * Production environment validation
 * Ensures critical configuration is present before startup
 */

export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return; // Skip validation in development
  }

  const errors: string[] = [];

  // Critical authentication & security
  if (!process.env.JWT_SECRET) {
    errors.push("JWT_SECRET is required in production");
  }

  // Database
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required in production");
  }

  // Stripe billing (required for launch)
  if (!process.env.STRIPE_SECRET_KEY) {
    errors.push("STRIPE_SECRET_KEY is required in production");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push("STRIPE_WEBHOOK_SECRET is required in production");
  }

  // At least one tier must be configured
  const tierPriceIds = [
    process.env.STRIPE_INDIE_MONTHLY_PRICE_ID,
    process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID,
    process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
  ];
  if (!tierPriceIds.some(id => id)) {
    errors.push("At least one Stripe tier price ID (INDIE/CREATOR/STUDIO) is required in production");
  }

  // OAuth (required for authentication)
  if (!process.env.OAUTH_SERVER_URL) {
    errors.push("OAUTH_SERVER_URL is required in production");
  }

  // Email (for notifications)
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    errors.push("GMAIL_USER and GMAIL_APP_PASSWORD are required in production for email notifications");
  }

  // AI providers (at least one should be configured)
  const aiProviders = [
    process.env.OPENAI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.HUGGING_FACE_API_KEY,
  ];
  if (!aiProviders.some(key => key)) {
    errors.push("At least one AI provider key (OPENAI_API_KEY, GOOGLE_API_KEY, or HUGGING_FACE_API_KEY) is required in production");
  }

  // If any errors, fail startup
  if (errors.length > 0) {
    console.error("❌ PRODUCTION ENVIRONMENT VALIDATION FAILED");
    console.error("Missing or invalid configuration:");
    errors.forEach(err => console.error(`  - ${err}`));
    console.error("\nPlease set all required environment variables before starting production.");
    process.exit(1);
  }

  console.log("✅ Production environment validation passed");
}
