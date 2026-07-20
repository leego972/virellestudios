import { logger } from "./logger";
import { Sentry } from "./sentry.js";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const EXPIRED_TESTER_ERR_MSG =
  "Your 48-hour trial has ended. Your projects and downloads are still available — upgrade to a paid plan to continue creating.";

const DESIGNER_ALLOWED_PATH_PREFIXES = [
  "auth.",
  "system.",
  "wardrobeMarket.",
  "designerWardrobe.",
  "notification.",
  "notifications.",
];

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isSqlError =
      error.message?.includes("Failed query") ||
      error.message?.includes("SELECT") ||
      error.message?.includes("INSERT") ||
      error.message?.includes("UPDATE") ||
      error.message?.includes("DELETE") ||
      error.message?.includes("COLUMN") ||
      error.message?.includes("Unknown column") ||
      error.message?.includes("ER_");

    if (isSqlError) {
      logger.error(`[tRPC] Database error (hidden from client): ${error.message}`);
      return {
        ...shape,
        message: "An unexpected error occurred. Please try again.",
        data: { ...shape.data },
      };
    }

    const isProduction = process.env.NODE_ENV === "production";
    const isUnexpected500 =
      shape.data?.httpStatus === 500 && !(error.cause instanceof TRPCError);
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
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure;

function getDesignerProfileDetails(profile: any): Record<string, unknown> {
  const branding = profile?.brandingImages;
  if (!branding || typeof branding !== "object" || Array.isArray(branding)) {
    return {};
  }
  const details = (branding as Record<string, unknown>).profileDetails;
  return details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {};
}

function hasActiveFilmmakerPlan(user: any): boolean {
  const status = String(user?.subscriptionStatus || "none");
  const tier = String(user?.subscriptionTier || "free");
  return (
    ["active", "trialing"].includes(status) &&
    !["free", "beta"].includes(tier)
  );
}

async function assertDesignerAccountPathAllowed(
  ctx: TrpcContext,
  path: string | undefined,
): Promise<void> {
  if (!ctx.user || ctx.user.role === "admin" || !path) return;
  if (DESIGNER_ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return;
  }

  const { getDesignerProfileByUserId } = await import("../db");
  const profile = await getDesignerProfileByUserId(ctx.user.id);
  if (!profile || profile.membershipStatus !== "active") return;

  const details = getDesignerProfileDetails(profile);
  const savedMode = details.accessMode;
  const accessMode =
    savedMode === "designer_only" || savedMode === "hybrid"
      ? savedMode
      : hasActiveFilmmakerPlan(ctx.user)
        ? "hybrid"
        : "designer_only";

  if (accessMode === "designer_only") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This Designer account can only access the Designer Studio, listings and Wardrobe Marketplace.",
    });
  }
}

const requireUser = t.middleware(async opts => {
  const { ctx, next, path } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  await assertDesignerAccountPathAllowed(ctx, path);
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/** Standard protected procedure — allows expired testers in read-only mode. */
export const protectedProcedure = t.procedure.use(requireUser);

const blockExpiredTester = t.middleware(async opts => {
  const { ctx, next, path } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  await assertDesignerAccountPathAllowed(ctx, path);
  if (ctx.isExpiredTester) {
    throw new TRPCError({ code: "FORBIDDEN", message: EXPIRED_TESTER_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * creationProcedure — use for any mutation that creates, generates, or modifies
 * content. Expired tester accounts receive a clear upgrade prompt.
 */
export const creationProcedure = t.procedure.use(blockExpiredTester);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

const requireDesigner = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  const { getDesignerProfileByUserId } = await import("../db");
  const profile = await getDesignerProfileByUserId(ctx.user.id);
  if (!profile || profile.membershipStatus !== "active") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "An active Designer membership is required. Complete Designer registration first.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      designerProfile: {
        id: profile.id,
        userId: profile.userId,
      },
    },
  });
});

/** Protected procedure that also requires an active designer membership. */
export const designerProcedure = t.procedure.use(requireDesigner);
