import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, ChevronUp, ArrowRight, Clapperboard,
  CreditCard, Shield, Video, Mic, Globe, Zap, Users
} from "lucide-react";

const FAQ_CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: Clapperboard,
    questions: [
      {
        q: "What exactly is Virelle Studios?",
        a: "Virelle Studios is an AI film production platform. You can generate complete feature-length films from a written concept, or create individual VFX scenes to composite into a live-action production. The platform covers the full production pipeline: screenplay, storyboard, scene video generation, voice acting, soundtrack, subtitles, colour grading, and export.",
      },
      {
        q: "Do I need any filmmaking experience to use Virelle?",
        a: "No. Virelle is designed to work for both experienced filmmakers and first-time creators. If you have a story to tell, Virelle provides the tools to tell it. The AI adapts to your level of direction — you can be as detailed or as brief as you like.",
      },
      {
        q: "How long does it take to generate a film?",
        a: "A full 90-minute film typically takes 2–6 hours depending on the number of scenes, your chosen video provider, and how much you refine along the way. Individual scenes can be generated in 30–120 seconds. You don't have to generate everything at once — you can work scene by scene at your own pace.",
      },
      {
        q: "What is BYOK (Bring Your Own Key)?",
        a: "BYOK means you connect your own API account from a video generation provider (Runway, fal.ai, or Google Veo 3) to Virelle. When you generate a video, Virelle sends the request directly to your provider account — you pay your provider's rates directly, with no markup from Virelle. This keeps your video generation costs transparent and under your control. Virelle credits cover the platform's AI features (script writing, image generation, chat, analysis) separately.",
      },
      {
        q: "Which video generation providers does Virelle support?",
        a: "Virelle currently supports Runway Gen-4 (best for cinematic realism), fal.ai (fastest, best for high-volume workflows), and Google Veo 3.1 Preview (highest quality, native audio). You can switch between providers per project or per scene.",
      },
    ],
  },
  {
    id: "pricing-credits",
    label: "Pricing & Credits",
    icon: CreditCard,
    questions: [
      {
        q: "How does the credit system work?",
        a: "Credits are consumed when you use AI-powered features — generating a scene video, writing a script, generating preview images, using the Director's Assistant chat, etc. Each action has a fixed credit cost. Your membership includes a monthly credit allowance. You can also purchase additional credit packs at any time.",
      },
      {
        q: "What does each credit cost in real terms?",
        a: "On the Amateur tier ($5,000/year, 250 credits/month), each credit is worth approximately $1.67. On the Industry tier ($25,000/year, 10,000 credits/month), each credit is worth $0.21. Credit packs range from $2.50 to $5 per credit depending on pack size.",
      },
      {
        q: "Do unused credits roll over?",
        a: "Yes. Unused monthly credits roll over for 90 days. After 90 days, expired credits are removed from your balance.",
      },
      {
        q: "What is the Founding Director offer?",
        a: "The first 50 directors who join Virelle receive 50% off their first year's membership on any tier. This is a one-time offer available during the founding phase only. Spots are limited and shown in real time on the pricing page.",
      },
      {
        q: "Can I upgrade or downgrade my plan?",
        a: "Yes. You can upgrade at any time and the new tier takes effect immediately (prorated). Downgrades take effect at the start of your next billing cycle. Your credits are preserved when you change plans.",
      },
      {
        q: "Is there a free trial?",
        a: "Virelle does not currently offer a free tier, as the platform requires significant AI infrastructure to operate. However, the founding offer (50% off first year) is available while spots last. Contact us if you'd like to discuss a trial arrangement for a specific production.",
      },
    ],
  },
  {
    id: "ownership",
    label: "Ownership & Rights",
    icon: Shield,
    questions: [
      {
        q: "Who owns the content I generate on Virelle?",
        a: "You own everything you create on Virelle. All outputs — scripts, images, video clips, soundtracks, and assembled films — belong to you. Virelle claims no rights to content generated on your account.",
      },
      {
        q: "Can I use Virelle-generated content commercially?",
        a: "Yes. All membership tiers include commercial use rights. You can distribute, sell, license, broadcast, or monetise your Virelle-generated content without additional fees or permissions from Virelle.",
      },
      {
        q: "Are there any watermarks on exported content?",
        a: "No watermarks on any paid tier. All exported films, scenes, and assets are clean.",
      },
      {
        q: "What are the content restrictions?",
        a: "Virelle prohibits generation of content that is harmful, deceptive, sexually explicit, or infringes on third-party rights. Full details are in our Acceptable Use Policy and AI Content Policy. Violations result in account suspension.",
      },
      {
        q: "What happens to my projects if I cancel my membership?",
        a: "Your projects and generated assets remain accessible for 90 days after cancellation. You can export everything during this period. After 90 days, projects are archived and no longer accessible.",
      },
    ],
  },
  {
    id: "video-generation",
    label: "Video Generation",
    icon: Video,
    questions: [
      {
        q: "What resolution and frame rate can I generate at?",
        a: "Standard tiers support up to 1080p at 24/30fps. The Studio tier adds 2K support. The Industry tier supports 4K and ProRes export. Frame rate options depend on your connected video provider.",
      },
      {
        q: "How does character consistency work across scenes?",
        a: "Virelle maintains character descriptions, visual references, and style parameters across all scenes in a project. When generating a new scene, the system passes consistent character and visual context to the AI to maintain continuity. You can also upload reference photos for characters.",
      },
      {
        q: "Can I regenerate a single scene without redoing the whole film?",
        a: "Yes. You can regenerate any individual scene at any time without affecting other scenes. Credits are consumed per scene generation.",
      },
      {
        q: "What happens if a video generation fails?",
        a: "If a generation fails due to a provider error, your credits are refunded automatically. You can retry the generation immediately. Failures due to content policy violations are not refunded.",
      },
      {
        q: "Can I use my own footage alongside AI-generated scenes?",
        a: "Yes. The VFX Scene Studio mode is specifically designed for this workflow. You generate individual AI scenes and export them for compositing into your live-action edit in DaVinci Resolve, Premiere, or any NLE. The platform also supports uploading cast photos for character-matched generation.",
      },
    ],
  },
  {
    id: "audio",
    label: "Voice & Audio",
    icon: Mic,
    questions: [
      {
        q: "How does AI voice acting work?",
        a: "Virelle uses ElevenLabs for voice acting. Each character is assigned a voice profile based on their description. Dialogue is synthesised with emotion controls to match the scene's tone. You can preview and regenerate individual lines.",
      },
      {
        q: "Can I use my own voice recordings?",
        a: "Yes. You can upload your own audio files for any scene and they will be used in place of AI-generated voice acting.",
      },
      {
        q: "Is the film score original?",
        a: "Yes. The AI composes an original score for each scene based on the scene's mood, genre, and pacing. The score is not sourced from a library — it is generated specifically for your film.",
      },
      {
        q: "Are subtitles included?",
        a: "Yes. Virelle's AI Subtitle Generator creates subtitles from your film's dialogue in 40+ languages. Subtitles can be exported as SRT files or burned into the video.",
      },
    ],
  },
  {
    id: "teams",
    label: "Teams & Enterprise",
    icon: Users,
    questions: [
      {
        q: "Can multiple people work on the same project?",
        a: "Yes. From the Creator tier upward, you can invite team members to your projects. You can assign roles (viewer, editor, approver) and control who can generate, edit, or export.",
      },
      {
        q: "Is there an enterprise or custom pricing option?",
        a: "Yes. For production studios, agencies, or organisations with specific requirements — custom model fine-tuning, dedicated infrastructure, volume pricing, or white-label options — contact our enterprise team at the contact page.",
      },
      {
        q: "Does Virelle offer API access?",
        a: "Yes. The Studio and Industry tiers include API access for pipeline integration. You can trigger generation, retrieve assets, and manage projects programmatically.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        className="w-full flex items-start justify-between gap-4 py-5 text-left hover:text-amber-400 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm leading-relaxed">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
          : <ChevronDown className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40" />
        }
      </button>
      {open && (
        <div className="pb-5 text-sm text-foreground/65 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState("getting-started");

  const activeSection = FAQ_CATEGORIES.find(c => c.id === activeCategory)!;

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
            <Button variant="ghost" size="sm" onClick={() => setLocation("/how-it-works")}>How It Works</Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/pricing")}>Pricing</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => setLocation("/register")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 text-center border-b border-border/40">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          <p className="text-foreground/60 leading-relaxed">
            Everything you need to know about Virelle Studios — pricing, credits, ownership, video generation, and more.
          </p>
        </div>
      </section>

      {/* FAQ Body */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Category Sidebar */}
            <div className="lg:w-56 shrink-0">
              <div className="sticky top-24 space-y-1">
                {FAQ_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                        activeCategory === cat.id
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "text-foreground/60 hover:text-foreground hover:bg-card/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const Icon = activeSection.icon;
                  return <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Icon className="h-4 w-4 text-amber-400" /></div>;
                })()}
                <h2 className="text-xl font-bold">{activeSection.label}</h2>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/40 px-6">
                {activeSection.questions.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-foreground/60 mb-6">Our team is available to answer any questions about the platform, pricing, or your specific production needs.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 h-12" onClick={() => setLocation("/contact")}>
              Contact Us
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => setLocation("/how-it-works")}>
              How It Works
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
