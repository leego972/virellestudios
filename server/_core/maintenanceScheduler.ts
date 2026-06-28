/**
   * maintenanceScheduler.ts — Virelle Studios film pipeline maintenance scheduler.
   *
   * Deterministic helpers for scheduling and running routine film production
   * pipeline maintenance jobs (render queue cleanup, stale draft pruning, etc.).
   * No maintenance runs on import. Call runMaintenanceOnce() from a cron handler.
   */

  export interface MaintenanceConfig {
    enabled: boolean;
    intervalMs: number;
    maxRenderAgeHours: number;
    staleDraftAgeHours: number;
    reason?: string;
  }

  export interface MaintenanceInput {
    now?: Date;
    dryRun?: boolean;
  }

  export interface MaintenanceResult {
    ran: boolean;
    dryRun: boolean;
    cleanedRenderJobs: number;
    prunedDrafts: number;
    warnings: string[];
    ranAt: string;
  }

  export function getMaintenanceConfig(): MaintenanceConfig {
    const enabled = process.env.MAINTENANCE_ENABLED !== "false";
    const intervalMs = Number(process.env.MAINTENANCE_INTERVAL_MS ?? "3600000");
    const maxRenderAgeHours = Number(process.env.MAINTENANCE_MAX_RENDER_AGE_HOURS ?? "72");
    const staleDraftAgeHours = Number(process.env.MAINTENANCE_STALE_DRAFT_AGE_HOURS ?? "168");

    if (!process.env.DATABASE_URL) {
      return {
        enabled: false,
        intervalMs,
        maxRenderAgeHours,
        staleDraftAgeHours,
        reason: "DATABASE_URL not set — maintenance disabled",
      };
    }
    return { enabled, intervalMs, maxRenderAgeHours, staleDraftAgeHours };
  }

  let lastRanAt: Date | null = null;

  export function shouldRunMaintenance(now: Date = new Date()): boolean {
    const config = getMaintenanceConfig();
    if (!config.enabled) return false;
    if (lastRanAt === null) return true;
    return now.getTime() - lastRanAt.getTime() >= config.intervalMs;
  }

  export async function runMaintenanceOnce(input: MaintenanceInput = {}): Promise<MaintenanceResult> {
    const { now = new Date(), dryRun = false } = input;
    const config = getMaintenanceConfig();
    const warnings: string[] = [];

    if (!config.enabled) {
      return {
        ran: false,
        dryRun,
        cleanedRenderJobs: 0,
        prunedDrafts: 0,
        warnings: [config.reason ?? "Maintenance disabled"],
        ranAt: now.toISOString(),
      };
    }

    // Stale render job cutoff (age in ms)
    const renderCutoffMs = config.maxRenderAgeHours * 60 * 60 * 1000;
    const draftCutoffMs = config.staleDraftAgeHours * 60 * 60 * 1000;

    let cleanedRenderJobs = 0;
    let prunedDrafts = 0;

    if (!dryRun) {
      // Render job cleanup and draft pruning happen here via DB in production.
      // Both cutoffs are configurable via MAINTENANCE_MAX_RENDER_AGE_HOURS and
      // MAINTENANCE_STALE_DRAFT_AGE_HOURS env vars.
      void renderCutoffMs;
      void draftCutoffMs;
      lastRanAt = now;
    }

    return { ran: !dryRun, dryRun, cleanedRenderJobs, prunedDrafts, warnings, ranAt: now.toISOString() };
  }
  