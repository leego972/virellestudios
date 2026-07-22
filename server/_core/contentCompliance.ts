import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
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
export type ComplianceMediaKind = "video" | "broadcast";
export type ModerationIncidentStatus =
  | "blocked_pending_review"
  | "dismissed"
  | "confirmed_violation";

export type ContentClassificationInput = {
  workspace: ComplianceWorkspace;
  text?: string | null;
  targetAge?: number | null;
  publicFigureLikeness?: boolean;
};

export type ContentClassification = {
  category:
    | "suspected_csam_request"
    | "suspected_minor_sexualisation"
    | "adult_workspace_minor_reference"
    | "non_consensual_sexual_content"
    | "adult_public_figure_likeness";
  severity: "high" | "critical";
  reason: string;
  signals: Record<string, boolean>;
};

export type ContentScreenInput = ContentClassificationInput & {
  userId: number;
  sourceType: string;
  sourceId?: number | string | null;
};

type ArchiveCandidate = {
  userId: number;
  accountName: string;
  sourceType: string;
  sourceTable: string;
  sourceId: string;
  workspace: ComplianceWorkspace;
  mediaKind: ComplianceMediaKind;
  sourceUrl: string;
  userDownloadUrl: string;
  startedAt: Date;
  completedAt?: Date | null;
  mimeType?: string | null;
};

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_SIGNED_URL_SECONDS = 300;
const ARCHIVE_PREFIX = "compliance-archive";

const STRONG_MINOR_PATTERNS = [
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bchild(?:ren)?\b/i,
  /\bpre[-\s]?teen\b/i,
  /\bschool[-\s]?age(?:d)?\b/i,
  /\bschoolgirl\b/i,
  /\bschoolboy\b/i,
  /\b(?:1[0-7]|[1-9])[-\s]?(?:year[-\s]?old|yo)\b/i,
  /\byoung teen\b/i,
  /\bchildlike\b/i,
  /\bbarely legal\b/i,
];

const TEEN_PATTERNS = [
  /\bteen(?:ager)?s?\b/i,
  /\bhigh school\b/i,
  /\bsixteen\b/i,
  /\bseventeen\b/i,
];

const EXPLICIT_SEXUAL_PATTERNS = [
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
  /\berect penis\b/i,
  /\bejaculat(?:e|ion)\b/i,
  /\bcumshot\b/i,
];

