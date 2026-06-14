import SiteHead from "@/components/SiteHead";
  import { Download, Mail, Globe, Film, Layers, Globe2, Mic2, Subtitles, Key, DollarSign, BookOpen } from "lucide-react";

  const LOGO_GOLD = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

  const VERIFIED_FACTS = [
    { icon: "🌐", stat: "130+", label: "Subtitle Languages", note: "SRT & VTT export included" },
    { icon: "🔑", stat: "14",   label: "AI Provider Integrations", note: "Runway, fal.ai, Luma, OpenAI, Replicate, ElevenLabs, Suno, D-ID, Anthropic, Google, Veo3, Seedance, HuggingFace, Venice" },
    { icon: "🎬", stat: "8",    label: "Production Pipeline Stages", note: "Screenplay → Storyboard → Shoot → ADR → Score → VFX → Subtitle → Distribute" },
    { icon: "🛠",  stat: "50+",  label: "Production Tools", note: "Shot lists, call sheets, budgets, mood boards, casting, location scouting, campaign manager and more" },
    { icon: "💰", stat: "Free", label: "Film Funding Directory", note: "Global grants and funds searchable by country — no paywall" },
  ];

  const PLATFORM_FACTS = [
    { label: "Full name",       value: "Virelle Studios" },
    { label: "Website",         value: "virelle.life" },
    { label: "Category",        value: "AI Film Production Platform" },
    { label: "Target users",    value: "Independent filmmakers, production companies, screenwriters, content creators" },
    { label: "Pricing",         value: "From A$149/mo (~$97 USD) · 7-day free trial · BYOK on all plans" },
    { label: "Deployment",      value: "Web app — no download required" },
    { label: "AI model policy", value: "Bring Your Own Key (BYOK) — users connect their own Runway, fal, Luma, OpenAI, and other accounts. Virelle charges no AI usage markup." },
    { label: "Audio suite",     value: "ADR (automated dialogue replacement), Foley design, music score cues, 3-bus mix export" },
    { label: "Unique feature",  value: "Built-in global film funding directory — the only AI film platform to include this" },
    { label: "Press contact",   value: "press@virelle.life" },
  ];

  export default function Press() {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteHead
          title="Press & Media — Virelle Studios"
          description="Verified facts, logos, and media resources for journalists and researchers covering Virelle Studios AI film production platform."
        />

        {/* Header */}
        <div className="border-b border-amber-500/20 bg-black/80">
          <div className="max-w-4xl mx-auto px-6 py-8 flex items-center gap-4">
            <img src={LOGO_GOLD} alt="Virelle Studios" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Press & Media</h1>
              <p className="text-sm text-white/40 mt-0.5">Virelle Studios — verified facts for journalists and researchers</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16 space-y-16">

          {/* Notice */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-300/80 leading-relaxed">
            <strong className="text-amber-400">Accuracy notice:</strong> Every stat and claim on this page is sourced from the live platform. No user count, revenue figure, or projected metric is included — only what is directly verifiable in the product today.
          </div>

          {/* Platform overview */}
          <section>
            <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Platform Overview</h2>
            <div className="grid gap-3">
              {PLATFORM_FACTS.map(f => (
                <div key={f.label} className="flex flex-col sm:flex-row sm:gap-6 py-3 border-b border-white/5">
                  <span className="text-xs uppercase tracking-widest text-white/30 font-semibold w-40 shrink-0 pt-0.5">{f.label}</span>
                  <span className="text-sm text-white/80 leading-relaxed">{f.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Verified platform stats */}
          <section>
            <h2 className="text-xl font-bold text-white mb-2 pb-2 border-b border-white/10">Verified Platform Capabilities</h2>
            <p className="text-xs text-white/35 mb-6">These figures reflect live platform capabilities, not user or revenue metrics.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VERIFIED_FACTS.map(f => (
                <div key={f.label} className="rounded-xl border border-amber-500/20 bg-white/[0.02] p-5">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-3xl font-black text-amber-400">{f.stat}</span>
                  </div>
                  <p className="text-sm font-semibold text-white/80 mb-1">{f.label}</p>
                  <p className="text-[11px] text-white/35 leading-relaxed">{f.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What makes it different */}
          <section>
            <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">What Makes It Different</h2>
            <div className="space-y-4 text-sm text-white/70 leading-relaxed">
              <p>
                <strong className="text-white">Full pipeline, not a clip tool.</strong> Most AI video tools (Runway, Pika, Luma) focus solely on video generation. Virelle covers the complete production workflow — from first screenplay draft through sound design, colour grading, subtitle export, and distribution — in a single platform.
              </p>
              <p>
                <strong className="text-white">BYOK (Bring Your Own Key).</strong> Virelle does not own or mark up AI model access. Users connect their own accounts with Runway, fal.ai, OpenAI, Luma, ElevenLabs, and 9 other providers. This means the platform stays model-agnostic as AI technology evolves.
              </p>
              <p>
                <strong className="text-white">Film Funding Directory.</strong> Virelle includes a searchable global directory of film grants, screen agency funds, and financing opportunities — organised by country. No other AI film platform includes this feature.
              </p>
              <p>
                <strong className="text-white">Professional audio suite.</strong> ADR (automated dialogue replacement), Foley sound design, music score cues, and a 3-bus mix — features typically only available in dedicated audio post-production software.
              </p>
            </div>
          </section>

          {/* Logo downloads */}
          <section>
            <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Logo & Brand Assets</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Gold Logo (PNG)", url: LOGO_GOLD },
                { label: "Square Logo", url: "/virelle-logo-square.png" },
                { label: "Favicon 512px", url: "/virelle-favicon-512.png" },
                { label: "Light Watermark", url: "/vs-wm-light.png" },
              ].map(asset => (
                <a
                  key={asset.label}
                  href={asset.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group"
                >
                  <img src={asset.url} alt={asset.label} className="h-12 w-12 object-contain opacity-80 group-hover:opacity-100" />
                  <span className="text-[10px] uppercase tracking-widest text-white/40 text-center">{asset.label}</span>
                  <Download className="h-3.5 w-3.5 text-amber-400/50 group-hover:text-amber-400" />
                </a>
              ))}
            </div>
            <p className="text-[11px] text-white/25 mt-4">Brand assets may be used for editorial coverage. Please do not alter colours or proportions.</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-white mb-6 pb-2 border-b border-white/10">Press Contact</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:press@virelle.life"
                className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-4 hover:bg-amber-500/10 transition-all"
              >
                <Mail className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">press@virelle.life</p>
                  <p className="text-[11px] text-white/40">Media enquiries and interview requests</p>
                </div>
              </a>
              <a
                href="https://virelle.life"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-4 hover:border-white/20 transition-all"
              >
                <Globe className="h-5 w-5 text-white/40" />
                <div>
                  <p className="text-sm font-semibold text-white">virelle.life</p>
                  <p className="text-[11px] text-white/40">Live platform</p>
                </div>
              </a>
            </div>
          </section>

        </div>
      </div>
    );
  }
  