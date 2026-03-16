import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, creationProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { generateNanoBananaImage, isNanoBananaAvailable } from "./_core/nanoBananaGeneration";
import { generateVideo, generateVideoWithFallback, buildVideoPrompt } from "./_core/videoGeneration";
import { generateUnifiedVideo, generateScenesParallel, buildUnifiedVideoPrompt, getAvailableProviders } from "./_core/unifiedVideoEngine";
import { generateVideo as generateBYOKVideo, VIDEO_PROVIDERS, validateApiKey, type UserApiKeys, type VideoProvider } from "./_core/byokVideoEngine";
import { nanoid } from "nanoid";
import { processDirectorMessage } from "./directorAssistant";
import { transcribeAudio } from "./_core/voiceTranscription";
import { TRPCError } from "@trpc/server";
import { buildVisualDNA, buildScenePrompt, buildSceneBreakdownSystemPrompt, buildTrailerPrompt, ENHANCED_SCENE_SCHEMA, type QualityTier } from "./_core/cinematicPromptEngine";
import bcrypt from "bcryptjs";
import { rateLimitAI, rateLimitHeavyAI, rateLimitUpload } from "./_core/rateLimit";
import { sanitizeText } from "./_core/sanitize";
import {
  checkRegistrationFraud,
  trackLoginAttempt,
  trackGeneration,
  logAuditEvent,
  encryptApiKey,
  decryptApiKey,
  getSecurityEvents,
  getFlaggedUsers,
  getAuditLog,
  getSecurityStats,
  unflagUser,
  lockUser,
  trackPaymentFailure,
} from "./_core/securityEngine";
import { logger } from "./_core/logger";
import { createSessionToken } from "./_core/context";
import { notifyOwner } from "./_core/notification";
import { getEffectiveTier, getUserLimits, requireFeature, requireGenerationQuota, requireResourceQuota, getOrCreateStripeCustomer, createCheckoutSession, createBillingPortalSession, TIER_LIMITS, CREDIT_COSTS, getVideoCredits, type SubscriptionTier } from "./_core/subscription";
import { AD_PLATFORMS, generateAdContent, generateCampaignContent, createCampaign, getCampaign, listCampaigns, updateCampaignStatus, deleteCampaign, addPostRecord, getPlatformsByCategory, getRecommendedPlatforms, getSchedulerState, runAutonomousAdCycle, generateImageAd, generateVideoAd, type AdContentType, type AdCampaign } from "./_core/advertisingEngine";
import { getSocialCredentialStatus, postToLinkedIn, postToReddit, sendWhatsAppMessage, broadcastWhatsApp } from "./_core/socialPostingEngine";
import { ENV } from "./_core/env";
import { seoRouter } from "./seo-router";
import { autonomousRouter } from "./autonomous-router";
import { marketingRouter } from "./marketing-router";
import { contentCreatorRouter } from "./content-creator-router";
import { advertisingRouter } from "./advertising-router";
import { generateBlogArticle, startBlogScheduler, type GeneratedArticle } from "./_core/blogEngine";
import { generateFullFilm, generateSingleScene, estimateFilmCost, type FilmGenerationProgress } from "./_core/filmPipeline";
import { generateSceneDialogue, TTS_PROVIDERS, type VoiceActingKeys } from "./_core/voiceActingEngine";
import { generateSoundtrack, MUSIC_PROVIDERS, type SoundtrackKeys } from "./_core/soundtrackEngine";
import { scanContent, handleModerationViolation } from "./_core/contentModerationEngine";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email().max(320),
        password: z.string().min(8).max(128),
        name: z.string().min(1).max(255),
        referralCode: z.string().optional(),
        promoCode: z.string().optional(),
        // Profile & Business
        phone: z.string().max(32).optional(),
        companyName: z.string().max(255).optional(),
        companyWebsite: z.string().max(512).optional(),
        jobTitle: z.string().max(255).optional(),
        professionalRole: z.string().max(128).optional(),
        experienceLevel: z.string().max(32).optional(),
        industryType: z.string().max(128).optional(),
        teamSize: z.string().max(32).optional(),
        // Creative
        preferredGenres: z.array(z.string()).optional(),
        primaryUseCase: z.string().max(128).optional(),
        portfolioUrl: z.string().max(512).optional(),
        howDidYouHear: z.string().max(128).optional(),
        marketingOptIn: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Security: Fraud detection on registration
        const clientIP = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
        const fraudCheck = checkRegistrationFraud(clientIP, input.email);
        if (!fraudCheck.allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: fraudCheck.reason || "Registration blocked" });
        }
        logAuditEvent(0, "register_attempt", clientIP, true, { email: input.email });

        // Check if user already exists
        const existing = await db.getUserByEmail(input.email.toLowerCase());
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
        }
        // Hash password and create user
        const passwordHash = await bcrypt.hash(input.password, 12);
        const user = await db.createEmailUser({
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
          phone: input.phone,
          companyName: input.companyName,
          companyWebsite: input.companyWebsite,
          jobTitle: input.jobTitle,
          professionalRole: input.professionalRole,
          experienceLevel: input.experienceLevel,
          industryType: input.industryType,
          teamSize: input.teamSize,
          preferredGenres: input.preferredGenres,
          primaryUseCase: input.primaryUseCase,
          portfolioUrl: input.portfolioUrl,
          howDidYouHear: input.howDidYouHear,
          marketingOptIn: input.marketingOptIn,
        });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account" });

        // Process referral code if provided
        if (input.referralCode) {
          try {
            const refCode = await db.getReferralCodeByCode(input.referralCode);
            if (refCode && refCode.isActive && refCode.userId !== user.id) {
              const existingRef = await db.getReferralTrackingByReferredUser(user.id);
              if (!existingRef) {
                const REFERRER_REWARD = 7000;
                const NEW_USER_REWARD = 7000;
                await db.createReferralTracking({
                  referralCodeId: refCode.id,
                  referrerId: refCode.userId,
                  referredUserId: user.id,
                  referredEmail: user.email,
                  status: "rewarded",
                  rewardType: "bonus_generations",
                  rewardAmount: REFERRER_REWARD,
                  rewardedAt: new Date(),
                });
                await db.updateReferralCode(refCode.id, {
                  successfulReferrals: (refCode.successfulReferrals || 0) + 1,
                  bonusGenerationsEarned: (refCode.bonusGenerationsEarned || 0) + REFERRER_REWARD,
                });
                await db.addBonusGenerations(refCode.userId, REFERRER_REWARD);
                await db.addBonusGenerations(user.id, NEW_USER_REWARD);
              }
            }
          } catch (err) {
            // Don't fail registration if referral processing fails
             console.error("Referral processing error:", err);
          }
        }
        // Create session
        const token = await createSessionToken(user.id, user.name ?? "");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 });

        // Apply promo code if provided (stores on user for auto-apply at checkout)
        if (input.promoCode) {
          try {
            const promoValidation = await db.validatePromoCode(input.promoCode.trim().toUpperCase());
            if (promoValidation.valid) {
              await db.applyPromoCodeToUser(user.id, input.promoCode.trim().toUpperCase());
            }
          } catch (err) {
            console.error("Promo code application error:", err);
          }
        }
        // Auto-create referral code for new user (so it's ready to share immediately)
        try {
          const existingCode = await db.getReferralCodeByUserId(user.id);
          if (!existingCode) {
            const newCode = `VS${user.id}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            await db.createReferralCode({ userId: user.id, code: newCode, isActive: true });
          }
        } catch (err) {
          console.error("Auto-create referral code error:", err);
        }
        // Send welcome notification
        try {
          await db.createNotification({
            userId: user.id,
            type: "welcome",
            title: "Welcome to Vir\u00c9lle Studios!",
            message: "Your account is ready. Start by creating your first project or explore Quick Generate to make an AI film in minutes.",
            link: "/",
          });
        } catch (_) { /* non-critical */ }
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),
    login: publicProcedure
      .input(z.object({
        email: z.string().email().max(320),
        password: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const clientIP = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
        let user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user || !user.passwordHash) {
          logAuditEvent(0, "login_failed_no_user", clientIP, false, { email: input.email });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        // Admin accounts bypass brute-force lockout
        const adminEmailsList = [(ENV.adminEmail || "leego972@gmail.com").toLowerCase(), "brobroplzcheck@gmail.com"];
        const isAdminAccount = adminEmailsList.includes(user.email?.toLowerCase() || "");
        if (!isAdminAccount) {
          // Security: Check for brute force / lockout before password check
          const loginPreCheck = trackLoginAttempt(user.id, clientIP, false);
          if (!loginPreCheck.allowed) {
            logAuditEvent(user.id, "login_blocked_lockout", clientIP, false);
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: loginPreCheck.reason || "Account locked" });
          }
        } else {
          // For admin accounts, still track but never block
          unflagUser(user.id);
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          logAuditEvent(user.id, "login_failed_wrong_password", clientIP, false);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
        }

        // Mark login as successful
        trackLoginAttempt(user.id, clientIP, true);
        logAuditEvent(user.id, "login_success", clientIP, true);
        // Auto-promote admin account if not already admin
        const adminEmails = [(ENV.adminEmail || "leego972@gmail.com").toLowerCase(), "brobroplzcheck@gmail.com"];
        const isAdminEmail = adminEmails.includes(user.email?.toLowerCase() || "");
        if (isAdminEmail && user.role !== "admin") {
          await db.updateUserRole(user.id, "admin");
          user = { ...user, role: "admin" } as typeof user;
        }
        // Update last signed in
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        // Start 48-hour expiry clock on first login for temporary tester accounts
        await db.setFirstLoginExpiry(user.id, user.openId);
        // Create session
        const token = await createSessionToken(user.id, user.name ?? "");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email().max(320), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user) {
          // Don't reveal if email exists
          return { success: true, message: "If an account with that email exists, a reset link has been sent." };
        }
        const token = nanoid(64);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await db.createPasswordResetToken(user.id, token, expiresAt);
        // Send password reset email via Gmail SMTP
        const { sendPasswordResetEmail } = await import("./email");
        const sent = await sendPasswordResetEmail(user.email!, token, input.origin);
        if (!sent) {
          console.error("Failed to send password reset email to", user.email);
        }
        return { success: true, message: "If an account with that email exists, a reset link has been sent." };
      }),
    validateResetToken: publicProcedure
      .input(z.object({ token: z.string().min(1) }))
      .query(async ({ input }) => {
        const record = await db.getPasswordResetToken(input.token);
        if (!record || record.used || new Date() > record.expiresAt) {
          return { valid: false };
        }
        return { valid: true };
      }),
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ input }) => {
        const record = await db.getPasswordResetToken(input.token);
        if (!record || record.used || new Date() > record.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(record.userId, passwordHash);
        await db.markTokenUsed(record.id);
        return { success: true };
      }),
  }),

  // ─── Admin ───
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    assignBetaTier: adminProcedure
      .input(z.object({
        userId: z.number(),
        expiresInDays: z.number().min(1).max(365).default(90),
      }))
      .mutation(async ({ input }) => {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
        await db.assignBetaTier(input.userId, expiresAt);
        await db.addCredits(input.userId, 5000, "beta_welcome", "Beta tester welcome credits — 5,000 credits included");
        return { success: true, expiresAt };
      }),
    revokeBetaTier: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.revokeBetaTier(input.userId);
        return { success: true };
      }),
    grantCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().min(1).max(100000),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.addCredits(input.userId, input.amount, "admin_grant", input.reason || "Admin credit grant");
        return { success: true };
      }),
  }),

  // ─── Projects ───
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const projects = await db.getUserProjects(ctx.user.id);
      // Auto-populate thumbnailUrl from first scene if project has no thumbnail
      const projectsWithoutThumbnail = projects.filter((p: any) => !p.thumbnailUrl);
      if (projectsWithoutThumbnail.length > 0) {
        await Promise.allSettled(projectsWithoutThumbnail.map(async (p: any) => {
          try {
            const scenes = await db.getProjectScenes(p.id);
            const sceneWithThumb = scenes.find((s: any) => s.thumbnailUrl);
            if (sceneWithThumb?.thumbnailUrl) {
              p.thumbnailUrl = sceneWithThumb.thumbnailUrl;
              // Persist it so we don't have to look it up again
              await db.updateProject(p.id, ctx.user.id, { thumbnailUrl: sceneWithThumb.thumbnailUrl });
            }
          } catch (e) {
            // Ignore errors — just show placeholder
          }
        }));
      }
      return projects;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getProjectById(input.id, ctx.user.id);
      }),

    create: creationProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        mode: z.enum(["quick", "manual", "trailer"]),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(360).optional(),
        genre: z.string().optional(),
        plotSummary: z.string().optional(),
        resolution: z.string().optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        // Story & Narrative
        mainPlot: z.string().optional(),
        sidePlots: z.string().optional(),
        plotTwists: z.string().optional(),
        characterArcs: z.string().optional(),
        themes: z.string().optional(),
        setting: z.string().optional(),
        actStructure: z.string().optional(),
        tone: z.string().optional(),
        targetAudience: z.string().optional(),
        openingScene: z.string().optional(),
        climax: z.string().optional(),
        storyResolution: z.string().optional(),
        cinemaIndustry: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Credits: deduct for creating a project
        // create_project is FREE — no credit deduction (zero friction on project creation)
        // Subscription: check project quota
        const projectCount = await db.getUserProjectCount(ctx.user.id);
        requireResourceQuota(ctx.user, "maxProjects", projectCount, "projects");

        // Subscription: check duration limit
        const limits = getUserLimits(ctx.user);
        if (input.duration && input.duration > limits.maxDurationMinutes) {
          const tier = getEffectiveTier(ctx.user);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `SUBSCRIPTION_REQUIRED: Maximum movie duration on the ${tier} plan is ${limits.maxDurationMinutes} minutes. Please upgrade for longer films.`,
          });
        }
        const sanitized = {
          ...input,
          title: sanitizeText(input.title),
          description: input.description ? sanitizeText(input.description) : undefined,
          plotSummary: input.plotSummary ? sanitizeText(input.plotSummary) : undefined,
          mainPlot: input.mainPlot ? sanitizeText(input.mainPlot) : undefined,
          userId: ctx.user.id,
        };
        logger.info("Project created", { userId: ctx.user.id, title: sanitized.title });
        return db.createProject(sanitized as any);
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(180).optional(),
        genre: z.string().optional(),
        plotSummary: z.string().optional(),
        status: z.enum(["draft", "generating", "paused", "completed", "failed"]).optional(),
        thumbnailUrl: z.string().optional(),
        resolution: z.string().optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        colorGrading: z.string().optional(),
        colorGradingSettings: z.any().optional(),
        // Story & Narrative
        mainPlot: z.string().optional(),
        sidePlots: z.string().optional(),
        plotTwists: z.string().optional(),
        characterArcs: z.string().optional(),
        themes: z.string().optional(),
        setting: z.string().optional(),
        actStructure: z.string().optional(),
        tone: z.string().optional(),
        targetAudience: z.string().optional(),
        openingScene: z.string().optional(),
        climax: z.string().optional(),
        storyResolution: z.string().optional(),
        cinemaIndustry: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, ctx.user.id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),
    // Admin only: list all projects across all users
    adminListAll: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().default(0),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const limit = input?.limit ?? 100;
        const offset = input?.offset ?? 0;
        const search = input?.search ? `%${input.search}%` : null;
        let query: string;
        if (search) {
          query = `SELECT p.id, p.title, p.genre, p.status, p.quality, p.createdAt,
                     u.id as userId, u.name as userName, u.email as userEmail,
                     (SELECT COUNT(*) FROM scenes s WHERE s.projectId = p.id) as sceneCount,
                     (SELECT COUNT(*) FROM scenes s WHERE s.projectId = p.id AND s.videoUrl IS NOT NULL) as completedScenes
              FROM projects p LEFT JOIN users u ON p.userId = u.id
              WHERE p.title LIKE ? OR u.email LIKE ?
              ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`;
          const [rows] = await (dbConn as any).execute(query, [search, search, limit, offset]);
          return rows as any[];
        } else {
          query = `SELECT p.id, p.title, p.genre, p.status, p.quality, p.createdAt,
                     u.id as userId, u.name as userName, u.email as userEmail,
                     (SELECT COUNT(*) FROM scenes s WHERE s.projectId = p.id) as sceneCount,
                     (SELECT COUNT(*) FROM scenes s WHERE s.projectId = p.id AND s.videoUrl IS NOT NULL) as completedScenes
              FROM projects p LEFT JOIN users u ON p.userId = u.id
              ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`;
          const [rows] = await (dbConn as any).execute(query, [limit, offset]);
          return rows as any[];
        }
      }),
    // Admin only: force-delete any project by ID regardless of owner
    adminDelete: adminProcedure
      .input(z.object({
        id: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await dbConn.execute(sql`DELETE FROM scenes WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM characters WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM generation_jobs WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM scripts WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM soundtracks WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM credits WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM locations WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM mood_board_items WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM subtitles WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM dialogues WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM budgets WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM sound_effects WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM collaborators WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM visual_effects WHERE projectId = ${input.id}`);
        await dbConn.execute(sql`DELETE FROM projects WHERE id = ${input.id}`);
        return { success: true, deletedProjectId: input.id };
      }),
  }),
  // ─── Characters ────
  character: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLibraryCharacters(ctx.user.id);
    }),

    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectCharacters(input.projectId);
      }),

    listLibrary: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLibraryCharacters(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCharacterById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number().nullable().optional(),
        name: z.string().min(1).max(128),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        attributes: z.any().optional(),
        // Extended profile fields
        role: z.string().optional(),
        storyImportance: z.string().optional(),
        screenTime: z.string().optional(),
        nationality: z.string().optional(),
        countryOfOrigin: z.string().optional(),
        cityOfOrigin: z.string().optional(),
        dateOfBirth: z.string().optional(),
        zodiacSign: z.string().optional(),
        occupation: z.string().optional(),
        educationLevel: z.string().optional(),
        socialClass: z.string().optional(),
        religion: z.string().optional(),
        languages: z.any().optional(),
        personality: z.any().optional(),
        arcType: z.string().optional(),
        moralAlignment: z.string().optional(),
        emotionalRange: z.any().optional(),
        backstory: z.string().optional(),
        motivations: z.string().optional(),
        fears: z.string().optional(),
        secrets: z.string().optional(),
        strengths: z.any().optional(),
        weaknesses: z.any().optional(),
        speechPattern: z.string().optional(),
        accent: z.string().optional(),
        catchphrase: z.string().optional(),
        voiceType: z.string().optional(),
        voiceId: z.string().optional(),
        relationships: z.any().optional(),
        environmentPreference: z.string().optional(),
        preferredWeather: z.string().optional(),
        preferredSeason: z.string().optional(),
        preferredTimeOfDay: z.string().optional(),
        physicalAbilities: z.any().optional(),
        mentalAbilities: z.any().optional(),
        specialSkills: z.any().optional(),
        wardrobe: z.any().optional(),
        performanceStyle: z.string().optional(),
        castingNotes: z.string().optional(),
        signatureMannerisms: z.string().optional(),
        voiceDescription: z.string().optional(),
        isAiActor: z.boolean().optional(),
        aiActorId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Content moderation scan
        const scanText = [input.name, input.description, input.backstory, input.motivations].filter(Boolean).join(' ');
        if (scanText.trim()) {
          const modResult = scanContent(scanText);
          if (modResult.flagged) {
            await handleModerationViolation({
              userId: ctx.user.id,
              userEmail: ctx.user.email ?? '',
              userName: ctx.user.name ?? '',
              contentType: 'character_create',
              contentSnippet: scanText.substring(0, 500),
              scanResult: modResult,
            });
            if (modResult.shouldFreeze) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account has been suspended pending review. Please check your email.' });
            }
          }
        }
        return db.createCharacter({ ...input, userId: ctx.user.id });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(128).optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        attributes: z.any().optional(),
        // Extended profile fields
        role: z.string().optional(),
        storyImportance: z.string().optional(),
        screenTime: z.string().optional(),
        nationality: z.string().optional(),
        countryOfOrigin: z.string().optional(),
        cityOfOrigin: z.string().optional(),
        dateOfBirth: z.string().optional(),
        zodiacSign: z.string().optional(),
        occupation: z.string().optional(),
        educationLevel: z.string().optional(),
        socialClass: z.string().optional(),
        religion: z.string().optional(),
        languages: z.any().optional(),
        personality: z.any().optional(),
        arcType: z.string().optional(),
        moralAlignment: z.string().optional(),
        emotionalRange: z.any().optional(),
        backstory: z.string().optional(),
        motivations: z.string().optional(),
        fears: z.string().optional(),
        secrets: z.string().optional(),
        strengths: z.any().optional(),
        weaknesses: z.any().optional(),
        speechPattern: z.string().optional(),
        accent: z.string().optional(),
        catchphrase: z.string().optional(),
        voiceType: z.string().optional(),
        voiceId: z.string().optional(),
        relationships: z.any().optional(),
        environmentPreference: z.string().optional(),
        preferredWeather: z.string().optional(),
        preferredSeason: z.string().optional(),
        preferredTimeOfDay: z.string().optional(),
        physicalAbilities: z.any().optional(),
        mentalAbilities: z.any().optional(),
        specialSkills: z.any().optional(),
        wardrobe: z.any().optional(),
        performanceStyle: z.string().optional(),
        castingNotes: z.string().optional(),
        signatureMannerisms: z.string().optional(),
        voiceDescription: z.string().optional(),
        isAiActor: z.boolean().optional(),
        aiActorId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const char = await db.getCharacterById(input.id);
        if (!char || char.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
        const { id, ...data } = input;
        return db.updateCharacter(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const char = await db.getCharacterById(input.id);
        if (!char || char.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
        await db.deleteCharacter(input.id);
        return { success: true };
      }),

    // AI Character Generator — create photorealistic portrait from feature selections
    aiGenerate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        projectId: z.number().nullable().optional(),
        features: z.object({
          ageRange: z.string(), // "20s", "30s", "40s", etc.
          gender: z.string(),
          ethnicity: z.string(),
          skinTone: z.string().optional(),
          build: z.string().optional(), // slim, athletic, average, heavy
          height: z.string().optional(), // short, average, tall
          hairColor: z.string(),
          hairStyle: z.string(),
          eyeColor: z.string(),
          facialFeatures: z.string().optional(), // sharp jawline, round face, etc.
          facialHair: z.string().optional(),
          distinguishingMarks: z.string().optional(), // scars, tattoos, freckles
          clothingStyle: z.string().optional(),
          expression: z.string().optional(), // serious, warm, mysterious
          additionalNotes: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAICharacterGen", "AI Character Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.character_gen_ai.cost, "character_gen_ai", `AI character generation: ${input.name}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const f = input.features;
        const promptParts = [
          // Core photorealism anchor — this is the most critical part
          "RAW photograph, ultra-photorealistic Hollywood A-list actor headshot, absolutely indistinguishable from a real photograph of a real human being,",
          "captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lens at f/1.4, shallow cinematic depth of field with natural oval bokeh,",
          // Physical description
          `${f.gender} in their ${f.ageRange},`,
          `${f.ethnicity} ethnicity,`,
        ];
        if (f.skinTone) promptParts.push(`${f.skinTone} skin tone — skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers, visible pores, micro-wrinkles, fine peach fuzz hair on skin surface, natural blemishes and freckles, authentic facial asymmetry — no airbrushed or plastic skin,`);
        if (f.build) promptParts.push(`${f.build} build,`);
        if (f.height) promptParts.push(`${f.height} height,`);
        promptParts.push(`${f.hairColor} ${f.hairStyle} hair — individual strand detail visible, natural hair texture with flyaways and imperfections, realistic hair sheen,`);
        promptParts.push(`${f.eyeColor} eyes — hyper-realistic iris with detailed fiber structure, natural corneal reflections and specular highlights, subtle moisture in waterline, sclera with faint realistic veins, soulful and alive expression,`);
        if (f.facialFeatures) promptParts.push(`${f.facialFeatures},`);
        if (f.facialHair) promptParts.push(`facial hair: ${f.facialHair} with individual hair strand detail,`);
        if (f.distinguishingMarks) promptParts.push(`${f.distinguishingMarks},`);
        if (f.clothingStyle) promptParts.push(`wearing ${f.clothingStyle} — fabric texture and material weight visible,`);
        if (f.expression) promptParts.push(`${f.expression} expression with authentic micro-expressions and genuine emotion,`);
        if (f.additionalNotes) promptParts.push(f.additionalNotes);
        promptParts.push(
          // Lighting — Hollywood three-point Rembrandt setup
          "three-point Rembrandt lighting: warm key light at 45 degrees creating a Rembrandt triangle on the face, soft fill light reducing shadow ratio to 2:1, subtle rim/hair light separating subject from background,",
          "volumetric atmospheric light with physically accurate inverse-square falloff,",
          // Skin and face realism
          "skin pores visible under magnification, micro-wrinkles around eyes and mouth, natural skin oil and moisture, capillaries visible in sclera,",
          "authentic facial bone structure with natural asymmetry — no perfect symmetry, no uncanny valley,",
          // Technical quality
          "Kodak Vision3 500T film stock color science with organic grain structure and natural highlight rolloff,",
          "8K resolution, hyperdetailed, Academy Award-winning portrait photography,",
          // Negative guidance embedded in prompt
          "NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-looking, NOT plastic skin, NOT doll-like, NOT overly smooth — a REAL PHOTOGRAPH of a REAL PERSON"
        );

        const result = await generateImage({ prompt: promptParts.join(" ") });

        // Save to character library
        const character = await db.createCharacter({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          name: input.name,
          description: `AI-generated character: ${f.gender}, ${f.ageRange}, ${f.ethnicity}`,
          photoUrl: result.url,
          attributes: { ...f, aiGenerated: true },
        });

        return character;
      }),

    // AI Character Generator from Photo — analyze a reference photo and create a cinematic character portrait
    aiGenerateFromPhoto: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        projectId: z.number().nullable().optional(),
        photoBase64: z.string().max(14_000_000, "File too large. Max 10MB."), // base64 encoded reference photo
        photoMimeType: z.string().default("image/jpeg"),
        characterRole: z.string().optional(), // hero, villain, mentor, etc.
        style: z.string().optional(), // cinematic, noir, sci-fi, fantasy, etc.
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAICharacterGen", "AI Character Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.character_gen_ai.cost, "character_gen_ai", `AI character from photo: ${input.name}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        // Step 1: Upload the reference photo to S3
        const photoBuffer = Buffer.from(input.photoBase64, "base64");
        const photoKey = `uploads/${ctx.user.id}/ref-${nanoid()}.jpg`;
        const { url: refPhotoUrl } = await storagePut(photoKey, photoBuffer, input.photoMimeType);

        // Step 2: Use LLM with vision to analyze the photo and extract detailed features
        const analysisResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert casting director and character designer for a Hollywood production studio. Analyze the provided reference photo in extreme detail. Extract every physical characteristic you can observe. Be precise and specific — your description will be used to recreate this person as a movie character.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${input.photoMimeType};base64,${input.photoBase64}` },
                },
                {
                  type: "text",
                  text: `Analyze this person's appearance in detail for character recreation. Character name: ${input.name}. ${input.characterRole ? `Role: ${input.characterRole}.` : ""} ${input.additionalNotes ? `Notes: ${input.additionalNotes}` : ""}\n\nProvide your analysis as JSON.`,
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "character_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  estimatedAge: { type: "string" },
                  gender: { type: "string" },
                  ethnicity: { type: "string" },
                  skinTone: { type: "string" },
                  build: { type: "string" },
                  hairColor: { type: "string" },
                  hairStyle: { type: "string" },
                  hairLength: { type: "string" },
                  eyeColor: { type: "string" },
                  eyeShape: { type: "string" },
                  faceShape: { type: "string" },
                  noseType: { type: "string" },
                  lipShape: { type: "string" },
                  facialHair: { type: "string" },
                  distinguishingFeatures: { type: "string" },
                  clothing: { type: "string" },
                  expression: { type: "string" },
                  overallVibe: { type: "string" },
                  detailedDescription: { type: "string" },
                },
                required: ["estimatedAge", "gender", "ethnicity", "skinTone", "build", "hairColor", "hairStyle", "hairLength", "eyeColor", "eyeShape", "faceShape", "noseType", "lipShape", "facialHair", "distinguishingFeatures", "clothing", "expression", "overallVibe", "detailedDescription"],
                additionalProperties: false,
              },
            },
          },
        });

        let analysis: any = {};
        try {
          const rawContent = analysisResult.choices?.[0]?.message?.content;
          const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
          analysis = JSON.parse(content);
        } catch {
          analysis = { detailedDescription: "Character from reference photo" };
        }

        // Step 3: Build a rich prompt for image generation using the analysis + reference photo
        const style = input.style || "cinematic";
        // All styles are photorealistic — the style changes the lighting/mood, not the realism level
        const photorealismBase = "RAW photograph, absolutely indistinguishable from a real photograph of a real human being, captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lens, skin with perfect subsurface scattering, visible pores and micro-wrinkles, hyper-realistic eyes with detailed iris fibers and corneal reflections, authentic facial asymmetry, Kodak Vision3 500T film stock color science, 8K resolution, NOT CGI, NOT illustration, NOT AI-looking";
        const styleMap: Record<string, string> = {
          cinematic: `${photorealismBase}, three-point Rembrandt lighting, shallow depth of field f/1.4, cinematic color grading, volumetric atmospheric light, Hollywood movie character portrait`,
          noir: `${photorealismBase}, dramatic high-contrast lighting with deep shadows, venetian blind light patterns casting bars across the face, desaturated with selective warm practical light, 1940s Hollywood noir aesthetic`,
          "sci-fi": `${photorealismBase}, holographic rim lighting casting colored shadows, neon accent lights reflecting off skin, cyberpunk color palette with cyan and magenta, futuristic environment reflections in eyes`,
          fantasy: `${photorealismBase}, ethereal magical golden-hour backlight, rich detailed costume and armor with physically-based material rendering, mystical atmospheric haze, epic scale environment in background`,
          horror: `${photorealismBase}, extreme low-key lighting with single harsh source creating deep impenetrable shadows, underlighting for menace, pale sickly complexion with visible veins, desaturated with selective red accents`,
          comedy: `${photorealismBase}, bright warm high-key lighting, cheerful 5600K color temperature, natural relaxed expression with genuine smile, inviting and charismatic presence, vibrant saturated background`,
          period: `${photorealismBase}, classical old-master painting-inspired lighting with warm candlelight tones, historically accurate styling and costume, rich fabric textures, golden hour warmth`,
          action: `${photorealismBase}, dramatic hard backlighting with anamorphic lens flare, intense determined expression, grit and sweat on skin, high contrast cinematic grading, dust particles in air`,
        };
        const stylePrompt = styleMap[style] || styleMap.cinematic;

        const promptParts = [
          stylePrompt + ",",
          `Recreate this exact person as a movie character named ${input.name},`,
          `${analysis.gender || "person"} appearing ${analysis.estimatedAge || "adult"},`,
          `${analysis.ethnicity || ""} with ${analysis.skinTone || "natural"} skin tone,`,
          `${analysis.build || "average"} build,`,
          `${analysis.hairColor || ""} ${analysis.hairStyle || ""} ${analysis.hairLength || ""} hair,`,
          `${analysis.eyeColor || ""} ${analysis.eyeShape || ""} eyes,`,
          `${analysis.faceShape || ""} face shape, ${analysis.noseType || ""} nose, ${analysis.lipShape || ""} lips,`,
        ];
        if (analysis.facialHair && analysis.facialHair !== "none" && analysis.facialHair !== "None") {
          promptParts.push(`facial hair: ${analysis.facialHair},`);
        }
        if (analysis.distinguishingFeatures && analysis.distinguishingFeatures !== "none") {
          promptParts.push(`distinguishing features: ${analysis.distinguishingFeatures},`);
        }
        if (input.characterRole) {
          promptParts.push(`character archetype: ${input.characterRole},`);
        }
        promptParts.push(
          `${analysis.expression || "confident"} expression with authentic micro-expressions and genuine emotion,`,
          `overall presence: ${analysis.overallVibe || "commanding"},`,
          // Deep skin realism
          "skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers, visible pores and micro-wrinkles, fine peach fuzz on skin surface, natural blemishes, authentic facial asymmetry,",
          // Eye realism
          "eyes with hyper-realistic iris fiber structure, natural corneal reflections, subtle moisture in waterline, sclera with faint realistic veins — eyes that look alive and soulful,",
          // Hair realism
          "individual hair strand detail, natural hair texture with flyaways and imperfections, realistic hair sheen and weight,",
          // Technical
          "8K resolution, hyperdetailed, Academy Award-winning portrait photography,",
          "NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-looking, NOT plastic skin — a REAL PHOTOGRAPH of a REAL PERSON"
        );

        // Step 4: Generate the character image using the reference photo
        const result = await generateImage({
          prompt: promptParts.join(" "),
          originalImages: [{
            url: refPhotoUrl,
            mimeType: input.photoMimeType,
          }],
        });

        // Step 5: Save the character with all extracted attributes
        const character = await db.createCharacter({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          name: input.name,
          description: analysis.detailedDescription || `Character created from reference photo — ${analysis.gender}, ${analysis.estimatedAge}, ${analysis.ethnicity}`,
          photoUrl: result.url,
          attributes: {
            ...analysis,
            referencePhotoUrl: refPhotoUrl,
            characterRole: input.characterRole,
            style,
            aiGenerated: true,
            generatedFromPhoto: true,
          },
        });

        return character;
      }),
  }),

  // ─── Scenes ───
  scene: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectScenes(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSceneById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        orderIndex: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        // Atmosphere
        timeOfDay: z.string().optional(),
        weather: z.string().optional(),
        season: z.string().optional(),
        lighting: z.string().optional(),
        mood: z.string().optional(),
        emotionalBeat: z.string().optional(),
        // Camera & Optics
        cameraAngle: z.string().optional(),
        cameraMovement: z.string().optional(),
        lensType: z.string().optional(),
        focalLength: z.string().optional(),
        depthOfField: z.string().optional(),
        shotType: z.string().optional(),
        frameRate: z.string().optional(),
        aspectRatio: z.string().optional(),
        // Color
        colorGrading: z.string().optional(),
        colorPalette: z.string().optional(),
        colorTemperature: z.string().optional(),
        // Location
        locationType: z.string().optional(),
        realEstateStyle: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        locationDetail: z.string().optional(),
        vehicleType: z.string().optional(),
        // Composition
        foregroundElements: z.string().optional(),
        backgroundElements: z.string().optional(),
        characterBlocking: z.string().optional(),
        actionDescription: z.string().optional(),
        crowdLevel: z.string().optional(),
        // Characters
        characterIds: z.array(z.number()).optional(),
        characterPositions: z.any().optional(),
        // Dialogue
        dialogueText: z.string().optional(),
        dialogueLines: z.any().optional(),
        subtitleText: z.string().optional(),
        // Sound
        ambientSound: z.string().optional(),
        sfxNotes: z.string().optional(),
        musicMood: z.string().optional(),
        musicTempo: z.string().optional(),
        soundtrackId: z.number().nullable().optional(),
        soundtrackVolume: z.number().min(0).max(100).optional(),
        // VFX & Production
        vfxNotes: z.string().optional(),
        visualEffects: z.any().optional(),
        props: z.any().optional(),
        wardrobe: z.any().optional(),
        makeupNotes: z.string().optional(),
        stuntNotes: z.string().optional(),
        productionNotes: z.string().optional(),
        sfxProductionNotes: z.string().optional(),
        budgetEstimate: z.number().optional(),
        shootingDays: z.number().optional(),
        aiPromptOverride: z.string().optional(),
        // Timing
        duration: z.number().min(1).max(600).optional(),
        transitionType: z.string().optional(),
        transitionDuration: z.number().optional(),
        // Advanced camera & lens control
        cameraBody: z.string().optional(),
        lensBrand: z.string().optional(),
        aperture: z.string().optional(),
        // Multi-shot sequencing
        multiShotEnabled: z.boolean().optional(),
        multiShotCount: z.number().optional(),
        multiShotData: z.any().optional(),
        // Character staging & emotion
        characterEmotions: z.any().optional(),
        characterActions: z.any().optional(),
        // Genre motion & visual style
        genreMotion: z.string().optional(),
        speedRamp: z.string().optional(),
        visualStyle: z.string().optional(),
        // Retakes
        retakeInstructions: z.string().optional(),
        retakeRegion: z.any().optional(),
        retakeCount: z.number().optional(),
        // Lip sync
        lipSyncMode: z.string().optional(),
        lipSyncAudioUrl: z.string().optional(),
        // VFX suite
        vfxSuiteOperations: z.any().optional(),
        // Live action plate integration
        liveActionPlateUrl: z.string().optional(),
        liveActionCompositeMode: z.string().optional(),
        // External footage upload
        externalFootageUrl: z.string().optional(),
        externalFootageType: z.string().optional(),
        externalFootageLabel: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Content moderation scan on scene description and dialogue
        const scanText = [input.title, input.description, input.dialogueText, input.aiPromptOverride].filter(Boolean).join(' ');
        if (scanText.trim()) {
          const modResult = scanContent(scanText);
          if (modResult.flagged) {
            await handleModerationViolation({
              userId: ctx.user.id,
              userEmail: ctx.user.email ?? '',
              userName: ctx.user.name ?? '',
              contentType: 'scene_create',
              contentSnippet: scanText.substring(0, 500),
              scanResult: modResult,
            });
            if (modResult.shouldFreeze) {
              throw new TRPCError({ code: 'FORBIDDEN', message: 'Your account has been suspended pending review. Please check your email.' });
            }
          }
        }
        return db.createScene(input as any);
      }),
    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        orderIndex: z.number().optional(),
        // Atmosphere
        timeOfDay: z.string().optional(),
        weather: z.string().optional(),
        season: z.string().optional(),
        lighting: z.string().optional(),
        mood: z.string().optional(),
        emotionalBeat: z.string().optional(),
        // Camera & Optics
        cameraAngle: z.string().optional(),
        cameraMovement: z.string().optional(),
        lensType: z.string().optional(),
        focalLength: z.string().optional(),
        depthOfField: z.string().optional(),
        shotType: z.string().optional(),
        frameRate: z.string().optional(),
        aspectRatio: z.string().optional(),
        // Color
        colorGrading: z.string().optional(),
        colorPalette: z.string().optional(),
        colorTemperature: z.string().optional(),
        // Location
        locationType: z.string().optional(),
        realEstateStyle: z.string().optional(),
        country: z.string().optional(),
        city: z.string().optional(),
        locationDetail: z.string().optional(),
        vehicleType: z.string().optional(),
        // Composition
        foregroundElements: z.string().optional(),
        backgroundElements: z.string().optional(),
        characterBlocking: z.string().optional(),
        actionDescription: z.string().optional(),
        crowdLevel: z.string().optional(),
        // Characters
        characterIds: z.array(z.number()).optional(),
        characterPositions: z.any().optional(),
        // Dialogue
        dialogueText: z.string().optional(),
        dialogueLines: z.any().optional(),
        subtitleText: z.string().optional(),
        // Sound
        ambientSound: z.string().optional(),
        sfxNotes: z.string().optional(),
        musicMood: z.string().optional(),
        musicTempo: z.string().optional(),
        soundtrackId: z.number().nullable().optional(),
        soundtrackVolume: z.number().min(0).max(100).optional(),
        // VFX & Production
        vfxNotes: z.string().optional(),
        visualEffects: z.any().optional(),
        props: z.any().optional(),
        wardrobe: z.any().optional(),
        makeupNotes: z.string().optional(),
        stuntNotes: z.string().optional(),
        productionNotes: z.string().optional(),
        budgetEstimate: z.number().optional(),
        shootingDays: z.number().optional(),
        aiPromptOverride: z.string().optional(),
        // Timing
        duration: z.number().min(1).max(600).optional(),
        transitionType: z.string().optional(),
        transitionDuration: z.number().optional(),
        status: z.enum(["draft", "generating", "completed", "failed"]).optional(),
        // Advanced camera & lens control
        cameraBody: z.string().optional(),
        lensBrand: z.string().optional(),
        aperture: z.string().optional(),
        // Multi-shot sequencing
        multiShotEnabled: z.boolean().optional(),
        multiShotCount: z.number().optional(),
        multiShotData: z.any().optional(),
        // Character staging & emotion
        characterEmotions: z.any().optional(),
        characterActions: z.any().optional(),
        // 3D scene exploration
        heroFrameUrl: z.string().optional(),
        sceneExploreData: z.any().optional(),
        startFrameUrl: z.string().optional(),
        endFrameUrl: z.string().optional(),
        // Genre motion & visual style
        genreMotion: z.string().optional(),
        speedRamp: z.string().optional(),
        visualStyle: z.string().optional(),
        // Retakes
        retakeInstructions: z.string().optional(),
        retakeRegion: z.any().optional(),
        retakeCount: z.number().optional(),
        // Lip sync
        lipSyncMode: z.string().optional(),
        lipSyncAudioUrl: z.string().optional(),
        // VFX suite
        vfxSuiteOperations: z.any().optional(),
        vfxSuiteOutputUrl: z.string().optional(),
        // Live action plate integration
        liveActionPlateUrl: z.string().optional(),
        liveActionCompositeMode: z.string().optional(),
        compositeOutputUrl: z.string().optional(),
        // External footage upload
        externalFootageUrl: z.string().optional(),
        externalFootageType: z.string().optional(),
        externalFootageLabel: z.string().optional(),
        // Generated media
        thumbnailUrl: z.string().optional(),
        generatedUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        videoJobId: z.string().optional(),
        // SFX production notes
        sfxProductionNotes: z.string().optional(),
      }))
       .mutation(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.id);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        // Enforce Pro-only features
        if (input.multiShotEnabled) requireFeature(ctx.user, "canUseMultiShotSequencer", "Multi-Shot Sequencer");
        if (input.liveActionPlateUrl) requireFeature(ctx.user, "canUseLiveActionPlate", "Live Action Plate");
        if (input.lipSyncMode && input.lipSyncMode !== "none") requireFeature(ctx.user, "canUseAIVoiceActing", "Lip Sync");
        const { id, ...data } = input;
        return db.updateScene(id, data as any);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.id);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await db.deleteScene(input.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await db.reorderScenes(input.projectId, input.sceneIds);
        return { success: true };
      }),

    // Generate a preview image for a single scene
    generatePreview: creationProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        // Credits: deduct for preview image
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_preview_image.cost, "generate_preview_image", `Preview for scene ${input.sceneId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new Error("Scene not found");

        // Get project and characters for Visual DNA
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        const characters = project ? await db.getProjectCharacters(project.id) : [];

        // Build Visual DNA for consistent style
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = project
          ? buildVisualDNA(project, characters, userTier)
          : buildVisualDNA({ title: "Untitled", genre: "Drama" }, [], userTier);

        // Get all scenes for context
        const allScenes = project ? await db.getProjectScenes(project.id) : [];
        const sceneIdx = allScenes.findIndex(s => s.id === scene.id);

        // Build rich cinematic prompt
        const prompt = buildScenePrompt(
          { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
          visualDNA,
          {
            sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
            totalScenes: allScenes.length || 1,
            previousSceneDescription: sceneIdx > 0 ? (allScenes[sceneIdx - 1]?.description || undefined) : undefined,
            characterNames: characters.map(c => c.name),
            characters: characters.map(c => ({ name: c.name, ageRange: c.dateOfBirth })),
          }
        );

        // Get character photos for reference
        const characterIds = (scene.characterIds as number[]) || [];
        const originalImages: Array<{ url: string; mimeType: string }> = [];
        for (const cId of characterIds) {
          const char = await db.getCharacterById(cId);
          if (char?.photoUrl) {
            originalImages.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }
        // Also include all project character photos for consistency
        for (const char of characters) {
          if (char.photoUrl && !originalImages.find(img => img.url === char.photoUrl)) {
            originalImages.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }

        const result = await generateImage({
          prompt,
          originalImages: originalImages.length > 0 ? originalImages : undefined,
        });

        // Update scene with preview thumbnail
        await db.updateScene(scene.id, { thumbnailUrl: result.url });

        // Auto-set project thumbnail if project doesn't have one yet
        if (result.url && project && !project.thumbnailUrl) {
          try {
            await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: result.url });
          } catch (e) {
            console.warn('[Preview] Failed to auto-set project thumbnail:', e);
          }
        }

        return { url: result.url };
      }),

    // Generate image using Nano Banana (Google Gemini native image generation)
    generateNanoBananaImage: protectedProcedure
      .input(z.object({
        prompt: z.string(),
        model: z.enum(["nano-banana-2", "nano-banana-pro"]).optional(),
        referenceImageUrl: z.string().optional(),
        aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
        sceneId: z.number().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        try { await db.deductCredits(ctx.user.id, 1, "nano_banana_image", `Nano Banana image generation`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }

        // Get user's Google API key
        const user = await db.getUserById(ctx.user.id);
        const userGoogleKey = (user as any)?.userGoogleAiKey || undefined;

        const result = await generateNanoBananaImage({
          prompt: input.prompt,
          model: input.model,
          referenceImageUrl: input.referenceImageUrl,
          aspectRatio: input.aspectRatio,
          userApiKey: userGoogleKey,
        });

        // If sceneId provided, update scene thumbnail
        if (input.sceneId && result.url) {
          await db.updateScene(input.sceneId, { thumbnailUrl: result.url });
          // Auto-set project thumbnail if project doesn't have one yet
          if (input.projectId) {
            try {
              const proj = await db.getProjectById(input.projectId, ctx.user.id);
              if (proj && !proj.thumbnailUrl) {
                await db.updateProject(proj.id, ctx.user.id, { thumbnailUrl: result.url });
              }
            } catch (e) {
              console.warn('[NanoBanana] Failed to auto-set project thumbnail:', e);
            }
          }
        }

        return { url: result.url, text: result.text };
      }),

    // Check Nano Banana availability
    nanoBananaStatus: protectedProcedure
      .query(async () => {
        return { available: isNanoBananaAvailable() };
      }),

    // Bulk generate preview images for all scenes without thumbnails
    bulkGeneratePreviews: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseBulkGenerate", "Bulk Generate Previews");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(project.id);
        const scenesNeedingImages = scenes.filter(s => !s.thumbnailUrl);
        // Credits: deduct per scene for bulk previews
        if (scenesNeedingImages.length > 0) {
          try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.bulk_generate_previews.cost * scenesNeedingImages.length, "bulk_generate_previews", `Bulk previews for ${scenesNeedingImages.length} scenes`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        }
        if (scenesNeedingImages.length === 0) return { generated: 0, total: scenes.length };

        // Build Visual DNA for consistent style across all bulk-generated images
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        // Collect character photos for reference
        const characterPhotos: Array<{ url: string; mimeType: string }> = [];
        for (const char of characters) {
          if (char.photoUrl) {
            characterPhotos.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }
        let generated = 0;
        const BATCH = 4;
        for (let i = 0; i < scenesNeedingImages.length; i += BATCH) {
          const batch = scenesNeedingImages.slice(i, i + BATCH);
          await Promise.allSettled(batch.map(async (scene) => {
            try {
              const sceneIdx = scenes.findIndex(s => s.id === scene.id);
              const prompt = buildScenePrompt(
                scene,
                visualDNA,
                {
                  sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
                  totalScenes: scenes.length,
                  previousSceneDescription: sceneIdx > 0 ? (scenes[sceneIdx - 1]?.description || undefined) : undefined,
                  characterNames: characters.map(c => c.name),
                }
              );
              const result = await generateImage({
                prompt,
                originalImages: characterPhotos.length > 0 ? characterPhotos : undefined,
              });
              await db.updateScene(scene.id, { thumbnailUrl: result.url });
              // Auto-set project thumbnail from first generated scene
              if (!project.thumbnailUrl && result.url) {
                try {
                  await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: result.url });
                  (project as any).thumbnailUrl = result.url; // prevent re-setting
                } catch (e) {
                  console.warn('[BulkPreview] Failed to auto-set project thumbnail:', e);
                }
              }
              generated++;
            } catch (e) {
              console.error(`Bulk gen failed for scene "${scene.title}":`, e);
            }
          }));
        }
        return { generated, total: scenes.length };
      }),

    // Reset scene status (for stuck scenes)
    resetStatus: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        await db.updateScene(scene.id, { status: "draft" } as any);
        return { success: true, sceneId: scene.id };
      }),

    // Generate video for a single scene
    generateVideo: creationProcedure
      .input(z.object({ sceneId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        // Credits: duration-scaled deduction (≤15s=3cr, 16-45s=5cr, 46-90s=7cr, >90s=10cr)
        const videoCredits = getVideoCredits(Math.max(10, scene.duration || 45), false);
        try { await db.deductCredits(ctx.user.id, videoCredits, "generate_scene_video", `Video for scene ${input.sceneId} (${scene.duration || 45}s)`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        const allScenes = await db.getProjectScenes(project.id);
        const sceneIdx = allScenes.findIndex(s => s.id === scene.id);
        const prompt = buildScenePrompt(
          { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
          visualDNA,
          {
            sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
            totalScenes: allScenes.length || 1,
            previousSceneDescription: sceneIdx > 0 ? (allScenes[sceneIdx - 1]?.description || undefined) : undefined,
            characterNames: characters.map(c => c.name),
          }
        );
        // Use reference images from scene editor (first = promptImage for image-to-video)
        const sceneRefImages = (scene as any).referenceImages as string[] || [];
        const sceneAiPromptOverride = (scene as any).aiPromptOverride as string | undefined;
        const sceneNegativePrompt = (scene as any).negativePrompt as string | undefined;
        const sceneSeed = (scene as any).seed as number | undefined;

        // Build BYOK keys: use user's own keys; admins also get platform keys as fallback
        const rawUserKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdmin = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
        const byokKeys: UserApiKeys = {
          openaiKey: rawUserKeys.openaiKey || (isAdmin ? ENV.openaiApiKey : undefined),
          runwayKey: rawUserKeys.runwayKey || (isAdmin ? ENV.runwayApiKey : undefined),
          replicateKey: rawUserKeys.replicateKey,
          falKey: rawUserKeys.falKey,
          lumaKey: rawUserKeys.lumaKey,
          hfToken: rawUserKeys.hfToken,
          byteplusKey: rawUserKeys.byteplusKey,
          googleAiKey: rawUserKeys.googleAiKey || (isAdmin ? ENV.googleApiKey : undefined),
          preferredProvider: rawUserKeys.preferredProvider,
        };

        // Non-admin users without any video key get a clear error pointing to Settings
        const hasVideoKey = byokKeys.openaiKey || byokKeys.runwayKey || byokKeys.replicateKey ||
          byokKeys.falKey || byokKeys.lumaKey || byokKeys.hfToken || byokKeys.byteplusKey || byokKeys.googleAiKey;
        if (!hasVideoKey) {
          await db.updateScene(scene.id, { status: "draft" } as any);
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No video API key found. Please add your own Runway, OpenAI (Sora), fal.ai, Replicate, Luma, or Google Gemini (Veo 3) API key in Settings → API Keys to generate videos. Free Pollinations generation is also available without a key.",
          });
        }

        // Mark scene as generating immediately
        await db.updateScene(scene.id, { status: "generating" } as any);

        // Determine provider
        const { selectProvider } = await import("./_core/byokVideoEngine");
        const activeProvider = selectProvider(byokKeys);

        if (activeProvider === "veo3" && byokKeys.googleAiKey) {
          // ─── VEO 3: Persistent job queue approach ───
          // Submit the Veo 3 operation immediately (non-blocking), store operation name in DB,
          // and let videoJobWorker.ts poll for completion — survives Railway restarts.
          try {
            const effectivePrompt = sceneAiPromptOverride || `Cinematic video: ${prompt}`;
            const effectiveImageUrl = sceneRefImages.length > 0 ? sceneRefImages[0] : undefined;
            const { generateWithVeo3 } = await import("./_core/byokVideoEngine");
            const veo3Result = await generateWithVeo3(byokKeys.googleAiKey, {
              prompt: effectivePrompt,
              imageUrl: effectiveImageUrl,
              aspectRatio: "16:9",
            });
            // Extract the operation name from the sentinel URL
            const operationName = veo3Result.jobId!;
            const jobMeta = {
              veo3OperationName: operationName,
              veo3ApiKey: byokKeys.googleAiKey,
              sceneId: scene.id,
              projectId: project.id,
              userId: ctx.user.id,
              prompt: effectivePrompt,
              imageUrl: effectiveImageUrl,
            };
            await db.createGenerationJob({
              projectId: project.id,
              sceneId: scene.id,
              type: "scene",
              status: "processing",
              progress: 0,
              estimatedSeconds: 600,
              metadata: jobMeta,
            });
            console.log(`[SceneVideo] Veo 3 operation ${operationName} submitted for scene ${scene.id} — worker will poll for completion`);
          } catch (err: any) {
            console.error(`[SceneVideo] Failed to submit Veo 3 job for scene ${scene.id}:`, err.message);
            await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
          }
        } else if (activeProvider === "runway" && byokKeys.runwayKey) {
          // ─── RUNWAY: Persistent job queue approach ───
          // Submit the Runway task immediately (non-blocking), store task ID in DB,
          // and let videoJobWorker.ts poll for completion — survives Railway restarts.
          try {
            const effectivePrompt = sceneAiPromptOverride ||
              `Cinematic video: ${prompt}`;
            const effectiveImageUrl = sceneRefImages.length > 0 ? sceneRefImages[0] : undefined;

            const { submitRunwayJob } = await import("./_core/videoJobWorker");
            const taskId = await submitRunwayJob(byokKeys.runwayKey, {
              prompt: effectivePrompt,
              imageUrl: effectiveImageUrl,
              negativePrompt: sceneNegativePrompt,
              seed: sceneSeed,
              aspectRatio: "16:9",
            });

            // Store job in DB with Runway task ID — worker will poll and complete it
            const jobMeta = {
              runwayTaskId: taskId,
              runwayApiKey: byokKeys.runwayKey,
              sceneId: scene.id,
              projectId: project.id,
              userId: ctx.user.id,
              prompt: effectivePrompt,
              imageUrl: effectiveImageUrl,
              negativePrompt: sceneNegativePrompt,
              seed: sceneSeed,
              ratio: "1280:720",
              duration: 10,
              referenceImages: sceneRefImages,
              aiPromptOverride: sceneAiPromptOverride,
            };

            await db.createGenerationJob({
              projectId: project.id,
              sceneId: scene.id,
              type: "scene",
              status: "processing",
              progress: 0,
              estimatedSeconds: 600,
              metadata: jobMeta,
            });

            console.log(`[SceneVideo] Runway task ${taskId} submitted for scene ${scene.id} — worker will poll for completion`);
          } catch (err: any) {
            console.error(`[SceneVideo] Failed to submit Runway job for scene ${scene.id}:`, err.message);
            await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
          }
        } else {
          // ─── OTHER PROVIDERS: Fire-and-forget background task ───
          // Non-Runway providers (Pollinations, fal, Replicate, Luma) are fast enough
          // that Railway restarts are unlikely to interrupt them.
          (async () => {
            try {
              console.log(`[SceneVideo] Background generation started for scene ${scene.id} (provider: ${activeProvider})`);
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: sceneAiPromptOverride ? sceneAiPromptOverride : `Cinematic video: ${prompt}`,
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                aiPromptOverride: sceneAiPromptOverride,
                negativePrompt: sceneNegativePrompt,
                seed: sceneSeed,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed" } as any);
              if (extResult.thumbnailUrl && project && !project.thumbnailUrl) {
                try { await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl }); } catch (e) { /* ignore */ }
              }
              console.log(`[SceneVideo] Background generation completed for scene ${scene.id}: ${extResult.videoUrl}`);
            } catch (err: any) {
              console.error(`[SceneVideo] Background generation failed for scene ${scene.id}:`, err.message);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
            }
          })();
        }

        // Return immediately — frontend will poll scene status
        return { status: "generating", sceneId: scene.id, message: "Video generation started. The scene will update when complete." };
      }),

    // Bulk generate videos for all scenes without videos
    bulkGenerateVideos: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseBulkGenerate", "Bulk Generate Videos");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(project.id);
        const scenesNeedingVideo = scenes.filter(s => !(s as any).videoUrl);
        if (scenesNeedingVideo.length === 0) return { generated: 0, total: scenes.length };
        // Credits: duration-scaled per scene (≤15s=3cr, 16-45s=5cr, 46-90s=7cr, >90s=10cr)
        const bulkVideoCredits = scenesNeedingVideo.reduce((sum: number, s: any) => sum + getVideoCredits(Math.max(10, s.duration || 45), false), 0);
        try { await db.deductCredits(ctx.user.id, bulkVideoCredits, "bulk_generate_videos", `Bulk videos for ${scenesNeedingVideo.length} scenes (duration-scaled)`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);

        // Build BYOK keys: use user's own keys; admins also get platform keys as fallback
        const rawUserKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdminBulk = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
        const bulkByokKeys: UserApiKeys = {
          openaiKey: rawUserKeys.openaiKey || (isAdminBulk ? ENV.openaiApiKey : undefined),
          runwayKey: rawUserKeys.runwayKey || (isAdminBulk ? ENV.runwayApiKey : undefined),
          replicateKey: rawUserKeys.replicateKey,
          falKey: rawUserKeys.falKey,
          lumaKey: rawUserKeys.lumaKey,
          hfToken: rawUserKeys.hfToken,
          byteplusKey: rawUserKeys.byteplusKey,
          googleAiKey: rawUserKeys.googleAiKey || (isAdminBulk ? ENV.googleApiKey : undefined),
          preferredProvider: rawUserKeys.preferredProvider,
        };

        // Non-admin users without any video key get a clear error pointing to Settings
        const hasBulkVideoKey = bulkByokKeys.openaiKey || bulkByokKeys.runwayKey || bulkByokKeys.replicateKey ||
          bulkByokKeys.falKey || bulkByokKeys.lumaKey || bulkByokKeys.hfToken || bulkByokKeys.byteplusKey || bulkByokKeys.googleAiKey;
        if (!hasBulkVideoKey) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No video API key found. Please add your own Runway, OpenAI (Sora), fal.ai, Replicate, or Luma API key in Settings → API Keys to generate videos. Free Pollinations generation is also available without a key.",
          });
        }

        let generated = 0;
        const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
        // Process 2 at a time to avoid API overload
        const BATCH = 2;
        for (let i = 0; i < scenesNeedingVideo.length; i += BATCH) {
          const batch = scenesNeedingVideo.slice(i, i + BATCH);
          await Promise.allSettled(batch.map(async (scene) => {
            try {
              const sceneIdx = scenes.findIndex(s => s.id === scene.id);
              const prompt = buildScenePrompt(
                { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
                visualDNA,
                {
                  sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
                  totalScenes: scenes.length,
                  previousSceneDescription: sceneIdx > 0 ? (scenes[sceneIdx - 1]?.description || undefined) : undefined,
                  characterNames: characters.map(c => c.name),
                }
              );
              await db.updateScene(scene.id, { status: "generating" } as any);
              const extResult = await generateExtendedScene(bulkByokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: `Cinematic video: ${prompt}`,
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed" } as any);
              // Auto-set project thumbnail if project has none
              if (extResult.thumbnailUrl && !project.thumbnailUrl) {
                try {
                  await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl });
                  (project as any).thumbnailUrl = extResult.thumbnailUrl;
                } catch (e) { /* ignore */ }
              }
              generated++;
            } catch (e) {
              console.error(`Bulk video gen failed for scene "${scene.title}":`, e);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
            }
          }));
        }
        return { generated, total: scenes.length };
      }),

    // ─── Virelle AI Scene Editing Chat ───
    virelleChat: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        message: z.string().min(1).max(2000),
        chatHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Credits: deduct for Virelle chat message
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "virelle_chat", `Virelle chat for scene ${input.sceneId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }

        // Get the scene data
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });

        // Get user's API keys
        const userKeys = await db.getUserApiKeys(ctx.user!.id);

        // Determine which LLM provider to use
        // Admins can use platform keys; regular users must provide their own
        const preferredLlm = userKeys.preferredLlmProvider;
        const isAdminChat = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
        let provider: "openai" | "anthropic" | "google" = "openai";
        if (preferredLlm === "anthropic" && userKeys.anthropicKey) provider = "anthropic";
        else if (preferredLlm === "google" && userKeys.googleAiKey) provider = "google";
        else if (preferredLlm === "openai" && userKeys.openaiKey) provider = "openai";
        else if (userKeys.openaiKey) provider = "openai";
        else if (userKeys.anthropicKey) provider = "anthropic";
        else if (userKeys.googleAiKey) provider = "google";
        else if (isAdminChat && ENV.openaiApiKey) {
          // Admin fallback: use platform OpenAI key
          provider = "openai";
        } else {
          // Non-admin without any LLM key — require them to add their own
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No AI API key found. Please add your own OpenAI, Anthropic (Claude), or Google (Gemini) API key in Settings → API Keys to use Virelle AI chat.",
          });
        }

        const apiKey =
          provider === "openai" ? (userKeys.openaiKey || (isAdminChat ? ENV.openaiApiKey : ""))
          : provider === "anthropic" ? userKeys.anthropicKey!
          : userKeys.googleAiKey!;

        // Build the system prompt for Virelle
        const systemPrompt = `You are Virelle, the AI production assistant for VirÉlle Studios. You execute the director's scene editing instructions with precision and faithfulness.

You are currently editing this scene:
- Title: ${scene.title || "Untitled"}
- Description: ${scene.description || "No description"}
- Time of Day: ${scene.timeOfDay || "not set"}
- Weather: ${(scene as any).weather || "not set"}
- Lighting: ${scene.lighting || "not set"}
- Camera Angle: ${scene.cameraAngle || "not set"}
- Mood: ${scene.mood || "not set"}
- Location: ${scene.locationType || "not set"}
- Duration: ${scene.duration || 30}s
- Director Notes: ${(scene as any).productionNotes || "none"}

DIRECTOR-FIRST RULES (non-negotiable):
1. Apply ONLY the changes the director explicitly requests. Do NOT change any other field.
2. Do NOT add new elements (dialogue, effects, characters, mood, weather, sounds) that the director did not ask for.
3. Preserve ALL existing scene properties that the director did not mention.
4. If the director's instruction is ambiguous, ask ONE clarifying question instead of guessing.
5. ONLY make creative suggestions or additions if the director explicitly says "be creative", "add something", "what do you suggest", "use your judgment", or "surprise me".
6. The director has full creative control — execute their vision exactly as stated, without restriction.

When the director gives you editing instructions, respond with:
1. A single brief confirmation of what you are changing (one sentence)
2. A JSON block with ONLY the exact fields the director asked to change

Always wrap your scene updates in a JSON code block like this:
\`\`\`json
{"updates": {"fieldName": "newValue"}}
\`\`\`

Available fields you can update:
- title (string)
- description (string) - the main scene description
- timeOfDay (one of: dawn, morning, afternoon, evening, night, golden-hour)
- weather (one of: clear, cloudy, overcast, rain, heavy-rain, snow, fog, storm, wind, haze)
- lighting (one of: natural, golden-hour, blue-hour, overcast, harsh-sunlight, moonlight, neon, candlelight, fluorescent, dramatic, silhouette, rim-light, chiaroscuro, volumetric, practical)
- cameraAngle (one of: eye-level, low-angle, high-angle, dutch-angle, birds-eye, worms-eye, over-shoulder, pov, profile, three-quarter)
- mood (one of: tense, romantic, melancholic, joyful, mysterious, serene, chaotic, nostalgic, ominous, euphoric, contemplative, whimsical, gritty, ethereal, suspenseful, intimate, epic, claustrophobic, dreamlike, raw)
- duration (number in seconds, 1-600)
- productionNotes (string) - director's notes
- dialogueText (string) - character dialogue
- actionDescription (string) - physical action in the scene
- foregroundElements (string)
- backgroundElements (string)
- characterBlocking (string) - where characters are positioned`;

        // Build messages array
        const chatMessages = (input.chatHistory || []).map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        chatMessages.push({ role: "user", content: input.message });

        let aiResponse = "";

        try {
          if (provider === "openai") {
            const resp = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-4.1-mini",
                messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
                max_tokens: 1000,
                temperature: 0.7,
              }),
            });
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`OpenAI API error ${resp.status}: ${errText}`);
            }
            const data = await resp.json();
            aiResponse = data.choices?.[0]?.message?.content || "";
          } else if (provider === "anthropic") {
            const resp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                system: systemPrompt,
                messages: chatMessages,
              }),
            });
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Anthropic API error ${resp.status}: ${errText}`);
            }
            const data = await resp.json();
            aiResponse = data.content?.[0]?.text || "";
          } else if (provider === "google") {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: chatMessages.map(m => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.content }],
                })),
              }),
            });
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Google AI API error ${resp.status}: ${errText}`);
            }
            const data = await resp.json();
            aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        } catch (err: any) {
          console.error(`[Virelle] LLM call failed (${provider}):`, err.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Virelle AI error: ${err.message}` });
        }

        // Parse any JSON updates from the response
        let appliedUpdates: Record<string, any> = {};
        const jsonMatch = aiResponse.match(/```json\s*\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed.updates && typeof parsed.updates === "object") {
              // Validate and apply updates
              const allowedFields = [
                "title", "description", "timeOfDay", "weather", "lighting",
                "cameraAngle", "mood", "duration", "productionNotes",
                "dialogueText", "actionDescription", "foregroundElements",
                "backgroundElements", "characterBlocking", "locationType",
                "colorGrading", "cameraMovement", "lensType", "depthOfField",
                "ambientSound", "sfxNotes", "subtitleText",
              ];
              for (const [key, value] of Object.entries(parsed.updates)) {
                if (allowedFields.includes(key) && value !== undefined && value !== null) {
                  appliedUpdates[key] = value;
                }
              }
              // Apply updates to the scene
              if (Object.keys(appliedUpdates).length > 0) {
                await db.updateScene(scene.id, appliedUpdates as any);
              }
            }
          } catch (e) {
            console.error("[Virelle] Failed to parse JSON updates:", e);
          }
        }

        return {
          response: aiResponse,
          provider,
          appliedUpdates,
          updatedFieldCount: Object.keys(appliedUpdates).length,
        };
      }),

    // Set preferred LLM provider for Virelle chat
    setPreferredLlm: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "anthropic", "google"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserApiKey(ctx.user!.id, "preferredLlmProvider", input.provider);
        return { success: true };
      }),
  }),

  // ─── File Upload ───
  upload: router({
    image: protectedProcedure
      .input(z.object({
        base64: z.string().max(14_000_000, "File too large. Max 10MB."),
        filename: z.string(),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `uploads/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    // ─── External Scene Footage Upload ───
    // Allows directors to upload externally shot footage (MP4, MOV, AVI, MKV) into a scene
    footage: protectedProcedure
      .input(z.object({
        base64: z.string().max(200_000_000, "File too large. Max 150MB."),
        filename: z.string(),
        contentType: z.string().default("video/mp4"),
        sceneId: z.number().optional(),
        footageType: z.enum(["replace", "overlay", "reference"]).default("replace"),
        label: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitUpload(ctx.user.id);
        const buffer = Buffer.from(input.base64, "base64");
        const key = `footage/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);

        // If a sceneId is provided, update the scene with the footage URL
        if (input.sceneId) {
          await db.updateScene(input.sceneId, {
            externalFootageUrl: url,
            externalFootageType: input.footageType,
            externalFootageLabel: input.label || input.filename,
          } as any);
        }

        return { url, key };
      }),

    // Upload reference images (PNG, JPG, WEBP) for a scene — logos, concept art, mood boards
    referenceImage: protectedProcedure
      .input(z.object({
        base64: z.string().max(50_000_000, "File too large. Max 10MB."),
        filename: z.string(),
        contentType: z.string().default("image/png"),
        sceneId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitUpload(ctx.user.id);
        const buffer = Buffer.from(input.base64, "base64");
        const key = `reference-images/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        // Get existing reference images and append
        const scene = await db.getSceneById(input.sceneId);
        const existing = (scene?.referenceImages as string[] || []);
        existing.push(url);
        await db.updateScene(input.sceneId, { referenceImages: existing } as any);
        return { url, key, referenceImages: existing };
      }),

    // Remove a reference image from a scene
    removeReferenceImage: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        const existing = (scene?.referenceImages as string[] || []);
        const updated = existing.filter((url: string) => url !== input.imageUrl);
        await db.updateScene(input.sceneId, { referenceImages: updated } as any);
        return { referenceImages: updated };
      }),
  }),

  // ─── Generation ───
  generation: router({
    // Quick generate: AI creates full film from plot + characters
    // Enhanced with Visual DNA system and Cinematic Prompt Engine
    quickGenerate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        // Security: Track generation and check for abuse
        const genIP = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
        const genCheck = trackGeneration(ctx.user.id, genIP, "quickGenerate");
        if (!genCheck.allowed) {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: genCheck.reason || "Generation rate limit exceeded" });
        }
        logAuditEvent(ctx.user.id, "quickGenerate", genIP, true, { projectId: input.projectId });

        // Subscription: check feature access and generation quota
        requireFeature(ctx.user, "canUseQuickGenerate", "Quick Generate");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);

        // Credits: deduct for film generation
        try {
          await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_film.cost, "generate_film", `Generate Film for project ${input.projectId}`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: e.message });
          }
          // Non-credit errors don't block generation for now
          console.warn("[Credits] Deduction warning:", e.message);
        }

        logger.aiGeneration("quickGenerate started", ctx.user.id, { projectId: input.projectId });
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        // Create a generation job
        const job = await db.createGenerationJob({
          projectId: project.id,
          type: "full-film",
          status: "processing",
          progress: 0,
          estimatedSeconds: (project.duration || 90) * 2,
        });

        // Update project status
        await db.updateProject(project.id, ctx.user.id, {
          status: "generating",
          progress: 0,
        });

        try {

        // ── Step 0: Auto-generate photorealistic characters if none exist ──
        // This is the key to broadcast-quality output: consistent faces across all scenes
        let existingCharacters = await db.getProjectCharacters(project.id);
        if (existingCharacters.length === 0) {
          try {
            // Ask LLM to design 2-4 characters (humans + animals if relevant) based on the plot
            const charDesignResult = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: `You are a Hollywood casting director and character designer. Based on the plot summary, design 2-4 main characters for this film. Include humans AND animals if relevant to the story. For each character, provide extremely specific physical descriptions that will be used to generate photorealistic portrait images. Be precise — hair color, eye color, skin tone, age, ethnicity, build, distinguishing features, clothing style. For animals, describe species, breed, coloring, size, and distinctive features.`,
                },
                {
                  role: "user",
                  content: `Plot: ${project.plotSummary || project.description || "A compelling story"}\nGenre: ${project.genre || "Drama"}\n\nDesign 2-4 main characters. Return JSON with this exact schema:\n{"characters": [{"name": string, "role": string, "isAnimal": boolean, "animalSpecies": string|null, "gender": string, "ageRange": string, "ethnicity": string, "skinTone": string, "build": string, "hairColor": string, "hairStyle": string, "eyeColor": string, "facialFeatures": string, "distinguishingMarks": string, "clothingStyle": string, "expression": string, "description": string}]}`,
                },
              ],
              response_format: { type: "json_object" },
            });

            const charContent = charDesignResult.choices[0]?.message?.content;
            let charParsed: any = {};
            try { charParsed = JSON.parse(typeof charContent === "string" ? charContent : "{}"); } catch {}
            const charDesigns: any[] = charParsed.characters || [];

            // Generate a photorealistic portrait for each character
            for (const cd of charDesigns.slice(0, 4)) {
              try {
                let portraitPrompt: string;
                if (cd.isAnimal && cd.animalSpecies) {
                  // Animal portrait prompt
                  portraitPrompt = [
                    `RAW photograph, ultra-photorealistic wildlife/nature photography of a ${cd.animalSpecies},`,
                    cd.description ? `${cd.description},` : "",
                    `${cd.hairColor || cd.coloring || "natural"} coloring, ${cd.build || "healthy"} build,`,
                    cd.distinguishingMarks ? `${cd.distinguishingMarks},` : "",
                    `shot on Canon EOS R5 with 500mm telephoto lens, shallow depth of field, natural habitat environment,`,
                    `National Geographic quality, 8K resolution, hyperdetailed, absolutely indistinguishable from a real photograph,`,
                    `perfect animal anatomy, natural fur/feather/scale texture, authentic animal eyes with natural reflections,`,
                    `NOT CGI, NOT illustration, NOT cartoon — a REAL PHOTOGRAPH of a REAL ANIMAL`,
                  ].filter(Boolean).join(" ");
                } else {
                  // Human portrait prompt — using the same high-quality prompt as the character generator
                  portraitPrompt = [
                    `RAW photograph, ultra-photorealistic Hollywood A-list actor headshot, absolutely indistinguishable from a real photograph of a real human being,`,
                    `captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lens at f/1.4, shallow cinematic depth of field with natural oval bokeh,`,
                    `${cd.gender || "person"} in their ${cd.ageRange || "30s"},`,
                    `${cd.ethnicity || ""} ethnicity,`,
                    cd.skinTone ? `${cd.skinTone} skin tone — skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers, visible pores, micro-wrinkles, fine peach fuzz hair on skin surface, natural blemishes and freckles, authentic facial asymmetry — no airbrushed or plastic skin,` : "",
                    cd.build ? `${cd.build} build,` : "",
                    `${cd.hairColor || "brown"} ${cd.hairStyle || "natural"} hair — individual strand detail visible, natural hair texture with flyaways and imperfections, realistic hair sheen,`,
                    `${cd.eyeColor || "brown"} eyes — hyper-realistic iris with detailed fiber structure, natural corneal reflections and specular highlights, subtle moisture in waterline, sclera with faint realistic veins, soulful and alive expression,`,
                    cd.facialFeatures ? `${cd.facialFeatures},` : "",
                    cd.distinguishingMarks ? `${cd.distinguishingMarks},` : "",
                    cd.clothingStyle ? `wearing ${cd.clothingStyle} — fabric texture and material weight visible,` : "",
                    cd.expression ? `${cd.expression} expression with authentic micro-expressions and genuine emotion,` : "",
                    cd.description ? `Character context: ${cd.description},` : "",
                    `three-point Rembrandt lighting: warm key light at 45 degrees creating a Rembrandt triangle on the face, soft fill light reducing shadow ratio to 2:1, subtle rim/hair light separating subject from background,`,
                    `skin pores visible under magnification, micro-wrinkles around eyes and mouth, natural skin oil and moisture, capillaries visible in sclera,`,
                    `authentic facial bone structure with natural asymmetry — no perfect symmetry, no uncanny valley,`,
                    `Kodak Vision3 500T film stock color science with organic grain structure and natural highlight rolloff,`,
                    `8K resolution, hyperdetailed, Academy Award-winning portrait photography,`,
                    `NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-looking, NOT plastic skin, NOT doll-like, NOT overly smooth — a REAL PHOTOGRAPH of a REAL PERSON`,
                  ].filter(Boolean).join(" ");
                }

                const portraitResult = await generateImage({ prompt: portraitPrompt });
                if (portraitResult.url) {
                  await db.createCharacter({
                    userId: ctx.user.id,
                    projectId: project.id,
                    name: cd.name || "Character",
                    description: cd.description || `${cd.role || "Character"} — ${cd.isAnimal ? cd.animalSpecies : `${cd.gender}, ${cd.ageRange}, ${cd.ethnicity}`}`,
                    photoUrl: portraitResult.url,
                    attributes: {
                      ...cd,
                      aiGenerated: true,
                      autoGeneratedForProject: project.id,
                    },
                  });
                  console.log(`[QuickGen] Auto-generated character portrait: ${cd.name}`);
                }
              } catch (charErr: any) {
                console.error(`[QuickGen] Failed to generate character portrait for ${cd.name}:`, charErr.message);
              }
            }
          } catch (charDesignErr: any) {
            console.error("[QuickGen] Character auto-generation failed:", charDesignErr.message);
            // Non-fatal — continue with scene generation
          }
        }

        // ── Step 1: Build Visual DNA for consistent style across all scenes ──
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        const charDescriptions = characters.map(c => {
          const attrs = (c.attributes as any) || {};
          const parts = [`${c.name}`];
          if (c.description) parts.push(`— ${c.description}`);
          if (attrs.age || attrs.ageRange || attrs.estimatedAge) parts.push(`Age: ${attrs.age || attrs.ageRange || attrs.estimatedAge}`);
          if (attrs.gender) parts.push(`Gender: ${attrs.gender}`);
          if (attrs.ethnicity) parts.push(`Ethnicity: ${attrs.ethnicity}`);
          if (attrs.build) parts.push(`Build: ${attrs.build}`);
          if (attrs.hairColor) parts.push(`Hair: ${attrs.hairColor} ${attrs.hairStyle || ""}`.trim());
          if (attrs.eyeColor) parts.push(`Eyes: ${attrs.eyeColor}`);
          if (attrs.clothingStyle) parts.push(`Style: ${attrs.clothingStyle}`);
          return parts.join(". ");
        }).join("\n");

        // ── Step 2: Enhanced LLM scene breakdown with cinematic intelligence ──
        // Check if director explicitly granted creative leeway in their plot/description
        const directorText = (project.plotSummary || project.description || "").toLowerCase();
        const hasCreativeLeeway = /be creative|use your judgment|surprise me|you decide|fill it in|add what you think|make it cinematic|your choice|go wild|improvise|creative freedom/i.test(directorText);
        const systemPrompt = buildSceneBreakdownSystemPrompt({ ...project, creativeLeeway: hasCreativeLeeway });

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `Plot: ${project.plotSummary || project.description || "A compelling story"}

Characters:
${charDescriptions}

Break this into 8-15 scenes. For each scene, provide:
- title: Scene title
- description: What happens narratively (2-3 sentences)
- visualDescription: EXACTLY what the camera sees — specific details about environment, character positions, expressions, lighting quality, colors, textures, foreground/background elements (3-5 sentences, be extremely specific and visual)
- timeOfDay: dawn/morning/afternoon/evening/night/golden-hour
- weather: clear/cloudy/rainy/stormy/snowy/foggy/windy
- lighting: natural/dramatic/soft/neon/candlelight/studio/backlit/silhouette
- cameraAngle: wide/medium/close-up/extreme-close-up/birds-eye/low-angle/dutch-angle/over-shoulder/pov
- locationType: specific location description
- mood: emotional tone of the scene
- estimatedDuration: duration in seconds
- colorPalette: dominant colors in this scene (e.g. "warm amber and deep shadow", "cold steel blue with red accents")
- focalLength: suggested lens (e.g. "24mm wide", "85mm portrait", "135mm telephoto")
- depthOfField: "deep focus", "shallow f/1.4", "medium f/2.8", etc.
- foregroundElements: what's in the foreground of the frame
- backgroundElements: what's visible in the background
- characterAction: what the characters are physically doing
- emotionalBeat: the emotional turning point or feeling of this moment
- transitionFromPrevious: how this scene connects visually to the previous one ("cut", "fade", "dissolve", "match cut", "time lapse")`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "scene_breakdown",
              strict: true,
              schema: ENHANCED_SCENE_SCHEMA,
            },
          },
        });

        const content = llmResult.choices[0]?.message?.content;
        let parsed: any;
        try {
          parsed = JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid scene data. Please try again.");
        }
        const scenesData = parsed.scenes || [];

        // ── Step 3: Create scenes in DB with enhanced data ──
        for (let i = 0; i < scenesData.length; i++) {
          const s = scenesData[i];
          await db.createScene({
            projectId: project.id,
            orderIndex: i,
            title: s.title,
            // Store the rich visual description for image generation
            description: s.visualDescription || s.description,
            timeOfDay: s.timeOfDay as any,
            weather: s.weather as any,
            lighting: s.lighting as any,
            cameraAngle: s.cameraAngle as any,
            locationType: s.locationType,
            mood: s.mood,
            duration: s.estimatedDuration || 30,
            transitionType: s.transitionFromPrevious || "cut",
            // Store additional cinematic data in production notes
            productionNotes: [
              `Narrative: ${s.description}`,
              `Color palette: ${s.colorPalette}`,
              `Lens: ${s.focalLength}, DOF: ${s.depthOfField}`,
              `FG: ${s.foregroundElements}`,
              `BG: ${s.backgroundElements}`,
              `Action: ${s.characterAction}`,
              `Emotional beat: ${s.emotionalBeat}`,
            ].join("\n"),
          });
        }

        // ── Step 4: Generate VIDEO CLIPS for each scene using Sora API ──
        const allScenes = await db.getProjectScenes(project.id);
        let generatedCount = 0;

        // Collect character photo references for image generation fallback
        const characterPhotos: Array<{ url: string; mimeType: string }> = [];
        for (const char of characters) {
          if (char.photoUrl) {
            characterPhotos.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }

        // Determine video settings based on subscription tier
        const videoModel = (userTier === "industry" || (userTier as string) === "studio") ? "sora-2-pro" : "sora-2";
        const videoResolution = (userTier === "industry" || (userTier as string) === "studio") ? "1080p" : "720p";

        // Generate videos sequentially (Sora is async and rate-limited)
        for (let sceneIdx = 0; sceneIdx < allScenes.length; sceneIdx++) {
          const scene = allScenes[sceneIdx];
          try {
            // Build cinematic image prompt for thumbnail
            const imagePrompt = buildScenePrompt(
              scene,
              visualDNA,
              {
                sceneIndex: sceneIdx,
                totalScenes: allScenes.length,
                previousSceneDescription: sceneIdx > 0 ? (allScenes[sceneIdx - 1]?.description || undefined) : undefined,
                characterNames: characters.map(c => c.name),
              }
            );

            // Step 4a: Generate thumbnail image first (fast)
            try {
              const imgResult = await generateImage({
                prompt: imagePrompt,
                originalImages: characterPhotos.length > 0 ? characterPhotos : undefined,
              });
              if (imgResult.url) {
                await db.updateScene(scene.id, { thumbnailUrl: imgResult.url });
                // Use first scene image as project thumbnail
                if (sceneIdx === 0) {
                  await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: imgResult.url });
                }
              }
            } catch (imgErr) {
              console.error(`Failed to generate thumbnail for scene "${scene.title}":`, imgErr);
            }

            // Step 4b: Generate extended video scene using clip chaining (30-60s per scene)
            // Fetch user's API keys; admins also get platform keys as fallback
            const userKeys = await db.getUserApiKeys(ctx.user!.id);
            const isAdminQuick = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
            const byokKeys: UserApiKeys = {
              openaiKey: userKeys.openaiKey || (isAdminQuick ? ENV.openaiApiKey : undefined),
              runwayKey: userKeys.runwayKey || (isAdminQuick ? ENV.runwayApiKey : undefined),
              replicateKey: userKeys.replicateKey,
              falKey: userKeys.falKey,
              lumaKey: userKeys.lumaKey,
              hfToken: userKeys.hfToken,
              byteplusKey: userKeys.byteplusKey,
              googleAiKey: userKeys.googleAiKey || (isAdminQuick ? ENV.googleApiKey : undefined),
              preferredProvider: userKeys.preferredProvider,
            };

            // Build rich video prompt including character physical descriptions for consistent faces
            const charVideoDescriptions = characters.map(c => {
              const attrs = (c.attributes as any) || {};
              if (attrs.isAnimal && attrs.animalSpecies) {
                return `${c.name} (${attrs.animalSpecies}${attrs.hairColor ? `, ${attrs.hairColor} coloring` : ""}${attrs.build ? `, ${attrs.build}` : ""})`.trim();
              }
              const parts = [c.name];
              if (attrs.gender) parts.push(attrs.gender);
              if (attrs.ageRange) parts.push(`in their ${attrs.ageRange}`);
              if (attrs.ethnicity) parts.push(attrs.ethnicity);
              if (attrs.hairColor && attrs.hairStyle) parts.push(`${attrs.hairColor} ${attrs.hairStyle} hair`);
              else if (attrs.hairColor) parts.push(`${attrs.hairColor} hair`);
              if (attrs.eyeColor) parts.push(`${attrs.eyeColor} eyes`);
              if (attrs.build) parts.push(`${attrs.build} build`);
              if (attrs.clothingStyle) parts.push(`wearing ${attrs.clothingStyle}`);
              if (attrs.facialFeatures) parts.push(attrs.facialFeatures);
              if (attrs.distinguishingMarks) parts.push(attrs.distinguishingMarks);
              return parts.join(", ");
            }).filter(Boolean);

            const videoPrompt = [
              `Cinematic video scene: ${scene.description || scene.title || "A cinematic scene"}.`,
              charVideoDescriptions.length > 0 ? `Characters in scene: ${charVideoDescriptions.join(" | ")}.` : "",
              scene.mood ? `Mood: ${scene.mood}.` : "",
              scene.lighting ? `Lighting: ${scene.lighting}.` : "",
              scene.timeOfDay ? `Time: ${scene.timeOfDay}.` : "",
              scene.weather ? `Weather: ${scene.weather}.` : "",
              project.genre ? `Genre: ${project.genre}.` : "",
              scene.locationType ? `Location: ${scene.locationType}.` : "",
              (scene.cameraAngle as string) === "tracking" ? "Smooth tracking camera movement." : "Slow cinematic dolly shot.",
              "Photorealistic, shot on ARRI Alexa 65, 35mm anamorphic lens, shallow depth of field, natural lighting, film grain, broadcast TV quality.",
            ].filter(Boolean).join(" ");

            // Use extended scene generation — support industry-standard scene lengths (30s–5min)
            // No artificial cap: providers will handle their own per-clip limits internally
            const targetSceneDuration = Math.max(10, scene.duration || 45);

            try {
              // Import and use extended scene generator for clip chaining
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: videoPrompt,
                targetDurationSeconds: targetSceneDuration,
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                weather: scene.weather || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                previousSceneLastFrameUrl: sceneIdx > 0 ? (allScenes[sceneIdx - 1] as any)?.lastFrameUrl : undefined,
              });

              await db.updateScene(scene.id, {
                videoUrl: extResult.videoUrl,
                status: "completed",
              });

              // Store last frame URL for continuity
              (scene as any).lastFrameUrl = extResult.lastFrameUrl;

              generatedCount++;
              console.log(`[QuickGen] Scene ${sceneIdx + 1}/${allScenes.length} extended video generated (${extResult.totalDuration.toFixed(1)}s, ${extResult.subClipCount} clips): ${extResult.videoUrl}`);
            } catch (videoErr: any) {
              console.error(`[QuickGen] Extended video generation failed for scene "${scene.title}":`, videoErr.message);
              
              // Fallback to single clip generation
              try {
                // Use up to 15s for fallback single clip (providers will cap to their own max)
                const sceneDuration = Math.min(15, Math.max(5, scene.duration || 10));
                const videoResult = await generateBYOKVideo(byokKeys, {
                  prompt: videoPrompt,
                  imageUrl: scene.thumbnailUrl || undefined,
                  duration: sceneDuration,
                  aspectRatio: "16:9",
                  resolution: "720p",
                });
                await db.updateScene(scene.id, {
                  videoUrl: videoResult.videoUrl,
                  videoJobId: videoResult.jobId || null,
                  status: "completed",
                });
                generatedCount++;
                console.log(`[QuickGen] Scene ${sceneIdx + 1} fallback single-clip generated via ${videoResult.provider}`);
              } catch (fallbackErr: any) {
                console.error(`[QuickGen] All video generation failed for scene "${scene.title}":`, fallbackErr.message);
                await db.updateScene(scene.id, { status: "completed" });
              }
            }
          } catch (e) {
            console.error(`Failed to process scene "${scene.title}":`, e);
          }

          // Update progress
          const progress = Math.min(95, Math.round(((sceneIdx + 1) / allScenes.length) * 90) + 10);
          await db.updateJob(job.id, { progress });
          await db.updateProject(project.id, ctx.user.id, { progress });
        }

        // Update job and project
        await db.updateJob(job.id, { status: "completed", progress: 100 });
        await db.updateProject(project.id, ctx.user.id, {
          status: "completed",
          progress: 100,
        });

        return { jobId: job.id, scenesCreated: scenesData.length, imagesGenerated: generatedCount };
        } catch (error: any) {
          // Error recovery: ensure project doesn't get stuck in "generating" state
          console.error("quickGenerate failed:", error?.message, error?.stack);
          await db.updateJob(job.id, { status: "failed", progress: 0 });
          await db.updateProject(project.id, ctx.user.id, {
            status: "draft",
            progress: 0,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Generation failed: ${error.message}. Project has been reset to draft.` });
        }
      }),

    // Generate trailer from existing scenes
    generateTrailer: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseTrailerGeneration", "Trailer Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.trailer_gen.cost, "trailer_gen", `Trailer generation for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const allScenes = await db.getProjectScenes(project.id);
        if (allScenes.length === 0) throw new Error("No scenes to create trailer from");

        const characters = await db.getProjectCharacters(project.id);

        // Create a generation job for the trailer
        const job = await db.createGenerationJob({
          projectId: project.id,
          type: "preview",
          status: "processing",
          progress: 0,
          estimatedSeconds: 60,
          metadata: { trailerType: "cinematic" },
        });

        // Use LLM to select the best scenes for a trailer and create a trailer script
        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} (${s.mood} mood, ${s.locationType})`
        ).join("\n");

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a Hollywood trailer editor. Your STRICT rules:\n1. NEVER spoil key plot twists, endings, character deaths, major reveals, or surprise elements.\n2. ALL trailer content MUST be G-rated regardless of the film's actual rating — absolutely NO violence, gore, sexual content, strong language, drug use, or disturbing imagery.\n3. Focus on building intrigue, mystery, and excitement — tease the premise and characters without giving away what happens.\n4. Select scenes from the FIRST HALF of the film only to avoid late-story spoilers.\n5. Create a sense of wonder and anticipation that makes viewers want to see the film.\n6. Keep the trailer family-friendly and suitable for all audiences.\nReturn JSON.",
            },
            {
              role: "user",
              content: `Film: "${project.title}" (${project.genre || "Drama"}, rated ${project.rating || "PG-13"})\nPlot: ${project.plotSummary || project.description}\n\nAvailable scenes:\n${sceneDescriptions}\n\nSelect 4-6 scenes for a 2-minute trailer. IMPORTANT RULES:\n- ONLY select scenes from the first half of the film (scenes 1 through ${Math.ceil(allScenes.length / 2)}) to avoid spoilers\n- Do NOT reveal any plot twists, endings, or major surprises\n- Rewrite each scene description to be G-RATED and family-friendly even if the original scene contains mature content\n- Focus on establishing the world, characters, and central conflict without resolution\n- Build curiosity and excitement — leave the audience wanting more\n\nFor each scene, provide the scene index (0-based), a G-rated trailer-cut description, and the order they should appear in the trailer.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "trailer_sequence",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  trailerTitle: { type: "string" },
                  tagline: { type: "string" },
                  selectedScenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sceneIndex: { type: "number" },
                        trailerDescription: { type: "string" },
                        trailerOrder: { type: "number" },
                      },
                      required: ["sceneIndex", "trailerDescription", "trailerOrder"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["trailerTitle", "tagline", "selectedScenes"],
                additionalProperties: false,
              },
            },
          },
        });

        const trailerContent = llmResult.choices[0]?.message?.content;
        let trailerData: any;
        try {
          trailerData = JSON.parse(typeof trailerContent === "string" ? trailerContent : "");
        } catch {
          throw new Error("AI returned invalid trailer data. Please try again.");
        }

        // Build Visual DNA for consistent trailer style
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        // Collect character photos for reference
        const characterPhotos: Array<{ url: string; mimeType: string }> = [];
        for (const char of characters) {
          if (char.photoUrl) {
            characterPhotos.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
        }
        const trailerScenes = trailerData.selectedScenes || [];
        const trailerImages: string[] = [];

        for (const ts of trailerScenes) {
          const sceneIdx = ts.sceneIndex;
          if (sceneIdx >= 0 && sceneIdx < allScenes.length) {
            const scene = allScenes[sceneIdx];
            try {
              const prompt = buildTrailerPrompt(scene, visualDNA, ts.trailerDescription);
              const imgResult = await generateImage({
                prompt,
                originalImages: characterPhotos.length > 0 ? characterPhotos : undefined,
              });
              if (imgResult.url) {
                trailerImages.push(imgResult.url);
                // Also update scene thumbnail if it doesn't have one
                if (!scene.thumbnailUrl) {
                  await db.updateScene(scene.id, { thumbnailUrl: imgResult.url });
                }
              }
            } catch (e) {
              console.error(`Failed to generate trailer image for scene ${sceneIdx}:`, e);
            }
          }
        }

        // Update job with results
        await db.updateJob(job.id, {
          status: "completed",
          progress: 100,
          metadata: {
            trailerType: "cinematic",
            trailerTitle: trailerData.trailerTitle,
            tagline: trailerData.tagline,
            trailerScenes: trailerData.selectedScenes,
            trailerImages,
          },
        });

        return {
          jobId: job.id,
          trailerTitle: trailerData.trailerTitle,
          tagline: trailerData.tagline,
          scenes: trailerData.selectedScenes,
          images: trailerImages,
        };
      }),

    // Get generation job status
    getJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getJobById(input.id);
      }),

    listJobs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectJobs(input.projectId);
      }),

    // ── Generate Full Film (90-minute pipeline) ──
    generateFullFilm: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        targetDurationMinutes: z.number().min(1).max(180).default(90),
        generateDialogue: z.boolean().default(true),
        generateSoundtrack: z.boolean().default(true),
        useCharacterConsistency: z.boolean().default(true),
        useSceneContinuity: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseFullFilmGeneration", "Full Film Generation");

        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const characters = await db.getProjectCharacters(project.id);
        const allScenes = await db.getProjectScenes(project.id);
        if (allScenes.length === 0) throw new Error("No scenes found. Generate scenes first using Quick Generate or the Director Assistant.");

        // ── Credit System: Full Film Generation ──
        // Each scene costs credits based on complexity:
        // - Video generation: 1 credit per scene (covers clip chaining)
        // - Voice acting: 0.5 credits per scene with dialogue
        // - Soundtrack: 0.5 credits per scene
        // Total: ~2 credits per scene for a fully-featured scene
        const scenesWithDialogueCount = allScenes.length;
        const creditsPerScene = 2; // video + voice + music
        const totalCreditsNeeded = scenesWithDialogueCount * creditsPerScene;
        
        // Check if user has enough credits for the entire film
        const userLimits = getUserLimits(ctx.user);
        if (userLimits.maxGenerationsPerMonth !== -1) {
          const used = ctx.user.monthlyGenerationsUsed || 0;
          const bonus = ctx.user.bonusGenerations || 0;
          const totalAvailable = userLimits.maxGenerationsPerMonth + bonus;
          const remaining = totalAvailable - used;
          if (remaining < totalCreditsNeeded) {
            throw new Error(
              `GENERATION_LIMIT: Full film generation requires ${totalCreditsNeeded} credits (${scenesWithDialogueCount} scenes × ${creditsPerScene} credits/scene). You have ${remaining} credits remaining. Upgrade your plan or purchase a top-up pack.`
            );
          }
        }

        // Pre-deduct all credits for the film upfront (generation counter + creditBalance)
        for (let i = 0; i < totalCreditsNeeded; i++) {
          await db.incrementGenerationCount(ctx.user.id);
        }
        // Deduct from creditBalance so the credit system stays in sync
        try {
          await db.deductCredits(ctx.user.id, totalCreditsNeeded, "generate_film", `Full film generation: ${allScenes.length} scenes × ${creditsPerScene} credits/scene`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message });
        }

        // Fetch user API keys; admins also get platform keys as fallback
        const userKeys = await db.getUserApiKeys(ctx.user!.id);
        const isAdminFilm = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
        const videoKeys: UserApiKeys = {
          openaiKey: userKeys.openaiKey || (isAdminFilm ? ENV.openaiApiKey : undefined),
          runwayKey: userKeys.runwayKey || (isAdminFilm ? ENV.runwayApiKey : undefined),
          replicateKey: userKeys.replicateKey,
          falKey: userKeys.falKey,
          lumaKey: userKeys.lumaKey,
          hfToken: userKeys.hfToken,
          byteplusKey: userKeys.byteplusKey,
          googleAiKey: userKeys.googleAiKey || (isAdminFilm ? ENV.googleApiKey : undefined),
          preferredProvider: userKeys.preferredProvider,
        };

        // Non-admin users without any video key get a clear error pointing to Settings
        const hasFilmVideoKey = videoKeys.openaiKey || videoKeys.runwayKey || videoKeys.replicateKey ||
          videoKeys.falKey || videoKeys.lumaKey || videoKeys.hfToken || videoKeys.byteplusKey || videoKeys.googleAiKey;
        if (!hasFilmVideoKey) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "No video API key found. Please add your own Runway, OpenAI (Sora), fal.ai, Replicate, or Luma API key in Settings → API Keys to generate a full film.",
          });
        }
        const voiceKeys: VoiceActingKeys = {
          elevenlabsKey: userKeys.elevenlabsKey,
          openaiKey: userKeys.openaiKey,
        };
        const musicKeys: SoundtrackKeys = {
          sunoKey: userKeys.sunoKey,
          replicateKey: userKeys.replicateKey,
        };

        // Create generation job
        const job = await db.createGenerationJob({
          projectId: project.id,
          type: "full-film",
          status: "processing",
          progress: 0,
          estimatedSeconds: input.targetDurationMinutes * 60,
          metadata: { pipeline: "v2-full-film", targetMinutes: input.targetDurationMinutes },
        });

        await db.updateProject(project.id, ctx.user.id, { status: "generating", progress: 0 });

        try {
          // Fetch dialogue for each scene
          const scenesWithDialogue = await Promise.all(
            allScenes.map(async (scene) => {
              const dialogues = await db.getSceneDialogues(scene.id);
              return {
                ...scene,
                characterIds: characters.filter(c => {
                  const desc = scene.description || "";
                  return desc.toLowerCase().includes(c.name.toLowerCase());
                }).map(c => c.id),
                dialogueLines: dialogues.map((d: any) => ({
                  characterName: d.characterName,
                  line: d.line,
                  emotion: d.emotion || undefined,
                  direction: d.direction || undefined,
                  pauseAfterMs: 800,
                })),
              };
            })
          );

          const result = await generateFullFilm(
            {
              config: {
                projectId: project.id,
                targetDurationMinutes: input.targetDurationMinutes,
                genre: project.genre || "drama",
                mood: (project as any).tone || undefined,
                generateDialogue: input.generateDialogue,
                generateSoundtrack: input.generateSoundtrack,
                useCharacterConsistency: input.useCharacterConsistency,
                useSceneContinuity: input.useSceneContinuity,
              },
              videoKeys,
              voiceKeys,
              musicKeys,
              project: {
                id: project.id,
                title: project.title,
                plotSummary: project.plotSummary || undefined,
                description: project.description || undefined,
                genre: project.genre || undefined,
                duration: project.duration || undefined,
                rating: project.rating || undefined,
              },
              characters: characters.map((c: any) => ({
                id: c.id,
                name: c.name,
                description: c.description,
                gender: c.attributes?.gender || null,
                ageRange: c.attributes?.ageRange || c.attributes?.estimatedAge || null,
                ethnicity: c.attributes?.ethnicity || null,
                nationality: c.attributes?.nationality || c.nationality || null,
                skinTone: c.attributes?.skinTone || null,
                build: c.attributes?.build || null,
                height: c.attributes?.height || null,
                weight: c.attributes?.weight || c.weight || null,
                fitnessLevel: c.attributes?.fitnessLevel || c.fitnessLevel || null,
                posture: c.attributes?.posture || c.posture || null,
                hairColor: c.attributes?.hairColor || null,
                hairStyle: c.attributes?.hairStyle || null,
                hairLength: c.attributes?.hairLength || null,
                eyeColor: c.attributes?.eyeColor || null,
                faceShape: c.attributes?.faceShape || null,
                distinguishingFeatures: c.attributes?.distinguishingFeatures || null,
                clothing: c.attributes?.clothingStyle || null,
                referenceImageUrl: c.photoUrl || null,
                thumbnailUrl: c.thumbnailUrl || null,
                faceDnaPrompt: c.faceDnaPrompt || null,
                bodyDnaPrompt: c.bodyDnaPrompt || null,
                consistencyNotes: c.consistencyNotes || null,
                deepProfile: c.deepProfile || null,
              })),
              scenes: scenesWithDialogue,
            },
            async (progress: FilmGenerationProgress) => {
              const pct = Math.min(95, Math.round((progress.completedScenes / Math.max(1, progress.totalScenes)) * 90) + 5);
              await db.updateJob(job.id, {
                progress: pct,
                metadata: {
                  phase: progress.phase,
                  completedScenes: progress.completedScenes,
                  totalScenes: progress.totalScenes,
                  completedClips: progress.completedClips,
                  totalClips: progress.totalClips,
                  dialogueLinesGenerated: progress.dialogueLinesGenerated,
                  soundtrackSegments: progress.soundtrackSegmentsGenerated,
                  currentScene: progress.currentSceneTitle,
                  errors: progress.errors,
                },
              });
              await db.updateProject(project.id, ctx.user.id, { progress: pct });
            }
          );

          // Update scene records with generated video URLs
          for (const sr of result.sceneResults) {
            if (sr.videoUrl) {
              await db.updateScene(sr.sceneId, {
                videoUrl: sr.videoUrl,
                status: "completed",
              });
            }
          }

          // Create movie record if film was assembled
          if (result.filmUrl) {
            await db.createMovie({
              userId: ctx.user.id,
              title: project.title,
              description: project.plotSummary || project.description || "",
              type: "film",
              projectId: project.id,
              movieTitle: project.title,
              thumbnailUrl: project.thumbnailUrl,
              fileUrl: result.filmUrl,
              duration: result.totalDuration,
              mimeType: "video/mp4",
              tags: project.genre ? [project.genre] : [],
            });
          }

          await db.updateJob(job.id, { status: "completed", progress: 100 });
          await db.updateProject(project.id, ctx.user.id, { status: "completed", progress: 100 });

          return {
            jobId: job.id,
            filmUrl: result.filmUrl,
            totalDuration: result.totalDuration,
            scenesGenerated: result.sceneResults.filter(r => r.success).length,
            totalScenes: result.sceneResults.length,
            stats: result.stats,
          };
        } catch (error: any) {
          console.error("generateFullFilm failed:", error);
          await db.updateJob(job.id, { status: "failed", progress: 0 });
          await db.updateProject(project.id, ctx.user.id, { status: "draft", progress: 0 });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Full film generation failed: ${error.message}` });
        }
      }),

    // ── Estimate film generation cost ──
    estimateFilmCost: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        targetDurationMinutes: z.number().min(1).max(180).default(90),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const scenes = await db.getProjectScenes(project.id);
        let totalDialogueLines = 0;
        for (const scene of scenes) {
          const dialogues = await db.getSceneDialogues(scene.id);
          totalDialogueLines += dialogues.length;
        }

        const userKeys = await db.getUserApiKeys(ctx.user!.id);
        const videoProvider = userKeys.preferredProvider || (userKeys.openaiKey ? "openai" : userKeys.runwayKey ? "runway" : "pollinations");
        const voiceProvider = userKeys.elevenlabsKey ? "elevenlabs" : userKeys.openaiKey ? "openai" : "pollinations";
        const musicProvider = userKeys.sunoKey ? "suno" : userKeys.replicateKey ? "replicate" : "pollinations";

        return estimateFilmCost(input.targetDurationMinutes, {
          videoProvider,
          voiceProvider,
          musicProvider,
          dialogueLineCount: totalDialogueLines,
        });
      }),

    // ── Get available TTS and music providers ──
    getAudioProviders: protectedProcedure.query(async () => {
      return {
        ttsProviders: TTS_PROVIDERS,
        musicProviders: MUSIC_PROVIDERS,
      };
    }),

    // Pause/resume generation
    pauseJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.updateJob(input.id, { status: "paused" });
      }),

    resumeJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.updateJob(input.id, { status: "processing" });
      }),

    // ── Cancel Film Generation ──
    cancelGeneration: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        // Only allow cancellation if generation is in progress
        if (project.status !== "generating") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not currently generating" });
        }
        // Set project status back to draft
        await db.updateProject(input.projectId, ctx.user.id, { status: "draft", progress: 0 });
        // Cancel all pending/processing jobs for this project
        const jobs = await db.getProjectJobs(input.projectId);
        let cancelledCount = 0;
        for (const job of jobs) {
          if (job.status === "processing" || (job.status as string) === "pending") {
            await db.updateJob(job.id, { status: "failed", errorMessage: "Cancelled by director" });
            cancelledCount++;
          }
        }
        logAuditEvent(ctx.user.id, "cancelGeneration", "system", true, { projectId: input.projectId, cancelledJobs: cancelledCount });
        logger.info("Generation cancelled", { userId: ctx.user.id, projectId: input.projectId, cancelledJobs: cancelledCount });
        return { success: true, cancelledJobs: cancelledCount };
      }),
  }),
  // ─── Scripts ────
  script: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectScripts(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getScriptById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createScript({ ...input, userId: ctx.user.id });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        pageCount: z.number().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateScript(id, ctx.user.id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteScript(input.id, ctx.user.id);
        return { success: true };
      }),

    // AI: Generate a full screenplay from project details
    aiGenerate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIScriptGen", "AI Script Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.script_writer_ai.cost, "script_writer_ai", `AI script generation for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const scenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const charBlock = characters.map(c => {
          const attrs = c.attributes as any;
          return `${c.name.toUpperCase()} — ${c.description || ""} ${attrs?.age ? `Age: ${attrs.age}` : ""} ${attrs?.gender || ""} ${attrs?.role || ""}`;
        }).join("\n");

        const sceneBlock = scenes.map((s, i) =>
          `Scene ${i + 1}: "${s.title || "Untitled"}" — ${s.description || ""} (${s.locationType || ""}, ${s.timeOfDay || ""}, ${s.mood || ""})`
        ).join("\n");

        let _llmRefundAmount_script_writer_ai = 3;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
                    content: `You are a professional screenwriter. Your job is to faithfully adapt the director's exact story, characters, plot, and scenes into a properly formatted screenplay. You do NOT add new characters, subplots, themes, or story elements that the director did not provide.