const SEXUALISED_MINOR_PATTERNS = [
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

const NON_CONSENSUAL_PATTERNS = [
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

function retentionDays(): number {
  const configured = Number(process.env.COMPLIANCE_RETENTION_DAYS || "");
  if (Number.isFinite(configured) && configured >= 90 && configured <= 3650) {
    return Math.floor(configured);
  }
  return DEFAULT_RETENTION_DAYS;
}

function archiveMaxBytes(): number {
  const configured = Number(process.env.COMPLIANCE_ARCHIVE_MAX_BYTES || "");
  if (Number.isFinite(configured) && configured >= 1024 * 1024) return configured;
  return 2 * 1024 * 1024 * 1024;
}

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseDate(value: unknown): Date {
  const parsed = value instanceof Date ? value : new Date(String(value || Date.now()));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function fingerprint(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "account";
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function stripSafetyNegations(text: string): string {
  return text
    .replace(/\bno minors?\b/gi, "")
    .replace(/\bno children\b/gi, "")
    .replace(/\badults? only\b/gi, "")
    .replace(/\ball (?:subjects|characters|people) (?:are|must be) 18\+?\b/gi, "")
    .replace(/\b18\+ only\b/gi, "")
    .replace(/\bdo not (?:create|depict|include) minors?\b/gi, "");
}

export function classifyContentRequest(
  input: ContentClassificationInput,
): ContentClassification | null {
  const text = stripSafetyNegations(String(input.text || "").slice(0, 12_000));
  const hasStrongMinor = matchesAny(text, STRONG_MINOR_PATTERNS);
  const hasTeen = matchesAny(text, TEEN_PATTERNS);
  const hasExplicit = matchesAny(text, EXPLICIT_SEXUAL_PATTERNS);
  const hasSexualised = matchesAny(text, SEXUALISED_MINOR_PATTERNS);
  const hasNonConsensual = matchesAny(text, NON_CONSENSUAL_PATTERNS);
  const targetUnder18 = input.targetAge != null && input.targetAge < 18;
  const hasMinorReference = hasStrongMinor || hasTeen || targetUnder18;
  const signals = {
    hasStrongMinor,
    hasTeen,
    hasExplicit,
    hasSexualised,
    hasNonConsensual,
    targetUnder18,
    publicFigureLikeness: Boolean(input.publicFigureLikeness),
  };

  if (hasNonConsensual) {
    return {
      category: "non_consensual_sexual_content",
      severity: "critical",
      reason: "Non-consensual sexual content, covert recording, coercion and revenge content are prohibited.",
      signals,
    };
  }

  if (hasMinorReference && hasExplicit) {
    return {
      category: "suspected_csam_request",
      severity: "critical",
      reason: "Explicit sexual content involving a minor or ambiguous-age subject is prohibited.",
      signals,
    };
  }

  if (hasMinorReference && hasSexualised) {
    return {
      category: "suspected_minor_sexualisation",
      severity: "critical",
      reason: "Sexualised depiction of a minor or ambiguous-age subject is prohibited.",
      signals,
    };
  }

  if (input.workspace === "adult" && hasMinorReference) {
    return {
      category: "adult_workspace_minor_reference",
      severity: "high",
      reason: "The Adult Workspace cannot include minors, teenage characters, youth-coded styling or age regression below 18.",
      signals,
    };
  }

  if (input.workspace === "adult" && input.publicFigureLikeness) {
    return {
      category: "adult_public_figure_likeness",
      severity: "high",
      reason: "Public-figure likenesses cannot be used in adult sexual content.",
      signals,
    };
  }

  return null;
}

function storageConfig(): {
  client: S3Client;
  bucket: string;
  sourceBucket: string;
  publicUrl: string;
  endpoint: string;
} | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "";
  const sourceBucket = process.env.AWS_S3_BUCKET || "";
  const bucket = process.env.COMPLIANCE_ARCHIVE_BUCKET || sourceBucket;
  if (!accessKeyId || !secretAccessKey || !bucket) return null;
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = (process.env.AWS_S3_ENDPOINT || "").replace(/\/+$/, "");
  return {
    client: new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    }),
    bucket,
    sourceBucket,
    publicUrl: (process.env.AWS_S3_PUBLIC_URL || "").replace(/\/+$/, ""),
    endpoint,
  };
}

function sourceKeyFromOwnStorage(
  url: string,
  config: ReturnType<typeof storageConfig>,
): string | null {
  if (!config) return null;
  try {
    const parsed = new URL(url);
    if (config.publicUrl && url.startsWith(`${config.publicUrl}/`)) {
      return decodeURIComponent(url.slice(config.publicUrl.length + 1));
    }
    if (config.endpoint && config.sourceBucket) {
      const prefix = `${config.endpoint}/${config.sourceBucket}/`;
      if (url.startsWith(prefix)) return decodeURIComponent(url.slice(prefix.length));
    }
    if (config.sourceBucket && parsed.hostname.startsWith(`${config.sourceBucket}.s3.`)) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    }
  } catch {
    return null;
  }
  return null;
}

function archiveKey(candidate: ArchiveCandidate): string {
  const started = candidate.startedAt.toISOString().replace(/[:.]/g, "-");
  let extension = ".mp4";
  try {
    const match = new URL(candidate.sourceUrl).pathname.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/i);
    if (match) extension = `.${match[1].toLowerCase()}`;
    else if (candidate.mimeType?.includes("webm")) extension = ".webm";
    else if (candidate.mimeType?.includes("quicktime")) extension = ".mov";
  } catch {
    // Keep mp4 fallback.
  }
  return [
    ARCHIVE_PREFIX,
    candidate.workspace,
    safeFilenamePart(candidate.accountName),
    String(candidate.userId),
    `${started}-${safeFilenamePart(candidate.sourceType)}-${safeFilenamePart(candidate.sourceId)}${extension}`,
  ].join("/");
}

