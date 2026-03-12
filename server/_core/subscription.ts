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

export type SubscriptionTier = "independent" | "creator" | "studio" | "industry";
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
  monthlyCredits: number;  // Credits granted each month with subscription
}

/**
 * ENTERPRISE FILM PRODUCTION PRICING MODEL (USD)
 * 
 * Virelle Studios is a premium AI film production platform.
 * BYOK (Bring Your Own Key) — users provide their own API keys for video, voice, and music generation.
 * The platform charges membership + credits for every action.
 * 
 * NO FREE TIER — This is a professional tool.
 * 
 * MEMBERSHIP TIERS (required to use the platform):
 *   Independent — $5,000/month ($50,000/year) — 50 credits/month included
 *   Creator    — $10,000/month ($100,000/year) — 150 credits/month included
 *   Studio     — $15,000/month ($150,000/year) — 300 credits/month included
 *   Industry   — $25,000/month ($250,000/year) — 600 credits/month included
 * 
 * CREDITS SYSTEM — Every action costs credits:
 *   Create New Project:                      FREE (zero friction)
 *   Generate Film (AI scene breakdown):       5 credits
 *   Generate Scene Video (duration-scaled):
 *     ≤15s                                   3 credits
 *     16–45s                                 5 credits
 *     46–90s                                 7 credits
 *     >90s                                  10 credits
 *   Regenerate Scene Video:                  80% of generate cost (min 2)
 *   Generate Preview Image:                  1 credit
 *   Bulk Generate Previews:                  1 credit/scene
 *   Bulk Generate Videos:                    duration-scaled per scene
 *   Virelle AI Chat (per message):           1 credit
 *   Script Writer AI:                        3 credits
 *   Storyboard AI Generation:                3 credits
 *   Dialogue Editor AI Polish:               2 credits
 *   Continuity Check AI:                     2 credits
 *   Shot List AI Generation:                 2 credits
 *   Subtitle Generation:                     3 credits (large context)
 *   Budget Estimate AI:                      2 credits
 *   Trailer Generation:                      8 credits (4–6 clips)
 *   Ad/Poster Generation:                    2 credits
 *   Blog Article Generation:                 2 credits
 *   Export Final Film:                       3 credits (no AI cost)
 *   Movie Export:                            2 credits
 * 
 * CREDIT PACKS (top-ups, USD):
 *   10 credits  = $500
 *   50 credits  = $2,000
 *   100 credits = $3,500
 *   500 credits = $12,500
 *   1000 credits = $20,000
 * 
 * KEY DESIGN: Included credits are "almost enough" for a typical project,
 * forcing users to purchase credit packs or upgrade tiers mid-production.
 */

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  // ─── INDEPENDENT ─── Full production pipeline: 90 min films, 4K, all core tools
  independent: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 200,
    maxMovieExports: 25,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 15,
    maxStorageMB: 50000, // 50GB
    // Core tools — all enabled for Independent
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
    // Industry-only features — NOT available on Independent
    canUseVisualEffects: false,
    canUseBulkGenerate: false,
    canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false,
    canUseNLEExport: false,
    canUseAICasting: false,
    canExportUltraHD: true, // 4K available for Independent
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "4k",
    quality: ["standard", "high"],
    maxDurationMinutes: 90,
    maxClipsPerScene: 8,
    monthlyCredits: 50,
  },
  // ─── CREATOR ─── $10,000/month — 150 credits, 120 min films, pro tools
  creator: {
    maxProjects: 50,
    maxCharactersPerProject: 50,
    maxScenesPerProject: 120,
    maxGenerationsPerMonth: 500,
    maxMovieExports: 50,
    maxCollaboratorsPerProject: 10,
    maxScriptsPerProject: 30,
    maxStorageMB: 100000,
    canUseQuickGenerate: true, canUseTrailerGeneration: true, canUseDirectorAssistant: true,
    canUseAdPosterMaker: true, canUseBudgetEstimator: true, canUseColorGrading: true,
    canUseSoundEffects: true, canUseSubtitles: true, canUseDialogueEditor: true,
    canUseLocationScout: true, canUseMoodBoard: true, canUseShotList: true,
    canUseContinuityCheck: true, canUseScriptWriter: true, canUseStoryboard: true,
    canUseCollaboration: true, canExportMovies: true, canExportHD: true,
    canUseAICharacterGen: true, canUseAIScriptGen: true, canUseAIDialogueGen: true,
    canUseAIBudgetGen: true, canUseAISubtitleGen: true, canUseAILocationSuggest: true,
    canUseFullFilmGeneration: true, canUseAIVoiceActing: true, canUseAISoundtrack: true,
    canUseCharacterConsistency: true, canUseSceneContinuity: true, canUseClipChaining: true,
    canUseVisualEffects: true, canUseBulkGenerate: false, canUseMultiShotSequencer: true,
    canUseLiveActionPlate: false, canUseNLEExport: true, canUseAICasting: true,
    canExportUltraHD: true, canUseWhiteLabel: false, canUseAPIAccess: false,
    canUseCustomFineTuning: false, canUsePriorityRendering: false,
    resolution: "4k", quality: ["standard", "high"], maxDurationMinutes: 120, maxClipsPerScene: 10,
    monthlyCredits: 150,
  },
  // ─── STUDIO ─── $15,000/month — 300 credits, 150 min films, advanced tools
  studio: {
    maxProjects: 100,
    maxCharactersPerProject: 100,
    maxScenesPerProject: 150,
    maxGenerationsPerMonth: 1000,
    maxMovieExports: 100,
    maxCollaboratorsPerProject: 25,
    maxScriptsPerProject: 50,
    maxStorageMB: 250000,
    canUseQuickGenerate: true, canUseTrailerGeneration: true, canUseDirectorAssistant: true,
    canUseAdPosterMaker: true, canUseBudgetEstimator: true, canUseColorGrading: true,
    canUseSoundEffects: true, canUseSubtitles: true, canUseDialogueEditor: true,
    canUseLocationScout: true, canUseMoodBoard: true, canUseShotList: true,
    canUseContinuityCheck: true, canUseScriptWriter: true, canUseStoryboard: true,
    canUseCollaboration: true, canExportMovies: true, canExportHD: true,
    canUseAICharacterGen: true, canUseAIScriptGen: true, canUseAIDialogueGen: true,
    canUseAIBudgetGen: true, canUseAISubtitleGen: true, canUseAILocationSuggest: true,
    canUseFullFilmGeneration: true, canUseAIVoiceActing: true, canUseAISoundtrack: true,
    canUseCharacterConsistency: true, canUseSceneContinuity: true, canUseClipChaining: true,
    canUseVisualEffects: true, canUseBulkGenerate: true, canUseMultiShotSequencer: true,
    canUseLiveActionPlate: true, canUseNLEExport: true, canUseAICasting: true,
    canExportUltraHD: true, canUseWhiteLabel: false, canUseAPIAccess: true,
    canUseCustomFineTuning: false, canUsePriorityRendering: true,
    resolution: "4k", quality: ["standard", "high", "ultra"], maxDurationMinutes: 150, maxClipsPerScene: 12,
    monthlyCredits: 300,
  },
  // ─── INDUSTRY ─── $25,000/month — 600 credits, 180 min, white-label, API, fine-tuning, priority
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
    monthlyCredits: 600,
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
    requiredTier: "independent",
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
    requiredTier: "independent",
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
    requiredTier: "independent",
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

