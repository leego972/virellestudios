from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    text = read(path)
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, found {count}: {pattern[:120]!r}")
    write(path, updated)


# ---------------------------------------------------------------------------
# Uploaded-logo access point. The component remains invisible until the exact
# user-supplied file is added at /adult-studio-access-logo.png.
# ---------------------------------------------------------------------------
write(
    "client/src/components/AdultStudioAccessButton.tsx",
    '''import { useState } from "react";
import { useLocation } from "wouter";

const ADULT_STUDIO_LOGO = "/adult-studio-access-logo.png";

export default function AdultStudioAccessButton() {
  const [, setLocation] = useLocation();
  const [assetReady, setAssetReady] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setLocation("/adult-studio")}
      aria-label="Open Adult Studio access and verification"
      className={`${assetReady ? "flex" : "hidden"} mx-auto max-w-full items-center justify-center bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
    >
      <img
        src={ADULT_STUDIO_LOGO}
        alt="Adult Studio"
        className="h-auto max-h-44 w-auto max-w-full object-contain"
        draggable={false}
        onLoad={() => setAssetReady(true)}
        onError={() => setAssetReady(false)}
      />
    </button>
  );
}
''',
)

replace_once(
    "client/src/pages/Home.tsx",
    '  import StudioOpener from "@/components/StudioOpener";\n',
    '  import StudioOpener from "@/components/StudioOpener";\n  import AdultStudioAccessButton from "@/components/AdultStudioAccessButton";\n',
)
replace_once(
    "client/src/pages/Home.tsx",
    '        <OnboardingOverlay forceShow={forceOnboarding} onClose={() => setForceOnboarding(false)} />\n\n          {/* Film Production Stepper */}',
    '        <OnboardingOverlay forceShow={forceOnboarding} onClose={() => setForceOnboarding(false)} />\n        <AdultStudioAccessButton />\n\n          {/* Film Production Stepper */}',
)

# ---------------------------------------------------------------------------
# Standard Virelle contains no broadcast entry. Adult Studio has the only route.
# ---------------------------------------------------------------------------
replace_once(
    "client/src/components/DashboardLayout.tsx",
    '''      {
        icon: Zap,
        label: "Swappys & Broadcast",
        path: "/virelle-broadcast-render",
      },
''',
    "",
)
replace_once(
    "client/src/App.tsx",
    '      <Route path="/virelle-broadcast-render" component={VirelleBroadcastRender} />',
    '''      <Route path="/adult-studio" component={VirelleBroadcastRender} />
      <Route path="/virelle-broadcast-render">{() => {
        window.location.replace("/adult-studio");
        return <PageLoader />;
      }}</Route>''',
)

