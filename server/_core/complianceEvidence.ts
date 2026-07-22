import crypto from "node:crypto";
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

export type ComplianceWorkspace = "standard" | "adult";
export type IncidentStatus =
  | "blocked_pending_review"
  | "dismissed"
  | "confirmed_violation";

export type ContentReviewInput = {
  userId: number;
  workspace: ComplianceWorkspace;
  sourceType: string;
  sourceId?: number | string | null;
  text?: string | null;
  targetAge?: number | null;
  allSubjectsAdultsConfirmed?: boolean;
  consentConfirmed?: boolean;
  aiGeneratedCharactersOnly?: boolean;
  publicFigureLikeness?: boolean;
};

type ArchiveCandidate = {
  userId: number;
  accountName: string;
  sourceTable: string;
  sourceId: string;
  sourceType: string;
  workspace: ComplianceWorkspace;
  mediaKind: "video" | "broadcast";
  sourceUrl: string;
  userDownloadUrl: string;
  startedAt: Date;
  completedAt?: Date | null;
  mimeType?: string | null;
};

const RETENTION_DAYS = Math.max(
  90,
  Math.min(3650, Number(process.env.COMPLIANCE_RETENTION_DAYS || 90)),
);
const ARCHIVE_PREFIX = "compliance-archive";

const MINOR_TERMS = [
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bchild(?:ren)?\b/i,
  /\bpre[-\s]?teen\b/i,
  /\bschool[-\s]?age(?:d)?\b/i,
  /\bschoolgirl\b/i,
  /\bschoolboy\b/i,
  /\b(?:1[0-7]|[1-9])[-\s]?(?:year[-\s]?old|yo)\b/i,
];
const TEEN_TERMS = [
  /\bteen(?:ager)?s?\b/i,
  /\bhigh school\b/i,
  /\bsixteen\b/i,
  /\bseventeen\b/i,
];
const EXPLICIT_TERMS = [
  /\bporn(?:ographic|ography)?\b/i,
  /\bexplicit sex\b/i,
  /\bgraphic sexual\b/i,
  /\bsex act\b/i,
  /\bsexual intercourse\b/i,
  /\bpenetrat(?:e|ion|ive)\b/i,
  /\boral sex\b/i,
  /\bblowjob\b/i,
  /\bcunnilingus\b/i,
  /\bmasturbat(?:e|ion|ing)\b/i,
  /\bgenitals?\b/i,
  /\bejaculat(?:e|ion)\b/i,
];
const SEXUALISED_TERMS = [
  /\berotic\b/i,
  /\bsexuali[sz](?:e|ed|ation)\b/i,
  /\bseductive\b/i,
  /\bnude\b/i,
  /\bnaked\b/i,
  /\blingerie\b/i,
  /\bstrip(?:ping|tease)?\b/i,
  /\bfetish\b/i,
  /\bprovocative pose\b/i,
];
const NON_CONSENSUAL_TERMS = [
  /non[-\s]?consensual/i,
  /without (?:their|his|her) (?:knowledge|permission|consent)/i,
  /revenge porn/i,
  /deepfake porn/i,
  /hidden camera/i,
  /secretly (?:film|record|stream)/i,
  /blackmail/i,
  /extort/i,
  /forced sex/i,
  /\brape\b/i,
];

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

function parseDate(value: unknown): Date {
  const parsed = value instanceof Date ? value : new Date(String(value || Date.now()));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 86_400_000);
}

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function stripSafetyNegations(text: string): string {
  return text
    .replace(/\bno minors?\b/gi, "")
    .replace(/\bno children\b/gi, "")
    .replace(/\badults? only\b/gi, "")
    .replace(/\b18\+ only\b/gi, "")
    .replace(/\ball (?:subjects|characters|people) (?:are|must be) 18\+?\b/gi, "")
    .replace(/\bdo not (?:create|depict|include) minors?\b/gi, "");
}

function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "record";
}

