import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import SiteHead from "@/components/SiteHead";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Film,
  KeyRound,
  LockKeyhole,
  Menu,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const LOGO_URL = "/virelle-logo-square.png";

const PRODUCT_AREAS = [
  {
    icon: Film,
    title: "AI Film Production",
    description:
      "Develop scripts, characters, scenes, voice, music, trailers, posters and final production assets inside one controlled workflow.",
    href: "/register",
    cta: "Start a production",
  },
  {
    icon: Wand2,
    title: "VFX & Swappys",
    description:
      "Create controlled transformations, maintain character continuity and hand approved outputs directly into Studio Render or Broadcast.",
    href: "/register",
    cta: "Explore the studio",
  },
  {
    icon: RadioTower,
    title: "Broadcast",
    description:
      "Configure standard or AI-assisted broadcasts. Plain broadcasting does not require an AI provider key; AI-assisted processing uses your funded BYOK provider.",
    href: "/virelle-broadcast-render",
    cta: "Open Broadcast",
  },
  {
    icon: LockKeyhole,
    title: "Verified Adult Studio",
    description:
      "A separate 18+ production environment with identity controls, consent safeguards, recorded broadcasting and private compliance retention.",
    href: "/virelle-broadcast-render?adult=1",
    cta: "View Adult Studio",
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

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white selection:bg-amber-500/30"
      style={{
        background:
          "radial-gradient(circle at 50% 12%, rgba(212,175,55,0.16), transparent 34%), linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)",
      }}
    >
      <SiteHead
        title="The unified AI film production studio"
        description="Virelle Studios connects film development, VFX, AI-assisted broadcast and verified adult production in one professional workflow."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Virelle Studios",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "149", priceCurrency: "AUD" },
          description: "Unified AI film production and broadcast platform",
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center">
        <img
          src={LOGO_URL}
          alt=""
          className="h-[430px] w-[430px] object-contain opacity-[0.055] sm:h-[620px] sm:w-[620px]"
          draggable={false}
        />
      </div>

      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all ${
          isScrolled
            ? "border-amber-500/20 bg-black/90 py-3 backdrop-blur-xl"
            : "border-transparent bg-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex items-center gap-2.5"
            onClick={() => setLocation("/")}
          >
            <img src={LOGO_URL} alt="Virelle Studios" className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-black uppercase italic tracking-tighter">
              Virelle <span className="text-amber-400">Studios</span>
            </span>
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <button className="text-sm font-semibold text-white/60 hover:text-white" onClick={() => setLocation("/showcase")}>Showcase</button>
            <button className="text-sm font-semibold text-white/60 hover:text-white" onClick={() => setLocation("/pricing")}>Pricing</button>
            <button className="text-sm font-semibold text-white/60 hover:text-white" onClick={() => setLocation("/virelle-broadcast-render")}>Broadcast</button>
            <button className="text-sm font-semibold text-white/60 hover:text-white" onClick={() => setLocation("/contact")}>Enterprise</button>
          </div>

          <div className="flex items-center gap-3">
            {!user && (
              <button
                className="hidden px-3 text-sm font-semibold text-white/60 hover:text-white sm:block"
                onClick={() => setLocation("/login")}
              >
                Sign in
              </button>
            )}
            <Button
              className="hidden rounded-full bg-amber-500 px-5 font-bold text-black hover:bg-amber-400 sm:flex"
              onClick={() => setLocation(primaryDestination)}
            >
              {user ? "Dashboard" : "Get started"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              className="rounded-lg p-2 text-white/80 md:hidden"
              aria-label="Toggle navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-black/95 px-6 py-4 md:hidden">
            {[{ label: "Showcase", href: "/showcase" }, { label: "Pricing", href: "/pricing" }, { label: "Broadcast", href: "/virelle-broadcast-render" }, { label: "Enterprise", href: "/contact" }].map((item) => (
              <button
                key={item.href}
                className="block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white"
                onClick={() => {
                  setLocation(item.href);
                  setMobileMenuOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="relative z-10">
        <section className="flex min-h-[88vh] items-center px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Professional production orchestration
            </div>
            <h1 className="mb-7 text-5xl font-black leading-[0.92] tracking-tighter sm:text-7xl lg:text-8xl">
              CONCEPT TO
              <br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                CINEMATIC REALITY.
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed text-white/60 sm:text-xl">
              One professional workspace for film development, AI generation, VFX, broadcasting, commercial packaging and controlled adult production.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-13 bg-amber-500 px-8 font-bold text-black hover:bg-amber-400"
                onClick={() => setLocation(primaryDestination)}
              >
                {user ? "Open dashboard" : "Start free"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/20 bg-white/[0.02] px-8 text-white hover:bg-white/5"
                onClick={() => setLocation("/showcase")}
              >
                <Clapperboard className="mr-2 h-4 w-4" />
                View showcase
              </Button>
            </div>
            <p className="mt-6 text-xs text-white/30">7-day trial · No credit card required · Cancel anytime</p>
          </div>
        </section>

        <section className="border-y border-white/[0.07] bg-white/[0.015] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-400/70">The platform</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Four connected production environments</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {PRODUCT_AREAS.map((area) => {
                const Icon = area.icon;
                return (
                  <Card key={area.title} className="border-amber-500/20 bg-black/25 text-white backdrop-blur-sm">
                    <CardContent className="p-7">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
                        <Icon className="h-6 w-6 text-amber-400" />
                      </div>
                      <h3 className="mb-3 text-xl font-bold">{area.title}</h3>
                      <p className="mb-6 text-sm leading-relaxed text-white/55">{area.description}</p>
                      <button
                        className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300"
                        onClick={() => setLocation(area.href)}
                      >
                        {area.cta} <ArrowRight className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-red-200">
                <LockKeyhole className="h-3.5 w-3.5" /> Verified 18+ workspace
              </div>
              <h2 className="mb-5 text-3xl font-bold tracking-tight sm:text-5xl">Adult production without mixing it into the standard studio.</h2>
              <p className="mb-7 max-w-2xl text-base leading-relaxed text-white/55">
                Adult Studio is isolated behind membership, age and identity controls. It supports lawful consenting-adult production, Swappys transformations and recorded outputs to approved broadcast destinations. Prohibited content remains blocked and compliance evidence is retained privately.
              </p>
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {["Separate verified workspace", "Consent and identity controls", "Plain or AI-assisted broadcast setup", "Private recording and retention"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-white/70">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" /> {item}
                  </div>
                ))}
              </div>
              <Button
                className="bg-white text-black hover:bg-white/90"
                onClick={() => setLocation("/virelle-broadcast-render?adult=1")}
              >
                Open verified Adult Studio <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.015] p-7 shadow-2xl shadow-black/30">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-7 w-7 text-amber-400" />
                <div>
                  <p className="font-bold">Clear broadcast cost model</p>
                  <p className="text-xs text-white/40">Users pay only for the functions selected.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold">Plain broadcast</p>
                  <p className="mt-1 text-sm text-white/50">No AI generation and no BYOK requirement. Direct OBS broadcasting can run without a Virelle relay charge.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold">Managed relay and recording</p>
                  <p className="mt-1 text-sm text-white/50">Uses prepaid broadcast minutes for Virelle relay, multi-output routing, recording and compliance retention.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="font-semibold">AI-assisted broadcast</p>
                  <p className="mt-1 text-sm text-white/50">Requires a funded BYOK provider only when Swappys or another AI transformation is selected during setup.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-amber-500/20 bg-amber-500/[0.045] px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Commercial control", text: "Own your production outputs and manage provider costs directly." },
              { icon: KeyRound, title: "BYOK only when needed", text: "AI provider keys are required for generation and live AI processing, not ordinary broadcasting." },
              { icon: Clapperboard, title: "Instructions in context", text: "Setup guidance now appears inside the feature where it is used instead of crowding the landing page." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <Icon className="mx-auto mb-3 h-6 w-6 text-amber-400" />
                  <h3 className="mb-2 font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-400/70">Membership from A$149/month</p>
            <h2 className="mb-5 text-3xl font-bold tracking-tight sm:text-5xl">Build the production, not a pile of disconnected clips.</h2>
            <p className="mb-8 text-white/55">Compare memberships, credits, film packages and broadcast-minute pricing in one place.</p>
            <Button size="lg" className="bg-amber-500 px-8 font-bold text-black hover:bg-amber-400" onClick={() => setLocation("/pricing")}>View all pricing <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </section>
      </main>

      <div className="relative z-10">
        <LeegoFooterLaunch />
      </div>
    </div>
  );
}
