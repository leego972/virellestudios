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
const ADULT_ACCESS_HREF = "/virelle-broadcast-render?adult=1";
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

function adultStudioActive(): boolean {
  return window.location.pathname.startsWith("/virelle-broadcast-render")
    && new URLSearchParams(window.location.search).get("adult") === "1";
}

function ensureAdultAccessShortcut() {
  const sidebarContent = document.querySelector<HTMLElement>('[data-sidebar="content"]');
  if (!sidebarContent) return;

  let wrapper = sidebarContent.querySelector<HTMLElement>("[data-virelle-adult-access]");
  if (!wrapper) {
    wrapper = document.createElement("section");
    wrapper.dataset.virelleAdultAccess = "true";
    wrapper.className = "mx-1 mt-1 border-t border-red-500/20 pt-1";

    const heading = document.createElement("div");
    heading.className = "px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-300/75 group-data-[collapsible=icon]:hidden";
    heading.textContent = "Adult · verified 18+";

    const link = document.createElement("a");
    link.href = ADULT_ACCESS_HREF;
    link.dataset.sidebar = "menu-button";
    link.dataset.virelleAdultAccessLink = "true";
    link.title = "Adult Studio — verification required";
    link.className = "flex h-9 w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2 text-sm font-normal text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
    link.setAttribute("aria-label", "Open Adult Studio verification");

    const icon = document.createElement("img");
    icon.src = "/icons/tools/video_generation.svg";
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.className = "h-[18px] w-[18px] shrink-0 object-contain opacity-75";

    const text = document.createElement("span");
    text.className = "min-w-0 truncate";
    text.textContent = "Adult Studio · 18+";

    const status = document.createElement("span");
    status.className = "ml-auto shrink-0 rounded border border-red-400/20 px-1 py-0.5 text-[8px] font-semibold uppercase text-red-300 group-data-[collapsible=icon]:hidden";
    status.textContent = "Verify";

    link.append(icon, text, status);

    const description = document.createElement("p");
    description.className = "px-2 pb-1 pt-0.5 text-[9px] leading-snug text-muted-foreground/65 group-data-[collapsible=icon]:hidden";
    description.textContent = "Age, phone, government ID and cardholder checks are required before entry.";

    wrapper.append(heading, link, description);
    sidebarContent.append(wrapper);
  }

  const link = wrapper.querySelector<HTMLElement>("[data-virelle-adult-access-link]");
  if (!link) return;
  const active = adultStudioActive();
  link.dataset.active = active ? "true" : "false";
  link.setAttribute("aria-current", active ? "page" : "false");
  link.classList.toggle("bg-sidebar-accent", active);
  link.classList.toggle("text-sidebar-accent-foreground", active);
}

function enhanceNavigationIcons() {
  ensureAdultAccessShortcut();
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
  document
    .querySelectorAll<HTMLElement>("[data-virelle-adult-access]")
    .forEach(shortcut => shortcut.remove());
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

    const handleNavigation = () => enhanceNavigationIcons();
    window.addEventListener("popstate", handleNavigation);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", handleNavigation);
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
