import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

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
        message: `Database error: ${error.message?.substring(0, 200)}`,
        data: {
          ...shape.data,
          // Strip any SQL details from the error
        },
      };
    }
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

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

export const protectedProcedure = t.procedure.use(requireUser);

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