# ---------------------------------------------------------------------------
# Public landing page: no broadcast promotion. Clear value propositions,
# designer section, funding, Adult Studio mention, and visible pricing.
# ---------------------------------------------------------------------------
write(
    "client/src/pages/Landing.tsx",
    '''import { useAuth } from "@/_core/hooks/useAuth";
import GoldWatermark from "@/components/GoldWatermark";
import { HollywoodIcon } from "@/components/HollywoodIcon";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import SiteHead from "@/components/SiteHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ToolIconKey } from "@/constants/hollywoodIcons";
import { ArrowRight, Check, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "/virelle-logo-square.png";

const PRODUCT_PILLARS: Array<{
  icon: ToolIconKey;
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
    icon: "funding",
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
            <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-black/78 px-5 py-4 text-lg leading-relaxed text-white/85 shadow-2xl backdrop-blur-xl sm:text-xl">Virelle Studios combines professional filmmaking, project funding, crowdfunding, designer wardrobe and commercial production tools in one controlled workflow.</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-h-13 rounded-xl bg-amber-400 px-8 font-black text-black shadow-[0_12px_38px_rgba(212,175,55,.22)] hover:bg-amber-300" onClick={() => navigate(primaryDestination)}>{user ? "Open your studio" : "Start building"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              <Button size="lg" variant="outline" className="min-h-13 rounded-xl border-white/25 bg-black/70 px-8 text-white hover:bg-white/10" onClick={() => navigate("/pricing")}>See plans and pricing</Button>
            </div>
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 border-y border-white/10 bg-black/58 px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">What Virelle delivers</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Four connected business and production pillars</h2><p className="mt-4 text-base leading-relaxed text-white/70">Each area has a clear job, but every area shares the same project data, assets and production history.</p></div>
            <div className="grid gap-6 lg:grid-cols-2">
              {PRODUCT_PILLARS.map((pillar) => (
                <Card key={pillar.title} className="overflow-hidden border-amber-400/22 bg-[#09090c]/92 text-white shadow-2xl backdrop-blur-xl">
                  <CardContent className="p-7 sm:p-8">
                    <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/8"><HollywoodIcon tool={pillar.icon} size={42} alt={pillar.title} /></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">{pillar.eyebrow}</p><h3 className="mt-2 text-2xl font-black">{pillar.title}</h3></div></div>
                    <p className="mt-5 text-sm leading-7 text-white/75">{pillar.description}</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-3">{pillar.outcomes.map((outcome) => <div key={outcome} className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[.035] p-3 text-xs leading-relaxed text-white/72"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />{outcome}</div>)}</div>
                    <button className="mt-6 inline-flex items-center gap-2 text-sm font-black text-amber-300 hover:text-amber-200" onClick={() => navigate(pillar.href)}>Explore this value <ArrowRight className="h-4 w-4" /></button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="funding" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-amber-400/20 bg-[#08080b]/92 p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[.9fr_1.1fr] lg:p-12">
            <div className="flex items-center justify-center"><HollywoodIcon tool="funding" size={230} className="max-w-full" alt="Funding Command Centre" /></div>
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Funding Command Centre</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">A funding workflow built around the actual project.</h2><p className="mt-5 text-base leading-7 text-white/72">Create one master funding profile, compare suitable opportunities, prepare application materials, monitor deadlines, calculate incentive estimates and manage crowdfunding without rebuilding the same project information repeatedly.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{["Transparent opportunity matching", "Application drafts and exports", "Tax-incentive calculations", "Crowdfunding readiness and campaign packs"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/45 p-4 text-sm text-white/80"><Check className="h-4 w-4 text-emerald-400" />{item}</div>)}</div><Button className="mt-7 bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate(primaryDestination)}>Open the production workflow <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </div>
        </section>

        <section id="designers" className="scroll-mt-24 border-y border-white/10 bg-black/58 px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Designer Wardrobe</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Production wardrobe that creates value for filmmakers and designers.</h2><p className="mt-5 text-base leading-7 text-white/72">Filmmakers get continuity-ready wardrobe assets for scenes and characters. Designers get a dedicated studio to publish garments, manage commercial listings and earn when their work is selected for productions.</p><div className="mt-7 flex flex-wrap gap-3"><Button className="bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/designer-register")}>Join as a designer</Button><Button variant="outline" className="border-white/20 bg-black/60 text-white" onClick={() => navigate("/pricing")}>View designer pricing</Button></div></div>
            <div className="grid grid-cols-2 gap-4">{[["wardrobe","Wardrobe library"],["marketplace","Commercial marketplace"],["characters","Character continuity"],["reports","Designer management"]].map(([icon,label]) => <div key={label} className="rounded-2xl border border-amber-400/18 bg-[#09090c]/92 p-5 text-center shadow-xl"><HollywoodIcon tool={icon as ToolIconKey} size={68} className="mx-auto" alt={label} /><p className="mt-3 text-sm font-bold text-white/82">{label}</p></div>)}</div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 rounded-3xl border border-rose-300/15 bg-[#0a090c]/94 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12"><ShieldCheck className="h-8 w-8 text-amber-300" /><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Verified Adult Studio</p><h2 className="text-3xl font-black sm:text-4xl">A separate professional 18+ workspace.</h2><p className="max-w-3xl text-sm leading-7 text-white/72">Adult Studio is isolated from the standard filmmaking environment. Entry requires an active paid Virelle membership, individual age and identity verification, consent safeguards and a separate one-time activation.</p></div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-y border-white/10 bg-black/62 px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl"><div className="mx-auto mb-12 max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Membership pricing</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Choose the scale of production you need.</h2><p className="mt-4 text-white/70">Membership unlocks the platform. Optional credit top-ups and production packages are listed transparently on the full pricing page.</p></div><div className="grid gap-6 lg:grid-cols-3">{PLANS.map((plan) => <Card key={plan.name} className="border-amber-400/22 bg-[#09090c]/94 text-white shadow-2xl"><CardContent className="p-7"><p className="text-sm font-black uppercase tracking-[.15em] text-amber-300">{plan.name}</p><div className="mt-4"><span className="text-4xl font-black">{plan.price}</span><span className="text-sm text-white/45">{plan.cadence}</span></div><p className="mt-4 min-h-12 text-sm leading-relaxed text-white/68">{plan.detail}</p><p className="mt-5 text-sm font-bold text-amber-200">{plan.credits}</p><Button className="mt-6 w-full bg-amber-400 font-black text-black hover:bg-amber-300" onClick={() => navigate("/pricing")}>Compare {plan.name}</Button></CardContent></Card>)}</div><div className="mt-8 text-center"><Button size="lg" variant="outline" className="border-white/20 bg-black/65 text-white" onClick={() => navigate("/pricing")}>View memberships, credits and packages <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
        </section>
      </main>

      <div className="relative z-10"><LeegoFooterLaunch /></div>
    </div>
  );
}
''',
)

