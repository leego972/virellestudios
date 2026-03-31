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

// Internal DB tier keys — display names are mapped in the frontend:
//   "indie"       → "Indie"       (A$149/mo — 500 credits — entry tier)
//   "amateur"     → "Creator"     (A$490/mo — 2,000 credits)
//   "independent" → "Studio"      (A$1,490/mo — 6,000 credits)
//   "studio"      → "Production"  (From A$4,990/mo — 15,500 credits)
//   "industry"    → "Enterprise"  (Custom)
export type SubscriptionTier = "indie" | "amateur" | "independent" | "studio" | "industry" | "beta";
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
  // Studio-tier features
  canUseVisualEffects: boolean;
  canUseBulkGenerate: boolean;
  canUseMultiShotSequencer: boolean;
  canUseLiveActionPlate: boolean;
  canUseNLEExport: boolean;
  canUseAICasting: boolean;
  canExportUltraHD: boolean;
  // Industry Enterprise-tier features
  canUseWhiteLabel: boolean;
  canUseAPIAccess: boolean;
  canUseCustomFineTuning: boolean;
  canUsePriorityRendering: boolean;
  resolution: "720p" | "1080p" | "4k";
  quality: ("standard" | "high" | "ultra")[];
  maxDurationMinutes: number;
  maxClipsPerScene: number;
  monthlyCredits: number;  // Credits granted each month with subscription
}

