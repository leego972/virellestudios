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
  // Subscription fields
  subscriptionTier: mysqlEnum("subscriptionTier", ["creator", "pro", "industry"]).default("creator").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "unpaid", "trialing", "none"]).default("none").notNull(),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd"),
  monthlyGenerationsUsed: int("monthlyGenerationsUsed").default(0).notNull(),
  monthlyGenerationsResetAt: timestamp("monthlyGenerationsResetAt"),
  bonusGenerations: int("bonusGenerations").default(0),
  referralCode: varchar("referralCode", { length: 32 }),
  referralStats: json("referralStats"),
  // BYOK (Bring Your Own Key) — user API keys for video generation
  userOpenaiKey: text("userOpenaiKey"),       // OpenAI API key (Sora video + DALL-E images)
  userRunwayKey: text("userRunwayKey"),       // Runway ML API key (Gen-3/Gen-4 video)
  userReplicateKey: text("userReplicateKey"), // Replicate API key (Wan2.1, etc.)
  userFalKey: text("userFalKey"),             // fal.ai API key (HunyuanVideo, Veo3, etc.)
  userLumaKey: text("userLumaKey"),           // Luma AI API key (Dream Machine video)
  userHfToken: text("userHfToken"),           // Hugging Face token (free inference API)
  userElevenlabsKey: text("userElevenlabsKey"), // ElevenLabs API key (AI voice acting)
  userSunoKey: text("userSunoKey"),             // Suno AI API key (AI soundtrack generation)
  userByteplusKey: text("userByteplusKey"),       // BytePlus ModelArk API key (SeedDance video generation)
  preferredVideoProvider: varchar("preferredVideoProvider", { length: 32 }), // runway, openai, replicate, fal, luma, huggingface, seedance
  apiKeysUpdatedAt: timestamp("apiKeysUpdatedAt"),
  // ─── Profile & Business Details ───
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  country: varchar("country", { length: 128 }),
  city: varchar("city", { length: 128 }),
  timezone: varchar("timezone", { length: 64 }),
  // Business / Professional
  companyName: varchar("companyName", { length: 255 }),
  companyWebsite: varchar("companyWebsite", { length: 512 }),
  jobTitle: varchar("jobTitle", { length: 255 }),
  professionalRole: varchar("professionalRole", { length: 128 }), // director, producer, writer, cinematographer, editor, vfx_artist, animator, student, hobbyist, other
  experienceLevel: varchar("experienceLevel", { length: 32 }), // beginner, intermediate, advanced, professional, studio
  industryType: varchar("industryType", { length: 128 }), // film, tv, advertising, music_video, social_media, education, corporate, gaming, other
  teamSize: varchar("teamSize", { length: 32 }), // solo, 2-5, 6-20, 21-50, 50+
  // Creative Profile
  preferredGenres: json("preferredGenres"), // array of genres: action, drama, comedy, horror, sci-fi, etc.
  primaryUseCase: varchar("primaryUseCase", { length: 128 }), // full_films, pre_production, storyboarding, trailers, music_videos, social_content, education, other
  portfolioUrl: varchar("portfolioUrl", { length: 512 }),
  socialLinks: json("socialLinks"), // { imdb, linkedin, instagram, youtube, vimeo, twitter }
  // Discovery & Marketing
  howDidYouHear: varchar("howDidYouHear", { length: 128 }), // google, social_media, friend, blog, producthunt, reddit, youtube, other
  marketingOptIn: boolean("marketingOptIn").default(false),
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  // ─── Content Moderation ───
  isFrozen: boolean("isFrozen").default(false).notNull(),
  frozenReason: text("frozenReason"),
  frozenAt: timestamp("frozenAt"),
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
  cinemaIndustry: varchar("cinemaIndustry", { length: 128 }).default("Hollywood"), // Hollywood, Bollywood, Korean Cinema, etc.
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
  attributes: json("attributes"), // legacy + AI-generated physical attributes
  // ─── Identity & Background ───
  role: varchar("role", { length: 128 }), // hero, villain, mentor, comic relief, etc.
  storyImportance: varchar("storyImportance", { length: 64 }), // lead, supporting, minor, cameo
  screenTime: varchar("screenTime", { length: 64 }), // heavy, moderate, light
  nationality: varchar("nationality", { length: 128 }),
  countryOfOrigin: varchar("countryOfOrigin", { length: 128 }),
  cityOfOrigin: varchar("cityOfOrigin", { length: 128 }),
  dateOfBirth: varchar("dateOfBirth", { length: 64 }), // e.g. "March 15, 1985" or "mid-30s"
  zodiacSign: varchar("zodiacSign", { length: 32 }),
  occupation: varchar("occupation", { length: 255 }),
  educationLevel: varchar("educationLevel", { length: 128 }),
  socialClass: varchar("socialClass", { length: 64 }), // working, middle, upper, royalty, etc.
  religion: varchar("religion", { length: 128 }),
  languages: json("languages"), // ["English", "French", "Arabic"]
  // ─── Personality & Psychology ───
  personality: json("personality"), // { mbti, bigFive, traits: [], temperament }
  arcType: varchar("arcType", { length: 128 }), // hero, anti-hero, tragic, redemption, flat, etc.
  moralAlignment: varchar("moralAlignment", { length: 64 }), // lawful-good, chaotic-neutral, etc.
  emotionalRange: json("emotionalRange"), // ["stoic", "explosive anger", "hidden warmth"]
  backstory: text("backstory"),
  motivations: text("motivations"),
  fears: text("fears"),
  secrets: text("secrets"),
  strengths: json("strengths"), // ["strategic thinker", "physically powerful"]
  weaknesses: json("weaknesses"), // ["trusts too easily", "impulsive"]
  // ─── Speech & Voice ───
  speechPattern: varchar("speechPattern", { length: 255 }), // formal, slang-heavy, poetic, etc.
  accent: varchar("accent", { length: 128 }),
  catchphrase: varchar("catchphrase", { length: 512 }),
  voiceType: varchar("voiceType", { length: 128 }), // deep baritone, high soprano, raspy, etc.
  voiceId: varchar("voiceId", { length: 255 }), // ElevenLabs voice ID
  // ─── Relationships ───
  relationships: json("relationships"), // [{ characterId, type: "ally"|"enemy"|"lover", description }]
  // ─── Environment & Preferences ───
  environmentPreference: varchar("environmentPreference", { length: 255 }), // urban, rural, coastal, etc.
  preferredWeather: varchar("preferredWeather", { length: 128 }),
  preferredSeason: varchar("preferredSeason", { length: 64 }),
  preferredTimeOfDay: varchar("preferredTimeOfDay", { length: 64 }),
  // ─── Abilities & Skills ───
  physicalAbilities: json("physicalAbilities"), // ["martial arts", "parkour"]
  mentalAbilities: json("mentalAbilities"), // ["photographic memory", "hacking"]
  specialSkills: json("specialSkills"), // ["speaks 5 languages", "master chef"]
  // ─── Appearance Details ───
  wardrobe: json("wardrobe"), // { signature: "...", formal: "...", casual: "...", action: "..." }
  // ─── Tier 3: AI Casting & Performance ───
  performanceStyle: varchar("performanceStyle", { length: 128 }), // method-naturalistic, classical-theatrical, etc.
  castingNotes: text("castingNotes"), // director notes for casting this character
  signatureMannerisms: text("signatureMannerisms"), // physical tics, gestures, habits
  voiceDescription: text("voiceDescription"), // detailed voice description for TTS
  isAiActor: boolean("isAiActor").default(false), // true = from AI casting library
  aiActorId: varchar("aiActorId", { length: 128 }), // reference to AI actor library entry
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
  // ─── Camera & Optics ───
  lensType: varchar("lensType", { length: 128 }), // prime, zoom, anamorphic, fisheye, tilt-shift
  focalLength: varchar("focalLength", { length: 64 }), // "24mm wide", "85mm portrait", "135mm telephoto"
  depthOfField: varchar("depthOfField", { length: 64 }), // "shallow f/1.4", "deep focus f/11"
  cameraMovement: varchar("cameraMovement", { length: 128 }), // static, dolly, crane, handheld, steadicam, drone
  shotType: varchar("shotType", { length: 64 }), // establishing, reaction, insert, cutaway, two-shot
  frameRate: varchar("frameRate", { length: 32 }), // 24fps, 30fps, 48fps, 60fps, 120fps slow-mo
  aspectRatio: varchar("aspectRatio", { length: 16 }), // 2.39:1, 1.85:1, 16:9, 4:3
  // ─── Color & Visual Style ───
  colorPalette: varchar("colorPalette", { length: 255 }), // "warm amber and deep shadow"
  colorTemperature: varchar("colorTemperature", { length: 64 }), // warm, cool, neutral, mixed
  // ─── Location & Environment ───
  season: varchar("season", { length: 32 }), // spring, summer, autumn, winter
  country: varchar("country", { length: 128 }),
  city: varchar("city", { length: 128 }),
  locationDetail: text("locationDetail"), // specific address, landmark, or description
  // ─── Composition & Staging ───
  foregroundElements: text("foregroundElements"),
  backgroundElements: text("backgroundElements"),
  characterBlocking: text("characterBlocking"), // where each character stands/moves
  emotionalBeat: varchar("emotionalBeat", { length: 255 }),
  actionDescription: text("actionDescription"), // physical action happening in scene
  // ─── Sound Design ───
  ambientSound: varchar("ambientSound", { length: 255 }), // rain, city traffic, forest birds
  sfxNotes: text("sfxNotes"), // specific sound effects needed
  musicMood: varchar("musicMood", { length: 128 }),
  musicTempo: varchar("musicTempo", { length: 64 }), // slow, moderate, fast, building
  // ─── Dialogue ───
  dialogueLines: json("dialogueLines"), // [{ characterId, characterName, line, emotion, direction }]
  subtitleText: text("subtitleText"),
  // ─── Production ───
  vfxNotes: text("vfxNotes"),
  sfxProductionNotes: text("sfxProductionNotes"),
  visualEffects: json("visualEffects"), // ["explosion", "rain simulation", "lens flare"]
  props: json("props"), // ["vintage pistol", "leather briefcase"]
  wardrobe: json("wardrobe"), // { characterId: "outfit description" }
  makeupNotes: text("makeupNotes"),
  stuntNotes: text("stuntNotes"),
  budgetEstimate: int("budgetEstimate"), // USD estimate for this scene
  shootingDays: float("shootingDays"),
  aiPromptOverride: text("aiPromptOverride"), // director can write exact AI prompt
  // ─── Tier 1: Deterministic Camera & Lens Control ───
  cameraBody: varchar("cameraBody", { length: 128 }), // ARRI ALEXA 65, RED KOMODO, Sony VENICE 2, etc.
  lensBrand: varchar("lensBrand", { length: 128 }), // Zeiss Supreme Prime, Cooke S8/i, etc.
  aperture: varchar("aperture", { length: 16 }), // T1.0, T1.8, T2.8, T5.6, etc.
  // ─── Tier 1: Multi-Shot Sequencing ───
  multiShotEnabled: boolean("multiShotEnabled").default(false),
  multiShotCount: int("multiShotCount").default(1),
  multiShotData: json("multiShotData"), // [{shotIndex, duration, cameraMovement, speedRamp, startFrameUrl, endFrameUrl}]
  // ─── Tier 1: Advanced Character Staging & Emotion Control ───
  characterEmotions: json("characterEmotions"), // { characterId: emotion }
  characterActions: json("characterActions"), // { characterId: action description }
  // ─── Tier 1: 3D Scene Exploration ───
  heroFrameUrl: text("heroFrameUrl"),
  sceneExploreData: json("sceneExploreData"), // { cameraX, cameraY, cameraZ, fov }
  startFrameUrl: text("startFrameUrl"),
  endFrameUrl: text("endFrameUrl"),
  // ─── Tier 2: Genre-Based Motion Logic ───
  genreMotion: varchar("genreMotion", { length: 64 }).default("auto"),
  speedRamp: varchar("speedRamp", { length: 64 }).default("normal"),
  // ─── Tier 2: Visual Style Mode ───
  visualStyle: varchar("visualStyle", { length: 64 }).default("photorealistic"),
  // ─── Tier 2: In-Scene Editing & Retakes ───
  retakeInstructions: text("retakeInstructions"),
  retakeRegion: json("retakeRegion"), // { x, y, width, height }
  retakeCount: int("retakeCount").default(0),
  // ─── Tier 2: Lip-Sync ───
  lipSyncMode: varchar("lipSyncMode", { length: 64 }).default("none"),
  lipSyncAudioUrl: text("lipSyncAudioUrl"),
  // ─── Tier 2: VFX Suite ───
  vfxSuiteOperations: json("vfxSuiteOperations"),
  vfxSuiteOutputUrl: text("vfxSuiteOutputUrl"),
  // ─── Tier 3: Live Action Plate Integration ───
  liveActionPlateUrl: text("liveActionPlateUrl"),
  liveActionCompositeMode: varchar("liveActionCompositeMode", { length: 64 }).default("none"),
  compositeOutputUrl: text("compositeOutputUrl"),
  // ─── External Footage Upload ───
  externalFootageUrl: text("externalFootageUrl"),        // S3 URL for user-uploaded external footage (MP4, MOV, etc.)
  externalFootageType: varchar("externalFootageType", { length: 32 }).default("none"), // none | replace | overlay | reference
  externalFootageLabel: varchar("externalFootageLabel", { length: 255 }), // user-given label for the footage
  thumbnailUrl: text("thumbnailUrl"),
  generatedUrl: text("generatedUrl"),
  videoUrl: text("videoUrl"), // S3 URL for the generated video clip (MP4)
  videoJobId: varchar("videoJobId", { length: 255 }), // job ID for tracking
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

