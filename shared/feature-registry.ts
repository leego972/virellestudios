/**
 * VIRELLE STUDIOS — SHARED FEATURE REGISTRY
 *
 * This is the single source of truth for all features/tools across
 * the website AND the mobile app.
 *
 * HOW TO ADD A NEW FEATURE:
 *   1. Add an entry to the FEATURE_REGISTRY array below.
 *   2. Deploy the website — the mobile app will automatically pick it up.
 *   3. Optionally add a native mobile component in components/tools/<NativeName>.tsx
 *      and register it in NATIVE_TOOL_MAP in app/tool/[name].tsx.
 *      If no native component exists, the mobile app renders the feature in an
 *      authenticated WebView automatically.
 *
 * FIELDS:
 *   id          — unique slug, used as the mobile route /tool/<id>
 *   label       — display name
 *   icon        — emoji icon
 *   category    — grouping for the All Tools screen
 *   webPath     — website path (relative, e.g. /projects/:projectId/script)
 *   description — short description shown in the mobile tools grid
 *   minTier     — minimum subscription tier required ("free"|"amateur"|"independent"|"creator"|"studio"|"industry")
 *   hasNative   — true if a native mobile component exists for this tool
 *   isNew       — show "NEW" badge in the mobile app
 *   isAdmin     — only visible to admin users
 */

export interface FeatureEntry {
  id: string;
  label: string;
  icon: string;
  category: string;
  webPath: string;
  description: string;
  minTier: "free" | "amateur" | "independent" | "creator" | "studio" | "industry";
  hasNative: boolean;
  isNew?: boolean;
  isAdmin?: boolean;
}