// ============================================================
// SCENE-BY-SCENE PRICING — Individual scene production
// ============================================================

export interface SceneByScenePricing {
  pricePerScene: number;        // Price per individual scene in USD
  sceneDurationSeconds: string; // Duration range per scene
  features: string[];
}

export const SCENE_BY_SCENE_PRICING: SceneByScenePricing = {
  pricePerScene: 10000,
  sceneDurationSeconds: "30-60",
  features: [
    "30-60 seconds of AI-generated cinematic footage",
    "AI voice acting & dialogue",
    "AI soundtrack per scene",
    "Character consistency",
    "Art direction control",
    "Color grading",
    "2 revision passes per scene",
    "1080p or 4K export",
  ],
};

// Launch special flag — set to false to disable 50% off
export const LAUNCH_SPECIAL_ACTIVE = true;
export const LAUNCH_SPECIAL_DISCOUNT = 0.5; // 50% off first film

// ============================================================
// PLATFORM MEMBERSHIP — Annual access to tools (required)
// ============================================================

export interface TierPricing {
  monthly: number;       // monthly price when paying monthly via direct debit
  annual: number;        // effective monthly price when paying annually
  annualTotal: number;   // total annual price
  monthlyTotal: number;  // total if paid monthly for 12 months (monthly × 12)
}

