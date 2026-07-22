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
    source?: "env" | "github-release" | "none";
  };
}

const MOBILE_FEATURES = [
  { icon: "🎬", label: "Director Chat", desc: "Creative guidance connected to your account" },
  { icon: "📝", label: "Script Writer", desc: "Develop screenplays and production drafts" },
  { icon: "🎥", label: "Video Generation", desc: "Open the current Virelle generation tools" },
  { icon: "🖼️", label: "Storyboard", desc: "Plan and review visual sequences" },
  { icon: "💰", label: "Budget Estimator", desc: "Keep production planning available on set" },
  { icon: "🔍", label: "Continuity Checker", desc: "Review script and scene consistency" },
  { icon: "🤝", label: "Team Collaboration", desc: "Access shared projects and approvals" },
  { icon: "📋", label: "Shot List", desc: "Reference production plans on location" },
];

const DESKTOP_FEATURES = [
  { icon: "🖥️", label: "Dedicated Window", desc: "Virelle in a focused native application window" },
  { icon: "🔗", label: "Deep Links", desc: "Supported Virelle links return to the desktop app" },
  { icon: "⌨️", label: "Keyboard Support", desc: "Use the web platform with desktop input" },
  { icon: "🔒", label: "Sandboxed Wrapper", desc: "Context isolation with Node integration disabled" },
  { icon: "🌐", label: "Live Web Parity", desc: "Loads the current production Virelle platform" },
  { icon: "🎨", label: "Full Screen", desc: "Use an immersive production workspace" },
];

function platformAvailability(links: DownloadLinks | null) {
  return links?.desktop?.availability ?? { mac: false, win: false, linux: false };
}

