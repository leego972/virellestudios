import { logger } from "./_core/logger";
import { eq, and, asc, desc, isNull, inArray } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";
import {
  InsertUser, users,
  InsertProject, projects,
  InsertCharacter, characters,
  InsertScene, scenes,
  InsertGenerationJob, generationJobs,
  InsertFrameComment, frameComments, FrameComment,
  InsertScript, scripts,
  InsertSoundtrack, soundtracks,
  InsertCredit, credits,
  InsertLocation, locations,
  InsertMoodBoardItem, moodBoardItems,
  creditTransactions,
  InsertSubtitle, subtitles,
  InsertDialogue, dialogues,
  InsertBudget, budgets,
  InsertSoundEffect, soundEffects,
  InsertCollaborator, collaborators,
  InsertMovie, movies,
  InsertDirectorChat, directorChats,
  InsertPasswordResetToken, passwordResetTokens,
  InsertVisualEffect, visualEffects,
  InsertBlogArticle, blogArticles,
  InsertReferralCode, referralCodes,
  InsertReferralTracking, referralTracking,
  InsertProjectSample, projectSamples, ProjectSample,
    featureCuts, InsertFeatureCut, FeatureCut,
    featureCutScenes, InsertFeatureCutScene, FeatureCutScene,
    filmCompileJobs, InsertFilmCompileJob, FilmCompileJob,
    filmMixSettings, filmAdrTracks, filmFoleyTracks, filmScoreCues,
    // ─── v6.63 Production Spine ───
    shootDays, InsertShootDay, ShootDay,
    crewContacts, InsertCrewContact, CrewContact,
    activityLog, InsertActivityLogEntry, ActivityLogEntry,
    // v6.68 Phase 6 — credit reservations
    creditReservations, InsertCreditReservation, CreditReservation,
    // v6.77 — Per-project brand allow/block list
    projectBrands, InsertProjectBrand, ProjectBrand,
    // v6.77 — Designer Wardrobe section (designer profiles, collections,
    // wardrobe items, and assignments-to-character/scene).
    designerProfiles, InsertDesignerProfile, DesignerProfile,
    designerCollections, InsertDesignerCollection, DesignerCollection,
    wardrobeItems, InsertWardrobeItem, WardrobeItem,
    wardrobeAssignments, InsertWardrobeAssignment, WardrobeAssignment,
    wardrobeLeases, InsertWardrobeLease, WardrobeLease,
  } from "../drizzle/schema";

let _db: MySql2Database<Record<string, unknown>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
        _db = drizzle(pool) as MySql2Database<Record<string, unknown>>;
    } catch (error) {
      logger.warn("[Database] Failed to connect", { error: error instanceof Error ? error.message : String(error) });
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { logger.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    // v6.82: Role authority is database-backed only.
    // Never auto-promote a user to admin from OWNER_OPEN_ID or email.
    // Admin role changes must happen through the protected admin role mutation
    // or a deliberate direct database operation during emergency recovery.
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    if (user.role === 'admin') {
      logger.info(`[Auth] Admin role confirmed for ${user.email || user.openId}`);
    }
  } catch (error) { logger.errorWithStack("[Database] Failed to upsert user", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  phone?: string;
  country?: string;
  city?: string;
  timezone?: string;
  companyName?: string;
  companyWebsite?: string;
  jobTitle?: string;
  professionalRole?: string;
  experienceLevel?: string;
  industryType?: string;
  teamSize?: string;
  preferredGenres?: string[];
  primaryUseCase?: string;
  portfolioUrl?: string;
  socialLinks?: Record<string, string>;
  howDidYouHear?: string;
  marketingOptIn?: boolean;
  stripeCustomerId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${data.email}`; // generate a stable openId from email
  // v6.82: New email users are always standard users.
  // Admin role must be granted through protected admin tooling or direct DB recovery.
  const initialRole = "user";
  
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    role: initialRole,
    lastSignedIn: new Date(),
    phone: data.phone || null,
    country: data.country || null,
    city: data.city || null,
    timezone: data.timezone || null,
    companyName: data.companyName || null,
    companyWebsite: data.companyWebsite || null,
    jobTitle: data.jobTitle || null,
    professionalRole: data.professionalRole || null,
    experienceLevel: data.experienceLevel || null,
    industryType: data.industryType || null,
    teamSize: data.teamSize || null,
    preferredGenres: data.preferredGenres || null,
    primaryUseCase: data.primaryUseCase || null,
    portfolioUrl: data.portfolioUrl || null,
    socialLinks: data.socialLinks || null,
    howDidYouHear: data.howDidYouHear || null,
    marketingOptIn: data.marketingOptIn ?? false,
    stripeCustomerId: data.stripeCustomerId || null,
    onboardingCompleted: true,
  });
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Projects ───
export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  const id = result[0].insertId;
  return (await db.select().from(projects).where(eq(projects.id, id)))[0];
}

export async function getUserProjects(userId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt)).limit(limit);
}

export async function getProjectById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1);
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  return (await db.select().from(projects).where(eq(projects.id, id)))[0];
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Wrap all cascade-deletes in a single transaction so a mid-flight failure
  // never leaves orphaned rows without also leaving the project row intact.
  await db.transaction(async (tx) => {
    await tx.delete(scenes).where(eq(scenes.projectId, id));
    await tx.delete(characters).where(eq(characters.projectId, id));
    await tx.delete(generationJobs).where(eq(generationJobs.projectId, id));
    await tx.delete(scripts).where(eq(scripts.projectId, id));
    await tx.delete(soundtracks).where(eq(soundtracks.projectId, id));
    await tx.delete(credits).where(eq(credits.projectId, id));
    await tx.delete(locations).where(eq(locations.projectId, id));
    await tx.delete(moodBoardItems).where(eq(moodBoardItems.projectId, id));
    await tx.delete(subtitles).where(eq(subtitles.projectId, id));
    await tx.delete(dialogues).where(eq(dialogues.projectId, id));
    await tx.delete(budgets).where(eq(budgets.projectId, id));
    await tx.delete(soundEffects).where(eq(soundEffects.projectId, id));
    await tx.delete(collaborators).where(eq(collaborators.projectId, id));
    await tx.delete(directorChats).where(eq(directorChats.projectId, id));
    await tx.delete(visualEffects).where(eq(visualEffects.projectId, id));
    // v6.x tables: film pipeline, production spine, wardrobe, credit reservations
    await tx.delete(frameComments).where(eq(frameComments.projectId, id));
    await tx.delete(filmMixSettings).where(eq(filmMixSettings.projectId, id));
    await tx.delete(filmAdrTracks).where(eq(filmAdrTracks.projectId, id));
    await tx.delete(filmFoleyTracks).where(eq(filmFoleyTracks.projectId, id));
    await tx.delete(filmScoreCues).where(eq(filmScoreCues.projectId, id));
    await tx.delete(filmCompileJobs).where(eq(filmCompileJobs.projectId, id));
    // featureCutScenes are keyed by cutId — cascade through featureCuts
    await tx.delete(featureCutScenes).where(
      inArray(featureCutScenes.cutId,
        db.select({ id: featureCuts.id }).from(featureCuts).where(eq(featureCuts.projectId, id))
      )
    );
    await tx.delete(featureCuts).where(eq(featureCuts.projectId, id));
    await tx.delete(shootDays).where(eq(shootDays.projectId, id));
    await tx.delete(crewContacts).where(eq(crewContacts.projectId, id));
    await tx.delete(activityLog).where(eq(activityLog.projectId, id));
    await tx.delete(creditReservations).where(eq(creditReservations.projectId, id));
    await tx.delete(projectBrands).where(eq(projectBrands.projectId, id));
    await tx.delete(wardrobeAssignments).where(eq(wardrobeAssignments.projectId, id));
    await tx.delete(wardrobeItems).where(eq(wardrobeItems.projectId, id));
    // Finally delete the project itself (ownership check)
    await tx.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  });
}

// ─── Characters ───
export async function createCharacter(data: InsertCharacter) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(characters).values(data);
  const id = result[0].insertId;
  return (await db.select().from(characters).where(eq(characters.id, id)))[0];
}

export async function getProjectCharacters(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characters).where(eq(characters.projectId, projectId)).orderBy(asc(characters.name));
}

export async function getUserLibraryCharacters(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(characters).where(and(eq(characters.userId, userId), isNull(characters.projectId))).orderBy(asc(characters.name));
}

export async function getCharacterById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(characters).where(eq(characters.id, id)).limit(1);
  return result[0];
}

export async function updateCharacter(id: number, data: Partial<InsertCharacter>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(characters).set(data).where(eq(characters.id, id));
  return (await db.select().from(characters).where(eq(characters.id, id)))[0];
}

export async function deleteCharacter(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Ownership check: only delete if the character belongs to a project owned by userId
  await db.delete(characters).where(
    and(
      eq(characters.id, id),
      inArray(characters.projectId,
        db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId))
      )
    )
  );
}

// ─── Scenes ───
// ─── Enum value sanitization for scene columns ───
const SCENE_ENUM_VALUES: Record<string, { valid: string[]; fallback: string; aliases: Record<string, string> }> = {
  timeOfDay: {
    valid: ["dawn", "morning", "afternoon", "evening", "night", "golden-hour"],
    fallback: "afternoon",
    aliases: {
      "day": "afternoon", "daytime": "afternoon", "midday": "afternoon", "noon": "afternoon",
      "dusk": "evening", "sunset": "golden-hour", "sunrise": "dawn", "twilight": "evening",
      "late afternoon": "golden-hour", "early morning": "dawn", "late night": "night",
      "nighttime": "night", "midnight": "night", "golden hour": "golden-hour",
    },
  },
  weather: {
    valid: ["clear", "cloudy", "rainy", "stormy", "snowy", "foggy", "windy"],
    fallback: "clear",
    aliases: {
      "sunny": "clear", "overcast": "cloudy", "rain": "rainy", "storm": "stormy",
      "snow": "snowy", "fog": "foggy", "wind": "windy", "partly cloudy": "cloudy",
      "misty": "foggy", "hazy": "foggy", "drizzle": "rainy", "thunderstorm": "stormy",
    },
  },
  lighting: {
    valid: ["natural", "dramatic", "soft", "neon", "candlelight", "studio", "backlit", "silhouette"],
    fallback: "natural",
    aliases: {
      "ambient": "natural", "harsh": "dramatic", "warm": "soft", "fluorescent": "studio",
      "dim": "candlelight", "low": "candlelight", "bright": "natural", "moody": "dramatic",
      "cinematic": "dramatic", "golden": "natural", "neon-lit": "neon",
    },
  },
  cameraAngle: {
    valid: ["wide", "medium", "close-up", "extreme-close-up", "birds-eye", "low-angle", "dutch-angle", "over-shoulder", "pov"],
    fallback: "medium",
    aliases: {
      "closeup": "close-up", "close up": "close-up", "extreme close-up": "extreme-close-up",
      "extreme closeup": "extreme-close-up", "bird's eye": "birds-eye", "bird's-eye": "birds-eye",
      "aerial": "birds-eye", "overhead": "birds-eye", "low angle": "low-angle",
      "high angle": "birds-eye", "dutch angle": "dutch-angle", "tilted": "dutch-angle",
      "over the shoulder": "over-shoulder", "ots": "over-shoulder", "first person": "pov",
      "establishing": "wide", "full shot": "wide", "medium shot": "medium",
      "tracking": "medium", "tracking shot": "medium",
    },
  },
};

function sanitizeEnumValue(column: string, value: unknown): unknown {
  const enumDef = SCENE_ENUM_VALUES[column];
  if (!enumDef || typeof value !== "string") return value;
  const lower = value.toLowerCase().trim();
  // Check if already valid
  if (enumDef.valid.includes(lower)) return lower;
  // Check aliases
  if (enumDef.aliases[lower]) return enumDef.aliases[lower];
  // Fuzzy match: check if any valid value is contained in the input
  for (const v of enumDef.valid) {
    if (lower.includes(v) || v.includes(lower)) return v;
  }
  logger.warn(`[createScene] Sanitizing ${column}: "${value}" -> "${enumDef.fallback}" (not a valid enum value)`);
  return enumDef.fallback;
}

export async function createScene(data: InsertScene) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Sanitize enum values before building the INSERT
  const sanitizedData = { ...data } as Record<string, unknown>;
  for (const col of Object.keys(SCENE_ENUM_VALUES)) {
    if (col in sanitizedData && sanitizedData[col] !== undefined && sanitizedData[col] !== null) {
      sanitizedData[col] = sanitizeEnumValue(col, sanitizedData[col]);
    }
  }
  
  // Build a minimal INSERT with only the columns that are explicitly provided.
  // Uses Drizzle's sql template tag for proper parameterization.
  const entries = Object.entries(sanitizedData).filter(
    ([_, v]) => v !== undefined
  );
  if (entries.length === 0) throw new Error("No data to insert");
  
  const columns = entries.map(([k]) => k);
  const vals = entries.map(([_, v]) => {
    if (v === null) return null;
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });
  
  // Build: INSERT INTO scenes (`col1`, `col2`) VALUES (val1, val2)
  const colsSql = sql.raw(columns.map(c => `\`${c}\``).join(", "));
  const valChunks = vals.map(v => sql`${v}`);
  const valsSql = sql.join(valChunks, sql.raw(", "));
  
  try {
    const insertResult = await db.execute(
      sql`INSERT INTO scenes (${colsSql}) VALUES (${valsSql})`
    );
    const id = (insertResult as any)[0]?.insertId;
    if (!id) throw new Error("Failed to get insert ID");
    const [rows] = await db.execute(sql`SELECT * FROM scenes WHERE id = ${id} LIMIT 1`);
    return (rows as unknown as any[])?.[0];
  } catch (err: any) {
    // Capture MySQL-specific error details with full context
    const sqlMsg = err.sqlMessage || err.message || 'no message';
    const code = err.code || err.errno || 'UNKNOWN';
    const fullErr = JSON.stringify({ code: err.code, errno: err.errno, sqlState: err.sqlState, sqlMessage: err.sqlMessage, message: err.message?.slice(0, 300) });
    logger.errorWithStack("[createScene] Full error", fullErr);
    logger.error("[createScene] Columns attempted", { columns });
    throw new Error(`Scene insert failed [${code}]: ${sqlMsg}. Debug: ${fullErr}`);
  }
}

