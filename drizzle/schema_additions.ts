import { mysqlTable, int, varchar, text, timestamp, boolean, json, float } from "drizzle-orm/mysql-core";

// Public Film Pages (Promote / Distribution)
export const filmPages = mysqlTable("filmPages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnailUrl"),
  trailerUrl: text("trailerUrl"),
  filmUrl: text("filmUrl"),
  isPublic: boolean("isPublic").default(false).notNull(),
  showCreatorName: boolean("showCreatorName").default(true).notNull(),
  showVirelleBranding: boolean("showVirelleBranding").default(true).notNull(),
  allowShowcase: boolean("allowShowcase").default(true).notNull(),
  socialLinks: json("socialLinks"), // { instagram, tiktok, youtube, website }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FilmPage = typeof filmPages.$inferSelect;
export type InsertFilmPage = typeof filmPages.$inferInsert;

// Promo Assets (Captions, Hashtags, etc.)
export const promoAssets = mysqlTable("promoAssets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // caption, hashtags, synopsis, hook
  content: text("content").notNull(),
  variant: varchar("variant", { length: 64 }), // cinematic, viral, professional
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PromoAsset = typeof promoAssets.$inferSelect;
export type InsertPromoAsset = typeof promoAssets.$inferInsert;

// ─── Director's Vision Document (cinematographic style guide per project) ────
export const directorVision = mysqlTable("directorVision", {
  id:             int("id").autoincrement().primaryKey(),
  projectId:      int("projectId").notNull().unique(),
  userId:         int("userId").notNull(),
  // Camera Package
  cameraSystem:   varchar("cameraSystem",   { length: 128 }),
  lensSet:        varchar("lensSet",        { length: 128 }),
  aspectRatio:    varchar("aspectRatio",    { length: 16  }),
  frameRate:      varchar("frameRate",      { length: 16  }),
  shootingFormat: varchar("shootingFormat", { length: 64  }),
  // Color & Look
  colorGradeStyle: varchar("colorGradeStyle", { length: 128 }),
  referenceFilms:  json("referenceFilms"),
  colorPalette:    json("colorPalette"),
  lutName:         varchar("lutName", { length: 128 }),
  // Camera Movement
  movementStyle:   varchar("movementStyle", { length: 128 }),
  coverageNotes:   text("coverageNotes"),
  // Lighting
  lightingStyle:   varchar("lightingStyle", { length: 128 }),
  // Sound Design
  soundDesignDirection: text("soundDesignDirection"),
  musicGenre:      varchar("musicGenre", { length: 128 }),
  // AI-generated master prompt
  productionEra:      varchar("productionEra",     { length: 128 }),
  productionCountry:  varchar("productionCountry", { length: 128 }),
  productionSetting:  text("productionSetting"),
  architecturalStyle: varchar("architecturalStyle", { length: 128 }),
  visualDnaPrompt:    text("visualDnaPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DirectorVision = typeof directorVision.$inferSelect;
export type InsertDirectorVision = typeof directorVision.$inferInsert;

// ─── Production Vehicles (vehicle registry per project) ─────────────────────
export const productionVehicles = mysqlTable("productionVehicles", {
  id:          int("id").autoincrement().primaryKey(),
  projectId:   int("projectId").notNull(),
  userId:      int("userId").notNull(),
  name:        varchar("name",     { length: 255 }).notNull(),
  make:        varchar("make",     { length: 128 }),
  model:       varchar("model",    { length: 128 }),
  year:        int("year"),
  color:       varchar("color",    { length: 128 }),
  condition:   varchar("condition",{ length: 64  }),
  vehicleRole: varchar("vehicleRole", { length: 64 }).default("hero"),
  vehicleType: varchar("vehicleType", { length: 64 }),
  period:      varchar("period",   { length: 64  }),
  specialFeatures: text("specialFeatures"),
  sceneIds:    json("sceneIds"),
  aiVisualPrompt: text("aiVisualPrompt"),
  referenceImages: json("referenceImages"),
  notes:       text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProductionVehicle = typeof productionVehicles.$inferSelect;
export type InsertProductionVehicle = typeof productionVehicles.$inferInsert;

// ─── Wardrobe Items (photo upload wardrobe per project) ──────────────────────
export const wardrobeItems = mysqlTable("wardrobeItems", {
  id:             int("id").autoincrement().primaryKey(),
  projectId:      int("projectId").notNull(),
  userId:         int("userId").notNull(),
  name:           varchar("name",          { length: 255 }).notNull(),
  category:       varchar("category",      { length: 64  }),
  imageUrl:       text("imageUrl").notNull(),
  storageKey:     varchar("storageKey",    { length: 512 }),
  description:    text("description"),
  color:          varchar("color",         { length: 128 }),
  secondaryColor: varchar("secondaryColor",{ length: 128 }),
  fabric:         varchar("fabric",        { length: 128 }),
  condition:      varchar("condition",     { length: 64  }),
  brand:          varchar("brand",         { length: 128 }),
  era:            varchar("era",           { length: 128 }),
  tags:           json("tags"),
  aiGarmentName:  varchar("aiGarmentName", { length: 255 }),
  aiCategory:     varchar("aiCategory",    { length: 64  }),
  aiStyleProfile: text("aiStyleProfile"),
  aiPromptSuffix: text("aiPromptSuffix"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

// ─── Shot List Items (auto-generated shot lists per scene) ───────────────────
export const shotListItems = mysqlTable("shotListItems", {
  id:               int("id").autoincrement().primaryKey(),
  projectId:        int("projectId").notNull(),
  userId:           int("userId").notNull(),
  sceneName:        varchar("sceneName",     { length: 255 }).notNull(),
  sceneNumber:      varchar("sceneNumber",   { length: 32  }),
  shotNumber:       varchar("shotNumber",    { length: 16  }).notNull(),
  shotType:         varchar("shotType",      { length: 32  }),
  lensLength:       varchar("lensLength",    { length: 32  }),
  cameraMovement:   varchar("cameraMovement",{ length: 64  }),
  frameDescription: text("frameDescription"),
  action:           text("action"),
  dialogue:         text("dialogue"),
  estimatedDuration:float("estimatedDuration"),
  lightingNote:     text("lightingNote"),
  directorNote:     text("directorNote"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShotListItem   = typeof shotListItems.$inferSelect;
export type InsertShotListItem = typeof shotListItems.$inferInsert;

// ─── Shooting Days (schedule grouped by location) ────────────────────────────
export const shootingDays = mysqlTable("shootingDays", {
  id:             int("id").autoincrement().primaryKey(),
  projectId:      int("projectId").notNull(),
  userId:         int("userId").notNull(),
  dayNumber:      int("dayNumber").notNull(),
  locationName:   varchar("locationName",  { length: 255 }),
  scenes:         json("scenes"),
  callTime:       varchar("callTime",      { length: 16  }),
  wrapTime:       varchar("wrapTime",      { length: 16  }),
  estimatedPages: varchar("estimatedPages",{ length: 32  }),
  notes:          text("notes"),
  lightingWindow: text("lightingWindow"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ShootingDay   = typeof shootingDays.$inferSelect;
export type InsertShootingDay = typeof shootingDays.$inferInsert;


  // ─── Growth Engine Tables (zero-budget v1) ─────────────────────────────────
  // Aligns with VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md spec

  export const growthAudiences = mysqlTable("growth_audiences", {
    id:               int("id").autoincrement().primaryKey(),
    segment:          varchar("segment", { length: 64 }).notNull(), // artists|filmmakers|agencies|small_business|creators|game_dev
    name:             varchar("name", { length: 255 }),
    organisation:     varchar("organisation", { length: 255 }),
    website:          varchar("website", { length: 500 }),
    publicProfileUrl: varchar("public_profile_url", { length: 500 }),
    country:          varchar("country", { length: 128 }),
    email:            varchar("email", { length: 255 }), // optional, only if publicly available
    source:           varchar("source", { length: 128 }).notNull().default("manual"), // csv|manual|landing_page|discovered
    utmSource:        varchar("utm_source", { length: 128 }),
    utmMedium:        varchar("utm_medium", { length: 128 }),
    utmCampaign:      varchar("utm_campaign", { length: 128 }),
    score:            int("score").default(0).notNull(), // 0-100 per scoring rubric
    tags:             json("tags"), // string[]
    notes:            text("notes"),
    status:           varchar("status", { length: 32 }).default("discovered").notNull(),
    // status values: discovered | reviewed | queued | engaged | converted | archived
    createdAt:        timestamp("created_at").defaultNow().notNull(),
    updatedAt:        timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  });
  export type GrowthAudience = typeof growthAudiences.$inferSelect;
  export type InsertGrowthAudience = typeof growthAudiences.$inferInsert;

  export const growthCampaigns = mysqlTable("growth_campaigns", {
    id:           int("id").autoincrement().primaryKey(),
    name:         varchar("name", { length: 255 }).notNull(),
    segment:      varchar("segment", { length: 64 }).notNull(),
    offer:        varchar("offer", { length: 500 }),
    cta:          varchar("cta", { length: 255 }),
    objective:    varchar("objective", { length: 255 }).notNull().default("awareness"),
    channels:     json("channels"), // string[] — reddit|discord|facebook|linkedin|tiktok|instagram|email|x|youtube_shorts
    status:       varchar("status", { length: 32 }).default("draft").notNull(),
    // status: draft | active | paused | completed
    adSpend:      int("ad_spend").default(0).notNull(), // always 0 — zero-budget
    packIdeas:    json("pack_ideas"), // AI-generated headline list
    startDate:    timestamp("start_date"),
    endDate:      timestamp("end_date"),
    metrics:      json("metrics"), // { impressions, clicks, signups, conversions }
    createdAt:    timestamp("created_at").defaultNow().notNull(),
    updatedAt:    timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  });
  export type GrowthCampaign = typeof growthCampaigns.$inferSelect;
  export type InsertGrowthCampaign = typeof growthCampaigns.$inferInsert;

  export const growthAssets = mysqlTable("growth_assets", {
    id:            int("id").autoincrement().primaryKey(),
    campaignId:    int("campaign_id"),
    segment:       varchar("segment", { length: 64 }).notNull(),
    platform:      varchar("platform", { length: 64 }).notNull(),
    // platform: reddit|discord|facebook|linkedin|email|tiktok|instagram|x|youtube_shorts|product_hunt|indie_hackers
    assetType:     varchar("asset_type", { length: 64 }).notNull(),
    // assetType: post|comment|dm_template|story|reel|thread|newsletter|cta_variant|video_prompt|banner
    title:         varchar("title", { length: 255 }),
    headline:      varchar("headline", { length: 512 }),
    body:          text("body").notNull(),
    visualPrompt:  text("visual_prompt"), // Stable Diffusion / DALL-E prompt for any visual
    mediaUrl:      text("media_url"),
    utmUrl:        text("utm_url"), // final CTA link with UTM params
    status:        varchar("status", { length: 32 }).default("draft").notNull(),
    // status: draft | approved | published | rejected
    rejectionNote: text("rejection_note"),
    publishedAt:   timestamp("published_at"),
    publishedUrl:  text("published_url"),
    qualityScore:  int("quality_score").default(0).notNull(),
    impressions:   int("impressions").default(0).notNull(),
    clicks:        int("clicks").default(0).notNull(),
    conversions:   int("conversions").default(0).notNull(),
    createdAt:     timestamp("created_at").defaultNow().notNull(),
    updatedAt:     timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  });
  export type GrowthAsset = typeof growthAssets.$inferSelect;
  export type InsertGrowthAsset = typeof growthAssets.$inferInsert;

  export const growthEvents = mysqlTable("growth_events", {
    id:          int("id").autoincrement().primaryKey(),
    eventType:   varchar("event_type", { length: 64 }).notNull(),
    // eventType: page_view | cta_click | signup | trial_start | referral | email_open | email_click
    source:      varchar("source", { length: 128 }), // utm_source value or channel name
    utmMedium:   varchar("utm_medium", { length: 128 }),
    utmCampaign: varchar("utm_campaign", { length: 128 }),
    utmContent:  varchar("utm_content", { length: 128 }),
    utmTerm:     varchar("utm_term", { length: 128 }),
    segment:     varchar("segment", { length: 64 }),
    page:        varchar("page", { length: 255 }),
    referrer:    text("referrer"),
    userId:      int("user_id"),
    audienceId:  int("audience_id"),
    assetId:     int("asset_id"),
    campaignId:  int("campaign_id"),
    metadata:    json("metadata"),
    ip:          varchar("ip", { length: 45 }),
    createdAt:   timestamp("created_at").defaultNow().notNull(),
  });
  export type GrowthEvent = typeof growthEvents.$inferSelect;
  export type InsertGrowthEvent = typeof growthEvents.$inferInsert;
  

  // ─── BYOK Workflow Tables (v6.90) ────────────────────────────────────────────
  import { decimal as _decimal } from "drizzle-orm/mysql-core";

  export const renderJobs = mysqlTable("renderJobs", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    projectId: int("projectId").notNull(),
    sceneId: int("sceneId"),
    provider: varchar("provider", { length: 64 }).notNull(),
    taskType: mysqlEnum("taskType", ["llm", "image", "video", "voice", "music"]).notNull(),
    status: mysqlEnum("status", ["queued", "submitted", "processing", "completed", "failed"]).default("queued").notNull(),
    externalJobId: varchar("externalJobId", { length: 255 }),
    outputUrl: text("outputUrl"),
    estimatedCostStr: varchar("estimatedCostStr", { length: 32 }),
    actualCostStr: varchar("actualCostStr", { length: 32 }),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  });
  export type RenderJob = typeof renderJobs.$inferSelect;
  export type InsertRenderJob = typeof renderJobs.$inferInsert;

  export const promptPacks = mysqlTable("promptPacks", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    projectId: int("projectId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    packData: json("packData").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  });
  export type PromptPack = typeof promptPacks.$inferSelect;
  export type InsertPromptPack = typeof promptPacks.$inferInsert;
  