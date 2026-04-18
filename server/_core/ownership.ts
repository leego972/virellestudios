import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Ownership guard for project-scoped tRPC procedures.
 *
 * Throws FORBIDDEN if the authenticated user does not own the given project.
 * Use at the top of every project-scoped query/mutation that takes a projectId
 * but does not otherwise verify ownership. Returns the project row so callers
 * can avoid an extra fetch.
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