export async function getProjectScenes(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  const [rows] = await db.execute(sql`SELECT * FROM scenes WHERE projectId = ${projectId} ORDER BY orderIndex ASC`);
  return rows as unknown as any[];
}

export async function getSceneById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [rows] = await db.execute(sql`SELECT * FROM scenes WHERE id = ${id} LIMIT 1`);
  return (rows as unknown as any[])?.[0];
}

export async function updateScene(id: number, data: Partial<InsertScene>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Use raw SQL to only update columns that are explicitly provided
  const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) return getSceneById(id);
  const setClauses = entries.map(([k]) => `\`${k}\` = ?`).join(", ");
  const values = entries.map(([_, v]) => {
    if (v === null) return null;
    if (typeof v === "object") return JSON.stringify(v);
    if (typeof v === "boolean") return v ? 1 : 0;
    return v;
  });
  const setSQL = entries.map(([k], i) => sql`${sql.raw(`\`${k}\``)} = ${values[i]}`).reduce((acc, s, i) => i === 0 ? s : sql`${acc}, ${s}`);
  await db.execute(sql`UPDATE scenes SET ${setSQL} WHERE id = ${id}`);
  return getSceneById(id);
}

export async function deleteScene(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scenes).where(eq(scenes.id, id));
}

export async function reorderScenes(projectId: number, sceneIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < sceneIds.length; i++) {
    await db.update(scenes).set({ orderIndex: i }).where(and(eq(scenes.id, sceneIds[i]), eq(scenes.projectId, projectId)));
  }
}

// ─── Generation Jobs ───
export async function createGenerationJob(data: InsertGenerationJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(generationJobs).values(data);
  const id = result[0].insertId;
  return (await db.select().from(generationJobs).where(eq(generationJobs.id, id)))[0];
}

export async function getProjectJobs(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generationJobs).where(eq(generationJobs.projectId, projectId)).orderBy(desc(generationJobs.createdAt));
}

/**
 * Returns every in-flight render across ALL projects owned by the user —
 * powers the global Render Queue tray in the top bar so users can see, at a
 * glance, what is processing and (roughly) how long it's been running.
 *
 * Combines two work surfaces:
 *  - generationJobs rows with status in (queued|processing|paused)
 *  - scenes with status = "generating" (these are submitted-but-not-tracked-by-job
 *    requests, e.g. direct Runway/Veo3 submissions handled by videoJobWorker)
 */
export async function getUserActiveRenders(userId: number) {
  const db = await getDb();
  if (!db) return [] as Array<any>;

  const userProjects = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(eq(projects.userId, userId));
  if (userProjects.length === 0) return [] as Array<any>;
  const projectIds = userProjects.map((p) => p.id);
  const titleById = new Map(userProjects.map((p) => [p.id, p.title]));

  const [activeJobs, generatingScenes] = await Promise.all([
    db
      .select()
      .from(generationJobs)
      .where(
        and(
          inArray(generationJobs.projectId, projectIds),
          inArray(generationJobs.status, ["queued", "processing", "paused"])
        )
      ),
    db
      .select({
        id: scenes.id,
        projectId: scenes.projectId,
        title: scenes.title,
        duration: scenes.duration,
        status: scenes.status,
        videoJobId: scenes.videoJobId,
        updatedAt: scenes.updatedAt,
        createdAt: scenes.createdAt,
      })
      .from(scenes)
      .where(
        and(inArray(scenes.projectId, projectIds), eq(scenes.status, "generating"))
      ),
  ]);

  const now = Date.now();
  const out: Array<any> = [];

  for (const j of activeJobs) {
    const startedMs = (j.createdAt as Date)?.getTime?.() ?? now;
    out.push({
      kind: "job" as const,
      id: j.id,
      projectId: j.projectId,
      sceneId: j.sceneId,
      projectTitle: titleById.get(j.projectId) || "Untitled project",
      label:
        j.type === "full-film"
          ? "Full film render"
          : j.type === "scene"
            ? "Scene render"
            : "Preview render",
      status: j.status,
      progress: typeof j.progress === "number" ? j.progress : 0,
      estimatedSeconds: j.estimatedSeconds ?? null,
      elapsedSeconds: Math.max(0, Math.floor((now - startedMs) / 1000)),
      startedAt: j.createdAt,
    });
  }

  for (const s of generatingScenes) {
    // Scene-level generations don't carry a structured progress %, so we
    // surface them as indeterminate but with elapsed time for honest signal.
    const startedMs = (s.updatedAt as Date)?.getTime?.() ?? now;
    out.push({
      kind: "scene" as const,
      id: s.id,
      projectId: s.projectId,
      sceneId: s.id,
      projectTitle: titleById.get(s.projectId) || "Untitled project",
      label: s.title || `Scene ${s.id}`,
      status: "processing",
      progress: null, // indeterminate
      estimatedSeconds: s.duration ?? null,
      elapsedSeconds: Math.max(0, Math.floor((now - startedMs) / 1000)),
      startedAt: s.updatedAt,
    });
  }

  // Newest first — matches user mental model ("the thing I just kicked off")
  out.sort((a, b) => {
    const at = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bt = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bt - at;
  });

  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Frame-timestamp comments (v6.62)
// ──────────────────────────────────────────────────────────────────────────

/** List comments for a clip — pass either sceneId OR movieId. */
export async function listFrameComments(opts: {
  projectId: number;
  sceneId?: number | null;
  movieId?: number | null;
}): Promise<FrameComment[]> {
  const db = await getDb();
  if (!db) return [];
  const conds = [eq(frameComments.projectId, opts.projectId)];
  if (opts.sceneId != null) conds.push(eq(frameComments.sceneId, opts.sceneId));
  if (opts.movieId != null) conds.push(eq(frameComments.movieId, opts.movieId));
  return db
    .select()
    .from(frameComments)
    .where(and(...conds))
    .orderBy(asc(frameComments.timestampSeconds), asc(frameComments.id));
}

export async function createFrameComment(payload: InsertFrameComment): Promise<FrameComment> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(frameComments).values(payload);
  const id = (result as any)[0]?.insertId ?? (result as any).insertId;
  const rows = await db.select().from(frameComments).where(eq(frameComments.id, id)).limit(1);
  return rows[0];
}

/** Update a comment — only the original author may edit body/resolved state. */
export async function updateFrameComment(
  id: number,
  userId: number,
  patch: Partial<Pick<FrameComment, "body" | "resolved">>
): Promise<FrameComment | null> {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(frameComments).where(eq(frameComments.id, id)).limit(1);
  if (!existing[0]) return null;
  // Owners of the project may resolve any comment, but only the author may edit body.
  if (patch.body !== undefined && existing[0].userId !== userId) return null;
  const project = await getProjectById(existing[0].projectId, userId);
  if (!project) return null;
  await db.update(frameComments).set(patch as any).where(eq(frameComments.id, id));
  const rows = await db.select().from(frameComments).where(eq(frameComments.id, id)).limit(1);
  return rows[0];
}

/** Delete a comment — author OR project owner may delete. */
export async function deleteFrameComment(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const existing = await db.select().from(frameComments).where(eq(frameComments.id, id)).limit(1);
  if (!existing[0]) return false;
  const project = await getProjectById(existing[0].projectId, userId);
  if (!project && existing[0].userId !== userId) return false;
  await db.delete(frameComments).where(eq(frameComments.id, id));
  return true;
}

// ──────────────────────────────────────────────────────────────────────────

/**
 * Cancel a single in-flight render (one row in the queue tray).
 * Validates ownership through the parent project before touching state.
 * Returns { ok: true } regardless of whether the row was already finished
 * — making the UI happy-path simple.
 */
export async function cancelUserRender(
  userId: number,
  kind: "job" | "scene",
  id: number
) {
  const db = await getDb();
  if (!db) return { ok: false };

  if (kind === "job") {
    const rows = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
    const job = rows[0];
    if (!job) return { ok: false };
    const project = await getProjectById(job.projectId, userId);
    if (!project) return { ok: false };
    await db
      .update(generationJobs)
      .set({ status: "failed", errorMessage: "Cancelled by user" })
      .where(eq(generationJobs.id, id));
    return { ok: true };
  }

  // kind === "scene"
  const sceneRows = await db.select().from(scenes).where(eq(scenes.id, id)).limit(1);
  const scene = sceneRows[0];
  if (!scene) return { ok: false };
  const project = await getProjectById(scene.projectId, userId);
  if (!project) return { ok: false };
  await db.update(scenes).set({ status: "failed" } as any).where(eq(scenes.id, id));
  return { ok: true };
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generationJobs).where(eq(generationJobs.id, id)).limit(1);
  return result[0];
}

export async function updateJob(id: number, data: Partial<InsertGenerationJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(generationJobs).set(data).where(eq(generationJobs.id, id));
  return (await db.select().from(generationJobs).where(eq(generationJobs.id, id)))[0];
}

// ─── Scripts ───
export async function createScript(data: InsertScript) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scripts).values(data);
  const id = result[0].insertId;
  return (await db.select().from(scripts).where(eq(scripts.id, id)))[0];
}

export async function getProjectScripts(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scripts).where(eq(scripts.projectId, projectId)).orderBy(desc(scripts.updatedAt));
}

export async function getScriptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  return result[0];
}

export async function updateScript(id: number, userId: number, data: Partial<InsertScript>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scripts).set(data).where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
  return (await db.select().from(scripts).where(eq(scripts.id, id)))[0];
}

export async function deleteScript(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scripts).where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
}

// ─── Soundtracks ───
export async function createSoundtrack(data: InsertSoundtrack) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(soundtracks).values(data);
  const id = result[0].insertId;
  return (await db.select().from(soundtracks).where(eq(soundtracks.id, id)))[0];
}

export async function getProjectSoundtracks(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soundtracks).where(and(eq(soundtracks.projectId, projectId), isNull(soundtracks.sceneId))).orderBy(desc(soundtracks.createdAt));
}

export async function getSceneSoundtracks(sceneId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soundtracks).where(eq(soundtracks.sceneId, sceneId)).orderBy(asc(soundtracks.startTime));
}

export async function getSoundtrackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(soundtracks).where(eq(soundtracks.id, id)).limit(1);
  return result[0];
}

export async function updateSoundtrack(id: number, userId: number, data: Partial<InsertSoundtrack>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(soundtracks).set(data).where(and(eq(soundtracks.id, id), eq(soundtracks.userId, userId)));
  return (await db.select().from(soundtracks).where(eq(soundtracks.id, id)))[0];
}

export async function deleteSoundtrack(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(soundtracks).where(and(eq(soundtracks.id, id), eq(soundtracks.userId, userId)));
}

export async function deleteProjectSoundtracks(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(soundtracks).where(eq(soundtracks.projectId, projectId));
}

// ─── Credits ───
export async function createCredit(data: InsertCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(credits).values(data);
  const id = result[0].insertId;
  return (await db.select().from(credits).where(eq(credits.id, id)))[0];
}

export async function getProjectCredits(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(credits).where(eq(credits.projectId, projectId)).orderBy(asc(credits.orderIndex));
}

export async function getCreditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(credits).where(eq(credits.id, id)).limit(1);
  return result[0];
}

export async function updateCredit(id: number, data: Partial<InsertCredit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(credits).set(data).where(eq(credits.id, id));
  return (await db.select().from(credits).where(eq(credits.id, id)))[0];
}

export async function deleteCredit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(credits).where(eq(credits.id, id));
}

export async function deleteProjectCredits(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(credits).where(eq(credits.projectId, projectId));
}

// ─── Project Duplication ───
export async function duplicateProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get original project
  const original = await getProjectById(projectId, userId);
  if (!original) throw new Error("Project not found");

  // Create new project (then duplicate children); if any step fails, clean up the
  // partially-created project so the user is never left with a broken copy.
  const newProject = await createProject({
    userId,
    title: `${original.title} (Copy)`,
    description: original.description,
    mode: original.mode,
    rating: original.rating,
    duration: original.duration,
    genre: original.genre,
    plotSummary: original.plotSummary,
    status: "draft",
    resolution: original.resolution,
    quality: original.quality,
    colorGrading: original.colorGrading,
    colorGradingSettings: original.colorGradingSettings,
  });
  
  // Duplicate characters
  const origChars = await getProjectCharacters(projectId);
  const charIdMap = new Map<number, number>();
  for (const char of origChars) {
    const newChar = await createCharacter({
      userId,
      projectId: newProject.id,
      name: char.name,
      description: char.description,
      photoUrl: char.photoUrl,
      attributes: char.attributes,
    });
    charIdMap.set(char.id, newChar.id);
  }
  
  // Duplicate scenes
  const origScenes = await getProjectScenes(projectId);
  for (const scene of origScenes) {
    const newCharIds = (scene.characterIds as number[] || []).map(id => charIdMap.get(id) || id);
    await createScene({
      projectId: newProject.id,
      orderIndex: scene.orderIndex,
      title: scene.title,
      description: scene.description,
      timeOfDay: scene.timeOfDay,
      weather: scene.weather,
      lighting: scene.lighting,
      cameraAngle: scene.cameraAngle,
      locationType: scene.locationType,
      realEstateStyle: scene.realEstateStyle,
      vehicleType: scene.vehicleType,
      mood: scene.mood,
      characterIds: newCharIds,
      characterPositions: scene.characterPositions,
      dialogueText: scene.dialogueText,
      duration: scene.duration,
      transitionType: scene.transitionType,
      transitionDuration: scene.transitionDuration,
      colorGrading: scene.colorGrading,
      productionNotes: scene.productionNotes,
      status: "draft",
    });
  }
  
  // Duplicate soundtracks
  const origSoundtracks = await getProjectSoundtracks(projectId);
  for (const st of origSoundtracks) {
    await createSoundtrack({
      projectId: newProject.id,
      userId,
      title: st.title,
      artist: st.artist,
      genre: st.genre,
      mood: st.mood,
      fileUrl: st.fileUrl,
      fileKey: st.fileKey,
      duration: st.duration,
      volume: st.volume,
      fadeIn: st.fadeIn,
      fadeOut: st.fadeOut,
      loop: st.loop,
      notes: st.notes,
    });
  }
  
  // Duplicate credits
  const origCredits = await getProjectCredits(projectId);
  for (const cr of origCredits) {
    await createCredit({
      projectId: newProject.id,
      userId,
      role: cr.role,
      name: cr.name,
      characterName: cr.characterName,
      orderIndex: cr.orderIndex,
      section: cr.section,
    });
  }
  
  return newProject;
}

// ─── Locations ───
export async function createLocation(data: InsertLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(locations).values(data);
  const id = result[0].insertId;
  return (await db.select().from(locations).where(eq(locations.id, id)))[0];
}

export async function getProjectLocations(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(locations).where(eq(locations.projectId, projectId)).orderBy(desc(locations.createdAt));
}

export async function getLocationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  return result[0];
}

export async function updateLocation(id: number, data: Partial<InsertLocation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(locations).set(data).where(eq(locations.id, id));
  return (await db.select().from(locations).where(eq(locations.id, id)))[0];
}

export async function deleteLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(locations).where(eq(locations.id, id));
}

// ─── Mood Board ───
export async function createMoodBoardItem(data: InsertMoodBoardItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(moodBoardItems).values(data);
  const id = result[0].insertId;
  return (await db.select().from(moodBoardItems).where(eq(moodBoardItems.id, id)))[0];
}

export async function getProjectMoodBoard(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(moodBoardItems).where(eq(moodBoardItems.projectId, projectId)).orderBy(desc(moodBoardItems.createdAt));
}

export async function getMoodBoardItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(moodBoardItems).where(eq(moodBoardItems.id, id)).limit(1);
  return result[0];
}

export async function updateMoodBoardItem(id: number, data: Partial<InsertMoodBoardItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(moodBoardItems).set(data).where(eq(moodBoardItems.id, id));
  return (await db.select().from(moodBoardItems).where(eq(moodBoardItems.id, id)))[0];
}

export async function deleteMoodBoardItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(moodBoardItems).where(eq(moodBoardItems.id, id));
}

// ─── Subtitles ───
export async function createSubtitle(data: InsertSubtitle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(subtitles).values(data);
  const id = result[0].insertId;
  return (await db.select().from(subtitles).where(eq(subtitles.id, id)))[0];
}

export async function getProjectSubtitles(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subtitles).where(eq(subtitles.projectId, projectId)).orderBy(asc(subtitles.languageName));
}

export async function getSubtitleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subtitles).where(eq(subtitles.id, id)).limit(1);
  return result[0];
}

export async function updateSubtitle(id: number, data: Partial<InsertSubtitle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(subtitles).set(data).where(eq(subtitles.id, id));
  return (await db.select().from(subtitles).where(eq(subtitles.id, id)))[0];
}

export async function deleteSubtitle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subtitles).where(eq(subtitles.id, id));
}

// ─── Dialogues ───
export async function createDialogue(data: InsertDialogue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dialogues).values(data);
  const id = result[0].insertId;
  return (await db.select().from(dialogues).where(eq(dialogues.id, id)))[0];
}

export async function getProjectDialogues(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dialogues).where(eq(dialogues.projectId, projectId)).orderBy(asc(dialogues.orderIndex));
}

export async function getSceneDialogues(sceneId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dialogues).where(eq(dialogues.sceneId, sceneId)).orderBy(asc(dialogues.orderIndex));
}

/** Alias of getSceneDialogues — returns all dialogue rows for a scene (singular form used by wiseAssistantEngine). */
export async function getSceneDialogue(sceneId: number) {
  return getSceneDialogues(sceneId);
}

export async function getDialogueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dialogues).where(eq(dialogues.id, id)).limit(1);
  return result[0];
}

export async function updateDialogue(id: number, data: Partial<InsertDialogue>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dialogues).set(data).where(eq(dialogues.id, id));
  return (await db.select().from(dialogues).where(eq(dialogues.id, id)))[0];
}

export async function deleteDialogue(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dialogues).where(eq(dialogues.id, id));
}

export async function deleteProjectDialogues(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dialogues).where(eq(dialogues.projectId, projectId));
}

// ─── Budgets ───
export async function createBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(budgets).values(data);
  const id = result[0].insertId;
  return (await db.select().from(budgets).where(eq(budgets.id, id)))[0];
}

export async function getProjectBudgets(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(budgets).where(eq(budgets.projectId, projectId)).orderBy(desc(budgets.createdAt));
}

export async function getBudgetById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(budgets).where(eq(budgets.id, id)).limit(1);
  return result[0];
}

export async function updateBudget(id: number, data: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(budgets).set(data).where(eq(budgets.id, id));
  return (await db.select().from(budgets).where(eq(budgets.id, id)))[0];
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(budgets).where(eq(budgets.id, id));
}

// ─── Sound Effects ───
export async function createSoundEffect(data: InsertSoundEffect) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(soundEffects).values(data);
  const rows = await db.select().from(soundEffects).where(eq(soundEffects.projectId, data.projectId)).orderBy(soundEffects.id);
  return rows[rows.length - 1];
}

export async function listSoundEffectsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soundEffects).where(eq(soundEffects.projectId, projectId)).orderBy(soundEffects.category, soundEffects.name);
}

export async function listSoundEffectsByScene(sceneId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(soundEffects).where(eq(soundEffects.sceneId, sceneId)).orderBy(soundEffects.startTime);
}

export async function getSoundEffectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(soundEffects).where(eq(soundEffects.id, id)).limit(1);
  return rows[0];
}

export async function updateSoundEffect(id: number, data: Partial<InsertSoundEffect>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(soundEffects).set(data).where(eq(soundEffects.id, id));
  const rows = await db.select().from(soundEffects).where(eq(soundEffects.id, id));
  return rows[0];
}

export async function deleteSoundEffect(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(soundEffects).where(eq(soundEffects.id, id));
}

// ─── Visual Effects ───
export async function createVisualEffect(data: InsertVisualEffect) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(visualEffects).values(data);
  const rows = await db.select().from(visualEffects).where(eq(visualEffects.projectId, data.projectId)).orderBy(visualEffects.id);
  return rows[rows.length - 1];
}

export async function listVisualEffectsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visualEffects).where(eq(visualEffects.projectId, projectId)).orderBy(visualEffects.category, visualEffects.name);
}

export async function listVisualEffectsByScene(sceneId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visualEffects).where(eq(visualEffects.sceneId, sceneId)).orderBy(visualEffects.startTime);
}

export async function getVisualEffectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(visualEffects).where(eq(visualEffects.id, id)).limit(1);
  return rows[0];
}

export async function updateVisualEffect(id: number, data: Partial<InsertVisualEffect>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(visualEffects).set(data).where(eq(visualEffects.id, id));
  const rows = await db.select().from(visualEffects).where(eq(visualEffects.id, id));
  return rows[0];
}

export async function deleteVisualEffect(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(visualEffects).where(eq(visualEffects.id, id));
}

// ─── Collaborators ───
export async function createCollaborator(data: InsertCollaborator) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(collaborators).values(data);
  const rows = await db.select().from(collaborators).where(eq(collaborators.inviteToken, data.inviteToken));
  return rows[0];
}

export async function listCollaboratorsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collaborators).where(eq(collaborators.projectId, projectId)).orderBy(collaborators.createdAt);
}

export async function getCollaboratorByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(collaborators).where(eq(collaborators.inviteToken, token));
  return rows[0];
}

export async function getCollaboratorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(collaborators).where(eq(collaborators.id, id));
  return rows[0];
}

export async function updateCollaborator(id: number, data: Partial<InsertCollaborator>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(collaborators).set(data).where(eq(collaborators.id, id));
  const rows = await db.select().from(collaborators).where(eq(collaborators.id, id));
  return rows[0];
}

export async function deleteCollaborator(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(collaborators).where(eq(collaborators.id, id));
}

// ─── Movies ───
export async function createMovie(data: InsertMovie) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(movies).values(data);
  const id = result[0].insertId;
  return (await db.select().from(movies).where(eq(movies.id, id)))[0];
}

export async function getUserMovies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movies).where(eq(movies.userId, userId)).orderBy(desc(movies.updatedAt));
}

export async function getMovieById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(movies).where(and(eq(movies.id, id), eq(movies.userId, userId))).limit(1);
  return result[0];
}

export async function updateMovie(id: number, userId: number, data: Partial<InsertMovie>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(movies).set(data).where(and(eq(movies.id, id), eq(movies.userId, userId)));
  return (await db.select().from(movies).where(eq(movies.id, id)))[0];
}

export async function deleteMovie(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(movies).where(and(eq(movies.id, id), eq(movies.userId, userId)));
}

// Director Chat helpers
export async function createChatMessage(data: InsertDirectorChat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(directorChats).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getProjectChatHistory(projectId: number, userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(directorChats)
    .where(and(eq(directorChats.projectId, projectId), eq(directorChats.userId, userId)))
    .orderBy(desc(directorChats.createdAt))
    .limit(limit);
}

export async function clearProjectChat(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(directorChats)
    .where(and(eq(directorChats.projectId, projectId), eq(directorChats.userId, userId)));
}


// ─── Password Reset Tokens ───
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return { userId, token, expiresAt };
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function markTokenUsed(tokenId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, tokenId));
}

// v6.68 — generic patch helper used by BYOK Control Center to persist
// preferredVideoProvider / preferredLlmProvider without going through the
// older role/password-specific helpers.
export async function updateUser(userId: number, patch: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(patch as any).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Admin User Management ───
export async function getAllUsers() {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      // Profile fields from registration
      phone: users.phone,
      companyName: users.companyName,
      companyWebsite: users.companyWebsite,
      jobTitle: users.jobTitle,
      professionalRole: users.professionalRole,
      experienceLevel: users.experienceLevel,
      industryType: users.industryType,
      teamSize: users.teamSize,
      preferredGenres: users.preferredGenres,
      primaryUseCase: users.primaryUseCase,
      portfolioUrl: users.portfolioUrl,
      howDidYouHear: users.howDidYouHear,
      marketingOptIn: users.marketingOptIn,
      // Subscription & credits
      subscriptionTier: users.subscriptionTier,
      subscriptionStatus: users.subscriptionStatus,
      creditBalance: users.creditBalance,
      stripeCustomerId: users.stripeCustomerId,
    }).from(users).orderBy(desc(users.createdAt));
  }

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Subscription ───
export async function updateUserSubscription(userId: number, data: {
  subscriptionTier?: "amateur" | "independent" | "creator" | "studio" | "pro" | "industry";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "unpaid" | "trialing" | "none";
  subscriptionCurrentPeriodEnd?: Date | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getUserByStripeCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  return user ?? null;
}

export async function incrementGenerationCount(userId: number) {
  const db = await getDb();
  if (!db) return;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const now = new Date();
  const resetAt = user.monthlyGenerationsResetAt;

  // If no reset date or past reset date, reset counter
  if (!resetAt || now > new Date(resetAt)) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await db.update(users).set({
      monthlyGenerationsUsed: 1,
      monthlyGenerationsResetAt: nextReset,
    }).where(eq(users.id, userId));
  } else {
    await db.update(users).set({
      monthlyGenerationsUsed: (user.monthlyGenerationsUsed || 0) + 1,
    }).where(eq(users.id, userId));
  }
}

/**
 * Reset the monthly generation counter for a user.
 * Called on subscription activation, upgrade, or renewal to give fresh quota.
 */
export async function resetGenerationCounter(userId: number) {
  const db = await getDb();
  if (!db) return;
  const nextReset = new Date();
  nextReset.setMonth(nextReset.getMonth() + 1);
  nextReset.setDate(1);
  nextReset.setHours(0, 0, 0, 0);
  await db.update(users).set({
    monthlyGenerationsUsed: 0,
    monthlyGenerationsResetAt: nextReset,
  }).where(eq(users.id, userId));
}

export async function getUserProjectCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(projects).where(eq(projects.userId, userId));
  return result.length;
}

export async function getUserMovieCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(movies).where(eq(movies.userId, userId));
  return result.length;
}

// ─── Blog Articles ───
export async function createBlogArticle(data: InsertBlogArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(blogArticles).values(data);
  const id = result[0].insertId;
  return (await db.select().from(blogArticles).where(eq(blogArticles.id, id)))[0];
}

export async function getPublishedArticles(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogArticles)
    .where(eq(blogArticles.status, "published"))
    .orderBy(desc(blogArticles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getArticleBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(blogArticles).where(eq(blogArticles.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getArticlesByCategory(category: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogArticles)
    .where(and(eq(blogArticles.category, category), eq(blogArticles.status, "published")))
    .orderBy(desc(blogArticles.publishedAt))
    .limit(limit);
}

export async function incrementArticleViews(id: number) {
  const db = await getDb();
  if (!db) return;
  const article = await db.select().from(blogArticles).where(eq(blogArticles.id, id)).limit(1);
  if (article[0]) {
    await db.update(blogArticles).set({ viewCount: (article[0].viewCount || 0) + 1 }).where(eq(blogArticles.id, id));
  }
}

export async function getAllArticles(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogArticles).orderBy(desc(blogArticles.createdAt)).limit(limit);
}

export async function updateBlogArticle(id: number, data: Partial<InsertBlogArticle>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogArticles).set(data).where(eq(blogArticles.id, id));
  return (await db.select().from(blogArticles).where(eq(blogArticles.id, id)))[0];
}

export async function deleteBlogArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogArticles).where(eq(blogArticles.id, id));
}

export async function getPublishedArticleCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(blogArticles).where(eq(blogArticles.status, "published"));
  return result.length;
}

// ─── Referral Codes ───
export async function createReferralCode(data: InsertReferralCode) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(referralCodes).values(data);
  const id = result[0].insertId;
  return (await db.select().from(referralCodes).where(eq(referralCodes.id, id)))[0];
}

export async function getReferralCodeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getReferralCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateReferralCode(id: number, data: Partial<InsertReferralCode>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referralCodes).set(data).where(eq(referralCodes.id, id));
  return (await db.select().from(referralCodes).where(eq(referralCodes.id, id)))[0];
}

// ─── Referral Tracking ───
export async function createReferralTracking(data: InsertReferralTracking) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(referralTracking).values(data);
  const id = result[0].insertId;
  return (await db.select().from(referralTracking).where(eq(referralTracking.id, id)))[0];
}

export async function getReferralTrackingByCode(referralCodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(referralTracking)
    .where(eq(referralTracking.referralCodeId, referralCodeId))
    .orderBy(desc(referralTracking.createdAt));
}

export async function getReferralTrackingByReferredUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(referralTracking)
    .where(eq(referralTracking.referredUserId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateReferralTracking(id: number, data: Partial<InsertReferralTracking>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referralTracking).set(data).where(eq(referralTracking.id, id));
  return (await db.select().from(referralTracking).where(eq(referralTracking.id, id)))[0];
}

export async function addBonusGenerations(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const user = await getUserById(userId);
  if (!user) return;
  // Add to the bonusGenerations pool — these persist across monthly resets
  // and are counted alongside the monthly limit when checking quota
  const currentBonus = user.bonusGenerations || 0;
  await db.update(users).set({ 
    bonusGenerations: currentBonus + amount 
  }).where(eq(users.id, userId));
}

// ─── BYOK API Key Management ───

const ALLOWED_API_KEY_COLUMNS: ReadonlySet<string> = new Set([
  // Legacy column names (kept for backward compatibility)
  "openaiKey", "stabilityKey", "elevenLabsKey", "runwayKey", "replicateKey",
  "googleAiKey", "falKey", "anthropicKey", "mistralKey", "pikaKey",
  "lumaKey", "hedraKey", "klingKey", "hailuoKey",
  // Current user-prefixed column names used by routers.ts columnMap
  "userOpenaiKey", "userRunwayKey", "userReplicateKey", "userFalKey",
  "userLumaKey", "userHfToken", "userElevenlabsKey", "userSunoKey",
  "userByteplusKey", "userAnthropicKey", "userGoogleAiKey", "userVeniceKey",
  "userDidKey",
]);

export async function updateUserApiKey(userId: number, column: string, value: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (!ALLOWED_API_KEY_COLUMNS.has(column)) {
    throw new Error(`Rejected: "${column}" is not a permitted API key column`);
  }
  // Use raw SQL since column name is dynamic (validated against allowlist above)
  if (value === null) {
    await db.execute(
      sql`UPDATE users SET ${sql.raw(column)} = NULL, apiKeysUpdatedAt = NOW() WHERE id = ${userId}`
    );
  } else {
    await db.execute(
      sql`UPDATE users SET ${sql.raw(column)} = ${value}, apiKeysUpdatedAt = NOW() WHERE id = ${userId}`
    );
  }
}

export async function updateUserPreferredProvider(userId: number, provider: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ preferredVideoProvider: provider } as any)
    .where(eq(users.id, userId));
}

export async function getUserApiKeys(userId: number): Promise<{
  openaiKey: string | null;
  runwayKey: string | null;
  replicateKey: string | null;
  falKey: string | null;
  lumaKey: string | null;
  hfToken: string | null;
  didKey: string | null;
  elevenlabsKey: string | null;
  sunoKey: string | null;
  byteplusKey: string | null;
  anthropicKey: string | null;
  googleAiKey: string | null;
  veniceKey: string | null;
  preferredProvider: string | null;
  preferredLlmProvider: string | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  // Decrypt keys — handles AES-256-GCM (v2:), legacy CBC, and base64 fallback
  const { decryptApiKey } = await import("./_core/securityEngine");
  const decode = (val: string | null | undefined): string | null => {
    if (!val) return null;
    const decrypted = decryptApiKey(val);
    return decrypted || null;
  };

  return {
    openaiKey: decode((user as any).userOpenaiKey),
    runwayKey: decode((user as any).userRunwayKey),
    replicateKey: decode((user as any).userReplicateKey),
    falKey: decode((user as any).userFalKey),
    lumaKey: decode((user as any).userLumaKey),
    hfToken: decode((user as any).userHfToken),
    elevenlabsKey: decode((user as any).userElevenlabsKey),
    sunoKey: decode((user as any).userSunoKey),
    byteplusKey: decode((user as any).userByteplusKey),
    anthropicKey: decode((user as any).userAnthropicKey),
    googleAiKey: decode((user as any).userGoogleAiKey),
    veniceKey: decode((user as any).userVeniceKey),
    didKey: decode((user as any).userDidKey),
    preferredProvider: (user as any).preferredVideoProvider || null,
    preferredLlmProvider: (user as any).preferredLlmProvider || null,
  };
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string | null;
  bio?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  companyName?: string | null;
  companyWebsite?: string | null;
  jobTitle?: string | null;
  professionalRole?: string | null;
  experienceLevel?: string | null;
  portfolioUrl?: string | null;
  socialLinks?: Record<string, unknown> | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(users.id, userId));
}

// ─── Director Instructions ───
export async function saveDirectorInstructions(userId: number, instructions: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ directorInstructions: instructions, updatedAt: new Date() } as any)
    .where(eq(users.id, userId));
}

// ─── Notifications ───
export async function createNotification(data: {
  userId: number;
  type?: "generation_complete" | "export_complete" | "subscription_change" | "referral_reward" | "system" | "welcome" | "tip" | "render_complete" | "funding_application" | "approval";
  title: string;
  message?: string;
  link?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { notifications } = await import("../drizzle/schema");
  const [result] = await db.insert(notifications).values({
    userId: data.userId,
    type: data.type || "system",
    title: data.title,
    message: data.message || null,
    link: data.link || null,
  } as any);
  return { id: (result as any).insertId };
}

export async function getUserNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const { notifications } = await import("../drizzle/schema");
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const { notifications } = await import("../drizzle/schema");
  const rows = await db.select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return rows[0]?.count || 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await db.update(notifications)
    .set({ isRead: true } as any)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await db.update(notifications)
    .set({ isRead: true } as any)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { notifications } = await import("../drizzle/schema");
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

// ============================================================
// CREDIT SYSTEM
// ============================================================

/**
 * Deduct credits from a user's balance. Returns the new balance.
 * Throws if insufficient credits.
 */
export async function deductCredits(userId: number, amount: number, action: string, description?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select({ creditBalance: users.creditBalance, role: users.role, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  // Entitlement check: Admins bypass credit limits
  if (user.role === "admin") {
    const currentBalance = (user.creditBalance as number) || 0;
    // Log the exempt transaction for auditing
    try {
      await db.insert(creditTransactions).values({
        userId,
        amount: 0,
        action,
        description: `EXEMPT: ${description || action}`,
        balanceAfter: currentBalance,
      });
    } catch (e) {
      logger.warn("[Credits] Failed to log exempt transaction", { error: e instanceof Error ? e.message : String(e) });
    }
    return currentBalance;
  }

  const currentBalance = (user.creditBalance as number) || 0;
  if (currentBalance < amount) {
    throw new Error(
      `INSUFFICIENT_CREDITS: This action requires ${amount} credit${amount !== 1 ? "s" : ""}. You have ${currentBalance} credits remaining. Purchase a credit pack to continue.`
    );
  }

  // Atomic, race-safe deduction: single UPDATE guarded by balance check.
  // Concurrent requests cannot double-spend — only the first to reach
  // `balance >= amount` succeeds; the rest match 0 rows and we re-throw.
  const updateResult: any = await db.execute(sql`
    UPDATE users
    SET creditBalance = creditBalance - ${amount}, updatedAt = NOW()
    WHERE id = ${userId} AND creditBalance >= ${amount}
  `);
  const affected = (updateResult?.rowCount ?? updateResult?.affectedRows ?? updateResult?.[0]?.affectedRows ?? 0) as number;
  if (!affected) {
    // Re-read to give an accurate balance in the error
    const [fresh] = await db.select({ creditBalance: users.creditBalance })
      .from(users).where(eq(users.id, userId)).limit(1);
    const liveBal = (fresh?.creditBalance as number) || 0;
    throw new Error(
      `INSUFFICIENT_CREDITS: This action requires ${amount} credit${amount !== 1 ? "s" : ""}. You have ${liveBal} credits remaining. Purchase a credit pack to continue.`
    );
  }
  const newBalance = currentBalance - amount;

  // Log the transaction (non-critical)
  try {
    await db.insert(creditTransactions).values({
      userId,
      amount: -amount,
      action,
      description: description || action,
      balanceAfter: newBalance,
    });
  } catch (e) {
    logger.warn("[Credits] Failed to log transaction", { error: e instanceof Error ? e.message : String(e) });
  }

  logger.info(`[Credits] User ${userId}: -${amount} credits for ${action} (balance: ${newBalance})`);
  return newBalance;
}

/**
 * Add credits to a user's balance (from purchase or monthly grant).
 */
export async function addCredits(userId: number, amount: number, action: string, description?: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Atomic increment — prevents read-modify-write race condition under concurrent requests
  await db.update(users)
    .set({ creditBalance: sql`COALESCE(creditBalance, 0) + ${amount}` } as any)
    .where(eq(users.id, userId));

  const [user] = await db.select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  const newBalance = (user.creditBalance as number) || 0;

  try {
    await db.insert(creditTransactions).values({
      userId,
      amount,
      action,
      description: description || action,
      balanceAfter: newBalance,
    });
  } catch (e) {
    logger.warn("[Credits] Failed to log transaction", { error: e instanceof Error ? e.message : String(e) });
  }

  logger.info(`[Credits] User ${userId}: +${amount} credits for ${action} (balance: ${newBalance})`);
  return newBalance;
}

/**
 * Get user's current credit balance.
 */
export async function getCreditBalance(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [user] = await db.select({ creditBalance: users.creditBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (user?.creditBalance as number) || 0;
}

// ─── Stripe webhook idempotency (v6.85) ───
//
// Universal idempotency for the Stripe webhook handler. Every event we
// receive is recorded in stripe_webhook_events keyed on the unique
// stripeEventId. INSERT IGNORE atomically claims the event for processing;
// if the row already exists with status='processed' we skip; if status='error'
// we re-allow processing so a Stripe retry can succeed after a transient
// failure. resourceType + resourceId let us additionally answer
// "has this invoice already been credited?" across event-id boundaries.

/**
 * Try to claim a Stripe webhook event for processing.
 *
 * Returns true if this caller should process the event, false if it was
 * already processed by an earlier delivery (or is currently being processed
 * by another concurrent worker).
 *
 * Concurrency model: relies on the UNIQUE index on stripeEventId. The
 * INSERT IGNORE is atomic at the database layer.
 */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string,
  resourceType?: string | null,
  resourceId?: string | null,
): Promise<boolean> {
  const dbConn = await getDb();
  if (!dbConn) {
    // Fail open in dev / when DB is unavailable — process the event rather
    // than silently dropping it. The handler itself should be resilient to
    // duplicate calls in this degraded mode.
    return true;
  }
  try {
    const insertResult: any = await dbConn.execute(sql`
      INSERT IGNORE INTO stripe_webhook_events
        (stripeEventId, eventType, resourceType, resourceId, status)
      VALUES
        (${eventId}, ${eventType}, ${resourceType ?? null}, ${resourceId ?? null}, 'processing')
    `);
    const affected = Array.isArray(insertResult)
      ? (insertResult[0]?.affectedRows ?? 0)
      : (insertResult?.affectedRows ?? 0);
    if (affected > 0) {
      // We won the race — first time seeing this event.
      return true;
    }
    // A row already exists. Re-allow processing only if the prior attempt
    // errored — otherwise this is a true duplicate (Stripe retry of a
    // successful delivery, or another worker still in flight).
    const existing: any = await dbConn.execute(sql`
      SELECT status FROM stripe_webhook_events
      WHERE stripeEventId = ${eventId}
      LIMIT 1
    `);
    const rows = Array.isArray(existing) ? existing : (existing[0] ?? []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row?.status === "error") {
      await dbConn.execute(sql`
        UPDATE stripe_webhook_events
        SET status = 'processing', errorMessage = NULL
        WHERE stripeEventId = ${eventId}
      `);
      return true;
    }
    return false;
  } catch (e) {
    logger.warn(`[StripeWebhook] claimStripeWebhookEvent failed for ${eventId}`, { error: e instanceof Error ? e.message : String(e) });
    // Fail open: prefer at-least-once processing over silently dropping.
    return true;
  }
}

/**
 * Mark a previously claimed Stripe webhook event with its final processing
 * status. Records userId + creditsGranted for the audit trail.
 */
export async function markStripeWebhookEventResult(
  eventId: string,
  status: "processed" | "error",
  opts: { userId?: number | null; creditsGranted?: number; errorMessage?: string } = {},
): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;
  try {
    await dbConn.execute(sql`
      UPDATE stripe_webhook_events
      SET status = ${status},
          userId = COALESCE(${opts.userId ?? null}, userId),
          creditsGranted = ${opts.creditsGranted ?? 0},
          errorMessage = ${opts.errorMessage ?? null}
      WHERE stripeEventId = ${eventId}
    `);
  } catch (e) {
    logger.warn(`[StripeWebhook] markStripeWebhookEventResult failed for ${eventId}`, { error: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Belt-and-suspenders check used in invoice.paid: has any prior webhook
 * event already credited this Stripe invoice? Excludes the currently-claimed
 * event so we don't see ourselves.
 *
 * Most duplicate deliveries are caught at the event.id layer (claim returns
 * false). This catches the rarer case where Stripe sends a different event.id
 * for the same invoice (e.g., a manual re-fire from the dashboard, or a
 * void-then-repay cycle that we don't want to credit twice).
 */
export async function hasStripeInvoiceBeenCredited(
  invoiceId: string,
  excludeEventId?: string,
): Promise<boolean> {
  const dbConn = await getDb();
  if (!dbConn) return false;
  try {
    const result: any = await dbConn.execute(excludeEventId
      ? sql`
          SELECT id FROM stripe_webhook_events
          WHERE resourceType = 'invoice'
            AND resourceId = ${invoiceId}
            AND eventType = 'invoice.paid'
            AND status = 'processed'
            AND creditsGranted > 0
            AND stripeEventId != ${excludeEventId}
          LIMIT 1
        `
      : sql`
          SELECT id FROM stripe_webhook_events
          WHERE resourceType = 'invoice'
            AND resourceId = ${invoiceId}
            AND eventType = 'invoice.paid'
            AND status = 'processed'
            AND creditsGranted > 0
          LIMIT 1
        `);
    const rows = Array.isArray(result) ? result : (result[0] ?? []);
    return Array.isArray(rows) ? rows.length > 0 : false;
  } catch (e) {
    logger.warn(`[StripeWebhook] hasStripeInvoiceBeenCredited failed for ${invoiceId}`, { error: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

// ─── Project Samples ───
export async function createProjectSample(data: InsertProjectSample): Promise<ProjectSample> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectSamples).values(data);
  const id = result[0].insertId;
  return (await db.select().from(projectSamples).where(eq(projectSamples.id, id)))[0];
}

export async function getPublishedProjectSamples(): Promise<ProjectSample[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectSamples)
    .where(eq(projectSamples.isPublished, true))
    .orderBy(asc(projectSamples.displayOrder), desc(projectSamples.createdAt));
}

export async function getAllProjectSamples(): Promise<ProjectSample[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectSamples)
    .orderBy(asc(projectSamples.displayOrder), desc(projectSamples.createdAt));
}

export async function updateProjectSample(id: number, data: Partial<InsertProjectSample>): Promise<ProjectSample> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectSamples).set(data).where(eq(projectSamples.id, id));
  return (await db.select().from(projectSamples).where(eq(projectSamples.id, id)))[0];
}

export async function deleteProjectSample(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectSamples).where(eq(projectSamples.id, id));
}

// ─── User Social Platform Credentials ────────────────────────────────────────
import { userSocialCredentials, InsertUserSocialCredential, UserSocialCredential } from "../drizzle/schema";

export async function getUserSocialCredentials(userId: number): Promise<UserSocialCredential[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userSocialCredentials)
    .where(eq(userSocialCredentials.userId, userId))
    .orderBy(asc(userSocialCredentials.platform));
}

export async function getUserSocialCredentialByPlatform(userId: number, platform: string): Promise<UserSocialCredential | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(userSocialCredentials)
    .where(and(eq(userSocialCredentials.userId, userId), eq(userSocialCredentials.platform, platform)));
  return rows[0];
}

export async function upsertUserSocialCredential(userId: number, platform: string, data: {
  displayName?: string;
  credentials: string;
  isActive?: boolean;
}): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserSocialCredentialByPlatform(userId, platform);
  if (existing) {
    await db.update(userSocialCredentials)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(userSocialCredentials.userId, userId), eq(userSocialCredentials.platform, platform)));
  } else {
    await db.insert(userSocialCredentials).values({
      userId,
      platform,
      displayName: data.displayName,
      credentials: data.credentials,
      isActive: data.isActive ?? true,
    });
  }
}

export async function updateSocialCredentialTestResult(userId: number, platform: string, success: boolean, error?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userSocialCredentials)
    .set({
      lastTestedAt: new Date(),
      lastError: success ? null : (error || "Connection failed"),
      isActive: success,
      updatedAt: new Date(),
    })
    .where(and(eq(userSocialCredentials.userId, userId), eq(userSocialCredentials.platform, platform)));
}

export async function updateSocialCredentialPublished(userId: number, platform: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(userSocialCredentials)
    .set({ lastPublishedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(and(eq(userSocialCredentials.userId, userId), eq(userSocialCredentials.platform, platform)));
}

export async function deleteUserSocialCredential(userId: number, platform: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(userSocialCredentials)
    .where(and(eq(userSocialCredentials.userId, userId), eq(userSocialCredentials.platform, platform)));
}

// ─── Beta Tier Management ───
export async function assignBetaTier(userId: number, expiresAt: Date): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Beta users must persist as 'beta' so getEffectiveTier() honours the
  // betaExpiresAt clock (subscription.ts looks for subscriptionTier === "beta").
  // Fall back to 'industry' only if the live DB ENUM rejects the value.
  const expiresAtIso = expiresAt.toISOString().slice(0, 19).replace("T", " ");
  try {
    await db.execute(sql.raw(
      `UPDATE users SET subscriptionTier = 'beta', betaExpiresAt = '${expiresAtIso}', updatedAt = NOW() WHERE id = ${userId}`
    ));
  } catch (err) {
    logger.warn("[Beta] 'beta' ENUM value not accepted, falling back to 'industry'", { error: err instanceof Error ? err.message : String(err) });
    try {
      await db.execute(sql.raw(
        `UPDATE users SET subscriptionTier = 'industry', betaExpiresAt = '${expiresAtIso}', updatedAt = NOW() WHERE id = ${userId}`
      ));
    } catch (fallbackErr) {
      throw new Error(`Failed to assign beta tier: ${fallbackErr}`);
    }
  }
}

export async function revokeBetaTier(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users)
    .set({ subscriptionTier: "free" as any, betaExpiresAt: null, updatedAt: new Date() } as any)
    .where(eq(users.id, userId));
}

// ─── Promo Codes ───
export async function validatePromoCode(code: string): Promise<{ valid: boolean; discountPercent?: number; message?: string }> {
  const db = await getDb();
  if (!db) return { valid: false, message: "Database unavailable" };
  try {
    const rows = await db.execute(sql`SELECT * FROM promo_codes WHERE code = ${code.toUpperCase()} LIMIT 1`);
    const promo = (rows[0] as any)?.[0];
    if (!promo) return { valid: false, message: "Invalid promo code" };
    if (!promo.isActive) return { valid: false, message: "This promo code has expired" };
    if (promo.usedCount >= promo.maxUses) return { valid: false, message: "This promo code has already been used" };
    return { valid: true, discountPercent: promo.discountPercent };
  } catch {
    return { valid: false, message: "Could not validate code" };
  }
}

export async function applyPromoCodeToUser(userId: number, code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute(sql`UPDATE promo_codes SET usedCount = usedCount + 1 WHERE code = ${code.toUpperCase()} AND usedCount < maxUses AND isActive = TRUE`);
    await db.execute(sql`UPDATE users SET appliedPromoCode = ${code.toUpperCase()}, promoDiscountUsed = FALSE WHERE id = ${userId}`);
    return true;
  } catch {
    return false;
  }
}

export async function markPromoDiscountUsed(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`UPDATE users SET promoDiscountUsed = TRUE WHERE id = ${userId}`);
}

export async function getUserPromoStatus(userId: number): Promise<{ appliedPromoCode: string | null; promoDiscountUsed: boolean }> {
  const db = await getDb();
  if (!db) return { appliedPromoCode: null, promoDiscountUsed: false };
  try {
    const rows = await db.execute(sql`SELECT appliedPromoCode, promoDiscountUsed FROM users WHERE id = ${userId} LIMIT 1`);
    const row = (rows[0] as any)?.[0];
    return { appliedPromoCode: row?.appliedPromoCode || null, promoDiscountUsed: !!row?.promoDiscountUsed };
  } catch {
    return { appliedPromoCode: null, promoDiscountUsed: false };
  }
}

export async function seedPromoCodes(codes: Array<{ code: string; description: string; maxUses?: number }>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const c of codes) {
    try {
      await db.execute(sql`INSERT IGNORE INTO promo_codes (code, discountPercent, maxUses, description) VALUES (${c.code.toUpperCase()}, 50, ${c.maxUses ?? 1}, ${c.description})`);
    } catch { /* already exists */ }
  }
}

// ─── Credit Transaction History ─────────────────────────────────────────────
export async function getCreditHistory(
  userId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: any[]; total: number }> {
  const db = await getDb();
  if (!db) return { transactions: [], total: 0 };
  try {
    const rows = await db.execute(
      sql`SELECT id, amount, action, description, balanceAfter, createdAt
          FROM credit_transactions
          WHERE userId = ${userId}
          ORDER BY createdAt DESC
          LIMIT ${limit} OFFSET ${offset}`
    );
    const countRows = await db.execute(
      sql`SELECT COUNT(*) as total FROM credit_transactions WHERE userId = ${userId}`
    );
    const total = Number((countRows[0] as any)?.[0]?.total || 0);
    const transactions = (Array.isArray(rows[0]) ? rows[0] : []) as any[];
    return { transactions, total };
  } catch {
    return { transactions: [], total: 0 };
  }
}

// ─── Temporary Account Expiry ────────────────────────────────────────────────
/**
 * If the user has a temporary tester account (accountExpiresAt IS NULL),
 * set accountExpiresAt to NOW() + 48 hours on their very first login.
 * Subsequent logins leave the expiry unchanged so the clock never resets.
 *
 * Detection: tester accounts are identified by openId starting with
 * "email_tester" — matching accounts seeded via seed-tester.mjs.
 */
export async function setFirstLoginExpiry(userId: number, openId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Only applies to tester-seeded accounts
  if (!openId.startsWith("email_tester")) return;
  try {
    // Only set if not already set (first login only)
    await db.execute(
      sql`UPDATE users
             SET accountExpiresAt = DATE_ADD(NOW(), INTERVAL 48 HOUR),
                 updatedAt        = NOW()
           WHERE id               = ${userId}
             AND accountExpiresAt IS NULL`
    );
  } catch (err) {
    logger.warn("[DB] setFirstLoginExpiry failed (non-critical)", { error: err instanceof Error ? err.message : String(err) });
  }
}

// ─── Feature Cuts ──────────────────────────────────────────────────────────────

  export async function createFeatureCut(
    projectId: number,
    userId: number,
    name: string,
    description?: string
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(featureCuts).values({
      projectId,
      userId,
      name,
      description,
    });
    return getFeatureCutById((result as any).insertId, userId);
  }

  export async function getProjectFeatureCuts(projectId: number, userId: number) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(featureCuts)
      .where(
        and(eq(featureCuts.projectId, projectId), eq(featureCuts.userId, userId))
      )
      .orderBy(desc(featureCuts.createdAt));
  }

  export async function getFeatureCutById(id: number, userId: number) {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(featureCuts)
      .where(and(eq(featureCuts.id, id), eq(featureCuts.userId, userId)));
    return row ?? null;
  }

  export async function updateFeatureCut(
    id: number,
    userId: number,
    data: Partial<{ name: string; description: string; notes: string; totalDuration: number }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .update(featureCuts)
      .set(data)
      .where(and(eq(featureCuts.id, id), eq(featureCuts.userId, userId)));
    return getFeatureCutById(id, userId);
  }

  export async function lockFeatureCut(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .update(featureCuts)
      .set({ isLocked: true, lockedAt: new Date(), lockedBy: userId })
      .where(and(eq(featureCuts.id, id), eq(featureCuts.userId, userId)));
    return getFeatureCutById(id, userId);
  }

  export async function reopenFeatureCut(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .update(featureCuts)
      .set({ isLocked: false, lockedAt: null, lockedBy: null })
      .where(and(eq(featureCuts.id, id), eq(featureCuts.userId, userId)));
    return getFeatureCutById(id, userId);
  }

  export async function deleteFeatureCut(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(featureCutScenes).where(eq(featureCutScenes.cutId, id));
    await db
      .delete(featureCuts)
      .where(and(eq(featureCuts.id, id), eq(featureCuts.userId, userId)));
    return { success: true };
  }

  // ─── Feature Cut Scenes ────────────────────────────────────────────────────────

  export async function getCutScenes(cutId: number) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(featureCutScenes)
      .where(eq(featureCutScenes.cutId, cutId))
      .orderBy(asc(featureCutScenes.orderIndex));
  }

  export async function addSceneToCut(cutId: number, sceneId: number, orderIndex: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // Avoid duplicates
    const [existing] = await db
      .select()
      .from(featureCutScenes)
      .where(and(eq(featureCutScenes.cutId, cutId), eq(featureCutScenes.sceneId, sceneId)));
    if (existing) return existing;
    const [result] = await db.insert(featureCutScenes).values({ cutId, sceneId, orderIndex });
    const [row] = await db
      .select()
      .from(featureCutScenes)
      .where(eq(featureCutScenes.id, (result as any).insertId));
    return row;
  }

  export async function removeSceneFromCut(cutId: number, sceneId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .delete(featureCutScenes)
      .where(and(eq(featureCutScenes.cutId, cutId), eq(featureCutScenes.sceneId, sceneId)));
    return { success: true };
  }

  export async function toggleSceneInclusion(cutId: number, sceneId: number, included: boolean) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db
      .update(featureCutScenes)
      .set({ isIncluded: included })
      .where(and(eq(featureCutScenes.cutId, cutId), eq(featureCutScenes.sceneId, sceneId)));
    return { success: true };
  }

  export async function reorderCutScenes(cutId: number, orderedSceneIds: number[]) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    for (let i = 0; i < orderedSceneIds.length; i++) {
      await db
        .update(featureCutScenes)
        .set({ orderIndex: i })
        .where(
          and(eq(featureCutScenes.cutId, cutId), eq(featureCutScenes.sceneId, orderedSceneIds[i]))
        );
    }
    return { success: true };
  }

  export async function recalculateCutRuntime(cutId: number, userId: number) {
    const db = await getDb();
    if (!db) return;
    const cutScenes = await db
      .select({ sceneId: featureCutScenes.sceneId, isIncluded: featureCutScenes.isIncluded })
      .from(featureCutScenes)
      .where(eq(featureCutScenes.cutId, cutId));
    const includedIds = cutScenes.filter((s) => s.isIncluded).map((s) => s.sceneId);
    if (includedIds.length === 0) {
      await db.update(featureCuts).set({ totalDuration: 0 }).where(eq(featureCuts.id, cutId));
      return;
    }
    const sceneRows = await db
      .select({ duration: scenes.duration })
      .from(scenes)
      .where(inArray(scenes.id, includedIds));
    const total = sceneRows.reduce((sum, s) => sum + (s.duration ?? 0), 0);
    await db.update(featureCuts).set({ totalDuration: total }).where(eq(featureCuts.id, cutId));
  }

  // ─── Compile Jobs ─────────────────────────────────────────────────────────────

  export async function createCompileJob(cutId: number, userId: number, format?: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const cut = await getFeatureCutById(cutId, userId);
    if (!cut) throw new Error("Feature cut not found");
    const [result] = await db.insert(filmCompileJobs).values({
      cutId,
      projectId: cut.projectId,
      userId,
      resolution: format === "4k" ? "4k" : "1080p",
      currentStep: "Preparing scenes for compilation...",
    });
    return getCompileJobById((result as any).insertId);
  }

  export async function getCompileJobById(id: number) {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db.select().from(filmCompileJobs).where(eq(filmCompileJobs.id, id));
    return row ?? null;
  }

  export async function updateCompileJob(
    id: number,
    data: Partial<{
      status: "queued" | "processing" | "completed" | "failed";
      progress: number;
      currentStep: string;
      outputMovieId: number;
      outputUrl: string;
      errorMessage: string;
      scenesProcessed: number;
    }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(filmCompileJobs).set(data).where(eq(filmCompileJobs.id, id));
    return getCompileJobById(id);
  }

  export async function getLatestCompileJobForCut(cutId: number) {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(filmCompileJobs)
      .where(eq(filmCompileJobs.cutId, cutId))
      .orderBy(desc(filmCompileJobs.createdAt))
      .limit(1);
    return row ?? null;
  }
  

  // ─── Film Post: Mix Settings ───────────────────────────────────────────────────

  export async function getFilmMixSettings(projectId: number, userId: number) {
    const db = await getDb();
    if (!db) return null;
    const [row] = await db
      .select()
      .from(filmMixSettings)
      .where(and(eq(filmMixSettings.projectId, projectId), eq(filmMixSettings.userId, userId)));
    return row ?? null;
  }

  export async function upsertFilmMixSettings(
    projectId: number,
    userId: number,
    data: Partial<{
      dialogueBus: number; musicBus: number; effectsBus: number; masterVolume: number;
      dialogueEqLow: number; dialogueEqMid: number; dialogueEqHigh: number;
      musicEqLow: number; musicEqMid: number; musicEqHigh: number;
      sfxEqLow: number; sfxEqMid: number; sfxEqHigh: number;
      reverbRoom: "none" | "small" | "medium" | "large" | "hall" | "cathedral";
      reverbAmount: number; compressionRatio: number; noiseReduction: boolean; notes: string;
    }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await getFilmMixSettings(projectId, userId);
    if (existing) {
      await db.update(filmMixSettings).set(data).where(eq(filmMixSettings.id, existing.id));
    } else {
      await db.insert(filmMixSettings).values({ projectId, userId, ...data } as any);
    }
    return getFilmMixSettings(projectId, userId);
  }

  // ─── Film Post: ADR Tracks ────────────────────────────────────────────────────

  export async function getProjectAdrTracks(projectId: number, userId: number) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(filmAdrTracks)
      .where(and(eq(filmAdrTracks.projectId, projectId), eq(filmAdrTracks.userId, userId)))
      .orderBy(desc(filmAdrTracks.createdAt));
  }

  export async function createAdrTrack(
    projectId: number,
    userId: number,
    data: { characterName: string; dialogueLine: string; trackType?: string; sceneId?: number; notes?: string }
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(filmAdrTracks).values({ projectId, userId, ...data } as any);
    const [row] = await db.select().from(filmAdrTracks).where(eq(filmAdrTracks.id, (result as any).insertId));
    return row;
  }

  export async function updateAdrTrack(
    id: number,
    userId: number,
    data: Partial<{ characterName: string; dialogueLine: string; trackType: string; status: string; fileUrl: string; notes: string }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(filmAdrTracks).set(data as any).where(and(eq(filmAdrTracks.id, id), eq(filmAdrTracks.userId, userId)));
    const [row] = await db.select().from(filmAdrTracks).where(eq(filmAdrTracks.id, id));
    return row;
  }

  export async function deleteAdrTrack(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(filmAdrTracks).where(and(eq(filmAdrTracks.id, id), eq(filmAdrTracks.userId, userId)));
    return { success: true };
  }

  // ─── Film Post: Foley Tracks ──────────────────────────────────────────────────

  export async function getProjectFoleyTracks(projectId: number, userId: number) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(filmFoleyTracks)
      .where(and(eq(filmFoleyTracks.projectId, projectId), eq(filmFoleyTracks.userId, userId)))
      .orderBy(desc(filmFoleyTracks.createdAt));
  }

  export async function createFoleyTrack(
    projectId: number,
    userId: number,
    data: { name: string; foleyType?: string; description?: string; volume?: number; startTime?: number; sceneId?: number; notes?: string }
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(filmFoleyTracks).values({ projectId, userId, ...data } as any);
    const [row] = await db.select().from(filmFoleyTracks).where(eq(filmFoleyTracks.id, (result as any).insertId));
    return row;
  }

  export async function updateFoleyTrack(
    id: number,
    userId: number,
    data: Partial<{ name: string; foleyType: string; description: string; status: string; fileUrl: string; volume: number; startTime: number; notes: string }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(filmFoleyTracks).set(data as any).where(and(eq(filmFoleyTracks.id, id), eq(filmFoleyTracks.userId, userId)));
    const [row] = await db.select().from(filmFoleyTracks).where(eq(filmFoleyTracks.id, id));
    return row;
  }

  export async function deleteFoleyTrack(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(filmFoleyTracks).where(and(eq(filmFoleyTracks.id, id), eq(filmFoleyTracks.userId, userId)));
    return { success: true };
  }

  // ─── Film Post: Score Cues ────────────────────────────────────────────────────

  export async function getProjectScoreCues(projectId: number, userId: number) {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(filmScoreCues)
      .where(and(eq(filmScoreCues.projectId, projectId), eq(filmScoreCues.userId, userId)))
      .orderBy(asc(filmScoreCues.cueNumber));
  }

  export async function createScoreCue(
    projectId: number,
    userId: number,
    data: { cueNumber: string; title: string; cueType?: string; description?: string; volume?: number; fadeIn?: number; fadeOut?: number; startTime?: number; duration?: number; sceneId?: number; notes?: string }
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [result] = await db.insert(filmScoreCues).values({ projectId, userId, ...data } as any);
    const [row] = await db.select().from(filmScoreCues).where(eq(filmScoreCues.id, (result as any).insertId));
    return row;
  }

  export async function updateScoreCue(
    id: number,
    userId: number,
    data: Partial<{ cueNumber: string; title: string; cueType: string; description: string; status: string; fileUrl: string; volume: number; fadeIn: number; fadeOut: number; startTime: number; duration: number; notes: string }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(filmScoreCues).set(data as any).where(and(eq(filmScoreCues.id, id), eq(filmScoreCues.userId, userId)));
    const [row] = await db.select().from(filmScoreCues).where(eq(filmScoreCues.id, id));
    return row;
  }

  export async function deleteScoreCue(id: number, userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.delete(filmScoreCues).where(and(eq(filmScoreCues.id, id), eq(filmScoreCues.userId, userId)));
    return { success: true };
  }

// ───────────────────────────────────────────────────────────────────────
// v6.63 — Production Spine: shoot days, crew, activity log, approvals,
// shot lists. All helpers are ownership-checked at the router layer via
// assertOwnsProject; here we focus on the data path only.
// ───────────────────────────────────────────────────────────────────────

export async function listShootDays(projectId: number): Promise<ShootDay[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shootDays).where(eq(shootDays.projectId, projectId)).orderBy(asc(shootDays.dayNumber)) as any;
}

export async function getShootDay(id: number): Promise<ShootDay | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(shootDays).where(eq(shootDays.id, id)).limit(1);
  return (row as any) || null;
}

export async function createShootDay(data: InsertShootDay): Promise<ShootDay> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(shootDays).values(data as any);
  const [row] = await db.select().from(shootDays).where(eq(shootDays.id, (result as any).insertId));
  return row as any;
}

export async function updateShootDay(
  id: number,
  data: Partial<{ dayNumber: number; shootDate: any; callTime: string | null; wrapTime: string | null; locationId: number | null; weatherNote: string | null; hospitalInfo: string | null; parkingInfo: string | null; generalNotes: string | null }>,
): Promise<ShootDay | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(shootDays).set(data as any).where(eq(shootDays.id, id));
  const [row] = await db.select().from(shootDays).where(eq(shootDays.id, id));
  return (row as any) || null;
}

export async function deleteShootDay(id: number): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Unlink any scenes pointing at this day so they revert to "unscheduled".
  await db.update(scenes).set({ shootDayId: null, shootOrder: 0 } as any).where(eq(scenes.shootDayId, id));
  await db.delete(shootDays).where(eq(shootDays.id, id));
  return { success: true };
}

export async function listCrewContacts(projectId: number): Promise<CrewContact[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(crewContacts).where(eq(crewContacts.projectId, projectId)).orderBy(asc(crewContacts.sortOrder), asc(crewContacts.id)) as any;
}

export async function createCrewContact(data: InsertCrewContact): Promise<CrewContact> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(crewContacts).values(data as any);
  const [row] = await db.select().from(crewContacts).where(eq(crewContacts.id, (result as any).insertId));
  return row as any;
}

export async function updateCrewContact(
  id: number,
  data: Partial<{ name: string; role: string | null; department: string | null; email: string | null; phone: string | null; callTimeOverride: string | null; notes: string | null; sortOrder: number }>,
): Promise<CrewContact | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(crewContacts).set(data as any).where(eq(crewContacts.id, id));
  const [row] = await db.select().from(crewContacts).where(eq(crewContacts.id, id));
  return (row as any) || null;
}

export async function deleteCrewContact(id: number): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(crewContacts).where(eq(crewContacts.id, id));
  return { success: true };
}

export async function reorderCrewContacts(projectId: number, orderedIds: number[]): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(crewContacts).set({ sortOrder: i } as any).where(and(eq(crewContacts.id, orderedIds[i]), eq(crewContacts.projectId, projectId)));
  }
  return { success: true };
}

export async function logActivity(
  projectId: number,
  userId: number,
  actor: string | null,
  eventType: string,
  payload: any,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLog).values({ projectId, userId, actor: actor || null, eventType, payload } as any);
  } catch (e) {
    // Activity log is best-effort — never break the user action because of audit failure.
    logger.warn("[activityLog] insert failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

export async function listActivityLog(projectId: number, limit = 200): Promise<ActivityLogEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLog).where(eq(activityLog.projectId, projectId)).orderBy(desc(activityLog.createdAt)).limit(limit) as any;
}

export async function setSceneApproval(
  sceneId: number,
  approvedBy: number,
  status: "pending" | "approved" | "changes_requested",
  note: string | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scenes).set({
    approvalStatus: status,
    approvedBy: status === "pending" ? null : approvedBy,
    approvedAt: status === "pending" ? null : new Date(),
    approvalNote: note || null,
  } as any).where(eq(scenes.id, sceneId));
}

export async function setMovieApproval(
  movieId: number,
  approvedBy: number,
  status: "pending" | "approved" | "changes_requested",
  note: string | null,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(movies).set({
    approvalStatus: status,
    approvedBy: status === "pending" ? null : approvedBy,
    approvedAt: status === "pending" ? null : new Date(),
    approvalNote: note || null,
  } as any).where(eq(movies.id, movieId));
}

export async function updateSceneShotList(sceneId: number, shotList: any): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scenes).set({ shotList } as any).where(eq(scenes.id, sceneId));
}

export async function assignSceneToShootDay(
  sceneId: number,
  shootDayId: number | null,
  shootOrder: number,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scenes).set({ shootDayId, shootOrder } as any).where(eq(scenes.id, sceneId));
}

export async function getProjectSceneById(sceneId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
  return (row as any) || null;
}

export async function getMovieByIdRaw(movieId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
  return (row as any) || null;
}

// ============================================================================
// v6.64 — Signed approval chain helpers
// ============================================================================
import { createHash } from "crypto";
import { approvalChain, InsertApprovalChainEntry, ApprovalChainEntry, assetVersions, InsertAssetVersion, AssetVersion } from "../drizzle/schema";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export async function appendApprovalChain(
  projectId: number,
  kind: "scene" | "movie",
  entityId: number,
  fromStatus: string | null,
  toStatus: string,
  actor: number,
  actorName: string | null,
  note: string | null,
  contentSnapshot: string,
): Promise<ApprovalChainEntry | null> {
  const db = await getDb();
  if (!db) return null;
  // Find previous signature in this entity's chain
  const [prev] = await db.select().from(approvalChain)
    .where(and(eq(approvalChain.projectId, projectId), eq(approvalChain.kind, kind), eq(approvalChain.entityId, entityId)))
    .orderBy(desc(approvalChain.id))
    .limit(1);
  const prevSignature = prev ? prev.signature : null;
  const contentHash = sha256(contentSnapshot);
  const signature = sha256([prevSignature || "", contentHash, fromStatus || "", toStatus, actor, note || "", new Date().toISOString()].join("|"));
  const data: InsertApprovalChainEntry = {
    projectId, kind, entityId, fromStatus, toStatus, actor, actorName, note, contentHash, prevSignature, signature,
  };
  const [res] = await db.insert(approvalChain).values(data as any);
  const [row] = await db.select().from(approvalChain).where(eq(approvalChain.id, (res as any).insertId)).limit(1);
  return (row as ApprovalChainEntry) || null;
}

export async function listApprovalChain(projectId: number, kind?: "scene" | "movie", entityId?: number): Promise<ApprovalChainEntry[]> {
  const db = await getDb();
  if (!db) return [];
  const where = kind && entityId
    ? and(eq(approvalChain.projectId, projectId), eq(approvalChain.kind, kind), eq(approvalChain.entityId, entityId))
    : eq(approvalChain.projectId, projectId);
  return db.select().from(approvalChain).where(where).orderBy(desc(approvalChain.createdAt)) as any;
}

export async function verifyApprovalChain(projectId: number, kind: "scene" | "movie", entityId: number): Promise<{ valid: boolean; entries: number; brokenAt: number | null }> {
  const db = await getDb();
  if (!db) return { valid: true, entries: 0, brokenAt: null };
  const rows = await db.select().from(approvalChain)
    .where(and(eq(approvalChain.projectId, projectId), eq(approvalChain.kind, kind), eq(approvalChain.entityId, entityId)))
    .orderBy(asc(approvalChain.id));
  let prevSig: string | null = null;
  for (const r of rows as ApprovalChainEntry[]) {
    if ((r.prevSignature || null) !== prevSig) return { valid: false, entries: rows.length, brokenAt: r.id };
    prevSig = r.signature;
  }
  return { valid: true, entries: rows.length, brokenAt: null };
}

// ============================================================================
// v6.64 — Asset version stack helpers
// ============================================================================
export async function recordAssetVersion(data: InsertAssetVersion): Promise<AssetVersion | null> {
  const db = await getDb();
  if (!db) return null;
  const [res] = await db.insert(assetVersions).values(data as any);
  const [row] = await db.select().from(assetVersions).where(eq(assetVersions.id, (res as any).insertId)).limit(1);
  return (row as AssetVersion) || null;
}

export async function listAssetVersions(projectId: number, ownerKind: string, ownerId: number, fieldName?: string): Promise<AssetVersion[]> {
  const db = await getDb();
  if (!db) return [];
  const where = fieldName
    ? and(eq(assetVersions.projectId, projectId), eq(assetVersions.ownerKind, ownerKind), eq(assetVersions.ownerId, ownerId), eq(assetVersions.fieldName, fieldName))
    : and(eq(assetVersions.projectId, projectId), eq(assetVersions.ownerKind, ownerKind), eq(assetVersions.ownerId, ownerId));
  return db.select().from(assetVersions).where(where).orderBy(desc(assetVersions.createdAt)) as any;
}

export async function deleteAssetVersion(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(assetVersions).where(eq(assetVersions.id, id));
  return true;
}

// v6.64 — Raw project getter (no userId filter) for use after access has been asserted by caller
export async function getProjectByIdRaw(projectId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return (row as any) || null;
}

// ─── v6.66 Auto Recap helpers ──────────────────────────────────────────────
import { recaps, recapSegments } from "../drizzle/schema";
import type { InsertRecap, Recap, InsertRecapSegment, RecapSegment } from "../drizzle/schema";

export async function listMoviesByProject(projectId: number, userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(movies)
    .where(and(eq(movies.projectId, projectId), eq(movies.userId, userId)))
    .orderBy(desc(movies.createdAt)) as any;
}

export async function createRecap(data: InsertRecap): Promise<Recap | null> {
  const db = await getDb();
  if (!db) return null;
  const [result]: any = await db.insert(recaps).values(data);
  const id = result?.insertId ?? (data as any).id;
  if (!id) return null;
  const [row] = await db.select().from(recaps).where(eq(recaps.id, id)).limit(1);
  return (row as Recap) || null;
}

export async function getRecapById(id: number, userId: number): Promise<Recap | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(recaps)
    .where(and(eq(recaps.id, id), eq(recaps.userId, userId))).limit(1);
  return (row as Recap) || null;
}

export async function listRecapsForMovie(movieId: number, userId: number): Promise<Recap[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recaps)
    .where(and(eq(recaps.targetMovieId, movieId), eq(recaps.userId, userId)))
    .orderBy(desc(recaps.createdAt)) as any;
}

export async function findActiveRecap(
  userId: number, projectId: number, targetMovieId: number
): Promise<Recap | null> {
  const db = await getDb();
  if (!db) return null;
  const active = ["pending", "analyzing", "selecting_clips", "generating_voiceover", "rendering"];
  const rows: any = await db.select().from(recaps).where(
    and(
      eq(recaps.userId, userId),
      eq(recaps.projectId, projectId),
      eq(recaps.targetMovieId, targetMovieId),
    )
  );
  return rows.find((r: any) => active.includes(r.status)) || null;
}

export async function updateRecap(id: number, userId: number, data: Partial<InsertRecap>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(recaps).set(data as any)
    .where(and(eq(recaps.id, id), eq(recaps.userId, userId)));
}

export async function insertRecapSegments(rows: InsertRecapSegment[]): Promise<void> {
  if (!rows.length) return;
  const db = await getDb();
  if (!db) return;
  await db.insert(recapSegments).values(rows);
}

export async function listRecapSegments(recapId: number): Promise<RecapSegment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recapSegments)
    .where(eq(recapSegments.recapId, recapId))
    .orderBy(recapSegments.sortOrder) as any;
}

// ──────────────────────────────────────────────────────────────────────────
// v6.68 Phase 6 — Credit reservations
// Pattern: reserve = deduct from balance + create reservation row;
//          finalize = mark row completed (no balance change);
//          release  = refund + mark row released.
// Use getActiveReservation to prevent duplicate-click double-charges.

export async function reserveCredits(
  userId: number,
  amount: number,
  featureKey: string,
  opts: { projectId?: number; referenceType?: string; referenceId?: number } = {},
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  if (amount <= 0) return null;
  // Block duplicate reservations for the same reference.
  if (opts.referenceType && opts.referenceId) {
    const existing = await db.select().from(creditReservations).where(
      and(
        eq(creditReservations.userId, userId),
        eq(creditReservations.referenceType, opts.referenceType),
        eq(creditReservations.referenceId, opts.referenceId),
        eq(creditReservations.status, "reserved"),
      ),
    ).limit(1);
    if (existing.length > 0) return (existing[0] as any).id;
  }
  // Deduct first; throws if insufficient balance.
  await deductCredits(userId, amount, featureKey, `Reserved for ${featureKey}`);
  const inserted = await db.insert(creditReservations).values({
    userId,
    projectId: opts.projectId ?? null,
    referenceType: opts.referenceType ?? null,
    referenceId: opts.referenceId ?? null,
    featureKey,
    amount,
    status: "reserved",
  } as any);
  const id = Number((inserted as any)?.[0]?.insertId ?? (inserted as any)?.insertId ?? 0);
  return id || null;
}

export async function finalizeReservation(reservationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(creditReservations).set({
    status: "completed",
    finalizedAt: new Date(),
  } as any).where(
    and(eq(creditReservations.id, reservationId), eq(creditReservations.status, "reserved")),
  );
}

export async function releaseReservation(reservationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(creditReservations)
    .where(eq(creditReservations.id, reservationId)).limit(1);
  const row: any = rows[0];
  if (!row || row.status !== "reserved") return;
  // Refund the held amount back to the user.
  await addCredits(row.userId, row.amount, "credits.refund",
    `Released reservation #${reservationId} (${row.featureKey})`);
  await db.update(creditReservations).set({
    status: "released",
    releasedAt: new Date(),
  } as any).where(eq(creditReservations.id, reservationId));
}