export async function ensureComplianceTables(dbConn?: any): Promise<any> {
  const connection = dbConn || await db.getDb();
  if (!connection) throw new Error("Database unavailable");

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS compliance_media_archive (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      accountName VARCHAR(255) NOT NULL,
      sourceType VARCHAR(80) NOT NULL,
      sourceTable VARCHAR(80) NOT NULL,
      sourceId VARCHAR(120) NOT NULL,
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
      INDEX idx_compliance_archive_user (userId),
      INDEX idx_compliance_archive_status (archiveStatus),
      INDEX idx_compliance_archive_retention (retainedUntil, legalHold),
      INDEX idx_compliance_archive_workspace (workspace),
      INDEX idx_compliance_archive_started (startedAt)
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
      evidenceArchiveKey VARCHAR(1024) NULL,
      classifierSignals JSON NULL,
      legalHold TINYINT(1) NOT NULL DEFAULT 1,
      reviewedBy INT NULL,
      reviewedAt DATETIME NULL,
      reviewNotes TEXT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_moderation_user (userId),
      INDEX idx_moderation_status (status),
      INDEX idx_moderation_category (category),
      INDEX idx_moderation_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await connection.execute(sql`
    CREATE TABLE IF NOT EXISTS blacklisted_users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      incidentId BIGINT NOT NULL,
      reasonCode VARCHAR(80) NOT NULL,
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
      action VARCHAR(64) NOT NULL,
      archiveId BIGINT NULL,
      incidentId BIGINT NULL,
      targetUserId INT NULL,
      metadata JSON NULL,
      ipAddress VARCHAR(80) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_compliance_access_admin (adminUserId),
      INDEX idx_compliance_access_archive (archiveId),
      INDEX idx_compliance_access_incident (incidentId),
      INDEX idx_compliance_access_created (createdAt)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const safeAlterations = [
    sql`ALTER TABLE mature_access_profiles ADD COLUMN adultAttestationAcceptedAt DATETIME NULL`,
    sql`ALTER TABLE mature_access_profiles ADD COLUMN archiveRetentionAcceptedAt DATETIME NULL`,
    sql`ALTER TABLE mature_access_profiles ADD COLUMN termsVersion VARCHAR(64) NOT NULL DEFAULT 'adult-workspace-2026-07'`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN publicFigureLikeness TINYINT(1) NOT NULL DEFAULT 0`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN aiGeneratedCharactersOnly TINYINT(1) NOT NULL DEFAULT 0`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN recordingRequired TINYINT(1) NOT NULL DEFAULT 1`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastStartedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN broadcastCompletedAt DATETIME NULL`,
    sql`ALTER TABLE virelle_video_transform_jobs ADD COLUMN consentAttestationVersion VARCHAR(64) NOT NULL DEFAULT 'likeness-consent-2026-07'`,
  ];
  for (const alteration of safeAlterations) {
    try { await connection.execute(alteration); } catch { /* already applied */ }
  }

  return connection;
}

export async function createModerationIncident(params: {
  userId: number;
  archiveId?: number | null;
  sourceType: string;
  sourceId?: string | number | null;
  workspace: ComplianceWorkspace;
  classification: ContentClassification;
  requestSummary?: string | null;
  evidenceUrl?: string | null;
  evidenceArchiveKey?: string | null;
}): Promise<number> {
  const connection = await ensureComplianceTables();
  const result: any = await connection.execute(sql`
    INSERT INTO moderation_incidents
      (userId, archiveId, sourceType, sourceId, workspace, category,
       severity, status, requestSummary, evidenceUrl, evidenceArchiveKey,
       classifierSignals, legalHold)
    VALUES
      (${params.userId}, ${params.archiveId || null}, ${params.sourceType},
       ${params.sourceId == null ? null : String(params.sourceId)}, ${params.workspace},
       ${params.classification.category}, ${params.classification.severity},
       'blocked_pending_review', ${params.requestSummary?.slice(0, 8000) || null},
       ${params.evidenceUrl || null}, ${params.evidenceArchiveKey || null},
       ${JSON.stringify(params.classification.signals)}, 1)
  `);
  const incidentId = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  if (params.archiveId && incidentId) {
    await connection.execute(sql`
      UPDATE compliance_media_archive
      SET legalHold=1, legalHoldReason=CONCAT('Moderation incident #', ${incidentId})
      WHERE id=${params.archiveId}
    `);
  }
  return incidentId;
}

export async function screenContentRequest(input: ContentScreenInput): Promise<void> {
  const classification = classifyContentRequest(input);
  if (!classification) return;
  const incidentId = await createModerationIncident({
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    workspace: input.workspace,
    classification,
    requestSummary: String(input.text || ""),
  });
  throw new TRPCError({
    code: "FORBIDDEN",
    message: `CONTENT_BLOCKED_PENDING_REVIEW: ${classification.reason} The request was sent for human review as incident #${incidentId}. No account deactivation has occurred.`,
  });
}

