import {
  VIRELLE_CINEMA_FRAMES,
  VIRELLE_CINEMA_FRAME_SIZE,
  VIRELLE_CINEMA_SPRITE,
  VIRELLE_CINEMA_SPRITE_SIZE,
  type VirelleCinemaIconKey,
} from "@/constants/virelleCinemaIcons";
import { NAV_LABEL_TO_VIRELLE_CINEMA_ICON } from "@/constants/virelleCinemaIconMap";
import { useEffect, useRef } from "react";

const NAV_ICON_SIZE = 18;
const ORDERED_NAV_LABELS = Object.keys(NAV_LABEL_TO_VIRELLE_CINEMA_ICON).sort(
  (left, right) => right.length - left.length,
);

function suppressDuplicateWatermarks() {
  const watermarks = Array.from(
    document.querySelectorAll<HTMLElement>("[data-virelle-watermark]"),
  );

  watermarks.forEach((watermark, index) => {
    watermark.style.display = index === 0 ? "" : "none";
  });
}

function normalizeLabel(value: string | null): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function iconForElement(element: HTMLElement): VirelleCinemaIconKey | null {
  const text = normalizeLabel(element.textContent);
  const label = ORDERED_NAV_LABELS.find(
    candidate => text === candidate || text.startsWith(`${candidate} `),
  );
  return label ? NAV_LABEL_TO_VIRELLE_CINEMA_ICON[label] : null;
}

function applySpriteFrame(element: HTMLElement, icon: VirelleCinemaIconKey) {
  const frame = VIRELLE_CINEMA_FRAMES[icon];
  const scale = NAV_ICON_SIZE / VIRELLE_CINEMA_FRAME_SIZE;
  element.style.width = `${NAV_ICON_SIZE}px`;
  element.style.height = `${NAV_ICON_SIZE}px`;
  element.style.flex = "0 0 auto";
  element.style.display = "inline-block";
  element.style.overflow = "hidden";
  element.style.borderRadius = "18%";
  element.style.backgroundColor = "#050505";
  element.style.backgroundImage = `url("${VIRELLE_CINEMA_SPRITE}")`;
  element.style.backgroundRepeat = "no-repeat";
  element.style.backgroundSize = `${VIRELLE_CINEMA_SPRITE_SIZE.width * scale}px ${VIRELLE_CINEMA_SPRITE_SIZE.height * scale}px`;
  element.style.backgroundPosition = `${-frame.x * scale}px ${-frame.y * scale}px`;
  element.style.boxShadow = "0 0 10px rgba(212,175,55,0.16)";
}

function enhanceNavigationIcons() {
  const candidates = document.querySelectorAll<HTMLElement>(
    '[data-sidebar="menu-button"], [role="menuitem"]',
  );

  candidates.forEach(candidate => {
    const existingCinemaIcon = candidate.querySelector<HTMLElement>(
      ":scope > [data-virelle-cinema-icon]",
    );
    if (existingCinemaIcon) {
      existingCinemaIcon.style.opacity =
        candidate.dataset.active === "true" ? "1" : "0.72";
      return;
    }

    const icon = iconForElement(candidate);
    if (!icon) return;

    const genericIcon = candidate.querySelector<HTMLElement>(
      ":scope > svg, :scope > img",
    );
    if (!genericIcon) return;

    genericIcon.dataset.virelleGenericIcon = "true";
    genericIcon.style.display = "none";

    const replacement = document.createElement("span");
    replacement.dataset.virelleCinemaIcon = icon;
    replacement.dataset.virelleInjectedCinemaIcon = "true";
    replacement.setAttribute("aria-hidden", "true");
    replacement.style.opacity = candidate.dataset.active === "true" ? "1" : "0.72";
    applySpriteFrame(replacement, icon);
    candidate.insertBefore(replacement, candidate.firstChild);
  });
}

function restoreNavigationIcons() {
  document
    .querySelectorAll<HTMLElement>("[data-virelle-injected-cinema-icon]")
    .forEach(icon => icon.remove());
  document
    .querySelectorAll<HTMLElement>("[data-virelle-generic-icon]")
    .forEach(icon => {
      icon.style.display = "";
      delete icon.dataset.virelleGenericIcon;
    });
}

export default function GoldWatermarkLaunch({ className = "" }: { className?: string }) {
  const watermarkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    suppressDuplicateWatermarks();
    enhanceNavigationIcons();

    let scheduled = 0;
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(scheduled);
      scheduled = window.requestAnimationFrame(enhanceNavigationIcons);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-active"],
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(scheduled);
      restoreNavigationIcons();
      if (watermarkRef.current) watermarkRef.current.style.display = "";
      window.requestAnimationFrame(suppressDuplicateWatermarks);
    };
  }, []);

  return (
    <div
      ref={watermarkRef}
      data-virelle-watermark
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden ${className}`}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 48%, rgba(212,175,55,0.045) 0%, rgba(212,175,55,0.018) 38%, transparent 68%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/virelle-logo-square.png"
          alt=""
          className="object-contain"
          style={{
            width: "min(68vw, 68vh)",
            height: "min(68vw, 68vh)",
            opacity: 0.055,
            filter: "sepia(1) saturate(4.5) brightness(1.05) hue-rotate(6deg)",
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