/**
 * Platform membership pricing (USD).
 * Membership is REQUIRED to use the Virelle Studios platform.
 * Every action costs credits. Included credits are designed to get users
 * started but not enough for full productions — driving credit pack purchases.
 * 
 * Independent: $5,000/mo ($50,000/yr)  — 50 credits/mo, 90 min films
 * Creator:     $10,000/mo ($100,000/yr) — 150 credits/mo, 120 min films
 * Studio:      $15,000/mo ($150,000/yr) — 300 credits/mo, 150 min films
 * Industry:    $25,000/mo ($250,000/yr) — 600 credits/mo, 180 min films, white-label, API
 */
export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  independent: { monthly: 5000, annual: 4167, annualTotal: 50000, monthlyTotal: 60000 },
  creator:     { monthly: 10000, annual: 8333, annualTotal: 100000, monthlyTotal: 120000 },
  studio:      { monthly: 15000, annual: 12500, annualTotal: 150000, monthlyTotal: 180000 },
  industry:    { monthly: 25000, annual: 20833, annualTotal: 250000, monthlyTotal: 300000 },
};

// Referral Rewards
export const REFERRAL_REWARDS = {
  referrerGenerations: 15,
  newUserGenerations: 10,
  maxReferralsPerMonth: 20,
};

// ============================================================
// CREDIT COSTS PER ACTION
// Every meaningful action costs credits. Designed so included
// credits are "almost enough" for a full production but not quite.
//
// Pricing philosophy:
//   1 credit ≈ $35–50 in customer value (blended across pack sizes).
//   Actual API costs are a small fraction of credit value — the margin
//   funds platform infrastructure, support, and R&D.
//
// Video generation is the highest real API cost (~$0.10/s for Runway
//   Gen-4 / Sora). A 45s scene costs ~$4.50 in API fees.
//   Duration-scaled credits are applied at the call site in routers.ts
//   using getVideoCredits(durationSeconds) below.
//
// LLM calls (GPT-4o) cost ~$0.03–0.20 per call depending on context.
// Image generation (DALL-E 3 HD) costs ~$0.08 per image.
// Voice transcription (Whisper) costs ~$0.006/min.
// ============================================================

export const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  // ── Core video generation ──────────────────────────────────
  // Flat cost is the MINIMUM — actual cost scales with scene duration
  // via getVideoCredits(durationSeconds) in routers.ts
  generate_film:           { cost: 5,  label: "Generate Film (AI scene breakdown + script)" },
  generate_scene_video:    { cost: 5,  label: "Generate Scene Video (≤45s; longer scenes cost more)" },
  regenerate_scene_video:  { cost: 4,  label: "Regenerate Scene Video (≤45s; same API cost as generate)" },
  generate_preview_image:  { cost: 1,  label: "Generate Preview Image (DALL-E 3 HD)" },
  bulk_generate_previews:  { cost: 1,  label: "Bulk Generate Previews (per scene — image only)" },
  bulk_generate_videos:    { cost: 5,  label: "Bulk Generate Videos (per scene — duration-scaled)" },
  // ── AI writing & production tools ─────────────────────────
  virelle_chat:            { cost: 1,  label: "Virelle AI Chat / Director Assistant (per message)" },
  script_writer_ai:        { cost: 3,  label: "AI Script Writer (full screenplay generation)" },
  storyboard_ai:           { cost: 3,  label: "AI Storyboard Generation" },
  dialogue_editor_ai:      { cost: 2,  label: "AI Dialogue Polish" },
  continuity_check_ai:     { cost: 2,  label: "AI Continuity Check" },
  shot_list_ai:            { cost: 2,  label: "AI Shot List Generation" },
  character_gen_ai:        { cost: 2,  label: "AI Character Generation" },
  location_scout_ai:       { cost: 1,  label: "AI Location Scout (suggestions + image)" },
  budget_estimate_ai:      { cost: 2,  label: "AI Budget Estimate (multi-scene analysis)" },
  subtitle_gen_ai:         { cost: 3,  label: "AI Subtitle Generation (full film, large context)" },
  trailer_gen:             { cost: 8,  label: "Trailer Generation (4–6 video clips, ~2 min)" },
  ad_poster_gen:           { cost: 2,  label: "Ad/Poster Generation (DALL-E 3 HD)" },
  blog_article_gen:        { cost: 2,  label: "Blog Article Generation (full article, ~1500 words)" },
  // ── Export & project management ───────────────────────────
  export_final_film:       { cost: 3,  label: "Export Final Film (assembly, no AI cost)" },
  create_project:          { cost: 0,  label: "Create New Project (FREE — no friction on start)" },
  movie_export:            { cost: 2,  label: "Movie Export (scenes/trailer export)" },
};