export async function registerArchiveCandidate(
  candidate: ArchiveCandidate,
): Promise<number | null> {
  if (!candidate.sourceUrl || !/^https:\/\//i.test(candidate.sourceUrl)) return null;
  const connection = await ensureComplianceTables();
  const sourceFingerprint = fingerprint(
    `${candidate.sourceTable}:${candidate.sourceId}:${candidate.sourceUrl}`,
  );
  const retainedUntil = addDays(
    candidate.completedAt || candidate.startedAt,
    retentionDays(),
  );
  const result: any = await connection.execute(sql`
    INSERT INTO compliance_media_archive
      (userId, accountName, sourceType, sourceTable, sourceId, sourceFingerprint,
       workspace, mediaKind, sourceUrl, userDownloadUrl, archiveStatus,
       mimeType, startedAt, completedAt, retainedUntil)
    VALUES
      (${candidate.userId}, ${candidate.accountName}, ${candidate.sourceType},
       ${candidate.sourceTable}, ${candidate.sourceId}, ${sourceFingerprint},
       ${candidate.workspace}, ${candidate.mediaKind}, ${candidate.sourceUrl},
       ${candidate.userDownloadUrl}, 'pending', ${candidate.mimeType || null},
       ${candidate.startedAt}, ${candidate.completedAt || null}, ${retainedUntil})
    ON DUPLICATE KEY UPDATE
      userDownloadUrl=VALUES(userDownloadUrl),
      completedAt=COALESCE(VALUES(completedAt), completedAt),
      mimeType=COALESCE(VALUES(mimeType), mimeType),
      retainedUntil=GREATEST(retainedUntil, VALUES(retainedUntil))
  `);
  const insertId = Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
  if (insertId) return insertId;
  const existing = await connection.execute(sql`
    SELECT id FROM compliance_media_archive
    WHERE sourceFingerprint=${sourceFingerprint} LIMIT 1
  `);
  return Number(rowsFrom(existing)[0]?.id || 0) || null;
}

async function downloadRemoteToTemp(
  sourceUrl: string,
): Promise<{ tempPath: string; contentType: string; size: number }> {
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "Virelle-Compliance-Archive/2.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Source download failed with HTTP ${response.status}`);
  }
  const maxBytes = archiveMaxBytes();
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) {
    throw new Error(`Source exceeds compliance archive ceiling (${declaredLength} > ${maxBytes})`);
  }

  const tempPath = path.join(
    os.tmpdir(),
    `virelle-compliance-${crypto.randomUUID()}.media`,
  );
  let observedBytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      observedBytes += chunk.length;
      if (observedBytes > maxBytes) {
        callback(new Error(`Source exceeded compliance archive ceiling (${maxBytes} bytes)`));
        return;
      }
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(response.body as any),
      limiter,
      createWriteStream(tempPath, { flags: "wx" }),
    );
    const info = await stat(tempPath);
    return {
      tempPath,
      contentType: response.headers.get("content-type") || "video/mp4",
      size: info.size,
    };
  } catch (error) {
    await unlink(tempPath).catch(() => undefined);
    throw error;
  }
}