/**
 * VIRELLE STUDIOS — PREMIUM AI FILM PRODUCTION PLATFORM
 *
 * Pricing architecture (AUD):
 *
 * MEMBERSHIP TIERS (required to use the platform):
 *   Indie (DB: "indie")                — A$149/month   or A$1,490/year   — 500 credits/month
 *   Creator (DB: "amateur")            — A$490/month   or A$4,900/year   — 2,000 credits/month
 *   Studio (DB: "independent")         — A$1,490/month or A$14,900/year  — 6,000 credits/month
 *   Production (DB: "studio")          — From A$4,990/month (consultative) — 15,500 credits/month
 *   Enterprise (DB: "industry")        — Custom pricing (sales-led)      — 50,500 credits/month
 *
 * FOUNDING MEMBER OFFER: 50% off first year on annual billing (VIRELLE_FOUNDER_50 coupon)
 *   Applies to Creator and Studio annual plans only.
 *
 * CREDITS SYSTEM — Every action costs credits:
 *   Create New Project:                      FREE
 *   Generate Film (AI scene breakdown):       10 credits
 *   Generate Scene Video (≤45s):             10 credits
 *   Regenerate Scene Video:                   8 credits
 *   Generate Preview Image:                   3 credits
 *   Bulk Generate Previews (per scene):       3 credits
 *   Bulk Generate Videos (per scene):        10 credits
 *   Virelle AI Chat (per message):            2 credits
 *   Script Writer AI:                         8 credits
 *   Storyboard AI Generation:                 8 credits
 *   Dialogue Editor AI Polish:                5 credits
 *   Continuity Check AI:                      5 credits
 *   Shot List AI Generation:                  5 credits
 *   Subtitle Generation:                      8 credits
 *   Budget Estimate AI:                       5 credits
 *   Trailer Generation:                      20 credits
 *   Ad/Poster Generation:                     5 credits
 *   Export Final Film:                        8 credits
 *
 * CREDIT PACKS (AUD — one-time top-ups):
 *   Starter Pack     — 100 credits    A$19     (A$0.19/credit)
 *   Producer Pack    — 300 credits    A$49     (A$0.16/credit)
 *   Director Pack    — 750 credits    A$99     (A$0.13/credit)
 *   Studio Pack      — 2,000 credits  A$199    (A$0.10/credit)
 *   Blockbuster Pack — 5,000 credits  A$399    (A$0.08/credit)
 *   Mogul Pack       — 12,000 credits A$799    (A$0.07/credit)
 */

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {

  // ─── INDIE (DB: "indie") ─── A$149/month — 500 credits/month ───────────────
  // Entry tier: screenplay tools, character creator, director assistant, shot list.
  // No video generation, no voice acting, no film score, no export.
  indie: {
    maxProjects: 2,
    maxCharactersPerProject: 3,
    maxScenesPerProject: 3,
    maxGenerationsPerMonth: 10,
    maxMovieExports: 0,
    maxCollaboratorsPerProject: 1,
    maxScriptsPerProject: 1,
    maxStorageMB: 500,
    canUseQuickGenerate: false,
    canUseTrailerGeneration: false,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: false,
    canUseBudgetEstimator: true,
    canUseColorGrading: false,
    canUseSoundEffects: false,
    canUseSubtitles: false,
    canUseDialogueEditor: true,
    canUseLocationScout: true,
    canUseMoodBoard: true,
    canUseShotList: true,
    canUseContinuityCheck: false,
    canUseScriptWriter: true,
    canUseStoryboard: false,
    canUseCollaboration: false,
    canExportMovies: false,
    canExportHD: false,
    canUseAICharacterGen: true,
    canUseAIScriptGen: true,
    canUseAIDialogueGen: true,
    canUseAIBudgetGen: false,
    canUseAISubtitleGen: false,
    canUseAILocationSuggest: true,
    canUseFullFilmGeneration: false,
    canUseAIVoiceActing: false,
    canUseAISoundtrack: false,
    canUseCharacterConsistency: false,
    canUseSceneContinuity: false,
    canUseClipChaining: false,
    canUseVisualEffects: false,
    canUseBulkGenerate: false,
    canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false,
    canUseNLEExport: false,
    canUseAICasting: false,
    canExportUltraHD: false,
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "720p",
    quality: ["standard"],
    maxDurationMinutes: 0,
    maxClipsPerScene: 0,
    monthlyCredits: 500,
  },

  // ─── CREATOR (DB: "amateur") ─── A$490/month — 2,000 credits/month ──────────
  amateur: {
    maxProjects: 10,
    maxCharactersPerProject: 10,
    maxScenesPerProject: 20,
    maxGenerationsPerMonth: 100,
    maxMovieExports: 10,
    maxCollaboratorsPerProject: 1,
    maxScriptsPerProject: 5,
    maxStorageMB: 10000, // 10 GB
    canUseQuickGenerate: true,
    canUseTrailerGeneration: false,
    canUseDirectorAssistant: true,
    canUseAdPosterMaker: false,
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
    canUseCollaboration: false,
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
    canUseVisualEffects: false,
    canUseBulkGenerate: false,
    canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false,
    canUseNLEExport: false,
    canUseAICasting: false,
    canExportUltraHD: false,
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "1080p",
    quality: ["standard", "high"],
    maxDurationMinutes: 90,
    maxClipsPerScene: 5,
    monthlyCredits: 2000,
  },

  // ─── STUDIO (DB: "independent") ─── A$1,490/month — 6,000 credits/month ───
  independent: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 500,
    maxMovieExports: 50,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 25,
    maxStorageMB: 100000, // 100 GB
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
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: true,
    resolution: "4k",
    quality: ["standard", "high", "ultra"],
    maxDurationMinutes: 90,
    maxClipsPerScene: 10,
    monthlyCredits: 6000,
  },

  // ─── STUDIO alias (DB: "creator") ─── same limits as independent ───
  creator: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 500,
    maxMovieExports: 50,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 25,
    maxStorageMB: 100000, // 100 GB
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
    canExportUltraHD: true, canUseWhiteLabel: false, canUseAPIAccess: false,
    canUseCustomFineTuning: false, canUsePriorityRendering: true,
    resolution: "4k", quality: ["standard", "high", "ultra"], maxDurationMinutes: 90, maxClipsPerScene: 10,
    monthlyCredits: 6000,
  },

  // ─── PRODUCTION (DB: "studio") ─── From A$4,990/month — 15,500 credits/month ───
  studio: {
    maxProjects: 100,
    maxCharactersPerProject: 100,
    maxScenesPerProject: 300,
    maxGenerationsPerMonth: 2000,
    maxMovieExports: 200,
    maxCollaboratorsPerProject: 25,
    maxScriptsPerProject: 100,
    maxStorageMB: 500000, // 500 GB
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
    canExportUltraHD: true, canUseWhiteLabel: true, canUseAPIAccess: true,
    canUseCustomFineTuning: false, canUsePriorityRendering: true,
    resolution: "4k", quality: ["standard", "high", "ultra"], maxDurationMinutes: 150, maxClipsPerScene: 20,
    monthlyCredits: 15500,
  },

  // ─── ENTERPRISE (DB: "industry") ─── Custom pricing — 50,500 credits/month ───
  industry: {
    maxProjects: 1000,
    maxCharactersPerProject: 1000,
    maxScenesPerProject: 1000,
    maxGenerationsPerMonth: 10000,
    maxMovieExports: 1000,
    maxCollaboratorsPerProject: 1000,
    maxScriptsPerProject: 1000,
    maxStorageMB: 5000000, // 5 TB
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
    maxClipsPerScene: 50,
    monthlyCredits: 50500,
  },

  // ─── BETA ─── FREE — Invite-only, full Industry Enterprise-level access ───
  beta: {
    maxProjects: -1,
    maxCharactersPerProject: -1,
    maxScenesPerProject: -1,
    maxGenerationsPerMonth: -1,
    maxMovieExports: -1,
    maxCollaboratorsPerProject: -1,
    maxScriptsPerProject: -1,
    maxStorageMB: -1,
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
    canExportUltraHD: true, canUseWhiteLabel: true, canUseAPIAccess: true,
    canUseCustomFineTuning: true, canUsePriorityRendering: true,
    resolution: "4k",
    quality: ["standard", "high", "ultra"],
    maxDurationMinutes: 180,
    maxClipsPerScene: 12,
    monthlyCredits: 5000,
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
  fullPrice: number;
  launchPrice: number;
  features: string[];
  requiredTier: SubscriptionTier;
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
      "AI voice acting & soundtrack",
      "4K export",
      "Subtitles in 130+ languages",
    ],
    requiredTier: "independent",
  },
  {
    id: "feature_film",
    name: "Feature Film",
    description: "Up to 90 minutes — full-length feature production",
    maxDurationMinutes: 90,
    fullPrice: 200000,
    launchPrice: 100000,
    features: [
      "Up to 90-minute film",
      "Full AI screenplay + storyboard",
      "120+ cinematic scenes",
      "AI voice acting & soundtrack",
      "4K + ProRes export",
      "Subtitles in 130+ languages",
      "Trailer generation",
    ],
    requiredTier: "independent",
  },
];