DIRECTOR-FIRST RULES:
- Write ONLY what the director's scenes and story describe. Do not invent new plot points, characters, or dialogue topics.
- Character dialogue must reflect the characters and situations the director defined — not your own creative interpretation.
- If the director did not specify dialogue for a scene, write minimal, neutral dialogue that serves the scene's stated purpose only.
- Do NOT add subtext, themes, or character arcs that the director did not describe.
- ONLY apply creative interpretation if the director explicitly says "be creative", "add your own flair", or "use your judgment".

You MUST follow industry-standard screenplay format EXACTLY:
=== FORMATTING RULES ===
1. FADE IN: — Always the first line of the screenplay.
2. SCENE HEADINGS (Sluglines) — ALL CAPS. Format: INT./EXT. LOCATION - TIME OF DAY
   Examples:
   INT. DETECTIVE'S OFFICE - NIGHT
   EXT. MANHATTAN SKYLINE - DAWN
   INT./EXT. MOVING CAR - CONTINUOUS
   Always specify: Interior/Exterior, specific location name, time of day.
3. ACTION LINES — Present tense. Describe exactly what the camera sees based on the director's scene descriptions.
   - Introduce characters in ALL CAPS on first appearance.
   - Use short paragraphs (3-4 lines max).
4. CHARACTER NAME — ALL CAPS, centered above dialogue. Add (V.O.) for voice-over, (O.S.) for off-screen, (CONT'D) for continued.
5. DIALOGUE — Below character name, indented. Write dialogue that serves the director's described scene purpose.
6. PARENTHETICALS — (in parentheses) between character name and dialogue. Use SPARINGLY.
   Examples: (whispering), (to Sarah), (beat), (sotto voce), (re: the photo)

7. TRANSITIONS — Right-aligned. Use sparingly for emphasis:
   CUT TO:
   SMASH CUT TO:
   MATCH CUT TO:
   DISSOLVE TO:
   FADE TO BLACK.
   FADE OUT.

8. STRUCTURE — Follow three-act structure with clear:
   - ACT ONE (Setup, ~25%): Establish world, characters, inciting incident
   - ACT TWO (Confrontation, ~50%): Rising stakes, complications, midpoint reversal, dark night of the soul
   - ACT THREE (Resolution, ~25%): Climax, resolution, denouement

9. ADVANCED ELEMENTS:
   - INTERCUT — INTERCUT BETWEEN: for parallel action
   - MONTAGE — clearly labeled with individual shots
   - FLASHBACK — FLASHBACK: and END FLASHBACK.
   - SUPER: "Title cards or on-screen text"
   - SERIES OF SHOTS — for rapid sequences
   - BEGIN/END for dream sequences, fantasies

10. PACING:
    - 1 page ≈ 1 minute of screen time
    - Vary scene length: short punchy scenes build tension, longer scenes allow character depth
    - End scenes on a hook — cut out before the scene feels "done"
    - Use "beat" in action lines for dramatic pauses

=== WRITING QUALITY ===

- Every scene must ADVANCE PLOT or REVEAL CHARACTER (ideally both)
- Show, don't tell — use visual storytelling
- Create memorable, quotable dialogue
- Build tension through escalating stakes and ticking clocks
- Plant setups early that pay off later (Chekhov's gun)
- Give antagonists compelling motivations — no one is evil for evil's sake
- Use dramatic irony — let the audience know things characters don't
- Create emotional contrast — humor before tragedy, calm before storm
- End the screenplay with an image that resonates and lingers

FADE OUT. — Always the last line of the screenplay.`,
            },
            {
              role: "user",
              content: `Write a complete, professional Hollywood screenplay for:

TITLE: ${project.title}
GENRE: ${project.genre || "Drama"}
RATING: ${project.rating || "PG-13"}
TARGET DURATION: ${project.duration || 90} minutes (approximately ${project.duration || 90} pages)
TONE: ${project.tone || "compelling and cinematic"}
SETTING: ${project.setting || "contemporary"}
THEMES: ${project.themes || "human connection, transformation"}

LOGLINE/PLOT:
${project.plotSummary || project.description || "A compelling story that explores the human condition."}

${project.mainPlot ? `MAIN PLOT:\n${project.mainPlot}` : ""}
${project.sidePlots ? `SUBPLOTS:\n${project.sidePlots}` : ""}
${project.plotTwists ? `KEY TWISTS:\n${project.plotTwists}` : ""}
${project.openingScene ? `OPENING:\n${project.openingScene}` : ""}
${project.climax ? `CLIMAX:\n${project.climax}` : ""}
${project.storyResolution ? `RESOLUTION:\n${project.storyResolution}` : ""}
${project.characterArcs ? `CHARACTER ARCS:\n${project.characterArcs}` : ""}

CHARACTERS:
${charBlock || "(Create compelling, three-dimensional original characters with distinct voices, clear motivations, and meaningful arcs.)"}

${sceneBlock ? `SCENE OUTLINE:\n${sceneBlock}\n\nUse this outline as a guide but expand each scene with full dialogue, action lines, and cinematic detail.` : ""}

${input.instructions ? `DIRECTOR'S NOTES: ${input.instructions}` : ""}

Write the COMPLETE screenplay from FADE IN: to FADE OUT. Include:
- A compelling cold open or opening image
- Full dialogue for every scene with distinct character voices
- Detailed action lines describing what the camera sees
- Proper scene headings for every location change
- Transitions between major sequences
- A powerful, resonant ending
- Approximately ${Math.max(8, Math.round((project.duration || 90) / 8))} to ${Math.max(15, Math.round((project.duration || 90) / 5))} scenes`,
            },
          ],
        });
        } catch (_llmErr_script_writer_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_script_writer_ai, "script_writer_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }

        const scriptContent = llmResult.choices[0]?.message?.content || "";
        const pageEstimate = Math.max(1, Math.round((typeof scriptContent === "string" ? scriptContent : "").length / 3000));

        const script = await db.createScript({
          projectId: project.id,
          userId: ctx.user.id,
          title: `${project.title} — Screenplay`,
          content: typeof scriptContent === "string" ? scriptContent : "",
          pageCount: pageEstimate,
          metadata: {
            genre: project.genre,
            rating: project.rating,
            generatedBy: "ai",
            instructions: input.instructions || null,
          },
        });

        return script;
      }),

    // AI: Continue writing / assist with a section
    aiAssist: protectedProcedure
      .input(z.object({
        scriptId: z.number(),
        action: z.enum(["continue", "rewrite", "dialogue", "action-line", "transition"]),
        selectedText: z.string().optional(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIScriptGen", "AI Script Assistant");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.dialogue_editor_ai.cost, "dialogue_editor_ai", `AI script assist: ${input.action}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const script = await db.getScriptById(input.scriptId);
        if (!script) throw new Error("Script not found");

        const actionPrompts: Record<string, string> = {
          continue: "Continue writing the screenplay from where it left off. Maintain the same tone, style, and formatting. Write the next 2-3 scenes.",
          rewrite: `Rewrite the following section while maintaining proper screenplay format and improving the quality:\n\n${input.selectedText || ""}`,
          dialogue: `Write compelling dialogue for this section. The dialogue should feel natural and cinematic:\n\n${input.selectedText || input.instructions || "Write a dialogue exchange between the main characters."}`,
          "action-line": `Write vivid, cinematic action lines for this moment:\n\n${input.selectedText || input.instructions || "Describe the scene action."}`,
          transition: `Suggest an appropriate scene transition for:\n\n${input.selectedText || input.instructions || "Moving to the next scene."}`,
        };

        let _llmRefundAmount_dialogue_editor_ai = 2;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional Hollywood screenwriter. Write in proper industry-standard screenplay format. Be vivid, concise, and cinematic.",
            },
            {
              role: "user",
              content: `Current script context (last 2000 chars):\n${(script.content || "").slice(-2000)}\n\n${actionPrompts[input.action]}\n\n${input.instructions ? `Director notes: ${input.instructions}` : ""}`,
            },
          ],
        });
        } catch (_llmErr_dialogue_editor_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }

        const result = llmResult.choices[0]?.message?.content || "";
        return { text: typeof result === "string" ? result : "" };
      }),
  }),

  // ─── Soundtracks ───
  soundtrack: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectSoundtracks(input.projectId);
      }),

    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ input }) => {
        return db.getSceneSoundtracks(input.sceneId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSoundtrackById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().nullable().optional(),
        title: z.string().min(1).max(255),
        artist: z.string().max(255).optional(),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        startTime: z.number().min(0).optional(),
        volume: z.number().min(0).max(1).optional(),
        fadeIn: z.number().min(0).optional(),
        fadeOut: z.number().min(0).optional(),
        loop: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSoundtrack({ ...input, userId: ctx.user.id });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        artist: z.string().max(255).optional(),
        genre: z.string().max(128).optional(),
        mood: z.string().max(128).optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        startTime: z.number().min(0).optional(),
        volume: z.number().min(0).max(1).optional(),
        fadeIn: z.number().min(0).optional(),
        fadeOut: z.number().min(0).optional(),
        loop: z.number().min(0).max(1).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateSoundtrack(id, ctx.user.id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSoundtrack(input.id, ctx.user.id);
        return { success: true };
      }),

    // Upload audio file
    uploadAudio: protectedProcedure
      .input(z.object({
        base64: z.string().max(70_000_000, "File too large. Max 50MB."),
        filename: z.string(),
        contentType: z.string().default("audio/mpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `soundtracks/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
  }),

  // ─── Credits ───
  credit: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectCredits(input.projectId);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        role: z.string().min(1).max(128),
        name: z.string().min(1).max(255),
        characterName: z.string().max(255).optional(),
        orderIndex: z.number().optional(),
        section: z.enum(["opening", "closing"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCredit({ ...input, userId: ctx.user.id });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        role: z.string().min(1).max(128).optional(),
        name: z.string().min(1).max(255).optional(),
        characterName: z.string().max(255).optional(),
        orderIndex: z.number().optional(),
        section: z.enum(["opening", "closing"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateCredit(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCredit(input.id);
        return { success: true };
      }),
  }),

  // ─── Project Duplication ───
  projectDuplicate: router({
    duplicate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.duplicateProject(input.projectId, ctx.user.id);
      }),
  }),

  // ─── Shot List Generator ───
  shotList: router({
    generate: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseShotList", "Shot List Generator");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.shot_list_ai.cost, "shot_list_ai", `Shot list generation for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const allScenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} | Time: ${s.timeOfDay} | Location: ${s.locationType} | Camera: ${s.cameraAngle} | Lighting: ${s.lighting} | Weather: ${s.weather} | Mood: ${s.mood} | Duration: ${s.duration}s | Transition: ${s.transitionType || 'cut'}`
        ).join("\n");

        const charList = characters.map(c => `${c.name}: ${c.description || 'no description'}`).join("\n");

        let _llmRefundAmount_shot_list_ai = 2;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional film production assistant. Generate a detailed, industry-standard shot list from the given scenes. Include shot number, scene reference, shot type, camera movement, lens, framing, action/description, dialogue cues, props needed, wardrobe notes, and special effects. Format as a structured JSON array.",
            },
            {
              role: "user",
              content: `Film: ${project.title} (${project.genre || 'Drama'}, ${project.rating || 'PG-13'})\n\nScenes:\n${sceneDescriptions}\n\nCharacters:\n${charList}\n\nGenerate a professional shot list with 2-4 shots per scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shot_list",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  shots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shotNumber: { type: "string" },
                        sceneTitle: { type: "string" },
                        shotType: { type: "string" },
                        cameraMovement: { type: "string" },
                        lens: { type: "string" },
                        framing: { type: "string" },
                        action: { type: "string" },
                        dialogue: { type: "string" },
                        props: { type: "string" },
                        wardrobe: { type: "string" },
                        vfx: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["shotNumber", "sceneTitle", "shotType", "cameraMovement", "lens", "framing", "action", "dialogue", "props", "wardrobe", "vfx", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["shots"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_shot_list_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_shot_list_ai, "shot_list_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }

        const content = llmResult.choices[0]?.message?.content;
        try {
          return JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid shot list data. Please try again.");
        }
      }),
  }),

  // ─── Continuity Check ───
  continuity: router({
    check: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseContinuityCheck", "Continuity Check");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.continuity_check_ai.cost, "continuity_check_ai", `Continuity check for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const allScenes = await db.getProjectScenes(project.id);
        const characters = await db.getProjectCharacters(project.id);

        const sceneDescriptions = allScenes.map((s, i) =>
          `Scene ${i + 1} "${s.title}": ${s.description} | Time: ${s.timeOfDay} | Location: ${s.locationType} | Weather: ${s.weather} | Characters: ${(s.characterIds as number[] || []).map(id => characters.find(c => c.id === id)?.name || 'Unknown').join(', ')} | Vehicles: ${s.vehicleType || 'none'} | Real Estate: ${s.realEstateStyle || 'none'}`
        ).join("\n");

        const charList = characters.map(c => {
          const attrs = c.attributes as any || {};
          return `${c.name}: ${c.description || ''} | Hair: ${attrs.hairColor || 'unknown'} | Build: ${attrs.build || 'unknown'} | Clothing: ${attrs.clothingStyle || 'unknown'}`;
        }).join("\n");

        let _llmRefundAmount_continuity_check_ai = 2;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a professional script supervisor / continuity checker for Hollywood films. Analyze the scenes for continuity errors including: wardrobe changes between consecutive scenes, time-of-day inconsistencies, weather changes that don't make sense, character presence/absence issues, prop and vehicle continuity, location logic. Return a JSON array of issues found.",
            },
            {
              role: "user",
              content: `Film: ${project.title}\n\nScenes (in order):\n${sceneDescriptions}\n\nCharacters:\n${charList}\n\nCheck for continuity errors between adjacent scenes and across the film.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "continuity_report",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        severity: { type: "string" },
                        category: { type: "string" },
                        scenes: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["severity", "category", "scenes", "description", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string" },
                },
                required: ["issues", "summary"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_continuity_check_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_continuity_check_ai, "continuity_check_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }

        const content = llmResult.choices[0]?.message?.content;
        try {
          return JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid continuity data. Please try again.");
        }
      }),
  }),

  // ─── Location Scout ───
  location: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectLocations(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLocationById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().nullable().optional(),
        name: z.string().min(1).max(255),
        address: z.string().max(512).optional(),
        locationType: z.string().max(128).optional(),
        description: z.string().optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createLocation({
          ...input,
          userId: ctx.user.id,
          sceneId: input.sceneId ?? null,
          referenceImages: input.referenceImages || [],
          tags: input.tags || [],
        });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        address: z.string().max(512).optional(),
        locationType: z.string().max(128).optional(),
        description: z.string().optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sceneId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateLocation(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLocation(input.id);
        return { success: true };
      }),

    aiSuggest: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneDescription: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAILocationSuggest", "AI Location Suggestions");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.location_scout_ai.cost, "location_scout_ai", `Location suggestions for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const sceneContext = input.sceneDescription || scenes.map((s, i) => `Scene ${i+1}: ${s.description || s.title} (${s.locationType || 'unspecified'})`).join("\n");

        let _llmRefundAmount_location_scout_ai = 1;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional film location scout. Suggest ideal filming locations based on the scene descriptions. For each location, provide a name, type, description of the setting, visual characteristics, practical notes for filming, and relevant tags. Return as JSON." },
            { role: "user", content: `Film: ${project.title} (${project.genre || 'Drama'})\n\nScenes:\n${sceneContext}\n\nSuggest 5-8 ideal filming locations.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "location_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  locations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        locationType: { type: "string" },
                        description: { type: "string" },
                        visualStyle: { type: "string" },
                        practicalNotes: { type: "string" },
                        tags: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "locationType", "description", "visualStyle", "practicalNotes", "tags"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["locations"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_location_scout_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_location_scout_ai, "location_scout_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 1 credit have been refunded." });
        }
        const content = llmResult.choices[0]?.message?.content;
        try {
          return JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid location data. Please try again.");
        }
      }),

    generateImage: protectedProcedure
      .input(z.object({ description: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.location_scout_ai.cost, "location_scout_ai", `Location image: ${input.description.substring(0, 50)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const { url } = await generateImage({
          prompt: `Professional film location reference photo: ${input.description}. Photorealistic, cinematic lighting, wide establishing shot, ARRI ALEXA camera quality, golden hour atmosphere.`,
        });
        return { url };
      }),
  }),

  // ─── Mood Board ───
  moodBoard: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectMoodBoard(input.projectId);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        type: z.enum(["image", "color", "text", "reference"]),
        imageUrl: z.string().optional(),
        text: z.string().optional(),
        color: z.string().max(32).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().max(128).optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMoodBoardItem({
          ...input,
          userId: ctx.user.id,
          tags: input.tags || [],
        });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        text: z.string().optional(),
        color: z.string().max(32).optional(),
        tags: z.array(z.string()).optional(),
        category: z.string().max(128).optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateMoodBoardItem(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMoodBoardItem(input.id);
        return { success: true };
      }),

    generateImage: protectedProcedure
      .input(z.object({ prompt: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Deduct 1 credit for mood board image generation (same as preview image)
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_preview_image.cost, "generate_preview_image", `Mood board image: ${input.prompt.substring(0, 50)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const { url } = await generateImage({
          prompt: `Cinematic mood board reference: ${input.prompt}. Artistic, atmospheric, film production quality.`,
        });
        return { url };
      }),
  }),

  // ─── Subtitles ───
  subtitle: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectSubtitles(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSubtitleById(input.id);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        language: z.string().min(1).max(32),
        languageName: z.string().min(1).max(128),
        entries: z.array(z.object({
          sceneId: z.number().optional(),
          startTime: z.number(),
          endTime: z.number(),
          text: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSubtitle({
          ...input,
          userId: ctx.user.id,
          entries: input.entries || [],
        });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        entries: z.array(z.object({
          sceneId: z.number().optional(),
          startTime: z.number(),
          endTime: z.number(),
          text: z.string(),
        })).optional(),
        language: z.string().min(1).max(32).optional(),
        languageName: z.string().min(1).max(128).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateSubtitle(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSubtitle(input.id);
        return { success: true };
      }),

    aiGenerate: protectedProcedure
      .input(z.object({ projectId: z.number(), language: z.string().default("en"), languageName: z.string().default("English") }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAISubtitleGen", "AI Subtitle Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.subtitle_gen_ai.cost, "subtitle_gen_ai", `Subtitle generation for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const characters = await db.getProjectCharacters(input.projectId);

        const sceneContext = scenes.map((s, i) => {
          const charNames = (s.characterIds as number[] || []).map(id => characters.find(c => c.id === id)?.name || 'Unknown').join(', ');
          return `Scene ${i+1} "${s.title}" (${s.duration || 30}s): ${s.description || 'No description'} | Characters: ${charNames} | Dialogue: ${s.dialogueText || 'none'}`;
        }).join("\n");

        let _llmRefundAmount_subtitle_gen_ai = 3;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional subtitle writer for films. Generate accurate, well-timed subtitles in ${input.languageName} for the given scenes. Each subtitle entry should have a scene reference, start time (seconds from film start), end time, and the subtitle text. Keep subtitles concise (max 2 lines, 42 chars per line). Include both dialogue and important sound descriptions [in brackets]. Return as JSON.` },
            { role: "user", content: `Film: ${project.title} (${project.genre || 'Drama'}, ${project.rating || 'PG-13'})\nTotal Duration: ${project.duration || 90} minutes\n\nScenes:\n${sceneContext}\n\nGenerate subtitles in ${input.languageName} for the entire film.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "subtitle_entries",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "number" },
                        endTime: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["startTime", "endTime", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entries"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_subtitle_gen_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_subtitle_gen_ai, "subtitle_gen_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }

        const content = llmResult.choices[0]?.message?.content;
        let parsed: any;
        try {
          parsed = JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid subtitle data. Please try again.");
        }

        return db.createSubtitle({
          projectId: input.projectId,
          userId: ctx.user.id,
          language: input.language,
          languageName: input.languageName,
          entries: parsed.entries,
          isGenerated: 1,
        });
      }),

    aiTranslate: protectedProcedure
      .input(z.object({
        subtitleId: z.number(),
        targetLanguage: z.string().min(1).max(32),
        targetLanguageName: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAISubtitleGen", "AI Subtitle Translation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.subtitle_gen_ai.cost, "subtitle_gen_ai", `Subtitle translation to ${input.targetLanguageName}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const source = await db.getSubtitleById(input.subtitleId);
        if (!source) throw new Error("Source subtitle not found");
        const entries = source.entries as any[] || [];
        const subtitleText = entries.map((e: any) => `[${e.startTime}-${e.endTime}] ${e.text}`).join("\n");

        let _llmRefundAmount_subtitle_gen_ai = 3;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            { role: "system", content: `You are a professional film subtitle translator. Translate the following subtitles from ${source.languageName} to ${input.targetLanguageName}. Maintain the exact same timing. Keep translations natural and culturally appropriate. Preserve [sound descriptions] in brackets but translate them. Return as JSON with the same structure.` },
            { role: "user", content: `Translate these subtitles to ${input.targetLanguageName}:\n\n${subtitleText}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "translated_entries",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "number" },
                        endTime: { type: "number" },
                        text: { type: "string" },
                      },
                      required: ["startTime", "endTime", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entries"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_subtitle_gen_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_subtitle_gen_ai, "subtitle_gen_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }

        const content = llmResult.choices[0]?.message?.content;
        let parsed: any;
        try {
          parsed = JSON.parse(typeof content === "string" ? content : "");
        } catch {
          throw new Error("AI returned invalid translation data. Please try again.");
        }

        return db.createSubtitle({
          projectId: source.projectId,
          userId: ctx.user.id,
          language: input.targetLanguage,
          languageName: input.targetLanguageName,
          entries: parsed.entries,
          isGenerated: 1,
          isTranslation: 1,
          sourceLanguage: source.language,
        });
      }),
  }),

  // ─── Dialogues ───
  dialogue: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.sceneId) return db.getSceneDialogues(input.sceneId);
        return db.getProjectDialogues(input.projectId);
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        characterId: z.number().optional(),
        characterName: z.string().min(1),
        line: z.string().min(1),
        emotion: z.string().optional(),
        direction: z.string().optional(),
        orderIndex: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createDialogue({ ...input, userId: ctx.user.id });
      }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        characterName: z.string().optional(),
        line: z.string().optional(),
        emotion: z.string().optional(),
        direction: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateDialogue(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDialogue(input.id);
        return { success: true };
      }),

    aiSuggest: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        characterName: z.string(),
        characterDescription: z.string().optional(),
        context: z.string().optional(), // previous dialogue lines for context
        emotion: z.string().optional(),
        direction: z.string().optional(), // e.g. "character is nervous"
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIDialogueGen", "AI Dialogue Suggestions");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.dialogue_editor_ai.cost, "dialogue_editor_ai", `Dialogue suggestion for ${input.characterName}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, 0).catch(() => null);
        let _llmRefundAmount_dialogue_editor_ai = 2;
        let response: any;
        try {
        response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional screenwriter generating dialogue for a director. Your job is to faithfully serve the director's vision.

DIRECTOR-FIRST RULES:
- Write dialogue that directly serves the scene's stated purpose, character, and emotion as described by the director.
- Do NOT add subtext, themes, or character traits the director did not specify.
- Do NOT invent backstory, relationships, or motivations beyond what is provided.
- Match the character's description exactly as given.
- ONLY add creative flair if the director explicitly requests it.
- Return a JSON object with: { "lines": [{ "line": "...", "emotion": "...", "direction": "..." }] }
- Generate 3 alternative dialogue options that each faithfully serve the stated scene purpose.
- Keep lines concise and direct.`,
            },
            {
              role: "user",
              content: `Film: ${project?.title || "Untitled"} (${project?.genre || "Drama"}, ${project?.rating || "PG-13"})
Plot: ${project?.plotSummary || "Not specified"}
Character: ${input.characterName}${input.characterDescription ? ` — ${input.characterDescription}` : ""}
${input.context ? `Previous dialogue:\n${input.context}` : ""}
${input.emotion ? `Emotion: ${input.emotion}` : ""}
${input.direction ? `Direction: ${input.direction}` : ""}

Generate 3 dialogue line options for this character.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "dialogue_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["lines"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_dialogue_editor_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }
        try {
          return JSON.parse(response.choices[0].message.content as string || "{}");
        } catch {
          throw new Error("AI returned invalid dialogue suggestions. Please try again.");
        }
      }),

    aiGenerateScene: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number(),
        sceneDescription: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIDialogueGen", "AI Scene Dialogue Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.dialogue_editor_ai.cost, "dialogue_editor_ai", `Scene dialogue generation for scene ${input.sceneId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, 0).catch(() => null);
        const scene = await db.getSceneById(input.sceneId);
        const chars = await db.getProjectCharacters(input.projectId);
        const charNames = chars.map(c => c.name).join(", ");

        let _llmRefundAmount_dialogue_editor_ai = 2;
        let response: any;
        try {
        response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional screenwriter generating scene dialogue for a director. Your job is to faithfully serve the director's exact vision.

DIRECTOR-FIRST RULES:
- Write dialogue that directly serves the scene's stated description, mood, and characters as provided by the director.
- Do NOT add new characters, subplots, backstory, or themes the director did not describe.
- Do NOT invent character motivations or relationships beyond what is provided.
- Match the film's tone, genre, and rating as specified.
- ONLY add creative interpretation if the director explicitly requests it.
- Return JSON: { "dialogues": [{ "characterName": "...", "line": "...", "emotion": "...", "direction": "..." }] }
- Generate 5-15 dialogue lines that faithfully serve the stated scene purpose.`,
            },
            {
              role: "user",
              content: `Film: ${project?.title || "Untitled"} (${project?.genre || "Drama"}, ${project?.rating || "PG-13"})
Plot: ${project?.plotSummary || ""}
Scene: ${scene?.title || ""} — ${scene?.description || input.sceneDescription || ""}
Time: ${scene?.timeOfDay || "afternoon"}, Weather: ${scene?.weather || "clear"}, Mood: ${scene?.mood || "neutral"}
Available Characters: ${charNames || "Generic characters"}

Generate the full dialogue for this scene.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "scene_dialogue",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  dialogues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        characterName: { type: "string" },
                        line: { type: "string" },
                        emotion: { type: "string" },
                        direction: { type: "string" },
                      },
                      required: ["characterName", "line", "emotion", "direction"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["dialogues"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_dialogue_editor_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }
        try {
          return JSON.parse(response.choices[0].message.content as string || "{}");
        } catch {
          throw new Error("AI returned invalid scene dialogue. Please try again.");
        }
      }),
  }),

  // ─── Budget Estimator ───
  budget: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.getProjectBudgets(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getBudgetById(input.id);
      }),

    generate: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIBudgetGen", "AI Budget Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.budget_estimate_ai.cost, "budget_estimate_ai", `Budget estimate for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(input.projectId);
        const chars = await db.getProjectCharacters(input.projectId);
        const locations = await db.getProjectLocations(input.projectId);
        const soundtracks = await db.getProjectSoundtracks(input.projectId);

        const sceneDetails = scenes.map(s => `Scene "${s.title}": ${s.locationType || "studio"}, ${s.weather}, ${s.lighting}, vehicles: ${s.vehicleType || "none"}, ${s.duration}s`).join("\n");

        let _llmRefundAmount_budget_estimate_ai = 2;
        let response: any;
        try {
        response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a Hollywood production budget analyst. Analyze the film project details and generate a realistic production budget estimate.

Rules:
- Provide realistic Hollywood-scale budget estimates
- Break down into standard production categories
- Consider scene complexity, locations, VFX needs, cast size, equipment
- Include both above-the-line and below-the-line costs
- Return JSON with this exact structure:
{
  "totalEstimate": number,
  "currency": "USD",
  "breakdown": {
    "preProduction": { "label": "Pre-Production", "estimate": number, "items": [{ "name": "...", "cost": number, "notes": "..." }] },
    "cast": { "label": "Cast & Talent", "estimate": number, "items": [...] },
    "crew": { "label": "Crew & Labor", "estimate": number, "items": [...] },
    "locations": { "label": "Locations & Sets", "estimate": number, "items": [...] },
    "equipment": { "label": "Equipment & Technology", "estimate": number, "items": [...] },
    "vfx": { "label": "Visual Effects & CGI", "estimate": number, "items": [...] },
    "music": { "label": "Music & Sound", "estimate": number, "items": [...] },
    "postProduction": { "label": "Post-Production", "estimate": number, "items": [...] },
    "marketing": { "label": "Marketing & Distribution", "estimate": number, "items": [...] },
    "contingency": { "label": "Contingency (10%)", "estimate": number, "items": [...] }
  },
  "analysis": "A 2-3 paragraph analysis of the budget..."
}`,
            },
            {
              role: "user",
              content: `Film: ${project.title}
Genre: ${project.genre || "Drama"}
Rating: ${project.rating}
Duration: ${project.duration || 90} minutes
Plot: ${project.plotSummary || "Not specified"}
Number of scenes: ${scenes.length}
Scene details:\n${sceneDetails || "No scenes defined yet"}
Number of characters: ${chars.length}
Character names: ${chars.map(c => c.name).join(", ") || "None"}
Locations: ${locations.map(l => `${l.name} (${l.locationType})`).join(", ") || "None specified"}
Soundtracks: ${soundtracks.length} tracks
Color Grading: ${project.colorGrading || "natural"}

Generate a detailed production budget estimate.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "budget_estimate",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  totalEstimate: { type: "number" },
                  currency: { type: "string" },
                  breakdown: {
                    type: "object",
                    properties: {
                      preProduction: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      cast: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      crew: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      locations: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      equipment: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      vfx: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      music: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      postProduction: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      marketing: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                      contingency: { type: "object", properties: { label: { type: "string" }, estimate: { type: "number" }, items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, cost: { type: "number" }, notes: { type: "string" } }, required: ["name", "cost", "notes"], additionalProperties: false } } }, required: ["label", "estimate", "items"], additionalProperties: false },
                    },
                    required: ["preProduction", "cast", "crew", "locations", "equipment", "vfx", "music", "postProduction", "marketing", "contingency"],
                    additionalProperties: false,
                  },
                  analysis: { type: "string" },
                },
                required: ["totalEstimate", "currency", "breakdown", "analysis"],
                additionalProperties: false,
              },
            },
          },
        });
        } catch (_llmErr_budget_estimate_ai: any) {
          // Refund credits — LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_budget_estimate_ai, "budget_estimate_ai_refund", "Refund: AI call failed — credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }

        let parsed: any;
        try {
          parsed = JSON.parse(response.choices[0].message.content as string || "{}");
        } catch {
          throw new Error("AI returned invalid budget data. Please try again.");
        }
        return db.createBudget({
          projectId: input.projectId,
          userId: ctx.user.id,
          totalEstimate: parsed.totalEstimate,
          currency: parsed.currency || "USD",
          breakdown: parsed.breakdown,
          aiAnalysis: parsed.analysis,
        });
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const budget = await db.getBudgetById(input.id);
        if (!budget || budget.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
        await db.deleteBudget(input.id);
        return { success: true };
      }),
   }),

  // ─── Sound Effects Library ───
  soundEffect: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listSoundEffectsByProject(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ input }) => {
        return db.listSoundEffectsByScene(input.sceneId);
      }),
    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        duration: z.number().optional(),
        isCustom: z.number().optional(),
        volume: z.number().min(0).max(1).optional(),
        startTime: z.number().optional(),
        loop: z.number().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createSoundEffect({ ...input, userId: ctx.user!.id });
      }),
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string().max(70_000_000, "File too large. Max 50MB."), // base64
        contentType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const key = `sfx/${ctx.user!.id}/${input.projectId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
    update: creationProcedure
      .input(z.object({
        id: z.number(),
        sceneId: z.number().optional().nullable(),
        name: z.string().optional(),
        volume: z.number().min(0).max(1).optional(),
        startTime: z.number().optional(),
        loop: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateScene(id, data as any);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSoundEffect(input.id);
        return { success: true };
      }),
    // Generate a sound effect from a text description using ElevenLabs Sound Effects API
    generateFromText: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        prompt: z.string().min(1).max(500),
        durationSeconds: z.number().min(1).max(30).optional(),
        name: z.string().optional(),
        category: z.string().optional(),
        startTime: z.number().optional(),
        volume: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Credits: deduct for AI sound effect generation
        requireFeature(ctx.user, "canUseSoundEffects", "AI Sound Effect Generation");
        requireGenerationQuota(ctx.user);
        try {
          await db.deductCredits(ctx.user!.id, CREDIT_COSTS.sfx_generate_from_text.cost, "sfx_generate_from_text", `AI SFX: ${input.prompt.slice(0, 60)}`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message });
        }
        const userKeys = await db.getUserApiKeys(ctx.user!.id);
        const elevenlabsKey = userKeys.elevenlabsKey;
        if (!elevenlabsKey) {
          throw new Error("ElevenLabs API key not configured. Please add your ElevenLabs key in API Keys settings.");
        }

        // Call ElevenLabs Sound Effects Generation API
        const sfxResp = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text: input.prompt,
            duration_seconds: input.durationSeconds ?? 10.0,
            prompt_influence: 0.3,
          }),
        });

        if (!sfxResp.ok) {
          const errText = await sfxResp.text();
          throw new Error(`ElevenLabs sound generation failed: ${sfxResp.status} ${errText}`);
        }

        const audioBuffer = Buffer.from(await sfxResp.arrayBuffer());
        const safeName = (input.name || input.prompt.slice(0, 30)).replace(/[^a-zA-Z0-9-_]/g, "-");
        const key = `sfx/${ctx.user!.id}/${input.projectId}/${nanoid()}-${safeName}.mp3`;
        const { url } = await storagePut(key, audioBuffer, "audio/mpeg");

        // Save to DB
        const sfx = await db.createSoundEffect({
          projectId: input.projectId,
          sceneId: input.sceneId,
          userId: ctx.user!.id,
          name: input.name || input.prompt.slice(0, 80),
          category: input.category || "Generated",
          fileUrl: url,
          fileKey: key,
          duration: input.durationSeconds ?? 10,
          isCustom: 1,
          volume: input.volume ?? 0.9,
          startTime: input.startTime ?? 0,
        });

        return { sfx, url };
      }),

    // Standard preset library
    presets: publicProcedure.query(() => {
      return [
        // Footsteps
        { name: "Footsteps - Concrete", category: "footsteps", tags: ["walk", "urban", "street"] },
        { name: "Footsteps - Gravel", category: "footsteps", tags: ["outdoor", "path", "crunch"] },
        { name: "Footsteps - Wood Floor", category: "footsteps", tags: ["indoor", "house", "creak"] },
        { name: "Footsteps - Running", category: "footsteps", tags: ["fast", "chase", "action"] },
        { name: "Footsteps - High Heels", category: "footsteps", tags: ["click", "elegant", "indoor"] },
        { name: "Footsteps - Snow", category: "footsteps", tags: ["crunch", "winter", "cold"] },
        // Weather
        { name: "Light Rain", category: "weather", tags: ["drizzle", "gentle", "calm"] },
        { name: "Heavy Rain", category: "weather", tags: ["downpour", "storm", "intense"] },
        { name: "Thunder Crack", category: "weather", tags: ["storm", "loud", "dramatic"] },
        { name: "Thunder Rolling", category: "weather", tags: ["distant", "rumble", "atmosphere"] },
        { name: "Wind Howling", category: "weather", tags: ["strong", "eerie", "outdoor"] },
        { name: "Wind Gentle Breeze", category: "weather", tags: ["soft", "calm", "nature"] },
        { name: "Hailstorm", category: "weather", tags: ["ice", "pelting", "intense"] },
        // Nature
        { name: "Birds Chirping", category: "nature", tags: ["morning", "forest", "peaceful"] },
        { name: "Ocean Waves", category: "nature", tags: ["beach", "calm", "rhythmic"] },
        { name: "River Stream", category: "nature", tags: ["water", "flowing", "nature"] },
        { name: "Crickets Night", category: "nature", tags: ["evening", "rural", "ambient"] },
        { name: "Wolf Howl", category: "nature", tags: ["night", "wild", "eerie"] },
        { name: "Horse Gallop", category: "nature", tags: ["riding", "western", "fast"] },
        { name: "Dog Barking", category: "nature", tags: ["pet", "alert", "domestic"] },
        // Vehicles
        { name: "Car Engine Start", category: "vehicles", tags: ["ignition", "motor", "drive"] },
        { name: "Car Driving By", category: "vehicles", tags: ["pass", "road", "traffic"] },
        { name: "Car Screech / Brakes", category: "vehicles", tags: ["stop", "emergency", "tires"] },
        { name: "Car Crash", category: "vehicles", tags: ["accident", "impact", "metal"] },
        { name: "Motorcycle Rev", category: "vehicles", tags: ["engine", "loud", "bike"] },
        { name: "Helicopter", category: "vehicles", tags: ["chopper", "blades", "aerial"] },
        { name: "Jet Flyover", category: "vehicles", tags: ["airplane", "fast", "loud"] },
        { name: "Train Horn", category: "vehicles", tags: ["railway", "warning", "loud"] },
        { name: "Boat Motor", category: "vehicles", tags: ["water", "engine", "marine"] },
        // Impacts & Action
        { name: "Explosion Large", category: "impacts", tags: ["blast", "boom", "action"] },
        { name: "Explosion Small", category: "impacts", tags: ["pop", "burst", "minor"] },
        { name: "Gunshot Single", category: "impacts", tags: ["weapon", "shot", "loud"] },
        { name: "Gunshot Burst", category: "impacts", tags: ["automatic", "rapid", "action"] },
        { name: "Punch Hit", category: "impacts", tags: ["fight", "body", "combat"] },
        { name: "Glass Breaking", category: "impacts", tags: ["shatter", "crash", "window"] },
        { name: "Metal Clang", category: "impacts", tags: ["hit", "ring", "sword"] },
        { name: "Sword Clash", category: "impacts", tags: ["metal", "fight", "medieval"] },
        { name: "Whip Crack", category: "impacts", tags: ["snap", "sharp", "fast"] },
        // Doors & Interiors
        { name: "Door Open Creak", category: "doors", tags: ["old", "horror", "slow"] },
        { name: "Door Slam", category: "doors", tags: ["close", "loud", "angry"] },
        { name: "Door Knock", category: "doors", tags: ["tap", "visitor", "entrance"] },
        { name: "Door Lock / Unlock", category: "doors", tags: ["key", "click", "secure"] },
        { name: "Elevator Ding", category: "doors", tags: ["bell", "arrive", "floor"] },
        { name: "Window Open", category: "doors", tags: ["slide", "air", "room"] },
        // Ambient
        { name: "City Traffic", category: "ambient", tags: ["urban", "busy", "cars"] },
        { name: "Crowd Murmur", category: "ambient", tags: ["people", "chatter", "background"] },
        { name: "Restaurant Ambience", category: "ambient", tags: ["dining", "clinking", "chatter"] },
        { name: "Office Ambience", category: "ambient", tags: ["typing", "phone", "work"] },
        { name: "Hospital Ambience", category: "ambient", tags: ["beep", "intercom", "quiet"] },
        { name: "Spaceship Hum", category: "ambient", tags: ["sci-fi", "engine", "space"] },
        { name: "Underwater", category: "ambient", tags: ["bubbles", "muffled", "deep"] },
        { name: "Forest Ambience", category: "ambient", tags: ["trees", "leaves", "peaceful"] },
        // Electronic & UI
        { name: "Phone Ringing", category: "electronic", tags: ["call", "ring", "alert"] },
        { name: "Phone Vibrate", category: "electronic", tags: ["buzz", "notification", "silent"] },
        { name: "Computer Beep", category: "electronic", tags: ["alert", "tech", "interface"] },
        { name: "Alarm Clock", category: "electronic", tags: ["wake", "morning", "beep"] },
        { name: "Camera Shutter", category: "electronic", tags: ["photo", "click", "snap"] },
        { name: "Radio Static", category: "electronic", tags: ["noise", "tuning", "vintage"] },
        // Horror & Suspense
        { name: "Heartbeat", category: "horror", tags: ["pulse", "tension", "suspense"] },
        { name: "Creepy Whisper", category: "horror", tags: ["voice", "eerie", "ghost"] },
        { name: "Chains Rattling", category: "horror", tags: ["metal", "prison", "dark"] },
        { name: "Scream Female", category: "horror", tags: ["terror", "loud", "fear"] },
        { name: "Scream Male", category: "horror", tags: ["terror", "loud", "fear"] },
        { name: "Eerie Drone", category: "horror", tags: ["atmosphere", "dark", "tension"] },
        // Musical
        { name: "Dramatic Stinger", category: "musical", tags: ["hit", "reveal", "impact"] },
        { name: "Suspense Rise", category: "musical", tags: ["tension", "build", "climax"] },
        { name: "Comic Boing", category: "musical", tags: ["funny", "cartoon", "bounce"] },
        { name: "Sad Violin", category: "musical", tags: ["emotional", "cry", "drama"] },
        { name: "Victory Fanfare", category: "musical", tags: ["win", "triumph", "celebration"] },
        { name: "Clock Ticking", category: "musical", tags: ["time", "countdown", "tension"] },
      ];
    }),

    // Generate angelic choir or bird wing sounds using ElevenLabs TTS voices
    // Uses the /v1/text-to-speech endpoint (not sound-generation) to avoid IP blocks
    generateVoiceChoir: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        type: z.enum(["angelic_choir", "dove_wings"]),
        name: z.string().optional(),
        startTime: z.number().optional(),
        volume: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Credits: deduct for AI voice choir generation
        requireFeature(ctx.user, "canUseSoundEffects", "AI Voice Choir Generation");
        requireGenerationQuota(ctx.user);
        try {
          await db.deductCredits(ctx.user!.id, CREDIT_COSTS.sfx_voice_choir.cost, "sfx_voice_choir", `Voice choir: ${input.type}`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message });
        }
        const userKeys = await db.getUserApiKeys(ctx.user!.id);
        const elevenlabsKey = userKeys.elevenlabsKey;
        if (!elevenlabsKey) {
          throw new Error("ElevenLabs API key not configured.");
        }

        // For angelic choir: use Rachel voice (ethereal female soprano)
        // For dove wings: use a breathy, soft voice with specific settings
        const RACHEL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — clear, ethereal female
        const ARIA_VOICE_ID = "9BWtsMINqrJLrRacOk9x"; // Aria — warm, expressive female

        let voiceId: string;
        let text: string;
        let voiceSettings: Record<string, unknown>;
        let sfxName: string;

        if (input.type === "angelic_choir") {
          voiceId = RACHEL_VOICE_ID;
          text = "Aaaaaah... Aaaaaah... Aaaaaah... Aaaaaah...";
          voiceSettings = { stability: 0.3, similarity_boost: 0.6, style: 0.8, use_speaker_boost: true };
          sfxName = input.name || "Angelic Choir - Golden Transformation";
        } else {
          // dove_wings: use a very breathy, airy voice for wing-like sound
          voiceId = ARIA_VOICE_ID;
          text = "Fwwwwsh... fwwwwsh... fwwwwsh... fwwwwsh...";
          voiceSettings = { stability: 0.8, similarity_boost: 0.3, style: 0.1, use_speaker_boost: false };
          sfxName = input.name || "Dove Wing Flap - Landing";
        }

        const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenlabsKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: voiceSettings,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(`ElevenLabs TTS failed: ${resp.status} ${errText}`);
        }

        const audioBuffer = Buffer.from(await resp.arrayBuffer());
        const safeName = sfxName.replace(/[^a-zA-Z0-9-_]/g, "-");
        const key = `sfx/${ctx.user!.id}/${input.projectId}/${nanoid()}-${safeName}.mp3`;
        const { url } = await storagePut(key, audioBuffer, "audio/mpeg");

        const sfx = await db.createSoundEffect({
          projectId: input.projectId,
          sceneId: input.sceneId,
          userId: ctx.user!.id,
          name: sfxName,
          category: input.type === "angelic_choir" ? "Musical" : "Nature",
          fileUrl: url,
          fileKey: key,
          duration: 10,
          isCustom: 1,
          volume: input.volume ?? 0.9,
          startTime: input.startTime ?? 0,
        });

        return { sfx, url };
      }),
  }),
  // ─── Visual Effects (VFX) Database ───
  visualEffect: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listVisualEffectsByProject(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ input }) => {
        return db.listVisualEffectsByScene(input.sceneId);
      }),
    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        name: z.string().min(1).max(255),
        category: z.string().min(1).max(128),
        subcategory: z.string().max(128).optional(),
        description: z.string().optional(),
        previewUrl: z.string().optional(),
        intensity: z.number().min(0).max(1).optional(),
        duration: z.number().optional(),
        startTime: z.number().optional(),
        layer: z.enum(["background", "midground", "foreground", "overlay"]).optional(),
        blendMode: z.string().optional(),
        colorTint: z.string().optional(),
        parameters: z.any().optional(),
        isCustom: z.number().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canUseVisualEffects", "VFX Scene Studio");
        return db.createVisualEffect({
          ...input,
          sceneId: input.sceneId ?? null,
          userId: ctx.user.id,
        });
      }),
    update: creationProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        category: z.string().max(128).optional(),
        subcategory: z.string().max(128).optional(),
        description: z.string().optional(),
        previewUrl: z.string().optional(),
        intensity: z.number().min(0).max(1).optional(),
        duration: z.number().optional(),
        startTime: z.number().optional(),
        layer: z.enum(["background", "midground", "foreground", "overlay"]).optional(),
        blendMode: z.string().optional(),
        colorTint: z.string().optional(),
        parameters: z.any().optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canUseVisualEffects", "VFX Scene Studio");
        const { id, ...data } = input;
        return db.updateVisualEffect(id, data);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteVisualEffect(input.id);
        return { success: true };
      }),
    presets: protectedProcedure.query(async () => {
      return [
        // Explosions & Fire
        { name: "Fireball Explosion", category: "explosions", subcategory: "fire", tags: ["blast", "fire", "action"], description: "Large fireball explosion with debris and shockwave" },
        { name: "Dust Explosion", category: "explosions", subcategory: "debris", tags: ["dust", "blast", "demolition"], description: "Massive dust cloud explosion from building collapse" },
        { name: "Spark Shower", category: "explosions", subcategory: "sparks", tags: ["sparks", "metal", "grind"], description: "Cascading sparks from metal impact or welding" },
        { name: "Nuclear Blast", category: "explosions", subcategory: "fire", tags: ["mushroom", "massive", "destruction"], description: "Mushroom cloud nuclear-style explosion" },
        { name: "Grenade Blast", category: "explosions", subcategory: "fire", tags: ["small", "tactical", "military"], description: "Small tactical grenade explosion with shrapnel" },
        { name: "Vehicle Explosion", category: "explosions", subcategory: "fire", tags: ["car", "crash", "fire"], description: "Car or vehicle explosion with rolling flames" },
        { name: "Campfire", category: "explosions", subcategory: "fire", tags: ["warm", "cozy", "ambient"], description: "Realistic campfire with flickering flames and embers" },
        { name: "Wall of Fire", category: "explosions", subcategory: "fire", tags: ["barrier", "intense", "heat"], description: "Continuous wall of fire spreading across scene" },
        // Weather Effects
        { name: "Heavy Rain", category: "weather", subcategory: "rain", tags: ["storm", "wet", "dark"], description: "Torrential downpour with visible rain streaks" },
        { name: "Light Drizzle", category: "weather", subcategory: "rain", tags: ["gentle", "mist", "mood"], description: "Soft gentle rain with atmospheric mist" },
        { name: "Snowfall", category: "weather", subcategory: "snow", tags: ["winter", "cold", "peaceful"], description: "Gentle snowflakes falling with wind drift" },
        { name: "Blizzard", category: "weather", subcategory: "snow", tags: ["storm", "intense", "whiteout"], description: "Intense blizzard with heavy snow and wind" },
        { name: "Lightning Strike", category: "weather", subcategory: "lightning", tags: ["bolt", "flash", "storm"], description: "Dramatic lightning bolt with flash illumination" },
        { name: "Fog / Mist", category: "weather", subcategory: "fog", tags: ["atmospheric", "mystery", "low"], description: "Low-lying fog rolling across the ground" },
        { name: "Tornado", category: "weather", subcategory: "wind", tags: ["destruction", "spiral", "debris"], description: "Massive tornado funnel with flying debris" },
        { name: "Sandstorm", category: "weather", subcategory: "wind", tags: ["desert", "dust", "visibility"], description: "Desert sandstorm reducing visibility" },
        // Sci-Fi Effects
        { name: "Laser Beam", category: "sci-fi", subcategory: "weapons", tags: ["beam", "energy", "weapon"], description: "Focused laser beam with glow and heat distortion" },
        { name: "Plasma Bolt", category: "sci-fi", subcategory: "weapons", tags: ["projectile", "energy", "alien"], description: "Plasma energy projectile with trail" },
        { name: "Force Field", category: "sci-fi", subcategory: "shields", tags: ["barrier", "energy", "protection"], description: "Translucent energy shield with ripple effects" },
        { name: "Hologram", category: "sci-fi", subcategory: "display", tags: ["projection", "blue", "tech"], description: "Flickering holographic display projection" },
        { name: "Teleportation", category: "sci-fi", subcategory: "transport", tags: ["beam", "dissolve", "travel"], description: "Teleportation beam-up effect with particle dissolution" },
        { name: "Warp Speed", category: "sci-fi", subcategory: "transport", tags: ["stars", "stretch", "fast"], description: "Star-streaking warp speed travel effect" },
        { name: "Energy Shield Impact", category: "sci-fi", subcategory: "shields", tags: ["hit", "ripple", "absorb"], description: "Energy shield absorbing an impact with ripples" },
        { name: "Cybernetic HUD", category: "sci-fi", subcategory: "display", tags: ["interface", "data", "overlay"], description: "Heads-up display with scanning and data readouts" },
        // Magic & Fantasy
        { name: "Magic Spell Cast", category: "magic", subcategory: "casting", tags: ["glow", "runes", "power"], description: "Glowing rune circle spell casting effect" },
        { name: "Healing Aura", category: "magic", subcategory: "aura", tags: ["green", "glow", "restore"], description: "Warm green healing energy surrounding character" },
        { name: "Fire Magic", category: "magic", subcategory: "elemental", tags: ["flames", "hands", "power"], description: "Fire erupting from character's hands" },
        { name: "Ice Magic", category: "magic", subcategory: "elemental", tags: ["frost", "crystal", "freeze"], description: "Ice crystals forming and spreading from source" },
        { name: "Lightning Magic", category: "magic", subcategory: "elemental", tags: ["electricity", "arc", "power"], description: "Electrical arcs and lightning from fingertips" },
        { name: "Portal", category: "magic", subcategory: "transport", tags: ["gateway", "swirl", "dimension"], description: "Swirling interdimensional portal gateway" },
        { name: "Enchantment Glow", category: "magic", subcategory: "aura", tags: ["shimmer", "object", "power"], description: "Magical shimmer on enchanted objects" },
        { name: "Dark Magic", category: "magic", subcategory: "dark", tags: ["shadow", "evil", "corruption"], description: "Dark shadowy tendrils of corrupt magic" },
        // Particles & Atmosphere
        { name: "Dust Motes", category: "particles", subcategory: "ambient", tags: ["floating", "light", "indoor"], description: "Floating dust particles in light beams" },
        { name: "Ember Particles", category: "particles", subcategory: "fire", tags: ["glow", "float", "warm"], description: "Glowing embers floating upward" },
        { name: "Smoke Wisps", category: "particles", subcategory: "smoke", tags: ["thin", "drift", "atmospheric"], description: "Thin smoke wisps drifting through scene" },
        { name: "Thick Smoke", category: "particles", subcategory: "smoke", tags: ["dense", "fire", "aftermath"], description: "Dense billowing smoke from fire or explosion" },
        { name: "Falling Leaves", category: "particles", subcategory: "nature", tags: ["autumn", "wind", "gentle"], description: "Autumn leaves gently falling and drifting" },
        { name: "Cherry Blossoms", category: "particles", subcategory: "nature", tags: ["petals", "spring", "beautiful"], description: "Pink cherry blossom petals floating in wind" },
        { name: "Confetti", category: "particles", subcategory: "celebration", tags: ["party", "colorful", "joy"], description: "Colorful confetti falling from above" },
        { name: "Fireflies", category: "particles", subcategory: "nature", tags: ["glow", "night", "magical"], description: "Glowing fireflies floating in nighttime scene" },
        // Water Effects
        { name: "Ocean Waves", category: "water", subcategory: "ocean", tags: ["sea", "surf", "coast"], description: "Realistic ocean waves crashing on shore" },
        { name: "Underwater Bubbles", category: "water", subcategory: "underwater", tags: ["bubbles", "deep", "dive"], description: "Rising bubbles in underwater scene" },
        { name: "Waterfall", category: "water", subcategory: "falls", tags: ["cascade", "mist", "nature"], description: "Cascading waterfall with mist spray" },
        { name: "Blood Splatter", category: "water", subcategory: "liquid", tags: ["gore", "impact", "action"], description: "Blood splatter impact effect" },
        { name: "Water Splash", category: "water", subcategory: "splash", tags: ["drop", "impact", "ripple"], description: "Water splash from object impact" },
        // Screen Effects & Transitions
        { name: "Lens Flare", category: "screen", subcategory: "lens", tags: ["sun", "light", "cinematic"], description: "Cinematic lens flare from bright light source" },
        { name: "Motion Blur", category: "screen", subcategory: "blur", tags: ["speed", "fast", "action"], description: "Directional motion blur for speed effect" },
        { name: "Depth of Field", category: "screen", subcategory: "blur", tags: ["focus", "bokeh", "cinematic"], description: "Selective focus with beautiful bokeh" },
        { name: "Film Grain", category: "screen", subcategory: "texture", tags: ["vintage", "noise", "retro"], description: "Film grain overlay for vintage look" },
        { name: "Chromatic Aberration", category: "screen", subcategory: "distortion", tags: ["color", "split", "edge"], description: "RGB color fringing at edges" },
        { name: "Screen Shake", category: "screen", subcategory: "camera", tags: ["impact", "earthquake", "explosion"], description: "Camera shake from impact or explosion" },
        { name: "Vignette", category: "screen", subcategory: "overlay", tags: ["dark", "edges", "focus"], description: "Dark vignette around screen edges" },
        { name: "Color Grade: Teal & Orange", category: "screen", subcategory: "color", tags: ["cinematic", "blockbuster", "warm"], description: "Classic Hollywood teal and orange color grade" },
        // Destruction
        { name: "Building Collapse", category: "destruction", subcategory: "structural", tags: ["rubble", "dust", "demolition"], description: "Building collapsing with dust and debris" },
        { name: "Ground Crack", category: "destruction", subcategory: "earth", tags: ["earthquake", "split", "power"], description: "Ground cracking and splitting open" },
        { name: "Shattered Glass", category: "destruction", subcategory: "material", tags: ["break", "window", "sharp"], description: "Glass shattering into fragments" },
        { name: "Bullet Holes", category: "destruction", subcategory: "impact", tags: ["wall", "gunfire", "damage"], description: "Bullet impact holes appearing in surfaces" },
      ];
    }),
  }),
  // ─── Project Collaboration ───
  collaboration: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return db.listCollaboratorsByProject(input.projectId);
      }),
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email().optional(),
        role: z.enum(["viewer", "editor", "producer", "director"]).default("editor"),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canUseCollaboration", "Collaboration");
        const token = nanoid(32);
        const collab = await db.createCollaborator({
          projectId: input.projectId,
          invitedBy: ctx.user!.id,
          email: input.email || null,
          inviteToken: token,
          role: input.role,
          status: "pending",
        });
        return { collaborator: collab, inviteToken: token };
      }),
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorByToken(input.token);
        if (!collab) throw new Error("Invalid invite token");
        if (collab.status !== "pending") throw new Error("Invite already used");
        return db.updateCollaborator(collab.id, {
          userId: ctx.user!.id,
          status: "accepted",
        });
      }),
    decline: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorByToken(input.token);
        if (!collab) throw new Error("Invalid invite token");
        return db.updateCollaborator(collab.id, {
          status: "declined",
        });
      }),
    updateRole: protectedProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(["viewer", "editor", "producer", "director"]),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateCollaborator(input.id, { role: input.role });
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCollaborator(input.id);
        return { success: true };
      }),
  }),

  // ─── My Movies ───
  movie: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMovies(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getMovieById(input.id, ctx.user.id);
      }),

    create: creationProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["scene", "trailer", "film"]),
        projectId: z.number().optional(),
        movieTitle: z.string().optional(),
        sceneNumber: z.number().optional(),
        duration: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createMovie({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          type: input.type,
          projectId: input.projectId,
          movieTitle: input.movieTitle,
          sceneNumber: input.sceneNumber,
          duration: input.duration,
          tags: input.tags ?? [],
        });
      }),

    // Export project content to My Movies
    exportFromProject: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        exportType: z.enum(["film", "scenes", "trailer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canExportMovies", "Movie Export");
        // Credits: deduct for export
        const exportCost = input.exportType === "film" ? CREDIT_COSTS.export_final_film.cost : CREDIT_COSTS.movie_export.cost;
        try { await db.deductCredits(ctx.user.id, exportCost, input.exportType === "film" ? "export_final_film" : "movie_export", `Export ${input.exportType} for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");
        const scenes = await db.getProjectScenes(project.id);
        const created: number[] = [];

        if (input.exportType === "film") {
          // Check if any scenes have video clips
          const scenesWithVideo = scenes.filter((s: any) => s.videoUrl);

          // Fetch VirElle Studios Opener scenes to prepend as opening credits
          let openerScenes: any[] = [];
          try {
            const dbConn = await db.getDb();
            if (dbConn) {
              const openerRows = await dbConn.execute(
                sql`SELECT p.id FROM projects p WHERE p.title LIKE '%Opener%' ORDER BY p.id DESC LIMIT 1`
              );
              const openerProj = (Array.isArray(openerRows[0]) ? openerRows[0] : openerRows as any[])?.[0];
              if (openerProj) {
                const opScenes = await db.getProjectScenes(openerProj.id);
                openerScenes = opScenes
                  .filter((s: any) => s.videoUrl && s.status === 'completed')
                  .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
                  .map((s: any) => ({
                    videoUrl: s.videoUrl,
                    title: s.title || 'VirElle Studios',
                    duration: s.duration || 5,
                    orderIndex: -1, // Before all user scenes
                    transition: 'fade' as const,
                    transitionDuration: 1.2,
                  }));
              }
            }
          } catch (err) {
            console.error('[Export] Failed to fetch opener scenes:', err);
          }

          let fileUrl: string | undefined;
          let fileKey: string | undefined;
          let fileSize: number | undefined;
          // Calculate total duration from actual scene durations, not project.duration (which is user-entered estimate in minutes)
          let totalDuration = scenesWithVideo.reduce((sum: number, s: any) => sum + (s.duration || 30), 0);
          let mimeType: string | undefined;

          if (scenesWithVideo.length >= 2) {
            // Fetch all post-production data from database
            const [projectSfx, projectSubtitles, projectCredits, projectSoundtracks] = await Promise.all([
              db.listSoundEffectsByProject(project.id),
              db.getProjectSubtitles(project.id),
              db.getProjectCredits(project.id),
              db.getProjectSoundtracks(project.id),
            ]);

            // Get per-scene SFX
            const sceneSfxMap = new Map<number, any[]>();
            for (const sfx of projectSfx) {
              if (sfx.sceneId) {
                if (!sceneSfxMap.has(sfx.sceneId)) sceneSfxMap.set(sfx.sceneId, []);
                sceneSfxMap.get(sfx.sceneId)!.push(sfx);
              }
            }

            // Parse subtitle entries and map to scenes
            const subtitleEntries: any[] = [];
            if (projectSubtitles.length > 0) {
              const primarySub = projectSubtitles[0]; // Use first language
              const entries = (primarySub.entries as any[]) || [];
              subtitleEntries.push(...entries);
            }
            const sceneSubMap = new Map<number, any[]>();
            for (const entry of subtitleEntries) {
              const sid = entry.sceneId;
              if (sid) {
                if (!sceneSubMap.has(sid)) sceneSubMap.set(sid, []);
                sceneSubMap.get(sid)!.push(entry);
              }
            }

            // Find the main soundtrack
            const mainSoundtrack = projectSoundtracks.find((s: any) => s.fileUrl);

            try {
              const { stitchMovie } = await import("./_core/videoStitcher");
              // Build scene list: opener scenes first, then user's film scenes
              const userScenes = scenesWithVideo.map((s: any) => {
                  const sfxList = sceneSfxMap.get(s.id) || [];
                  const subList = sceneSubMap.get(s.id) || [];
                  return {
                    videoUrl: s.videoUrl,
                    title: s.title || undefined,
                    duration: s.duration || undefined,
                    orderIndex: s.orderIndex || 0,
                    voiceAudio: (s as any).voiceUrl ? { voiceUrl: (s as any).voiceUrl, voiceVolume: 0.9 } : undefined,
                    soundEffects: sfxList.filter((x: any) => x.fileUrl).map((x: any) => ({
                      fileUrl: x.fileUrl,
                      startTime: x.startTime || 0,
                      volume: x.volume || 0.5,
                      loop: !!(x.loop),
                      name: x.name,
                    })),
                    subtitles: subList.map((x: any) => ({
                      startTime: x.startTime || 0,
                      endTime: x.endTime || 3,
                      text: x.text || "",
                    })),
                    transition: "fade",
                    transitionDuration: 0.8,
                  };
                });
              // Prepend opener scenes as opening credits
              const allScenes = [...openerScenes, ...userScenes];
              const result = await stitchMovie({
                scenes: allScenes,
                projectTitle: project.title,
                userId: ctx.user.id,
                projectId: project.id,
                soundtrackUrl: mainSoundtrack?.fileUrl || undefined,
                soundtrackVolume: 20,
                burnSubtitles: subtitleEntries.length > 0,
                showTitleCard: true,
                titleCardDuration: 5,
                showCredits: projectCredits.length > 0,
                credits: projectCredits.map((c: any) => ({ role: c.role, name: c.name })),
                creditsDuration: Math.max(15, projectCredits.length * 3),
                genre: project.genre || undefined,
                directorName: projectCredits.find((c: any) => c.role.toLowerCase().includes("director"))?.name,
                resolution: "1080p",
              });
              fileUrl = result.fileUrl;
              fileKey = result.fileKey;
              fileSize = result.fileSize;
              totalDuration = result.duration;
              mimeType = result.mimeType;
            } catch (err: any) {
              console.error("[Export] Video stitching failed:", err.message);
              // Fall back to creating entry without stitched file
            }
          } else if (scenesWithVideo.length === 1) {
            // Only one scene — use its video directly
            fileUrl = (scenesWithVideo[0] as any).videoUrl;
            totalDuration = scenesWithVideo[0].duration || totalDuration;
            mimeType = "video/mp4";
          }

          const movie = await db.createMovie({
            userId: ctx.user.id,
            title: project.title,
            description: project.plotSummary || project.description || "",
            type: "film",
            projectId: project.id,
            movieTitle: project.title,
            thumbnailUrl: project.thumbnailUrl,
            fileUrl,
            fileKey,
            fileSize,
            duration: totalDuration,
            mimeType,
            tags: project.genre ? [project.genre] : [],
          });
          created.push(movie.id);
        } else if (input.exportType === "scenes") {
          // Create individual scene entries grouped under the movie title
          for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const movie = await db.createMovie({
              userId: ctx.user.id,
              title: scene.title || `Scene ${i + 1}`,
              description: scene.description || "",
              type: "scene",
              projectId: project.id,
              movieTitle: project.title,
              sceneNumber: scene.orderIndex || i + 1,
              thumbnailUrl: scene.thumbnailUrl,
              fileUrl: (scene as any).videoUrl || undefined,
              duration: scene.duration || undefined,
              mimeType: (scene as any).videoUrl ? "video/mp4" : undefined,
              tags: [scene.locationType, scene.mood, scene.timeOfDay].filter(Boolean) as string[],
            });
            created.push(movie.id);
          }
        } else if (input.exportType === "trailer") {
          // For trailers, stitch first 3 scenes (or first 30s of each) if available
          const scenesWithVideo = scenes.filter((s: any) => s.videoUrl).slice(0, 3);
          let fileUrl: string | undefined;
          let fileKey: string | undefined;
          let fileSize: number | undefined;
          let totalDuration: number | undefined;
          let mimeType: string | undefined;

          if (scenesWithVideo.length >= 2) {
            try {
              const { stitchMovie } = await import("./_core/videoStitcher");
              const result = await stitchMovie({
                scenes: scenesWithVideo.map((s: any) => ({
                  videoUrl: s.videoUrl,
                  title: s.title || undefined,
                  duration: s.duration || undefined,
                  orderIndex: s.orderIndex || 0,
                })),
                projectTitle: `${project.title} - Trailer`,
                userId: ctx.user.id,
                projectId: project.id,
              });
              fileUrl = result.fileUrl;
              fileKey = result.fileKey;
              fileSize = result.fileSize;
              totalDuration = result.duration;
              mimeType = result.mimeType;
            } catch (err: any) {
              console.error("[Export] Trailer stitching failed:", err.message);
            }
          } else if (scenesWithVideo.length === 1) {
            fileUrl = (scenesWithVideo[0] as any).videoUrl;
            totalDuration = scenesWithVideo[0].duration || undefined;
            mimeType = "video/mp4";
          }

          const movie = await db.createMovie({
            userId: ctx.user.id,
            title: `${project.title} - Trailer`,
            description: `Official trailer for ${project.title}`,
            type: "trailer",
            projectId: project.id,
            movieTitle: project.title,
            thumbnailUrl: project.thumbnailUrl,
            fileUrl,
            fileKey,
            fileSize,
            duration: totalDuration,
            mimeType,
            tags: project.genre ? [project.genre, "trailer"] : ["trailer"],
          });
          created.push(movie.id);
        }
        // Notify user about export completion
        try {
          await db.createNotification({
            userId: ctx.user.id,
            type: "export_complete",
            title: `"${project.title}" exported to My Movies`,
            message: `Your ${input.exportType} export is ready with ${created.length} item(s).`,
            link: "/movies",
          });
        } catch (_) { /* non-critical */ }

        return { exported: created.length, movieIds: created };
      }),

    upload: protectedProcedure
      .input(z.object({
        movieId: z.number(),
        fileName: z.string(),
        fileBase64: z.string().max(70_000_000, "File too large. Max 50MB."),
        contentType: z.string().default("video/mp4"),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const suffix = nanoid(8);
        const fileKey = `movies/${ctx.user.id}/${input.movieId}/${input.fileName}-${suffix}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return db.updateMovie(input.movieId, ctx.user.id, {
          fileUrl: url,
          fileKey,
          fileSize: input.fileSize ?? buffer.length,
          mimeType: input.contentType,
        });
      }),

    uploadThumbnail: protectedProcedure
      .input(z.object({
        movieId: z.number(),
        fileName: z.string(),
        fileBase64: z.string().max(14_000_000, "File too large. Max 10MB."),
        contentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const suffix = nanoid(8);
        const fileKey = `movies/${ctx.user.id}/${input.movieId}/thumb-${input.fileName}-${suffix}`;
        const buffer = Buffer.from(input.fileBase64, "base64");
        const { url } = await storagePut(fileKey, buffer, input.contentType);
        return db.updateMovie(input.movieId, ctx.user.id, {
          thumbnailUrl: url,
          thumbnailKey: fileKey,
        });
      }),

    // List movies grouped by movieTitle for folder view
    listGrouped: protectedProcedure.query(async ({ ctx }) => {
      const allMovies = await db.getUserMovies(ctx.user.id);
      // Separate: films without movieTitle go to top level, everything else groups by movieTitle
      const folders: Record<string, typeof allMovies> = {};
      const topLevel: typeof allMovies = [];
      for (const m of allMovies) {
        if (m.type === "film" && !m.movieTitle) {
          topLevel.push(m);
        } else if (m.movieTitle) {
          if (!folders[m.movieTitle]) folders[m.movieTitle] = [];
          folders[m.movieTitle].push(m);
        } else {
          topLevel.push(m);
        }
      }
      return { folders, topLevel };
    }),

    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        type: z.enum(["scene", "trailer", "film"]).optional(),
        movieTitle: z.string().optional(),
        sceneNumber: z.number().optional(),
        duration: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateMovie(id, ctx.user.id, data);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMovie(input.id, ctx.user.id);
        return { success: true };
      }),

    // ─── Real NLE Export ──────────────────────────────────────────────────────
    exportNLE: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        format: z.enum(["fcpxml", "edl", "csv", "premiere_xml", "resolve_xml"]),
        includeOptions: z.object({
          videoClips: z.boolean().default(true),
          audioTracks: z.boolean().default(true),
          subtitles: z.boolean().default(false),
          markers: z.boolean().default(false),
          colorMetadata: z.boolean().default(false),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(input.projectId);
        const completedScenes = scenes.filter((s: any) => s.videoUrl && s.status === "completed");
        if (completedScenes.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No completed scenes to export. Generate video for at least one scene first." });

        const fps = 24;
        const opts = input.includeOptions ?? { videoClips: true, audioTracks: true, subtitles: false, markers: false, colorMetadata: false };
        let content = "";
        let mimeType = "text/plain";
        let filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}`;

        if (input.format === "fcpxml" || input.format === "resolve_xml") {
          let offset = 0;
          const assetDefs = completedScenes.map((scene: any, i: number) => {
            const durationFrames = Math.round((scene.duration ?? 30) * fps);
            const src = (scene.videoUrl ?? "").replace(/&/g, "&amp;");
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            return `  <asset id="r${i + 2}" name="${title}" uid="${nanoid(16)}" src="${src}" start="0s" duration="${durationFrames}/${fps}s" hasVideo="1" hasAudio="1" />`;
          }).join("\n");
          const clipElements = completedScenes.map((scene: any, i: number) => {
            const durationFrames = Math.round((scene.duration ?? 30) * fps);
            const offsetFrames = offset;
            offset += durationFrames;
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            return `        <asset-clip name="${title}" offset="${offsetFrames}/${fps}s" duration="${durationFrames}/${fps}s" start="0s" tcFormat="NDF">
          <video ref="r${i + 2}" offset="0s" duration="${durationFrames}/${fps}s" />
          ${opts.audioTracks ? `<audio ref="r${i + 2}" offset="0s" duration="${durationFrames}/${fps}s" role="dialogue" />` : ""}
          ${opts.markers ? `<marker start="0s" duration="1/${fps}s" value="Scene ${i + 1}" />` : ""}
        </asset-clip>`;
          }).join("\n");
          const totalFrames = completedScenes.reduce((acc: number, s: any) => acc + Math.round((s.duration ?? 30) * fps), 0);
          const projTitle = project.title.replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
          content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.10">\n  <resources>\n    <format id="r1" name="FFVideoFormat1080p24" frameDuration="1/${fps}s" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)" />\n${assetDefs}\n  </resources>\n  <library>\n    <event name="${projTitle}">\n      <project name="${projTitle} — Virelle Export">\n        <sequence format="r1" duration="${totalFrames}/${fps}s" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">\n          <spine>\n${clipElements}\n          </spine>\n        </sequence>\n      </project>\n    </event>\n  </library>\n</fcpxml>`;
          mimeType = "application/xml";
          filename += ".fcpxml";

        } else if (input.format === "edl") {
          const toTC = (frames: number) => { const f=frames%fps,s=Math.floor(frames/fps)%60,m=Math.floor(frames/(fps*60))%60,h=Math.floor(frames/(fps*3600)); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}:${String(f).padStart(2,"0")}`; };
          const lines = [`TITLE: ${project.title}`, "FCM: NON-DROP FRAME", ""];
          let editNum = 1; let recIn = 0;
          completedScenes.forEach((scene: any, i: number) => {
            const df = Math.round((scene.duration ?? 30) * fps);
            const recOut = recIn + df;
            lines.push(`${String(editNum).padStart(3,"0")}  AX       V     C        ${toTC(0)} ${toTC(df)} ${toTC(recIn)} ${toTC(recOut)}`);
            lines.push(`* FROM CLIP NAME: ${scene.title ?? `Scene ${i + 1}`}`);
            if (scene.videoUrl) lines.push(`* SOURCE FILE: ${scene.videoUrl}`);
            lines.push("");
            editNum++; recIn = recOut;
          });
          content = lines.join("\n");
          mimeType = "text/plain";
          filename += ".edl";

        } else if (input.format === "premiere_xml") {
          let offset = 0;
          const clipItems = completedScenes.map((scene: any, i: number) => {
            const df = Math.round((scene.duration ?? 30) * fps);
            const start = offset; const end = offset + df; offset = end;
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            const src = (scene.videoUrl ?? "").replace(/&/g, "&amp;");
            return `        <clipitem id="clipitem-${i+1}"><name>${title}</name><duration>${df}</duration><rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate><start>${start}</start><end>${end}</end><in>0</in><out>${df}</out><file id="file-${i+1}"><name>${title}</name><pathurl>${src}</pathurl><rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate><duration>${df}</duration></file></clipitem>`;
          }).join("\n");
          const totalFrames = completedScenes.reduce((acc: number, s: any) => acc + Math.round((s.duration ?? 30) * fps), 0);
          const projTitle = project.title.replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
          content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4">\n  <sequence>\n    <name>${projTitle}</name>\n    <duration>${totalFrames}</duration>\n    <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>\n    <media><video><track>\n${clipItems}\n    </track></video></media>\n  </sequence>\n</xmeml>`;
          mimeType = "application/xml";
          filename += "_premiere.xml";

        } else {
          // CSV
          const rows = [["Scene #","Title","Duration (s)","Video URL","Mood","Time of Day","Location","Status"]];
          completedScenes.forEach((scene: any, i: number) => {
            rows.push([String(i+1), scene.title??`Scene ${i+1}`, String(scene.duration??30), scene.videoUrl??"", scene.mood??"", scene.timeOfDay??"", scene.location??"", scene.status??"completed"]);
          });
          content = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
          mimeType = "text/csv";
          filename += "_scenes.csv";
        }

        const base64 = Buffer.from(content, "utf-8").toString("base64");
        return { filename, mimeType, base64, sceneCount: completedScenes.length };
      }),
  }),

  // ─── Showcase / Demo Reel──────────────────────────────────────────────────
  showcase: router({
    // Public: get featured projects with completed scenes for the showcase page
    featured: publicProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      // Get projects that are marked as featured or have completed generations
      // Show any project that has at least one completed scene with a video
      const projectsResult = await dbConn.execute(
        sql`SELECT DISTINCT p.id, p.title, p.genre, p.plotSummary, p.duration, p.quality, p.resolution,
                   p.status, p.createdAt, u.name as directorName
            FROM projects p
            LEFT JOIN users u ON p.userId = u.id
            INNER JOIN scenes s ON s.projectId = p.id AND s.videoUrl IS NOT NULL AND s.status = 'completed'
            WHERE p.title NOT LIKE '%Opener%'
              AND p.title NOT LIKE '%Blood Money%'
            ORDER BY p.createdAt DESC
            LIMIT 20`
      );
      const projectsList = Array.isArray(projectsResult[0]) ? projectsResult[0] : projectsResult as any[];
      const results: any[] = [];
      for (const proj of projectsList as any[]) {
        const scenes = await db.getProjectScenes(proj.id);
        const completedScenes = scenes.filter((s: any) => s.videoUrl && s.status === 'completed');
        if (completedScenes.length === 0) continue;
        results.push({
          id: proj.id,
          title: proj.title,
          genre: proj.genre,
          plotSummary: proj.plotSummary ? (proj.plotSummary.length > 200 ? proj.plotSummary.slice(0, 200) + '...' : proj.plotSummary) : null,
          duration: proj.duration,
          quality: proj.quality,
          resolution: proj.resolution,
          directorName: proj.directorName || 'VirElle Studios',
          sceneCount: scenes.length,
          completedScenes: completedScenes.length,
          scenes: completedScenes.slice(0, 12).map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            videoUrl: s.videoUrl,
            thumbnailUrl: s.thumbnailUrl,
            duration: s.duration,
            orderIndex: s.orderIndex,
            mood: s.mood,
            timeOfDay: s.timeOfDay,
            locationType: s.locationType,
          })),
        });
      }
      return results;
    }),

    // Public: get the VirElle Studios Opener video scenes (Project 15)
    opener: publicProcedure.query(async () => {
      const dbConn = await db.getDb();
      if (!dbConn) return null;
      // Find the VirElle Studios Opener project (look for project with title containing 'Opener')
      const rowsResult = await dbConn.execute(
        sql`SELECT p.id, p.title, p.status FROM projects p
            WHERE p.title LIKE '%Opener%' OR p.title LIKE '%opener%'
            ORDER BY p.id DESC LIMIT 1`
      );
      const proj = (Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult as any[])?.[0];
      if (!proj) return null;
      const scenes = await db.getProjectScenes(proj.id);
      const completedScenes = scenes.filter((s: any) => s.videoUrl && s.status === 'completed');
      return {
        id: proj.id,
        title: proj.title,
        scenes: completedScenes.map((s: any) => ({
          id: s.id,
          title: s.title,
          videoUrl: s.videoUrl,
          thumbnailUrl: s.thumbnailUrl,
          duration: s.duration,
          orderIndex: s.orderIndex,
        })),
      };
    }),

    // Public: get a single showcase project with all completed scenes
    getProject: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const rowsResult2 = await dbConn.execute(
          sql`SELECT p.*, u.name as directorName
              FROM projects p
              LEFT JOIN users u ON p.userId = u.id
              WHERE p.id = ${input.id}
              LIMIT 1`
        );
        const proj = (Array.isArray(rowsResult2[0]) ? rowsResult2[0] : rowsResult2 as any[])?.[0];
        if (!proj) return null;
        const scenes = await db.getProjectScenes(proj.id);
        const completedScenes = scenes.filter((s: any) => s.videoUrl && s.status === 'completed');
        return {
          id: proj.id,
          title: proj.title,
          genre: proj.genre,
          plotSummary: proj.plotSummary,
          duration: proj.duration,
          quality: proj.quality,
          resolution: proj.resolution,
          directorName: proj.directorName || 'VirElle Studios',
          sceneCount: scenes.length,
          completedScenes: completedScenes.length,
          scenes: completedScenes.map((s: any) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            videoUrl: s.videoUrl,
            thumbnailUrl: s.thumbnailUrl,
            duration: s.duration,
            orderIndex: s.orderIndex,
            mood: s.mood,
            timeOfDay: s.timeOfDay,
            locationType: s.locationType,
          })),
        };
      }),
  }),

  // Director's Assistant Chat
  directorChat: router({
    history: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const messages = await db.getProjectChatHistory(input.projectId, ctx.user.id, 50);
        return messages.reverse(); // oldest first
      }),

    send: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        message: z.string().min(1).max(5000),
        attachmentUrl: z.string().optional(),
        attachmentName: z.string().optional(),
        imageUrls: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canUseDirectorAssistant", "Director AI Assistant");
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "virelle_chat", `Director assistant message`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        // Build user message with attachment info if present
        let userContent = input.message;
        if (input.attachmentUrl) {
          userContent += `\n\n[Attached file: ${input.attachmentName || 'file'}](${input.attachmentUrl})`;
        }
        if (input.imageUrls && input.imageUrls.length > 0) {
          userContent += `\n\n[Reference images: ${input.imageUrls.length} image(s) attached]`;
        }

        // Save user message
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: userContent,
        });

        // Get chat history for context
        const history = await db.getProjectChatHistory(input.projectId, ctx.user.id, 20);
        const chatHistory = history.reverse().map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

        // Process with AI
        const result = await processDirectorMessage(
          input.projectId,
          ctx.user.id,
          userContent,
          chatHistory,
          input.imageUrls
        );

        // Save assistant response
        const actionSummary = result.actions.length > 0
          ? result.actions.map((a) => a.type).join(",")
          : null;
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "assistant",
          content: result.response,
          actionType: actionSummary,
          actionData: result.actions.length > 0 ? result.actions : undefined,
          actionStatus: result.actions.some((a) => !a.success) ? "failed" : result.actions.length > 0 ? "executed" : "pending",
        });

        return {
          response: result.response,
          actions: result.actions,
        };
      }),

    uploadAttachment: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileData: z.string().max(70_000_000, "File too large. Max 50MB."), // base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const ext = input.fileName.split(".").pop() || "bin";
        const key = `director-chat/${input.projectId}/${nanoid()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, fileName: input.fileName };
      }),

    clear: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.clearProjectChat(input.projectId, ctx.user.id);
        return { success: true };
      }),

    transcribeVoice: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        audioData: z.string().max(70_000_000, "File too large. Max 50MB."), // base64 encoded audio
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "voice_transcription", `Voice transcription`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        // Upload audio to S3 first
        const buffer = Buffer.from(input.audioData, "base64");
        const ext = input.mimeType.includes("webm") ? "webm" : input.mimeType.includes("mp4") ? "m4a" : "wav";
        const key = `voice-recordings/${input.projectId}/${nanoid()}.${ext}`;
        const { url: audioUrl } = await storagePut(key, buffer, input.mimeType);

        // Transcribe using Whisper
        const result = await transcribeAudio({
          audioUrl,
          language: "en",
          prompt: "Director giving film production commands. Transcribe exactly what is said.",
        });

        if ("error" in result) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error,
            cause: result,
          });
        }

        return {
          text: result.text,
          language: result.language,
          duration: result.duration,
        };
      }),

    voiceEditText: protectedProcedure
      .input(z.object({
        currentText: z.string().min(1).max(10000),
        editCommand: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "voice_edit_text", `Voice edit text`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a text editor assistant for a film director. The director has dictated some text and now wants to edit it using voice commands.

You will receive:
1. The CURRENT TEXT that the director has dictated
2. An EDIT COMMAND spoken by the director

Your job is to apply the edit command to the current text and return the result.

IMPORTANT: The director may chain multiple commands in a single utterance using "and", "then", "also", commas, or periods. Apply ALL commands sequentially in the order given.

Examples of chained commands:
- "Replace sunset with sunrise and add dramatic music at the end"
- "Delete the first sentence, then make it more dramatic"
- "Fix the grammar and also make it shorter"
- "Change the tone to be more serious, remove the last line, and add a new ending about hope"

Common edit commands include:
- "Replace X with Y" or "Change X to Y" — find and replace text
- "Delete/Remove [text or description]" — remove specified text
- "Add/Append [text] at the end" — add text to the end
- "Insert [text] before/after [reference]" — insert at a specific position
- "Undo" or "Revert" — cannot be handled, return the text unchanged
- "Clear all" or "Start over" — return empty string
- "Make it more [adjective]" — rewrite with that quality
- "Fix grammar" or "Fix spelling" — correct errors
- "Make it shorter" or "Make it longer" — adjust length
- "Read it back" — return the text unchanged (the UI will handle display)

Rules:
- Return ONLY the edited text, nothing else
- Do NOT add explanations, quotes, or markdown
- Apply ALL chained commands in sequence
- Preserve the original meaning and intent unless the command explicitly changes it
- If a command is unclear or cannot be applied, skip it and apply the rest
- If the command says "clear all" or "start over", return exactly: __CLEAR__`,
            },
            {
              role: "user",
              content: `CURRENT TEXT:\n"""\n${input.currentText}\n"""\n\nEDIT COMMAND: "${input.editCommand}"\n\nApply the edit and return only the resulting text:`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const editedText = (typeof rawContent === "string" ? rawContent.trim() : input.currentText) || input.currentText;

        // Handle special commands
        if (editedText === "__CLEAR__") {
          return { editedText: "", command: "clear", applied: true };
        }

        // Detect if text actually changed
        const applied = editedText !== input.currentText;

        return {
          editedText,
          command: input.editCommand,
          applied,
        };
      }),

    // ─── Archibald Titan: AI Voice Response (ElevenLabs deep male voice) ───
    speakResponse: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Deduct 1 credit for AI voice synthesis (same cost as a chat message)
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "voice_speak", `AI voice synthesis: ${input.text.substring(0, 40)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        // Get user's ElevenLabs API key
        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const elevenlabsKey = userKeys.elevenlabsKey;

        // Archibald Titan voice: "Adam" — deep, authoritative, cinematic male voice
        // ElevenLabs free library voice ID for Adam
        const ARCHIBALD_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — deep male
        const ARCHIBALD_VOICE_SETTINGS = {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        };

        if (!elevenlabsKey) {
          // No ElevenLabs key — client should fall back to browser TTS
          return { audioBase64: null, provider: "browser" as const };
        }

        try {
          const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ARCHIBALD_VOICE_ID}`, {
            method: "POST",
            headers: {
              "xi-api-key": elevenlabsKey,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text: input.text,
              model_id: "eleven_multilingual_v2",
              voice_settings: ARCHIBALD_VOICE_SETTINGS,
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (!resp.ok) {
            const errText = await resp.text().catch(() => "");
            console.error(`[speakResponse] ElevenLabs error ${resp.status}: ${errText}`);
            return { audioBase64: null, provider: "browser" as const };
          }

          const audioBuffer = Buffer.from(await resp.arrayBuffer());
          const audioBase64 = audioBuffer.toString("base64");
          return { audioBase64, provider: "elevenlabs" as const };
        } catch (err) {
          console.error("[speakResponse] ElevenLabs TTS failed:", err);
          return { audioBase64: null, provider: "browser" as const };
        }
      }),
  }),

  // ─── Poster / Ad Maker ─────────────────────────────────────────────────────
  poster: router({
    generateImage: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(2000),
        templateType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.ad_poster_gen.cost, "ad_poster_gen", `Ad/poster image generation`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const result = await generateImage({
          prompt: input.prompt,
        });
        return { url: result.url || null };
      }),

    generateCopy: protectedProcedure
      .input(z.object({
        title: z.string(),
        genre: z.string(),
        description: z.string(),
        templateType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.ad_poster_copy_gen.cost, "ad_poster_copy_gen", `Ad/poster copy: ${input.title}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const templateDescriptions: Record<string, string> = {
          "poster": "classic movie poster",
          "social-square": "social media square post",
          "social-story": "social media story/reel",
          "banner": "website banner or YouTube thumbnail",
          "billboard": "billboard advertisement",
          "dvd-cover": "DVD/Blu-ray cover",
          "press-kit": "press kit media sheet",
        };
        const templateDesc = templateDescriptions[input.templateType] || "movie poster";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional film marketing copywriter. Generate compelling marketing copy for a ${templateDesc}. Return valid JSON only.`,
            },
            {
              role: "user",
              content: `Generate marketing copy for a ${input.genre} film:\n\nTitle: ${input.title}\nGenre: ${input.genre}\nDescription: ${input.description}\n\nReturn JSON with these fields:\n- title: the film title, possibly stylized (max 40 chars)\n- tagline: a compelling tagline (max 80 chars)\n- credits: a credits line like "Directed by X • Starring Y, Z" (max 120 chars)`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "poster_copy",
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  tagline: { type: "string" },
                  credits: { type: "string" },
                },
                required: ["title", "tagline", "credits"],
                additionalProperties: false,
              },
              strict: true,
            },
          },
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((p: any) => typeof p === "string" ? p : p.text || "").join("") : "";
        try {
          const parsed = JSON.parse(content);
          return {
            title: parsed.title || null,
            tagline: parsed.tagline || null,
            credits: parsed.credits || null,
          };
        } catch {
          return { title: null, tagline: null, credits: null };
        }
      }),

    generateVideoAd: creationProcedure
      .input(z.object({
        prompt: z.string().min(1).max(2000),
        platform: z.string().default("youtube"),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        // Deduct credits for video ad generation
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.ad_poster_video_gen.cost, "ad_poster_video_gen", `Video ad for ${input.platform}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }

        const rawAdKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdminAd = ctx.user.role === "admin" || ctx.user.email === ENV.adminEmail;
        const byokKeys: UserApiKeys = {
          openaiKey: rawAdKeys.openaiKey || (isAdminAd ? ENV.openaiApiKey : undefined),
          runwayKey: rawAdKeys.runwayKey || (isAdminAd ? ENV.runwayApiKey : undefined),
          replicateKey: rawAdKeys.replicateKey,
          falKey: rawAdKeys.falKey,
          lumaKey: rawAdKeys.lumaKey,
          hfToken: rawAdKeys.hfToken,
          byteplusKey: rawAdKeys.byteplusKey,
          googleAiKey: rawAdKeys.googleAiKey || (isAdminAd ? ENV.googleApiKey : undefined),
          preferredProvider: rawAdKeys.preferredProvider,
        };
        const aspectRatio = input.platform === "tiktok" ? "9:16" : "16:9";

        try {
          const result = await generateBYOKVideo(byokKeys, {
            prompt: input.prompt,
            aspectRatio,
            duration: 5,
          });
          return { videoUrl: result.videoUrl || null };
        } catch (err: any) {
          console.error("Video ad generation failed:", err.message);
          return { videoUrl: null };
        }
      }),

    // Generate 5 tagline variants for a film
    generateTaglineVariants: protectedProcedure
      .input(z.object({
        title: z.string(),
        genre: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.tagline_variants_gen.cost, "tagline_variants_gen", `Tagline variants for: ${input.title}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a world-class film marketing copywriter. Generate 5 distinct, compelling taglines for a film. Each should have a different emotional angle. Return valid JSON only." },
            { role: "user", content: `Generate 5 taglines for:\nTitle: ${input.title}\nGenre: ${input.genre}\nDescription: ${input.description}\n\nReturn JSON: { "taglines": ["tagline1", "tagline2", "tagline3", "tagline4", "tagline5"] }` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "taglines", schema: { type: "object", properties: { taglines: { type: "array", items: { type: "string" } } }, required: ["taglines"], additionalProperties: false }, strict: true } },
        });
        const raw = response.choices?.[0]?.message?.content;
        const content = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => typeof p === "string" ? p : p.text || "").join("") : "";
        try {
          const parsed = JSON.parse(content);
          return { taglines: parsed.taglines || [] };
        } catch { return { taglines: [] }; }
      }),

    // Generate a brand kit (colours, fonts, mood) for a film
    generateBrandKit: protectedProcedure
      .input(z.object({
        title: z.string(),
        genre: z.string(),
        description: z.string(),
        mood: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.brand_kit_gen.cost, "brand_kit_gen", `Brand kit for: ${input.title}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional film brand designer. Generate a complete visual brand kit for a film. Return valid JSON only." },
            { role: "user", content: `Create a brand kit for:\nTitle: ${input.title}\nGenre: ${input.genre}\nMood: ${input.mood || "cinematic"}\nDescription: ${input.description}\n\nReturn JSON with:\n- primaryColor: hex color (main brand color)\n- secondaryColor: hex color (accent)\n- backgroundColor: hex color (dark background)\n- textColor: hex color (main text)\n- accentColor: hex color (highlight)\n- titleFont: font name from ["Inter", "Georgia", "Playfair Display", "Oswald", "Bebas Neue", "Cinzel", "Raleway", "Montserrat", "Lato", "Merriweather"]\n- bodyFont: font name from same list\n- moodDescription: 1-sentence mood description\n- logoConceptDescription: brief description of a logo concept\n- colorPaletteName: creative name for this palette` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "brand_kit", schema: { type: "object", properties: { primaryColor: { type: "string" }, secondaryColor: { type: "string" }, backgroundColor: { type: "string" }, textColor: { type: "string" }, accentColor: { type: "string" }, titleFont: { type: "string" }, bodyFont: { type: "string" }, moodDescription: { type: "string" }, logoConceptDescription: { type: "string" }, colorPaletteName: { type: "string" } }, required: ["primaryColor", "secondaryColor", "backgroundColor", "textColor", "accentColor", "titleFont", "bodyFont", "moodDescription", "logoConceptDescription", "colorPaletteName"], additionalProperties: false }, strict: true } },
        });
        const raw = response.choices?.[0]?.message?.content;
        const content = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => typeof p === "string" ? p : p.text || "").join("") : "";
        try { return JSON.parse(content); } catch { return null; }
      }),

    // Generate influencer outreach kit
    generateInfluencerKit: protectedProcedure
      .input(z.object({
        title: z.string(),
        genre: z.string(),
        logline: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.influencer_kit_gen.cost, "influencer_kit_gen", `Influencer kit for: ${input.title}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional film PR specialist. Generate a complete influencer outreach kit. Return valid JSON only." },
            { role: "user", content: `Create an influencer kit for:\nTitle: ${input.title}\nGenre: ${input.genre}\nLogline: ${input.logline || "N/A"}\n\nReturn JSON:\n- caption: Instagram/TikTok caption with emojis (max 200 chars)\n- hashtags: 10-15 relevant hashtags as a single string\n- emailPitch: professional email pitch (3 paragraphs)\n- linkedinPost: LinkedIn announcement post\n- pressRelease: short press release (2 paragraphs)` },
          ],
          response_format: { type: "json_schema", json_schema: { name: "influencer_kit", schema: { type: "object", properties: { caption: { type: "string" }, hashtags: { type: "string" }, emailPitch: { type: "string" }, linkedinPost: { type: "string" }, pressRelease: { type: "string" } }, required: ["caption", "hashtags", "emailPitch", "linkedinPost", "pressRelease"], additionalProperties: false }, strict: true } },
        });
        const raw = response.choices?.[0]?.message?.content;
        const content = typeof raw === "string" ? raw : Array.isArray(raw) ? raw.map((p: any) => typeof p === "string" ? p : p.text || "").join("") : "";
        try { return JSON.parse(content); } catch { return null; }
      }),
  }),

  // ─── Social Platform Credentials ─────────────────────────────────────────────
  // Per-user credentials for Instagram, TikTok, Facebook, Discord, YouTube
  // Credentials are stored per-user and never shared between accounts.
  socialCredentials: router({
    // List all connected platforms (metadata only — no raw tokens returned)
    list: protectedProcedure.query(async ({ ctx }) => {
      const creds = await db.getUserSocialCredentials(ctx.user.id);
      return creds.map((c) => ({
        platform: c.platform,
        displayName: c.displayName,
        isActive: c.isActive,
        lastTestedAt: c.lastTestedAt,
        lastPublishedAt: c.lastPublishedAt,
        lastError: c.lastError,
        createdAt: c.createdAt,
        hasCredentials: !!c.credentials,
      }));
    }),

    // Save or update credentials for a platform
    save: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok", "facebook", "discord", "youtube"]),
        displayName: z.string().max(255).optional(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        pageId: z.string().optional(),
        pageAccessToken: z.string().optional(),
        userId: z.string().optional(),
        openId: z.string().optional(),
        channelId: z.string().optional(),
        botToken: z.string().optional(),
        guildId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { platform, displayName, ...fields } = input;
        const credObj: Record<string, string> = {};
        if (fields.accessToken) credObj.accessToken = fields.accessToken;
        if (fields.refreshToken) credObj.refreshToken = fields.refreshToken;
        if (fields.pageId) credObj.pageId = fields.pageId;
        if (fields.pageAccessToken) credObj.pageAccessToken = fields.pageAccessToken;
        if (fields.userId) credObj.userId = fields.userId;
        if (fields.openId) credObj.openId = fields.openId;
        if (fields.channelId) credObj.channelId = fields.channelId;
        if (fields.botToken) credObj.botToken = fields.botToken;
        if (fields.guildId) credObj.guildId = fields.guildId;
        if (Object.keys(credObj).length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No credentials provided" });
        await db.upsertUserSocialCredential(ctx.user.id, platform, {
          displayName,
          credentials: JSON.stringify(credObj),
          isActive: true,
        });
        return { success: true };
      }),

    // Test a platform connection using stored credentials
    test: protectedProcedure
      .input(z.object({ platform: z.enum(["instagram", "tiktok", "facebook", "discord", "youtube"]) }))
      .mutation(async ({ ctx, input }) => {
        const cred = await db.getUserSocialCredentialByPlatform(ctx.user.id, input.platform);
        if (!cred) throw new TRPCError({ code: "NOT_FOUND", message: "No credentials saved for this platform" });
        let credObj: Record<string, string> = {};
        try { credObj = JSON.parse(cred.credentials); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Corrupted credentials" }); }
        let success = false;
        let error: string | undefined;
        try {
          if (input.platform === "instagram" || input.platform === "facebook") {
            const token = credObj.pageAccessToken || credObj.accessToken;
            if (!token) throw new Error("No access token provided");
            const res = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            success = true;
          } else if (input.platform === "tiktok") {
            const token = credObj.accessToken;
            if (!token) throw new Error("No access token provided");
            const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.error?.code && data.error.code !== "ok") throw new Error(data.error.message || "TikTok API error");
            success = true;
          } else if (input.platform === "discord") {
            const token = credObj.botToken;
            if (!token) throw new Error("No bot token provided");
            const res = await fetch("https://discord.com/api/v10/users/@me", {
              headers: { Authorization: `Bot ${token}` },
            });
            const data = await res.json();
            if (data.code) throw new Error(data.message || "Discord API error");
            success = true;
          } else if (input.platform === "youtube") {
            const token = credObj.accessToken;
            if (!token) throw new Error("No access token provided");
            const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            success = true;
          }
        } catch (e: any) {
          error = e.message || "Connection failed";
        }
        await db.updateSocialCredentialTestResult(ctx.user.id, input.platform, success, error);
        return { success, error };
      }),

    // Remove credentials for a platform
    remove: protectedProcedure
      .input(z.object({ platform: z.enum(["instagram", "tiktok", "facebook", "discord", "youtube"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteUserSocialCredential(ctx.user.id, input.platform);
        return { success: true };
      }),

    // Publish an image or video to a connected platform
    publish: protectedProcedure
      .input(z.object({
        platform: z.enum(["instagram", "tiktok", "facebook", "discord", "youtube"]),
        mediaUrl: z.string().url(),
        mediaType: z.enum(["image", "video"]),
        caption: z.string().max(2200).optional(),
        discordMessage: z.string().max(2000).optional(),
        videoTitle: z.string().max(100).optional(),
        videoDescription: z.string().max(5000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const cred = await db.getUserSocialCredentialByPlatform(ctx.user.id, input.platform);
        if (!cred || !cred.isActive) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${input.platform} is not connected. Go to Settings > Connected Platforms.` });
        let credObj: Record<string, string> = {};
        try { credObj = JSON.parse(cred.credentials); } catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Corrupted credentials" }); }
        let postUrl: string | undefined;
        let postId: string | undefined;
        try {
          if (input.platform === "instagram") {
            const token = credObj.pageAccessToken || credObj.accessToken;
            const igUserId = credObj.pageId || credObj.userId;
            if (!token || !igUserId) throw new Error("Instagram credentials incomplete: need accessToken and pageId");
            if (input.mediaType === "image") {
              const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_url: input.mediaUrl, caption: input.caption || "", access_token: token }),
              });
              const container = await containerRes.json();
              if (!container.id) throw new Error(container.error?.message || "Failed to create Instagram media container");
              const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: container.id, access_token: token }),
              });
              const published = await publishRes.json();
              if (!published.id) throw new Error(published.error?.message || "Failed to publish to Instagram");
              postId = published.id;
              postUrl = `https://www.instagram.com/p/${published.id}/`;
            } else {
              const containerRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ media_type: "REELS", video_url: input.mediaUrl, caption: input.caption || "", access_token: token }),
              });
              const container = await containerRes.json();
              if (!container.id) throw new Error(container.error?.message || "Failed to create Instagram Reels container");
              let ready = false;
              for (let i = 0; i < 12; i++) {
                await new Promise((r) => setTimeout(r, 5000));
                const statusRes = await fetch(`https://graph.facebook.com/v19.0/${container.id}?fields=status_code&access_token=${token}`);
                const status = await statusRes.json();
                if (status.status_code === "FINISHED") { ready = true; break; }
                if (status.status_code === "ERROR") throw new Error("Instagram video processing failed");
              }
              if (!ready) throw new Error("Instagram video processing timed out — try again");
              const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creation_id: container.id, access_token: token }),
              });
              const published = await publishRes.json();
              if (!published.id) throw new Error(published.error?.message || "Failed to publish Reels");
              postId = published.id;
              postUrl = `https://www.instagram.com/reel/${published.id}/`;
            }
          } else if (input.platform === "facebook") {
            const token = credObj.pageAccessToken || credObj.accessToken;
            const pageId = credObj.pageId;
            if (!token || !pageId) throw new Error("Facebook credentials incomplete: need pageAccessToken and pageId");
            if (input.mediaType === "image") {
              const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: input.mediaUrl, caption: input.caption || "", access_token: token }),
              });
              const data = await res.json();
              if (!data.id) throw new Error(data.error?.message || "Failed to post to Facebook");
              postId = data.id;
              postUrl = `https://www.facebook.com/${pageId}/posts/${data.id}`;
            } else {
              const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/videos`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_url: input.mediaUrl, description: input.caption || "", access_token: token }),
              });
              const data = await res.json();
              if (!data.id) throw new Error(data.error?.message || "Failed to post video to Facebook");
              postId = data.id;
              postUrl = `https://www.facebook.com/video/${data.id}`;
            }
          } else if (input.platform === "tiktok") {
            const token = credObj.accessToken;
            if (!token) throw new Error("TikTok credentials incomplete: need accessToken");
            const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
              body: JSON.stringify({
                post_info: { title: input.caption || "Film Ad", privacy_level: "PUBLIC_TO_EVERYONE", disable_duet: false, disable_comment: false, disable_stitch: false },
                source_info: { source: "PULL_FROM_URL", video_url: input.mediaUrl },
              }),
            });
            const initData = await initRes.json();
            if (initData.error?.code && initData.error.code !== "ok") throw new Error(initData.error.message || "TikTok post init failed");
            postId = initData.data?.publish_id;
            postUrl = postId ? `https://www.tiktok.com/@me/video/${postId}` : undefined;
          } else if (input.platform === "discord") {
            const token = credObj.botToken;
            const channelId = credObj.channelId;
            if (!token || !channelId) throw new Error("Discord credentials incomplete: need botToken and channelId");
            const message = input.discordMessage || input.caption || "New film content from VirElle Studios";
            const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
              method: "POST",
              headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                content: message,
                embeds: input.mediaType === "image" ? [{ image: { url: input.mediaUrl } }] : undefined,
              }),
            });
            const data = await res.json();
            if (data.code) throw new Error(data.message || "Discord API error");
            postId = data.id;
            postUrl = `https://discord.com/channels/${credObj.guildId || "@me"}/${channelId}/${data.id}`;
          } else if (input.platform === "youtube") {
            const token = credObj.accessToken;
            if (!token) throw new Error("YouTube credentials incomplete: need accessToken");
            const initRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": "video/*" },
              body: JSON.stringify({
                snippet: { title: input.videoTitle || input.caption || "Film Ad", description: input.videoDescription || input.caption || "", categoryId: "1" },
                status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
              }),
            });
            if (!initRes.ok) { const err = await initRes.json(); throw new Error(err.error?.message || "YouTube upload init failed"); }
            const uploadUrl = initRes.headers.get("location");
            if (!uploadUrl) throw new Error("YouTube did not return an upload URL");
            const videoRes = await fetch(input.mediaUrl);
            if (!videoRes.ok) throw new Error("Could not fetch video from provided URL");
            const videoBuffer = await videoRes.arrayBuffer();
            const uploadRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "video/*", "Content-Length": videoBuffer.byteLength.toString() },
              body: videoBuffer,
            });
            const uploadData = await uploadRes.json();
            if (!uploadData.id) throw new Error(uploadData.error?.message || "YouTube upload failed");
            postId = uploadData.id;
            postUrl = `https://www.youtube.com/watch?v=${uploadData.id}`;
          }
        } catch (e: any) {
          await db.updateSocialCredentialTestResult(ctx.user.id, input.platform, false, e.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: e.message || "Publish failed" });
        }
        await db.updateSocialCredentialPublished(ctx.user.id, input.platform);
        return { success: true, postUrl, postId };
      }),
  }),

  // ─── Subscription / Billing ─────────────────────────────────────────────────
  subscription: router({
    // Get current user's subscription status and limits (with live Stripe sync)
    status: protectedProcedure.query(async ({ ctx }) => {
      let user = ctx.user;

      // Live-sync with Stripe if user has a subscription ID
      // This catches cases where webhooks were missed or delayed
      if (user.stripeSubscriptionId && ENV.stripeSecretKey) {
        try {
          const { stripe, priceIdToTier } = await import("./_core/subscription");
          if (stripe) {
            const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            const priceId = sub.items.data[0]?.price?.id || "";
            const liveTier = priceIdToTier(priceId);
            const liveStatus = sub.status === "active" ? "active"
              : sub.status === "past_due" ? "past_due"
              : sub.status === "canceled" ? "canceled"
              : sub.status === "trialing" ? "trialing"
              : sub.status === "unpaid" ? "unpaid" : "none";
            const livePeriodEnd = new Date((sub as any).current_period_end * 1000);

            // Only update DB if something changed
            const tierChanged = (liveStatus === "active" || liveStatus === "trialing" ? liveTier : "independent") !== user.subscriptionTier;
            const statusChanged = liveStatus !== user.subscriptionStatus;
            const periodChanged = !user.subscriptionCurrentPeriodEnd || 
              Math.abs(livePeriodEnd.getTime() - new Date(user.subscriptionCurrentPeriodEnd).getTime()) > 60000;

            if (tierChanged || statusChanged || periodChanged) {
              await db.updateUserSubscription(user.id, {
                subscriptionTier: (liveStatus === "active" || liveStatus === "trialing" ? liveTier : "independent") as any,
                subscriptionStatus: liveStatus as any,
                subscriptionCurrentPeriodEnd: livePeriodEnd,
              });
              // Refresh user data
              const refreshed = await db.getUserById(user.id);
              if (refreshed) user = refreshed;
            }
          }
        } catch (err: any) {
          // Don't fail the status check if Stripe sync fails
          logger.warn(`Stripe sync failed for user ${user.id}: ${err.message}`);
        }
      }

      const tier = getEffectiveTier(user);
      const limits = getUserLimits(user);
      const used = user.monthlyGenerationsUsed || 0;
      const bonus = user.bonusGenerations || 0;
      const limit = limits.maxGenerationsPerMonth;
      const totalAvailable = limit === -1 ? -1 : limit + bonus;
      const remaining = totalAvailable === -1 ? -1 : Math.max(0, totalAvailable - used);

      return {
        tier,
        status: user.subscriptionStatus || "none",
        currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
        generationsUsed: used,
        generationsLimit: limit,
        bonusCredits: bonus,
        totalAvailable,
        generationsRemaining: remaining,
        resetDate: user.monthlyGenerationsResetAt || null,
        limits,
        isAdmin: user.email === ENV.adminEmail || user.email === "brobroplzcheck@gmail.com" || user.role === "admin",
        stripePublishableKey: ENV.stripePublishableKey,
      };
    }),

    // Create a Stripe checkout session for subscription
    createCheckout: creationProcedure
      .input(z.object({
        tier: z.enum(["amateur", "independent", "creator", "studio", "industry"]),
        billing: z.enum(["monthly", "annual"]).default("annual"),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Resolve the correct Stripe price ID — check auto-provisioned first, then ENV fallbacks
        const { getStripePriceId } = await import("./_core/stripeProvisioning");
        const priceMap: Record<string, Record<string, string>> = {
          amateur: {
            monthly: getStripePriceId("amateur_monthly") || "",
            annual: getStripePriceId("amateur_annual") || "",
          },
          independent: {
            monthly: getStripePriceId("independent_monthly") || (ENV as any).stripeIndependentMonthlyPriceId || "",
            annual: getStripePriceId("independent_annual") || (ENV as any).stripeIndependentAnnualPriceId || "",
          },
          creator: {
            monthly: getStripePriceId("creator_monthly") || "",
            annual: getStripePriceId("creator_annual") || "",
          },
          studio: {
            monthly: getStripePriceId("studio_monthly") || "",
            annual: getStripePriceId("studio_annual") || "",
          },
          industry: {
            monthly: getStripePriceId("industry_monthly") || (ENV as any).stripeIndustryMonthlyPriceId || "",
            annual: getStripePriceId("industry_annual") || ENV.stripeIndustryAnnualPriceId || "",
          },
        };
        const priceId = priceMap[input.tier]?.[input.billing];
        if (!priceId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Stripe price not configured for ${input.tier} ${input.billing}` });

        const customerId = await getOrCreateStripeCustomer(ctx.user);
        await db.updateUserSubscription(ctx.user.id, { stripeCustomerId: customerId });

        // First-time subscribers get a 7-day free trial
        const isFirstSub = !ctx.user.subscriptionTier || ctx.user.subscriptionStatus === "none";
        const trialDays = isFirstSub ? 7 : undefined;

        // Check if founding offer applies (first 50 annual subscribers get 50% off first year)
        const spotsData = await (async () => {
          try {
            const dbConn = await db.getDb();
            if (!dbConn) return { spotsRemaining: 0 };
            const result = await dbConn.execute(sql`SELECT COUNT(*) as count FROM users WHERE subscriptionTier IN ('independent','creator','studio','industry') AND subscriptionStatus = 'active'`);
            const realCount = Number((result[0] as any)?.count || 0);
            return { spotsRemaining: Math.max(50 - realCount, 0) };
          } catch { return { spotsRemaining: 0 }; }
        })();
         // Founding offer only applies to Independent+ tiers (not Amateur — it's a hook tier, not a founding member)
        const applyFoundingDiscount = isFirstSub && input.billing === "annual" && spotsData.spotsRemaining > 0 && input.tier !== "amateur";
        // Check if user has an unused promo code (50% off first payment, any billing cycle)
        const promoStatus = await db.getUserPromoStatus(ctx.user.id);
        const hasUnusedPromo = !!(promoStatus.appliedPromoCode && !promoStatus.promoDiscountUsed && isFirstSub);
        // Promo code discount takes priority over founding discount (both are 50% but promo works on monthly too)
        const url = await createCheckoutSession(
          ctx.user,
          customerId,
          priceId,
          input.successUrl,
          input.cancelUrl,
          input.billing,
          trialDays,
          hasUnusedPromo ? false : applyFoundingDiscount, // use promo path instead if promo active
          hasUnusedPromo ? promoStatus.appliedPromoCode! : undefined,
        );
        // Mark promo as used after checkout session created
        if (hasUnusedPromo) {
          try { await db.markPromoDiscountUsed(ctx.user.id); } catch { /* non-critical */ }
        }
        return { url };
      }),

    // Create a Stripe checkout session for generation top-up pack
    createTopUpCheckout: protectedProcedure
      .input(z.object({
        packId: z.enum(["pack_10", "pack_50", "pack_100", "pack_250", "pack_500", "pack_1000", "topup_10", "topup_30", "topup_100"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createTopUpCheckoutSession } = await import("./_core/subscription");
        const { getStripePriceId: getProvisionedId } = await import("./_core/stripeProvisioning");
        const packPriceMap: Record<string, string> = {
          pack_10: getProvisionedId("pack_10") || "",
          pack_50: getProvisionedId("pack_50") || "",
          pack_100: getProvisionedId("pack_100") || "",
          pack_250: getProvisionedId("pack_250") || "",
          pack_500: getProvisionedId("pack_500") || "",
          pack_1000: getProvisionedId("pack_1000") || "",
          topup_10: ENV.stripeTopUp10PriceId || getProvisionedId("topup_10"),
          topup_30: ENV.stripeTopUp30PriceId || getProvisionedId("topup_30"),
          topup_100: ENV.stripeTopUp100PriceId || getProvisionedId("topup_100"),
        };
        const priceId = packPriceMap[input.packId];
        if (!priceId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Top-up pack price not configured" });

        const customerId = await getOrCreateStripeCustomer(ctx.user);
        await db.updateUserSubscription(ctx.user.id, { stripeCustomerId: customerId });

        const url = await createTopUpCheckoutSession(
          ctx.user,
          customerId,
          input.packId,
          priceId,
          input.successUrl,
          input.cancelUrl,
        );
        return { url };
      }),

    // Create a Stripe billing portal session
    createBillingPortal: creationProcedure
      .input(z.object({ returnUrl: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
        }
        const url = await createBillingPortalSession(ctx.user.stripeCustomerId, input.returnUrl);
        return { url };
      }),

    // Get pricing info (public)
    // Public endpoint: count of paid subscribers (for founding offer banner)
    // Returns count + 30 offset to show social proof
    foundingSpots: publicProcedure.query(async () => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) throw new Error("DB not available");
        const result = await dbConn.execute(sql`SELECT COUNT(*) as count FROM users WHERE subscriptionTier IN ('independent','creator','studio','industry') AND subscriptionStatus = 'active'`);
        const realCount = Number((result[0] as any)?.count || 0);
        const displayCount = Math.min(realCount + 31, 50); // offset by 31 (31 spots already claimed), cap at 50
        const spotsRemaining = Math.max(50 - displayCount, 0);
        return { displayCount, spotsRemaining, isFull: spotsRemaining === 0 };
      } catch {
        return { displayCount: 31, spotsRemaining: 19, isFull: false };
      }
    }),

    pricing: publicProcedure.query(async () => {
      const { TIER_PRICING, TOP_UP_PACKS, REFERRAL_REWARDS, FILM_PACKAGES, VFX_SCENE_PACKAGES, EXTENSION_PRICING, LAUNCH_SPECIAL_ACTIVE, SCENE_BY_SCENE_PRICING, CREDIT_COSTS } = await import("./_core/subscription");
      return {
        tiers: [
          {
            id: "independent" as const,
            name: "Independent",
            monthly: TIER_PRICING.independent.monthly,
            annual: TIER_PRICING.independent.annualTotal,
            credits: TIER_LIMITS.independent.monthlyCredits,
            extraCreditCost: 50,
            description: "For independent filmmakers and solo creators.",
          },
          {
            id: "creator" as const,
            name: "Creator",
            monthly: TIER_PRICING.creator.monthly,
            annual: TIER_PRICING.creator.annualTotal,
            credits: TIER_LIMITS.creator.monthlyCredits,
            extraCreditCost: 40,
            popular: true,
            description: "For professional creators and small studios.",
          },
          {
            id: "studio" as const,
            name: "Studio",
            monthly: TIER_PRICING.studio.monthly,
            annual: TIER_PRICING.studio.annualTotal,
            credits: TIER_LIMITS.studio.monthlyCredits,
            extraCreditCost: 30,
            description: "For production studios with multiple projects.",
          },
          {
            id: "industry" as const,
            name: "Industry",
            monthly: TIER_PRICING.industry.monthly,
            annual: TIER_PRICING.industry.annualTotal,
            credits: TIER_LIMITS.industry.monthlyCredits,
            extraCreditCost: 25,
            description: "For major studios. Full power, no limits.",
          },
        ],
        creditCosts: CREDIT_COSTS,
        filmPackages: FILM_PACKAGES,
        vfxScenePackages: VFX_SCENE_PACKAGES,
        sceneByScenePricing: SCENE_BY_SCENE_PRICING,
        extensionPricing: EXTENSION_PRICING,
        launchSpecialActive: LAUNCH_SPECIAL_ACTIVE,
        topUpPacks: TOP_UP_PACKS,
        referralRewards: REFERRAL_REWARDS,
      };
    }),

    // Create a Stripe checkout for film production package
    createFilmPackageCheckout: protectedProcedure
      .input(z.object({
        packageId: z.string(),
        useLaunchPrice: z.boolean().default(true),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createFilmPackageCheckoutSession } = await import("./_core/subscription");
        const customerId = await getOrCreateStripeCustomer(ctx.user);
        await db.updateUserSubscription(ctx.user.id, { stripeCustomerId: customerId });
        const url = await createFilmPackageCheckoutSession(
          ctx.user,
          customerId,
          input.packageId,
          input.useLaunchPrice,
          input.successUrl,
          input.cancelUrl,
        );
        return { url };
      }),
  }),

  // ============================================================
  // ADVERTISING SYSTEM
  // ============================================================
  advertising: advertisingRouter,

  // ─── Blog (Public + Admin) ───
  seo: seoRouter,
  autonomous: autonomousRouter,
  marketing: marketingRouter,
  contentCreator: contentCreatorRouter,
  blog: router({
    // Public: list published articles
    list: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
        category: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { limit = 20, offset = 0, category } = input || {};
        if (category) {
          return db.getArticlesByCategory(category, limit);
        }
        return db.getPublishedArticles(limit, offset);
      }),

    // Public: get single article by slug
    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const article = await db.getArticleBySlug(input.slug);
        if (!article || article.status !== "published") {
          throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });
        }
        // Increment view count asynchronously
        db.incrementArticleViews(article.id).catch(() => {});
        return article;
      }),

    // Public: get article count
    count: publicProcedure.query(async () => {
      return { count: await db.getPublishedArticleCount() };
    }),

    // Admin: list all articles (including drafts)
    adminList: adminProcedure.query(async () => {
      return db.getAllArticles(100);
    }),

    // Admin: generate a new article on demand
    generate: adminProcedure.mutation(async ({ ctx }) => {
      try { await db.deductCredits(ctx.user!.id, CREDIT_COSTS.blog_article_gen.cost, "blog_article_gen", `Blog article generation`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
      const article = await generateBlogArticle();
      const saved = await db.createBlogArticle({
        slug: article.slug,
        title: article.title,
        subtitle: article.subtitle,
        content: article.content,
        excerpt: article.excerpt,
        category: article.category,
        tags: article.tags,
        metaTitle: article.metaTitle,
        metaDescription: article.metaDescription,
        generationPrompt: article.generationPrompt,
        coverImageUrl: article.coverImageUrl || null,
        generatedByAI: true,
        status: "published",
        publishedAt: new Date(),
      });
      return saved;
    }),

    // Admin: update article
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        excerpt: z.string().optional(),
        status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.status === "published") {
          (data as any).publishedAt = new Date();
        }
        return db.updateBlogArticle(id, data);
      }),

    // Admin: delete article
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBlogArticle(input.id);
        return { success: true };
      }),
  }),

  // ─── Referral System ───
  referral: router({
    // Get or create the user's referral code
    getMyCode: protectedProcedure.query(async ({ ctx }) => {
      let code = await db.getReferralCodeByUserId(ctx.user.id);
      if (!code) {
        // Auto-generate a referral code for the user
        const prefix = (ctx.user.name || "VRL").substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "V");
        const suffix = nanoid(6).toUpperCase();
        const codeStr = `${prefix}-${suffix}`;
        code = await db.createReferralCode({
          userId: ctx.user.id,
          code: codeStr,
        });
      }
      return code;
    }),

    // Get referral stats for the current user
    myStats: protectedProcedure.query(async ({ ctx }) => {
      const { REFERRAL_REWARDS } = await import("./_core/subscription");
      const code = await db.getReferralCodeByUserId(ctx.user.id);
      if (!code) return {
        totalReferrals: 0, successfulReferrals: 0, bonusCreditsEarned: 0, referrals: [],
        nextMilestone: REFERRAL_REWARDS.milestones[0], milestoneProgress: 0,
        completedMilestones: [],
      };
      const referrals = await db.getReferralTrackingByCode(code.id);
      const successful = code.successfulReferrals || 0;
      // Calculate milestone progress
      const completedMilestones = REFERRAL_REWARDS.milestones.filter(m => successful >= m.count);
      const nextMilestone = REFERRAL_REWARDS.milestones.find(m => successful < m.count) || null;
      const prevMilestoneCount = completedMilestones.length > 0
        ? completedMilestones[completedMilestones.length - 1].count
        : 0;
      const milestoneProgress = nextMilestone
        ? Math.round(((successful - prevMilestoneCount) / (nextMilestone.count - prevMilestoneCount)) * 100)
        : 100;
      return {
        code: code.code,
        totalReferrals: code.totalReferrals,
        successfulReferrals: successful,
        bonusCreditsEarned: code.bonusGenerationsEarned,
        nextMilestone,
        milestoneProgress,
        completedMilestones,
        referrals: referrals
          .filter(r => r.referredUserId)
          .map(r => ({
            status: r.status,
            rewardType: r.rewardType,
            rewardAmount: r.rewardAmount,
            createdAt: r.createdAt,
          })),
      };
    }),

    // Track a referral click (public - called when someone visits with ?ref=CODE)
    track: publicProcedure
      .input(z.object({
        code: z.string(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const refCode = await db.getReferralCodeByCode(input.code);
        if (!refCode || !refCode.isActive) {
          return { success: false, message: "Invalid referral code" };
        }
        // Record the click
        await db.createReferralTracking({
          referralCodeId: refCode.id,
          referrerId: refCode.userId,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
        });
        // Increment total referrals
        await db.updateReferralCode(refCode.id, {
          totalReferrals: (refCode.totalReferrals || 0) + 1,
        });
        return { success: true };
      }),

    // Complete a referral (called during registration when ref code is present)
    complete: publicProcedure
      .input(z.object({
        code: z.string(),
        referredUserId: z.number(),
        referredEmail: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const refCode = await db.getReferralCodeByCode(input.code);
        if (!refCode || !refCode.isActive) {
          return { success: false, message: "Invalid referral code" };
        }

        // Check if this user was already referred
        const existing = await db.getReferralTrackingByReferredUser(input.referredUserId);
        if (existing) {
          return { success: false, message: "User already referred" };
        }

        // Import reward config
        const { REFERRAL_REWARDS } = await import("./_core/subscription");
        const BASE_REWARD = REFERRAL_REWARDS.referrerCredits; // 7,000
        const NEW_USER_REWARD = REFERRAL_REWARDS.newUserCredits; // 7,000

        // Create tracking record
        await db.createReferralTracking({
          referralCodeId: refCode.id,
          referrerId: refCode.userId,
          referredUserId: input.referredUserId,
          referredEmail: input.referredEmail || null,
          status: "rewarded",
          rewardType: "bonus_generations",
          rewardAmount: BASE_REWARD,
          rewardedAt: new Date(),
        });

        const newSuccessfulCount = (refCode.successfulReferrals || 0) + 1;

        // Update referral code stats
        await db.updateReferralCode(refCode.id, {
          successfulReferrals: newSuccessfulCount,
          bonusGenerationsEarned: (refCode.bonusGenerationsEarned || 0) + BASE_REWARD,
        });

        // Award base credits to both parties
        await db.addBonusGenerations(refCode.userId, BASE_REWARD);
        await db.addBonusGenerations(input.referredUserId, NEW_USER_REWARD);

        // Check for milestone bonuses
        let milestoneBonus = 0;
        let milestoneLabel = "";
        const hitMilestone = REFERRAL_REWARDS.milestones.find(m => m.count === newSuccessfulCount);
        if (hitMilestone) {
          milestoneBonus = hitMilestone.bonus;
          milestoneLabel = hitMilestone.label;
          await db.addBonusGenerations(refCode.userId, milestoneBonus);
          await db.updateReferralCode(refCode.id, {
            bonusGenerationsEarned: (refCode.bonusGenerationsEarned || 0) + BASE_REWARD + milestoneBonus,
          });
          // Notify referrer of milestone
          try {
            await db.createNotification({
              userId: refCode.userId,
              type: "referral_reward",
              title: `🌟 Referral Milestone: ${milestoneLabel}!`,
              message: `You've referred ${newSuccessfulCount} members! You've earned a bonus of ${milestoneBonus.toLocaleString()} credits. Keep going!`,
              link: "/referrals",
            });
          } catch (_) { /* non-critical */ }
        }

        // Notify referrer of new signup
        try {
          await db.createNotification({
            userId: refCode.userId,
            type: "referral_reward",
            title: "New Referral Signup!",
            message: `Someone joined using your referral link. You earned ${BASE_REWARD.toLocaleString()} credits!${milestoneBonus ? ` Plus a ${milestoneLabel} milestone bonus of ${milestoneBonus.toLocaleString()} credits!` : ""}`,
            link: "/referrals",
          });
        } catch (_) { /* non-critical */ }

        return { success: true, referrerReward: BASE_REWARD, newUserReward: NEW_USER_REWARD, milestoneBonus, milestoneLabel };
      }),

    // Validate a referral code (public - for registration form)
    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const refCode = await db.getReferralCodeByCode(input.code);
        if (!refCode || !refCode.isActive) {
          return { valid: false };
        }
        return { valid: true, referrerName: "A VirÉlle Studios user" };
      }),
  }),
  // ─── Promo Codes (50% discount on first subscription payment) ───
  promo: router({
    // Validate a promo code (public — called live as user types)
    validate: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.validatePromoCode(input.code.trim().toUpperCase());
      }),
    // Apply a promo code to the current user's account (stores it for checkout)
    applyCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const code = input.code.trim().toUpperCase();
        const validation = await db.validatePromoCode(code);
        if (!validation.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: validation.message || "Invalid promo code" });
        }
        // Check if user already has a promo code applied
        const existing = await db.getUserPromoStatus(ctx.user.id);
        if (existing.appliedPromoCode) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You already have a promo code applied to your account" });
        }
        const success = await db.applyPromoCodeToUser(ctx.user.id, code);
        if (!success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to apply promo code" });
        return { success: true, discountPercent: validation.discountPercent, message: `Promo code applied! You'll get ${validation.discountPercent}% off your first payment.` };
      }),
    // Get the current user's promo status
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPromoStatus(ctx.user.id);
    }),
  }),
  // ─── User Settings & API Key Management ────
  settings: router({
    // Get current user profile and API key status
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      const u = user as any;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: u.role || "user",
        subscriptionTier: u.subscriptionTier || "independent",
        phone: u.phone || null,
        avatarUrl: u.avatarUrl || null,
        bio: u.bio || null,
        country: u.country || null,
        city: u.city || null,
        timezone: u.timezone || null,
        companyName: u.companyName || null,
        companyWebsite: u.companyWebsite || null,
        jobTitle: u.jobTitle || null,
        professionalRole: u.professionalRole || null,
        experienceLevel: u.experienceLevel || null,
        portfolioUrl: u.portfolioUrl || null,
        socialLinks: u.socialLinks || null,
        createdAt: u.createdAt || null,
        // Return which keys are configured (never return the actual keys)
        apiKeys: {
          openai: !!u.userOpenaiKey,
          runway: !!u.userRunwayKey,
          replicate: !!u.userReplicateKey,
          fal: !!u.userFalKey,
          luma: !!u.userLumaKey,
          huggingface: !!u.userHfToken,
          elevenlabs: !!u.userElevenlabsKey,
          suno: !!u.userSunoKey,
          seedance: !!(u as any).userByteplusKey,
          anthropic: !!(u as any).userAnthropicKey,
          google: !!(u as any).userGoogleAiKey,
          veo3: !!(u as any).userGoogleAiKey,  // veo3 uses the same Gemini key
        },
        preferredVideoProvider: u.preferredVideoProvider || null,
        preferredLlmProvider: (u as any).preferredLlmProvider || null,
        apiKeysUpdatedAt: u.apiKeysUpdatedAt || null,
      };
    }),

    // Update user profile
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255).optional(),
        phone: z.string().max(32).optional().nullable(),
        bio: z.string().max(1000).optional().nullable(),
        country: z.string().max(128).optional().nullable(),
        city: z.string().max(128).optional().nullable(),
        timezone: z.string().max(64).optional().nullable(),
        companyName: z.string().max(255).optional().nullable(),
        companyWebsite: z.string().max(512).optional().nullable(),
        jobTitle: z.string().max(255).optional().nullable(),
        professionalRole: z.string().max(128).optional().nullable(),
        experienceLevel: z.string().max(32).optional().nullable(),
        portfolioUrl: z.string().max(512).optional().nullable(),
        socialLinks: z.record(z.string(), z.string()).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserProfile(ctx.user!.id, input);
        return { success: true, message: "Profile updated" };
      }),

    // Change password
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user! as any;
        if (!user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account uses OAuth login — no password to change" });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
        }
        const newHash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(ctx.user!.id, newHash);
        return { success: true, message: "Password changed successfully" };
      }),

    // Get available video providers info
    getProviders: protectedProcedure.query(async () => {
      return VIDEO_PROVIDERS;
    }),

    // Save an API key for a specific provider
    saveApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google", "veo3"]),
        key: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { provider, key } = input;

        // Validate key format for video providers only (elevenlabs, suno, anthropic, google have no format validation)
        const videoOnlyProviders: string[] = ["openai", "runway", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"];
        if (videoOnlyProviders.includes(provider)) {
          const validation = validateApiKey(provider as VideoProvider, key);
          if (!validation.valid) {
            throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
          }
        }

        // Map provider to database column
        const columnMap: Record<string, string> = {
          openai: "userOpenaiKey",
          runway: "userRunwayKey",
          replicate: "userReplicateKey",
          fal: "userFalKey",
          luma: "userLumaKey",
          huggingface: "userHfToken",
          elevenlabs: "userElevenlabsKey",
          suno: "userSunoKey",
          seedance: "userByteplusKey",
          anthropic: "userAnthropicKey",
          google: "userGoogleAiKey",
          veo3: "userGoogleAiKey",  // veo3 uses the same Gemini key column
        };

        const column = columnMap[provider];
        if (!column) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid provider" });

        // Simple obfuscation (base64) — in production you'd use proper encryption
        const encoded = Buffer.from(key).toString("base64");

        await db.updateUserApiKey(ctx.user!.id, column, encoded);

        return { success: true, provider, message: `${provider} API key saved successfully` };
      }),

    // Remove an API key
    removeApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google", "veo3"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const columnMap: Record<string, string> = {
          openai: "userOpenaiKey",
          runway: "userRunwayKey",
          replicate: "userReplicateKey",
          fal: "userFalKey",
          luma: "userLumaKey",
          huggingface: "userHfToken",
          elevenlabs: "userElevenlabsKey",
          suno: "userSunoKey",
          seedance: "userByteplusKey",
          anthropic: "userAnthropicKey",
          google: "userGoogleAiKey",
          veo3: "userGoogleAiKey",
        };

        const column = columnMap[input.provider];
        if (!column) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid provider" });

        await db.updateUserApiKey(ctx.user!.id, column, null);

        return { success: true, provider: input.provider, message: `${input.provider} API key removed` };
      }),

    // Set preferred video provider
    setPreferredProvider: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"]).nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserPreferredProvider(ctx.user!.id, input.provider);
        return { success: true };
      }),

    // Test an API key to verify it works
    testApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google"]),
        key: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { provider, key } = input;

        try {
          switch (provider) {
            case "anthropic": {
              const resp = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "x-api-key": key,
                  "anthropic-version": "2023-06-01",
                  "content-type": "application/json",
                },
                body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
              });
              if (resp.ok || resp.status === 200) return { valid: true, message: "Anthropic (Claude) key is valid" };
              return { valid: false, message: `Anthropic returned ${resp.status}` };
            }
            case "google": {
              const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
              if (resp.ok) return { valid: true, message: "Google AI (Gemini) key is valid" };
              return { valid: false, message: `Google AI returned ${resp.status}` };
            }
            case "openai": {
              const resp = await fetch("https://api.openai.com/v1/models", {
                headers: { "Authorization": `Bearer ${key}` },
              });
              if (resp.ok) return { valid: true, message: "OpenAI key is valid" };
              return { valid: false, message: `OpenAI returned ${resp.status}` };
            }
            case "runway": {
              const resp = await fetch("https://api.dev.runwayml.com/v1/tasks?limit=1", {
                headers: { "Authorization": `Bearer ${key}`, "X-Runway-Version": "2024-11-06" },
              });
              if (resp.ok || resp.status === 200) return { valid: true, message: "Runway key is valid" };
              return { valid: false, message: `Runway returned ${resp.status}: ${await resp.text()}` };
            }
            case "replicate": {
              const resp = await fetch("https://api.replicate.com/v1/account", {
                headers: { "Authorization": `Bearer ${key}` },
              });
              if (resp.ok) return { valid: true, message: "Replicate key is valid" };
              return { valid: false, message: `Replicate returned ${resp.status}` };
            }
            case "fal": {
              // fal.ai doesn't have a simple validation endpoint, just check format
              return { valid: true, message: "fal.ai key format accepted (will be verified on first use)" };
            }
            case "luma": {
              const resp = await fetch("https://api.lumalabs.ai/dream-machine/v1/generations?limit=1", {
                headers: { "Authorization": `Bearer ${key}` },
              });
              if (resp.ok) return { valid: true, message: "Luma AI key is valid" };
              return { valid: false, message: `Luma returned ${resp.status}` };
            }
            case "huggingface": {
              const resp = await fetch("https://huggingface.co/api/whoami-v2", {
                headers: { "Authorization": `Bearer ${key}` },
              });
              if (resp.ok) return { valid: true, message: "Hugging Face token is valid" };
              return { valid: false, message: `Hugging Face returned ${resp.status}` };
            }
            case "elevenlabs": {
              const resp = await fetch("https://api.elevenlabs.io/v1/user", {
                headers: { "xi-api-key": key },
              });
              if (resp.ok) return { valid: true, message: "ElevenLabs key is valid" };
              return { valid: false, message: `ElevenLabs returned ${resp.status}` };
            }
            case "suno": {
              // Suno doesn't have a simple validation endpoint
              if (key.length > 10) return { valid: true, message: "Suno key format accepted (will be verified on first use)" };
              return { valid: false, message: "Suno key appears too short" };
            }
            case "seedance": {
              // Validate BytePlus ModelArk key by listing available models
              try {
                const resp = await fetch("https://ark.ap-southeast.bytepluses.com/api/v3/models", {
                  headers: { "Authorization": `Bearer ${key}` },
                  signal: AbortSignal.timeout(10000),
                });
                if (resp.ok) return { valid: true, message: "BytePlus ModelArk key is valid — SeedDance ready" };
                if (resp.status === 401) return { valid: false, message: "BytePlus key is invalid or expired" };
                // Other status codes might still be valid keys (e.g., 403 = no model access)
                return { valid: true, message: `BytePlus key accepted (status ${resp.status} — will be verified on first use)` };
              } catch {
                // If we can't reach BytePlus, accept the key and let generation verify it
                if (key.length > 10) return { valid: true, message: "BytePlus key format accepted (will be verified on first use)" };
                return { valid: false, message: "BytePlus API key appears too short" };
              }
            }
            default:
              return { valid: false, message: "Unknown provider" };
          }
        } catch (err: any) {
          return { valid: false, message: `Connection error: ${err.message}` };
        }
      }),
  }),

  // ─── Security Admin Dashboard ───
  security: router({
    stats: adminProcedure.query(() => {
      return getSecurityStats();
    }),

    events: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      }).optional())
      .query(({ input }) => {
        return getSecurityEvents(input?.limit || 100, input?.severity);
      }),

    flaggedUsers: adminProcedure.query(() => {
      return getFlaggedUsers();
    }),

    auditLog: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).optional(),
        userId: z.number().optional(),
      }).optional())
      .query(({ input }) => {
        return getAuditLog(input?.limit || 100, input?.userId);
      }),

    unflagUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => {
        unflagUser(input.userId);
        return { success: true, message: `User ${input.userId} unflagged` };
      }),

    lockUser: adminProcedure
      .input(z.object({
        userId: z.number(),
        durationMinutes: z.number().min(1).max(43200), // max 30 days
        reason: z.string().min(1).max(500),
      }))
      .mutation(({ input }) => {
        lockUser(input.userId, input.durationMinutes * 60 * 1000, input.reason);
        return { success: true, message: `User ${input.userId} locked for ${input.durationMinutes} minutes` };
      }),
  }),

  // ─── Project Samples ───
  projectSamples: router({
    // Public (all logged-in users): list published samples
    list: protectedProcedure.query(async () => {
      return db.getPublishedProjectSamples();
    }),
    // Admin only: list all samples including unpublished
    listAll: adminProcedure.query(async () => {
      return db.getAllProjectSamples();
    }),
    // Admin only: create a new sample (video + optional thumbnail via base64)
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        genre: z.string().max(64).optional(),
        provider: z.string().max(64).optional(),
        durationSeconds: z.number().optional(),
        displayOrder: z.number().default(0),
        isPublished: z.boolean().default(true),
        videoBase64: z.string().max(500_000_000, "Video too large. Max 350MB."),
        videoFilename: z.string(),
        videoContentType: z.string().default("video/mp4"),
        thumbnailBase64: z.string().max(10_000_000).optional(),
        thumbnailFilename: z.string().optional(),
        thumbnailContentType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const videoBuffer = Buffer.from(input.videoBase64, "base64");
        const videoKey = `samples/${nanoid()}-${input.videoFilename}`;
        const { url: videoUrl } = await storagePut(videoKey, videoBuffer, input.videoContentType);
        let thumbnailUrl: string | undefined;
        if (input.thumbnailBase64 && input.thumbnailFilename) {
          const thumbBuffer = Buffer.from(input.thumbnailBase64, "base64");
          const thumbKey = `samples/thumbs/${nanoid()}-${input.thumbnailFilename}`;
          const { url } = await storagePut(thumbKey, thumbBuffer, input.thumbnailContentType);
          thumbnailUrl = url;
        }
        return db.createProjectSample({
          title: input.title,
          description: input.description || null,
          genre: input.genre || null,
          provider: input.provider || null,
          videoUrl,
          thumbnailUrl: thumbnailUrl || null,
          durationSeconds: input.durationSeconds || null,
          displayOrder: input.displayOrder,
          isPublished: input.isPublished,
          uploadedBy: ctx.user.id,
        });
      }),
    // Admin only: update sample metadata
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional(),
        genre: z.string().max(64).optional(),
        provider: z.string().max(64).optional(),
        durationSeconds: z.number().optional(),
        displayOrder: z.number().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProjectSample(id, data);
      }),
    // Admin only: delete a sample
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProjectSample(input.id);
        return { success: true };
      }),
  }),

  // ─── Contact Form ───
  contact: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        company: z.string().max(255).optional(),
        subject: z.string().max(128).default("general"),
        message: z.string().min(10).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        const clientIP = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
        // Notify the owner via the notification system
        try {
          await notifyOwner({
            title: `[Contact] ${input.subject.toUpperCase()} — ${input.name}`,
            content: `From: ${input.name} <${input.email}>\nCompany: ${input.company || "N/A"}\nSubject: ${input.subject}\nIP: ${clientIP}\n\n${input.message}`,
          });
        } catch (notifyErr) {
          // Non-critical — still succeed even if notification fails
          logger.warn(`Contact form owner notification failed: ${notifyErr}`);
        }
        // Also create an in-app notification for admin users
        try {
          const adminUser = await db.getUserByEmail((ENV.adminEmail || "leego972@gmail.com").toLowerCase());
          if (adminUser) {
            await db.createNotification({
              userId: adminUser.id,
              type: "system",
              title: `New contact: ${input.name}`,
              message: `${input.email} — ${input.subject}: ${input.message.slice(0, 120)}${input.message.length > 120 ? "..." : ""}`,
              link: "/admin",
            });
          }
        } catch (_) { /* non-critical */ }
        logAuditEvent(0, "contact_form_submitted", clientIP, true, { email: input.email, subject: input.subject });
        return { success: true };
      }),
  }),

  // ─── Notifications ───
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserNotifications(ctx.user.id, input?.limit || 50);
      }),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return { count: await db.getUnreadNotificationCount(ctx.user.id) };
    }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  // ─── Credit History ───────────────────────────────────────────────────────
  credits: router({
    // Paginated credit transaction history for the current user
    getHistory: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getCreditHistory(ctx.user.id, input.limit, input.offset);
      }),
    // Credit balance summary (balance, tier, monthly allocation, period end)
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user as any;
      const tierAllocation: Record<string, number> = {
        independent: 10000,
        creator: 35000,
        studio: 100000,
        industry: 300000,
        amateur: 2500,
      };
      const tier = user.subscriptionTier || "independent";
      return {
        balance: user.creditBalance || 0,
        tier,
        monthlyAllocation: tierAllocation[tier] ?? 10000,
        subscriptionStatus: user.subscriptionStatus || "none",
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
      };
    }),
  }),
});
export type AppRouter = typeof appRouter;