async function copyCandidateToPrivateArchive(row: any): Promise<string> {
  const config = storageConfig();
  if (!config) {
    throw new Error(
      "Private compliance archive storage is not configured. Set AWS credentials and COMPLIANCE_ARCHIVE_BUCKET.",
    );
  }
  const candidate: ArchiveCandidate = {
    userId: Number(row.userId),
    accountName: String(row.accountName || `user-${row.userId}`),
    sourceType: String(row.sourceType),
    sourceTable: String(row.sourceTable),
    sourceId: String(row.sourceId),
    workspace: row.workspace === "adult" ? "adult" : "standard",
    mediaKind: row.mediaKind === "broadcast" ? "broadcast" : "video",
    sourceUrl: String(row.sourceUrl),
    userDownloadUrl: String(row.userDownloadUrl),
    startedAt: parseDate(row.startedAt),
    completedAt: row.completedAt ? parseDate(row.completedAt) : null,
    mimeType: row.mimeType || null,
  };
  const destinationKey = archiveKey(candidate);
  const ownKey = sourceKeyFromOwnStorage(candidate.sourceUrl, config);

  if (ownKey && config.sourceBucket) {
    const copySource = encodeURIComponent(`${config.sourceBucket}/${ownKey}`)
      .replace(/%2F/g, "/");
    await config.client.send(new CopyObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
      CopySource: copySource,
      MetadataDirective: "COPY",
    }));
    return destinationKey;
  }

  const downloaded = await downloadRemoteToTemp(candidate.sourceUrl);
  try {
    await config.client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: destinationKey,
      Body: createReadStream(downloaded.tempPath),
      ContentLength: downloaded.size,
      ContentType: downloaded.contentType || candidate.mimeType || "video/mp4",
      Metadata: {
        virelleUserId: String(candidate.userId),
        virelleWorkspace: candidate.workspace,
        virelleSourceType: candidate.sourceType.slice(0, 120),
        virelleSourceId: candidate.sourceId.slice(0, 120),
      },
    }));
    return destinationKey;
  } finally {
    await unlink(downloaded.tempPath).catch(() => undefined);
  }
}

