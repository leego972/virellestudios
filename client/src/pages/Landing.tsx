import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Film, Zap, Layers, Users, Wand2, Music, Palette, Camera,
  ArrowRight, Star, CheckCircle2, Play, Shield, ShieldCheck,
  Globe, Clock, ChevronDown, Sun, Moon, BookOpen, CreditCard,
  MessageSquare, Clapperboard, Monitor, Scissors, MapPin,
  Mic, Sparkles, Video, Eye, Cpu, Building2, Rocket, Lock, AlertTriangle,
  Menu, X as XIcon, Smartphone,
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
    tier: "Amateur",
    price: "$100,000",
    monthlyPrice: "$10,000",
    period: "/year",
    highlight: false,
    badge: "Get Started",
    accentColor: "emerald",
    audience: "Solo filmmakers, film students, YouTube creators, and hobbyists making their first AI films.",
    desc: "Full access to all creative & pre-production tools. 2,000 credits/month included.",
    features: [
      "2,000 credits/month included",
      "AI Script Writer & Screenplay Tools",
      "Character Creator & DNA Lock",
      "Director's AI Assistant",
      "Location Scout & Mood Board",
      "Dialogue Editor & Budget Estimator",
      "Up to 2 projects, 5 scenes each",
      "720p export",
    ],
    limitations: [],
  },
  {
    tier: "Independent",
    price: "$250,000",
    monthlyPrice: "$25,000",
    period: "/year",
    highlight: false,
    badge: "For Creators",
    accentColor: "amber",
    audience: "Independent filmmakers, indie directors, and content creators building their vision.",
    desc: "Full production pipeline with video generation. 1,2,000 credits/month included.",
    features: [
      "1,2,000 credits/month included",
      "All creative & pre-production tools",
      "AI Script Writer & Storyboard",
      "Character Creator & DNA Lock",
      "Video Generation & Film Export",
      "Bulk generation tools",
      "Ad & Poster Maker",
      "Up to 5 team collaborators",
      "Up to 25 projects, 90 min per film",
      "1080p + 4K export",
    ],
    limitations: [],
  },
  {
    tier: "Studio",
    price: "$350,000",
    monthlyPrice: "$35,000",
    period: "/year",
    highlight: true,
    badge: "Most Popular",
    accentColor: "violet",
    audience: "Production companies, VFX studios, commercial directors, and music video producers.",
    desc: "Advanced production suite with VFX and API access. 15,500 credits/month included.",
    features: [
      "15,500 credits/month included",
      "Everything in Independent, plus:",
      "Up to 100 projects, 150 min per film",
      "VFX Suite (Advanced Effects)",
      "Multi-Shot Sequencer",
      "NLE / DaVinci Resolve Export",
      "AI Casting Tool",
      "White-Label Exports",
      "Priority rendering queue",
      "25 team members",
      "API Access & Pipeline Integration",
    ],
    limitations: [],
  },
  {
    tier: "Industry",
    price: "$500,000",
    monthlyPrice: "$50,000",
    period: "/year",
    highlight: false,
    badge: "For Major Studios",
    accentColor: "yellow",
    audience: "Major studios, broadcasters, enterprise brands, and agencies with high-volume production pipelines.",
    desc: "Full enterprise power with no limits. 115,500 credits/month included.",
    features: [
      "115,500 credits/month included",
      "Everything in Studio, plus:",
      "Unlimited projects, 180 min per film",
      "4K + ProRes export",
      "Live Action Plate Compositing",
      "Custom AI Model Fine-Tuning",
      "Dedicated Account Manager",
      "Unlimited team members",
    ],
    limitations: [],
  },
];