function storageConfig(): {
  client: S3Client;
  sourceBucket: string;
  archiveBucket: string;
  endpoint: string;
  publicUrl: string;
} | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const sourceBucket = process.env.AWS_S3_BUCKET || "";
  const archiveBucket = process.env.COMPLIANCE_ARCHIVE_BUCKET || sourceBucket;
  if (!accessKeyId || !secretAccessKey || !sourceBucket || !archiveBucket) return null;
  const endpoint = (process.env.AWS_S3_ENDPOINT || "").replace(/\/+$/, "");
  return {
    client: new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    }),
    sourceBucket,
    archiveBucket,
    endpoint,
    publicUrl: (process.env.AWS_S3_PUBLIC_URL || "").replace(/\/+$/, ""),
  };
}

function ownStorageKey(url: string, cfg: ReturnType<typeof storageConfig>): string | null {
  if (!cfg) return null;
  try {
    const parsed = new URL(url);
    if (cfg.publicUrl && url.startsWith(`${cfg.publicUrl}/`)) {
      return decodeURIComponent(url.slice(cfg.publicUrl.length + 1));
    }
    const endpointPrefix = cfg.endpoint
      ? `${cfg.endpoint}/${cfg.sourceBucket}/`
      : "";
    if (endpointPrefix && url.startsWith(endpointPrefix)) {
      return decodeURIComponent(url.slice(endpointPrefix.length));
    }
    if (parsed.hostname.startsWith(`${cfg.sourceBucket}.s3.`)) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    }
  } catch {
    return null;
  }
  return null;
}

function archiveKey(candidate: ArchiveCandidate): string {
  const timestamp = candidate.startedAt.toISOString().replace(/[:.]/g, "-");
  let extension = ".mp4";
  try {
    const match = new URL(candidate.sourceUrl).pathname.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);
    if (match) extension = `.${match[1].toLowerCase()}`;
  } catch {
    if (candidate.mimeType?.includes("webm")) extension = ".webm";
  }
  return [
    ARCHIVE_PREFIX,
    candidate.workspace,
    `${safePart(candidate.accountName)}-${candidate.userId}`,
    `${timestamp}-${safePart(candidate.sourceType)}-${safePart(candidate.sourceId)}${extension}`,
  ].join("/");
}

