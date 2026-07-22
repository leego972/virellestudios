import { logger } from "./logger";
import { Sentry } from "./sentry.js";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkRateLimitAsync } from "./rateLimitRedis";
import { swappysRateLimitSubject, validateSwappysImageDataUrl } from "./swappysValidation";
import {
  assertSwappysCreativePolicy,
  swappysCreativePromptDirective,
  type SwappysContentMode,
} from "./swappysPolicy";
import {
  assertAdultWorkspaceAccess,
  screenContentRequest,
} from "./complianceArchive";
import {
  getUserPortal,
  isDesignerAllowedProtectedPath,
  isStudioForbiddenDesignerPath,
} from "./portalAccess";

const EXPIRED_TESTER_ERR_MSG =
  "Your 48-hour trial has ended. Your projects and downloads are still available — upgrade to a paid plan to continue creating.";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isSqlError = error.message?.includes("Failed query") ||
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
export const mergeRouters = t.mergeRouters;

/** Public Swappys mobile guard: decoded media validation and distributed throttling. */
const guardPublicSwappys = t.middleware(async (opts) => {
  if (opts.path !== "vfxSfx.swappysMobileSwap") return opts.next();

  const raw = await opts.getRawInput();
  const input = (raw as any)?.json ?? raw;
  if (!input || typeof input.sourceImageBase64 !== "string" || typeof input.targetImageBase64 !== "string") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Two valid images are required." });
  }
  if (input.consentConfirmed !== true) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Explicit likeness consent is required." });
  }

  const userId = opts.ctx.user?.id ?? null;
  const subject = swappysRateLimitSubject(userId, opts.ctx.req.ip);
  await checkRateLimitAsync(
    subject,
    userId ? "swappys-authenticated" : "swappys-anonymous",
    userId ? 12 : 3,
    60 * 60 * 1000,
  );

  const [source, target] = await Promise.all([
    validateSwappysImageDataUrl(input.sourceImageBase64, "source"),
    validateSwappysImageDataUrl(input.targetImageBase64, "target"),
  ]);

  logger.info("[SwappysGuard] validated transformation request", {
    userId: userId ?? "anonymous",
    source: `${source.width}x${source.height}:${source.sha256.slice(0, 12)}`,
    target: `${target.width}x${target.height}:${target.sha256.slice(0, 12)}`,
  });

  return opts.next();
});

