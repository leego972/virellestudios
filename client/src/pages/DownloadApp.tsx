import { useEffect, useMemo, useState } from "react";
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
    availability?: { mac: boolean; win: boolean; linux: boolean };
  };
}

function getApiBase() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

const MOBILE_FEATURES = [
  { icon: "ÃÂ°ÃÂÃÂÃÂ¬", label: "Director Chat", desc: "AI creative guidance on the go" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Script Writer", desc: "Write screenplays from your phone" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ¥", label: "Video Generation", desc: "Generate AI video clips anywhere" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ¼ÃÂ¯ÃÂ¸ÃÂ", label: "Storyboard", desc: "Visual planning in your pocket" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ°", label: "Budget Estimator", desc: "Track production costs on set" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Continuity Checker", desc: "Catch script errors instantly" },
  { icon: "ÃÂ°ÃÂÃÂ¤ÃÂ", label: "Team Collaboration", desc: "Manage your crew from anywhere" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Shot List", desc: "Reference your shots on location" },
];

const DESKTOP_FEATURES = [
  { icon: "ÃÂ°ÃÂÃÂÃÂ¥ÃÂ¯ÃÂ¸ÃÂ", label: "Native Window", desc: "Dedicated app, no browser tab to lose" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Auto-Updates", desc: "Always on the latest version" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "System Tray", desc: "Quick access to projects from the menu bar" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Deep Links", desc: "Stripe checkout returns directly to the app" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "File System", desc: "Native file access for exports" },
  { icon: "ÃÂ¢ÃÂÃÂ¨ÃÂ¯ÃÂ¸ÃÂ", label: "Keyboard Shortcuts", desc: "Full desktop keyboard support" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ", label: "Offline Mode", desc: "Browse projects without internet" },
  { icon: "ÃÂ°ÃÂÃÂÃÂ¨", label: "Full Screen", desc: "Immersive full-screen filmmaking" },
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
        // Honest fallback: only iOS is publicly available today.
        ios: { url: "https://apps.apple.com/app/virelle-studios/id6761315616", version: "1.0.0", available: true },
        android: { url: null, version: "1.0.0", available: false },
        desktop: { mac: null, win: null, linux: null, version: "1.0.0", available: false, availability: { mac: false, win: false, linux: false } },
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

  // Derive availability flags for honest marketing copy.
  const desktopAvail = links?.desktop?.availability ?? { mac: false, win: false, linux: false };
  const heroBadge = useMemo(() => {
    const parts = ["iOS", "PWA"];
    if (links?.android?.available) parts.splice(1, 0, "Android");
    if (desktopAvail.mac) parts.push("Mac");
    if (desktopAvail.win) parts.push("Windows");
    if (desktopAvail.linux) parts.push("Linux");
    return parts.join(" ÃÂÃÂ· ");
  }, [links, desktopAvail]);

  return (
    <div className="min-h-screen text-foreground" style={{ background:"linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>

      {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Hero ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black to-purple-900/20" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5 text-sm">
            ÃÂ°ÃÂÃÂÃÂ± {heroBadge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 leading-tight text-gold-shimmer">
            Virelle Studios
            <span className="block text-amber-400">Everywhere You Work</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed px-2">
            Every AI filmmaking tool ÃÂ¢ÃÂÃÂ Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more ÃÂ¢ÃÂÃÂ available on iOS today, with Android and desktop apps coming soon. One subscription. All platforms.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-20">

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Mobile Downloads ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-gold-shimmer">ÃÂ°ÃÂÃÂÃÂ± Mobile App</h2>
            <p className="text-gray-400">iOS available now ÃÂ¢ÃÂÃÂ Android coming soon</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* Android */}
            {(() => {
              const androidReady = !!links?.android?.available && !!links?.android?.url;
              return (
                <button
                  onClick={() => { if (androidReady && links?.android?.url) window.open(links.android.url, "_blank"); }}
                  disabled={loading || !androidReady}
                  aria-disabled={!androidReady}
                  title={androidReady ? "Download Android APK" : "Android app coming soon"}
                  className={`group flex items-center gap-4 px-6 sm:px-8 py-4 rounded-2xl border-2 transition-all duration-200 w-full sm:w-auto sm:min-w-[220px] ${
                    androidReady
                      ? "bg-amber-500 text-black border-amber-400/40 hover:bg-amber-500/90 hover:scale-105 cursor-pointer"
                      : "bg-white/5 text-white/60 border-white/15 cursor-not-allowed"
                  } disabled:opacity-60`}
                >
                  <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.341l-5.523-9.569-5.523 9.569h11.046zM12 2.5l-9.5 16.5h19L12 2.5z" />
                    <path d="M4.5 20h15l-1.5-2.5h-12L4.5 20z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-xs opacity-70">{androidReady ? "Get it on" : "Status"}</div>
                    <div className="text-lg font-bold leading-tight">Android</div>
                    <div className="text-xs opacity-70">
                      {androidReady ? `v${links?.android?.version ?? "1.0.0"} ÃÂÃÂ· APK` : "Coming soon"}
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* iOS */}
            <button
              onClick={() => {
                const url = links?.ios?.url ?? "https://apps.apple.com/app/virelle-studios/id6761315616";
                window.open(url, "_blank");
              }}
              disabled={loading}
              className="group flex items-center gap-4 px-6 sm:px-8 py-4 rounded-2xl border-2 transition-all duration-200 w-full sm:w-auto sm:min-w-[220px] bg-foreground text-background border-foreground hover:opacity-90 hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Download on the</div>
                <div className="text-lg font-bold leading-tight">App Store</div>
                <div className="text-xs opacity-60">v{links?.ios?.version ?? "1.0.0"} ÃÂÃÂ· iOS</div>
              </div>
            </button>
          </div>

          {/* PWA Install */}
          <div className="flex justify-center mt-4">
            {pwaInstalled ? (
              <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-3 font-semibold">
                <span>ÃÂ¢ÃÂÃÂ</span> App installed ÃÂ¢ÃÂÃÂ find it on your home screen
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
            <h3 className="text-center text-lg font-semibold mb-6 /60 gradient-text-gold">Every tool, on mobile</h3>
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

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Desktop Downloads ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-gold-shimmer">ÃÂ°ÃÂÃÂÃÂ¥ÃÂ¯ÃÂ¸ÃÂ Desktop App</h2>
            <p className="text-gray-400">
              {links?.desktop?.available
                ? "macOS, Windows & Linux ÃÂ¢ÃÂÃÂ native performance"
                : "Native desktop apps ÃÂ¢ÃÂÃÂ coming soon"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {(["mac", "win", "linux"] as const).map(platform => {
              const label = platform === "mac" ? "macOS" : platform === "win" ? "Windows" : "Linux";
              const emoji = platform === "mac" ? "ÃÂ°ÃÂÃÂÃÂ" : platform === "win" ? "ÃÂ°ÃÂÃÂªÃÂ" : "ÃÂ°ÃÂÃÂÃÂ§";
              const url = links?.desktop?.[platform] ?? null;
              const ready = !!desktopAvail[platform] && !!url;
              return (
                <button
                  key={platform}
                  onClick={() => { if (ready && url) window.open(url, "_blank"); }}
                  disabled={loading || !ready}
                  aria-disabled={!ready}
                  title={ready ? `Download for ${label}` : `${label} app coming soon`}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl border text-sm font-semibold w-full sm:w-auto justify-center transition-all ${
                    ready
                      ? "border-white/20 bg-white/5 hover:bg-white/10 hover:scale-105 cursor-pointer"
                      : "border-white/10 bg-white/5 text-white/50 cursor-not-allowed"
                  } disabled:opacity-60`}
                >
                  <span className="text-xl">{emoji}</span>
                  {ready ? `Download for ${label}` : `${label} ÃÂ¢ÃÂÃÂ Coming Soon`}
                  {ready && (
                    <span className="text-xs opacity-50 ml-1">v{links?.desktop?.version ?? "1.0.0"}</span>
                  )}
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

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Parity callout ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 text-center">
          <div className="text-4xl mb-4">ÃÂ°ÃÂÃÂÃÂ</div>
          <h2 className="text-xl sm:text-2xl font-bold mb-3 gradient-text-gold">One Subscription. All Platforms.</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            Your Virelle subscription works across web, mobile, and desktop. Credits, projects, and settings sync automatically. New features added to the platform appear everywhere ÃÂ¢ÃÂÃÂ no app update required.
          </p>
        </div>

        {/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Referral / CTA ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */}
        {user ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-center">
            <div className="text-3xl mb-3">ÃÂ°ÃÂÃÂÃÂ</div>
            <h3 className="text-xl font-bold mb-2 gradient-text-gold">Share with Your Crew</h3>
            <p className="text-gray-400 mb-6 text-sm sm:text-base">
              Share your referral link ÃÂ¢ÃÂÃÂ you both earn bonus credits when they sign up.
            </p>
            <button
              onClick={copyReferral}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
            >
              {copied ? "ÃÂ¢ÃÂÃÂ Copied!" : "Copy Referral Link"}
            </button>
          </div>
        ) : (
          <div className="text-center pb-8">
            <p className="text-gray-400 mb-4 text-sm">Create your account to get started</p>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-3 rounded-xl text-lg"
            >
              Create Account ÃÂ¢ÃÂÃÂ It's Free
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
