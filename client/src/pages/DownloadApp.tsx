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
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export default function DownloadApp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [links, setLinks] = useState<DownloadLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${getApiBase()}/api/mobile/downloads`)
      .then(r => r.json())
      .then(setLinks)
      .catch(() => setLinks({
        ios: { url: null, version: "1.0.0", available: false },
        android: { url: null, version: "1.0.0", available: false },
        desktop: { mac: null, win: null, linux: null, version: "1.0.0", available: false },
      }))
      .finally(() => setLoading(false));
  }, []);

  function handleAndroidDownload() {
    if (links?.android?.url) window.open(links.android.url, "_blank");
  }

  function handleIOSDownload() {
    if (links?.ios?.url) window.open(links.ios.url, "_blank");
  }

  function handleDesktopDownload(platform: "mac" | "win" | "linux") {
    const url = links?.desktop?.[platform];
    if (url) window.open(url, "_blank");
  }

  function copyReferral() {
    if (user) {
      const code = (user as any).referralCode || user.id;
      navigator.clipboard.writeText(`https://virellestudios.com/register?ref=${code}`).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
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

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black to-purple-900/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5 text-sm">
            📱 iOS · Android · Mac · Windows · Linux
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Virelle Studios
            <span className="block text-amber-400">Everywhere You Work</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every AI filmmaking tool — Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more — available natively on iOS, Android, macOS, Windows, and Linux. One subscription. All platforms.
          </p>
        </div>
      </div>

      {/* ── Mobile Downloads ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">📱 Mobile App</h2>
          <p className="text-gray-400">iOS & Android — your full studio in your pocket</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          {/* Android */}
          <button
            onClick={handleAndroidDownload}
            disabled={loading || !links?.android?.available}
            className={`group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-200 min-w-[220px]
              ${links?.android?.available
                ? "bg-white text-black border-white hover:bg-gray-100 hover:scale-105 cursor-pointer"
                : "bg-white/10 text-white/50 border-white/20 cursor-not-allowed"
              }`}
          >
            <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.341l-5.523-9.569-5.523 9.569h11.046zM12 2.5l-9.5 16.5h19L12 2.5z" />
              <path d="M4.5 20h15l-1.5-2.5h-12L4.5 20z" />
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-70">Get it on</div>
              <div className="text-lg font-bold leading-tight">Android APK</div>
              {links?.android?.available && <div className="text-xs opacity-60">v{links.android.version}</div>}
              {!loading && !links?.android?.available && <div className="text-xs opacity-60">Coming soon</div>}
            </div>
          </button>

          {/* iOS */}
          <button
            onClick={handleIOSDownload}
            disabled={loading || !links?.ios?.available}
            className={`group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-200 min-w-[220px]
              ${links?.ios?.available
                ? "bg-black text-white border-white hover:bg-gray-900 hover:scale-105 cursor-pointer"
                : "bg-white/5 text-white/50 border-white/20 cursor-not-allowed"
              }`}
          >
            <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <div className="text-xs opacity-70">Download on the</div>
              <div className="text-lg font-bold leading-tight">App Store</div>
              {links?.ios?.available && <div className="text-xs opacity-60">v{links.ios.version}</div>}
              {!loading && !links?.ios?.available && <div className="text-xs opacity-60">Coming soon</div>}
            </div>
          </button>
        </div>

        {!loading && (!links?.ios?.available || !links?.android?.available) && (
          <p className="text-sm text-gray-500 max-w-md mx-auto text-center mb-12">
            The app is currently in beta. Android APK is available for direct install.
            iOS requires TestFlight — <a href="mailto:support@virellestudios.com" className="text-amber-400 underline">contact us</a> to join the beta.
          </p>
        )}

        {/* Mobile features grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {MOBILE_FEATURES.map((f) => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold mb-1">{f.label}</div>
              <div className="text-sm text-gray-400">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* ── Desktop Downloads ─────────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">🖥️ Desktop App</h2>
            <p className="text-gray-400">macOS · Windows · Linux — native window, auto-updates, system tray</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* macOS */}
            <button
              onClick={() => handleDesktopDownload("mac")}
              disabled={loading || !links?.desktop?.mac}
              className={`group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-200 min-w-[220px]
                ${links?.desktop?.mac
                  ? "bg-gradient-to-br from-gray-800 to-gray-900 text-white border-gray-600 hover:border-gray-400 hover:scale-105 cursor-pointer"
                  : "bg-white/5 text-white/50 border-white/20 cursor-not-allowed"
                }`}
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Download for</div>
                <div className="text-lg font-bold leading-tight">macOS</div>
                {links?.desktop?.mac
                  ? <div className="text-xs opacity-60">v{links.desktop.version} · DMG</div>
                  : <div className="text-xs opacity-60">Coming soon</div>
                }
              </div>
            </button>

            {/* Windows */}
            <button
              onClick={() => handleDesktopDownload("win")}
              disabled={loading || !links?.desktop?.win}
              className={`group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-200 min-w-[220px]
                ${links?.desktop?.win
                  ? "bg-gradient-to-br from-blue-900 to-blue-950 text-white border-blue-600 hover:border-blue-400 hover:scale-105 cursor-pointer"
                  : "bg-white/5 text-white/50 border-white/20 cursor-not-allowed"
                }`}
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Download for</div>
                <div className="text-lg font-bold leading-tight">Windows</div>
                {links?.desktop?.win
                  ? <div className="text-xs opacity-60">v{links.desktop.version} · EXE installer</div>
                  : <div className="text-xs opacity-60">Coming soon</div>
                }
              </div>
            </button>

            {/* Linux */}
            <button
              onClick={() => handleDesktopDownload("linux")}
              disabled={loading || !links?.desktop?.linux}
              className={`group flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all duration-200 min-w-[220px]
                ${links?.desktop?.linux
                  ? "bg-gradient-to-br from-orange-900 to-orange-950 text-white border-orange-600 hover:border-orange-400 hover:scale-105 cursor-pointer"
                  : "bg-white/5 text-white/50 border-white/20 cursor-not-allowed"
                }`}
            >
              <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368v-.004c.026-1.152.032-2.35-.498-3.377C15.5.55 14.197-.015 12.504 0zm.387 2.807c.228.006.455.025.68.064 1.134.2 1.811.896 2.261 1.815.45.92.551 2.015.541 3.074-.012 1.764.787 2.914 1.651 3.997.854 1.072 1.738 2.193 2.198 3.435.46 1.242.479 2.607-.102 3.972-.581 1.366-1.774 2.617-3.686 3.272-1.912.655-4.378.655-6.29 0-1.912-.655-3.105-1.906-3.686-3.272-.581-1.365-.562-2.73-.102-3.972.46-1.242 1.344-2.363 2.198-3.435.864-1.083 1.663-2.233 1.651-3.997-.01-1.059.091-2.154.541-3.074.45-.919 1.127-1.615 2.261-1.815.225-.039.452-.058.68-.064h.184z" />
              </svg>
              <div className="text-left">
                <div className="text-xs opacity-70">Download for</div>
                <div className="text-lg font-bold leading-tight">Linux</div>
                {links?.desktop?.linux
                  ? <div className="text-xs opacity-60">v{links.desktop.version} · AppImage</div>
                  : <div className="text-xs opacity-60">Coming soon</div>
                }
              </div>
            </button>
          </div>

          {!loading && !links?.desktop?.available && (
            <p className="text-sm text-gray-500 max-w-md mx-auto text-center mb-12">
              The desktop app is in development. Sign up to be notified when it launches.
            </p>
          )}

          {/* Desktop features grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
            {DESKTOP_FEATURES.map((f) => (
              <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-1">{f.label}</div>
                <div className="text-sm text-gray-400">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Auto-parity callout ───────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-3xl p-8 text-center mb-16">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold mb-3">One Subscription. All Platforms.</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Your Virelle subscription works across web, mobile, and desktop. Credits, projects, and settings sync automatically. New features added to the platform appear everywhere — no app update required.
          </p>
        </div>

        {/* ── Referral / CTA ───────────────────────────────────────────────────── */}
        {user && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-8 text-center">
            <div className="text-3xl mb-3">🎁</div>
            <h3 className="text-xl font-bold mb-2">Share with Your Crew</h3>
            <p className="text-gray-400 mb-6">
              Share your referral link — you both earn bonus credits when they sign up.
            </p>
            <button
              onClick={copyReferral}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 py-3 rounded-xl transition-colors"
            >
              {copied ? "✓ Copied!" : "Copy Referral Link"}
            </button>
          </div>
        )}

        {!user && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Create your account to get started</p>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-3 rounded-xl text-lg"
            >
              Create Account
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
