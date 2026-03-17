import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

interface DownloadLinks {
  ios: { url: string | null; version: string; available: boolean };
  android: { url: string | null; version: string; available: boolean };
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
      .catch(() => setLinks({ ios: { url: null, version: "1.0.0", available: false }, android: { url: null, version: "1.0.0", available: false } }))
      .finally(() => setLoading(false));
  }, []);

  function handleAndroidDownload() {
    if (links?.android?.url) {
      window.open(links.android.url, "_blank");
    }
  }

  function handleIOSDownload() {
    if (links?.ios?.url) {
      window.open(links.ios.url, "_blank");
    }
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

  const FEATURES = [
    { icon: "🎬", label: "Director Chat", desc: "AI creative guidance on the go" },
    { icon: "📝", label: "Script Writer", desc: "Write screenplays from your phone" },
    { icon: "🎥", label: "Video Generation", desc: "Generate AI video clips anywhere" },
    { icon: "🖼️", label: "Storyboard", desc: "Visual planning in your pocket" },
    { icon: "💰", label: "Budget Estimator", desc: "Track production costs on set" },
    { icon: "🔍", label: "Continuity Checker", desc: "Catch script errors instantly" },
    { icon: "🤝", label: "Team Collaboration", desc: "Manage your crew from anywhere" },
    { icon: "📋", label: "Shot List", desc: "Reference your shots on location" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black to-purple-900/20" />
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-400 border-amber-500/30 px-4 py-1.5 text-sm">
            📱 Now Available on iOS & Android
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            Virelle Studios
            <span className="block text-amber-400">In Your Pocket</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every AI filmmaking tool from the web platform — Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more — now available natively on iOS and Android. New features added to the website automatically sync to the app.
          </p>

          {/* Download buttons */}
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
                {links?.android?.available && (
                  <div className="text-xs opacity-60">v{links.android.version}</div>
                )}
                {!loading && !links?.android?.available && (
                  <div className="text-xs opacity-60">Coming soon</div>
                )}
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
                {links?.ios?.available && (
                  <div className="text-xs opacity-60">v{links.ios.version}</div>
                )}
                {!loading && !links?.ios?.available && (
                  <div className="text-xs opacity-60">Coming soon</div>
                )}
              </div>
            </button>
          </div>

          {/* Note about TestFlight / sideloading */}
          {!loading && (!links?.ios?.available || !links?.android?.available) && (
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              The app is currently in beta. Android APK is available for direct install.
              iOS requires TestFlight — <a href="mailto:support@virellestudios.com" className="text-amber-400 underline">contact us</a> to join the beta.
            </p>
          )}
        </div>
      </div>

      {/* Auto-parity callout */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-amber-500/10 to-purple-500/10 border border-amber-500/20 rounded-3xl p-8 text-center mb-16">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold mb-3">Always in Sync</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Every new tool added to Virelle Studios automatically appears in the mobile app — no app update required. The app fetches the live feature registry from our server on every launch.
          </p>
        </div>

        {/* Features grid */}
        <h2 className="text-3xl font-bold text-center mb-10">
          30+ Tools, Fully Native
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {FEATURES.map((f) => (
            <div key={f.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <div className="font-semibold mb-1">{f.label}</div>
              <div className="text-sm text-gray-400">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Referral section for logged-in users */}
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
            <p className="text-gray-400 mb-4">Create a free account to get started</p>
            <Button
              onClick={() => setLocation("/register")}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 py-3 rounded-xl text-lg"
            >
              Sign Up Free — 100 Credits
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