export async function getActiveReservation(
  userId: number,
  referenceType: string,
  referenceId: number,
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(creditReservations).where(
    and(
      eq(creditReservations.userId, userId),
      eq(creditReservations.referenceType, referenceType),
      eq(creditReservations.referenceId, referenceId),
      eq(creditReservations.status, "reserved"),
    ),
  ).limit(1);
  return rows[0] ?? null;
}

export async function listUserReservations(userId: number, limit = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditReservations)
    .where(eq(creditReservations.userId, userId))
    .orderBy(desc(creditReservations.createdAt))
    .limit(limit) as any;
}

// v6.70 — Look up every reservation row attached to a given (referenceType,
// referenceId) pair. Used by the new reservations.getForReference tRPC query
// for debug/observability — returns ALL statuses (reserved, finalized,
// released) so an operator can see the full lifecycle of a scene/trailer/
// recap credit lock. The caller is expected to scope by user where needed;
// this helper does NOT filter by user so it can be used safely from owner-
// scoped procedures that already validated the project ownership.
export async function getReservationsForReference(
  referenceType: string,
  referenceId: number,
  userId?: number,
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(creditReservations.referenceType, referenceType),
    eq(creditReservations.referenceId, referenceId),
  ];
  if (typeof userId === "number") conditions.push(eq(creditReservations.userId, userId));
  return db.select().from(creditReservations)
    .where(and(...conditions))
    .orderBy(desc(creditReservations.createdAt))
    .limit(20) as any;
}

