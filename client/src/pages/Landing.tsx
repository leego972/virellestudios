import { useLocation } from "wouter";
import {
  Zap, Layers, Users, Music, Palette, Camera,
  ArrowRight, Play, ShieldCheck,
  Globe, Sparkles, Video, Eye, Cpu, CreditCard,
  Zap as ZapIcon, Film, Smartphone, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";

const LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png";

/* Cinematic particle canvas */
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
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
    />
  );
}

/* Gold watermark — large, fixed, perfectly centered, stays on screen while scrolling */
function GoldWatermark() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
      style={{ zIndex: 0 }}
    >
      <img
        src={LOGO_URL}
        alt=""
        className="w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] lg:w-[660px] lg:h-[660px] object-contain"
        style={{
          opacity: 0.06,
          filter: "sepia(1) saturate(4) brightness(1.4) hue-rotate(5deg)",
        }}
        draggable={false}
      />
    </div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-amber-500/30 relative">
      <GoldWatermark />

      {/* ─── Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/10 py-3" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setLocation("/")}>
            <img
              src={LOGO_URL}
              alt="Virelle Studios"
              className="h-9 w-9 rounded-lg object-contain shadow-lg shadow-amber-500/20"
            />
            <span className="text-xl font-black tracking-tighter uppercase italic text-white">
              Virelle <span className="text-amber-400">Studios</span>
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setLocation("/showcase")} className="text-sm font-bold text-white/60 hover:text-white transition-colors">Showcase</button>
            <button onClick={() => setLocation("/pricing")} className="text-sm font-bold text-white/60 hover:text-white transition-colors">Pricing</button>
            <button onClick={() => setLocation("/download")} className="text-sm font-bold text-white/60 hover:text-white transition-colors flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" />
              Get the App
            </button>
            <button onClick={() => setLocation("/contact")} className="text-sm font-bold text-white/60 hover:text-white transition-colors">Industry</button>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/login")} className="text-sm font-bold text-white/60 hover:text-white transition-colors px-4">Login</button>
            <Button onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-full px-6 shadow-lg shadow-amber-500/20">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* ─── 1. Hero Section ─── */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden bg-black">
          <CinematicBackground />
          {/* Subtle radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              Professional AI Film Orchestration
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-white">
              CONCEPT TO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500">CINEMATIC REALITY.</span>
            </h1>

            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-white/60 leading-relaxed mb-12">
              The professional orchestration platform for AI cinema. Generate full-length films with screenplay, scene continuity, voice acting, and original scores in a unified production pipeline.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-13 text-base gap-2 shadow-lg shadow-amber-500/20">
                Start Production
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/showcase")} className="h-13 text-base px-8 gap-2 border-white/20 hover:bg-white/5 text-white">
                <Play className="h-4 w-4" />
                Watch Showcase
              </Button>
            </div>

            {/* App download strip */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <p className="text-xs text-white/40 font-semibold uppercase tracking-widest">Also available on</p>
              <button
                onClick={() => setLocation("/download")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold text-white/80"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                iOS App
              </button>
              <button
                onClick={() => setLocation("/download")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold text-white/80"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.18 23.76c.3.17.64.22.99.14l12.12-6.99-2.54-2.54-10.57 9.39zm-1.9-20.1C1.1 3.96 1 4.32 1 4.71v14.58c0 .39.1.75.28 1.05l.07.07 8.17-8.17v-.19L1.35 3.59l-.07.07zM20.13 10.4l-2.35-1.36-2.84 2.84 2.84 2.84 2.37-1.37c.68-.39.68-1.03-.02-1.95zM4.17.24L16.29 7.23l-2.54 2.54L3.18.38C3.53.3 3.87.07 4.17.24z"/>
                </svg>
                Android App
              </button>
            </div>

            {/* Trust bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto opacity-60">
              {[
                { value: "Active", label: "Production Pipeline", color: "text-amber-400" },
                { value: "Global", label: "Filmmaker Community", color: "text-green-400" },
                { value: "Reliable", label: "Cloud Infrastructure", color: "text-blue-400" },
                { value: "Premium", label: "User Experience", color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider font-bold">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 2. How It Works ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <ZapIcon className="h-3.5 w-3.5" />
                The Pipeline
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Concept to Complete Film —{" "}
                <span className="text-amber-400">4 Steps</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: "01", time: "5 min", title: "Write Your Concept", desc: "Describe your film in plain language. Genre, tone, characters, story arc.", color: "amber" },
                { step: "02", time: "10 min", title: "AI Writes the Screenplay", desc: "Full Hollywood-format script with scene breakdowns, dialogue, and stage directions.", color: "purple" },
                { step: "03", time: "3–8 hrs", title: "Scenes Generate", desc: "60–90 scenes rendered with clip chaining, voice acting, and an original score.", color: "blue" },
                { step: "04", time: "Instant", title: "Export Final Cut", desc: "Download your complete film as MP4 or ProRes. 100% commercially yours.", color: "green" },
              ].map((s) => (
                <div key={s.step} className="relative text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center mx-auto mb-4`}>
                    <span className={`text-${s.color}-400 font-black text-lg`}>{s.step}</span>
                  </div>
                  <div className={`inline-block px-2.5 py-1 rounded-full bg-${s.color}-500/10 text-${s.color}-400 text-[11px] font-bold mb-3 uppercase tracking-wider`}>{s.time}</div>
                  <h3 className="text-base font-bold mb-2 text-white">{s.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. Two Core Use Cases ─── */}
        <section id="use-cases" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02] border-y border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Two Ways to Use{" "}
                <span className="text-amber-400">Virelle Studios</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-white/[0.03] border-white/10 hover:border-amber-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                    <Film className="h-7 w-7 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Full AI Film Generation</h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">
                    Describe your movie concept and Virelle generates the entire film — screenplay, 60–90 cinematic scenes with clip chaining, AI voice-acted dialogue, original soundtrack, and scene-to-scene continuity.
                  </p>
                  <div className="space-y-3 mb-8">
                    {["Up to 90-minute feature films", "4–8 AI video clips per scene, stitched seamlessly", "AI voice acting for all dialogue with 35 emotions", "AI-generated film score matched to every scene", "Character consistency across all scenes via DNA Lock"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-white/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-amber-400">Perfect for: Indie filmmakers, content creators, YouTube channels</p>
                </CardContent>
              </Card>
              <Card className="bg-white/[0.03] border-white/10 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                    <Sparkles className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">VFX Scene Studio</h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-6">
                    Shooting a live-action film with a real cast? Use Virelle to generate the scenes that would be cost-prohibitive to shoot. Export individual scenes to composite into your production.
                  </p>
                  <div className="space-y-3 mb-8">
                    {["Generate impossible locations and VFX", "Upload cast photos for character matching", "Precise art direction and camera control", "Export in ProRes for professional NLEs", "Multi-provider pipeline (Runway, Sora, fal.ai)"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-white/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-purple-400">Perfect for: VFX supervisors, commercial directors, production houses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── 4. Key Differentiators ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Professional Infrastructure.</h2>
              <p className="mt-4 text-white/60 max-w-2xl mx-auto">Virelle is built for the rigorous demands of professional film production.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-blue-400" />
                </div>
                <h4 className="text-lg font-bold mb-3 text-white">100% Commercial Ownership</h4>
                <p className="text-sm text-white/50 leading-relaxed">You own all outputs commercially. No royalties, no licensing fees, and no platform watermarks on your exports.</p>
              </div>
              <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
                  <Cpu className="h-6 w-6 text-amber-400" />
                </div>
                <h4 className="text-lg font-bold mb-3 text-white">BYOK Architecture</h4>
                <p className="text-sm text-white/50 leading-relaxed">Bring Your Own Key. Connect your own AI provider accounts (Runway, Sora, fal.ai) for zero markup on generation costs.</p>
              </div>
              <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02]">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                  <Globe className="h-6 w-6 text-purple-400" />
                </div>
                <h4 className="text-lg font-bold mb-3 text-white">Global Distribution Ready</h4>
                <p className="text-sm text-white/50 leading-relaxed">Context-aware AI translation for subtitles in 130+ languages and a global directory of 94 film funders.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 5. Pricing Preview ─── */}
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02] border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <CreditCard className="h-3.5 w-3.5" />
                Transparent Pricing
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Production Tiers</h2>
              <p className="mt-3 text-sm text-white/50">Register free. Features unlock when you subscribe.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { tier: "Indie",    price: "A$149",   credits: "500 credits/mo",   desc: "Solo filmmakers and students.",          cta: "Select Indie" },
                { tier: "Creator",  price: "A$490",   credits: "2,000 credits/mo",  desc: "Serious indie producers.",               cta: "Select Creator", highlight: true },
                { tier: "Industry", price: "A$1,490", credits: "6,000 credits/mo",  desc: "Boutique studios and agencies.",         cta: "Select Industry" },
                { tier: "Industry+", price: "Custom", credits: "Unlimited + BYOK", desc: "Major studios and broadcasters.",         cta: "Contact Sales" },
              ].map(plan => (
                <Card key={plan.tier} className={`relative overflow-hidden transition-all duration-300 ${plan.highlight ? "border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02] bg-amber-500/5" : "border-white/10 hover:border-amber-500/30 bg-white/[0.02]"}`}>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-white">{plan.tier}</h3>
                    <div className="mb-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-xs text-white/40 ml-1">/mo</span>}
                    </div>
                    <p className="text-[11px] font-semibold text-amber-400 mb-3">{plan.credits}</p>
                    <p className="text-xs text-white/50 mb-6 leading-relaxed">{plan.desc}</p>
                    <Button
                      className={`w-full font-semibold ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}
                      size="sm"
                      onClick={() => setLocation(plan.tier === "Industry+" ? "/contact" : "/register")}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-10">
              <button onClick={() => setLocation("/pricing")} className="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors">
                View Full Pricing & Feature Comparison →
              </button>
            </div>
          </div>
        </section>

        {/* ─── 6. Download App Section ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6">
              <Smartphone className="h-3.5 w-3.5" />
              Mobile Apps
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Take Your Studio Everywhere
            </h2>
            <p className="text-white/60 mb-10 max-w-xl mx-auto">
              The full Virelle Studios experience on iOS and Android. Monitor renders, review scenes, manage projects, and export — all from your phone.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setLocation("/download")}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all w-full sm:w-auto"
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">Download on the</p>
                  <p className="text-lg font-bold text-white leading-tight">App Store</p>
                </div>
              </button>
              <button
                onClick={() => setLocation("/download")}
                className="flex items-center gap-3 px-6 py-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all w-full sm:w-auto"
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.18 23.76c.3.17.64.22.99.14l12.12-6.99-2.54-2.54-10.57 9.39zm-1.9-20.1C1.1 3.96 1 4.32 1 4.71v14.58c0 .39.1.75.28 1.05l.07.07 8.17-8.17v-.19L1.35 3.59l-.07.07zM20.13 10.4l-2.35-1.36-2.84 2.84 2.84 2.84 2.37-1.37c.68-.39.68-1.03-.02-1.95zM4.17.24L16.29 7.23l-2.54 2.54L3.18.38C3.53.3 3.87.07 4.17.24z"/>
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest">Get it on</p>
                  <p className="text-lg font-bold text-white leading-tight">Google Play</p>
                </div>
              </button>
            </div>
            <p className="text-xs text-white/30 mt-6">Subscription required. Register free, then choose a plan to unlock all features.</p>
          </div>
        </section>

        {/* ─── 7. FAQ ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "How long does it take?", answer: "A full 90-minute film takes 4–8 hours to generate from a written concept. Individual scenes generate in 3–6 minutes each." },
                { title: "What exactly does it generate?", answer: "Screenplay, scene-by-scene video clips, AI voice acting, original film score, scene-to-scene continuity, and a final stitched cut." },
                { title: "What rights do I get?", answer: "You own 100% of all outputs commercially. No royalties, no licensing fees, no platform watermarks on exports." },
                { title: "What AI models are used?", answer: "Runway Gen-4.5, Sora 2, Kling 3.0, Veo 3, and fal.ai for video. ElevenLabs v3 for voice. Suno v4 for scores." },
                { title: "Do I need to pay to use it?", answer: "You can register for free and explore the platform. All AI generation features require an active subscription plan." },
                { title: "Is there a mobile app?", answer: "Yes — Virelle Studios is available on iOS and Android. Download from the App Store or Google Play. Your subscription works across all platforms." },
              ].map(q => (
                <div key={q.title}>
                  <p className="text-sm font-bold mb-2 text-white">{q.title}</p>
                  <p className="text-xs text-white/50 leading-relaxed">{q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 8. Final CTA ─── */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-white/10 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(212,175,55,0.04)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter mb-8 text-white">READY TO PRODUCE?</h2>
            <p className="text-lg text-white/50 mb-12">Join the next generation of filmmakers building the future of cinema on Virelle Studios.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => setLocation("/register")} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 h-14 text-base shadow-xl shadow-amber-500/20">
                Start Production
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
            <button onClick={() => setLocation("/download")} className="hover:text-white transition-colors flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Download App
            </button>
            <button onClick={() => setLocation("/contact")} className="hover:text-white transition-colors">Contact</button>
          </div>
          <p className="text-[10px] text-white/30 font-medium">© 2026 Virelle Studios. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