export async function processPendingArchives(limit = 3): Promise<number> {
  const connection = await ensureComplianceTables();
  const result = await connection.execute(sql`
    SELECT * FROM compliance_media_archive
    WHERE archiveStatus IN ('pending', 'copy_failed')
      AND expiredDeletedAt IS NULL
      AND retainedUntil > NOW()
    ORDER BY CASE WHEN archiveStatus='pending' THEN 0 ELSE 1 END, createdAt ASC
    LIMIT ${Math.max(1, Math.min(limit, 20))}
  `);
  let archived = 0;
  for (const row of rowsFrom(result)) {
    const id = Number(row.id);
    await connection.execute(sql`
      UPDATE compliance_media_archive
      SET archiveStatus='copying', archiveError=NULL WHERE id=${id}
    `);
    try {
      const objectKey = await copyCandidateToPrivateArchive(row);
      await connection.execute(sql`
        UPDATE compliance_media_archive
        SET archiveStatus='archived', archiveObjectKey=${objectKey},
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

export async function scanSitewideVideoOutputs(): Promise<number> {
  const connection = await ensureComplianceTables();
  let discovered = 0;

  const registerRows = async (
    query: any,
    mapper: (row: any) => ArchiveCandidate,
  ) => {
    try {
      const result = await connection.execute(query);
      for (const row of rowsFrom(result)) {
        const id = await registerArchiveCandidate(mapper(row));
        if (id) discovered++;
      }
    } catch (error: any) {
      logger.warn(
        `[ComplianceArchive] source scan skipped: ${String(error?.message || error).slice(0, 300)}`,
      );
    }
  };

  await registerRows(sql`
    SELECT m.id, m.userId, m.fileUrl, m.mimeType, m.createdAt, m.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', m.userId)) AS accountName
    FROM movies m
    INNER JOIN users u ON u.id=m.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('movies:', m.id, ':', m.fileUrl), 256)
    WHERE m.fileUrl IS NOT NULL AND m.fileUrl <> '' AND a.id IS NULL
    ORDER BY m.id DESC LIMIT 100
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceType: "movie",
    sourceTable: "movies",
    sourceId: String(row.id),
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.fileUrl),
    userDownloadUrl: String(row.fileUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: row.mimeType || "video/mp4",
  }));

  await registerRows(sql`
    SELECT s.id, p.userId, s.videoUrl, s.createdAt, s.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM scenes s
    INNER JOIN projects p ON p.id=s.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('scenes:', s.id, ':', s.videoUrl), 256)
    WHERE s.videoUrl IS NOT NULL AND s.videoUrl <> '' AND a.id IS NULL
    ORDER BY s.id DESC LIMIT 100
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceType: "scene_video",
    sourceTable: "scenes",
    sourceId: String(row.id),
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.videoUrl),
    userDownloadUrl: String(row.videoUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  await registerRows(sql`
    SELECT j.id, p.userId, j.resultUrl, j.type, j.createdAt, j.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', p.userId)) AS accountName
    FROM generationJobs j
    INNER JOIN projects p ON p.id=j.projectId
    INNER JOIN users u ON u.id=p.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('generationJobs:', j.id, ':', j.resultUrl), 256)
    WHERE j.status='completed' AND j.resultUrl IS NOT NULL
      AND j.resultUrl <> '' AND a.id IS NULL
    ORDER BY j.id DESC LIMIT 100
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceType: `generation_${row.type || "video"}`,
    sourceTable: "generationJobs",
    sourceId: String(row.id),
    workspace: "standard",
    mediaKind: "video",
    sourceUrl: String(row.resultUrl),
    userDownloadUrl: String(row.resultUrl),
    startedAt: parseDate(row.createdAt),
    completedAt: parseDate(row.updatedAt || row.createdAt),
    mimeType: "video/mp4",
  }));

  await registerRows(sql`
    SELECT v.id, v.userId, v.outputVideoUrl, v.mode, v.contentMode,
           v.broadcastStartedAt, v.broadcastCompletedAt, v.createdAt, v.updatedAt,
           COALESCE(u.name, u.email, CONCAT('user-', v.userId)) AS accountName
    FROM virelle_video_transform_jobs v
    INNER JOIN users u ON u.id=v.userId
    LEFT JOIN compliance_media_archive a
      ON a.sourceFingerprint=SHA2(CONCAT('virelle_video_transform_jobs:', v.id, ':', v.outputVideoUrl), 256)
    WHERE v.status='completed' AND v.outputVideoUrl IS NOT NULL
      AND v.outputVideoUrl <> '' AND a.id IS NULL
    ORDER BY v.id DESC LIMIT 100
  `, (row) => ({
    userId: Number(row.userId),
    accountName: String(row.accountName),
    sourceType: row.mode === "broadcast" ? "broadcast_recording" : "studio_render",
    sourceTable: "virelle_video_transform_jobs",
    sourceId: String(row.id),
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

export async function purgeExpiredArchives(limit = 50): Promise<number> {
  const connection = await ensureComplianceTables();
  const config = storageConfig();
  if (!config) return 0;
  const result = await connection.execute(sql`
    SELECT id, archiveObjectKey FROM compliance_media_archive
    WHERE legalHold=0 AND retainedUntil < NOW()
      AND archiveStatus='archived' AND archiveObjectKey IS NOT NULL
      AND expiredDeletedAt IS NULL
    ORDER BY retainedUntil ASC LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  let deleted = 0;
  for (const row of rowsFrom(result)) {
    try {
      await config.client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
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
        `[ComplianceArchive] expiry deletion failed for #${row.id}: ${error?.message}`,
      );
    }
  }
  return deleted;
}

export async function listComplianceArchive(params: {
  workspace?: ComplianceWorkspace | "all";
  status?: string | null;
  userId?: number | null;
  limit?: number;
}) {
  const connection = await ensureComplianceTables();
  const workspace = params.workspace && params.workspace !== "all"
    ? params.workspace
    : null;
  const status = params.status || null;
  const userId = params.userId || null;
  const limit = Math.max(1, Math.min(params.limit || 100, 500));
  const result = await connection.execute(sql`
    SELECT a.id, a.userId, a.accountName, u.email, a.sourceType,
           a.sourceTable, a.sourceId, a.workspace, a.mediaKind,
           a.userDownloadUrl, a.archiveStatus, a.archiveError, a.mimeType,
           a.startedAt, a.completedAt, a.retainedUntil, a.legalHold,
           a.legalHoldReason, a.archivedAt, a.createdAt, a.updatedAt
    FROM compliance_media_archive a
    INNER JOIN users u ON u.id=a.userId
    WHERE (${workspace} IS NULL OR a.workspace=${workspace})
      AND (${status} IS NULL OR a.archiveStatus=${status})
      AND (${userId} IS NULL OR a.userId=${userId})
    ORDER BY a.startedAt DESC LIMIT ${limit}
  `);
  return rowsFrom(result);
}

export async function getAdminArchiveDownloadUrl(params: {
  adminUserId: number;
  archiveId: number;
  ipAddress?: string | null;
}): Promise<{ url: string; expiresIn: number }> {
  const connection = await ensureComplianceTables();
  const result = await connection.execute(sql`
    SELECT id, userId, archiveObjectKey, archiveStatus
    FROM compliance_media_archive WHERE id=${params.archiveId} LIMIT 1
  `);
  const row = rowsFrom(result)[0];
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Archive record not found." });
  if (row.archiveStatus !== "archived" || !row.archiveObjectKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Private archive copy is not available.",
    });
  }
  const config = storageConfig();
  if (!config) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Archive storage is unavailable.",
    });
  }
  const expiresIn = Math.max(
    60,
    Math.min(
      Number(process.env.COMPLIANCE_SIGNED_URL_SECONDS || DEFAULT_SIGNED_URL_SECONDS),
      900,
    ),
  );
  const url = await getSignedUrl(
    config.client,
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: String(row.archiveObjectKey),
    }),
    { expiresIn },
  );
  await logComplianceAccess({
    adminUserId: params.adminUserId,
    action: "archive_download_url_created",
    archiveId: params.archiveId,
    targetUserId: Number(row.userId),
    ipAddress: params.ipAddress,
  });
  return { url, expiresIn };
}