// v6.70 — Tiny stub helpers so the build no longer warns that these names
// are missing. Real implementations would query their respective tables;
// callers always check `typeof db.fn === "function"` so returning undefined
// here is safe and behavior is unchanged from the previous defensive path.
export async function getAiActorById(_id: number): Promise<any | null> {
  return null;
}

export async function getProjectShootDays(_projectId: number): Promise<any[]> {
  return [];
}

// v6.67 — mark a completed recap as attached to its target episode.
export async function attachRecap(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(recaps).set({ attachedAt: new Date() } as any)
    .where(and(eq(recaps.id, id), eq(recaps.userId, userId)));
}

export async function unattachRecap(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(recaps).set({ attachedAt: null } as any)
    .where(and(eq(recaps.id, id), eq(recaps.userId, userId)));
}

// ─── v6.77 — Project Brands (real-world brand allow/block list per film) ───
//
// Free to manage. Consumed by buildScenePrompt + trailer + poster + storyboard
// engines so the AI knows which real-world brand names / logos / signage may
// (or must, or must NEVER) appear in generated shots.
export async function getProjectBrands(projectId: number): Promise<ProjectBrand[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projectBrands)
    .where(eq(projectBrands.projectId, projectId))
    .orderBy(asc(projectBrands.name));
}

