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
