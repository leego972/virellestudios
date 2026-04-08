/**
 * Virelle Hollywood Icon & Badge System
 *
 * Centralised map of all branded tool icons and tier badges.
 * Use these in sidebar nav, tool cards, pricing, upgrade prompts, and any
 * surface that references a Virelle production tool or subscription tier.
 *
 * Icons live in /public/icons/tools/*.svg (tool icons)
 *               /public/icons/badges/*.svg (tier badges)
 */

// ─── Tool icon paths ──────────────────────────────────────────────────────────

export const TOOL_ICONS = {
  ai_casting:           "/icons/tools/ai_casting.svg",
  asset_marketplace:    "/icons/tools/asset_marketplace.svg",
  budget_estimator:     "/icons/tools/budget_estimator.svg",
  characters:           "/icons/tools/characters.svg",
  color_grading:        "/icons/tools/color_grading.svg",
  content_creator:      "/icons/tools/content_creator.svg",
  continuity_checker:   "/icons/tools/continuity_checker.svg",
  credits:              "/icons/tools/credits.svg",
  credits_editor:       "/icons/tools/credits_editor.svg",
  dialogue_enhancer:    "/icons/tools/dialogue_enhancer.svg",
  director_chat:        "/icons/tools/director_chat.svg",
  full_film_generator:  "/icons/tools/full_film_generator.svg",
  location_scout:       "/icons/tools/location_scout.svg",
  mood_board:           "/icons/tools/mood_board.svg",
  multi_shot_sequencer: "/icons/tools/multi_shot_sequencer.svg",
  nle_export:           "/icons/tools/nle_export.svg",
  poster_maker:         "/icons/tools/poster_maker.svg",
  referrals:            "/icons/tools/referrals.svg",
  scene_builder:        "/icons/tools/scene_builder.svg",
  script_writer:        "/icons/tools/script_writer.svg",
  settings:             "/icons/tools/settings.svg",
  shot_list:            "/icons/tools/shot_list.svg",
  sound_effects:        "/icons/tools/sound_effects.svg",
  storyboard:           "/icons/tools/storyboard.svg",
  subscription_plans:   "/icons/tools/subscription_plans.svg",
  subtitles:            "/icons/tools/subtitles.svg",
  team_collaboration:   "/icons/tools/team_collaboration.svg",
  trailer_studio:       "/icons/tools/trailer_studio.svg",
  vfx_suite:            "/icons/tools/vfx_suite.svg",
  video_generation:     "/icons/tools/video_generation.svg",
  visual_effects:       "/icons/tools/visual_effects.svg",
} as const;

export type ToolIconKey = keyof typeof TOOL_ICONS;

// ─── Tier badge paths ─────────────────────────────────────────────────────────

export const TIER_BADGES = {
  indie:      "/icons/badges/badge_indie.svg",
  creator:    "/icons/badges/badge_creator.svg",
  industry:   "/icons/badges/badge_industry.svg",
  new:        "/icons/badges/badge_new.svg",
  featured:   "/icons/badges/badge_featured.svg",
  cinematic:  "/icons/badges/badge_cinematic.svg",
} as const;

export type TierBadgeKey = keyof typeof TIER_BADGES;

// ─── Sidebar nav → tool icon mapping ─────────────────────────────────────────
// Maps sidebar route paths to their Hollywood icon key.

export const NAV_ICON_MAP: Record<string, ToolIconKey> = {
  "/poster-maker":      "poster_maker",
  "/marketplace":       "asset_marketplace",
  "/credits":           "credits",
  "/pricing":           "subscription_plans",
  "/referrals":         "referrals",
  "/settings":          "settings",
  "/characters":        "characters",
  "/assistant":         "director_chat",
};

// ─── Pricing tier → badge mapping ────────────────────────────────────────────
// Maps canonical DB tier keys to the Hollywood badge image.

export const PRICING_TIER_BADGE: Record<string, TierBadgeKey> = {
  indie:        "indie",
  amateur:      "creator",    // "Creator" tier uses creator badge
  independent:  "industry",
  creator:      "industry",   // legacy alias
  studio:       "industry",   // legacy alias
  industry:     "industry",
};

// ─── Tool card definitions ────────────────────────────────────────────────────
// Centralised list of all production tools with icon, label, route, and tier.

export interface ToolCardDef {
  id: ToolIconKey;
  label: string;
  description: string;
  path: string;
  minTier?: "indie" | "amateur" | "independent";
}

