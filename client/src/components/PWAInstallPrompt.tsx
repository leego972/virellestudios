import { useEffect, useState } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "virelle:install-dismissed-at";
const DISMISS_COOLDOWN_DAYS = 14;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isIOS() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

function recentlyDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ageMs = Date.now() - parseInt(ts, 10);
    return ageMs < DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Smart install prompt:
 *   - Chrome / Edge / Android: shows a native-banner-style card when the
 *     browser fires `beforeinstallprompt`, calling prompt() on click.
 *   - iOS Safari: shows a "tap Share, then Add to Home Screen" coach card
 *     since iOS doesn't expose a programmatic install prompt.
 *   - Hides if the app is already installed, recently dismissed, or the user
 *     is on the offline page.
 *   - Auto-shows after a 12s grace period so it doesn't pop on first paint.
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 12_000);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari: no event fires; show coach card on a delay if eligible
    if (isIOS() && !isStandalone()) {
      const t = setTimeout(() => {
        setShowIOSHint(true);
        setVisible(true);
      }, 18_000);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome !== "accepted") dismiss();
      setDeferredPrompt(null);
      setVisible(false);
    } catch {
      dismiss();
    }
  };

  if (!visible) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[60] rounded-2xl border border-primary/30 bg-black/95 backdrop-blur-md shadow-2xl shadow-primary/20 p-4 animate-in slide-in-from-bottom-4 fade-in duration-500"
      role="dialog"
      aria-label="Install Virelle Studios"
    >
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <img src="/virelle-favicon-192.png" alt="" className="w-10 h-10 rounded-lg" />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-base text-white leading-tight">Install Virelle Studios</h3>
          <p className="text-xs text-white/60 mt-1">
            {showIOSHint
              ? "Add Virelle to your Home Screen for a full-screen, app-like experience."
              : "Get faster access, offline support, and a true app feel."}
          </p>
        </div>
      </div>

      {showIOSHint ? (
        <div className="mt-3 space-y-2 text-xs text-white/70">
          <div className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">1</span>
            Tap the <Share className="inline h-3.5 w-3.5 mx-0.5" /> Share button
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">2</span>
            Choose <Plus className="inline h-3.5 w-3.5 mx-0.5" /> Add to Home Screen
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} className="w-full mt-2 h-9 text-xs text-white/60">
            Got it
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button onClick={install} className="flex-1 h-10 bg-primary text-black hover:bg-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Install
          </Button>
          <Button variant="ghost" onClick={dismiss} className="h-10 text-white/60 hover:text-white">
            Later
          </Button>
        </div>
      )}
    </div>
  );
}
