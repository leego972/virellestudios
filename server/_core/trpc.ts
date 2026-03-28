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
      console.error('[tRPC] Database error (hidden from client):', error.message);
      return {
        ...shape,
        message: `Database error: ${error.message?.substring(0, 1000)}`,
        data: {
          ...shape.data,
        },
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
    if (!ctx.user || ctx.user.role !== 'admin') {
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
