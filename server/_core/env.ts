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
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFromAddress: process.env.EMAIL_FROM ?? "noreply@virelle.life",

  // ─── Stripe ────────────────────────────────────────────────────────────────
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // ─── Auteur tier (DB: "amateur") — AUD ────────────────────────────────────
  stripeAuteurMonthlyPriceId: process.env.STRIPE_AUTEUR_MONTHLY_PRICE_ID ?? "",
  stripeAuteurAnnualPriceId: process.env.STRIPE_AUTEUR_ANNUAL_PRICE_ID ?? "",

  // ─── Production Pro tier (DB: "independent") — AUD ────────────────────────
  stripeProductionProMonthlyPriceId: process.env.STRIPE_PRODUCTION_PRO_MONTHLY_PRICE_ID ?? "",
  stripeProductionProAnnualPriceId: process.env.STRIPE_PRODUCTION_PRO_ANNUAL_PRICE_ID ?? "",

  // ─── Studio tier — AUD (consultative; base price only) ────────────────────
  stripeStudioMonthlyPriceId: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? "",
  stripeStudioAnnualPriceId: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID ?? "",

  // ─── Industry Enterprise tier — AUD (custom; base price only) ─────────────
  stripeIndustryEnterpriseMonthlyPriceId: process.env.STRIPE_INDUSTRY_ENTERPRISE_MONTHLY_PRICE_ID ?? "",
  stripeIndustryEnterpriseAnnualPriceId: process.env.STRIPE_INDUSTRY_ENTERPRISE_ANNUAL_PRICE_ID ?? "",

  // ─── Backward-compat aliases (old USD keys — kept so existing webhooks work) ─
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeIndustryPriceId: process.env.STRIPE_INDUSTRY_PRICE_ID ?? "",
  stripeCreatorMonthlyPriceId: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? "",
  stripeCreatorAnnualPriceId: process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID ?? "",
  stripeProMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeIndustryMonthlyPriceId: process.env.STRIPE_INDUSTRY_MONTHLY_PRICE_ID ?? process.env.STRIPE_INDUSTRY_PRICE_ID ?? "",
  stripeProAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  stripeIndustryAnnualPriceId: process.env.STRIPE_INDUSTRY_ANNUAL_PRICE_ID ?? "",
  stripeAmateurMonthlyPriceId: process.env.STRIPE_AMATEUR_MONTHLY_PRICE_ID ?? "",
  stripeAmateurAnnualPriceId: process.env.STRIPE_AMATEUR_ANNUAL_PRICE_ID ?? "",
  stripeIndependentMonthlyPriceId: process.env.STRIPE_INDEPENDENT_MONTHLY_PRICE_ID ?? "",
  stripeIndependentAnnualPriceId: process.env.STRIPE_INDEPENDENT_ANNUAL_PRICE_ID ?? "",

  // ─── Credit top-up packs — AUD ─────────────────────────────────────────────
  stripeTopUp10PriceId: process.env.STRIPE_TOPUP_10_PRICE_ID ?? "",    // 500 cr  — A$750
  stripeTopUp30PriceId: process.env.STRIPE_TOPUP_30_PRICE_ID ?? "",    // 1,500 cr — A$1,800
  stripeTopUp100PriceId: process.env.STRIPE_TOPUP_100_PRICE_ID ?? "",  // 3,000 cr — A$3,150
  stripeTopUp200PriceId: process.env.STRIPE_TOPUP_200_PRICE_ID ?? "",  // 6,000 cr — A$5,400
  stripeTopUp500PriceId: process.env.STRIPE_TOPUP_500_PRICE_ID ?? "",  // 12,000 cr — A$9,000
  stripeTopUp1000PriceId: process.env.STRIPE_TOPUP_1000_PRICE_ID ?? "", // 25,000 cr — A$15,000

  // ─── OpenAI ────────────────────────────────────────────────────────────────
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  // ─── Runway ML ─────────────────────────────────────────────────────────────
  runwayApiKey: process.env.RUNWAYML_API_SECRET ?? "",

  // ─── Pollinations (free video generation — available to all users via key pool) ─
  pollinationsApiKey: process.env.POLLINATIONS_API_KEY || "sk_KZ0EBVOHXycDd8YnvEZAvLDGnvhK33SP",

  // ─── Google (Nano Banana image generation) ─────────────────────────────────
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",

  // ─── Admin ─────────────────────────────────────────────────────────────────
  adminEmail: process.env.ADMIN_EMAIL ?? "Studiosvirelle@gmail.com",

  // ─── TikTok Content Posting API ────────────────────────────────────────────
  tiktokCreatorToken: process.env.TIKTOK_CREATOR_TOKEN ?? "",
  tiktokAccessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",

  // ─── Social media marketing channels ──────────────────────────────────────
  metaAccessToken: process.env.META_ACCESS_TOKEN ?? "",
  metaAdAccountId: process.env.META_AD_ACCOUNT_ID ?? "",
  googleAdsCustomerId: process.env.GOOGLE_ADS_CUSTOMER_ID ?? "",
  googleAdsDeveloperToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "",
  xApiKey: process.env.X_API_KEY ?? "",
  xApiSecret: process.env.X_API_SECRET ?? "",
  xAccessToken: process.env.X_ACCESS_TOKEN ?? "",
  xAccessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET ?? "",
  linkedinAccessToken: process.env.LINKEDIN_ACCESS_TOKEN ?? "",
  linkedinOrganizationId: process.env.LINKEDIN_ORGANIZATION_ID ?? "",
  snapchatAccessToken: process.env.SNAPCHAT_ACCESS_TOKEN ?? "",
  snapchatAdAccountId: process.env.SNAPCHAT_AD_ACCOUNT_ID ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL ?? "noreply@virelle.life",
  redditClientId: process.env.REDDIT_CLIENT_ID ?? "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  redditAccessToken: process.env.REDDIT_ACCESS_TOKEN ?? "",
  pinterestAccessToken: process.env.PINTEREST_ACCESS_TOKEN ?? "",
  pinterestAdAccountId: process.env.PINTEREST_AD_ACCOUNT_ID ?? "",

  // ─── Expanded channels ─────────────────────────────────────────────────────
  devtoApiKey: process.env.DEVTO_API_KEY ?? "",
  mediumAccessToken: process.env.MEDIUM_ACCESS_TOKEN ?? "",
  mediumAuthorId: process.env.MEDIUM_AUTHOR_ID ?? "",
  hashnodeToken: process.env.HASHNODE_TOKEN ?? "",
  hashnodePublicationId: process.env.HASHNODE_PUBLICATION_ID ?? "",
  discordBotToken: process.env.DISCORD_BOT_TOKEN ?? "",
  discordChannelId: process.env.DISCORD_CHANNEL_ID ?? "",
  mastodonAccessToken: process.env.MASTODON_ACCESS_TOKEN ?? "",
  mastodonInstanceUrl: process.env.MASTODON_INSTANCE_URL ?? "https://infosec.exchange",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChannelId: process.env.TELEGRAM_CHANNEL_ID ?? "",
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
};
