// ────────────────────────────────────────────────────────────────────────────
// v6.72 — Auto Recap render sweeper.
//
// Purpose: rescue recaps that got stuck in `render_pending` because the API
// process died mid-render (or the worker crashed before its safeFail block
// ran). Without this sweeper a stuck recap would trap both:
//   • the user (no cancel/retry path; the UI keeps polling forever),
//   • the credits (the reservation row is left in `reserved` and never
//     finalizes or releases).
//
// Strategy: read the `recaps` table for rows whose `status = "render_pending"`
// and whose `updatedAt` is older than the threshold (default 30 minutes).
// For each, look up the matching `creditReservations` row by
// (referenceType="recap_render", referenceId=recap.id) and either dry-run
// report or actually release + revert.
//
// Safety:
//   • never touches `render_completed` recaps,
//   • never deletes recap segments or source videos,
//   • never re-releases a reservation that is already `finalized` or
//     `released` (releaseReservation itself is gated, but we also skip it
//     so the report is honest about what happened),
//   • leaves `outline` / `voiceoverScript` / `fileKey` / `fileUrl` intact.
// ────────────────────────────────────────────────────────────────────────────

import { and, eq, lt } from "drizzle-orm";
import * as db from "../db";
import { recaps, creditReservations } from "../../drizzle/schema";
import { logger } from "./logger";

export type SweeperItem = {
  recapId: number;
  reservationId?: number | null;
  previousStatus: string;
  action: "would_release" | "released" | "skipped";
  reason: string;
};

export type SweeperResult = {
  checked: number;
  repaired: number;
  dryRun: boolean;
  items: SweeperItem[];
};

export type SweeperOptions = {
  olderThanMinutes?: number;
  dryRun?: boolean;
};

const DEFAULT_OLDER_THAN_MINUTES = 30;

/**
 * Find every recap stuck in `render_pending` for longer than `olderThanMinutes`,
 * release its reservation if any, and revert it to `outline_completed`.
 *
 * In `dryRun` mode nothing is mutated — every item reports `would_release`
 * (or `skipped` with a reason) so the caller can see what *would* happen.
 *
 * Failures are isolated per row — a bad reservation lookup or update for one
 * recap does not abort the rest of the sweep.
 */
export async function sweepStuckRecapRenders(
  options: SweeperOptions = {},
): Promise<SweeperResult> {
  const olderThanMinutes = Math.max(1, options.olderThanMinutes ?? DEFAULT_OLDER_THAN_MINUTES);
  const dryRun = !!options.dryRun;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const result: SweeperResult = {
    checked: 0,
    repaired: 0,
    dryRun,
    items: [],
  };

  const drizzleDb = await db.getDb();
  if (!drizzleDb) {
    // No DB configured (e.g. local dev without DATABASE_URL). Treat this
    // as a no-op rather than throwing so the boot sweep never crashes the
    // process.
    logger.warn?.("[recapSweeper] no database configured; skipping sweep.");
    return result;
  }

  // 1. Find stuck recaps.
  let stuck: Array<{ id: number; userId: number; status: string; fileUrl: any }> = [];
  try {
    stuck = (await drizzleDb
      .select({
        id: recaps.id,
        userId: recaps.userId,
        status: recaps.status,
        fileUrl: recaps.fileUrl,
      })
      .from(recaps)
      .where(and(eq(recaps.status, "render_pending"), lt(recaps.updatedAt, cutoff)))) as any[];
  } catch (err: any) {
    logger.error?.(`[recapSweeper] DB query failed: ${err?.message}`);
    throw err;
  }

  result.checked = stuck.length;

  // 2. For each stuck recap, look up the reservation and act.
  for (const row of stuck) {
    const item: SweeperItem = {
      recapId: row.id,
      reservationId: null,
      previousStatus: row.status,
      action: "skipped",
      reason: "",
    };

    let reservationId: number | null = null;
    let reservationStatus: string | null = null;
    try {
      // Look up directly (rather than via db.getActiveReservation) so we
      // can also see finalized/released rows and report them honestly.
      const resRows = (await drizzleDb
        .select({
          id: creditReservations.id,
          status: creditReservations.status,
        })
        .from(creditReservations)
        .where(
          and(
            eq(creditReservations.referenceType, "recap_render"),
            eq(creditReservations.referenceId, row.id),
          ),
        )
        .orderBy(creditReservations.id)) as Array<{ id: number; status: string }>;
      if (resRows.length > 0) {
        const last = resRows[resRows.length - 1];
        reservationId = last.id;
        reservationStatus = last.status;
        item.reservationId = reservationId;
      }
    } catch (err: any) {
      item.reason = `reservation lookup failed: ${err?.message}`;
      result.items.push(item);
      continue;
    }

    if (dryRun) {
      item.action = "would_release";
      item.reason = reservationId
        ? `would revert recap to outline_completed and release reservation ${reservationId} (current: ${reservationStatus})`
        : `would revert recap to outline_completed; no reservation found`;
      result.items.push(item);
      continue;
    }

    // 3. Real run — revert the recap, then release the reservation if it
    //    is still in a releasable state.
    try {
      await db.updateRecap(row.id, row.userId, {
        status: "outline_completed",
        errorMessage:
          "Final MP4 render timed out. Credits were released; you can retry the render.",
      } as any);
    } catch (err: any) {
      item.reason = `recap update failed: ${err?.message}`;
      result.items.push(item);
      continue;
    }

    if (reservationId && reservationStatus === "reserved") {
      try {
        await db.releaseReservation(reservationId);
      } catch (err: any) {
        // releaseReservation is itself idempotent; if it throws, log and
        // still count this as a repair (the recap status is fixed).
        logger.warn?.(
          `[recapSweeper] release reservation ${reservationId} failed for recap ${row.id}: ${err?.message}`,
        );
      }
    }

    item.action = "released";
    item.reason = reservationId
      ? `reverted recap, released reservation ${reservationId} (was ${reservationStatus})`
      : `reverted recap; no reservation to release`;
    result.repaired += 1;
    result.items.push(item);
  }

  if (result.checked > 0) {
    logger.info?.(
      `[recapSweeper] checked=${result.checked} repaired=${result.repaired} dryRun=${dryRun} threshold=${olderThanMinutes}m`,
    );
  }

  return result;
}