// ============================================================
// PLATFORM MEMBERSHIP PRICING (AUD)
// ============================================================

export interface TierPricing {
  monthly: number;       // AUD monthly price (in cents)
  annual: number;        // AUD effective monthly price when paying annually (in cents)
  annualTotal: number;   // AUD total annual price (in cents)
  monthlyTotal: number;  // AUD total if paid monthly for 12 months (in cents)
  displayName: string;   // Public-facing tier name
}

/**
 * Platform membership pricing (AUD, in cents).
 *
 * Auteur (amateur):           A$1,250/mo  (A$12,000/yr)  — 2,000 credits/mo
 * Production Pro (independent): A$3,900/mo (A$36,000/yr) — 5,500 credits/mo
 * Studio:                     From A$150,000/yr (consultative) — 15,500 credits/mo
 * Industry Enterprise:        Custom pricing (sales-led)  — 50,500 credits/mo
 */
export const TIER_PRICING: Record<SubscriptionTier, TierPricing> = {
  // All prices in AUD cents. annual = monthly equivalent when billed annually.
  indie:       { monthly: 14900,  annual: 12400,  annualTotal: 149000,  monthlyTotal: 178800,  displayName: "Indie" },
  amateur:     { monthly: 49000,  annual: 40800,  annualTotal: 490000,  monthlyTotal: 588000,  displayName: "Creator" },
  independent: { monthly: 149000, annual: 124100, annualTotal: 1490000, monthlyTotal: 1788000, displayName: "Studio" },
  creator:     { monthly: 149000, annual: 124100, annualTotal: 1490000, monthlyTotal: 1788000, displayName: "Studio" },
  studio:      { monthly: 0, annual: 0, annualTotal: 15000000, monthlyTotal: 0, displayName: "Production" }, // From A$150,000/yr — consultative
  industry:    { monthly: 0, annual: 0, annualTotal: 0, monthlyTotal: 0, displayName: "Enterprise" }, // Custom
  beta:        { monthly: 0, annual: 0, annualTotal: 0, monthlyTotal: 0, displayName: "Beta" },
};

