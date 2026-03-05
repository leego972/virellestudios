import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Film, Zap, Layers, Users, Wand2, Music, Palette, Camera,
  ArrowRight, Star, CheckCircle2, Play, Shield, ShieldCheck,
  Globe, Clock, ChevronDown, Sun, Moon, BookOpen, CreditCard,
  MessageSquare, Clapperboard, Monitor, Scissors, MapPin,
  Mic, Sparkles, Video, Eye, Cpu, Building2, Rocket, Lock, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";

/* ─── Feature data ─── */
const FULL_FILM_FEATURES = [
  { icon: Zap, title: "Full Film Generation", desc: "Describe your concept and AI generates a complete 90-minute film — screenplay, scenes, dialogue, soundtrack, and final cut." },
  { icon: Layers, title: "Clip Chaining", desc: "Each scene is built from 4-8 AI video clips stitched seamlessly. 30-60 seconds per scene, 60-90 scenes per film." },
  { icon: Mic, title: "AI Voice Acting", desc: "Every line of dialogue is spoken by AI voices with emotion, pacing, and character. ElevenLabs, OpenAI TTS, and more." },
  { icon: Music, title: "AI Film Score", desc: "Original soundtracks generated for every scene. Suno AI, MusicGen, and more — matched to mood and genre." },
  { icon: Eye, title: "Hyper-Realistic Characters", desc: "Characters are indistinguishable from real people. Subsurface skin scattering, iris fiber detail, authentic facial asymmetry, and micro-expressions — not CGI, not illustration: a real photograph." },
  { icon: Camera, title: "Scene Continuity", desc: "Last frame of each scene feeds into the next. Smooth visual flow across your entire film — no jarring cuts." },
];

const VFX_FEATURES = [
  { icon: Sparkles, title: "Impossible Scenes", desc: "Generate scenes that would cost $500K+ to shoot — alien worlds, underwater cities, space battles, historical recreations." },
  { icon: Video, title: "Seamless Integration", desc: "Export individual AI scenes at matching resolution, frame rate, and color grade to composite into your live-action film." },
  { icon: Palette, title: "Art Direction Control", desc: "The Director Assistant lets you control every detail — lighting, camera angle, mood, color palette, lens choice, depth of field." },
  { icon: Wand2, title: "VFX Library", desc: "Drag-and-drop visual effects — fire, rain, snow, lens flares, particle effects, explosions. No compositing skills needed." },
  { icon: Users, title: "Character Matching", desc: "Upload photos of your real cast. AI generates scenes with characters that match your actors' appearance." },
  { icon: Cpu, title: "Multi-Provider Pipeline", desc: "Choose the best AI model for each scene — Runway for realism, Sora for cinematic quality, fal.ai for speed." },
];

const ALL_TOOLS = [
  { icon: Scissors, title: "AI Script Writer", desc: "Hollywood-format screenplays with scene breakdowns, dialogue, and stage directions." },
  { icon: MessageSquare, title: "Director's Assistant", desc: "AI co-director for script rewrites, shot suggestions, continuity checks, and creative decisions." },
  { icon: Monitor, title: "Storyboard", desc: "Visual storyboards auto-generated from your script. See your film before you generate it." },
  { icon: MapPin, title: "Location Scout", desc: "AI-generated location suggestions with reference images for every scene." },
  { icon: Palette, title: "Color Grading", desc: "Cinematic LUT presets inspired by iconic films. One-click looks from Blade Runner to Moonlight." },
  { icon: Clapperboard, title: "Movie Export", desc: "Export full films, individual scenes, or trailers. MP4, ProRes, or direct to your editing timeline." },
];

