/**
 * HollywoodIcon — renders an original Virelle cinema tool icon.
 * HollywoodBadge — renders a Virelle Hollywood tier badge.
 */

import { VirelleCinemaIcon } from "@/components/VirelleCinemaIcon";
import { TOOL_ICONS, TIER_BADGES, type ToolIconKey, type TierBadgeKey } from "@/constants/hollywoodIcons";
import { TOOL_TO_VIRELLE_CINEMA_ICON } from "@/constants/virelleCinemaIconMap";

interface HollywoodIconProps {
  tool: ToolIconKey;
  /** Pixel size — applied to both width and height. Defaults to 40. */
  size?: number;
  className?: string;
  alt?: string;
}

export function HollywoodIcon({ tool, size = 40, className = "", alt }: HollywoodIconProps) {
  const cinemaIcon = TOOL_TO_VIRELLE_CINEMA_ICON[tool];

  if (cinemaIcon) {
    return (
      <VirelleCinemaIcon
        icon={cinemaIcon}
        size={size}
        className={className}
        alt={alt}
      />
    );
  }

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