export async function getProjectBrandById(id: number): Promise<ProjectBrand | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectBrands).where(eq(projectBrands.id, id)).limit(1);
  return result[0];
}

export async function createProjectBrand(data: InsertProjectBrand): Promise<ProjectBrand> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectBrands).values(data);
  const id = result[0].insertId;
  return (await db.select().from(projectBrands).where(eq(projectBrands.id, id)))[0];
}

export async function updateProjectBrand(
  id: number,
  data: Partial<InsertProjectBrand>,
): Promise<ProjectBrand | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(projectBrands).set(data).where(eq(projectBrands.id, id));
  return (await db.select().from(projectBrands).where(eq(projectBrands.id, id)))[0];
}

export async function deleteProjectBrand(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(projectBrands).where(eq(projectBrands.id, id));
}

// ─── v6.77 — Designer Wardrobe (profiles, collections, items, assignments) ───
// All public reads check visibility; assignment writes check project ownership
// at the router layer. Database layer keeps it minimal — the router enforces
// auth, ownership, and visibility rules.

// ─── designerProfiles ───
export async function getDesignerProfileByUserId(userId: number): Promise<DesignerProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(designerProfiles).where(eq(designerProfiles.userId, userId)).limit(1);
  return rows[0];
}

export async function getDesignerProfileById(id: number): Promise<DesignerProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(designerProfiles).where(eq(designerProfiles.id, id)).limit(1);
  return rows[0];
}