export async function setArchiveLegalHold(params: {
  adminUserId: number;
  archiveId: number;
  legalHold: boolean;
  reason?: string | null;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceTables();
  await connection.execute(sql`
    UPDATE compliance_media_archive
    SET legalHold=${params.legalHold ? 1 : 0},
        legalHoldReason=${params.legalHold
          ? params.reason || "Administrator legal hold"
          : null}
    WHERE id=${params.archiveId}
  `);
  await logComplianceAccess({
    adminUserId: params.adminUserId,
    action: params.legalHold
      ? "archive_legal_hold_set"
      : "archive_legal_hold_removed",
    archiveId: params.archiveId,
    metadata: { reason: params.reason || null },
    ipAddress: params.ipAddress,
  });
  return { ok: true };
}

export async function listModerationIncidents(params: {
  status?: ModerationIncidentStatus | "all";
  limit?: number;
}) {
  const connection = await ensureComplianceTables();
  const status = params.status && params.status !== "all" ? params.status : null;
  const result = await connection.execute(sql`
    SELECT i.*, u.name AS accountName, u.email, u.phone, u.country, u.city,
           a.mediaKind, a.startedAt, a.retainedUntil, a.archiveStatus
    FROM moderation_incidents i
    INNER JOIN users u ON u.id=i.userId
    LEFT JOIN compliance_media_archive a ON a.id=i.archiveId
    WHERE (${status} IS NULL OR i.status=${status})
    ORDER BY FIELD(
      i.status,
      'blocked_pending_review',
      'confirmed_violation',
      'dismissed'
    ), i.createdAt DESC
    LIMIT ${Math.max(1, Math.min(params.limit || 100, 500))}
  `);
  return rowsFrom(result);
}

export async function dismissModerationIncident(params: {
  adminUserId: number;
  incidentId: number;
  notes: string;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceTables();
  const incidentResult = await connection.execute(sql`
    SELECT archiveId FROM moderation_incidents
    WHERE id=${params.incidentId} AND status='blocked_pending_review' LIMIT 1
  `);
  const incident = rowsFrom(incidentResult)[0];
  if (!incident) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Incident is missing or was already reviewed.",
    });
  }
  await connection.execute(sql`
    UPDATE moderation_incidents
    SET status='dismissed', reviewedBy=${params.adminUserId}, reviewedAt=NOW(),
        reviewNotes=${params.notes}, legalHold=0
    WHERE id=${params.incidentId}
  `);
  if (incident.archiveId) {
    await connection.execute(sql`
      UPDATE compliance_media_archive
      SET legalHold=0, legalHoldReason=NULL
      WHERE id=${Number(incident.archiveId)}
        AND legalHoldReason=CONCAT('Moderation incident #', ${params.incidentId})
    `);
  }
  await logComplianceAccess({
    adminUserId: params.adminUserId,
    action: "moderation_incident_dismissed",
    incidentId: params.incidentId,
    metadata: { notes: params.notes },
    ipAddress: params.ipAddress,
  });
  return { ok: true };
}

