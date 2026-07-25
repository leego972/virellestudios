import type { VirelleCinemaIconKey } from "@/constants/virelleCinemaIcons";

export type SiteBrandRule = {
  test: RegExp;
  icon: VirelleCinemaIconKey;
  group: string;
};

export const SITE_BRAND_ROUTE_RULES: SiteBrandRule[] = [
  { test: /^\/(?:$|dashboard|home)/i, icon: "dashboard", group: "Workspace" },
  { test: /^\/(?:projects?|new-project|project-command-center)/i, icon: "projects", group: "Projects" },
  { test: /(?:script|screenplay|series-bible|coverage|table-read|dialogue)/i, icon: "scripts", group: "Writing" },
  { test: /(?:character|casting|talent|signature-cast|cast-board)/i, icon: "casting", group: "Casting" },
  { test: /(?:wardrobe|garment|outfit|designer|costume)/i, icon: "wardrobe", group: "Wardrobe" },
  { test: /(?:marketplace|inventory|asset-marketplace|collections)/i, icon: "marketplace", group: "Marketplace" },
  { test: /(?:assistant|director-chat|autonomous|ai-tools|byok)/i, icon: "ai_tools", group: "AI tools" },
  { test: /(?:scene|location|background|props|shot-list|pre-production|equipment)/i, icon: "scenes", group: "Production" },
  { test: /(?:storyboard|mood-board|narrative-structure)/i, icon: "storyboards", group: "Planning" },
  { test: /(?:render|video-generation|director-cut|broadcast|live-action|trailer|commercial)/i, icon: "render", group: "Rendering" },
  { test: /(?:vfx|visual-effects|color-grading)/i, icon: "vfx", group: "Visual effects" },
  { test: /(?:sound|voice|dubbing|audio-mixer|table-read)/i, icon: "sound", group: "Audio" },
  { test: /(?:music|score)/i, icon: "music", group: "Music" },
  { test: /(?:edit|cutting-room|subtitles|accessibility|nle-export|credits-editor|opening-sequence)/i, icon: "editing", group: "Post-production" },
  { test: /(?:showcase|distribute|distribution|festival|press-kit|campaign|advertising|content-creator|social-cuts|crowdfund|creator-profile|films)/i, icon: "distribution", group: "Distribution" },
  { test: /(?:funding|tax-incentives|budget|finance|pitch-deck|pitch-lab|film-comps|legal-docs|reports?)/i, icon: "reports", group: "Business" },
  { test: /(?:pricing|subscription|billing|credits|referrals)/i, icon: "billing", group: "Account" },
  { test: /(?:collaboration|collaborators|team|community|contacts|users|creator)/i, icon: "team", group: "People" },
  { test: /(?:security|support|faq|contact|acceptable-use|privacy|terms|policy|dmca)/i, icon: "support", group: "Support" },
  { test: /(?:settings|admin|seo|growth|outreach|activity|schedule|call-sheet|daily-report|approval|calendar)/i, icon: "dashboard", group: "Operations" },
  { test: /(?:blog|press|changelog|about|solutions|how-it-works|download|welcome|login|register|reset-password|forgot-password)/i, icon: "studio", group: "Virelle Studios" },
];

const LABEL_RULES: SiteBrandRule[] = [
  { test: /fund|grant|finance|budget|tax|incentive/i, icon: "reports", group: "Business" },
  { test: /project/i, icon: "projects", group: "Projects" },
  { test: /script|writing|dialogue/i, icon: "scripts", group: "Writing" },
  { test: /cast|character|talent/i, icon: "casting", group: "Casting" },
  { test: /wardrobe|designer|costume/i, icon: "wardrobe", group: "Wardrobe" },
  { test: /market|inventory|asset/i, icon: "marketplace", group: "Marketplace" },
  { test: /assistant|ai|autonomous/i, icon: "ai_tools", group: "AI tools" },
  { test: /scene|location|prop|equipment/i, icon: "scenes", group: "Production" },
  { test: /storyboard|mood/i, icon: "storyboards", group: "Planning" },
  { test: /render|broadcast|video|trailer/i, icon: "render", group: "Rendering" },
  { test: /vfx|visual effect/i, icon: "vfx", group: "Visual effects" },
  { test: /sound|voice|dubbing|audio/i, icon: "sound", group: "Audio" },
  { test: /music|score/i, icon: "music", group: "Music" },
  { test: /edit|subtitle|accessibility|nle|cutting/i, icon: "editing", group: "Post-production" },
  { test: /showcase|distribution|festival|campaign|advertising|crowdfund/i, icon: "distribution", group: "Distribution" },
  { test: /credit|billing|pricing|subscription/i, icon: "billing", group: "Account" },
  { test: /team|community|user|contact|collabor/i, icon: "team", group: "People" },
  { test: /security|support|policy|legal/i, icon: "support", group: "Support" },
  { test: /admin|settings|dashboard|reports|operations/i, icon: "dashboard", group: "Operations" },
];

export type SiteBrandResolution = {
  icon: VirelleCinemaIconKey;
  group: string;
  matchedBy: "route" | "label" | "fallback";
};

export function resolveSiteBrand(path: string, label = ""): SiteBrandResolution {
  const routeValue = String(path || "/");
  const routeRule = SITE_BRAND_ROUTE_RULES.find(rule => rule.test.test(routeValue));
  if (routeRule) return { icon: routeRule.icon, group: routeRule.group, matchedBy: "route" };

  const labelRule = LABEL_RULES.find(rule => rule.test.test(String(label || "")));
  if (labelRule) return { icon: labelRule.icon, group: labelRule.group, matchedBy: "label" };

  return { icon: "studio", group: "Virelle Studios", matchedBy: "fallback" };
}

export function brandIconForRoute(path: string, label = ""): VirelleCinemaIconKey {
  return resolveSiteBrand(path, label).icon;
}

export function brandGroupForRoute(path: string, label = ""): string {
  return resolveSiteBrand(path, label).group;
}