export async function createDesignerProfile(data: InsertDesignerProfile): Promise<DesignerProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(designerProfiles).values(data);
  const id = (result as any)[0]?.insertId ?? (data as any).id;
  return (await db.select().from(designerProfiles).where(eq(designerProfiles.id, id)))[0];
}

export async function updateDesignerProfile(
  id: number,
  data: Partial<InsertDesignerProfile>,
): Promise<DesignerProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(designerProfiles).set(data).where(eq(designerProfiles.id, id));
  return (await db.select().from(designerProfiles).where(eq(designerProfiles.id, id)))[0];
}

// ─── designerCollections ───
export async function getDesignerCollectionsByDesigner(designerProfileId: number): Promise<DesignerCollection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designerCollections)
    .where(eq(designerCollections.designerProfileId, designerProfileId))
    .orderBy(desc(designerCollections.createdAt));
}

export async function getPublicDesignerCollections(limit = 60): Promise<DesignerCollection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(designerCollections)
    .where(eq(designerCollections.visibility, "public"))
    .orderBy(desc(designerCollections.createdAt))
    .limit(limit);
}

export async function getDesignerCollectionById(id: number): Promise<DesignerCollection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(designerCollections).where(eq(designerCollections.id, id)).limit(1);
  return rows[0];
}

