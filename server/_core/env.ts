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

  // âââ Stripe ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // âââ Indie tier (DB: "indie") â AUD ââââââââââââââââââââââââââââââââââââââââ
  stripeIndieMonthlyPriceId: process.env.STRIPE_INDIE_MONTHLY_PRICE_ID ?? "",
  stripeIndieAnnualPriceId: process.env.STRIPE_INDIE_ANNUAL_PRICE_ID ?? "",

  // âââ Creator tier (DB: "amateur") â AUD ââââââââââââââââââââââââââââââââââââ
  stripeCreatorMonthlyPriceId: process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID ?? "",
  stripeCreatorAnnualPriceId: process.env.STRIPE_CREATOR_ANNUAL_PRICE_ID ?? "",

  // âââ Studio tier (DB: "independent") â AUD âââââââââââââââââââââââââââââââââ
  stripeStudioMonthlyPriceId: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? "",
  stripeStudioAnnualPriceId: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID ?? "",

  // âââ Production tier (DB: "studio") â AUD (consultative; base price only) ââ
  stripeProductionMonthlyPriceId: process.env.STRIPE_PRODUCTION_MONTHLY_PRICE_ID ?? "",
  stripeProductionAnnualPriceId: process.env.STRIPE_PRODUCTION_ANNUAL_PRICE_ID ?? "",

  // âââ Enterprise tier (DB: "industry") â AUD (custom; base price only) âââââââ
  stripeEnterpriseMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "",
  stripeEnterpriseAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID ?? "",

  // âââ Designer Marketplace membership â AUD (v7.0) ââââââââââââââââââââââââââ
  stripeDesignerYearlyPriceId: process.env.STRIPE_DESIGNER_YEARLY_PRICE_ID ?? "",
  stripeConnectReturnUrl: process.env.STRIPE_CONNECT_RETURN_URL ?? "",
  stripeConnectRefreshUrl: process.env.STRIPE_CONNECT_REFRESH_URL ?? "",

  // âââ Backward-compat aliases (old USD keys â kept so existing webhooks work) â
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

  // âââ Credit top-up packs â AUD âââââââââââââââââââââââââââââââââââââââââââââ
  stripeTopUp10PriceId: process.env.STRIPE_TOPUP_10_PRICE_ID ?? "",    // 500 cr  â A$750
  stripeTopUp30PriceId: process.env.STRIPE_TOPUP_30_PRICE_ID ?? "",    // 1,500 cr â A$1,800
  stripeTopUp100PriceId: process.env.STRIPE_TOPUP_100_PRICE_ID ?? "",  // 3,000 cr â A$3,150
  stripeTopUp200PriceId: process.env.STRIPE_TOPUP_200_PRICE_ID ?? "",  // 6,000 cr â A$5,400
  stripeTopUp500PriceId: process.env.STRIPE_TOPUP_500_PRICE_ID ?? "",  // 12,000 cr â A$9,000
  stripeTopUp1000PriceId: process.env.STRIPE_TOPUP_1000_PRICE_ID ?? "", // 25,000 cr â A$15,000

  // âââ OpenAI ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  // âââ Runway ML âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  runwayApiKey: process.env.RUNWAYML_API_SECRET || process.env.RUNWAY_API_KEY || "",

  // âââ fal.ai (video generation â platform key used as fallback for admin users) ââââ
  falApiKey: process.env.FAL_KEY ?? "",

  // âââ Pollinations (free video generation â available to all users via key pool) â
  pollinationsApiKey: process.env.POLLINATIONS_API_KEY ?? "",

  // âââ Google (Nano Banana image generation + Veo 3 / Gemini Imagen) ââââââââââ
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",

  // âââ Hugging Face (FLUX.1-dev image generation fallback) ââââââââââââââââââââââ
  huggingFaceApiKey: process.env.HUGGING_FACE_API_KEY ?? "",

  // âââ Admin âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  adminEmail: process.env.ADMIN_EMAIL ?? "",

  // âââ TikTok Content Posting API ââââââââââââââââââââââââââââââââââââââââââââ
  tiktokCreatorToken: process.env.TIKTOK_CREATOR_TOKEN ?? "",
  tiktokAccessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
  tiktokClientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
  tiktokClientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
  tiktokRefreshToken: process.env.TIKTOK_REFRESH_TOKEN ?? "",


    // ─── YouTube Data API v3 ────────────────────────────────────────────────
    youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
    youtubeChannelId: process.env.YOUTUBE_CHANNEL_ID ?? "",

      // ─── YouTube OAuth (video upload & auto-posting) ─────────────────────────
      youtubeClientId: process.env.YOUTUBE_CLIENT_ID ?? "",
      youtubeClientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? "",
      youtubeRefreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? "",

    // ─── Threads (Meta) ─────────────────────────────────────────────────────
    threadsAccessToken: process.env.THREADS_ACCESS_TOKEN ?? "",
    threadsUserId: process.env.THREADS_USER_ID ?? "",

    // ─── Product Hunt ────────────────────────────────────────────────────────
    productHuntApiToken: process.env.PRODUCT_HUNT_API_TOKEN ?? "",

    // ─── Substack ────────────────────────────────────────────────────────────
    substackApiKey: process.env.SUBSTACK_API_KEY ?? "",
    substackPublicationUrl: process.env.SUBSTACK_PUBLICATION_URL ?? "",

    // ─── Google Search Console Indexing API ─────────────────────────────────
    // Base64-encoded service account JSON for instant URL indexing
    googleIndexingSaKey: process.env.GOOGLE_INDEXING_SA_KEY ?? "",
  // âââ Social media marketing channels ââââââââââââââââââââââââââââââââââââââ
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

  // ─── Instagram (Meta Graph API — content publishing) ─────────────────────
  instagramClientId: process.env.INSTAGRAM_CLIENT_ID ?? "",
  instagramClientSecret: process.env.INSTAGRAM_CLIENT_SECRET ?? "",
  instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
  instagramUserId: process.env.INSTAGRAM_USER_ID ?? "",
  redditClientId: process.env.REDDIT_CLIENT_ID ?? "",
  redditClientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  redditAccessToken: process.env.REDDIT_ACCESS_TOKEN ?? "",
  pinterestAccessToken: process.env.PINTEREST_ACCESS_TOKEN ?? "",
  pinterestAdAccountId: process.env.PINTEREST_AD_ACCOUNT_ID ?? "",

  // âââ Expanded channels âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

  // âââ Groq (free LLM â Llama 3.3 70B, tool-calling capable) ââââââââââââââ
    groqApiKey: process.env.GROQ_API_KEY ?? "",

    // âââ TitanAI Inference API âââââââââââââââââââââââââââââââââââââââââââââââââ
  // Set TITAN_API_URL to the running TitanAI API server (e.g. http://ssh5.vast.ai:8000 â current Vast box: TitanAI-Verified-2)
  // Leave empty to disable â falls back to OpenAI/Forge routing as normal.
  // Leave empty string when TITAN_API_URL is unset â server routes skip TitanAI and fall back to OpenAI
  titanApiUrl: process.env.TITAN_API_URL ?? "",
  titanApiKey: process.env.TITAN_API_KEY ?? "",
  /** Venice AI permanent platform key â used as the default LLM for ALL users (Assistant, script gen, scene breakdowns) when no user-specific LLM key is set. OpenAI-compatible. */
  veniceApiKey: process.env.VENICE_API_KEY ?? "",
  // ─── Google OAuth (direct — replaces the dead third-party broker) ──────────
  googleOAuthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleOAuthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",

  // ─── GitHub OAuth (direct — replaces the dead third-party broker) ──────────
  githubOAuthClientId: process.env.GITHUB_OAUTH_CLIENT_ID ?? "",
  githubOAuthClientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? "",

  // ─── Public base URL, used to build OAuth callback/redirect URLs ───────────
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "https://virelle.life",

  veniceModel: process.env.VENICE_MODEL ?? "llama-3.3-70b",
};