export const publicProcedure = t.procedure.use(guardPublicSwappys);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if ((ctx.user as any).isFrozen) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: (ctx.user as any).frozenReason || "This account has been deactivated.",
    });
  }

  const portal = await getUserPortal(ctx.user.id, ctx.user.role);
  if (portal === "designer" && !isDesignerAllowedProtectedPath(opts.path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This designer account can access the designer portal only.",
    });
  }
  if (portal === "studio" && isStudioForbiddenDesignerPath(opts.path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Designer portal access requires a separate designer account.",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function hasUsableBroadcastBridge(): boolean {
  const rawUrl = process.env.BROADCAST_BRIDGE_URL?.trim();
  const token = process.env.BROADCAST_BRIDGE_TOKEN?.trim() || "";
  if (!rawUrl || token.length < 24) return false;
  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/**
 * Virelle Studio Swappys guard. Adult access is a separate approved workspace,
 * while standard age-appropriate non-sexual film scenes remain available.
 * A blocked request creates a review incident; it does not deactivate the user.
 */
const guardStudioSwappys = t.middleware(async (opts) => {
  if (opts.path === "virelleBroadcastRender.createBroadcastSession" && !hasUsableBroadcastBridge()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "BROADCAST_BRIDGE_NOT_CONFIGURED: Live broadcasting is unavailable until BROADCAST_BRIDGE_URL and BROADCAST_BRIDGE_TOKEN are configured in Render. No credits were charged.",
    });
  }

  const studioPath = opts.path === "vfxSfx.createStudioVfxJob"
    || opts.path === "vfxSfx.createSwappysDigitalDoubleJob";
  if (!studioPath) return opts.next();
  if (!opts.ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });

  const raw = await opts.getRawInput();
  const input = ((raw as any)?.json ?? raw) as Record<string, any> | null;
  if (!input) throw new TRPCError({ code: "BAD_REQUEST", message: "Swappys job input is missing." });

  const operations = Array.isArray(input.operations) ? input.operations.map(String) : [];
  const isSwappys = opts.path.endsWith("createSwappysDigitalDoubleJob")
    || input.transformGoal !== "appearance_reference"
    || operations.some((operation) =>
      /swappys|face-replacement|actor-continuity|pickup-scene|stunt|age-transform|gender-transform|childhood-self/i.test(operation),
    );
  if (!isSwappys) return opts.next();

  const contentMode: SwappysContentMode = input.contentMode === "open_adult"
    || operations.includes("open-adult-creative-mode")
    ? "open_adult"
    : "standard";
  const allSubjectsAdultsConfirmed = input.allSubjectsAdultsConfirmed === true
    || operations.includes("all-subjects-adults-confirmed");

  if (contentMode === "open_adult") {
    await assertAdultWorkspaceAccess(opts.ctx.user.id);
  }

  await screenContentRequest({
    userId: opts.ctx.user.id,
    workspace: contentMode === "open_adult" ? "adult" : "standard",
    sourceType: opts.path,
    sourceId: input.sceneId || input.projectId || null,
    text: [input.targetPresentation, input.directorNotes, input.instructions, input.consentNotes]
      .filter(Boolean)
      .join("\n"),
    targetAge: typeof input.targetAge === "number" ? input.targetAge : null,
    allSubjectsAdultsConfirmed,
    consentConfirmed: input.consentConfirmed === true,
    publicFigureLikeness: input.publicFigureLikeness === true,
    aiGeneratedCharactersOnly: input.aiGeneratedCharactersOnly === true,
  });

  assertSwappysCreativePolicy({
    user: opts.ctx.user,
    contentMode,
    consentConfirmed: input.consentConfirmed === true,
    allSubjectsAdultsConfirmed,
    transformGoal: input.transformGoal,
    targetAge: typeof input.targetAge === "number" ? input.targetAge : null,
    targetPresentation: input.targetPresentation,
    directorNotes: input.directorNotes ?? input.instructions,
    consentNotes: input.consentNotes,
    broadcast: false,
  });

  await checkRateLimitAsync(opts.ctx.user.id, "swappys-studio", 30, 60 * 60 * 1000);

  const directive = swappysCreativePromptDirective(contentMode);
  if (opts.path.endsWith("createSwappysDigitalDoubleJob")) {
    input.instructions = `${directive}\n${String(input.instructions || "")}`.trim().slice(0, 4000);
  } else {
    input.directorNotes = `${directive}\n${String(input.directorNotes || "")}`.trim().slice(0, 4000);
    if (contentMode === "open_adult") {
      input.operations = Array.from(new Set([
        ...operations,
        "open-adult-creative-mode",
        "all-subjects-adults-confirmed",
      ])).slice(0, 32);
    }
  }

  logger.info("[SwappysStudio] policy accepted", {
    userId: opts.ctx.user.id,
    contentMode,
    transformGoal: input.transformGoal || "appearance_reference",
  });
  return opts.next();
});

/** Standard protected procedure — allows expired testers in read-only mode. */
export const protectedProcedure = t.procedure.use(requireUser).use(guardStudioSwappys);

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

export const creationProcedure = protectedProcedure.use(blockExpiredTester);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

const requireDesigner = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  if ((ctx.user as any).isFrozen) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This account has been deactivated." });
  }
  const portal = await getUserPortal(ctx.user.id, ctx.user.role);
  if (portal !== "designer" && portal !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A separate Designer Portal account is required.",
    });
  }
  const { getDb } = await import("../db");
  const dbConn = await getDb();
  if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const { sql } = await import("drizzle-orm");
  const rows: any = await dbConn.execute(
    sql`SELECT id, userId FROM designerProfiles WHERE userId = ${ctx.user.id} LIMIT 1`,
  );
  const profile = (Array.isArray(rows[0]) ? rows[0] : rows)[0] ?? null;
  if (!profile) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "An active Designer membership is required. Join via the Wardrobe Marketplace.",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      designerProfile: { id: profile.id as number, userId: profile.userId as number },
    },
  });
});

export const designerProcedure = t.procedure.use(requireDesigner);
