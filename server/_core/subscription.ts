import Stripe from "stripe";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";

// Initialize Stripe
export const stripe = ENV.stripeSecretKey
  ? new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-02-25.clover" as any })
  : null;

// ============================================================
// TIER DEFINITIONS & LIMITS
// ============================================================

export type SubscriptionTier = "creator" | "pro" | "industry";
export type BillingInterval = "monthly" | "annual";

export interface TierLimits {
  maxProjects: number;
  maxCharactersPerProject: number;
  maxScenesPerProject: number;
  maxGenerationsPerMonth: number;
  maxMovieExports: number;
  maxCollaboratorsPerProject: number;
  maxScriptsPerProject: number;
  maxStorageMB: number;
  // Feature access — Core (all tiers)
  canUseQuickGenerate: boolean;
  canUseTrailerGeneration: boolean;
  canUseDirectorAssistant: boolean;
  canUseAdPosterMaker: boolean;
  canUseBudgetEstimator: boolean;
  canUseColorGrading: boolean;
  canUseSoundEffects: boolean;
  canUseSubtitles: boolean;
  canUseDialogueEditor: boolean;
  canUseLocationScout: boolean;
  canUseMoodBoard: boolean;
  canUseShotList: boolean;
  canUseContinuityCheck: boolean;
  canUseScriptWriter: boolean;
  canUseStoryboard: boolean;
  canUseCollaboration: boolean;
  canExportMovies: boolean;
  canExportHD: boolean;
  canUseAICharacterGen: boolean;
  canUseAIScriptGen: boolean;
  canUseAIDialogueGen: boolean;
  canUseAIBudgetGen: boolean;
  canUseAISubtitleGen: boolean;
  canUseAILocationSuggest: boolean;
  // Full film pipeline — all tiers
  canUseFullFilmGeneration: boolean;
  canUseAIVoiceActing: boolean;
  canUseAISoundtrack: boolean;
  canUseCharacterConsistency: boolean;
  canUseSceneContinuity: boolean;
  canUseClipChaining: boolean;
  // Pro-tier features
  canUseVisualEffects: boolean;       // VFX Scene Studio (scene-level VFX)
  canUseBulkGenerate: boolean;        // Bulk/parallel generation
  canUseMultiShotSequencer: boolean;  // Multi-shot sequencer
  canUseLiveActionPlate: boolean;     // Live action plate compositing
  canUseNLEExport: boolean;           // NLE/DaVinci export
  canUseAICasting: boolean;           // AI casting tool
  canExportUltraHD: boolean;          // 4K UHD export
  // Industry-tier features
  canUseWhiteLabel: boolean;          // White-label exports
  canUseAPIAccess: boolean;           // API access
  canUseCustomFineTuning: boolean;    // Custom model fine-tuning
  canUsePriorityRendering: boolean;   // Priority rendering queue
  resolution: "720p" | "1080p" | "4k";
  quality: ("standard" | "high" | "ultra")[];
  maxDurationMinutes: number;
  maxClipsPerScene: number;
}

