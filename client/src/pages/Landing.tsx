import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Film, Zap, Layers, Users, Wand2, Music, Palette, Camera,
  ArrowRight, Star, CheckCircle2, Play, Shield, ShieldCheck,
  Globe, Clock, ChevronDown, Sun, Moon, BookOpen, CreditCard,
  MessageSquare, Clapperboard, Monitor, Scissors, MapPin,
  Mic, Sparkles, Video, Eye, Cpu, Building2, Rocket, Lock, AlertTriangle,
  Menu, X as XIcon, Smartphone, ChevronRight, TrendingUp, Award,
  Zap as ZapIcon, BarChart3, FileText, Headphones, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Feature data ─── */
const FULL_FILM_FEATURES = [
  { icon: Zap, title: "Full Film Generation", desc: "Describe your concept and AI generates a complete film — screenplay, scenes, dialogue, soundtrack, and final cut." },
  { icon: Layers, title: "Clip Chaining", desc: "Each scene is built from 4-8 AI video clips stitched seamlessly. 30-60 seconds per scene, 60-90 scenes per film." },
  { icon: Mic, title: "AI Voice Acting", desc: "35 emotion states with per-emotion ElevenLabs tuning — surprised, aggressive, cheerful, grumpy, exhausted, and more." },
  { icon: Music, title: "AI Film Score", desc: "Original soundtracks generated for every scene. Suno AI, MusicGen, and more — matched to mood and genre." },
  { icon: Eye, title: "Hyper-Realistic Characters", desc: "Characters with subsurface skin scattering, iris fiber detail, authentic facial asymmetry, and micro-expressions." },
  { icon: Camera, title: "Scene Continuity", desc: "Last frame of each scene feeds into the next. Smooth visual flow across your entire film — no jarring cuts." },
];

const VFX_FEATURES = [
  { icon: Sparkles, title: "Impossible Scenes", desc: "Generate scenes that would be cost-prohibitive to shoot — alien worlds, underwater cities, space battles, historical recreations." },
  { icon: Video, title: "Seamless Integration", desc: "Export individual AI scenes at matching resolution, frame rate, and color grade to composite into your live-action film." },
  { icon: Palette, title: "Art Direction Control", desc: "The Director Assistant lets you control every detail — lighting, camera angle, mood, color palette, lens choice, depth of field." },
  { icon: Wand2, title: "VFX Library", desc: "Drag-and-drop visual effects — fire, rain, snow, lens flares, particle effects, explosions. No compositing skills needed." },
  { icon: Users, title: "Character Matching", desc: "Upload photos of your real cast. AI generates scenes with characters that match your actors' appearance." },
  { icon: Cpu, title: "Multi-Provider Pipeline", desc: "Choose the best AI model for each scene — Runway for realism, Sora for cinematic quality, fal.ai for speed." },
];

const TESTIMONIALS = [
  { name: "Marcus Rivera", role: "Indie Filmmaker", text: "I produced a full short film in a weekend. The clip chaining is incredible — each scene flows naturally into the next.", stars: 5 },
  { name: "Sarah Chen", role: "VFX Supervisor, Meridian Films", text: "We used Virelle for 12 impossible scenes in our latest feature — alien landscapes, zero-gravity sequences. Saved us significant VFX costs.", stars: 5 },
  { name: "Aisha Patel", role: "Content Creator", text: "The Full Film Generation is insane. I described a sci-fi concept and had a complete film with voice acting and soundtrack in under 4 hours.", stars: 5 },
];

/* AI Model showcase data */
const AI_MODELS = [
  { name: "Runway Gen-4.5", category: "Video", badge: "Live", color: "emerald", desc: "Photorealistic video generation with temporal consistency" },
  { name: "Sora 2 Pro", category: "Video", badge: "Live", color: "blue", desc: "OpenAI's cinematic quality video at 1080p" },
  { name: "Kling 3.0", category: "Video", badge: "Live", color: "violet", desc: "Long-form video with native audio generation" },
  { name: "Veo 3", category: "Video", badge: "Live", color: "amber", desc: "Google DeepMind's highest-fidelity video model" },
  { name: "ElevenLabs v3", category: "Voice", badge: "Live", color: "rose", desc: "35 emotion states, 3,000+ voices, 29 languages" },
  { name: "Suno v4", category: "Music", badge: "Live", color: "purple", desc: "Full film scores, genre-matched, scene-by-scene" },
  { name: "fal.ai Flux", category: "Image", badge: "Live", color: "cyan", desc: "Ultra-fast image generation for storyboards" },
  { name: "GPT-4.1", category: "Script", badge: "Live", color: "green", desc: "Hollywood-format screenplay generation" },
];

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