// Display name lookup (for use in emails, UI labels, etc.)
export const TIER_DISPLAY_NAMES: Record<string, string> = {
  indie: "Indie",
  amateur: "Creator",
  independent: "Studio",
  creator: "Studio",
  studio: "Production",
  industry: "Enterprise",
  beta: "Beta",
};

// Launch special flag — set to false to disable 50% off
export const LAUNCH_SPECIAL_ACTIVE = true;
export const LAUNCH_SPECIAL_DISCOUNT = 0.5; // 50% off first year of annual Creator / Studio

// ============================================================
// CREDIT COSTS PER ACTION
// ============================================================

export const CREDIT_COSTS: Record<string, { cost: number; label: string }> = {
  // ── Core video generation ──────────────────────────────────
  generate_film:           { cost: 10,  label: "Generate Film (AI scene breakdown + script, full pipeline)" },
  generate_scene_video:    { cost: 10,  label: "Generate Scene Video (≤45s; longer scenes cost more)" },
  regenerate_scene_video:  { cost: 8,   label: "Regenerate Scene Video (≤45s; 80% of generate cost)" },
  generate_preview_image:  { cost: 3,   label: "Generate Preview Image (DALL-E 3 HD)" },
  bulk_generate_previews:  { cost: 3,   label: "Bulk Generate Previews (per scene — image only)" },
  bulk_generate_videos:    { cost: 10,  label: "Bulk Generate Videos (per scene — duration-scaled)" },
  // ── AI writing & production tools ─────────────────────────
  virelle_chat:            { cost: 2,   label: "Virelle AI Chat / Director Assistant (per message)" },
  director_assistant:      { cost: 2,   label: "Director's Assistant SSE stream message" },
  voice_tts:               { cost: 2,   label: "Voice TTS synthesis (ElevenLabs / OpenAI)" },
  script_writer_ai:        { cost: 8,   label: "AI Script Writer (full screenplay generation)" },
  storyboard_ai:           { cost: 8,   label: "AI Storyboard Generation (full visual breakdown)" },
  dialogue_editor_ai:      { cost: 5,   label: "AI Dialogue Polish (scene-level rewrite)" },
  continuity_check_ai:     { cost: 5,   label: "AI Continuity Check (full film analysis)" },
  shot_list_ai:            { cost: 5,   label: "AI Shot List Generation (per scene)" },
  character_gen_ai:        { cost: 5,   label: "AI Character Generation (image + bio)" },
  location_scout_ai:       { cost: 3,   label: "AI Location Scout (suggestions + reference image)" },
  budget_estimate_ai:      { cost: 5,   label: "AI Budget Estimate (multi-scene analysis)" },
  subtitle_gen_ai:         { cost: 8,   label: "AI Subtitle Generation (full film, large context)" },
  trailer_gen:             { cost: 20,  label: "Trailer Generation (4–6 video clips, ~2 min cinematic)" },
  ad_poster_gen:           { cost: 5,   label: "Ad/Poster Image Generation (DALL-E 3 HD)" },
  ad_poster_copy_gen:      { cost: 3,   label: "Ad/Poster Copy Generation (AI tagline + description)" },
  ad_poster_video_gen:     { cost: 10,  label: "Ad/Poster Video Ad Generation (video clip via BYOK)" },
  tagline_variants_gen:    { cost: 3,   label: "AI Tagline Variants (5 distinct tagline options)" },
  brand_kit_gen:           { cost: 5,   label: "AI Brand Kit Generation (palette + fonts + logo concept)" },
  influencer_kit_gen:      { cost: 5,   label: "AI Influencer Kit Generation (press release + social copy)" },
  // ── Sound & voice generation ──────────────────────────────
  sfx_generate_from_text:  { cost: 5,   label: "AI Sound Effect Generation (ElevenLabs text-to-SFX)" },
  sfx_voice_choir:         { cost: 5,   label: "AI Voice Choir Generation (ElevenLabs TTS choir/wings)" },
  // ── Film Post-Production AI ──────────────────────────────
  film_post_adr_suggest:   { cost: 5,   label: "AI ADR Suggestions (dialogue replacement analysis per project)" },
  film_post_foley_suggest: { cost: 5,   label: "AI Foley Suggestions (sound design analysis per project)" },
  film_post_score_gen:     { cost: 8,   label: "AI Score Cue Generation (music cue breakdown per project)" },
  film_post_mix_export:    { cost: 2,   label: "Mix Summary Export (structured post-production report)" },
  // ── Funding Directory ─────────────────────────────────────
  funding_app_submit:      { cost: 10,  label: "Funding Application Submit (compiled pack + email delivery)" },
  // ── Blog & content ────────────────────────────────────────
  blog_article_gen:        { cost: 5,   label: "Blog Article Generation (full article, ~1500 words)" },
  // ── Export & project management ───────────────────────────
  export_final_film:       { cost: 8,   label: "Export Final Film (full assembly + render)" },
  create_project:          { cost: 0,   label: "Create New Project (FREE — no friction on start)" },
  movie_export:            { cost: 5,   label: "Movie Export (scenes/trailer export)" },
};

