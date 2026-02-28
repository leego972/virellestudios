import { eq, and, asc, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import {
  InsertUser, users,
  InsertProject, projects,
  InsertCharacter, characters,
  InsertScene, scenes,
  InsertGenerationJob, generationJobs,
  InsertScript, scripts,
  InsertSoundtrack, soundtracks,
  InsertCredit, credits,
  InsertLocation, locations,
  InsertMoodBoardItem, moodBoardItems,
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
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
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
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
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

export async function createEmailUser(data: { email: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const openId = `email_${data.email}`; // generate a stable openId from email
  await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
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

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
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
  await db.delete(scenes).where(eq(scenes.projectId, id));
  await db.delete(characters).where(eq(characters.projectId, id));
  await db.delete(generationJobs).where(eq(generationJobs.projectId, id));
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
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

export async function deleteCharacter(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(characters).where(eq(characters.id, id));
}

// ─── Scenes ───
export async function createScene(data: InsertScene) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scenes).values(data);
  const id = result[0].insertId;
  return (await db.select().from(scenes).where(eq(scenes.id, id)))[0];
}

export async function getProjectScenes(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scenes).where(eq(scenes.projectId, projectId)).orderBy(asc(scenes.orderIndex));
}

export async function getSceneById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scenes).where(eq(scenes.id, id)).limit(1);
  return result[0];
}

export async function updateScene(id: number, data: Partial<InsertScene>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scenes).set(data).where(eq(scenes.id, id));
  return (await db.select().from(scenes).where(eq(scenes.id, id)))[0];
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
  
  // Create new project
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
  subscriptionTier?: "free" | "pro" | "industry";
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
  // Reduce the used count (effectively giving bonus generations)
  const newUsed = Math.max(0, (user.monthlyGenerationsUsed || 0) - amount);
  await db.update(users).set({ monthlyGenerationsUsed: newUsed }).where(eq(users.id, userId));
}

// ─── BYOK API Key Management ───

export async function updateUserApiKey(userId: number, column: string, value: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Use raw SQL since column name is dynamic
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
  preferredProvider: string | null;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  // Decode base64-encoded keys
  const decode = (val: string | null | undefined): string | null => {
    if (!val) return null;
    try {
      return Buffer.from(val, "base64").toString("utf-8");
    } catch {
      return val; // Already plain text
    }
  };

  return {
    openaiKey: decode((user as any).userOpenaiKey),
    runwayKey: decode((user as any).userRunwayKey),
    replicateKey: decode((user as any).userReplicateKey),
    falKey: decode((user as any).userFalKey),
    lumaKey: decode((user as any).userLumaKey),
    hfToken: decode((user as any).userHfToken),
    preferredProvider: (user as any).preferredVideoProvider || null,
  };
}