export async function createDesignerCollection(data: InsertDesignerCollection): Promise<DesignerCollection> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(designerCollections).values(data);
  const id = (result as any)[0]?.insertId ?? (data as any).id;
  return (await db.select().from(designerCollections).where(eq(designerCollections.id, id)))[0];
}

export async function updateDesignerCollection(
  id: number,
  data: Partial<InsertDesignerCollection>,
): Promise<DesignerCollection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(designerCollections).set(data).where(eq(designerCollections.id, id));
  return (await db.select().from(designerCollections).where(eq(designerCollections.id, id)))[0];
}

export async function deleteDesignerCollection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(designerCollections).where(eq(designerCollections.id, id));
}

// ─── wardrobeItems ───
export async function getWardrobeItemById(id: number): Promise<WardrobeItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)).limit(1);
  return rows[0];
}

export async function getWardrobeItemsByCollection(collectionId: number): Promise<WardrobeItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeItems)
    .where(and(eq(wardrobeItems.collectionId, collectionId), eq(wardrobeItems.status, "active")))
    .orderBy(desc(wardrobeItems.createdAt));
}

export async function getPublicWardrobeItems(limit = 100): Promise<WardrobeItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeItems)
    .where(and(eq(wardrobeItems.visibility, "public"), eq(wardrobeItems.status, "active")))
    .orderBy(desc(wardrobeItems.createdAt))
    .limit(limit);
}

