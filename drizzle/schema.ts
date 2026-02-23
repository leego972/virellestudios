import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Film projects
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  mode: mysqlEnum("mode", ["quick", "manual"]).notNull().default("quick"),
  rating: mysqlEnum("rating", ["G", "PG", "PG-13", "R"]).default("PG-13"),
  duration: int("duration"), // in minutes
  genre: varchar("genre", { length: 128 }),
  plotSummary: text("plotSummary"),
  status: mysqlEnum("status", ["draft", "generating", "paused", "completed", "failed"]).default("draft").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  outputUrl: text("outputUrl"),
  progress: int("progress").default(0), // 0-100
  estimatedTime: int("estimatedTime"), // seconds remaining
  resolution: varchar("resolution", { length: 32 }).default("1920x1080"),
  quality: mysqlEnum("quality", ["standard", "high", "ultra"]).default("high"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// Characters for a project
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // null = global library character
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  photoUrl: text("photoUrl"),
  attributes: json("attributes"), // { age, gender, ethnicity, build, etc. }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// Scenes for manual mode
export const scenes = mysqlTable("scenes", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  orderIndex: int("orderIndex").notNull().default(0),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  // Scene parameters
  timeOfDay: mysqlEnum("timeOfDay", ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"]).default("afternoon"),
  weather: mysqlEnum("weather", ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"]).default("clear"),
  lighting: mysqlEnum("lighting", ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"]).default("natural"),
  cameraAngle: mysqlEnum("cameraAngle", ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"]).default("medium"),
  locationType: varchar("locationType", { length: 128 }), // city, forest, beach, etc.
  realEstateStyle: varchar("realEstateStyle", { length: 128 }), // modern mansion, victorian, cabin, etc.
  vehicleType: varchar("vehicleType", { length: 128 }), // sports car, helicopter, etc.
  mood: varchar("mood", { length: 128 }), // tense, romantic, action, etc.
  characterIds: json("characterIds"), // array of character IDs in this scene
  characterPositions: json("characterPositions"), // { characterId: { x, y, action } }
  dialogueText: text("dialogueText"),
  duration: int("duration").default(30), // scene duration in seconds
  thumbnailUrl: text("thumbnailUrl"),
  generatedUrl: text("generatedUrl"),
  status: mysqlEnum("status", ["draft", "generating", "completed", "failed"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Scene = typeof scenes.$inferSelect;
export type InsertScene = typeof scenes.$inferInsert;

// Generation jobs for tracking
export const generationJobs = mysqlTable("generationJobs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"), // null for full-film generation
  type: mysqlEnum("type", ["full-film", "scene", "preview"]).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "paused", "completed", "failed"]).default("queued").notNull(),
  progress: int("progress").default(0),
  estimatedSeconds: int("estimatedSeconds"),
  resultUrl: text("resultUrl"),
  errorMessage: text("errorMessage"),
  metadata: json("metadata"), // additional generation params
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = typeof generationJobs.$inferInsert;

// Movie scripts
export const scripts = mysqlTable("scripts", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).default("Untitled Script").notNull(),
  content: text("content"), // The full script content in structured format
  version: int("version").default(1).notNull(),
  pageCount: int("pageCount").default(0),
  metadata: json("metadata"), // { genre, logline, author, draftNumber, notes }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Script = typeof scripts.$inferSelect;
export type InsertScript = typeof scripts.$inferInsert;