const TESTIMONIALS = [
  { name: "Marcus Rivera", role: "Indie Filmmaker", text: "I produced a full short film in a weekend. The clip chaining is incredible — each scene flows naturally into the next. My film school professors thought I had a real crew.", stars: 5 },
  { name: "Sarah Chen", role: "VFX Supervisor, Meridian Films", text: "We used Virelle for 12 impossible scenes in our latest feature — alien landscapes, zero-gravity sequences, a 1920s ballroom. Saved us $800K in VFX costs.", stars: 5 },
  { name: "Aisha Patel", role: "Content Creator", text: "The Full Film Generation is insane. I described a sci-fi concept and had a complete film with voice acting and soundtrack in under 4 hours.", stars: 5 },
  { name: "James Okonkwo", role: "Production Designer", text: "We shoot live-action for the human scenes and use Virelle for everything else. The art direction control is precise enough for professional production.", stars: 5 },
  { name: "David Kim", role: "YouTube Creator (2.4M subs)", text: "The BYOK system is brilliant. I plugged in my Runway key and now I'm generating real cinematic video for every scene. My channel has exploded.", stars: 5 },
  { name: "Elena Vasquez", role: "Screenwriter / Director", text: "The Director's Assistant understands narrative structure better than most humans. It nails dialogue, pacing, and emotional beats.", stars: 4 },
];

const PRICING = [
  {
    tier: "Creator",
    price: "$2,500",
    period: "/mo",
    highlight: false,
    badge: null,
    desc: "Short films up to 30 minutes. Full production pipeline.",
    features: [
      "100 generations / month",
      "10 projects, 40 scenes each",
      "1080p Full HD",
      "Full Film Generation (up to 30 min)",
      "AI Voice Acting",
      "AI Soundtrack",
      "Character consistency",
      "Scene continuity",
      "Director's Assistant",
      "All production tools",
      "5 team members",
    ],
    limitations: [],
  },
  {
    tier: "Pro",
    price: "$5,000",
    period: "/mo",
    highlight: true,
    badge: "Most Popular",
    desc: "Feature-length films up to 90 minutes. Complete studio.",
    features: [
      "500 generations / month",
      "50 projects, 90 scenes each",
      "1080p + 4K UHD",
      "Full Film Generation (up to 90 min)",
      "Everything in Creator",
      "VFX Scene Studio",
      "Bulk generation",
      "Ultra quality exports",
      "Trailer generation",
      "15 team members",
    ],
    limitations: [],
  },
  {
    tier: "Industry",
    price: "$10,000",
    period: "/mo",
    highlight: false,
    badge: "Studios",
    desc: "Unlimited production. 4K. 180 minutes. White-label.",
    features: [
      "Unlimited everything",
      "4K UHD + ProRes",
      "Full Film Generation (up to 180 min)",
      "Everything in Pro",
      "White-label exports",
      "API access",
      "Unlimited team members",
      "Custom model fine-tuning",
      "Priority rendering",
      "Dedicated support",
    ],
    limitations: [],
  },
];