# ---------------------------------------------------------------------------
# General pricing no longer exposes broadcast UI. Adult relay packs live only
# inside the verified Adult Studio portal.
# ---------------------------------------------------------------------------
pricing = read("client/src/pages/Pricing.tsx")
pricing = pricing.replace("  LockKeyhole,\n  RadioTower,\n", "")
pricing = pricing.replace('      "Adult Studio access after verification",\n      "60 managed broadcast minutes/month",', '      "Adult Studio eligibility after verification and one-time activation",')
pricing = pricing.replace('      "Adult Studio access after verification",\n      "180 managed broadcast minutes/month",', '      "Adult Studio eligibility after verification and one-time activation",')
pricing = pricing.replace('      "600 managed broadcast minutes/month",\n', '')
pricing = re.sub(r'\nconst BROADCAST_PACKS = \[.*?\] as const;\n', '\n', pricing, flags=re.S)
pricing = pricing.replace('{ name: "Direct OBS broadcast", price: "A$0/minute", note: "No Virelle relay, no BYOK and no AI generation." },', '{ name: "Adult Studio activation", price: "A$99 one-time", note: "Separate from membership and available only after individual verification." },')
pricing = pricing.replace('description="Current Virelle Studios membership, credits, film package, Adult Studio and broadcast pricing in Australian dollars."', 'description="Current Virelle Studios membership, credits, film package, designer and Adult Studio activation pricing in Australian dollars."')
pricing = pricing.replace('Membership unlocks the platform. Credits pay for Virelle generative and orchestration actions. BYOK provider charges are paid directly to the selected AI provider. Plain broadcasting does not require BYOK.', 'Membership unlocks the platform. Credits pay for Virelle generative and orchestration actions. BYOK provider charges are paid directly to the selected AI provider. Adult Studio requires separate verification and activation.')
pricing, count = re.subn(r'\n        <section id="broadcast".*?\n        <section id="credits"', '\n        <section id="credits"', pricing, count=1, flags=re.S)
if count != 1:
    raise RuntimeError("Could not remove public broadcast pricing section")
pricing = pricing.replace('A provider key is required for video generation, Studio Render and any AI-assisted broadcast transformation. A normal direct broadcast does not generate video and therefore does not require BYOK. Managed relay can operate without AI, using only the member\'s broadcast-minute balance.', 'A provider key is required only for the generation or processing feature that uses it. Virelle membership and production-management tools remain separate from third-party provider usage.')
pricing = pricing.replace('<Button className="bg-amber-500 font-bold text-black hover:bg-amber-400" onClick={() => setLocation("/virelle-broadcast-render")}>Open Broadcast setup <ArrowRight className="ml-2 h-4 w-4" /></Button>', '<Button className="bg-amber-500 font-bold text-black hover:bg-amber-400" onClick={() => setLocation("/settings?tab=api-keys")}>Manage provider keys <ArrowRight className="ml-2 h-4 w-4" /></Button>')
write("client/src/pages/Pricing.tsx", pricing)

