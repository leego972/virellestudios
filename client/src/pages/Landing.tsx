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
  { icon: Zap, title: "Full Film Generation", desc: "Describe your concept and AI generates a complete 90-minute film — screenplay, scenes, dialogue, soundtrack, and final cut." },
  { icon: Layers, title: "Clip Chaining", desc: "Each scene is built from 4-8 AI video clips stitched seamlessly. 30-60 seconds per scene, 60-90 scenes per film." },
  { icon: Mic, title: "AI Voice Acting", desc: "35 emotion states with per-emotion ElevenLabs tuning — surprised, aggressive, cheerful, grumpy, exhausted, and more. AI auto-detects the right emotion from screenplay context." },
  { icon: Music, title: "AI Film Score", desc: "Original soundtracks generated for every scene. Suno AI, MusicGen, and more — matched to mood and genre." },
  { icon: Eye, title: "Hyper-Realistic Characters", desc: "Characters are indistinguishable from real people. Subsurface skin scattering, iris fiber detail, authentic facial asymmetry, and micro-expressions." },
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
  { icon: Music, title: "Film Post-Production", desc: "ADR, Foley, Score Cues, and a three-bus audio mix (Dialogue / Music / Effects) — professional film post workflow." },
  { icon: Globe, title: "Subtitles in 130+ Languages", desc: "Context-aware AI translation using screenplay context — character names, genre, tone — for professional, natural-sounding output." },
  { icon: Mic, title: "Global Funding Directory", desc: "94 funders across 73 countries. Search by country, apply with a Hollywood-standard 13-section application package." },
];

const TESTIMONIALS = [
  { name: "Marcus Rivera", role: "Indie Filmmaker", text: "I produced a full short film in a weekend. The clip chaining is incredible — each scene flows naturally into the next. My film school professors thought I had a real crew.", stars: 5 },
  { name: "Sarah Chen", role: "VFX Supervisor, Meridian Films", text: "We used Virelle for 12 impossible scenes in our latest feature — alien landscapes, zero-gravity sequences, a 1920s ballroom. Saved us $800K in VFX costs.", stars: 5 },
  { name: "Aisha Patel", role: "Content Creator", text: "The Full Film Generation is insane. I described a sci-fi concept and had a complete film with voice acting and soundtrack in under 4 hours.", stars: 5 },
  { name: "James Okonkwo", role: "Production Designer", text: "We shoot live-action for the human scenes and use Virelle for everything else. The art direction control is precise enough for professional production.", stars: 5 },
  { name: "David Kim", role: "YouTube Creator (2.4M subs)", text: "The BYOK system is brilliant. I plugged in my Runway key and now I'm generating real cinematic video for every scene. My channel has exploded.", stars: 5 },
  { name: "Elena Vasquez", role: "Screenwriter / Director", text: "The Director's Assistant understands narrative structure better than most humans. It nails dialogue, pacing, and emotional beats.", stars: 4 },
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
  { name: "Pika 2.2", category: "Video", badge: "Coming", color: "orange", desc: "Next-generation video with physics simulation" },
  { name: "Luma Ray 3", category: "Video", badge: "Coming", color: "indigo", desc: "Photorealistic world generation" },
];

/* Competitor comparison data */
const COMPETITOR_TABLE = [
  { feature: "Full 90-min film generation", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "AI screenplay writer", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "AI voice acting (35 emotions)", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "AI film score generation", virelle: true, runway: false, artlist: true, kling: false },
  { feature: "Scene-to-scene continuity", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "Character DNA Lock", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "BYOK (no markup on API costs)", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "Director's AI co-director", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "Film post-production (ADR/Foley)", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "NLE / DaVinci Resolve export", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "Global funding directory", virelle: true, runway: false, artlist: false, kling: false },
  { feature: "100% commercial ownership", virelle: true, runway: true, artlist: true, kling: true },
];

/* Animated counter hook */
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
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  );
}

