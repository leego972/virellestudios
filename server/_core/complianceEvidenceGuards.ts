import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";

function rowsFrom(result: any): any[] {
  if (Array.isArray(result?.[0])) return result[0];
  if (Array.isArray(result)) return result;
  return [];
}

/**
 * Private compliance media must not silently fall back to the public upload
 * bucket in production. A shared bucket is permitted only through an explicit
 * override, which must be paired with a bucket policy denying public access to
 * the compliance-archive prefix.
 */
export function assertComplianceArchiveConfiguration(): void {
  if (process.env.COMPLIANCE_ARCHIVE_ENABLED === "false") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "COMPLIANCE_ARCHIVE_DISABLED: Video generation and broadcasting require the private compliance archive.",
    });
  }

  const sourceBucket = String(process.env.AWS_S3_BUCKET || "").trim();
  const archiveBucket = String(process.env.COMPLIANCE_ARCHIVE_BUCKET || "").trim();
  const credentialsPresent = Boolean(
    process.env.AWS_ACCESS_KEY_ID
    && process.env.AWS_SECRET_ACCESS_KEY,
  );

  if (!credentialsPresent || !sourceBucket || !archiveBucket) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "COMPLIANCE_ARCHIVE_NOT_CONFIGURED: Set S3 credentials, AWS_S3_BUCKET and a private COMPLIANCE_ARCHIVE_BUCKET before generating or broadcasting video.",
    });
  }

  const sharedBucket = sourceBucket === archiveBucket;
  const sharedBucketAllowed = process.env.COMPLIANCE_ALLOW_SHARED_BUCKET === "true";
  if (sharedBucket && !sharedBucketAllowed) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "PRIVATE_ARCHIVE_BUCKET_REQUIRED: COMPLIANCE_ARCHIVE_BUCKET must be separate from the public upload bucket. A shared bucket requires the explicit COMPLIANCE_ALLOW_SHARED_BUCKET=true override and a private prefix bucket policy.",
    });
  }
}

/**
 * Data-layer backstop: a flagged prompt cannot be converted into a confirmed
 * violation unless preserved media evidence is attached to the incident.
 * This prevents accidental blacklisting based only on ambiguous wording.
 */
export async function ensureEvidenceConfirmationTrigger(dbConn: any): Promise<void> {
  const triggerName = "trg_moderation_confirm_requires_evidence";
  const existing = await dbConn.execute(sql`
    SELECT TRIGGER_NAME
    FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA=DATABASE() AND TRIGGER_NAME=${triggerName}
    LIMIT 1
  `);
  if (rowsFrom(existing).length > 0) return;

  await dbConn.execute(sql.raw(`
    CREATE TRIGGER ${triggerName}
    BEFORE UPDATE ON moderation_incidents
    FOR EACH ROW
    BEGIN
      IF NEW.status = 'confirmed_violation'
         AND OLD.status <> 'confirmed_violation'
         AND NEW.archiveId IS NULL
         AND (NEW.evidenceUrl IS NULL OR CHAR_LENGTH(TRIM(NEW.evidenceUrl)) = 0)
      THEN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'MEDIA_EVIDENCE_REQUIRED: A request alone cannot support permanent deactivation.';
      END IF;
    END
  `));
}