# ---------------------------------------------------------------------------
# Adult Studio activation payment is part of access status and survives profile
# re-verification. Default one-time fee is A$99 and can be changed in Render via
# ADULT_STUDIO_ACTIVATION_FEE_AUD without code changes.
# ---------------------------------------------------------------------------
mature = read("server/_core/matureAccess.ts")
mature = mature.replace(
    'export const MATURE_ACCESS_TERMS_VERSION = "adult-workspace-2026-07";\n',
    'export const MATURE_ACCESS_TERMS_VERSION = "adult-workspace-2026-07";\nexport const ADULT_STUDIO_ACTIVATION_FEE_AUD = Math.max(1, Number(process.env.ADULT_STUDIO_ACTIVATION_FEE_AUD || "99"));\nexport const ADULT_STUDIO_ACTIVATION_FEE_CENTS = Math.round(ADULT_STUDIO_ACTIVATION_FEE_AUD * 100);\n',
)
mature = mature.replace('  archiveRetentionAccepted: boolean;\n  accessGranted: boolean;', '  archiveRetentionAccepted: boolean;\n  activationPaid: boolean;\n  activationFeeAud: number;\n  accessGranted: boolean;')
mature = mature.replace('      cardNameMatchedAt DATETIME NULL,\n      accessStatus', '      cardNameMatchedAt DATETIME NULL,\n      activationStripeSessionId VARCHAR(255) NULL,\n      activationPaidAt DATETIME NULL,\n      activationAmountCents INT NULL,\n      accessStatus')
mature = mature.replace(
    '    sql`ALTER TABLE mature_access_profiles ADD COLUMN termsVersion VARCHAR(64) NOT NULL DEFAULT \'adult-workspace-2026-07\'`,\n',
    '    sql`ALTER TABLE mature_access_profiles ADD COLUMN termsVersion VARCHAR(64) NOT NULL DEFAULT \'adult-workspace-2026-07\'`,\n    sql`ALTER TABLE mature_access_profiles ADD COLUMN activationStripeSessionId VARCHAR(255) NULL`,\n    sql`ALTER TABLE mature_access_profiles ADD COLUMN activationPaidAt DATETIME NULL`,\n    sql`ALTER TABLE mature_access_profiles ADD COLUMN activationAmountCents INT NULL`,\n',
)
insert_after_card = '''export async function recordMatureActivationSession(
  dbConn: any,
  userId: number,
  sessionId: string,
): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles
    SET activationStripeSessionId=${sessionId}, updatedAt=NOW()
    WHERE userId=${userId}
  `);
}

export async function recordMatureActivationPaid(
  dbConn: any,
  userId: number,
  sessionId: string,
  amountCents: number,
): Promise<void> {
  await ensureMatureAccessTable(dbConn);
  await dbConn.execute(sql`
    UPDATE mature_access_profiles
    SET activationStripeSessionId=${sessionId}, activationPaidAt=NOW(),
        activationAmountCents=${amountCents}, updatedAt=NOW()
    WHERE userId=${userId}
  `);
}

'''
marker = 'export async function getMatureAccessStatus(\n'
if marker not in mature:
    raise RuntimeError("Mature access status marker missing")
mature = mature.replace(marker, insert_after_card + marker, 1)
mature = mature.replace('      archiveRetentionAccepted: true,\n      accessGranted: true,', '      archiveRetentionAccepted: true,\n      activationPaid: true,\n      activationFeeAud: ADULT_STUDIO_ACTIVATION_FEE_AUD,\n      accessGranted: true,')
mature = mature.replace('  const archiveRetentionAccepted = Boolean(profile?.archiveRetentionAcceptedAt);\n  const accessGranted = paidMembership', '  const archiveRetentionAccepted = Boolean(profile?.archiveRetentionAcceptedAt);\n  const activationPaid = Boolean(profile?.activationPaidAt);\n  const accessGranted = paidMembership')
mature = mature.replace('    && archiveRetentionAccepted\n    && profile?.accessStatus', '    && archiveRetentionAccepted\n    && activationPaid\n    && profile?.accessStatus')
mature = mature.replace('  if (!archiveRetentionAccepted) missing.push("90-day private archive acknowledgement");\n', '  if (!archiveRetentionAccepted) missing.push("90-day private archive acknowledgement");\n  if (!activationPaid) missing.push("one-time Adult Studio activation fee");\n')
mature = mature.replace('    archiveRetentionAccepted,\n    accessGranted,', '    archiveRetentionAccepted,\n    activationPaid,\n    activationFeeAud: ADULT_STUDIO_ACTIVATION_FEE_AUD,\n    accessGranted,')
write("server/_core/matureAccess.ts", mature)

write(
    "drizzle/0042_adult_studio_activation.sql",
    '''ALTER TABLE mature_access_profiles ADD COLUMN activationStripeSessionId VARCHAR(255) NULL;
ALTER TABLE mature_access_profiles ADD COLUMN activationPaidAt DATETIME NULL;
ALTER TABLE mature_access_profiles ADD COLUMN activationAmountCents INT NULL;
''',
)