export async function getWardrobeItemsByUser(userId: number): Promise<WardrobeItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeItems)
    .where(eq(wardrobeItems.userId, userId))
    .orderBy(desc(wardrobeItems.createdAt));
}

export async function getProjectWardrobeItems(projectId: number): Promise<WardrobeItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeItems)
    .where(eq(wardrobeItems.projectId, projectId))
    .orderBy(desc(wardrobeItems.createdAt));
}

export async function createWardrobeItem(data: InsertWardrobeItem): Promise<WardrobeItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(wardrobeItems).values(data);
  const id = (result as any)[0]?.insertId ?? (data as any).id;
  return (await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)))[0];
}

export async function updateWardrobeItem(
  id: number,
  data: Partial<InsertWardrobeItem>,
): Promise<WardrobeItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(wardrobeItems).set(data).where(eq(wardrobeItems.id, id));
  return (await db.select().from(wardrobeItems).where(eq(wardrobeItems.id, id)))[0];
}

export async function deleteWardrobeItem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(wardrobeItems).where(eq(wardrobeItems.id, id));
}

// ─── wardrobeAssignments ───
export async function getWardrobeAssignmentsByProject(projectId: number): Promise<WardrobeAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeAssignments)
    .where(eq(wardrobeAssignments.projectId, projectId))
    .orderBy(desc(wardrobeAssignments.createdAt));
}

export async function getWardrobeAssignmentsByCharacter(characterId: number): Promise<WardrobeAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeAssignments)
    .where(eq(wardrobeAssignments.characterId, characterId));
}

export async function getWardrobeAssignmentsByScene(sceneId: number): Promise<WardrobeAssignment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeAssignments)
    .where(eq(wardrobeAssignments.sceneId, sceneId));
}

/**
 * Fetch all Character rows assigned to a scene.
 * The scene stores characterIds as a JSON array; we parse it and batch-select
 * the matching characters in a single query.
 */
export async function getSceneCharacters(sceneId: number) {
  const db = await getDb();
  if (!db) return [];
  const [rows] = await db.execute(sql`SELECT characterIds FROM scenes WHERE id = ${sceneId} LIMIT 1`);
  const scene = (rows as unknown as any[])?.[0];
  if (!scene?.characterIds) return [];
  let ids: number[];
  try {
    ids = typeof scene.characterIds === "string"
      ? JSON.parse(scene.characterIds)
      : scene.characterIds;
  } catch {
    return [];
  }
  if (!Array.isArray(ids) || ids.length === 0) return [];
  return db.select().from(characters).where(inArray(characters.id, ids)).orderBy(asc(characters.name));
}

export async function getWardrobeAssignmentById(id: number): Promise<WardrobeAssignment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(wardrobeAssignments).where(eq(wardrobeAssignments.id, id)).limit(1);
  return rows[0];
}

export async function createWardrobeAssignment(data: InsertWardrobeAssignment): Promise<WardrobeAssignment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(wardrobeAssignments).values(data);
  const id = (result as any)[0]?.insertId ?? (data as any).id;
  return (await db.select().from(wardrobeAssignments).where(eq(wardrobeAssignments.id, id)))[0];
}

export async function deleteWardrobeAssignment(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(wardrobeAssignments).where(eq(wardrobeAssignments.id, id));
}

// ─── wardrobeLeases ───
export async function createWardrobeLease(data: InsertWardrobeLease): Promise<WardrobeLease> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(wardrobeLeases).values(data);
  const id = (result as any)[0]?.insertId;
  return (await db.select().from(wardrobeLeases).where(eq(wardrobeLeases.id, id)))[0];
}

export async function getWardrobeLeasesByUser(userId: number): Promise<WardrobeLease[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeLeases)
    .where(eq(wardrobeLeases.userId, userId))
    .orderBy(desc(wardrobeLeases.createdAt));
}

export async function getWardrobeLeaseById(id: number): Promise<WardrobeLease | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(wardrobeLeases).where(eq(wardrobeLeases.id, id)).limit(1);
  return rows[0];
}

export async function updateWardrobeLease(
  id: number,
  data: Partial<InsertWardrobeLease>,
): Promise<WardrobeLease | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(wardrobeLeases).set(data).where(eq(wardrobeLeases.id, id));
  return (await db.select().from(wardrobeLeases).where(eq(wardrobeLeases.id, id)))[0];
}

export async function getWardrobeLeasesByDesigner(designerProfileId: number): Promise<WardrobeLease[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wardrobeLeases)
    .where(eq(wardrobeLeases.designerProfileId, designerProfileId))
    .orderBy(desc(wardrobeLeases.createdAt));
}

export async function getWardrobeLeaseByPaymentIntent(
  stripePaymentIntentId: string,
): Promise<WardrobeLease | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(wardrobeLeases)
    .where(eq(wardrobeLeases.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return rows[0];
}
