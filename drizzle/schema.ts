import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
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
  // Story & Narrative fields
  mainPlot: text("mainPlot"), // detailed main storyline
  sidePlots: text("sidePlots"), // secondary storylines
  plotTwists: text("plotTwists"), // key twists and surprises
  characterArcs: text("characterArcs"), // how characters develop through the story
  themes: text("themes"), // central themes and messages
  setting: text("setting"), // world-building, time period, universe details
  actStructure: varchar("actStructure", { length: 64 }).default("three-act"), // three-act, five-act, heros-journey, nonlinear, episodic
  tone: varchar("tone", { length: 128 }), // dark, comedic, suspenseful, romantic, etc.
  targetAudience: varchar("targetAudience", { length: 255 }), // who the film is for
  openingScene: text("openingScene"), // description of the opening
  climax: text("climax"), // description of the climax
  storyResolution: text("storyResolution"), // how the story resolves
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

// Location scout
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  sceneId: int("sceneId"), // null = not assigned to a scene yet
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 512 }),
  locationType: varchar("locationType", { length: 128 }), // city, forest, beach, mansion, warehouse, etc.
  description: text("description"),
  referenceImages: json("referenceImages"), // array of S3 URLs
  notes: text("notes"),
  tags: json("tags"), // array of string tags
  latitude: float("latitude"),
  longitude: float("longitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

// Mood board items
export const moodBoardItems = mysqlTable("moodBoardItems", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["image", "color", "text", "reference"]).notNull().default("image"),
  imageUrl: text("imageUrl"), // S3 URL for images
  text: text("text"), // for text cards and notes
  color: varchar("color", { length: 32 }), // hex color for color swatches
  tags: json("tags"), // array of string tags
  category: varchar("category", { length: 128 }), // colors, images, typography, textures, references
  posX: int("posX").default(0),
  posY: int("posY").default(0),
  width: int("width").default(200),
  height: int("height").default(200),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MoodBoardItem = typeof moodBoardItems.$inferSelect;
export type InsertMoodBoardItem = typeof moodBoardItems.$inferInsert;

// Subtitles
export const subtitles = mysqlTable("subtitles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  language: varchar("language", { length: 32 }).notNull(), // ISO 639-1 code: en, es, fr, etc.
  languageName: varchar("languageName", { length: 128 }).notNull(), // English, Spanish, French, etc.
  entries: json("entries"), // array of { sceneId, startTime, endTime, text }
  isGenerated: int("isGenerated").default(0), // 0 = manual, 1 = AI generated
  isTranslation: int("isTranslation").default(0), // 0 = original, 1 = translated from another language
  sourceLanguage: varchar("sourceLanguage", { length: 32 }), // which language this was translated from
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subtitle = typeof subtitles.$inferSelect;
export type InsertSubtitle = typeof subtitles.$inferInsert;

// Dialogue lines
export const dialogues = mysqlTable("dialogues", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"),
  userId: int("userId").notNull(),
  characterId: int("characterId"),
  characterName: varchar("characterName", { length: 255 }).notNull(),
  line: text("line").notNull(),
  emotion: varchar("emotion", { length: 128 }), // angry, sad, happy, whisper, sarcastic, etc.
  direction: text("direction"), // parenthetical acting direction
  orderIndex: int("orderIndex").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dialogue = typeof dialogues.$inferSelect;
export type InsertDialogue = typeof dialogues.$inferInsert;

// Production budgets
export const budgets = mysqlTable("budgets", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  totalEstimate: float("totalEstimate").default(0),
  currency: varchar("currency", { length: 8 }).default("USD"),
  breakdown: json("breakdown"), // { category: { label, estimate, items: [{ name, cost, notes }] } }
  aiAnalysis: text("aiAnalysis"), // AI-generated budget analysis narrative
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Budget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// Sound effects library
export const soundEffects = mysqlTable("soundEffects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"), // null = project-level / library
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(), // footsteps, weather, vehicles, weapons, nature, ambient, etc.
  fileUrl: text("fileUrl"), // S3 URL for uploaded or preset audio
  fileKey: varchar("fileKey", { length: 512 }),
  duration: float("duration"), // in seconds
  isCustom: int("isCustom").default(0), // 0 = preset, 1 = custom uploaded
  volume: float("volume").default(0.8), // 0.0 - 1.0
  startTime: float("startTime").default(0), // when to play in the scene
  loop: int("loop").default(0), // 0 = no loop, 1 = loop
  tags: json("tags"), // array of string tags
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SoundEffect = typeof soundEffects.$inferSelect;
export type InsertSoundEffect = typeof soundEffects.$inferInsert;

// Project collaborators
export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId"), // null until invite is accepted
  invitedBy: int("invitedBy").notNull(),
  email: varchar("email", { length: 320 }),
  inviteToken: varchar("inviteToken", { length: 128 }).notNull().unique(),
  role: mysqlEnum("collabRole", ["viewer", "editor", "producer", "director"]).default("editor").notNull(),
  status: mysqlEnum("inviteStatus", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

// My Movies library
export const movies = mysqlTable("movies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"), // optional link to a project
  movieTitle: varchar("movieTitle", { length: 255 }), // parent movie title for folder grouping
  title: varchar("title", { length: 255 }).notNull(),
  sceneNumber: int("sceneNumber"), // scene ordering within a movie
  description: text("description"),
  type: mysqlEnum("movieType", ["scene", "trailer", "film"]).notNull().default("scene"),
  fileUrl: text("fileUrl"), // S3 URL for the video file
  fileKey: varchar("fileKey", { length: 512 }), // S3 key
  thumbnailUrl: text("thumbnailUrl"), // poster/thumbnail image
  thumbnailKey: varchar("thumbnailKey", { length: 512 }),
  duration: int("duration"), // in seconds
  fileSize: int("fileSize"), // in bytes
  mimeType: varchar("mimeType", { length: 128 }).default("video/mp4"),
  tags: json("tags"), // array of string tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Movie = typeof movies.$inferSelect;
export type InsertMovie = typeof movies.$inferInsert;

// Director's Assistant chat messages
export const directorChats = mysqlTable("directorChats", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("chatRole", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  actionType: varchar("actionType", { length: 128 }), // e.g. add_sound, cut_scene, add_transition, modify_scene
  actionData: json("actionData"), // JSON with action details and results
  actionStatus: mysqlEnum("actionStatus", ["pending", "executed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DirectorChat = typeof directorChats.$inferSelect;
export type InsertDirectorChat = typeof directorChats.$inferInsert;


// Visual Effects (VFX) / Special Effects library
export const visualEffects = mysqlTable("visualEffects", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  sceneId: int("sceneId"), // null = project-level / library
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(), // explosions, weather, magic, sci-fi, particles, transitions, etc.
  subcategory: varchar("subcategory", { length: 128 }), // more specific classification
  description: text("description"),
  previewUrl: text("previewUrl"), // preview image or video URL
  previewKey: varchar("previewKey", { length: 512 }),
  intensity: float("intensity").default(0.8), // 0.0 - 1.0
  duration: float("duration"), // in seconds
  startTime: float("startTime").default(0), // when to apply in the scene
  layer: mysqlEnum("layer", ["background", "midground", "foreground", "overlay"]).default("overlay"),
  blendMode: varchar("blendMode", { length: 64 }).default("normal"), // normal, screen, multiply, overlay, add
  colorTint: varchar("colorTint", { length: 32 }), // hex color for tinting the effect
  parameters: json("parameters"), // effect-specific parameters { speed, scale, direction, etc. }
  isCustom: int("isCustom").default(0), // 0 = preset, 1 = custom uploaded
  tags: json("tags"), // array of string tags
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VisualEffect = typeof visualEffects.$inferSelect;
export type InsertVisualEffect = typeof visualEffects.$inferInsert;

// Password reset tokens
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
