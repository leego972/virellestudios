import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Film, Sparkles, Shield, Globe, Zap,
  Target, Eye, Heart, Star, ChevronRight, Users,
  Clapperboard, Award, Lightbulb, Code2
} from "lucide-react";

const VALUES = [
  {
    icon: Target,
    title: "Director First",
    desc: "The AI executes your vision — it never overrides it. Every generation is faithful to your instructions unless you explicitly grant creative freedom.",
  },
  {
    icon: Eye,
    title: "Cinematic Standard",
    desc: "Every tool in Virelle is built to professional production standards. We don't build novelty features — we build production infrastructure.",
  },
  {
    icon: Shield,
    title: "Transparent Ownership",
    desc: "You own everything you create. No hidden rights claims, no watermarks on paid tiers, no licensing surprises.",
  },
  {
    icon: Zap,
    title: "Speed Without Compromise",
    desc: "A full feature film in hours instead of months. We refuse to sacrifice quality for speed — Virelle delivers both.",
  },
  {
    icon: Heart,
    title: "Built for Creators",
    desc: "Virelle was built by filmmakers and engineers who believe great storytelling should not be gated by budget or crew size.",
  },
  {
    icon: Globe,
    title: "Global Creative Access",
    desc: "A filmmaker in Lagos, a brand team in Seoul, a music artist in São Paulo — Virelle gives every creator access to Hollywood-level production tools.",
  },
];

const METHODOLOGY = [
  {
    step: "01",
    title: "Concept Development",
    desc: "Your story idea is developed into a structured screenplay with scenes, characters, and dialogue — all under your creative direction.",
  },
  {
    step: "02",
    title: "Visual Development",
    desc: "Each scene is visualised through AI-generated storyboard frames with precise art direction controls for lighting, camera, and mood.",
  },
  {
    step: "03",
    title: "Generation & Production",
    desc: "Scene videos are generated using your connected AI video provider. Virelle manages prompt engineering, continuity, and quality control.",
  },
  {
    step: "04",
    title: "Post-Production",
    desc: "Voice acting, soundtrack, sound effects, subtitles, and colour grading are applied. The film is assembled and exported in your chosen format.",
  },
  {
    step: "05",
    title: "Delivery & Distribution",
    desc: "Export your finished film, trailer, or individual scenes. Distribute directly, or use Virelle's showcase and campaign tools to reach your audience.",
  },
];

const CAPABILITIES = [
  { label: "AI Video Providers", value: "Runway, fal.ai, Google Veo 3" },
  { label: "AI Language Models", value: "GPT-4.1, Gemini 2.5 Flash" },
  { label: "Image Generation", value: "DALL-E 3 HD" },
  { label: "Voice Acting", value: "ElevenLabs (30+ voices)" },
  { label: "Export Formats", value: "MP4, ProRes, DaVinci Resolve" },
  { label: "Supported Languages", value: "40+ for subtitles" },
  { label: "Max Film Duration", value: "Up to 180 minutes (Industry tier)" },
  { label: "Max Resolution", value: "4K (Industry tier)" },
];

export default function About() {
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
            <Clapperboard className="h-3.5 w-3.5" />
            Our Studio
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Built for{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Directors
            </span>
            , Not Demos
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Virelle Studios is an AI film production platform built on a single conviction: every filmmaker — regardless of budget, crew, or studio backing — deserves access to professional-grade production tools.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                The Studio Behind{" "}
                <span className="text-amber-400">the Studio</span>
              </h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                Virelle was founded with a straightforward mission: collapse the gap between a filmmaker's imagination and what they can actually produce. The traditional film production stack — pre-production, casting, location scouting, shooting, VFX, post — requires teams, budgets, and timelines that exclude most of the world's storytellers.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-4">
                AI changes that equation. Not by replacing human creativity, but by removing the infrastructure barriers that prevent it from reaching the screen.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-6">
                Virelle is not a content generator. It is a production platform — built with the same discipline, structure, and quality standards as a professional studio workflow, powered by the best available AI models, and designed to execute the director's vision with precision.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => setLocation("/how-it-works")} variant="outline" className="h-10">
                  How It Works
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Film, label: "Films Created", value: "1,000+" },
                { icon: Users, label: "Active Directors", value: "500+" },
                { icon: Globe, label: "Countries", value: "40+" },
                { icon: Award, label: "Founding Year", value: "2025" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="p-6 rounded-xl border border-border/50 bg-card/40 text-center">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{s.value}</p>
                    <p className="text-xs text-foreground/55 mt-1">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What We Stand For</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">The principles that guide every decision in how Virelle is built and operated.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => {
              const Icon = v.icon;
              return (
                <div key={v.title} className="p-6 rounded-xl border border-border/50 bg-card/40 hover:border-amber-500/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <h3 className="font-bold mb-2">{v.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Production Methodology */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Production Methodology</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Virelle follows a structured five-stage production pipeline — the same sequence used in professional film production, powered by AI at every stage.</p>
          </div>
          <div className="space-y-4">
            {METHODOLOGY.map((m, i) => (
              <div key={m.step} className="flex gap-5 p-6 rounded-xl border border-border/50 bg-card/40 hover:border-amber-500/20 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-amber-400">{m.step}</span>
                </div>
                <div>
                  <h3 className="font-bold mb-1">{m.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Capabilities */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Technical Capabilities</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">The AI infrastructure powering Virelle's production pipeline.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="p-5 rounded-xl border border-border/50 bg-card/40">
                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">{c.label}</p>
                <p className="text-sm font-medium text-foreground/90">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Ethics */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8 sm:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Lightbulb className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Our Position on AI and Creative Work</h3>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  Virelle is built on the belief that AI is a production tool — not a replacement for human creative direction. Every film made on Virelle is the product of a director's vision. The AI executes; the director decides.
                </p>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  We operate under a strict content policy that prohibits the generation of harmful, deceptive, or rights-infringing material. All generated content is subject to our Acceptable Use Policy, which is enforced at the platform level.
                </p>
                <p className="text-foreground/70 leading-relaxed">
                  We are committed to transparency about what AI can and cannot do, and we update our models and policies as the technology and regulatory landscape evolves.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setLocation("/ai-content-policy")}>AI Content Policy</Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/acceptable-use")}>Acceptable Use</Button>
              <Button variant="outline" size="sm" onClick={() => setLocation("/privacy")}>Privacy Policy</Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center border-t border-border/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Join the founding directors</h2>
          <p className="text-foreground/60 mb-8">Virelle is in its founding phase. The first 50 directors who join get half price on their first year's membership.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12" onClick={() => setLocation("/register")}>
              Claim Your Spot
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