const STATS = [
  { value: "50K+", label: "Films Created" },
  { value: "12K+", label: "Filmmakers" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9/5", label: "User Rating" },
];

/* ─── Animated counter hook ─── */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ─── Use Case Toggle ─── */
function UseCaseToggle({ active, onChange }: { active: "film" | "vfx"; onChange: (v: "film" | "vfx") => void }) {
  return (
    <div className="inline-flex items-center bg-card/60 border border-border/50 rounded-full p-1">
      <button
        onClick={() => onChange("film")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
          active === "film"
            ? "bg-amber-500 text-black shadow-lg"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Film className="h-4 w-4 inline mr-2" />
        Full AI Film
      </button>
      <button
        onClick={() => onChange("vfx")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
          active === "vfx"
            ? "bg-purple-500 text-white shadow-lg"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Sparkles className="h-4 w-4 inline mr-2" />
        VFX Scene Studio
      </button>
    </div>
  );
}

/* ─── Landing Page ─── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const [useCase, setUseCase] = useState<"film" | "vfx">("film");

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/vs-watermark.png" alt="Virelle Studios" className="w-9 h-9 rounded-lg" draggable={false} />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">Virelle Studios</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
            <button onClick={() => setLocation("/blog")} className="hover:text-foreground transition-colors">Blog</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-9 w-9">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} className="text-sm">Sign In</Button>
            <Button size="sm" onClick={() => setLocation("/register")} className="text-sm bg-amber-500 hover:bg-amber-600 text-black font-medium">
              View Plans
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* VS Logo watermark background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/vs-watermark.png"
            alt=""
            className="w-[500px] h-[500px] sm:w-[600px] sm:h-[600px] lg:w-[700px] lg:h-[700px] object-contain opacity-[0.06]"
            style={{ filter: "sepia(1) saturate(3) brightness(1.1) hue-rotate(10deg)" }}
            draggable={false}
          />
        </div>
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <img src="/vs-watermark.png" alt="Virelle Studios" className="h-5 w-5 rounded" />
            AI Film Production &amp; VFX Scene Studio
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Generate Full{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              90-Minute Films
            </span>
            <br />
            <span className="text-3xl sm:text-4xl lg:text-5xl">
              or{" "}
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-purple-500 bg-clip-text text-transparent">
                Impossible VFX Scenes
              </span>
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The world's first AI film production platform. Generate complete feature-length films from a concept — or create individual VFX scenes to composite into your live-action production. Voice acting, soundtrack, and visual continuity included.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Creating Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              const el = document.getElementById("use-cases");
              el?.scrollIntoView({ behavior: "smooth" });
            }} className="h-12 text-base px-8">
              <Play className="h-4 w-4 mr-2" />
              See Use Cases
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">BYOK — bring your own API keys. Professional plans from $2,500/mo.</p>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="py-12 border-y border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-amber-400">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Two Use Cases ─── */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Two Ways to Use{" "}
              <span className="text-amber-400">Virelle Studios</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Whether you're generating an entire film from scratch or creating impossible scenes for your live-action production — Virelle has you covered.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Use Case 1: Full Film */}
            <Card className="bg-card/50 border-border/50 hover:border-amber-500/40 transition-all duration-300 group overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
              <CardContent className="p-8">
                <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                  <Film className="h-7 w-7 text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Full AI Film Generation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Describe your movie concept and Virelle generates the entire film — screenplay, 60-90 cinematic scenes with clip chaining, AI voice-acted dialogue, original soundtrack, character consistency, and scene-to-scene continuity. Export as a complete feature-length film.
                </p>
                <div className="space-y-2.5 mb-6">
                  {[
                    "Up to 90-minute feature films (180 min on Industry)",
                    "4-8 AI video clips per scene, stitched seamlessly",
                    "AI voice acting for all dialogue with emotion",
                    "AI-generated film score matched to every scene",
                    "Character consistency across all scenes",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-medium text-amber-400">Perfect for: Indie filmmakers, content creators, film students, YouTube channels</p>
              </CardContent>
            </Card>

            {/* Use Case 2: VFX Scene Studio */}
            <Card className="bg-card/50 border-border/50 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500" />
              <CardContent className="p-8">
                <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                  <Sparkles className="h-7 w-7 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">VFX Scene Studio</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Shooting a live-action film with a real cast? Use Virelle to generate the scenes that would be too expensive or physically impossible to shoot — alien worlds, historical recreations, space battles, underwater sequences, natural disasters. Export individual scenes to composite into your production.
                </p>
                <div className="space-y-2.5 mb-6">
                  {[
                    "Generate individual VFX scenes at production quality",
                    "Match resolution, frame rate, and color grade to your footage",
                    "Upload cast photos for character-matched AI scenes",
                    "Precise art direction — lighting, lens, mood, palette",
                    "Export scenes for compositing into your live-action edit",
                  ].map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-medium text-purple-400">Perfect for: Production companies, VFX studios, commercial directors, music video producers</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Features (Toggled by Use Case) ─── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {useCase === "film" ? (
                <>Full Film <span className="text-amber-400">Pipeline</span></>
              ) : (
                <>VFX Scene <span className="text-purple-400">Studio</span></>
              )}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto mb-8">
              {useCase === "film"
                ? "Every capability needed to generate a complete feature-length film from a single concept."
                : "Professional-grade tools for generating impossible scenes that integrate into your live-action production."
              }
            </p>
            <UseCaseToggle active={useCase} onChange={setUseCase} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {(useCase === "film" ? FULL_FILM_FEATURES : VFX_FEATURES).map((f) => (
              <Card key={f.title} className={`bg-card/50 border-border/50 transition-all duration-300 group ${
                useCase === "film" ? "hover:border-amber-500/30" : "hover:border-purple-500/30"
              }`}>
                <CardContent className="p-6">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 transition-colors ${
                    useCase === "film"
                      ? "bg-amber-500/10 group-hover:bg-amber-500/20"
                      : "bg-purple-500/10 group-hover:bg-purple-500/20"
                  }`}>
                    <f.icon className={`h-5 w-5 ${useCase === "film" ? "text-amber-400" : "text-purple-400"}`} />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Production Tools ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Complete Production{" "}
              <span className="text-amber-400">Toolkit</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Every tool a filmmaker needs — from screenplay to final cut. All powered by AI.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ALL_TOOLS.map((f) => (
              <Card key={f.title} className="bg-card/50 border-border/50 hover:border-amber-500/30 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                    <f.icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              From Concept to{" "}
              <span className="text-amber-400">Finished Film</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Whether it's a full film or a single VFX scene, the pipeline is the same.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Describe Your Vision", desc: "Enter your concept, genre, characters, and duration. Or upload an existing screenplay. The AI Director builds the blueprint.", icon: MessageSquare },
              { step: "2", title: "AI Generates Everything", desc: "Screenplay, 60-90 scenes with clip chaining, voice-acted dialogue, original soundtrack — all generated automatically.", icon: Cpu },
              { step: "3", title: "Review & Refine", desc: "Use the Director's Assistant to adjust scenes, re-generate specific shots, tweak dialogue, or change the score.", icon: Scissors },
              { step: "4", title: "Export Your Film", desc: "Assemble into a complete film or export individual scenes for compositing into your live-action production.", icon: Clapperboard },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-amber-400">{s.step}</span>
                </div>
                <h3 className="font-semibold text-sm mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BYOK Section ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-4">
                <Shield className="h-3.5 w-3.5" />
                Bring Your Own Key
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Your API Keys.{" "}
                <span className="text-purple-400">Your Budget.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Virelle orchestrates the pipeline — you control the AI providers. Plug in your own API keys for video generation, voice acting, and music. Choose the best provider for each task. Pay only for what you use.
              </p>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Video Generation</p>
                {[
                  "Runway ML — Best quality (Gen-4 Turbo)",
                  "OpenAI Sora — Cinematic realism",
                  "fal.ai — Best value (HunyuanVideo, Veo 3)",
                  "Luma AI, Replicate, Hugging Face",
                  "Pollinations.ai — No key needed",
                ].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-muted-foreground">{provider}</span>
                  </div>
                ))}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Voice Acting &amp; Music</p>
                {[
                  "ElevenLabs — Premium AI voice acting",
                  "OpenAI TTS — Reliable voice generation",
                  "Suno AI — AI-generated film scores",
                  "MusicGen (Replicate) — Open-source music",
                ].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-muted-foreground">{provider}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Connected Providers</p>
              {[
                { emoji: "🎬", name: "Runway ML", detail: "Gen-4 Turbo · Video", color: "amber" },
                { emoji: "🎤", name: "ElevenLabs", detail: "Turbo v2.5 · Voice Acting", color: "purple" },
                { emoji: "🎵", name: "Suno AI", detail: "Chirp v3.5 · Film Score", color: "blue" },
                { emoji: "⚡", name: "fal.ai", detail: "HunyuanVideo · VFX Scenes", color: "green" },
                { emoji: "🌿", name: "Pollinations.ai", detail: "No key needed", color: "emerald" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className={`h-8 w-8 rounded bg-${p.color}-500/10 flex items-center justify-center text-lg`}>{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.detail}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground text-center pt-2">Keys are encrypted and never exposed to the frontend.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Hyper-Realism Showcase Section ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Eye className="h-3.5 w-3.5" />
              Photorealism Engine
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Characters{" "}
              <span className="text-amber-400">Indistinguishable</span>{" "}from Real People
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Virelle's photorealism engine generates characters that cannot be told apart from real human beings on film. Every frame is engineered at the level of a $200M Hollywood production.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Eye className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Hyper-Realistic Skin</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Subsurface scattering shows blood flow beneath translucent skin layers. Visible pores, micro-wrinkles, fine peach fuzz, natural blemishes, and authentic facial asymmetry. No airbrushed, plastic, or porcelain skin — ever.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Camera className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Soulful, Living Eyes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Iris fibers rendered in full detail. Natural corneal reflections, subtle moisture in the waterline, and faint sclera veins. Eyes that convey genuine emotion and thought — not the dead, glassy look of AI.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Film className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Hollywood Cinematography</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every scene is generated as if captured on an ARRI ALEXA 65 with Zeiss Supreme Prime Radiance lenses. Kodak Vision3 500T film stock color science, anamorphic bokeh, and physically accurate light falloff.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/50 border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Micro-Expression Engine</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Characters don't just look real — they feel real. The prompt engine injects authentic micro-expression directives so every face conveys genuine emotion: the slight tension around the eyes before a lie, the involuntary lip compression of grief, the asymmetric smile of real joy.</p>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-amber-400" /> Character DNA Lock</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">A character's face, bone structure, skin tone, and physical attributes are locked via a DNA prompt anchor injected into every scene. Your lead actor looks identical in scene 1 and scene 87 — the only thing that changes is their wardrobe and emotional state.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Responsible AI & Minor Protection Section ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium mb-4">
              <ShieldCheck className="h-3.5 w-3.5" />
              Responsible AI Filmmaking
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Built for{" "}
              <span className="text-green-400">Responsible</span>{" "}Creators
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Virelle Studios is the only AI film platform with built-in child protection, content moderation, and industry-leading safeguards — so you can create freely without legal risk.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card/50 border border-green-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">AI Minor Protection</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When a minor character appears in a sensitive scene — shower, beach, changing — our AI automatically applies cinematic modesty: heavy steam, fog, tasteful camera angles, and appropriate framing. No nudity, ever. Automatically.
              </p>
            </div>
            <div className="bg-card/50 border border-blue-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Face & Likeness Consent</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Directors are legally responsible for obtaining consent from living individuals whose likeness they use. Our platform requires acknowledgment of consent obligations at upload. Historical public figures (pre-1900) are exempt with quality source images.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Instant Misuse Alerts</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our content moderation engine scans every generation in real time. Suspected policy violations trigger an immediate account freeze and alert to our safety team — reviewed within 24 hours. Zero tolerance for CSAM.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border border-green-500/10 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Zero Tolerance for Child Sexual Abuse Material (CSAM)</p>
              <p className="text-xs text-muted-foreground">
                Any attempt to generate CSAM results in immediate permanent account termination, IP ban, and mandatory reporting to NCMEC and law enforcement. This is non-negotiable and fully automated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Transparent{" "}
              <span className="text-amber-400">Pricing</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              You pay for the platform. You bring your own AI keys. Zero hidden costs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PRICING.map((plan) => (
              <Card key={plan.tier} className={`relative overflow-hidden ${plan.highlight ? "border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" : "bg-card/50 border-border/50"}`}>
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                <CardContent className="p-5">
                  {plan.badge && (
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${
                      plan.highlight ? "text-amber-400 bg-amber-500/10" : "text-purple-400 bg-purple-500/10"
                    }`}>{plan.badge}</span>
                  )}
                  <h3 className="text-lg font-bold">{plan.tier}</h3>
                  <div className="mt-1 mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                  <Button
                    className={`w-full mb-4 ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocation(plan.tier === "Industry" ? "/contact" : "/pricing")}
                  >
                    {plan.tier === "Industry" ? "Contact Sales" : "Subscribe Now"}
                  </Button>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                    {plan.limitations.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <span className="h-3.5 w-3.5 text-red-400/60 shrink-0 mt-0.5 text-center">—</span>
                        <span className="text-muted-foreground/60 line-through">{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Film Production Packages */}
          <div className="mt-14 mb-10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold">Film Production Packages</h3>
              <p className="text-sm text-muted-foreground mt-2">One-time payment per film. Full AI-generated production.</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold mt-4">
                <Sparkles className="h-4 w-4" />
                Launch Special — 50% Off Your First Film
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { name: "Short Film", duration: "Up to 30 min", full: "$80,000", launch: "$40,000", features: ["30-min film", "AI voice acting", "AI soundtrack", "1080p HD", "2 revision passes"] },
                { name: "Feature Film", duration: "Up to 60 min", full: "$140,000", launch: "$70,000", features: ["60-min film", "Everything in Short", "4K available", "Trailer included", "3 revision passes"] },
                { name: "Full Feature", duration: "Up to 90 min", full: "$200,000", launch: "$100,000", popular: true, features: ["90-min film", "Everything in Feature", "4K UHD", "Full score", "5 revision passes"] },
                { name: "Premium", duration: "Up to 180 min", full: "$250,000", launch: "$125,000", features: ["180-min film", "White-glove service", "Unlimited revisions", "4K + ProRes", "48-hour delivery"] },
              ].map((pkg) => (
                <Card key={pkg.name} className={`relative overflow-hidden ${pkg.popular ? "border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" : "bg-card/50 border-border/50"}`}>
                  {pkg.popular && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />}
                  <CardContent className="p-5">
                    {pkg.popular && <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3 text-amber-400 bg-amber-500/10">Most Popular</span>}
                    <h4 className="text-lg font-bold">{pkg.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{pkg.duration}</p>
                    <div className="text-sm text-muted-foreground line-through">{pkg.full}</div>
                    <div className="text-2xl font-bold text-amber-400 mb-3">{pkg.launch}</div>
                    <Button
                      className={`w-full mb-4 ${pkg.popular ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : ""}`}
                      variant={pkg.popular ? "default" : "outline"}
                      size="sm"
                      onClick={() => setLocation("/pricing")}
                    >
                      Start Production
                    </Button>
                    <ul className="space-y-1.5">
                      {pkg.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">Additional 30 minutes: +$30,000 (launch) / +$60,000 (full price). VFX Scene packages also available.</p>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Trusted by{" "}
              <span className="text-amber-400">Filmmakers &amp; Studios</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              From indie creators to production companies — Virelle Studios is changing how films get made.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="bg-card/50 border-border/50">
                <CardContent className="p-5">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-xs font-medium">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-card/30 to-background border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to Create Your{" "}
            <span className="text-amber-400">First Film?</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Generate a complete feature-length film or create impossible VFX scenes for your production. Bring your own API keys.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Creating Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} className="h-12 text-base px-8">
              <Building2 className="h-4 w-4 mr-2" />
              Enterprise Sales
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Product</h4>
              <ul className="space-y-2">
                <li><a href="#use-cases" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Use Cases</a></li>
                <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><button onClick={() => setLocation("/blog")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Use Cases</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">Full AI Films</span></li>
                <li><span className="text-xs text-muted-foreground">VFX Scene Studio</span></li>
                <li><span className="text-xs text-muted-foreground">Music Videos</span></li>
                <li><span className="text-xs text-muted-foreground">Commercials</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">About</span></li>
                <li><span className="text-xs text-muted-foreground">Contact</span></li>
                <li><button onClick={() => setLocation("/terms")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setLocation("/privacy")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setLocation("/acceptable-use")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Acceptable Use</button></li>
                <li><button onClick={() => setLocation("/ai-content-policy")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">AI Content Policy</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Connect</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">Twitter / X</span></li>
                <li><span className="text-xs text-muted-foreground">Discord</span></li>
                <li><span className="text-xs text-muted-foreground">YouTube</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border/40 gap-4">
            <div className="flex items-center gap-3">
              <img src="/vs-watermark.png" alt="Virelle Studios" className="w-7 h-7 rounded-lg" draggable={false} />
              <span className="text-sm font-semibold">Virelle Studios</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Virelle Studios. All rights reserved. Powered by{" "}
              <img src="/leego-logo.png" alt="Leego" className="inline h-4 w-4 align-middle" style={{ filter: "drop-shadow(0 0 4px #22c55e)" }} />{" "}
              Leego
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
