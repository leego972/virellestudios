import { logger } from "./_core/logger";
import {
  ensureComplianceTables,
  processPendingArchives,
  purgeExpiredArchives,
  scanSitewideVideoOutputs,
} from "./_core/contentCompliance";

const SCAN_INTERVAL_MS = Math.max(
  60_000,
  Number(process.env.COMPLIANCE_ARCHIVE_SCAN_INTERVAL_MS || 5 * 60_000),
);

let cycleRunning = false;
let workerStarted = false;

export async function runComplianceArchiveCycle(): Promise<void> {
  if (cycleRunning) return;
  cycleRunning = true;
  try {
    await ensureComplianceTables();
    const discovered = await scanSitewideVideoOutputs();
    const archived = await processPendingArchives(
      Math.max(1, Number(process.env.COMPLIANCE_ARCHIVE_BATCH_SIZE || 3)),
    );
    const deleted = await purgeExpiredArchives(100);
    if (discovered || archived || deleted) {
      logger.info(
        `[ComplianceArchive] cycle completed: discovered=${discovered}, archived=${archived}, expiredDeleted=${deleted}`,
      );
    }
  } catch (error: any) {
    logger.error(
      `[ComplianceArchive] cycle failed: ${String(error?.message || error).slice(0, 1000)}`,
    );
  } finally {
    cycleRunning = false;
  }
}

export function startComplianceArchiveWorker(): void {
  if (workerStarted) return;
  workerStarted = true;
  if (process.env.COMPLIANCE_ARCHIVE_ENABLED === "false") {
    logger.warn("[ComplianceArchive] disabled by COMPLIANCE_ARCHIVE_ENABLED=false");
    return;
  }
  logger.info(
    `[ComplianceArchive] starting site-wide private archive; minimum retention=90 days, interval=${SCAN_INTERVAL_MS}ms`,
  );
  setTimeout(() => runComplianceArchiveCycle().catch(() => undefined), 12_000);
  const timer = setInterval(
    () => runComplianceArchiveCycle().catch(() => undefined),
    SCAN_INTERVAL_MS,
  );
  timer.unref?.();
}
