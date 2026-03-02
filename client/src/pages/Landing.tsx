import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Film, Zap, Layers, Users, Wand2, Music, Palette, Camera,
  Sparkles, ArrowRight, Star, CheckCircle2, Play, Shield,
  Globe, Clock, ChevronDown, Sun, Moon, BookOpen, CreditCard,
  MessageSquare, Clapperboard, Monitor, Scissors, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useRef } from "react";

/* ─── Feature data ─── */
const FEATURES = [
  { icon: Zap, title: "Quick Generate", desc: "Describe your plot, upload characters, and AI creates your entire film — scenes, images, music, and effects — in minutes." },
  { icon: Layers, title: "Scene-by-Scene", desc: "Full creative control. Craft each scene manually with AI-assisted dialogue, cinematography, and visual effects." },
  { icon: Users, title: "Character Library", desc: "Upload real photos or AI-generate cinematic character portraits. Build your cast with detailed profiles and backstories." },
  { icon: Camera, title: "AI Cinematography", desc: "Hollywood-grade shot composition, lighting, and color grading powered by techniques from master cinematographers." },
  { icon: Music, title: "Soundtrack & SFX", desc: "AI-composed soundtracks matched to your scene mood. Thousands of sound effects from explosions to ambient rain." },
  { icon: Wand2, title: "Visual Effects", desc: "Drag-and-drop VFX library — fire, rain, snow, lens flares, particle effects, and more. No compositing skills needed." },
  { icon: Palette, title: "Color Grading", desc: "Cinematic LUT presets inspired by iconic films. One-click looks from Blade Runner to Moonlight." },
  { icon: MessageSquare, title: "Director's Assistant", desc: "AI co-director that helps with script rewrites, shot suggestions, continuity checks, and creative decisions." },
  { icon: Scissors, title: "Script Writer", desc: "AI writes professional Hollywood-format screenplays with scene breakdowns, dialogue, and stage directions." },
  { icon: MapPin, title: "Location Scout", desc: "AI-generated location suggestions with reference images. Find the perfect setting for every scene." },
  { icon: Monitor, title: "Storyboard", desc: "Visual storyboards auto-generated from your script. See your film before you shoot it." },
  { icon: Clapperboard, title: "Movie Export", desc: "Export your finished film, individual scenes, or trailers to your movie library for playback and sharing." },
];

const TESTIMONIALS = [
  { name: "Marcus Rivera", role: "Indie Filmmaker", text: "I produced a 20-minute short film in a weekend. The AI cinematography is genuinely impressive — my film school professors thought I had a real DP.", stars: 5 },
  { name: "Aisha Patel", role: "Content Creator", text: "The Quick Generate feature is insane. I described a sci-fi concept and had a full film with scenes, music, and effects in under an hour.", stars: 5 },
  { name: "James Chen", role: "Film Student", text: "As a student, I can't afford crews or equipment. Virelle lets me bring my scripts to life with production quality I never thought possible.", stars: 5 },
  { name: "Sofia Andersson", role: "Advertising Director", text: "We use Virelle for rapid concept visualization. The Ad & Poster Maker alone has saved us thousands in pre-production costs.", stars: 5 },
  { name: "David Okonkwo", role: "YouTube Creator", text: "The BYOK system is brilliant. I plugged in my Runway API key and now I'm generating real video clips for each scene. Game changer.", stars: 5 },
  { name: "Elena Vasquez", role: "Screenwriter", text: "The Script Writer understands narrative structure better than most humans. It nails dialogue, pacing, and scene transitions.", stars: 4 },
];

