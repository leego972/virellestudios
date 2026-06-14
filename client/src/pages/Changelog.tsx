import SiteHead from "@/components/SiteHead";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { ArrowLeft, CheckCircle2, Wrench, Zap, Shield, Globe, Sparkles } from "lucide-react";

  type ChangeEntry = {
    date: string;
    tag: "fix" | "feat" | "improve" | "security" | "perf";
    title: string;
    description: string;
  };

  const CHANGES: ChangeEntry[] = [
    {
      date: "June 2026",
      tag: "fix",
      title: "Text encoding fixed across entire platform",
      description:
        "A systematic encoding issue caused garbled characters (mojibake) on multiple pages — em dashes appeared as â€", curly quotes as â€™, and accented characters were mangled. Identified and corrected in 182+ files across client pages, server templates, and meta tags. All public-facing text now renders correctly.",
    },
    {
      date: "June 2026",
      tag: "fix",
      title: "BYOK API key save fixed for all 14 providers",
      description:
        "Saving API keys for providers beyond the original five (OpenAI, Runway, fal.ai, Replicate, Luma) was failing silently. The server-side validation now covers all 14 integrated providers: Runway, fal.ai, Luma AI, OpenAI, Replicate, ElevenLabs, Suno, Anthropic, Google, Veo3, Seedance, Venice AI, HuggingFace, and D-ID.",
    },
    {
      date: "June 2026",
      tag: "fix",
      title: "Marketplace asset image fallback",
      description:
        "Asset Marketplace images were showing broken thumbnails when hosted URLs expired or were unreachable. Added an automatic fallback to Pollinations.ai for regenerating previews on load failure.",
    },
    {
      date: "June 2026",
      tag: "feat",
      title: "Press & Media page launched",
      description:
        "A dedicated /press page now lists verified platform facts, accurate capability statistics, logo downloads for editorial use, and a press contact address. No claimed user counts or revenue figures — only what is directly verifiable in the live product.",
    },
    {
      date: "June 2026",
      tag: "improve",
      title: "Pricing transparency — USD equivalents added",
      description:
        "Plans are priced in Australian dollars (AUD). International visitors now see approximate USD equivalents displayed under each plan price so the value is immediately clear regardless of location.",
    },
    {
      date: "June 2026",
      tag: "improve",
      title: "Homepage trust bar updated with specific facts",
      description:
        "The landing page trust indicators were replaced with specific, verifiable claims: '14 AI Provider Integrations', 'Zero AI Usage Markup', '7-Day Free Trial', 'Global Film Funding Directory', 'ADR · Foley · Score Suite', and '130+ Subtitle Languages'.",
    },
    {
      date: "June 2026",
      tag: "improve",
      title: "Platform stats corrected on homepage",
      description:
        "The '3,000+ Voice Actors' stat was removed. The platform provides 10 ElevenLabs voice presets plus custom voice cloning — not 3,000 actors. It has been replaced with '14 AI Provider Integrations', which is accurate and more meaningful to filmmakers choosing a production platform.",
    },
    {
      date: "June 2026",
      tag: "improve",
      title: "SEO and sitemap refresh",
      description:
        "All sitemap lastmod dates updated to reflect current content. The /press, /showcase, and /changelog pages added to robots.txt allowlist and sitemap. sitemap-blog.xml created for blog content indexing.",
    },
    {
      date: "May 2026",
      tag: "feat",
      title: "Service worker updated to v1.3.0",
      description:
        "PWA cache migration logic updated. Stale virelle-* caches from older builds are cleared on load without unregistering the service worker, preserving PWA installability and the beforeinstallprompt event.",
    },
    {
      date: "May 2026",
      tag: "feat",
      title: "14-provider BYOK integration",
      description:
        "Expanded the Bring Your Own Key system from the original 5 providers to 14, adding Anthropic (Claude), Google Gemini, Veo3, Seedance, Venice AI, D-ID, Suno, and HuggingFace. All providers are validated server-side with format checks appropriate to each API.",
    },
    {
      date: "April 2026",
      tag: "feat",
      title: "Film Funding Directory",
      description:
        "Global searchable directory of film grants, screen agency funds, and production finance programmes, organised by country. Available on all paid plans. No other AI film platform includes this feature.",
    },
    {
      date: "April 2026",
      tag: "feat",
      title: "Professional audio suite: ADR, Foley, Score",
      description:
        "Added automated dialogue replacement (ADR), Foley sound design, music score direction, and a 3-bus mix export. Features previously only available in dedicated audio post-production software.",
    },
    {
      date: "March 2026",
      tag: "feat",
      title: "130+ language subtitle translation",
      description:
        "Automated subtitle translation covering 130+ languages with SRT and VTT export. Supports professional timing, speaker labels, and accessibility formatting.",
    },
    {
      date: "March 2026",
      tag: "security",
      title: "Security hardening pass",
      description:
        "Authentication session management tightened, API key storage encrypted at rest, admin routes protected with role-based guards, and rate limiting applied to all public API endpoints.",
    },
  ];

  const TAG_CONFIG = {
    fix:      { label: "Fix",      bg: "bg-red-500/10",    text: "text-red-400",    border: "border-red-500/25",    icon: Wrench },
    feat:     { label: "New",      bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/25",  icon: Sparkles },
    improve:  { label: "Improved", bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/25",   icon: Zap },
    security: { label: "Security", bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/25",  icon: Shield },
    perf:     { label: "Perf",     bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/25", icon: Zap },
  };

  export default function Changelog() {
    const [, setLocation] = useLocation();

    const months: Record<string, ChangeEntry[]> = {};
    CHANGES.forEach(c => {
      if (!months[c.date]) months[c.date] = [];
      months[c.date].push(c);
    });

    return (
      <div className="min-h-screen bg-black text-white">
        <SiteHead
          title="Changelog — Virelle Studios"
          description="Real development updates for the Virelle Studios AI film production platform. Every entry reflects an actual change deployed to the live product."
        />

        {/* Header */}
        <div className="border-b border-amber-500/20 bg-black/80 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-white/40 hover:text-white gap-1.5 -ml-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-white">Changelog</h1>
              <p className="text-[11px] text-white/35 mt-0.5">Real changes deployed to virelle.life — no marketing, no estimates</p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">

          {/* Accuracy notice */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-300/70">
            <strong className="text-amber-400">What this is:</strong> A factual record of changes shipped to the live platform. Every entry reflects work that was deployed. No roadmap items, no estimates, no marketing claims.
          </div>

          {Object.entries(months).map(([month, entries]) => (
            <section key={month}>
              {/* Month heading */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-sm font-black uppercase tracking-widest text-amber-400">{month}</span>
                <div className="flex-1 h-px bg-amber-500/15" />
                <span className="text-[11px] text-white/25 font-semibold">{entries.length} update{entries.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="space-y-6 pl-0">
                {entries.map((entry, i) => {
                  const cfg = TAG_CONFIG[entry.tag];
                  const Icon = cfg.icon;
                  return (
                    <div key={i} className="flex gap-5 group">
                      {/* Left: tag pill */}
                      <div className="flex flex-col items-center gap-2 shrink-0 w-24">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          <Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                        <div className="flex-1 w-px bg-white/5 group-last:hidden" />
                      </div>

                      {/* Right: content */}
                      <div className="pb-6 flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">{entry.title}</h3>
                        <p className="text-[13px] text-white/50 leading-relaxed">{entry.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Footer note */}
          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-xs text-white/25">
              Questions about a specific update?{" "}
              <button onClick={() => setLocation("/contact")} className="text-amber-400/60 hover:text-amber-400 underline-offset-2 hover:underline">
                Contact us
              </button>
              {" "}or visit the{" "}
              <button onClick={() => setLocation("/press")} className="text-amber-400/60 hover:text-amber-400 underline-offset-2 hover:underline">
                press page
              </button>{" "}
              for verified platform facts.
            </p>
          </div>

        </div>
      </div>
    );
  }
  