/**
 * Duration-scaled video credit cost.
 *   ≤15s   → 5 credits
 *   16–45s → 10 credits
 *   46–90s → 15 credits
 *   >90s   → 20 credits
 * For regeneration, apply a 20% discount (min 4 credits).
 */
export function getVideoCredits(durationSeconds: number, isRegenerate = false): number {
  let credits: number;
  if (durationSeconds <= 15) {
    credits = 5;
  } else if (durationSeconds <= 45) {
    credits = 10;
  } else if (durationSeconds <= 90) {
    credits = 15;
  } else {
    credits = 20;
  }
  if (isRegenerate) {
    credits = Math.max(4, Math.round(credits * 0.8));
  }
  return credits;
}

// ============================================================
// CREDIT TOP-UP PACKS (AUD)
// ============================================================

export interface TopUpPack {
  id: string;
  name: string;
  credits: number;
  price: number;       // AUD in cents
  pricePerCredit: number;
  savings: string;
}

export const TOP_UP_PACKS: TopUpPack[] = [
  { id: "topup_10",   name: "Starter Pack",     credits: 500,   price: 75000,   pricePerCredit: 1.50, savings: "" },
  { id: "topup_50",   name: "Producer Pack",    credits: 1500,  price: 180000,  pricePerCredit: 1.20, savings: "Save 20%" },
  { id: "topup_100",  name: "Director Pack",    credits: 3000,  price: 315000,  pricePerCredit: 1.05, savings: "Save 30%" },
  { id: "topup_200",  name: "Studio Pack",      credits: 6000,  price: 540000,  pricePerCredit: 0.90, savings: "Save 40%" },
  { id: "topup_500",  name: "Blockbuster Pack", credits: 12000, price: 900000,  pricePerCredit: 0.75, savings: "Save 50%" },
  { id: "topup_1000", name: "Mogul Pack",       credits: 25000, price: 1500000, pricePerCredit: 0.60, savings: "Save 60%" },
];

