import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Film, Sparkles, Music, Megaphone, BookOpen,
  Building2, Users, CheckCircle2, ChevronRight, Clapperboard,
  Globe, Tv, Camera, Star
} from "lucide-react";

const SEGMENTS = [
  {
    id: "indie-filmmakers",
    icon: Film,
    color: "amber",
    title: "Independent Filmmakers",
    subtitle: "Make your feature film without a studio budget",
    description: "You have the story. Virelle gives you the production infrastructure. Generate a complete feature-length film — screenplay, scenes, voice acting, soundtrack, and trailer — without a crew, location budget, or post-production house.",
    useCases: [
      "Feature films (up to 90–180 minutes)",
      "Short films and festival submissions",
      "Proof-of-concept reels for investor pitches",
      "Pilot episodes for series development",
    ],
    workflow: "Write your concept → AI generates screenplay → Generate scene previews → Produce scene videos → Mix audio → Export finished film",
    recommendedTier: "Independent or Creator",
    tierColor: "text-emerald-400",
  },
  {
    id: "vfx-production",
    icon: Sparkles,
    color: "purple",
    title: "VFX & Production Companies",
    subtitle: "Generate the scenes that are too expensive to shoot",
    description: "Shooting a live-action production with a real cast? Use Virelle to generate the scenes that would be physically impossible or prohibitively expensive — alien worlds, historical recreations, space battles, underwater sequences, natural disasters.",
    useCases: [
      "VFX scene generation for live-action films",
      "Background plate generation for compositing",
      "Previz and pre-production concept reels",
      "Stunt or dangerous scene replacements",
    ],
    workflow: "Upload cast photos → Define scene parameters → Generate VFX scene → Export for compositing in DaVinci Resolve or Premiere",
    recommendedTier: "Creator or Studio",
    tierColor: "text-purple-400",
  },
  {
    id: "music-artists",
    icon: Music,
    color: "pink",
    title: "Music Artists & Labels",
    subtitle: "Cinematic music videos without a film crew",
    description: "Generate a fully cinematic music video for your track — with a narrative arc, character-consistent scenes, and visual style matched to your music. No director, no crew, no location permits.",
    useCases: [
      "Full narrative music videos",
      "Lyric video with cinematic backgrounds",
      "Tour announcement and promotional reels",
      "Album artwork and visual identity content",
    ],
    workflow: "Define visual concept → Set character and scene parameters → Generate scenes to music → Export music video",
    recommendedTier: "Amateur or Independent",
    tierColor: "text-pink-400",
  },
  {
    id: "brands-agencies",
    icon: Megaphone,
    color: "blue",
    title: "Brands & Creative Agencies",
    subtitle: "Produce campaign content at a fraction of the cost",
    description: "Generate TV commercials, brand films, social media content, and product launch videos without a production company. The Ad & Poster Maker creates campaign assets across all formats and platforms.",
    useCases: [
      "TV and digital commercials",
      "Product launch films",
      "Social media content (Instagram, TikTok, YouTube)",
      "Brand identity films and corporate videos",
    ],
    workflow: "Define brand brief → Generate commercial script → Produce scenes → Create ad assets across all formats → Publish",
    recommendedTier: "Creator or Studio",
    tierColor: "text-blue-400",
  },
  {
    id: "educators",
    icon: BookOpen,
    color: "green",
    title: "Film Schools & Educators",
    subtitle: "Teach production with real tools, not theory",
    description: "Give students access to a professional AI film production pipeline. Virelle is used in film schools and creative programmes to teach screenplay structure, visual development, production workflow, and post-production — with real outputs at every stage.",
    useCases: [
      "Student film production projects",
      "Screenplay development and visualisation",
      "Production workflow education",
      "Portfolio development for graduates",
    ],
    workflow: "Student writes concept → Develops screenplay → Generates storyboard → Produces scenes → Assembles and exports film",
    recommendedTier: "Amateur (per student) or Studio (institutional)",
    tierColor: "text-green-400",
  },
  {
    id: "enterprise",
    icon: Building2,
    color: "violet",
    title: "Studios & Enterprise",
    subtitle: "Scale your production output with AI infrastructure",
    description: "For production studios and enterprise organisations that need volume, team management, API access, and custom model fine-tuning. Virelle's Industry and custom enterprise tiers provide the infrastructure for large-scale AI-assisted production.",
    useCases: [
      "High-volume content production pipelines",
      "Multi-team project management",
      "API integration into existing production workflows",
      "Custom AI model fine-tuning for brand consistency",
    ],
    workflow: "API integration → Team workspace setup → Bulk generation pipelines → Custom model training → Enterprise export and delivery",
    recommendedTier: "Studio or Industry",
    tierColor: "text-violet-400",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", badge: "bg-purple-500/20 text-purple-300" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-400", badge: "bg-pink-500/20 text-pink-300" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-300" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", badge: "bg-green-500/20 text-green-300" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", badge: "bg-violet-500/20 text-violet-300" },
};

export default function Solutions() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/welcome")} className="flex items-center gap-2">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="h-8 w-8 rounded" />
            <span className="font-bold text-sm">Virelle Studios</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/how-it-works")}>How It Works</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setLocation("/register")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center border-b border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Globe className="h-3.5 w-3.5" />
            Built for every type of creator
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Solutions for{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Every Creator
            </span>
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Whether you're an independent filmmaker, a brand agency, a music artist, or a production studio — Virelle has a workflow built for your specific production needs.
          </p>
        </div>
      </section>

      {/* Segments */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-16">
          {SEGMENTS.map((seg, i) => {
            const Icon = seg.icon;
            const colors = COLOR_MAP[seg.color];
            const isEven = i % 2 === 0;
            return (
              <div key={seg.id} id={seg.id} className={`flex flex-col ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 items-start`}>
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <span className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}>{seg.subtitle}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-4">{seg.title}</h2>
                  <p className="text-foreground/70 leading-relaxed mb-6">{seg.description}</p>

                  <div className="space-y-2.5 mb-6">
                    {seg.useCases.map((uc) => (
                      <div key={uc} className="flex items-start gap-2 text-sm text-foreground/70">
                        <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${colors.text}`} />
                        <span>{uc}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground/40">Recommended:</span>
                    <span className={`text-xs font-semibold ${seg.tierColor}`}>{seg.recommendedTier}</span>
                  </div>
                </div>

                {/* Workflow card */}
                <div className="lg:w-96 shrink-0">
                  <div className={`rounded-xl border ${colors.border} bg-card/40 p-6`}>
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mb-4">Typical Workflow</h4>
                    <div className="space-y-3">
                      {seg.workflow.split(" → ").map((step, si) => (
                        <div key={si} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${colors.bg} ${colors.text}`}>
                            {si + 1}
                          </div>
                          <span className="text-sm text-foreground/70 leading-relaxed">{step}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/40">
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                        onClick={() => setLocation("/register")}
                      >
                        Start This Workflow
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick navigation */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-center text-sm font-semibold text-foreground/40 uppercase tracking-widest mb-6">Jump to your use case</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {SEGMENTS.map((seg) => {
              const Icon = seg.icon;
              const colors = COLOR_MAP[seg.color];
              return (
                <button
                  key={seg.id}
                  onClick={() => {
                    document.getElementById(seg.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors ${colors.border} ${colors.text} hover:${colors.bg}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {seg.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Not sure which plan fits your workflow?</h2>
          <p className="text-foreground/60 mb-8">Talk to us. We'll help you find the right tier and workflow for your specific production needs.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12" onClick={() => setLocation("/pricing")}>
              View Pricing
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => setLocation("/contact")}>
              Talk to Us
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border/40 text-center">
        <p className="text-xs text-foreground/40">&copy; {new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
      </footer>
    </div>
  );
}
