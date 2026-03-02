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

export type SubscriptionTier = "free" | "creator" | "pro" | "industry";
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
  // Feature access
  canUseQuickGenerate: boolean;
  canUseTrailerGeneration: boolean;
  canUseBulkGenerate: boolean;
  canUseDirectorAssistant: boolean;
  canUseAdPosterMaker: boolean;
  canUseBudgetEstimator: boolean;
  canUseColorGrading: boolean;
  canUseSoundEffects: boolean;
  canUseVisualEffects: boolean;
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
  canExportUltraHD: boolean;
  canUseAICharacterGen: boolean;
  canUseAIScriptGen: boolean;
  canUseAIDialogueGen: boolean;
  canUseAIBudgetGen: boolean;
  canUseAISubtitleGen: boolean;
  canUseAILocationSuggest: boolean;
  resolution: "720p" | "1080p" | "4k";
  quality: ("standard" | "high" | "ultra")[];
  maxDurationMinutes: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxProjects: 2,
    maxCharactersPerProject: 3,
    maxScenesPerProject: 5,
    maxGenerationsPerMonth: 5,
    maxMovieExports: 1,
    maxCollaboratorsPerProject: 0,
    maxScriptsPerProject: 1,
    maxStorageMB: 200,
    canUseQuickGenerate: true,
    canUseTrailerGeneration: false,
    canUseBulkGenerate: false,
    canUseDirectorAssistant: false,
    canUseAdPosterMaker: false,
    canUseBudgetEstimator: false,
    canUseColorGrading: false,
    canUseSoundEffects: false,
    canUseVisualEffects: false,
    canUseSubtitles: false,
    canUseDialogueEditor: false,
    canUseLocationScout: false,
    canUseMoodBoard: false,
    canUseShotList: false,
    canUseContinuityCheck: false,
    canUseScriptWriter: true,
    canUseStoryboard: true,
    canUseCollaboration: false,
    canExportMovies: true,
    canExportHD: false,
    canExportUltraHD: false,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: false,
    canUseAISubtitleGen: false,
    canUseAILocationSuggest: false,
    resolution: "720p",
    quality: ["standard"],
    maxDurationMinutes: 10,
  },
  creator: {
    maxProjects: 5,
    maxCharactersPerProject: 10,
    maxScenesPerProject: 15,
    maxGenerationsPerMonth: 30,
    maxMovieExports: 5,
    maxCollaboratorsPerProject: 2,
    maxScriptsPerProject: 3,
    maxStorageMB: 2000, // 2GB
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseBulkGenerate: false,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: false,
    canUseBudgetEstimator: false,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseVisualEffects: false,
    canUseSubtitles: true,
    canUseDialogueEditor: true,
    canUseLocationScout: false,
    canUseMoodBoard: true,
    canUseShotList: true,
    canUseContinuityCheck: false,
    canUseScriptWriter: true,
    canUseStoryboard: true,
    canUseCollaboration: true,
    canExportMovies: true,
    canExportHD: true,
    canExportUltraHD: false,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: false,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: false,
    resolution: "1080p",
    quality: ["standard", "high"],
    maxDurationMinutes: 30,
  },
  pro: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 50,
    maxGenerationsPerMonth: 200,
    maxMovieExports: 25,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 10,
    maxStorageMB: 10000, // 10GB
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseBulkGenerate: true,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: true,
    canUseBudgetEstimator: true,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseVisualEffects: true,
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
    canExportUltraHD: false,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: true,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: true,
    resolution: "1080p",
    quality: ["standard", "high"],
    maxDurationMinutes: 60,
  },
  industry: {
    maxProjects: -1, // unlimited
    maxCharactersPerProject: -1,
    maxScenesPerProject: -1,
    maxGenerationsPerMonth: -1,
    maxMovieExports: -1,
    maxCollaboratorsPerProject: -1,
    maxScriptsPerProject: -1,
    maxStorageMB: -1,
    canUseQuickGenerate: true,
    canUseTrailerGeneration: true,
    canUseBulkGenerate: true,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: true,
    canUseBudgetEstimator: true,
    canUseColorGrading: true,
    canUseSoundEffects: true,
    canUseVisualEffects: true,
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
    canExportUltraHD: true,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: true,
    canUseAISubtitleGen: true,
    canUseAILocationSuggest: true,
    resolution: "4k",
    quality: ["standard", "high", "ultra"],
    maxDurationMinutes: 180,
  },
};

// ============================================================
// PRICING CONFIGURATION
// ============================================================

export interface TierPricing {
  monthly: number;
  annual: number; // per month, billed annually (20% off)
  annualTotal: number; // total annual price
}

export const TIER_PRICING: Record<Exclude<SubscriptionTier, "free">, TierPricing> = {
  creator: { monthly: 29, annual: 23, annualTotal: 276 },
  pro: { monthly: 99, annual: 79, annualTotal: 948 },
  industry: { monthly: 499, annual: 399, annualTotal: 4788 },
};

// Generation Top-Up Packs (for users who run out mid-month)
export interface TopUpPack {
  id: string;
  name: string;
  generations: number;
  price: number;
  pricePerGen: number;
  savings: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup_10", name: "Starter Pack", generations: 10, price: 9.99, pricePerGen: 1.00, savings: "" },
  { id: "topup_30", name: "Creator Pack", generations: 30, price: 24.99, pricePerGen: 0.83, savings: "Save 17%" },
  { id: "topup_100", name: "Studio Pack", generations: 100, price: 69.99, pricePerGen: 0.70, savings: "Save 30%" },
];

// Referral Rewards
export const REFERRAL_REWARDS = {
  referrerGenerations: 15,
  newUserGenerations: 10,
  maxReferralsPerMonth: 20,
};

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

/**
 * Get the effective tier for a user. Admin always gets industry-level access.
 */
export function getEffectiveTier(user: User): SubscriptionTier {
  // Admin email always gets full access
  if (user.email === ENV.adminEmail || user.role === "admin") {
    return "industry";
  }
  // Active subscription
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
    return (user.subscriptionTier as SubscriptionTier) || "free";
  }
  return "free";
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
  if (limits.maxGenerationsPerMonth === -1) return; // unlimited
  
  const used = user.monthlyGenerationsUsed || 0;
  const bonus = user.bonusGenerations || 0;
  const resetAt = user.monthlyGenerationsResetAt;
  
  // Check if we need to reset the counter (new month)
  if (resetAt && new Date() > new Date(resetAt)) {
    // Counter will be reset by the calling code
    return;
  }
  
  // Total available = plan allocation + bonus generations from referrals/top-ups
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
  if (max === -1) return; // unlimited
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
 * Create a Stripe Checkout session for subscription.
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

/**
 * Map a Stripe price ID to a subscription tier.
 */
export function priceIdToTier(priceId: string): SubscriptionTier {
  // Monthly prices
  if (priceId === ENV.stripeCreatorMonthlyPriceId) return "creator";
  if (priceId === ENV.stripeProPriceId || priceId === ENV.stripeProMonthlyPriceId) return "pro";
  if (priceId === ENV.stripeIndustryPriceId || priceId === ENV.stripeIndustryMonthlyPriceId) return "industry";
  // Annual prices
  if (priceId === ENV.stripeCreatorAnnualPriceId) return "creator";
  if (priceId === ENV.stripeProAnnualPriceId) return "pro";
  if (priceId === ENV.stripeIndustryAnnualPriceId) return "industry";
  return "free";
}
