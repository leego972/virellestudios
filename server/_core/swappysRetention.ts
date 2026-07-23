import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { storageDelete, storagePut } from "../storage";
import { logger } from "./logger";

export const SWAPPYS_RETENTION_DAYS = 30;
export const SWAPPYS_RETENTION_POLICY_VERSION = "private-output-30d-2026-07";

const MAX_RETAINED_OUTPUT_BYTES = 25 * 1024 * 1024;
const CLEANUP_BATCH_SIZE = 100;

export type SwappysOutputProduct = "swappys_mobile" | "virelle_swappys_studio";

export function swappysExpiryFrom(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + SWAPPYS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function rowsFromExecute(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

function safeMimeType(value: string | null): string {
  const mime = String(value || "").split(";")[0].trim().toLowerCase();
  if (!mime.startsWith("image/")) {
    throw new Error("Swappys output retention accepts image results only.");
  }
  return mime;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function subjectHash(subject: string): string {
  return createHash("sha256").update(subject || "anonymous").digest("hex");
}

export async function ensureSwappysRetentionTable(dbConn: any): Promise<void> {
  await dbConn.execute(sql`
    CREATE TABLE IF NOT EXISTS swappys_generated_outputs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      ownerUserId INT NULL,
      requestSubjectHash CHAR(64) NOT NULL,
      product VARCHAR(40) NOT NULL,
      storageKey VARCHAR(768) NOT NULL,
      retainedUrl TEXT NULL,
      providerUrlHash CHAR(64) NOT NULL,
      mimeType VARCHAR(100) NOT NULL,
      byteSize BIGINT NOT NULL,
      keepFlag TINYINT(1) NOT NULL DEFAULT 0,
      keepReason VARCHAR(500) NULL,
      keptByUserId INT NULL,
      keptAt DATETIME NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      metadata JSON NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deletedAt DATETIME NULL,
      INDEX idx_sgo_owner (ownerUserId),
      INDEX idx_sgo_expiry (keepFlag, status, expiresAt),
      INDEX idx_sgo_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export async function retainSwappysOutput(input: {
  dbConn: any;
  sourceUrl: string;
  ownerUserId?: number | null;
  requestSubject: string;
  product: SwappysOutputProduct;
  metadata?: Record<string, unknown> | null;
}): Promise<{ id: number | null; storageKey: string; expiresAt: Date }> {
  await ensureSwappysRetentionTable(input.dbConn);

  const parsed = new URL(input.sourceUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Swappys output provider returned an unsafe URL.");
  }

  const response = await fetch(parsed.toString(), {
    method: "GET",
    headers: { Accept: "image/*" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Could not retain Swappys output (HTTP ${response.status}).`);
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_RETAINED_OUTPUT_BYTES) {
    throw new Error("Swappys output is too large for retained storage.");
  }

  const mimeType = safeMimeType(response.headers.get("content-type"));
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_RETAINED_OUTPUT_BYTES) {
    throw new Error("Swappys output size is invalid for retained storage.");
  }

  const createdAt = new Date();
  const expiresAt = swappysExpiryFrom(createdAt);
  const datePath = createdAt.toISOString().slice(0, 7).replace("-", "/");
  const storageKey = `swappys/retained/${datePath}/${randomUUID()}.${extensionForMimeType(mimeType)}`;
  const stored = await storagePut(storageKey, bytes, mimeType, { public: false });
  const providerUrlHash = createHash("sha256").update(parsed.toString()).digest("hex");

  const insertResult: any = await input.dbConn.execute(sql`
    INSERT INTO swappys_generated_outputs (
      ownerUserId,
      requestSubjectHash,
      product,
      storageKey,
      retainedUrl,
      providerUrlHash,
      mimeType,
      byteSize,
      metadata,
      expiresAt
    ) VALUES (
      ${input.ownerUserId ?? null},
      ${subjectHash(input.requestSubject)},
      ${input.product},
      ${stored.key},
      ${stored.url || null},
      ${providerUrlHash},
      ${mimeType},
      ${bytes.byteLength},
      ${input.metadata ? JSON.stringify(input.metadata) : null},
      ${expiresAt}
    )
  `);

  const id = Number(insertResult?.[0]?.insertId ?? insertResult?.insertId ?? 0) || null;
  logger.info("[SwappysRetention] retained output", {
    id,
    ownerUserId: input.ownerUserId ?? "anonymous",
    product: input.product,
    storageKey: stored.key,
    expiresAt: expiresAt.toISOString(),
  });

  return { id, storageKey: stored.key, expiresAt };
}

export async function setSwappysOutputKeep(input: {
  dbConn: any;
  outputId: number;
  keep: boolean;
  adminUserId: number;
  reason?: string | null;
}): Promise<void> {
  await ensureSwappysRetentionTable(input.dbConn);
  const reason = input.reason?.trim().slice(0, 500) || null;
  await input.dbConn.execute(sql`
    UPDATE swappys_generated_outputs
    SET
      keepFlag = ${input.keep ? 1 : 0},
      keepReason = ${input.keep ? reason : null},
      keptByUserId = ${input.keep ? input.adminUserId : null},
      keptAt = ${input.keep ? new Date() : null}
    WHERE id = ${input.outputId}
      AND status = 'active'
    LIMIT 1
  `);
}

export async function listSwappysRetainedOutputs(input: {
  dbConn: any;
  limit?: number;
  keptOnly?: boolean;
}): Promise<any[]> {
  await ensureSwappysRetentionTable(input.dbConn);
  const limit = Math.max(1, Math.min(200, Math.floor(input.limit || 100)));
  const result: any = input.keptOnly
    ? await input.dbConn.execute(sql`
        SELECT id, ownerUserId, product, storageKey, retainedUrl, mimeType, byteSize,
               keepFlag, keepReason, keptByUserId, keptAt, status, expiresAt, createdAt, deletedAt
        FROM swappys_generated_outputs
        WHERE keepFlag = 1
        ORDER BY createdAt DESC
        LIMIT ${limit}
      `)
    : await input.dbConn.execute(sql`
        SELECT id, ownerUserId, product, storageKey, retainedUrl, mimeType, byteSize,
               keepFlag, keepReason, keptByUserId, keptAt, status, expiresAt, createdAt, deletedAt
        FROM swappys_generated_outputs
        ORDER BY createdAt DESC
        LIMIT ${limit}
      `);
  return rowsFromExecute(result);
}

export async function cleanupExpiredSwappysOutputs(dbConn: any): Promise<{
  inspected: number;
  deleted: number;
  failed: number;
}> {
  await ensureSwappysRetentionTable(dbConn);
  const result: any = await dbConn.execute(sql`
    SELECT id, storageKey
    FROM swappys_generated_outputs
    WHERE keepFlag = 0
      AND status = 'active'
      AND expiresAt <= NOW()
    ORDER BY expiresAt ASC
    LIMIT ${CLEANUP_BATCH_SIZE}
  `);
  const rows = rowsFromExecute(result);
  let deleted = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await storageDelete(String(row.storageKey));
      await dbConn.execute(sql`
        UPDATE swappys_generated_outputs
        SET status = 'deleted', deletedAt = NOW(), retainedUrl = NULL
        WHERE id = ${Number(row.id)}
        LIMIT 1
      `);
      deleted += 1;
    } catch (error: any) {
      failed += 1;
      logger.warn("[SwappysRetention] cleanup failed", {
        outputId: Number(row.id),
        storageKey: String(row.storageKey),
        message: error?.message || String(error),
      });
    }
  }

  return { inspected: rows.length, deleted, failed };
}