/**
 * Duration-scaled video credit cost.
 * Runway Gen-4 / Sora charge ~$0.10/s. A 45s scene costs ~$4.50 in API fees.
 * We scale credits with duration to ensure profitability on long scenes
 * while keeping short scenes affordable.
 *
 * Tiers:
 *   ≤15s   → 3 credits  (short clip, ~$1.50 API cost)
 *   16–45s → 5 credits  (standard scene, ~$4.50 API cost)
 *   46–90s → 7 credits  (long scene, ~$9 API cost)
 *   >90s   → 10 credits (extended scene, ~$12+ API cost)
 *
 * For regeneration, apply a 20% discount (same API cost, but customer
 * is retrying — reward persistence without giving it away free).
 */
export function getVideoCredits(durationSeconds: number, isRegenerate = false): number {
  let credits: number;
  if (durationSeconds <= 15) {
    credits = 3;
  } else if (durationSeconds <= 45) {
    credits = 5;
  } else if (durationSeconds <= 90) {
    credits = 7;
  } else {
    credits = 10;
  }
  if (isRegenerate) {
    credits = Math.max(2, Math.round(credits * 0.8));
  }
  return credits;
}

// Credit Top-Up Packs (USD)
export interface TopUpPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  savings: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup_10",   name: "Starter Pack",    credits: 10,   price: 500,    pricePerCredit: 50,  savings: "" },
  { id: "topup_50",   name: "Production Pack",  credits: 50,   price: 2000,   pricePerCredit: 40,  savings: "Save 20%" },
  { id: "topup_100",  name: "Director Pack",    credits: 100,  price: 3500,   pricePerCredit: 35,  savings: "Save 30%" },
  { id: "topup_200",  name: "Studio Pack",      credits: 200,  price: 6000,   pricePerCredit: 30,  savings: "Save 40%" },
  { id: "topup_500",  name: "Executive Pack",   credits: 500,  price: 12500,  pricePerCredit: 25,  savings: "Save 50%" },
  { id: "topup_1000", name: "Mogul Pack",       credits: 1000, price: 20000,  pricePerCredit: 20,  savings: "Save 60%" },
];

// ============================================================
// STRIPE PRICE ID RESOLVER
// ============================================================

/**
 * Resolve a Stripe price ID to a subscription tier.
 * Used by the webhook handler to determine which tier a subscription belongs to.
 */
export function priceIdToTier(priceId: string): SubscriptionTier {
  const { getStripePriceId } = require("./stripeProvisioning");

  // Check all 4 tiers
  const tierKeys: { tier: SubscriptionTier; keys: string[] }[] = [
    { tier: "independent", keys: [
      getStripePriceId("independent_monthly"), getStripePriceId("independent_annual"),
      (ENV as any).stripeIndependentMonthlyPriceId, (ENV as any).stripeIndependentAnnualPriceId,
      ENV.stripeCreatorMonthlyPriceId, ENV.stripeCreatorAnnualPriceId, ENV.stripeProPriceId,
    ]},
    { tier: "creator", keys: [
      getStripePriceId("creator_monthly"), getStripePriceId("creator_annual"),
    ]},
    { tier: "studio", keys: [
      getStripePriceId("studio_monthly"), getStripePriceId("studio_annual"),
    ]},
    { tier: "industry", keys: [
      getStripePriceId("industry_monthly"), getStripePriceId("industry_annual"),
      ENV.stripeIndustryPriceId, ENV.stripeIndustryMonthlyPriceId, ENV.stripeIndustryAnnualPriceId,
    ]},
  ];

  for (const { tier, keys } of tierKeys) {
    if (keys.filter(Boolean).includes(priceId)) return tier;
  }

  // Fallback: infer from naming
  const lower = priceId.toLowerCase();
  if (lower.includes("studio")) return "studio";
  if (lower.includes("creator")) return "creator";
  if (lower.includes("industry") || lower.includes("enterprise")) return "industry";
  if (lower.includes("independent")) return "independent";

  console.warn(`[Subscription] Unknown price ID: ${priceId}, defaulting to independent`);
  return "independent";
}

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