const STATS = [
  { value: "100's", label: "Films Created" },
  { value: "100+", label: "Filmmakers" },
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
            : "text-foreground/80 hover:text-foreground"
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
            : "text-foreground/80 hover:text-foreground"
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
  useEffect(() => {
    if (!langOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [langOpen]);
  const [leegoEnlarged, setLeegoEnlarged] = useState(false);
  const handleLeegoClick = () => {
    if (leegoEnlarged) return;
    setLeegoEnlarged(true);
    setTimeout(() => setLeegoEnlarged(false), 3000);
  };

  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem("virelle_offer_dismissed") === "1"; } catch { return false; }
  });
  const { data: spotsData } = trpc.subscription.foundingSpots.useQuery(undefined, {
    refetchInterval: 30_000, // refresh every 30 seconds
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const spotsRemaining = spotsData?.spotsRemaining ?? 19;
  const displayCount = spotsData?.displayCount ?? 31;
  const offerFull = spotsData?.isFull ?? false;

  return (
    <div
      className="min-h-screen text-foreground overflow-x-hidden relative"
      style={{
        backgroundColor: "var(--background)",
      }}
    >
      {/* Repeating gold watermark — mix-blend-mode:screen makes black bg invisible,
          leaving only the gold logo visible on any dark background */}
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
      {/* Subtle dark overlay so content remains readable */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{ background: "rgba(0,0,0,0.35)", zIndex: 0 }}
        aria-hidden
      />
      {/* All page content sits above the overlay */}
      <div className="relative" style={{ zIndex: 1 }}>
      {/* ─── Founding Offer Banner ─── */}
      {!bannerDismissed && !offerFull && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-black uppercase tracking-widest shrink-0 hidden sm:inline">🎬 FOUNDING OFFER</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold">
                  HALF PRICE on your first year's membership
                </span>
                <span className="text-xs font-medium opacity-80">— Limited to first 50 founding directors.</span>
                <span className="bg-black/20 text-black text-xs font-black px-2 py-0.5 rounded-full">
                  {spotsRemaining} of 50 spots left
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setLocation("/register")}
                className="bg-black text-amber-400 text-xs font-black px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors whitespace-nowrap"
              >
                Claim Your Spot →
              </button>
              <button
                onClick={() => { setBannerDismissed(true); try { localStorage.setItem("virelle_offer_dismissed", "1"); } catch {} }}
                className="text-black/60 hover:text-black transition-colors text-lg leading-none font-bold"
                aria-label="Dismiss offer"
              >
                ×
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="max-w-7xl mx-auto mt-1.5">
            <div className="h-1 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-black/50 rounded-full transition-all duration-1000"
                style={{ width: `${(displayCount / 50) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-medium opacity-70 mt-0.5">
              <span>{displayCount} directors have already joined</span>
              <span>Only {spotsRemaining} spots remaining</span>
            </div>
          </div>
        </div>
      )}
      {/* ─── Navbar ─── */}
      <nav className={`fixed left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all ${!bannerDismissed && !offerFull ? "top-[72px]" : "top-0"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="w-12 h-12 rounded-lg" draggable={false} />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">Virelle Studios</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-foreground/80">
            <button onClick={() => setLocation("/solutions")} className="hover:text-foreground transition-colors">Solutions</button>
            <button onClick={() => setLocation("/how-it-works")} className="hover:text-foreground transition-colors">How It Works</button>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <button onClick={() => setLocation("/showcase")} className="hover:text-foreground transition-colors font-semibold" style={{ color: '#d4af37' }}>Showcase</button>
            <button onClick={() => setLocation("/faq")} className="hover:text-foreground transition-colors">FAQ</button>
            <button onClick={() => setLocation("/blog")} className="hover:text-foreground transition-colors">Blog</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-9 w-9">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {/* Language selector */}
            <div className="relative" ref={langRef}>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm gap-1.5"
                onClick={() => setLangOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
              >
                <Globe className="h-4 w-4" />
                <span className="hidden md:inline">Language</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
              </Button>
              {langOpen && (
                <div className="fixed w-52 bg-popover border border-border rounded-xl shadow-2xl z-[200]" style={{ top: '72px', right: '8px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                    <button
                      key={lang.code}
                      onClick={() => {
                        document.documentElement.lang = lang.code;
                        document.documentElement.dir = ["he","ar"].includes(lang.code) ? "rtl" : "ltr";
                        localStorage.setItem("virelle_ui_lang", lang.code);
                        setLangOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} className="text-sm hidden sm:inline-flex">Sign In</Button>
            <Button size="sm" onClick={() => setLocation("/pricing")} className="text-sm bg-amber-500 hover:bg-amber-600 text-black font-medium hidden sm:inline-flex">
              View Plans
            </Button>
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-1">
              {[
                { label: "Solutions", path: "/solutions" },
                { label: "How It Works", path: "/how-it-works" },
                { label: "Features", path: "#features" },
                { label: "Pricing", path: "#pricing" },
                { label: "Showcase", path: "/showcase", gold: true },
                { label: "FAQ", path: "/faq" },
                { label: "Blog", path: "/blog" },
                { label: "About", path: "/about" },
                { label: "Contact", path: "/contact" },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => { setMobileMenuOpen(false); if (item.path.startsWith("#")) { document.querySelector(item.path)?.scrollIntoView({ behavior: "smooth" }); } else { setLocation(item.path); } }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent ${
                    item.gold ? "text-amber-400" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); setLocation("/login"); }}>Sign In</Button>
                <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium" onClick={() => { setMobileMenuOpen(false); setLocation("/pricing"); }}>View Plans</Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className={`pb-20 ${!bannerDismissed && !offerFull ? "pt-52" : "pt-32"} px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
        {/* VS Logo watermark background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
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
          {/* Audience targeting pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="h-6 w-6 rounded" />
            For indie filmmakers, content creators, agencies &amp; studios
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Go from Concept to{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Complete Film
            </span>
            <br />
            <span className="text-3xl sm:text-4xl lg:text-5xl text-foreground/90">
              in Hours &mdash; Not Months
            </span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-foreground/75 max-w-2xl mx-auto leading-relaxed">
            Write a concept. Virelle generates the screenplay, 60&ndash;90 cinematic scenes with voice acting, an original soundtrack, and a final cut &mdash; ready to publish. Or drop in impossible VFX scenes for your live-action production.
          </p>
          {/* Inline proof signals */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/60">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> Hundreds of films are already being created</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> A movie can be generated in hours*</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> You own all outputs commercially</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-amber-400" /> BYOK &mdash; no video markup</span>
          </div>
          <p className="mt-4 text-[10px] text-foreground/40 max-w-lg mx-auto leading-relaxed">
            * Generation time estimates apply to amateur-level productions with a completed script and defined character list. We recognise that a professional film — regardless of AI involvement — can require weeks or months of creative development. Virelle Studios is designed to eliminate technical barriers and reduce production costs to the maximum extent possible, without compromising on output quality.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Your First Film
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => { const el = document.getElementById('demo-reel'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }} className="h-12 text-base px-8">
              <Play className="h-4 w-4 mr-2" />
              See Real Output
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-foreground/40">Founding offer: 50% off first year &mdash; no credit card required to explore.</p>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section className="py-12 border-y border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-amber-400">{stat.value}</p>
              <p className="text-sm text-foreground/80 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Demo Reel / Real Output Section ─── */}
      <section id="demo-reel" className="py-20 px-4 sm:px-6 lg:px-8 bg-card/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Film className="h-3.5 w-3.5" />
              Real Platform Output &mdash; Not Renders or Stock Footage
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What Virelle Actually{" "}
              <span className="text-amber-400">Generates</span>
            </h2>
            <p className="mt-4 text-foreground/70 max-w-2xl mx-auto">
              Every frame below was produced directly by the Virelle platform &mdash; no post-production, no stock footage, no human VFX artists.
            </p>
          </div>

          {/* Keyframe image grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="relative group rounded-xl overflow-hidden border border-border/40 hover:border-amber-500/40 transition-all duration-300">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/RLvvvpXSGBeZEIWZ.png"
                alt="Virelle Studios cinematic opener — golden transformation"
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-semibold text-white">Cinematic Opener</p>
                <p className="text-[10px] text-white/70">Golden transformation sequence &mdash; 16s, generated in-platform</p>
              </div>
            </div>
            <div className="relative group rounded-xl overflow-hidden border border-border/40 hover:border-amber-500/40 transition-all duration-300">
              <img
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/nJwlbUoAaOvtGnki.png"
                alt="Virelle Studios cinematic opener — dove approaching the shield"
                className="w-full aspect-video object-cover object-center group-hover:scale-105 transition-transform duration-500"
                style={{ background: '#0a0a0a' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-semibold text-white">Brand Identity</p>
                <p className="text-[10px] text-white/70">AI-generated studio emblem &mdash; photorealistic gold</p>
              </div>
            </div>
            <div className="relative group rounded-xl overflow-hidden border border-border/40 hover:border-purple-500/40 transition-all duration-300">
              <div className="w-full aspect-video bg-gradient-to-br from-purple-900/60 via-black to-amber-900/40 flex items-center justify-center">
                <div className="text-center px-4">
                  <Sparkles className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white">Your Film Here</p>
                  <p className="text-xs text-white/60 mt-1">Generate your first scene in minutes</p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-xs font-semibold text-white">VFX Scene Studio</p>
                <p className="text-[10px] text-white/70">Impossible scenes for live-action productions</p>
              </div>
            </div>
          </div>

          {/* Workflow proof: how long it actually takes */}
          <div className="bg-card/50 border border-border/40 rounded-2xl p-8">
            <h3 className="text-center text-lg font-bold mb-8">How a Full Film Gets Made &mdash; <span className="text-amber-400">Start to Finish</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { step: "1", time: "5 min", title: "Write Your Concept", desc: "Describe your film in plain language. Genre, tone, characters, story." },
                { step: "2", time: "10 min", title: "AI Writes the Screenplay", desc: "Full Hollywood-format script with scene breakdowns, dialogue, and stage directions." },
                { step: "3", time: "3–6 hrs", title: "Scenes Generate", desc: "60–90 scenes rendered with clip chaining, voice acting, and an original score." },
                { step: "4", time: "Instant", title: "Export Final Cut", desc: "Download your complete film as MP4 or ProRes. You own it commercially." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
                    <span className="text-amber-400 font-bold text-sm">{s.step}</span>
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold mb-2">{s.time}</div>
                  <p className="text-sm font-semibold mb-1">{s.title}</p>
                  <p className="text-xs text-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setLocation("/showcase")}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-black transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)' }}
            >
              <Film className="w-4 h-4" />
              Browse the Full Showcase
            </button>
          </div>
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
            <p className="mt-4 text-foreground/80 max-w-2xl mx-auto">
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
                <p className="text-sm text-foreground/80 leading-relaxed mb-5">
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
                      <span className="text-foreground/80">{f}</span>
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
                <p className="text-sm text-foreground/80 leading-relaxed mb-5">
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
                      <span className="text-foreground/80">{f}</span>
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
            <p className="mt-4 text-foreground/80 max-w-2xl mx-auto mb-8">
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
                  <p className="text-xs text-foreground/80 leading-relaxed">{f.desc}</p>
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
            <p className="mt-4 text-foreground/80 max-w-2xl mx-auto">
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
                  <p className="text-xs text-foreground/80 leading-relaxed">{f.desc}</p>
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
            <p className="mt-4 text-foreground/80 max-w-xl mx-auto">
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
                <p className="text-xs text-foreground/80 leading-relaxed">{s.desc}</p>
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
              <p className="text-foreground/80 leading-relaxed mb-6">
                Virelle orchestrates the pipeline — you control the AI providers. Plug in your own API keys for video generation, voice acting, and music. Choose the best provider for each task. Pay only for what you use.
              </p>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2">Video Generation</p>
                {[
                  "Runway ML — Best quality (Gen-4 Turbo)",
                  "OpenAI Sora — Cinematic realism",
                  "fal.ai — Best value (HunyuanVideo, Veo 3)",
                  "Luma AI, Replicate, Hugging Face",
                  "Pollinations.ai — No key needed",
                ].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-foreground/80">{provider}</span>
                  </div>
                ))}
                <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-2 mt-4">Voice Acting &amp; Music</p>
                {[
                  "ElevenLabs — Premium AI voice acting",
                  "OpenAI TTS — Reliable voice generation",
                  "Suno AI — AI-generated film scores",
                  "MusicGen (Replicate) — Open-source music",
                ].map((provider) => (
                  <div key={provider} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                    <span className="text-foreground/80">{provider}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-6 space-y-3">
              <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-3">Connected Providers</p>
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
                    <p className="text-[10px] text-foreground/80">{p.detail}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                </div>
              ))}
              <p className="text-[10px] text-foreground/80 text-center pt-2">Keys are encrypted and never exposed to the frontend.</p>
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
            <p className="text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Virelle's photorealism engine generates characters that cannot be told apart from real human beings on film. Every frame is engineered at the level of a $200M Hollywood production.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Eye className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Hyper-Realistic Skin</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Subsurface scattering shows blood flow beneath translucent skin layers. Visible pores, micro-wrinkles, fine peach fuzz, natural blemishes, and authentic facial asymmetry. No airbrushed, plastic, or porcelain skin — ever.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Camera className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Soulful, Living Eyes</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Iris fibers rendered in full detail. Natural corneal reflections, subtle moisture in the waterline, and faint sclera veins. Eyes that convey genuine emotion and thought — not the dead, glassy look of AI.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <Film className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Hollywood Cinematography</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Every scene is generated as if captured on an ARRI ALEXA 65 with Zeiss Supreme Prime Radiance lenses. Kodak Vision3 500T film stock color science, anamorphic bokeh, and physically accurate light falloff.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/50 border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-400" /> Micro-Expression Engine</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">Characters don't just look real — they feel real. The prompt engine injects authentic micro-expression directives so every face conveys genuine emotion: the slight tension around the eyes before a lie, the involuntary lip compression of grief, the asymmetric smile of real joy.</p>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-xl p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-amber-400" /> Character DNA Lock</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">A character's face, bone structure, skin tone, and physical attributes are locked via a DNA prompt anchor injected into every scene. Your lead actor looks identical in scene 1 and scene 87 — the only thing that changes is their wardrobe and emotional state.</p>
            </div>
          </div>
          <div className="text-center mt-10">
            <div className="relative inline-block">
              <button
                onClick={() => setLocation("/showcase")}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-black text-lg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #d4af37 100%)' }}
              >
                <Film className="w-5 h-5" />
                View Our Films
              </button>
              {/* Coming Soon badge */}
              <span
                className="absolute -top-3 -right-3 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase text-black"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', boxShadow: '0 0 8px rgba(251,191,36,0.7)' }}
              >
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-foreground/80 mt-3">See what VirElle Studios AI can create</p>
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
            <p className="text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Virelle Studios is the only AI film platform with built-in child protection, content moderation, and industry-leading safeguards — so you can create freely without legal risk.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card/50 border border-green-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">AI Minor Protection</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                When a minor character appears in a sensitive scene — shower, beach, changing — our AI automatically applies cinematic modesty: heavy steam, fog, tasteful camera angles, and appropriate framing. No nudity, ever. Automatically.
              </p>
            </div>
            <div className="bg-card/50 border border-blue-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Face & Likeness Consent</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Directors are legally responsible for obtaining consent from living individuals whose likeness they use. Our platform requires acknowledgment of consent obligations at upload. Historical public figures (pre-1900) are exempt with quality source images.
              </p>
            </div>
            <div className="bg-card/50 border border-amber-500/20 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h3 className="font-semibold mb-2">Instant Misuse Alerts</h3>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Our content moderation engine scans every generation in real time. Suspected policy violations trigger an immediate account freeze and alert to our safety team — reviewed within 24 hours. Zero tolerance for CSAM.
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500/5 to-blue-500/5 border border-green-500/10 rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <ShieldCheck className="h-8 w-8 text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Zero Tolerance for Child Sexual Abuse Material (CSAM)</p>
              <p className="text-xs text-foreground/80">
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
            <p className="mt-4 text-foreground/80 max-w-xl mx-auto">
              A paid membership is required to use the platform. Choose your tier and start creating immediately.
            </p>
          </div>

          {/* Membership Tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {PRICING.map((plan) => (
              <Card key={plan.tier} className={`relative overflow-hidden ${plan.highlight ? "border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/10" : "bg-card/50 border-purple-500/30"}`}>
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                {!plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
                )}
                <CardContent className="p-6">
                  {plan.badge && (
                    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3 ${
                      plan.highlight ? "text-amber-400 bg-amber-500/10" : "text-purple-400 bg-purple-500/10"
                    }`}>{plan.badge}</span>
                  )}
                  <h3 className="text-xl font-bold">{plan.tier}</h3>
                  <div className="mt-1 mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-foreground/80">{plan.period}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mb-3">{plan.desc}</p>
                  {(plan as any).audience && (
                    <p className="text-[10px] text-foreground/50 italic mb-4 leading-relaxed border-l-2 border-amber-500/30 pl-2">{(plan as any).audience}</p>
                  )}
                  <Button
                    className={`w-full mb-4 ${plan.highlight ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold" : "bg-purple-600 hover:bg-purple-700 text-white font-semibold"}`}
                    size="sm"
                    onClick={() => setLocation("/pricing")}
                  >
                    Start Creating
                  </Button>
                  <ul className="space-y-2">
                    {plan.features.map((f) => {
                      if (f.startsWith("──")) {
                        return (
                          <li key={f} className="pt-2 pb-1 border-t border-zinc-700 first:border-t-0 first:pt-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                              {f.replace(/──/g, "").trim()}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                          <span className="text-foreground/80">{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-xs text-foreground/80 mb-3">All prices in USD. Billed annually. Monthly billing available at a slight premium.</p>
            <button
              onClick={() => setLocation("/pricing")}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition-all"
            >
              View Full Pricing & Credit Packs →
            </button>
          </div>
        </div>
      </section>
      {/* ─── Trust Architecture ─── */}
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
              { icon: Cpu, title: "What AI models are used?", answer: "Runway Gen-3, Sora, fal.ai, and Kling for video. ElevenLabs and OpenAI TTS for voice. Suno AI and MusicGen for scores. You bring your own API keys — no markup on generation costs." },
              { icon: Rocket, title: "Is it self-serve?", answer: "Fully self-serve. Sign up, connect your API keys, and start generating immediately. No onboarding calls, no waiting lists. Studio and Industry tiers include a dedicated account manager." },
              { icon: Globe, title: "How good is the output quality?", answer: "Scenes are generated at 1080p (4K on Industry tier) using the same AI video models used by professional VFX studios. Character consistency is maintained via DNA Lock prompting across all scenes." },
            ].map((q) => (
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
              Trusted by{" "}
              <span className="text-amber-400">Filmmakers &amp; Studios</span>
            </h2>
            <p className="mt-4 text-foreground/70 max-w-xl mx-auto">
              From indie creators to production companies — Virelle Studios is changing how films get made.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="bg-card/50 border-border/50 hover:border-amber-500/20 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[9px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Verified User</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
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
          {/* Aggregate rating bar */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-8 py-6 border-t border-border/30">
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">4.9 / 5</p>
              <div className="flex gap-0.5 justify-center mt-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-[10px] text-foreground/60 mt-1">Average rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">100+</p>
              <p className="text-[10px] text-foreground/60 mt-1">Active filmmakers</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">100's</p>
              <p className="text-[10px] text-foreground/60 mt-1">Films generated</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">99.9%</p>
              <p className="text-[10px] text-foreground/60 mt-1">Platform uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-card/30 to-background border-t border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-5">
            <Rocket className="h-3.5 w-3.5" />
            Founding offer: 50% off your first year
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Your First Film Could Be{" "}
            <span className="text-amber-400">Done Today</span>
          </h2>
          <p className="mt-4 text-foreground/70 max-w-xl mx-auto">
            Concept to complete film in 4–8 hours. Screenplay, scenes, voice acting, soundtrack, and final cut &mdash; all generated. You own it commercially.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => setLocation("/register")} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12 text-base">
              Start Your First Film
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/contact")} className="h-12 text-base px-8">
              <Building2 className="h-4 w-4 mr-2" />
              Talk to Sales
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-foreground/50">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> No credit card to explore</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> Self-serve &mdash; start immediately</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-amber-400" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ─── Mobile App Download Banner ─── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg, rgba(120,53,15,0.25) 0%, rgba(0,0,0,0.95) 50%, rgba(88,28,135,0.25) 100%)" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
              <Smartphone className="h-3.5 w-3.5" />
              Now on iOS &amp; Android
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Take Virelle Studios <span className="text-amber-400">Everywhere</span>
            </h2>
            <p className="text-foreground/60 max-w-md text-sm leading-relaxed">
              Every AI filmmaking tool — Script Writer, Storyboard, Video Generation, Director Chat, and 30+ more — now in your pocket. New features sync automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button
              size="lg"
              onClick={() => setLocation("/download")}
              className="bg-white text-black hover:bg-gray-100 font-semibold px-6 h-12 gap-3"
            >
              <Smartphone className="h-5 w-5" />
              Download the App
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/download")}
              className="h-12 px-6 gap-3 border-white/20 hover:bg-white/5"
            >
              Learn More →
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Product</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setLocation("/how-it-works")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">How It Works</button></li>
                <li><a href="#features" className="text-xs text-foreground/80 hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-xs text-foreground/80 hover:text-foreground transition-colors">Pricing</a></li>
                <li><button onClick={() => setLocation("/faq")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">FAQ</button></li>
                <li><button onClick={() => setLocation("/blog")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Blog</button></li>
                <li><button onClick={() => setLocation("/showcase")} className="text-xs font-semibold hover:text-foreground transition-colors" style={{ color: '#d4af37' }}>Showcase</button></li>
                <li><button onClick={() => setLocation("/download")} className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">📱 Download App</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Solutions</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setLocation("/solutions#indie-filmmakers")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Independent Filmmakers</button></li>
                <li><button onClick={() => setLocation("/solutions#vfx-production")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">VFX &amp; Production</button></li>
                <li><button onClick={() => setLocation("/solutions#music-artists")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Music Artists</button></li>
                <li><button onClick={() => setLocation("/solutions#brands-agencies")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Brands &amp; Agencies</button></li>
                <li><button onClick={() => setLocation("/solutions#enterprise")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Studios &amp; Enterprise</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Company</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setLocation("/about")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">About Virelle</button></li>
                <li><button onClick={() => setLocation("/contact")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Contact</button></li>
                <li><button onClick={() => setLocation("/terms")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setLocation("/privacy")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setLocation("/acceptable-use")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">Acceptable Use</button></li>
                <li><button onClick={() => setLocation("/ai-content-policy")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">AI Content Policy</button></li>
                <li><button onClick={() => setLocation("/ip-policy")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">IP &amp; Copyright Policy</button></li>
                <li><button onClick={() => setLocation("/dmca")} className="text-xs text-foreground/80 hover:text-foreground transition-colors">DMCA Takedowns</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80 mb-3">Connect</h4>
              <ul className="space-y-2">
                <li><span className="text-xs text-foreground/80">Twitter / X</span></li>
                <li><span className="text-xs text-foreground/80">Discord</span></li>
                <li><span className="text-xs text-foreground/80">YouTube</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-border/40 gap-4">
            <div className="flex items-center gap-3">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="w-10 h-10 rounded-lg" draggable={false} />
              <span className="text-sm font-semibold">Virelle Studios</span>
            </div>
            <p className="text-[10px] text-foreground/80">
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
                  transition: leegoEnlarged
                    ? "height 0.4s cubic-bezier(0.34,1.56,0.64,1), width 0.4s cubic-bezier(0.34,1.56,0.64,1)"
                    : "height 0.6s ease-in-out, width 0.6s ease-in-out",
                  verticalAlign: "middle",
                  zIndex: leegoEnlarged ? 50 : "auto",
                  position: leegoEnlarged ? "relative" : "static",
                }}
              />{" "}
              Leego
            </p>
          </div>
        </div>
      </footer>
      </div>{/* end content wrapper */}
    </div>
  );
}
