import { useLocation } from "wouter";
  import SiteHead from "@/components/SiteHead";
  import {
    ArrowRight, Play, Key, Layers, Route, DollarSign, FileText,
    ShieldCheck, Film, CheckCircle2, XCircle, Settings2,
    Cpu, Music, Mic, BarChart3, Download, Menu, X, Zap,
  } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent } from "@/components/ui/card";
  import { useState, useEffect, useRef } from "react";

  const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

  function CinematicBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      let animId: number;
      const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number; color: string }[] = [];
      const colors = ["#d4af37", "#f5e6a3", "#a855f7", "#6366f1", "#ffffff"];
      const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
      resize();
      window.addEventListener("resize", resize);
      for (let i = 0; i < 80; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.6 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)] });
      }
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.globalAlpha = p.opacity; ctx.fill();
        });
        ctx.globalAlpha = 1;
        animId = requestAnimationFrame(draw);
      };
      draw();
      return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />;
  }

  function GoldWatermark() {
    return (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none" style={{ zIndex: 0 }}>
        <img src={LOGO_URL} alt=""
          className="w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] lg:w-[660px] lg:h-[660px] object-contain"
          style={{ opacity: 0.025, filter: "sepia(1) saturate(4) brightness(1.4) hue-rotate(5deg)" }}
          draggable={false} />
      </div>
    );
  }

  const WORKFLOW_STEPS = [
    "Concept", "Screenplay", "Character Bible", "Scene Plan",
    "Shot List", "Prompt Pack", "Provider Routing", "Render Tracking",
    "Review & Approval", "Export",
  ];

  const PROVIDER_CATEGORIES = [
    { icon: <Cpu className="h-4 w-4" />, label: "Script / LLM", examples: "OpenAI · Anthropic · Google · Custom" },
    { icon: <Film className="h-4 w-4" />, label: "Image", examples: "Stability · Replicate · Fal · Custom" },
    { icon: <Play className="h-4 w-4" />, label: "Video", examples: "Runway · Kling · Pika · Veo · Custom" },
    { icon: <Mic className="h-4 w-4" />, label: "Voice", examples: "ElevenLabs · PlayHT · Custom" },
    { icon: <Music className="h-4 w-4" />, label: "Music", examples: "Suno · Udio · Custom" },
    { icon: <FileText className="h-4 w-4" />, label: "Subtitles", examples: "OpenAI Whisper · Custom" },
    { icon: <Zap className="h-4 w-4" />, label: "Upscaling", examples: "Topaz · Real-ESRGAN · Custom" },
    { icon: <Settings2 className="h-4 w-4" />, label: "Custom API", examples: "Any endpoint you own" },
  ];

  const ROUTING_CARDS = [
    { task: "Script", providers: ["OpenAI", "Anthropic", "Google", "Custom LLM"] },
    { task: "Images", providers: ["Stability", "Replicate", "Fal", "Custom model"] },
    { task: "Video", providers: ["Runway", "Kling", "Pika", "Veo", "Custom endpoint"] },
    { task: "Voice", providers: ["ElevenLabs", "PlayHT", "Custom voice API"] },
    { task: "Music", providers: ["Suno", "Udio", "Custom music API"] },
    { task: "Export", providers: ["Prompt packs", "Scripts", "Shot lists", "Metadata"] },
  ];

  const BYOK_REASONS = [
    { title: "No vendor lock-in", desc: "Switch providers anytime without losing your project." },
    { title: "Best model per job", desc: "Use the right tool for each task — not a one-size-fits-all approach." },
    { title: "Control your spend", desc: "Your API budget goes directly to your chosen providers." },
    { title: "Switch mid-project", desc: "Change your video provider between scenes without starting over." },
    { title: "Centralized workflow", desc: "All your providers managed in one production cockpit." },
    { title: "Compare versions", desc: "Run the same scene through multiple providers and pick the winner." },
  ];

  const DASHBOARD_PANELS = [
    { label: "Projects", icon: <Film className="h-5 w-5 text-amber-400" /> },
    { label: "Providers", icon: <Key className="h-5 w-5 text-amber-400" /> },
    { label: "Characters", icon: <Cpu className="h-5 w-5 text-amber-400" /> },
    { label: "Scenes", icon: <Layers className="h-5 w-5 text-amber-400" /> },
    { label: "Prompts", icon: <FileText className="h-5 w-5 text-amber-400" /> },
    { label: "Costs", icon: <DollarSign className="h-5 w-5 text-amber-400" /> },
    { label: "Render Jobs", icon: <Play className="h-5 w-5 text-amber-400" /> },
    { label: "Exports", icon: <Download className="h-5 w-5 text-amber-400" /> },
  ];

  const COMPARISON_ROWS = [
    { feature: "Bring your own keys", generators: false, closed: false, virelle: true },
    { feature: "Choose any provider", generators: false, closed: false, virelle: true },
    { feature: "Full screenplay-to-shot workflow", generators: false, closed: "partial", virelle: true },
    { feature: "Track per-scene costs", generators: false, closed: false, virelle: true },
    { feature: "Lock approved scenes", generators: false, closed: false, virelle: true },
    { feature: "Export prompt packs", generators: false, closed: false, virelle: true },
    { feature: "Switch models mid-project", generators: false, closed: false, virelle: true },
    { feature: "Keep production assets organized", generators: false, closed: "partial", virelle: true },
  ];

  const FAQS = [
    { q: "What does BYOK mean?", a: "Bring Your Own Key. You connect your own API keys for the providers you already use. Virelle never resells AI generation — it orchestrates your own accounts." },
    { q: "Does Virelle generate video itself?", a: "No. Virelle is the workflow layer above generators. You connect Runway, Kling, Pika, Veo, or any custom endpoint. Virelle manages the prompts, routing, and tracking." },
    { q: "Can I use Runway, Kling, Pika, or Veo?", a: "Yes. Add your API key under Settings → Providers. Virelle routes your scene prompts to whichever provider you select." },
    { q: "Do I need API keys to start?", a: "No. You can build your screenplay, character bible, scene plan, and prompt pack without any API keys. Keys are only needed when you want to submit render jobs." },
    { q: "Can I control project costs?", a: "Yes. Set budget caps per project and per provider. Virelle warns you before any expensive operation and shows cost estimates before you submit." },
    { q: "Who owns the generated output?", a: "Your output rights depend on the provider you use. Virelle stores metadata and prompt packs. Always review your chosen provider's commercial terms." },
    { q: "Can I switch providers mid-project?", a: "Yes. Each scene can be assigned a different provider. You can re-render a single scene with a new provider without touching the rest of the film." },
    { q: "Can I export my prompts and shot lists?", a: "Yes. Export your full prompt pack as JSON, your screenplay as TXT, or your shot list as CSV from any project workspace." },
  ];

  function Check() { return <CheckCircle2 className="h-4 w-4 text-amber-400 flex-shrink-0" />; }
  function Cross() { return <XCircle className="h-4 w-4 text-white/20 flex-shrink-0" />; }
  function Partial() { return <div className="h-4 w-4 rounded-full border border-white/30 flex-shrink-0" />; }

  export default function Landing() {
    const [, setLocation] = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
      const handleScroll = () => setIsScrolled(window.scrollY > 50);
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
      <div className="min-h-screen bg-black text-white selection:bg-amber-500/30 relative">
        <SiteHead
          title="BYOK AI Film Production OS — Virelle Studios"
          description="Bring your own AI keys. Virelle is the production cockpit for AI filmmaking — screenplay, scene planning, provider routing, cost control, and export-ready assets."
        />
        <GoldWatermark />

        {/* ─── Nav ─── */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/10" : "bg-transparent"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <button onClick={() => setLocation("/")} className="flex items-center gap-2.5 group">
              <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" />
              <span className="text-sm font-black tracking-tighter uppercase italic">Virelle <span className="text-amber-400">Studios</span></span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/60">
              <button onClick={() => setLocation("/pricing")} className="hover:text-white transition-colors">Pricing</button>
              <button onClick={() => setLocation("/how-it-works")} className="hover:text-white transition-colors">How It Works</button>
              <button onClick={() => setLocation("/showcase")} className="hover:text-white transition-colors">Showcase</button>
              <button onClick={() => setLocation("/blog")} className="hover:text-white transition-colors">Blog</button>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} className="text-white/70 hover:text-white">Sign In</Button>
              <Button size="sm" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5">Open Studio</Button>
            </div>
            <button className="md:hidden p-2 rounded text-white/60 hover:text-white" onClick={() => setMobileMenuOpen(v => !v)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-black/95 backdrop-blur-xl border-b border-white/10 px-4 py-4 flex flex-col gap-3 text-sm font-semibold">
              {["pricing", "how-it-works", "showcase", "blog", "login"].map(p => (
                <button key={p} onClick={() => { setLocation(`/${p}`); setMobileMenuOpen(false); }}
                  className="text-left text-white/60 hover:text-white transition-colors capitalize">{p.replace(/-/g, " ")}</button>
              ))}
              <Button size="sm" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full mt-2">Open Studio</Button>
            </div>
          )}
        </header>

        <main>
          {/* ─── 1. Hero ─── */}
          <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none" />
            <CinematicBackground />
            <div className="relative z-10 max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-widest mb-8">
                <Key className="h-3 w-3" />
                BYOK AI Film Production OS
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tighter leading-none mb-6 text-white">
                Bring your own AI keys.
                <br />
                <span className="text-amber-400">Direct your film</span>
                <br />
                from concept to final cut.
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-white/50 leading-relaxed mb-4">
                Virelle is the BYOK production cockpit for AI filmmaking. Manage the full workflow across your preferred models — screenplay, character bible, scene planning, prompt control, provider routing, budget tracking, approvals, and export-ready production assets.
              </p>
              <p className="text-sm text-white/30 italic mb-10">
                No model lock-in. No forced provider. Your workflow, your keys.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
                <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-13 text-base gap-2 shadow-lg shadow-amber-500/20">
                  Open Studio <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/settings?tab=api-keys")} className="h-13 text-base px-8 gap-2 border-white/20 hover:bg-white/5 text-white">
                  <Key className="h-4 w-4" />
                  Connect Providers
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                {["BYOK Ready", "No Generation Fees", "Provider Freedom", "Full Screenplay Workflow", "Cost-Aware Production"].map(label => (
                  <span key={label} className="text-[11px] font-bold uppercase tracking-widest text-white/35 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500/50 inline-block" />{label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 2. Production Workflow Pipeline ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Production Workflow</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white">Concept to export in one cockpit</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {WORKFLOW_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className="px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm font-bold">
                      {i + 1}. {step}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-white/20 hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 3. BYOK Provider Freedom ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-zinc-950/40">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Provider Freedom</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Connect any provider, own every key</h2>
                <p className="text-white/40 max-w-xl mx-auto">You choose which AI handles each part of your production. Virelle routes your workflow — not your budget.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {PROVIDER_CATEGORIES.map(cat => (
                  <Card key={cat.label} className="bg-zinc-900/60 border-zinc-800 hover:border-amber-500/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2 text-amber-400">{cat.icon}<span className="text-sm font-bold text-white">{cat.label}</span></div>
                      <p className="text-xs text-white/40">{cat.examples}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 4. Provider Routing ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Provider Routing</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Right model for every task</h2>
                <p className="text-white/40 max-w-xl mx-auto">Assign a different provider to each production task. Mix and match. Switch anytime.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROUTING_CARDS.map(card => (
                  <Card key={card.task} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-5">
                      <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">{card.task}</div>
                      <div className="space-y-1.5">
                        {card.providers.map(p => (
                          <div key={p} className="text-sm text-white/70 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 flex-shrink-0" />{p}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-center text-xs text-white/25 mt-6">All provider labels are independent projects. No official partnerships implied.</p>
            </div>
          </section>

          {/* ─── 5. Why BYOK ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-zinc-950/40">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Why BYOK</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Your keys. Your workflow. Your film.</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BYOK_REASONS.map(r => (
                  <Card key={r.title} className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <Key className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-white mb-1">{r.title}</p>
                          <p className="text-xs text-white/45 leading-relaxed">{r.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 6. Cost Control ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Cost Control</p>
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-5">Know your budget before you render</h2>
                  <p className="text-white/45 leading-relaxed mb-6">Virelle helps you estimate costs per scene, set provider-level caps, and get warnings before any expensive job runs.</p>
                  <ul className="space-y-3">
                    {["Estimate cost per scene and total project", "Draft mode vs. final mode", "Provider-level budget caps", "Warnings before expensive jobs", "Usage history per project"].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm text-white/65">
                        <DollarSign className="h-4 w-4 text-amber-400 flex-shrink-0" />{item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Script cost", value: "~$0.02" },
                    { label: "Image per scene", value: "~$0.05" },
                    { label: "Video per scene", value: "~$0.50" },
                    { label: "Voice per scene", value: "~$0.10" },
                    { label: "Music per project", value: "~$0.20" },
                    { label: "Total estimate", value: "Your call" },
                  ].map(item => (
                    <div key={item.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                      <p className="text-xs text-white/40 mb-1">{item.label}</p>
                      <p className="text-lg font-black text-amber-400">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── 7. Prompt & Continuity System ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-zinc-950/40">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Prompt & Continuity</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Your film stays consistent — scene to scene</h2>
                <p className="text-white/40 max-w-xl mx-auto">Character bibles, style bibles, camera instructions, and locked approved scenes keep every provider rendering in the same world.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {["Character Bible", "Style Bible", "Visual Prompts", "Negative Prompts", "Camera Instructions", "Dialogue Prompts", "Music Direction", "Locked Approved Scenes"].map(item => (
                  <div key={item} className="border border-zinc-800 bg-zinc-900/60 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 8. Dashboard Preview ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Studio Dashboard</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Everything in one production cockpit</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {DASHBOARD_PANELS.map(panel => (
                  <div key={panel.label} className="bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/30 rounded-xl p-5 flex flex-col items-center gap-3 transition-colors">
                    {panel.icon}
                    <p className="text-sm font-bold text-white/70">{panel.label}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-12 gap-2">
                  Open Studio <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>

          {/* ─── 9. Comparison Table ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-zinc-950/40">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400/80 mb-3">Why Virelle</p>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white mb-4">Not another generator — the workflow layer above them.</h2>
              </div>
              <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 bg-zinc-900/60 text-xs font-bold uppercase tracking-widest text-white/40 border-b border-zinc-800">
                  <div className="p-4">Feature</div>
                  <div className="p-4 text-center">Clip generators</div>
                  <div className="p-4 text-center">Closed platforms</div>
                  <div className="p-4 text-center text-amber-400">Virelle BYOK</div>
                </div>
                {COMPARISON_ROWS.map((row, i) => (
                  <div key={row.feature} className={`grid grid-cols-4 text-sm border-b border-zinc-800/60 last:border-b-0 ${i % 2 === 0 ? "bg-zinc-900/20" : ""}`}>
                    <div className="p-4 text-white/60">{row.feature}</div>
                    <div className="p-4 flex items-center justify-center">{row.generators ? <Check /> : <Cross />}</div>
                    <div className="p-4 flex items-center justify-center">{row.closed === true ? <Check /> : row.closed === "partial" ? <Partial /> : <Cross />}</div>
                    <div className="p-4 flex items-center justify-center">{row.virelle ? <Check /> : <Cross />}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 10. Rights / Provider Terms ─── */}
          <section className="relative py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
            <div className="max-w-3xl mx-auto">
              <div className="border border-amber-500/20 bg-amber-500/5 rounded-2xl p-8 text-center">
                <ShieldCheck className="h-8 w-8 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-black text-white mb-3">Your output rights depend on your providers</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Because Virelle is BYOK, commercial usage rights depend entirely on the providers and models you connect. Virelle stores your prompt packs, metadata, and production assets — not generated media. Review your chosen provider's commercial terms before exporting for distribution.
                </p>
              </div>
            </div>
          </section>

          {/* ─── 11. FAQ ─── */}
          <section className="relative py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-zinc-950/40">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-14">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white">Common questions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {FAQS.map(faq => (
                  <div key={faq.q}>
                    <p className="text-sm font-bold mb-2 text-white">{faq.q}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{faq.answer ?? faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── 12. Final CTA ─── */}
          <section className="relative py-32 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_70%)] pointer-events-none" />
            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter mb-6 text-white">YOUR KEYS.<br />YOUR FILM.</h2>
              <p className="text-lg text-white/45 mb-10">Build the full production workflow on your own AI stack. Virelle orchestrates everything else.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => setLocation("/register")} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 h-14 text-base shadow-xl shadow-amber-500/20">
                  Open Studio
                </Button>
                <Button size="lg" variant="outline" onClick={() => setLocation("/pricing")} className="w-full sm:w-auto h-14 px-10 text-base border-white/10 hover:bg-white/5 text-white">
                  View Pricing
                </Button>
              </div>
            </div>
          </section>
        </main>

        {/* ─── Footer ─── */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2.5">
              <img src={LOGO_URL} alt="Virelle Studios" className="h-7 w-7 rounded object-contain" />
              <span className="text-sm font-black tracking-tighter uppercase italic text-white">Virelle <span className="text-amber-400">Studios</span></span>
            </div>
            <div className="flex gap-8 text-xs font-bold text-white/40">
              <button onClick={() => setLocation("/terms")} className="hover:text-white transition-colors">Terms</button>
              <button onClick={() => setLocation("/privacy")} className="hover:text-white transition-colors">Privacy</button>
              <button onClick={() => setLocation("/contact")} className="hover:text-white transition-colors">Contact</button>
              <button onClick={() => setLocation("/blog")} className="hover:text-white transition-colors">Blog</button>
            </div>
            <p className="text-[10px] text-white/30 font-medium">© 2026 Virelle Studios. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }
  