export const FEATURE_REGISTRY: FeatureEntry[] = [
  // ── WRITING ──────────────────────────────────────────────────────────────
  {
    id: "script-writer",
    label: "Script Writer",
    icon: "📝",
    category: "Writing",
    webPath: "/projects/:projectId/script",
    description: "AI-generated screenplay from a premise",
    minTier: "amateur",
    hasNative: true,
  },
  {
    id: "dialogue",
    label: "Dialogue Enhancer",
    icon: "💬",
    category: "Writing",
    webPath: "/projects/:projectId/dialogue",
    description: "Improve character dialogue with AI",
    minTier: "amateur",
    hasNative: true,
  },
  {
    id: "scene-builder",
    label: "Scene Builder",
    icon: "🎬",
    category: "Writing",
    webPath: "/projects/:id/scenes",
    description: "Build and manage individual scenes",
    minTier: "free",
    hasNative: true,
  },
  {
    id: "director-chat",
    label: "Director Chat",
    icon: "🎭",
    category: "Writing",
    webPath: "/",
    description: "AI Director creative guidance",
    minTier: "free",
    hasNative: true,
  },

  // ── VISUAL ───────────────────────────────────────────────────────────────
  {
    id: "storyboard",
    label: "Storyboard",
    icon: "🖼️",
    category: "Visual",
    webPath: "/projects/:projectId/storyboard",
    description: "Visual panel-by-panel planning",
    minTier: "amateur",
    hasNative: true,
  },
  {
    id: "mood-board",
    label: "Mood Board",
    icon: "🎨",
    category: "Visual",
    webPath: "/projects/:id/mood-board",
    description: "Visual tone and style references",
    minTier: "amateur",
    hasNative: false,
  },
  {
    id: "color-grading",
    label: "Color Grading",
    icon: "🌈",
    category: "Visual",
    webPath: "/projects/:projectId/color-grading",
    description: "AI-assisted color grade your footage",
    minTier: "independent",
    hasNative: false,
  },
  {
    id: "poster-maker",
    label: "Poster Maker",
    icon: "🖼",
    category: "Visual",
    webPath: "/poster-maker",
    description: "Generate cinematic film posters",
    minTier: "amateur",
    hasNative: false,
  },

  // ── AI VIDEO ─────────────────────────────────────────────────────────────
  {
    id: "video-generation",
    label: "Video Generation",
    icon: "🎥",
    category: "AI Video",
    webPath: "/projects/:id",
    description: "Generate AI video clips from prompts",
    minTier: "independent",
    hasNative: true,
  },
  {
    id: "trailer",
    label: "Trailer Studio",
    icon: "🎞️",
    category: "AI Video",
    webPath: "/projects/:projectId/trailer-studio",
    description: "Create a cinematic film trailer",
    minTier: "creator",
    hasNative: true,
  },
  {
    id: "film-generator",
    label: "Full Film Generator",
    icon: "🎦",
    category: "AI Video",
    webPath: "/projects/:projectId/director-cut",
    description: "Generate a complete short film",
    minTier: "creator",
    hasNative: true,
  },
  {
    id: "multi-shot",
    label: "Multi-Shot Sequencer",
    icon: "🎬",
    category: "AI Video",
    webPath: "/projects/:projectId/multi-shot",
    description: "Chain multiple AI shots into sequences",
    minTier: "creator",
    hasNative: false,
  },
  {
    id: "tv-commercial",
    label: "TV Commercial",
    icon: "📡",
    category: "AI Video",
    webPath: "/projects/:projectId/tv-commercial",
    description: "Generate broadcast-quality TV ads",
    minTier: "studio",
    hasNative: false,
  },

  // ── PRODUCTION ───────────────────────────────────────────────────────────
  {
    id: "shot-list",
    label: "Shot List",
    icon: "📋",
    category: "Production",
    webPath: "/projects/:projectId/shot-list",
    description: "Camera shot breakdown per scene",
    minTier: "amateur",
    hasNative: true,
  },
  {
    id: "budget",
    label: "Budget Estimator",
    icon: "💰",
    category: "Production",
    webPath: "/projects/:projectId/budget",
    description: "AI production cost breakdown",
    minTier: "independent",
    hasNative: true,
  },
  {
    id: "characters",
    label: "Characters",
    icon: "👥",
    category: "Production",
    webPath: "/characters",
    description: "Manage cast and character profiles",
    minTier: "free",
    hasNative: true,
  },
  {
    id: "ai-casting",
    label: "AI Casting",
    icon: "🎭",
    category: "Production",
    webPath: "/projects/:projectId/ai-casting",
    description: "AI-powered actor casting suggestions",
    minTier: "creator",
    hasNative: false,
  },
  {
    id: "location-scout",
    label: "Location Scout",
    icon: "📍",
    category: "Production",
    webPath: "/projects/:id/locations",
    description: "AI location scouting and matching",
    minTier: "independent",
    hasNative: false,
  },
  {
    id: "live-action-plate",
    label: "Live Action Plate",
    icon: "🎞",
    category: "Production",
    webPath: "/projects/:projectId/live-action-plate",
    description: "Composite AI video with live footage",
    minTier: "studio",
    hasNative: false,
  },

  // ── POST-PRODUCTION ───────────────────────────────────────────────────────
  {
    id: "subtitles",
    label: "Subtitle Generator",
    icon: "📺",
    category: "Post-Production",
    webPath: "/projects/:id/subtitles",
    description: "Auto-generate SRT subtitles",
    minTier: "amateur",
    hasNative: true,
  },
  {
    id: "continuity",
    label: "Continuity Checker",
    icon: "🔍",
    category: "Post-Production",
    webPath: "/projects/:projectId/continuity",
    description: "Find script inconsistencies",
    minTier: "independent",
    hasNative: true,
  },
  {
    id: "nle-export",
    label: "NLE Export",
    icon: "🖥️",
    category: "Post-Production",
    webPath: "/projects/:projectId/nle-export",
    description: "Export to Premiere, DaVinci, Final Cut",
    minTier: "creator",
    hasNative: false,
  },
  {
    id: "vfx-suite",
    label: "VFX Suite",
    icon: "✨",
    category: "Post-Production",
    webPath: "/projects/:projectId/vfx-suite",
    description: "AI visual effects and compositing",
    minTier: "studio",
    hasNative: false,
  },
  {
    id: "sound-effects",
    label: "Sound Effects",
    icon: "🔊",
    category: "Post-Production",
    webPath: "/projects/:id/sound-effects",
    description: "AI sound design and effects",
    minTier: "independent",
    hasNative: false,
  },
  {
    id: "visual-effects",
    label: "Visual Effects",
    icon: "🌟",
    category: "Post-Production",
    webPath: "/projects/:id/visual-effects",
    description: "AI-generated visual effects",
    minTier: "independent",
    hasNative: false,
  },

  // ── MANAGEMENT ────────────────────────────────────────────────────────────
  {
    id: "team",
    label: "Team Collaboration",
    icon: "🤝",
    category: "Management",
    webPath: "/projects/:id/collaboration",
    description: "Invite and manage collaborators",
    minTier: "creator",
    hasNative: true,
  },
  {
    id: "credits-editor",
    label: "Credits Editor",
    icon: "🎬",
    category: "Management",
    webPath: "/projects/:projectId/credits",
    description: "Edit film credits and end titles",
    minTier: "amateur",
    hasNative: false,
  },
  {
    id: "marketplace",
    label: "Asset Marketplace",
    icon: "🛒",
    category: "Management",
    webPath: "/marketplace",
    description: "Buy and sell production assets",
    minTier: "free",
    hasNative: false,
  },
  {
    id: "content-creator",
    label: "Content Creator",
    icon: "📱",
    category: "Management",
    webPath: "/content-creator",
    description: "Social media content generation",
    minTier: "amateur",
    hasNative: false,
  },

  // ── ACCOUNT ───────────────────────────────────────────────────────────────
  {
    id: "subscription",
    label: "Subscription Plans",
    icon: "⭐",
    category: "Account",
    webPath: "/pricing",
    description: "Upgrade your plan",
    minTier: "free",
    hasNative: true,
  },
  {
    id: "credits",
    label: "Credits",
    icon: "💳",
    category: "Account",
    webPath: "/credits",
    description: "View balance and transaction history",
    minTier: "free",
    hasNative: true,
  },
  {
    id: "referrals",
    label: "Referral Program",
    icon: "🎁",
    category: "Account",
    webPath: "/referrals",
    description: "Earn credits by referring friends",
    minTier: "free",
    hasNative: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    category: "Account",
    webPath: "/settings",
    description: "Account and app settings",
    minTier: "free",
    hasNative: false,
  },
];

/** Returns all features for a given subscription tier */
export function getFeaturesForTier(tier: string): FeatureEntry[] {
  const TIER_ORDER = ["free", "amateur", "independent", "creator", "studio", "industry"];
  const tierIndex = TIER_ORDER.indexOf(tier);
  return FEATURE_REGISTRY.filter(f => {
    if (f.isAdmin) return false;
    const featureTierIndex = TIER_ORDER.indexOf(f.minTier);
    return featureTierIndex <= tierIndex;
  });
}

/** Returns all non-admin features grouped by category */
export function getFeaturesByCategory(): Record<string, FeatureEntry[]> {
  const result: Record<string, FeatureEntry[]> = {};
  for (const feature of FEATURE_REGISTRY) {
    if (feature.isAdmin) continue;
    if (!result[feature.category]) result[feature.category] = [];
    result[feature.category].push(feature);
  }
  return result;
}
