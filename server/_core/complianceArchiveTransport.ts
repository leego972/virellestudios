import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Readable, Transform } from "node:stream";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import * as db from "../db";
import { logger } from "./logger";
import {
  complianceRetentionDays,
  ensureComplianceEvidenceTables,
  registerComplianceArchive,
} from "./complianceEvidence";
import { assertComplianceArchiveConfiguration } from "./complianceEvidenceGuards";

const ARCHIVE_PREFIX = "compliance-archive";
const MAX_REDIRECTS = 4;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 * 1024;

type Workspace = "standard" | "adult";
type MediaKind = "video" | "broadcast";

type ArchiveCandidate = {
  userId: number;
  accountName: string;
  sourceTable: string;
  sourceId: string;
  sourceType: string;
  workspace: Workspace;
  mediaKind: MediaKind;
  sourceUrl: string;
  userDownloadUrl: string;
  startedAt: Date;
  completedAt: Date;
  mimeType?: string | null;
};

type StorageConfig = {
  client: S3Client;
  sourceBucket: string;
  archiveBucket: string;
  endpoint: string;
  publicUrl: string;
  region: string;
};

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

function parseDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value || Date.now()));
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function safePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "record";
}

function storageConfig(): StorageConfig {
  assertComplianceArchiveConfiguration();
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = (process.env.AWS_S3_ENDPOINT || "").replace(/\/+$/, "");
  const accessKeyId = String(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = String(process.env.AWS_SECRET_ACCESS_KEY);
  return {
    client: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    }),
    sourceBucket: String(process.env.AWS_S3_BUCKET),
    archiveBucket: String(process.env.COMPLIANCE_ARCHIVE_BUCKET),
    endpoint,
    publicUrl: (process.env.AWS_S3_PUBLIC_URL || "").replace(/\/+$/, ""),
    region,
  };
}

function sourceKeyFromOwnStorage(url: string, config: StorageConfig): string | null {
  try {
    const parsed = new URL(url);
    if (config.publicUrl && url.startsWith(`${config.publicUrl}/`)) {
      return decodeURIComponent(url.slice(config.publicUrl.length + 1).split("?")[0]);
    }
    if (config.endpoint) {
      const prefix = `${config.endpoint}/${config.sourceBucket}/`;
      if (url.startsWith(prefix)) {
        return decodeURIComponent(url.slice(prefix.length).split("?")[0]);
      }
    }
    const virtualHosts = new Set([
      `${config.sourceBucket}.s3.amazonaws.com`,
      `${config.sourceBucket}.s3.${config.region}.amazonaws.com`,
    ]);
    if (virtualHosts.has(parsed.hostname.toLowerCase())) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    }
  } catch {
    return null;
  }
  return null;
}

function archiveObjectKey(row: any): string {
  const startedAt = parseDate(row.startedAt).toISOString().replace(/[:.]/g, "-");
  let extension = ".mp4";
  try {
    const match = new URL(String(row.sourceUrl)).pathname.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);
    if (match) extension = `.${match[1].toLowerCase()}`;
  } catch {
    if (String(row.mimeType || "").includes("webm")) extension = ".webm";
  }
  return [
    ARCHIVE_PREFIX,
    row.workspace === "adult" ? "adult" : "standard",
    `${safePart(String(row.accountName || `user-${row.userId}`))}-${row.userId}`,
    `${startedAt}-${safePart(String(row.sourceType))}-${safePart(String(row.sourceId))}${extension}`,
  ].join("/");
}

function privateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (!isIP(address) || address.includes(":")) return false;
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = octets;
  return a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || a >= 224;
}

function configuredAllowedHosts(config: StorageConfig): string[] {
  const values = String(process.env.COMPLIANCE_ALLOWED_MEDIA_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  for (const rawUrl of [config.publicUrl, config.endpoint]) {
    if (!rawUrl) continue;
    try { values.push(new URL(rawUrl).hostname.toLowerCase()); } catch { /* ignored */ }
  }
  values.push(`${config.sourceBucket}.s3.amazonaws.com`);
  values.push(`${config.sourceBucket}.s3.${config.region}.amazonaws.com`);
  return Array.from(new Set(values));
}

function hostAllowed(hostname: string, allowedHosts: string[]): boolean {
  const host = hostname.toLowerCase();
  return allowedHosts.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1);
      return host.endsWith(suffix) && host !== suffix.slice(1);
    }
    if (entry.startsWith(".")) return host.endsWith(entry);
    return host === entry;
  });
}