// Referral Rewards
export const REFERRAL_REWARDS = {
  referrerCredits: 7000,
  newUserCredits: 7000,
  maxReferralsPerMonth: 50,
  milestones: [
    { count: 3,  bonus: 25000,   label: "Rising Star" },
    { count: 5,  bonus: 50000,   label: "Connector" },
    { count: 10, bonus: 150000,  label: "Ambassador" },
    { count: 25, bonus: 500000,  label: "Legend" },
  ],
};

// ============================================================
// STRIPE PRICE ID RESOLVER
// ============================================================

export function priceIdToTier(priceId: string): SubscriptionTier {
  const { getStripePriceId } = require("./stripeProvisioning");

  const tierKeys: { tier: SubscriptionTier; keys: string[] }[] = [
    { tier: "indie", keys: [
      getStripePriceId("indie_monthly"), getStripePriceId("indie_annual"),
      (ENV as any).stripeIndieMonthlyPriceId, (ENV as any).stripeIndieAnnualPriceId,
    ]},
    { tier: "amateur", keys: [
      getStripePriceId("auteur_monthly"), getStripePriceId("auteur_annual"),
      getStripePriceId("amateur_monthly"), getStripePriceId("amateur_annual"),
    ]},
    { tier: "independent", keys: [
      getStripePriceId("production_pro_monthly"), getStripePriceId("production_pro_annual"),
      getStripePriceId("independent_monthly"), getStripePriceId("independent_annual"),
      (ENV as any).stripeIndependentMonthlyPriceId, (ENV as any).stripeIndependentAnnualPriceId,
      ENV.stripeCreatorMonthlyPriceId, ENV.stripeCreatorAnnualPriceId, ENV.stripeProPriceId,
      (ENV as any).stripeAuteurMonthlyPriceId, (ENV as any).stripeAuteurAnnualPriceId,
      (ENV as any).stripeProductionProMonthlyPriceId, (ENV as any).stripeProductionProAnnualPriceId,
    ]},
    { tier: "studio", keys: [
      getStripePriceId("studio_monthly"), getStripePriceId("studio_annual"),
    ]},
    { tier: "industry", keys: [
      getStripePriceId("industry_monthly"), getStripePriceId("industry_annual"),
      getStripePriceId("industry_enterprise_monthly"), getStripePriceId("industry_enterprise_annual"),
      ENV.stripeIndustryPriceId, ENV.stripeIndustryMonthlyPriceId, ENV.stripeIndustryAnnualPriceId,
    ]},
  ];

  for (const { tier, keys } of tierKeys) {
    if (keys.filter(Boolean).includes(priceId)) return tier;
  }

  // Fallback: infer from naming
  const lower = priceId.toLowerCase();
  if (lower.includes("studio")) return "studio";
  if (lower.includes("creator") || lower.includes("production_pro") || lower.includes("auteur")) return "independent";
  if (lower.includes("industry") || lower.includes("enterprise")) return "industry";
  if (lower.includes("independent") || lower.includes("pro")) return "independent";
  if (lower.includes("amateur")) return "amateur";
  if (lower.includes("indie")) return "indie";

  console.warn(`[Subscription] Unknown price ID: ${priceId}, defaulting to independent`);
  return "independent";
}

// ============================================================
// ACCESS CONTROL HELPERS
// ============================================================

function mapTierName(tier: string | null | undefined): SubscriptionTier {
  if (!tier) return "independent";
  if (tier === "industry" || tier === "enterprise" || tier === "industry_enterprise") return "industry";
  if (tier === "studio") return "studio";
  if (tier === "creator" || tier === "production_pro") return "independent";
  if (tier === "amateur" || tier === "auteur") return "amateur";
  if (tier === "indie") return "indie";
  // "pro", "independent" and anything else map to independent
  return "independent";
}

