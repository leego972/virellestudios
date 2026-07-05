/**
   * admin-seed.ts — Idempotent startup seed that ensures designated admin emails
   * have the "admin" role in the database.
   *
   * Safe to run on every server restart: it only updates rows where role != "admin"
   * and silently no-ops if the user does not yet exist.
   */
  import * as db from "../db";
  import { logger } from "./logger";

  const ADMIN_EMAILS: string[] = [
    "leego972@gmail.com",
    "brobroplzcheck@gmail.com",
  ];

  export async function seedAdminUsers(): Promise<void> {
    for (const email of ADMIN_EMAILS) {
      try {
        const user = await db.getUserByEmail(email);
        if (!user) {
          logger.info(`[AdminSeed] ${email} — not registered yet, skipping`);
          continue;
        }
        if (user.role === "admin") {
          logger.info(`[AdminSeed] ${email} — already admin ✓`);
          continue;
        }
        await db.updateUserRole(user.id, "admin");
        logger.info(`[AdminSeed] ${email} (id=${user.id}) — role set to admin ✓`);
      } catch (err: any) {
        logger.error(`[AdminSeed] Failed to seed admin for ${email}: ${err?.message}`);
      }
    }
  }
  