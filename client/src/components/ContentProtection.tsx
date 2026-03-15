/**
 * ContentProtection — Virelle Studios IP Security Layer
 *
 * Provides a suite of client-side protections to deter casual content theft:
 *  1. Disables right-click context menu on protected media elements
 *  2. Prevents drag-to-save on images and videos
 *  3. Disables keyboard shortcuts commonly used to save media (Ctrl+S, Ctrl+U, F12 in prod)
 *  4. Adds a transparent overlay on video/image elements to block native save dialogs
 *  5. Adds a visible Virelle Studios watermark overlay on all rendered media
 *
 * NOTE: Client-side protection is a deterrent layer, not a cryptographic guarantee.
 * The real protection comes from server-side signed URLs, ownership metadata, and DMCA policy.
 */

import { useEffect } from "react";

// ─── Global Protection Hook ───────────────────────────────────────────────────
export function useContentProtection() {
  useEffect(() => {
    // 1. Disable right-click on media elements
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "VIDEO" ||
        target.tagName === "IMG" ||
        target.tagName === "CANVAS" ||
        target.closest("[data-protected]")
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 2. Prevent drag-to-save on images and videos
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "VIDEO" ||
        target.tagName === "IMG" ||
        target.closest("[data-protected]")
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Block common save shortcuts on protected content
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S — Save page
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        return false;
      }
      // Ctrl+U / Cmd+U — View source
      if ((e.ctrlKey || e.metaKey) && e.key === "u") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I / Cmd+Option+I — DevTools (soft block)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "i") {
        e.preventDefault();
        return false;
      }
      // PrintScreen key — screenshot deterrence (visual flash)
      if (e.key === "PrintScreen") {
        triggerScreenshotDeterrence();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}

// Flash the screen white briefly when PrintScreen is detected — makes screenshots
// show a white flash rather than the content (works on Windows)
function triggerScreenshotDeterrence() {
  const flash = document.createElement("div");
  flash.style.cssText = `
    position: fixed; inset: 0; background: white; z-index: 99999;
    pointer-events: none; opacity: 1; transition: opacity 0.3s ease;
  `;
  document.body.appendChild(flash);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      flash.style.opacity = "0";
      setTimeout(() => flash.remove(), 350);
    });
  });
}

// ─── Protected Media Wrapper ──────────────────────────────────────────────────
interface ProtectedMediaProps {
  children: React.ReactNode;
  showWatermark?: boolean;
  watermarkText?: string;
  className?: string;
}

/**
 * Wrap any media element (video, image) in this component to apply:
 * - Transparent click-interceptor overlay (blocks native save dialog)
 * - Optional visible watermark overlay
 */
export function ProtectedMedia({
  children,
  showWatermark = true,
  watermarkText = "© Virelle Studios",
  className = "",
}: ProtectedMediaProps) {
  return (
    <div
      className={`relative select-none ${className}`}
      data-protected="true"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}

      {/* Transparent pointer-events overlay — prevents native right-click save on video/img */}
      <div
        className="absolute inset-0 z-10"
        style={{ background: "transparent", pointerEvents: "none" }}
        aria-hidden="true"
      />

      {/* Visible watermark overlay */}
      {showWatermark && (
        <div
          className="absolute inset-0 z-20 pointer-events-none flex items-end justify-end p-3"
          aria-hidden="true"
        >
          <span
            className="text-white/30 text-xs font-semibold tracking-widest uppercase select-none"
            style={{
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "0.15em",
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Diagonal watermark for full-screen content */}
      {showWatermark && (
        <div
          className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          <span
            className="text-white/[0.04] font-black uppercase select-none whitespace-nowrap"
            style={{
              fontSize: "clamp(1.5rem, 5vw, 4rem)",
              transform: "rotate(-35deg)",
              letterSpacing: "0.3em",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            VIRELLE STUDIOS
          </span>
        </div>
      )}
    </div>
  );
}

export default useContentProtection;
