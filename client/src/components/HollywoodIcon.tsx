/**
 * HollywoodIcon — renders a Virelle Hollywood branded tool icon (SVG).
 * HollywoodBadge — renders a Virelle Hollywood tier badge (SVG).
 *
 * Usage:
 *   <HollywoodIcon tool="script_writer" size={48} />
 *   <HollywoodBadge tier="indie" size={28} />
 */

import { TOOL_ICONS, TIER_BADGES, ToolIconKey, TierBadgeKey } from "@/constants/hollywoodIcons";

interface HollywoodIconProps {
  tool: ToolIconKey;
  /** Pixel size — applied to both width and height. Defaults to 40. */
  size?: number;
  className?: string;
  alt?: string;
}

export function HollywoodIcon({ tool, size = 40, className = "", alt }: HollywoodIconProps) {
  const src = TOOL_ICONS[tool];
  return (
    <img
      src={src}
      alt={alt ?? tool.replace(/_/g, " ")}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}

interface HollywoodBadgeProps {
  tier: TierBadgeKey;
  /** Pixel height — width scales automatically. Defaults to 28. */
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
    />
  );
}

/**
 * Convenience wrappers for the three subscription tiers.
 */
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