/**
 * ENTERPRISE FILM PRODUCTION PRICING MODEL
 * 
 * Virelle Studios is a premium AI film production platform.
 * BYOK (Bring Your Own Key) — users provide their own API keys for video, voice, and music generation.
 * The platform charges per-film production fees for the orchestration, pipeline, and production tools.
 * 
 * FILM PRODUCTION PACKAGES (one-time per film):
 *   Short Film (up to 30 min):  $80,000   (Launch Special: $40,000)
 *   Feature Film (up to 60 min): $140,000  (Launch Special: $70,000)
 *   Full Feature (up to 90 min): $200,000  (Launch Special: $100,000)
 *   Each additional 30 min:      +$60,000  (Launch Special: +$30,000)
 *   Premium (white-glove):       $250,000  (Launch Special: $125,000)
 * 
 * PLATFORM ACCESS TIERS (subscription for ongoing access to tools):
 *   Creator — Short films up to 30 min, all core tools (entry level)
 *   Pro — Feature films up to 90 min, full pipeline, VFX Scene Studio
 *   Industry — Unlimited, 4K, 180 min, white-label, API access
 */

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  // ─── CREATOR ─── Entry-level: core tools, 30 min films, 1080p
  creator: {
    maxProjects: 10,
    maxCharactersPerProject: 20,
    maxScenesPerProject: 40,
    maxGenerationsPerMonth: 100,
    maxMovieExports: 10,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 10,
    maxStorageMB: 20000, // 20GB
    // Core tools — available to all tiers
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: true,
    canUseBudgetEstimator: true,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseSubtitles: true,
    canUseDialogueEditor: true,
    canUseLocationScout: true,
    canUseMoodBoard: true,
    canUseShotList: true,
    canUseContinuityCheck: true,
    canUseScriptWriter: true,
    canUseStoryboard: true,
    canUseCollaboration: true,
    canExportMovies: true,
    canExportHD: true,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: true,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: true,
    canUseFullFilmGeneration: true,
    canUseAIVoiceActing: true,
    canUseAISoundtrack: true,
    canUseCharacterConsistency: true,
    canUseSceneContinuity: true,
    canUseClipChaining: true,
    // Pro features — NOT available on Creator
    canUseVisualEffects: false,
    canUseBulkGenerate: false,
    canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false,
    canUseNLEExport: false,
    canUseAICasting: false,
    canExportUltraHD: false,
    // Industry features — NOT available on Creator
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "1080p",
    quality: ["standard", "high"],
    maxDurationMinutes: 30,
    maxClipsPerScene: 6,
  },
  // ─── PRO ─── Full pipeline: 90 min films, VFX Scene Studio, 4K
  pro: {
    maxProjects: 50,
    maxCharactersPerProject: 50,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 500,
    maxMovieExports: 50,
    maxCollaboratorsPerProject: 15,
    maxScriptsPerProject: 25,
    maxStorageMB: 100000, // 100GB
    // Core tools — all enabled
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: true,
    canUseBudgetEstimator: true,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseSubtitles: true,
    canUseDialogueEditor: true,
    canUseLocationScout: true,
    canUseMoodBoard: true,
    canUseShotList: true,
    canUseContinuityCheck: true,
    canUseScriptWriter: true,
    canUseStoryboard: true,
    canUseCollaboration: true,
    canExportMovies: true,
    canExportHD: true,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: true,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: true,
    canUseFullFilmGeneration: true,
    canUseAIVoiceActing: true,
    canUseAISoundtrack: true,
    canUseCharacterConsistency: true,
    canUseSceneContinuity: true,
    canUseClipChaining: true,
    // Pro features — all enabled
    canUseVisualEffects: true,
    canUseBulkGenerate: true,
    canUseMultiShotSequencer: true,
    canUseLiveActionPlate: true,
    canUseNLEExport: true,
    canUseAICasting: true,
    canExportUltraHD: true,
    // Industry features — NOT available on Pro
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "4k",
    quality: ["standard", "high", "ultra"],
    maxDurationMinutes: 90,
    maxClipsPerScene: 8,
  },
  // ─── INDUSTRY ─── Unlimited: 180 min, white-label, API, fine-tuning
  industry: {
    maxProjects: -1,
    maxCharactersPerProject: -1,
    maxScenesPerProject: -1,
    maxGenerationsPerMonth: -1,
    maxMovieExports: -1,
    maxCollaboratorsPerProject: -1,
    maxScriptsPerProject: -1,
    maxStorageMB: -1,
    // All features enabled
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: true,
    canUseBudgetEstimator: true,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseSubtitles: true,
    canUseDialogueEditor: true,
    canUseLocationScout: true,
    canUseMoodBoard: true,
    canUseShotList: true,
    canUseContinuityCheck: true,
    canUseScriptWriter: true,
    canUseStoryboard: true,
    canUseCollaboration: true,
    canExportMovies: true,
    canExportHD: true,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: true,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: true,
    canUseFullFilmGeneration: true,
    canUseAIVoiceActing: true,
    canUseAISoundtrack: true,
    canUseCharacterConsistency: true,
    canUseSceneContinuity: true,
    canUseClipChaining: true,
    canUseVisualEffects: true,
    canUseBulkGenerate: true,
    canUseMultiShotSequencer: true,
    canUseLiveActionPlate: true,
    canUseNLEExport: true,
    canUseAICasting: true,
    canExportUltraHD: true,
    canUseWhiteLabel: true,
    canUseAPIAccess: true,
    canUseCustomFineTuning: true,
    canUsePriorityRendering: true,
    resolution: "4k",
    quality: ["standard", "high", "ultra"],
    maxDurationMinutes: 180,
    maxClipsPerScene: 12,
  },
};