async function assertSafeRemoteMediaUrl(
  rawUrl: string,
  config: StorageConfig,
): Promise<URL> {
  let url: URL;
  try { url = new URL(rawUrl); } catch {
    throw new Error("Archive source URL is invalid.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Archive source must be an unauthenticated HTTPS URL.");
  }
  if (url.port && url.port !== "443") {
    throw new Error("Archive source must use the standard HTTPS port.");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host === "metadata.google.internal"
  ) {
    throw new Error("Archive source host is prohibited.");
  }
  const allowedHosts = configuredAllowedHosts(config);
  if (!hostAllowed(host, allowedHosts)) {
    throw new Error(
      `Archive source host ${host} is not allowlisted. Add it to COMPLIANCE_ALLOWED_MEDIA_HOSTS.`,
    );
  }
  if (isIP(host) && privateAddress(host)) {
    throw new Error("Archive source resolves to a prohibited network address.");
  }
  const resolved = await lookup(host, { all: true, verbatim: true });
  if (!resolved.length || resolved.some((entry) => privateAddress(entry.address))) {
    throw new Error("Archive source resolves to a prohibited network address.");
  }
  return url;
}

async function secureMediaFetch(
  rawUrl: string,
  config: StorageConfig,
): Promise<Response> {
  let current = await assertSafeRemoteMediaUrl(rawUrl, config);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "video/*,application/octet-stream;q=0.8",
        "User-Agent": "Virelle-Compliance-Archive/2.0",
      },
      signal: AbortSignal.timeout(120_000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) throw new Error("Archive source redirect omitted a location.");
    current = await assertSafeRemoteMediaUrl(
      new URL(location, current).toString(),
      config,
    );
  }
  throw new Error("Archive source exceeded the redirect limit.");
}

async function ensureTransportColumns(connection: any): Promise<void> {
  const alterations = [
    sql`ALTER TABLE compliance_media_archive ADD COLUMN archiveAttempts INT NOT NULL DEFAULT 0`,
    sql`ALTER TABLE compliance_media_archive ADD COLUMN nextAttemptAt DATETIME NULL`,
    sql`ALTER TABLE compliance_media_archive ADD COLUMN archiveBytes BIGINT NULL`,
    sql`ALTER TABLE compliance_media_archive ADD COLUMN archiveEtag VARCHAR(255) NULL`,
  ];
  for (const alteration of alterations) {
    try { await connection.execute(alteration); } catch { /* already present */ }
  }
}

async function registerRows(
  connection: any,
  query: any,
  mapper: (row: any) => ArchiveCandidate,
): Promise<number> {
  try {
    const result = await connection.execute(query);
    let count = 0;
    for (const row of rowsFrom(result)) {
      if (await registerComplianceArchive(mapper(row))) count++;
    }
    return count;
  } catch (error: any) {
    logger.warn(
      `[ComplianceArchive] completed-output source skipped: ${String(error?.message || error).slice(0, 400)}`,
    );
    return 0;
  }
}

