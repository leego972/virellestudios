import {
  VIRELLE_CINEMA_FRAMES,
  VIRELLE_CINEMA_FRAME_SIZE,
  VIRELLE_CINEMA_SPRITE,
  VIRELLE_CINEMA_SPRITE_SIZE,
  type VirelleCinemaIconKey,
} from "@/constants/virelleCinemaIcons";
import type { CSSProperties } from "react";

export interface VirelleCinemaIconProps {
  icon: VirelleCinemaIconKey;
  size?: number;
  className?: string;
  alt?: string;
}

export function cinemaIconStyle(
  icon: VirelleCinemaIconKey,
  size: number,
): CSSProperties {
  const frame = VIRELLE_CINEMA_FRAMES[icon];
  const scale = size / VIRELLE_CINEMA_FRAME_SIZE;

  return {
    width: size,
    height: size,
    flex: "0 0 auto",
    backgroundImage: `url("${VIRELLE_CINEMA_SPRITE}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${VIRELLE_CINEMA_SPRITE_SIZE.width * scale}px ${VIRELLE_CINEMA_SPRITE_SIZE.height * scale}px`,
    backgroundPosition: `${-frame.x * scale}px ${-frame.y * scale}px`,
  };
}

export function VirelleCinemaIcon({
  icon,
  size = 40,
  className = "",
  alt,
}: VirelleCinemaIconProps) {
  const label = alt ?? icon.replace(/_/g, " ");

  return (
    <span
      data-virelle-cinema-icon={icon}
      role={alt ? "img" : undefined}
      aria-label={alt ? label : undefined}
      aria-hidden={alt ? undefined : true}
      title={alt ? label : undefined}
      className={`inline-block overflow-hidden rounded-[18%] bg-[#050505] object-contain align-middle shadow-[0_0_12px_rgba(212,175,55,0.14)] ${className}`}
      style={cinemaIconStyle(icon, size)}
    />
  );
}

export default VirelleCinemaIcon;
