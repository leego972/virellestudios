import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONTAINER_ID = "virelle-verified-apps-override";
const STALE_ATTR = "data-virelle-stale-app-claims";
const ORIGINAL_FAQ_ATTR = "data-virelle-original-mobile-faq";
const OLD_FAQ = "Yes — Virelle Studios for iOS is live on the App Store. The Android app and a native desktop client are in active development. Your subscription works across every platform, and the web app at virelle.life is fully responsive in the meantime.";
const VERIFIED_FAQ = "Virelle works now through the responsive web platform and installable PWA. iOS, Android and desktop downloads are enabled on the Download page only when the server verifies a current public release.";

function isLandingPath() {
  return window.location.pathname === "/" || window.location.pathname === "/welcome";
}

function findStaleAppsSection(): HTMLElement | null {
  for (const section of Array.from(document.querySelectorAll<HTMLElement>("section"))) {
    const text = section.textContent || "";
    if (
      text.includes("Swappys Mobile — Free") &&
      text.includes("Download Swappys Free") &&
      text.includes("Google Play")
    ) {
      return section;
    }
  }
  return null;
}

function correctMobileFaq() {
  for (const paragraph of Array.from(document.querySelectorAll<HTMLParagraphElement>("p"))) {
    if ((paragraph.textContent || "").trim() !== OLD_FAQ) continue;
    if (!paragraph.hasAttribute(ORIGINAL_FAQ_ATTR)) {
      paragraph.setAttribute(ORIGINAL_FAQ_ATTR, OLD_FAQ);
    }
    paragraph.textContent = VERIFIED_FAQ;
  }
}

function restoreMobileFaq() {
  for (const paragraph of Array.from(document.querySelectorAll<HTMLParagraphElement>(`p[${ORIGINAL_FAQ_ATTR}]`))) {
    const original = paragraph.getAttribute(ORIGINAL_FAQ_ATTR);
    if (original) paragraph.textContent = original;
    paragraph.removeAttribute(ORIGINAL_FAQ_ATTR);
  }
}

function VerifiedAppsSection() {
  return (
    <section className="border-t border-amber-500/20 bg-black px-4 py-24 sm:px-6 lg:px-8" data-testid="verified-apps-section">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
          <Smartphone className="h-3.5 w-3.5" />
          Verified Apps &amp; Install Options
        </div>
        <h2 className="mb-4 text-3xl font-bold tracking-tight text-gold-shimmer sm:text-4xl">
          Use Virelle Wherever You Work
        </h2>
        <p className="mx-auto mb-10 max-w-2xl leading-relaxed text-white/60">
          The responsive web platform and installable PWA provide the current Virelle experience. Native mobile and desktop buttons are enabled only after the release service verifies a real public listing or installer.
        </p>

        <div className="mb-8 grid gap-5 text-left md:grid-cols-2">
          <div className="rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 to-amber-500/5 p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 font-black text-white">S</div>
              <div>
                <p className="font-bold text-white">Swappys Preview</p>
                <p className="text-xs text-white/45">Consent-gated AI likeness transformation</p>
              </div>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-white/50">
              Create a visibly marked high-quality preview, then move the approved result into Virelle for project continuity, final or master quality, studio provenance and secured broadcast outputs.
            </p>
            <Button
              type="button"
              onClick={() => window.location.assign("/swappys-broadcast")}
              className="w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
            >
              Open Swappys &amp; Broadcast <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-white/[0.03] p-6">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-emerald-400" />
              <div>
                <p className="font-bold text-white">Verified Downloads Only</p>
                <p className="text-xs text-white/45">Web · PWA · verified native releases</p>
              </div>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-white/50">
              The download page checks the production release endpoint before enabling iOS, Android, macOS, Windows or Linux buttons. Missing or stale files remain disabled.
            </p>
            <Button
              type="button"
              onClick={() => window.location.assign("/download")}
              variant="outline"
              className="w-full border-amber-500/35 text-amber-300 hover:bg-amber-500/10"
            >
              Check Verified Downloads <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-white/30">
          One account remains the source of truth. Projects, credits and settings stay connected across supported clients.
        </p>
      </div>
    </section>
  );
}

/**
 * Transitional guard for legacy landing copy. It leaves React's existing tree
 * intact, hides only the obsolete app-store section, and portals the verified
 * replacement beside it. This avoids unsafe innerHTML and remains stable if the
 * landing page re-renders after auth or marketplace queries resolve.
 */
export default function LandingVerifiedAppsGuard() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let disposed = false;

    const removeOverride = () => {
      document.getElementById(CONTAINER_ID)?.remove();
      document.querySelectorAll<HTMLElement>(`[${STALE_ATTR}]`).forEach(section => {
        section.hidden = false;
        section.removeAttribute("aria-hidden");
        section.removeAttribute(STALE_ATTR);
      });
      restoreMobileFaq();
      if (!disposed) setPortalTarget(null);
    };

    const sync = () => {
      if (!isLandingPath()) {
        removeOverride();
        return;
      }

      const staleSection = findStaleAppsSection();
      if (!staleSection) return;
      staleSection.hidden = true;
      staleSection.setAttribute("aria-hidden", "true");
      staleSection.setAttribute(STALE_ATTR, "true");
      correctMobileFaq();

      let target = document.getElementById(CONTAINER_ID);
      if (!target) {
        target = document.createElement("div");
        target.id = CONTAINER_ID;
        staleSection.insertAdjacentElement("afterend", target);
      }
      if (!disposed) setPortalTarget(current => current === target ? current : target);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", sync);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("popstate", sync);
      removeOverride();
    };
  }, []);

  return portalTarget ? createPortal(<VerifiedAppsSection />, portalTarget) : null;
}