const PRICING = [
  {
    tier: "Free", price: "$0", period: "forever", highlight: false,
    features: ["3 AI generations / month", "1 project", "5 scenes per project", "720p resolution", "Quick Generate", "Script Writer", "Character Library"],
  },
  {
    tier: "Pro", price: "$200", period: "/month", highlight: true,
    features: ["100 AI generations / month", "25 projects", "50 scenes per project", "1080p Full HD", "All 13 production tools", "Director's Assistant", "Trailer generation", "Ad & Poster Maker", "Collaboration (5 members)", "Priority support"],
  },
  {
    tier: "Industry", price: "$500", period: "/month", highlight: false,
    features: ["Unlimited generations", "Unlimited projects", "Unlimited scenes", "4K UHD + Ultra export", "Everything in Pro", "Unlimited collaboration", "Custom branding", "API access", "Dedicated account manager"],
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

/* ─── Landing Page ─── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="/apple-touch-icon.png" alt="Virelle Studios" className="w-9 h-9 rounded-lg" draggable={false} />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">Virelle Studios</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
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
              Get Started Free
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Film Production Studio
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Create Hollywood-Quality{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Movies with AI
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From script to screen in minutes. Generate cinematic films with AI-powered scenes, characters, soundtracks, and visual effects — no crew, no equipment, no limits.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Creating — It's Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              const el = document.getElementById("how-it-works");
              el?.scrollIntoView({ behavior: "smooth" });
            }} className="h-12 text-base px-8">
              <Play className="h-4 w-4 mr-2" />
              See How It Works
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card required. Free tier includes 3 AI generations per month.</p>
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

      {/* ─── Features Grid ─── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything You Need to Make{" "}
              <span className="text-amber-400">Films</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              A complete AI film production suite — from screenplay to final cut. Every tool a filmmaker needs, powered by cutting-edge AI.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
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
              From Idea to Film in{" "}
              <span className="text-amber-400">4 Steps</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              No film school required. Our AI handles the heavy lifting so you can focus on storytelling.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Describe Your Vision", desc: "Enter your movie concept, genre, characters, and duration. Or upload a full screenplay.", icon: MessageSquare },
              { step: "2", title: "AI Writes the Script", desc: "GPT-4 generates a professional Hollywood-format screenplay with scene breakdowns and dialogue.", icon: Scissors },
              { step: "3", title: "Scenes Come to Life", desc: "Each scene gets cinematic images, video clips, soundtracks, and visual effects — all AI-generated.", icon: Camera },
              { step: "4", title: "Export Your Film", desc: "Combine everything into your finished movie. Download, share, or publish directly from Virelle.", icon: Clapperboard },
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
                <span className="text-purple-400">Your Control.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Plug in your own video generation API keys from Runway ML, fal.ai, OpenAI Sora, Luma AI, Replicate, or Hugging Face. Generate real video clips for every scene — at your own pace and budget.
              </p>
              <div className="space-y-3">
                {[
                  "Runway ML — Best quality (Gen-4 Turbo)",
                  "fal.ai — Best value (HunyuanVideo, Veo 3)",
                  "Pollinations.ai — Completely free tier",
                  "OpenAI Sora, Luma AI, Replicate, Hugging Face",
                ].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-muted-foreground">{provider}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center text-lg">🎬</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Runway ML</p>
                  <p className="text-[10px] text-muted-foreground">Gen-4 Turbo · $0.05/sec</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="h-8 w-8 rounded bg-purple-500/10 flex items-center justify-center text-lg">⚡</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">fal.ai</p>
                  <p className="text-[10px] text-muted-foreground">HunyuanVideo · $0.40/clip</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="h-8 w-8 rounded bg-green-500/10 flex items-center justify-center text-lg">🔑</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Pollinations.ai</p>
                  <p className="text-[10px] text-muted-foreground">Free tier · No key needed</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-2">Keys are encrypted and never exposed to the frontend.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, Transparent{" "}
              <span className="text-amber-400">Pricing</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Start free. Upgrade when you're ready. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <Card key={plan.tier} className={`relative overflow-hidden ${plan.highlight ? "border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" : "bg-card/50 border-border/50"}`}>
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                <CardContent className="p-6">
                  {plan.highlight && (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded mb-3">Most Popular</span>
                  )}
                  <h3 className="text-lg font-bold">{plan.tier}</h3>
                  <div className="mt-2 mb-5">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <Button
                    className={`w-full mb-5 ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : ""}`}
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() => setLocation(plan.tier === "Free" ? "/register" : "/pricing")}
                  >
                    {plan.tier === "Free" ? "Get Started" : "Subscribe"}
                  </Button>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
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
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Loved by{" "}
              <span className="text-amber-400">Filmmakers</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Join thousands of creators who are making films with Virelle Studios.
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
            Join thousands of filmmakers using Virelle Studios to produce Hollywood-quality content with AI. Start for free — no credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Creating — It's Free
              <ArrowRight className="h-4 w-4 ml-2" />
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
                <li><a href="#features" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><button onClick={() => setLocation("/blog")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Blog</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tools</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">Script Writer</span></li>
                <li><span className="text-xs text-muted-foreground">Storyboard</span></li>
                <li><span className="text-xs text-muted-foreground">Color Grading</span></li>
                <li><span className="text-xs text-muted-foreground">Visual Effects</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-muted-foreground">About</span></li>
                <li><span className="text-xs text-muted-foreground">Contact</span></li>
                <li><span className="text-xs text-muted-foreground">Privacy Policy</span></li>
                <li><span className="text-xs text-muted-foreground">Terms of Service</span></li>
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
              <img src="/apple-touch-icon.png" alt="Virelle Studios" className="w-7 h-7 rounded-lg" draggable={false} />
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
