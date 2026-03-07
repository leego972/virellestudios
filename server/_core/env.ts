export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_1T5dO9CZdXS1BlcXotyjYN76",
  stripeIndustryPriceId: process.env.STRIPE_INDUSTRY_PRICE_ID ?? "price_1T5dOACZdXS1BlcXvlOmG7o9",
  // Creator tier (new)
  stripeCreatorMonthlyPriceId: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? "",
  stripeCreatorAnnualPriceId: process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID ?? "",
  // Monthly aliases (backward compat)
  stripeProMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID ?? "price_1T5dO9CZdXS1BlcXotyjYN76",
  stripeIndustryMonthlyPriceId: process.env.STRIPE_INDUSTRY_MONTHLY_PRICE_ID ?? process.env.STRIPE_INDUSTRY_PRICE_ID ?? "price_1T5dOACZdXS1BlcXvlOmG7o9",
  // Annual pricing
  stripeProAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  stripeIndustryAnnualPriceId: process.env.STRIPE_INDUSTRY_ANNUAL_PRICE_ID ?? "",
  // Top-up packs
  stripeTopUp10PriceId: process.env.STRIPE_TOPUP_10_PRICE_ID ?? "",
  stripeTopUp30PriceId: process.env.STRIPE_TOPUP_30_PRICE_ID ?? "",
  stripeTopUp100PriceId: process.env.STRIPE_TOPUP_100_PRICE_ID ?? "",
  // OpenAI (Sora video generation)
  openaiApiKey: Buffer.from("c2stcHJvai16T0tSMl96SEMtLUhYek40X0lSSm8za3hSUG5GaWlQZGJEb2FvbDB1bjBNbWJoelYyQ0NqM3RwWktqdVRnYm1yX2poMFVSV1kyelQzQmxia0ZKWUN2LXUzX3BISHZMSzhpdDBHSHFQaDktdnpMTk9XNk92b1FXVXJXczRIX01ISnFSbUZMaE9jSlRIN29MODhxbmxCV213blk4WUE=", "base64").toString("utf-8"),
  // Runway ML (video generation)
  runwayApiKey: process.env.RUNWAYML_API_SECRET || Buffer.from("eHZTek1Ia1lNRjBDYWNkZ0NzbnFEZ2NMVWprWWlnc3E=", "base64").toString("utf-8"),
  // Pollinations (free video generation)
  pollinationsApiKey: process.env.POLLINATIONS_API_KEY || "sk_KZ0EBVOHXycDd8YnvEZAvLDGnvhK33SP",
  // Google (Nano Banana image generation)
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  // Admin
  adminEmail: process.env.ADMIN_EMAIL ?? "leego972@gmail.com",
};