/**
 * Get the effective tier for a user. Admin always gets industry-level access.
 */
// Map old DB tier values to new tier names
function mapTierName(tier: string | null | undefined): SubscriptionTier {
  if (!tier) return "independent";
  if (tier === "industry" || tier === "enterprise") return "industry";
  if (tier === "studio") return "studio";
  if (tier === "creator") return "creator";
  // "pro", "independent" and anything else map to independent
  return "independent";
}

export function getEffectiveTier(user: User): SubscriptionTier {
  if (user.email === ENV.adminEmail || user.role === "admin") {
    return "industry";
  }
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
    return mapTierName(user.subscriptionTier);
  }
  return "independent";
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
 * Supports both annual (card) and monthly (direct debit / ACH + card) billing.
 */
export async function createCheckoutSession(
  user: User,
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  billing: "monthly" | "annual" = "annual",
  trialDays?: number,
  applyFoundingDiscount?: boolean
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  // Monthly billing supports direct debit (ACH bank transfer) + card
  // Annual billing is card-only
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    billing === "monthly"
      ? ["card", "us_bank_account"]
      : ["card"];

  // Auto-create or find the founding member 50% off coupon for annual billing
  let couponId: string | undefined;
  if (applyFoundingDiscount && billing === "annual") {
    try {
      // Look for existing founding coupon
      const coupons = await stripe.coupons.list({ limit: 100 });
      const existing = coupons.data.find(c => c.name === "Founding Director — 50% Off First Year" && c.valid);
      if (existing) {
        couponId = existing.id;
      } else {
        // Create the coupon: 50% off, first year only (once), limited redemptions
        const coupon = await stripe.coupons.create({
          name: "Founding Director — 50% Off First Year",
          percent_off: 50,
          duration: "once", // applies to first invoice only
          max_redemptions: 50, // limited to 50 founding directors
          metadata: { type: "founding_offer" },
        });
        couponId = coupon.id;
      }
    } catch (err: any) {
      console.error(`[Checkout] Failed to create/find founding coupon: ${err.message}`);
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    payment_method_types: paymentMethodTypes,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(user.id),
      billing,
      ...(applyFoundingDiscount ? { foundingOffer: "true" } : {}),
    },
    subscription_data: {
      metadata: {
        userId: String(user.id),
        billing,
      },
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      ...(couponId ? { coupon: couponId } : {}),
    },
    // For ACH direct debit, allow mandate collection
    ...(billing === "monthly" ? {
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method" as any],
          },
          verification_method: "instant" as any,
        },
      },
    } : {}),
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


// ============================================================
// CREDIT SYSTEM HELPERS
// ============================================================

/**
 * Check if user has enough credits for an action. Throws if not.
 */
export function requireCredits(user: User, action: string, multiplier: number = 1): number {
  // Admins have unlimited credits — always pass
  if ((user as any).role === "admin") {
    return 0;
  }

  const creditDef = CREDIT_COSTS[action];
  if (!creditDef) {
    console.warn(`[Credits] Unknown action: ${action}, allowing through`);
    return 0;
  }

  const totalCost = creditDef.cost * multiplier;
  const balance = (user as any).creditBalance || 0;

  if (balance < totalCost) {
    throw new Error(
      `INSUFFICIENT_CREDITS: This action requires ${totalCost} credit${totalCost !== 1 ? "s" : ""} (${creditDef.label}${multiplier > 1 ? ` x${multiplier}` : ""}). You have ${balance} credits remaining. Purchase a credit pack to continue.`
    );
  }

  return totalCost;
}

/**
 * Get the credit cost for an action without checking balance.
 */
export function getCreditCost(action: string, multiplier: number = 1): number {
  const creditDef = CREDIT_COSTS[action];
  if (!creditDef) return 0;
  return creditDef.cost * multiplier;
}