// ============================================================
// FILM PRODUCTION PACKAGES — Per-film pricing
// ============================================================

export interface FilmPackage {
  id: string;
  name: string;
  description: string;
  maxDurationMinutes: number;
  fullPrice: number;        // Full price in USD
  launchPrice: number;      // 50% off launch special
  features: string[];
  requiredTier: SubscriptionTier; // Minimum platform tier needed
}

export const FILM_PACKAGES: FilmPackage[] = [
  {
    id: "short_film",
    name: "Short Film",
    description: "Up to 30 minutes — perfect for short films, pilots, and proof-of-concept",
    maxDurationMinutes: 30,
    fullPrice: 80000,
    launchPrice: 40000,
    features: [
      "Up to 30-minute film",
      "AI screenplay generation",
      "40+ cinematic scenes with clip chaining",
      "AI voice acting for all dialogue",
      "AI-generated film score",
      "Character consistency across scenes",
      "Scene-to-scene visual continuity",
      "1080p Full HD export",
      "2 revision passes",
    ],
    requiredTier: "creator",
  },
  {
    id: "feature_film",
    name: "Feature Film",
    description: "Up to 60 minutes — for feature-length productions and documentaries",
    maxDurationMinutes: 60,
    fullPrice: 140000,
    launchPrice: 70000,
    features: [
      "Up to 60-minute film",
      "Everything in Short Film",
      "60+ cinematic scenes with extended clip chaining",
      "Advanced character consistency (visual DNA)",
      "Multi-act narrative structure",
      "Trailer generation included",
      "1080p Full HD or 4K export",
      "3 revision passes",
      "Dedicated production timeline",
    ],
    requiredTier: "pro",
  },
  {
    id: "full_feature",
    name: "Full Feature",
    description: "Up to 90 minutes — the complete feature-length AI film experience",
    maxDurationMinutes: 90,
    fullPrice: 200000,
    launchPrice: 100000,
    features: [
      "Up to 90-minute film",
      "Everything in Feature Film",
      "90+ cinematic scenes with full clip chaining",
      "Complete character arc consistency",
      "AI-composed original soundtrack (full score)",
      "Professional color grading",
      "Subtitle generation",
      "4K UHD export",
      "5 revision passes",
      "Priority rendering queue",
    ],
    requiredTier: "pro",
  },
  {
    id: "premium",
    name: "Premium Production",
    description: "White-glove service — dedicated production manager, unlimited revisions, custom fine-tuning",
    maxDurationMinutes: 180,
    fullPrice: 250000,
    launchPrice: 125000,
    features: [
      "Up to 180-minute film",
      "Everything in Full Feature",
      "Dedicated production manager",
      "Unlimited revision passes",
      "Custom AI model fine-tuning on your IP",
      "4K UHD + ProRes export",
      "HDR color grading",
      "Custom branding & credits",
      "Priority phone & video support",
      "Delivery within 48 hours",
    ],
    requiredTier: "industry",
  },
];

// Additional 30-minute extension pricing
export const EXTENSION_PRICING = {
  fullPricePer30Min: 60000,
  launchPricePer30Min: 30000,
};

// VFX Scene Studio — per-scene pricing for hybrid productions
export interface VFXScenePackage {
  id: string;
  name: string;
  description: string;
  scenesIncluded: number;
  fullPrice: number;
  launchPrice: number;
  features: string[];
}

export const VFX_SCENE_PACKAGES: VFXScenePackage[] = [
  {
    id: "vfx_single",
    name: "Single Scene",
    description: "One impossible VFX scene for your live-action production",
    scenesIncluded: 1,
    fullPrice: 5000,
    launchPrice: 2500,
    features: [
      "1 AI-generated VFX scene (30-60 seconds)",
      "Art direction control",
      "Match to your production's color grade",
      "1080p or 4K export",
      "2 revision passes",
    ],
  },
  {
    id: "vfx_pack_5",
    name: "Scene Pack (5)",
    description: "Five VFX scenes — save 20% vs individual",
    scenesIncluded: 5,
    fullPrice: 20000,
    launchPrice: 10000,
    features: [
      "5 AI-generated VFX scenes",
      "Everything in Single Scene",
      "Character matching to your cast",
      "Scene-to-scene continuity",
      "3 revision passes per scene",
    ],
  },
  {
    id: "vfx_pack_15",
    name: "Scene Pack (15)",
    description: "Fifteen VFX scenes — save 35% vs individual",
    scenesIncluded: 15,
    fullPrice: 50000,
    launchPrice: 25000,
    features: [
      "15 AI-generated VFX scenes",
      "Everything in Scene Pack (5)",
      "Dedicated VFX supervisor",
      "Priority rendering",
      "5 revision passes per scene",
      "4K UHD export",
    ],
  },
  {
    id: "vfx_unlimited",
    name: "Unlimited VFX",
    description: "Unlimited VFX scenes for your entire production",
    scenesIncluded: -1,
    fullPrice: 100000,
    launchPrice: 50000,
    features: [
      "Unlimited AI-generated VFX scenes",
      "Everything in Scene Pack (15)",
      "Custom model fine-tuning",
      "Unlimited revision passes",
      "Dedicated production manager",
      "48-hour delivery guarantee",
    ],
  },
];

