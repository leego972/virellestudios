import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

const RESULT_TTL_HOURS = 24;

async function ensureMobileTables(dbConn: any): Promise<void> {
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS swappys_mobile_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      resultToken VARCHAR(80) NOT NULL UNIQUE,
      userId INT NOT NULL,
      imageUrl TEXT NOT NULL,
      metadata JSON NULL,
      projectId INT NULL,
      sceneId INT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      savedAt DATETIME NULL,
      expiresAt DATETIME NOT NULL,
      INDEX idx_smr_user (userId),
      INDEX idx_smr_scene (sceneId),
      INDEX idx_smr_expiry (expiresAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS scene_vfx_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sceneId INT NOT NULL,
      userId INT NOT NULL,
      vfxPackIds JSON,
      sfxPackIds JSON,
      enhancedImageUrl TEXT,
      sfxAudioUrl TEXT,
      sfxPrompt TEXT,
      metadata JSON,
      appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_scene (sceneId),
      INDEX idx_svd_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS scene_swappys_exports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sceneId INT NOT NULL,
      projectId INT NOT NULL,
      userId INT NOT NULL,
      sourcePlateUrl TEXT,
      actorReferenceUrl TEXT,
      outputImageUrl TEXT,
      resultToken VARCHAR(80),
      mode VARCHAR(64) NOT NULL,
      quality VARCHAR(32) NOT NULL,
      visibleWatermarkMode VARCHAR(64) NOT NULL,
      consentConfirmed TINYINT(1) NOT NULL DEFAULT 0,
      consentNotes TEXT,
      creditCost INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'queued',
      metadata JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sse_scene (sceneId),
      INDEX idx_sse_project (projectId),
      INDEX idx_sse_user (userId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try { await dbConn.execute(sql`ALTER TABLE scene_swappys_exports ADD COLUMN outputImageUrl TEXT NULL`); } catch {}
  try { await dbConn.execute(sql`ALTER TABLE scene_swappys_exports ADD COLUMN resultToken VARCHAR(80) NULL`); } catch {}
}

export async function createSwappysMobileResult(
  userId: number,
  imageUrl: string,
  metadata: Record<string, unknown>,
): Promise<string> {
  if (!/^https:\/\//i.test(imageUrl)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Provider returned an insecure output URL." });
  }
  const dbConn = await db.getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  await ensureMobileTables(dbConn);
  const token = nanoid(48);
  await dbConn.execute(sql`
    INSERT INTO swappys_mobile_results
      (resultToken, userId, imageUrl, metadata, status, expiresAt)
    VALUES
      (${token}, ${userId}, ${imageUrl}, ${JSON.stringify(metadata)}, 'pending', DATE_ADD(NOW(), INTERVAL ${RESULT_TTL_HOURS} HOUR))
  `);
  return token;
}

export async function listSwappysMobileDestinations(userId: number) {
  const projects = await db.getUserProjects(userId, 100);
  return Promise.all(projects.map(async (project) => {
    const scenes = await db.getProjectScenes(project.id);
    return {
      id: project.id,
      title: project.title,
      scenes: scenes.map((scene) => ({
        id: scene.id,
        orderIndex: scene.orderIndex,
        title: scene.title || `Scene ${Number(scene.orderIndex ?? 0) + 1}`,
      })),
    };
  }));
}

export async function saveSwappysMobileResult(input: {
  userId: number;
  resultToken: string;
  projectId: number;
  sceneId: number;
}) {
  const project = await db.getProjectById(input.projectId, input.userId);
  if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this project." });
  const scene = await db.getSceneById(input.sceneId);
  if (!scene || scene.projectId !== input.projectId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "The selected scene does not belong to this project." });
  }

  const dbConn = await db.getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
  await ensureMobileTables(dbConn);
  const resultRows: any = await dbConn.execute(sql`
    SELECT id, imageUrl, metadata, status, expiresAt
    FROM swappys_mobile_results
    WHERE resultToken = ${input.resultToken}
      AND userId = ${input.userId}
      AND expiresAt > NOW()
    LIMIT 1
  `);
  const rows = Array.isArray(resultRows?.[0]) ? resultRows[0] : [];
  const result = rows[0];
  if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "This Swappys result is missing or has expired." });

  if (result.status === "saved") {
    return { ok: true, alreadySaved: true, projectId: input.projectId, sceneId: input.sceneId, imageUrl: result.imageUrl };
  }

  const metadata = typeof result.metadata === "string"
    ? (() => { try { return JSON.parse(result.metadata); } catch { return {}; } })()
    : (result.metadata || {});
  const savedMetadata = {
    ...metadata,
    source: "swappys_mobile",
    resultToken: input.resultToken,
    savedAt: new Date().toISOString(),
  };

  await dbConn.transaction(async (tx: any) => {
    await tx.execute(sql`
      INSERT INTO scene_vfx_data
        (sceneId, userId, vfxPackIds, enhancedImageUrl, sfxPrompt, metadata)
      VALUES
        (${input.sceneId}, ${input.userId}, ${JSON.stringify([9001])}, ${result.imageUrl}, ${"Swappys mobile image transformation"}, ${JSON.stringify(savedMetadata)})
      ON DUPLICATE KEY UPDATE
        vfxPackIds = ${JSON.stringify([9001])},
        enhancedImageUrl = ${result.imageUrl},
        sfxPrompt = ${"Swappys mobile image transformation"},
        metadata = ${JSON.stringify(savedMetadata)},
        appliedAt = NOW()
    `);
    await tx.execute(sql`
      INSERT INTO scene_swappys_exports
        (sceneId, projectId, userId, outputImageUrl, resultToken, mode, quality, visibleWatermarkMode, consentConfirmed, consentNotes, creditCost, status, metadata)
      VALUES
        (${input.sceneId}, ${input.projectId}, ${input.userId}, ${result.imageUrl}, ${input.resultToken}, 'mobile_face_transform', 'preview', 'subscription_entitlement', 1, ${"Confirmed in Swappys mobile before generation"}, 0, 'completed', ${JSON.stringify(savedMetadata)})
    `);
    await tx.execute(sql`
      UPDATE swappys_mobile_results
      SET projectId = ${input.projectId}, sceneId = ${input.sceneId}, status = 'saved', savedAt = NOW()
      WHERE id = ${result.id} AND userId = ${input.userId}
    `);
  });

  await db.updateScene(input.sceneId, {
    vfxNotes: "Swappys mobile transformation saved to this scene.",
    status: "draft",
  } as any);

  return { ok: true, alreadySaved: false, projectId: input.projectId, sceneId: input.sceneId, imageUrl: result.imageUrl };
}
