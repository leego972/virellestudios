import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, CheckCircle2, Film, Sparkles, FileText, Image,
  Video, Music, Download, Users, Clock, Shield, RefreshCw,
  Layers, Mic, Clapperboard, Play, Star, ChevronRight,
  BookOpen, Palette, Wand2, Globe
} from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Write Your Concept",
    description: "Start with a title, genre, and a short description of your film or scene. You can be as detailed or as brief as you like — Virelle's AI adapts to your level of direction.",
    details: [
      "Describe your story in plain language — no technical knowledge required",
      "Set genre, tone, rating, and target duration",
      "Define characters with names, descriptions, and personality traits",
      "Specify visual style, colour palette, and cinematic references",
    ],
    icon: FileText,
    color: "amber",
    time: "5–15 minutes",
  },
  {
    number: "02",
    title: "AI Generates Your Screenplay",
    description: "Virelle's AI Script Writer breaks your concept into a full screenplay — scenes, dialogue, stage directions, and character arcs — all faithful to your original vision.",
    details: [
      "Full scene-by-scene breakdown with descriptions",
      "Dialogue written in your characters' voices",
      "Scene transitions, pacing, and emotional beats",
      "Edit any scene, line, or direction before proceeding",
    ],
    icon: BookOpen,
    color: "amber",
    time: "1–3 minutes",
  },
  {
    number: "03",
    title: "Visual Development",
    description: "Generate cinematic preview images for every scene. Adjust lighting, camera angle, mood, weather, and colour grade until each frame matches your vision exactly.",
    details: [
      "DALL-E 3 HD preview images per scene",
      "Full art direction controls: lens, angle, depth of field",
      "Mood board generation for overall visual language",
      "Storyboard export for pre-production review",
    ],
    icon: Image,
    color: "purple",
    time: "2–5 minutes per scene",
  },
  {
    number: "04",
    title: "Generate Scene Videos",
    description: "Convert each scene into a cinematic video clip using your choice of AI video provider — Runway, fal.ai, or Google Veo 3. Each clip is generated to your exact specifications.",
    details: [
      "Choice of Runway Gen-4, fal.ai, or Google Veo 3",
      "Bring your own API keys — your generation costs, your control",
      "Up to 4K resolution, 24/30/60fps",
      "Scene-to-scene character and visual continuity",
    ],
    icon: Video,
    color: "blue",
    time: "30–120 seconds per scene",
  },
  {
    number: "05",
    title: "Voice Acting & Soundtrack",
    description: "Every line of dialogue is performed by AI voice actors matched to your characters. An original film score is composed and mixed to match the emotional arc of every scene.",
    details: [
      "AI voice acting via ElevenLabs with emotion control",
      "Original soundtrack composed per scene",
      "Sound effects library with AI-generated custom SFX",
      "Full audio mix with dialogue, music, and effects",
    ],
    icon: Music,
    color: "green",
    time: "Automated",
  },
  {
    number: "06",
    title: "Review, Refine & Export",
    description: "Watch your completed film in the Virelle player. Regenerate any scene, adjust dialogue, re-score a sequence, or export individual scenes for further editing in your NLE.",
    details: [
      "Full film playback in the Virelle Studio player",
      "Regenerate individual scenes without redoing the whole film",
      "Export to MP4, ProRes, or DaVinci Resolve timeline",
      "Subtitle generation in 40+ languages",
    ],
    icon: Download,
    color: "amber",
    time: "As long as you need",
  },
];

const DELIVERABLES = [
  { icon: FileText, label: "Full Screenplay", desc: "PDF-ready script with scene headings, action lines, and dialogue" },
  { icon: Image, label: "Scene Storyboard", desc: "HD preview images for every scene, exportable as a PDF storyboard" },
  { icon: Video, label: "Scene Video Clips", desc: "Individual MP4 clips for every scene at your chosen resolution" },
  { icon: Film, label: "Assembled Film", desc: "Complete film with all scenes stitched, audio mixed, and titles applied" },
  { icon: Music, label: "Original Soundtrack", desc: "AI-composed score matched to your film's emotional arc" },
  { icon: Mic, label: "Voice Acting Tracks", desc: "Individual character audio files for all dialogue" },
  { icon: Clapperboard, label: "Trailer", desc: "Cinematic trailer cut from your best scenes with title cards" },
  { icon: Layers, label: "Shot List & Credits", desc: "Production-ready shot list and formatted credits roll" },
];

const OWNERSHIP = [
  {
    title: "You own everything you create",
    desc: "All outputs — scripts, images, video clips, soundtracks, and assembled films — are yours. Virelle does not claim any rights to content generated on your account.",
    icon: Shield,
  },
  {
    title: "Commercial use is included",
    desc: "All membership tiers include commercial use rights. You can distribute, sell, license, or broadcast your Virelle-generated content without additional fees.",
    icon: Globe,
  },
  {
    title: "Your API keys, your costs",
    desc: "Virelle uses a BYOK (Bring Your Own Key) model for video generation. Your Runway, fal.ai, or Google Veo 3 API keys are used directly — Virelle never marks up your generation costs.",
    icon: Star,
  },
  {
    title: "Revision policy",
    desc: "You can regenerate any scene, rewrite any dialogue, or re-score any sequence at any time. Credits are consumed per generation — unused credits roll over for 90 days.",
    icon: RefreshCw,
  },
];