export default function DownloadApp() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [links, setLinks] = useState<DownloadLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    fetch("/api/mobile/downloads", { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Download service returned HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        setLinks(data);
        setLoadError(false);
      })
      .catch(() => {
        setLinks(null);
        setLoadError(true);
      })
      .finally(() => {
        window.clearTimeout(timer);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPwaPrompt(event);
    };
    const installed = () => {
      setPwaInstalled(true);
      setPwaPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  async function handlePwaInstall() {
    if (!pwaPrompt) return;
    await pwaPrompt.prompt();
    const choice = await pwaPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      setPwaInstalled(true);
      setPwaPrompt(null);
    }
  }

  function copyReferral() {
    if (!user) return;
    const code = (user as any).referralCode || user.id;
    navigator.clipboard
      .writeText(`${window.location.origin}/register?ref=${encodeURIComponent(String(code))}`)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      });
  }

  const desktopAvail = platformAvailability(links);
  const availableLabels = useMemo(() => {
    const result = ["Web", "PWA"];
    if (links?.ios?.available && links.ios.url) result.push("iOS");
    if (links?.android?.available && links.android.url) result.push("Android");
    if (desktopAvail.mac) result.push("Mac");
    if (desktopAvail.win) result.push("Windows");
    if (desktopAvail.linux) result.push("Linux");
    return result.join(" · ");
  }, [links, desktopAvail.mac, desktopAvail.win, desktopAvail.linux]);

  const openVerified = (url: string | null | undefined) => {
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return;
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch {
      // Invalid release URL is treated as unavailable.
    }
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-black to-purple-900/20" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <Badge className="mb-6 border-amber-500/30 bg-amber-500/20 px-4 py-1.5 text-sm text-amber-300">
            {loading ? "Checking verified releases…" : availableLabels}
          </Badge>
          <h1 className="mb-6 text-4xl font-black leading-tight text-gold-shimmer sm:text-5xl md:text-7xl">
            Virelle Studios
            <span className="block text-amber-400">Wherever You Work</span>
          </h1>
          <p className="mx-auto max-w-2xl px-2 text-base leading-relaxed text-zinc-300 sm:text-xl">
            Use the live web platform, install the PWA, or download a release that the server has verified as available. Your account remains the source of truth across supported clients.
          </p>
          {loadError && (
            <p className="mx-auto mt-5 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              Release verification is temporarily unavailable. Unverified download buttons have been disabled rather than sending you to a stale file.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-20 px-4 py-12 sm:px-6">
        <section>
          <div className="mx-auto max-w-2xl rounded-3xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 to-amber-500/5 p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-2xl font-black">S</div>
              <div>
                <h2 className="text-2xl font-bold">Swappys</h2>
                <p className="text-sm text-zinc-400">High-quality AI face transformation preview</p>
              </div>
            </div>
            <p className="leading-relaxed text-zinc-300">
              Choose a clear source face and a target image. Swappys creates a consent-gated, visibly marked preview that demonstrates Virelle&apos;s likeness and compositing workflow. Virelle Creator access adds clean studio exports, project continuity controls and the wider production suite.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><strong>1.</strong> Clear front-facing source</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><strong>2.</strong> Well-lit target image</div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><strong>3.</strong> Confirm likeness consent</div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setLocation("/vfx-suite")} className="bg-amber-500 font-bold text-black hover:bg-amber-400">
                Open Swappys in Virelle
              </Button>
              <Button onClick={() => setLocation("/pricing?source=swappys-download")} variant="outline" className="border-amber-500/40 text-amber-300">
                Compare Creator Access
              </Button>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              A separate Swappys store download is shown only after its public store listing or signed installer has been verified. The full Virelle iOS listing is not presented as the Swappys app.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gold-shimmer sm:text-3xl">Mobile and Installable Web</h2>
            <p className="text-zinc-400">Only verified destinations are enabled.</p>
          </div>
          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              disabled={loading || !links?.ios?.available || !links.ios.url}
              onClick={() => openVerified(links?.ios?.url)}
              className="w-full rounded-2xl border-2 border-white/20 bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
            >
              {links?.ios?.available && links.ios.url ? `Download iOS · v${links.ios.version}` : "iOS release not verified"}
            </button>
            <button
              type="button"
              disabled={loading || !links?.android?.available || !links.android.url}
              onClick={() => openVerified(links?.android?.url)}
              className="w-full rounded-2xl border-2 border-amber-500/30 bg-amber-500 px-8 py-4 font-bold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
            >
              {links?.android?.available && links.android.url ? `Download Android · v${links.android.version}` : "Android release not verified"}
            </button>
          </div>
          <div className="flex justify-center">
            {pwaInstalled ? (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-6 py-3 text-sm font-semibold text-green-300">✓ Web app installed</div>
            ) : pwaPrompt ? (
              <button onClick={handlePwaInstall} className="rounded-2xl bg-amber-500 px-8 py-3 font-bold text-black transition hover:bg-amber-400">Install Web App (PWA)</button>
            ) : (
              <p className="max-w-md text-center text-xs text-zinc-500">Use your browser&apos;s “Add to Home Screen” or “Install app” command when the native install prompt is unavailable.</p>
            )}
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOBILE_FEATURES.map((feature) => (
              <div key={feature.label} className="rounded-2xl border border-amber-500/20 bg-white/5 p-4 sm:p-5">
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <div className="mb-1 font-semibold">{feature.label}</div>
                <div className="text-xs leading-snug text-zinc-400">{feature.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gold-shimmer sm:text-3xl">Desktop App</h2>
            <p className="text-zinc-400">A sandboxed wrapper around the live production web platform.</p>
          </div>
          <div className="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {(["mac", "win", "linux"] as const).map((platform) => {
              const label = platform === "mac" ? "macOS" : platform === "win" ? "Windows" : "Linux";
              const url = links?.desktop?.[platform] ?? null;
              const ready = Boolean(desktopAvail[platform] && url);
              return (
                <button
                  type="button"
                  key={platform}
                  disabled={loading || !ready}
                  onClick={() => openVerified(url)}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
                >
                  {ready ? `Download ${label} · v${links?.desktop?.version}` : `${label} release not verified`}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DESKTOP_FEATURES.map((feature) => (
              <div key={feature.label} className="rounded-2xl border border-amber-500/20 bg-white/5 p-4 sm:p-5">
                <div className="mb-3 text-3xl">{feature.icon}</div>
                <div className="mb-1 font-semibold">{feature.label}</div>
                <div className="text-xs leading-snug text-zinc-400">{feature.desc}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-zinc-500">Desktop packages may be unsigned until platform signing and notarisation credentials are configured.</p>
        </section>

        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-purple-500/10 p-6 text-center sm:p-8">
          <h2 className="mb-3 text-xl font-bold gradient-text-gold sm:text-2xl">One account. Current web capabilities.</h2>
          <p className="mx-auto max-w-2xl text-sm text-zinc-400 sm:text-base">
            Desktop and web-fallback tools load the current production platform. Native-only screens require their own release update and are not described as automatically identical to every web screen.
          </p>
        </div>

        {user ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center sm:p-8">
            <h3 className="mb-2 text-xl font-bold">Share with your crew</h3>
            <p className="mb-6 text-sm text-zinc-400">Copy your referral link for collaborators.</p>
            <button onClick={copyReferral} className="rounded-xl bg-amber-500 px-8 py-3 font-bold text-black hover:bg-amber-400">{copied ? "✓ Copied" : "Copy Referral Link"}</button>
          </div>
        ) : (
          <div className="pb-8 text-center">
            <Button onClick={() => setLocation("/register")} className="rounded-xl bg-amber-500 px-10 py-3 text-lg font-bold text-black hover:bg-amber-400">Create Account</Button>
          </div>
        )}
      </div>
    </div>
  );
}
