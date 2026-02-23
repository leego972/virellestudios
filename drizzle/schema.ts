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
  colorGrading: varchar("colorGrading", { length: 128 }).default("natural"), // preset name or 'custom'
  colorGradingSettings: json("colorGradingSettings"), // { temperature, tint, contrast, saturation, highlights, shadows }
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
  transitionType: varchar("transitionType", { length: 64 }).default("cut"), // cut, fade, dissolve, wipe, etc.
  transitionDuration: float("transitionDuration").default(0.5), // seconds
  colorGrading: varchar("colorGrading", { length: 128 }), // override project-level grading
  productionNotes: text("productionNotes"), // director notes for crew
  soundtrackId: int("soundtrackId"), // per-scene soundtrack
  soundtrackVolume: int("soundtrackVolume").default(80), // 0-100
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

// Soundtracks / background music
export const soundtracks = mysqlTable("soundtracks", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"), // null = project-level soundtrack
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  genre: varchar("genre", { length: 128 }),
  mood: varchar("mood", { length: 128 }), // epic, romantic, tense, upbeat, melancholic, etc.
  fileUrl: text("fileUrl"), // S3 URL for uploaded audio
  fileKey: varchar("fileKey", { length: 512 }), // S3 key
  duration: int("duration"), // in seconds
  startTime: float("startTime").default(0), // when to start playing in the scene (seconds)
  volume: float("volume").default(0.7), // 0.0 - 1.0
  fadeIn: float("fadeIn").default(0), // fade in duration in seconds
  fadeOut: float("fadeOut").default(0), // fade out duration in seconds
  loop: int("loop").default(0), // 0 = no loop, 1 = loop
  notes: text("notes"), // director notes about this track
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Soundtrack = typeof soundtracks.$inferSelect;
export type InsertSoundtrack = typeof soundtracks.$inferInsert;

// Film credits
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: varchar("role", { length: 128 }).notNull(), // Director, Producer, Lead Actor, etc.
  name: varchar("name", { length: 255 }).notNull(),
  characterName: varchar("characterName", { length: 255 }), // for cast members
  orderIndex: int("orderIndex").notNull().default(0),
  section: mysqlEnum("section", ["opening", "closing"]).default("closing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;
