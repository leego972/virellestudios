import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, creationProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM, withUserLlmKey } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { generateNanoBananaImage, isNanoBananaAvailable } from "./_core/nanoBananaGeneration";
import { generateVideo, generateVideoWithFallback, buildVideoPrompt } from "./_core/videoGeneration";
import { generateUnifiedVideo, generateScenesParallel, buildUnifiedVideoPrompt, getAvailableProviders } from "./_core/unifiedVideoEngine";
import { generateVideo as generateBYOKVideo, VIDEO_PROVIDERS, validateApiKey, type UserApiKeys, type VideoProvider } from "./_core/byokVideoEngine";
import { nanoid } from "nanoid";
import { processDirectorMessage } from "./directorAssistant";
import { transcribeAudio } from "./_core/voiceTranscription";
import { TRPCError } from "@trpc/server";
import { assertOwnsProject, assertCanAccessProject } from "./_core/ownership";
import { safeJsonExtract } from "./_core/safeParse";
import { buildVisualDNA, buildScenePrompt, buildSceneBreakdownSystemPrompt, buildTrailerPrompt, ENHANCED_SCENE_SCHEMA, getDefaultNegativePrompt, type QualityTier } from "./_core/cinematicPromptEngine";
import bcrypt from "bcryptjs";
import { rateLimitAI, rateLimitHeavyAI, rateLimitUpload, rateLimitPublicByIP } from "./_core/rateLimit";
import { sanitizeText } from "./_core/sanitize";
import type { WardrobeItem } from "../drizzle/schema";
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
import { getEffectiveTier, getUserLimits, requireFeature, requireGenerationQuota, requireResourceQuota, getOrCreateStripeCustomer, createCheckoutSession, createBillingPortalSession, TIER_LIMITS, CREDIT_COSTS, getVideoCredits, stripe, isTopTierUser, type SubscriptionTier } from "./_core/subscription";
import { AD_PLATFORMS, generateAdContent, generateCampaignContent, createCampaign, getCampaign, listCampaigns, updateCampaignStatus, deleteCampaign, addPostRecord, getPlatformsByCategory, getRecommendedPlatforms, getSchedulerState, runAutonomousAdCycle, generateImageAd, generateVideoAd, type AdContentType, type AdCampaign } from "./_core/advertisingEngine";
import { getSocialCredentialStatus, postToLinkedIn, postToReddit, sendWhatsAppMessage, broadcastWhatsApp } from "./_core/socialPostingEngine";
import { ENV } from "./_core/env";
import { validatePublicUrl } from "./_core/envValidation";
import { seoRouter } from "./seo-router";
import { communityForumRouter } from "./community-forum-router";
import { autonomousRouter } from "./autonomous-router";
import { marketingRouter } from "./marketing-router";
import { adminSeedingRouter } from "./admin-seeding-router";
import { contentCreatorRouter } from "./content-creator-router";
import { advertisingRouter } from "./advertising-router";
import { mailingListRouter } from "./mailing-list-router";
import { fundingRouter } from "./funding-router";
import { crowdfundRouter } from "./crowdfund-router";
import { crowdfundMilestonesRouter } from "./crowdfund-milestones-router";
import { wardrobeMarketplaceRouter } from "./wardrobe-marketplace-router";
import { backgroundsRouter } from "./backgrounds-router";
import { propsRouter } from "./props-router";
import { narrativeRouter } from "./narrative-router";
import { lamaloGiftsRouter } from "./lamalo-gifts-router";
import { filmPostRouter } from "./film-post-router";
import { featureFilmRouter } from "./feature-film-router";
import { productionAssetsRouter } from "./production-assets-router";
import { productionDocumentsRouter } from "./production-documents-router";
import { epkGeneratorRouter } from "./epk-generator-router";
import { locationRecreationRouter } from "./location-recreation-router";
import { vfxSfxRouter } from "./vfx-sfx-router";
import { locationStudioRouter } from "./location-studio-router";
import { generateBlogArticle, startBlogScheduler, type GeneratedArticle } from "./_core/blogEngine";
import { generateFullFilm, generateSingleScene, estimateFilmCost, type FilmGenerationProgress } from "./_core/filmPipeline";
import { generateSceneDialogue, inferEmotionFromContext, TTS_PROVIDERS, EMOTION_STATES, type VoiceActingKeys } from "./_core/voiceActingEngine";
import { generateSoundtrack, MUSIC_PROVIDERS, type SoundtrackKeys } from "./_core/soundtrackEngine";
import { scanContent, handleModerationViolation } from "./_core/contentModerationEngine";
import { runLamaloSeed } from "./lamalo-seed";

// v6.77 ÃÂ¢ÃÂÃÂ Per-project brand allow/required/forbidden list, mapped into the
// shape buildScenePrompt expects. Used by every scene/trailer/poster/storyboard
// generator so the model knows which real-world brands may appear (Nike, Pepsi,
// storefront signage, billboards, etc.) and which it must NEVER show.
async function brandsForPrompt(projectId: number | null | undefined): Promise<Array<{
  name: string;
  category?: string | null;
  policy: "allowed" | "required" | "forbidden";
  notes?: string | null;
}>> {
  if (!projectId) return [];
  try {
    const rows = await db.getProjectBrands(projectId);
    return rows.map((b: any) => ({
      name: b.name,
      category: b.category,
      policy: (b.policy === "required" || b.policy === "forbidden" ? b.policy : "allowed") as
        | "allowed"
        | "required"
        | "forbidden",
      notes: b.notes,
    }));
  } catch {
    return [];
  }
}

// Render the brand list as a short directive block usable inside any LLM
// prompt that builds free-form descriptions (trailers, posters, storyboards,
// breakdowns) ÃÂ¢ÃÂÃÂ anywhere we don't go through buildScenePrompt directly.
function brandDirectiveBlock(brands: Awaited<ReturnType<typeof brandsForPrompt>>): string {
  if (!brands || brands.length === 0) return "";
  const required = brands.filter((b) => b.policy === "required");
  const allowed = brands.filter((b) => b.policy === "allowed");
  const forbidden = brands.filter((b) => b.policy === "forbidden");
  const lines: string[] = [];
  lines.push("PROJECT BRAND POLICY (real-world brands the director has set for this film):");
  if (required.length > 0) {
    lines.push(`- REQUIRED to appear (place them naturally on signage, packaging, vehicles, apparel, or background props): ${required.map((b) => b.name).join(", ")}.`);
  }
  if (allowed.length > 0) {
    lines.push(`- APPROVED for placement (may appear on storefronts, billboards, road signs, drinks, clothing, vehicles when contextually appropriate): ${allowed.map((b) => b.name).join(", ")}.`);
  }
  if (forbidden.length > 0) {
    lines.push(`- FORBIDDEN ÃÂ¢ÃÂÃÂ must NEVER appear, be named, or be hinted at in any frame; replace with generic / unmarked alternatives: ${forbidden.map((b) => b.name).join(", ")}.`);
  }
  if (allowed.length === 0 && required.length === 0) {
    lines.push("- All other background signage, packaging and apparel must be generic / unmarked unless explicitly listed above.");
  }
  return lines.join("\n");
}

// v6.77 ÃÂ¢ÃÂÃÂ Designer Wardrobe prompt context helper.
// For a given scene, returns a structured text block describing:
//   - per-character wardrobe / costume references attached to the scene
//   - scene-level set-dressing / shopfront / mood references
//   - usage-mode directives (must_match, costume_accurate, period_accurate)
//   - license / brand guardrails (no commercial logos unless allowed)
// The block is fed to buildScenePrompt as `wardrobeContext` and to other
// LLM-driven generators (trailer, breakdown, mood-board, poster) as a
// free-form directive block. Returns an empty string when nothing is
// attached, so call sites can pass it unconditionally.
async function getWardrobePromptContextForScene(
  sceneId: number,
  userId: number,
): Promise<string> {
  if (!sceneId) return "";
  try {
    const scene = await db.getSceneById(sceneId);
    if (!scene) return "";
    // Ownership check: only emit context for scenes the caller can access.
    const project = await db.getProjectById(scene.projectId, userId);
    if (!project) return "";

    // Pull every wardrobe assignment attached to this scene OR to any
    // character that appears in this scene. Keeps a single round-trip
    // cheap by reusing characters already on the scene record.
    const sceneAssignments = await db.getWardrobeAssignmentsByScene(sceneId);
    const characterIds: number[] = Array.isArray((scene as any).characterIds)
      ? ((scene as any).characterIds as number[])
      : [];
    const characterAssignmentLists = await Promise.all(
      characterIds.map((id) => db.getWardrobeAssignmentsByCharacter(id)),
    );
    const charAssignments = characterAssignmentLists.flat();

    const allAssignments = [...sceneAssignments, ...charAssignments];
    if (allAssignments.length === 0) return "";

    // Resolve referenced wardrobe items + characters in batch.
    const itemIds = Array.from(new Set(allAssignments.map((a) => a.wardrobeItemId)));
    const items = await Promise.all(itemIds.map((id) => db.getWardrobeItemById(id)));
    const itemById = new Map<number, NonNullable<typeof items[number]>>();
    for (const it of items) {
      if (it) itemById.set(it.id, it);
    }
    const charById = new Map<number, { id: number; name: string }>();
    for (const cid of characterIds) {
      const c = await db.getCharacterById(cid).catch(() => undefined);
      if (c) charById.set(c.id, { id: c.id, name: c.name });
    }
    // Resolve any characterIds referenced by scene-level assignments that are
    // not in scene.characterIds (avoids "Character #N" fallback in wardrobe prompt).
    const _extraCids = new Set<number>();
    for (const a of allAssignments) {
      if (a.characterId && !charById.has(a.characterId)) _extraCids.add(a.characterId);
    }
    for (const cid of _extraCids) {
      const c = await db.getCharacterById(cid).catch(() => undefined);
      if (c) charById.set(c.id, { id: c.id, name: c.name });
    }

    const characterLines: string[] = [];
    const sceneLines: string[] = [];
    let sawCommercialUseBlocked = false;
    let sawNoLogo = false;

    const fmtTags = (val: unknown): string => {
      if (Array.isArray(val)) return val.filter(Boolean).join(", ");
      if (val && typeof val === "string") return val;
      return "";
    };
    const fmtItem = (it: any) => {
      const bits: string[] = [];
      if (it.referencePrompt && it.referencePrompt.trim()) bits.push(it.referencePrompt.trim());
      if (it.description && it.description.trim() && bits.length === 0) bits.push(it.description.trim());
      const colors = fmtTags(it.colors);
      if (colors) bits.push(`colors: ${colors}`);
      const materials = fmtTags(it.materials);
      if (materials) bits.push(`materials: ${materials}`);
      const tags = fmtTags(it.styleTags);
      if (tags) bits.push(`style: ${tags}`);
      if (it.era) bits.push(`era: ${it.era}`);
      if (it.subcategory) bits.push(`type: ${it.subcategory}`);
      return bits.join(" ÃÂ¢ÃÂÃÂ ");
    };

    for (const a of allAssignments) {
      const item = itemById.get(a.wardrobeItemId);
      if (!item) continue;
      // Visibility guard ÃÂ¢ÃÂÃÂ never leak private items into prompts unless the
      // item is owned by the caller or explicitly attached to this project.
      const isOwner = item.userId === userId;
      const isProjectLinked = item.projectId === scene.projectId;
      const isPublicEnough = item.visibility === "public" || item.visibility === "unlisted";
      if (!isOwner && !isProjectLinked && !isPublicEnough) continue;

      if (!item.commercialUseAllowed) sawCommercialUseBlocked = true;
      if (!item.brandPlacementAllowed) sawNoLogo = true;

      const usage = a.usageMode || "reference";
      const usageHint = (() => {
        switch (usage) {
          case "must_match": return "MUST match this exact look";
          case "costume_accurate": return "render the COSTUME accurately (silhouette, era, materials, cultural details)";
          case "period_accurate": return "PERIOD-ACCURATE ÃÂ¢ÃÂÃÂ preserve era, fabric, silhouette, and cultural details";
          case "brand_visible": return "brand/label may be visible";
          case "background_only": return "background only ÃÂ¢ÃÂÃÂ do not feature";
          case "inspired_by": return "use as inspiration, not a strict match";
          default: return "use as visual reference";
        }
      })();

      if (a.characterId && (a.assignmentType === "character_wardrobe" || a.assignmentType === "character_costume")) {
        const c = charById.get(a.characterId);
        const who = c?.name || `Character #${a.characterId}`;
        const desc = fmtItem(item);
        const placement = a.placementNotes?.trim() ? ` Placement: ${a.placementNotes.trim()}.` : "";
        characterLines.push(`- ${who} should wear "${item.name}"${desc ? ` ÃÂ¢ÃÂÃÂ ${desc}` : ""}. (${usageHint}.)${placement}`);
      } else {
        const kind = (() => {
          switch (a.assignmentType) {
            case "scene_set_dressing": return "Set dressing";
            case "shopfront_display": return "Shopfront / boutique display";
            case "background_extra": return "Background extra wardrobe";
            case "mood_reference": return "Mood reference";
            case "period_reference": return "Period reference";
            case "uniform_reference": return "Uniform reference";
            default: return "Scene reference";
          }
        })();
        const desc = fmtItem(item);
        const placement = a.placementNotes?.trim() ? ` Placement: ${a.placementNotes.trim()}.` : "";
        sceneLines.push(`- ${kind}: "${item.name}"${desc ? ` ÃÂ¢ÃÂÃÂ ${desc}` : ""}. (${usageHint}.)${placement}`);
      }
    }

    if (characterLines.length === 0 && sceneLines.length === 0) return "";

    const out: string[] = [];
    out.push("DESIGNER WARDROBE ÃÂ¢ÃÂÃÂ director-attached references for this scene (treat as authoritative):");
    if (characterLines.length > 0) {
      out.push("Character wardrobe / costume:");
      out.push(...characterLines);
    }
    if (sceneLines.length > 0) {
      out.push("Scene set dressing / shopfront / mood:");
      out.push(...sceneLines);
    }
    const guards: string[] = [];
    if (sawNoLogo) {
      guards.push("Do NOT show real-world brand logos on these wardrobe items unless brand_visible usage was set.");
    }
    if (sawCommercialUseBlocked) {
      guards.push("These references are licensed for production use only ÃÂ¢ÃÂÃÂ keep stylistic match without copying trademarked logos verbatim.");
    }
    guards.push("For costume_accurate / period_accurate: preserve era, materials, silhouette, and cultural details exactly.");
    out.push("Wardrobe rules:");
    for (const g of guards) out.push(`- ${g}`);
    return out.join("\n");
  } catch {
    return "";
  }
}

  // Helper: getEffectiveWardrobeContext
  // Combines marketplace wardrobe assignments (from designer wardrobe DB) with
  // the inline per-character outfit overrides typed in the SceneEditor UI
  // (scene.wardrobe JSON). Marketplace text takes priority; inline entries are
  // used as fallback so user-typed outfit descriptions always reach the AI.
  async function getEffectiveWardrobeContext(
    scene: { id: number; wardrobe?: unknown },
    userId: number,
    characters: Array<{ id: number; name: string }>,
  ): Promise<string | undefined> {
    const marketplaceCtx = await getWardrobePromptContextForScene(scene.id, userId);
    if (marketplaceCtx?.trim()) return marketplaceCtx;
    const inline = scene.wardrobe as Array<{
      characterId?: number;
      wardrobeDescription?: string;
      hairNotes?: string;
      makeupNotes?: string;
      accessories?: string;
    }> | null | undefined;
    if (!Array.isArray(inline) || inline.length === 0) return marketplaceCtx || undefined;
    const lines = inline
      .filter(e => e.wardrobeDescription?.trim())
      .map(e => {
        const nm = characters.find(c => c.id === e.characterId)?.name || `Character ${e.characterId}`;
        const pts: string[] = [e.wardrobeDescription!.trim()];
        if (e.hairNotes?.trim()) pts.push(`hair: ${e.hairNotes.trim()}`);
        if (e.makeupNotes?.trim()) pts.push(`makeup: ${e.makeupNotes.trim()}`);
        if (e.accessories?.trim()) pts.push(`accessories: ${e.accessories.trim()}`);
        return `${nm}: ${pts.join(", ")}`;
      });
    return lines.length > 0
      ? `CHARACTER WARDROBE (scene overrides):\n${lines.join("\n")}`
      : marketplaceCtx || undefined;
  }

  // Build a rich, accurate prompt description for extended scene generation.
// Placed at module scope (not inside router object) to satisfy TypeScript's strict checker.
function buildExtendedSceneDescription(sceneData: any, cinematicPrompt: string, effectiveDialogueText?: string, wardrobeContext?: string, vfxLibraryContext?: string): string {
  const parts: string[] = [];
  if (sceneData.description) parts.push(sceneData.description);
  const dialogueText = effectiveDialogueText?.trim() || sceneData.dialogueText?.trim();
  if (dialogueText) parts.push(`DIALOGUE IN THIS SCENE: ${dialogueText}`);
  if (sceneData.productionNotes?.trim()) parts.push(`DIRECTOR NOTES: ${sceneData.productionNotes.trim()}`);
  if ((sceneData as any).shotIntent?.trim()) parts.push(`DIRECTOR SHOT INTENT (what this shot must convey emotionally): ${(sceneData as any).shotIntent.trim()}`);
  if ((sceneData as any).practicalLights?.trim()) parts.push(`PRACTICAL LIGHT SOURCES IN FRAME: ${(sceneData as any).practicalLights.trim()}`);
  if ((sceneData as any).coverageType?.trim()) parts.push(`SHOT COVERAGE TYPE: ${(sceneData as any).coverageType.replace(/_/g, ' ').trim()}`);
  if ((sceneData as any).screenDirection?.trim()) parts.push(`SCREEN DIRECTION: ${(sceneData as any).screenDirection.replace(/_/g, ' ').trim()}`);
  if ((sceneData as any).continuityNotes?.trim()) parts.push(`CONTINUITY FROM PREVIOUS SCENE: ${(sceneData as any).continuityNotes.trim()}`);
  if ((sceneData as any).dialogueSubtext?.trim()) parts.push(`DIALOGUE SUBTEXT (what characters truly mean beneath the words): ${(sceneData as any).dialogueSubtext.trim()}`);
  if ((sceneData as any).lensFilter?.trim()) parts.push(`OPTICAL FILTER ON LENS: ${(sceneData as any).lensFilter.replace(/_/g, ' ').trim()}`);
  if ((sceneData as any).shootingFormat?.trim()) parts.push(`SHOOTING FORMAT / COLOR SCIENCE: ${(sceneData as any).shootingFormat.replace(/_/g, ' ').trim()}`);
  if (sceneData.actionDescription?.trim()) parts.push(`ACTION: ${sceneData.actionDescription.trim()}`);
  if (sceneData.foregroundElements?.trim()) parts.push(`FOREGROUND: ${sceneData.foregroundElements.trim()}`);
  if (sceneData.backgroundElements?.trim()) parts.push(`BACKGROUND: ${sceneData.backgroundElements.trim()}`);
  if (sceneData.characterBlocking?.trim()) parts.push(`CHARACTER POSITIONS: ${sceneData.characterBlocking.trim()}`);
  if (wardrobeContext?.trim()) parts.push(`WARDROBE & COSTUME DIRECTIVES (characters must wear exactly): ${wardrobeContext.trim()}`);
    if ((sceneData as any).vfxNotes?.trim()) parts.push(`VFX DIRECTION: ${(sceneData as any).vfxNotes.trim()}`);
    if ((sceneData as any).sfxNotes?.trim()) parts.push(`SOUND EFFECTS DIRECTION: ${(sceneData as any).sfxNotes.trim()}`);
      if (vfxLibraryContext?.trim()) parts.push(`ACTIVE VFX LIBRARY SIGNATURE: ${vfxLibraryContext.trim()}`);
    if ((sceneData as any).sfxProductionNotes?.trim()) parts.push(`SFX PRODUCTION NOTES: ${(sceneData as any).sfxProductionNotes.trim()}`);
    if ((sceneData as any).ambientSound?.trim()) parts.push(`AMBIENT SOUNDSCAPE: ${(sceneData as any).ambientSound.trim()}`);
    if ((sceneData as any).musicMood?.trim()) {
      const musicStr = (sceneData as any).musicTempo?.trim()
        ? `${(sceneData as any).musicMood.trim()} at ${(sceneData as any).musicTempo.trim()} tempo`
        : (sceneData as any).musicMood.trim();
      parts.push(`MUSICAL ATMOSPHERE: ${musicStr}`);
    }
    if ((sceneData as any).subtitleText?.trim()) parts.push(`ACCESSIBILITY CONTEXT (D/deaf-aware): ${(sceneData as any).subtitleText.trim()}`);
    if (cinematicPrompt) parts.push(`CINEMATIC STYLE: ${cinematicPrompt}`);
    return parts.join('. ');
  }

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const isAdmin = ctx.user.role === "admin";
      const u = ctx.user;
      // SECURITY: Explicit field whitelist — BYOK API keys, Stripe IDs, and
      // openId are server-only. Never spread the full user row to the client.
      return {
        // Identity
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        role: u.role,
        isAdmin,
        loginMethod: u.loginMethod,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastSignedIn: u.lastSignedIn,
        // Subscription
        subscriptionTier: u.subscriptionTier,
        subscriptionStatus: u.subscriptionStatus,
        subscriptionCurrentPeriodEnd: u.subscriptionCurrentPeriodEnd,
        creditBalance: isAdmin ? -1 : (u.creditBalance ?? 0),
        totalCreditsEarned: u.totalCreditsEarned,
        totalCreditsSpent: u.totalCreditsSpent,
        creditsResetAt: u.creditsResetAt,
        monthlyGenerationsUsed: u.monthlyGenerationsUsed,
        monthlyGenerationsResetAt: u.monthlyGenerationsResetAt,
        bonusGenerations: u.bonusGenerations,
        betaExpiresAt: u.betaExpiresAt,
        // Referral
        referralCode: u.referralCode,
        referralStats: u.referralStats,
        // Profile
        phone: u.phone,
        bio: u.bio,
        country: u.country,
        city: u.city,
        timezone: u.timezone,
        companyName: u.companyName,
        companyWebsite: u.companyWebsite,
        jobTitle: u.jobTitle,
        professionalRole: u.professionalRole,
        experienceLevel: u.experienceLevel,
        industryType: u.industryType,
        teamSize: u.teamSize,
        preferredGenres: u.preferredGenres,
        primaryUseCase: u.primaryUseCase,
        portfolioUrl: u.portfolioUrl,
        socialLinks: u.socialLinks,
        howDidYouHear: u.howDidYouHear,
        marketingOptIn: u.marketingOptIn,
        onboardingCompleted: u.onboardingCompleted,
        // Account status
        isFrozen: u.isFrozen,
        frozenReason: u.frozenReason,
        frozenAt: u.frozenAt,
        accountExpiresAt: (u as any).accountExpiresAt,
        // BYOK metadata (preferences + presence flags — never the raw key values)
        byokFallbackMode: u.byokFallbackMode,
        preferredVideoProvider: u.preferredVideoProvider,
        preferredLlmProvider: u.preferredLlmProvider,
        directorInstructions: u.directorInstructions,
        apiKeysUpdatedAt: u.apiKeysUpdatedAt,
        byokKeys: {
          hasOpenai:      Boolean(u.userOpenaiKey),
          hasRunway:      Boolean(u.userRunwayKey),
          hasReplicate:   Boolean(u.userReplicateKey),
          hasFal:         Boolean(u.userFalKey),
          hasLuma:        Boolean(u.userLumaKey),
          hasHuggingFace: Boolean(u.userHfToken),
          hasElevenlabs:  Boolean(u.userElevenlabsKey),
          hasSuno:        Boolean(u.userSunoKey),
          hasBytePlus:    Boolean(u.userByteplusKey),
          hasAnthropic:   Boolean(u.userAnthropicKey),
          hasGoogleAi:    Boolean(u.userGoogleAiKey),
          hasVenice:      Boolean(u.userVeniceKey),
          hasDid:         Boolean(u.userDidKey),
        },
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateAvatar: protectedProcedure
      .input(z.object({
        imageDataUrl: z.string().min(1).max(10 * 1024 * 1024),
      }))
      .mutation(async ({ ctx, input }) => {
        const match = input.imageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image data URL" });
        const [, contentType, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length > 5 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be under 5MB" });
        }
        const ext = (contentType.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
        const key = `avatars/user-${ctx.user.id}-${Date.now()}.${ext}`;
        let avatarUrl: string;
        try {
          avatarUrl = (await storagePut(key, buffer, contentType)).url;
        } catch {
          avatarUrl = input.imageDataUrl;
        }
        await db.updateUser(ctx.user.id, { avatarUrl });
        return { avatarUrl };
      }),
    register: publicProcedure
      .input(z.object({
        email: z.string().email().max(320).trim(),
        password: z.string().min(8).max(128),
        name: z.string().min(1).max(255).trim(),
        referralCode: z.string().max(64).optional(),
        promoCode: z.string().max(64).optional(),
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
          stripeCustomerId: z.string().max(64).optional(),
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
          stripeCustomerId: input.stripeCustomerId,
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
             logger.errorWithStack("Referral processing error:", err);
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
            logger.errorWithStack("Promo code application error:", err);
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
          logger.errorWithStack("Auto-create referral code error:", err);
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
        // Send welcome email + studio notification via Resend (non-blocking, fire-and-forget)
        if (user.email) {
          import("./email").then(({ sendWelcomeEmail, sendNewSignupNotification }) => {
            sendWelcomeEmail(user!.email!, user!.name || "Filmmaker").catch(() => {});
            sendNewSignupNotification(user!.email!, user!.name || "Unknown", user!.role || "user").catch(() => {});
          }).catch(() => {});
        }
        // Grant 500 welcome credits — enough to explore the platform for a full week
        try {
          await db.addCredits(user.id, 500, "signup_welcome_bonus", "Welcome bonus — 500 credits to explore Virelle Studios");
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
        const isAdminAccount = user.role === "admin";
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
        // v6.82: Login must NEVER promote a user to admin. Admin authority
        // is database-role only ÃÂ¢ÃÂÃÂ see SECURITY.md ÃÂÃÂ§8 "Admin authority model".
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
    createSetupIntent: publicProcedure
      .input(z.object({
        email: z.string().email().max(320).optional(),
        name: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
          // Rate limit: max 5 password reset requests per IP per hour to prevent email flooding
          const clientIP = ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || ctx.req.socket.remoteAddress || "unknown";
          await rateLimitPublicByIP(clientIP, "password-reset", 5, 60 * 60 * 1000);
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system not configured" });
        // Create or retrieve Stripe customer
        const customerData: { email?: string; name?: string; metadata?: Record<string, string> } = {
          metadata: { source: "registration_trial" },
        };
        if (input.email) customerData.email = input.email;
        if (input.name) customerData.name = input.name;
        const customer = await stripe.customers.create(customerData);
        // Create SetupIntent — saves card for future billing when trial ends
        const setupIntent = await stripe.setupIntents.create({
          customer: customer.id,
          usage: "off_session",
          payment_method_types: ["card"],
          metadata: { source: "registration_trial", email: input.email || "" },
        });
        return {
            clientSecret: setupIntent.client_secret,
            customerId: customer.id,
            setupIntentId: setupIntent.id,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
          };
        }),
      requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email().max(320), origin: z.string().url().max(256) }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email.toLowerCase());
        if (!user) {
          // Don't reveal if email exists
          return { success: true, message: "If an account with that email exists, a reset link has been sent." };
        }
        const token = nanoid(64);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await db.createPasswordResetToken(user.id, token, expiresAt);
        // Validate origin against known-good domains to prevent phishing via open-redirect
        // in password reset emails. If the client supplies an unrecognised origin we fall
        // back to the canonical production domain so the email still works.
        const ALLOWED_ORIGIN_PATTERNS = [
          /^https:\/\/(www\.)?virelle\.life$/,
          /^https:\/\/[a-z0-9-]+\.replit\.dev$/,
          /^https:\/\/[a-z0-9-]+\.repl\.co$/,
          /^http:\/\/localhost(:[0-9]+)?$/,
        ];
        const safeOrigin = ALLOWED_ORIGIN_PATTERNS.some(re => re.test(input.origin))
          ? input.origin
          : "https://www.virelle.life";
        // Send password reset email via Gmail SMTP
        const { sendPasswordResetEmail } = await import("./email");
        const sent = await sendPasswordResetEmail(user.email!, token, safeOrigin);
        if (!sent) {
          logger.error(`Failed to send password reset email to ${user.email}`);
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

      // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Voice Cloning ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
      // Upload an audio sample ÃÂ¢ÃÂÃÂ ElevenLabs instantVC ÃÂ¢ÃÂÃÂ voice_id saved on character.
      cloneVoice: protectedProcedure
        .input(z.object({
          characterId: z.number(),
          name: z.string().min(1).max(128),
          audioBase64: z.string().min(1),
          description: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const char = await db.getCharacterById(input.characterId);
          if (!char) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
          if (char.projectId) await assertCanAccessProject(char.projectId, ctx.user.id);
            else if (char.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have access to this character." });
          const userKeys = await db.getUserApiKeys(ctx.user.id);
          const elevenlabsKey = userKeys.elevenlabsKey;
          if (!elevenlabsKey) throw new TRPCError({ code: "BAD_REQUEST", message: "ElevenLabs API key required for voice cloning. Add it in Settings ÃÂ¢ÃÂÃÂ API Keys." });
          const audioBuffer = Buffer.from(input.audioBase64, "base64");
          const formData = new FormData();
          formData.append("name", input.name);
          if (input.description) formData.append("description", input.description);
          formData.append("files", new Blob([audioBuffer], { type: "audio/mpeg" }), "sample.mp3");
          const resp = await fetch("https://api.elevenlabs.io/v1/voices/add", {
            method: "POST",
            headers: { "xi-api-key": elevenlabsKey },
            body: formData as any,
          });
          if (!resp.ok) {
            const err = await resp.text().catch(() => "Voice API error");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Voice cloning failed: ${err.slice(0, 200)}` });
          }
          const data = await resp.json() as any;
          const voiceId = data.voice_id as string;
          if (!voiceId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ElevenLabs did not return a voice_id" });
          await db.updateCharacter(input.characterId, { voiceId } as any);
          logger.info(`[character.cloneVoice] voice ${voiceId} for char ${input.characterId}`);
          return { voiceId, success: true };
        }),
    }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Admin ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    updateUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        await db.updateUserRole(input.userId, input.role);
        logAuditEvent(ctx.user.id, "admin_update_user_role", ctx.req.ip || "unknown", true, { targetUserId: input.userId, newRole: input.role });
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
        await db.addCredits(input.userId, 5000, "beta_welcome", "Beta tester welcome credits ÃÂ¢ÃÂÃÂ 5,000 credits included");
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
      .mutation(async ({ ctx, input }) => {
        await db.addCredits(input.userId, input.amount, "admin_grant", input.reason || "Admin credit grant");
        logAuditEvent(ctx.user.id, "admin_grant_credits", ctx.req.ip || "unknown", true, { targetUserId: input.userId, amount: input.amount, reason: input.reason });
        return { success: true };
      }),
    provisionBetaTester: adminProcedure
      .mutation(async ({ ctx }) => {
        const BETA_EMAIL = process.env.BETA_TESTER_EMAIL ?? "tester@virelle.life";
        const BETA_NAME  = "Virelle Beta Tester";
        const BETA_PASS  = process.env.BETA_TESTER_PASSWORD;
        if (!BETA_PASS) throw new Error("BETA_TESTER_PASSWORD env var not set");

        try {
          // Already exists ÃÂ¢ÃÂÃÂ sync API keys from admin caller
          const existing = await db.getUserByEmail(BETA_EMAIL);
          if (existing) {
            await db.updateUser(existing.id, {
              userOpenaiKey:     ctx.user.userOpenaiKey    ?? undefined,
              userRunwayKey:     ctx.user.userRunwayKey    ?? undefined,
              userReplicateKey:  ctx.user.userReplicateKey ?? undefined,
              userFalKey:        ctx.user.userFalKey       ?? undefined,
              userLumaKey:       ctx.user.userLumaKey      ?? undefined,
              userHfToken:       ctx.user.userHfToken      ?? undefined,
              userElevenlabsKey: ctx.user.userElevenlabsKey ?? undefined,
              userSunoKey:       ctx.user.userSunoKey      ?? undefined,
              userByteplusKey:   ctx.user.userByteplusKey  ?? undefined,
              userAnthropicKey:  ctx.user.userAnthropicKey ?? undefined,
              userGoogleAiKey:   ctx.user.userGoogleAiKey  ?? undefined,
              userVeniceKey:     ctx.user.userVeniceKey    ?? undefined,
              userDidKey:        ctx.user.userDidKey       ?? undefined,
              preferredVideoProvider: ctx.user.preferredVideoProvider ?? undefined,
              preferredLlmProvider:   ctx.user.preferredLlmProvider   ?? undefined,
              subscriptionTier:   "studio",
              subscriptionStatus: "active",
              bonusGenerations:   9999,
              creditBalance:      50000,
              apiKeysUpdatedAt:   new Date(),
            });
            logAuditEvent(ctx.user.id, "beta_tester_api_keys_synced", ctx.req.ip || "unknown", true, { targetEmail: BETA_EMAIL });
            return { created: false, synced: true, email: BETA_EMAIL };
          }

          // Create fresh account
          const passwordHash = await bcrypt.hash(BETA_PASS, 12);
          const newUser = await db.createEmailUser({
            email: BETA_EMAIL,
            name: BETA_NAME,
            passwordHash,
            howDidYouHear: "beta_provision"
          });

          if (!newUser) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create beta tester account"
            });
          }

          // Copy admin's API keys + set studio-level access
          await db.updateUser(newUser.id, {
            userOpenaiKey:     ctx.user.userOpenaiKey    ?? undefined,
            userRunwayKey:     ctx.user.userRunwayKey    ?? undefined,
            userReplicateKey:  ctx.user.userReplicateKey ?? undefined,
            userFalKey:        ctx.user.userFalKey       ?? undefined,
            userLumaKey:       ctx.user.userLumaKey      ?? undefined,
            userHfToken:       ctx.user.userHfToken      ?? undefined,
            userElevenlabsKey: ctx.user.userElevenlabsKey ?? undefined,
            userSunoKey:       ctx.user.userSunoKey      ?? undefined,
            userByteplusKey:   ctx.user.userByteplusKey  ?? undefined,
            userAnthropicKey:  ctx.user.userAnthropicKey ?? undefined,
            userGoogleAiKey:   ctx.user.userGoogleAiKey  ?? undefined,
            userVeniceKey:     ctx.user.userVeniceKey    ?? undefined,
            userDidKey:        ctx.user.userDidKey       ?? undefined,
            preferredVideoProvider: ctx.user.preferredVideoProvider ?? undefined,
            preferredLlmProvider:   ctx.user.preferredLlmProvider   ?? undefined,
            subscriptionTier:   "studio",
            subscriptionStatus: "active",
            bonusGenerations:   9999,
            creditBalance:      50000,
            apiKeysUpdatedAt:   new Date(),
          });

          logAuditEvent(ctx.user.id, "beta_tester_provisioned", ctx.req.ip || "unknown", true, { targetEmail: BETA_EMAIL, newUserId: newUser.id });
          return { created: true, synced: false, email: BETA_EMAIL, userId: newUser.id };
        } catch (error: any) {
          logger.errorWithStack("[admin.provisionBetaTester] Error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "Failed to provision beta tester"
          });
        }
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Projects ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
            // Ignore errors ÃÂ¢ÃÂÃÂ just show placeholder
          }
        }));
      }
      return projects;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.id, ctx.user.id);
        // Auto-populate thumbnailUrl from first scene with a thumbnail if project has none
        if (project && !(project as any).thumbnailUrl) {
          try {
            const scenes = await db.getProjectScenes(project.id);
            // Prefer scene with both thumbnail AND video; fall back to any with thumbnail
            const sceneWithThumb =
              scenes.find((s: any) => s.thumbnailUrl && (s as any).videoUrl) ||
              scenes.find((s: any) => s.thumbnailUrl);
            if (sceneWithThumb?.thumbnailUrl) {
              (project as any).thumbnailUrl = sceneWithThumb.thumbnailUrl;
              // Persist so future loads are fast
              await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: sceneWithThumb.thumbnailUrl }).catch(() => {});
            }
          } catch { /* non-critical */ }
        }
        return project;
      }),

    create: creationProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(5000).optional(),
        mode: z.enum(["quick", "manual", "trailer"]),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(360).optional(),
        genre: z.string().optional(),
        plotSummary: z.string().max(5000).optional(),
        resolution: z.string().optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        // Story & Narrative
        mainPlot: z.string().max(5000).optional(),
        sidePlots: z.string().max(5000).optional(),
        plotTwists: z.string().max(2000).optional(),
        characterArcs: z.string().max(2000).optional(),
        themes: z.string().max(1000).optional(),
        setting: z.string().max(1000).optional(),
        actStructure: z.string().max(500).optional(),
        tone: z.string().max(500).optional(),
        targetAudience: z.string().max(500).optional(),
        openingScene: z.string().max(2000).optional(),
        climax: z.string().max(2000).optional(),
        storyResolution: z.string().max(2000).optional(),
        cinemaIndustry: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Credits: deduct for creating a project
        // create_project is FREE ÃÂ¢ÃÂÃÂ no credit deduction (zero friction on project creation)
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


      // One-button demo short: creates project + 5 scenes + fires video generation automatically
      createDemoShort: creationProcedure
        .mutation(async ({ ctx }) => {
          await rateLimitHeavyAI(ctx.user.id);
          requireFeature(ctx.user, "canUseQuickGenerate", "Demo Short");
          requireGenerationQuota(ctx.user);
          const projectCount = await db.getUserProjectCount(ctx.user.id);
          requireResourceQuota(ctx.user, "maxProjects", projectCount, "projects");
          const stamp = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
          const project = await db.createProject({
            userId: ctx.user.id,
            title: `Virelle Demo Short ÃÂ¢ÃÂÃÂ ${stamp}`,
            description: "A showcase demo generated entirely by Virelle Studios. Five cinematic scenes ÃÂ¢ÃÂÃÂ golden-hour chase, rooftop standoff, rain-soaked revelation, underground rave, sunrise epilogue.",
            mode: "manual",
            genre: "Thriller",
            rating: "PG-13",
            duration: 5,
            tone: "Cinematic, tense, visually rich",
            plotSummary: "A courier discovers a package holding the last copy of a stolen AI model. Chased through a neon-lit city, she must decide whether to deliver it or destroy it before dawn.",
            setting: "Near-future metropolis, golden hour through to dawn",
            mainPlot: "Courier Elena receives a package with no sender. Two factions chase her across the city. By sunrise she must choose a side.",
            themes: "Technology, identity, trust, sacrifice",
          } as any);
          const DEMO_SCENES = [
            { orderIndex: 0, title: "The Drop", description: "Elena sprints through a crowded golden-hour market as two black SUVs screech around the corner behind her.", timeOfDay: "golden hour", weather: "clear", lighting: "warm golden backlight, long shadows, lens flares", mood: "urgent, kinetic", emotionalBeat: "fear turning into determination", cameraAngle: "low angle", cameraMovement: "tracking shot", colorGrading: "golden orange tones, high contrast", locationType: "outdoor market", duration: 60, transitionType: "smash-cut", aiPromptOverride: "Photorealistic cinematic footage, ARRI ALEXA 65, 24fps. A young woman in a leather jacket sprints through a crowded golden-hour street market in a near-future city. Warm amber light floods through market awnings, long dramatic shadows. Two black SUVs screech around the corner in pursuit. Low tracking shot through the stalls. Shallow depth of field. Golden orange color grading, high contrast." },
            { orderIndex: 1, title: "Rooftop Standoff", description: "Elena reaches a rain-slicked rooftop, cornered. A corporate agent steps from the stairwell ÃÂ¢ÃÂÃÂ calm, unhurried. The city glitters 40 floors below.", timeOfDay: "dusk", weather: "rain", lighting: "cool blue ambient, neon reflections on wet concrete", mood: "tense, confrontational", emotionalBeat: "defiance", cameraAngle: "eye level", cameraMovement: "slow push in", colorGrading: "cool teal tones, neon accents", locationType: "rooftop", duration: 60, transitionType: "dissolve", aiPromptOverride: "Photorealistic cinematic footage, ARRI ALEXA 65, 24fps. A rain-soaked rooftop 40 floors above a neon-lit near-future city at dusk. A young woman backs toward the edge, cornered. A suited corporate agent steps from the stairwell, unhurried. Neon reflections on wet concrete. Slow cinematic push-in. Cool teal color grading, neon orange and blue accents." },
            { orderIndex: 2, title: "The Revelation", description: "In a rain-soaked alley, Elena opens the package. Inside: a holographic message from her missing sister.", timeOfDay: "night", weather: "rain", lighting: "single overhead sodium lamp, holographic blue glow", mood: "emotional, revelatory", emotionalBeat: "grief into resolve", cameraAngle: "close up", cameraMovement: "slow zoom", colorGrading: "desaturated with holographic blue bloom", locationType: "alley", duration: 60, transitionType: "fade", aiPromptOverride: "Photorealistic cinematic footage, ARRI ALEXA 65, 24fps. A young woman crouches in a rain-drenched alley at night, opening a mysterious package under a flickering sodium lamp. Holographic blue light spills from inside, illuminating her face. Tears form. Close-up, slow zoom. Desaturated palette with holographic blue bloom. Rain in soft slow motion." },
            { orderIndex: 3, title: "Underground", description: "Elena descends into an underground rave ÃÂ¢ÃÂÃÂ the handoff point. Strobing lights, bodies, bass. She scans for her contact in the chaos.", timeOfDay: "night", weather: "clear", lighting: "strobe lights, UV, laser grid, smoke haze", mood: "disorienting, electric", emotionalBeat: "controlled panic", cameraAngle: "dutch angle", cameraMovement: "handheld", colorGrading: "high contrast neon, UV purple and electric blue", locationType: "interior nightclub", duration: 60, transitionType: "match-cut", aiPromptOverride: "Photorealistic cinematic footage, ARRI ALEXA 65, 24fps. A young woman pushes through a packed underground rave in a near-future city. Strobing white light, UV glow, laser grid cutting through smoke haze. Hundreds of bodies. She scans faces urgently. Handheld camera, dutch angle. UV purple, electric blue, hot white strobes." },
            { orderIndex: 4, title: "Sunrise", description: "Dawn. Elena sits alone on a concrete bridge above the waking city, the package delivered. Whatever she sacrificed ÃÂ¢ÃÂÃÂ it mattered.", timeOfDay: "dawn", weather: "clear", lighting: "soft pink-gold sunrise, long warm rays, lens flare", mood: "bittersweet, hopeful", emotionalBeat: "quiet triumph", cameraAngle: "wide shot", cameraMovement: "slow crane up", colorGrading: "warm rose gold, soft bloom", locationType: "bridge", duration: 60, transitionType: "fade", aiPromptOverride: "Photorealistic cinematic footage, ARRI ALEXA 65, 24fps. A young woman sits alone on the edge of a concrete bridge above a waking near-future city at dawn. Pink-gold sunrise light spills across the skyline. Slow crane up revealing the full cityscape. Warm rose-gold color grading, soft bloom, anamorphic lens flares." },
          ];
          const createdScenes = await Promise.all(
            DEMO_SCENES.map((s) => db.createScene({ ...s, projectId: project.id, userId: ctx.user.id } as any))
          );
          await db.updateProject(project.id, ctx.user.id, { status: "generating", progress: 0 });
          const userId = ctx.user.id;
          const ctxUser = ctx.user;
          const projectId = project.id;
          setImmediate(async () => {
            try {
              const rawUserKeys = await db.getUserApiKeys(userId);
              const isAdmin = ctxUser.role === "admin";
              const byokKeys: UserApiKeys = {
                openaiKey: rawUserKeys.openaiKey || (isAdmin ? ENV.openaiApiKey : undefined),
                runwayKey: rawUserKeys.runwayKey || (isAdmin ? ENV.runwayApiKey : undefined),
                replicateKey: rawUserKeys.replicateKey,
                falKey: rawUserKeys.falKey || (isAdmin ? ENV.falApiKey : undefined),
                lumaKey: rawUserKeys.lumaKey,
                hfToken: rawUserKeys.hfToken,
                byteplusKey: rawUserKeys.byteplusKey,
                googleAiKey: rawUserKeys.googleAiKey || (isAdmin ? ENV.googleApiKey : undefined),
                preferredProvider: rawUserKeys.preferredProvider,
              };
              await Promise.allSettled(
                createdScenes.map(async (scene: any, idx: number) => {
                  try {
                    await db.updateScene(scene.id, { status: "generating" });
                    const prompt = (scene.aiPromptOverride as string) || scene.description || scene.title;
                    const videoResult = await generateBYOKVideo(byokKeys, { prompt, duration: 10, aspectRatio: "16:9", resolution: "720p" });
                    const isAsync = videoResult.videoUrl.startsWith("runway-pending:") || videoResult.videoUrl.startsWith("fal-pending") || videoResult.videoUrl.startsWith("veo3-pending:");
                    if (isAsync && videoResult.jobId) {
                      // Build provider-specific metadata so the worker knows which task to poll and has the API key
                        const jobProvider = videoResult.provider;
                        const jobMeta: Record<string, any> = { provider: jobProvider, sceneId: scene.id, projectId, userId, prompt };
                        if (jobProvider === "runway") {
                          jobMeta.runwayTaskId = videoResult.jobId;
                          jobMeta.runwayApiKey = byokKeys.runwayKey;
                          jobMeta.ratio = "1280:768";
                          jobMeta.duration = 10;
                        } else if (jobProvider === "veo3") {
                          jobMeta.veo3OperationName = videoResult.jobId;
                          jobMeta.veo3ApiKey = byokKeys.googleAiKey;
                        } else if (jobProvider === "fal") {
                          jobMeta.falRequestId = videoResult.jobId;
                          jobMeta.falApiKey = byokKeys.falKey;
                          jobMeta.falModel = "fal-ai/wan-pro";
                        } else if (jobProvider === "seedance") {
                          jobMeta.seedanceTaskId = videoResult.jobId;
                          jobMeta.seedanceApiKey = byokKeys.byteplusKey;
                        }
                        await db.createGenerationJob({ projectId, sceneId: scene.id, type: "scene", status: "processing", progress: 0, estimatedSeconds: 120, metadata: JSON.stringify(jobMeta) } as any);
                      await db.updateScene(scene.id, { videoUrl: videoResult.videoUrl, status: "generating" });
                    } else {
                      await db.updateScene(scene.id, { videoUrl: videoResult.videoUrl, thumbnailUrl: videoResult.thumbnailUrl || undefined, status: "completed" });
                      if (idx === 0 && videoResult.thumbnailUrl) await db.updateProject(projectId, userId, { thumbnailUrl: videoResult.thumbnailUrl }).catch(() => {});
                    }
                  } catch (e: any) {
                    logger.error(`[DemoShort] Scene ${idx + 1} failed: ${e.message}`);
                    await db.updateScene(scene.id, { status: "failed" }).catch(() => {});
                  }
                })
              );
              const finalScenes = await db.getProjectScenes(projectId);
              const allDone = finalScenes.every((s: any) => s.status === "completed" || s.status === "failed");
              if (allDone) await db.updateProject(projectId, userId, { status: "completed", progress: 100 }).catch(() => {});
            } catch (err: any) {
              logger.error(`[DemoShort] Background error: ${err.message}`);
              await db.updateProject(projectId, userId, { status: "failed" }).catch(() => {});
            }
          });
          logger.info("Demo short generation started", { userId, projectId: project.id });
          return { projectId: project.id, sceneCount: createdScenes.length, status: "generating" };
        }),
    update: creationProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(5000).optional(),
        rating: z.enum(["G", "PG", "PG-13", "R"]).optional(),
        duration: z.number().min(1).max(180).optional(),
        genre: z.string().max(128).optional(),
        plotSummary: z.string().max(5000).optional(),
        status: z.enum(["draft", "generating", "paused", "completed", "failed"]).optional(),
        thumbnailUrl: z.string().optional(),
        resolution: z.string().max(64).optional(),
        quality: z.enum(["standard", "high", "ultra"]).optional(),
        colorGrading: z.string().max(256).optional(),
        colorGradingSettings: z.any().optional(),
        // Story & Narrative
        mainPlot: z.string().max(5000).optional(),
        sidePlots: z.string().max(5000).optional(),
        plotTwists: z.string().max(2000).optional(),
        characterArcs: z.string().max(2000).optional(),
        themes: z.string().max(1000).optional(),
        setting: z.string().max(1000).optional(),
        actStructure: z.string().max(500).optional(),
        tone: z.string().max(500).optional(),
        targetAudience: z.string().max(500).optional(),
        openingScene: z.string().max(2000).optional(),
        climax: z.string().max(2000).optional(),
        storyResolution: z.string().max(2000).optional(),
        cinemaIndustry: z.string().max(256).optional(),
        // Accessibility
        subtitlesEnabled: z.boolean().optional(),
        auslanEnabled: z.boolean().optional(),
        auslanPosition: z.enum(["bottom-left", "bottom-right"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateProject(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteProject(input.id, ctx.user.id);
        return { success: true };
      }),

      cancelGeneration: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
          const project = await db.getProjectById(input.id, ctx.user.id);
          if (!project) throw new TRPCError({ code: "NOT_FOUND" });
          await db.updateProject(input.id, ctx.user.id, { status: "draft" });
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Stateless review-share link (owner-only) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // Returns a public URL the owner can share with producers, friends, or
    // collaborators. The token is an HMAC of the project id, so no schema
    // change is needed and revocation = rotate JWT_SECRET.
    getShareLink: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertOwnsProject(input.id, ctx.user.id);
        const { makeShareToken } = await import("./_core/shareToken");
        const token = makeShareToken(input.id);
        return { path: `/share/${input.id}/${token}`, token };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Public read-only project view (token-gated) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // Used by /share/:projectId/:token for review/approval flows.
    getPublicById: publicProcedure
      .input(z.object({ id: z.number(), token: z.string() }))
      .query(async ({ input }) => {
        const { verifyShareToken } = await import("./_core/shareToken");
        if (!verifyShareToken(input.id, input.token)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Invalid or expired share link" });
        }
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const result = await dbConn.execute(
          sql`SELECT p.id, p.title, p.genre, p.mode, p.plotSummary, p.description, p.logline,
                     p.duration, p.quality, p.resolution, p.status, p.thumbnailUrl, p.createdAt,
                     u.name as directorName
              FROM projects p
              LEFT JOIN users u ON p.userId = u.id
              WHERE p.id = ${input.id}
              LIMIT 1`
        );
        const rows = (Array.isArray(result[0]) ? result[0] : result) as any[];
        const project = rows?.[0];
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(input.id);
        const safeScenes = (scenes as any[]).map((s) => ({
          id: s.id,
          sceneNumber: s.sceneNumber,
          title: s.title,
          description: s.description,
          status: s.status,
          thumbnailUrl: s.thumbnailUrl,
          videoUrl: s.videoUrl,
          duration: s.duration,
        }));
        return { project, scenes: safeScenes };
      }),

    // v6.68 Phase 2 ÃÂ¢ÃÂÃÂ Project Command Center health summary.
    // Pure read aggregation; no AI calls, no writes. Used to power the
    // Command Center page and the Next Best Action prompt.
    getHealthSummary: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getProjectHealthSummary } = await import("./_core/projectHealth");
        const summary = await getProjectHealthSummary(input.projectId, ctx.user.id);
        if (!summary) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        return summary;
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Characters ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  character: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const chars = await db.getUserLibraryCharacters(ctx.user.id);
      return chars.slice(0, 500);
    }),

    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectCharacters(input.projectId);
      }),

    listLibrary: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLibraryCharacters(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const character = await db.getCharacterById(input.id);
        if (!character) return undefined;
        if (character.projectId) {
          // Project character — verify project access
          await assertCanAccessProject(character.projectId, ctx.user.id);
        } else {
          // Library character (no project) — must belong to requesting user
          if (character.userId !== ctx.user.id) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
          }
        }
        return character;
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number().nullable().optional(),
        name: z.string().min(1).max(128),
        description: z.string().max(2000).optional(),
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
        backstory: z.string().max(5000).optional(),
        motivations: z.string().max(2000).optional(),
        fears: z.string().max(2000).optional(),
        secrets: z.string().max(2000).optional(),
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
        description: z.string().max(2000).optional(),
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
        await db.deleteCharacter(input.id, ctx.user.id);
        return { success: true };
      }),

    // AI Character Generator ÃÂ¢ÃÂÃÂ create photorealistic portrait from feature selections

      /**
       * Stripe Checkout for AI character generation ÃÂ¢ÃÂÃÂ A$1.99 one-time.
       * Returns { free: true } immediately for Industry-tier members (no charge).
       */
      aiGenerateCheckout: protectedProcedure
        .input(z.object({ returnUrl: z.string().url().max(512) }))
        .mutation(async ({ ctx, input }) => {
          if (isTopTierUser(ctx.user)) return { free: true as const, checkoutUrl: null, sessionId: null };
          if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments not configured" });
          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [{ price_data: { currency: "aud", product_data: { name: "AI Character Generation ÃÂ¢ÃÂÃÂ Virelle Studios", description: "Generate a hyper-realistic photorealistic character portrait from your chosen features." }, unit_amount: 199 }, quantity: 1 }],
            success_url: input.returnUrl + "?char_gen_session={CHECKOUT_SESSION_ID}",
            cancel_url:  input.returnUrl + "?char_gen_cancelled=1",
            metadata: { userId: String(ctx.user.id), type: "ai_character_gen" },
            customer_email: (ctx.user as any).email ?? undefined,
          });
          return { free: false as const, checkoutUrl: session.url, sessionId: session.id };
        }),

      /**
       * Stripe Checkout for character-from-photo generation ÃÂ¢ÃÂÃÂ A$5.99 one-time.
       * Returns { free: true } immediately for Industry-tier members (no charge).
       */
      aiGenerateFromPhotoCheckout: protectedProcedure
        .input(z.object({ returnUrl: z.string().url().max(512) }))
        .mutation(async ({ ctx, input }) => {
          if (isTopTierUser(ctx.user)) return { free: true as const, checkoutUrl: null, sessionId: null };
          if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payments not configured" });
          const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items: [{ price_data: { currency: "aud", product_data: { name: "Character from Photo ÃÂ¢ÃÂÃÂ Virelle Studios", description: "Upload a reference photo ÃÂ¢ÃÂÃÂ AI analyzes and recreates a hyper-realistic cinematic character portrait." }, unit_amount: 599 }, quantity: 1 }],
            success_url: input.returnUrl + "?char_photo_session={CHECKOUT_SESSION_ID}",
            cancel_url:  input.returnUrl + "?char_photo_cancelled=1",
            metadata: { userId: String(ctx.user.id), type: "ai_character_from_photo" },
            customer_email: (ctx.user as any).email ?? undefined,
          });
          return { free: false as const, checkoutUrl: session.url, sessionId: session.id };
        }),

      aiGenerate: creationProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        projectId: z.number().nullable().optional(),
        freeDescription: z.string().min(5).max(2000).optional(),
        features: z.object({
          ageRange: z.string().max(64), // "20s", "30s", "40s", etc.
          gender: z.string().max(64),
          ethnicity: z.string().max(128),
          skinTone: z.string().max(64).optional(),
          build: z.string().max(64).optional(), // slim, athletic, average, heavy
          height: z.string().max(64).optional(), // short, average, tall
          hairColor: z.string().max(64),
          hairStyle: z.string().max(128),
          eyeColor: z.string().max(64),
          facialFeatures: z.string().max(256).optional(), // sharp jawline, round face, etc.
          facialHair: z.string().max(128).optional(),
          distinguishingMarks: z.string().max(256).optional(), // scars, tattoos, freckles
          clothingStyle: z.string().max(256).optional(),
          expression: z.string().max(128).optional(), // serious, warm, mysterious
          additionalNotes: z.string().max(500).optional(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAICharacterGen", "AI Character Generation");
        // Industry-tier members get AI character generation FREE ÃÂ¢ÃÂÃÂ skip quota + credit deduction
        if (!isTopTierUser(ctx.user)) {
          requireGenerationQuota(ctx.user);
          try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.character_gen_ai.cost, "character_gen_ai", `AI character generation: ${input.name}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        }
        await db.incrementGenerationCount(ctx.user.id);

        // Free-text path: user typed their own description ÃÂ¢ÃÂÃÂ their words define the character exactly
        if (input.freeDescription) {
          const freePrompt = [
            "RAW photograph, ultra-photorealistic Hollywood portrait, absolutely indistinguishable from a real photograph,",
            "captured on ARRI ALEXA 65 with Zeiss Supreme Prime lens at f/1.4, cinematic shallow depth of field,",
            input.freeDescription + ",",
            "three-point Rembrandt lighting, Kodak Vision3 500T film stock, 8K resolution,",
            "NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render ÃÂ¢ÃÂÃÂ a REAL PHOTOGRAPH of a REAL PERSON",
          ].join(" ");
          const freeResult = await generateImage({ prompt: freePrompt }).catch((_e: unknown) => {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Character image generation failed. Please try again." });
          });
          const freeCharacter = await db.createCharacter({
            userId: ctx.user.id,
            projectId: input.projectId ?? null,
            name: input.name,
            description: input.freeDescription,
            photoUrl: freeResult.url,
            attributes: { aiGenerated: true, freeDescription: true },
          });
          return freeCharacter;
        }

        const f = input.features!;
        const promptParts = [
          // Core photorealism anchor ÃÂ¢ÃÂÃÂ this is the most critical part
          "RAW photograph, ultra-photorealistic Hollywood A-list actor headshot, absolutely indistinguishable from a real photograph of a real human being,",
          "captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lens at f/1.4, shallow cinematic depth of field with natural oval bokeh,",
          // Physical description
          `${f.gender} in their ${f.ageRange},`,
          `${f.ethnicity} ethnicity,`,
        ];
        if (f.skinTone) promptParts.push(`${f.skinTone} skin tone ÃÂ¢ÃÂÃÂ skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers, visible pores, micro-wrinkles, fine peach fuzz hair on skin surface, natural blemishes and freckles, authentic facial asymmetry ÃÂ¢ÃÂÃÂ no airbrushed or plastic skin,`);
        if (f.build) promptParts.push(`${f.build} build,`);
        if (f.height) promptParts.push(`${f.height} height,`);
        promptParts.push(`${f.hairColor} ${f.hairStyle} hair ÃÂ¢ÃÂÃÂ individual strand detail visible, natural hair texture with flyaways and imperfections, realistic hair sheen,`);
        promptParts.push(`${f.eyeColor} eyes ÃÂ¢ÃÂÃÂ hyper-realistic iris with detailed fiber structure, natural corneal reflections and specular highlights, subtle moisture in waterline, sclera with faint realistic veins, soulful and alive expression,`);
        if (f.facialFeatures) promptParts.push(`${f.facialFeatures},`);
        if (f.facialHair) promptParts.push(`facial hair: ${f.facialHair} with individual hair strand detail,`);
        if (f.distinguishingMarks) promptParts.push(`${f.distinguishingMarks},`);
        if (f.clothingStyle) promptParts.push(`wearing ${f.clothingStyle} ÃÂ¢ÃÂÃÂ fabric texture and material weight visible,`);
        if (f.expression) promptParts.push(`${f.expression} expression with authentic micro-expressions and genuine emotion,`);
        if (f.additionalNotes) promptParts.push(f.additionalNotes);
        promptParts.push(
          // Lighting ÃÂ¢ÃÂÃÂ Hollywood three-point Rembrandt setup
          "three-point Rembrandt lighting: warm key light at 45 degrees creating a Rembrandt triangle on the face, soft fill light reducing shadow ratio to 2:1, subtle rim/hair light separating subject from background,",
          "volumetric atmospheric light with physically accurate inverse-square falloff,",
          // Skin and face realism
          "skin pores visible under magnification, micro-wrinkles around eyes and mouth, natural skin oil and moisture, capillaries visible in sclera,",
          "authentic facial bone structure with natural asymmetry ÃÂ¢ÃÂÃÂ no perfect symmetry, no uncanny valley,",
          // Technical quality
          "Kodak Vision3 500T film stock color science with organic grain structure and natural highlight rolloff,",
          "8K resolution, hyperdetailed, Academy Award-winning portrait photography,",
          // Negative guidance embedded in prompt
          "NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-looking, NOT plastic skin, NOT doll-like, NOT overly smooth ÃÂ¢ÃÂÃÂ a REAL PHOTOGRAPH of a REAL PERSON"
        );

        const result = await generateImage({ prompt: promptParts.join(" ") }).catch((_e: unknown) => {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Character image generation failed. Please try again." });
        });

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

    // AI Character Generator from Photo ÃÂ¢ÃÂÃÂ analyze a reference photo and create a cinematic character portrait
    aiGenerateFromPhoto: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(128),
        projectId: z.number().nullable().optional(),
        photoBase64: z.string().max(14_000_000, "File too large. Max 10MB.").optional().default(""), // base64 encoded reference photo
        photoMimeType: z.string().default("image/jpeg"),
        referenceImageUrl: z.string().url().optional(), // URL from Wikimedia Commons search
        characterRole: z.string().optional(), // hero, villain, mentor, etc.
        style: z.string().optional(), // cinematic, noir, sci-fi, fantasy, etc.
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAICharacterGen", "AI Character Generation");
        // Industry-tier members get character-from-photo generation FREE ÃÂ¢ÃÂÃÂ skip quota + credit deduction
        if (!isTopTierUser(ctx.user)) {
          requireGenerationQuota(ctx.user);
          try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.character_gen_ai.cost, "character_gen_ai", `AI character from photo: ${input.name}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        }
        await db.incrementGenerationCount(ctx.user.id);

        // Step 1: Resolve the reference photo ÃÂ¢ÃÂÃÂ either from uploaded base64 or from a URL
        let resolvedBase64 = input.photoBase64 ?? "";
        let resolvedMimeType = input.photoMimeType;
        let refPhotoUrl: string;

        if (input.referenceImageUrl) {
          // Fetch image from Wikimedia Commons URL
          validatePublicUrl(input.referenceImageUrl, "referenceImageUrl");
          const imgRes = await fetch(input.referenceImageUrl, {
            headers: { "User-Agent": "VirellStudios/1.0 (https://virelle.life)" },
          });
          if (!imgRes.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to fetch reference image from URL" });
          const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
          const contentType = imgRes.headers.get("content-type") || "image/jpeg";
          resolvedMimeType = contentType.split(";")[0].trim();
          resolvedBase64 = imgBuffer.toString("base64");
          // Upload to S3
          const photoKey = `uploads/${ctx.user.id}/ref-${nanoid()}.jpg`;
          const stored = await storagePut(photoKey, imgBuffer, resolvedMimeType);
          refPhotoUrl = stored.url;
        } else {
          if (!resolvedBase64) throw new TRPCError({ code: "BAD_REQUEST", message: "Either photoBase64 or referenceImageUrl is required" });
          const photoBuffer = Buffer.from(resolvedBase64, "base64");
          const photoKey = `uploads/${ctx.user.id}/ref-${nanoid()}.jpg`;
          const stored = await storagePut(photoKey, photoBuffer, resolvedMimeType);
          refPhotoUrl = stored.url;
        }

        // Step 2: Use LLM with vision to analyze the photo and extract maximum physical detail
        // The richer the extraction, the better the character generation and scene consistency.
        const analysisResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are the world's leading forensic portrait analyst and Hollywood casting director. Your job is to extract every observable physical characteristic from a reference photo with the precision of a forensic scientist and the eye of a master cinematographer.

Your analysis will be used to:
1. Generate a photorealistic character portrait that is indistinguishable from the reference person
2. Maintain perfect visual consistency of this character across dozens of film scenes
3. Direct a VFX team to recreate this person in any lighting, angle, or environment

Be obsessively precise. Use specific, measurable, visual language. Never use vague terms like "normal" or "average" ÃÂ¢ÃÂÃÂ always describe what you actually observe. If you cannot observe a feature clearly, describe what IS visible and note the limitation.

Focus especially on:
- Face geometry: exact bone structure, proportions, spatial relationships between features
- Skin quality: texture, undertone, specific imperfections, how it responds to light
- Eyes: iris pattern, limbal ring, sclera quality, lid shape, lash density
- Hair: exact color with highlights/lowlights, texture, growth pattern, density
- Micro-features: the specific details that make this face unique and recognisable`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${resolvedMimeType};base64,${resolvedBase64}`, detail: "high" },
                },
                {
                  type: "text",
                  text: `Perform a complete forensic physical analysis of this person for cinematic character recreation.

Character name: ${input.name}
${input.characterRole ? `Character role: ${input.characterRole}` : ""}
${input.additionalNotes ? `Director notes: ${input.additionalNotes}` : ""}

Analyze every visible feature with maximum precision. Return as JSON.`,
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
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Demographics ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  estimatedAge: { type: "string", description: "Precise age estimate with range, e.g. 'mid-30s, approximately 34-37'" },
                  gender: { type: "string", description: "Gender presentation as observed" },
                  ethnicity: { type: "string", description: "Specific ethnic heritage as observable from features, e.g. 'East Asian ÃÂ¢ÃÂÃÂ likely Korean or Japanese' or 'Mixed ÃÂ¢ÃÂÃÂ appears West African and European'" },
                  nationality: { type: "string", description: "Most likely nationality based on features and any visible context clues" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Skin ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  skinTone: { type: "string", description: "Precise skin tone using Fitzpatrick scale + descriptive, e.g. 'Fitzpatrick Type III ÃÂ¢ÃÂÃÂ warm olive undertone, golden-brown in natural light'" },
                  skinUndertone: { type: "string", description: "Warm/cool/neutral undertone and specific hue, e.g. 'warm golden-yellow undertone'" },
                  skinTexture: { type: "string", description: "Texture quality: pore size, smoothness, visible imperfections, oiliness/dryness" },
                  skinAgeMarkers: { type: "string", description: "Visible age markers: fine lines, wrinkles, laugh lines, crow's feet, forehead lines ÃÂ¢ÃÂÃÂ location and depth" },
                  skinImperfections: { type: "string", description: "Specific visible marks: moles, freckles, scars, birthmarks, hyperpigmentation ÃÂ¢ÃÂÃÂ exact location" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Face Geometry ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  faceShape: { type: "string", description: "Precise face shape with proportions, e.g. 'elongated oval ÃÂ¢ÃÂÃÂ forehead slightly wider than jaw, high cheekbones, tapered chin'" },
                  foreheadShape: { type: "string", description: "Forehead height, width, hairline shape (straight/widow's peak/receding), brow ridge prominence" },
                  cheekboneStructure: { type: "string", description: "Cheekbone height, prominence, width ÃÂ¢ÃÂÃÂ e.g. 'high prominent cheekbones with defined hollows beneath'" },
                  jawlineShape: { type: "string", description: "Jaw angle, width, definition ÃÂ¢ÃÂÃÂ e.g. 'strong angular jaw with defined mandibular angle, slight squareness'" },
                  chinShape: { type: "string", description: "Chin shape, projection, cleft if present ÃÂ¢ÃÂÃÂ e.g. 'slightly pointed chin with subtle horizontal dimple'" },
                  facialSymmetry: { type: "string", description: "Degree of symmetry and notable asymmetries ÃÂ¢ÃÂÃÂ e.g. 'slight left-side dominance, right eye marginally higher'" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Eyes ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  eyeColor: { type: "string", description: "Precise iris color with pattern, e.g. 'deep hazel ÃÂ¢ÃÂÃÂ inner ring warm amber, outer ring dark green-brown, visible spoke pattern'" },
                  eyeShape: { type: "string", description: "Eye shape: almond/round/hooded/monolid/upturned/downturned, with lid crease details" },
                  eyeSize: { type: "string", description: "Relative eye size and spacing ÃÂ¢ÃÂÃÂ e.g. 'medium-large, slightly wide-set'" },
                  eyebrowShape: { type: "string", description: "Brow shape, thickness, arch height, color, density ÃÂ¢ÃÂÃÂ e.g. 'thick straight brows with slight natural arch, dark brown, full'" },
                  eyelashDescription: { type: "string", description: "Lash length, density, curl, color" },
                  eyeExpression: { type: "string", description: "The emotional quality conveyed by the eyes ÃÂ¢ÃÂÃÂ e.g. 'intense and watchful, slight downward inner corner creating a melancholic quality'" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Nose ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  noseType: { type: "string", description: "Nose shape: bridge width/height, tip shape, nostril shape/flare, overall profile ÃÂ¢ÃÂÃÂ e.g. 'straight medium bridge, rounded soft tip, slightly wide nostrils'" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Mouth & Lips ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  lipShape: { type: "string", description: "Lip fullness top/bottom, cupid's bow shape, lip line definition, natural color ÃÂ¢ÃÂÃÂ e.g. 'full lower lip, defined cupid's bow, natural rose-pink'" },
                  mouthWidth: { type: "string", description: "Mouth width relative to face ÃÂ¢ÃÂÃÂ e.g. 'medium-wide, corners slightly upturned at rest'" },
                  teethVisible: { type: "string", description: "If teeth visible: color, alignment, shape" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Hair ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  hairColor: { type: "string", description: "Precise hair color with highlights/lowlights/undertone, e.g. 'dark espresso brown with subtle warm auburn highlights in direct light'" },
                  hairStyle: { type: "string", description: "Specific style: cut, layers, texture styling" },
                  hairLength: { type: "string", description: "Precise length reference" },
                  hairTexture: { type: "string", description: "Natural texture: straight/wavy/curly/coily, density, thickness per strand" },
                  hairlineShape: { type: "string", description: "Hairline shape and any recession" },
                  facialHair: { type: "string", description: "Precise facial hair description or 'clean-shaven'" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Body (if visible) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  build: { type: "string", description: "Body type as observable: lean/athletic/muscular/average/stocky/plus-size with specific notes" },
                  neckDescription: { type: "string", description: "Neck length, width, visible musculature" },
                  shoulderDescription: { type: "string", description: "Shoulder width and posture if visible" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Expression & Presence ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  expression: { type: "string", description: "Precise expression in the photo and what it conveys" },
                  restingExpression: { type: "string", description: "The character's likely resting/neutral expression tendency" },
                  overallVibe: { type: "string", description: "The overall screen presence and charisma ÃÂ¢ÃÂÃÂ what a casting director would note" },
                  distinguishingFeatures: { type: "string", description: "The 3-5 most distinctive features that make this face uniquely recognisable ÃÂ¢ÃÂÃÂ the things a sketch artist would prioritise" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Lighting Response ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  lightingResponse: { type: "string", description: "How this person's skin and features respond to light ÃÂ¢ÃÂÃÂ e.g. 'olive skin creates warm golden tones under warm light, cool undertones emerge under blue light, cheekbones catch light dramatically'" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Clothing (if relevant) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  clothing: { type: "string", description: "Visible clothing description" },
                  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Master Description ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
                  detailedDescription: { type: "string", description: "A 3-4 sentence master casting description that a director could read aloud to immediately visualise this person" },
                  cinematographerNotes: { type: "string", description: "Notes for the cinematographer on how to light and shoot this face for maximum impact" },
                },
                required: [
                  "estimatedAge", "gender", "ethnicity", "nationality",
                  "skinTone", "skinUndertone", "skinTexture", "skinAgeMarkers", "skinImperfections",
                  "faceShape", "foreheadShape", "cheekboneStructure", "jawlineShape", "chinShape", "facialSymmetry",
                  "eyeColor", "eyeShape", "eyeSize", "eyebrowShape", "eyelashDescription", "eyeExpression",
                  "noseType",
                  "lipShape", "mouthWidth", "teethVisible",
                  "hairColor", "hairStyle", "hairLength", "hairTexture", "hairlineShape", "facialHair",
                  "build", "neckDescription", "shoulderDescription",
                  "expression", "restingExpression", "overallVibe", "distinguishingFeatures",
                  "lightingResponse", "clothing",
                  "detailedDescription", "cinematographerNotes",
                ],
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

        // Step 3: Build a hyper-detailed, face-first image generation prompt
        // Structure: [TECHNICAL BASE] [FACE GEOMETRY] [SKIN] [EYES] [HAIR] [BODY] [STYLE/LIGHTING] [REALISM ENFORCEMENT]
        // Face features come first so the AI model weights them highest.
        const style = input.style || "cinematic";

        // Technical base ÃÂ¢ÃÂÃÂ always photorealistic, style only changes lighting/mood
        const photorealismBase = [
          "RAW photograph, absolutely indistinguishable from a real photograph of a real human being",
          "captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance T1.5 anamorphic lens",
          "Kodak Vision3 500T film stock color science with organic grain structure",
          "8K resolution, Academy Award-winning portrait photography",
        ].join(", ");

        const styleMap: Record<string, string> = {
          cinematic: "three-point Rembrandt lighting with soft key, fill, and rim separation, shallow depth of field f/1.4 creamy bokeh, cinematic color grading with lifted blacks, volumetric atmospheric light, Hollywood movie character portrait on neutral dark background",
          noir: "extreme high-contrast single-source lighting casting deep impenetrable shadows, venetian blind light patterns casting bars across the face, desaturated with selective warm amber practical light, 1940s Hollywood noir aesthetic, smoke and atmosphere",
          "sci-fi": "holographic rim lighting casting colored cyan and magenta shadows on skin, neon accent lights reflecting off face with colored specular highlights, cyberpunk color palette, futuristic environment reflections in iris, volumetric light beams",
          fantasy: "ethereal magical golden-hour backlight with lens flare, rich detailed costume and armor with physically-based material rendering, mystical atmospheric haze, epic scale environment in background, warm magical light wrapping the face",
          horror: "extreme low-key underlighting from a single harsh source creating menacing shadows under eyes and jaw, pale sickly complexion, desaturated with selective deep red accents, heavy vignette, cold blue-green ambient",
          comedy: "bright warm high-key three-point lighting at 5600K, natural relaxed expression with genuine smile, inviting and charismatic presence, vibrant saturated background, clean flattering light",
          period: "old-master painting-inspired lighting with warm candlelight tones, historically accurate styling and costume, rich fabric textures, golden hour warmth, Rembrandt triangle on face",
          action: "dramatic hard backlighting with anamorphic horizontal lens flare, intense determined expression, grit and sweat beading on skin, high contrast cinematic grading, dust particles in air, motivated practical light",
        };
        const stylePrompt = styleMap[style] || styleMap.cinematic;

        // Build the face geometry block ÃÂ¢ÃÂÃÂ this is the highest-priority section
        const faceGeometryBlock = [
          analysis.faceShape ? `${analysis.faceShape} face` : "",
          analysis.foreheadShape ? `forehead: ${analysis.foreheadShape}` : "",
          analysis.cheekboneStructure ? `cheekbones: ${analysis.cheekboneStructure}` : "",
          analysis.jawlineShape ? `jaw: ${analysis.jawlineShape}` : "",
          analysis.chinShape ? `chin: ${analysis.chinShape}` : "",
          analysis.facialSymmetry ? `facial symmetry: ${analysis.facialSymmetry}` : "",
        ].filter(Boolean).join(", ");

        // Build the skin block ÃÂ¢ÃÂÃÂ the most visible realism indicator
        const skinBlock = [
          analysis.skinTone ? `${analysis.skinTone} skin` : "natural skin",
          analysis.skinUndertone ? `${analysis.skinUndertone} undertone` : "",
          analysis.skinTexture ? `skin texture: ${analysis.skinTexture}` : "",
          analysis.skinAgeMarkers && analysis.skinAgeMarkers !== "none" ? `age markers: ${analysis.skinAgeMarkers}` : "",
          analysis.skinImperfections && analysis.skinImperfections !== "none" ? `visible marks: ${analysis.skinImperfections}` : "",
          // Always enforce photorealistic skin rendering
          "skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers",
          "visible pores and micro-wrinkles and fine peach fuzz on skin surface",
          "natural skin blemishes and authentic facial asymmetry",
          analysis.lightingResponse ? `lighting response: ${analysis.lightingResponse}` : "",
        ].filter(Boolean).join(", ");

        // Build the eyes block ÃÂ¢ÃÂÃÂ the soul of the character
        const eyesBlock = [
          analysis.eyeColor ? `${analysis.eyeColor} irises` : "",
          analysis.eyeShape ? `${analysis.eyeShape} eye shape` : "",
          analysis.eyeSize ? `${analysis.eyeSize}` : "",
          analysis.eyebrowShape ? `brows: ${analysis.eyebrowShape}` : "",
          analysis.eyelashDescription ? `lashes: ${analysis.eyelashDescription}` : "",
          analysis.eyeExpression ? `eye expression: ${analysis.eyeExpression}` : "",
          // Always enforce photorealistic eye rendering
          "hyper-realistic iris fiber structure with visible spoke pattern and limbal ring",
          "natural corneal reflections and catchlights",
          "subtle moisture in waterline and inner corner",
          "sclera with faint realistic veins",
          "eyes that look genuinely alive and emotionally present",
        ].filter(Boolean).join(", ");

        // Build the nose and mouth block
        const noseAndMouthBlock = [
          analysis.noseType ? `nose: ${analysis.noseType}` : "",
          analysis.lipShape ? `lips: ${analysis.lipShape}` : "",
          analysis.mouthWidth ? `mouth: ${analysis.mouthWidth}` : "",
        ].filter(Boolean).join(", ");

        // Build the hair block
        const hairBlock = [
          analysis.hairColor ? `${analysis.hairColor} hair` : "",
          analysis.hairStyle ? `${analysis.hairStyle} style` : "",
          analysis.hairLength ? `${analysis.hairLength} length` : "",
          analysis.hairTexture ? `${analysis.hairTexture} texture` : "",
          analysis.facialHair && analysis.facialHair !== "none" && analysis.facialHair !== "None" ? analysis.facialHair : "",
          "individual hair strand detail, natural flyaways and imperfections, realistic hair sheen and weight",
        ].filter(Boolean).join(", ");

        // Build the body block
        const bodyBlock = [
          analysis.build ? `${analysis.build} build` : "",
          analysis.neckDescription ? `neck: ${analysis.neckDescription}` : "",
          analysis.shoulderDescription ? `shoulders: ${analysis.shoulderDescription}` : "",
        ].filter(Boolean).join(", ");

        // Distinguishing features ÃÂ¢ÃÂÃÂ highest recognition priority
        const distinguishingBlock = analysis.distinguishingFeatures && analysis.distinguishingFeatures !== "none"
          ? `MOST IMPORTANT DISTINGUISHING FEATURES (must be reproduced exactly): ${analysis.distinguishingFeatures}`
          : "";

        // Character role and expression
        const characterBlock = [
          input.characterRole ? `character archetype: ${input.characterRole}` : "",
          analysis.expression ? `expression: ${analysis.expression}` : "confident expression",
          analysis.overallVibe ? `screen presence: ${analysis.overallVibe}` : "",
          analysis.restingExpression ? `resting expression tendency: ${analysis.restingExpression}` : "",
        ].filter(Boolean).join(", ");

        // Cinematographer notes
        const dpNotes = analysis.cinematographerNotes
          ? `CINEMATOGRAPHER NOTES: ${analysis.cinematographerNotes}`
          : "";

        // Assemble the full prompt ÃÂ¢ÃÂÃÂ face geometry first for maximum model weighting
        const promptParts = [
          photorealismBase,
          `SUBJECT: Recreate this exact person as a movie character named ${input.name}`,
          `${analysis.gender || "person"}, ${analysis.estimatedAge || "adult"}, ${analysis.ethnicity || ""}`.replace(/,\s*$/, ""),
          faceGeometryBlock ? `FACE GEOMETRY: ${faceGeometryBlock}` : "",
          `SKIN: ${skinBlock}`,
          `EYES: ${eyesBlock}`,
          noseAndMouthBlock ? `FEATURES: ${noseAndMouthBlock}` : "",
          `HAIR: ${hairBlock}`,
          bodyBlock ? `BODY: ${bodyBlock}` : "",
          distinguishingBlock,
          characterBlock ? `CHARACTER: ${characterBlock}` : "",
          dpNotes,
          `LIGHTING & STYLE: ${stylePrompt}`,
          // Hard realism enforcement ÃÂ¢ÃÂÃÂ always last
          "REALISM ENFORCEMENT: NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-generated look, NOT plastic skin, NOT airbrushed ÃÂ¢ÃÂÃÂ a REAL PHOTOGRAPH of a REAL HUMAN BEING with all natural imperfections preserved",
        ].filter((x: any) => x !== null) as any[];

        // Step 4: Generate the character image using the reference photo
        const result = await generateImage({
          prompt: promptParts.join(" "),
          originalImages: [{
            url: refPhotoUrl,
            mimeType: resolvedMimeType,
          }],
        });

        // Step 5: Build faceDnaPrompt ÃÂ¢ÃÂÃÂ a cinematographer-grade character descriptor
        // This is the master consistency anchor injected into every scene prompt.
        // Structured as: [FACE GEOMETRY] | [SKIN] | [EYES] | [HAIR] | [DISTINGUISHING]
        // so the AI model can parse and weight each category independently.
        const faceDnaPrompt = [
          // Core identity
          `${analysis.gender || "person"}, ${analysis.estimatedAge || "adult"}, ${analysis.ethnicity || ""}`.replace(/,\s*,/g, ",").trim().replace(/,\s*$/, ""),
          // Face geometry ÃÂ¢ÃÂÃÂ the structural foundation
          analysis.faceShape ? `FACE: ${analysis.faceShape}` : "",
          analysis.foreheadShape ? `forehead: ${analysis.foreheadShape}` : "",
          analysis.cheekboneStructure ? `cheekbones: ${analysis.cheekboneStructure}` : "",
          analysis.jawlineShape ? `jaw: ${analysis.jawlineShape}` : "",
          analysis.chinShape ? `chin: ${analysis.chinShape}` : "",
          analysis.facialSymmetry ? `symmetry: ${analysis.facialSymmetry}` : "",
          // Skin ÃÂ¢ÃÂÃÂ the most visible realism indicator
          analysis.skinTone ? `SKIN: ${analysis.skinTone}` : "",
          analysis.skinUndertone ? `undertone: ${analysis.skinUndertone}` : "",
          analysis.skinTexture ? `texture: ${analysis.skinTexture}` : "",
          analysis.skinAgeMarkers && analysis.skinAgeMarkers !== "none" ? `age markers: ${analysis.skinAgeMarkers}` : "",
          analysis.skinImperfections && analysis.skinImperfections !== "none" ? `marks: ${analysis.skinImperfections}` : "",
          // Eyes ÃÂ¢ÃÂÃÂ the soul of the character
          analysis.eyeColor ? `EYES: ${analysis.eyeColor}` : "",
          analysis.eyeShape ? `shape: ${analysis.eyeShape}` : "",
          analysis.eyeSize ? `size: ${analysis.eyeSize}` : "",
          analysis.eyebrowShape ? `brows: ${analysis.eyebrowShape}` : "",
          analysis.eyelashDescription ? `lashes: ${analysis.eyelashDescription}` : "",
          analysis.eyeExpression ? `eye quality: ${analysis.eyeExpression}` : "",
          // Nose
          analysis.noseType ? `NOSE: ${analysis.noseType}` : "",
          // Mouth
          analysis.lipShape ? `LIPS: ${analysis.lipShape}` : "",
          analysis.mouthWidth ? `mouth: ${analysis.mouthWidth}` : "",
          // Hair
          analysis.hairColor ? `HAIR: ${analysis.hairColor}` : "",
          analysis.hairStyle ? `style: ${analysis.hairStyle}` : "",
          analysis.hairLength ? `length: ${analysis.hairLength}` : "",
          analysis.hairTexture ? `texture: ${analysis.hairTexture}` : "",
          analysis.facialHair && analysis.facialHair !== "none" && analysis.facialHair !== "None" && analysis.facialHair !== "clean-shaven" ? `facial hair: ${analysis.facialHair}` : "",
          // Distinguishing features ÃÂ¢ÃÂÃÂ the top priority for recognition
          analysis.distinguishingFeatures && analysis.distinguishingFeatures !== "none" ? `DISTINGUISHING: ${analysis.distinguishingFeatures}` : "",
          // Lighting response ÃÂ¢ÃÂÃÂ critical for scene realism
          analysis.lightingResponse ? `LIGHTING RESPONSE: ${analysis.lightingResponse}` : "",
        ].filter(Boolean).join(" | ");

        const bodyDnaPrompt = [
          analysis.build ? `${analysis.build} build` : "",
          analysis.neckDescription ? `neck: ${analysis.neckDescription}` : "",
          analysis.shoulderDescription ? `shoulders: ${analysis.shoulderDescription}` : "",
          analysis.overallVibe ? `screen presence: ${analysis.overallVibe}` : "",
          analysis.restingExpression ? `resting expression: ${analysis.restingExpression}` : "",
          analysis.cinematographerNotes ? `DP notes: ${analysis.cinematographerNotes}` : "",
        ].filter(Boolean).join(" | ");

        // Step 6: Save the character with all extracted attributes + DNA prompts
        const character = await db.createCharacter({
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          name: input.name,
          description: analysis.detailedDescription || `Character created from reference photo ÃÂ¢ÃÂÃÂ ${analysis.gender}, ${analysis.estimatedAge}, ${analysis.ethnicity}`,
          photoUrl: result.url,
          attributes: {
            ...analysis,
            referencePhotoUrl: refPhotoUrl,
            characterRole: input.characterRole,
            style,
            aiGenerated: true,
            generatedFromPhoto: true,
            // DNA prompts for scene generation consistency
            faceDnaPrompt: faceDnaPrompt || null,
            bodyDnaPrompt: bodyDnaPrompt || null,
          },
        });

        return character;
      }),

    // Search for public figure / celebrity reference images via Wikimedia Commons
    searchPersonImages: protectedProcedure
      .input(z.object({
        query: z.string().min(1).max(200),
      }))
      .query(async ({ input }) => {
        const encoded = encodeURIComponent(input.query);

        // Step 1: Search Wikipedia for the best matching article
        const searchRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=0&srlimit=5&format=json&origin=*`,
          { headers: { "User-Agent": "VirellStudios/1.0 (https://virelle.life)" } }
        );
        const searchData = await searchRes.json() as any;
        const searchResults: Array<{ title: string; snippet: string }> = (searchData?.query?.search ?? []).map((r: any) => ({
          title: r.title,
          snippet: r.snippet?.replace(/<[^>]+>/g, "") ?? "",
        }));

        if (!searchResults.length) return { images: [], suggestions: [] };

        // Step 2: Get the main article image for the top result
        const topTitle = encodeURIComponent(searchResults[0].title);
        const pageImgRes = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&titles=${topTitle}&prop=pageimages&pithumbsize=600&piprop=thumbnail&format=json&origin=*`,
          { headers: { "User-Agent": "VirellStudios/1.0 (https://virelle.life)" } }
        );
        const pageImgData = await pageImgRes.json() as any;
        const pages = Object.values((pageImgData?.query?.pages ?? {})) as any[];
        const mainThumb = pages[0]?.thumbnail?.source ?? null;

        // Step 3: Search Wikimedia Commons for portrait images
        const commonsRes = await fetch(
          `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encoded}+portrait&srnamespace=6&srlimit=12&format=json&origin=*`,
          { headers: { "User-Agent": "VirellStudios/1.0 (https://virelle.life)" } }
        );
        const commonsData = await commonsRes.json() as any;
        const fileTitles: string[] = (commonsData?.query?.search ?? []).map((r: any) => r.title);

        // Step 4: Get thumbnail URLs for each Commons file
        const images: Array<{ title: string; thumbUrl: string; fullUrl: string }> = [];

        if (mainThumb) {
          images.push({ title: searchResults[0].title, thumbUrl: mainThumb, fullUrl: mainThumb.replace(/\/\d+px-/, "/800px-") });
        }

        if (fileTitles.length > 0) {
          const titlesParam = fileTitles.slice(0, 10).map(encodeURIComponent).join("|");
          const thumbRes = await fetch(
            `https://commons.wikimedia.org/w/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`,
            { headers: { "User-Agent": "VirellStudios/1.0 (https://virelle.life)" } }
          );
          const thumbData = await thumbRes.json() as any;
          const thumbPages = Object.values((thumbData?.query?.pages ?? {})) as any[];
          for (const p of thumbPages) {
            const ii = p?.imageinfo?.[0];
            if (ii?.thumburl) {
              images.push({
                title: p.title?.replace(/^File:/, "") ?? "",
                thumbUrl: ii.thumburl,
                fullUrl: ii.url ?? ii.thumburl,
              });
            }
          }
        }

        // Deduplicate by thumbUrl
        const seen = new Set<string>();
        const unique = images.filter(img => {
          if (seen.has(img.thumbUrl)) return false;
          seen.add(img.thumbUrl);
          return true;
        });

        return {
          images: unique.slice(0, 9),
          suggestions: searchResults.slice(0, 5).map(r => r.title),
        };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ v6.77 Brands ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Per-project allow / required / forbidden list of real-world commercial
  // brands (Nike, Pepsi, storefronts, road signs, billboards, vehicles, etc.).
  // Free to manage ÃÂ¢ÃÂÃÂ every scene/trailer/poster/storyboard generator reads this
  // list and feeds the constraints into the model so the right logos appear
  // (and the wrong ones never do).
  brand: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectBrands(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1).max(128),
        category: z.string().max(64).optional(),
        policy: z.enum(["allowed", "required", "forbidden"]).default("allowed"),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.createProjectBrand({
          userId: ctx.user.id,
          projectId: input.projectId,
          name: input.name.trim(),
          category: input.category?.trim() || null,
          policy: input.policy,
          notes: input.notes?.trim() || null,
        } as any);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        name: z.string().min(1).max(128).optional(),
        category: z.string().max(64).nullish(),
        policy: z.enum(["allowed", "required", "forbidden"]).optional(),
        notes: z.string().max(2000).nullish(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const existing = await db.getProjectBrandById(input.id);
        if (!existing || existing.projectId !== input.projectId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found for this project" });
        }
        const patch: any = {};
        if (input.name !== undefined) patch.name = input.name.trim();
        if (input.category !== undefined) patch.category = input.category?.toString().trim() || null;
        if (input.policy !== undefined) patch.policy = input.policy;
        if (input.notes !== undefined) patch.notes = input.notes?.toString().trim() || null;
        return db.updateProjectBrand(input.id, patch);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getProjectBrandById(input.id);
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
        }
        await assertCanAccessProject(existing.projectId, ctx.user.id);
        await db.deleteProjectBrand(input.id);
        return { ok: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ v6.77 Designer Wardrobe ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Lets fashion / costume designers, brands, stylists, wardrobe departments
  // and production designers manage their designer profile, collections, and
  // wardrobe / costume items. Directors browse public collections, optionally
  // upload private items into their own project, and attach items to
  // characters or to scenes (set dressing / shopfront / mood / period
  // references). Free to manage ÃÂ¢ÃÂÃÂ no credits charged on any procedure here;
  // expensive AI / video work only happens later when the director runs an
  // actual scene generation. The buildScenePrompt engine reads attached
  // wardrobe via the precomputed `wardrobeContext` block, so this router
  // never has to reach into the prompt engine itself.
  designerWardrobe: router({
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Profile ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    getMyProfile: protectedProcedure.query(async ({ ctx }) => {
      return db.getDesignerProfileByUserId(ctx.user.id);
    }),

    upsertProfile: protectedProcedure
      .input(z.object({
        brandName: z.string().min(1).max(255),
        displayName: z.string().max(255).optional(),
        profileType: z.enum([
          "designer", "costume_designer", "stylist",
          "wardrobe_department", "brand", "production_designer", "other",
        ]).default("designer"),
        bio: z.string().max(4000).optional(),
        website: z.string().max(512).optional(),
        instagram: z.string().max(255).optional(),
        contactEmail: z.string().email().max(320).optional(),
        logoUrl: z.string().max(2048).optional(),
        visibility: z.enum(["public", "private", "unlisted"]).default("public"),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getDesignerProfileByUserId(ctx.user.id);
        const patch: any = {
          brandName: input.brandName.trim(),
          displayName: input.displayName?.trim() || null,
          profileType: input.profileType,
          bio: input.bio?.trim() || null,
          website: input.website?.trim() || null,
          instagram: input.instagram?.trim() || null,
          contactEmail: input.contactEmail?.trim() || null,
          logoUrl: input.logoUrl?.trim() || null,
          visibility: input.visibility,
        };
        if (existing) {
          return db.updateDesignerProfile(existing.id, patch);
        }
        return db.createDesignerProfile({ ...patch, userId: ctx.user.id } as any);
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Collections ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    createCollection: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(4000).optional(),
        collectionType: z.enum([
          "wardrobe", "fashion_collection", "costume_collection",
          "period_costumes", "uniforms", "fantasy_sci_fi",
          "retail_shopfront", "textiles", "accessories",
          "set_dressing", "other",
        ]).default("wardrobe"),
        season: z.string().max(128).optional(),
        year: z.number().int().min(1800).max(2100).optional(),
        styleTags: z.array(z.string().max(64)).max(40).optional(),
        coverImageUrl: z.string().max(2048).optional(),
        visibility: z.enum(["public", "private", "unlisted"]).default("public"),
        licenseType: z.enum([
          "reference_only", "editorial", "non_commercial",
          "full_license", "custom",
        ]).default("reference_only"),
        licenseNotes: z.string().max(4000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        if (!profile) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Create your designer profile first.",
          });
        }
        return db.createDesignerCollection({
          designerProfileId: profile.id,
          userId: ctx.user.id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          collectionType: input.collectionType,
          season: input.season?.trim() || null,
          year: input.year ?? null,
          styleTags: input.styleTags ?? null,
          coverImageUrl: input.coverImageUrl?.trim() || null,
          visibility: input.visibility,
          licenseType: input.licenseType,
          licenseNotes: input.licenseNotes?.trim() || null,
        } as any);
      }),

    listCollections: protectedProcedure
      .input(z.object({
        // 'mine' = my collections; 'public' = browse public library;
        // omitted = both (mine first, then public).
        scope: z.enum(["mine", "public", "all"]).default("all"),
        limit: z.number().int().min(1).max(120).default(60),
      }).optional())
      .query(async ({ ctx, input }) => {
        const scope = input?.scope ?? "all";
        const limit = input?.limit ?? 60;
        const profile = await db.getDesignerProfileByUserId(ctx.user.id);
        const mine = profile ? await db.getDesignerCollectionsByDesigner(profile.id) : [];
        if (scope === "mine") return mine;
        const publicList = await db.getPublicDesignerCollections(limit);
        if (scope === "public") {
          // Hide my own collections from the public scope so directors who
          // also designs see one canonical "Mine" tab + a clean public feed.
          return publicList.filter((c) => c.userId !== ctx.user.id);
        }
        // 'all' ÃÂ¢ÃÂÃÂ mine first, then public minus mine
        const mineIds = new Set(mine.map((c) => c.id));
        return [...mine, ...publicList.filter((c) => !mineIds.has(c.id))];
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Wardrobe items ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    createWardrobeItem: protectedProcedure
      .input(z.object({
        collectionId: z.number().int().optional(),
        // Director path: upload a private item directly into their project.
        projectId: z.number().int().optional(),
        name: z.string().min(1).max(255),
        description: z.string().max(4000).optional(),
        category: z.string().max(64).optional(),
        subcategory: z.string().max(128).optional(),
        wardrobeType: z.enum([
          "fashion", "costume", "period_costume", "uniform",
          "fantasy_sci_fi", "character_signature", "background_extra",
          "accessory", "jewellery", "bag", "shoes", "hat",
          "textile", "shopfront_display", "set_dressing",
          "wardrobe", "other",
        ]).default("wardrobe"),
        genderFit: z.string().max(64).optional(),
        sizeRange: z.string().max(128).optional(),
        era: z.string().max(128).optional(),
        colors: z.array(z.string().max(64)).max(20).optional(),
        materials: z.array(z.string().max(64)).max(20).optional(),
        styleTags: z.array(z.string().max(64)).max(40).optional(),
        imageUrls: z.array(z.string().max(2048)).max(12).optional(),
        primaryImageUrl: z.string().max(2048).optional(),
        referencePrompt: z.string().max(2000).optional(),
        brandPlacementAllowed: z.boolean().default(false),
        shopfrontPlacementAllowed: z.boolean().default(true),
        characterWardrobeAllowed: z.boolean().default(true),
        costumeUseAllowed: z.boolean().default(true),
        commercialUseAllowed: z.boolean().default(false),
        licenseType: z.enum([
          "reference_only", "editorial", "non_commercial",
          "full_license", "custom",
        ]).default("reference_only"),
        licenseNotes: z.string().max(4000).optional(),
        visibility: z.enum(["public", "private", "project_only", "unlisted"]).default("public"),
      }))
      .mutation(async ({ ctx, input }) => {
        // If posting into a collection, the collection must be mine.
        let designerProfileId: number | null = null;
        if (input.collectionId) {
          const col = await db.getDesignerCollectionById(input.collectionId);
          if (!col || col.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Collection not yours" });
          }
          designerProfileId = col.designerProfileId;
        } else {
          // Director-uploaded private items don't need a profile.
          const myProfile = await db.getDesignerProfileByUserId(ctx.user.id);
          if (myProfile) designerProfileId = myProfile.id;
        }
        // If posting into a project, the project must be mine.
        if (input.projectId) {
          await assertCanAccessProject(input.projectId, ctx.user.id);
        }
        return db.createWardrobeItem({
          collectionId: input.collectionId ?? null,
          userId: ctx.user.id,
          designerProfileId,
          projectId: input.projectId ?? null,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          category: input.category?.trim() || null,
          subcategory: input.subcategory?.trim() || null,
          wardrobeType: input.wardrobeType,
          genderFit: input.genderFit?.trim() || null,
          sizeRange: input.sizeRange?.trim() || null,
          era: input.era?.trim() || null,
          colors: input.colors ?? null,
          materials: input.materials ?? null,
          styleTags: input.styleTags ?? null,
          imageUrls: input.imageUrls ?? null,
          primaryImageUrl: input.primaryImageUrl?.trim() || (input.imageUrls?.[0] ?? null),
          referencePrompt: input.referencePrompt?.trim() || null,
          brandPlacementAllowed: input.brandPlacementAllowed,
          shopfrontPlacementAllowed: input.shopfrontPlacementAllowed,
          characterWardrobeAllowed: input.characterWardrobeAllowed,
          costumeUseAllowed: input.costumeUseAllowed,
          commercialUseAllowed: input.commercialUseAllowed,
          licenseType: input.licenseType,
          licenseNotes: input.licenseNotes?.trim() || null,
          visibility: input.visibility,
          status: "active",
        } as any);
      }),

    listWardrobeItems: protectedProcedure
      .input(z.object({
        // What slice to show:
        scope: z.enum(["mine", "public", "project", "collection"]).default("public"),
        collectionId: z.number().int().optional(),
        projectId: z.number().int().optional(),
        wardrobeType: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
        limit: z.number().int().min(1).max(200).default(120),
      }).optional())
      .query(async ({ ctx, input }) => {
        const scope = input?.scope ?? "public";
        const limit = input?.limit ?? 120;
        let items: WardrobeItem[] = [];
        if (scope === "mine") {
          items = await db.getWardrobeItemsByUser(ctx.user.id);
        } else if (scope === "collection" && input?.collectionId) {
          const col = await db.getDesignerCollectionById(input.collectionId);
          if (!col) return [];
          // Public collection OR my own collection.
          if (col.visibility !== "public" && col.userId !== ctx.user.id) return [];
          items = await db.getWardrobeItemsByCollection(input.collectionId);
        } else if (scope === "project" && input?.projectId) {
          await assertCanAccessProject(input.projectId, ctx.user.id);
          items = await db.getProjectWardrobeItems(input.projectId);
        } else {
          items = await db.getPublicWardrobeItems(limit);
        }
        // Apply optional filters
        if (input?.wardrobeType) {
          items = items.filter((i) => i.wardrobeType === input.wardrobeType);
        }
        if (input?.category) {
          items = items.filter((i) => i.category === input.category);
        }
        return items.slice(0, limit);
      }),

    updateWardrobeItem: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(4000).nullish(),
        primaryImageUrl: z.string().max(2048).nullish(),
        referencePrompt: z.string().max(2000).nullish(),
        visibility: z.enum(["public", "private", "project_only", "unlisted"]).optional(),
        status: z.enum(["active", "hidden", "retired"]).optional(),
        licenseNotes: z.string().max(4000).nullish(),
      }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getWardrobeItemById(input.id);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        if (item.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your item" });
        }
        const patch: any = {};
        for (const k of [
          "name", "description", "primaryImageUrl", "referencePrompt",
          "visibility", "status", "licenseNotes",
        ] as const) {
          if ((input as any)[k] !== undefined) patch[k] = (input as any)[k];
        }
        return db.updateWardrobeItem(input.id, patch);
      }),

    deleteWardrobeItem: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getWardrobeItemById(input.id);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        if (item.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not your item" });
        }
        await db.deleteWardrobeItem(input.id);
        return { ok: true };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Assignments ÃÂ¢ÃÂÃÂ attach to character or scene ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    attachToCharacter: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        characterId: z.number().int(),
        wardrobeItemId: z.number().int(),
        // 'character_wardrobe' (everyday) | 'character_costume' (period/special)
        assignmentType: z.enum(["character_wardrobe", "character_costume"]).default("character_wardrobe"),
        usageMode: z.enum([
          "reference", "must_match", "inspired_by",
          "background_only", "brand_visible",
          "costume_accurate", "period_accurate",
        ]).default("reference"),
        placementNotes: z.string().max(2000).optional(),
        promptWeight: z.number().int().min(0).max(100).default(50),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const item = await db.getWardrobeItemById(input.wardrobeItemId);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        // License gate: characterWardrobeAllowed / costumeUseAllowed.
        if (input.assignmentType === "character_costume" && !item.costumeUseAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This item is not licensed for costume use." });
        }
        if (input.assignmentType === "character_wardrobe" && !item.characterWardrobeAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This item is not licensed for character wardrobe." });
        }
        if (input.usageMode === "brand_visible" && !item.brandPlacementAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Brand-visible usage is not allowed for this item." });
        }
        // Visibility: must be public, project-linked, or owned by caller.
        const isOwner = item.userId === ctx.user.id;
        const isProjectLinked = item.projectId === input.projectId;
        const isPublicEnough = item.visibility === "public" || item.visibility === "unlisted";
        if (!isOwner && !isProjectLinked && !isPublicEnough) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Item not accessible to this project." });
        }
        const character = await db.getCharacterById(input.characterId);
        if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "Character not found" });
        return db.createWardrobeAssignment({
          userId: ctx.user.id,
          projectId: input.projectId,
          wardrobeItemId: input.wardrobeItemId,
          assignmentType: input.assignmentType,
          characterId: input.characterId,
          sceneId: null,
          usageMode: input.usageMode,
          placementNotes: input.placementNotes?.trim() || null,
          promptWeight: input.promptWeight,
          locked: false,
        } as any);
      }),

    attachToScene: protectedProcedure
      .input(z.object({
        projectId: z.number().int(),
        sceneId: z.number().int(),
        wardrobeItemId: z.number().int(),
        assignmentType: z.enum([
          "scene_set_dressing", "shopfront_display", "background_extra",
          "mood_reference", "period_reference", "uniform_reference",
        ]).default("scene_set_dressing"),
        usageMode: z.enum([
          "reference", "must_match", "inspired_by",
          "background_only", "brand_visible",
          "costume_accurate", "period_accurate",
        ]).default("reference"),
        placementNotes: z.string().max(2000).optional(),
        promptWeight: z.number().int().min(0).max(100).default(50),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const scene = await db.getSceneById(input.sceneId);
        if (!scene || scene.projectId !== input.projectId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found in this project" });
        }
        const item = await db.getWardrobeItemById(input.wardrobeItemId);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        if (input.assignmentType === "shopfront_display" && !item.shopfrontPlacementAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Item not licensed for shopfront display." });
        }
        if (input.usageMode === "brand_visible" && !item.brandPlacementAllowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Brand-visible usage is not allowed for this item." });
        }
        const isOwner = item.userId === ctx.user.id;
        const isProjectLinked = item.projectId === input.projectId;
        const isPublicEnough = item.visibility === "public" || item.visibility === "unlisted";
        if (!isOwner && !isProjectLinked && !isPublicEnough) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Item not accessible to this project." });
        }
        return db.createWardrobeAssignment({
          userId: ctx.user.id,
          projectId: input.projectId,
          wardrobeItemId: input.wardrobeItemId,
          assignmentType: input.assignmentType,
          characterId: null,
          sceneId: input.sceneId,
          usageMode: input.usageMode,
          placementNotes: input.placementNotes?.trim() || null,
          promptWeight: input.promptWeight,
          locked: false,
        } as any);
      }),

    listAssignmentsForProject: protectedProcedure
      .input(z.object({ projectId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const assignments = await db.getWardrobeAssignmentsByProject(input.projectId);
        // Hydrate with item names so the UI doesn't have to round-trip.
        const itemIds = Array.from(new Set(assignments.map((a) => a.wardrobeItemId)));
        const items = await Promise.all(itemIds.map((id) => db.getWardrobeItemById(id)));
        const itemById = new Map<number, WardrobeItem>();
        for (const it of items) if (it) itemById.set(it.id, it);
        return assignments.map((a) => ({
          ...a,
          item: itemById.get(a.wardrobeItemId) || null,
        }));
      }),

    removeAssignment: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const a = await db.getWardrobeAssignmentById(input.id);
        if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
        await assertCanAccessProject(a.projectId, ctx.user.id);
        await db.deleteWardrobeAssignment(input.id);
        return { ok: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Scenes ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  scene: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectScenes(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.id);
        if (scene) await assertCanAccessProject(scene.projectId, ctx.user.id);
        return scene;
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        orderIndex: z.number().optional(),
        title: z.string().optional(),
        description: z.string().max(2000).optional(),
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
        // Scene type & coverage
        sceneType: z.string().optional(),
        coverageType: z.string().optional(),
        screenDirection: z.string().optional(),
        continuityNotes: z.string().optional(),
        shotIntent: z.string().optional(),
        practicalLights: z.string().optional(),
        dialogueSubtext: z.string().optional(),
        // Advanced lens
        lensFilter: z.string().optional(),
        shootingFormat: z.string().optional(),
        // Generation controls
        negativePrompt: z.string().optional(),
        seed: z.number().optional(),
        referenceImages: z.any().optional(),
        // Production extras
        extras: z.any().optional(),
        voiceRoles: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Ownership guard: caller must own the target project
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        description: z.string().max(2000).optional(),
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
        // Scene type & coverage
        sceneType: z.string().optional(),
        coverageType: z.string().optional(),
        screenDirection: z.string().optional(),
        continuityNotes: z.string().optional(),
        shotIntent: z.string().optional(),
        practicalLights: z.string().optional(),
        dialogueSubtext: z.string().optional(),
        // Advanced lens
        lensFilter: z.string().optional(),
        shootingFormat: z.string().optional(),
        // Generation controls
        negativePrompt: z.string().optional(),
        seed: z.number().optional(),
        referenceImages: z.any().optional(),
        // Production extras
        extras: z.any().optional(),
        voiceRoles: z.any().optional(),
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
        await rateLimitAI(ctx.user.id);
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        // Credits: deduct for preview image
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_preview_image.cost, "generate_preview_image", `Preview for scene ${input.sceneId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new Error("Scene not found");

        // Get project and characters for Visual DNA
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        const characters = await db.getProjectCharacters(project.id);

        // Build Visual DNA for consistent style
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = project
          ? buildVisualDNA(project, characters, userTier)
          : buildVisualDNA({ title: "Untitled", genre: "Drama" }, [], userTier);

        // Get all scenes for context
        const allScenes = project ? await db.getProjectScenes(project.id) : [];
        const sceneIdx = allScenes.findIndex(s => s.id === scene.id);

        const sceneWardrobeContext = await getWardrobePromptContextForScene(scene.id, ctx.user.id);
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Auto-inject user's active VFX/SFX library signature into every generated scene ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          let _vfxLibCtx = "";
          try {
            const { getVfxLibraryPrompt } = await import("./_core/vfxPromptEngine");
            const _vfxDb = await db.getDb();
            if (_vfxDb) { const res = await getVfxLibraryPrompt(ctx.user.id, _vfxDb); _vfxLibCtx = res.vfx || ""; }
          } catch (_vfxErr) { /* non-fatal ÃÂ¢ÃÂÃÂ generation continues without library injection */ }

        // Build rich cinematic prompt
        const prompt = buildScenePrompt(
          { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
          visualDNA,
          {
            sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
            totalScenes: allScenes.length || 1,
            previousSceneDescription: sceneIdx > 0 ? (allScenes[sceneIdx - 1]?.description || undefined) : undefined,
            characterNames: characters.map(c => c.name),
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: sceneWardrobeContext || undefined,
            characters: characters.map(c => ({
                name: c.name,
                ageRange: (c as any).ageRange ?? (c as any).dateOfBirth ?? null,
                faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
                bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
                consistencyNotes: (c as any).consistencyNotes || null,
                id: (c as any).id,
              })),
          }
        );

        // Get character photos + Signature Cast portraits for identity-locked reference.
        // gpt-image-1-edit / Imagen lock the generated face to these references,
        // so the same actor stays visually consistent across every scene.
        const { getSignatureActorReferenceImage } = await import("./_core/signatureCast");
        const characterIds = (scene.characterIds as number[]) || [];
        const originalImages: Array<{ url?: string; b64Json?: string; mimeType: string }> = [];
        const seenActorIds = new Set<string>();
        const pushActorAnchor = (aiActorId: string | null | undefined) => {
          if (!aiActorId || seenActorIds.has(aiActorId)) return;
          const ref = getSignatureActorReferenceImage(aiActorId);
          if (ref) {
            originalImages.push({ b64Json: ref.b64Json, mimeType: ref.mimeType });
            seenActorIds.add(aiActorId);
          }
        };
        for (const cId of characterIds) {
          const char = await db.getCharacterById(cId);
          if (char?.photoUrl) {
            originalImages.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
          pushActorAnchor((char as any)?.aiActorId);
        }
        // Also include all project character photos + signature anchors for consistency
        for (const char of characters) {
          if (char.photoUrl && !originalImages.find(img => img.url === char.photoUrl)) {
            originalImages.push({ url: char.photoUrl, mimeType: "image/jpeg" });
          }
          pushActorAnchor((char as any).aiActorId);
        }

        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const result = await generateImage({
          prompt,
          originalImages: originalImages.length > 0 ? originalImages : undefined,
          userOpenAiKey: userKeys.openaiKey || undefined,
        }).catch((_e: unknown) => {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Preview image generation failed. Please try again." });
        });

        // Update scene with preview thumbnail
        await db.updateScene(scene.id, { thumbnailUrl: result.url });

        // Auto-set project thumbnail if project doesn't have one yet
        if (result.url && project && !project.thumbnailUrl) {
          try {
            await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: result.url });
          } catch (e) {
            logger.warn('[Preview] Failed to auto-set project thumbnail: ' + String(e));
          }
        }

        return { url: result.url };
      }),

    // Generate image using Nano Banana (Google Gemini native image generation)
    generateNanoBananaImage: creationProcedure
      .input(z.object({
        prompt: z.string().min(1).max(2000),
        model: z.enum(["nano-banana-2", "nano-banana-pro"]).optional(),
        referenceImageUrl: z.string().optional(),
        aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
        sceneId: z.number().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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

        // If sceneId provided, verify ownership then update scene thumbnail
        if (input.sceneId && result.url) {
          const targetNbScene = await db.getSceneById(input.sceneId);
          if (targetNbScene) {
            await assertCanAccessProject(targetNbScene.projectId, ctx.user.id);
          }
          await db.updateScene(input.sceneId, { thumbnailUrl: result.url });
          // Auto-set project thumbnail if project doesn't have one yet
          if (input.projectId) {
            try {
              const proj = await db.getProjectById(input.projectId, ctx.user.id);
              if (proj && !proj.thumbnailUrl) {
                await db.updateProject(proj.id, ctx.user.id, { thumbnailUrl: result.url });
              }
            } catch (e) {
              logger.warn('[NanoBanana] Failed to auto-set project thumbnail: ' + String(e));
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
        await rateLimitHeavyAI(ctx.user.id);
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
        // Per-scene reference assembly. Mirrors single-scene preview (~1678):
        // 1) scene's own cast first (signature anchor + photo)
        // 2) backfill remaining project cast
        // 3) cap at 4 (gpt-image-1-edit / Imagen ref limit) with anchors > photos.
        const { getSignatureActorReferenceImage: getBulkActorRef } = await import("./_core/signatureCast");
        const REF_CAP = 4;
        type Ref = { url?: string; b64Json?: string; mimeType: string; key: string; priority: number };
        const buildSceneRefs = (sceneCharacterIds: number[]): Array<{ url?: string; b64Json?: string; mimeType: string }> => {
          const refs: Ref[] = [];
          const seen = new Set<string>();
          const addChar = (char: any, scenePriority: number) => {
            // priority: anchors (lower number = higher priority) before photos
            const aiActorId = char?.aiActorId as string | undefined;
            if (aiActorId) {
              const key = `anchor:${aiActorId}`;
              if (!seen.has(key)) {
                const ref = getBulkActorRef(aiActorId);
                if (ref) {
                  refs.push({ b64Json: ref.b64Json, mimeType: ref.mimeType, key, priority: scenePriority * 10 + 1 });
                  seen.add(key);
                }
              }
            }
            if (char?.photoUrl) {
              const key = `photo:${char.photoUrl}`;
              if (!seen.has(key)) {
                refs.push({ url: char.photoUrl, mimeType: "image/jpeg", key, priority: scenePriority * 10 + 2 });
                seen.add(key);
              }
            }
          };
          // Pass 1: scene's own cast (priority 0)
          for (const cid of sceneCharacterIds) {
            const char = characters.find(c => c.id === cid);
            if (char) addChar(char, 0);
          }
          // Pass 2: backfill project cast (priority 1)
          for (const char of characters) {
            addChar(char, 1);
          }
          refs.sort((a, b) => a.priority - b.priority);
          return refs.slice(0, REF_CAP).map(({ url, b64Json, mimeType }) => ({ url, b64Json, mimeType }));
        };
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
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: await getEffectiveWardrobeContext(scene as any, ctx.user.id, characters as any),
                  characters: characters.map(c => ({
                    name: c.name,
                    ageRange: (c as any).ageRange ?? null,
                    faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
                    bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
                    consistencyNotes: (c as any).consistencyNotes || null,
                    id: (c as any).id,
                  })),
                }
              );
              const sceneCharacterIds = (scene.characterIds as number[]) || [];
              const sceneRefs = buildSceneRefs(sceneCharacterIds);
              const result = await generateImage({
                prompt,
                originalImages: sceneRefs.length > 0 ? sceneRefs : undefined,
              });
              await db.updateScene(scene.id, { thumbnailUrl: result.url });
              // Auto-set project thumbnail from first generated scene
              if (!project.thumbnailUrl && result.url) {
                try {
                  await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: result.url });
                  (project as any).thumbnailUrl = result.url; // prevent re-setting
                } catch (e) {
                  logger.warn('[BulkPreview] Failed to auto-set project thumbnail: ' + String(e));
                }
              }
              generated++;
            } catch (e) {
              logger.errorWithStack(`Bulk gen failed for scene "${scene.title}":`, e);
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
        await rateLimitHeavyAI(ctx.user.id);
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Scene Lock Check: blocked if director has locked this scene ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        try {
          const dbl = await db.getDb();
          if (dbl) {
            const lr: any = await dbl.execute(sql`SELECT content FROM directorChats WHERE projectId = ${scene.projectId} AND content LIKE '[SceneLocks]%' ORDER BY updatedAt DESC LIMIT 1`);
            const larr = (Array.isArray(lr[0]) ? lr[0] : lr) as any[];
            if (larr?.[0]) {
              const locks = JSON.parse((larr[0].content as string).replace(/^\[SceneLocks\]\s*\n?/, ""));
              const lock = (locks || []).find((x: any) => x.sceneId === input.sceneId && x.locked);
              if (lock) throw new TRPCError({ code: "FORBIDDEN", message: `Scene is locked by ${lock.lockedBy || "director"}${lock.reason ? ` (${lock.reason})` : ""}. Unlock in Studio Ops ÃÂ¢ÃÂÃÂ Locks to regenerate.` });
            }
          }
        } catch (e: any) { if (e instanceof TRPCError) throw e; }
        // Credits: duration-scaled deduction (ÃÂ¢ÃÂÃÂ¤15s=3cr, 16-45s=5cr, 46-90s=7cr, >90s=10cr)
        const videoCredits = getVideoCredits(Math.max(10, scene.duration || 45), false);
        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Render Queue Executor Guard: enforce per-project caps before spending ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        try {
          const dbq = await db.getDb();
          if (dbq) {
            const qr: any = await dbq.execute(sql`SELECT content FROM directorChats WHERE projectId = ${scene.projectId} AND content LIKE '[RenderQueue]%' ORDER BY updatedAt DESC LIMIT 1`);
            const qarr = (Array.isArray(qr[0]) ? qr[0] : qr) as any[];
            if (qarr?.[0]) {
              const qdata = JSON.parse((qarr[0].content as string).replace(/^\[RenderQueue\]\s*\n?/, ""));
              const cap = qdata?.cap;
              if (cap?.pauseOnExceed) {
                if (cap.perJobCredits != null && videoCredits > cap.perJobCredits) {
                  throw new TRPCError({ code: "FORBIDDEN", message: `Render queue cap: per-job ${cap.perJobCredits}cr exceeded (this job needs ${videoCredits}cr). Adjust scene duration or raise cap in Studio Ops ÃÂ¢ÃÂÃÂ Render Queue.` });
                }
                if (cap.dailyCredits != null) {
                  const spentR: any = await dbq.execute(sql`SELECT COALESCE(SUM(-amount),0) AS spent FROM credit_transactions WHERE userId = ${ctx.user.id} AND amount < 0 AND action LIKE 'generate_%' AND createdAt > NOW() - INTERVAL '24 HOURS'`);
                  const spentArr = (Array.isArray(spentR[0]) ? spentR[0] : spentR) as any[];
                  const spent = Number(spentArr?.[0]?.spent || 0);
                  if (spent + videoCredits > cap.dailyCredits) {
                    throw new TRPCError({ code: "FORBIDDEN", message: `Render queue cap: daily ${cap.dailyCredits}cr cap reached (${spent}cr spent, this job needs ${videoCredits}cr). Pause until tomorrow or raise cap.` });
                  }
                }
              }
            }
          }
        } catch (e: any) { if (e instanceof TRPCError) throw e; /* fail open on guard errors */ }
        // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ Atomic reservation. reserveCredits dedupes by
        // (referenceType, referenceId) ÃÂ¢ÃÂÃÂ a duplicate click while the previous
        // reservation is still "reserved" returns the existing reservation id
        // without double-charging. Finalize happens just before this route
        // returns; release happens in the route-level catch wrapper below.
        let __sceneVideoResId: number | null = null;
        try {
          __sceneVideoResId = await db.reserveCredits(
            ctx.user.id,
            videoCredits,
            "generate_scene_video",
            { projectId: scene.projectId, referenceType: "scene", referenceId: input.sceneId },
          );
        } catch (e: any) {
          if (e?.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: e.message });
          }
          throw e;
        }
        const project = await db.getProjectById(scene.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        const allScenes = await db.getProjectScenes(project.id);
        const sceneIdx = allScenes.findIndex(s => s.id === scene.id);
        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Continuity: prev scene last frame for scene-to-scene visual anchoring ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        const _prevScene = sceneIdx > 0 ? allScenes[sceneIdx - 1] : null;
        const previousSceneLastFrameUrl: string | undefined = (_prevScene as any)?.endFrameUrl ?? undefined;
        // Pre-fetch wardrobeContext once, reuse in buildScenePrompt + buildExtendedSceneDescription
        const sceneWardrobeContext = await getWardrobePromptContextForScene(scene.id, ctx.user.id);
        const prompt = buildScenePrompt(
          { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
          visualDNA,
          {
            sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
            totalScenes: allScenes.length || 1,
            previousSceneDescription: sceneIdx > 0 ? (allScenes[sceneIdx - 1]?.description || undefined) : undefined,
            characterNames: characters.map(c => c.name),
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: sceneWardrobeContext || undefined,
            characters: characters.map(c => ({
              name: c.name,
              ageRange: (c as any).ageRange ?? null,
              faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
              bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
              consistencyNotes: (c as any).consistencyNotes || null,
              id: (c as any).id,
            })),
          }
        );
        // Use reference images from scene editor (first = promptImage for image-to-video)
        const sceneRefImages = (scene as any).referenceImages as string[] || [];
        const sceneAiPromptOverride = (scene as any).aiPromptOverride as string | undefined;
        // Use scene-level negative prompt if set; otherwise fall back to the cinematic quality default
        const sceneNegativePrompt: string = ((scene as any).negativePrompt as string | undefined) || getDefaultNegativePrompt(userTier as QualityTier);
        const sceneSeed = (scene as any).seed as number | undefined;

        // Fetch dialogue records as fallback when scene.dialogueText is empty
        // This covers Director AI scenes where dialogue is stored in the dialogue table
        let effectiveDialogueText: string | undefined = (scene as any).dialogueText as string | undefined;
        if (!effectiveDialogueText?.trim()) {
          try {
            const dialogueRecords = await db.getSceneDialogues(scene.id);
            if (dialogueRecords?.length) {
              effectiveDialogueText = dialogueRecords
                .map((d: any) => `${d.characterName}: "${d.line}"${d.emotion ? ` (${d.emotion})` : ''}`)
                .join('\n');
            }
          } catch { /* ignore */ }
        }

        // Build character data: photos (reference images) + descriptions (for visual consistency)
        // sceneCharIds filters to only characters appearing in this specific scene
        const sceneCharIds = ((scene as any).characterIds as number[]) || [];
        const sceneActiveCharacters = characters.filter((c: any) =>
          sceneCharIds.length === 0 || sceneCharIds.includes(c.id)
        );

        // v6.62 ÃÂ¢ÃÂÃÂ Project-level style anchors (logos, mood boards) take priority
        // over character photos when the scene has no explicit refs of its own.
        // Order of precedence: scene.referenceImages ÃÂ¢ÃÂÃÂ project.referenceImages ÃÂ¢ÃÂÃÂ character photos.
        if (sceneRefImages.length === 0) {
          const projRefs = ((project as any).referenceImages as string[] | null) || [];
          if (projRefs.length > 0) {
            sceneRefImages.push(...projRefs.slice(0, 3));
          }
        }
        // Auto-include character photos as visual reference anchors when no manual refs are set
        if (sceneRefImages.length === 0) {
          const charPhotos = sceneActiveCharacters
            .filter((c: any) => c.photoUrl)
            .map((c: any) => c.photoUrl as string)
            .slice(0, 2); // Max 2 reference images to keep prompts focused
          sceneRefImages.push(...charPhotos);
        }
        // Use rich CharacterDNA for cinematographer-grade visual consistency across all providers
          // v6.78 ÃÂ¢ÃÂÃÂ Per-character wardrobe lookup. Fetch assignments so DNA gets the correct outfit
          // instead of the "plain all-black" placeholder that fires when no override is supplied.
          // Also collects the first garment imageUrl per character to use as a visual ref anchor.
          const _charWardrobeOverrides = new Map<number, {
            wardrobeDescription?: string;
            accessories?: string;
            hairNotes?: string;
            makeupNotes?: string;
            imageUrl?: string;
          }>();
          for (const _wc of sceneActiveCharacters) {
            try {
              const _wcAssignments = await db.getWardrobeAssignmentsByCharacter((_wc as any).id);
              const _wcFiltered = _wcAssignments.filter(
                (a: any) => a.assignmentType === "character_wardrobe" || a.assignmentType === "character_costume"
              );
              if (_wcFiltered.length > 0) {
                const _primary = await db.getWardrobeItemById(_wcFiltered[0].wardrobeItemId);
                if (_primary) {
                  const _extras = await Promise.all(
                    _wcFiltered.slice(1, 3).map((a: any) => db.getWardrobeItemById(a.wardrobeItemId))
                  );
                  const _accNames = _extras.filter(Boolean).map((it: any) => it.name).filter(Boolean).join(", ");
                  const _wardrobeDesc = (_primary as any).referencePrompt?.trim()
                    || (_primary as any).description?.trim()
                    || (_primary as any).name;
                  const _rawImgUrls = (_primary as any).imageUrls;
                  const _firstImg: string | undefined = Array.isArray(_rawImgUrls)
                    ? (_rawImgUrls[0] as string | undefined)
                    : typeof _rawImgUrls === "string" ? (_rawImgUrls as string) : undefined;
                  _charWardrobeOverrides.set((_wc as any).id, {
                    wardrobeDescription: _wardrobeDesc,
                    accessories: _accNames || undefined,
                    imageUrl: _firstImg,
                  });
                }
              }
            } catch { /* non-fatal ÃÂ¢ÃÂÃÂ character falls back to default wardrobe */ }
          }
          // v6.78 ÃÂ¢ÃÂÃÂ Append wardrobe item images as additional visual anchors (cap at 2 extra refs)
          const _wardrobeRefUrls = [..._charWardrobeOverrides.values()]
            .map(v => v.imageUrl).filter((u): u is string => !!u).slice(0, 2);
          for (const _wImgUrl of _wardrobeRefUrls) {
            if (!sceneRefImages.includes(_wImgUrl) && sceneRefImages.length < 4) {
              sceneRefImages.push(_wImgUrl);
            }
          }
          // v6.79 ÃÂ¢ÃÂÃÂ Read scene.wardrobe inline overrides (from SceneEditor "Scene Wardrobe Overrides" UI)
          // These are user-typed outfit descriptions per character, saved as JSON on the scene record.
          // Previously stored but NEVER read during generation ÃÂ¢ÃÂÃÂ the AI never saw manual outfit directives.
          const _inlineWardrobeEntries = (scene as any).wardrobe as Array<{
            characterId?: number;
            wardrobeDescription?: string;
            hairNotes?: string;
            makeupNotes?: string;
            accessories?: string;
          }> | null | undefined;
          const _inlineWardrobeLines: string[] = [];
          if (Array.isArray(_inlineWardrobeEntries)) {
            for (const _iwe of _inlineWardrobeEntries) {
              if (!_iwe?.characterId) continue;
              const _iweChar = sceneActiveCharacters.find((c: any) => (c as any).id === _iwe.characterId) as any;
              const _iweName = _iweChar?.name || `Character ${_iwe.characterId}`;
              if (!_charWardrobeOverrides.has(_iwe.characterId)) {
                // No marketplace assignment for this character ÃÂ¢ÃÂÃÂ use inline override
                if (_iwe.wardrobeDescription?.trim()) {
                  _charWardrobeOverrides.set(_iwe.characterId, {
                    wardrobeDescription: _iwe.wardrobeDescription.trim(),
                    accessories: _iwe.accessories?.trim() || undefined,
                    hairNotes: _iwe.hairNotes?.trim() || undefined,
                    makeupNotes: _iwe.makeupNotes?.trim() || undefined,
                    imageUrl: undefined,
                  });
                }
              } else {
                // Supplement existing marketplace override with accessories if missing
                const _iweExisting = _charWardrobeOverrides.get(_iwe.characterId)!;
                if (!_iweExisting.accessories && _iwe.accessories?.trim()) {
                  _iweExisting.accessories = _iwe.accessories.trim();
                  _charWardrobeOverrides.set(_iwe.characterId, _iweExisting);
                }
              }
              // Build text lines for the fallback wardrobeContext block
              const _iweParts: string[] = [];
              if (_iwe.wardrobeDescription?.trim()) _iweParts.push(_iwe.wardrobeDescription.trim());
              if (_iwe.hairNotes?.trim()) _iweParts.push(`hair: ${_iwe.hairNotes.trim()}`);
              if (_iwe.makeupNotes?.trim()) _iweParts.push(`makeup: ${_iwe.makeupNotes.trim()}`);
              if (_iwe.accessories?.trim()) _iweParts.push(`accessories: ${_iwe.accessories.trim()}`);
              if (_iweParts.length > 0) _inlineWardrobeLines.push(`${_iweName}: ${_iweParts.join(", ")}`);
            }
          }
          // Effective wardrobe context: marketplace text when available, otherwise fall back to
          // inline scene entries so the prompt always carries costume directives.
          const _effectiveWardrobeContext = sceneWardrobeContext?.trim()
            ? sceneWardrobeContext
            : _inlineWardrobeLines.length > 0
              ? `CHARACTER WARDROBE (scene overrides):\n${_inlineWardrobeLines.join("\n")}`
              : undefined;
            const { buildCharacterDNA: _buildDNA } = await import("./_core/characterConsistency");
            const characterDescriptions = sceneActiveCharacters
              .filter((c: any) => c.name)
              .map((c: any) => _buildDNA(c, _charWardrobeOverrides.get((c as any).id) || undefined).promptAnchor);

        // Build BYOK keys: use user's own keys; admins also get platform keys as fallback
        const rawUserKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdmin = ctx.user.role === "admin";
        const byokKeys: UserApiKeys = {
          openaiKey: rawUserKeys.openaiKey || (isAdmin ? ENV.openaiApiKey : undefined),
          runwayKey: rawUserKeys.runwayKey || (isAdmin ? ENV.runwayApiKey : undefined),
          replicateKey: rawUserKeys.replicateKey,
          falKey: rawUserKeys.falKey || (isAdmin ? ENV.falApiKey : undefined),
          lumaKey: rawUserKeys.lumaKey,
          hfToken: rawUserKeys.hfToken,
          byteplusKey: rawUserKeys.byteplusKey,
          googleAiKey: rawUserKeys.googleAiKey || (isAdmin ? ENV.googleApiKey : undefined),
          preferredProvider: rawUserKeys.preferredProvider,
        };

        // Pollinations is always available as a free fallback ÃÂ¢ÃÂÃÂ no key required.
        // Users with paid API keys (Runway, OpenAI, etc.) will use those for higher quality.

        // Cancel any existing processing jobs for this scene to prevent race conditions.
        // Old jobs with stale API keys would otherwise keep failing and resetting the scene status.
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            const { sql } = await import("drizzle-orm");
            await dbConn.execute(
              sql.raw(`UPDATE generationJobs SET status = 'cancelled', errorMessage = 'Superseded by new generation request' WHERE sceneId = ${scene.id} AND status = 'processing'`)
            );
          }
        } catch (cancelErr: any) {
          logger.warn(`[SceneVideo] Could not cancel old jobs for scene ${scene.id}: ${cancelErr.message}`);
        }

        // Mark scene as generating immediately
        await db.updateScene(scene.id, { status: "generating" } as any);

        // Determine provider
        const { selectProvider } = await import("./_core/byokVideoEngine");
        const activeProvider = selectProvider(byokKeys);

        if (activeProvider === "veo3" && byokKeys.googleAiKey) {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ VEO 3: Extended clip-chaining via background task ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Uses generateExtendedScene to chain multiple sub-clips into full declared duration.
          (async () => {
            try {
              logger.info(`[SceneVideo] Extended Veo3 generation started for scene ${scene.id} (target: ${scene.duration || 45}s)`);
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: sceneAiPromptOverride ? sceneAiPromptOverride : buildExtendedSceneDescription(scene, prompt, effectiveDialogueText, _effectiveWardrobeContext || "", ""),
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
                aiPromptOverride: sceneAiPromptOverride,
                negativePrompt: sceneNegativePrompt,
                seed: sceneSeed,
                sceneType: (scene as any).sceneType || undefined,
                wardrobeContext: _effectiveWardrobeContext || undefined,
                previousSceneLastFrameUrl,
                sfxNotes: (scene as any).sfxNotes || undefined,
                ambientSound: (scene as any).ambientSound || undefined,
                musicMood: (scene as any).musicMood || undefined,
                musicTempo: (scene as any).musicTempo || undefined,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
              if (extResult.thumbnailUrl && project && !project.thumbnailUrl) {
                try { await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl }); } catch (e) { /* ignore */ }
              }
              logger.info(`[SceneVideo] Extended Veo3 generation completed for scene ${scene.id}: ${extResult.videoUrl} (${extResult.totalDuration}s, ${extResult.subClipCount} clips)`);
              // v6.70 ÃÂ¢ÃÂÃÂ async success: finalize the reservation. finalizeReservation
              // is idempotent (only updates rows still in "reserved" state).
              if (__sceneVideoResId) {
                try { await db.finalizeReservation(__sceneVideoResId); } catch {}
              }
            } catch (err: any) {
              logger.error(`[SceneVideo] Extended Veo3 generation failed for scene ${scene.id}: ${err.message}`);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              // v6.70 ÃÂ¢ÃÂÃÂ async failure: refund. releaseReservation is idempotent.
              if (__sceneVideoResId) {
                try { await db.releaseReservation(__sceneVideoResId); } catch {}
              }
            }
          })();
          } else if (activeProvider === "runway" && byokKeys.runwayKey) {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ RUNWAY: Extended clip-chaining via background task ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Uses generateExtendedScene to chain multiple 10s Runway clips into full declared duration.
          (async () => {
            try {
              logger.info(`[SceneVideo] Extended Runway generation started for scene ${scene.id} (target: ${scene.duration || 45}s)`);
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: sceneAiPromptOverride ? sceneAiPromptOverride : buildExtendedSceneDescription(scene, prompt, effectiveDialogueText, _effectiveWardrobeContext || "", ""),
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
                aiPromptOverride: sceneAiPromptOverride,
                negativePrompt: sceneNegativePrompt,
                seed: sceneSeed,
                wardrobeContext: _effectiveWardrobeContext || undefined,
                previousSceneLastFrameUrl,
                sfxNotes: (scene as any).sfxNotes || undefined,
                ambientSound: (scene as any).ambientSound || undefined,
                musicMood: (scene as any).musicMood || undefined,
                musicTempo: (scene as any).musicTempo || undefined,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
              if (extResult.thumbnailUrl && project && !project.thumbnailUrl) {
                try { await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl }); } catch (e) { /* ignore */ }
              }
              logger.info(`[SceneVideo] Extended Runway generation completed for scene ${scene.id}: ${extResult.videoUrl} (${extResult.totalDuration}s, ${extResult.subClipCount} clips)`);
              if (__sceneVideoResId) {
                try { await db.finalizeReservation(__sceneVideoResId); } catch {}
              }
            } catch (err: any) {
              logger.error(`[SceneVideo] Extended Runway generation failed for scene ${scene.id}: ${err.message}`);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              if (__sceneVideoResId) {
                try { await db.releaseReservation(__sceneVideoResId); } catch {}
              }
            }
          })();
        } else if (activeProvider === "fal" && byokKeys.falKey) {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FAL.AI: Extended clip-chaining via background task ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Uses generateExtendedScene to chain multiple sub-clips (each ~10-16s) into a
          // full-length scene matching the declared duration (60-90s). Same pattern as
          // other providers ÃÂ¢ÃÂÃÂ fire-and-forget background task.
          (async () => {
            try {
              logger.info(`[SceneVideo] Extended fal.ai generation started for scene ${scene.id} (target: ${scene.duration || 45}s)`);
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: sceneAiPromptOverride ? sceneAiPromptOverride : buildExtendedSceneDescription(scene, prompt, effectiveDialogueText, _effectiveWardrobeContext || "", ""),
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
                aiPromptOverride: sceneAiPromptOverride,
                negativePrompt: sceneNegativePrompt,
                seed: sceneSeed,
                wardrobeContext: _effectiveWardrobeContext || undefined,
                previousSceneLastFrameUrl,
                sfxNotes: (scene as any).sfxNotes || undefined,
                ambientSound: (scene as any).ambientSound || undefined,
                musicMood: (scene as any).musicMood || undefined,
                musicTempo: (scene as any).musicTempo || undefined,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
              if (extResult.thumbnailUrl && project && !project.thumbnailUrl) {
                try { await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl }); } catch (e) { /* ignore */ }
              }
              logger.info(`[SceneVideo] Extended fal.ai generation completed for scene ${scene.id}: ${extResult.videoUrl} (${extResult.totalDuration}s, ${extResult.subClipCount} clips)`);
              if (__sceneVideoResId) {
                try { await db.finalizeReservation(__sceneVideoResId); } catch {}
              }
            } catch (err: any) {
              logger.error(`[SceneVideo] Extended fal.ai generation failed for scene ${scene.id}: ${err.message}`);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              if (__sceneVideoResId) {
                try { await db.releaseReservation(__sceneVideoResId); } catch {}
              }
            }
          })();

        } else {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ OTHER PROVIDERS: Fire-and-forget background task ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Non-fal providers (Pollinations, Replicate, Luma, HuggingFace, SeedDance) are handled
          // via background async tasks. These providers complete synchronously within the request
          // or use their own polling internally.
          (async () => {
            try {
              logger.info(`[SceneVideo] Background generation started for scene ${scene.id} (provider: ${activeProvider})`);
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: project.id,
                description: sceneAiPromptOverride ? sceneAiPromptOverride : buildExtendedSceneDescription(scene, prompt, effectiveDialogueText, _effectiveWardrobeContext || "", ""),
                targetDurationSeconds: Math.max(10, scene.duration || 45),
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                genre: project.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
                aiPromptOverride: sceneAiPromptOverride,
                negativePrompt: sceneNegativePrompt,
                seed: sceneSeed,
                wardrobeContext: _effectiveWardrobeContext || undefined,
                previousSceneLastFrameUrl,
                sfxNotes: (scene as any).sfxNotes || undefined,
                ambientSound: (scene as any).ambientSound || undefined,
                musicMood: (scene as any).musicMood || undefined,
                musicTempo: (scene as any).musicTempo || undefined,
              });
              await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
              if (extResult.thumbnailUrl && project && !project.thumbnailUrl) {
                try { await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl }); } catch (e) { /* ignore */ }
              }
              logger.info(`[SceneVideo] Background generation completed for scene ${scene.id}: ${extResult.videoUrl}`);
              if (__sceneVideoResId) {
                try { await db.finalizeReservation(__sceneVideoResId); } catch {}
              }
            } catch (err: any) {
              logger.error(`[SceneVideo] Background generation failed for scene ${scene.id}: ${err.message}`);
              await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              if (__sceneVideoResId) {
                try { await db.releaseReservation(__sceneVideoResId); } catch {}
              }
            }
          })();
        }

        // v6.70 ÃÂ¢ÃÂÃÂ Dispatch succeeded; the reservation is now owned by the
        // background IIFE that fired above. Each provider branch finalizes on
        // success (post-completed) and releases on failure (post-failed). The
        // reservation row's (referenceType, referenceId) key still blocks any
        // duplicate click because reserveCredits returns the existing
        // "reserved" row id without re-deducting. Finalize/release are both
        // idempotent (status='reserved' guard) so a retry path is safe.
        // Return immediately ÃÂ¢ÃÂÃÂ frontend will poll scene status
        return { status: "generating", sceneId: scene.id, message: "Video generation started. The scene will update when complete." };
      }),

    // Bulk generate videos for all scenes without videos
    bulkGenerateVideos: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseBulkGenerate", "Bulk Generate Videos");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(project.id);
        const scenesNeedingVideo = scenes.filter(s => !(s as any).videoUrl);
        if (scenesNeedingVideo.length === 0) return { generated: 0, total: scenes.length };
        // Credits: duration-scaled per scene (ÃÂ¢ÃÂÃÂ¤15s=3cr, 16-45s=5cr, 46-90s=7cr, >90s=10cr)
        const bulkVideoCredits = scenesNeedingVideo.reduce((sum: number, s: any) => sum + getVideoCredits(Math.max(10, s.duration || 45), false), 0);
        try { await db.deductCredits(ctx.user.id, bulkVideoCredits, "bulk_generate_videos", `Bulk videos for ${scenesNeedingVideo.length} scenes (duration-scaled)`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        const characters = await db.getProjectCharacters(project.id);
        const userTier = getEffectiveTier(ctx.user) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);

        // Build BYOK keys: use user's own keys; admins also get platform keys as fallback
        const rawUserKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdminBulk = ctx.user.role === "admin";
        const bulkByokKeys: UserApiKeys = {
          openaiKey: rawUserKeys.openaiKey || (isAdminBulk ? ENV.openaiApiKey : undefined),
          runwayKey: rawUserKeys.runwayKey || (isAdminBulk ? ENV.runwayApiKey : undefined),
          replicateKey: rawUserKeys.replicateKey,
          falKey: rawUserKeys.falKey || (isAdminBulk ? ENV.falApiKey : undefined),
          lumaKey: rawUserKeys.lumaKey,
          hfToken: rawUserKeys.hfToken,
          byteplusKey: rawUserKeys.byteplusKey,
          googleAiKey: rawUserKeys.googleAiKey || (isAdminBulk ? ENV.googleApiKey : undefined),
          preferredProvider: rawUserKeys.preferredProvider,
        };

        // Pollinations is always available as a free fallback ÃÂ¢ÃÂÃÂ no key required.
        // Users with paid API keys (Runway, OpenAI, etc.) will use those for higher quality.

        // Determine the active provider for this user
        const { selectProvider } = await import("./_core/byokVideoEngine");
        const bulkActiveProvider = selectProvider(bulkByokKeys);
        const isFalProvider = bulkActiveProvider === "fal" && bulkByokKeys.falKey;

        let generated = 0;

        if (isFalProvider) {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FAL.AI BULK: Extended clip-chaining for each scene ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Uses generateExtendedScene to chain multiple sub-clips into full declared duration.
          // Process 2 at a time to avoid API overload.
          const { generateExtendedScene: generateExtendedSceneBulkFal } = await import("./_core/extendedSceneGenerator");
          const BULK_FAL_BATCH = 2;
          for (let i = 0; i < scenesNeedingVideo.length; i += BULK_FAL_BATCH) {
            const batch = scenesNeedingVideo.slice(i, i + BULK_FAL_BATCH);
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
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: await getEffectiveWardrobeContext(scene as any, ctx.user.id, characters as any),
                    characters: characters.map(c => ({
                      name: c.name,
                      ageRange: (c as any).ageRange ?? null,
                      faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
                      bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
                      consistencyNotes: (c as any).consistencyNotes || null,
                      id: (c as any).id,
                    })),
                  }
                );
                const sceneRefImages = (scene as any).referenceImages as string[] || [];
                const sceneNegativePrompt: string = ((scene as any).negativePrompt as string | undefined) || getDefaultNegativePrompt(userTier as QualityTier);
                const sceneSeed = (scene as any).seed as number | undefined;
                const sceneAiPromptOverride = (scene as any).aiPromptOverride as string | undefined;
                // Fetch dialogue fallback from dialogue records
                let bulkFalDialogue = (scene as any).dialogueText as string | undefined;
                if (!bulkFalDialogue?.trim()) {
                  try {
                    const dlRecs = await db.getSceneDialogues(scene.id);
                    if (dlRecs?.length) bulkFalDialogue = dlRecs.map((d: any) => `${d.characterName}: "${d.line}"${d.emotion ? ` (${d.emotion})` : ''}`).join('\n');
                  } catch { /* ignore */ }
                }
                // Build character data for visual consistency using full CharacterDNA (v6.80)
                  // Previously used a basic name+age+gender string Ã¢ÂÂ now uses buildCharacterDNA
                  // for photorealistic face DNA, body DNA, clothing, and consistency locking.
                const _bulkFalOverrides = new Map<number, { wardrobeDescription?: string; hairNotes?: string; makeupNotes?: string; accessories?: string }>();
                const _bulkFalWardrobeCtx: string | undefined = await getEffectiveWardrobeContext(scene as any, ctx.user.id, characters as any).catch(() => undefined) as string | undefined;
                  const bulkFalCharIds = ((scene as any).characterIds as number[]) || [];
                  const bulkFalSceneChars = characters.filter((c: any) => bulkFalCharIds.length === 0 || bulkFalCharIds.includes(c.id));
                  const { buildCharacterDNA: _bulkFalBuildDNA } = await import("./_core/characterConsistency");
                  const bulkFalCharDescs = bulkFalSceneChars
                    .filter((c: any) => c.name)
                    .map((c: any) => _bulkFalBuildDNA(c, _bulkFalOverrides.get((c as any).id) || undefined).promptAnchor);
                if (sceneRefImages.length === 0) {
                  const cp = bulkFalSceneChars.filter((c: any) => c.photoUrl).map((c: any) => c.photoUrl as string).slice(0, 2);
                  sceneRefImages.push(...cp);
                }
                await db.updateScene(scene.id, { status: "generating" } as any);
                logger.info(`[BulkVideo:fal] Extended generation started for scene ${scene.id} (target: ${scene.duration || 45}s)`);
                const extResult = await generateExtendedSceneBulkFal(bulkByokKeys, {
                  sceneId: scene.id,
                  projectId: project.id,
                  description: sceneAiPromptOverride ? sceneAiPromptOverride : buildExtendedSceneDescription(scene, prompt, bulkFalDialogue, _bulkFalWardrobeCtx || "", ""),
                  targetDurationSeconds: Math.max(10, scene.duration || 45),
                  mood: scene.mood || undefined,
                  lighting: scene.lighting || undefined,
                  timeOfDay: scene.timeOfDay || undefined,
                  genre: project.genre || undefined,
                  locationDescription: scene.locationType || undefined,
                  referenceImages: sceneRefImages.length > 0 ? sceneRefImages : undefined,
                  characterDescriptions: bulkFalCharDescs.length > 0 ? bulkFalCharDescs : undefined,
                  aiPromptOverride: sceneAiPromptOverride,
                  negativePrompt: sceneNegativePrompt,
                  seed: sceneSeed,
                  wardrobeContext: _bulkFalWardrobeCtx || undefined,
                  previousSceneLastFrameUrl: sceneIdx > 0 ? ((scenes[sceneIdx - 1] as any)?.lastFrameUrl ?? (scenes[sceneIdx - 1] as any)?.endFrameUrl) : undefined,
                  sfxNotes: (scene as any).sfxNotes || undefined,
                  ambientSound: (scene as any).ambientSound || undefined,
                  musicMood: (scene as any).musicMood || undefined,
                  musicTempo: (scene as any).musicTempo || undefined,
                });
                await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
                // Update in-memory scenes array for inter-batch frame continuity
                if (extResult.lastFrameUrl && sceneIdx >= 0) (scenes[sceneIdx] as any).endFrameUrl = extResult.lastFrameUrl;
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
                logger.info(`[BulkVideo:fal] Extended generation completed for scene ${scene.id}: ${extResult.totalDuration}s, ${extResult.subClipCount} clips`);
                generated++;
              } catch (e: any) {
                logger.error(`[BulkVideo:fal] Extended generation failed for scene "${scene.title}": ${e.message}`);
                await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              }
            }));
          }
        } else {
          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ OTHER PROVIDERS: Sequential batch processing ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Non-fal providers (Pollinations, Replicate, Luma, HuggingFace, SeedDance) complete
          // synchronously within the request or use their own polling internally.
          const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
          // Process 2 at a time to avoid API overload
          const BATCH = 2;
          for (let i = 0; i < scenesNeedingVideo.length; i += BATCH) {
            const batch = scenesNeedingVideo.slice(i, i + BATCH);
            await Promise.allSettled(batch.map(async (scene) => {
              try {
                const bulkWardrobeCtx = await getWardrobePromptContextForScene(scene.id, ctx.user.id);
                  // v6.80 Ã¢ÂÂ include inline scene.wardrobe overrides in effective wardrobe context
                  const _bulkInlineEntries = (scene as any).wardrobe as Array<{
                    characterId?: number; wardrobeDescription?: string;
                    hairNotes?: string; makeupNotes?: string; accessories?: string;
                  }> | null | undefined;
                  const _bulkInlineLines: string[] = [];
                  if (Array.isArray(_bulkInlineEntries)) {
                    for (const _bie of _bulkInlineEntries) {
                      const _bieName = characters.find((c: any) => c.id === _bie.characterId)?.name || `Character ${_bie.characterId}`;
                      const _bieParts: string[] = [];
                      if (_bie.wardrobeDescription?.trim()) _bieParts.push(_bie.wardrobeDescription.trim());
                      if (_bie.hairNotes?.trim()) _bieParts.push(`hair: ${_bie.hairNotes.trim()}`);
                      if (_bie.makeupNotes?.trim()) _bieParts.push(`makeup: ${_bie.makeupNotes.trim()}`);
                      if (_bie.accessories?.trim()) _bieParts.push(`accessories: ${_bie.accessories.trim()}`);
                      if (_bieParts.length > 0) _bulkInlineLines.push(`${_bieName}: ${_bieParts.join(", ")}`);
                    }
                  }
                  const _bulkEffectiveWardrobeCtx = bulkWardrobeCtx?.trim()
                    ? bulkWardrobeCtx
                    : _bulkInlineLines.length > 0 ? `CHARACTER WARDROBE (scene overrides):\n${_bulkInlineLines.join("\n")}` : undefined;
                const sceneIdx = scenes.findIndex(s => s.id === scene.id);
                const prompt = buildScenePrompt(
                  { ...scene, cinemaIndustry: project?.cinemaIndustry || "Hollywood" },
                  visualDNA,
                  {
                    sceneIndex: sceneIdx >= 0 ? sceneIdx : 0,
                    totalScenes: scenes.length,
                    previousSceneDescription: sceneIdx > 0 ? (scenes[sceneIdx - 1]?.description || undefined) : undefined,
                    characterNames: characters.map(c => c.name),
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: _bulkEffectiveWardrobeCtx,
                    characters: characters.map(c => ({
                      name: c.name,
                      ageRange: (c as any).ageRange ?? null,
                      faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
                      bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
                      consistencyNotes: (c as any).consistencyNotes || null,
                      id: (c as any).id,
                    })),
                  }
                );
                await db.updateScene(scene.id, { status: "generating" } as any);
                // Fetch dialogue fallback + character data for other providers
                let bulkOtherDialogue = (scene as any).dialogueText as string | undefined;
                if (!bulkOtherDialogue?.trim()) {
                  try {
                    const dlRecs2 = await db.getSceneDialogues(scene.id);
                    if (dlRecs2?.length) bulkOtherDialogue = dlRecs2.map((d: any) => `${d.characterName}: "${d.line}"${d.emotion ? ` (${d.emotion})` : ''}`).join('\n');
                  } catch { /* ignore */ }
                }
                const bulkOtherCharIds = ((scene as any).characterIds as number[]) || [];
                  const bulkOtherSceneChars = characters.filter((c: any) => bulkOtherCharIds.length === 0 || bulkOtherCharIds.includes(c.id));
                  const { buildCharacterDNA: _bulkOtherBuildDNA } = await import("./_core/characterConsistency");
                // Build per-character wardrobe override map from already-computed inline entries
                const _bulkOtherOverrides = new Map<number, { wardrobeDescription?: string; hairNotes?: string; makeupNotes?: string; accessories?: string }>();
                if (Array.isArray(_bulkInlineEntries)) {
                  for (const _boe of _bulkInlineEntries) {
                    if (_boe.characterId && _boe.wardrobeDescription?.trim()) {
                      _bulkOtherOverrides.set(_boe.characterId, { wardrobeDescription: _boe.wardrobeDescription, hairNotes: _boe.hairNotes, makeupNotes: _boe.makeupNotes, accessories: _boe.accessories });
                    }
                  }
                }
                const bulkOtherCharDescs = bulkOtherSceneChars
                    .filter((c: any) => c.name)
                    .map((c: any) => _bulkOtherBuildDNA(c, _bulkOtherOverrides.get((c as any).id) || undefined).promptAnchor);
                const bulkOtherRefs: string[] = ((scene as any).referenceImages as string[] | undefined || []).slice();
                if (bulkOtherRefs.length === 0) {
                  const cp2 = bulkOtherSceneChars.filter((c: any) => c.photoUrl).map((c: any) => c.photoUrl as string).slice(0, 2);
                  bulkOtherRefs.push(...cp2);
                }
                const bulkOtherPromptOverride = (scene as any).aiPromptOverride as string | undefined;
                const bulkOtherDesc = bulkOtherPromptOverride ? bulkOtherPromptOverride : buildExtendedSceneDescription(scene, prompt, bulkOtherDialogue, _bulkEffectiveWardrobeCtx || "", "");
                const extResult = await generateExtendedScene(bulkByokKeys, {
                  sceneId: scene.id,
                  projectId: project.id,
                  description: bulkOtherDesc,
                  targetDurationSeconds: Math.max(10, scene.duration || 45),
                  mood: scene.mood || undefined,
                  lighting: scene.lighting || undefined,
                  timeOfDay: scene.timeOfDay || undefined,
                  genre: project.genre || undefined,
                  locationDescription: scene.locationType || undefined,
                  referenceImages: bulkOtherRefs.length > 0 ? bulkOtherRefs : undefined,
                  characterDescriptions: bulkOtherCharDescs.length > 0 ? bulkOtherCharDescs : undefined,
                  wardrobeContext: _bulkEffectiveWardrobeCtx || undefined,
                  previousSceneLastFrameUrl: sceneIdx > 0 ? (scenes[sceneIdx - 1] as any)?.endFrameUrl : undefined,
                });
                await db.updateScene(scene.id, { videoUrl: extResult.videoUrl, status: "completed", ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}) } as any);
                // Update in-memory scenes array so next batch picks up endFrameUrl for frame continuity
                if (extResult.lastFrameUrl && sceneIdx >= 0) (scenes[sceneIdx] as any).endFrameUrl = extResult.lastFrameUrl;
              try {
                await db.createNotification({
                  userId: ctx.user.id,
                  type: "render_complete",
                  title: `Scene "${scene.title || `#${scene.id}`}" video ready`,
                  message: `Your ${scene.duration || 45}s scene render is complete. Review it in the editor.`,
                  link: `/projects/${project.id}/scenes`,
                });
              } catch (_) { /* non-critical */ }
                // Auto-set project thumbnail if project has none
                if (extResult.thumbnailUrl && !project.thumbnailUrl) {
                  try {
                    await db.updateProject(project.id, ctx.user.id, { thumbnailUrl: extResult.thumbnailUrl });
                    (project as any).thumbnailUrl = extResult.thumbnailUrl;
                  } catch (e) { /* ignore */ }
                }
                generated++;
              } catch (e) {
                logger.errorWithStack(`Bulk video gen failed for scene "${scene.title}":`, e);
                await db.updateScene(scene.id, { status: "failed" } as any).catch(() => {});
              }
            }));
          }
        }
        return { generated, total: scenes.length };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Virelle AI Scene Editing Chat ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    virelleChat: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        message: z.string().min(1).max(2000),
        chatHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(10000),
        })).max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        // Get the scene data and verify ownership BEFORE deducting credits
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertCanAccessProject(scene.projectId, ctx.user.id);
        // Credits: deduct for Virelle chat message
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "virelle_chat", `Virelle chat for scene ${input.sceneId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }

        // Get user's API keys
        const userKeys = await db.getUserApiKeys(ctx.user!.id);

        // Determine which LLM provider to use.
        // Priority: Venice (preferred) ÃÂ¢ÃÂÃÂ user's chosen ÃÂ¢ÃÂÃÂ OpenAI ÃÂ¢ÃÂÃÂ Anthropic ÃÂ¢ÃÂÃÂ Google ÃÂ¢ÃÂÃÂ admin platform key.
        const preferredLlm = userKeys.preferredLlmProvider;
        const isAdminChat = ctx.user.role === "admin";
        let provider: "openai" | "anthropic" | "google" | "venice" | "groq" = "groq";
        if (preferredLlm === "venice" && userKeys.veniceKey) provider = "venice";
        else if (preferredLlm === "anthropic" && userKeys.anthropicKey) provider = "anthropic";
        else if (preferredLlm === "google" && userKeys.googleAiKey) provider = "google";
        else if (preferredLlm === "openai" && userKeys.openaiKey) provider = "openai";
        else if (userKeys.veniceKey) provider = "venice";
        else if (userKeys.openaiKey) provider = "openai";
        else if (userKeys.anthropicKey) provider = "anthropic";
        else if (userKeys.googleAiKey) provider = "google";
        else if (ENV.groqApiKey) provider = "groq";
          else if (isAdminChat && ENV.veniceApiKey) provider = "venice";
          else if (isAdminChat && ENV.openaiApiKey) provider = "openai";
          else {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "No LLM key configured. Go to Settings ÃÂ¢ÃÂÃÂ API Keys and add an OpenAI, Anthropic, Google AI, or Venice key to use the Director's Assistant.",
            });
          }

        const apiKey =
          provider === "venice" ? (userKeys.veniceKey || (isAdminChat ? ENV.veniceApiKey : ""))
          : provider === "openai" ? (userKeys.openaiKey || (isAdminChat ? ENV.openaiApiKey : ""))
          : provider === "anthropic" ? userKeys.anthropicKey!
          : provider === "groq" ? ENV.groqApiKey
          : userKeys.googleAiKey!;

        // Build the system prompt for Virelle
        const systemPrompt = `You are Virelle, the AI production assistant for VirÃÂÃÂlle Studios. You execute the director's scene editing instructions with precision and faithfulness.

You are currently editing this scene:
- Title: ${scene.title || "Untitled"}
- Description: ${scene.description || "No description"}
- Time of Day: ${scene.timeOfDay || "not set"}
- Weather: ${(scene as any).weather || "not set"}
- Lighting: ${scene.lighting || "not set"}
- Camera Angle: ${scene.cameraAngle || "not set"}
- Mood: ${scene.mood || "not set"}
- Location: ${scene.locationType || "not set"}
- Duration: ${scene.duration || 60}s
- Director Notes: ${(scene as any).productionNotes || "none"}

DIRECTOR-FIRST RULES (non-negotiable):
1. Apply ONLY the changes the director explicitly requests. Do NOT change any other field.
2. Do NOT add new elements (dialogue, effects, characters, mood, weather, sounds) that the director did not ask for.
3. Preserve ALL existing scene properties that the director did not mention.
4. If the director's instruction is ambiguous, ask ONE clarifying question instead of guessing.
5. ONLY make creative suggestions or additions if the director explicitly says "be creative", "add something", "what do you suggest", "use your judgment", or "surprise me".
6. The director has full creative control ÃÂ¢ÃÂÃÂ execute their vision exactly as stated, without restriction.

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

        const _abort = new AbortController();
        const _abortTimer = setTimeout(() => _abort.abort(), 30000);
        try {
          if (provider === "groq") {
            const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
                max_tokens: 1000,
                temperature: 0.7,
              }),
              signal: _abort.signal,
            });
            if (!resp.ok) { const e = await resp.text(); throw new Error(`Groq API error ${resp.status}: ${e}`); }
            const data = await resp.json();
            aiResponse = data.choices?.[0]?.message?.content || "";
          } else if (provider === "venice") {
            const resp = await fetch("https://api.venice.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.3-70b",
                messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
                max_tokens: 1000,
                temperature: 0.7,
              }),
            });
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Venice API error ${resp.status}: ${errText}`);
            }
            const data = await resp.json();
            aiResponse = data.choices?.[0]?.message?.content || "";
          } else if (provider === "openai") {
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
          logger.error(`[Virelle] LLM call failed (${provider}): ${err.message}`);
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
            logger.errorWithStack("[Virelle] Failed to parse JSON updates:", e);
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
        provider: z.enum(["openai", "anthropic", "google", "venice"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserApiKey(ctx.user!.id, "preferredLlmProvider", input.provider);
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ File Upload ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  upload: router({
    image: protectedProcedure
      .input(z.object({
        base64: z.string().max(14_000_000, "File too large. Max 10MB."),
        filename: z.string(),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `uploads/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ External Scene Footage Upload ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // Allows directors to upload externally shot footage (MP4, MOV, AVI, MKV) into a scene
    footage: protectedProcedure
      .input(z.object({
        base64: z.string().max(200_000_000, "File too large. Max 150MB."),
        filename: z.string(),
        contentType: z.enum(["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"]).default("video/mp4"),
        sceneId: z.number().optional(),
        footageType: z.enum(["replace", "overlay", "reference"]).default("replace"),
        label: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitUpload(ctx.user.id);
        const buffer = Buffer.from(input.base64, "base64");
        const key = `footage/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);

        // If a sceneId is provided, verify ownership then update the scene
        if (input.sceneId) {
          const targetScene = await db.getSceneById(input.sceneId);
          if (!targetScene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
          await assertCanAccessProject(targetScene.projectId, ctx.user.id);
          await db.updateScene(input.sceneId, {
            externalFootageUrl: url,
            externalFootageType: input.footageType,
            externalFootageLabel: input.label || input.filename,
          } as any);
        }

        return { url, key };
      }),

    // Upload reference images (PNG, JPG, WEBP) for a scene ÃÂ¢ÃÂÃÂ logos, concept art, mood boards
    referenceImage: protectedProcedure
      .input(z.object({
        base64: z.string().max(50_000_000, "File too large. Max 10MB."),
        filename: z.string(),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/png"),
        sceneId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitUpload(ctx.user.id);
        const buffer = Buffer.from(input.base64, "base64");
        const key = `reference-images/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        // Verify ownership, then append to existing reference images
        const scene = await db.getSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertCanAccessProject(scene.projectId, ctx.user.id);
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
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertCanAccessProject(scene.projectId, ctx.user.id);
        const existing = (scene?.referenceImages as string[] || []);
        const updated = existing.filter((url: string) => url !== input.imageUrl);
        await db.updateScene(input.sceneId, { referenceImages: updated } as any);
        return { referenceImages: updated };
      }),

    // v6.62 ÃÂ¢ÃÂÃÂ Project-level reference image upload (style anchor for ALL scenes
    // in the project). Falls back to scene-level refs first; this is the
    // "set the look once, applied everywhere" lever directors expect.
    projectReferenceImage: protectedProcedure
      .input(z.object({
        base64: z.string().max(50_000_000, "File too large. Max 10MB."),
        filename: z.string(),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/png"),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitUpload(ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const buffer = Buffer.from(input.base64, "base64");
        const key = `reference-images/${ctx.user.id}/project-${input.projectId}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        const existing = ((project as any).referenceImages as string[] | null) || [];
        const updated = [...existing, url];
        await db.updateProject(input.projectId, ctx.user.id, { referenceImages: updated } as any);
        return { url, key, referenceImages: updated };
      }),

    removeProjectReferenceImage: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const existing = ((project as any).referenceImages as string[] | null) || [];
        const updated = existing.filter((u: string) => u !== input.imageUrl);
        await db.updateProject(input.projectId, ctx.user.id, { referenceImages: updated } as any);
        return { referenceImages: updated };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Frame-timestamp comments (v6.62) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Pinned notes at a specific second of a video clip ÃÂ¢ÃÂÃÂ table-stakes review
  // workflow for any pro film tool (Frame.io / Vimeo Review parity).
  frameComment: router({
    list: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        movieId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const rows = await db.listFrameComments({
          projectId: input.projectId,
          sceneId: input.sceneId ?? null,
          movieId: input.movieId ?? null,
        });
        // Hydrate author names for the panel
        const authorIds = Array.from(new Set(rows.map((r) => r.userId)));
        const authors = await Promise.all(authorIds.map((id) => db.getUserById(id)));
        const nameById = new Map<number, string>();
        for (const a of authors) if (a) nameById.set(a.id, a.name || a.email || "User");
        return rows.map((r) => ({
          ...r,
          authorName: nameById.get(r.userId) || "User",
        }));
      }),
    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        movieId: z.number().optional(),
        timestampSeconds: z.number().min(0),
        body: z.string().trim().min(1).max(2000),
        parentId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        if (!input.sceneId && !input.movieId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "sceneId or movieId required" });
        }
        // Sanitize body ÃÂ¢ÃÂÃÂ comments render as plain text in the panel
        const cleanBody = sanitizeText(input.body).slice(0, 2000);
        const created = await db.createFrameComment({
          projectId: input.projectId,
          sceneId: input.sceneId ?? null,
          movieId: input.movieId ?? null,
          userId: ctx.user.id,
          timestampSeconds: Math.round(input.timestampSeconds * 10) / 10,
          body: cleanBody,
          resolved: false,
          parentId: input.parentId ?? null,
        } as any);
        return created;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        body: z.string().trim().min(1).max(2000).optional(),
        resolved: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const patch: any = {};
        if (input.body !== undefined) patch.body = sanitizeText(input.body).slice(0, 2000);
        if (input.resolved !== undefined) patch.resolved = input.resolved;
        const updated = await db.updateFrameComment(input.id, ctx.user.id, patch);
        if (!updated) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit this comment" });
        return updated;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.deleteFrameComment(input.id, ctx.user.id);
        if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this comment" });
        return { ok: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  generation: router({
    // Quick generate: AI creates full film from plot + characters
    // Enhanced with Visual DNA system and Cinematic Prompt Engine
    quickGenerate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitHeavyAI(ctx.user.id);
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

        // Ownership: verify project belongs to caller before spending any resources
        logger.aiGeneration("quickGenerate started", ctx.user.id, { projectId: input.projectId });
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        await db.incrementGenerationCount(ctx.user.id);
        // Credits: deduct for film generation
        try {
          await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_film.cost, "generate_film", `Generate Film for project ${input.projectId}`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: e.message });
          }
          // Non-credit errors don't block generation for now
          logger.warn(`[Credits] Deduction warning: ${e.message}`);
        }

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Reset: clear existing scenes and OLD jobs BEFORE creating the new job ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // IMPORTANT: must happen before createGenerationJob so we don't delete the new job.
        try {
          const existingScenes = await db.getProjectScenes(project.id);
          for (const s of existingScenes) {
            await db.deleteScene(s.id);
          }
          // Cancel/clear any stale generation jobs for this project
          const { generationJobs: genJobsTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          const { getDb: getDbConn } = await import("./db");
          const dbConn = await getDbConn();
          if (dbConn) {
            await dbConn.delete(genJobsTable).where(eqOp(genJobsTable.projectId, project.id));
          }
        } catch (clearErr: any) {
          logger.warn(`[QuickGen] Could not clear old scenes/jobs: ${clearErr.message}`);
          // Non-fatal ÃÂ¢ÃÂÃÂ continue with generation
        }
        // Create a generation job AFTER clearing old jobs so it isn't immediately deleted
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
          thumbnailUrl: null,
        });

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FIRE-AND-FORGET: Return immediately so Railway's 5-minute HTTP timeout doesn't kill us ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // The full generation pipeline runs in the background. The client polls for updates
        // via refetchInterval on project.get, scene.listByProject, and generation.listJobs.
        const userId = ctx.user.id;
        const projectId = project.id;
        const jobId = job.id;
        const projectRef = project;
        const ctxUser = ctx.user; // capture for background closure

        setImmediate(async () => {
        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Fetch user BYOK keys early ÃÂ¢ÃÂÃÂ used for both LLM and video generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // Must be done before Step 0 so user's own OpenAI key is used for LLM calls,
        // not the platform key (which may be quota-exhausted).
        let earlyUserKeys: any = { openaiKey: null, anthropicKey: null, googleAiKey: null, falApiKey: null };
        try { earlyUserKeys = await db.getUserApiKeys(userId); } catch (e: any) {
          logger.warn(`[QuickGen] getUserApiKeys failed, generation may fail without user keys: ${e?.message}`);
        }
        const userLlmApiKey: string | null = earlyUserKeys.openaiKey || null;

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pre-flight check: ensure user has at least ONE video provider key configured ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // Without this guard the pipeline runs the full LLM script generation (burning credits +
        // platform LLM quota), then dies at the video step with a vague error. Block early with
        // a clear instructional message instead.
        const hasAnyVideoKey = !!(
          earlyUserKeys.falKey ||
          earlyUserKeys.runwayKey ||
          earlyUserKeys.replicateKey ||
          earlyUserKeys.lumaKey ||
          earlyUserKeys.hfToken ||
          earlyUserKeys.byteplusKey ||
          earlyUserKeys.openaiKey ||
          earlyUserKeys.googleAiKey
        );
        if (!hasAnyVideoKey) {
          const noKeyMsg =
            "NO_VIDEO_KEY: Add a video-generation API key before generating a film. " +
            "Open Settings ÃÂ¢ÃÂÃÂ API Keys and connect at least one of: fal.ai (cheapest, ~$0.40/clip), " +
            "Runway, Hugging Face (free tier), Luma, Replicate, or Google Veo 3. " +
            "Once connected, return here and tap Re-generate Film.";
          logger.warn(`[QuickGen] Project ${projectId} blocked: user has no video API keys configured.`);
          try { await db.updateJob(jobId, { status: "failed", progress: 0, errorMessage: noKeyMsg }); } catch {}
          try { await db.updateProject(projectId, userId, { status: "failed", progress: 0 }); } catch {}
          return;
        }
        if (!earlyUserKeys.elevenlabsKey) {
          const noElevenLabsMsg =
            "NO_ELEVENLABS_KEY: ElevenLabs is required for voice and sound generation. " +
            "Open Settings ÃÂ¢ÃÂÃÂ API Keys, add your ElevenLabs API key, then tap Re-generate Film. " +
            "Get a free key at elevenlabs.io ÃÂ¢ÃÂÃÂ the free tier covers thousands of characters per month.";
          logger.warn(`[QuickGen] Project ${projectId} blocked: user has no ElevenLabs key configured.`);
          try { await db.updateJob(jobId, { status: "failed", progress: 0, errorMessage: noElevenLabsMsg }); } catch {}
          try { await db.updateProject(projectId, userId, { status: "failed", progress: 0 }); } catch {}
          return;
        }

        // Wrap entire background pipeline in a request-scoped LLM key context so EVERY
        // nested invokeLLM call (compression, scene breakdown, beat-sheet, dialog, etc.)
        // automatically prefers the user's saved OpenAI key over the platform's shared key.
        await withUserLlmKey({ openaiKey: earlyUserKeys.openaiKey, anthropicKey: earlyUserKeys.anthropicKey, veniceKey: earlyUserKeys.veniceKey }, async () => {
        try {

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Step 0: Auto-generate photorealistic characters if none exist ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // This is the key to broadcast-quality output: consistent faces across all scenes
        let existingCharacters = await db.getProjectCharacters(projectId);
        if (existingCharacters.length === 0) {
          try {
            // Ask LLM to design 2-4 characters (humans + animals if relevant) based on the plot
            const charDesignResult = await invokeLLM({
              userApiKey: userLlmApiKey,
              messages: [
                {
                  role: "system",
                  content: `You are a Hollywood casting director and character designer. Based on the plot summary, design 2-4 main characters for this film. Include humans AND animals if relevant to the story. For each character, provide extremely specific physical descriptions that will be used to generate photorealistic portrait images. Be precise ÃÂ¢ÃÂÃÂ hair color, eye color, skin tone, age, ethnicity, build, distinguishing features, clothing style. For animals, describe species, breed, coloring, size, and distinctive features.`,
                },
                {
                  role: "user",
                  content: `Plot: ${projectRef.plotSummary || projectRef.description || "A compelling story"}\nGenre: ${projectRef.genre || "Drama"}\n\nDesign 2-4 main characters. Return JSON with this exact schema:\n{"characters": [{"name": string, "role": string, "isAnimal": boolean, "animalSpecies": string|null, "gender": string, "ageRange": string, "ethnicity": string, "skinTone": string, "build": string, "hairColor": string, "hairStyle": string, "eyeColor": string, "facialFeatures": string, "distinguishingMarks": string, "clothingStyle": string, "expression": string, "description": string}]}`,
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
                    `NOT CGI, NOT illustration, NOT cartoon ÃÂ¢ÃÂÃÂ a REAL PHOTOGRAPH of a REAL ANIMAL`,
                  ].filter(Boolean).join(" ");
                } else {
                  // Human portrait prompt ÃÂ¢ÃÂÃÂ using the same high-quality prompt as the character generator
                  portraitPrompt = [
                    `RAW photograph, ultra-photorealistic Hollywood A-list actor headshot, absolutely indistinguishable from a real photograph of a real human being,`,
                    `captured on ARRI ALEXA 65 large-format sensor with Zeiss Supreme Prime Radiance lens at f/1.4, shallow cinematic depth of field with natural oval bokeh,`,
                    `${cd.gender || "person"} in their ${cd.ageRange || "30s"},`,
                    `${cd.ethnicity || ""} ethnicity,`,
                    cd.skinTone ? `${cd.skinTone} skin tone ÃÂ¢ÃÂÃÂ skin rendered with perfect subsurface scattering showing blood flow beneath translucent skin layers, visible pores, micro-wrinkles, fine peach fuzz hair on skin surface, natural blemishes and freckles, authentic facial asymmetry ÃÂ¢ÃÂÃÂ no airbrushed or plastic skin,` : "",
                    cd.build ? `${cd.build} build,` : "",
                    `${cd.hairColor || "brown"} ${cd.hairStyle || "natural"} hair ÃÂ¢ÃÂÃÂ individual strand detail visible, natural hair texture with flyaways and imperfections, realistic hair sheen,`,
                    `${cd.eyeColor || "brown"} eyes ÃÂ¢ÃÂÃÂ hyper-realistic iris with detailed fiber structure, natural corneal reflections and specular highlights, subtle moisture in waterline, sclera with faint realistic veins, soulful and alive expression,`,
                    cd.facialFeatures ? `${cd.facialFeatures},` : "",
                    cd.distinguishingMarks ? `${cd.distinguishingMarks},` : "",
                    cd.clothingStyle ? `wearing ${cd.clothingStyle} ÃÂ¢ÃÂÃÂ fabric texture and material weight visible,` : "",
                    cd.expression ? `${cd.expression} expression with authentic micro-expressions and genuine emotion,` : "",
                    cd.description ? `Character context: ${cd.description},` : "",
                    `three-point Rembrandt lighting: warm key light at 45 degrees creating a Rembrandt triangle on the face, soft fill light reducing shadow ratio to 2:1, subtle rim/hair light separating subject from background,`,
                    `skin pores visible under magnification, micro-wrinkles around eyes and mouth, natural skin oil and moisture, capillaries visible in sclera,`,
                    `authentic facial bone structure with natural asymmetry ÃÂ¢ÃÂÃÂ no perfect symmetry, no uncanny valley,`,
                    `Kodak Vision3 500T film stock color science with organic grain structure and natural highlight rolloff,`,
                    `8K resolution, hyperdetailed, Academy Award-winning portrait photography,`,
                    `NOT a painting, NOT CGI, NOT illustration, NOT cartoon, NOT 3D render, NOT AI-looking, NOT plastic skin, NOT doll-like, NOT overly smooth ÃÂ¢ÃÂÃÂ a REAL PHOTOGRAPH of a REAL PERSON`,
                  ].filter(Boolean).join(" ");
                }

                const portraitResult = await generateImage({ prompt: portraitPrompt });
                if (portraitResult.url) {
                  await db.createCharacter({
                    userId: userId,
                    projectId: projectId,
                    name: cd.name || "Character",
                    description: cd.description || `${cd.role || "Character"} ÃÂ¢ÃÂÃÂ ${cd.isAnimal ? cd.animalSpecies : `${cd.gender}, ${cd.ageRange}, ${cd.ethnicity}`}`,
                    photoUrl: portraitResult.url,
                    attributes: {
                      ...cd,
                      aiGenerated: true,
                      autoGeneratedForProject: projectId,
                    },
                  });
                  logger.info(`[QuickGen] Auto-generated character portrait: ${cd.name}`);
                }
              } catch (charErr: any) {
                logger.error(`[QuickGen] Failed to generate character portrait for ${cd.name}: ${charErr.message}`);
              }
            }
          } catch (charDesignErr: any) {
            logger.error(`[QuickGen] Character auto-generation failed: ${charDesignErr.message}`);
            // Non-fatal ÃÂ¢ÃÂÃÂ continue with scene generation
          }
        }

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Step 1: Build Visual DNA for consistent style across all scenes ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        const characters = await db.getProjectCharacters(projectId);
        const userTier = getEffectiveTier(ctxUser) as QualityTier;
        const visualDNA = buildVisualDNA(project, characters, userTier);
        const charDescriptions = characters.map(c => {
          const attrs = (c.attributes as any) || {};
          const parts = [`${c.name}`];
          if (c.description) parts.push(`ÃÂ¢ÃÂÃÂ ${c.description}`);
          if (attrs.age || attrs.ageRange || attrs.estimatedAge) parts.push(`Age: ${attrs.age || attrs.ageRange || attrs.estimatedAge}`);
          if (attrs.gender) parts.push(`Gender: ${attrs.gender}`);
          if (attrs.ethnicity) parts.push(`Ethnicity: ${attrs.ethnicity}`);
          if (attrs.build) parts.push(`Build: ${attrs.build}`);
          if (attrs.hairColor) parts.push(`Hair: ${attrs.hairColor} ${attrs.hairStyle || ""}`.trim());
          if (attrs.eyeColor) parts.push(`Eyes: ${attrs.eyeColor}`);
          if (attrs.clothingStyle) parts.push(`Style: ${attrs.clothingStyle}`);
          return parts.join(". ");
        }).join("\n");

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Step 2: Enhanced LLM scene breakdown with cinematic intelligence ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        // Check if director explicitly granted creative leeway in their plot/description
        const directorText = (projectRef.plotSummary || projectRef.description || "").toLowerCase();
        const hasCreativeLeeway = /be creative|use your judgment|surprise me|you decide|fill it in|add what you think|make it cinematic|your choice|go wild|improvise|creative freedom/i.test(directorText);
        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Visual Style Pre-generation (C1) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // Run a focused LLM call to establish a Visual DNA guide before scene breakdown.
          // This anchors every scene's look so the final film has visual consistency.
          let visualDnaGuide = "";
          try {
            const vdnaResult = await invokeLLM({
              userApiKey: userLlmApiKey,
              messages: [
                {
                  role: "system",
                  content: `You are a world-class cinematographer. In 150-200 words, write a concise Visual DNA guide for a ${projectRef.genre || "Drama"} film. Cover: color palette, primary lighting style, preferred lens range, camera movement philosophy, texture/grain style, and two reference cinematographers whose work defines this look. Be technically specific (e.g. f/stops, focal lengths, color temperature). Output plain text only ÃÂ¢ÃÂÃÂ no headings, no bullets.`,
                },
                {
                  role: "user",
                  content: `Film: "${projectRef.title}" ÃÂ¢ÃÂÃÂ ${projectRef.genre || "Drama"} | ${projectRef.rating || "PG-13"} | ${projectRef.duration || 90} min${projectRef.tone ? "\nTone: " + projectRef.tone : ""}${projectRef.themes ? "\nThemes: " + projectRef.themes : ""}`,
                },
              ],
            });
            if (vdnaResult.choices?.[0]?.message?.content) {
              visualDnaGuide = (vdnaResult.choices[0].message.content as string).trim();
            }
          } catch {
            // Non-fatal ÃÂ¢ÃÂÃÂ proceed without visual DNA guide
          }

                  const systemPrompt = buildSceneBreakdownSystemPrompt({ ...project, creativeLeeway: hasCreativeLeeway }) +
            (visualDnaGuide ? `\n\nVISUAL DNA FOR THIS FILM (apply consistently to every scene):\n${visualDnaGuide}` : "");

        // v6.77 ÃÂ¢ÃÂÃÂ Inject project brand policy so the AI scene breakdown places
        // required brands into the right shots and never writes forbidden ones
        // into a visual description.
        const __sbBrands = await brandsForPrompt(projectId);
        const __sbBrandBlock = brandDirectiveBlock(__sbBrands);

        const llmResult = await invokeLLM({
          userApiKey: userLlmApiKey,
          messages: [
            {
              role: "system",
              content: systemPrompt + (__sbBrandBlock ? `\n\nWhen writing visualDescription for any scene, honor the BRAND POLICY supplied below: weave required brands into appropriate shots, allow approved brands where natural, and never mention or describe forbidden brands.` : ""),
            },
            {
              role: "user",
              content: `Plot: ${projectRef.plotSummary || projectRef.description || "A compelling story"}

Director's Specs (NON-NEGOTIABLE ÃÂ¢ÃÂÃÂ honor these exactly):
- Genre: ${projectRef.genre || "Drama"}
- Rating: ${projectRef.rating || "PG-13"}
- Duration: ${projectRef.duration || 90} minutes
${projectRef.tone ? "- Tone: " + projectRef.tone : ""}
${projectRef.themes ? "- Themes: " + projectRef.themes : ""}
${projectRef.setting ? "- Setting: " + projectRef.setting : ""}


Characters:
${charDescriptions}
${__sbBrandBlock ? `\n${__sbBrandBlock}\n` : ""}
Break this into the number of scenes specified in your system instructions above. For each scene, provide:
- title: Scene title
- description: What happens narratively (2-3 sentences)
- visualDescription: EXACTLY what the camera sees ÃÂ¢ÃÂÃÂ specific details about environment, character positions, expressions, lighting quality, colors, textures, foreground/background elements (3-5 sentences, be extremely specific and visual)
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

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Step 3: Create scenes in DB with enhanced data ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        for (let i = 0; i < scenesData.length; i++) {
          const s = scenesData[i];
          await db.createScene({
            projectId: projectId,
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
            duration: s.estimatedDuration || 60,
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

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Step 4: Generate VIDEO CLIPS for each scene using Sora API ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        const allScenes = await db.getProjectScenes(projectId);
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
                  brands: await brandsForPrompt(scene.projectId),
                  wardrobeContext: await getEffectiveWardrobeContext(scene as any, ctx.user.id, characters as any),
                characters: characters.map(c => ({
                  name: c.name,
                  ageRange: (c as any).ageRange ?? null,
                  faceDnaPrompt: (c as any).faceDnaPrompt || (c as any).attributes?.faceDnaPrompt || null,
                  bodyDnaPrompt: (c as any).bodyDnaPrompt || (c as any).attributes?.bodyDnaPrompt || null,
                  consistencyNotes: (c as any).consistencyNotes || null,
                  id: (c as any).id,
                })),
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
                  await db.updateProject(projectId, userId, { thumbnailUrl: imgResult.url });
                }
              }
            } catch (imgErr) {
              logger.errorWithStack(`Failed to generate thumbnail for scene "${scene.title}":`, imgErr);
            }

            // Step 4b: Generate extended video scene using clip chaining (30-60s per scene)
            // Re-use earlyUserKeys fetched at the top of quickGenerate (avoids duplicate DB call).
            const isAdminQG = ctxUser.role === "admin";
            const byokKeys: UserApiKeys = {
              // BYOK-only: user's own keys are used exclusively. Admins also get platform key fallback.
              openaiKey: earlyUserKeys.openaiKey || (isAdminQG ? ENV.openaiApiKey : undefined) || undefined,
              runwayKey: earlyUserKeys.runwayKey || (isAdminQG ? ENV.runwayApiKey : undefined) || undefined,
              replicateKey: earlyUserKeys.replicateKey,
              falKey: earlyUserKeys.falKey || (isAdminQG ? ENV.falApiKey : undefined) || undefined,
              lumaKey: earlyUserKeys.lumaKey,
              hfToken: earlyUserKeys.hfToken,
              byteplusKey: earlyUserKeys.byteplusKey,
              googleAiKey: earlyUserKeys.googleAiKey || (isAdminQG ? ENV.googleApiKey : undefined) || undefined,
              preferredProvider: earlyUserKeys.preferredProvider || undefined,
            };

            // Build rich video prompt ÃÂ¢ÃÂÃÂ PRIORITY: faceDnaPrompt (photo-locked) > assembled attributes
            const charVideoDescriptions = characters.map(c => {
              const attrs = (c.attributes as any) || {};
              if (attrs.isAnimal && attrs.animalSpecies) {
                return `${c.name} (${attrs.animalSpecies}${attrs.hairColor ? `, ${attrs.hairColor} coloring` : ""}${attrs.build ? `, ${attrs.build}` : ""})`.trim();
              }
              const faceDnaPrompt = (c as any).faceDnaPrompt || attrs.faceDnaPrompt;
              // Use photo-locked face DNA anchor when available
              if (faceDnaPrompt) return `[CHARACTER ${c.name}: ${faceDnaPrompt}]`;
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
            }).filter((x: any) => x !== null) as any[];

            // Dialogue fallback: fetch from dialogue records if scene.dialogueText is empty
            let quickGenDialogue = (scene as any).dialogueText as string | undefined;
            if (!quickGenDialogue?.trim()) {
              try {
                const dlRecs = await db.getSceneDialogues(scene.id);
                if (dlRecs?.length) quickGenDialogue = dlRecs.map((d: any) => `${d.characterName}: "${d.line}"${d.emotion ? ` (${d.emotion})` : ''}`).join('\n');
              } catch { /* ignore */ }
            }
            // Character reference images for visual consistency
            const qgRefImages: string[] = (scene as any).referenceImages as string[] || [];
            if (qgRefImages.length === 0) {
              const charPhotos = characters.filter((c: any) => c.photoUrl).map((c: any) => c.photoUrl as string).slice(0, 2);
              qgRefImages.push(...charPhotos);
            }
            const videoPrompt = [
              `Cinematic video scene: ${scene.description || scene.title || "A cinematic scene"}.`,
              quickGenDialogue?.trim() ? `DIALOGUE: ${quickGenDialogue.trim()}` : "",
              (scene as any).productionNotes?.trim() ? `DIRECTOR NOTES: ${(scene as any).productionNotes.trim()}` : "",
              charVideoDescriptions.length > 0 ? `Characters in scene: ${charVideoDescriptions.join(" | ")}.` : "",
              scene.mood ? `Mood: ${scene.mood}.` : "",
              scene.lighting ? `Lighting: ${scene.lighting}.` : "",
              scene.timeOfDay ? `Time: ${scene.timeOfDay}.` : "",
              scene.weather ? `Weather: ${scene.weather}.` : "",
              projectRef.genre ? `Genre: ${projectRef.genre}.` : "",
              scene.locationType ? `Location: ${scene.locationType}.` : "",
              (scene.cameraAngle as string) === "tracking" ? "Smooth tracking camera movement." : "Slow cinematic dolly shot.",
              "Photorealistic, shot on ARRI Alexa 65, 35mm anamorphic lens, shallow depth of field, natural lighting, film grain, broadcast TV quality.",
            ].filter(Boolean).join(" ");

            // Use extended scene generation ÃÂ¢ÃÂÃÂ support industry-standard scene lengths (30sÃÂ¢ÃÂÃÂ5min)
            // No artificial cap: providers will handle their own per-clip limits internally
            const targetSceneDuration = Math.max(10, scene.duration || 45);

            try {
              // Import and use extended scene generator for clip chaining
              const { generateExtendedScene } = await import("./_core/extendedSceneGenerator");
              const autoGenWardrobeCtx = await getEffectiveWardrobeContext(scene as any, ctx.user.id, characters as any);
              const extResult = await generateExtendedScene(byokKeys, {
                sceneId: scene.id,
                projectId: projectId,
                description: videoPrompt,
                targetDurationSeconds: targetSceneDuration,
                mood: scene.mood || undefined,
                lighting: scene.lighting || undefined,
                timeOfDay: scene.timeOfDay || undefined,
                weather: scene.weather || undefined,
                genre: projectRef.genre || undefined,
                locationDescription: scene.locationType || undefined,
                referenceImages: qgRefImages.length > 0 ? qgRefImages : undefined,
                characterDescriptions: charVideoDescriptions.length > 0 ? charVideoDescriptions : undefined,
                previousSceneLastFrameUrl: sceneIdx > 0 ? ((allScenes[sceneIdx - 1] as any)?.lastFrameUrl ?? (allScenes[sceneIdx - 1] as any)?.endFrameUrl) : undefined,
                wardrobeContext: autoGenWardrobeCtx || undefined,
                sfxNotes: (scene as any).sfxNotes || undefined,
                ambientSound: (scene as any).ambientSound || undefined,
                musicMood: (scene as any).musicMood || undefined,
                musicTempo: (scene as any).musicTempo || undefined,
              });

              await db.updateScene(scene.id, {
                videoUrl: extResult.videoUrl,
                thumbnailUrl: extResult.thumbnailUrl || undefined,
                status: "completed",
                ...(extResult.lastFrameUrl ? { endFrameUrl: extResult.lastFrameUrl } : {}),
              });

              // Set project thumbnail from first scene's video thumbnail (if not already set)
              if (sceneIdx === 0 && extResult.thumbnailUrl && !(project as any).thumbnailUrl) {
                try {
                  await db.updateProject(projectId, userId, { thumbnailUrl: extResult.thumbnailUrl });
                  (project as any).thumbnailUrl = extResult.thumbnailUrl;
                } catch { /* ignore */ }
              }

              // Store last frame URL for continuity
              (scene as any).lastFrameUrl = extResult.lastFrameUrl;

              generatedCount++;
              logger.info(`[QuickGen] Scene ${sceneIdx + 1}/${allScenes.length} extended video generated (${extResult.totalDuration.toFixed(1)}s, ${extResult.subClipCount} clips): ${extResult.videoUrl}`);
            } catch (videoErr: any) {
              logger.error(`[QuickGen] Extended video generation failed for scene "${scene.title}": ${videoErr.message}`);

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
                // Resolve Runway/Veo3 async sentinels inline
                let finalVideoUrl = videoResult.videoUrl;
                if (finalVideoUrl.startsWith("runway-pending:") && byokKeys.runwayKey) {
                  const { submitRunwayJob } = await import("./_core/videoJobWorker");
                  const taskId = finalVideoUrl.replace("runway-pending:", "");
                  // Store as a proper job for the worker to complete asynchronously
                  await db.createGenerationJob({
                    projectId: projectId,
                    sceneId: scene.id,
                    type: "scene",
                    status: "processing",
                    progress: 0,
                    estimatedSeconds: 600,
                    metadata: {
                      runwayTaskId: taskId,
                      runwayApiKey: byokKeys.runwayKey,
                      sceneId: scene.id,
                      projectId: projectId,
                      userId: userId,
                      prompt: videoPrompt,
                      imageUrl: scene.thumbnailUrl || undefined,
                      ratio: "1280:720",
                      duration: sceneDuration,
                    },
                  });
                  // Leave scene in generating state ÃÂ¢ÃÂÃÂ worker will complete it
                  await db.updateScene(scene.id, { status: "generating" } as any);
                  generatedCount++;
                  logger.info(`[QuickGen] Scene ${sceneIdx + 1} Runway job ${taskId} queued for worker`);
                } else {
                  await db.updateScene(scene.id, {
                    videoUrl: finalVideoUrl,
                    videoJobId: videoResult.jobId || null,
                    status: "completed",
                  });
                  generatedCount++;
                  logger.info(`[QuickGen] Scene ${sceneIdx + 1} fallback single-clip generated via ${videoResult.provider}`);
                }
              } catch (fallbackErr: any) {
                const errMsg = fallbackErr.message || String(fallbackErr);
                logger.error(`[QuickGen] All video generation failed for scene "${scene.title}": ${errMsg}`);
                // Store actionable error in the job so the UI can surface it
                try {
                  await db.updateJob(job.id, { errorMessage: `Scene "${scene.title}" ÃÂ¢ÃÂÃÂ ${errMsg}` });
                } catch { /* ignore */ }
                // Mark scene as failed (not completed) so the UI can distinguish "no video" from "generation failed"
                await db.updateScene(scene.id, { status: "failed" } as any);
              }
            }
           } catch (e: any) {
            logger.error(`Failed to process scene "${scene.title}": ${(e as any)?.message ?? String(e)}`);
            // Mark scene as completed (with no video) so it doesn't stay in 'generating' state
            try { await db.updateScene(scene.id, { status: "completed" }); } catch { /* ignore */ }
          }
          // Always update progress ÃÂ¢ÃÂÃÂ even if this scene failed ÃÂ¢ÃÂÃÂ so the UI never appears frozen
          const progress = Math.min(95, Math.round(((sceneIdx + 1) / allScenes.length) * 90) + 10);
          await db.updateJob(job.id, { progress });
          await db.updateProject(projectId, userId, { progress });
        }

         // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Auto-stitch all scene videos into a final film ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        let outputUrl: string | undefined;
        try {
          const freshScenes = await db.getProjectScenes(projectId);
          const videoScenes = freshScenes
            .filter((s) => (s as any).videoUrl)
            .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
          if (videoScenes.length > 0) {
            const { stitchMovie } = await import("./_core/videoStitcher");
            const stitchResult = await stitchMovie({
              scenes: videoScenes.map((s, idx) => ({
                videoUrl: (s as any).videoUrl as string,
                title: s.title || `Scene ${idx + 1}`,
                duration: (s as any).duration || undefined,
                orderIndex: s.orderIndex ?? idx,
                transition: "fade-to-black",
              })),
              projectTitle: projectRef.title,
              userId: userId,
              projectId: projectId,
              showTitleCard: true,
              showCredits: false,
              genre: projectRef.genre || undefined,
              resolution: projectRef.resolution === "1920x1080" ? "1080p" : "720p",
            });
            outputUrl = stitchResult.fileUrl;
            logger.info(`[QuickGen] Auto-stitched ${videoScenes.length} scenes ÃÂ¢ÃÂÃÂ ${outputUrl}`);
          }
        } catch (stitchErr: any) {
          logger.error(`[QuickGen] Auto-stitch failed (non-fatal): ${stitchErr.message}`);
          // Non-fatal ÃÂ¢ÃÂÃÂ project still completes, user can manually export later
        }

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ No-video guard: if zero scenes produced playable videos AND no stitched output,
        //    mark the job + project as failed with an actionable message instead of silently
        //    "completing" with an empty preview (which is what the user sees as "it pretends"). ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
        if (!outputUrl && generatedCount === 0) {
          const failMsg =
            "VIDEO_PROVIDER_FAILED: Every video provider attempt failed for this project. " +
            "Common causes: (1) the API key for your selected provider is rate-limited or out of credit, " +
            "(2) the provider is temporarily down, or (3) the prompt was rejected by the safety filter. " +
            "Open Settings ÃÂ¢ÃÂÃÂ API Keys, verify your fal.ai / Runway / Hugging Face / Luma key is valid and funded, " +
            "then return here and tap Re-generate Film.";
          logger.error(`[QuickGen] Project ${projectId} produced 0 videos ÃÂ¢ÃÂÃÂ marking job/project failed.`);
          try { await db.updateJob(job.id, { status: "failed", progress: 0, errorMessage: failMsg }); } catch { /* ignore */ }
          try {
            await db.updateProject(projectId, userId, {
              status: "failed",
              progress: 0,
            });
          } catch { /* ignore */ }
          logger.info(`[QuickGen] Background generation halted for project ${projectId}: 0 videos produced`);
          return;
        }

        // Update job and project
        await db.updateJob(job.id, { status: "completed", progress: 100 });
        // Ensure project has a thumbnailUrl ÃÂ¢ÃÂÃÂ use first scene's thumbnail if not already set
        let finalThumbnailUrl: string | undefined;
        if (!(project as any).thumbnailUrl) {
          try {
            const freshScenes2 = await db.getProjectScenes(projectId);
            const firstWithThumb = freshScenes2.find((s) => (s as any).thumbnailUrl);
            if (firstWithThumb) finalThumbnailUrl = (firstWithThumb as any).thumbnailUrl as string;
          } catch { /* ignore */ }
        }
        await db.updateProject(projectId, userId, {
          status: "completed",
          progress: 100,
          ...(outputUrl ? { outputUrl } : {}),
          ...(finalThumbnailUrl ? { thumbnailUrl: finalThumbnailUrl } : {}),
        });
        logger.info(`[QuickGen] Background generation complete for project ${projectId}: ${scenesData.length} scenes, ${generatedCount} videos`);
        } catch (error: any) {
          // Error recovery: ensure project doesn't get stuck in "generating" state
          // AND surface the actual error message into the job so the red banner in the UI fires.
          const fatalMsg =
            (error?.message ? String(error.message) : "Unknown background generation error") +
            " ÃÂ¢ÃÂÃÂ please check Settings ÃÂ¢ÃÂÃÂ API Keys and try Re-generate Film. If this keeps happening, the issue is on the AI provider side.";
          logger.errorWithStack("[QuickGen] Background generation failed", error);
          try { await db.updateJob(jobId, { status: "failed", progress: 0, errorMessage: fatalMsg }); } catch { /* ignore */ }
          try {
            await db.updateProject(projectId, userId, {
              status: "failed",
              progress: 0,
            });
          } catch { /* ignore */ }
        }
        }); // end withUserLlmKey
        }); // end setImmediate

        // Return immediately ÃÂ¢ÃÂÃÂ generation continues in background
        return { jobId: job.id, scenesCreated: 0, imagesGenerated: 0 };
      }),

    // Generate trailer from existing scenes
    generateTrailer: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseTrailerGeneration", "Trailer Generation");
        requireGenerationQuota(ctx.user);
        // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ Atomic reservation w/ release-on-failure.
        // Trailer generation runs synchronously inside this handler, so we can
        // wrap the entire body and release the reservation if anything throws.
        let __trailerResId: number | null = null;
        try {
          __trailerResId = await db.reserveCredits(
            ctx.user.id,
            CREDIT_COSTS.trailer_gen.cost,
            "trailer_gen",
            { projectId: input.projectId, referenceType: "trailer", referenceId: input.projectId },
          );
        } catch (e: any) {
          if (e?.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: e.message });
          }
          throw e;
        }
        try {
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

        // v6.77 ÃÂ¢ÃÂÃÂ Inject per-project brand policy so the trailer cuts respect
        // required / allowed / forbidden real-world brands when describing shots.
        const __trailerBrands = await brandsForPrompt(project.id);
        const __trailerBrandBlock = brandDirectiveBlock(__trailerBrands);

        const llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a Hollywood trailer editor. Your STRICT rules:\n1. NEVER spoil key plot twists, endings, character deaths, major reveals, or surprise elements.\n2. ALL trailer content MUST be G-rated regardless of the film's actual rating ÃÂ¢ÃÂÃÂ absolutely NO violence, gore, sexual content, strong language, drug use, or disturbing imagery.\n3. Focus on building intrigue, mystery, and excitement ÃÂ¢ÃÂÃÂ tease the premise and characters without giving away what happens.\n4. Select scenes from the FIRST HALF of the film only to avoid late-story spoilers.\n5. Create a sense of wonder and anticipation that makes viewers want to see the film.\n6. Keep the trailer family-friendly and suitable for all audiences.\n7. Honor the project BRAND POLICY: keep required brands visible, allowed brands welcome, forbidden brands completely absent in every trailer-cut description you write.\nReturn JSON.",
            },
            {
              role: "user",
              content: `Film: "${project.title}" (${project.genre || "Drama"}, rated ${project.rating || "PG-13"})\nPlot: ${project.plotSummary || project.description}\n${__trailerBrandBlock ? `\n${__trailerBrandBlock}\n` : ""}\nAvailable scenes:\n${sceneDescriptions}\n\nSelect 4-6 scenes for a 2-minute trailer. IMPORTANT RULES:\n- ONLY select scenes from the first half of the film (scenes 1 through ${Math.ceil(allScenes.length / 2)}) to avoid spoilers\n- Do NOT reveal any plot twists, endings, or major surprises\n- Rewrite each scene description to be G-RATED and family-friendly even if the original scene contains mature content\n- Respect the BRAND POLICY above: do not write any forbidden brand into a trailer description; weave required brands into the chosen shots when natural.\n- Focus on establishing the world, characters, and central conflict without resolution\n- Build curiosity and excitement ÃÂ¢ÃÂÃÂ leave the audience wanting more\n\nFor each scene, provide the scene index (0-based), a G-rated trailer-cut description, and the order they should appear in the trailer.`,
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
              logger.errorWithStack(`Failed to generate trailer image for scene ${sceneIdx}:`, e);
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

        // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ Trailer dispatch succeeded; finalize the hold.
        if (__trailerResId) {
          try { await db.finalizeReservation(__trailerResId); } catch {}
        }
        return {
          jobId: job.id,
          trailerTitle: trailerData.trailerTitle,
          tagline: trailerData.tagline,
          scenes: trailerData.selectedScenes,
          images: trailerImages,
        };
        } catch (err) {
          // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ Refund the held credits if anything failed.
          if (__trailerResId) {
            try { await db.releaseReservation(__trailerResId); } catch {}
          }
          throw err;
        }
      }),

    // Get generation job status
    getJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await db.getJobById(input.id);
        if (job) await assertCanAccessProject((job as any).projectId, ctx.user.id);
        return job;
      }),

    listJobs: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectJobs(input.projectId);
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Generate Full Film (90-minute pipeline) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
        await rateLimitHeavyAI(ctx.user.id);
        requireFeature(ctx.user, "canUseFullFilmGeneration", "Full Film Generation");

        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new Error("Project not found");

        const characters = await db.getProjectCharacters(project.id);
        const allScenes = await db.getProjectScenes(project.id);
        if (allScenes.length === 0) throw new Error("No scenes found. Generate scenes first using Quick Generate or the Director Assistant.");

        // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Credit System: Full Film Generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
              `GENERATION_LIMIT: Full film generation requires ${totalCreditsNeeded} credits (${scenesWithDialogueCount} scenes ÃÂÃÂ ${creditsPerScene} credits/scene). You have ${remaining} credits remaining. Upgrade your plan or purchase a top-up pack.`
            );
          }
        }

        // Pre-deduct all credits for the film upfront (generation counter + creditBalance)
        for (let i = 0; i < totalCreditsNeeded; i++) {
          await db.incrementGenerationCount(ctx.user.id);
        }
        // Deduct from creditBalance so the credit system stays in sync
        try {
          await db.deductCredits(ctx.user.id, totalCreditsNeeded, "generate_film", `Full film generation: ${allScenes.length} scenes ÃÂÃÂ ${creditsPerScene} credits/scene`);
        } catch (e: any) {
          if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message });
        }

        // Fetch user API keys; admins also get platform keys as fallback
        const userKeys = await db.getUserApiKeys(ctx.user!.id);
        const isAdminFilm = ctx.user.role === "admin";
        const videoKeys: UserApiKeys = {
          openaiKey: userKeys.openaiKey || (isAdminFilm ? ENV.openaiApiKey : undefined),
          runwayKey: userKeys.runwayKey || (isAdminFilm ? ENV.runwayApiKey : undefined),
          replicateKey: userKeys.replicateKey,
          falKey: userKeys.falKey || (isAdminFilm ? ENV.falApiKey : undefined),
          lumaKey: userKeys.lumaKey,
          hfToken: userKeys.hfToken,
          byteplusKey: userKeys.byteplusKey,
          googleAiKey: userKeys.googleAiKey || (isAdminFilm ? ENV.googleApiKey : undefined),
          preferredProvider: userKeys.preferredProvider,
        };

        // Pollinations is always available as a free fallback ÃÂ¢ÃÂÃÂ all users can generate films.
        // Users with paid API keys (Runway, OpenAI, etc.) will use those for higher quality.
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
                faceDnaPrompt: (c as any).faceDnaPrompt || c.attributes?.faceDnaPrompt || null,
                bodyDnaPrompt: (c as any).bodyDnaPrompt || c.attributes?.bodyDnaPrompt || null,
                consistencyNotes: (c as any).consistencyNotes || c.attributes?.consistencyNotes || null,
                deepProfile: (c as any).deepProfile || c.attributes?.deepProfile || null,
                // Voice & speech fields for TTS matching
                voiceId: c.voiceId || null,
                voiceType: c.voiceType || null,
                voiceDescription: c.voiceDescription || null,
                speechPattern: c.speechPattern || null,
                accent: c.accent || null,
                role: c.role || c.attributes?.role || null,
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
          logger.errorWithStack("generateFullFilm failed:", error);
          await db.updateJob(job.id, { status: "failed", progress: 0 });
          await db.updateProject(project.id, ctx.user.id, { status: "draft", progress: 0 });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Full film generation failed: ${error.message}` });
        }
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Estimate film generation cost ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Get available TTS and music providers ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    getAudioProviders: protectedProcedure.query(async () => {
      return {
        ttsProviders: TTS_PROVIDERS,
        musicProviders: MUSIC_PROVIDERS,
      };
    }),

    // Pause/resume generation
    pauseJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getJobById(input.id);
        if (job) await assertCanAccessProject(job.projectId, ctx.user.id);
        return db.updateJob(input.id, { status: "paused" });
      }),

    resumeJob: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getJobById(input.id);
        if (job) await assertCanAccessProject(job.projectId, ctx.user.id);
        return db.updateJob(input.id, { status: "processing" });
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Cancel Film Generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

    // v6.62 ÃÂ¢ÃÂÃÂ Cross-project active render queue feed.
    // Powers the global Render Queue tray in the dashboard top bar so users
    // can see, at a glance, every job they have in flight regardless of which
    // project page they're on. Polled every 5ÃÂ¢ÃÂÃÂ15s by the tray component.
    listActiveForUser: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserActiveRenders(ctx.user.id);
    }),

    // Cancel a single render row from the tray. Validates ownership through
    // the parent project before mutating any state.
    cancelRender: protectedProcedure
      .input(z.object({
        kind: z.enum(["job", "scene"]),
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.cancelUserRender(ctx.user.id, input.kind, input.id);
        if (!result.ok) throw new TRPCError({ code: "NOT_FOUND", message: "Render not found or not yours" });
        logAuditEvent(ctx.user.id, "cancelRender", "system", true, { kind: input.kind, id: input.id });
        return { ok: true };
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Scripts ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  script: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectScripts(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const script = await db.getScriptById(input.id);
        if (script) await assertCanAccessProject(script.projectId, ctx.user.id);
        return script;
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
        await rateLimitAI(ctx.user.id);
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
          const lines: string[] = [];
          // Header line
          const headerParts = [c.name.toUpperCase()];
          if (c.role) headerParts.push(`(${c.role})`);
          if (c.storyImportance) headerParts.push(`[${c.storyImportance}]`);
          lines.push(headerParts.join(" "));
          // Physical identity
          const identityParts = [
            c.description || "",
            attrs?.age ? `Age: ${attrs.age}` : "",
            attrs?.gender ? `Gender: ${attrs.gender}` : "",
            c.nationality ? `Nationality: ${c.nationality}` : "",
            c.occupation ? `Occupation: ${c.occupation}` : "",
          ].filter((x: any) => x !== null) as any[];
          if (identityParts.length) lines.push(`  Identity: ${identityParts.join(" | ")}`);
          // Voice & Speech ÃÂ¢ÃÂÃÂ critical for authentic dialogue
          const voiceParts = [
            c.voiceType ? `Voice type: ${c.voiceType}` : "",
            c.voiceDescription ? `Voice: ${c.voiceDescription}` : "",
            c.speechPattern ? `Speech pattern: ${c.speechPattern}` : "",
            c.accent ? `Accent: ${c.accent}` : "",
            c.catchphrase ? `Catchphrase: "${c.catchphrase}"` : "",
            c.signatureMannerisms ? `Mannerisms: ${c.signatureMannerisms}` : "",
          ].filter((x: any) => x !== null) as any[];
          if (voiceParts.length) lines.push(`  Voice/Speech: ${voiceParts.join(" | ")}`);
          // Psychology & Character Arc
          if (c.backstory) lines.push(`  Backstory: ${c.backstory.slice(0, 300)}`);
          if (c.motivations) lines.push(`  Motivation: ${c.motivations.slice(0, 200)}`);
          if (c.arcType) lines.push(`  Character arc: ${c.arcType}`);
          if (c.moralAlignment) lines.push(`  Moral alignment: ${c.moralAlignment}`);
          const personality = c.personality as any;
          if (personality?.mbti) lines.push(`  MBTI: ${personality.mbti}`);
          if (c.fears) lines.push(`  Fears: ${c.fears.slice(0, 150)}`);
          if (c.secrets) lines.push(`  Secrets: ${c.secrets.slice(0, 150)}`);
          // Relationships
          const rels = c.relationships as any[];
          if (Array.isArray(rels) && rels.length > 0) {
            const relStr = rels.slice(0, 3).map((r: any) => `${r.type || "connected"} with ${r.name || r.characterId}`).join(", ");
            lines.push(`  Relationships: ${relStr}`);
          }
          return lines.join("\n");
        }).join("\n\n");

        const sceneBlock = scenes.map((s, i) =>
          `Scene ${i + 1}: "${s.title || "Untitled"}" ÃÂ¢ÃÂÃÂ ${s.description || ""} (${s.locationType || ""}, ${s.timeOfDay || ""}, ${s.mood || ""})`
        ).join("\n");

        let _llmRefundAmount_script_writer_ai = 3;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
                    content: `You are an award-winning Hollywood screenwriter with credits on major studio productions. Your job is to faithfully adapt the director's exact story, characters, plot, and scenes into a production-ready screenplay. You do NOT invent new characters, subplots, or story elements the director did not provide ÃÂ¢ÃÂÃÂ unless the director explicitly grants creative freedom.

=== DIRECTOR-FIRST RULES (NON-NEGOTIABLE) ===
- Write ONLY what the director's scenes and story describe. Every scene, character, and plot point must trace back to the director's input.
- Dialogue must reflect the characters and situations the director defined. Do not impose your own thematic interpretation.
- If the director did not specify dialogue for a scene, write purposeful, minimal dialogue that serves only the scene's stated function.
- Do NOT add subtext, themes, or character arcs the director did not describe.
- ONLY apply creative interpretation if the director explicitly says "be creative", "add your own flair", "use your judgment", or similar.

=== INDUSTRY-STANDARD FORMAT (EXACT) ===

1. FADE IN: ÃÂ¢ÃÂÃÂ Always the very first line. Never omit.

2. SCENE HEADINGS (Sluglines) ÃÂ¢ÃÂÃÂ ALL CAPS only.
   Format: INT./EXT. SPECIFIC LOCATION NAME - TIME OF DAY
   - INT. = interior, EXT. = exterior, INT./EXT. = both (e.g. car window scene)
   - Time of day: DAY, NIGHT, DAWN, DUSK, CONTINUOUS, MOMENTS LATER, LATER, SAME TIME
   - Be specific: not "HOUSE" but "MARCUS'S KITCHEN" or "ABANDONED WAREHOUSE - LOWER EAST SIDE"
   - Every location change = new slugline, always

3. ACTION LINES ÃÂ¢ÃÂÃÂ Present tense. Describe only what the camera sees and hears. No internal thoughts.
   - First appearance of each character: ALL CAPS their name, followed by brief description in parentheses
     Example: DETECTIVE SARAH COLE (40s, sharp eyes, perpetually coffee-stained blazer) enters.
   - Keep paragraphs to 3-4 lines maximum. White space is your friend.
   - Use active verbs: "He SLAMS the door" not "He closes the door loudly."
   - Avoid directing the reader's emotions. Show the action; let the emotion emerge.
   - Camera directions (CLOSE ON:, WIDE SHOT:, POV:) only when essential to story meaning.

4. CHARACTER NAME ÃÂ¢ÃÂÃÂ ALL CAPS, on its own line, above dialogue.
   - (V.O.) = voice-over (character narrating, not physically present)
   - (O.S.) = off-screen (character in scene but not visible)
   - (CONT'D) = character continues after an action line interruption
   - (PRE-LAP) = character's voice heard before their scene begins

5. DIALOGUE ÃÂ¢ÃÂÃÂ Below character name. Conversational, not literary.
   - Each character must have a DISTINCT VOICE. A reader should know who's speaking without seeing the name.
   - Subtext over text: characters rarely say exactly what they mean.
   - Avoid on-the-nose exposition. No character explains what both already know.
   - Read every line aloud mentally. If it sounds like a speech, cut it in half.
   - Use interruptions (--) and trailing off (...) for natural rhythm.

6. PARENTHETICALS ÃÂ¢ÃÂÃÂ (in parentheses) between character name and dialogue.
   - Use SPARINGLY. Only when delivery is genuinely ambiguous without it.
   - Good: (whispering), (to Marcus), (beat), (re: the gun), (sotto voce)
   - Bad: (angrily), (sadly) ÃÂ¢ÃÂÃÂ these should be evident from context.

7. TRANSITIONS ÃÂ¢ÃÂÃÂ Right-aligned. Use sparingly ÃÂ¢ÃÂÃÂ only for deliberate effect.
   CUT TO: (standard edit, rarely written out)
   SMASH CUT TO: (jarring, abrupt cut for shock)
   MATCH CUT TO: (visual or audio match between scenes)
   DISSOLVE TO: (passage of time, dreamlike quality)
   FADE TO BLACK. (end of act or major sequence)
   FADE OUT. (end of screenplay ÃÂ¢ÃÂÃÂ ALWAYS the final line)
   INTERCUT WITH: (parallel action in two locations)

8. ADVANCED ELEMENTS:
   MONTAGE ÃÂ¢ÃÂÃÂ Label clearly:
     MONTAGE ÃÂ¢ÃÂÃÂ SARAH'S INVESTIGATION
     - Shot description.
     - Shot description.
     END MONTAGE.
   FLASHBACK:
     FLASHBACK ÃÂ¢ÃÂÃÂ CHICAGO, 1987
     [scene content]
     END FLASHBACK.
   SUPER: "On-screen text or title cards" (right after slugline)
   SERIES OF SHOTS:
     A) Shot description.
     B) Shot description.
   INSERT ÃÂ¢ÃÂÃÂ CLOSE ON: [specific object/detail]
   BACK TO SCENE (after insert)

9. THREE-ACT STRUCTURE ÃÂ¢ÃÂÃÂ Every screenplay must have:
   ACT ONE (~25%): Establish the world, introduce protagonist with a clear want and need, inciting incident that disrupts the status quo, end-of-act-one turning point that locks the protagonist into the story.
   ACT TWO (~50%): Rising stakes and escalating obstacles, midpoint reversal that changes the story's direction, dark night of the soul (protagonist at their lowest), end-of-act-two turning point that propels into the climax.
   ACT THREE (~25%): Climax where the protagonist confronts the central conflict with everything at stake, resolution that pays off all setups, final image that mirrors or contrasts the opening image.

10. PACING RULES:
    - 1 page = approximately 1 minute of screen time
    - Short scenes (half a page) build tension and momentum
    - Long scenes (2+ pages) allow character depth ÃÂ¢ÃÂÃÂ use sparingly
    - End every scene on a hook: cut out one beat before the scene feels "done"
    - Use "beat" in action lines for deliberate dramatic pauses
    - Scene transitions should create narrative momentum

=== CRAFT PRINCIPLES ===
- EVERY scene must do at least two of: advance plot, reveal character, raise stakes, deliver necessary information
- Show don't tell: a character's fear is shown by their hands shaking, not by writing "she was afraid"
- Dialogue subtext: what characters DON'T say is as important as what they do say
- Plant and payoff (Chekhov's Gun): every significant detail introduced must pay off later
- Antagonist motivation: every antagonist believes they are the hero of their own story
- Dramatic irony: the audience knowing something characters don't creates unbearable tension
- Emotional contrast: place humor immediately before tragedy; calm before violence
- The opening image and closing image should rhyme thematically
- Character want vs. need: what a character wants (external goal) and what they need (internal truth) should be in conflict
- The protagonist must CHANGE by the end ÃÂ¢ÃÂÃÂ or deliberately refuse to change, which is itself a statement

FADE OUT. ÃÂ¢ÃÂÃÂ Always the absolute last line of the screenplay.`,
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_script_writer_ai, "script_writer_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }

        const scriptContent = llmResult.choices[0]?.message?.content || "";
        const pageEstimate = Math.max(1, Math.round((typeof scriptContent === "string" ? scriptContent : "").length / 3000));

        const script = await db.createScript({
          projectId: project.id,
          userId: ctx.user.id,
          title: `${project.title} ÃÂ¢ÃÂÃÂ Screenplay`,
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
        action: z.enum(["continue", "rewrite", "dialogue", "action-line", "transition", "scene-expand", "polish", "character-voice", "scene-beat"]),
        selectedText: z.string().optional(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIScriptGen", "AI Script Assistant");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.dialogue_editor_ai.cost, "dialogue_editor_ai", `AI script assist: ${input.action}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const script = await db.getScriptById(input.scriptId);
        if (!script) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
        if (script.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });

        const contextWindow = (script.content || "").slice(-3000);
        const selectedOrContext = input.selectedText || contextWindow.slice(-800);

        const actionPrompts: Record<string, string> = {
          continue: `You are continuing this screenplay. Study the tone, character voices, pacing, and story momentum carefully from the context provided. Then write the NEXT 3-4 complete scenes with:
- Proper sluglines for every location
- Full dialogue exchanges with distinct character voices and subtext
- Vivid action lines in present tense
- Scenes that escalate tension or deepen character
- Each scene ending on a hook
Do NOT summarise or explain. Write screenplay content only.`,

          rewrite: `You are rewriting the following screenplay section. Improve it by:
- Sharpening dialogue so each character has a distinct voice and speaks with subtext
- Tightening action lines to be more visual and active (present tense, active verbs)
- Removing on-the-nose exposition or over-explanation
- Ensuring proper format (sluglines, character names in ALL CAPS on first appearance)
- Cutting anything that doesn't advance plot or reveal character

SECTION TO REWRITE:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

Output the rewritten section only. No commentary.`,

          dialogue: `You are writing a dialogue exchange for this screenplay. The dialogue must:
- Feel completely natural when spoken aloud ÃÂ¢ÃÂÃÂ no speeches, no on-the-nose lines
- Give each character a DISTINCT VOICE (different vocabulary, rhythm, sentence length)
- Carry subtext: what characters want vs. what they say should differ
- Use interruptions (--) and trailing off (...) for realism
- Include brief action lines between lines where characters react physically
- Use parentheticals ONLY when delivery is genuinely ambiguous

Context / scene being written:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

Write the complete dialogue exchange in proper screenplay format. No commentary.`,

          "action-line": `You are writing cinematic action lines for this screenplay moment. The action lines must:
- Be in present tense only
- Describe exactly what the camera sees and hears ÃÂ¢ÃÂÃÂ no internal thoughts
- Use active, specific verbs (SLAMS, PIVOTS, FREEZES ÃÂ¢ÃÂÃÂ not "moves" or "goes")
- Keep paragraphs to 3-4 lines maximum
- Create visual tension through specific physical detail
- Introduce characters in ALL CAPS on first appearance with brief description
- Use CLOSE ON:, INSERT, or WIDE SHOT: only when essential to story meaning

Scene context:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

Write the action lines only. No commentary.`,

          transition: `You are writing a scene transition for this screenplay. Choose the transition type that best serves the story:
- CUT TO: (standard edit ÃÂ¢ÃÂÃÂ rarely written, use for emphasis only)
- SMASH CUT TO: (jarring, abrupt ÃÂ¢ÃÂÃÂ shock or comedy)
- MATCH CUT TO: (visual or audio match between scenes ÃÂ¢ÃÂÃÂ elegant, thematic)
- DISSOLVE TO: (passage of time, memory, dreamlike quality)
- FADE TO BLACK. (end of act, major emotional beat)
- INTERCUT WITH: (parallel action in two locations)
- CONTINUOUS (no time has passed ÃÂ¢ÃÂÃÂ same scene, new location)

Context before transition:
${selectedOrContext}

${input.instructions ? `Director's notes on what comes next: ${input.instructions}` : ""}

Write only the transition line and a brief (1-2 line) new slugline/opening for the next scene.`,

          "scene-expand": `You are expanding a brief scene outline or summary into a fully written screenplay scene. Take the provided content and develop it into a complete scene with:
- A proper slugline (INT./EXT. SPECIFIC LOCATION - TIME OF DAY)
- Opening action lines that establish the space and mood
- Full dialogue with distinct character voices and subtext
- Physical action and reaction woven between dialogue
- A clear scene purpose (what changes from the start to the end of this scene?)
- An ending that hooks into the next scene

Scene to expand:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

Write the complete scene in proper screenplay format. No commentary.`,

          polish: `You are polishing this screenplay section to professional production-ready quality. Improve it by:
- Sharpening every line of dialogue ÃÂ¢ÃÂÃÂ cut anything that can be cut, add subtext where it's missing
- Strengthening action lines: more specific, more visual, more active verbs
- Fixing any formatting issues (sluglines, character names, parentheticals)
- Removing redundant description (if we can see it, we don't need to say it twice)
- Ensuring consistent character voice throughout
- Improving pacing: scenes should end one beat earlier than they currently do
- Adding a single strong visual detail per scene that carries thematic weight

SECTION TO POLISH:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

Output the polished version only. No commentary.`,

          "character-voice": `You are rewriting the dialogue in this section to give each character a more distinct, authentic voice. For each character:
- Identify their background, education level, emotional state, and relationship to the other characters from context
- Assign them a specific speech pattern: short/long sentences, formal/informal, direct/evasive, uses questions/statements
- Ensure their word choices reflect who they are, not who the writer is
- Add subtext: what they want vs. what they say should be in tension
- Use interruptions, hesitations, and physical reactions to break up speeches

SECTION TO REWRITE:
${selectedOrContext}

${input.instructions ? `Director's notes on characters: ${input.instructions}` : ""}

Output the rewritten dialogue section only. No commentary.`,

          "scene-beat": `You are writing a detailed scene beat breakdown for the following scene or story moment. For each beat:
- State what HAPPENS (the external action)
- State what CHANGES (the emotional or power shift)
- Note the SUBTEXT (what's really being communicated)
- Suggest the VISUAL (what the camera should show)

Then write the scene in full screenplay format based on these beats.

Scene or story moment:
${selectedOrContext}

${input.instructions ? `Director's notes: ${input.instructions}` : ""}

First list the beats (3-6 beats), then write the full scene below.`,
        };

        let _llmRefundAmount_dialogue_editor_ai = 2;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an award-winning Hollywood screenwriter. You write in strict industry-standard screenplay format. Your work is production-ready: vivid, economical, and emotionally precise. You never write prose summaries or commentary ÃÂ¢ÃÂÃÂ only screenplay content.

FORMAT RULES (always apply):
- FADE IN: opens every screenplay
- Sluglines: INT./EXT. SPECIFIC LOCATION - TIME OF DAY (ALL CAPS)
- Action lines: present tense, 3-4 lines max per paragraph, active verbs
- Character names: ALL CAPS above dialogue; ALL CAPS on first appearance in action
- Parentheticals: use sparingly, only when delivery is genuinely ambiguous
- FADE OUT. closes every screenplay
- Output screenplay content only. No meta-commentary, no explanations.`,
            },
            {
              role: "user",
              content: `SCRIPT CONTEXT (most recent content):\n${contextWindow}\n\n---\n\n${actionPrompts[input.action]}`,
            },
          ],
        });
        } catch (_llmErr_dialogue_editor_ai: any) {
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }

        const result = llmResult.choices[0]?.message?.content || "";
        return { text: typeof result === "string" ? result : "" };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Soundtracks ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  soundtrack: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectSoundtracks(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (scene) await assertCanAccessProject(scene.projectId, ctx.user.id);
        return db.getSceneSoundtracks(input.sceneId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const soundtrack = await db.getSoundtrackById(input.id);
        if (soundtrack) await assertCanAccessProject(soundtrack.projectId, ctx.user.id);
        return soundtrack;
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
        await assertOwnsProject(input.projectId, ctx.user.id);
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
        const soundtrack = await db.getSoundtrackById(input.id);
        if (soundtrack) await assertOwnsProject(soundtrack.projectId, ctx.user.id);
        const { id, ...data } = input;
        return db.updateSoundtrack(id, ctx.user.id, data);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const soundtrack = await db.getSoundtrackById(input.id);
        if (soundtrack) await assertOwnsProject(soundtrack.projectId, ctx.user.id);
        await db.deleteSoundtrack(input.id, ctx.user.id);
        return { success: true };
      }),
    // Upload audio file
    uploadAudio: protectedProcedure
      .input(z.object({
        base64: z.string().max(70_000_000, "File too large. Max 50MB."),
        filename: z.string(),
        contentType: z.enum(["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4", "audio/webm"]).default("audio/mpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `soundtracks/${ctx.user.id}/${nanoid()}-${input.filename}`;
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
      }),
  }),
  credit: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        await assertOwnsProject(input.projectId, ctx.user.id);
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
      .mutation(async ({ ctx, input }) => {
        const credit = await db.getCreditById(input.id);
        if (credit) await assertOwnsProject(credit.projectId, ctx.user.id);
        const { id, ...data } = input;
        return db.updateCredit(id, data);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const credit = await db.getCreditById(input.id);
        if (credit) await assertOwnsProject(credit.projectId, ctx.user.id);
        await db.deleteCredit(input.id);
        return { success: true };
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Project Duplication ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  projectDuplicate: router({
    duplicate: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.duplicateProject(input.projectId, ctx.user.id);
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Shot List Generator ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  shotList: router({
    generate: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_shot_list_ai, "shot_list_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Continuity Check ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  continuity: router({
    check: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_continuity_check_ai, "continuity_check_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Location Scout ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  location: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectLocations(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const location = await db.getLocationById(input.id);
        if (location) await assertCanAccessProject(location.projectId, ctx.user.id);
        return location;
      }),

    create: creationProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().nullable().optional(),
        name: z.string().min(1).max(255),
        address: z.string().max(512).optional(),
        locationType: z.string().max(128).optional(),
        description: z.string().max(2000).optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        description: z.string().max(2000).optional(),
        referenceImages: z.array(z.string()).optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
        sceneId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const location = await db.getLocationById(input.id);
        if (location) await assertCanAccessProject(location.projectId, ctx.user.id);
        const { id, ...data } = input;
        return db.updateLocation(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const location = await db.getLocationById(input.id);
        if (location) await assertOwnsProject(location.projectId, ctx.user.id);
        await db.deleteLocation(input.id);
        return { success: true };
      }),

    aiSuggest: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneDescription: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_location_scout_ai, "location_scout_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
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
      .input(z.object({ description: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseLocationScout", "Location Scout");
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.location_scout_ai.cost, "location_scout_ai", `Location image: ${input.description.substring(0, 50)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        try {
          const { url } = await generateImage({
            prompt: `Professional film location reference photo: ${input.description}. Photorealistic, cinematic lighting, wide establishing shot, ARRI ALEXA camera quality, golden hour atmosphere.`,
          });
          return { url };
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed. Please try again." });
        }
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Mood Board ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  moodBoard: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMoodBoardItemById(input.id);
        if (item) await assertCanAccessProject(item.projectId, ctx.user.id);
        const { id, ...data } = input;
        return db.updateMoodBoardItem(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const item = await db.getMoodBoardItemById(input.id);
        if (item) await assertOwnsProject(item.projectId, ctx.user.id);
        await db.deleteMoodBoardItem(input.id);
        return { success: true };
      }),

    generateImage: protectedProcedure
      .input(z.object({ prompt: z.string().min(1).max(2000), projectId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseMoodBoard", "Mood Board");
        // Deduct 1 credit for mood board image generation (same as preview image)
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.generate_preview_image.cost, "generate_preview_image", `Mood board image: ${input.prompt.substring(0, 50)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        // v6.77 ÃÂ¢ÃÂÃÂ Mood board references the same brand policy as the rest of
        // the film so reference frames match what the actual scenes will draw.
        const __mbBrands = await brandsForPrompt(input.projectId);
        const __mbBrandBlock = brandDirectiveBlock(__mbBrands);
        const fullPrompt = `Cinematic mood board reference: ${input.prompt}. Artistic, atmospheric, film production quality.${__mbBrandBlock ? ` ${__mbBrandBlock}` : ""}`;
        try {
          const { url } = await generateImage({ prompt: fullPrompt });
          return { url };
        } catch (e: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed. Please try again." });
        }
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Subtitles ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  subtitle: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectSubtitles(input.projectId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const subtitle = await db.getSubtitleById(input.id);
        if (subtitle) await assertCanAccessProject(subtitle.projectId, ctx.user.id);
        return subtitle;
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
          text: z.string().max(1000),
        })).max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
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
          startTime: z.number(),
          endTime: z.number(),
          text: z.string().max(1000),
        })).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        const subtitle = await db.getSubtitleById(input.id);
        if (subtitle) await assertOwnsProject(subtitle.projectId, ctx.user.id);
        return db.updateSubtitle(input.id, { entries: input.entries });
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const subtitle = await db.getSubtitleById(input.id);
        if (subtitle) await assertOwnsProject(subtitle.projectId, ctx.user.id);
        await db.deleteSubtitle(input.id);
        return { success: true };
      }),
    generate: creationProcedure
      .input(z.object({
        projectId: z.number(),
        language: z.string().min(1).max(32),
        languageName: z.string().min(1).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAISubtitleGen", "AI Subtitle Generation");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.subtitle_gen_ai.cost, "subtitle_gen_ai", `Subtitle generation for ${input.languageName}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const scenes = await db.getProjectScenes(input.projectId);
        const scriptText = scenes.map((s: any) => `[SCENE ${s.sceneNumber}] ${s.content}`).join("\n\n");
        let _llmRefundAmount_subtitle_gen_ai = 3;
        let llmResult: any;
        try {
        llmResult = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional film subtitler. Generate accurate subtitles with timestamps [start-end] in seconds. Keep lines concise (max 42 chars)." },
            { role: "user", content: `Generate subtitles in ${input.languageName} for this script:\n\n${scriptText}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "subtitles",
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
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_subtitle_gen_ai, "subtitle_gen_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }
        const content = llmResult.choices[0]?.message?.content;
        const parsed = safeJsonExtract(content, {} as any);
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
        await rateLimitAI(ctx.user.id);
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
            { role: "system", content: "You are a senior professional film subtitle translator." },
            { role: "user", content: `Translate these film subtitles into professional, natural-sounding ${input.targetLanguageName}:\n\n${subtitleText}` },
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
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_subtitle_gen_ai, "subtitle_gen_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 3 credits have been refunded." });
        }
        const content = llmResult.choices[0]?.message?.content;
        const parsed = safeJsonExtract(content, {} as any);
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
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Dialogues ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  dialogue: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        pacing: z.string().optional(),
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
        pacing: z.string().optional(),
        orderIndex: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dialogue = await db.getDialogueById(input.id);
        if (dialogue) await assertCanAccessProject(dialogue.projectId, ctx.user.id);
        const { id, ...data } = input;
        return db.updateDialogue(id, data);
      }),

    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dialogue = await db.getDialogueById(input.id);
        if (dialogue) await assertOwnsProject(dialogue.projectId, ctx.user.id);
        await db.deleteDialogue(input.id);
        // ownership already verified via dialogue.projectId above
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
        await rateLimitAI(ctx.user.id);
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
Character: ${input.characterName}${input.characterDescription ? ` ÃÂ¢ÃÂÃÂ ${input.characterDescription}` : ""}
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
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
        await rateLimitAI(ctx.user.id);
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
Scene: ${scene?.title || ""} ÃÂ¢ÃÂÃÂ ${scene?.description || input.sceneDescription || ""}
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_dialogue_editor_ai, "dialogue_editor_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed. Your 2 credits have been refunded." });
        }
        try {
          return JSON.parse(response.choices[0].message.content as string || "{}");
        } catch {
          throw new Error("AI returned invalid scene dialogue. Please try again.");
        }
      }),
    inferEmotion: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number().optional(),
        characterName: z.string().max(128),
        line: z.string().max(2000),
        previousLines: z.array(z.object({
          characterName: z.string().max(128),
          line: z.string().max(2000),
          emotion: z.string().max(64).optional(),
        })).max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAIDialogueGen", "AI Dialogue");
        const scene = input.sceneId ? await db.getSceneById(input.sceneId) : null;
        const project = await db.getProjectById(input.projectId, 0).catch(() => null);
        const characters = await db.getProjectCharacters(input.projectId).catch(() => []);
        const character = characters.find(
          (c: { name: string; description?: string | null }) =>
            c.name.toLowerCase() === input.characterName.toLowerCase()
        );
        return inferEmotionFromContext({
          line: input.line,
          characterName: input.characterName,
          characterDescription: character?.description || undefined,
          sceneDescription: scene?.description || undefined,
          previousLines: input.previousLines,
          genre: (project as any)?.genre || undefined,
          invokeLLM: (args) => invokeLLM(args),
        });
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Public reviewer comments on shared screeners ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Pro studios send screeners to investors / distributors / festival
  // programmers and need their feedback collected against scenes.
  // Reviewers don't have accounts ÃÂ¢ÃÂÃÂ they reach the project via an HMAC
  // share-token URL ÃÂ¢ÃÂÃÂ so the add endpoint is publicProcedure but
  // gated by verifyShareToken. Comments are stored in the existing
  // directorChats table tagged `[REVIEW@sceneId|reviewerName|timecode]`
  // so the project owner sees them inline (no schema migration).
  review: router({
    add: publicProcedure
      .input(z.object({
        projectId: z.number(),
        token: z.string(),
        sceneId: z.number().nullable().optional(),
        reviewerName: z.string().min(1).max(60),
        comment: z.string().min(1).max(2000),
        timecode: z.string().max(24).optional(),
      }))
      .mutation(async ({ input }) => {
        const { verifyShareToken } = await import("./_core/shareToken");
        if (!verifyShareToken(input.projectId, input.token)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Invalid or expired share link" });
        }
        // Look up the project owner so the comment lands in their chat history
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const rows: any = await dbConn.execute(
          sql`SELECT userId FROM projects WHERE id = ${input.projectId} LIMIT 1`,
        );
        const arr = Array.isArray(rows[0]) ? rows[0] : rows;
        const ownerId = (arr as any[])?.[0]?.userId as number | undefined;
        if (!ownerId) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const reviewer = input.reviewerName.replace(/[\[\]\|]/g, " ").slice(0, 60).trim();
        const tc = (input.timecode || "").replace(/[\[\]\|]/g, " ").slice(0, 24).trim();
        const tag = `[REVIEW@${input.sceneId ?? 0}|${reviewer}${tc ? `|${tc}` : ""}]`;
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ownerId,
          role: "user",
          content: `${tag}\n${input.comment.trim()}`,
        });
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows: any = await dbConn.execute(
          sql`SELECT id, content, createdAt FROM directorChats
              WHERE projectId = ${input.projectId} AND role = 'user'
                AND content LIKE '[REVIEW@%'
              ORDER BY createdAt DESC LIMIT 200`,
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return (arr || []).map((r: any) => {
          const m = /^\[REVIEW@(\d+)\|([^|\]]+)(?:\|([^\]]+))?\]\s*\n?([\s\S]*)$/.exec(r.content || "");
          return {
            id: r.id,
            sceneId: m ? parseInt(m[1]) || null : null,
            reviewerName: m ? m[2].trim() : "Anonymous",
            timecode: m && m[3] ? m[3].trim() : null,
            comment: m ? m[4].trim() : r.content,
            createdAt: r.createdAt,
          };
        });
      }),

    // v6.69 Phase 8 ÃÂ¢ÃÂÃÂ Awaiting-review queue across all the user's projects.
    // Pure read; surfaces scenes whose approvalStatus is "pending_review".
    listAwaiting: protectedProcedure.query(async ({ ctx }) => {
      const dbConn = await db.getDb();
      if (!dbConn) return [];
      const rows: any = await dbConn.execute(
        sql`SELECT s.id, s.projectId, s.title, s.description, s.orderIndex,
                   p.title AS projectTitle
              FROM scenes s
              JOIN projects p ON p.id = s.projectId
             WHERE p.userId = ${ctx.user.id}
               AND s.approvalStatus = 'pending_review'
             ORDER BY s.updatedAt DESC LIMIT 100`,
      );
      const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
      return (arr || []).map((r: any) => ({
        id: r.id,
        projectId: r.projectId,
        projectTitle: r.projectTitle,
        title: r.title,
        description: r.description,
        sceneNumber: r.orderIndex,
      }));
    }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Chain of Title ÃÂ¢ÃÂÃÂ clearance / rights tracker ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Pro film distribution requires verifiable proof every right has been
  // cleared (literary, music sync + master, life rights, location releases,
  // talent agreements, depiction releases, E&O insurance). Without this
  // a film can't be sold to streamers, festivals or distributors.
  // Persisted as one canonical `[ChainOfTitle]` JSON message per project
  // to avoid schema migration on Railway.
  chainOfTitle: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const rows: any = await dbConn.execute(
          sql`SELECT content, updatedAt FROM directorChats
              WHERE projectId = ${input.projectId} AND content LIKE '[ChainOfTitle]%'
              ORDER BY updatedAt DESC LIMIT 1`,
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        const row = arr?.[0];
        if (!row) return null;
        try {
          const json = (row.content as string).replace(/^\[ChainOfTitle\]\s*\n?/, "");
          return { items: JSON.parse(json), updatedAt: row.updatedAt };
        } catch {
          return null;
        }
      }),

    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        items: z.array(z.object({
          key: z.string().max(64),
          label: z.string().max(120),
          status: z.enum(["pending", "in_progress", "cleared", "na"]),
          notes: z.string().max(2000).optional(),
          docUrl: z.string().max(500).optional(),
        })).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        // Delete previous chain-of-title messages, then write a single fresh one
        await dbConn.execute(
          sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[ChainOfTitle]%'`,
        );
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: `[ChainOfTitle]\n${JSON.stringify(input.items)}`,
        });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Studio: Shot Versions (per-scene generation history) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  shotVersions: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const tag = input.sceneId != null ? `[ShotVersions@${input.sceneId}]%` : `[ShotVersions@%`;
        const rows: any = await dbConn.execute(
          sql`SELECT id, content, updatedAt FROM directorChats
              WHERE projectId = ${input.projectId} AND content LIKE ${tag}
              ORDER BY updatedAt DESC LIMIT 200`
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => {
          const m = /^\[ShotVersions@(\d+)\]\s*\n?([\s\S]*)$/.exec(r.content || "");
          if (!m) return null;
          try { return { sceneId: Number(m[1]), versions: JSON.parse(m[2]), updatedAt: r.updatedAt }; }
          catch { return null; }
        }).filter((x: any) => x !== null) as any[];
      }),
    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        sceneId: z.number(),
        versions: z.array(z.object({
          label: z.string().max(64),
          url: z.string().max(1000).optional(),
          model: z.string().max(64).optional(),
          prompt: z.string().max(4000).optional(),
          notes: z.string().max(1000).optional(),
          isFinal: z.boolean().optional(),
          createdAt: z.string().optional(),
        })).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const likeTag = `[ShotVersions@${input.sceneId}]%`;
        await dbConn.execute(
          sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${likeTag}`
        );
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: `[ShotVersions@${input.sceneId}]\n${JSON.stringify(input.versions)}`,
        });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Studio: Style Bible (project visual identity) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  styleBible: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const rows: any = await dbConn.execute(
          sql`SELECT content, updatedAt FROM directorChats
              WHERE projectId = ${input.projectId} AND content LIKE '[StyleBible]%'
              ORDER BY updatedAt DESC LIMIT 1`
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        const row = arr?.[0];
        if (!row) return null;
        try {
          return { data: JSON.parse((row.content as string).replace(/^\[StyleBible\]\s*\n?/, "")), updatedAt: row.updatedAt };
        } catch { return null; }
      }),
    save: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        data: z.object({
          tone: z.string().max(2000).optional(),
          colorPalette: z.string().max(2000).optional(),
          lighting: z.string().max(2000).optional(),
          lensStyle: z.string().max(2000).optional(),
          era: z.string().max(2000).optional(),
          referenceUrls: z.array(z.string().max(500)).optional(),
          bannedTerms: z.string().max(2000).optional(),
          notes: z.string().max(4000).optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(
          sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[StyleBible]%'`
        );
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: `[StyleBible]\n${JSON.stringify(input.data)}`,
        });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Studio: Voice Clone Consent (AI talent likeness rights) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  voiceConsent: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows: any = await dbConn.execute(
          sql`SELECT content, updatedAt FROM directorChats
              WHERE projectId = ${input.projectId} AND content LIKE '[VoiceConsent@%'
              ORDER BY updatedAt DESC LIMIT 200`
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => {
          const m = /^\[VoiceConsent@([^\]]+)\]\s*\n?([\s\S]*)$/.exec(r.content || "");
          if (!m) return null;
          try { return { key: m[1], data: JSON.parse(m[2]), updatedAt: r.updatedAt }; }
          catch { return null; }
        }).filter((x: any) => x !== null) as any[];
      }),
    upsert: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        characterKey: z.string().max(120),
        data: z.object({
          signedBy: z.string().max(200),
          signedDate: z.string().max(40),
          allowedUses: z.string().max(2000),
          sampleUrl: z.string().max(1000).optional(),
          notes: z.string().max(2000).optional(),
          ipConfirmed: z.boolean(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const tag = `[VoiceConsent@${input.characterKey}]`;
        await dbConn.execute(
          sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${tag + "%"}`
        );
        await db.createChatMessage({
          projectId: input.projectId,
          userId: ctx.user.id,
          role: "user",
          content: `${tag}\n${JSON.stringify(input.data)}`,
        });
        return { success: true };
      }),
    remove: protectedProcedure
      .input(z.object({ projectId: z.number(), characterKey: z.string().max(120) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const tag = `[VoiceConsent@${input.characterKey}]%`;
        await dbConn.execute(
          sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${tag}`
        );
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Studio: C2PA-Compatible Provenance Manifest ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Generates a downloadable JSON manifest disclosing all AI-generated
  // assets for distribution platforms requiring AI content disclosure
  // (YouTube, Meta, TikTok, broadcast deliverables).
  provenance: router({
    export: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(input.projectId).catch(() => [] as any[]);
        const characters = await db.getProjectCharacters(input.projectId).catch(() => [] as any[]);
        const assertions: any[] = [];
        for (const c of (characters as any[])) {
          const url = c.referenceImageUrl || c.thumbnailUrl;
          if (url) {
            assertions.push({
              type: "character.image",
              characterId: c.id,
              name: c.name,
              url,
              generator: { type: "ai", model: "image-gen", description: "AI-generated character reference image" },
            });
          }
        }
        for (const s of (scenes as any[])) {
          if (s.imageUrl) {
            assertions.push({
              type: "scene.image",
              sceneId: s.id,
              title: s.title || s.name,
              url: s.imageUrl,
              generator: { type: "ai", model: "image-gen", description: "AI-generated scene image" },
            });
          }
          if (s.videoUrl) {
            assertions.push({
              type: "scene.video",
              sceneId: s.id,
              title: s.title || s.name,
              url: s.videoUrl,
              generator: { type: "ai", model: s.videoProvider || "video-gen", description: "AI-generated scene video" },
            });
          }
        }
        return {
          spec: "c2pa-1.3-compatible",
          generator: "Virelle Studios",
          generatedAt: new Date().toISOString(),
          project: {
            id: project.id,
            title: project.title,
            createdAt: project.createdAt,
          },
          aiDisclosure: {
            isAiGenerated: true,
            disclosureRequired: true,
            statement: "This work was created using generative AI tools orchestrated by Virelle Studios. Visual, audio, and narrative elements were synthesized by machine learning models. Human creative direction, editorial decisions and final approval were performed by the credited filmmakers.",
            standards: ["C2PA 1.3", "FTC AI Disclosure", "EU AI Act Art. 50"],
          },
          assertions,
          assertionCount: assertions.length,
        };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Studio: Render History & Cost Dashboard ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Pulls from the existing credit_transactions ledger so producers
  // can see every AI generation, its cost, and 30-day burn rate.
  renderHistory: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(100) }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows: any = await dbConn.execute(
          sql`SELECT id, amount, action, description, balanceAfter, createdAt
              FROM credit_transactions
              WHERE userId = ${ctx.user.id}
              ORDER BY createdAt DESC
              LIMIT ${input.limit}`
        );
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          action: r.action,
          description: r.description,
          balanceAfter: Number(r.balanceAfter),
          createdAt: r.createdAt,
        }));
      }),
    summary: protectedProcedure
      .query(async ({ ctx }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { totalSpent: 0, byAction: [], last30Days: 0 };
        const all: any = await dbConn.execute(
          sql`SELECT action, SUM(ABS(amount)) as total, COUNT(*) as count
              FROM credit_transactions
              WHERE userId = ${ctx.user.id} AND amount < 0
              GROUP BY action
              ORDER BY total DESC LIMIT 30`
        );
        const last30: any = await dbConn.execute(
          sql`SELECT COALESCE(SUM(ABS(amount)), 0) as total
              FROM credit_transactions
              WHERE userId = ${ctx.user.id} AND amount < 0
                AND createdAt >= NOW() - INTERVAL '30 days'`
        );
        const allArr = (Array.isArray(all[0]) ? all[0] : all) as any[];
        const lastArr = (Array.isArray(last30[0]) ? last30[0] : last30) as any[];
        const totalSpent = allArr.reduce((sum: number, r: any) => sum + Number(r.total || 0), 0);
        return {
          totalSpent,
          byAction: allArr.map((r: any) => ({ action: r.action, total: Number(r.total), count: Number(r.count) })),
          last30Days: Number(lastArr[0]?.total || 0),
        };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Frame Comments (Frame.io-style review) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  frameComments: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const tag = input.sceneId != null ? `[FrameComments@${input.sceneId}]%` : `[FrameComments@%`;
        const rows: any = await dbConn.execute(sql`SELECT id, content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${tag} ORDER BY updatedAt DESC LIMIT 500`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => { const m = /^\[FrameComments@(\d+)\]\s*\n?([\s\S]*)$/.exec(r.content || ""); if (!m) return null; try { return { sceneId: Number(m[1]), comments: JSON.parse(m[2]), updatedAt: r.updatedAt }; } catch { return null; } }).filter((x: any) => x !== null) as any[];
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), comments: z.array(z.object({ id: z.string(), author: z.string().max(120), role: z.string().max(40), timecode: z.string().max(20).optional(), text: z.string().max(2000), status: z.enum(["open","resolved","approved"]), createdAt: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${`[FrameComments@${input.sceneId}]%`}`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[FrameComments@${input.sceneId}]\n${JSON.stringify(input.comments)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Color Pipeline (CDL + LUT + ACES) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  colorPipeline: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[ColorPipeline@%' ORDER BY updatedAt DESC LIMIT 500`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => { const m = /^\[ColorPipeline@(\d+)\]\s*\n?([\s\S]*)$/.exec(r.content || ""); if (!m) return null; try { return { sceneId: Number(m[1]), data: JSON.parse(m[2]), updatedAt: r.updatedAt }; } catch { return null; } }).filter((x: any) => x !== null) as any[];
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), data: z.object({ slope: z.tuple([z.number(),z.number(),z.number()]), offset: z.tuple([z.number(),z.number(),z.number()]), power: z.tuple([z.number(),z.number(),z.number()]), saturation: z.number(), lutName: z.string().max(120).optional(), lutUrl: z.string().max(1000).optional(), colorSpace: z.string().max(40), gamma: z.string().max(40).optional() }) }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${`[ColorPipeline@${input.sceneId}]%`}`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[ColorPipeline@${input.sceneId}]\n${JSON.stringify(input.data)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Asset Versions (script/schedule/budget/EDL snapshots) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  assetVersions: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AssetVersions]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        const row = arr?.[0]; if (!row) return [];
        try { return JSON.parse((row.content as string).replace(/^\[AssetVersions\]\s*\n?/, "")); } catch { return []; }
      }),
    snapshot: protectedProcedure
      .input(z.object({ projectId: z.number(), assetType: z.enum(["script","schedule","budget","edl","audio_stems","color_grade"]), label: z.string().max(120), notes: z.string().max(2000).optional(), payloadUrl: z.string().max(1000).optional(), checksum: z.string().max(120).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const existing: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AssetVersions]%' ORDER BY updatedAt DESC LIMIT 1`);
        const exArr = (Array.isArray(existing[0]) ? existing[0] : existing) as any[];
        let versions: any[] = [];
        if (exArr?.[0]) { try { versions = JSON.parse((exArr[0].content as string).replace(/^\[AssetVersions\]\s*\n?/, "")); } catch {} }
        versions.unshift({ id: `v${Date.now()}`, assetType: input.assetType, label: input.label, notes: input.notes, payloadUrl: input.payloadUrl, checksum: input.checksum, author: (ctx.user as any).email || String(ctx.user.id), createdAt: new Date().toISOString() });
        if (versions.length > 200) versions = versions.slice(0, 200);
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AssetVersions]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[AssetVersions]\n${JSON.stringify(versions)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Render Queue (priorities + cost caps) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  renderQueue: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return { jobs: [], cap: null };
        const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[RenderQueue]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        if (!arr?.[0]) return { jobs: [], cap: null };
        try { return JSON.parse((arr[0].content as string).replace(/^\[RenderQueue\]\s*\n?/, "")); } catch { return { jobs: [], cap: null }; }
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), data: z.object({ cap: z.object({ dailyCredits: z.number().nullable(), perJobCredits: z.number().nullable(), pauseOnExceed: z.boolean() }).nullable(), jobs: z.array(z.object({ id: z.string(), label: z.string().max(200), sceneId: z.number().nullable(), priority: z.enum(["low","normal","high","urgent"]), model: z.string().max(64), estimatedCredits: z.number(), maxRetries: z.number().min(0).max(5), scheduledAt: z.string().nullable(), status: z.enum(["queued","running","done","failed","paused","skipped"]), notes: z.string().max(1000).optional() })) }) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[RenderQueue]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[RenderQueue]\n${JSON.stringify(input.data)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Deliverable Packager ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  deliverables: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Deliverables]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        if (!arr?.[0]) return [];
        try { return JSON.parse((arr[0].content as string).replace(/^\[Deliverables\]\s*\n?/, "")); } catch { return []; }
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), specs: z.array(z.object({ id: z.string(), profile: z.enum(["prores4444","dcp_2k","dcp_4k","imf","broadcast_safe","youtube_4k","tiktok_vertical","instagram_square","ig_reel","x_landscape","prores_proxy"]), label: z.string().max(120), aspectRatio: z.string().max(20), frameRate: z.number(), audioMix: z.enum(["stereo","5.1","7.1","atmos"]), captions: z.boolean(), hdrPass: z.enum(["sdr","hdr10","dolby_vision"]).optional(), targetUrl: z.string().max(1000).optional(), status: z.enum(["pending","building","ready","failed"]), createdAt: z.string() })) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Deliverables]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[Deliverables]\n${JSON.stringify(input.specs)}` });
        return { success: true };
      }),
    manifest: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const dbConn = await db.getDb();
        let specs: any[] = [];
        if (dbConn) {
          const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Deliverables]%' ORDER BY updatedAt DESC LIMIT 1`);
          const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
          if (arr?.[0]) { try { specs = JSON.parse((arr[0].content as string).replace(/^\[Deliverables\]\s*\n?/, "")); } catch {} }
        }
        return { generatedAt: new Date().toISOString(), project: { id: project.id, title: project.title }, deliverables: specs, totalCount: specs.length, readyCount: specs.filter((s: any) => s.status === "ready").length };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Clearances (music/location/talent/AI rider) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  clearances: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Clearances]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        if (!arr?.[0]) return [];
        try { return JSON.parse((arr[0].content as string).replace(/^\[Clearances\]\s*\n?/, "")); } catch { return []; }
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), records: z.array(z.object({ id: z.string(), kind: z.enum(["music_sync","master_use","location_release","talent_release","ai_rider_sag","stock_footage","trademark"]), title: z.string().max(200), counterparty: z.string().max(200), status: z.enum(["needed","requested","negotiating","signed","denied","not_required"]), territory: z.string().max(120).optional(), term: z.string().max(120).optional(), feeUsd: z.number().optional(), notes: z.string().max(2000).optional(), documentUrl: z.string().max(1000).optional(), expiresAt: z.string().optional() })) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Clearances]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[Clearances]\n${JSON.stringify(input.records)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Distribution Targets ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  distributionTargets: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[DistributionTargets]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        if (!arr?.[0]) return [];
        try { return JSON.parse((arr[0].content as string).replace(/^\[DistributionTargets\]\s*\n?/, "")); } catch { return []; }
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), targets: z.array(z.object({ id: z.string(), platform: z.enum(["filmfreeway","vimeo_ott","prime_video_direct","youtube","tiktok","meta","x_video","tubi","plex","custom"]), label: z.string().max(200), accountHandle: z.string().max(120).optional(), status: z.enum(["draft","scheduled","submitted","live","rejected"]), submittedAt: z.string().optional(), liveUrl: z.string().max(1000).optional(), notes: z.string().max(2000).optional() })) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[DistributionTargets]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[DistributionTargets]\n${JSON.stringify(input.targets)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Audit Log (SOC2-grade activity trail) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  auditLog: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), limit: z.number().min(1).max(1000).default(200) }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AuditLog]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        if (!arr?.[0]) return [];
        try { const events = JSON.parse((arr[0].content as string).replace(/^\[AuditLog\]\s*\n?/, "")); return events.slice(0, input.limit); } catch { return []; }
      }),
    append: protectedProcedure
      .input(z.object({ projectId: z.number(), event: z.object({ action: z.string().max(120), targetType: z.string().max(60).optional(), targetId: z.string().max(120).optional(), summary: z.string().max(500), metadata: z.record(z.string(), z.any()).optional() }) }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const existing: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AuditLog]%' ORDER BY updatedAt DESC LIMIT 1`);
        const exArr = (Array.isArray(existing[0]) ? existing[0] : existing) as any[];
        let events: any[] = [];
        if (exArr?.[0]) { try { events = JSON.parse((exArr[0].content as string).replace(/^\[AuditLog\]\s*\n?/, "")); } catch {} }
        events.unshift({ id: `e${Date.now()}_${Math.random().toString(36).slice(2,8)}`, ...input.event, actorId: ctx.user.id, actorEmail: (ctx.user as any).email || null, at: new Date().toISOString() });
        if (events.length > 1000) events = events.slice(0, 1000);
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[AuditLog]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[AuditLog]\n${JSON.stringify(events)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Proxy Chain (1/4 res proxies ÃÂ¢ÃÂÃÂ master conform) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  proxyChain: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[ProxyChain@%' ORDER BY updatedAt DESC LIMIT 500`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => { const m = /^\[ProxyChain@(\d+)\]\s*\n?([\s\S]*)$/.exec(r.content || ""); if (!m) return null; try { return { sceneId: Number(m[1]), data: JSON.parse(m[2]), updatedAt: r.updatedAt }; } catch { return null; } }).filter((x: any) => x !== null) as any[];
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), data: z.object({ proxyUrl: z.string().max(1000).optional(), proxyResolution: z.string().max(20).optional(), proxyStatus: z.enum(["pending","ready","failed"]), masterUrl: z.string().max(1000).optional(), masterResolution: z.string().max(20).optional(), masterStatus: z.enum(["pending","ready","failed"]), notes: z.string().max(1000).optional() }) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${`[ProxyChain@${input.sceneId}]%`}`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[ProxyChain@${input.sceneId}]\n${JSON.stringify(input.data)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Timeline Cuts (in/out trim + transitions per scene) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  timelineCuts: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const rows: any = await dbConn.execute(sql`SELECT content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[TimelineCuts@%' ORDER BY updatedAt DESC LIMIT 500`);
        const arr = (Array.isArray(rows[0]) ? rows[0] : rows) as any[];
        return arr.map((r: any) => { const m = /^\[TimelineCuts@(\d+)\]\s*\n?([\s\S]*)$/.exec(r.content || ""); if (!m) return null; try { return { sceneId: Number(m[1]), data: JSON.parse(m[2]), updatedAt: r.updatedAt }; } catch { return null; } }).filter((x: any) => x !== null) as any[];
      }),
    save: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), data: z.object({ trimInSec: z.number().min(0), trimOutSec: z.number().min(0), transitionIn: z.enum(["cut","fade","dissolve","wipe","jcut","lcut"]), transitionInDurationSec: z.number().min(0).max(10), transitionOut: z.enum(["cut","fade","dissolve","wipe","jcut","lcut"]), transitionOutDurationSec: z.number().min(0).max(10), audioFadeInSec: z.number().min(0).max(10), audioFadeOutSec: z.number().min(0).max(10), notes: z.string().max(1000).optional() }) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${`[TimelineCuts@${input.sceneId}]%`}`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[TimelineCuts@${input.sceneId}]\n${JSON.stringify(input.data)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Budget Estimator ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  budget: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.getProjectBudgets(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const budget = await db.getBudgetById(input.id);
        if (budget) await assertCanAccessProject(budget.projectId, ctx.user.id);
        return budget;
      }),

    /**
     * Studio-grade hot-cost tracking: set the actual spend for one
     * budget category so producers can compare estimate vs actual,
     * surface variance, and flag over-budget categories ("hot costs")
     * before they snowball.
     *
     * Stores `actual` per category inside the existing breakdown JSON
     * so no schema migration is needed.
     */
    setActuals: protectedProcedure
      .input(z.object({
        budgetId: z.number(),
        category: z.string(),
        actual: z.number().min(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const budget = await db.getBudgetById(input.budgetId);
        if (!budget) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
        await assertOwnsProject((budget as any).projectId, ctx.user.id);
        const breakdown: any = (budget as any).breakdown || {};
        if (!breakdown[input.category]) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown category: ${input.category}` });
        }
        breakdown[input.category].actual = input.actual;
        // Recompute aggregate actuals
        const totalActual = Object.values(breakdown).reduce(
          (sum: number, c: any) => sum + (typeof c?.actual === "number" ? c.actual : 0),
          0,
        );
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        await dbConn.execute(
          sql`UPDATE budgets SET breakdown = ${JSON.stringify(breakdown)} WHERE id = ${input.budgetId}`,
        );
        return { success: true, totalActual };
      }),

    generate: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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
          // Refund credits ÃÂ¢ÃÂÃÂ LLM call failed before generating any content
          try { await db.addCredits(ctx.user.id, _llmRefundAmount_budget_estimate_ai, "budget_estimate_ai_refund", "Refund: AI call failed ÃÂ¢ÃÂÃÂ credits returned"); } catch {}
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Sound Effects Library ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  soundEffect: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listSoundEffectsByProject(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (scene) await assertCanAccessProject(scene.projectId, ctx.user.id);
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
        await assertCanAccessProject(input.projectId, ctx.user!.id);
        return db.createSoundEffect({ ...input, userId: ctx.user!.id });
      }),
    upload: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string().max(255),
        fileData: z.string().max(70_000_000, "File too large. Max 50MB."), // base64
        contentType: z.enum(["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/x-m4a", "audio/aac", "audio/flac"]),
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
        const sfxRecord = await db.getSoundEffectById(input.id);
        if (!sfxRecord || sfxRecord.userId !== ctx.user!.id) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        const { id, ...data } = input;
        return db.updateSoundEffect(id, data as any);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const sfxRecord = await db.getSoundEffectById(input.id);
        if (!sfxRecord || sfxRecord.userId !== ctx.user!.id) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
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
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        const RACHEL_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel ÃÂ¢ÃÂÃÂ clear, ethereal female
        const ARIA_VOICE_ID = "9BWtsMINqrJLrRacOk9x"; // Aria ÃÂ¢ÃÂÃÂ warm, expressive female

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
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Visual Effects (VFX) Database ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  visualEffect: router({
    listByProject: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listVisualEffectsByProject(input.projectId);
      }),
    listByScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const scene = await db.getSceneById(input.sceneId);
        if (scene) await assertCanAccessProject(scene.projectId, ctx.user.id);
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
        await assertCanAccessProject(input.projectId, ctx.user.id);
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
        const vfx = await db.getVisualEffectById(input.id);
        if (!vfx || vfx.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        requireFeature(ctx.user, "canUseVisualEffects", "VFX Scene Studio");
        const { id, ...data } = input;
        return db.updateVisualEffect(id, data);
      }),
    delete: creationProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const vfx = await db.getVisualEffectById(input.id);
        if (!vfx || vfx.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Opening Sequence Studio ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // Stores opening sequence data (title cards, crawl, narrator V.O.) as tagged
    // JSON in directorChats ÃÂ¢ÃÂÃÂ uses the established pattern, no DB migration needed.
    openingSequence: router({
      get: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          await assertCanAccessProject(input.projectId, ctx.user.id);
          const dbConn = await db.getDb();
          if (!dbConn) return null;
          const rows: any = await dbConn.execute(
            sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[OpeningSequence]%' ORDER BY updatedAt DESC LIMIT 1`
          );
          const row = rows?.[0]?.[0] ?? rows?.[0];
          if (!row?.content) return null;
          try { return JSON.parse((row.content as string).replace('[OpeningSequence]', '').trim()); } catch { return null; }
        }),
      save: creationProcedure
        .input(z.object({ projectId: z.number(), data: z.any() }))
        .mutation(async ({ ctx, input }) => {
          await assertCanAccessProject(input.projectId, ctx.user.id);
          const dbConn = await db.getDb();
          if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
          const content = '[OpeningSequence]' + JSON.stringify(input.data);
          await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[OpeningSequence]%'`);
          await dbConn.execute(sql`INSERT INTO directorChats (projectId, userId, role, content) VALUES (${input.projectId}, ${ctx.user.id}, 'system', ${content})`);
          return { success: true };
        }),
    }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Project Collaboration ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  collaboration: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listCollaboratorsByProject(input.projectId);
      }),
    invite: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        email: z.string().email().optional(),
        role: z.enum(["viewer", "editor", "producer", "director"]).default("editor"),
        origin: z.string().optional(),
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
        // Send invite email if an email address was provided
        if (input.email) {
          try {
            const project = await db.getProjectById(input.projectId, ctx.user!.id);
            const origin = input.origin || "https://www.virelle.life";
            const inviteUrl = `${origin}/collaboration?token=${token}`;
            const inviterName = ctx.user!.name || ctx.user!.email || "A collaborator";
            const projectTitle = project?.title || "Untitled Project";
            const { sendCollaborationInviteEmail } = await import("./email");
            await sendCollaborationInviteEmail(input.email, inviterName, projectTitle, input.role, inviteUrl);
          } catch (emailErr) {
            logger.errorWithStack("Failed to send collaboration invite email:", emailErr);
            // Non-fatal ÃÂ¢ÃÂÃÂ invite was created, email failure shouldn't block the response
          }
        }
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
        const collab = await db.getCollaboratorById(input.id);
        if (!collab) throw new TRPCError({ code: "NOT_FOUND", message: "Collaborator not found" });
        if (collab.invitedBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised" });
        return db.updateCollaborator(input.id, { role: input.role });
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const collab = await db.getCollaboratorById(input.id);
        if (!collab) throw new TRPCError({ code: "NOT_FOUND", message: "Collaborator not found" });
        if (collab.invitedBy !== ctx.user.id && collab.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorised" });
        }
        await db.deleteCollaborator(input.id);
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ My Movies ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
        // Ownership: verify project belongs to caller before spending credits
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        // Credits: deduct for export
        const exportCost = input.exportType === "film" ? CREDIT_COSTS.export_final_film.cost : CREDIT_COSTS.movie_export.cost;
        try { await db.deductCredits(ctx.user.id, exportCost, input.exportType === "film" ? "export_final_film" : "movie_export", `Export ${input.exportType} for project ${input.projectId}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
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
            logger.errorWithStack("[Export] Failed to fetch opener scenes:", err);
          }

          let fileUrl: string | undefined;
          let fileKey: string | undefined;
          let fileSize: number | undefined;
          // Calculate total duration from actual scene durations, not project.duration (which is user-entered estimate in minutes)
          let totalDuration = scenesWithVideo.reduce((sum: number, s: any) => sum + (s.duration || 60), 0);
          let mimeType: string | undefined;

          // Fetch all post-production data from database (needed regardless of scene count)
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
          let subtitleEntries: any[] = [];
          if (projectSubtitles.length > 0) {
            const primarySub = projectSubtitles[0];
            const entries = (primarySub.entries as any[]) || [];
            subtitleEntries.push(...entries);
          }

          // Auto-generate subtitle entries from scene dialogueText when project.subtitlesEnabled is on
          // and no existing subtitle track is present (avoids double-burning)
          if ((project as any).subtitlesEnabled && subtitleEntries.length === 0) {
            for (const scene of scenesWithVideo) {
              const text: string = (scene as any).dialogueText || (scene as any).subtitleText || "";
              if (!text.trim()) continue;
              // Split into ~12-word chunks, each ~4 seconds
              const words = text.trim().split(/\s+/);
              const chunkSize = 12;
              let cursor = 0;
              for (let wi = 0; wi < words.length; wi += chunkSize) {
                const chunk = words.slice(wi, wi + chunkSize).join(" ");
                subtitleEntries.push({
                  sceneId: (scene as any).id,
                  text: chunk,
                  startTime: cursor,
                  endTime: cursor + 4,
                });
                cursor += 4;
              }
            }
          }

          const sceneSubMap = new Map<number, any[]>();
          for (const entry of subtitleEntries) {
            const sid = entry.sceneId;
            if (sid) {
              if (!sceneSubMap.has(sid)) sceneSubMap.set(sid, []);
              sceneSubMap.get(sid)!.push(entry);
            }
          }

          // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Auslan signing interpreter overlay ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
          // If the project has auslanEnabled, generate a D-ID avatar video for
          // each scene that has dialogue text and map it by scene ID.
          const auslanAvatarMap = new Map<number, string>();
          if ((project as any).auslanEnabled) {
            const userKeys = await db.getUserApiKeys(ctx.user.id);
            if (userKeys.didKey) {
              const { generateAuslanAvatar } = await import("./_core/auslanEngine");
              // Generate all avatar renders in parallel ÃÂ¢ÃÂÃÂ D-ID renders take 30-60s each;
              // sequential awaiting across many scenes would blow past the export timeout.
              const scenesWithDialogue = scenesWithVideo.filter((s: any) => {
                const text = (s.dialogueText || s.subtitleText || "").trim();
                return text.length > 0;
              });
              logger.info(`[Export] Generating ${scenesWithDialogue.length} Auslan avatar(s) in parallel...`);
              const avatarResults = await Promise.allSettled(
                scenesWithDialogue.map(async (scene: any) => {
                  const dialogueText = (scene.dialogueText || scene.subtitleText || "").trim();
                  const avatar = await generateAuslanAvatar({
                    dialogueText,
                    apiKey: userKeys.didKey!,
                  });
                  return { sceneId: scene.id as number, videoUrl: avatar.videoUrl };
                }),
              );
              for (const result of avatarResults) {
                if (result.status === "fulfilled") {
                  auslanAvatarMap.set(result.value.sceneId, result.value.videoUrl);
                } else {
                  logger.warn(`[Export] An Auslan avatar generation failed: ${String(result.reason?.message ?? result.reason)}`);
                }
              }
            } else {
              logger.warn("[Export] Auslan overlay enabled but no D-ID API key set ÃÂ¢ÃÂÃÂ skipping avatar generation");
            }
          }

          // Find the main soundtrack
          const mainSoundtrack = projectSoundtracks.find((s: any) => s.fileUrl);

          // Always stitch (even single scene) so the VirElle opener is ALWAYS prepended.
          if (scenesWithVideo.length >= 1) {
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
                  auslanVideoUrl: auslanAvatarMap.get(s.id) || undefined,
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
                auslanEnabled: !!(project as any).auslanEnabled && auslanAvatarMap.size > 0,
                auslanPosition: (project as any).auslanPosition || "bottom-right",
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
              logger.error(`[Export] Video stitching failed: ${err.message}`);
              // Hard fail ÃÂ¢ÃÂÃÂ never save a full film without the Virelle Studios opener.
              throw new Error(`Film compilation failed: ${err.message}. Please try again.`);
            }
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
            logger.errorWithStack("[Export] Failed to fetch opener scenes:", err);
          }

          let fileUrl: string | undefined;
          let fileKey: string | undefined;
          let fileSize: number | undefined;
          let totalDuration: number | undefined;
          let mimeType: string | undefined;

          // Always stitch (even single scene) so the VirElle opener is ALWAYS prepended.
          if (scenesWithVideo.length >= 1) {
            try {
              const { stitchMovie } = await import("./_core/videoStitcher");

              const userScenes = scenesWithVideo.map((s: any) => ({
                videoUrl: s.videoUrl,
                title: s.title || undefined,
                duration: s.duration || undefined,
                orderIndex: s.orderIndex || 0,
              }));

              const allScenes = [...openerScenes, ...userScenes];

              const result = await stitchMovie({
                scenes: allScenes,
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
              logger.error(`[Export] Trailer stitching failed: ${err.message}`);
              // Hard fail ÃÂ¢ÃÂÃÂ never save a trailer without the Virelle Studios opener.
              throw new Error(`Trailer compilation failed: ${err.message}. Please try again.`);
            }
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
        contentType: z.enum(["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm"]).default("video/mp4"),
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
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
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

      // Delete every generated video EXCEPT the Virelle Studios opener.
      // Opener identified by title matching /virelle|opener|opening|intro/i.
      deleteAllExceptOpener: protectedProcedure
        .mutation(async ({ ctx }) => {
          const movies = await db.getUserMovies(ctx.user.id);
          const openers = (movies as any[]).filter(m => /virelle|opener|opening|intro/i.test(m.title || ""));
          const toDelete = (movies as any[]).filter(m => !/virelle|opener|opening|intro/i.test(m.title || ""));
          await Promise.allSettled(toDelete.map(m => db.deleteMovie(m.id, ctx.user.id)));
          logger.info(`[Movies] User ${ctx.user.id} bulk-deleted ${toDelete.length} videos, kept ${openers.length}`);
          return { deleted: toDelete.length, kept: openers.length, keptTitles: openers.map((m: any) => m.title) };
        }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Real NLE Export ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    exportNLE: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        format: z.enum(["fcpxml", "edl", "csv", "premiere_xml", "resolve_xml"]),
        // v6.62 ÃÂ¢ÃÂÃÂ aspect ratio preset; embeds matching frame dimensions in the
        // sequence header (FCPXML / Premiere XML) and adds a metadata note for
        // EDL/CSV. Defaults to project.exportAspectRatio if omitted.
        aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5", "21:9", "2.39:1"]).optional(),
        includeOptions: z.object({
          videoClips: z.boolean().default(true),
          audioTracks: z.boolean().default(true),
          subtitles: z.boolean().default(false),
          markers: z.boolean().default(false),
          colorMetadata: z.boolean().default(false),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireFeature(ctx.user, "canUseNLEExport", "NLE Export");
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(input.projectId);
        const completedScenes = scenes.filter((s: any) => s.videoUrl && s.status === "completed");
        if (completedScenes.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No completed scenes to export. Generate video for at least one scene first." });

        const fps = 24;
        // v6.62 ÃÂ¢ÃÂÃÂ Resolve aspect ratio: explicit param ÃÂ¢ÃÂÃÂ project sticky ÃÂ¢ÃÂÃÂ 16:9 default.
        // Persist back to the project so the next export remembers the user's choice.
        const aspectRatio = input.aspectRatio || ((project as any).exportAspectRatio as string) || "16:9";
        const ASPECT_DIMS: Record<string, { width: number; height: number; label: string; formatName: string }> = {
          "16:9":   { width: 1920, height: 1080, label: "16:9 Widescreen",      formatName: "FFVideoFormat1080p24" },
          "9:16":   { width: 1080, height: 1920, label: "9:16 Vertical",        formatName: "FFVideoFormat1080p24Vertical" },
          "1:1":    { width: 1080, height: 1080, label: "1:1 Square",           formatName: "FFVideoFormat1080p24Square" },
          "4:5":    { width: 1080, height: 1350, label: "4:5 Portrait",         formatName: "FFVideoFormat1080p24Portrait" },
          "21:9":   { width: 2560, height: 1080, label: "21:9 Ultrawide",       formatName: "FFVideoFormat1080p24Ultrawide" },
          "2.39:1": { width: 2048, height: 858,  label: "2.39:1 Anamorphic",    formatName: "FFVideoFormat1080p24Cinema" },
        };
        const dims = ASPECT_DIMS[aspectRatio] || ASPECT_DIMS["16:9"];
        if (input.aspectRatio && input.aspectRatio !== ((project as any).exportAspectRatio as string)) {
          try { await db.updateProject(input.projectId, ctx.user.id, { exportAspectRatio: input.aspectRatio } as any); } catch { /* sticky-write best effort */ }
        }
        const opts = input.includeOptions ?? { videoClips: true, audioTracks: true, subtitles: false, markers: false, colorMetadata: false };
        let content = "";
        let mimeType = "text/plain";
        // Suffix filename with aspect for clarity when exporting multiple cuts.
        const aspectSuffix = aspectRatio.replace(":", "x").replace(".", "_");
        let filename = `${project.title.replace(/[^a-zA-Z0-9]/g, "_")}_${aspectSuffix}`;

        if (input.format === "fcpxml" || input.format === "resolve_xml") {
          let offset = 0;
          const assetDefs = completedScenes.map((scene: any, i: number) => {
            const durationFrames = Math.round((scene.duration ?? 60) * fps);
            const src = (scene.videoUrl ?? "").replace(/&/g, "&amp;");
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            return `  <asset id="r${i + 2}" name="${title}" uid="${nanoid(16)}" src="${src}" start="0s" duration="${durationFrames}/${fps}s" hasVideo="1" hasAudio="1" />`;
          }).join("\n");
          const clipElements = completedScenes.map((scene: any, i: number) => {
            const durationFrames = Math.round((scene.duration ?? 60) * fps);
            const offsetFrames = offset;
            offset += durationFrames;
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            return `        <asset-clip name="${title}" offset="${offsetFrames}/${fps}s" duration="${durationFrames}/${fps}s" start="0s" tcFormat="NDF">
          <video ref="r${i + 2}" offset="0s" duration="${durationFrames}/${fps}s" />
          ${opts.audioTracks ? `<audio ref="r${i + 2}" offset="0s" duration="${durationFrames}/${fps}s" role="dialogue" />` : ""}
          ${opts.markers ? `<marker start="0s" duration="1/${fps}s" value="Scene ${i + 1}" />` : ""}
        </asset-clip>`;
          }).join("\n");
          const totalFrames = completedScenes.reduce((acc: number, s: any) => acc + Math.round((s.duration ?? 60) * fps), 0);
          const projTitle = project.title.replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
          content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE fcpxml>\n<fcpxml version="1.10">\n  <!-- Virelle Studios export ÃÂ¢ÃÂÃÂ aspect ${aspectRatio} (${dims.label}), ${dims.width}x${dims.height} -->\n  <resources>\n    <format id="r1" name="${dims.formatName}" frameDuration="1/${fps}s" width="${dims.width}" height="${dims.height}" colorSpace="1-1-1 (Rec. 709)" />\n${assetDefs}\n  </resources>\n  <library>\n    <event name="${projTitle}">\n      <project name="${projTitle} ÃÂ¢ÃÂÃÂ Virelle Export (${aspectRatio})">\n        <sequence format="r1" duration="${totalFrames}/${fps}s" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">\n          <spine>\n${clipElements}\n          </spine>\n        </sequence>\n      </project>\n    </event>\n  </library>\n</fcpxml>`;
          mimeType = "application/xml";
          filename += ".fcpxml";

        } else if (input.format === "edl") {
          const toTC = (frames: number) => { const f=frames%fps,s=Math.floor(frames/fps)%60,m=Math.floor(frames/(fps*60))%60,h=Math.floor(frames/(fps*3600)); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}:${String(f).padStart(2,"0")}`; };
          const lines = [`TITLE: ${project.title}`, "FCM: NON-DROP FRAME", `* ASPECT: ${aspectRatio} (${dims.width}x${dims.height} ÃÂ¢ÃÂÃÂ ${dims.label})`, ""];
          let editNum = 1; let recIn = 0;
          completedScenes.forEach((scene: any, i: number) => {
            const df = Math.round((scene.duration ?? 60) * fps);
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
            const df = Math.round((scene.duration ?? 60) * fps);
            const start = offset; const end = offset + df; offset = end;
            const title = (scene.title ?? `Scene ${i + 1}`).replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
            const src = (scene.videoUrl ?? "").replace(/&/g, "&amp;");
            return `        <clipitem id="clipitem-${i+1}"><name>${title}</name><duration>${df}</duration><rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate><start>${start}</start><end>${end}</end><in>0</in><out>${df}</out><file id="file-${i+1}"><name>${title}</name><pathurl>${src}</pathurl><rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate><duration>${df}</duration></file></clipitem>`;
          }).join("\n");
          const totalFrames = completedScenes.reduce((acc: number, s: any) => acc + Math.round((s.duration ?? 60) * fps), 0);
          const projTitle = project.title.replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c] ?? c));
          content = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4">\n  <!-- Virelle Studios export ÃÂ¢ÃÂÃÂ aspect ${aspectRatio} (${dims.label}), ${dims.width}x${dims.height} -->\n  <sequence>\n    <name>${projTitle}</name>\n    <duration>${totalFrames}</duration>\n    <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>\n    <media>\n      <video>\n        <format><samplecharacteristics><width>${dims.width}</width><height>${dims.height}</height><pixelaspectratio>square</pixelaspectratio><rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate></samplecharacteristics></format>\n        <track>\n${clipItems}\n        </track>\n      </video>\n    </media>\n  </sequence>\n</xmeml>`;
          mimeType = "application/xml";
          filename += "_premiere.xml";

        } else {
          // CSV
          const rows = [["Scene #","Title","Duration (s)","Video URL","Mood","Time of Day","Location","Status","Aspect","Width","Height"]];
          completedScenes.forEach((scene: any, i: number) => {
            rows.push([String(i+1), scene.title??`Scene ${i+1}`, String(scene.duration??60), scene.videoUrl??"", scene.mood??"", scene.timeOfDay??"", scene.location??"", scene.status??"completed", aspectRatio, String(dims.width), String(dims.height)]);
          });
          // Lead with a Virelle metadata header line that's compatible with most spreadsheet importers
          const header = `# Virelle Studios export ÃÂ¢ÃÂÃÂ ${project.title} ÃÂ¢ÃÂÃÂ Aspect ${aspectRatio} (${dims.label}, ${dims.width}x${dims.height})`;
          content = header + "\n" + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
          mimeType = "text/csv";
          filename += "_scenes.csv";
        }

        const base64 = Buffer.from(content, "utf-8").toString("base64");
        return { filename, mimeType, base64, sceneCount: completedScenes.length };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Showcase / Demo ReelÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
    getRanked: publicProcedure
      .input(z.object({
        surface: z.enum(["featured", "trending", "new", "staff_picks", "all"]).default("all"),
        limit: z.number().min(1).max(50).default(24),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        // Build surface filter
        let surfaceFilter = "";
        if (input.surface === "featured") {
          surfaceFilter = `AND EXISTS (SELECT 1 FROM adminCurationFlags acf WHERE acf.entityType = 'project' AND acf.entityId = f.projectId AND acf.flagType = 'featured')`;
        } else if (input.surface === "staff_picks") {
          surfaceFilter = `AND EXISTS (SELECT 1 FROM adminCurationFlags acf WHERE acf.entityType = 'project' AND acf.entityId = f.projectId AND acf.flagType = 'staff_pick')`;
        } else if (input.surface === "new") {
          surfaceFilter = `AND f.createdAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)`;
        } else if (input.surface === "trending") {
          surfaceFilter = `AND EXISTS (SELECT 1 FROM analyticsEvents ae WHERE ae.entityType = 'filmPage' AND ae.entityId = f.id AND ae.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY))`;
        }
        const rows = await dbConn.execute(
          sql`SELECT
              f.id, f.slug, f.title, f.description, f.thumbnailUrl, f.trailerUrl, f.isPublic,
              f.showCreatorName, f.showVirelleBranding, f.allowShowcase, f.createdAt,
              u.name as creatorName, u.avatarUrl as creatorAvatar,
              cp.slug as creatorSlug, cp.profileType as creatorType,
              COALESCE(views.cnt, 0) as viewCount,
              COALESCE(plays.cnt, 0) as playCount,
              COALESCE(shares.cnt, 0) as shareCount,
              (
                CASE WHEN EXISTS (SELECT 1 FROM adminCurationFlags acf WHERE acf.entityType = 'project' AND acf.entityId = f.projectId AND acf.flagType = 'featured') THEN 1000 ELSE 0 END +
                CASE WHEN EXISTS (SELECT 1 FROM adminCurationFlags acf WHERE acf.entityType = 'project' AND acf.entityId = f.projectId AND acf.flagType = 'staff_pick') THEN 500 ELSE 0 END +
                COALESCE(views.cnt, 0) * 1 +
                COALESCE(plays.cnt, 0) * 3 +
                COALESCE(shares.cnt, 0) * 5 +
                GREATEST(0, 100 - DATEDIFF(NOW(), f.createdAt) * 3)
              ) as rankScore
            FROM filmPages f
            LEFT JOIN users u ON f.userId = u.id
            LEFT JOIN creatorProfiles cp ON f.userId = cp.userId
            LEFT JOIN (
              SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'page_view' GROUP BY entityId
            ) views ON views.entityId = f.id
            LEFT JOIN (
              SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'video_play' GROUP BY entityId
            ) plays ON plays.entityId = f.id
            LEFT JOIN (
              SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'share_click' GROUP BY entityId
            ) shares ON shares.entityId = f.id
            WHERE f.isPublic = true AND f.allowShowcase = true
            AND NOT EXISTS (SELECT 1 FROM adminCurationFlags acf WHERE acf.entityType = 'project' AND acf.entityId = f.projectId AND acf.flagType IN ('hidden', 'banned'))
            ${sql.raw(surfaceFilter)}
            GROUP BY f.id
            ORDER BY rankScore DESC, f.createdAt DESC
            LIMIT ${input.limit} OFFSET ${input.offset}`
        );
        return Array.isArray(rows[0]) ? rows[0] : rows as any[];
      }),

    // Admin: set homepage hero (clears existing featured, sets new one)
    setHero: adminProcedure
      .input(z.object({ filmPageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const fpRows = await dbConn.execute(sql`SELECT projectId FROM filmPages WHERE id = ${input.filmPageId} LIMIT 1`);
        const fp = (Array.isArray(fpRows[0]) ? fpRows[0] : fpRows as any[])?.[0];
        if (!fp) throw new TRPCError({ code: "NOT_FOUND", message: "Film page not found" });
        // Remove all existing featured flags for this entity type
        await dbConn.execute(sql`DELETE FROM adminCurationFlags WHERE flagType = 'featured' AND entityType = 'project' AND entityId = ${fp.projectId}`);
        await dbConn.execute(
          sql`INSERT INTO adminCurationFlags (entityType, entityId, flagType, adminId) VALUES ('project', ${fp.projectId}, 'featured', ${ctx.user.id})`
        );
        return { success: true };
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
        await rateLimitAI(ctx.user.id);
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
          toolCalls: result.toolCalls,
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
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "video/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "text/plain"]),
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

    transcribeVoice: creationProcedure
      .input(z.object({
        projectId: z.number(),
        audioData: z.string().max(70_000_000, "File too large. Max 50MB."), // base64 encoded audio
        mimeType: z.enum(["audio/webm", "audio/mp4", "audio/wav", "audio/ogg", "audio/mpeg", "audio/aac"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseDirectorAssistant", "Director Assistant");
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

    voiceEditText: creationProcedure
      .input(z.object({
        currentText: z.string().min(1).max(10000),
        editCommand: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseDirectorAssistant", "Director Assistant");
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
- "Replace X with Y" or "Change X to Y" ÃÂ¢ÃÂÃÂ find and replace text
- "Delete/Remove [text or description]" ÃÂ¢ÃÂÃÂ remove specified text
- "Add/Append [text] at the end" ÃÂ¢ÃÂÃÂ add text to the end
- "Insert [text] before/after [reference]" ÃÂ¢ÃÂÃÂ insert at a specific position
- "Undo" or "Revert" ÃÂ¢ÃÂÃÂ cannot be handled, return the text unchanged
- "Clear all" or "Start over" ÃÂ¢ÃÂÃÂ return empty string
- "Make it more [adjective]" ÃÂ¢ÃÂÃÂ rewrite with that quality
- "Fix grammar" or "Fix spelling" ÃÂ¢ÃÂÃÂ correct errors
- "Make it shorter" or "Make it longer" ÃÂ¢ÃÂÃÂ adjust length
- "Read it back" ÃÂ¢ÃÂÃÂ return the text unchanged (the UI will handle display)

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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Director Instructions (custom AI persona rules) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    getInstructions: protectedProcedure
      .query(async ({ ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        return { instructions: user?.directorInstructions ?? "" };
      }),

    saveInstructions: protectedProcedure
      .input(z.object({ instructions: z.string().max(2000) }))
      .mutation(async ({ ctx, input }) => {
        await db.saveDirectorInstructions(ctx.user.id, input.instructions);
        return { success: true };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AI Voice Response (ElevenLabs ÃÂ¢ÃÂÃÂ OpenAI TTS fallback) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    speakResponse: creationProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseDirectorAssistant", "Director Assistant");
        // Deduct 1 credit for AI voice synthesis (same cost as a chat message)
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.virelle_chat.cost, "voice_speak", `AI voice synthesis: ${input.text.substring(0, 40)}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        // Get user's ElevenLabs API key
        const userKeys = await db.getUserApiKeys(ctx.user.id);
        const elevenlabsKey = userKeys.elevenlabsKey;

        // Archibald Titan voice: "Adam" ÃÂ¢ÃÂÃÂ deep, authoritative, cinematic male voice
        // ElevenLabs free library voice ID for Adam
        const ARCHIBALD_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam ÃÂ¢ÃÂÃÂ deep male
        const ARCHIBALD_VOICE_SETTINGS = {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
        };

        if (!elevenlabsKey) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "ElevenLabs API key required for voice generation. Add your key in Settings ÃÂ¢ÃÂÃÂ API Keys. Get a free key at elevenlabs.io.",
          });
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
            logger.error(`[speakResponse] ElevenLabs error ${resp.status}: ${errText}`);
            return { audioBase64: null, provider: "browser" as const };
          }

          const audioBuffer = Buffer.from(await resp.arrayBuffer());
          const audioBase64 = audioBuffer.toString("base64");
          return { audioBase64, provider: "elevenlabs" as const };
        } catch (err) {
          logger.errorWithStack("[speakResponse] ElevenLabs TTS failed:", err);
          return { audioBase64: null, provider: "browser" as const };
        }
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Poster / Ad Maker ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  poster: router({
    generateImage: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(2000),
        templateType: z.string().max(128),
        // v6.77 ÃÂ¢ÃÂÃÂ Optional projectId so the poster engine reads the same
        // brand allow/required/forbidden list the scenes use.
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        requireGenerationQuota(ctx.user);
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.ad_poster_gen.cost, "ad_poster_gen", `Ad/poster image generation`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }
        await db.incrementGenerationCount(ctx.user.id);
        const __posterBrands = await brandsForPrompt(input.projectId);
        const __posterBrandBlock = brandDirectiveBlock(__posterBrands);
        const result = await generateImage({
          prompt: __posterBrandBlock ? `${input.prompt}\n\n${__posterBrandBlock}` : input.prompt,
        });
        return { url: result.url || null };
      }),

    generateCopy: protectedProcedure
      .input(z.object({
        title: z.string().max(256),
        genre: z.string().max(128),
        description: z.string().max(2000),
        templateType: z.string().max(128),
        // v6.77 ÃÂ¢ÃÂÃÂ Brand-aware copy so taglines + credits never name a forbidden
        // brand and may reference required ones.
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
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

        const __posterCopyBrands = await brandsForPrompt(input.projectId);
        const __posterCopyBrandBlock = brandDirectiveBlock(__posterCopyBrands);

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional film marketing copywriter. Generate compelling marketing copy for a ${templateDesc}. Return valid JSON only.${__posterCopyBrandBlock ? " Honor the project BRAND POLICY supplied in the user message ÃÂ¢ÃÂÃÂ never name a forbidden brand in the title, tagline or credits." : ""}`,
            },
            {
              role: "user",
              content: `Generate marketing copy for a ${input.genre} film:\n\nTitle: ${input.title}\nGenre: ${input.genre}\nDescription: ${input.description}${__posterCopyBrandBlock ? `\n\n${__posterCopyBrandBlock}` : ""}\n\nReturn JSON with these fields:\n- title: the film title, possibly stylized (max 40 chars)\n- tagline: a compelling tagline (max 80 chars)\n- credits: a credits line like "Directed by X ÃÂ¢ÃÂÃÂ¢ Starring Y, Z" (max 120 chars)`,
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
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseAdPosterMaker", "Ad & Poster Maker");
        requireGenerationQuota(ctx.user);
        await db.incrementGenerationCount(ctx.user.id);
        // Deduct credits for video ad generation
        try { await db.deductCredits(ctx.user.id, CREDIT_COSTS.ad_poster_video_gen.cost, "ad_poster_video_gen", `Video ad for ${input.platform}`); } catch (e: any) { if (e.message?.includes("INSUFFICIENT_CREDITS")) throw new TRPCError({ code: "FORBIDDEN", message: e.message }); }

        const rawAdKeys = await db.getUserApiKeys(ctx.user.id);
        const isAdminAd = ctx.user.role === "admin";
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
          logger.error(`Video ad generation failed: ${err.message}`);
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
        await rateLimitAI(ctx.user.id);
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
        await rateLimitAI(ctx.user.id);
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
        await rateLimitAI(ctx.user.id);
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Social Platform Credentials ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // Per-user credentials for Instagram, TikTok, Facebook, Discord, YouTube
  // Credentials are stored per-user and never shared between accounts.
  socialCredentials: router({
    // List all connected platforms (metadata only ÃÂ¢ÃÂÃÂ no raw tokens returned)
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
              if (!ready) throw new Error("Instagram video processing timed out ÃÂ¢ÃÂÃÂ try again");
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
            validatePublicUrl(input.mediaUrl, "mediaUrl");
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Subscription / Billing ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
            const effectiveTierForDb = (liveStatus === "active" || liveStatus === "trialing" ? liveTier : null);
            const tierChanged = effectiveTierForDb !== user.subscriptionTier;
            const statusChanged = liveStatus !== user.subscriptionStatus;
            const periodChanged = !user.subscriptionCurrentPeriodEnd ||
              Math.abs(livePeriodEnd.getTime() - new Date(user.subscriptionCurrentPeriodEnd).getTime()) > 60000;
            if (tierChanged || statusChanged || periodChanged) {
              await db.updateUserSubscription(user.id, {
                subscriptionTier: effectiveTierForDb as any,
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
        isAdmin: user.role === "admin",
        stripePublishableKey: ENV.stripePublishableKey,
      };
    }),

    // v6.62 ÃÂ¢ÃÂÃÂ Cost preflight.
    // Returns { cost, balance, balanceAfter, sufficient, label } for ANY action
    // before the user commits. Powers the <CostPreflight /> chip rendered next
    // to every credit-spending button so the user never gets a surprise bill.
    //
    // For per-second video gen, pass `sceneDurationSeconds`; we apply the same
    // duration scaling the actual deduction uses (getVideoCredits) so the
    // estimate matches the real charge.
    estimateCost: protectedProcedure
      .input(z.object({
        action: z.string().min(1).max(64),
        // Multiplier ÃÂ¢ÃÂÃÂ used for "bulk" actions like bulk_generate_previews where
        // the cost scales by N scenes. Defaults to 1.
        multiplier: z.number().int().min(1).max(500).default(1),
        // Scene duration in seconds ÃÂ¢ÃÂÃÂ only used for video gen actions to apply
        // the per-second scaling (matches server's actual deduction logic).
        sceneDurationSeconds: z.number().int().min(1).max(3600).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const entry = (CREDIT_COSTS as any)[input.action];
        if (!entry) {
          // Unknown action ÃÂ¢ÃÂÃÂ return zero-cost so client doesn't block, but flag.
          return {
            ok: false,
            cost: 0,
            balance: ctx.user.creditBalance ?? 0,
            balanceAfter: ctx.user.creditBalance ?? 0,
            sufficient: true,
            action: input.action,
            label: input.action,
            unknown: true,
          };
        }

        // Match the server-side scaling for video actions
        let cost = entry.cost as number;
        if ((input.action === "generate_scene_video" || input.action === "regenerate_scene_video" || input.action === "bulk_generate_videos") && input.sceneDurationSeconds) {
          cost = getVideoCredits(input.sceneDurationSeconds);
          if (input.action === "regenerate_scene_video") cost = Math.ceil(cost * 0.8);
        }
        cost = Math.ceil(cost * (input.multiplier || 1));

        const balance = (ctx.user.creditBalance as number | null) ?? 0;
        const balanceAfter = balance - cost;
        return {
          ok: true,
          cost,
          balance,
          balanceAfter,
          sufficient: balance >= cost,
          action: input.action,
          label: entry.label as string,
          unknown: false,
        };
      }),

    // Create a Stripe checkout session for subscription
    createCheckout: creationProcedure
      .input(z.object({
        tier: z.enum(["indie", "amateur", "independent", "creator", "studio", "industry"]),
        billing: z.enum(["monthly", "annual"]).default("annual"),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Resolve the correct Stripe price ID ÃÂ¢ÃÂÃÂ check auto-provisioned first, then ENV fallbacks
        const { getStripePriceId } = await import("./_core/stripeProvisioning");
        const priceMap: Record<string, Record<string, string>> = {
          indie: {
            monthly: getStripePriceId("indie_monthly") || (ENV as any).stripeIndieMonthlyPriceId || "",
            annual: getStripePriceId("indie_annual") || (ENV as any).stripeIndieAnnualPriceId || "",
          },
          amateur: {
            monthly: getStripePriceId("amateur_monthly") || "",
            annual: getStripePriceId("amateur_annual") || "",
          },
          independent: {
            monthly: getStripePriceId("independent_monthly") || (ENV as any).stripeIndependentMonthlyPriceId || "",
            annual: getStripePriceId("independent_annual") || (ENV as any).stripeIndependentAnnualPriceId || "",
          },
          creator: {
            // "creator" is a DB alias for the studio tier ÃÂ¢ÃÂÃÂ use studio price IDs
            monthly: getStripePriceId("creator_monthly") || getStripePriceId("studio_monthly") || "",
            annual: getStripePriceId("creator_annual") || getStripePriceId("studio_annual") || "",
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
         // Founding offer only applies to Independent+ tiers (not Amateur ÃÂ¢ÃÂÃÂ it's a hook tier, not a founding member)
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
        packId: z.enum(["pack_10", "pack_50", "pack_100", "pack_250", "pack_500", "pack_1000", "topup_10", "topup_30", "topup_50", "topup_100", "topup_200", "topup_500", "topup_1000"]),
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
          topup_50: getProvisionedId("topup_50") || "",
          topup_100: ENV.stripeTopUp100PriceId || getProvisionedId("topup_100"),
          topup_200: ENV.stripeTopUp200PriceId || getProvisionedId("topup_200") || "",
          topup_500: ENV.stripeTopUp500PriceId || getProvisionedId("topup_500") || "",
          topup_1000: ENV.stripeTopUp1000PriceId || getProvisionedId("topup_1000") || "",
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

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Asset Marketplace ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // Create a Stripe checkout for a one-time asset purchase
    createAssetCheckout: protectedProcedure
      .input(z.object({
        assetId: z.string(),
        assetName: z.string(),
        priceAud: z.number().positive(), // in dollars e.g. 4.99
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });
        // Admins get everything free
        if (ctx.user.role === "admin") {
          // Record as paid immediately for admins
          const dbConn = await db.getDb();
          if (dbConn) {
            await dbConn.execute(sql`
              INSERT IGNORE INTO assetPurchases (userId, assetId, amountAud, status)
              VALUES (${ctx.user.id}, ${input.assetId}, 0, 'paid')
            `);
          }
          return { url: input.successUrl, adminBypass: true };
        }
        // Check if already purchased
        const dbConn = await db.getDb();
        if (dbConn) {
          const existing = await dbConn.execute(sql`
            SELECT id FROM assetPurchases WHERE userId = ${ctx.user.id} AND assetId = ${input.assetId} AND status = 'paid' LIMIT 1
          `);
          if ((existing as any[]).length > 0) {
            return { url: input.successUrl, alreadyOwned: true };
          }
        }
        const customerId = await getOrCreateStripeCustomer(ctx.user);
        await db.updateUserSubscription(ctx.user.id, { stripeCustomerId: customerId });
        const amountCents = Math.round(input.priceAud * 100);
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [{
            price_data: {
              currency: "aud",
              unit_amount: amountCents,
              product_data: {
                name: input.assetName,
                description: `Virelle Studios Asset ÃÂ¢ÃÂÃÂ ${input.assetName}`,
              },
            },
            quantity: 1,
          }],
          success_url: input.successUrl + `?asset_purchased=${input.assetId}`,
          cancel_url: input.cancelUrl,
          metadata: {
            userId: String(ctx.user.id),
            assetId: input.assetId,
            type: "asset_purchase",
          },
        });
        // Record pending purchase
        if (dbConn) {
          await dbConn.execute(sql`
            INSERT INTO assetPurchases (userId, assetId, stripeSessionId, amountAud, status)
            VALUES (${ctx.user.id}, ${input.assetId}, ${session.id}, ${amountCents}, 'pending')
          `);
        }
        return { url: session.url! };
      }),

    // Check which assets the current user has purchased (or admin = all)
    getOwnedAssets: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === "admin") {
        return { ownedAssetIds: "all" as const };
      }
      const dbConn = await db.getDb();
      if (!dbConn) return { ownedAssetIds: [] as string[] };
      const rows = await dbConn.execute(sql`
        SELECT assetId FROM assetPurchases WHERE userId = ${ctx.user.id} AND status = 'paid'
      `);
      return { ownedAssetIds: (rows as any[]).map((r: any) => r.assetId) };
    }),

    // Confirm asset purchase after Stripe redirect (called on success page)
    confirmAssetPurchase: protectedProcedure
      .input(z.object({ assetId: z.string(), sessionId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") return { success: true };
        if (!stripe || !input.sessionId) return { success: false };
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        if (session.payment_status === "paid" && session.metadata?.assetId === input.assetId) {
          const dbConn = await db.getDb();
          if (dbConn) {
            await dbConn.execute(sql`
              UPDATE assetPurchases SET status = 'paid', stripePaymentIntentId = ${String(session.payment_intent || "")}
              WHERE userId = ${ctx.user.id} AND assetId = ${input.assetId} AND stripeSessionId = ${input.sessionId}
            `);
          }
          return { success: true };
        }
        return { success: false };
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Blog (Public + Admin) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  seo: seoRouter,
  communityForum: communityForumRouter,
  autonomous: autonomousRouter,
  marketing: marketingRouter,
  adminSeeding: adminSeedingRouter,
  contentCreator: contentCreatorRouter,
  mailingList: mailingListRouter,
  funding: fundingRouter,
  crowdfund: crowdfundRouter,
  crowdfundMilestones: crowdfundMilestonesRouter,
  wardrobeMarket: wardrobeMarketplaceRouter,
      vfxSfx: vfxSfxRouter,
    backgrounds: backgroundsRouter,
    props: propsRouter,
    narrative: narrativeRouter,
    lamaloGifts: lamaloGiftsRouter,
  lamaloAdmin: router({
    /** Seed Lamalo Fashion in-house designer. Admin-only. Idempotent. */
    seedLamalo: adminProcedure.mutation(async ({ ctx }) => {
      return runLamaloSeed(ctx.user.id);
    }),
  }),
  filmPost: filmPostRouter,
  featureFilm: featureFilmRouter,
  productionAssets: productionAssetsRouter,
  productionDocuments: productionDocumentsRouter,
  epkGenerator: epkGeneratorRouter,
  locationRecreation: locationRecreationRouter,
  locationStudio: locationStudioRouter,
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Referral System ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
              title: `ÃÂ°ÃÂÃÂÃÂ Referral Milestone: ${milestoneLabel}!`,
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
        return { valid: true, referrerName: "A VirÃÂÃÂlle Studios user" };
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Promo Codes (50% discount on first subscription payment) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  promo: router({
    // Validate a promo code (public ÃÂ¢ÃÂÃÂ called live as user types)
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
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ User Settings & API Key Management ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
        subscriptionStatus: u.subscriptionStatus || "none",
        credits: u.credits ?? 0,
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
          venice: !!(u as any).userVeniceKey,
          did: !!(u as any).userDidKey,
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
          throw new TRPCError({ code: "BAD_REQUEST", message: "Account uses OAuth login ÃÂ¢ÃÂÃÂ no password to change" });
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
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google", "veo3", "venice", "did"]),
        key: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { provider, key } = input;

        // Validate key format for video providers only (elevenlabs, suno, anthropic, google, venice have no format validation)
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
          venice: "userVeniceKey",
          did: "userDidKey",         // D-ID avatar API for Auslan interpreter overlay
        };

        const column = columnMap[provider];
        if (!column) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid provider" });

        // Encrypt with AES-256-GCM ÃÂ¢ÃÂÃÂ uses securityEngine.encryptApiKey for proper key protection
        const encoded = encryptApiKey(key);

        await db.updateUserApiKey(ctx.user!.id, column, encoded);

        // Auto-set preferred video provider when saving a video-specific key and the
        // user hasn't already chosen a preferred provider. This prevents the common
        // confusion where a user adds a Runway or fal.ai key but generation silently
        // uses Veo3 because a Google AI key (saved for LLM/scripts) takes priority.
        // Excluded: google (LLM only), anthropic (LLM only), venice (LLM only),
        //           elevenlabs/suno (audio), huggingface (low-quality video).
        const videoProviderAutoSet: Record<string, string> = {
          runway: "runway",
          fal: "fal",
          luma: "luma",
          replicate: "replicate",
          seedance: "seedance",
          veo3: "veo3",
          openai: "openai",
        };
        const autoSetProvider = videoProviderAutoSet[provider];
        if (autoSetProvider) {
          const existingKeys = await db.getUserApiKeys(ctx.user!.id);
          if (!existingKeys.preferredProvider) {
            await db.updateUserPreferredProvider(ctx.user!.id, autoSetProvider);
          }
        }

        return { success: true, provider, message: `${provider} API key saved successfully` };
      }),

    // Remove an API key
    removeApiKey: protectedProcedure
      .input(z.object({
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google", "veo3", "venice", "did"]),
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
          venice: "userVeniceKey",
          did: "userDidKey",
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
        provider: z.enum(["openai", "runway", "replicate", "fal", "luma", "huggingface", "elevenlabs", "suno", "seedance", "anthropic", "google", "veo3", "venice", "did"]),
        key: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const { provider, key } = input;

        try {
          switch (provider) {
            case "venice": {
              const resp = await fetch("https://api.venice.ai/api/v1/models", {
                headers: { "Authorization": `Bearer ${key}` },
              });
              if (resp.ok) return { valid: true, message: "Venice AI key is valid" };
              return { valid: false, message: `Venice returned ${resp.status}` };
            }
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
            case "veo3":
            case "google": {
              const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
              if (resp.ok) return { valid: true, message: "Google AI (Gemini / Veo3) key is valid" };
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
                if (resp.ok) return { valid: true, message: "BytePlus ModelArk key is valid ÃÂ¢ÃÂÃÂ SeedDance ready" };
                if (resp.status === 401) return { valid: false, message: "BytePlus key is invalid or expired" };
                // Other status codes might still be valid keys (e.g., 403 = no model access)
                return { valid: true, message: `BytePlus key accepted (status ${resp.status} ÃÂ¢ÃÂÃÂ will be verified on first use)` };
              } catch {
                // If we can't reach BytePlus, accept the key and let generation verify it
                if (key.length > 10) return { valid: true, message: "BytePlus key format accepted (will be verified on first use)" };
                return { valid: false, message: "BytePlus API key appears too short" };
              }
            }
            case "did": {
              // Validate D-ID key by hitting the credits endpoint (lightweight, read-only)
              try {
                const authHeader = `Basic ${Buffer.from(key + ":").toString("base64")}`;
                const resp = await fetch("https://api.d-id.com/credits", {
                  headers: { Authorization: authHeader, Accept: "application/json" },
                  signal: AbortSignal.timeout(10_000),
                });
                if (resp.ok) return { valid: true, message: "D-ID key is valid ÃÂ¢ÃÂÃÂ Auslan interpreter ready" };
                if (resp.status === 401) return { valid: false, message: "D-ID key is invalid or expired" };
                return { valid: true, message: `D-ID key accepted (status ${resp.status} ÃÂ¢ÃÂÃÂ will be verified on first use)` };
              } catch {
                if (key.length > 10) return { valid: true, message: "D-ID key format accepted (will be verified on first use)" };
                return { valid: false, message: "D-ID key appears too short" };
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Security Admin Dashboard ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Project Samples ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Contact Form ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
            title: `[Contact] ${input.subject.toUpperCase()} ÃÂ¢ÃÂÃÂ ${input.name}`,
            content: `From: ${input.name} <${input.email}>\nCompany: ${input.company || "N/A"}\nSubject: ${input.subject}\nIP: ${clientIP}\n\n${input.message}`,
          });
        } catch (notifyErr) {
          // Non-critical ÃÂ¢ÃÂÃÂ still succeed even if notification fails
          logger.warn(`Contact form owner notification failed: ${notifyErr}`);
        }
        // Also create an in-app notification for admin users
        try {
          const adminUser = await db.getUserByEmail((ENV.adminEmail || "studiosvirelle@gmail.com").toLowerCase());
          if (adminUser) {
            await db.createNotification({
              userId: adminUser.id,
              type: "system",
              title: `New contact: ${input.name}`,
              message: `${input.email} ÃÂ¢ÃÂÃÂ ${input.subject}: ${input.message.slice(0, 120)}${input.message.length > 120 ? "..." : ""}`,
              link: "/admin",
            });
          }
        } catch (_) { /* non-critical */ }
        logAuditEvent(0, "contact_form_submitted", clientIP, true, { email: input.email, subject: input.subject });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Notifications ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Distribute / Promote ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  distribute: router({
    getPromoStatus: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Check if film page exists
        const filmPageRows = await dbConn.execute(
          sql`SELECT * FROM filmPages WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} LIMIT 1`
        );
        const filmPage = (Array.isArray(filmPageRows[0]) ? filmPageRows[0] : filmPageRows as any[])?.[0];

        // Check if promo assets exist
        const promoAssetsRows = await dbConn.execute(
          sql`SELECT COUNT(*) as count FROM promoAssets WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id}`
        );
        const promoAssetsCount = (Array.isArray(promoAssetsRows[0]) ? promoAssetsRows[0] : promoAssetsRows as any[])?.[0]?.count || 0;

        // Check exports
        const movies = await db.getUserMovies(ctx.user.id);
        const projectMovies = movies.filter((m: any) => m.projectId === input.projectId);

        const exports = {
          trailer: projectMovies.some((m: any) => m.type === "trailer" && !m.tags?.includes("tiktok") && !m.tags?.includes("instagram") && !m.tags?.includes("youtubeShorts") && !m.tags?.includes("square")),
          tiktok: projectMovies.some((m: any) => m.type === "trailer" && m.tags?.includes("tiktok")),
          instagram: projectMovies.some((m: any) => m.type === "trailer" && m.tags?.includes("instagram")),
          youtubeShorts: projectMovies.some((m: any) => m.type === "trailer" && m.tags?.includes("youtubeShorts")),
          square: projectMovies.some((m: any) => m.type === "trailer" && m.tags?.includes("square")),
        };

        return {
          isPublished: !!filmPage?.isPublic,
          slug: filmPage?.slug || project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          filmPage: filmPage || null,
          promoAssetsGenerated: promoAssetsCount > 0,
          exports,
        };
      }),

    generatePromoAssets: creationProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await rateLimitAI(ctx.user.id);
        requireFeature(ctx.user, "canUseFullFilmGeneration", "Promo Asset Generation");
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Delete existing promo assets for this project before regenerating
        await dbConn.execute(
          sql`DELETE FROM promoAssets WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id}`
        );

        const title = project.title || "Untitled Film";
        const logline = (project as any).plotSummary || (project as any).description || "an original short film";
        const genre = (project as any).genre || "drama";
        const titleSlug = title.replace(/\s+/g, '');

        // Fallback assets used if LLM call fails
        const fallbackAssets = [
          { type: "caption", variant: "viral", content: `Just dropped my new film "${title}" ÃÂ°ÃÂÃÂÃÂ¬ Watch until the end. #filmmaking #indiefilm #virellestudios` },
          { type: "caption", variant: "cinematic", content: `"${title}" ÃÂ¢ÃÂÃÂ a ${genre} short. ${logline.slice(0, 120)}. #cinema #director #shortfilm` },
          { type: "hashtags", variant: "general", content: `#${titleSlug} #filmmaker #shortfilm #virellestudios #aifilm #cinema #indiefilm #${genre}` },
          { type: "hook", variant: "tiktok", content: `POV: You just made a cinematic short film with AI and it actually looks incredible...` },
          { type: "hook", variant: "instagram", content: `This is what happens when storytelling meets AI. "${title}" ÃÂ¢ÃÂÃÂ now live. ÃÂ°ÃÂÃÂÃÂ¥` },
        ];

        let assets = fallbackAssets;

        // Attempt LLM-generated promo copy
        try {
          const llmResult = await invokeLLM({
            model: "gpt-4.1-mini",
            maxTokens: 600,
            messages: [
              {
                role: "system",
                content: "You are a social media marketing expert for independent filmmakers. Generate promotional copy in JSON format."
              },
              {
                role: "user",
                content: `Generate promotional social media copy for a short film with the following details:\n- Title: ${title}\n- Genre: ${genre}\n- Logline: ${logline}\n\nReturn a JSON array with exactly 5 objects, each with: type ("caption"|"hashtags"|"hook"), variant ("viral"|"cinematic"|"tiktok"|"instagram"|"general"), content (the copy text). Keep captions under 200 chars, hashtags as a single space-separated string, hooks under 100 chars. Always include #virellestudios in hashtags.`
              }
            ],
            responseFormat: { type: "json_object" },
          });
          const rawContent = llmResult.choices?.[0]?.message?.content;
          const text = typeof rawContent === "string" ? rawContent : (rawContent as any)?.[0]?.text || "";
          const parsed = JSON.parse(text);
          const llmAssets = Array.isArray(parsed) ? parsed : (parsed.assets || parsed.copy || []);
          if (Array.isArray(llmAssets) && llmAssets.length >= 3) {
            assets = llmAssets.slice(0, 8).map((a: any) => ({
              type: String(a.type || "caption"),
              variant: String(a.variant || "general"),
              content: String(a.content || "").slice(0, 500),
            }));
          }
        } catch (llmErr: any) {
          logger.warn(`[Distribute] LLM promo generation failed, using fallback: ${llmErr.message}`);
          // fallbackAssets already set above ÃÂ¢ÃÂÃÂ continue
        }

        for (const asset of assets) {
          await dbConn.execute(
            sql`INSERT INTO promoAssets (userId, projectId, type, variant, content) VALUES (${ctx.user.id}, ${input.projectId}, ${asset.type}, ${asset.variant}, ${asset.content})`
          );
        }

        return { success: true, message: "Promo assets generated successfully" };
      }),

    getPromoAssets: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await dbConn.execute(
          sql`SELECT * FROM promoAssets WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} ORDER BY createdAt DESC`
        );
        return Array.isArray(rows[0]) ? rows[0] : rows as any[];
      }),

    createPromoExport: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        platform: z.enum(["tiktok", "instagram", "youtubeShorts", "square"])
      }))
      .mutation(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const scenes = await db.getProjectScenes(project.id);
        const scenesWithVideo = scenes.filter((s: any) => s.videoUrl).slice(0, 3); // Use first 3 scenes for promo

        if (scenesWithVideo.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No video scenes available for export" });
        }

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
          logger.errorWithStack("[Export] Failed to fetch opener scenes:", err);
        }

        let fileUrl: string | undefined;
        let fileKey: string | undefined;
        let fileSize: number | undefined;
        let totalDuration: number | undefined;
        let mimeType: string | undefined;

        // Determine resolution based on platform
        let resolution = "1080p";
        if (input.platform === "tiktok" || input.platform === "instagram" || input.platform === "youtubeShorts") {
          resolution = "1080x1920"; // Vertical 9:16
        } else if (input.platform === "square") {
          resolution = "1080x1080"; // Square 1:1
        }

        // Always stitch (even single scene) so the VirElle opener is ALWAYS prepended.
        // If stitching fails, fall back to raw scene URL as a last resort.
        const userScenes = scenesWithVideo.map((s: any) => ({
          videoUrl: s.videoUrl,
          title: s.title || undefined,
          duration: s.duration || undefined,
          orderIndex: s.orderIndex || 0,
        }));
        const allScenes = [...openerScenes, ...userScenes];

        try {
          const { stitchMovie } = await import("./_core/videoStitcher");
          const result = await stitchMovie({
            scenes: allScenes,
            projectTitle: `${project.title} - ${input.platform} Promo`,
            userId: ctx.user.id,
            projectId: project.id,
            resolution,
          });
          fileUrl = result.fileUrl;
          fileKey = result.fileKey;
          fileSize = result.fileSize;
          totalDuration = result.duration;
          mimeType = result.mimeType;
        } catch (err: any) {
          logger.error(`[Export] ${input.platform} promo stitching failed: ${err.message}`);
          // Hard fail ÃÂ¢ÃÂÃÂ never save a promo without the Virelle Studios opener.
          throw new Error(`Promo compilation failed: ${err.message}. Please try again.`);
        }

        const movie = await db.createMovie({
          userId: ctx.user.id,
          title: `${project.title} - ${input.platform} Promo`,
          description: `Promotional cut for ${input.platform}`,
          type: "trailer",
          projectId: project.id,
          movieTitle: project.title,
          thumbnailUrl: project.thumbnailUrl,
          fileUrl,
          fileKey,
          fileSize,
          duration: totalDuration,
          mimeType,
          tags: project.genre ? [project.genre, "promo", input.platform] : ["promo", input.platform],
        });

        return { success: true, movieId: movie.id };
      }),

    publishFilmPage: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        slug: z.string().min(3).max(80).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase letters, numbers, and hyphens only, and cannot start or end with a hyphen"),
        isPublic: z.boolean(),
        title: z.string().max(200).optional(),
        description: z.string().max(2000).optional(),
        showCreatorName: z.boolean().optional(),
        allowShowcase: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Block reserved slugs
        const RESERVED_SLUGS = ["admin", "api", "app", "auth", "dashboard", "films", "login", "logout", "register", "settings", "showcase", "studio", "support", "terms", "privacy", "virelle", "virellestudios"];
        if (RESERVED_SLUGS.includes(input.slug)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `The slug "${input.slug}" is reserved and cannot be used` });
        }

        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });

        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Check if slug is taken by another project
        const existingSlugRows = await dbConn.execute(
          sql`SELECT id FROM filmPages WHERE slug = ${input.slug} AND projectId != ${input.projectId} LIMIT 1`
        );
        const existingSlug = (Array.isArray(existingSlugRows[0]) ? existingSlugRows[0] : existingSlugRows as any[])?.[0];
        if (existingSlug) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This URL slug is already taken" });
        }

        // Check if film page exists for this project
        const filmPageRows = await dbConn.execute(
          sql`SELECT id FROM filmPages WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} LIMIT 1`
        );
        const filmPage = (Array.isArray(filmPageRows[0]) ? filmPageRows[0] : filmPageRows as any[])?.[0];

        const title = input.title || project.title;
        const description = input.description || project.plotSummary || project.description || "";

        if (filmPage) {
          // Update existing
          await dbConn.execute(
            sql`UPDATE filmPages SET
                slug = ${input.slug},
                isPublic = ${input.isPublic},
                title = ${title},
                description = ${description},
                showCreatorName = ${input.showCreatorName ?? true},
                allowShowcase = ${input.allowShowcase ?? true}
                WHERE id = ${filmPage.id}`
          );
        } else {
          // Create new
          await dbConn.execute(
            sql`INSERT INTO filmPages (userId, projectId, slug, title, description, isPublic, showCreatorName, allowShowcase)
                VALUES (${ctx.user.id}, ${input.projectId}, ${input.slug}, ${title}, ${description}, ${input.isPublic}, ${input.showCreatorName ?? true}, ${input.allowShowcase ?? true})`
          );
        }

        return { success: true, url: `/films/${input.slug}` };
      }),

    getFilmPage: publicProcedure
      .input(z.object({ slug: z.string(), preview: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await dbConn.execute(
          sql`SELECT f.*, u.name as creatorName, u.avatarUrl as creatorAvatar
              FROM filmPages f
              LEFT JOIN users u ON f.userId = u.id
              WHERE f.slug = ${input.slug} LIMIT 1`
        );
        const filmPage = (Array.isArray(rows[0]) ? rows[0] : rows as any[])?.[0];

        if (!filmPage) throw new TRPCError({ code: "NOT_FOUND", message: "Film page not found" });

        // Only the owner can view draft pages; everyone else requires isPublic = true
        const ownerId = filmPage.userId;
        const requesterId = ctx.user?.id ?? null;
        const isOwner = requesterId !== null && requesterId === ownerId;
        if (!filmPage.isPublic && !isOwner) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Film page not found or not public" });
        }

        // Get the actual movie file
        const movieRows = await dbConn.execute(
          sql`SELECT * FROM movies WHERE projectId = ${filmPage.projectId} AND type = 'film' ORDER BY createdAt DESC LIMIT 1`
        );
        const movie = (Array.isArray(movieRows[0]) ? movieRows[0] : movieRows as any[])?.[0];

        return {
          ...filmPage,
          movieUrl: movie?.fileUrl || null,
          movieDuration: movie?.duration || null,
        };
      }),

    getShowcase: publicProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await dbConn.execute(
          sql`SELECT f.*, u.name as creatorName, u.avatarUrl as creatorAvatar, m.fileUrl as movieUrl, m.thumbnailUrl as movieThumbnail
              FROM filmPages f
              LEFT JOIN users u ON f.userId = u.id
              LEFT JOIN movies m ON f.projectId = m.projectId AND m.type = 'film'
              WHERE f.isPublic = true AND f.allowShowcase = true
              GROUP BY f.id
              ORDER BY f.createdAt DESC LIMIT 20`
        );
        return Array.isArray(rows[0]) ? rows[0] : rows as any[];
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 2: Creator Profiles ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  creatorProfile: router({
    getProfile: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await dbConn.execute(
          sql`SELECT * FROM creatorProfiles WHERE slug = ${input.slug} LIMIT 1`
        );
        const profile = (Array.isArray(rows[0]) ? rows[0] : rows as any[])?.[0];
        if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });

        // Get public collections for this creator
        const collectionsRows = await dbConn.execute(
          sql`SELECT * FROM collections WHERE userId = ${profile.userId} AND isPublic = true ORDER BY createdAt DESC`
        );

        // Get public films for this creator
        const filmsRows = await dbConn.execute(
          sql`SELECT f.*, m.fileUrl as movieUrl, m.thumbnailUrl as movieThumbnail
              FROM filmPages f
              LEFT JOIN movies m ON f.projectId = m.projectId AND m.type = 'film'
              WHERE f.userId = ${profile.userId} AND f.isPublic = true
              GROUP BY f.id
              ORDER BY f.createdAt DESC`
        );

        return {
          ...profile,
          collections: Array.isArray(collectionsRows[0]) ? collectionsRows[0] : collectionsRows as any[],
          films: Array.isArray(filmsRows[0]) ? filmsRows[0] : filmsRows as any[],
        };
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
        displayName: z.string().min(2).max(100),
        bio: z.string().max(1000).optional(),
        profileType: z.enum(["creator", "studio"]).default("creator"),
        isPublic: z.boolean().default(false),
        socialLinks: z.any().optional(),
        focusTags: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Check if slug is taken by someone else
        const slugCheck = await dbConn.execute(
          sql`SELECT id FROM creatorProfiles WHERE slug = ${input.slug} AND userId != ${ctx.user.id} LIMIT 1`
        );
        const existingSlug = (Array.isArray(slugCheck[0]) ? slugCheck[0] : slugCheck as any[])?.[0];
        if (existingSlug) throw new TRPCError({ code: "CONFLICT", message: "Profile URL is already taken" });

        // Check if profile exists
        const profileCheck = await dbConn.execute(
          sql`SELECT id FROM creatorProfiles WHERE userId = ${ctx.user.id} LIMIT 1`
        );
        const existingProfile = (Array.isArray(profileCheck[0]) ? profileCheck[0] : profileCheck as any[])?.[0];

        if (existingProfile) {
          await dbConn.execute(
            sql`UPDATE creatorProfiles SET
                slug = ${input.slug},
                displayName = ${input.displayName},
                bio = ${input.bio || null},
                profileType = ${input.profileType},
                isPublic = ${input.isPublic},
                socialLinks = ${input.socialLinks ? JSON.stringify(input.socialLinks) : null},
                focusTags = ${input.focusTags ? JSON.stringify(input.focusTags) : null},
                updatedAt = NOW()
                WHERE userId = ${ctx.user.id}`
          );
        } else {
          await dbConn.execute(
            sql`INSERT INTO creatorProfiles (userId, slug, displayName, bio, profileType, isPublic, socialLinks, focusTags)
                VALUES (${ctx.user.id}, ${input.slug}, ${input.displayName}, ${input.bio || null}, ${input.profileType}, ${input.isPublic}, ${input.socialLinks ? JSON.stringify(input.socialLinks) : null}, ${input.focusTags ? JSON.stringify(input.focusTags) : null})`
          );
        }

        return { success: true, slug: input.slug };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 2: Collections ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  collections: router({
    getCollection: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const rows = await dbConn.execute(
          sql`SELECT c.*, u.name as creatorName, p.slug as creatorSlug
              FROM collections c
              LEFT JOIN users u ON c.userId = u.id
              LEFT JOIN creatorProfiles p ON c.userId = p.userId
              WHERE c.slug = ${input.slug} LIMIT 1`
        );
        const collection = (Array.isArray(rows[0]) ? rows[0] : rows as any[])?.[0];
        if (!collection) throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });

        // Get items in collection
        const itemsRows = await dbConn.execute(
          sql`SELECT ci.*, f.slug as filmSlug, f.title as filmTitle, f.thumbnailUrl as filmThumbnail, m.fileUrl as movieUrl
              FROM collectionItems ci
              JOIN filmPages f ON ci.projectId = f.projectId
              LEFT JOIN movies m ON f.projectId = m.projectId AND m.type = 'film'
              WHERE ci.collectionId = ${collection.id} AND f.isPublic = true
              ORDER BY ci.orderIndex ASC`
        );

        return {
          ...collection,
          items: Array.isArray(itemsRows[0]) ? itemsRows[0] : itemsRows as any[],
        };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 2: Analytics ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  analytics: router({
    trackEvent: publicProcedure
      .input(z.object({
        entityType: z.enum(["filmPage", "creatorProfile", "collection"]),
        entityId: z.number(),
        ownerId: z.number(),
        eventType: z.enum(["page_view", "video_play", "link_click", "share_click"]),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };

        try {
          await dbConn.execute(
            sql`INSERT INTO analyticsEvents (userId, entityType, entityId, eventType, metadata)
                VALUES (${input.ownerId}, ${input.entityType}, ${input.entityId}, ${input.eventType}, ${input.metadata ? JSON.stringify(input.metadata) : null})`
          );
          return { success: true };
        } catch (e) {
          logger.errorWithStack("Analytics tracking error:", e);
          return { success: false };
        }
      }),

    getStats: protectedProcedure
      .input(z.object({
        entityType: z.enum(["filmPage", "creatorProfile", "collection"]),
        entityId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { views: 0, plays: 0, shares: 0 };

        const rows = await dbConn.execute(
          sql`SELECT eventType, COUNT(*) as count
              FROM analyticsEvents
              WHERE userId = ${ctx.user.id} AND entityType = ${input.entityType} AND entityId = ${input.entityId}
              GROUP BY eventType`
        );

        const results = Array.isArray(rows[0]) ? rows[0] : rows as any[];
        const stats = { views: 0, plays: 0, shares: 0 };

        for (const row of results) {
          if (row.eventType === 'page_view') stats.views = Number(row.count);
          if (row.eventType === 'video_play') stats.plays = Number(row.count);
          if (row.eventType === 'share_click') stats.shares = Number(row.count);
        }

        return stats;
      }),
    setCurationFlag: adminProcedure
      .input(z.object({
        entityType: z.enum(["project", "creatorProfile"]),
        entityId: z.number(),
        flagType: z.enum(["featured", "staff_pick", "hidden", "banned"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        // Check if flag already exists
        const existingRows = await dbConn.execute(
          sql`SELECT id FROM adminCurationFlags
              WHERE entityType = ${input.entityType} AND entityId = ${input.entityId} AND flagType = ${input.flagType} LIMIT 1`
        );
        const existing = (Array.isArray(existingRows[0]) ? existingRows[0] : existingRows as any[])?.[0];

        if (!existing) {
          await dbConn.execute(
            sql`INSERT INTO adminCurationFlags (entityType, entityId, flagType, adminId, notes)
                VALUES (${input.entityType}, ${input.entityId}, ${input.flagType}, ${ctx.user.id}, ${input.notes || null})`
          );
        }
        return { success: true };
      }),

    removeCurationFlag: adminProcedure
      .input(z.object({
        entityType: z.enum(["project", "creatorProfile"]),
        entityId: z.number(),
        flagType: z.enum(["featured", "staff_pick", "hidden", "banned"]),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        await dbConn.execute(
          sql`DELETE FROM adminCurationFlags
              WHERE entityType = ${input.entityType} AND entityId = ${input.entityId} AND flagType = ${input.flagType}`
        );
        return { success: true };
      }),
  }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 3: Showcase Ranking ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 3: Submission Review Workflow ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  submissions: router({
    submit: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        const projRows = await dbConn.execute(sql`SELECT id FROM projects WHERE id = ${input.projectId} AND userId = ${ctx.user.id} LIMIT 1`);
        const proj = (Array.isArray(projRows[0]) ? projRows[0] : projRows as any[])?.[0];
        if (!proj) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found" });
        const dupRows = await dbConn.execute(sql`SELECT id FROM submissionReviews WHERE projectId = ${input.projectId} AND status = 'pending' LIMIT 1`);
        const dup = (Array.isArray(dupRows[0]) ? dupRows[0] : dupRows as any[])?.[0];
        if (dup) throw new TRPCError({ code: "CONFLICT", message: "A submission is already pending for this project" });
        await dbConn.execute(sql`INSERT INTO submissionReviews (projectId, userId, status) VALUES (${input.projectId}, ${ctx.user.id}, 'pending')`);
        return { success: true };
      }),

    getMyStatus: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return null;
        const rows = await dbConn.execute(
          sql`SELECT status, createdAt FROM submissionReviews WHERE projectId = ${input.projectId} AND userId = ${ctx.user.id} ORDER BY createdAt DESC LIMIT 1`
        );
        return (Array.isArray(rows[0]) ? rows[0] : rows as any[])?.[0] ?? null;
      }),

    listPending: adminProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows = await dbConn.execute(
          sql`SELECT sr.*, p.title as projectTitle, p.genre, u.name as creatorName, u.email as creatorEmail
              FROM submissionReviews sr
              LEFT JOIN projects p ON sr.projectId = p.id
              LEFT JOIN users u ON sr.userId = u.id
              WHERE sr.status = 'pending'
              ORDER BY sr.createdAt ASC`
        );
        return Array.isArray(rows[0]) ? rows[0] : rows as any[];
      }),

    review: adminProcedure
      .input(z.object({
        submissionId: z.number(),
        status: z.enum(["approved", "declined", "featured"]),
        adminNotes: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        await dbConn.execute(sql`UPDATE submissionReviews SET status = ${input.status}, adminNotes = ${input.adminNotes || null}, updatedAt = NOW() WHERE id = ${input.submissionId}`);
        if (input.status === "featured") {
          const subRows = await dbConn.execute(sql`SELECT projectId FROM submissionReviews WHERE id = ${input.submissionId} LIMIT 1`);
          const sub = (Array.isArray(subRows[0]) ? subRows[0] : subRows as any[])?.[0];
          if (sub) {
            await dbConn.execute(
              sql`INSERT IGNORE INTO adminCurationFlags (entityType, entityId, flagType, adminId) VALUES ('project', ${sub.projectId}, 'featured', ${ctx.user.id})`
            );
          }
        }
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 3: Abuse / Fraud Guards ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  abuse: router({
    report: publicProcedure
      .input(z.object({
        entityType: z.enum(["filmPage", "creatorProfile", "collection"]),
        entityId: z.number(),
        reason: z.string().min(5).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };
        try {
          const reporterId = ctx.user?.id ?? null;
          if (reporterId) {
            const rateRows = await dbConn.execute(
              sql`SELECT COUNT(*) as cnt FROM abuseFlags WHERE entityId = ${input.entityId} AND entityType = ${input.entityType} AND reporterId = ${reporterId} AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 DAY)`
            );
            const rate = (Array.isArray(rateRows[0]) ? rateRows[0] : rateRows as any[])?.[0];
            if (Number(rate?.cnt ?? 0) >= 3) {
              throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "You have already reported this content today" });
            }
          }
          await dbConn.execute(
            sql`INSERT INTO abuseFlags (entityId, entityType, reporterId, reason) VALUES (${input.entityId}, ${input.entityType}, ${reporterId}, ${input.reason})`
          );
          return { success: true };
        } catch (e: any) {
          if (e.code === "TOO_MANY_REQUESTS") throw e;
          logger.errorWithStack("Abuse report error:", e);
          return { success: false };
        }
      }),

    listPending: adminProcedure
      .query(async () => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows = await dbConn.execute(
          sql`SELECT af.*, u.name as reporterName FROM abuseFlags af LEFT JOIN users u ON af.reporterId = u.id WHERE af.status = 'pending' ORDER BY af.createdAt DESC LIMIT 100`
        );
        return Array.isArray(rows[0]) ? rows[0] : rows as any[];
      }),

    action: adminProcedure
      .input(z.object({
        flagId: z.number(),
        status: z.enum(["reviewed", "actioned", "dismissed"]),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
        await dbConn.execute(sql`UPDATE abuseFlags SET status = ${input.status} WHERE id = ${input.flagId}`);
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Phase 3: Conversion Funnel Analytics ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  conversion: router({
    // Admin: get top performing film pages by conversion score
    getTopFilms: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        try {
          const rows = await dbConn.execute(
            sql`SELECT f.id, f.projectId, f.slug, f.title, f.thumbnailUrl,
                u.name as creatorName, cp.slug as creatorSlug,
                COALESCE(v.cnt, 0) as viewCount,
                COALESCE(p.cnt, 0) as playCount,
                COALESCE(s.cnt, 0) as shareCount,
                COALESCE(c.cnt, 0) as conversionCount,
                (
                  COALESCE(v.cnt, 0) * 1 +
                  COALESCE(p.cnt, 0) * 3 +
                  COALESCE(s.cnt, 0) * 5 +
                  COALESCE(c.cnt, 0) * 10
                ) as score
              FROM filmPages f
              LEFT JOIN users u ON f.userId = u.id
              LEFT JOIN creatorProfiles cp ON f.userId = cp.userId
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'page_view' GROUP BY entityId) v ON v.entityId = f.id
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'video_play' GROUP BY entityId) p ON p.entityId = f.id
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'share_click' GROUP BY entityId) s ON s.entityId = f.id
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'signup_cta_click' GROUP BY entityId) c ON c.entityId = f.id
              WHERE f.isPublic = true
              ORDER BY score DESC
              LIMIT ${input.limit}`
          );
          return Array.isArray(rows[0]) ? rows[0] : rows as any[];
        } catch (e) {
          logger.errorWithStack("getTopFilms error:", e);
          return [];
        }
      }),
    // Admin: get conversion funnel stats for a time window
    getFunnelStats: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { views: 0, plays: 0, shares: 0, signupClicks: 0, newUsers: 0 };
        try {
          const since = new Date(Date.now() - input.days * 86400000);
          const viewsRow = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM analyticsEvents WHERE eventType = 'page_view' AND createdAt >= ${since}`);
          const playsRow = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM analyticsEvents WHERE eventType = 'video_play' AND createdAt >= ${since}`);
          const sharesRow = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM analyticsEvents WHERE eventType = 'share_click' AND createdAt >= ${since}`);
          const signupRow = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM analyticsEvents WHERE eventType = 'signup_cta_click' AND createdAt >= ${since}`);
          const usersRow = await dbConn.execute(sql`SELECT COUNT(*) as cnt FROM users WHERE createdAt >= ${since}`);
          const get = (r: any) => Number((Array.isArray(r[0]) ? r[0] : r as any[])?.[0]?.cnt || 0);
          return {
            views: get(viewsRow),
            plays: get(playsRow),
            shares: get(sharesRow),
            signupClicks: get(signupRow),
            newUsers: get(usersRow),
          };
        } catch (e) {
          logger.errorWithStack("getFunnelStats error:", e);
          return { views: 0, plays: 0, shares: 0, signupClicks: 0, newUsers: 0 };
        }
      }),
    // Admin: get top creators by engagement
    getTopCreators: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(10) }))
      .query(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        try {
          const rows = await dbConn.execute(
            sql`SELECT u.id, u.name, u.email, cp.slug as creatorSlug, cp.profileType,
                COUNT(DISTINCT f.id) as filmCount,
                COALESCE(SUM(ae_v.cnt), 0) as totalViews,
                COALESCE(SUM(ae_p.cnt), 0) as totalPlays
              FROM users u
              LEFT JOIN creatorProfiles cp ON u.id = cp.userId
              LEFT JOIN filmPages f ON f.userId = u.id AND f.isPublic = true
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'page_view' GROUP BY entityId) ae_v ON ae_v.entityId = f.id
              LEFT JOIN (SELECT entityId, COUNT(*) as cnt FROM analyticsEvents WHERE entityType = 'filmPage' AND eventType = 'video_play' GROUP BY entityId) ae_p ON ae_p.entityId = f.id
              GROUP BY u.id
              HAVING filmCount > 0
              ORDER BY totalViews DESC
              LIMIT ${input.limit}`
          );
          return Array.isArray(rows[0]) ? rows[0] : rows as any[];
        } catch (e) {
          logger.errorWithStack("getTopCreators error:", e);
          return [];
        }
      }),
    // Public: track a conversion event (fire-and-forget, never throws)
    track: publicProcedure
      .input(z.object({
        eventType: z.enum(["view_to_watch", "watch_to_profile", "profile_to_signup", "showcase_to_film", "film_to_create"]),
        sourcePath: z.string().max(255),
        targetPath: z.string().max(255),
        sessionId: z.string().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) return { success: false };
        try {
          const userId = ctx.user?.id ?? null;
          await dbConn.execute(
            sql`INSERT INTO conversionEvents (userId, sessionId, sourcePath, targetPath, eventType)
                VALUES (${userId}, ${input.sessionId || null}, ${input.sourcePath}, ${input.targetPath}, ${input.eventType})`
          );
          return { success: true };
        } catch (e) {
          logger.errorWithStack("Conversion tracking error:", e);
          return { success: false };
        }
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ AI Generation ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
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
      // Use canonical TIER_LIMITS so allocation always matches the source of truth in subscription.ts
      const effectiveTier = getEffectiveTier(user);
      const monthlyAllocation = TIER_LIMITS[effectiveTier]?.monthlyCredits ?? 0;
      return {
        balance: user.creditBalance || 0,
        tier: effectiveTier,
        monthlyAllocation,
        subscriptionStatus: user.subscriptionStatus || "none",
        subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
      };
    }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ YouTube Export ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  youtube: router({
    /**
     * Export a movie/trailer to the Virelle Studios YouTube channel.
     * Requires: paid subscription tier (independent, creator, studio, industry)
     */
    exportToChannel: protectedProcedure
      .input(z.object({
        movieId: z.number().optional(),
        videoUrl: z.string().url(),
        title: z.string().min(1).max(100),
        description: z.string().max(5000).default(""),
        privacyStatus: z.enum(["public", "unlisted", "private"]).default("public"),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Only Studio+ tiers can export to YouTube ÃÂ¢ÃÂÃÂ use getEffectiveTier for consistent access control
        const effectiveTier = getEffectiveTier(ctx.user);
        const paidTiers = ["independent", "creator", "studio", "industry", "beta"];
        if (!paidTiers.includes(effectiveTier) && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "YouTube export is available on Studio plan and above. Upgrade to unlock this feature.",
          });
        }

        const { uploadVideoToYouTube, isYouTubeConfigured } = await import("./youtube-service");

        if (!isYouTubeConfigured()) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "YouTube integration is not yet configured. Please contact support.",
          });
        }

        const { getDb: getYtDb } = await import("./db");
        const { sql: sqlRaw } = await import("drizzle-orm");
        const conn = await getYtDb();
        const ytUser = ctx.user as any;

        // Insert export record as 'uploading'
        let exportId: number | null = null;
        try {
          if (conn) {
            const ins = await (conn as any).execute(sqlRaw`
              INSERT INTO youtubeExports (userId, movieId, projectId, videoUrl, youtubeVideoId, youtubeUrl, title, description, privacyStatus, status)
              VALUES (${ytUser.id}, ${input.movieId ?? null}, ${input.projectId ?? null}, ${input.videoUrl}, ${' '}, ${' '}, ${input.title.substring(0, 255)}, ${(input.description || "").substring(0, 4999)}, ${input.privacyStatus}, ${'uploading'})
            `) as any;
            exportId = ins?.insertId ?? null;
          }
        } catch (_) {}

        let result;
        try {
          result = await uploadVideoToYouTube({
            videoUrl: input.videoUrl,
            title: input.title,
            description: input.description || `Created with Virelle Studios ÃÂ¢ÃÂÃÂ AI-powered cinema.\n\nhttps://virelle.life`,
            privacyStatus: input.privacyStatus,
            tags: ["Virelle Studios", "AI Film", "AI Cinema", "Short Film", "AI Generated"],
          });
        } catch (err: any) {
          // Mark as failed
          if (conn && exportId) {
            await conn.execute(sqlRaw`UPDATE youtubeExports SET status=${'failed'}, errorMessage=${String(err.message).substring(0, 500)} WHERE id=${exportId}`).catch(() => {});
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `YouTube upload failed: ${err.message}`,
          });
        }

        // Mark export as done and update the movie record
        if (conn) {
          if (exportId) {
            await conn.execute(sqlRaw`UPDATE youtubeExports SET status=${'done'}, youtubeVideoId=${result.youtubeVideoId}, youtubeUrl=${result.youtubeUrl} WHERE id=${exportId}`).catch(() => {});
          }
          if (input.movieId) {
            await conn.execute(sqlRaw`UPDATE movies SET youtubeVideoId=${result.youtubeVideoId}, youtubeUrl=${result.youtubeUrl}, youtubeExportedAt=NOW() WHERE id=${input.movieId}`).catch(() => {});
          }
        }

        return {
          success: true,
          youtubeVideoId: result.youtubeVideoId,
          youtubeUrl: result.youtubeUrl,
        };
      }),

    /**
     * Get YouTube export history for the current user.
     */
    getExportHistory: protectedProcedure.query(async ({ ctx }) => {
      const histUser = ctx.user as any;
      const { getDb: getHistDb } = await import("./db");
      const conn = await getHistDb();
      if (!conn) return [];
      const { sql: sqlRaw } = await import("drizzle-orm");
      const [rows] = await (conn as any).execute(sqlRaw.raw(`
        SELECT id, movieId, projectId, youtubeVideoId, youtubeUrl, title, privacyStatus, status, errorMessage, exportedAt
        FROM youtubeExports
        WHERE userId = ${histUser.id}
        ORDER BY exportedAt DESC
        LIMIT 50
      `)) as any;
      return Array.isArray(rows) ? rows : [];
    }),

    /**
     * Check whether YouTube credentials are configured (admin only).
     */
    isConfigured: protectedProcedure.query(async ({ ctx }) => {
      const { isYouTubeConfigured } = await import("./youtube-service");
      return { configured: isYouTubeConfigured() };
    }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Signature Cast ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  signatureCast: router({

    // List all active actors with entitlement status for the current user
    listActors: publicProcedure.query(async ({ ctx }) => {
      const { PLAN_CAST_ACCESS, INITIAL_ACTORS } = await import("./_core/signatureCast");
      const userTier = (ctx.user?.subscriptionTier ?? "none") as import("./_core/subscription").SubscriptionTier;
      const actors = INITIAL_ACTORS.filter((a: any) => a.isActive && !a.isRetired);

      // If user is logged in, check paid entitlements via raw SQL
      let entitlements: string[] = [];
      if (ctx.user) {
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            const rows = await dbConn.execute(sql`
              SELECT actorId FROM signatureCastEntitlements
              WHERE userId = ${ctx.user.id} AND status = 'active'
            `) as any;
            entitlements = (Array.isArray(rows) ? rows : rows[0] ?? []).map((r: any) => r.actorId);
          }
        } catch { /* table may not exist yet */ }
      }

      const planAccess = PLAN_CAST_ACCESS[userTier] ?? [];

      // Merge DB-stored portraitUrls over config defaults
        let dbPortraits: Record<string, string> = {};
        try {
          const dbConn2 = await db.getDb();
          if (dbConn2) {
            const rows2 = await dbConn2.execute(sql`SELECT id, portraitUrl FROM signatureCastActors WHERE portraitUrl IS NOT NULL`) as any;
            const pRows = Array.isArray(rows2) ? rows2 : rows2[0] ?? [];
            for (const row of pRows) { if (row.portraitUrl) dbPortraits[row.id] = row.portraitUrl; }
          }
        } catch { /* table may not exist */ }
        return actors.map((actor: any) => ({
          ...actor,
          portraitUrl: dbPortraits[actor.id] ?? (actor as any).portraitUrl ?? null,
          isEntitled: entitlements.includes(actor.id) || planAccess.includes(actor.tier),
          entitlementSource: entitlements.includes(actor.id) ? "paid_unlock" :
            planAccess.includes(actor.tier) ? "plan_inclusion" : "none",
        }));
    }),

    // Get entitlement status for a single actor
    getActorEntitlement: protectedProcedure
      .input(z.object({ actorId: z.string() }))
      .query(async ({ ctx, input }) => {
        const { PLAN_CAST_ACCESS, INITIAL_ACTORS, DEFAULT_UNLOCK_PRICING, LICENSE_COPY } = await import("./_core/signatureCast");
        const userTier = (ctx.user.subscriptionTier ?? "none") as import("./_core/subscription").SubscriptionTier;
        const actor = INITIAL_ACTORS.find((a: any) => a.id === input.actorId);
        if (!actor) throw new TRPCError({ code: "NOT_FOUND", message: "Actor not found" });

        const planAccess = PLAN_CAST_ACCESS[userTier] ?? [];
        const planIncluded = planAccess.includes(actor.tier);

        let paidEntitlements: any[] = [];
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            const rows = await dbConn.execute(sql`
              SELECT * FROM signatureCastEntitlements
              WHERE userId = ${ctx.user.id} AND actorId = ${input.actorId} AND status = 'active'
            `) as any;
            paidEntitlements = Array.isArray(rows) ? rows : rows[0] ?? [];
          }
        } catch { /* table may not exist yet */ }

        const pricing = DEFAULT_UNLOCK_PRICING[actor.tier as keyof typeof DEFAULT_UNLOCK_PRICING];
        return {
          actor,
          isEntitled: planIncluded || paidEntitlements.length > 0,
          entitlementSource: paidEntitlements.length > 0 ? "paid_unlock" : planIncluded ? "plan_inclusion" : "none",
          paidEntitlements,
          pricing,
          licenseCopy: LICENSE_COPY,
          planIncluded,
          userTier,
        };
      }),

    // Create Stripe checkout session for actor unlock
    createUnlockCheckout: protectedProcedure
      .input(z.object({
        actorId: z.string(),
        licenseType: z.enum(["personal", "creator", "commercial", "episodic"]),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { INITIAL_ACTORS, DEFAULT_UNLOCK_PRICING, createActorUnlockCheckoutSession } = await import("./_core/signatureCast");
        const { stripe, getOrCreateStripeCustomer } = await import("./_core/subscription");
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

        const actor = INITIAL_ACTORS.find(a => a.id === input.actorId);
        if (!actor) throw new TRPCError({ code: "NOT_FOUND", message: "Actor not found" });
        if (!actor.isActive || actor.isRetired) throw new TRPCError({ code: "BAD_REQUEST", message: "Actor not available" });

        const amountAud = DEFAULT_UNLOCK_PRICING[actor.tier][input.licenseType];
        const stripeCustomerId = await getOrCreateStripeCustomer(ctx.user);

        // Log analytics event
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            await dbConn.execute(sql`
              INSERT INTO signatureCastEvents (userId, actorId, event, licenseType, projectId, createdAt)
              VALUES (${ctx.user.id}, ${input.actorId}, 'checkout_started', ${input.licenseType}, ${input.projectId ?? null}, NOW())
            `);
          }
        } catch { /* analytics non-blocking */ }

        const baseUrl = process.env.APP_URL ?? "https://virelle.life";
        const { url, sessionId } = await createActorUnlockCheckoutSession({
          actorId: input.actorId,
          actorName: actor.name,
          actorTier: actor.tier,
          licenseType: input.licenseType,
          projectId: input.projectId,
          amountAud,
          userId: ctx.user.id,
          userEmail: ctx.user.email ?? "",
          stripeCustomerId,
          successUrl: `${baseUrl}/talent-search?unlock_success=1&actor=${input.actorId}&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${baseUrl}/talent-search?actor=${input.actorId}`,
        }, stripe);

        return { url, sessionId, amountAud, actorName: actor.name };
      }),

    // Fulfill actor unlock after successful Stripe payment.
    // SECURITY: We verify the Stripe session server-side before granting any
    // entitlement. The client is NOT trusted to report the amount paid or to
    // confirm that payment actually succeeded — we read both from Stripe directly.
    fulfillUnlock: protectedProcedure
      .input(z.object({
        actorId: z.string(),
        licenseType: z.enum(["personal", "creator", "commercial", "episodic"]),
        projectId: z.number().optional(),
        stripeSessionId: z.string().max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        // ── 1. Verify payment with Stripe ────────────────────────────────────
        const { stripe } = await import("./_core/subscription");
        if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment system not configured" });

        let session: import("stripe").Stripe.Checkout.Session;
        try {
          session = await stripe.checkout.sessions.retrieve(input.stripeSessionId);
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid checkout session" });
        }

        // Payment must be complete
        if (session.payment_status !== "paid" || session.status !== "complete") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed" });
        }

        // Session must belong to this user (metadata.userId set at checkout creation)
        const metaUserId = session.metadata?.userId;
        if (!metaUserId || metaUserId !== ctx.user.id.toString()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Session does not belong to this user" });
        }

        // Actor and license type must match the checkout session
        if (session.metadata?.actorId !== input.actorId || session.metadata?.licenseType !== input.licenseType) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Session metadata mismatch" });
        }

        // Use the amount Stripe recorded, not the client-supplied value
        const verifiedAmountAud = (session.amount_total ?? 0) / 100;

        // ── 2. Grant entitlement (idempotent) ────────────────────────────────
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Idempotency guard: if this session was already fulfilled, return success
        // without inserting a duplicate row. Prevents replay attacks where a valid
        // session ID is submitted multiple times to accumulate extra entitlements.
        const existing = await dbConn.execute(sql`
          SELECT id FROM signatureCastEntitlements
          WHERE stripeSessionId = ${input.stripeSessionId} AND userId = ${ctx.user.id}
          LIMIT 1
        `);
        if ((existing as any)[0]?.length > 0) {
          return { success: true };
        }

        try {
          await dbConn.execute(sql`
            INSERT INTO signatureCastEntitlements
              (userId, actorId, licenseType, projectId, isCommercial, isEpisodic, source, stripeSessionId, amountPaidAud, status, startedAt, createdAt, updatedAt)
            VALUES
              (${ctx.user.id}, ${input.actorId}, ${input.licenseType}, ${input.projectId ?? null},
               ${input.licenseType === "commercial" ? 1 : 0}, ${input.licenseType === "episodic" ? 1 : 0},
               'stripe_checkout', ${input.stripeSessionId}, ${verifiedAmountAud}, 'active', NOW(), NOW(), NOW())
          `);
          await dbConn.execute(sql`
            INSERT INTO signatureCastEvents (userId, actorId, event, licenseType, projectId, metadata, createdAt)
            VALUES (${ctx.user.id}, ${input.actorId}, 'checkout_completed', ${input.licenseType},
                    ${input.projectId ?? null}, ${JSON.stringify({ stripeSessionId: input.stripeSessionId, amountPaidAud: verifiedAmountAud })}, NOW())
          `);
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to record entitlement" });
        }
        return { success: true };
      }),

    // Get all active entitlements for the current user (for billing page)
    myEntitlements: protectedProcedure.query(async ({ ctx }) => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows = await dbConn.execute(sql`
          SELECT * FROM signatureCastEntitlements
          WHERE userId = ${ctx.user.id} AND status = 'active'
          ORDER BY createdAt DESC
        `) as any;
        return Array.isArray(rows) ? rows : rows[0] ?? [];
      } catch { return []; }
    }),

    // Log analytics event (profile view, modal open, etc.)
    logEvent: publicProcedure
      .input(z.object({
        actorId: z.string(),
        event: z.enum(["profile_view", "unlock_modal_open", "checkout_abandoned", "cast_assigned", "plan_upgrade_triggered", "content_blocked"]),
        licenseType: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            await dbConn.execute(sql`
              INSERT INTO signatureCastEvents (userId, actorId, event, licenseType, projectId, createdAt)
              VALUES (${ctx.user?.id ?? null}, ${input.actorId}, ${input.event},
                      ${input.licenseType ?? null}, ${input.projectId ?? null}, NOW())
            `);
          }
        } catch { /* non-blocking */ }
        return { ok: true };
      }),

    // Admin: get analytics summary
    adminAnalytics: adminProcedure.query(async () => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return { events: [] };
        const rows = await dbConn.execute(sql`
          SELECT * FROM signatureCastEvents ORDER BY createdAt DESC LIMIT 500
        `) as any;
        return { events: Array.isArray(rows) ? rows : rows[0] ?? [] };
      } catch { return { events: [] }; }
    }),

    // Admin: list all entitlements
    adminEntitlements: adminProcedure.query(async () => {
      try {
        const dbConn = await db.getDb();
        if (!dbConn) return [];
        const rows = await dbConn.execute(sql`
          SELECT * FROM signatureCastEntitlements ORDER BY createdAt DESC LIMIT 200
        `) as any;
        return Array.isArray(rows) ? rows : rows[0] ?? [];
      } catch { return []; }
    }),

    // Admin: grant comp/promo entitlement
    adminGrantEntitlement: adminProcedure
      .input(z.object({
        userId: z.number(),
        actorId: z.string(),
        licenseType: z.enum(["personal", "creator", "commercial", "episodic"]),
        projectId: z.number().optional(),
        expiresAt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await dbConn.execute(sql`
          INSERT INTO signatureCastEntitlements
            (userId, actorId, licenseType, projectId, isCommercial, isEpisodic, source, amountPaidAud, status,
             expiresAt, startedAt, createdAt, updatedAt)
          VALUES
            (${input.userId}, ${input.actorId}, ${input.licenseType}, ${input.projectId ?? null},
             ${input.licenseType === "commercial" ? 1 : 0}, ${input.licenseType === "episodic" ? 1 : 0},
             'admin_comp', 0, 'active',
             ${input.expiresAt ? new Date(input.expiresAt) : null}, NOW(), NOW(), NOW())
        `);
        return { success: true };
      }),


    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Portrait Generation (Admin) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    generatePortrait: adminProcedure
      .input(z.object({ actorId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { INITIAL_ACTORS } = await import("./_core/signatureCast");
        const actor = (INITIAL_ACTORS as any[]).find((a: any) => a.id === input.actorId);
        if (!actor) throw new TRPCError({ code: "NOT_FOUND", message: "Actor not found" });
        const a = actor as any;
        if (!a.visualSpec) throw new TRPCError({ code: "BAD_REQUEST", message: "Actor has no visual spec" });
        const prompt = [
          "Cinematic portrait photograph of a fictional character:",
          a.visualSpec + ".",
          "Professional Hollywood actor headshot.",
          a.promptStyle + ".",
          "Shot on Arri Alexa 35, 85mm prime lens, shallow depth of field, sharp focus on eyes.",
          "High-end production quality. Photorealistic. 8K. Award-winning cinematography.",
          "NO text. NO watermarks. NO logos.",
        ].join(" ");
        const result = await generateImage({ prompt });
        if (!result?.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Image generation failed" });
        // Upsert into signatureCastActors DB
        try {
          const dbConn = await db.getDb();
          if (dbConn) {
            await dbConn.execute(sql`
              INSERT INTO signatureCastActors
                (id, name, tier, hook, portraitUrl, isActive, isFeatured, isRetired, allowCommercialUse, noExplicitContent, includedInPlan, pricePersonalAud, priceCreatorAud, priceCommercialAud, priceEpisodicAud, createdAt, updatedAt)
              VALUES
                (${a.id}, ${a.name}, ${a.tier}, ${a.hook || ""}, ${result.url},
                 ${a.isActive ? 1 : 0}, ${a.isFeatured ? 1 : 0}, ${a.isRetired ? 1 : 0},
                 ${a.allowCommercialUse ? 1 : 0}, ${a.noExplicitContent ? 1 : 0},
                 ${a.includedInPlan}, ${a.pricePersonalAud}, ${a.priceCreatorAud},
                 ${a.priceCommercialAud}, ${a.priceEpisodicAud}, NOW(), NOW())
              ON DUPLICATE KEY UPDATE portraitUrl = ${result.url}, updatedAt = NOW()
            `);
          }
        } catch (e: any) { logger.error(`DB save failed: ${(e as Error).message}`); }
        return { success: true, actorId: a.id, portraitUrl: result.url };
      }),

    generateAllPortraits: adminProcedure
      .input(z.object({ tier: z.enum(["standard", "premium", "flagship", "all"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const { INITIAL_ACTORS } = await import("./_core/signatureCast");
        const actors = (INITIAL_ACTORS as any[]).filter((a: any) =>
          !a.isRetired && a.isActive && a.visualSpec &&
          (input.tier === "all" || !input.tier || a.tier === input.tier)
        );
        const results: { actorId: string; success: boolean; portraitUrl?: string; error?: string }[] = [];
        for (const actor of actors) {
          const a = actor as any;
          try {
            const prompt = [
              "Cinematic portrait photograph of a fictional character:",
              a.visualSpec + ".",
              "Professional Hollywood actor headshot.",
              a.promptStyle + ".",
              "Shot on Arri Alexa 35, 85mm prime lens, shallow depth of field, sharp focus on eyes.",
              "High-end production quality. Photorealistic. 8K. Award-winning cinematography.",
              "NO text. NO watermarks. NO logos.",
            ].join(" ");
            const result = await generateImage({ prompt });
            if (result?.url) {
              try {
                const dbConn = await db.getDb();
                if (dbConn) {
                  await dbConn.execute(sql`
                    INSERT INTO signatureCastActors
                      (id, name, tier, hook, portraitUrl, isActive, isFeatured, isRetired, allowCommercialUse, noExplicitContent, includedInPlan, pricePersonalAud, priceCreatorAud, priceCommercialAud, priceEpisodicAud, createdAt, updatedAt)
                    VALUES
                      (${a.id}, ${a.name}, ${a.tier}, ${a.hook || ""}, ${result.url},
                       ${a.isActive ? 1 : 0}, ${a.isFeatured ? 1 : 0}, ${a.isRetired ? 1 : 0},
                       ${a.allowCommercialUse ? 1 : 0}, ${a.noExplicitContent ? 1 : 0},
                       ${a.includedInPlan}, ${a.pricePersonalAud}, ${a.priceCreatorAud},
                       ${a.priceCommercialAud}, ${a.priceEpisodicAud}, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE portraitUrl = ${result.url}, updatedAt = NOW()
                  `);
                }
              } catch { /* ignore */ }
              results.push({ actorId: a.id, success: true, portraitUrl: result.url });
            } else {
              results.push({ actorId: a.id, success: false, error: "No URL returned" });
            }
          } catch (e: any) {
            results.push({ actorId: a.id, success: false, error: e.message });
          }
          await new Promise(r => setTimeout(r, 600));
        }
        return {
          total:     actors.length,
          succeeded: results.filter(r => r.success).length,
          results,
        };
      }),

  }),
  featureCut: router({
      list: protectedProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ ctx, input }) => {
          return db.getProjectFeatureCuts(input.projectId, ctx.user.id);
        }),
      get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
          const cut = await db.getFeatureCutById(input.id, ctx.user.id);
          if (!cut) throw new TRPCError({ code: "NOT_FOUND", message: "Feature cut not found" });
          return cut;
        }),
      create: protectedProcedure
        .input(z.object({
          projectId: z.number(),
          name: z.string().min(1).max(255).default("Director's Cut"),
          description: z.string().max(2000).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return db.createFeatureCut(input.projectId, ctx.user.id, input.name, input.description);
        }),
      update: protectedProcedure
        .input(z.object({ id: z.number(), title: z.string().min(1).max(255).optional(), description: z.string().max(2000).optional(), targetRuntime: z.number().optional(), notes: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return db.updateFeatureCut(id, ctx.user.id, data);
        }),
      lock: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => { return db.lockFeatureCut(input.id, ctx.user.id); }),
      reopen: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => { return db.reopenFeatureCut(input.id, ctx.user.id); }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => { return db.deleteFeatureCut(input.id, ctx.user.id); }),
      listScenes: protectedProcedure
        .input(z.object({ cutId: z.number() }))
        .query(async ({ ctx, input }) => { return db.getCutScenes(input.cutId); }),
      addScene: protectedProcedure
        .input(z.object({ cutId: z.number(), sceneId: z.number(), orderIndex: z.number().optional() }))
        .mutation(async ({ ctx, input }) => { return db.addSceneToCut(input.cutId, input.sceneId, input.orderIndex ?? 0); }),
      removeScene: protectedProcedure
        .input(z.object({ cutId: z.number(), sceneId: z.number() }))
        .mutation(async ({ ctx, input }) => { return db.removeSceneFromCut(input.cutId, input.sceneId); }),
      toggleScene: protectedProcedure
        .input(z.object({ cutId: z.number(), sceneId: z.number(), included: z.boolean() }))
        .mutation(async ({ ctx, input }) => { return db.toggleSceneInclusion(input.cutId, input.sceneId, input.included); }),
      reorderScenes: protectedProcedure
        .input(z.object({ cutId: z.number(), sceneIds: z.array(z.number()) }))
        .mutation(async ({ ctx, input }) => { return db.reorderCutScenes(input.cutId, input.sceneIds); }),
      compile: protectedProcedure
        .input(z.object({ cutId: z.number(), format: z.string().optional() }))
        .mutation(async ({ ctx, input }) => { return db.createCompileJob(input.cutId, ctx.user.id, input.format ?? "mp4"); }),
      getCompileJob: protectedProcedure
        .input(z.object({ jobId: z.number() }))
        .query(async ({ ctx, input }) => { return db.getCompileJobById(input.jobId); }),
    }),
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Render Queue Bulk Operations ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  renderQueueBulk: router({
    run: protectedProcedure
      .input(z.object({ projectId: z.number(), action: z.enum(["pauseAll","resumeAll","retryFailed","clearDone","startAllQueued"]) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[RenderQueue]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        if (!arr?.[0]) return { changed: 0 };
        const data = JSON.parse((arr[0].content as string).replace(/^\[RenderQueue\]\s*\n?/, ""));
        let changed = 0;
        const jobs = (data.jobs || []).map((j: any) => {
          const before = j.status;
          if (input.action === "pauseAll" && (j.status === "queued" || j.status === "running")) j.status = "paused";
          else if (input.action === "resumeAll" && j.status === "paused") j.status = "queued";
          else if (input.action === "retryFailed" && j.status === "failed") j.status = "queued";
          else if (input.action === "clearDone" && (j.status === "done" || j.status === "skipped")) return null;
          else if (input.action === "startAllQueued" && j.status === "queued") j.status = "running";
          if (j && j.status !== before) changed++;
          return j;
        }).filter((x: any) => x !== null);
        const next = { ...data, jobs };
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[RenderQueue]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[RenderQueue]\n${JSON.stringify(next)}` });
        return { changed };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Collab: Presence (multi-user heartbeat for live collaboration) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  presence: router({
    heartbeat: protectedProcedure
      .input(z.object({ projectId: z.number(), tab: z.string().max(60).optional(), sceneId: z.number().nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return { ok: false };
        const tag = `[Presence@${ctx.user.id}]`;
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE ${tag + "%"}`);
        const payload = { userId: ctx.user.id, email: (ctx.user as any).email || null, tab: input.tab || null, sceneId: input.sceneId ?? null, ts: new Date().toISOString() };
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `${tag}\n${JSON.stringify(payload)}` });
        return { ok: true };
      }),
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const r: any = await dbConn.execute(sql`SELECT content, updatedAt FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Presence@%' AND updatedAt > NOW() - INTERVAL '45 SECONDS' ORDER BY updatedAt DESC`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        return (arr || []).map((row: any) => {
          try { return JSON.parse((row.content as string).replace(/^\[Presence@\d+\]\s*\n?/, "")); } catch { return null; }
        }).filter((x: any) => x !== null) as any[];
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Locks: director-locked scenes (block accidental regeneration) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  sceneLocks: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return [];
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        if (!arr?.[0]) return [];
        try { return JSON.parse((arr[0].content as string).replace(/^\[SceneLocks\]\s*\n?/, "")); } catch { return []; }
      }),
    toggle: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), locked: z.boolean(), reason: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        let locks: any[] = [];
        if (arr?.[0]) { try { locks = JSON.parse((arr[0].content as string).replace(/^\[SceneLocks\]\s*\n?/, "")) || []; } catch {} }
        const idx = locks.findIndex((x: any) => x.sceneId === input.sceneId);
        const entry = { sceneId: input.sceneId, locked: input.locked, reason: input.reason || null, lockedBy: (ctx.user as any).email || `user${ctx.user.id}`, lockedAt: new Date().toISOString() };
        if (idx >= 0) locks[idx] = entry; else locks.push(entry);
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[SceneLocks]\n${JSON.stringify(locks)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: 3-tier Approval Chain (director ÃÂ¢ÃÂÃÂ producer ÃÂ¢ÃÂÃÂ exec) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  approvals: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return {};
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Approvals]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        if (!arr?.[0]) return {};
        try { return JSON.parse((arr[0].content as string).replace(/^\[Approvals\]\s*\n?/, "")); } catch { return {}; }
      }),
    set: protectedProcedure
      .input(z.object({ projectId: z.number(), sceneId: z.number(), role: z.enum(["director","producer","exec"]), state: z.enum(["pending","approved","rejected"]), note: z.string().max(500).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Approvals]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        let approvals: any = {};
        if (arr?.[0]) { try { approvals = JSON.parse((arr[0].content as string).replace(/^\[Approvals\]\s*\n?/, "")) || {}; } catch {} }
        const sk = String(input.sceneId);
        if (!approvals[sk]) approvals[sk] = {};
        approvals[sk][input.role] = { state: input.state, note: input.note || null, by: (ctx.user as any).email || `user${ctx.user.id}`, at: new Date().toISOString() };
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Approvals]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[Approvals]\n${JSON.stringify(approvals)}` });
        // Auto-lock when all 3 roles approved
        const a = approvals[sk];
        const fullyApproved = a?.director?.state === "approved" && a?.producer?.state === "approved" && a?.exec?.state === "approved";
        if (fullyApproved) {
          const lr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%' ORDER BY updatedAt DESC LIMIT 1`);
          const larr = (Array.isArray(lr[0]) ? lr[0] : lr) as any[];
          let locks: any[] = [];
          if (larr?.[0]) { try { locks = JSON.parse((larr[0].content as string).replace(/^\[SceneLocks\]\s*\n?/, "")) || []; } catch {} }
          const idx = locks.findIndex((x: any) => x.sceneId === input.sceneId);
          const entry = { sceneId: input.sceneId, locked: true, reason: "fully approved (D+P+E)", lockedBy: "auto-approval-chain", lockedAt: new Date().toISOString() };
          if (idx >= 0) locks[idx] = entry; else locks.push(entry);
          await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%'`);
          await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[SceneLocks]\n${JSON.stringify(locks)}` });
        }
        return { success: true, autoLocked: fullyApproved };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Ops: Project Budget Tracker (config + actuals roll-up) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  studioBudget: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) return null;
        const r: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[StudioBudget]%' ORDER BY updatedAt DESC LIMIT 1`);
        const arr = (Array.isArray(r[0]) ? r[0] : r) as any[];
        let cfg: any = {
          totalBudget: 0,
          byStage: { development: 0, preProduction: 0, production: 0, postProduction: 0, distribution: 0 },
          contingencyPct: 10,
          // Industry savings benchmarks (configurable)
          tradCostPerScene: 5000,   // USD ÃÂ¢ÃÂÃÂ mid-range indie scene shoot
          tradHoursPerScene: 8,     // hours ÃÂ¢ÃÂÃÂ one production day per scene
          creditUsdRate: 0.05,      // USD per credit (used to convert AI spend to dollars)
        };
        if (arr?.[0]) { try { cfg = { ...cfg, ...JSON.parse((arr[0].content as string).replace(/^\[StudioBudget\]\s*\n?/, "")) }; } catch {} }
        // Roll up actuals from credit_transactions for this project
        let spentCredits = 0;
        try {
          const tx: any = await dbConn.execute(sql`SELECT COALESCE(SUM(amount), 0) AS total FROM credit_transactions WHERE projectId = ${input.projectId} AND amount < 0`);
          const txarr = (Array.isArray(tx[0]) ? tx[0] : tx) as any[];
          spentCredits = Math.abs(Number(txarr?.[0]?.total ?? 0));
        } catch {}
        const spentUsd = Math.round(spentCredits * cfg.creditUsdRate * 100) / 100;
        // Count rendered scenes for savings calc
        const scenes = await db.getProjectScenes(input.projectId);
        const renderedScenes = scenes.filter((s: any) => s.videoUrl).length;
        const tradEquivalentUsd = renderedScenes * cfg.tradCostPerScene;
        const tradEquivalentHours = renderedScenes * cfg.tradHoursPerScene;
        const moneySavedUsd = Math.max(0, tradEquivalentUsd - spentUsd);
        const timeSavedHours = tradEquivalentHours; // AI render time negligible vs shoot day
        const timeSavedDays = Math.round((timeSavedHours / 8) * 10) / 10;
        const savingsMultiplier = spentUsd > 0 ? Math.round((tradEquivalentUsd / spentUsd) * 10) / 10 : null;
        const variance = (cfg.totalBudget || 0) - spentUsd;
        const burnPct = cfg.totalBudget > 0 ? Math.round((spentUsd / cfg.totalBudget) * 100) : null;
        return {
          ...cfg,
          spentCredits, spentUsd, variance, burnPct,
          savings: { renderedScenes, tradEquivalentUsd, moneySavedUsd, timeSavedHours, timeSavedDays, savingsMultiplier },
        };
      }),
    set: protectedProcedure
      .input(z.object({ projectId: z.number(), totalBudget: z.number().min(0), byStage: z.object({ development: z.number().min(0), preProduction: z.number().min(0), production: z.number().min(0), postProduction: z.number().min(0), distribution: z.number().min(0) }), contingencyPct: z.number().min(0).max(100), tradCostPerScene: z.number().min(0).optional(), tradHoursPerScene: z.number().min(0).optional(), creditUsdRate: z.number().min(0).optional() }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb(); if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        await dbConn.execute(sql`DELETE FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[StudioBudget]%'`);
        await db.createChatMessage({ projectId: input.projectId, userId: ctx.user.id, role: "user", content: `[StudioBudget]\n${JSON.stringify(input)}` });
        return { success: true };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pro Dashboard: single-pane studio readiness summary ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  studioDashboard: router({
    summary: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        const scenes = await db.getProjectScenes(input.projectId);
        const totalScenes = scenes.length;
        const scenesWithVideo = scenes.filter((s: any) => s.videoUrl).length;
        let queueDepth = 0, running = 0, done = 0, failed = 0, paused = 0;
        let cap: any = null;
        let openComments = 0, resolvedComments = 0;
        let deliverablesReady = 0, deliverablesTotal = 0;
        let clearancesPending = 0, clearancesTotal = 0;
        let todaySpend = 0;
        let activeUsers = 0;
        if (dbConn) {
          // Render queue
          const qr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[RenderQueue]%' ORDER BY updatedAt DESC LIMIT 1`);
          const qarr = (Array.isArray(qr[0]) ? qr[0] : qr) as any[];
          if (qarr?.[0]) {
            try {
              const d = JSON.parse((qarr[0].content as string).replace(/^\[RenderQueue\]\s*\n?/, ""));
              cap = d.cap || null;
              for (const j of (d.jobs || [])) {
                if (j.status === "queued") queueDepth++;
                else if (j.status === "running") running++;
                else if (j.status === "done") done++;
                else if (j.status === "failed") failed++;
                else if (j.status === "paused") paused++;
              }
            } catch {}
          }
          // Frame comments
          const cr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[FrameComments@%'`);
          const carr = (Array.isArray(cr[0]) ? cr[0] : cr) as any[];
          for (const row of (carr || [])) {
            try {
              const list = JSON.parse((row.content as string).replace(/^\[FrameComments@\d+\]\s*\n?/, ""));
              for (const c of list) { if (c.status === "resolved") resolvedComments++; else openComments++; }
            } catch {}
          }
          // Deliverables
          const dr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Deliverables]%' ORDER BY updatedAt DESC LIMIT 1`);
          const darr = (Array.isArray(dr[0]) ? dr[0] : dr) as any[];
          if (darr?.[0]) {
            try {
              const list = JSON.parse((darr[0].content as string).replace(/^\[Deliverables\]\s*\n?/, ""));
              deliverablesTotal = list.length;
              deliverablesReady = list.filter((x: any) => x.status === "ready").length;
            } catch {}
          }
          // Clearances
          const clr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Clearances]%' ORDER BY updatedAt DESC LIMIT 1`);
          const clarr = (Array.isArray(clr[0]) ? clr[0] : clr) as any[];
          if (clarr?.[0]) {
            try {
              const list = JSON.parse((clarr[0].content as string).replace(/^\[Clearances\]\s*\n?/, ""));
              clearancesTotal = list.length;
              clearancesPending = list.filter((x: any) => x.status !== "cleared" && x.status !== "n/a").length;
            } catch {}
          }
          // Today's render spend (this user)
          const sr: any = await dbConn.execute(sql`SELECT COALESCE(SUM(-amount),0) AS spent FROM credit_transactions WHERE userId = ${ctx.user.id} AND amount < 0 AND action LIKE 'generate_%' AND createdAt > NOW() - INTERVAL '24 HOURS'`);
          const sarr = (Array.isArray(sr[0]) ? sr[0] : sr) as any[];
          todaySpend = Number(sarr?.[0]?.spent || 0);
          // Active users (last 45s)
          const ar: any = await dbConn.execute(sql`SELECT COUNT(DISTINCT content) AS n FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Presence@%' AND updatedAt > NOW() - INTERVAL '45 SECONDS'`);
          const aarr = (Array.isArray(ar[0]) ? ar[0] : ar) as any[];
          activeUsers = Number(aarr?.[0]?.n || 0);
        }
        const dailyCap = cap?.dailyCredits ?? null;
        const burnPct = dailyCap ? Math.min(100, Math.round((todaySpend / dailyCap) * 100)) : null;
        const readinessParts = [
          totalScenes > 0 ? scenesWithVideo / totalScenes : 0,
          deliverablesTotal > 0 ? deliverablesReady / deliverablesTotal : 0,
          clearancesTotal > 0 ? (clearancesTotal - clearancesPending) / clearancesTotal : 0,
          openComments === 0 ? 1 : Math.max(0, 1 - openComments / 20),
          failed === 0 ? 1 : 0.5,
        ];
        const readiness = Math.round((readinessParts.reduce((a, b) => a + b, 0) / readinessParts.length) * 100);
        // Forecast: scenes without video ÃÂÃÂ duration-scaled credit estimate
        const unrenderedScenes = scenes.filter((s: any) => !s.videoUrl);
        const forecastCredits = unrenderedScenes.reduce((sum: number, s: any) => {
          const dur = Math.max(10, s.duration || 45);
          const cr = dur <= 15 ? 3 : dur <= 45 ? 5 : dur <= 90 ? 7 : 10;
          return sum + cr;
        }, 0);
        // Locked scenes count
        let lockedScenes = 0;
        if (dbConn) {
          const lr: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[SceneLocks]%' ORDER BY updatedAt DESC LIMIT 1`);
          const larr = (Array.isArray(lr[0]) ? lr[0] : lr) as any[];
          if (larr?.[0]) {
            try { lockedScenes = (JSON.parse((larr[0].content as string).replace(/^\[SceneLocks\]\s*\n?/, "")) || []).filter((x: any) => x.locked).length; } catch {}
          }
        }
        // Approvals roll-up
        let approvalsRollup = { fullyApproved: 0, partial: 0, pending: totalScenes, rejected: 0 };
        if (dbConn) {
          const ar: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[Approvals]%' ORDER BY updatedAt DESC LIMIT 1`);
          const aarr = (Array.isArray(ar[0]) ? ar[0] : ar) as any[];
          if (aarr?.[0]) {
            try {
              const ap = JSON.parse((aarr[0].content as string).replace(/^\[Approvals\]\s*\n?/, "")) || {};
              let fa = 0, p = 0, rj = 0;
              for (const sk of Object.keys(ap)) {
                const a = ap[sk] || {};
                const states = ["director","producer","exec"].map(r => a[r]?.state);
                if (states.some(s => s === "rejected")) rj++;
                else if (states.every(s => s === "approved")) fa++;
                else if (states.some(s => s === "approved")) p++;
              }
              approvalsRollup = { fullyApproved: fa, partial: p, rejected: rj, pending: Math.max(0, totalScenes - fa - p - rj) };
            } catch {}
          }
        }
        // Savings roll-up ÃÂ¢ÃÂÃÂ mirror of studioBudget.get computation, lighter
        let savings: any = null;
        if (dbConn) {
          let cfg: any = { tradCostPerScene: 5000, tradHoursPerScene: 8, creditUsdRate: 0.05 };
          const br: any = await dbConn.execute(sql`SELECT content FROM directorChats WHERE projectId = ${input.projectId} AND content LIKE '[StudioBudget]%' ORDER BY updatedAt DESC LIMIT 1`);
          const barr = (Array.isArray(br[0]) ? br[0] : br) as any[];
          if (barr?.[0]) { try { cfg = { ...cfg, ...JSON.parse((barr[0].content as string).replace(/^\[StudioBudget\]\s*\n?/, "")) }; } catch {} }
          let spentCredits = 0;
          try {
            const tx: any = await dbConn.execute(sql`SELECT COALESCE(SUM(amount), 0) AS total FROM credit_transactions WHERE projectId = ${input.projectId} AND amount < 0`);
            const txarr = (Array.isArray(tx[0]) ? tx[0] : tx) as any[];
            spentCredits = Math.abs(Number(txarr?.[0]?.total ?? 0));
          } catch {}
          const spentUsd = Math.round(spentCredits * cfg.creditUsdRate * 100) / 100;
          const tradEquivalentUsd = scenesWithVideo * cfg.tradCostPerScene;
          const moneySavedUsd = Math.max(0, tradEquivalentUsd - spentUsd);
          const timeSavedDays = Math.round((scenesWithVideo * cfg.tradHoursPerScene / 8) * 10) / 10;
          const savingsMultiplier = spentUsd > 0 ? Math.round((tradEquivalentUsd / spentUsd) * 10) / 10 : null;
          savings = { renderedScenes: scenesWithVideo, spentUsd, tradEquivalentUsd, moneySavedUsd, timeSavedDays, savingsMultiplier };
        }
        return {
          scenes: { total: totalScenes, withVideo: scenesWithVideo, locked: lockedScenes },
          queue: { queued: queueDepth, running, done, failed, paused, cap },
          comments: { open: openComments, resolved: resolvedComments },
          deliverables: { ready: deliverablesReady, total: deliverablesTotal },
          clearances: { pending: clearancesPending, total: clearancesTotal },
          spend: { today: todaySpend, dailyCap, burnPct },
          forecast: { unrenderedScenes: unrenderedScenes.length, estimatedCredits: forecastCredits },
          approvals: approvalsRollup,
          savings,
          activeUsers,
          readiness,
        };
      }),
  }),

  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
  // v6.63 ÃÂ¢ÃÂÃÂ Production Spine
  // Schedule, call sheets, crew, approvals, shot lists, activity timeline.
  // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ

  shootDay: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listShootDays(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const day = await db.getShootDay(input.id);
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Shoot day not found" });
        await assertCanAccessProject((day as any).projectId, ctx.user.id);
        return day;
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        dayNumber: z.number().min(1).max(999).default(1),
        shootDate: z.string().optional().nullable(),
        callTime: z.string().max(16).optional().nullable(),
        wrapTime: z.string().max(16).optional().nullable(),
        locationId: z.number().nullable().optional(),
        weatherNote: z.string().max(255).optional().nullable(),
        hospitalInfo: z.string().max(2000).optional().nullable(),
        parkingInfo: z.string().max(2000).optional().nullable(),
        generalNotes: z.string().max(4000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const day = await db.createShootDay({
          projectId: input.projectId,
          userId: ctx.user.id,
          dayNumber: input.dayNumber,
          shootDate: input.shootDate ? new Date(input.shootDate) as any : null,
          callTime: input.callTime || null,
          wrapTime: input.wrapTime || null,
          locationId: input.locationId ?? null,
          weatherNote: input.weatherNote ? sanitizeText(input.weatherNote) : null,
          hospitalInfo: input.hospitalInfo ? sanitizeText(input.hospitalInfo) : null,
          parkingInfo: input.parkingInfo ? sanitizeText(input.parkingInfo) : null,
          generalNotes: input.generalNotes ? sanitizeText(input.generalNotes) : null,
        } as any);
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "shootday.create", { dayId: (day as any).id, dayNumber: input.dayNumber });
        return day;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        dayNumber: z.number().min(1).max(999).optional(),
        shootDate: z.string().nullable().optional(),
        callTime: z.string().max(16).nullable().optional(),
        wrapTime: z.string().max(16).nullable().optional(),
        locationId: z.number().nullable().optional(),
        weatherNote: z.string().max(255).nullable().optional(),
        hospitalInfo: z.string().max(2000).nullable().optional(),
        parkingInfo: z.string().max(2000).nullable().optional(),
        generalNotes: z.string().max(4000).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const day = await db.getShootDay(input.id);
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Shoot day not found" });
        await assertOwnsProject((day as any).projectId, ctx.user.id);
        const patch: any = {};
        if (input.dayNumber !== undefined) patch.dayNumber = input.dayNumber;
        if (input.shootDate !== undefined) patch.shootDate = input.shootDate ? new Date(input.shootDate) : null;
        if (input.callTime !== undefined) patch.callTime = input.callTime;
        if (input.wrapTime !== undefined) patch.wrapTime = input.wrapTime;
        if (input.locationId !== undefined) patch.locationId = input.locationId;
        if (input.weatherNote !== undefined) patch.weatherNote = input.weatherNote ? sanitizeText(input.weatherNote) : null;
        if (input.hospitalInfo !== undefined) patch.hospitalInfo = input.hospitalInfo ? sanitizeText(input.hospitalInfo) : null;
        if (input.parkingInfo !== undefined) patch.parkingInfo = input.parkingInfo ? sanitizeText(input.parkingInfo) : null;
        if (input.generalNotes !== undefined) patch.generalNotes = input.generalNotes ? sanitizeText(input.generalNotes) : null;
        const updated = await db.updateShootDay(input.id, patch);
        await db.logActivity((day as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "shootday.update", { dayId: input.id });
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const day = await db.getShootDay(input.id);
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Shoot day not found" });
        await assertOwnsProject((day as any).projectId, ctx.user.id);
        await db.deleteShootDay(input.id);
        await db.logActivity((day as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "shootday.delete", { dayId: input.id });
        return { success: true };
      }),

    assignScene: protectedProcedure
      .input(z.object({ sceneId: z.number(), shootDayId: z.number().nullable(), shootOrder: z.number().min(0).max(9999).default(0) }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getProjectSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertOwnsProject((scene as any).projectId, ctx.user.id);
        if (input.shootDayId !== null) {
          const day = await db.getShootDay(input.shootDayId);
          if (!day || (day as any).projectId !== (scene as any).projectId) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Shoot day does not belong to this project" });
          }
        }
        await db.assignSceneToShootDay(input.sceneId, input.shootDayId, input.shootOrder);
        await db.logActivity((scene as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "scene.shootday.assign", { sceneId: input.sceneId, shootDayId: input.shootDayId, shootOrder: input.shootOrder });
        return { success: true };
      }),
  }),

  crewContact: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listCrewContacts(input.projectId);
      }),

    create: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1).max(255),
        role: z.string().max(128).optional().nullable(),
        department: z.string().max(128).optional().nullable(),
        email: z.string().max(320).optional().nullable(),
        phone: z.string().max(64).optional().nullable(),
        callTimeOverride: z.string().max(16).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const created = await db.createCrewContact({
          projectId: input.projectId,
          userId: ctx.user.id,
          name: sanitizeText(input.name),
          role: input.role ? sanitizeText(input.role) : null,
          department: input.department ? sanitizeText(input.department) : null,
          email: input.email || null,
          phone: input.phone || null,
          callTimeOverride: input.callTimeOverride || null,
          notes: input.notes ? sanitizeText(input.notes) : null,
        } as any);
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "crew.create", { id: (created as any).id, name: input.name });
        return created;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        projectId: z.number(),
        name: z.string().min(1).max(255).optional(),
        role: z.string().max(128).nullable().optional(),
        department: z.string().max(128).nullable().optional(),
        email: z.string().max(320).nullable().optional(),
        phone: z.string().max(64).nullable().optional(),
        callTimeOverride: z.string().max(16).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const patch: any = {};
        if (input.name !== undefined) patch.name = sanitizeText(input.name);
        if (input.role !== undefined) patch.role = input.role ? sanitizeText(input.role) : null;
        if (input.department !== undefined) patch.department = input.department ? sanitizeText(input.department) : null;
        if (input.email !== undefined) patch.email = input.email;
        if (input.phone !== undefined) patch.phone = input.phone;
        if (input.callTimeOverride !== undefined) patch.callTimeOverride = input.callTimeOverride;
        if (input.notes !== undefined) patch.notes = input.notes ? sanitizeText(input.notes) : null;
        if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
        const updated = await db.updateCrewContact(input.id, patch);
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number(), projectId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        await db.deleteCrewContact(input.id);
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "crew.delete", { id: input.id });
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({ projectId: z.number(), orderedIds: z.array(z.number()).max(500) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        return db.reorderCrewContacts(input.projectId, input.orderedIds);
      }),
  }),

  // Aggregator: returns everything the call sheet print page needs in one query.
  callSheet: router({
    get: protectedProcedure
      .input(z.object({ shootDayId: z.number() }))
      .query(async ({ ctx, input }) => {
        const day = await db.getShootDay(input.shootDayId);
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Shoot day not found" });
        await assertCanAccessProject((day as any).projectId, ctx.user.id);
        const project = await db.getProjectById((day as any).projectId, ctx.user.id);
        const allScenes = await db.getProjectScenes((day as any).projectId);
        const dayScenes = allScenes
          .filter((s: any) => s.shootDayId === input.shootDayId)
          .sort((a: any, b: any) => (a.shootOrder ?? 0) - (b.shootOrder ?? 0));
        const characters = await db.getProjectCharacters((day as any).projectId);
        const charById = new Map(characters.map((c: any) => [c.id, c]));
        const usedCharIds = new Set<number>();
        for (const s of dayScenes) {
          for (const cid of (s.characterIds as number[] | null) || []) usedCharIds.add(cid);
        }
        const cast = Array.from(usedCharIds).map((id) => charById.get(id)).filter(Boolean);
        const crew = await db.listCrewContacts((day as any).projectId);
        let location: any = null;
        if ((day as any).locationId) {
          location = await db.getLocationById((day as any).locationId);
        }
        return { day, project, scenes: dayScenes, cast, crew, location };
      }),
  }),

  activity: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), limit: z.number().min(1).max(500).default(200) }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listActivityLog(input.projectId, input.limit);
      }),
  }),

  sceneApproval: router({
    set: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        status: z.enum(["pending", "approved", "changes_requested"]),
        note: z.string().max(2000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getProjectSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertCanAccessProject((scene as any).projectId, ctx.user.id);
        const cleanNote = input.note ? sanitizeText(input.note) : null;
        const prevStatus = (scene as any).approvalStatus || null;
        await db.setSceneApproval(input.sceneId, ctx.user.id, input.status, cleanNote);
        await db.logActivity((scene as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "scene.approval.set", { sceneId: input.sceneId, status: input.status, note: cleanNote });
        // v6.64 ÃÂ¢ÃÂÃÂ append signed chain entry
        const snapshot = JSON.stringify({ id: input.sceneId, title: (scene as any).title, description: (scene as any).description, videoUrl: (scene as any).videoUrl, shotList: (scene as any).shotList });
        await db.appendApprovalChain((scene as any).projectId, "scene", input.sceneId, prevStatus, input.status, ctx.user.id, ctx.user.name || ctx.user.email || null, cleanNote, snapshot);
        return { success: true };
      }),
  }),

  movieApproval: router({
    set: protectedProcedure
      .input(z.object({
        movieId: z.number(),
        status: z.enum(["pending", "approved", "changes_requested"]),
        note: z.string().max(2000).optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const movie = await db.getMovieByIdRaw(input.movieId);
        if (!movie) throw new TRPCError({ code: "NOT_FOUND", message: "Movie not found" });
        if ((movie as any).userId !== ctx.user.id) {
          // Allow project collaborators to mark approval too if movie has a project link.
          if ((movie as any).projectId) {
            await assertCanAccessProject((movie as any).projectId, ctx.user.id);
          } else {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
          }
        }
        const cleanNote = input.note ? sanitizeText(input.note) : null;
        const prevStatus = (movie as any).approvalStatus || null;
        await db.setMovieApproval(input.movieId, ctx.user.id, input.status, cleanNote);
        if ((movie as any).projectId) {
          await db.logActivity((movie as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "movie.approval.set", { movieId: input.movieId, status: input.status, note: cleanNote });
          // v6.64 ÃÂ¢ÃÂÃÂ append signed chain entry
          const snapshot = JSON.stringify({ id: input.movieId, title: (movie as any).title, prompt: (movie as any).prompt, videoUrl: (movie as any).videoUrl });
          await db.appendApprovalChain((movie as any).projectId, "movie", input.movieId, prevStatus, input.status, ctx.user.id, ctx.user.name || ctx.user.email || null, cleanNote, snapshot);
        }
        return { success: true };
      }),
  }),

  sceneShotList: router({
    save: protectedProcedure
      .input(z.object({
        sceneId: z.number(),
        shotList: z.array(z.object({
          number: z.union([z.string().max(16), z.number()]),
          shotType: z.string().max(64).optional(),
          lens: z.string().max(64).optional(),
          movement: z.string().max(64).optional(),
          framing: z.string().max(64).optional(),
          notes: z.string().max(1000).optional(),
          durationSec: z.number().min(0).max(7200).optional(),
        })).max(200),
      }))
      .mutation(async ({ ctx, input }) => {
        const scene = await db.getProjectSceneById(input.sceneId);
        if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
        await assertOwnsProject((scene as any).projectId, ctx.user.id);
        const cleaned = input.shotList.map((s) => ({
          ...s,
          notes: s.notes ? sanitizeText(s.notes) : undefined,
        }));
        await db.updateSceneShotList(input.sceneId, cleaned);
        await db.logActivity((scene as any).projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "scene.shotlist.update", { sceneId: input.sceneId, count: cleaned.length });
        return { success: true };
      }),
  }),

  // Manual budget editing on top of the AI-generated breakdown stored on the
  // existing `budgets` table. (The `budget` router above only exposes generate,
  // setActuals, and AI helpers ÃÂ¢ÃÂÃÂ this adds direct breakdown editing so users
  // can build a budget from scratch without an AI call.)
  budgetManual: router({
    upsert: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        currency: z.string().max(8).default("USD"),
        breakdown: z.record(z.string(), z.object({
          label: z.string().max(120),
          estimate: z.number().min(0),
          actual: z.number().min(0).optional(),
          items: z.array(z.object({
            name: z.string().max(255),
            cost: z.number().min(0),
            notes: z.string().max(1000).optional(),
          })).max(200).optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const dbConn = await db.getDb();
        if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const totalEstimate = Object.values(input.breakdown).reduce(
          (sum: number, c: any) => sum + (typeof c?.estimate === "number" ? c.estimate : 0),
          0,
        );
        // Find existing budget for this project (one row per project convention)
        const existing = await db.getProjectBudgets(input.projectId);
        if (existing && existing.length > 0) {
          const id = (existing[0] as any).id;
          await dbConn.execute(
            sql`UPDATE budgets SET breakdown = ${JSON.stringify(input.breakdown)}, totalEstimate = ${totalEstimate}, currency = ${input.currency} WHERE id = ${id}`,
          );
        } else {
          await dbConn.execute(
            sql`INSERT INTO budgets (projectId, userId, totalEstimate, currency, breakdown, generatedAt) VALUES (${input.projectId}, ${ctx.user.id}, ${totalEstimate}, ${input.currency}, ${JSON.stringify(input.breakdown)}, NOW())`,
          );
        }
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "budget.update", { totalEstimate, currency: input.currency });
        return { success: true, totalEstimate };
      }),
  }),

  // ============================================================================
  // v6.64 ÃÂ¢ÃÂÃÂ Signed approval chain (read + verify)
  // ============================================================================
  approvalChain: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), kind: z.enum(["scene", "movie"]).optional(), entityId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listApprovalChain(input.projectId, input.kind, input.entityId);
      }),
    verify: protectedProcedure
      .input(z.object({ projectId: z.number(), kind: z.enum(["scene", "movie"]), entityId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.verifyApprovalChain(input.projectId, input.kind, input.entityId);
      }),
  }),

  // ============================================================================
  // v6.64 ÃÂ¢ÃÂÃÂ Asset version history
  // ============================================================================
  assetVersion: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), ownerKind: z.string().max(32), ownerId: z.number(), fieldName: z.string().max(64).optional() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listAssetVersions(input.projectId, input.ownerKind, input.ownerId, input.fieldName);
      }),
    record: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        ownerKind: z.string().max(32),
        ownerId: z.number(),
        fieldName: z.string().max(64),
        url: z.string().url(),
        label: z.string().max(255).optional(),
        mimeType: z.string().max(128).optional(),
        sizeBytes: z.number().optional(),
        notes: z.string().max(1000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.recordAssetVersion({
          projectId: input.projectId,
          ownerKind: input.ownerKind,
          ownerId: input.ownerId,
          fieldName: input.fieldName,
          label: input.label ? sanitizeText(input.label) : null,
          url: input.url,
          mimeType: input.mimeType || null,
          sizeBytes: input.sizeBytes ?? null,
          notes: input.notes ? sanitizeText(input.notes) : null,
          createdBy: ctx.user.id,
          createdByName: ctx.user.name || ctx.user.email || null,
        } as any);
      }),
    delete: protectedProcedure
      .input(z.object({ projectId: z.number(), id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.deleteAssetVersion(input.id);
      }),
  }),

  // ============================================================================
  // v6.64 ÃÂ¢ÃÂÃÂ Collaborator list (admin/visibility ÃÂ¢ÃÂÃÂ invite/remove already on
  // collaboration router). This is a thin read-only convenience wrapper.
  // ============================================================================
  collaboratorView: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        return db.listCollaboratorsByProject(input.projectId);
      }),
  }),

  // ============================================================================
  // v6.64 ÃÂ¢ÃÂÃÂ Fountain / FDX script import + export (named scriptIO to avoid
  // collision with the v6.0 `script` router which manages script documents).
  // ============================================================================
  scriptIO: router({
    importFountain: protectedProcedure
      .input(z.object({ projectId: z.number(), text: z.string().max(2_000_000), commit: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const { parseFountain } = await import("./_core/scriptFormats");
        const parsed = parseFountain(input.text);
        if (!input.commit) return { preview: parsed.slice(0, 50), total: parsed.length, committed: false };
        // Commit: create scenes
        let created = 0;
        for (const s of parsed) {
          await db.createScene({
            projectId: input.projectId,
            userId: ctx.user.id,
            title: sanitizeText(s.heading).slice(0, 240),
            description: sanitizeText(s.description || "").slice(0, 4000),
            intExt: s.intExt || null,
            location: s.location ? sanitizeText(s.location).slice(0, 240) : null,
            timeOfDay: s.timeOfDay ? sanitizeText(s.timeOfDay).slice(0, 80) : null,
          } as any);
          created++;
        }
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "script.import.fountain", { count: created });
        return { committed: true, created, total: parsed.length };
      }),
    importFDX: protectedProcedure
      .input(z.object({ projectId: z.number(), xml: z.string().max(4_000_000), commit: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const { parseFDX } = await import("./_core/scriptFormats");
        const parsed = parseFDX(input.xml);
        if (!input.commit) return { preview: parsed.slice(0, 50), total: parsed.length, committed: false };
        let created = 0;
        for (const s of parsed) {
          await db.createScene({
            projectId: input.projectId,
            userId: ctx.user.id,
            title: sanitizeText(s.heading).slice(0, 240),
            description: sanitizeText(s.description || "").slice(0, 4000),
            intExt: s.intExt || null,
            location: s.location ? sanitizeText(s.location).slice(0, 240) : null,
            timeOfDay: s.timeOfDay ? sanitizeText(s.timeOfDay).slice(0, 80) : null,
          } as any);
          created++;
        }
        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "script.import.fdx", { count: created });
        return { committed: true, created, total: parsed.length };
      }),
    exportFountain: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const project = await db.getProjectByIdRaw(input.projectId);
        const scenes = await db.getProjectScenes(input.projectId);
        const { exportFountain } = await import("./_core/scriptFormats");
        return { text: exportFountain(scenes as any, (project as any)?.title), count: scenes.length };
      }),
    iCalUrl: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const { createHmac } = await import("crypto");
        const secret = process.env.SESSION_SECRET || "";
        if (!secret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Calendar feed unavailable" });
        const token = createHmac("sha256", secret).update(`ical:${input.projectId}`).digest("hex").slice(0, 32);
        const base = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "";
        return {
          path: `/api/ical/${input.projectId}.ics?token=${token}`,
          url: `${base}/api/ical/${input.projectId}.ics?token=${token}`,
          webcal: `${base.replace(/^https?:/, "webcal:")}/api/ical/${input.projectId}.ics?token=${token}`,
        };
      }),
    exportFDX: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const project = await db.getProjectByIdRaw(input.projectId);
        const scenes = await db.getProjectScenes(input.projectId);
        const { exportFDX } = await import("./_core/scriptFormats");
        return { xml: exportFDX(scenes as any, (project as any)?.title || "Untitled"), count: scenes.length };
      }),
  }),

  // ============================================================================
  // v6.66 + v6.67 ÃÂ¢ÃÂÃÂ Auto Recap ("Previously On" generator for episodic projects).
  // Maps episode ÃÂ¢ÃÂÃÂ movie of type "film" inside a project where
  // actStructure="episodic". Generates outline + beats + voiceover script via
  // OpenAI; segment selection from movie metadata. Charges credits only on
  // successful AI completion.
  // ============================================================================
  recap: router({
    estimate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        targetMovieId: z.number(),
        sourceMovieIds: z.array(z.number()).min(1),
        lengthSeconds: z.union([z.literal(60), z.literal(90), z.literal(120)]).default(90),
        style: z.enum(["cinematic", "suspenseful", "fast-cut", "emotional", "minimal"]).default("cinematic"),
        resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
        includeVoiceover: z.boolean().default(false),
        includeSubtitles: z.boolean().default(true),
        includeOpeningCredits: z.boolean().default(false),
        overlayCreditsOnRecap: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        await assertCanAccessProject(input.projectId, ctx.user.id);
        const project = await db.getProjectByIdRaw(input.projectId);
        const isEpisodic = (project as any)?.actStructure === "episodic";
        const breakdown = {
          analysis: 5,
          script: 4,
          clipSelection: 8,
          subtitles: input.includeSubtitles ? 3 : 0,
          voiceover: input.includeVoiceover ? 8 : 0,
          openingCreditsOverlay: (input.includeOpeningCredits || input.overlayCreditsOnRecap) ? 5 : 0,
          render: input.resolution === "4k" ? 40 : input.resolution === "1080p" ? 18 : 10,
          discount: 0,
        };
        let subtotal =
          breakdown.analysis + breakdown.script + breakdown.clipSelection +
          breakdown.subtitles + breakdown.voiceover +
          breakdown.openingCreditsOverlay + breakdown.render;
        if (input.sourceMovieIds.length > 1) subtotal = Math.ceil(subtotal * 1.25);
        // v6.67 ÃÂ¢ÃÂÃÂ apply membership tier discount per upgrade-kit policy.
        const { creditDiscountForTier } = await import("./_core/providerPolicy");
        const discountPct = creditDiscountForTier(ctx.user.subscriptionTier);
        const discountAmount = discountPct > 0 ? Math.ceil(subtotal * (discountPct / 100)) : 0;
        breakdown.discount = discountAmount;
        const total = Math.max(0, subtotal - discountAmount);
        const balance = await db.getCreditBalance(ctx.user.id);
        return {
          allowed: isEpisodic,
          isEpisodic,
          estimatedCost: { total, breakdown },
          membershipLimit: { maxLengthSeconds: 120, maxResolution: "1080p", watermarkRequired: false },
          hasEnoughCredits: balance >= total,
          creditBalance: balance,
          tierDiscountPercentage: discountPct,
        };
      }),

    generate: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        targetMovieId: z.number(),
        sourceMovieIds: z.array(z.number()).min(1),
        lengthSeconds: z.union([z.literal(60), z.literal(90), z.literal(120)]).default(90),
        style: z.enum(["cinematic", "suspenseful", "fast-cut", "emotional", "minimal"]).default("cinematic"),
        resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
        includeVoiceover: z.boolean().default(false),
        includeSubtitles: z.boolean().default(true),
        includeOpeningCredits: z.boolean().default(false),
        overlayCreditsOnRecap: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        await assertOwnsProject(input.projectId, ctx.user.id);
        const project = await db.getProjectByIdRaw(input.projectId);
        if ((project as any)?.actStructure !== "episodic") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Auto Recap is only available for episodic projects." });
        }
        const existing = await db.findActiveRecap(ctx.user.id, input.projectId, input.targetMovieId);
        if (existing) return { recapId: existing.id, status: existing.status, reused: true };

        const all = await db.listMoviesByProject(input.projectId, ctx.user.id);
        const target = all.find((m: any) => m.id === input.targetMovieId);
        const sources = input.sourceMovieIds.map((id: number) => all.find((m: any) => m.id === id)).filter(Boolean);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Target episode not found." });
        if (sources.length !== input.sourceMovieIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "One or more source episodes were not found." });
        }
        const missingVideo = sources.find((s: any) => !s.fileUrl);
        if (missingVideo) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A source episode video is required before generating an Auto Recap." });
        }

        const breakdownCost = (() => {
          let s = 5 + 4 + 8 + (input.includeSubtitles ? 3 : 0) + (input.includeVoiceover ? 8 : 0) +
            ((input.includeOpeningCredits || input.overlayCreditsOnRecap) ? 5 : 0) +
            (input.resolution === "4k" ? 40 : input.resolution === "1080p" ? 18 : 10);
          if (input.sourceMovieIds.length > 1) s = Math.ceil(s * 1.25);
          return s;
        })();
        const balance = await db.getCreditBalance(ctx.user.id);
        if (balance < breakdownCost) {
          throw new TRPCError({ code: "FORBIDDEN", message: `You need ${breakdownCost - balance} more credits to generate this recap.` });
        }

        const recap = await db.createRecap({
          userId: ctx.user.id,
          projectId: input.projectId,
          targetMovieId: input.targetMovieId,
          sourceMovieIds: input.sourceMovieIds as any,
          lengthSeconds: input.lengthSeconds,
          style: input.style,
          resolution: input.resolution,
          includeVoiceover: input.includeVoiceover,
          includeSubtitles: input.includeSubtitles,
          includeOpeningCredits: input.includeOpeningCredits,
          overlayCreditsOnRecap: input.overlayCreditsOnRecap,
          status: "analyzing",
          progress: 10,
          creditCost: breakdownCost,
        });
        if (!recap) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create recap." });

        // Run synchronously ÃÂ¢ÃÂÃÂ Virelle's pattern. Wrap in try so failures roll back.
        try {
          await db.updateRecap(recap.id, ctx.user.id, { status: "selecting_clips", progress: 35 });

          // Build prompt context from cached movie metadata.
          const sourceLines = sources.map((s: any, i: number) =>
            `EPISODE ${i + 1}: "${s.title}"\n  Duration: ${s.duration ?? "unknown"}s\n  Description: ${s.description || "(no description)"}`
          ).join("\n\n");

          const prompt = `You are creating a short "Previously On" recap for an episodic film/TV project.

Style: ${input.style}
Target duration: ${input.lengthSeconds} seconds
Number of beats: ${input.lengthSeconds <= 60 ? "5-7" : input.lengthSeconds <= 90 ? "7-10" : "9-12"}

Use only the provided source episode metadata. Prioritize plot-critical events,
character decisions, conflicts, reveals, and cliffhangers. Do not invent scenes.

SOURCE EPISODES:
${sourceLines}

TARGET EPISODE (do NOT spoil): "${target.title}"
${target.description ? `Target description: ${target.description}` : ""}

Return JSON ONLY in this exact shape:
{
  "title": "Previously On",
  "targetDurationSeconds": ${input.lengthSeconds},
  "summary": "short recap summary (1-2 sentences)",
  "beats": [
    {
      "order": number,
      "sourceMovieId": number (one of [${input.sourceMovieIds.join(", ")}]),
      "description": "what happens in this beat",
      "preferredTimestampStart": number (seconds into source),
      "preferredTimestampEnd": number,
      "caption": "optional subtitle, <= 60 chars",
      "importance": "high" | "medium" | "low"
    }
  ]${input.includeVoiceover ? ',\n  "voiceoverScript": "narration script, ~150 words per minute"' : ""}
}`;

          let outline: any = null;
          const apiKey = process.env.OPENAI_API_KEY;
          if (apiKey) {
            try {
              const { default: OpenAI } = await import("openai");
              const client = new OpenAI({ apiKey });
              const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  { role: "system", content: "You write concise structured recap outlines. Return ONLY valid JSON." },
                  { role: "user", content: prompt },
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
                max_tokens: 1500,
              });
              const raw = completion.choices?.[0]?.message?.content || "{}";
              outline = JSON.parse(raw);
            } catch (e: any) {
              throw new Error(`AI outline generation failed: ${e?.message || "unknown error"}`);
            }
          } else {
            // Deterministic fallback when no API key ÃÂ¢ÃÂÃÂ still produces a usable recap from metadata.
            const beats = sources.map((s: any, i: number) => ({
              order: i + 1,
              sourceMovieId: s.id,
              description: s.description ? s.description.slice(0, 200) : `Events from ${s.title}`,
              preferredTimestampStart: 0,
              preferredTimestampEnd: Math.min(s.duration || 12, 12),
              caption: s.title,
              importance: "high" as const,
            }));
            outline = {
              title: "Previously On",
              targetDurationSeconds: input.lengthSeconds,
              summary: `Previously, in ${sources.length} episode${sources.length === 1 ? "" : "s"}.`,
              beats,
              voiceoverScript: input.includeVoiceover ? `Previously on ${(project as any)?.title || "the show"}.` : undefined,
            };
          }

          // v6.70 ÃÂ¢ÃÂÃÂ Honest status. We are about to persist the outline+segments
          // but no MP4 has been rendered. Was previously "rendering" which
          // implied an active MP4 render that does not exist yet.
          // v6.71 ÃÂ¢ÃÂÃÂ Renamed from "render_pending" to "outline_pending" to
          // avoid collision with the live MP4 render state introduced in
          // recap.renderMp4. This intermediate state is brief (one update
          // away from "outline_completed") and will rarely be observed.
          await db.updateRecap(recap.id, ctx.user.id, { status: "outline_pending", progress: 75, outline: outline as any, voiceoverScript: outline?.voiceoverScript || null });

          // Persist segments
          const beats: any[] = Array.isArray(outline?.beats) ? outline.beats : [];
          if (beats.length) {
            await db.insertRecapSegments(beats.map((b: any, i: number) => ({
              recapId: recap.id,
              sourceMovieId: Number(b.sourceMovieId) || sources[0].id,
              startTimeSeconds: Number(b.preferredTimestampStart) || 0,
              endTimeSeconds: Number(b.preferredTimestampEnd) || (Number(b.preferredTimestampStart) || 0) + 8,
              sortOrder: Number(b.order) || (i + 1),
              caption: b.caption || null,
              reason: b.description || null,
            })));
          }

          // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ Atomic reservation. reserveCredits deducts the
          // breakdownCost up front, then we finalize on success. Failure path
          // releases the reservation so the user is refunded automatically.
          let __recapResId: number | null = null;
          try {
            __recapResId = await db.reserveCredits(
              ctx.user.id,
              breakdownCost,
              "auto_recap",
              { projectId: input.projectId, referenceType: "recap", referenceId: recap.id },
            );
          } catch (e: any) {
            if (e?.message?.includes("INSUFFICIENT_CREDITS")) {
              throw new TRPCError({ code: "FORBIDDEN", message: e.message });
            }
            throw e;
          }
          if (__recapResId) {
            try { await db.finalizeReservation(__recapResId); } catch {}
          }

          // v6.70 ÃÂ¢ÃÂÃÂ Honest terminal status. The outline + voiceover script +
          // segment list are saved but NO final MP4 has been rendered. We
          // mark this as "outline_completed" so the UI can label it
          // "Recap outline ready" instead of "Final recap video ready". A
          // future MP4 render pass will move this to "render_completed" once
          // outputAssetId/fileUrl is populated. See
          // docs/AUTO_RECAP_MP4_RENDER_PLAN.md for the planned render flow.
          await db.updateRecap(recap.id, ctx.user.id, { status: "outline_completed", progress: 100 });
          await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "recap.generate", { recapId: recap.id, lengthSeconds: input.lengthSeconds, beatCount: beats.length });

          return { recapId: recap.id, status: "outline_completed" as const, reused: false };
        } catch (err: any) {
          await db.updateRecap(recap.id, ctx.user.id, { status: "failed", progress: 0, errorMessage: err?.message || "unknown error" });
          // v6.69 Phase 5 ÃÂ¢ÃÂÃÂ If we managed to create a reservation before the
          // failure, refund it. Look up by referenceType/referenceId since the
          // local variable may be out of scope here.
          try {
            const stale = await db.getActiveReservation(ctx.user.id, "recap", recap.id);
            if (stale && stale.id) await db.releaseReservation(stale.id);
          } catch {}
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Auto Recap generation failed: ${err?.message || "unknown"}. No credits were charged.` });
        }
      }),

    get: protectedProcedure
      .input(z.object({ recapId: z.number() }))
      .query(async ({ ctx, input }) => {
        const recap = await db.getRecapById(input.recapId, ctx.user.id);
        if (!recap) throw new TRPCError({ code: "NOT_FOUND", message: "Recap not found." });
        const segments = await db.listRecapSegments(input.recapId);
        return { recap, segments };
      }),

    listForMovie: protectedProcedure
      .input(z.object({ movieId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.listRecapsForMovie(input.movieId, ctx.user.id);
      }),

    // v6.67 ÃÂ¢ÃÂÃÂ attach a completed recap to its target episode so the project
    // surface knows which recap to play before the episode starts.
    attach: protectedProcedure
      .input(z.object({ recapId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const recap = await db.getRecapById(input.recapId, ctx.user.id);
        if (!recap) throw new TRPCError({ code: "NOT_FOUND", message: "Recap not found." });
        // v6.70 ÃÂ¢ÃÂÃÂ Accept any of the legacy "completed" value (older rows)
        // and the new honest "outline_completed" / "render_completed" values.
        const ready = recap.status === "completed" || recap.status === "outline_completed" || recap.status === "render_completed";
        if (!ready) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Recap is not ready to attach yet." });
        }
        await db.attachRecap(input.recapId, ctx.user.id);
        await db.logActivity(recap.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "recap.attach", { recapId: input.recapId, targetMovieId: recap.targetMovieId });
        return { success: true };
      }),

    unattach: protectedProcedure
      .input(z.object({ recapId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const recap = await db.getRecapById(input.recapId, ctx.user.id);
        if (!recap) throw new TRPCError({ code: "NOT_FOUND", message: "Recap not found." });
        await db.unattachRecap(input.recapId, ctx.user.id);
        return { success: true };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // v6.71 ÃÂ¢ÃÂÃÂ Render the final MP4 for an Auto Recap.
    //
    // Reserves the `recap_render` credit, flips the recap to
    // `render_pending`, and fires the background renderer
    // (server/_core/recapRenderer.ts). The renderer finalizes the
    // reservation on success and releases on failure (same pattern as
    // v6.70 scene-video). The mutation itself returns immediately so the
    // UI can poll for status.
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    renderMp4: creationProcedure
      .input(z.object({ recapId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        // Auth + ownership.
        const recap: any = await db.getRecapById(input.recapId, ctx.user.id);
        if (!recap) throw new TRPCError({ code: "NOT_FOUND", message: "Recap not found." });

        // Status gate. Only allow rendering from a settled outline state.
        // Legacy "completed" rows are allowed if no asset has been attached.
        const hasAsset = !!recap.fileUrl || !!recap.outputAssetId;
        const eligible =
          recap.status === "outline_completed" ||
          (recap.status === "completed" && !hasAsset);
        if (!eligible) {
          if (recap.status === "render_pending") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "A render is already in progress for this recap." });
          }
          if (recap.status === "render_completed" || hasAsset) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "This recap already has a final MP4." });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: `Recap is not ready to render (status: ${recap.status}).` });
        }

        // Must have at least one segment to cut.
        const segments = await db.listRecapSegments(input.recapId);
        if (!segments.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Recap has no segments to render." });
        }

        // Dedupe duplicate clicks via the existing reservation lookup.
        const existing = await db.getActiveReservation(ctx.user.id, "recap_render", input.recapId);
        if (existing && existing.id) {
          // Same-click protection: just kick the recap into render_pending
          // (if it isn't already) and return the existing reservation.
          if (recap.status !== "render_pending") {
            await db.updateRecap(input.recapId, ctx.user.id, { status: "render_pending", progress: 0, errorMessage: null as any } as any);
          }
          return { recapId: input.recapId, status: "render_pending" as const, reservationId: existing.id, reused: true };
        }

        // Reserve credits. reserveCredits throws INSUFFICIENT_CREDITS which
        // we surface as a clean tRPC error. It returns Promise<number | null>
        // so we explicitly guard the null path (e.g. when the DB is offline).
        const { CREDIT_COSTS } = await import("./_core/subscription");
        const cost = CREDIT_COSTS.recap_render?.cost ?? 20;
        let resId: number | null;
        try {
          resId = await db.reserveCredits(
            ctx.user.id,
            cost,
            "recap_render",
            { projectId: recap.projectId, referenceType: "recap_render", referenceId: input.recapId },
          );
        } catch (e: any) {
          if (e?.message?.includes("INSUFFICIENT_CREDITS")) {
            throw new TRPCError({ code: "FORBIDDEN", message: e.message });
          }
          throw e;
        }
        if (!resId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not reserve credits for the render." });
        }
        const reservationId: number = resId;

        // Flip to render_pending so the UI can poll honestly.
        await db.updateRecap(input.recapId, ctx.user.id, {
          status: "render_pending",
          progress: 0,
          errorMessage: null as any,
        } as any);

        // Fire the background renderer. Never await ÃÂ¢ÃÂÃÂ the worker manages its
        // own lifecycle (finalize on success, release on failure, status
        // revert on failure).
        (async () => {
          try {
            const { renderRecapMp4 } = await import("./_core/recapRenderer");
            await renderRecapMp4({ recapId: input.recapId, reservationId, userId: ctx.user.id });
          } catch (err: any) {
            // renderRecapMp4 swallows its own errors, but guard the dynamic
            // import too so a bad import never leaves the recap stuck.
            logger.error(`[recap.renderMp4] background dispatch failed for recap ${input.recapId}: ${err?.message ?? ""}`);
            try {
              await db.updateRecap(input.recapId, ctx.user.id, { status: "outline_completed", errorMessage: err?.message || "Render dispatch failed." } as any);
            } catch {}
            try { await db.releaseReservation(reservationId); } catch {}
          }
        })();

        await db.logActivity(recap.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "recap.renderMp4", { recapId: input.recapId, segmentCount: segments.length });

        return { recapId: input.recapId, status: "render_pending" as const, reservationId, reused: false };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // v6.72 ÃÂ¢ÃÂÃÂ Cancel an in-flight MP4 render.
    //
    // The renderer is fire-and-forget so we cannot kill the ffmpeg process
    // from here ÃÂ¢ÃÂÃÂ but we *can* refund the user immediately, mark the recap
    // as outline_completed, and the worker's safeFail path will simply find
    // an already-released reservation when it tries to release on its own
    // (releaseReservation is gated on status='reserved' so the second call
    // is a no-op). Same goes for finalizeReservation if the render somehow
    // finishes after cancel ÃÂ¢ÃÂÃÂ the recap status will already be back to
    // outline_completed and the credits will already be refunded.
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    cancelRender: protectedProcedure
      .input(z.object({ recapId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const recap: any = await db.getRecapById(input.recapId, ctx.user.id);
        if (!recap) throw new TRPCError({ code: "NOT_FOUND", message: "Recap not found." });
        if (recap.status !== "render_pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot cancel a recap in status "${recap.status}".` });
        }

        // Find + release the active reservation (if any).
        let releasedReservationId: number | null = null;
        try {
          const existing = await db.getActiveReservation(ctx.user.id, "recap_render", input.recapId);
          if (existing && existing.id) {
            releasedReservationId = existing.id;
            try { await db.releaseReservation(existing.id); } catch (e: any) {
              logger.warn(`[recap.cancelRender] release reservation ${existing.id} failed: ${e?.message}`);
            }
          }
        } catch (e: any) {
          logger.warn(`[recap.cancelRender] reservation lookup failed for recap ${input.recapId}: ${e?.message}`);
        }

        // Revert recap to the settled outline state with a clear message.
        await db.updateRecap(input.recapId, ctx.user.id, {
          status: "outline_completed",
          errorMessage: "Render cancelled by user. Credits were released; you can retry the render.",
        } as any);

        await db.logActivity(recap.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null, "recap.cancelRender", { recapId: input.recapId, releasedReservationId });

        return { success: true, releasedReservationId };
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // v6.72 ÃÂ¢ÃÂÃÂ Admin/dev diagnostic. Releases reservations and reverts
    // recaps stuck in `render_pending` for more than `olderThanMinutes`
    // (default 30). `dryRun` reports what *would* happen without mutating.
    //
    // Admin-only ÃÂ¢ÃÂÃÂ normal users use `cancelRender` for their own recaps.
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    sweepStuckRenders: adminProcedure
      .input(z.object({
        olderThanMinutes: z.number().int().positive().max(60 * 24 * 7).optional(),
        dryRun: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sweepStuckRecapRenders } = await import("./_core/recapRenderSweeper");
        return await sweepStuckRecapRenders({
          olderThanMinutes: input.olderThanMinutes,
          dryRun: input.dryRun,
        });
      }),
  }),

  // ============================================================================
  // v6.69 Phase 3 ÃÂ¢ÃÂÃÂ Script-to-Storyboard breakdown wizard.
  // Two procedures: analyze (returns proposal, NO writes) + apply (creates
  // scenes only after the user has explicitly approved).
  // ============================================================================
  preproduction: router({
    analyzeScriptForBreakdown: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        script: z.string().min(40).max(120000),
        maxScenes: z.number().min(1).max(80).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Confirm the user owns the project before doing anything.
        const project: any = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        const { analyzeScript } = await import("./_core/scriptBreakdown");
        return analyzeScript(ctx.user.id, input.script, { maxScenes: input.maxScenes });
      }),

    applyBreakdownToProject: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        // v6.73 ÃÂ¢ÃÂÃÂ append (default, safe) or replace (destructive, requires
        // explicit confirmReplace flag set by the wizard's UI prompt).
        mode: z.enum(["append", "replace"]).optional(),
        confirmReplace: z.boolean().optional(),
        scenes: z.array(z.object({
          sceneNumber: z.number(),
          title: z.string().max(200),
          description: z.string().max(1500),
          location: z.string().max(200).nullable().optional(),
          timeOfDay: z.enum(["dawn","morning","afternoon","evening","night","golden-hour"]).nullable().optional(),
          mood: z.string().max(120).nullable().optional(),
          characters: z.array(z.string().max(80)).optional(),
          estimatedDuration: z.number().min(5).max(600).optional(),
          // v6.74 ÃÂ¢ÃÂÃÂ new richer per-scene fields. All optional so old wizard
          // payloads still validate. The mutation lower down packs these
          // into existing scene columns (props/shotList/continuityNotes/
          // dialogueText) ÃÂ¢ÃÂÃÂ no new tables, no new columns required.
          dialogue: z.string().max(4000).nullable().optional(),
          props: z.array(z.string().max(120)).max(40).optional(),
          shotSuggestions: z.array(z.object({
            shotType: z.string().max(64).nullable().optional(),
            lens: z.string().max(128).nullable().optional(),
            movement: z.string().max(128).nullable().optional(),
            framing: z.string().max(64).nullable().optional(),
            notes: z.string().max(400).nullable().optional(),
            durationSec: z.number().min(1).max(600).nullable().optional(),
          })).max(10).optional(),
          continuityNotes: z.string().max(1500).nullable().optional(),
        })).min(1).max(80),
        // v6.74 ÃÂ¢ÃÂÃÂ top-level entities. The wizard can pass these so we create
        // characters and locations alongside scenes. They're optional ÃÂ¢ÃÂÃÂ when
        // omitted, we behave exactly like v6.73 (count only, no creation).
        characters: z.array(z.object({
          name: z.string().max(128),
          role: z.string().max(128).nullable().optional(),
          description: z.string().max(1500).nullable().optional(),
        })).max(60).optional(),
        locations: z.array(z.object({
          name: z.string().max(255),
          locationType: z.string().max(128).nullable().optional(),
          description: z.string().max(1500).nullable().optional(),
        })).max(60).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const project: any = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });

        const mode = input.mode ?? "append";
        const existing: any[] = await db.getProjectScenes(input.projectId).catch(() => []);

        // v6.73 ÃÂ¢ÃÂÃÂ Replace requires an explicit second confirmation so the
        // wizard cannot silently destroy work. We never auto-replace.
        let deleted = 0;
        if (mode === "replace") {
          if (!input.confirmReplace) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Replace mode requires an explicit confirmation from the user (confirmReplace=true).",
            });
          }
          for (const s of existing) {
            try {
              await db.deleteScene(s.id);
              deleted++;
            } catch (err: any) {
              logger.warn(`[applyBreakdownToProject] delete failed on scene ${s.id}: ${err?.message}`);
            }
          }
        }

        // Find the current max orderIndex so we append, never overwrite (in
        // replace mode `existing` is now drained so baseOrder is 0).
        const remaining = mode === "replace" ? [] : existing;
        const baseOrder = remaining.reduce((m: number, s: any) => Math.max(m, Number(s.orderIndex ?? 0)), 0);

        // v6.73 ÃÂ¢ÃÂÃÂ Pre-load existing characters + locations for case-insensitive
        // reuse counting + lookup.
        // v6.74 ÃÂ¢ÃÂÃÂ When the wizard sends top-level `characters` / `locations`,
        // we now actually create the missing ones (no description-only ghosts)
        // alongside scenes so the project ends up with a populated cast +
        // locations list ready for the readiness panel.
        const projectChars: any[] = await db.getProjectCharacters(input.projectId).catch(() => []);
        const projectLocs: any[] = await db.getProjectLocations(input.projectId).catch(() => []);
        const charNameSet = new Set(projectChars.map((c: any) => String(c.name ?? "").trim().toLowerCase()).filter(Boolean));
        const locNameSet = new Set(projectLocs.map((l: any) => String(l.name ?? "").trim().toLowerCase()).filter(Boolean));

        const reusedCharacters = new Set<string>();
        const newCharacters = new Set<string>();
        const reusedLocations = new Set<string>();
        const newLocations = new Set<string>();
        const missingReferences: string[] = [];

        // v6.74 ÃÂ¢ÃÂÃÂ Top-level entity creation. We create characters first so the
        // per-scene character tally below sees them as "reused" rather than
        // "new" (which is the right mental model ÃÂ¢ÃÂÃÂ they've been added).
        const createdCharacters: string[] = [];
        const createdLocations: string[] = [];
        const characterCreateFailures: Array<{ name: string; error: string }> = [];
        const locationCreateFailures: Array<{ name: string; error: string }> = [];

        if (input.characters && input.characters.length) {
          for (const c of input.characters) {
            const name = c.name?.trim();
            if (!name) continue;
            const k = name.toLowerCase();
            if (charNameSet.has(k)) {
              reusedCharacters.add(name);
              continue;
            }
            try {
              await db.createCharacter({
                userId: ctx.user.id,
                projectId: input.projectId,
                name,
                role: c.role ?? null,
                description: c.description ?? null,
              } as any);
              charNameSet.add(k);
              createdCharacters.push(name);
            } catch (err: any) {
              logger.warn(`[applyBreakdownToProject] character create failed for "${name}": ${err?.message}`);
              characterCreateFailures.push({ name, error: err?.message ?? "unknown" });
            }
          }
        }
        if (input.locations && input.locations.length) {
          for (const l of input.locations) {
            const name = l.name?.trim();
            if (!name) continue;
            const k = name.toLowerCase();
            if (locNameSet.has(k)) {
              reusedLocations.add(name);
              continue;
            }
            try {
              await db.createLocation({
                userId: ctx.user.id,
                projectId: input.projectId,
                name,
                locationType: l.locationType ?? null,
                description: l.description ?? null,
              } as any);
              locNameSet.add(k);
              createdLocations.push(name);
            } catch (err: any) {
              logger.warn(`[applyBreakdownToProject] location create failed for "${name}": ${err?.message}`);
              locationCreateFailures.push({ name, error: err?.message ?? "unknown" });
            }
          }
        }

        let created = 0;
        const failures: Array<{ sceneNumber: number; error: string }> = [];
        for (let i = 0; i < input.scenes.length; i++) {
          const s = input.scenes[i];
          // Tally character reuse vs new (now reflects v6.74 top-level
          // creation above ÃÂ¢ÃÂÃÂ newly-created chars register as reused here).
          for (const cname of (s.characters ?? [])) {
            const k = cname.trim().toLowerCase();
            if (!k) continue;
            if (charNameSet.has(k)) reusedCharacters.add(cname.trim());
            else newCharacters.add(cname.trim());
          }
          // Tally location reuse vs new.
          if (s.location && s.location.trim()) {
            const lk = s.location.trim().toLowerCase();
            if (locNameSet.has(lk)) reusedLocations.add(s.location.trim());
            else newLocations.add(s.location.trim());
          }
          // v6.74 ÃÂ¢ÃÂÃÂ Build the productionNotes string conservatively. We keep
          // the v6.73 "Suggested cast" summary, then append the props list
          // when present so users see it in the existing crew-notes textarea.
          const noteParts: string[] = [];
          if (s.characters && s.characters.length) noteParts.push(`Suggested cast: ${s.characters.join(", ")}`);
          if (s.props && s.props.length) noteParts.push(`Props: ${s.props.join(", ")}`);
          try {
            await db.createScene({
              projectId: input.projectId,
              orderIndex: baseOrder + i + 1,
              title: s.title,
              description: s.description,
              timeOfDay: (s.timeOfDay ?? null) as any,
              mood: s.mood ?? null,
              locationDetail: s.location ?? null,
              duration: Math.round(s.estimatedDuration ?? 30),
              productionNotes: noteParts.length ? noteParts.join("\n") : null,
              // v6.74 ÃÂ¢ÃÂÃÂ pack rich fields into existing scene columns.
              // props ÃÂ¢ÃÂÃÂ scenes.props (json) ÃÂ¢ÃÂÃÂ already provisioned by autoMigrate.
              // shotSuggestions ÃÂ¢ÃÂÃÂ scenes.shotList (json) ÃÂ¢ÃÂÃÂ same shape as the
              // existing structured shot list, so downstream consumers work.
              // continuityNotes ÃÂ¢ÃÂÃÂ scenes.continuityNotes (text) ÃÂ¢ÃÂÃÂ already
              // provisioned by autoMigrate.
              // dialogue ÃÂ¢ÃÂÃÂ scenes.dialogueText (text) ÃÂ¢ÃÂÃÂ existing column.
              ...(s.props && s.props.length ? { props: s.props } : {}),
              ...(s.shotSuggestions && s.shotSuggestions.length
                ? {
                    shotList: s.shotSuggestions.map((sh, n) => ({
                      number: n + 1,
                      shotType: sh.shotType ?? null,
                      lens: sh.lens ?? null,
                      movement: sh.movement ?? null,
                      framing: sh.framing ?? null,
                      notes: sh.notes ?? null,
                      durationSec: sh.durationSec ?? null,
                    })),
                  }
                : {}),
              ...(s.continuityNotes ? { continuityNotes: s.continuityNotes } : {}),
              ...(s.dialogue ? { dialogueText: s.dialogue } : {}),
            } as any);
            created++;
          } catch (err: any) {
            logger.warn(`[applyBreakdownToProject] failed on scene ${s.sceneNumber}: ${err?.message}`);
            failures.push({ sceneNumber: s.sceneNumber, error: err?.message ?? "unknown" });
          }
        }

        // v6.73 ÃÂ¢ÃÂÃÂ Surface "missing references" so the post-apply summary
        // can nudge the user to add reference images / character details
        // before they spend video credits. v6.74 ÃÂ¢ÃÂÃÂ also flag freshly-created
        // characters/locations that were imported from the breakdown but
        // still need reference images.
        for (const cname of createdCharacters) {
          missingReferences.push(`Character "${cname}" was just imported ÃÂ¢ÃÂÃÂ no reference images yet. Add one before generating video.`);
        }
        for (const lname of createdLocations) {
          missingReferences.push(`Location "${lname}" was just imported ÃÂ¢ÃÂÃÂ no reference images yet. Add one before generating video.`);
        }
        for (const cname of newCharacters) {
          if (!createdCharacters.includes(cname)) {
            missingReferences.push(`Character "${cname}" appears in scenes but is not in your cast list. Add the character before generating video.`);
          }
        }
        for (const lname of newLocations) {
          if (!createdLocations.includes(lname)) {
            missingReferences.push(`Location "${lname}" appears in scenes but is not in your locations list. Add the location before generating video.`);
          }
        }

        await db.logActivity(input.projectId, ctx.user.id, ctx.user.name || ctx.user.email || null,
          "preproduction.applyBreakdown",
          {
            created,
            total: input.scenes.length,
            mode,
            deleted,
            reusedCharacters: reusedCharacters.size,
            newCharacters: newCharacters.size,
            createdCharacters: createdCharacters.length,
            createdLocations: createdLocations.length,
          },
        );

        return {
          success: true,
          created,
          total: input.scenes.length,
          mode,
          deleted,
          failures,
          summary: {
            reusedCharacters: Array.from(reusedCharacters).sort(),
            newCharacters: Array.from(newCharacters).sort(),
            reusedLocations: Array.from(reusedLocations).sort(),
            newLocations: Array.from(newLocations).sort(),
            // v6.74 ÃÂ¢ÃÂÃÂ record what we actually wrote so the post-apply card
            // can confirm to the user that characters/locations were created.
            createdCharacters,
            createdLocations,
            characterCreateFailures,
            locationCreateFailures,
            missingReferences,
          },
        };
      }),
  }),

  // ============================================================================
  // v6.68 Phase 5 ÃÂ¢ÃÂÃÂ BYOK Provider Control Center.
  // Returns ONLY masked status of each provider key (boolean ÃÂ¢ÃÂÃÂ label). Never
  // returns the raw key string to the client. Validation is shape-only by
  // default; deeper provider pings can be added per-provider as needed.
  // ============================================================================
  byok: router({
    getProviderStatus: protectedProcedure.query(async ({ ctx }) => {
      const user: any = await db.getUserById(ctx.user.id);
      const { getMaskedProviderStatus } = await import("./_core/providerPolicy");
      const has = getMaskedProviderStatus(user);
      const providers: Record<string, string> = {};
      for (const k of Object.keys(has)) {
        providers[k] = (has as any)[k] ? "configured" : "not_configured";
      }
      // v6.69 repair ÃÂ¢ÃÂÃÂ surface the persisted fallback policy so the BYOK
      // Control Center can render the user's saved choice without flicker.
      return {
        providers,
        preferredVideoProvider: user?.preferredVideoProvider ?? null,
        preferredLlmProvider: user?.preferredLlmProvider ?? null,
        byokFallbackMode: user?.byokFallbackMode ?? "byok_with_consent",
      };
    }),

    testProviderKey: protectedProcedure
      .input(z.object({ provider: z.string().min(1).max(32) }))
      .mutation(async ({ ctx, input }) => {
        const user: any = await db.getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
        // v6.69 ÃÂ¢ÃÂÃÂ true cheap-call validation for the providers we have a
        // safe ping for; shape-only fallback for the rest. Never returns
        // the key string under any circumstance.
        const { validateProviderKey } = await import("./_core/byokValidation");
        return validateProviderKey(user, input.provider);
      }),

    updateProviderPreferences: protectedProcedure
      .input(z.object({
        preferredVideoProvider: z.string().nullable().optional(),
        preferredLlmProvider: z.string().nullable().optional(),
        // v6.69 repair ÃÂ¢ÃÂÃÂ values match the spec used everywhere else.
        fallbackMode: z.enum([
          "credits_only",
          "byok_only",
          "byok_with_consent",
          "byok_with_auto_fallback",
        ]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const patch: any = {};
        if (input.preferredVideoProvider !== undefined) {
          patch.preferredVideoProvider = input.preferredVideoProvider || null;
        }
        if (input.preferredLlmProvider !== undefined) {
          patch.preferredLlmProvider = input.preferredLlmProvider || null;
        }
        // v6.69 ÃÂ¢ÃÂÃÂ fallback mode is now persisted on the users row.
        if (input.fallbackMode !== undefined) {
          patch.byokFallbackMode = input.fallbackMode;
        }
        if (Object.keys(patch).length > 0) {
          await db.updateUser(ctx.user.id, patch);
        }
        return { success: true, fallbackMode: input.fallbackMode ?? null };
      }),
  }),

  // ============================================================================
  // v6.68 Phase 4 ÃÂ¢ÃÂÃÂ Production Elements (consistency layer).
  // ============================================================================
  elements: router({
    listProjectElements: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { listProjectElements } = await import("./_core/productionElements");
        return listProjectElements(input.projectId, ctx.user.id);
      }),
    getPromptContextForScene: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getPromptContextForScene } = await import("./_core/productionElements");
        const ctxScene = await getPromptContextForScene(input.sceneId, ctx.user.id);
        if (!ctxScene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found." });
        return ctxScene;
      }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // v6.73 ÃÂ¢ÃÂÃÂ Generation-readiness scoring per scene + per-project rollup.
    //
    // Returns a 0ÃÂ¢ÃÂÃÂ100 score with weighted components (see scoreScene below)
    // plus a list of warnings/missing items so the UI can show users what
    // to fix BEFORE they spend video-generation credits.
    //
    // Pure read. No DB writes. No expensive AI calls.
    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    getSceneReadiness: protectedProcedure
      .input(z.object({ sceneId: z.number() }))
      .query(async ({ ctx, input }) => {
        const { computeSceneReadiness } = await import("./_core/productionElements");
        const r = await computeSceneReadiness(input.sceneId, ctx.user.id);
        if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found." });
        return r;
      }),

    getProjectReadiness: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        const scenes: any[] = await db.getProjectScenes(input.projectId).catch(() => []);
        const { computeSceneReadiness } = await import("./_core/productionElements");
        const items = await Promise.all(
          scenes.map(async (s: any) => {
            const r = await computeSceneReadiness(s.id, ctx.user.id);
            return r ?? {
              sceneId: s.id,
              sceneNumber: Number(s.orderIndex ?? 0) + 1,
              title: s.title ?? `Scene ${Number(s.orderIndex ?? 0) + 1}`,
              score: 0,
              warnings: ["Could not compute readiness for this scene."],
              missing: [],
            };
          }),
        );
        const avg = items.length === 0 ? 0 : Math.round(items.reduce((a, b) => a + b.score, 0) / items.length);
        return {
          projectId: input.projectId,
          totalScenes: items.length,
          averageScore: avg,
          scenes: items,
        };
      }),
  }),

  // ============================================================================
  // v6.68 Phase 6 ÃÂ¢ÃÂÃÂ Credit reservations (read-only listing for users).
  // ============================================================================
  reservations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.listUserReservations(ctx.user.id);
    }),
    // v6.70 ÃÂ¢ÃÂÃÂ Observability helper. Given a (referenceType, referenceId)
    // pair, returns every reservation row tied to that reference (all
    // statuses) so we can debug scene/trailer/recap credit behavior. Scoped
    // to the calling user ÃÂ¢ÃÂÃÂ never returns sensitive data, only the public
    // reservation lifecycle fields.
    getForReference: protectedProcedure
      .input(z.object({
        referenceType: z.enum(["scene_video", "trailer", "recap"]),
        referenceId: z.number().int().positive(),
      }))
      .query(async ({ ctx, input }) => {
        const rows = await (db as any).getReservationsForReference(
          input.referenceType,
          input.referenceId,
          ctx.user.id,
        );
        return (rows as any[]).map((r) => ({
          id: r.id,
          featureKey: r.featureKey,
          amount: Number(r.amount ?? 0),
          status: r.status,
          createdAt: r.createdAt ?? null,
          finalizedAt: r.finalizedAt ?? null,
          releasedAt: r.releasedAt ?? null,
        }));
      }),
  }),

  // ============================================================================
  // v6.68 Phase 10 ÃÂ¢ÃÂÃÂ Pitch Deck assembly.
  // ============================================================================
  pitchDeck: router({
    get: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ ctx, input }) => {
        const project: any = await db.getProjectById(input.projectId, ctx.user.id);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
        // v6.69 Phase 7 ÃÂ¢ÃÂÃÂ Pull every data source the pitch deck needs.
        // Budgets and shootDays already have helpers in db.ts; if a helper
        // is missing we fall back to an empty array rather than throwing.
        const [characters, scenes, moodBoard, budgets] = await Promise.all([
          db.getProjectCharacters(input.projectId).catch(() => []),
          db.getProjectScenes(input.projectId).catch(() => []),
          db.getProjectMoodBoard(input.projectId).catch(() => []),
          (db as any).getProjectBudgets ? (db as any).getProjectBudgets(input.projectId).catch(() => []) : Promise.resolve([]),
        ]);
        let shootDays: any[] = [];
        try {
          if (typeof (db as any).getProjectShootDays === "function") {
            shootDays = await (db as any).getProjectShootDays(input.projectId);
          }
        } catch { shootDays = []; }
        // v6.69 Phase 7 ÃÂ¢ÃÂÃÂ Scenes table has NO sceneNumber column. Sort by the
        // actual orderIndex column and derive a 1-based scene number for the
        // deck. Title falls back to "Scene N" when missing.
        const { collectCharacterReferenceImages } = await import("./_core/productionElements");
        const sortedScenes = (scenes as any[]).slice().sort((a, b) =>
          Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0),
        );
        // Aggregate budget across all categories.
        const budgetTotal = (budgets as any[]).reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
        const budgetByCategory: Record<string, number> = {};
        for (const b of budgets as any[]) {
          const k = String(b.category ?? "other");
          budgetByCategory[k] = (budgetByCategory[k] ?? 0) + Number(b.amount ?? 0);
        }
        return {
          title: project.title ?? "Untitled film",
          logline: project.description ?? null,
          synopsis: project.plotSummary ?? project.mainPlot ?? null,
          themes: project.themes ?? null,
          genre: project.genre ?? null,
          rating: project.rating ?? null,
          tone: project.tone ?? null,
          characters: (characters as any[]).map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            referenceImages: collectCharacterReferenceImages(c, null),
          })),
          moodBoard: (moodBoard as any[]).map((m) => ({
            imageUrl: (m as any).imageUrl ?? (m as any).url ?? null,
          })).filter((m) => !!m.imageUrl),
          scenes: sortedScenes.map((s, i) => ({
            id: s.id,
            sceneNumber: Number(s.orderIndex ?? i) + 1,
            title: s.title ?? `Scene ${Number(s.orderIndex ?? i) + 1}`,
            description: s.description ?? null,
            thumbnailUrl: s.thumbnailUrl ?? s.heroFrameUrl ?? null,
          })),
          budgetEstimate: budgets.length > 0
            ? { total: budgetTotal, currency: (budgets[0] as any).currency ?? "USD", byCategory: budgetByCategory }
            : null,
          productionPlan: shootDays.length > 0
            ? {
                shootDays: shootDays.length,
                shootDates: (shootDays as any[]).map((d) => d.date ?? d.dayDate).filter(Boolean),
                locations: Array.from(new Set((shootDays as any[]).map((d) => d.locationName).filter(Boolean))),
              }
            : null,
        };
      }),
  }),
  // ============================================================================
    // Script Coverage ÃÂ¢ÃÂÃÂ AI-powered coverage report (uses caller-supplied BYOK key)
    // Deducts 5 credits (script_coverage_ai) server-side; refunds on AI failure.
    // ============================================================================
    coverage: router({
      analyze: protectedProcedure
        .input(z.object({
          scriptText: z.string().min(100).max(50000),
          title:      z.string().max(200).optional(),
          genre:      z.string().max(100).optional(),
          format:     z.string().max(100).optional(),
          byokKey:    z.string().min(10).max(200),
        }))
        .mutation(async ({ ctx, input }) => {
          requireFeature(ctx.user, "canUseScriptWriter", "Script Coverage AI");

          // Deduct 5 credits up-front; refund if the AI call fails.
          try {
            await db.deductCredits(
              ctx.user.id,
              CREDIT_COSTS.script_coverage_ai.cost,
              "script_coverage_ai",
              `Script coverage: ${input.title || "Untitled"}`,
            );
          } catch (e: any) {
            if (e.message?.includes("INSUFFICIENT_CREDITS"))
              throw new TRPCError({ code: "FORBIDDEN", message: e.message });
            throw e;
          }

          const prompt = `You are a professional Hollywood script reader. Provide coverage for the following script excerpt.

  Title: ${input.title || "Untitled"}
  Genre: ${input.genre || "Unknown"}
  Format: ${input.format || "Feature"}

  Script (excerpt):
  ${input.scriptText.slice(0, 8000)}

  Respond with ONLY a JSON object matching this exact schema (no markdown fences):
  {
    "logline": "one sentence",
    "premise": "2-3 sentence premise analysis",
    "scores": { "premise": 0-100, "structure": 0-100, "characters": 0-100, "dialogue": 0-100, "pacing": 0-100, "originality": 0-100, "marketability": 0-100 },
    "recommendation": "Pass" | "Consider" | "Recommend",
    "synopsisNotes": "2-3 sentences on overall story",
    "strengths": ["string","string","string","string"],
    "weaknesses": ["string","string","string","string"],
    "notes": "closing reader notes paragraph"
  }`;

          const isAnthropic = input.byokKey.startsWith("sk-ant");
          let result: any;
          try {
            if (isAnthropic) {
              const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": input.byokKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
              });
              const data = await res.json() as any;
              if (!res.ok) throw new Error(data.error?.message ?? `Anthropic error ${res.status}`);
              const text: string = data.content?.[0]?.text ?? "";
              const jsonStr = text.match(/\{[\s\S]*\}/)?.[0];
              if (!jsonStr) throw new Error("Could not parse AI response");
              result = JSON.parse(jsonStr);
            } else {
              const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${input.byokKey}`, "content-type": "application/json" },
                body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
              });
              const data = await res.json() as any;
              if (!res.ok) throw new Error(data.error?.message ?? `OpenAI error ${res.status}`);
              result = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
            }
          } catch (e: any) {
            // Refund credits on AI failure
            try {
              await db.addCredits(
                ctx.user.id,
                CREDIT_COSTS.script_coverage_ai.cost,
                "script_coverage_ai_refund",
                "Coverage AI call failed ÃÂ¢ÃÂÃÂ credits refunded",
              );
            } catch { /* best-effort refund */ }
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Coverage analysis failed: ${e.message}` });
          }

          return {
            ...result,
            title:  input.title  || "Untitled",
            genre:  input.genre  || "Unknown",
            format: input.format || "Feature",
          };
        }),
    }),

    // ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Dubbing Studio ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
    // AI multilingual dubbing + lip-sync: ElevenLabs v2 TTS ÃÂÃÂ· GPT translation.
    dubbing: router({

      generateDub: protectedProcedure
        .input(z.object({
          text:           z.string().min(1).max(10000),
          voiceId:        z.string().min(1),
          targetLanguage: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const userKeys = await db.getUserApiKeys(ctx.user.id);
          const elevenlabsKey = userKeys.elevenlabsKey;
          if (!elevenlabsKey) throw new TRPCError({ code: "BAD_REQUEST", message: "ElevenLabs API key required for dubbing. Add it in Settings ÃÂ¢ÃÂÃÂ API Keys." });
          const body: any = {
            text: input.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
          };
          if (input.targetLanguage && input.targetLanguage !== "en") body.language_code = input.targetLanguage;
          const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}`, {
            method: "POST",
            headers: { "xi-api-key": elevenlabsKey, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!resp.ok) {
            const err = await resp.text().catch(() => "TTS error");
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `ElevenLabs TTS failed: ${err.slice(0, 200)}` });
          }
          const buf = await resp.arrayBuffer();
          const audioBase64 = Buffer.from(buf).toString("base64");
          logger.info(`[dubbing.generateDub] ${buf.byteLength}B audio for user ${ctx.user.id}`);
          return { audioBase64, format: "mp3" as const };
        }),

      applyLipSync: protectedProcedure
        .input(z.object({
          sceneId:     z.number(),
          audioBase64: z.string().min(1),
          mode:        z.enum(["none", "overlay", "d-id"]).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          requireFeature(ctx.user, "canUseAIVoiceActing", "Lip Sync");
          const scene = await db.getSceneById(input.sceneId);
          if (!scene) throw new TRPCError({ code: "NOT_FOUND", message: "Scene not found" });
          await assertCanAccessProject(scene.projectId, ctx.user.id);
          const audioDataUrl = `data:audio/mpeg;base64,${input.audioBase64}`;
          await db.updateScene(input.sceneId, {
            lipSyncMode:    input.mode ?? "overlay",
            lipSyncAudioUrl: audioDataUrl,
          } as any);
          logger.info(`[dubbing.applyLipSync] mode=${input.mode ?? "overlay"} scene ${input.sceneId}`);
          return { success: true };
        }),

      translateText: protectedProcedure
        .input(z.object({
          text:           z.string().min(1).max(10000),
          targetLanguage: z.string().min(2),
          sourceLanguage: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const userKeys = await db.getUserApiKeys(ctx.user.id);
          const openaiKey = userKeys.openaiKey;
          if (!openaiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "OpenAI API key required for translation. Add it in Settings ÃÂ¢ÃÂÃÂ API Keys." });
          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: `Translate the following${input.sourceLanguage ? ` ${input.sourceLanguage}` : ""} screenplay dialogue to ${input.targetLanguage}. Preserve tone, emotion, and screenplay formatting. Return ONLY the translation, no preamble:

${input.text}` }],
              max_tokens: 3000,
            }),
          });
          if (!resp.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Translation request failed" });
          const data = await resp.json() as any;
          return { translatedText: (data.choices?.[0]?.message?.content ?? "") as string };
        }),
    }),
  
  });
export type AppRouter = typeof appRouter;
