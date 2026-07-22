import { logger } from "./_core/logger";
import {
  ensureComplianceEvidenceTables,
  processArchiveQueue,
  purgeExpiredArchive,
  scanVideoOutputs,
} from "./_core/complianceEvidence";
import {
  assertComplianceArchiveConfiguration,
  ensureEvidenceConfirmationTrigger,
} from "./_core/complianceEvidenceGuards";

const INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.COMPLIANCE_ARCHIVE_SCAN_INTERVAL_MS || 300_000),
);
let started = false;
let running = false;

export async function runComplianceEvidenceCycle(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const dbConn = await ensureComplianceEvidenceTables();
    await ensureEvidenceConfirmationTrigger(dbConn);
    assertComplianceArchiveConfiguration();
    const discovered = await scanVideoOutputs();
    const archived = await processArchiveQueue(
      Math.max(1, Number(process.env.COMPLIANCE_ARCHIVE_BATCH_SIZE || 3)),
    );
    const expiredDeleted = await purgeExpiredArchive(100);
    if (discovered || archived || expiredDeleted) {
      logger.info(
        `[ComplianceArchive] discovered=${discovered}, archived=${archived}, expiredDeleted=${expiredDeleted}`,
      );
    }
  } catch (error: any) {
    logger.error(
      `[ComplianceArchive] cycle failed: ${String(error?.message || error).slice(0, 1000)}`,
    );
  } finally {
    running = false;
  }
}

export function startComplianceEvidenceWorker(): void {
  if (started) return;
  started = true;
  if (process.env.COMPLIANCE_ARCHIVE_ENABLED === "false") {
    logger.warn("[ComplianceArchive] disabled by COMPLIANCE_ARCHIVE_ENABLED=false");
    return;
  }
  logger.info(
    `[ComplianceArchive] starting site-wide private archive; interval=${INTERVAL_MS}ms`,
  );
  setTimeout(() => runComplianceEvidenceCycle().catch(() => undefined), 12_000);
  const timer = setInterval(
    () => runComplianceEvidenceCycle().catch(() => undefined),
    INTERVAL_MS,
  );
  timer.unref?.();
}