# Router imports, activation checkout/verification and adult-only broadcast gate.
router_path = "server/virelle-broadcast-render-router.ts"
router = read(router_path)
router = router.replace(
    '  calculateAge,\n',
    '  ADULT_STUDIO_ACTIVATION_FEE_AUD,\n  ADULT_STUDIO_ACTIVATION_FEE_CENTS,\n  calculateAge,\n',
)
router = router.replace(
    '  recordIdentityVerified,\n  recordPhoneVerified,\n',
    '  recordIdentityVerified,\n  recordMatureActivationPaid,\n  recordMatureActivationSession,\n  recordPhoneVerified,\n',
)
activation_mutations = '''
  createMatureActivationCheckout: protectedProcedure.input(z.object({
    returnUrl: z.string().url().max(1000),
  })).mutation(async ({ ctx, input }) => {
    if (!stripe) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured." });
    }
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const status = await getMatureAccessStatus(dbConn, ctx.user as any);
    const verificationComplete = status.paidMembership
      && status.profileComplete
      && status.adultAgeConfirmed
      && status.adultAttestationAccepted
      && status.phoneVerified
      && status.identityVerified
      && status.cardNameMatched
      && status.responsibilityAccepted
      && status.consentPolicyAccepted
      && status.archiveRetentionAccepted;
    if (!verificationComplete) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Complete Adult Studio identity, age, phone, card-name and consent verification before activation." });
    }
    if (status.activationPaid) {
      return { alreadyPaid: true, url: null, activationFeeAud: ADULT_STUDIO_ACTIVATION_FEE_AUD };
    }
    let customerId = String((ctx.user as any).stripeCustomerId || "");
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: String(ctx.user.email || ""),
        name: String(status.profile?.fullName || ctx.user.name || ""),
        metadata: { userId: String(ctx.user.id) },
      });
      customerId = customer.id;
      await db.updateUser(ctx.user.id, { stripeCustomerId: customerId } as any);
    }
    const returnUrl = safeReturnUrl(input.returnUrl);
    const separator = returnUrl.includes("?") ? "&" : "?";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: ADULT_STUDIO_ACTIVATION_FEE_CENTS,
          product_data: { name: "Virelle Adult Studio one-time activation" },
        },
      }],
      success_url: `${returnUrl}${separator}adult_activation_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}${separator}adult_activation_cancelled=1`,
      metadata: { userId: String(ctx.user.id), type: "adult_studio_activation" },
    });
    await recordMatureActivationSession(dbConn, ctx.user.id, session.id);
    return { alreadyPaid: false, url: session.url, activationFeeAud: ADULT_STUDIO_ACTIVATION_FEE_AUD };
  }),

  verifyMatureActivationSession: protectedProcedure.input(z.object({
    sessionId: z.string().min(8).max(255),
  })).mutation(async ({ ctx, input }) => {
    if (!stripe) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe is not configured." });
    const dbConn = await db.getDb();
    if (!dbConn) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
    const profile = await getMatureAccessProfile(dbConn, ctx.user.id);
    if (!profile || String(profile.activationStripeSessionId || "") !== input.sessionId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Adult Studio activation session does not belong to this account." });
    }
    const session = await stripe.checkout.sessions.retrieve(input.sessionId);
    if (session.payment_status !== "paid") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Adult Studio activation payment is not complete." });
    }
    if (session.metadata?.userId && Number(session.metadata.userId) !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Adult Studio activation ownership mismatch." });
    }
    await recordMatureActivationPaid(dbConn, ctx.user.id, session.id, Number(session.amount_total || ADULT_STUDIO_ACTIVATION_FEE_CENTS));
    return getMatureAccessStatus(dbConn, ctx.user as any);
  }),

'''
router = router.replace('  getByokStatus: protectedProcedure.query(async ({ ctx }) => {', activation_mutations + '  getByokStatus: protectedProcedure.query(async ({ ctx }) => {', 1)
router = router.replace(
    '    const aiAssisted = input.serviceMode === "ai_assisted";\n    const matureStatus = await validateResolvedJob(',
    '    const aiAssisted = input.serviceMode === "ai_assisted";\n    if (resolved.contentMode !== "open_adult") {\n      throw new TRPCError({ code: "FORBIDDEN", message: "Broadcasting is available only inside the verified Adult Studio portal." });\n    }\n    const matureStatus = await validateResolvedJob(',
    1,
)
write(router_path, router)