export async function ensureComplianceEvidenceTables(dbConn?: any): Promise<any> {
  const connection = dbConn || await db.getDb();
  if (!connection) throw new Error("Database unavailable");

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_media_archive (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      accountName VARCHAR(255) NOT NULL,
      sourceTable VARCHAR(80) NOT NULL,
      sourceId VARCHAR(120) NOT NULL,
      sourceType VARCHAR(80) NOT NULL,
      sourceFingerprint CHAR(64) NOT NULL UNIQUE,
      workspace VARCHAR(16) NOT NULL DEFAULT 'standard',
      mediaKind VARCHAR(24) NOT NULL DEFAULT 'video',
      sourceUrl TEXT NOT NULL,
      userDownloadUrl TEXT NOT NULL,
      archiveObjectKey VARCHAR(1024) NULL,
      archiveStatus VARCHAR(32) NOT NULL DEFAULT 'pending',
      archiveError TEXT NULL,
      mimeType VARCHAR(128) NULL,
      startedAt DATETIME NOT NULL,
      completedAt DATETIME NULL,
      retainedUntil DATETIME NOT NULL,
      legalHold TINYINT(1) NOT NULL DEFAULT 0,
      legalHoldReason TEXT NULL,
      archivedAt DATETIME NULL,
      expiredDeletedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_compliance_user (userId),
      INDEX idx_compliance_status (archiveStatus),
      INDEX idx_compliance_retention (retainedUntil, legalHold),
      INDEX idx_compliance_workspace (workspace),
      INDEX idx_compliance_started (startedAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS moderation_incidents (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      archiveId BIGINT NULL,
      sourceType VARCHAR(80) NOT NULL,
      sourceId VARCHAR(120) NULL,
      workspace VARCHAR(16) NOT NULL DEFAULT 'standard',
      category VARCHAR(80) NOT NULL,
      severity VARCHAR(24) NOT NULL DEFAULT 'high',
      status VARCHAR(32) NOT NULL DEFAULT 'blocked_pending_review',
      requestSummary TEXT NULL,
      evidenceUrl TEXT NULL,
      classifierSignals JSON NULL,
      legalHold TINYINT(1) NOT NULL DEFAULT 1,
      reviewedBy INT NULL,
      reviewedAt DATETIME NULL,
      reviewNotes TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_incident_user (userId),
      INDEX idx_incident_status (status),
      INDEX idx_incident_category (category),
      INDEX idx_incident_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS blacklisted_users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      incidentId BIGINT NOT NULL,
      reasonCode VARCHAR(100) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      evidenceSummary JSON NULL,
      notes TEXT NULL,
      blacklistedBy INT NOT NULL,
      blacklistedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_blacklisted_status (status),
      INDEX idx_blacklisted_incident (incidentId)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_access_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      adminUserId INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      archiveId BIGINT NULL,
      incidentId BIGINT NULL,
      targetUserId INT NULL,
      metadata JSON NULL,
      ipAddress VARCHAR(80) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_access_admin (adminUserId),
      INDEX idx_access_archive (archiveId),
      INDEX idx_access_incident (incidentId),
      INDEX idx_access_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  return connection;
}

async function logAdminAccess(params: {
  adminUserId: number;
  action: string;
  archiveId?: number | null;
  incidentId?: number | null;
  targetUserId?: number | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceEvidenceTables();
  await connection.execute(sql`
    INSERT INTO compliance_access_log
      (adminUserId, action, archiveId, incidentId, targetUserId, metadata, ipAddress)
    VALUES
      (${params.adminUserId}, ${params.action}, ${params.archiveId || null},
       ${params.incidentId || null}, ${params.targetUserId || null},
       ${JSON.stringify(params.metadata || {})}, ${params.ipAddress || null})
  `);
}

export async function createReviewIncident(params: {
  userId: number;
  archiveId?: number | null;
  sourceType: string;
  sourceId?: number | string | null;
  workspace: ComplianceWorkspace;
  category: string;
  severity?: string;
  requestSummary?: string | null;
  evidenceUrl?: string | null;
  classifierSignals?: Record<string, unknown>;
}): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  const result: any = await connection.execute(sql`
    INSERT INTO moderation_incidents
      (userId, archiveId, sourceType, sourceId, workspace, category, severity,
       status, requestSummary, evidenceUrl, classifierSignals, legalHold)
    VALUES
      (${params.userId}, ${params.archiveId || null}, ${params.sourceType},
       ${params.sourceId == null ? null : String(params.sourceId)}, ${params.workspace},
       ${params.category}, ${params.severity || "high"}, 'blocked_pending_review',
       ${params.requestSummary?.slice(0, 8000) || null}, ${params.evidenceUrl || null},
       ${JSON.stringify(params.classifierSignals || {})}, 1)
  `);
  const incidentId = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  if (params.archiveId) {
    await connection.execute(sql`
      UPDATE compliance_media_archive
      SET legalHold=1, legalHoldReason=CONCAT('Moderation incident #', ${incidentId})
      WHERE id=${params.archiveId}
    `);
  }
  return incidentId;
}

/**
 * Conservative request screening. It creates a review case and blocks the job,
 * but never freezes the account. A human admin must confirm a proven violation.
 */
export async function screenContentForReview(input: ContentReviewInput): Promise<void> {
  const original = String(input.text || "").slice(0, 12_000);
  const text = stripSafetyNegations(original);
  const minor = matches(text, MINOR_TERMS);
  const teen = matches(text, TEEN_TERMS);
  const explicit = matches(text, EXPLICIT_TERMS);
  const sexualised = matches(text, SEXUALISED_TERMS);
  const nonConsensual = matches(text, NON_CONSENSUAL_TERMS);
  const targetUnder18 = input.targetAge != null && input.targetAge < 18;

  let category: string | null = null;
  let severity = "high";
  if (nonConsensual) {
    category = "suspected_non_consensual_sexual_content";
    severity = "critical";
  } else if ((minor || teen || targetUnder18) && explicit) {
    category = "suspected_csam_request";
    severity = "critical";
  } else if ((minor || teen || targetUnder18) && sexualised) {
    category = "suspected_minor_sexualisation";
    severity = "critical";
  } else if (input.workspace === "adult" && (minor || teen || targetUnder18)) {
    category = "adult_workspace_minor_reference";
  } else if (input.workspace === "adult" && input.publicFigureLikeness) {
    category = "adult_public_figure_likeness";
  } else if (input.workspace === "adult" && !input.allSubjectsAdultsConfirmed) {
    category = "adult_subject_age_not_confirmed";
  } else if (
    input.workspace === "adult"
    && !input.consentConfirmed
    && !input.aiGeneratedCharactersOnly
  ) {
    category = "adult_likeness_consent_not_confirmed";
  }

  // A non-explicit, age-appropriate teenage romance scene such as a brief kiss
  // does not match a violation state and remains eligible for standard review.
  if (!category) return;

  const incidentId = await createReviewIncident({
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    workspace: input.workspace,
    category,
    severity,
    requestSummary: original,
    classifierSignals: {
      minor,
      teen,
      explicit,
      sexualised,
      nonConsensual,
      targetUnder18,
      allSubjectsAdultsConfirmed: Boolean(input.allSubjectsAdultsConfirmed),
      consentConfirmed: Boolean(input.consentConfirmed),
      aiGeneratedCharactersOnly: Boolean(input.aiGeneratedCharactersOnly),
      publicFigureLikeness: Boolean(input.publicFigureLikeness),
    },
  });

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `CONTENT_BLOCKED_PENDING_REVIEW: The request was blocked for human review (incident #${incidentId}). No account action has been taken.`,
  });
}

export async function registerComplianceArchive(candidate: ArchiveCandidate): Promise<number | null> {
  if (!/^https:\/\//i.test(candidate.sourceUrl)) return null;
  const connection = await ensureComplianceEvidenceTables();
  const sourceFingerprint = fingerprint(
    `${candidate.sourceTable}:${candidate.sourceId}:${candidate.sourceUrl}`,
  );
  const retainedUntil = addDays(candidate.completedAt || candidate.startedAt, RETENTION_DAYS);
  const result: any = await connection.execute(sql`
    INSERT INTO compliance_media_archive
      (userId, accountName, sourceTable, sourceId, sourceType, sourceFingerprint,
       workspace, mediaKind, sourceUrl, userDownloadUrl, archiveStatus, mimeType,
       startedAt, completedAt, retainedUntil)
    VALUES
      (${candidate.userId}, ${candidate.accountName}, ${candidate.sourceTable},
       ${candidate.sourceId}, ${candidate.sourceType}, ${sourceFingerprint},
       ${candidate.workspace}, ${candidate.mediaKind}, ${candidate.sourceUrl},
       ${candidate.userDownloadUrl}, 'pending', ${candidate.mimeType || null},
       ${candidate.startedAt}, ${candidate.completedAt || null}, ${retainedUntil})
    ON DUPLICATE KEY UPDATE
      userDownloadUrl=VALUES(userDownloadUrl),
      completedAt=COALESCE(VALUES(completedAt), completedAt),
      retainedUntil=GREATEST(retainedUntil, VALUES(retainedUntil))
  `);
  const inserted = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  if (inserted) return inserted;
  const existing = await connection.execute(sql`
    SELECT id FROM compliance_media_archive
    WHERE sourceFingerprint=${sourceFingerprint} LIMIT 1
  `);
  return Number(rowsFrom(existing)[0]?.id || 0) || null;
}

async function copyToPrivateArchive(row: any): Promise<string> {
  const cfg = storageConfig();
  if (!cfg) {
    throw new Error(
      "Private compliance storage is not configured. Set S3 credentials and COMPLIANCE_ARCHIVE_BUCKET.",
    );
  }
  const candidate: ArchiveCandidate = {
    userId: Number(row.userId),
    accountName: String(row.accountName || `user-${row.userId}`),
    sourceTable: String(row.sourceTable),
    sourceId: String(row.sourceId),
    sourceType: String(row.sourceType),
    workspace: row.workspace === "adult" ? "adult" : "standard",
    mediaKind: row.mediaKind === "broadcast" ? "broadcast" : "video",
    sourceUrl: String(row.sourceUrl),
    userDownloadUrl: String(row.userDownloadUrl),
    startedAt: parseDate(row.startedAt),
    completedAt: row.completedAt ? parseDate(row.completedAt) : null,
    mimeType: row.mimeType || null,
  };
  const destinationKey = archiveKey(candidate);
  const sourceKey = ownStorageKey(candidate.sourceUrl, cfg);
  if (sourceKey) {
    await cfg.client.send(new CopyObjectCommand({
      Bucket: cfg.archiveBucket,
      Key: destinationKey,
      CopySource: `${cfg.sourceBucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, "/")}`,
      MetadataDirective: "COPY",
    }));
    return destinationKey;
  }

  const response = await fetch(candidate.sourceUrl, {
    redirect: "follow",
    headers: { "User-Agent": "Virelle-Compliance-Archive/1.0" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Source download failed with HTTP ${response.status}`);
  }
  const maxBytes = Math.max(
    256 * 1024 * 1024,
    Number(process.env.COMPLIANCE_ARCHIVE_MAX_BYTES || 2 * 1024 * 1024 * 1024),
  );
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw new Error(`Source exceeds compliance archive limit (${declaredLength} bytes)`);
  }
  let observed = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      observed += chunk.length;
      if (observed > maxBytes) return callback(new Error("Source exceeded archive limit"));
      callback(null, chunk);
    },
  });
  const body = Readable.fromWeb(response.body as any).pipe(limiter);
  await cfg.client.send(new PutObjectCommand({
    Bucket: cfg.archiveBucket,
    Key: destinationKey,
    Body: body,
    ...(declaredLength > 0 ? { ContentLength: declaredLength } : {}),
    ContentType: response.headers.get("content-type") || candidate.mimeType || "video/mp4",
    Metadata: {
      virelleUserId: String(candidate.userId),
      virelleWorkspace: candidate.workspace,
      virelleSource: candidate.sourceType.slice(0, 120),
    },
  }));
  return destinationKey;
}

export async function scanVideoOutputs(): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  let discovered = 0;

  const scan = async (query: any, mapper: (row: any) => ArchiveCandidate) => {
    try {
      const result = await connection.execute(query);
      for (const row of rowsFrom(result)) {
        if (await registerComplianceArchive(mapper(row))) discovered++;
      }
    } catch (error: any) {
      logger.warn(`[ComplianceArchive] source scan skipped: ${String(error?.message || error).slice(0, 300)}`);
    }
  };

  await scan(sql`
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

  await scan(sql`
    SELECT s.id, p.userId, s.videoUrl, s.createdAt, s.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM scenes s
    INNER JOIN projects p ON p.id=s.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('scenes:', s.id, ':', s.videoUrl), 256)
    WHERE s.videoUrl IS NOT NULL AND s.videoUrl<>'' AND a.id IS NULL
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

  await scan(sql`
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

  await scan(sql`
    SELECT v.id, v.userId, v.outputVideoUrl, v.mode, v.contentMode,
           v.createdAt, v.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', v.userId)) AS accountName
    FROM virelle_video_transform_jobs v
    INNER JOIN users u ON u.id=v.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('virelle_video_transform_jobs:', v.id, ':', v.outputVideoUrl), 256)
    WHERE v.outputVideoUrl IS NOT NULL AND v.outputVideoUrl<>''
      AND v.status IN ('processing','completed') AND a.id IS NULL
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
    startedAt: parseDate(row.createdAt),
    completedAt: row.mode === "broadcast" && row.status === "processing"
      ? null
      : parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  return discovered;
}

export async function processArchiveQueue(limit = 3): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT * FROM compliance_media_archive
    WHERE archiveStatus IN ('pending','copy_failed')
      AND expiredDeletedAt IS NULL AND retainedUntil>NOW()
    ORDER BY CASE WHEN archiveStatus='pending' THEN 0 ELSE 1 END, createdAt ASC
    LIMIT ${Math.max(1, Math.min(limit, 20))}
  `);
  let archived = 0;
  for (const row of rowsFrom(result)) {
    const id = Number(row.id);
    await connection.execute(sql`
      UPDATE compliance_media_archive SET archiveStatus='copying', archiveError=NULL
      WHERE id=${id}
    `);
    try {
      const key = await copyToPrivateArchive(row);
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='archived', archiveObjectKey=${key},
            archiveError=NULL, archivedAt=NOW()
        WHERE id=${id}
      `);
      archived++;
    } catch (error: any) {
      const message = String(error?.message || error).slice(0, 2000);
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='copy_failed', archiveError=${message}
        WHERE id=${id}
      `);
      logger.error(`[ComplianceArchive] archive #${id} failed: ${message}`);
    }
  }
  return archived;
}

export async function purgeExpiredArchive(limit = 100): Promise<number> {
  const connection = await ensureComplianceEvidenceTables();
  const cfg = storageConfig();
  if (!cfg) return 0;
  const result = await connection.execute(sql`
    SELECT id, archiveObjectKey FROM compliance_media_archive
    WHERE legalHold=0 AND retainedUntil<NOW() AND archiveStatus='archived'
      AND archiveObjectKey IS NOT NULL AND expiredDeletedAt IS NULL
    ORDER BY retainedUntil ASC LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  let deleted = 0;
  for (const row of rowsFrom(result)) {
    try {
      await cfg.client.send(new DeleteObjectCommand({
        Bucket: cfg.archiveBucket,
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
      logger.error(`[ComplianceArchive] expiry deletion failed for #${row.id}: ${error?.message}`);
    }
  }
  return deleted;
}

export async function listMatureProfiles(limit = 200) {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT p.*, u.name AS accountName, u.email AS accountEmail,
           u.subscriptionTier, u.subscriptionStatus, u.isAdultVerified,
           u.isFrozen, u.frozenReason, u.createdAt AS accountCreatedAt
    FROM mature_access_profiles p
    INNER JOIN users u ON u.id=p.userId
    ORDER BY p.updatedAt DESC
    LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  return rowsFrom(result);
}

export async function listArchive(params: {
  workspace?: "all" | ComplianceWorkspace;
  status?: string | null;
  userId?: number | null;
  limit?: number;
}) {
  const connection = await ensureComplianceEvidenceTables();
  const workspace = params.workspace && params.workspace !== "all"
    ? params.workspace
    : null;
  const result = await connection.execute(sql`
    SELECT a.id, a.userId, a.accountName, u.email, a.sourceTable,
           a.sourceId, a.sourceType, a.workspace, a.mediaKind,
           a.userDownloadUrl, a.archiveStatus, a.archiveError, a.mimeType,
           a.startedAt, a.completedAt, a.retainedUntil, a.legalHold,
           a.legalHoldReason, a.archivedAt, a.createdAt, a.updatedAt
    FROM compliance_media_archive a
    INNER JOIN users u ON u.id=a.userId
    WHERE (${workspace} IS NULL OR a.workspace=${workspace})
      AND (${params.status || null} IS NULL OR a.archiveStatus=${params.status || null})
      AND (${params.userId || null} IS NULL OR a.userId=${params.userId || null})
    ORDER BY a.startedAt DESC
    LIMIT ${Math.max(1, Math.min(params.limit || 200, 500))}
  `);
  return rowsFrom(result);
}

export async function createAdminArchiveDownload(params: {
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
  const cfg = storageConfig();
  if (!cfg) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Archive storage is unavailable." });
  const expiresIn = Math.max(
    60,
    Math.min(900, Number(process.env.COMPLIANCE_SIGNED_URL_SECONDS || 300)),
  );
  const url = await getSignedUrl(cfg.client, new GetObjectCommand({
    Bucket: cfg.archiveBucket,
    Key: String(row.archiveObjectKey),
  }), { expiresIn });
  await logAdminAccess({
    adminUserId: params.adminUserId,
    action: "archive_download_url_created",
    archiveId: params.archiveId,
    targetUserId: Number(row.userId),
    ipAddress: params.ipAddress,
  });
  return { url, expiresIn };
}

export async function setLegalHold(params: {
  adminUserId: number;
  archiveId: number;
  legalHold: boolean;
  reason?: string | null;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceEvidenceTables();
  await connection.execute(sql`
    UPDATE compliance_media_archive
    SET legalHold=${params.legalHold ? 1 : 0},
        legalHoldReason=${params.legalHold ? params.reason || "Administrator legal hold" : null}
    WHERE id=${params.archiveId}
  `);
  await logAdminAccess({
    adminUserId: params.adminUserId,
    action: params.legalHold ? "archive_legal_hold_set" : "archive_legal_hold_removed",
    archiveId: params.archiveId,
    metadata: { reason: params.reason || null },
    ipAddress: params.ipAddress,
  });
  return { ok: true };
}

export async function listIncidents(params: {
  status?: "all" | IncidentStatus;
  limit?: number;
}) {
  const connection = await ensureComplianceEvidenceTables();
  const status = params.status && params.status !== "all" ? params.status : null;
  const result = await connection.execute(sql`
    SELECT i.*, u.name AS accountName, u.email, u.phone, u.country, u.city,
           a.mediaKind, a.startedAt, a.retainedUntil, a.archiveStatus
    FROM moderation_incidents i
    INNER JOIN users u ON u.id=i.userId
    LEFT JOIN compliance_media_archive a ON a.id=i.archiveId
    WHERE (${status} IS NULL OR i.status=${status})
    ORDER BY FIELD(i.status, 'blocked_pending_review', 'confirmed_violation', 'dismissed'),
             i.createdAt DESC
    LIMIT ${Math.max(1, Math.min(params.limit || 200, 500))}
  `);
  return rowsFrom(result);
}

export async function dismissIncident(params: {
  adminUserId: number;
  incidentId: number;
  notes: string;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceEvidenceTables();
  await connection.execute(sql`
    UPDATE moderation_incidents
    SET status='dismissed', reviewedBy=${params.adminUserId}, reviewedAt=NOW(),
        reviewNotes=${params.notes}, legalHold=0
    WHERE id=${params.incidentId} AND status='blocked_pending_review'
  `);
  await logAdminAccess({
    adminUserId: params.adminUserId,
    action: "moderation_incident_dismissed",
    incidentId: params.incidentId,
    metadata: { notes: params.notes },
    ipAddress: params.ipAddress,
  });
  return { ok: true };
}

export async function confirmViolation(params: {
  adminUserId: number;
  incidentId: number;
  notes: string;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT * FROM moderation_incidents WHERE id=${params.incidentId} LIMIT 1
  `);
  const incident = rowsFrom(result)[0];
  if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  if (incident.status !== "blocked_pending_review") {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Incident was already reviewed." });
  }
  const userId = Number(incident.userId);
  const reasonCode = ["suspected_csam_request", "suspected_minor_sexualisation"]
    .includes(String(incident.category))
    ? "confirmed_csam_or_minor_sexualisation"
    : `confirmed_${incident.category}`;

  await connection.execute(sql`
    UPDATE moderation_incidents
    SET status='confirmed_violation', category=${reasonCode},
        reviewedBy=${params.adminUserId}, reviewedAt=NOW(),
        reviewNotes=${params.notes}, legalHold=1
    WHERE id=${params.incidentId}
  `);
  await connection.execute(sql`
    INSERT INTO blacklisted_users
      (userId, incidentId, reasonCode, status, evidenceSummary, notes, blacklistedBy)
    VALUES
      (${userId}, ${params.incidentId}, ${reasonCode}, 'active',
       ${JSON.stringify({
         incidentId: params.incidentId,
         sourceType: incident.sourceType,
         sourceId: incident.sourceId,
         evidenceUrl: incident.evidenceUrl,
         archiveId: incident.archiveId,
       })}, ${params.notes}, ${params.adminUserId})
    ON DUPLICATE KEY UPDATE
      incidentId=VALUES(incidentId), reasonCode=VALUES(reasonCode), status='active',
      evidenceSummary=VALUES(evidenceSummary), notes=VALUES(notes),
      blacklistedBy=VALUES(blacklistedBy), blacklistedAt=NOW()
  `);
  await connection.execute(sql`
    UPDATE users
    SET isFrozen=1,
        frozenReason=CONCAT('Confirmed serious content-policy violation; incident #', ${params.incidentId}),
        frozenAt=NOW(), isAdultVerified=0, updatedAt=NOW()
    WHERE id=${userId}
  `);
  await connection.execute(sql`
    UPDATE mature_access_profiles
    SET accessStatus='rejected',
        rejectionReason=CONCAT('Revoked after confirmed incident #', ${params.incidentId}),
        updatedAt=NOW()
    WHERE userId=${userId}
  `);
  await connection.execute(sql`
    UPDATE compliance_media_archive
    SET legalHold=1,
        legalHoldReason=CONCAT('Confirmed violation incident #', ${params.incidentId})
    WHERE userId=${userId}
  `);
  await logAdminAccess({
    adminUserId: params.adminUserId,
    action: "moderation_violation_confirmed_and_account_blacklisted",
    incidentId: params.incidentId,
    targetUserId: userId,
    metadata: { reasonCode, notes: params.notes },
    ipAddress: params.ipAddress,
  });
  return { ok: true, userId, reasonCode };
}

export async function listBlacklisted(limit = 250) {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT b.id, b.userId, b.incidentId, b.reasonCode, b.status,
           b.evidenceSummary, b.notes, b.blacklistedAt, b.blacklistedBy,
           u.name AS accountName, u.email, u.phone, u.country, u.city,
           u.createdAt AS accountCreatedAt, u.frozenReason, u.frozenAt,
           i.sourceType, i.sourceId, i.workspace, i.requestSummary,
           i.evidenceUrl, i.classifierSignals, i.reviewNotes, i.reviewedAt
    FROM blacklisted_users b
    INNER JOIN users u ON u.id=b.userId
    INNER JOIN moderation_incidents i ON i.id=b.incidentId
    WHERE b.status='active'
    ORDER BY b.blacklistedAt DESC
    LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  return rowsFrom(result);
}

export async function listAccessLog(limit = 250) {
  const connection = await ensureComplianceEvidenceTables();
  const result = await connection.execute(sql`
    SELECT l.*, u.name AS adminName, u.email AS adminEmail
    FROM compliance_access_log l
    INNER JOIN users u ON u.id=l.adminUserId
    ORDER BY l.createdAt DESC
    LIMIT ${Math.max(1, Math.min(limit, 1000))}
  `);
  return rowsFrom(result);
}

export const complianceRetentionDays = RETENTION_DAYS;