/* Use Case Toggle */
function UseCaseToggle({ active, onChange }: { active: "film" | "vfx"; onChange: (v: "film" | "vfx") => void }) {
  return (
    <div className="inline-flex items-center bg-card/60 border border-border/50 rounded-full p-1">
      <button
        onClick={() => onChange("film")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
          active === "film" ? "bg-amber-500 text-black shadow-lg" : "text-foreground/80 hover:text-foreground"
        }`}
      >
        <Film className="h-4 w-4 inline mr-2" />
        Full AI Film
      </button>
      <button
        onClick={() => onChange("vfx")}
        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
          active === "vfx" ? "bg-purple-500 text-white shadow-lg" : "text-foreground/80 hover:text-foreground"
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
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [promptValue, setPromptValue] = useState("");
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [modelCarouselIndex, setModelCarouselIndex] = useState(0);
  const [leegoEnlarged, setLeegoEnlarged] = useState(false);

  const handleLeegoClick = () => {
    if (leegoEnlarged) return;
    setLeegoEnlarged(true);
    setTimeout(() => setLeegoEnlarged(false), 3000);
  };

  useEffect(() => {
    const handleScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => { document.removeEventListener("mousedown", handleOutside); document.removeEventListener("touchstart", handleOutside); };
  }, [langOpen]);

  // Auto-advance model carousel
  useEffect(() => {
    const t = setInterval(() => setModelCarouselIndex(i => (i + 1) % AI_MODELS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem("virelle_offer_dismissed") === "1"; } catch { return false; }
  });
  const { data: spotsData } = trpc.subscription.foundingSpots.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnMount: true,
  });
  const spotsRemaining = spotsData?.spotsRemaining ?? 19;
  const displayCount = spotsData?.displayCount ?? 31;
  const offerFull = spotsData?.isFull ?? false;

  const handlePromptSubmit = useCallback(() => {
    if (promptValue.trim()) {
      setLocation(`/register?prompt=${encodeURIComponent(promptValue.trim())}`);
    } else {
      setLocation("/register");
    }
  }, [promptValue, setLocation]);

  const MEGA_MENUS = {
    Product: [
      { label: "Full Film Generation", desc: "90-minute AI films from a single concept", icon: Film, path: "/how-it-works" },
      { label: "VFX Scene Studio", desc: "Impossible scenes for live-action productions", icon: Sparkles, path: "/solutions#vfx-production" },
      { label: "AI Script Writer", desc: "Hollywood-format screenplays", icon: Scissors, path: "/how-it-works" },
      { label: "Director's Assistant", desc: "AI co-director for every decision", icon: MessageSquare, path: "/how-it-works" },
      { label: "Film Post-Production", desc: "ADR, Foley, Score, 3-bus mix", icon: Headphones, path: "/how-it-works" },
      { label: "Global Funding Directory", desc: "94 funders, 73 countries", icon: Globe, path: "/solutions" },
    ],
    Solutions: [
      { label: "Independent Filmmakers", desc: "Solo creators and indie directors", icon: Film, path: "/solutions#indie-filmmakers" },
      { label: "VFX & Production", desc: "Production companies and VFX studios", icon: Sparkles, path: "/solutions#vfx-production" },
      { label: "Music Artists", desc: "Music videos and visual albums", icon: Music, path: "/solutions#music-artists" },
      { label: "Brands & Agencies", desc: "Commercial and advertising production", icon: Building2, path: "/solutions#brands-agencies" },
      { label: "Studios & Enterprise", desc: "High-volume production pipelines", icon: Award, path: "/solutions#enterprise" },
    ],
    Resources: [
      { label: "How It Works", desc: "Step-by-step walkthrough", icon: BookOpen, path: "/how-it-works" },
      { label: "Showcase", desc: "Films made with Virelle Studios", icon: Film, path: "/showcase" },
      { label: "Blog", desc: "AI filmmaking insights and tutorials", icon: FileText, path: "/blog" },
      { label: "FAQ", desc: "Answers to common questions", icon: MessageSquare, path: "/faq" },
      { label: "Download App", desc: "iOS & Android mobile app", icon: Download, path: "/download" },
    ],
  };

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden relative"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Repeating gold watermark */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png')`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          backgroundAttachment: "fixed",
          mixBlendMode: "screen",
          opacity: 0.45,
          zIndex: 0,
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0" style={{ background: "rgba(0,0,0,0.35)", zIndex: 0 }} aria-hidden />

      <div className="relative" style={{ zIndex: 1 }}>

        {/* ─── Founding Offer Banner ─── */}
        {!bannerDismissed && !offerFull && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black py-2.5 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-black uppercase tracking-widest shrink-0 hidden sm:inline">🎬 FOUNDING OFFER</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold">HALF PRICE on your first year's membership</span>
                  <span className="text-xs font-medium opacity-80">— Limited to first 150 founding directors.</span>
                  <span className="bg-black/20 text-black text-xs font-black px-2 py-0.5 rounded-full">{spotsRemaining} of 150 spots left</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setLocation("/register")} className="bg-black text-amber-400 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors whitespace-nowrap">
                  Claim Your Spot →
                </button>
                <button onClick={() => { setBannerDismissed(true); try { localStorage.setItem("virelle_offer_dismissed", "1"); } catch {} }} className="text-black/60 hover:text-black transition-colors text-lg leading-none font-bold" aria-label="Dismiss offer">×</button>
              </div>
            </div>
            <div className="max-w-7xl mx-auto mt-1.5">
              <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-black/50 rounded-full transition-all duration-1000" style={{ width: `${(displayCount / 150) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-medium opacity-70 mt-0.5">
                <span>{displayCount} directors have already joined</span>
                <span>Only {spotsRemaining} spots remaining</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Mega-Menu Navbar ─── */}
        <nav
          className={`fixed left-0 right-0 z-50 transition-all duration-300 ${!bannerDismissed && !offerFull ? "top-[72px]" : "top-0"} ${
            navScrolled ? "bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-lg" : "bg-transparent"
          }`}
          onMouseLeave={() => setMegaMenuOpen(null)}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="w-10 h-10 rounded-lg" draggable={false} />
              <span className="text-lg font-bold tracking-tight hidden sm:inline">Virelle Studios</span>
            </div>

            {/* Desktop mega-menu nav */}
            <div className="hidden lg:flex items-center gap-1 text-sm">
              {Object.keys(MEGA_MENUS).map(key => (
                <div key={key} className="relative" onMouseEnter={() => setMegaMenuOpen(key)}>
                  <button className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${megaMenuOpen === key ? "bg-accent text-foreground" : "text-foreground/70 hover:text-foreground hover:bg-accent/50"}`}>
                    {key}
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${megaMenuOpen === key ? "rotate-180" : ""}`} />
                  </button>
                </div>
              ))}
              <a href="#pricing" className="px-3 py-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-accent/50 transition-colors">Pricing</a>
              <button onClick={() => setLocation("/showcase")} className="px-3 py-2 rounded-lg font-semibold transition-colors" style={{ color: '#d4af37' }}>Showcase</button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-9 w-9">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <div className="relative" ref={langRef}>
                <Button variant="ghost" size="sm" className="text-sm gap-1.5" onClick={() => setLangOpen(o => !o)}>
                  <Globe className="h-4 w-4" />
                  <span className="hidden md:inline">Language</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
                </Button>
                {langOpen && (
                  <div className="fixed w-52 bg-popover border border-border rounded-xl shadow-2xl z-[200]" style={{ top: '72px', right: '8px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
                    {[
                      { code: "ar", name: "Arabic (العربية)", flag: "🇸🇦" },
                      { code: "zh", name: "Chinese (中文)", flag: "🇨🇳" },
                      { code: "de", name: "Deutsch", flag: "🇩🇪" },
                      { code: "en", name: "English", flag: "🇺🇸" },
                      { code: "es", name: "Español", flag: "🇪🇸" },
                      { code: "fr", name: "Français", flag: "🇫🇷" },
                      { code: "he", name: "Hebrew (עברית)", flag: "🇮🇱" },
                      { code: "hi", name: "Hindi (हिन्दी)", flag: "🇮🇳" },
                      { code: "ja", name: "Japanese (日本語)", flag: "🇯🇵" },
                      { code: "ko", name: "Korean (한국어)", flag: "🇰🇷" },
                      { code: "pt", name: "Português", flag: "🇧🇷" },
                      { code: "ru", name: "Russian (Русский)", flag: "🇷🇺" },
                    ].map(lang => (
                      <button key={lang.code} onClick={() => { document.documentElement.lang = lang.code; document.documentElement.dir = ["he","ar"].includes(lang.code) ? "rtl" : "ltr"; localStorage.setItem("virelle_ui_lang", lang.code); setLangOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
                        <span>{lang.flag}</span><span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} className="text-sm hidden sm:inline-flex">Sign In</Button>
              <Button size="sm" onClick={() => setLocation("/pricing")} className="text-sm bg-amber-500 hover:bg-amber-600 text-black font-semibold hidden sm:inline-flex px-4">
                Start Free
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" onClick={() => setMobileMenuOpen(o => !o)}>
                {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mega-menu dropdown */}
          {megaMenuOpen && (
            <div className="hidden lg:block absolute left-0 right-0 bg-background/98 backdrop-blur-xl border-b border-border/40 shadow-2xl">
              <div className="max-w-7xl mx-auto px-8 py-6">
                <div className="grid grid-cols-3 gap-4">
                  {(MEGA_MENUS[megaMenuOpen as keyof typeof MEGA_MENUS] || []).map(item => (
                    <button key={item.label} onClick={() => { setMegaMenuOpen(null); setLocation(item.path); }} className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors text-left group">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                        <item.icon className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-foreground/60 mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile drawer */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
              <div className="px-4 py-4 space-y-1">
                {[
                  { label: "How It Works", path: "/how-it-works" },
                  { label: "Features", path: "#features" },
                  { label: "Solutions", path: "/solutions" },
                  { label: "Pricing", path: "#pricing" },
                  { label: "Showcase", path: "/showcase", gold: true },
                  { label: "FAQ", path: "/faq" },
                  { label: "Blog", path: "/blog" },
                  { label: "About", path: "/about" },
                  { label: "Contact", path: "/contact" },
                  { label: "Download App", path: "/download" },
                ].map(item => (
                  <button key={item.path} onClick={() => { setMobileMenuOpen(false); if (item.path.startsWith("#")) { document.querySelector(item.path)?.scrollIntoView({ behavior: "smooth" }); } else { setLocation(item.path); } }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent ${item.gold ? "text-amber-400" : "text-foreground/80 hover:text-foreground"}`}>
                    {item.label}
                  </button>
                ))}
                <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
                  <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); setLocation("/login"); }}>Sign In</Button>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => { setMobileMenuOpen(false); setLocation("/pricing"); }}>Start Free</Button>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ─── Cinematic Hero ─── */}
        <section
          className={`relative overflow-hidden ${!bannerDismissed && !offerFull ? "pt-52 pb-24" : "pt-36 pb-24"} px-4 sm:px-6 lg:px-8`}
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(10,5,20,0.98) 40%, rgba(5,0,15,1) 100%)",
          }}
        >
          {/* Animated particle background */}
          <CinematicBackground />

          {/* Cinematic gradient orbs */}
          <div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-amber-500/8 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-900/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Film grain overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "128px" }} />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Category pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              The World's First End-to-End AI Film Studio
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
              <span className="block text-white">Your Concept.</span>
              <span className="block" style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 40%, #d4af37 70%, #b8960c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                A Complete Film.
              </span>
              <span className="block text-white/80 text-3xl sm:text-4xl lg:text-5xl font-bold mt-2">In Hours — Not Years.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed mb-10">
              Screenplay. Storyboard. 60–90 cinematic scenes with clip chaining. AI voice acting in 35 emotions. Original film score. Post-production. Final cut. Export. You own it commercially.{" "}
              <span className="text-amber-400 font-semibold">No crew. No studio. No markup on AI costs.</span>
            </p>

            {/* Live prompt input bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative flex items-center bg-card/80 border border-amber-500/30 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl hover:border-amber-500/50 transition-colors focus-within:border-amber-500/60">
                <div className="absolute left-4 text-amber-400/60">
                  <Film className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={promptValue}
                  onChange={e => setPromptValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePromptSubmit()}
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
              <p className="text-xs text-foreground/40 mt-2">No credit card required to explore. Start generating immediately.</p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
              <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-13 text-base gap-2 shadow-lg shadow-amber-500/20">
                Start Your First Film
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/showcase")} className="h-13 text-base px-8 gap-2 border-white/20 hover:bg-white/5">
                <Play className="h-4 w-4" />
                Watch Films
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setLocation("/contact")} className="h-13 text-base px-8 gap-2 text-foreground/60 hover:text-foreground">
                <Building2 className="h-4 w-4" />
                Talk to Sales
              </Button>
            </div>

            {/* Trust micro-copy */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/40 mb-16">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> 100% commercial ownership</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> No watermarks on exports</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> BYOK — zero markup on AI costs</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> Cancel anytime</span>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {[
                { value: "100's", label: "Films Created", color: "text-amber-400" },
                { value: "100+", label: "Active Filmmakers", color: "text-green-400" },
                { value: "99.9%", label: "Platform Uptime", color: "text-blue-400" },
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

        {/* ─── AI Models Trust Bar ─── */}
        <section className="py-8 px-4 border-y border-border/30 bg-card/20 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-6">
              Powered by the world's most advanced AI models
            </p>
            <div className="relative">
              {/* Scrolling model carousel */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                {[...AI_MODELS, ...AI_MODELS].map((model, i) => (
                  <div key={i} className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all ${
                    model.badge === "Live"
                      ? "bg-card/60 border-border/40 hover:border-amber-500/30"
                      : "bg-card/30 border-border/20 opacity-60"
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${model.badge === "Live" ? "bg-green-400 animate-pulse" : "bg-foreground/20"}`} />
                    <span className="text-xs font-semibold text-foreground/80 whitespace-nowrap">{model.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                      model.badge === "Live" ? "bg-green-500/15 text-green-400" : "bg-foreground/10 text-foreground/40"
                    }`}>{model.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <ZapIcon className="h-3.5 w-3.5" />
                How It Works
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Concept to Complete Film —{" "}
                <span className="text-amber-400">4 Steps</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: "01", time: "5 min", title: "Write Your Concept", desc: "Describe your film in plain language. Genre, tone, characters, story arc.", color: "amber" },
                { step: "02", time: "10 min", title: "AI Writes the Screenplay", desc: "Full Hollywood-format script with scene breakdowns, dialogue, and stage directions.", color: "purple" },
                { step: "03", time: "3–8 hrs", title: "Scenes Generate", desc: "60–90 scenes rendered with clip chaining, voice acting, and an original score.", color: "blue" },
                { step: "04", time: "Instant", title: "Export Final Cut", desc: "Download your complete film as MP4 or ProRes. 100% commercially yours.", color: "green" },
              ].map((s, i) => (
                <div key={s.step} className="relative">
                  {i < 3 && <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border/60 to-transparent z-0" />}
                  <div className="relative z-10 text-center">
                    <div className={`w-16 h-16 rounded-2xl bg-${s.color}-500/10 border border-${s.color}-500/20 flex items-center justify-center mx-auto mb-4`}>
                      <span className={`text-${s.color}-400 font-black text-lg`}>{s.step}</span>
                    </div>
                    <div className={`inline-block px-2.5 py-1 rounded-full bg-${s.color}-500/10 text-${s.color}-400 text-[11px] font-bold mb-3 uppercase tracking-wider`}>{s.time}</div>
                    <p className="text-sm font-bold mb-2">{s.title}</p>
                    <p className="text-xs text-foreground/60 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Two Use Cases ─── */}
        <section id="use-cases" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Two Ways to Use{" "}
                <span className="text-amber-400">Virelle Studios</span>
              </h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">
                Whether you're generating an entire film from scratch or creating impossible scenes for your live-action production — Virelle has you covered.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card/50 border-border/50 hover:border-amber-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5 group-hover:bg-amber-500/20 transition-colors">
                    <Film className="h-7 w-7 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Full AI Film Generation</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-5">
                    Describe your movie concept and Virelle generates the entire film — screenplay, 60-90 cinematic scenes with clip chaining, AI voice-acted dialogue, original soundtrack, character consistency, and scene-to-scene continuity. Export as a complete feature-length film.
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {["Up to 90-minute feature films", "4-8 AI video clips per scene, stitched seamlessly", "AI voice acting for all dialogue with 35 emotions", "AI-generated film score matched to every scene", "Character consistency across all scenes via DNA Lock"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-amber-400">Perfect for: Indie filmmakers, content creators, film students, YouTube channels</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 hover:border-purple-500/40 transition-all duration-300 group overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-purple-400 to-violet-500" />
                <CardContent className="p-8">
                  <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center mb-5 group-hover:bg-purple-500/20 transition-colors">
                    <Sparkles className="h-7 w-7 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">VFX Scene Studio</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-5">
                    Shooting a live-action film with a real cast? Use Virelle to generate the scenes that would be too expensive or physically impossible to shoot — alien worlds, historical recreations, space battles, underwater sequences, natural disasters. Export individual scenes to composite into your production.
                  </p>
                  <div className="space-y-2.5 mb-6">
                    {["Generate individual VFX scenes at production quality", "Match resolution, frame rate, and color grade to your footage", "Upload cast photos for character-matched AI scenes", "Precise art direction — lighting, lens, mood, palette", "Export scenes for compositing into your live-action edit"].map(f => (
                      <div key={f} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-purple-400">Perfect for: Production companies, VFX studios, commercial directors, music video producers</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ─── Features (Toggled by Use Case) ─── */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {useCase === "film" ? (<>Full Film <span className="text-amber-400">Pipeline</span></>) : (<>VFX Scene <span className="text-purple-400">Studio</span></>)}
              </h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto mb-8">
                {useCase === "film" ? "Every capability needed to generate a complete feature-length film from a single concept." : "Professional-grade tools for generating impossible scenes that integrate into your live-action production."}
              </p>
              <UseCaseToggle active={useCase} onChange={setUseCase} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {(useCase === "film" ? FULL_FILM_FEATURES : VFX_FEATURES).map(f => (
                <Card key={f.title} className={`bg-card/50 border-border/50 transition-all duration-300 group ${useCase === "film" ? "hover:border-amber-500/30" : "hover:border-purple-500/30"}`}>
                  <CardContent className="p-6">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 transition-colors ${useCase === "film" ? "bg-amber-500/10 group-hover:bg-amber-500/20" : "bg-purple-500/10 group-hover:bg-purple-500/20"}`}>
                      <f.icon className={`h-5 w-5 ${useCase === "film" ? "text-amber-400" : "text-purple-400"}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                    <p className="text-xs text-foreground/70 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Complete Production Toolkit ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Complete Production{" "}
                <span className="text-amber-400">Toolkit</span>
              </h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">Every tool a filmmaker needs — from screenplay to final cut. All powered by AI.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ALL_TOOLS.map(f => (
                <Card key={f.title} className="bg-card/50 border-border/50 hover:border-amber-500/30 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                      <f.icon className="h-5 w-5 text-amber-400" />
                    </div>
                    <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                    <p className="text-xs text-foreground/70 leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BYOK Section ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold mb-5">
                  <Lock className="h-3.5 w-3.5" />
                  Bring Your Own Keys
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  Zero Markup on{" "}
                  <span className="text-green-400">AI Generation Costs</span>
                </h2>
                <p className="text-foreground/70 leading-relaxed mb-6">
                  Every other platform marks up the AI generation costs by 3–10x. Virelle is different. Connect your own API keys for Runway, ElevenLabs, Suno, Sora, and fal.ai — and pay the providers directly at their published rates. Virelle takes zero cut of your generation costs.
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Runway Gen-4.5", note: "Pay Runway directly — no markup" },
                    { label: "ElevenLabs v3", note: "Your voice credits, your account" },
                    { label: "Suno AI v4", note: "Music generation at Suno's rates" },
                    { label: "OpenAI Sora 2", note: "Direct API billing to your account" },
                    { label: "fal.ai (Flux, Veo 3)", note: "Pay-per-use at fal.ai prices" },
                  ].map(p => (
                    <div key={p.label} className="flex items-center gap-3 bg-card/40 border border-green-500/10 rounded-xl px-4 py-3">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">{p.label}</p>
                        <p className="text-[10px] text-foreground/60">{p.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-foreground/40 mt-4">Keys are encrypted with AES-256 and never exposed to the frontend.</p>
              </div>
              <div className="bg-card/50 border border-green-500/20 rounded-2xl p-8">
                <h3 className="font-bold text-lg mb-6 text-center">Real Cost Comparison</h3>
                <div className="space-y-4">
                  {[
                    { label: "10-second Runway clip", virelle: "$0.10", competitor: "$0.50–$1.50", saving: "85% less" },
                    { label: "60-second ElevenLabs voice", virelle: "$0.02", competitor: "$0.10–$0.30", saving: "90% less" },
                    { label: "Full film score (90 min)", virelle: "$8–24", competitor: "$200–$800", saving: "97% less" },
                    { label: "Complete 90-min film", virelle: "~$150–400", competitor: "$500K–$2M+", saving: "99.98% less" },
                  ].map(r => (
                    <div key={r.label} className="grid grid-cols-3 gap-2 text-xs">
                      <p className="text-foreground/70 col-span-1 leading-tight">{r.label}</p>
                      <div className="text-center">
                        <p className="font-bold text-green-400">{r.virelle}</p>
                        <p className="text-[9px] text-foreground/40">Virelle (BYOK)</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-red-400">{r.competitor}</p>
                        <p className="text-[9px] text-foreground/40">Traditional</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Competitor Comparison Table ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <BarChart3 className="h-3.5 w-3.5" />
                Platform Comparison
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                Why Virelle is in a{" "}
                <span className="text-amber-400">Category of Its Own</span>
              </h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">
                Runway, Kling, and Artlist are tools. Virelle Studios is a complete production infrastructure.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-5 bg-card/60 border-b border-border/50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/60 col-span-2">Capability</p>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400 text-center">Virelle</p>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/40 text-center">Runway</p>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/40 text-center">Kling / Artlist</p>
              </div>
              {COMPETITOR_TABLE.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-5 px-4 py-3 border-b border-border/20 items-center ${i % 2 === 1 ? "bg-card/20" : ""}`}>
                  <p className="text-xs text-foreground/80 col-span-2">{row.feature}</p>
                  <div className="flex justify-center">{row.virelle ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XIcon className="h-4 w-4 text-red-400/50" />}</div>
                  <div className="flex justify-center">{row.runway ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XIcon className="h-4 w-4 text-red-400/50" />}</div>
                  <div className="flex justify-center">{row.kling ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XIcon className="h-4 w-4 text-red-400/50" />}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Social Proof + Cost Savings ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-8 mb-10">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-3xl">🌍</div>
              <div className="flex-1 text-center md:text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Already Live &amp; Growing</p>
                <h2 className="text-2xl font-bold text-foreground mb-2">100+ Studios &amp; Artists Are Already Making the Future</h2>
                <p className="text-sm text-foreground/70 leading-relaxed max-w-2xl">
                  From solo filmmakers telling deeply personal stories to commercial production companies building content at scale — creators across the globe are already producing on Virelle Studios. This is not a beta. This is the industry in motion.
                </p>
              </div>
              <div className="flex md:flex-col gap-4 flex-shrink-0">
                <div className="text-center"><p className="text-3xl font-black text-indigo-400">100+</p><p className="text-[10px] uppercase tracking-widest text-foreground/40">Studios</p></div>
                <div className="text-center"><p className="text-3xl font-black text-green-400">$0</p><p className="text-[10px] uppercase tracking-widest text-foreground/40">Logistics</p></div>
              </div>
            </div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold mb-4">
                <CheckCircle2 className="h-3.5 w-3.5" />
                The Real Numbers
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-3">What You <span className="text-green-400">Stop Paying For</span></h2>
              <p className="text-foreground/70 max-w-2xl mx-auto text-sm leading-relaxed">Every line item below is a real cost that traditional productions pay — and that Virelle Studios eliminates entirely.</p>
            </div>
            <div className="rounded-2xl border border-border/50 overflow-hidden mb-4">
              <div className="grid grid-cols-3 bg-green-950/30 border-b border-border/50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-green-400">Production Cost</p>
                <p className="text-xs font-bold uppercase tracking-widest text-red-400 text-right">Traditional</p>
                <p className="text-xs font-bold uppercase tracking-widest text-green-400 text-right">Virelle</p>
              </div>
              {[
                { icon: "📍", label: "Location rental & permits", note: "5–15% of BTL budget. Street permits, site fees, police officers.", trad: "$15k–$80k+" },
                { icon: "🏨", label: "Hotels & crew accommodation", note: "60-person crew × 40 days at $150–$300/night per person.", trad: "$360k–$720k" },
                { icon: "🚐", label: "Vehicles, trucks & transport", note: "Camera trucks, grip trucks, crew vans, fuel, Teamster drivers.", trad: "$25k–$120k" },
                { icon: "👗", label: "Costumes, wardrobe & continuity", note: "Rental, dry cleaning, multiples of hero costumes, alterations.", trad: "$8k–$60k" },
                { icon: "💄", label: "Hair, make-up & prosthetics", note: "Special effects makeup alone can reach $50k–$500k per film.", trad: "$5k–$500k" },
                { icon: "🍽️", label: "Catering & craft services", note: "$35–$75/person per meal × 60 crew × 40 days.", trad: "$84k–$180k" },
                { icon: "🌧️", label: "Weather delays & reshoot days", note: "A single lost shoot day: $50k–$250k+ in crew & location fees.", trad: "$50k–$250k" },
                { icon: "🎵", label: "Music licensing", note: "Sync license per track: $5k–$50k. Score composition: $20k–$200k+.", trad: "$25k–$250k" },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 px-4 py-3 border-b border-border/30 items-start ${i % 2 === 1 ? "bg-card/30" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.icon} {row.label}</p>
                    <p className="text-[11px] text-foreground/40 leading-relaxed mt-0.5">{row.note}</p>
                  </div>
                  <p className="text-sm font-semibold text-red-400 text-right pt-0.5">{row.trad}</p>
                  <p className="text-sm font-bold text-green-400 text-right pt-0.5">$0</p>
                </div>
              ))}
              <div className="grid grid-cols-3 bg-green-950/30 px-4 py-4">
                <p className="text-sm font-bold text-foreground">Conservative total (indie feature)</p>
                <p className="text-base font-bold text-red-400 text-right">$571k–$2.1M+</p>
                <p className="text-lg font-black text-green-400 text-right">$0</p>
              </div>
            </div>
            <p className="text-[11px] text-foreground/30 text-center leading-relaxed">Based on published industry-standard rates (IATSE, SAG-AFTRA, Saturation.io 2026 Film Budget Breakdown). Results vary by production scale and geography.</p>
          </div>
        </section>

        {/* ─── Hyper-Realism Showcase ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <Eye className="h-3.5 w-3.5" />
                Photorealism Engine
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Characters <span className="text-amber-400">Indistinguishable</span> from Real People</h2>
              <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed">Virelle's photorealism engine generates characters that cannot be told apart from real human beings on film. Every frame is engineered at the level of a $200M Hollywood production.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                { icon: Eye, title: "Hyper-Realistic Skin", desc: "Subsurface scattering shows blood flow beneath translucent skin layers. Visible pores, micro-wrinkles, fine peach fuzz, natural blemishes, and authentic facial asymmetry." },
                { icon: Camera, title: "Soulful, Living Eyes", desc: "Iris fibers rendered in full detail. Natural corneal reflections, subtle moisture in the waterline, and faint sclera veins. Eyes that convey genuine emotion and thought." },
                { icon: Film, title: "Hollywood Cinematography", desc: "Every scene generated as if captured on an ARRI ALEXA 65 with Zeiss Supreme Prime Radiance lenses. Kodak Vision3 500T film stock color science, anamorphic bokeh." },
              ].map(f => (
                <div key={f.title} className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4"><f.icon className="h-5 w-5 text-amber-400" /></div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Micro-Expression Engine</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">Characters don't just look real — they feel real. The prompt engine injects authentic micro-expression directives so every face conveys genuine emotion: the slight tension around the eyes before a lie, the involuntary lip compression of grief, the asymmetric smile of real joy.</p>
              </div>
              <div className="bg-card/50 border border-border/50 rounded-xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-amber-400" /> Character DNA Lock</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">A character's face, bone structure, skin tone, and physical attributes are locked via a DNA prompt anchor injected into every scene. Your lead actor looks identical in scene 1 and scene 87 — the only thing that changes is their wardrobe and emotional state.</p>
              </div>
            </div>
            <div className="text-center mt-10">
              <div className="relative inline-block">
                <button onClick={() => setLocation("/showcase")} className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-black text-lg transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)" }}>
                  <Film className="w-5 h-5" />
                  View Our Films
                </button>
                <span className="absolute -top-3 -right-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-black" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)", boxShadow: "0 0 8px rgba(251,191,36,0.7)" }}>Coming Soon</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Responsible AI ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold mb-4">
                <ShieldCheck className="h-3.5 w-3.5" />
                Responsible AI Filmmaking
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-4">Built for <span className="text-green-400">Responsible</span> Creators</h2>
              <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed">Virelle Studios is the only AI film platform with built-in child protection, content moderation, and industry-leading safety standards.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Shield, title: "Minor Protection", desc: "Zero-tolerance policy for any content involving minors. AI-powered detection blocks generation before it starts.", color: "green" },
                { icon: AlertTriangle, title: "Content Moderation", desc: "Multi-layer content screening on every generation. Harmful, illegal, and non-consensual content is blocked at the prompt level.", color: "amber" },
                { icon: Lock, title: "IP Protection", desc: "Built-in safeguards against generating content that mimics real people without consent. Deepfake detection and blocking.", color: "blue" },
                { icon: ShieldCheck, title: "Watermarking", desc: "Optional invisible AI watermarking on all generated content for provenance tracking and responsible disclosure.", color: "purple" },
                { icon: Globe, title: "Global Compliance", desc: "GDPR, CCPA, and Australian Privacy Act compliant. Data residency options for enterprise customers.", color: "indigo" },
                { icon: Users, title: "Human Oversight", desc: "Every generation is logged. Enterprise customers have access to full audit trails for compliance and content governance.", color: "rose" },
              ].map(f => (
                <div key={f.title} className={`bg-card/50 border border-${f.color}-500/20 rounded-xl p-6`}>
                  <div className={`w-10 h-10 rounded-lg bg-${f.color}-500/10 flex items-center justify-center mb-4`}><f.icon className={`h-5 w-5 text-${f.color}-400`} /></div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Enterprise Section ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-card/30 to-background border-y border-border/30">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-5">
                  <Building2 className="h-3.5 w-3.5" />
                  Enterprise & Studios
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
                  Built for{" "}
                  <span className="text-violet-400">Production at Scale</span>
                </h2>
                <p className="text-foreground/70 leading-relaxed mb-8">
                  Major studios, broadcasters, and enterprise brands use Virelle's production infrastructure to generate high-volume content pipelines. Custom AI model fine-tuning, white-label exports, dedicated account management, and bespoke commercial terms.
                </p>
                <div className="space-y-4 mb-8">
                  {[
                    { title: "Custom AI Model Fine-Tuning", desc: "Train models on your brand's visual identity, characters, and style." },
                    { title: "White-Label Exports", desc: "All outputs carry your branding. No Virelle watermarks or attribution." },
                    { title: "API & Pipeline Integration", desc: "Connect Virelle directly to your existing production pipeline via REST API." },
                    { title: "Dedicated Account Manager", desc: "A named human contact available 24/7 for your production team." },
                    { title: "Custom Onboarding & SLAs", desc: "Bespoke onboarding, uptime guarantees, and contractual terms." },
                  ].map(f => (
                    <div key={f.title} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{f.title}</p>
                        <p className="text-xs text-foreground/60">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={() => setLocation("/contact")} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 gap-2">
                    <Building2 className="h-4 w-4" />
                    Book a Private Demo
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} className="px-8 border-violet-500/30 hover:bg-violet-500/10">
                    Contact Enterprise Sales
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "180 min", label: "Max film length", sub: "Enterprise tier" },
                  { value: "4K ProRes", label: "Export quality", sub: "Broadcast-ready" },
                  { value: "Unlimited", label: "Team members", sub: "Enterprise tier" },
                  { value: "Custom", label: "Credit volume", sub: "Tailored to pipeline" },
                  { value: "REST API", label: "Pipeline integration", sub: "Full API access" },
                  { value: "99.9%", label: "Uptime SLA", sub: "Contractual guarantee" },
                ].map(s => (
                  <div key={s.label} className="bg-card/50 border border-violet-500/20 rounded-xl p-5 text-center">
                    <p className="text-2xl font-black text-violet-400">{s.value}</p>
                    <p className="text-xs font-semibold mt-1">{s.label}</p>
                    <p className="text-[10px] text-foreground/50 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pricing Preview ─── */}
        <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <CreditCard className="h-3.5 w-3.5" />
                Pricing
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Production Infrastructure,{" "}
                <span className="text-amber-400">Not a Toy</span>
              </h2>
              <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">
                Runway charges $76/month for unlimited short clips. Virelle delivers a complete 90-minute film. The value is categorically different — and so is the pricing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  tier: "Indie",
                  price: "A$149",
                  annual: "A$1,490/yr",
                  badge: "Entry Tier",
                  highlight: false,
                  color: "emerald",
                  desc: "Solo filmmakers, students, and creators exploring AI film production.",
                  credits: "500 credits/month",
                  features: ["AI Script Writer", "Character Creator", "Director's Assistant", "Up to 2 projects", "720p export", "BYOK support"],
                  cta: "Start Creating",
                },
                {
                  tier: "Creator",
                  price: "A$490",
                  annual: "A$4,900/yr",
                  badge: "Most Popular",
                  highlight: true,
                  color: "amber",
                  desc: "Serious indie producers and boutique creators building paid projects.",
                  credits: "2,000 credits/month",
                  features: ["Everything in Indie", "Video Generation", "AI Voice Acting (35 emotions)", "AI Film Score", "Up to 10 projects", "1080p export", "BYOK support"],
                  cta: "Start Producing",
                },
                {
                  tier: "Studio",
                  price: "A$1,490",
                  annual: "A$14,900/yr",
                  badge: "Commercial",
                  highlight: false,
                  color: "violet",
                  desc: "Boutique studios, agencies, and commercial directors with repeat pipelines.",
                  credits: "6,000 credits/month",
                  features: ["Everything in Creator", "Film Post-Production (ADR/Foley)", "Subtitles 130+ languages", "VFX Suite", "Up to 25 projects", "4K export", "5 team members"],
                  cta: "Scale Production",
                },
                {
                  tier: "Enterprise",
                  price: "Custom",
                  annual: "Contact Sales",
                  badge: "Enterprise",
                  highlight: false,
                  color: "yellow",
                  desc: "Major studios, broadcasters, and high-volume production pipelines.",
                  credits: "Unlimited + BYOK",
                  features: ["Everything in Studio", "Custom AI fine-tuning", "White-label exports", "API access", "Unlimited projects", "180 min films", "Dedicated account manager"],
                  cta: "Book a Demo",
                },
              ].map(plan => (
                <Card key={plan.tier} className={`relative overflow-hidden transition-all duration-300 ${plan.highlight ? "border-amber-500/50 shadow-lg shadow-amber-500/10 scale-[1.02]" : "border-border/50 hover:border-amber-500/30"}`}>
                  {plan.highlight && <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500" />}
                  <CardContent className="p-6">
                    {plan.badge && (
                      <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${plan.highlight ? "text-amber-400 bg-amber-500/10" : "text-foreground/60 bg-foreground/10"}`}>{plan.badge}</span>
                    )}
                    <h3 className="text-xl font-bold">{plan.tier}</h3>
                    <div className="mt-1 mb-1">
                      <span className="text-3xl font-black">{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-sm text-foreground/60">/mo</span>}
                    </div>
                    <p className="text-[11px] text-foreground/50 mb-1">{plan.annual}</p>
                    <p className="text-[11px] font-semibold text-amber-400 mb-3">{plan.credits}</p>
                    <p className="text-xs text-foreground/60 mb-4 leading-relaxed">{plan.desc}</p>
                    <Button
                      className={`w-full mb-4 font-semibold ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-foreground/10 hover:bg-foreground/20 text-foreground"}`}
                      size="sm"
                      onClick={() => setLocation(plan.tier === "Enterprise" ? "/contact" : "/pricing")}
                    >
                      {plan.cta}
                    </Button>
                    <ul className="space-y-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-foreground/70">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <p className="text-xs text-foreground/50 mb-3">All prices in AUD. Annual billing saves ~17%. Founding offer: 50% off first year for first 150 directors.</p>
              <button onClick={() => setLocation("/pricing")} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-all">
                View Full Pricing, Credits &amp; Add-Ons →
              </button>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/20 border-y border-border/40">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-xl font-bold tracking-tight text-foreground/80">Questions Every Serious Buyer Asks</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { icon: Clock, title: "How long does it take?", answer: "A full 90-minute film takes 4–8 hours to generate from a written concept. Individual scenes generate in 3–6 minutes each. Trailers and short films in under 30 minutes." },
                { icon: Film, title: "What exactly does it generate?", answer: "Screenplay, scene-by-scene video clips (4–8 per scene), AI voice acting for all dialogue, original film score, scene-to-scene continuity, and a final stitched cut — ready to export." },
                { icon: Shield, title: "What rights do I get?", answer: "You own 100% of all outputs commercially. No royalties, no licensing fees, no platform watermarks on exports. Your film is yours to sell, distribute, or broadcast." },
                { icon: Cpu, title: "What AI models are used?", answer: "Runway Gen-4.5, Sora 2, Kling 3.0, Veo 3, and fal.ai for video. ElevenLabs v3 for voice. Suno v4 and MusicGen for scores. You bring your own API keys — no markup." },
                { icon: Rocket, title: "Is it self-serve?", answer: "Fully self-serve. Sign up, connect your API keys, and start generating immediately. No onboarding calls, no waiting lists. Studio and Enterprise tiers include a dedicated account manager." },
                { icon: Globe, title: "How good is the output quality?", answer: "Scenes are generated at 1080p (4K on Studio/Enterprise tier) using the same AI video models used by professional VFX studios. Character consistency is maintained via DNA Lock prompting across all scenes." },
              ].map(q => (
                <div key={q.title} className="bg-card/50 border border-border/40 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <q.icon className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-sm font-semibold">{q.title}</p>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Trusted by <span className="text-amber-400">Filmmakers &amp; Studios</span>
              </h2>
              <p className="mt-4 text-foreground/70 max-w-xl mx-auto">From indie creators to production companies — Virelle Studios is changing how films get made.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {TESTIMONIALS.map(t => (
                <Card key={t.name} className="bg-card/50 border-border/50 hover:border-amber-500/20 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-0.5">{Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                      <span className="text-[9px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Verified User</span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <span className="text-amber-400 text-xs font-bold">{t.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{t.name}</p>
                        <p className="text-[10px] text-foreground/60">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 py-6 border-t border-border/30">
              {[
                { value: "4.9 / 5", label: "Average rating", stars: true },
                { value: "100+", label: "Active filmmakers", stars: false },
                { value: "100's", label: "Films generated", stars: false },
                { value: "99.9%", label: "Platform uptime", stars: false },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-3xl font-bold text-amber-400">{s.value}</p>
                  {s.stars && <div className="flex gap-0.5 justify-center mt-1">{[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}</div>}
                  <p className="text-[10px] text-foreground/60 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Final CTA ─── */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-card/30 to-background border-t border-border/40">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-5">
              <Rocket className="h-3.5 w-3.5" />
              Founding offer: 50% off your first year
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Your First Film Could Be{" "}
              <span className="text-amber-400">Done Today</span>
            </h2>
            <p className="mt-4 text-foreground/70 max-w-xl mx-auto">
              Concept to complete film in 4–8 hours. Screenplay, scenes, voice acting, soundtrack, and final cut — all generated. You own it commercially.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-12 text-base gap-2">
                Start Your First Film
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} className="h-12 text-base px-8 gap-2">
                <Building2 className="h-4 w-4" />
                Talk to Sales
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/50">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> No credit card to explore</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> Self-serve — start immediately</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> Cancel anytime</span>
            </div>
          </div>
        </section>

        {/* ─── Mobile App Download Banner ─── */}
        <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.25) 0%, rgba(0,0,0,0.95) 50%, rgba(88,28,135,0.25) 100%)" }}>
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                <Smartphone className="h-3.5 w-3.5" />
                Now on iOS &amp; Android
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Take Virelle Studios <span className="text-amber-400">Everywhere</span></h2>
              <p className="text-foreground/60 max-w-md text-sm leading-relaxed">Every AI filmmaking tool — Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more — now in your pocket. New features sync automatically.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button size="lg" onClick={() => setLocation("/download")} className="bg-amber-500 hover:bg-amber-600 text-black font-bold h-12 px-6 gap-3">
                <Smartphone className="h-5 w-5" />
                Download the App
              </Button>
              <Button size="lg" variant="outline" onClick={() => setLocation("/download")} className="h-12 px-6 gap-3 border-white/20 hover:bg-white/5">
                Learn More →
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Footer (6-column) ─── */}
        <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40 bg-card/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
              {/* Brand column */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="w-10 h-10 rounded-lg" draggable={false} />
                  <span className="text-base font-bold">Virelle Studios</span>
                </div>
                <p className="text-xs text-foreground/50 leading-relaxed mb-4 max-w-xs">The world's first end-to-end AI film studio. Concept to complete film in hours. 100% commercial ownership. Zero markup on AI costs.</p>
                <div className="flex gap-3">
                  {[
                    { label: "X / Twitter", href: "#" },
                    { label: "Discord", href: "#" },
                    { label: "YouTube", href: "#" },
                    { label: "Instagram", href: "#" },
                  ].map(s => (
                    <a key={s.label} href={s.href} className="text-[10px] text-foreground/40 hover:text-foreground/70 transition-colors">{s.label}</a>
                  ))}
                </div>
              </div>

              {/* Product */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-4">Product</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "How It Works", path: "/how-it-works" },
                    { label: "Features", path: "#features" },
                    { label: "Pricing", path: "/pricing" },
                    { label: "Showcase", path: "/showcase" },
                    { label: "FAQ", path: "/faq" },
                    { label: "Blog", path: "/blog" },
                    { label: "Download App", path: "/download" },
                  ].map(l => (
                    <li key={l.label}><button onClick={() => l.path.startsWith("#") ? document.querySelector(l.path)?.scrollIntoView({ behavior: "smooth" }) : setLocation(l.path)} className="text-xs text-foreground/60 hover:text-foreground transition-colors">{l.label}</button></li>
                  ))}
                </ul>
              </div>

              {/* Solutions */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-4">Solutions</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "Independent Filmmakers", path: "/solutions#indie-filmmakers" },
                    { label: "VFX & Production", path: "/solutions#vfx-production" },
                    { label: "Music Artists", path: "/solutions#music-artists" },
                    { label: "Brands & Agencies", path: "/solutions#brands-agencies" },
                    { label: "Studios & Enterprise", path: "/solutions#enterprise" },
                  ].map(l => (
                    <li key={l.label}><button onClick={() => setLocation(l.path)} className="text-xs text-foreground/60 hover:text-foreground transition-colors">{l.label}</button></li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/60 mb-4">Company</h4>
                <ul className="space-y-2.5">
                  {[
                    { label: "About Virelle", path: "/about" },
                    { label: "Contact", path: "/contact" },
                    { label: "Terms of Service", path: "/terms" },
                    { label: "Privacy Policy", path: "/privacy" },
                    { label: "Acceptable Use", path: "/acceptable-use" },
                    { label: "AI Content Policy", path: "/ai-content-policy" },
                    { label: "IP & Copyright", path: "/ip-policy" },
                    { label: "DMCA Takedowns", path: "/dmca" },
                  ].map(l => (
                    <li key={l.label}><button onClick={() => setLocation(l.path)} className="text-xs text-foreground/60 hover:text-foreground transition-colors">{l.label}</button></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer bottom bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/40 gap-4">
              <p className="text-[10px] text-foreground/40">
                &copy; {new Date().getFullYear()} Virelle Studios. All rights reserved. Powered by{" "}
                <img
                  src="/leego-logo.png"
                  alt="Leego"
                  onClick={handleLeegoClick}
                  className="inline align-middle cursor-pointer"
                  style={{
                    filter: "drop-shadow(0 0 4px #22c55e)",
                    height: leegoEnlarged ? "64px" : "16px",
                    width: leegoEnlarged ? "64px" : "16px",
                    transition: leegoEnlarged ? "height 0.4s cubic-bezier(0.34,1.56,0.64,1), width 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "height 0.6s ease-in-out, width 0.6s ease-in-out",
                    verticalAlign: "middle",
                    zIndex: leegoEnlarged ? 50 : "auto",
                    position: leegoEnlarged ? "relative" : "static",
                  }}
                />{" "}
                Leego
              </p>
              <div className="flex items-center gap-4 text-[10px] text-foreground/40">
                <span>🇦🇺 Australian company</span>
                <span>•</span>
                <span>GDPR compliant</span>
                <span>•</span>
                <span>SOC 2 in progress</span>
              </div>
            </div>
          </div>
        </footer>

      </div>{/* end content wrapper */}
    </div>
  );
}