# Stripe webhook fulfilment for activation.
index_path = "server/_core/index.ts"
index = read(index_path)
index = index.replace('import { creditBroadcastMinutePurchase } from "./broadcastMinutes";\n', 'import { creditBroadcastMinutePurchase } from "./broadcastMinutes";\nimport { recordMatureActivationPaid } from "./matureAccess";\n')
activation_webhook = '''          if (session.metadata?.type === "adult_studio_activation" && userId) {
            const dbConn = await db.getDb();
            if (!dbConn) throw new Error("Database unavailable during Adult Studio activation fulfilment.");
            await recordMatureActivationPaid(
              dbConn,
              userId,
              String(session.id),
              Number(session.amount_total || 0),
            );
            logger.info(`[AdultStudio] Activation paid: user=${userId} session=${session.id}`);
            break;
          }

'''
index = index.replace('          if (session.metadata?.type === "adult_broadcast_minutes" && userId) {', activation_webhook + '          if (session.metadata?.type === "adult_broadcast_minutes" && userId) {', 1)
write(index_path, index)

# ---------------------------------------------------------------------------
# Adult Studio client: activation fee, adult-only portal, multi-output prestige
# control room with side-by-side feed and chat tiles plus companion-window fallback.
# ---------------------------------------------------------------------------
page_path = "client/src/pages/VirelleBroadcastRender.tsx"
page = read(page_path)
page = page.replace('import { trpc } from "@/lib/trpc";\n', 'import { trpc } from "@/lib/trpc";\nimport { HollywoodIcon } from "@/components/HollywoodIcon";\n')
page = page.replace('  LockKeyhole,\n  Phone,', '  LockKeyhole,\n  MessagesSquare,\n  Monitor,\n  Phone,')
page = page.replace('  streamKey: string;\n};', '  streamKey: string;\n  previewUrl: string;\n  chatUrl: string;\n};')
page = page.replace('  const createCard = (trpc as any).virelleBroadcastRender.createMatureCardVerification.useMutation();\n  const verifyCard = (trpc as any).virelleBroadcastRender.verifyMatureCardSession.useMutation();', '  const createCard = (trpc as any).virelleBroadcastRender.createMatureCardVerification.useMutation();\n  const verifyCard = (trpc as any).virelleBroadcastRender.verifyMatureCardSession.useMutation();\n  const createActivation = (trpc as any).virelleBroadcastRender.createMatureActivationCheckout.useMutation();\n  const verifyActivation = (trpc as any).virelleBroadcastRender.verifyMatureActivationSession.useMutation();')
activation_effect = '''
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activationSession = params.get("adult_activation_session");
    if (!activationSession || verifyActivation.isPending) return;
    verifyActivation.mutateAsync({ sessionId: activationSession })
      .then(() => {
        toast.success("Adult Studio activated.");
        params.delete("adult_activation_session");
        params.delete("adult_activation_cancelled");
        const query = params.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
        statusQuery.refetch();
      })
      .catch((error: any) => toast.error(error?.message || "Adult Studio activation could not be verified."));
  // Process only the returned Stripe activation session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
'''
page = page.replace('  const updateForm = (key: keyof typeof form, value: string) => {', activation_effect + '\n  const updateForm = (key: keyof typeof form, value: string) => {', 1)
begin_activation = '''
  const beginActivation = async () => {
    try {
      const result = await createActivation.mutateAsync({ returnUrl: window.location.href });
      if (result.alreadyPaid) {
        toast.success("Adult Studio is already activated.");
        statusQuery.refetch();
        return;
      }
      if (!result.url) throw new Error("Stripe did not return an activation checkout URL.");
      window.location.assign(result.url);
    } catch (error: any) {
      toast.error(error?.message || "Could not open Adult Studio activation checkout.");
    }
  };
'''
page = page.replace('  const declarationsAccepted = adultAttestationAccepted', begin_activation + '\n  const declarationsAccepted = adultAttestationAccepted', 1)
page = page.replace('<VerificationItem complete={Boolean(status?.archiveRetentionAccepted)} label="Private retention acknowledgement" />', '<VerificationItem complete={Boolean(status?.archiveRetentionAccepted)} label="Private retention acknowledgement" />\n            <VerificationItem complete={Boolean(status?.activationPaid)} label="One-time Adult Studio activation" />')
activation_card = '''
          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-amber-300/80" />
                Adult Studio activation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed text-white/55">
                After verification, pay the separate one-time activation fee of A${Number(status?.activationFeeAud || 99).toFixed(0)}. Membership and usage purchases remain separate.
              </p>
              <Button
                className="w-full bg-amber-300 text-black hover:bg-amber-200"
                disabled={!status?.cardNameMatched || !status?.identityVerified || !status?.phoneVerified || status?.activationPaid || createActivation.isPending}
                onClick={beginActivation}
              >
                {status?.activationPaid ? "Adult Studio activated" : `Pay A$${Number(status?.activationFeeAud || 99).toFixed(0)} activation`}
              </Button>
            </CardContent>
          </Card>
'''
page = page.replace('''          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-amber-300/80" />
                Cardholder-name match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/[0.03]"
                disabled={!status?.profileComplete || createCard.isPending || status?.cardNameMatched}
                onClick={beginCardCheck}
              >
                {status?.cardNameMatched ? "Cardholder name matched" : "Verify cardholder name"}
              </Button>
            </CardContent>
          </Card>''', '''          <Card className="border-white/10 bg-white/[0.025] text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-amber-300/80" />
                Cardholder-name match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-white/15 bg-white/[0.03]"
                disabled={!status?.profileComplete || createCard.isPending || status?.cardNameMatched}
                onClick={beginCardCheck}
              >
                {status?.cardNameMatched ? "Cardholder name matched" : "Verify cardholder name"}
              </Button>
            </CardContent>
          </Card>
''' + activation_card, 1)
page = page.replace('{ destination: "rtmp", ingestUrl: "", streamKey: "" },', '{ destination: "rtmp", ingestUrl: "", streamKey: "", previewUrl: "", chatUrl: "" },')
page = page.replace('{ destination: "rtmp", ingestUrl: "", streamKey: "" }])}>Add output</Button>', '{ destination: "rtmp", ingestUrl: "", streamKey: "", previewUrl: "", chatUrl: "" }])}>Add output</Button>')
page = page.replace('<div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div>', '<div><Label>Stream key</Label><Input type="password" autoComplete="off" value={channel.streamKey} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, streamKey: event.target.value } : item))} /></div>\n                   <div><Label>Live screen / dashboard URL (optional)</Label><Input type="url" placeholder="https://..." value={channel.previewUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, previewUrl: event.target.value } : item))} /></div>\n                   <div><Label>Channel chat URL (optional)</Label><Input type="url" placeholder="https://..." value={channel.chatUrl} onChange={(event) => setChannels((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, chatUrl: event.target.value } : item))} /></div>')
control_room = '''
function safeControlRoomUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function BroadcastControlRoom({ channels, sourceVideoUrl }: { channels: BroadcastChannel[]; sourceVideoUrl: string }) {
  return (
    <Card className="border-amber-400/20 bg-[#08090c]/95 text-white shadow-2xl">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <HollywoodIcon tool="studio" size={42} alt="Adult Studio control room" />
            <div>
              <CardTitle className="text-xl">Adult Studio Control Room</CardTitle>
              <p className="mt-1 text-sm text-white/50">Monitor every connected screen and supported written chat in one split-screen workspace.</p>
            </div>
          </div>
          <Badge variant="outline">{channels.length} connected outlet{channels.length === 1 ? "" : "s"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          {channels.map((channel, index) => {
            const preview = safeControlRoomUrl(channel.previewUrl);
            const chat = safeControlRoomUrl(channel.chatUrl);
            return (
              <section key={`${channel.destination}-control-${index}`} className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div><p className="font-semibold">{destinationLabel(channel.destination)}</p><p className="text-xs text-white/40">Outlet {index + 1}</p></div>
                  <Badge variant="outline">Live workspace</Badge>
                </div>
                <div className="grid min-h-[420px] md:grid-cols-2">
                  <div className="flex min-h-[210px] flex-col border-b border-white/10 md:border-b-0 md:border-r">
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/60"><span className="flex items-center gap-2"><Monitor className="h-4 w-4 text-amber-300" />Screen</span>{preview && <a href={preview} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200">Open</a>}</div>
                    <div className="flex flex-1 items-center justify-center bg-black">
                      {preview ? <iframe title={`${destinationLabel(channel.destination)} live screen`} src={preview} className="h-full min-h-[330px] w-full border-0" allow="autoplay; fullscreen" referrerPolicy="no-referrer" /> : sourceVideoUrl ? <video src={sourceVideoUrl} controls muted className="max-h-[330px] w-full bg-black object-contain" /> : <p className="px-5 text-center text-xs leading-relaxed text-white/35">Paste the outlet's secure dashboard or preview URL above. The source video appears here when available.</p>}
                    </div>
                  </div>
                  <div className="flex min-h-[210px] flex-col">
                    <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/60"><span className="flex items-center gap-2"><MessagesSquare className="h-4 w-4 text-amber-300" />Chat</span>{chat && <a href={chat} target="_blank" rel="noreferrer" className="text-amber-300 hover:text-amber-200">Companion window</a>}</div>
                    <div className="flex flex-1 items-center justify-center bg-black/70">
                      {chat ? <iframe title={`${destinationLabel(channel.destination)} chat`} src={chat} className="h-full min-h-[330px] w-full border-0" sandbox="allow-forms allow-popups allow-same-origin allow-scripts" referrerPolicy="no-referrer" /> : <p className="px-5 text-center text-xs leading-relaxed text-white/35">Paste the authenticated channel-chat URL above. When a platform blocks embedding, use the companion-window link without leaving the control room.</p>}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <p className="text-xs leading-relaxed text-white/40">Platform authentication remains with the outlet. Virelle embeds a secure page when the outlet permits it and always provides a companion-window fallback when framing is blocked.</p>
      </CardContent>
    </Card>
  );
}

'''
page = page.replace('function StudioWorkspace({ workspace }: { workspace: Workspace }) {', control_room + 'function StudioWorkspace({ workspace }: { workspace: Workspace }) {', 1)
page = page.replace('\n\n        <Card className={subtleCard}>\n          <CardHeader>\n            <CardTitle className="text-base">\n              Recent {isAdult ? "Adult Studio" : "Standard Studio"} jobs', '\n\n        <BroadcastControlRoom channels={channels} sourceVideoUrl={sourceVideoUrl} />\n\n        <Card className={subtleCard}>\n          <CardHeader>\n            <CardTitle className="text-base">\n              Recent Adult Studio jobs', 1)
page = re.sub(r'function StudioPage\(\) \{.*?return <StudioWorkspace workspace=\{workspace\} />;\n\}', 'function StudioPage() {\n  return <StudioWorkspace workspace="adult" />;\n}', page, count=1, flags=re.S)
page = page.replace('feature="Virelle Broadcast & Studio Render"', 'feature="Adult Studio"')
write(page_path, page)