export const PRODUCTION_TOOLS: ToolCardDef[] = [
  { id: "script_writer",        label: "Script Writer",         description: "AI-powered screenplay development",          path: "/script-writer",        minTier: "indie" },
  { id: "dialogue_enhancer",    label: "Dialogue Enhancer",     description: "Sharpen and refine your dialogue",           path: "/dialogue",             minTier: "indie" },
  { id: "scene_builder",        label: "Scene Builder",         description: "Craft cinematic scenes with AI",             path: "/scenes",               minTier: "indie" },
  { id: "director_chat",        label: "Director's Assistant",  description: "AI creative guidance and feedback",          path: "/assistant",            minTier: "indie" },
  { id: "storyboard",           label: "Storyboard",            description: "Visual shot-by-shot planning",               path: "/storyboard",           minTier: "indie" },
  { id: "mood_board",           label: "Mood Board",            description: "Capture the visual tone of your film",       path: "/mood-board",           minTier: "indie" },
  { id: "shot_list",            label: "Shot List",             description: "Plan every shot before you shoot",           path: "/shot-list",            minTier: "indie" },
  { id: "characters",           label: "Characters",            description: "Create and manage your cast",                path: "/characters",           minTier: "indie" },
  { id: "ai_casting",           label: "AI Casting",            description: "AI-powered role and actor suggestions",      path: "/ai-casting",           minTier: "indie" },
  { id: "location_scout",       label: "Location Scout",        description: "Find and visualise filming locations",       path: "/location-scout",       minTier: "indie" },
  { id: "video_generation",     label: "Video Generation",      description: "Generate cinematic video from prompts",      path: "/projects",             minTier: "amateur" },
  { id: "color_grading",        label: "Color Grading",         description: "Professional colour correction suite",       path: "/color-grading",        minTier: "amateur" },
  { id: "sound_effects",        label: "Sound Effects",         description: "AI-generated Foley and SFX library",         path: "/sound-effects",        minTier: "amateur" },
  { id: "poster_maker",         label: "Ad & Poster Maker",     description: "Create promotional materials with AI",       path: "/poster-maker",         minTier: "indie" },
  { id: "trailer_studio",       label: "Trailer Studio",        description: "Assemble and export film trailers",          path: "/trailer-studio",       minTier: "amateur" },
  { id: "subtitles",            label: "Subtitles",             description: "Auto-generate subtitles in 130+ languages",  path: "/subtitles",            minTier: "independent" },
  { id: "continuity_checker",   label: "Continuity Checker",    description: "Catch script and scene inconsistencies",     path: "/continuity",           minTier: "amateur" },
  { id: "multi_shot_sequencer", label: "Multi-Shot Sequencer",  description: "Sequence and stitch multi-shot scenes",      path: "/multi-shot",           minTier: "independent" },
  { id: "nle_export",           label: "NLE Export",            description: "Export to Premiere, DaVinci, Final Cut",     path: "/nle-export",           minTier: "independent" },
  { id: "vfx_suite",            label: "VFX Suite",             description: "Advanced visual effects compositing",        path: "/vfx",                  minTier: "independent" },
  { id: "visual_effects",       label: "Visual Effects",        description: "AI-generated visual effects layers",         path: "/visual-effects",       minTier: "amateur" },
  { id: "credits_editor",       label: "Credits Editor",        description: "Design and export end title sequences",      path: "/credits-editor",       minTier: "amateur" },
  { id: "full_film_generator",  label: "Full Film Generator",   description: "Generate a complete short film end-to-end",  path: "/director-cut",         minTier: "independent" },
  { id: "budget_estimator",     label: "Budget Estimator",      description: "AI-powered production budget planning",      path: "/budget",               minTier: "indie" },
  { id: "team_collaboration",   label: "Team Collaboration",    description: "Invite and manage your production team",     path: "/collaboration",        minTier: "independent" },
  { id: "asset_marketplace",    label: "Asset Marketplace",     description: "Buy and sell production assets",             path: "/marketplace",          minTier: "indie" },
  { id: "content_creator",      label: "Content Creator",       description: "Repurpose content for social platforms",     path: "/content-creator",      minTier: "independent" },
  { id: "subscription_plans",   label: "Subscription Plans",    description: "Manage your Virelle membership",             path: "/pricing",              minTier: undefined },
  { id: "credits",              label: "Credits & History",     description: "View and top up your credit balance",        path: "/credits",              minTier: undefined },
  { id: "referrals",            label: "Referrals",             description: "Earn credits by inviting filmmakers",        path: "/referrals",            minTier: undefined },
  { id: "settings",             label: "Settings",              description: "Account, API keys, and preferences",         path: "/settings",             minTier: undefined },
];
