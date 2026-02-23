import { eq, and, asc, desc, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  InsertProject, projects,
  InsertCharacter, characters,
  InsertScene, scenes,
  InsertGenerationJob, generationJobs,
  InsertScript, scripts,
  InsertSoundtrack, soundtracks,
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
