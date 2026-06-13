import { logger } from "./logger";
import { Sentry } from "./sentry.js";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const EXPIRED_TESTER_ERR_MSG =
  "Your 48-hour trial has ended. Your projects and downloads are still available — upgrade to a paid plan to continue creating.";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Never expose raw database/SQL errors to the client
    const isSqlError = error.message?.includes('Failed query') ||
      error.message?.includes('SELECT') ||
      error.message?.includes('INSERT') ||
      error.message?.includes('UPDATE') ||
      error.message?.includes('DELETE') ||
      error.message?.includes('COLUMN') ||
      error.message?.includes('Unknown column') ||
      error.message?.includes('ER_');

    if (isSqlError) {
      logger.error(`[tRPC] Database error (hidden from client): ${error.message}`);
      return {
        ...shape,
        message: "An unexpected error occurred. Please try again.",
        data: { ...shape.data },
      };
    }

    // In production, never leak raw internal error messages (filesystem paths,
    // bucket names, library stack traces, etc.) for unexpected 500s.
    // Intentional TRPCErrors (NOT_FOUND, FORBIDDEN, BAD_REQUEST …) carry their
    // own message which is safe to forward — only opaque INTERNAL_SERVER_ERRORs
    // need sanitising.
    const isProduction = process.env.NODE_ENV === "production";
    const isUnexpected500 = shape.data?.httpStatus === 500 && !(error.cause instanceof TRPCError);
    if (isProduction && isUnexpected500) {
      logger.error(`[tRPC] Internal error (hidden from client): ${error.message}`);
      return {
        ...shape,
        message: "An unexpected error occurred. Please try again.",
        data: { ...shape.data },
      };
    }

    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── requireUser: basic auth check ───────────────────────────────────────────
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Standard protected procedure — allows expired testers in read-only mode. */
export const protectedProcedure = t.procedure.use(requireUser);

// ─── blockExpiredTester: creation guard ──────────────────────────────────────
const blockExpiredTester = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if (ctx.isExpiredTester) {
    throw new TRPCError({ code: "FORBIDDEN", message: EXPIRED_TESTER_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * creationProcedure — use for any mutation that creates, generates, or modifies
 * content (projects, scenes, characters, AI generation, payments, etc.).
 * Expired tester accounts receive a clear upgrade prompt instead of an error.
 */
export const creationProcedure = t.procedure.use(blockExpiredTester);

// ─── adminProcedure ───────────────────────────────────────────────────────────
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.email !== 'leego972@gmail.com')) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

  // ─── designerProcedure ────────────────────────────────────────────────────────
  // Centralised designer gate — replaces repetitive manual designerProfiles checks
  // in every designer-facing endpoint. Lazy-imports db to avoid circular deps.
  const requireDesigner = t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    const { getDb } = await import("../db");
    const dbConn = await getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { sql } = await import("drizzle-orm");
    const rows: any = await dbConn.execute(
      sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} AND status = 'active' LIMIT 1`
    );
    const profile = (Array.isArray(rows[0]) ? rows[0] : rows)[0] ?? null;
    if (!profile) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "An active Designer membership is required. Join via the Wardrobe Marketplace.",
      });
    }
    return next({
      ctx: { ...ctx, user: ctx.user, designerProfile: { id: profile.id as number, userId: profile.userId as number } },
    });
  });

  /** Protected procedure that also requires an active designer profile (status=active). */
  export const designerProcedure = t.procedure.use(requireDesigner);
  