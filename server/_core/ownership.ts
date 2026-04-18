import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Ownership / access guards for project-scoped tRPC procedures.
 *
 * `assertOwnsProject` — strict owner-only check. Use for any write/delete
 * mutation or any data the owner alone should control (billing, deletion,
 * generating share links, inviting collaborators).
 *
 * `assertCanAccessProject` — owner OR accepted collaborator. Use for
 * read-only list/get endpoints so accepted producers, directors, editors,
 * and viewers can actually see the project's data after they accept their
 * invitation. Returns the project + the caller's role in the project.
 */
export async function assertOwnsProject(projectId: number, userId: number) {
  const project = await db.getProjectById(projectId, userId);
  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this project.",
    });
  }
  return project;
}

export async function assertCanAccessProject(projectId: number, userId: number) {
  // Try owner first — fast path, also returns the project row
  const owned = await db.getProjectById(projectId, userId);
  if (owned) return { project: owned, role: "owner" as const };

  // Fall back: accepted collaborator?
  const collabs = await db.listCollaboratorsByProject(projectId);
  const mine = collabs?.find((c: any) => c.userId === userId && c.status === "accepted");
  if (mine) {
    // Fetch the project without owner constraint
    const dbConn = await db.getDb();
    if (dbConn) {
      const { sql } = await import("drizzle-orm");
      const rows: any = await dbConn.execute(sql`SELECT * FROM projects WHERE id = ${projectId} LIMIT 1`);
      const arr = Array.isArray(rows[0]) ? rows[0] : rows;
      const project = (arr as any[])?.[0];
      if (project) {
        return { project, role: (mine.role || "viewer") as "viewer" | "editor" | "producer" | "director" };
      }
    }
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have access to this project.",
  });
}
