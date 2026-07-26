import { useAuth } from "@/_core/hooks/useAuth";
import GoldWatermark from "@/components/GoldWatermark";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { VirelleCinemaIconKey } from "@/constants/virelleCinemaIcons";
import {
  ArrowRight,
  Check,
  ChevronDown,
  KeyRound,
  LogIn,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "/virelle-logo-square.png";

type Stage = {
  icon: VirelleCinemaIconKey;
  number: string;
  title: string;
  description: string;
  tools: string;
};

type Pillar = {
  icon: VirelleCinemaIconKey;
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  cta: string;
  href: string;
};

const STAGES: Stage[] = [
  {
    icon: "scripts",
    number: "01",
    title: "Pre-Production",
    description:
      "Develop the screenplay, characters, casting, locations, wardrobe, visual language, budget and schedule before expensive production decisions are made.",
    tools: "Scripts · Casting · Storyboards · Locations · Budgets",
  },
  {
    icon: "scenes",
    number: "02",
    title: "Production",
    description:
      "Build scenes, performances, voices and shot sequences in one controlled project workspace while preserving character and visual continuity.",
    tools: "Scenes · Multi-shot · Voice · Continuity · Render",
  },
  {
    icon: "editing",
    number: "03",
    title: "Post-Production",
    description:
      "Move approved material into editing, VFX, colour, sound, music, dubbing, accessibility, trailers, posters and professional delivery packages.",
    tools: "Edit · VFX · Sound · Music · Dubbing · Delivery",
  },
  {
    icon: "reports",
    number: "04",
    title: "Funding",
    description:
      "Prepare a reusable funding profile, identify relevant opportunities, build applications, organise pitch materials and track deadlines and outcomes.",
    tools: "Matches · Applications · Crowdfunding · Incentives",
  },
];

const PILLARS: Pillar[] = [
  {
    icon: "studio",
    eyebrow: "Film production",
    title: "One production system from first idea to final master.",
    description:
      "Virelle replaces disconnected writing, planning, generation and finishing tools with one project record. Creative decisions, assets and approvals stay attached to the film instead of disappearing across separate apps.",
    benefits: [
      "Four-stage workflow built around how films are actually made",
      "Character, wardrobe, location and visual continuity controls",
      "Professional planning, production and post-production surfaces",
      "BYOK support keeps external AI-provider spending under your control",
    ],
    cta: "Start a film project",
    href: "/register",
  },
  {
    icon: "reports",
    eyebrow: "Project funding",
    title: "Turn the creative project into a fundable production case.",
    description:
      "The Funding Command Centre connects project facts, eligibility matching, applications, pitch materials, tax incentives and crowdfunding so the finance plan develops alongside the film.",
    benefits: [
      "Reusable master funding profile and project-data prefill",
      "Transparent funding matches and eligibility warnings",
      "Application drafts, exports, deadlines and status tracking",
      "Crowdfunding planning, reward tiers and campaign readiness",
    ],
    cta: "Explore funding tools",
    href: "/funding",
  },
];

const PRICING_TIERS = [
  {
    name: "Indie",
    price: "A$149",
    cadence: "/month",
    credits: "700 monthly credits",
    audience: "Solo filmmakers and smaller productions",
    features: [
      "2 active projects",
      "Planning and Director AI",
      "720p export",
      "60 managed minutes",
    ],
  },
  {
    name: "Creator",
    price: "A$490",
    cadence: "/month",
    credits: "3,000 monthly credits",
    audience: "Independent producers creating commercial work",
    features: [
      "10 active projects",
      "Voice, scoring and continuity",
      "1080p export",
      "180 managed minutes",
    ],
    featured: true,
  },
  {
    name: "Industry",
    price: "A$1,490",
    cadence: "/month",
    credits: "9,000 monthly credits",
    audience: "Studios and repeat production pipelines",
    features: [
      "25 active projects",
      "Full post-production suite",
      "4K and ProRes",
      "5 team members",
    ],
  },
] as const;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryDestination = user ? "/" : "/register";
  const adultDestination = user
    ? "/virelle-broadcast-render?adult=1"
    : "/register";

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setMobileMenuOpen(false);
  };

  const openRoute = (path: string) => {
    setMobileMenuOpen(false);
    setLocation(path);
  };

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-white selection:bg-amber-500/30"
      style={{
        background:
          "radial-gradient(circle at 50% 8%, rgba(212,175,55,0.18), transparent 30%), linear-gradient(135deg,#06060b 0%,#0b0a16 55%,#060609 100%)",
      }}
    >
      <SiteHead
        title="Professional filmmaking and funding in one studio"
        description="Virelle Studios connects pre-production, production, post-production, project funding, crowdfunding and designer assets in one professional filmmaking workspace."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Virelle Studios",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "149",
            priceCurrency: "AUD",
          },
          description:
            "Professional filmmaking, production management and project funding platform",
        }}
      />

      {/* Keep the existing official watermark and logo unchanged. */}
      <GoldWatermark />

      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? "border-amber-500/20 bg-[#050507]/95 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
            : "border-transparent bg-[#050507]/78 py-3.5 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            onClick={() => setLocation("/")}
          >
            <img
              src={LOGO_URL}
              alt="Virelle Studios"
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <span className="hidden truncate text-lg font-black uppercase italic tracking-tighter sm:block">
              Virelle <span className="text-amber-400">Studios</span>
            </span>
          </button>

          <div className="hidden items-center gap-1 lg:flex">
            {[
              ["How it works", "workflow"],
              ["Filmmaking", "filmmaking"],
              ["Funding", "funding"],
              ["Designers", "specialist"],
              ["Pricing", "pricing"],
            ].map(([label, id]) => (
              <button
                key={id}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white"
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white"
              onClick={() => setLocation("/showcase")}
            >
              Showcase
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!user && (
              <Button
                variant="outline"
                className="hidden min-h-10 rounded-xl border-amber-400/35 bg-black/55 px-4 font-semibold text-amber-100 shadow-[inset_0_0_20px_rgba(212,175,55,0.04)] hover:border-amber-300/60 hover:bg-amber-500/10 hover:text-white sm:flex"
                onClick={() => setLocation("/login")}
              >
                <LogIn className="mr-2 h-4 w-4 text-amber-300" />
                Sign in
              </Button>
            )}
            <Button
              className="hidden min-h-10 rounded-xl border border-amber-200/30 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 px-5 font-black text-black shadow-[0_10px_35px_rgba(245,158,11,0.24)] hover:from-amber-200 hover:to-orange-400 sm:flex"
              onClick={() => setLocation(primaryDestination)}
            >
              {user ? "Open studio" : "Create your studio"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!user && (
              <Button
                size="sm"
                className="min-h-10 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 font-black text-black shadow-lg shadow-amber-950/30 sm:hidden"
                onClick={() => setLocation("/register")}
              >
                Join
              </Button>
            )}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/85 transition-colors hover:border-amber-400/30 hover:bg-amber-500/10 lg:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-amber-500/15 bg-[#050507]/98 px-4 py-4 shadow-2xl lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1">
              {[
                ["How it works", "workflow"],
                ["Filmmaking", "filmmaking"],
                ["Funding", "funding"],
                ["Designer Marketplace", "specialist"],
                ["Pricing", "pricing"],
              ].map(([label, id]) => (
                <button
                  key={id}
                  className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white"
                  onClick={() => scrollToSection(id)}
                >
                  {label}
                </button>
              ))}
              <button
                className="rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/80 hover:bg-white/[0.06] hover:text-white"
                onClick={() => openRoute("/showcase")}
              >
                Film Showcase
              </button>
              {!user && (
                <Button
                  variant="outline"
                  className="mt-2 min-h-11 border-amber-400/30 bg-black/60 text-amber-100"
                  onClick={() => openRoute("/login")}
                >
                  <LogIn className="mr-2 h-4 w-4" /> Sign in
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="relative z-10">
        <section className="flex min-h-[92vh] items-center px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-black/62 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200 shadow-lg shadow-black/20 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                Film production and funding, connected
              </div>
              <div className="space-y-5 rounded-[2rem] border border-white/8 bg-[#08080d]/88 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                <h1 className="max-w-5xl text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                  Build the film.
                  <br />
                  <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                    Build the case to fund it.
                  </span>
                </h1>
                <p className="max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
                  Virelle Studios brings pre-production, production,
                  post-production and project funding into one professional
                  workspace. Develop the creative project, preserve continuity,
                  prepare applications and manage the path to release without
                  rebuilding the same information in separate systems.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="min-h-13 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 px-7 text-base font-black text-black shadow-[0_18px_50px_rgba(245,158,11,0.25)] hover:from-amber-200 hover:to-orange-400"
                    onClick={() => setLocation(primaryDestination)}
                  >
                    {user ? "Open production workspace" : "Start creating"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-13 rounded-xl border-white/15 bg-black/65 px-7 text-base font-semibold text-white hover:border-amber-400/35 hover:bg-amber-500/10"
                    onClick={() => scrollToSection("workflow")}
                  >
                    See how it works
                    <ChevronDown className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/62">
                  {[
                    "Four-stage workflow",
                    "Funding Command Centre",
                    "Designer assets",
                    "BYOK control",
                  ].map((item) => (
                    <span key={item} className="inline-flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-amber-400" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Card className="border-amber-400/20 bg-[#09090e]/92 text-white shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              <CardContent className="space-y-5 p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
                    <HollywoodIcon icon="projects" size={38} alt="Virelle project" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/70">
                      One project record
                    </div>
                    <h2 className="mt-1 text-xl font-bold">
                      Every stage works from the same film.
                    </h2>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STAGES.map((stage) => (
                    <div
                      key={stage.title}
                      className="rounded-xl border border-white/8 bg-black/46 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <HollywoodIcon icon={stage.icon} size={27} alt={stage.title} />
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/60">
                            Stage {stage.number}
                          </div>
                          <div className="font-semibold">{stage.title}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-7 text-white/66">
                  Information entered once can support production planning,
                  funding applications, pitch materials, crowdfunding and final
                  delivery instead of being repeatedly copied between products.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/8 bg-[#08080d]/94 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/70">
                A clear filmmaker journey
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Four stages. One connected production.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
                Virelle groups the platform around the real stages of filmmaking,
                reducing navigation clutter and keeping each tool in a predictable
                production context.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {STAGES.map((stage) => (
                <article
                  key={stage.title}
                  className="min-h-[300px] rounded-2xl border border-white/9 bg-black/58 p-5 shadow-lg shadow-black/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
                      <HollywoodIcon icon={stage.icon} size={36} alt={stage.title} />
                    </div>
                    <span className="text-3xl font-black text-white/12">{stage.number}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-amber-300">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/70">{stage.description}</p>
                  <p className="mt-5 border-t border-white/8 pt-4 text-[11px] font-semibold leading-5 text-white/48">
                    {stage.tools}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {PILLARS.map((pillar, index) => (
          <section
            key={pillar.eyebrow}
            id={index === 0 ? "filmmaking" : "funding"}
            className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8"
          >
            <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/8 bg-[#08080d]/94 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:p-12">
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/12 via-black/48 to-black/72 p-8">
                <HollywoodIcon icon={pillar.icon} size={150} alt={pillar.eyebrow} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/70">
                  {pillar.eyebrow}
                </div>
                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {pillar.title}
                </h2>
                <p className="mt-4 text-sm leading-8 text-white/72 sm:text-base">
                  {pillar.description}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {pillar.benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/44 p-3 text-sm leading-6 text-white/72"
                    >
                      <Check className="mt-1 h-4 w-4 shrink-0 text-amber-400" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-7 min-h-11 rounded-xl bg-amber-400 px-6 font-black text-black hover:bg-amber-300"
                  onClick={() => setLocation(user ? pillar.href : "/register")}
                >
                  {pillar.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        ))}

        <section id="specialist" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/8 bg-[#08080d]/94 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9 lg:p-12">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="border-amber-400/18 bg-black/58 text-white">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
                      <HollywoodIcon icon="wardrobe" size={38} alt="Designer wardrobe" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">
                        Designer Marketplace
                      </div>
                      <h2 className="mt-2 text-2xl font-black">
                        Source wardrobe and production assets from designers.
                      </h2>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-white/70">
                    Filmmakers can discover, license and organise designer wardrobe
                    inside the production workflow. Designers receive a dedicated
                    studio for listings, inventory and filmmaker enquiries.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      className="bg-amber-400 font-bold text-black hover:bg-amber-300"
                      onClick={() => setLocation(user ? "/designer-wardrobe" : "/register")}
                    >
                      Explore designer assets
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/15 bg-black/45 text-white hover:bg-white/8"
                      onClick={() => setLocation("/designer-register")}
                    >
                      Join as a designer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-black/58 text-white">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.04]">
                      <HollywoodIcon icon="support" size={38} alt="Verified access" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300/70">
                        Separate verified workspace
                      </div>
                      <h2 className="mt-2 text-2xl font-black">Adult Studio — verified 18+ access only.</h2>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-white/70">
                    Adult Studio is isolated from the standard filmmaking workspace.
                    Entry requires an active membership, adult declaration, phone
                    verification, government ID, matching cardholder name and consent
                    acknowledgements before any adult tools or channel controls appear.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6 border-amber-400/28 bg-amber-500/8 text-amber-100 hover:bg-amber-500/14"
                    onClick={() => setLocation(adultDestination)}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {user ? "Open verification process" : "Create account to verify"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/8 bg-[#08080d]/96 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-9 lg:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300/70">
                Membership pricing
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Choose the production capacity you need.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/68 sm:text-base">
                Plans include monthly Virelle credits. External video-generation
                provider charges are separate and remain under your control through BYOK.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <Card
                  key={tier.name}
                  className={`relative overflow-hidden text-white ${
                    tier.featured
                      ? "border-amber-400/50 bg-gradient-to-b from-amber-500/12 to-black/72 shadow-[0_22px_70px_rgba(245,158,11,0.14)]"
                      : "border-white/10 bg-black/58"
                  }`}
                >
                  {tier.featured && (
                    <div className="bg-gradient-to-r from-amber-300 to-orange-500 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-black">
                      Most popular
                    </div>
                  )}
                  <CardContent className="p-6 sm:p-7">
                    <h3 className="text-xl font-black text-amber-300">{tier.name}</h3>
                    <p className="mt-2 min-h-10 text-sm leading-6 text-white/60">
                      {tier.audience}
                    </p>
                    <div className="mt-5 flex items-end gap-1">
                      <span className="text-4xl font-black tracking-tight">{tier.price}</span>
                      <span className="pb-1 text-sm text-white/48">{tier.cadence}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-amber-200/72">{tier.credits}</p>
                    <div className="mt-6 space-y-3">
                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-white/72">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`mt-7 w-full min-h-11 font-black ${
                        tier.featured
                          ? "bg-amber-400 text-black hover:bg-amber-300"
                          : "border border-amber-400/25 bg-amber-500/8 text-amber-100 hover:bg-amber-500/14"
                      }`}
                      onClick={() => setLocation(user ? "/subscription" : "/register")}
                    >
                      Choose {tier.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-white/8 bg-black/42 p-4 text-center text-xs leading-6 text-white/54">
              Additional Virelle credit packs, broadcast-minute packs, cast licences,
              designer assets and film packages are optional in-app purchases. See the
              complete pricing page for current allowances and purchase terms.
            </div>
            <div className="mt-5 text-center">
              <Button
                variant="outline"
                className="border-white/15 bg-black/50 text-white hover:border-amber-400/30 hover:bg-amber-500/10"
                onClick={() => setLocation("/pricing")}
              >
                View complete pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-amber-400/22 bg-[#09090e]/96 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
              <HollywoodIcon icon="studio" size={45} alt="Virelle Studios" />
            </div>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-5xl">
              Bring the creative and financial production into one studio.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
              Start with the project you are making now. Add advanced production,
              funding, designer and specialist tools as the film progresses.
            </p>
            <Button
              size="lg"
              className="mt-7 min-h-13 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-8 text-base font-black text-black hover:from-amber-200 hover:to-orange-400"
              onClick={() => setLocation(primaryDestination)}
            >
              {user ? "Open Virelle Studios" : "Create your Virelle studio"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
      </main>

      <div className="relative z-10 border-t border-white/8 bg-[#050507]/96 px-4 py-8">
        <LeegoFooterLaunch />
      </div>
    </div>
  );
}