export async function confirmModerationViolation(params: {
  adminUserId: number;
  incidentId: number;
  notes: string;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceTables();
  const result = await connection.execute(sql`
    SELECT * FROM moderation_incidents WHERE id=${params.incidentId} LIMIT 1
  `);
  const incident = rowsFrom(result)[0];
  if (!incident) throw new TRPCError({ code: "NOT_FOUND", message: "Incident not found." });
  if (incident.status !== "blocked_pending_review") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Incident was already reviewed.",
    });
  }
  const userId = Number(incident.userId);
  const reasonCode = incident.category === "suspected_csam_request"
    || incident.category === "suspected_minor_sexualisation"
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
      incidentId=VALUES(incidentId), reasonCode=VALUES(reasonCode),
      status='active', evidenceSummary=VALUES(evidenceSummary),
      notes=VALUES(notes), blacklistedBy=VALUES(blacklistedBy),
      blacklistedAt=NOW()
  `);
  await connection.execute(sql`
    UPDATE users
    SET isFrozen=1,
        frozenReason=CONCAT(
          'Confirmed serious content-policy violation; incident #',
          ${params.incidentId}
        ),
        frozenAt=NOW(), isAdultVerified=0, updatedAt=NOW()
    WHERE id=${userId}
  `);
  await connection.execute(sql`
    UPDATE mature_access_profiles
    SET accessStatus='revoked',
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
  await logComplianceAccess({
    adminUserId: params.adminUserId,
    action: "moderation_violation_confirmed_and_account_blacklisted",
    incidentId: params.incidentId,
    targetUserId: userId,
    metadata: { reasonCode, notes: params.notes },
    ipAddress: params.ipAddress,
  });
  return { ok: true, userId, reasonCode };
}

export async function listBlacklistedUsers(limit = 200) {
  const connection = await ensureComplianceTables();
  const result = await connection.execute(sql`
    SELECT b.id, b.userId, b.incidentId, b.reasonCode, b.status,
           b.evidenceSummary, b.notes, b.blacklistedAt, b.blacklistedBy,
           u.name AS accountName, u.email, u.phone, u.country, u.city,
           u.createdAt AS accountCreatedAt, u.frozenReason, u.frozenAt,
           m.fullName AS verifiedLegalName, m.phone AS verifiedPhone,
           m.addressLine1, m.addressLine2, m.city AS verifiedCity,
           m.stateRegion, m.postcode, m.country AS verifiedCountry,
           i.sourceType, i.sourceId, i.workspace, i.requestSummary,
           i.evidenceUrl, i.evidenceArchiveKey, i.classifierSignals,
           i.reviewNotes, i.reviewedAt, i.archiveId
    FROM blacklisted_users b
    INNER JOIN users u ON u.id=b.userId
    INNER JOIN moderation_incidents i ON i.id=b.incidentId
    LEFT JOIN mature_access_profiles m ON m.userId=b.userId
    WHERE b.status='active'
    ORDER BY b.blacklistedAt DESC
    LIMIT ${Math.max(1, Math.min(limit, 500))}
  `);
  return rowsFrom(result);
}

export async function logComplianceAccess(params: {
  adminUserId: number;
  action: string;
  archiveId?: number | null;
  incidentId?: number | null;
  targetUserId?: number | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  const connection = await ensureComplianceTables();
  await connection.execute(sql`
    INSERT INTO compliance_access_log
      (adminUserId, action, archiveId, incidentId, targetUserId, metadata, ipAddress)
    VALUES
      (${params.adminUserId}, ${params.action}, ${params.archiveId || null},
       ${params.incidentId || null}, ${params.targetUserId || null},
       ${JSON.stringify(params.metadata || {})}, ${params.ipAddress || null})
  `);
}

export async function listComplianceAccessLog(limit = 200) {
  const connection = await ensureComplianceTables();
  const result = await connection.execute(sql`
    SELECT l.*, u.name AS adminName, u.email AS adminEmail
    FROM compliance_access_log l
    INNER JOIN users u ON u.id=l.adminUserId
    ORDER BY l.createdAt DESC
    LIMIT ${Math.max(1, Math.min(limit, 1000))}
  `);
  return rowsFrom(result);
}
