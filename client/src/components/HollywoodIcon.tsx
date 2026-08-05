/**
 * HollywoodIcon — renders an original Virelle cinema tool icon.
 * HollywoodBadge — renders a Virelle Hollywood tier badge.
 */

import "@/hollywood-system.css";
import { VirelleCinemaIcon } from "@/components/VirelleCinemaIcon";
import {
  TOOL_ICONS,
  TIER_BADGES,
  type ToolIconKey,
  type TierBadgeKey,
} from "@/constants/hollywoodIcons";
import type { VirelleCinemaIconKey } from "@/constants/virelleCinemaIcons";

type HollywoodIconAlias = "preproduction" | "production" | "post" | "community";
type HollywoodIconKey = ToolIconKey | VirelleCinemaIconKey | HollywoodIconAlias;

const HOLLYWOOD_ICON_ALIASES: Record<HollywoodIconAlias, VirelleCinemaIconKey> = {
  preproduction: "scripts",
  production: "scenes",
  post: "editing",
  community: "team",
};

/**
 * Standalone SVG equivalents for sprite-only cinema icons. Safari has shown
 * intermittent black frames when rendering the embedded WebP sprite, so all
 * high-visibility branded icons now prefer repository SVG assets.
 */
const CINEMA_TO_STANDALONE: Partial<Record<VirelleCinemaIconKey, string>> = {
  scripts: TOOL_ICONS.script_writer,
  scenes: TOOL_ICONS.scene_builder,
  editing: TOOL_ICONS.color_grading,
  team: TOOL_ICONS.team_collaboration,
  casting: TOOL_ICONS.ai_casting,
  marketplace: TOOL_ICONS.asset_marketplace,
  wardrobe: TOOL_ICONS.asset_marketplace,
  reports: TOOL_ICONS.budget_estimator,
  billing: TOOL_ICONS.subscription_plans,
  sound: TOOL_ICONS.sound_effects,
  storyboards: TOOL_ICONS.storyboard,
  distribution: TOOL_ICONS.content_creator,
  ai_tools: TOOL_ICONS.director_chat,
  studio: TOOL_ICONS.full_film_generator,
  vfx: TOOL_ICONS.vfx_suite,
  render: TOOL_ICONS.video_generation,
  dashboard: TOOL_ICONS.settings,
  projects: TOOL_ICONS.full_film_generator,
  music: TOOL_ICONS.sound_effects,
  support: TOOL_ICONS.settings,
};

interface HollywoodIconProps {
  tool: HollywoodIconKey;
  size?: number;
  className?: string;
  alt?: string;
}

function isToolIconKey(tool: HollywoodIconKey): tool is ToolIconKey {
  return Object.prototype.hasOwnProperty.call(TOOL_ICONS, tool);
}

function isHollywoodAlias(tool: HollywoodIconKey): tool is HollywoodIconAlias {
  return Object.prototype.hasOwnProperty.call(HOLLYWOOD_ICON_ALIASES, tool);
}

export function HollywoodIcon({ tool, size = 40, className = "", alt }: HollywoodIconProps) {
  const resolved = isHollywoodAlias(tool) ? HOLLYWOOD_ICON_ALIASES[tool] : tool;
  const standaloneSrc = isToolIconKey(resolved)
    ? TOOL_ICONS[resolved]
    : CINEMA_TO_STANDALONE[resolved as VirelleCinemaIconKey];

  if (standaloneSrc) {
    return (
      <img
        src={standaloneSrc}
        alt={alt ?? String(resolved).replace(/_/g, " ")}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        draggable={false}
        loading="lazy"
      />
    );
  }

  return (
    <VirelleCinemaIcon
      icon={resolved as VirelleCinemaIconKey}
      size={size}
      className={className}
      alt={alt}
    />
  );
}

interface HollywoodBadgeProps {
  tier: TierBadgeKey;
  size?: number;
  className?: string;
}

export function HollywoodBadge({ tier, size = 28, className = "" }: HollywoodBadgeProps) {
  const src = TIER_BADGES[tier];
  return (
    <img
      src={src}
      alt={`${tier} badge`}
      height={size}
      className={`object-contain ${className}`}
      style={{ height: size }}
      draggable={false}
      loading="lazy"
    />
  );
}

export function IndieBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="indie" size={size} className={className} />;
}

export function CreatorBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="creator" size={size} className={className} />;
}

export function IndustryBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="industry" size={size} className={className} />;
}

export function FeaturedBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="featured" size={size} className={className} />;
}

export function NewBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="new" size={size} className={className} />;
}

export function CinematicBadgeImg({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <HollywoodBadge tier="cinematic" size={size} className={className} />;
}

export default HollywoodIcon;