// ============================================================
// SEO BLOG - Auto-generating content engine
// ============================================================
export const blogArticles = mysqlTable("blog_articles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 512 }).notNull(),
  subtitle: varchar("subtitle", { length: 512 }),
  content: text("content").notNull(), // Markdown content
  excerpt: text("excerpt"), // Short summary for listings and meta description
  category: varchar("category", { length: 128 }).notNull(), // ai-filmmaking, cinematography, industry-trends, tutorials, etc.
  tags: json("tags"), // array of string tags for SEO
  coverImageUrl: text("coverImageUrl"),
  coverImageAlt: varchar("coverImageAlt", { length: 512 }),
  // SEO fields
  metaTitle: varchar("metaTitle", { length: 160 }),
  metaDescription: varchar("metaDescription", { length: 320 }),
  canonicalUrl: varchar("canonicalUrl", { length: 512 }),
  // Publishing
  status: mysqlEnum("articleStatus", ["draft", "scheduled", "published", "archived"]).default("draft").notNull(),
  publishedAt: timestamp("publishedAt"),
  scheduledFor: timestamp("scheduledFor"),
  // Engagement tracking
  viewCount: int("viewCount").default(0).notNull(),
  // Generation metadata
  generatedByAI: boolean("generatedByAI").default(true).notNull(),
  generationPrompt: text("generationPrompt"), // The prompt used to generate this article
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BlogArticle = typeof blogArticles.$inferSelect;
export type InsertBlogArticle = typeof blogArticles.$inferInsert;

// ============================================================
// REFERRAL SYSTEM - Autonomous reward tracking
// ============================================================
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // The user who owns this referral code
  code: varchar("code", { length: 32 }).notNull().unique(), // e.g. "LEEGO-XK9F"
  totalReferrals: int("totalReferrals").default(0).notNull(),
  successfulReferrals: int("successfulReferrals").default(0).notNull(), // Referrals that signed up
  bonusGenerationsEarned: int("bonusGenerationsEarned").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

export const referralTracking = mysqlTable("referral_tracking", {
  id: int("id").autoincrement().primaryKey(),
  referralCodeId: int("referralCodeId").notNull(), // Which referral code was used
  referrerId: int("referrerId").notNull(), // The user who referred
  referredUserId: int("referredUserId"), // The user who signed up (null until they register)
  referredEmail: varchar("referredEmail", { length: 320 }),
  status: mysqlEnum("referralStatus", ["clicked", "registered", "rewarded"]).default("clicked").notNull(),
  rewardType: varchar("rewardType", { length: 64 }), // "bonus_generations", "extended_trial", "feature_unlock"
  rewardAmount: int("rewardAmount"), // e.g. 5 bonus generations
  rewardedAt: timestamp("rewardedAt"),
  ipAddress: varchar("ipAddress", { length: 45 }), // For fraud prevention
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = typeof referralTracking.$inferInsert;

// ─── In-App Notifications ───
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("notificationType", [
    "generation_complete", "export_complete", "subscription_change",
    "referral_reward", "system", "welcome", "tip",
  ]).notNull().default("system"),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 512 }), // optional in-app link
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Content Moderation Incidents ───
export const moderationIncidents = mysqlTable("moderationIncidents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull(),
  contentSnippet: text("contentSnippet").notNull(),
  violations: json("violations").notNull(),
  severity: mysqlEnum("severity", ["CRITICAL", "HIGH", "MEDIUM", "LOW"]).notNull().default("LOW"),
  shouldFreeze: boolean("shouldFreeze").notNull().default(false),
  shouldReport: boolean("shouldReport").notNull().default(false),
  status: mysqlEnum("moderationStatus", ["pending_review", "reviewed_cleared", "reviewed_actioned", "reported_to_authorities"]).notNull().default("pending_review"),
  reviewedBy: int("reviewedBy"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ModerationIncident = typeof moderationIncidents.$inferSelect;
export type InsertModerationIncident = typeof moderationIncidents.$inferInsert;
