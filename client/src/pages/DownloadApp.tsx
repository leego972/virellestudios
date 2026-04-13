import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface DownloadLinks {
  ios: { url: string | null; version: string; available: boolean };
  android: { url: string | null; version: string; available: boolean };
  desktop: {
    mac: string | null;
    win: string | null;
    linux: string | null;
    version: string;
    available: boolean;
  };
}

function getApiBase() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

const MOBILE_FEATURES = [
  { icon: "🎬", label: "Director Chat", desc: "AI creative guidance on the go" },
  { icon: "📝", label: "Script Writer", desc: "Write screenplays from your phone" },
  { icon: "🎥", label: "Video Generation", desc: "Generate AI video clips anywhere" },
  { icon: "🖼️", label: "Storyboard", desc: "Visual planning in your pocket" },
  { icon: "💰", label: "Budget Estimator", desc: "Track production costs on set" },
  { icon: "🔍", label: "Continuity Checker", desc: "Catch script errors instantly" },
  { icon: "🤝", label: "Team Collaboration", desc: "Manage your crew from anywhere" },
  { icon: "📋", label: "Shot List", desc: "Reference your shots on location" },
];

const DESKTOP_FEATURES = [
  { icon: "🖥️", label: "Native Window", desc: "Dedicated app, no browser tab to lose" },
  { icon: "🔄", label: "Auto-Updates", desc: "Always on the latest version" },
  { icon: "🔔", label: "System Tray", desc: "Quick access to projects from the menu bar" },
  { icon: "🔗", label: "Deep Links", desc: "Stripe checkout returns directly to the app" },
  { icon: "📁", label: "File System", desc: "Native file access for exports" },
  { icon: "⌨️", label: "Keyboard Shortcuts", desc: "Full desktop keyboard support" },
  { icon: "🌐", label: "Offline Mode", desc: "Browse projects without internet" },
  { icon: "🎨", label: "Full Screen", desc: "Immersive full-screen filmmaking" },
];