/** Registers only completed, stable video outputs. */
export async function scanCompletedVideoOutputs(): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  let discovered = 0;

  discovered += await registerRows(connection, sql`
    SELECT m.id, m.userId, m.fileUrl, m.mimeType, m.createdAt, m.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', m.userId)) AS accountName
    FROM movies m
    INNER JOIN users u ON u.id=m.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('movies:', m.id, ':', m.fileUrl), 256)
    WHERE m.fileUrl IS NOT NULL AND m.fileUrl<>'' AND a.id IS NULL
    ORDER BY m.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "movies",
    sourceId: String(row.id),
    sourceType: "movie",
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.fileUrl),
    userDownloadUrl: String(row.fileUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: row.mimeType || "video/mp4",
  }));

  discovered += await registerRows(connection, sql`
    SELECT s.id, p.userId, s.videoUrl, s.createdAt, s.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM scenes s
    INNER JOIN projects p ON p.id=s.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('scenes:', s.id, ':', s.videoUrl), 256)
    WHERE s.status='completed' AND s.videoUrl IS NOT NULL
      AND s.videoUrl<>'' AND a.id IS NULL
    ORDER BY s.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "scenes",
    sourceId: String(row.id),
    sourceType: "scene_video",
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.videoUrl),
    userDownloadUrl: String(row.videoUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  discovered += await registerRows(connection, sql`
    SELECT s.id, p.userId, s.vfxSuiteOutputUrl, s.createdAt, s.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM scenes s
    INNER JOIN projects p ON p.id=s.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('scenes_vfx:', s.id, ':', s.vfxSuiteOutputUrl), 256)
    WHERE s.vfxSuiteOutputUrl IS NOT NULL AND s.vfxSuiteOutputUrl<>'' AND a.id IS NULL
    ORDER BY s.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "scenes_vfx",
    sourceId: String(row.id),
    sourceType: "scene_vfx_output",
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.vfxSuiteOutputUrl),
    userDownloadUrl: String(row.vfxSuiteOutputUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  discovered += await registerRows(connection, sql`
    SELECT s.id, p.userId, s.compositeOutputUrl, s.createdAt, s.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM scenes s
    INNER JOIN projects p ON p.id=s.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('scenes_composite:', s.id, ':', s.compositeOutputUrl), 256)
    WHERE s.compositeOutputUrl IS NOT NULL AND s.compositeOutputUrl<>'' AND a.id IS NULL
    ORDER BY s.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "scenes_composite",
    sourceId: String(row.id),
    sourceType: "scene_composite_output",
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.compositeOutputUrl),
    userDownloadUrl: String(row.compositeOutputUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  discovered += await registerRows(connection, sql`
    SELECT j.id, p.userId, j.resultUrl, j.type, j.createdAt, j.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM generationJobs j
    INNER JOIN projects p ON p.id=j.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('generationJobs:', j.id, ':', j.resultUrl), 256)
    WHERE j.status='completed' AND j.resultUrl IS NOT NULL
      AND j.resultUrl<>'' AND a.id IS NULL
    ORDER BY j.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "generationJobs",
    sourceId: String(row.id),
    sourceType: `generation_${row.type || "video"}`,
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.resultUrl),
    userDownloadUrl: String(row.resultUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  discovered += await registerRows(connection, sql`
    SELECT v.id, v.userId, v.outputVideoUrl, v.mode, v.contentMode,
           v.broadcastStartedAt, v.broadcastCompletedAt,
           v.createdAt, v.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', v.userId)) AS accountName
    FROM virelle_video_transform_jobs v
    INNER JOIN users u ON u.id=v.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('virelle_video_transform_jobs:', v.id, ':', v.outputVideoUrl), 256)
    WHERE v.status='completed' AND v.outputVideoUrl IS NOT NULL
      AND v.outputVideoUrl<>'' AND a.id IS NULL
    ORDER BY v.id DESC LIMIT 150
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceTable: "virelle_video_transform_jobs",
    sourceId: String(row.id),
    sourceType: row.mode === "broadcast" ? "broadcast_recording" : "studio_render",
    workspace: row.contentMode === "open_adult" ? "adult" : "standard",
    mediaKind: row.mode === "broadcast" ? "broadcast" : "video",
    sourceUrl: String(row.outputVideoUrl),
    userDownloadUrl: String(row.outputVideoUrl),
    startedAt: parseDate(row.broadcastStartedAt || row.createdAt),
    completedAt: parseDate(row.broadcastCompletedAt || row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  return discovered;
}

async function copyPendingRow(row: any, config: StorageConfig) {
  const key = archiveObjectKey(row);
  const ownKey = sourceKeyFromOwnStorage(String(row.sourceUrl), config);
  if (ownKey) {
    const result = await config.client.send(new CopyObjectCommand({
      Bucket: config.archiveBucket,
      Key: key,
      CopySource: `${config.sourceBucket}/${encodeURIComponent(ownKey).replace(/%2F/g, "/")}`,
      MetadataDirective: "COPY",
    }));
    return {
      key,
      bytes: null,
      etag: result.CopyObjectResult?.ETag || null,
    };
  }

  const response = await secureMediaFetch(String(row.sourceUrl), config);
  if (!response.ok || !response.body) {
    throw new Error(`Archive source returned HTTP ${response.status}.`);
  }
  const contentType = String(response.headers.get("content-type") || row.mimeType || "");
  if (
    contentType
    && !contentType.startsWith("video/")
    && contentType !== "application/octet-stream"
  ) {
    throw new Error(`Archive source returned unsupported content type: ${contentType}`);
  }
  const maxBytes = Math.max(
    256 * 1024 * 1024,
    Number(process.env.COMPLIANCE_ARCHIVE_MAX_BYTES || DEFAULT_MAX_BYTES),
  );
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new Error(`Archive source exceeds the configured size limit (${declared} bytes).`);
  }
  let observed = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      observed += chunk.length;
      if (observed > maxBytes) {
        callback(new Error(`Archive source exceeded ${maxBytes} bytes.`));
        return;
      }
      callback(null, chunk);
    },
  });
  const body = Readable.fromWeb(response.body as any).pipe(limiter);
  const result = await config.client.send(new PutObjectCommand({
    Bucket: config.archiveBucket,
    Key: key,
    Body: body,
    ...(declared > 0 ? { ContentLength: declared } : {}),
    ContentType: contentType || "video/mp4",
    Metadata: {
      virelleUserId: String(row.userId),
      virelleWorkspace: row.workspace === "adult" ? "adult" : "standard",
      virelleSource: String(row.sourceType).slice(0, 120),
      virelleRetentionDays: String(complianceRetentionDays),
    },
  }));
  return { key, bytes: observed || declared || null, etag: result.ETag || null };
}

