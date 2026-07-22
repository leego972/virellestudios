export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  // v6.80: admin authority is database-role only. OWNER_OPEN_ID is intentionally ignored.
  ownerOpenId: "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  emailFromAddress: process.env.EMAIL_FROM ?? "studiosvirelle@gmail.com",

  // Stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // Indie tier (DB: "indie") — AUD
  stripeIndieMonthlyPriceId: process.env.STRIPE_INDIE_MONTHLY_PRICE_ID ?? "",
  stripeIndieAnnualPriceId: process.env.STRIPE_INDIE_ANNUAL_PRICE_ID ?? "",

  // Creator tier (DB: "amateur") — AUD
  stripeCreatorMonthlyPriceId: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? "",
  stripeCreatorAnnualPriceId: process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID ?? "",

  // Studio tier (DB: "independent") — AUD
  stripeStudioMonthlyPriceId: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? "",
  stripeStudioAnnualPriceId: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID ?? "",

  // Production tier (DB: "studio") — AUD
  stripeProductionMonthlyPriceId: process.env.STRIPE_PRODUCTION_MONTHLY_PRICE_ID ?? "",
  stripeProductionAnnualPriceId: process.env.STRIPE_PRODUCTION_ANNUAL_PRICE_ID ?? "",

  // Enterprise tier (DB: "industry") — AUD
  stripeEnterpriseMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "",
  stripeEnterpriseAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ?? "",

  // Designer Marketplace membership — AUD
  stripeDesignerYearlyPriceId: process.env.STRIPE_DESIGNER_YEARLY_PRICE_ID ?? "",
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL ?? "",
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL ?? "",

  // Backward-compatible Stripe aliases
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeIndustryPriceId: process.env.STRIPE_INDUSTRY_PRICE_ID ?? "",
  stripeProMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeIndustryMonthlyPriceId: process.env.STRIPE_INDUSTRY_MONTHLY_PRICE_ID ?? process.env.STRIPE_INDUSTRY_PRICE_ID ?? "",
  stripeProAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? "",
  stripeIndustryAnnualPriceId: process.env.STRIPE_INDUSTRY_ANNUAL_PRICE_ID ?? "",
  stripeAmateurMonthlyPriceId: process.env.STRIPE_AMATEUR_MONTHLY_PRICE_ID ?? "",
  stripeAmateurAnnualPriceId: process.env.STRIPE_AMATEUR_ANNUAL_PRICE_ID ?? "",
  stripeIndependentMonthlyPriceId: process.env.STRIPE_INDEPENDENT_MONTHLY_PRICE_ID ?? "",
  stripeIndependentAnnualPriceId: process.env.STRIPE_INDEPENDENT_ANNUAL_PRICE_ID ?? "",

  // Credit top-up packs — AUD
  stripeTopUp10PriceId: process.env.STRIPE_TOPUP_10_PRICE_ID ?? "",
  stripeTopUp30PriceId: process.env.STRIPE_TOPUP_30_PRICE_ID ?? "",
  stripeTopUp100PriceId: process.env.STRIPE_TOPUP_100_PRICE_ID ?? "",
  stripeTopUp200PriceId: process.env.STRIPE_TOPUP_200_PRICE_ID ?? "",
  stripeTopUp500PriceId: process.env.STRIPE_TOPUP_500_PRICE_ID ?? "",
  stripeTopUp1000PriceId: process.env.STRIPE_TOPUP_1000_PRICE_ID ?? "",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  runwayApiKey: process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY || "",
  falApiKey: process.env.FAL_KEY ?? "",
  pollinationsApiKey: process.env.POLLINATIONS_API_KEY ?? "",
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",

  tiktokCreatorToken: process.env.TIKTOK_CREATOR_TOKEN ?? "",
  tiktokAccessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
  tiktokRefreshToken: process.env.TIKTOK_REFRESH_TOKEN ?? "",

  // YouTube Data API v3
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID ?? "",

  // YouTube OAuth (video upload & auto-posting)
  youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
  youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
  youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",

  // Threads (Meta)
  threadsAccessToken: process.env.THREADS_ACCESS_TOKEN ?? "",
  threadsUserId: process.env.THREADS_USER_ID ?? "",

  // Product Hunt
  productHuntApiToken: process.env.PRODUCT_HUNT_API_TOKEN ?? "",

  // Substack
  substackApiKey: process.env.SUBSTACK_API_KEY ?? "",
  substackPublicationUrl: process.env.SUBSTACK_PUBLICATION_URL ?? "",

  // Google Search Console Indexing API
  googleIndexingSaKey: process.env.GOOGLE_INDEXING_SA_KEY ?? "",

  // Social media marketing channels
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
  snapchatClientId: process.env.SNAPCHAT_CLIENT_ID ?? "",
  snapchatClientSecret: process.env.SNAPCHAT_CLIENT_SECRET ?? "",
  snapchatRefreshToken: process.env.SNAPCHAT_REFRESH_TOKEN ?? "",

  // Instagram (Meta Graph API — content publishing)
  instagramClientId: process.env.INSTAGRAM_CLIENT_ID ?? "",
  instagramClientSecret: process.env.INSTAGRAM_CLIENT_SECRET ?? "",
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
  instagramUserId: process.env.INSTAGRAM_USER_ID ?? "",
  redditClientId: process.env.REDDIT_CLIENT_ID ?? "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  redditAccessToken: process.env.REDDIT_ACCESS_TOKEN ?? "",
  pinterestAccessToken: process.env.PINTEREST_ACCESS_TOKEN ?? "",
  pinterestAdAccountId: process.env.PINTEREST_AD_ACCOUNT_ID ?? "",

  // Expanded channels
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

  groqApiKey: process.env.GROQ_API_KEY ?? "",
  titanApiUrl: process.env.TITAN_API_URL ?? "",
  titanApiKey: process.env.TITAN_API_KEY ?? "",
  veniceApiKey: process.env.VENICE_API_KEY ?? "",

  // Direct Google OAuth. Accept both the current variable names and the
  // legacy GOOGLE_CLIENT_* names used by the earlier production deployment.
  googleOAuthClientId:
    process.env.GOOGLE_OAUTH_CLIENT_ID ??
    process.env.GOOGLE_CLIENT_ID ??
    process.env.VITE_GOOGLE_CLIENT_ID ??
    "",
  googleOAuthClientSecret:
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ??
    process.env.GOOGLE_CLIENT_SECRET ??
    "",

  // Direct GitHub OAuth with legacy aliases.
  githubOAuthClientId:
    process.env.GITHUB_OAUTH_CLIENT_ID ??
    process.env.GITHUB_CLIENT_ID ??
    "",
  githubOAuthClientSecret:
    process.env.GITHUB_OAUTH_CLIENT_SECRET ??
    process.env.GITHUB_CLIENT_SECRET ??
    "",

  publicAppUrl: (process.env.PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://virelle.life").replace(/\/$/, ""),
  veniceModel: process.env.VENICE_MODEL ?? "llama-3.3-70b",
};
