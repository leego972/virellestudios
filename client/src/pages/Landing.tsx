import { useAuth } from "@/_core/hooks/useAuth";
import GoldWatermark from "@/components/GoldWatermark";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Check, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "/virelle-logo-square.png";
type BrandIconKey = ComponentProps<typeof HollywoodIcon>["tool"];

const PRODUCT_PILLARS: Array<{
  icon: BrandIconKey;
  eyebrow: string;
  title: string;
  description: string;
  outcomes: string[];
  href: string;
}> = [
  {
    icon: "scripts",
    eyebrow: "Pre-production",
    title: "Develop production-ready projects",
    description: "Move from concept to screenplay, breakdown, casting, locations, wardrobe, scheduling and budgeting without scattering the project across disconnected tools.",
    outcomes: ["Scripts and story development", "Casting, wardrobe and locations", "Budgets, schedules and production documents"],
    href: "/register",
  },
  {
    icon: "editing",
    eyebrow: "Production and post",
    title: "Build professional films and advertising",
    description: "Create scenes, maintain character and wardrobe continuity, assemble shots, apply VFX, sound, music, colour, subtitles and export packages for professional finishing.",
    outcomes: ["Scene and multi-shot workflows", "Professional VFX and Swappys tools", "Film, advertising and social deliverables"],
    href: "/register",
  },
  {
    icon: "budget_estimator",
    eyebrow: "Funding",
    title: "Turn a project into a fundable package",
    description: "Use the Funding Command Centre to build a master profile, match opportunities, prepare applications, calculate incentives and manage crowdfunding as part of the production workflow.",
    outcomes: ["Funding opportunity matching", "Application packs and tracking", "Crowdfunding planning and campaign readiness"],
    href: "/pricing",
  },
  {
    icon: "wardrobe",
    eyebrow: "Designer ecosystem",
    title: "Source and commercialise production wardrobe",
    description: "Filmmakers can lease production-ready digital garments while approved designers publish collections, manage inventory and earn from wardrobe used in screen projects.",
    outcomes: ["Designer Wardrobe marketplace", "Project continuity and inventory", "Designer studio and commercial listings"],
    href: "/designer-register",
  },
];