# ---------------------------------------------------------------------------
# Static regression tests for the product boundary and remaining-logo contract.
# ---------------------------------------------------------------------------
write(
    "server/adult-studio-product-boundaries.test.ts",
    '''import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Adult Studio product boundary", () => {
  it("keeps broadcast promotion off the public landing page", () => {
    expect(source("client/src/pages/Landing.tsx")).not.toMatch(/broadcast/i);
  });

  it("removes standard broadcast navigation and exposes only the Adult Studio route", () => {
    const layout = source("client/src/components/DashboardLayout.tsx");
    const app = source("client/src/App.tsx");
    expect(layout).not.toContain("Swappys & Broadcast");
    expect(layout).not.toContain('/virelle-broadcast-render');
    expect(app).toContain('path="/adult-studio"');
  });

  it("requires activation payment as part of mature access", () => {
    const access = source("server/_core/matureAccess.ts");
    expect(access).toContain("activationPaid");
    expect(access).toContain("one-time Adult Studio activation fee");
  });

  it("rejects non-adult broadcast sessions at the server boundary", () => {
    const router = source("server/virelle-broadcast-render-router.ts");
    expect(router).toContain('resolved.contentMode !== "open_adult"');
    expect(router).toContain("Broadcasting is available only inside the verified Adult Studio portal.");
  });

  it("provides simultaneous outlet screen and chat tiles", () => {
    const page = source("client/src/pages/VirelleBroadcastRender.tsx");
    expect(page).toContain("Adult Studio Control Room");
    expect(page).toContain("Channel chat URL");
    expect(page).toContain("Live screen / dashboard URL");
    expect(page).toContain("Companion window");
  });

  it("leaves only the supplied Adult Studio logo asset pending", () => {
    const button = source("client/src/components/AdultStudioAccessButton.tsx");
    expect(button).toContain('/adult-studio-access-logo.png');
    expect(button).toContain('setLocation("/adult-studio")');
  });
});
''',
)

print("Adult Studio access, product boundaries, control room and landing overhaul applied.")