// Launch special flag — set to false to disable 50% off
export const LAUNCH_SPECIAL_ACTIVE = true;
export const LAUNCH_SPECIAL_DISCOUNT = 0.5; // 50% off first film

// ============================================================
// PLATFORM ACCESS SUBSCRIPTION — Monthly access to tools
// ============================================================

export interface TierPricing {
  monthly: number;
  annual: number;
  annualTotal: number;
}

/**
 * Platform access subscription pricing.
 * This is the recurring fee for access to the Virelle Studios platform and tools.
 * Film production packages are charged separately as one-time fees.
 * 
 * Creator: $2,500/mo — Access to all production tools, up to 30 min films
 * Pro: $5,000/mo — Full pipeline, 90 min films, VFX Scene Studio
 * Industry: $10,000/mo — Unlimited, 4K, 180 min, white-label, API access
 */
export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  creator: { monthly: 2500, annual: 2000, annualTotal: 24000 },
  pro: { monthly: 5000, annual: 4000, annualTotal: 48000 },
  industry: { monthly: 10000, annual: 8000, annualTotal: 96000 },
};

// Referral Rewards
export const REFERRAL_REWARDS = {
  referrerGenerations: 15,
  newUserGenerations: 10,
  maxReferralsPerMonth: 20,
};

// Generation Top-Up Packs
export interface TopUpPack {
  id: string;
  name: string;
  generations: number;
  price: number;
  pricePerGen: number;
  savings: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup_10", name: "Starter Pack", generations: 10, price: 499, pricePerGen: 49.90, savings: "" },
  { id: "topup_30", name: "Production Pack", generations: 30, price: 999, pricePerGen: 33.30, savings: "Save 33%" },
  { id: "topup_100", name: "Studio Pack", generations: 100, price: 2499, pricePerGen: 24.99, savings: "Save 50%" },
];

// ============================================================
// STRIPE PRICE ID RESOLVER
// ============================================================

/**
 * Resolve a Stripe price ID to a subscription tier.
 * Used by the webhook handler to determine which tier a subscription belongs to.
 */
export function priceIdToTier(priceId: string): SubscriptionTier {
  // Check all configured price IDs and map to tiers
  const creatorPriceIds = [
    ENV.stripeCreatorMonthlyPriceId,
    ENV.stripeCreatorAnnualPriceId,
  ].filter(Boolean);

  const proPriceIds = [
    ENV.stripeProPriceId,
    ENV.stripeProMonthlyPriceId,
    ENV.stripeProAnnualPriceId,
  ].filter(Boolean);

  const industryPriceIds = [
    ENV.stripeIndustryPriceId,
    ENV.stripeIndustryMonthlyPriceId,
    ENV.stripeIndustryAnnualPriceId,
  ].filter(Boolean);

  if (creatorPriceIds.includes(priceId)) return "creator";
  if (proPriceIds.includes(priceId)) return "pro";
  if (industryPriceIds.includes(priceId)) return "industry";

  // Fallback: try to infer from price ID naming convention
  const lower = priceId.toLowerCase();
  if (lower.includes("creator")) return "creator";
  if (lower.includes("pro")) return "pro";
  if (lower.includes("industry") || lower.includes("enterprise")) return "industry";

  // Default to pro if we can't determine
  console.warn(`[Subscription] Unknown price ID: ${priceId}, defaulting to pro`);
  return "pro";
}

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

/**
 * Get the effective tier for a user. Admin always gets industry-level access.
 */