const WORKFLOWS = [
  {
    title: "Self-Directed",
    desc: "You control every decision. Virelle executes your instructions precisely — no unsolicited creative changes.",
    icon: Wand2,
    color: "amber",
  },
  {
    title: "AI-Assisted",
    desc: "Grant creative leeway and Virelle's AI acts as a co-director — suggesting scene improvements, visual upgrades, and pacing adjustments.",
    icon: Sparkles,
    color: "purple",
  },
  {
    title: "Team Collaboration",
    desc: "Invite team members to your projects. Assign roles, review scenes, and approve outputs before generation.",
    icon: Users,
    color: "blue",
  },
];

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/welcome")} className="flex items-center gap-2">
            <img src="/vs-watermark.png" alt="Virelle Studios" className="h-8 w-8 rounded" />
            <span className="font-bold text-sm">Virelle Studios</span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setLocation("/register")}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center border-b border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
            <Clapperboard className="h-3.5 w-3.5" />
            From concept to finished film
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            How Virelle{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Works
            </span>
          </h1>
          <p className="text-lg text-foreground/70 leading-relaxed mb-8">
            A professional AI-assisted production workflow — from your first idea to a finished, distributable film. Every step is under your direction.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-400" /> Full film in hours, not months</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-amber-400" /> You own all outputs</span>
            <span className="flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-amber-400" /> Regenerate anything, anytime</span>
          </div>
        </div>
      </section>

      {/* Step-by-Step Workflow */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-4">The Production Pipeline</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Six stages from concept to finished film. You control the pace — move through stages in sequence or jump back to refine any step.</p>
          </div>
          <div className="space-y-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const colorMap: Record<string, string> = {
                amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
                purple: "text-purple-400 bg-purple-500/10 border-purple-500/30",
                blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
                green: "text-green-400 bg-green-500/10 border-green-500/30",
              };
              const badgeColor: Record<string, string> = {
                amber: "bg-amber-500/20 text-amber-300",
                purple: "bg-purple-500/20 text-purple-300",
                blue: "bg-blue-500/20 text-blue-300",
                green: "bg-green-500/20 text-green-300",
              };
              return (
                <div key={step.number} className="flex gap-6 group">
                  {/* Step number + connector */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${colorMap[step.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="w-px flex-1 mt-2 bg-border/40" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-8 flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest">{step.number}</span>
                      <h3 className="text-xl font-bold">{step.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor[step.color]}`}>
                        <Clock className="h-3 w-3 inline mr-1" />{step.time}
                      </span>
                    </div>
                    <p className="text-foreground/70 mb-4 leading-relaxed">{step.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {step.details.map((d) => (
                        <div key={d} className="flex items-start gap-2 text-sm text-foreground/60">
                          <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Modes */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Three Ways to Direct</h2>
            <p className="text-foreground/60">Choose how much creative control you hand to the AI — or keep it all yourself.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {WORKFLOWS.map((w) => {
              const Icon = w.icon;
              const colorMap: Record<string, string> = {
                amber: "text-amber-400 bg-amber-500/10",
                purple: "text-purple-400 bg-purple-500/10",
                blue: "text-blue-400 bg-blue-500/10",
              };
              return (
                <Card key={w.title} className="bg-card/50 border-border/50">
                  <CardContent className="p-6">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colorMap[w.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold mb-2">{w.title}</h3>
                    <p className="text-sm text-foreground/60 leading-relaxed">{w.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What You Receive</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Every project produces a full suite of production-ready assets — not just video clips.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DELIVERABLES.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="p-5 rounded-xl border border-border/50 bg-card/40 hover:border-amber-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3">
                    <Icon className="h-4.5 w-4.5 text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{d.label}</h4>
                  <p className="text-xs text-foreground/55 leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ownership & Rights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card/30 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Ownership & Rights</h2>
            <p className="text-foreground/60 max-w-xl mx-auto">Clear, simple policies on what you own and what you can do with it.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {OWNERSHIP.map((o) => {
              const Icon = o.icon;
              return (
                <div key={o.title} className="flex gap-4 p-6 rounded-xl border border-border/50 bg-card/40">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1.5">{o.title}</h4>
                    <p className="text-sm text-foreground/60 leading-relaxed">{o.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BYOK Explanation */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 sm:p-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Palette className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">How BYOK Works</h3>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  Virelle uses a <strong>Bring Your Own Key</strong> model for AI video generation. You connect your own Runway, fal.ai, or Google Veo 3 API account in Settings. When you generate a video, Virelle sends the request directly to your API account — you pay your provider's rates, not ours.
                </p>
                <p className="text-foreground/70 leading-relaxed mb-4">
                  This means your video generation costs are transparent, predictable, and never marked up. Virelle credits cover the platform's AI features — script writing, image generation, chat, analysis — not the video generation itself.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {[
                    { label: "Runway Gen-4", desc: "Best for cinematic realism and motion quality" },
                    { label: "fal.ai", desc: "Fastest generation, best for high-volume workflows" },
                    { label: "Google Veo 3", desc: "Highest quality, native audio, best for premium output" },
                  ].map((p) => (
                    <div key={p.label} className="p-4 rounded-lg bg-background/60 border border-border/50">
                      <p className="font-semibold text-sm mb-1">{p.label}</p>
                      <p className="text-xs text-foreground/55">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center border-t border-border/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to start your first film?</h2>
          <p className="text-foreground/60 mb-8">Choose a plan, connect your API keys, and generate your first scene in under 10 minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12" onClick={() => setLocation("/register")}>
              Start Creating
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => setLocation("/pricing")}>
              View Pricing
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/40 text-center">
        <p className="text-xs text-foreground/40">&copy; {new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
      </footer>
    </div>
  );
}
