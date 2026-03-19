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
//   "amateur"     → "Auteur"
//   "independent" → "Production Pro"
//   "studio"      → "Studio"
//   "industry"    → "Industry Enterprise"
export type SubscriptionTier = "amateur" | "independent" | "creator" | "studio" | "industry" | "beta";
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
 *   Auteur (DB: "amateur")            — A$1,250/month  or A$12,000/year  — 2,000 credits/month
 *   Production Pro (DB: "independent")— A$3,900/month  or A$36,000/year  — 5,500 credits/month
 *   Studio (DB: "studio")             — From A$150,000/year (consultative) — 15,500 credits/month
 *   Industry Enterprise (DB: "industry") — Custom pricing (sales-led)    — 50,500 credits/month
 *
 * FOUNDING MEMBER OFFER: 50% off first year on annual billing (VIRELLE_FOUNDER_50 coupon)
 *   Applies to Auteur and Production Pro annual plans only.
 *   Auteur founder price: A$6,000 first year (then A$12,000/yr)
 *   Production Pro founder price: A$18,000 first year (then A$36,000/yr)
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
 *   Movie Export:                             5 credits
 *
 * CREDIT PACKS (AUD — one-time top-ups):
 *   Starter Pack     — 500 credits    A$750    (A$1.50/credit)
 *   Producer Pack    — 1,500 credits  A$1,800  (A$1.20/credit — Save 20%)
 *   Director Pack    — 3,000 credits  A$3,150  (A$1.05/credit — Save 30%)
 *   Studio Pack      — 6,000 credits  A$5,400  (A$0.90/credit — Save 40%)
 *   Blockbuster Pack — 12,000 credits A$9,000  (A$0.75/credit — Save 50%)
 *   Mogul Pack       — 25,000 credits A$15,000 (A$0.60/credit — Save 60%)
 */

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {

  // ─── AUTEUR (DB: "amateur") ─── A$1,250/month — 2,000 credits/month ───────
  amateur: {
    maxProjects: 2,
    maxCharactersPerProject: 5,
    maxScenesPerProject: 5,
    maxGenerationsPerMonth: 20,
    maxMovieExports: 0,
    maxCollaboratorsPerProject: 1,
    maxScriptsPerProject: 1,
    maxStorageMB: 1000, // 1 GB
    canUseQuickGenerate: true,
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
    maxDurationMinutes: 5,
    maxClipsPerScene: 2,
    monthlyCredits: 2000,
  },

  // ─── PRODUCTION PRO (DB: "independent") ─── A$3,900/month — 5,500 credits/month ───
  independent: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 200,
    maxMovieExports: 25,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 15,
    maxStorageMB: 50000, // 50 GB
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
    canUseVisualEffects: false,
    canUseBulkGenerate: false,
    canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false,
    canUseNLEExport: false,
    canUseAICasting: false,
    canExportUltraHD: true,
    canUseWhiteLabel: false,
    canUseAPIAccess: false,
    canUseCustomFineTuning: false,
    canUsePriorityRendering: false,
    resolution: "4k",
    quality: ["standard", "high"],
    maxDurationMinutes: 90,
    maxClipsPerScene: 8,
    monthlyCredits: 5500,
  },

  // ─── PRODUCTION PRO alias (DB: "creator") ─── same limits as independent ───
  creator: {
    maxProjects: 25,
    maxCharactersPerProject: 30,
    maxScenesPerProject: 90,
    maxGenerationsPerMonth: 200,
    maxMovieExports: 25,
    maxCollaboratorsPerProject: 5,
    maxScriptsPerProject: 15,
    maxStorageMB: 50000,
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
    canUseVisualEffects: false, canUseBulkGenerate: false, canUseMultiShotSequencer: false,
    canUseLiveActionPlate: false, canUseNLEExport: false, canUseAICasting: false,
    canExportUltraHD: true, canUseWhiteLabel: false, canUseAPIAccess: false,
    canUseCustomFineTuning: false, canUsePriorityRendering: false,
    resolution: "4k", quality: ["standard", "high"], maxDurationMinutes: 90, maxClipsPerScene: 8,
    monthlyCredits: 5500,
  },

  // ─── STUDIO (DB: "studio") ─── From A$150,000/year — 15,500 credits/month ───
  studio: {
    maxProjects: 100,
    maxCharactersPerProject: 100,
    maxScenesPerProject: 150,
    maxGenerationsPerMonth: 1000,
    maxMovieExports: 100,
    maxCollaboratorsPerProject: 25,
    maxScriptsPerProject: 50,
    maxStorageMB: 250000, // 250 GB
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
    canUseLiveActionPlate: false, canUseNLEExport: true, canUseAICasting: true,
    canExportUltraHD: true, canUseWhiteLabel: true, canUseAPIAccess: true,
    canUseCustomFineTuning: false, canUsePriorityRendering: true,
    resolution: "4k", quality: ["standard", "high", "ultra"], maxDurationMinutes: 150, maxClipsPerScene: 12,
    monthlyCredits: 15500,
  },

  // ─── INDUSTRY ENTERPRISE (DB: "industry") ─── Custom pricing — 50,500 credits/month ───
  industry: {
    maxProjects: -1,
    maxCharactersPerProject: -1,
    maxScenesPerProject: -1,
    maxGenerationsPerMonth: -1,
    maxMovieExports: -1,
    maxCollaboratorsPerProject: -1,
    maxScriptsPerProject: -1,
    maxStorageMB: -1,
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
  amateur:     { monthly: 125000, annual: 100000, annualTotal: 1200000, monthlyTotal: 1500000, displayName: "Auteur" },
  independent: { monthly: 390000, annual: 300000, annualTotal: 3600000, monthlyTotal: 4680000, displayName: "Production Pro" },
  creator:     { monthly: 390000, annual: 300000, annualTotal: 3600000, monthlyTotal: 4680000, displayName: "Production Pro" },
  studio:      { monthly: 0, annual: 0, annualTotal: 15000000, monthlyTotal: 0, displayName: "Studio" }, // From A$150,000/yr — consultative
  industry:    { monthly: 0, annual: 0, annualTotal: 0, monthlyTotal: 0, displayName: "Industry Enterprise" }, // Custom
  beta:        { monthly: 0, annual: 0, annualTotal: 0, monthlyTotal: 0, displayName: "Beta" },
};

