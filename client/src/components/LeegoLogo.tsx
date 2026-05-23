import { useRef, useState } from "react";

/**
 * LeegoLogo — the green Leego brand mark.
 *
 * Tap / click anywhere on the logo and it pulses out to roughly 2cm × 2cm
 * (≈ 76px at standard 96 DPI), holds at the enlarged size for ~2 seconds,
 * then snaps back to its baseline size. The enlargement is done with a
 * dynamic transform scale, so the same component looks right whether the
 * baseline is the small footer chip (h-8 ≈ 32px), the sidebar mark
 * (h-12 ≈ 48px), or the big Login splash (h-28 ≈ 112px). For oversized
 * placements (Login) where the baseline is already larger than 2cm, the
 * pulse becomes a gentle shrink-then-grow, which still reads as the
 * "tap to play" interaction the user asked for.
 *
 * Implementation notes:
 * - Uses transform: scale(...), so layout never reflows around the pulse.
 * - z-index is bumped during the pulse so the enlarged mark always sits
 *   above neighboring sidebar / footer chrome.
 * - Re-tapping during a pulse is ignored (debounced via local state).
 * - Respects prefers-reduced-motion: when the user has reduced motion,
 *   we skip the pulse entirely so we don't violate accessibility prefs.
 *
 * The existing `.leego-glow` filter animation keeps running independently
 * because it only animates `filter`, not `transform` — no conflict.
 */

const TARGET_PX = 76; // ≈ 2cm at 96 DPI
const HOLD_MS = 2000; // user-requested 2 second hold at peak
const TRANSITION_MS = 350;

interface LeegoLogoProps {
  className?: string;
  alt?: string;
  /**
   * If true, tapping does NOT trigger the pulse (useful inside large
   * link/anchor wrappers where the click should navigate instead).
   * Defaults to false — pulse on tap is the v6.77 behavior.
   */
  disablePulse?: boolean;
}

export default function LeegoLogo({
  className = "",
  alt = "Created by Leego",
  disablePulse = false,
}: LeegoLogoProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [pulsing, setPulsing] = useState(false);

  const handlePulse = (e: React.MouseEvent<HTMLImageElement>) => {
    if (disablePulse) return;
    const img = ref.current;
    if (!img || pulsing) return;
    // Honor reduced-motion preferences
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) return;
    }
    e.stopPropagation();
    const current = img.getBoundingClientRect().height;
    if (current <= 0) return;
    const scale = TARGET_PX / current;
    setPulsing(true);
    img.style.transform = `scale(${scale})`;
    img.style.zIndex = "50";
    img.style.position = img.style.position || "relative";
    window.setTimeout(() => {
      if (img) {
        img.style.transform = "";
        // Let the shrink transition finish before clearing z-index/position
        window.setTimeout(() => {
          img.style.zIndex = "";
        }, TRANSITION_MS + 20);
      }
      setPulsing(false);
    }, HOLD_MS);
  };

  return (
    <img
      ref={ref}
      src="/leego-logo.png"
      alt={alt}
      draggable={false}
      onClick={handlePulse}
      className={`${className} ${disablePulse ? "" : "cursor-pointer"} select-none leego-glow`}
      style={{
        transformOrigin: "center",
        transition: `transform ${TRANSITION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        willChange: "transform",
      }}
    />
  );
}