export function getEffectiveTier(user: User): SubscriptionTier {
  const isAdmin = user.role === "admin";
  if (isAdmin) {
    return "industry";
  }
  if ((user as any).subscriptionTier === "beta") {
    const betaExpiry = (user as any).betaExpiresAt;
    if (!betaExpiry || new Date(betaExpiry) > new Date()) {
      return "beta";
    }
  }
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
    return mapTierName(user.subscriptionTier);
  }
  return "independent";
}

export function getUserLimits(user: User): TierLimits {
  return TIER_LIMITS[getEffectiveTier(user)];
}

/**
 * Get the public-facing display name for a tier.
 */
export function getTierDisplayName(tier: string | null | undefined): string {
  return TIER_DISPLAY_NAMES[tier || ""] || (tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : "Unknown");
}

/**
 * Check whether a tier is self-serve (Creator / Studio)
 * or consultative (Production / Enterprise).
 */
export function isSelfServeTier(tier: SubscriptionTier): boolean {
  return tier === "indie" || tier === "amateur" || tier === "independent" || tier === "creator";
}


// ============================================================
// QUOTA & FEATURE GUARDS (restored)
// ============================================================
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
// STRIPE HELPERS (restored)
// ============================================================
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

export async function createCheckoutSession(
  user: User,
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  billing: "monthly" | "annual" = "annual",
  trialDays?: number,
  applyFoundingDiscount?: boolean,
  promoCode?: string
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  // Monthly billing supports direct debit (ACH bank transfer) + card
  // Annual billing is card-only
  const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
    billing === "monthly"
      ? ["card", "us_bank_account"]
      : ["card"];

  // If a promo code is provided, create/find a 50% off once coupon and apply it
  if (promoCode) {
    try {
      const promoCoupons = await stripe.coupons.list({ limit: 100 });
      const existingPromo = promoCoupons.data.find(c => c.name === `Promo: ${promoCode}` && c.valid);
      let promoCouponId: string;
      if (existingPromo) {
        promoCouponId = existingPromo.id;
      } else {
        const newCoupon = await stripe.coupons.create({
          name: `Promo: ${promoCode}`,
          percent_off: 50,
          duration: "once",
          metadata: { type: "promo_code", code: promoCode },
        });
        promoCouponId = newCoupon.id;
      }
      const promoSessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        mode: "subscription",
        payment_method_types: paymentMethodTypes,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId: String(user.id), billing, promoCode },
        subscription_data: {
          metadata: { userId: String(user.id), billing, promoCode },
          ...(trialDays ? { trial_period_days: trialDays } : {}),
          ...(promoCouponId ? { discounts: [{ coupon: promoCouponId }] } : {}),
        },
        ...(billing === "monthly" ? {
          payment_method_options: {
            us_bank_account: {
              financial_connections: { permissions: ["payment_method" as any] },
              verification_method: "instant" as any,
            },
          },
        } : {}),
      };
      const promoSession = await stripe.checkout.sessions.create(promoSessionParams);
      return promoSession.url!;
    } catch (err: any) {
      console.error(`[Checkout] Failed to apply promo code coupon: ${err.message}`);
      // Fall through to standard checkout without discount
    }
  }

  // Auto-create or find the founding member 50% off coupon for annual billing
  let couponId: string | undefined;
  if (applyFoundingDiscount && billing === "annual") {
    try {
      // Look for existing founding coupon
      const coupons = await stripe.coupons.list({ limit: 100 });
      const existing = coupons.data.find(c => c.name === "Founding Director 50% Off" && c.valid);
      if (existing) {
        couponId = existing.id;
      } else {
        // Create the coupon: 50% off, first year only (once), limited redemptions
        const coupon = await stripe.coupons.create({
          name: "Founding Director 50% Off",
          percent_off: 50,
          duration: "once", // applies to first invoice only
          max_redemptions: 150, // limited to 150 founding directors (19 spots still available)
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
// VFX / EXTENSION / SCENE-BY-SCENE PRICING
// (referenced by the pricing tRPC query in routers.ts)
// ============================================================

export interface VfxScenePackage {
  id: string;
  name: string;
  description: string;
  scenes: number;
  price: number; // AUD cents
  pricePerScene: number;
}

export const VFX_SCENE_PACKAGES: VfxScenePackage[] = [
  { id: "vfx_5",   name: "VFX Starter",     description: "5 VFX-enhanced scenes",   scenes: 5,   price: 25000,  pricePerScene: 5000 },
  { id: "vfx_15",  name: "VFX Producer",    description: "15 VFX-enhanced scenes",  scenes: 15,  price: 60000,  pricePerScene: 4000 },
  { id: "vfx_50",  name: "VFX Director",    description: "50 VFX-enhanced scenes",  scenes: 50,  price: 150000, pricePerScene: 3000 },
  { id: "vfx_100", name: "VFX Studio",      description: "100 VFX-enhanced scenes", scenes: 100, price: 250000, pricePerScene: 2500 },
];

export interface ExtensionPricingItem {
  id: string;
  name: string;
  description: string;
  price: number; // AUD cents
}

export const EXTENSION_PRICING: ExtensionPricingItem[] = [
  { id: "ext_4k",        name: "4K Export Upgrade",         description: "Upgrade any project to 4K resolution export",   price: 15000 },
  { id: "ext_prores",    name: "ProRes Export",              description: "ProRes 422 / 4444 export for post-production",  price: 20000 },
  { id: "ext_subtitles", name: "Subtitle Pack (130+ langs)", description: "Auto-generated subtitles in 130+ languages",    price: 8000  },
  { id: "ext_soundtrack","name": "AI Soundtrack Pack",       description: "Original AI-composed score for your film",      price: 12000 },
];

export interface SceneByScenePricingItem {
  id: string;
  name: string;
  description: string;
  creditsPerScene: number;
  price: number; // AUD cents per scene
}

export const SCENE_BY_SCENE_PRICING: SceneByScenePricingItem[] = [
  { id: "scene_standard", name: "Standard Scene",  description: "AI-generated scene at standard quality",  creditsPerScene: 50,  price: 500  },
  { id: "scene_hd",       name: "HD Scene",        description: "AI-generated scene at HD quality",        creditsPerScene: 100, price: 1000 },
  { id: "scene_4k",       name: "4K Scene",        description: "AI-generated scene at 4K quality",        creditsPerScene: 200, price: 2000 },
  { id: "scene_vfx",      name: "VFX Scene",       description: "AI-generated scene with VFX enhancement", creditsPerScene: 300, price: 3000 },
];

// ============================================================
// TOP-UP CHECKOUT SESSION
// ============================================================

/**
 * Create a Stripe Checkout session for a one-off credit top-up pack.
 */
export async function createTopUpCheckoutSession(
  user: User,
  customerId: string,
  packId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
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
      type: "topup",
    },
  });

  return session.url!;
}

// ============================================================
// FILM PACKAGE CHECKOUT SESSION
// ============================================================

/**
 * Create a Stripe Checkout session for a one-off film production package.
 */
export async function createFilmPackageCheckoutSession(
  user: User,
  customerId: string,
  packageId: string,
  useLaunchPrice: boolean,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  const pkg = FILM_PACKAGES.find(p => p.id === packageId);
  if (!pkg) throw new Error(`Unknown film package: ${packageId}`);

  const unitAmount = useLaunchPrice ? pkg.launchPrice : pkg.fullPrice;

  // Create an ad-hoc price on the fly (no recurring Stripe product needed for one-off packages)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: unitAmount,
          product_data: {
            name: pkg.name,
            description: pkg.description,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: String(user.id),
      packageId,
      useLaunchPrice: String(useLaunchPrice),
      type: "film_package",
    },
  });

  return session.url!;
}