export default function Landing() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handlePromptSubmit = () => {
    if (prompt.trim()) {
      setLocation(`/register?prompt=${encodeURIComponent(prompt)}`);
    } else {
      setLocation("/register");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30">
      {/* ─── Navigation ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/40 py-3" : "bg-transparent py-6"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation("/")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="h-5 w-5 text-black" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">Virelle <span className="text-amber-400">Studios</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => setLocation("/showcase")} className="text-sm font-bold text-foreground/60 hover:text-foreground transition-colors">Showcase</button>
            <button onClick={() => setLocation("/pricing")} className="text-sm font-bold text-foreground/60 hover:text-foreground transition-colors">Pricing</button>
            <button onClick={() => setLocation("/contact")} className="text-sm font-bold text-foreground/60 hover:text-foreground transition-colors">Enterprise</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/login")} className="text-sm font-bold text-foreground/60 hover:text-foreground transition-colors px-4">Login</button>
            <Button onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-full px-6 shadow-lg shadow-amber-500/20">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main>
        {/* ─── Hero Section ─── */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          <CinematicBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/20 to-background pointer-events-none" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-8 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5" />
              Professional AI Film Orchestration
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
              CONCEPT TO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500">COMPLETE FILM.</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-foreground/60 leading-relaxed mb-12">
              The professional orchestration platform for AI cinema. Generate full-length films with screenplay, scene continuity, voice acting, and original scores in a unified production pipeline.
            </p>

            {/* Prompt input */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="relative flex items-center bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl p-1 shadow-2xl focus-within:border-amber-500/50 transition-all">
                <div className="absolute left-4 text-foreground/40">
                  <Wand2 className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your film concept... e.g. 'A sci-fi thriller set in 2087 Tokyo'"
                  className="flex-1 bg-transparent pl-12 pr-4 py-4 text-sm text-foreground placeholder:text-foreground/40 outline-none"
                />
                <button
                  onClick={handlePromptSubmit}
                  className="m-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-black transition-all hover:scale-105 active:scale-95 shrink-0"
                  style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)" }}
                >
                  Generate Film
                  <ArrowRight className="h-4 w-4 inline ml-1.5" />
                </button>
              </div>
              <p className="text-xs text-foreground/40 mt-2">Instant access. Start generating immediately with transparent pricing.</p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
              <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-13 text-base gap-2 shadow-lg shadow-amber-500/20">
                Start Production
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/showcase")} className="h-13 text-base px-8 gap-2 border-white/20 hover:bg-white/5">
                <Play className="h-4 w-4" />
                Watch Showcase
              </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto opacity-60">
              {[
                { value: "100's", label: "Films Created", color: "text-amber-400" },
                { value: "100+", label: "Active Filmmakers", color: "text-green-400" },
                { value: "High", label: "Platform Uptime", color: "text-blue-400" },
                { value: "4.9/5", label: "User Rating", color: "text-purple-400" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-foreground/50 mt-1 uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <ZapIcon className="h-3.5 w-3.5" />
                The Pipeline
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
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
              ].map((s, i) => (
                <div key={s.step} className="relative text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center mx-auto mb-4`}>
                    <span className={`text-${s.color}-400 font-black text-lg`}>{s.step}</span>
                  </div>
                  <div className={`inline-block px-2.5 py-1 rounded-full bg-${s.color}-500/10 text-${s.color}-400 text-[11px] font-bold mb-3 uppercase tracking-wider`}>{s.time}</div>
                  <p className="text-sm font-bold mb-2">{s.title}</p>
                  <p className="text-xs text-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Two Use Cases ─── */}
        <section id="use-cases" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Two Ways to Use{" "}
                <span className="text-amber-400">Virelle Studios</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="bg-card/50 border-border/50 hover:border-amber-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                    <Film className="h-7 w-7 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Full AI Film Generation</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                    Describe your movie concept and Virelle generates the entire film — screenplay, 60-90 cinematic scenes with clip chaining, AI voice-acted dialogue, original soundtrack, and scene-to-scene continuity.
                  </p>
                  <div className="space-y-3 mb-8">
                    {["Up to 90-minute feature films", "4-8 AI video clips per scene, stitched seamlessly", "AI voice acting for all dialogue with 35 emotions", "AI-generated film score matched to every scene", "Character consistency across all scenes via DNA Lock"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-amber-400">Perfect for: Indie filmmakers, content creators, YouTube channels</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                    <Sparkles className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">VFX Scene Studio</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-6">
                    Shooting a live-action film with a real cast? Use Virelle to generate the scenes that would be cost-prohibitive to shoot. Export individual scenes to composite into your production.
                  </p>
                  <div className="space-y-3 mb-8">
                    {["Generate impossible locations and VFX", "Upload cast photos for character matching", "Precise art direction and camera control", "Export in ProRes for professional NLEs", "Multi-provider pipeline (Runway, Sora, fal.ai)"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-purple-400">Perfect for: VFX supervisors, commercial directors, production houses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Key Differentiators / Trust ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Professional Infrastructure.</h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">Virelle is built for the rigorous demands of professional film production.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl border border-border/40 bg-card/10">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-6 w-6 text-blue-400" />
                </div>
                <h4 className="text-lg font-bold mb-3">100% Commercial Ownership</h4>
                <p className="text-sm text-foreground/60 leading-relaxed">You own all outputs commercially. No royalties, no licensing fees, and no platform watermarks on your exports.</p>
              </div>
              <div className="p-8 rounded-3xl border border-border/40 bg-card/10">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-6">
                  <Cpu className="h-6 w-6 text-amber-400" />
                </div>
                <h4 className="text-lg font-bold mb-3">BYOK Architecture</h4>
                <p className="text-sm text-foreground/60 leading-relaxed">Bring Your Own Key. Connect your own AI provider accounts (Runway, Sora, fal.ai) for zero markup on generation costs.</p>
              </div>
              <div className="p-8 rounded-3xl border border-border/40 bg-card/10">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                  <Globe className="h-6 w-6 text-purple-400" />
                </div>
                <h4 className="text-lg font-bold mb-3">Global Distribution Ready</h4>
                <p className="text-sm text-foreground/60 leading-relaxed">Context-aware AI translation for subtitles in 130+ languages and a global directory of 94 film funders.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pricing Preview ─── */}
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-card/20 border-t border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <CreditCard className="h-3.5 w-3.5" />
                Transparent Pricing
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Production Tiers</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { tier: "Indie", price: "A$149", credits: "500 credits/mo", desc: "Solo filmmakers and students.", cta: "Select Indie" },
                { tier: "Creator", price: "A$490", credits: "2,000 credits/mo", desc: "Serious indie producers.", cta: "Select Creator", highlight: true },
                { tier: "Studio", price: "A$1,490", credits: "6,000 credits/mo", desc: "Boutique studios and agencies.", cta: "Select Studio" },
                { tier: "Enterprise", price: "Custom", credits: "Unlimited + BYOK", desc: "Major studios and broadcasters.", cta: "Contact Sales" },
              ].map(plan => (
                <Card key={plan.tier} className={`relative overflow-hidden transition-all duration-300 ${plan.highlight ? "border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]" : "border-border/50 hover:border-amber-500/30"}`}>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-2">{plan.tier}</h3>
                    <div className="mb-1">
                      <span className="text-3xl font-black">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-sm text-foreground/60">/mo</span>}
                    </div>
                    <p className="text-[11px] font-semibold text-amber-400 mb-3">{plan.credits}</p>
                    <p className="text-xs text-foreground/60 mb-6 leading-relaxed">{plan.desc}</p>
                    <Button
                      className={`w-full font-semibold ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-foreground/10 hover:bg-foreground/20 text-foreground"}`}
                      size="sm"
                      onClick={() => setLocation(plan.tier === "Enterprise" ? "/contact" : "/pricing")}
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

        {/* ─── FAQ ─── */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: "How long does it take?", answer: "A full 90-minute film takes 4–8 hours to generate from a written concept. Individual scenes generate in 3–6 minutes each." },
                { title: "What exactly does it generate?", answer: "Screenplay, scene-by-scene video clips, AI voice acting, original film score, scene-to-scene continuity, and a final stitched cut." },
                { title: "What rights do I get?", answer: "You own 100% of all outputs commercially. No royalties, no licensing fees, no platform watermarks on exports." },
                { title: "What AI models are used?", answer: "Runway Gen-4.5, Sora 2, Kling 3.0, Veo 3, and fal.ai for video. ElevenLabs v3 for voice. Suno v4 for scores." },
              ].map(q => (
                <div key={q.title}>
                  <p className="text-sm font-bold mb-2">{q.title}</p>
                  <p className="text-xs text-foreground/60 leading-relaxed">{q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden border-t border-border/30">
          <div className="absolute inset-0 bg-amber-500/[0.02] pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <h2 className="text-4xl sm:text-6xl font-black tracking-tighter mb-8">READY TO PRODUCE?</h2>
            <p className="text-lg text-foreground/60 mb-12">Join the next generation of filmmakers building the future of cinema on Virelle Studios.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => setLocation("/register")} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold px-10 h-14 text-base shadow-xl shadow-amber-500/20">
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/pricing")} className="w-full sm:w-auto h-14 px-10 text-base border-white/10 hover:bg-white/5">
                View Pricing
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/30 bg-card/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
              <Film className="h-3.5 w-3.5 text-black" />
            </div>
            <span className="text-sm font-black tracking-tighter uppercase italic">Virelle <span className="text-amber-400">Studios</span></span>
          </div>
          <div className="flex gap-8 text-xs font-bold text-foreground/40">
            <button onClick={() => setLocation("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => setLocation("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => setLocation("/contact")} className="hover:text-foreground transition-colors">Contact</button>
          </div>
          <p className="text-[10px] text-foreground/30 font-medium">© 2026 Virelle Studios. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