export async function processSecureArchiveQueue(limit = 3): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  await ensureTransportColumns(connection);
  const config = storageConfig();
  const result = await connection.execute(sql`
    SELECT * FROM compliance_media_archive
    WHERE archiveStatus IN ('pending','copy_failed')
      AND expiredDeletedAt IS NULL
      AND retainedUntil>NOW()
      AND (nextAttemptAt IS NULL OR nextAttemptAt<=NOW())
    ORDER BY CASE WHEN archiveStatus='pending' THEN 0 ELSE 1 END, createdAt ASC
    LIMIT ${Math.max(1, Math.min(limit, 20))}
  `);
  let archived = 0;
  for (const row of rowsFrom(result)) {
    const id = Number(row.id);
    const attempts = Number(row.archiveAttempts || 0) + 1;
    await connection.execute(sql`
      UPDATE compliance_media_archive
      SET archiveStatus='copying', archiveError=NULL,
          archiveAttempts=${attempts}, nextAttemptAt=NULL
      WHERE id=${id}
    `);
    try {
      const copy = await copyPendingRow(row, config);
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='archived', archiveObjectKey=${copy.key},
            archiveBytes=${copy.bytes}, archiveEtag=${copy.etag},
            archiveError=NULL, archivedAt=NOW(), nextAttemptAt=NULL
        WHERE id=${id}
      `);
      archived++;
    } catch (error: any) {
      const message = String(error?.message || error).slice(0, 2000);
      const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='copy_failed', archiveError=${message},
            nextAttemptAt=DATE_ADD(NOW(), INTERVAL ${retryMinutes} MINUTE)
        WHERE id=${id}
      `);
      logger.error(
        `[ComplianceArchive] secure copy #${id} failed; retry in ${retryMinutes}m: ${message}`,
      );
    }
  }
  return archived;
}

export async function purgeSecureExpiredArchive(limit = 100): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  const config = storageConfig();
  const result = await connection.execute(sql`
    SELECT id, archiveObjectKey FROM compliance_media_archive
    WHERE legalHold=0 AND retainedUntil<NOW() AND archiveStatus='archived'
      AND archiveObjectKey IS NOT NULL AND expiredDeletedAt IS NULL
    ORDER BY retainedUntil ASC LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  let deleted = 0;
  for (const row of rowsFrom(result)) {
    try {
      await config.client.send(new DeleteObjectCommand({
        Bucket: config.archiveBucket,
        Key: String(row.archiveObjectKey),
      }));
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='expired_deleted', archiveObjectKey=NULL,
            expiredDeletedAt=NOW()
        WHERE id=${Number(row.id)}
      `);
      deleted++;
    } catch (error: any) {
      logger.error(
        `[ComplianceArchive] expiry deletion failed for #${row.id}: ${String(error?.message || error).slice(0, 500)}`,
      );
    }
  }
  return deleted;
}

export async function createSecureAdminArchiveDownload(params: {
  adminUserId: number;
  archiveId: number;
  ipAddress?: string | null;
}): Promise<{ url: string; expiresIn: number }> {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT id, userId, archiveObjectKey, archiveStatus
    FROM compliance_media_archive WHERE id=${params.archiveId} LIMIT 1
  `);
  const row = rowsFrom(result)[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Archive record not found." });
  if (row.archiveStatus !== "archived" || !row.archiveObjectKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The private archive copy is not available.",
    });
  }
  const config = storageConfig();
  const expiresIn = Math.max(
    60,
    Math.min(900, Number(process.env.COMPLIANCE_SIGNED_URL_SECONDS || 300)),
  );
  const url = await getSignedUrl(config.client, new GetObjectCommand({
    Bucket: config.archiveBucket,
    Key: String(row.archiveObjectKey),
  }), { expiresIn });
  await connection.execute(sql`
    INSERT INTO compliance_access_log
      (adminUserId, action, archiveId, targetUserId, metadata, ipAddress)
    VALUES
      (${params.adminUserId}, 'archive_download_url_created', ${params.archiveId},
       ${Number(row.userId)}, ${JSON.stringify({ expiresIn })}, ${params.ipAddress || null})
  `);
  return { url, expiresIn };
}