// Display name lookup (for use in emails, UI labels, etc.)
export const TIER_DISPLAY_NAMES: Record<string, string> = {
  amateur: "Auteur",
  independent: "Production Pro",
  creator: "Production Pro",
  studio: "Studio",
  industry: "Industry Enterprise",
  beta: "Beta",
};

// Launch special flag — set to false to disable 50% off
export const LAUNCH_SPECIAL_ACTIVE = true;
export const LAUNCH_SPECIAL_DISCOUNT = 0.5; // 50% off first year of annual Auteur / Production Pro

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
  // "pro", "independent" and anything else map to independent
  return "independent";
}

export function getEffectiveTier(user: User): SubscriptionTier {
  const ADMIN_EMAILS_INLINE = [
    "studiosvirelle@gmail.com",
    "leego972@gmail.com",
    "brobroplzcheck@gmail.com",
    "sisteror555@gmail.com",
    (ENV.adminEmail || "").toLowerCase(),
  ];
  const isAdmin = user.role === "admin" || ADMIN_EMAILS_INLINE.includes((user.email || "").toLowerCase());
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
 * Check whether a tier is self-serve (Auteur / Production Pro)
 * or consultative (Studio / Industry Enterprise).
 */
export function isSelfServeTier(tier: SubscriptionTier): boolean {
  return tier === "amateur" || tier === "independent" || tier === "creator";
}