export function getEffectiveTier(user: User): SubscriptionTier {
  if (user.email === ENV.adminEmail || user.role === "admin") {
    return "industry";
  }
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
    return (user.subscriptionTier as SubscriptionTier) || "creator";
  }
  return "creator";
}

/**
 * Get the limits for a user based on their effective tier.
 */
export function getUserLimits(user: User): TierLimits {
  return TIER_LIMITS[getEffectiveTier(user)];
}

/**
 * Check if a user can access a specific feature. Throws if not.
 */
export function requireFeature(user: User, feature: keyof TierLimits, featureName: string): void {
  const limits = getUserLimits(user);
  const value = limits[feature];
  if (value === false || value === 0) {
    const tier = getEffectiveTier(user);
    throw new Error(
      `SUBSCRIPTION_REQUIRED: ${featureName} is not available on the ${tier} plan. Please upgrade to access this feature.`
    );
  }
}

/**
 * Check if user has remaining generations this month. Throws if not.
 */
export function requireGenerationQuota(user: User): void {
  const limits = getUserLimits(user);
  if (limits.maxGenerationsPerMonth === -1) return;
  
  const used = user.monthlyGenerationsUsed || 0;
  const bonus = user.bonusGenerations || 0;
  const resetAt = user.monthlyGenerationsResetAt;
  
  if (resetAt && new Date() > new Date(resetAt)) {
    return;
  }
  
  const totalAvailable = limits.maxGenerationsPerMonth + bonus;
  
  if (used >= totalAvailable) {
    throw new Error(
      `GENERATION_LIMIT: You've used all ${limits.maxGenerationsPerMonth} plan generations${bonus > 0 ? ` + ${bonus} bonus` : ""} for this month. Purchase a top-up pack or upgrade your plan for more.`
    );
  }
}

/**
 * Check if user can create more of a resource. Throws if at limit.
 */
export function requireResourceQuota(
  user: User,
  limitKey: "maxProjects" | "maxCharactersPerProject" | "maxScenesPerProject" | "maxScriptsPerProject" | "maxCollaboratorsPerProject" | "maxMovieExports",
  currentCount: number,
  resourceName: string
): void {
  const limits = getUserLimits(user);
  const max = limits[limitKey];
  if (max === -1) return;
  if (currentCount >= max) {
    const tier = getEffectiveTier(user);
    throw new Error(
      `RESOURCE_LIMIT: You've reached the maximum of ${max} ${resourceName} on the ${tier} plan. Please upgrade for more.`
    );
  }
}

// ============================================================
// STRIPE HELPERS
// ============================================================

/**
 * Create or retrieve a Stripe customer for a user.
 */
export async function getOrCreateStripeCustomer(user: User): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }
  
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.name || undefined,
    metadata: {
      userId: String(user.id),
    },
  });
  
  return customer.id;
}

/**
 * Create a Stripe Checkout session for platform subscription.
 */
export async function createCheckoutSession(
  user: User,
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(user.id),
    },
    subscription_data: {
      metadata: {
        userId: String(user.id),
      },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
    },
  };
  
  const session = await stripe.checkout.sessions.create(sessionParams);
  return session.url!;
}

/**
 * Create a Stripe Checkout session for a film production package (one-time payment).
 */
export async function createFilmPackageCheckoutSession(
  user: User,
  customerId: string,
  packageId: string,
  useLaunchPrice: boolean,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  const pkg = FILM_PACKAGES.find(p => p.id === packageId);
  const vfxPkg = VFX_SCENE_PACKAGES.find(p => p.id === packageId);
  const selectedPkg = pkg || vfxPkg;
  if (!selectedPkg) throw new Error("Invalid package ID");

  const price = useLaunchPrice && LAUNCH_SPECIAL_ACTIVE
    ? selectedPkg.launchPrice
    : selectedPkg.fullPrice;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Virelle Studios — ${selectedPkg.name}`,
          description: selectedPkg.description,
        },
        unit_amount: price * 100, // Stripe uses cents
      },
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(user.id),
      packageId,
      type: "film_production",
      useLaunchPrice: String(useLaunchPrice),
    },
  });

  return session.url!;
}

/**
 * Create a Stripe Checkout session for one-time generation top-up pack.
 */
export async function createTopUpCheckoutSession(
  user: User,
  customerId: string,
  packId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(user.id),
      packId,
      type: "generation_topup",
    },
  });
  
  return session.url!;
}

/**
 * Create a Stripe billing portal session for managing subscription.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  
  return session.url;
}