const PLANS = [
  { name: "Indie", price: "A$149", cadence: "/month", detail: "Solo filmmakers and early productions", credits: "700 credits monthly" },
  { name: "Creator", price: "A$490", cadence: "/month", detail: "Commercial-grade independent production", credits: "3,000 credits monthly" },
  { name: "Industry", price: "A$1,490", cadence: "/month", detail: "Studios, agencies and repeat pipelines", credits: "9,000 credits monthly" },
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
  const navigate = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white selection:bg-amber-500/30"
      style={{
        background: "radial-gradient(circle at 50% 10%,rgba(212,175,55,.14),transparent 30%),linear-gradient(135deg,#060609 0%,#0c0b15 58%,#060608 100%)",
      }}
    >
      <SiteHead
        title="Professional AI film production, funding and designer marketplace"
        description="Virelle Studios unifies film development, production, post-production, funding, crowdfunding and designer wardrobe workflows in one professional platform."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Virelle Studios",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "149", priceCurrency: "AUD" },
          description: "Professional film production, funding and designer marketplace platform",
        }}
      />

      <GoldWatermark />

      <nav className={`fixed inset-x-0 top-0 z-50 border-b transition-all ${isScrolled ? "border-amber-500/25 bg-black/95 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl" : "border-transparent bg-black/35 py-4 backdrop-blur-md"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" className="flex min-w-0 items-center gap-2.5" onClick={() => navigate("/welcome")}>
            <img src={LOGO_URL} alt="Virelle Studios" className="h-10 w-10 shrink-0 rounded-lg object-contain" draggable={false} />
            <span className="truncate text-lg font-black uppercase italic tracking-tighter sm:text-xl">Virelle <span className="text-amber-400">Studios</span></span>
          </button>

          <div className="hidden items-center gap-7 lg:flex">
            <button className="text-sm font-semibold text-white/75 transition-colors hover:text-amber-300" onClick={() => document.getElementById("platform")?.scrollIntoView({ behavior: "smooth" })}>Platform</button>
            <button className="text-sm font-semibold text-white/75 transition-colors hover:text-amber-300" onClick={() => document.getElementById("funding")?.scrollIntoView({ behavior: "smooth" })}>Funding</button>
            <button className="text-sm font-semibold text-white/75 transition-colors hover:text-amber-300" onClick={() => document.getElementById("designers")?.scrollIntoView({ behavior: "smooth" })}>Designers</button>
            <button className="text-sm font-semibold text-white/75 transition-colors hover:text-amber-300" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Pricing</button>
          </div>

          <div className="flex items-center gap-2">
            {!user && (
              <button className="hidden min-h-10 rounded-xl border border-amber-400/45 bg-black/60 px-5 text-sm font-bold text-amber-200 shadow-[inset_0_0_18px_rgba(212,175,55,.06)] transition-all hover:border-amber-300 hover:bg-amber-400/10 sm:block" onClick={() => navigate("/login")}>Sign in</button>
            )}
            <button className="hidden min-h-10 rounded-xl border border-amber-200/40 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 px-5 text-sm font-black text-black shadow-[0_8px_28px_rgba(212,175,55,.22)] transition-transform hover:scale-[1.02] sm:inline-flex sm:items-center" onClick={() => navigate(primaryDestination)}>
              {user ? "Open studio" : "Join Virelle"}<ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button type="button" className="rounded-lg p-2 text-white/90 lg:hidden" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen((open) => !open)}>{mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-black/98 px-4 py-4 lg:hidden">
            <div className="grid gap-2">
              {["platform", "funding", "designers", "pricing"].map((id) => (
                <button key={id} className="rounded-lg px-3 py-3 text-left text-sm font-semibold capitalize text-white/80 hover:bg-white/5" onClick={() => { setMobileMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>{id}</button>
              ))}
              {!user && <button className="rounded-xl border border-amber-400/40 px-4 py-3 text-sm font-bold text-amber-200" onClick={() => navigate("/login")}>Sign in</button>}
              <button className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-black" onClick={() => navigate(primaryDestination)}>{user ? "Open studio" : "Join Virelle"}</button>
            </div>
          </div>
        )}
      </nav>

      <main className="relative z-10">
        <section className="flex min-h-[92vh] items-center px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <img src={LOGO_URL} alt="Virelle Studios official logo" className="mx-auto h-24 w-24 rounded-2xl object-contain drop-shadow-[0_0_36px_rgba(212,175,55,.36)] sm:h-32 sm:w-32" draggable={false} />
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/75 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-amber-200 shadow-xl backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5" /> One studio from concept to commercial release</div>
            <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-black leading-[.94] tracking-tighter sm:text-7xl lg:text-8xl">PLAN IT. FUND IT.<br /><span className="bg-gradient-to-r from-amber-100 via-amber-400 to-orange-500 bg-clip-text text-transparent">MAKE IT CINEMATIC.</span></h1>
            <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-black/[0.78] px-5 py-4 text-lg leading-relaxed text-white/85 shadow-2xl backdrop-blur-xl sm:text-xl">Virelle Studios combines professional filmmaking, project funding, crowdfunding, designer wardrobe and commercial production tools in one controlled workflow.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-h-13 rounded-xl bg-amber-400 px-8 font-black text-black shadow-[0_12px_38px_rgba(212,175,55,.22)] hover:bg-amber-300" onClick={() => navigate(primaryDestination)}>{user ? "Open your studio" : "Start building"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" className="min-h-13 rounded-xl border-white/25 bg-black/70 px-8 text-white hover:bg-white/10" onClick={() => navigate("/pricing")}>See plans and pricing</Button>
            </div>
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 border-y border-white/10 bg-black/[0.58] px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">What Virelle delivers</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Four connected business and production pillars</h2><p className="mt-4 text-base leading-relaxed text-white/70">Each area has a clear job, but every area shares the same project data, assets and production history.</p></div>
            <div className="grid gap-6 lg:grid-cols-2">
              {PRODUCT_PILLARS.map((pillar) => (
                <Card key={pillar.title} className="overflow-hidden border-amber-400/[0.22] bg-[#09090c]/[0.92] text-white shadow-2xl backdrop-blur-xl">
                  <CardContent className="p-7 sm:p-8">
                    <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/[0.08]"><HollywoodIcon tool={pillar.icon} size={42} alt={pillar.title} /></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">{pillar.eyebrow}</p><h3 className="mt-2 text-2xl font-black">{pillar.title}</h3></div></div>
                    <p className="mt-5 text-sm leading-7 text-white/75">{pillar.description}</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-3">{pillar.outcomes.map((outcome) => <div key={outcome} className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[.035] p-3 text-xs leading-relaxed text-white/[0.72]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{outcome}</div>)}</div>
                    <button className="mt-6 inline-flex items-center gap-2 text-sm font-black text-amber-300 hover:text-amber-200" onClick={() => navigate(pillar.href)}>Explore this value <ArrowRight className="h-4 w-4" /></button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="funding" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-amber-400/20 bg-[#08080b]/[0.92] p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[.9fr_1.1fr] lg:p-12">
            <div className="flex items-center justify-center"><HollywoodIcon tool="budget_estimator" size={230} className="max-w-full" alt="Funding Command Centre" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Funding Command Centre</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">A funding workflow built around the actual project.</h2><p className="mt-5 text-base leading-7 text-white/[0.72]">Create one master funding profile, compare suitable opportunities, prepare application materials, monitor deadlines, calculate incentive estimates and manage crowdfunding without rebuilding the same project information repeatedly.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Transparent opportunity matching", "Application drafts and exports", "Tax-incentive calculations", "Crowdfunding readiness and campaign packs"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 p-4 text-sm text-white/80"><Check className="h-4 w-4 text-emerald-400" />{item}</div>)}</div><Button className="mt-7 bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate(primaryDestination)}>Open the production workflow <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </div>
        </section>

        <section id="designers" className="scroll-mt-24 border-y border-white/10 bg-black/[0.58] px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Designer Wardrobe</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Production wardrobe that creates value for filmmakers and designers.</h2><p className="mt-5 text-base leading-7 text-white/[0.72]">Filmmakers get continuity-ready wardrobe assets for scenes and characters. Designers get a dedicated studio to publish garments, manage commercial listings and earn when their work is selected for productions.</p><div className="mt-7 flex flex-wrap gap-3"><Button className="bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/designer-register")}>Join as a designer</Button><Button variant="outline" className="border-white/20 bg-black/60 text-white" onClick={() => navigate("/pricing")}>View designer pricing</Button></div></div>
            <div className="grid grid-cols-2 gap-4">{[["wardrobe","Wardrobe library"],["marketplace","Commercial marketplace"],["characters","Character continuity"],["reports","Designer management"]].map(([icon,label]) => <div key={label} className="rounded-2xl border border-amber-400/[0.18] bg-[#09090c]/[0.92] p-5 text-center shadow-xl"><HollywoodIcon tool={icon as BrandIconKey} size={68} className="mx-auto" alt={label} /><p className="mt-3 text-sm font-bold text-white/[0.82]">{label}</p></div>)}</div>
          </div>
        </section>


        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 rounded-3xl border border-violet-300/15 bg-[#09090d]/[0.94] p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:p-10">
            <div className="flex items-center justify-center">
              <HollywoodIcon tool="video_generation" size={190} className="max-w-full" alt="Swappys free short-video app" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Free Swappys app</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Fast transformations for short video clips.</h2>
              <p className="mt-5 text-sm leading-7 text-white/[0.72]">
                Download Swappys for quick short-form clip creation. Free-app outputs remain visibly watermarked and censored, and the app contains no broadcasting controls. Professional advertising and film workflows remain inside Virelle Studios.
              </p>
              <Button className="mt-6 bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/download")}>Download Swappys free <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-3xl border border-rose-300/15 bg-[#0a090c]/[0.94] p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12"><ShieldCheck className="h-8 w-8 text-amber-300" /><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Verified Adult Studio</p><h2 className="text-3xl font-black sm:text-4xl">A separate professional 18+ workspace.</h2><p className="max-w-3xl text-sm leading-7 text-white/[0.72]">Adult Studio is isolated from the standard filmmaking environment. Entry requires an active paid Virelle membership, individual age and identity verification, consent safeguards and a separate one-time activation.</p></div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-y border-white/10 bg-black/[0.62] px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl"><div className="mx-auto mb-12 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Membership pricing</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Choose the scale of production you need.</h2><p className="mt-4 text-white/70">Membership unlocks the platform. Optional credit top-ups and production packages are listed transparently on the full pricing page.</p></div><div className="grid gap-6 lg:grid-cols-3">{PLANS.map((plan) => <Card key={plan.name} className="border-amber-400/[0.22] bg-[#09090c]/[0.94] text-white shadow-2xl"><CardContent className="p-7"><p className="text-sm font-black uppercase tracking-[.15em] text-amber-300">{plan.name}</p><div className="mt-4"><span className="text-4xl font-black">{plan.price}</span><span className="text-sm text-white/45">{plan.cadence}</span></div><p className="mt-4 min-h-12 text-sm leading-relaxed text-white/68">{plan.detail}</p><p className="mt-5 text-sm font-bold text-amber-200">{plan.credits}</p><Button className="mt-6 w-full bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/pricing")}>Compare {plan.name}</Button></CardContent></Card>)}</div><div className="mt-8 text-center"><Button size="lg" variant="outline" className="border-white/20 bg-black/65 text-white" onClick={() => navigate("/pricing")}>View memberships, credits and packages <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
        </section>
      </main>

      <div className="relative z-10"><LeegoFooterLaunch /></div>
    </div>
  );
}
