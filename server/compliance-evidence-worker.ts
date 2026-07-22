import { logger } from "./_core/logger";
import { ensureComplianceEvidenceTables } from "./_core/complianceEvidence";
import {
  processSecureArchiveQueue,
  purgeSecureExpiredArchive,
  scanCompletedVideoOutputs,
} from "./_core/complianceArchiveTransport";
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
    const discovered = await scanCompletedVideoOutputs();
    const archived = await processSecureArchiveQueue(
      Math.max(1, Number(process.env.COMPLIANCE_ARCHIVE_BATCH_SIZE || 3)),
    );
    const expiredDeleted = await purgeSecureExpiredArchive(100);
    if (discovered || archived || expiredDeleted) {
      logger.info(
        `[ComplianceArchive] completedDiscovered=${discovered}, archived=${archived}, expiredDeleted=${expiredDeleted}`,
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
    `[ComplianceArchive] starting secure completed-output archive; interval=${INTERVAL_MS}ms`,
  );
  setTimeout(() => runComplianceEvidenceCycle().catch(() => undefined), 12_000);
  const timer = setInterval(
    () => runComplianceEvidenceCycle().catch(() => undefined),
    INTERVAL_MS,
  );
  timer.unref?.();
}