export default function DownloadApp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [links, setLinks] = useState<DownloadLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    fetch(`${getApiBase()}/api/mobile/downloads`)
      .then(r => r.json())
      .then(setLinks)
      .catch(() => setLinks({
        ios: { url: "https://apps.apple.com/app/virelle-studios/id6761315616", version: "1.0.0", available: true },
        android: { url: "https://expo.dev/accounts/virellestudios/projects/virelle-studios/builds", version: "1.0.0", available: true },
        desktop: { mac: "https://virelle.life", win: "https://virelle.life", linux: "https://virelle.life", version: "1.0.0", available: true },
      }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setPwaPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setPwaInstalled(true); setPwaPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handlePwaInstall() {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    const { outcome } = await pwaPrompt.userChoice;
    if (outcome === "accepted") { setPwaInstalled(true); setPwaPrompt(null); }
  }

  function copyReferral() {
    if (user) {
      const code = (user as any).referralCode || user.id;
      navigator.clipboard
        .writeText(`https://www.virelle.life/register?ref=${code}`)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black to-purple-900/20" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5 text-sm">
            📱 iOS · Android · Mac · Windows · Linux · PWA
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-tight">
            Virelle Studios
            <span className="block text-amber-400">Everywhere You Work</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed px-2">
            Every AI filmmaking tool — Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more — available natively on iOS, Android, macOS, Windows, and Linux. One subscription. All platforms.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-20">

        {/* ── Mobile Downloads ──────────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">📱 Mobile App</h2>
            <p className="text-gray-400">iOS & Android — your full studio in your pocket</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* Android */}
            <button
              onClick={() => window.open(
                links?.android?.url ?? "https://expo.dev/accounts/virellestudios/projects/virelle-studios/builds",
                "_blank"
              )}
              disabled={loading}
              className="group flex items-center gap-4 px-6 sm:px-8 py-4 rounded-2xl border-2 transition-all duration-200 w-full sm:w-auto sm:min-w-[220px] bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341l-5.523-9.569-5.523 9.569h11.046zM12 2.5l-9.5 16.5h19L12 2.5z" />
                <path d="M4.5 20h15l-1.5-2.5h-12L4.5 20z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Get it on</div>
                <div className="text-lg font-bold leading-tight">Android</div>
                <div className="text-xs opacity-60">
                  {links?.android?.available ? `v${links.android.version} · APK` : "EAS Build Preview"}
                </div>
              </div>
            </button>

            {/* iOS */}
            <button
              onClick={() => window.open(
                links?.ios?.url ?? "https://apps.apple.com/app/virelle-studios/id6761315616",
                "_blank"
              )}
              disabled={loading}
              className="group flex items-center gap-4 px-6 sm:px-8 py-4 rounded-2xl border-2 transition-all duration-200 w-full sm:w-auto sm:min-w-[220px] bg-foreground text-background border-foreground hover:opacity-90 hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Download on the</div>
                <div className="text-lg font-bold leading-tight">App Store</div>
                <div className="text-xs opacity-60">v{links?.ios?.version ?? "1.0.0"} · iOS</div>
              </div>
            </button>
          </div>

          {/* PWA Install */}
          <div className="flex justify-center mt-4">
            {pwaInstalled ? (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-3 font-semibold">
                <span>✓</span> App installed — find it on your home screen
              </div>
            ) : pwaPrompt ? (
              <button
                onClick={handlePwaInstall}
                className="flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-amber-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install Web App (PWA)
              </button>
            ) : (
              <p className="text-xs text-white/30 text-center max-w-xs">
                Open in Chrome (Android) or Safari (iOS) and tap "Add to Home Screen" to install the web app
              </p>
            )}
          </div>

          {/* Mobile feature grid */}
          <div className="mt-12">
            <h3 className="text-center text-lg font-semibold mb-6 text-white/60">Every tool, on mobile</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MOBILE_FEATURES.map(f => (
                <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/8 transition-colors">
                  <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{f.icon}</div>
                  <div className="font-semibold text-sm sm:text-base mb-1">{f.label}</div>
                  <div className="text-xs text-gray-400 leading-snug">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Desktop Downloads ──────────────────────────────────────────────────── */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">🖥️ Desktop App</h2>
            <p className="text-gray-400">macOS, Windows & Linux — native performance</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {(["mac", "win", "linux"] as const).map(platform => {
              const label = platform === "mac" ? "macOS" : platform === "win" ? "Windows" : "Linux";
              const emoji = platform === "mac" ? "🍎" : platform === "win" ? "🪟" : "🐧";
              const url = links?.desktop?.[platform] ?? "https://virelle.life";
              return (
                <button
                  key={platform}
                  onClick={() => window.open(url, "_blank")}
                  disabled={loading}
                  className="flex items-center gap-3 px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-105 transition-all text-sm font-semibold w-full sm:w-auto justify-center disabled:opacity-50"
                >
                  <span className="text-xl">{emoji}</span>
                  Download for {label}
                  <span className="text-xs opacity-50 ml-1">v{links?.desktop?.version ?? "1.0.0"}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DESKTOP_FEATURES.map(f => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 hover:bg-white/8 transition-colors">
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{f.icon}</div>
                <div className="font-semibold text-sm sm:text-base mb-1">{f.label}</div>
                <div className="text-xs text-gray-400 leading-snug">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Parity callout ────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">One Subscription. All Platforms.</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Your Virelle subscription works across web, mobile, and desktop. Credits, projects, and settings sync automatically. New features added to the platform appear everywhere — no app update required.
          </p>
        </div>

        {/* ── Referral / CTA ────────────────────────────────────────────────────── */}
        {user ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="text-xl font-bold mb-2">Share with Your Crew</h3>
            <p className="text-gray-400 mb-6 text-sm sm:text-base">
              Share your referral link — you both earn bonus credits when they sign up.
            </p>
            <button
              onClick={copyReferral}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Referral Link"}
            </button>
          </div>
        ) : (
          <div className="text-center pb-8">
            <p className="text-gray-400 mb-4 text-sm">Create your account to get started</p>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-3 rounded-xl text-lg"
            >
              Create Account — It's Free
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
