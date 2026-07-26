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
import { TOOL_TO_VIRELLE_CINEMA_ICON } from "@/constants/virelleCinemaIconMap";
import type { VirelleCinemaIconKey } from "@/constants/virelleCinemaIcons";

type HollywoodIconAlias =
  | "preproduction"
  | "production"
  | "post"
  | "community";

type HollywoodIconKey = ToolIconKey | VirelleCinemaIconKey | HollywoodIconAlias;

const HOLLYWOOD_ICON_ALIASES: Record<HollywoodIconAlias, VirelleCinemaIconKey> = {
  preproduction: "scripts",
  production: "scenes",
  post: "editing",
  community: "team",
};

interface HollywoodIconProps {
  tool: HollywoodIconKey;
  /** Pixel size — applied to both width and height. Defaults to 40. */
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

export function HollywoodIcon({
  tool,
  size = 40,
  className = "",
  alt,
}: HollywoodIconProps) {
  const resolvedTool: ToolIconKey | VirelleCinemaIconKey = isHollywoodAlias(tool)
    ? HOLLYWOOD_ICON_ALIASES[tool]
    : tool;
  const cinemaIcon = isToolIconKey(resolvedTool)
    ? TOOL_TO_VIRELLE_CINEMA_ICON[resolvedTool]
    : resolvedTool;

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

  const src = TOOL_ICONS[resolvedTool as ToolIconKey];
  return (
    <img
      src={src}
      alt={alt ?? String(resolvedTool).replace(/_/g, " ")}
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

export function HollywoodBadge({
  tier,
  size = 28,
  className = "",
}: HollywoodBadgeProps) {
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

export function IndieBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="indie" size={size} className={className} />;
}

export function CreatorBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="creator" size={size} className={className} />;
}

export function IndustryBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="industry" size={size} className={className} />;
}

export function FeaturedBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="featured" size={size} className={className} />;
}

export function NewBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="new" size={size} className={className} />;
}

export function CinematicBadgeImg({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return <HollywoodBadge tier="cinematic" size={size} className={className} />;
}

export default HollywoodIcon;
