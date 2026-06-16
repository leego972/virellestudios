import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
  import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
  import {
    Sparkles,
    Shirt,
    Camera,
    DollarSign,
    Layers,
    Users,
    Star,
    ArrowRight,
    CheckCircle2,
    ChevronDown,
    Globe,
    Palette,
    TrendingUp,
    ShieldCheck,
    Zap,
    Clock,
    Gem,
  } from "lucide-react";
  import { useState } from "react";

  /* ─────────────────────── DATA ─────────────────────── */

  const HOW_IT_WORKS = [
    {
      step: "01",
      icon: UserPlus,
      title: "Apply as a Partner",
      body: "Create your designer profile — brand name, aesthetic, speciality (couture, costume, streetwear, period, fantasy). Annual founding-partner membership locks in your preferred rate.",
    },
    {
      step: "02",
      icon: Layers,
      title: "List Your Collection",
      body: "Upload looks, costume sets, or individual pieces with hi-res references, material notes, sizing, and availability windows. AI tags and categorises automatically.",
    },
    {
      step: "03",
      icon: Camera,
      title: "Filmmakers Discover You",
      body: "Productions using Virelle's AI continuity and wardrobe tools browse your catalogue and request pieces. You approve every booking.",
    },
    {
      step: "04",
      icon: DollarSign,
      title: "Get Paid Directly",
      body: "Stripe Connect deposits 95% of every transaction directly to your account within 2 business days. No invoicing, no chasing clients.",
    },
  ];

  const DESIGNER_BENEFITS = [
    { icon: TrendingUp, title: "A new revenue channel", body: "Reach independent filmmakers, content creators, and AI-assisted productions that traditional showrooms never see." },
    { icon: Globe,      title: "Global visibility",     body: "Your work is surfaced inside Virelle's AI storyboard and wardrobe tools — directly inside the filmmaker's workflow." },
    { icon: ShieldCheck,title: "You stay in control",   body: "Approve or decline every booking. Set your own pricing, availability, and usage terms." },
    { icon: Gem,        title: "95% revenue to you",    body: "Virelle takes only a 5% platform fee. No hidden commissions, no middlemen." },
    { icon: Sparkles,   title: "AI-powered discovery",  body: "Our wardrobe continuity AI matches your pieces to productions by scene tone, era, palette, and character DNA." },
    { icon: Star,       title: "Founding Partner rates", body: "Join now at our launch rate of A\$150/year — locked in as long as you remain a member." },
  ];

  const FILMMAKER_BENEFITS = [
    { icon: Shirt,    title: "Real pieces, real vision", body: "Browse authenticated designer and costume-house catalogues — no guessing games, no stock-photo substitutes." },
    { icon: Zap,      title: "AI-matched to your scene", body: "Virelle's wardrobe AI reads your script and mood board, then surfaces pieces that match your character and setting automatically." },
    { icon: Clock,    title: "Fast approvals",            body: "Request and confirm pieces without leaving the platform. Designers respond inside Virelle — no email chains." },
    { icon: DollarSign,title: "Transparent pricing",     body: "See rates upfront. Pay per project or per scene. No surprise costs at wrap." },
  ];

  const FAQS = [
    {
      q: "Do I need to ship physical garments?",
      a: "You decide. Some partners offer physical loans for local productions; others list purely for digital/AI reference use (high-res scans for AI wardrobe continuity). Both models are supported.",
    },
    {
      q: "What counts as a 'listing'?",
      a: "A listing is a piece or collection you make available for booking. You can list individual garments, full costume sets, or seasonal editorial collections. There is no limit on listings.",
    },
    {
      q: "How does the 5% fee work?",
      a: "When a filmmaker pays for access to your piece or collection, Virelle retains 5% as a platform fee. The remaining 95% is deposited directly to your Stripe Connect account. Your annual membership is separate and covers your designer profile and unlimited listings.",
    },
    {
      q: "What is the founding-partner rate?",
      a: "Designers who join during the launch period pay A\$150/year. This rate is locked in for as long as your membership remains active — future pricing will be higher for new members joining after launch.",
    },
    {
      q: "Can I cancel my membership?",
      a: "Yes. Cancel anytime from your Designer Studio dashboard. Your profile and listings remain visible until the end of your billing period, after which they are unpublished automatically.",
    },
    {
      q: "Is Virelle replacing designers?",
      a: "No. Virelle's AI tools help filmmakers plan and maintain visual consistency — but they still need real designs, real references, and real creative vision. This platform gives you a direct channel into that process.",
    },
    {
      q: "Who can join?",
      a: "Fashion designers, costume houses, wardrobe stylists, vintage dealers, prop-costume specialists, and independent artisans. If you create or curate wearables for visual storytelling, you belong here.",
    },
  ];

  /* ─────────────── PLACEHOLDER — filled after import resolution ── */
  function UserPlus(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="19" y1="8" x2="19" y2="14"/>
        <line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
    );
  }

  /* ─────────────────────── FAQ ITEM ─────────────────── */
  function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
      <div
        className="border-b cursor-pointer group"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center justify-between py-4 gap-4">
          <p className="text-sm font-medium text-foreground/80 group-hover:text-amber-400 transition-colors pr-4">{q}</p>
          <ChevronDown
            className={`h-4 w-4 text-amber-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
        {open && (
          <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
        )}
      </div>
    );
  }

  /* ─────────────────────── PAGE ─────────────────────── */
  export default function DesignersPage() {
    const [, setLocation] = useLocation();

    return (
      <div
        className="min-h-screen text-foreground relative"
        style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}
      >
        <GoldWatermarkLaunch />

        {/* ═══════════════ 1 — HERO ═══════════════ */}
        <section className="relative overflow-hidden pt-24 pb-20 px-4">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%,rgba(212,175,55,0.08) 0%,transparent 70%)",
            }}
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 text-xs font-semibold uppercase tracking-widest"
              style={{ borderColor:"rgba(212,175,55,0.35)", background:"rgba(212,175,55,0.07)", color:"#d4af37" }}>
              <Gem className="w-3.5 h-3.5" />
              Designer &amp; Costume Partner Programme
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Your work belongs{" "}
              <span className="gradient-text-gold">on screen.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed">
              Virelle connects fashion designers, costume houses, and wardrobe stylists with AI-assisted film productions worldwide. List your collection. Get discovered. Keep 95%.
            </p>

            <p className="text-sm text-amber-400/70 mb-10">
              Founding partner rate: <strong className="text-amber-400">A$150/year</strong> — locked in for life.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation("/designer-register")}
                className="gap-2 px-8 text-sm font-semibold"
                style={{ background: "linear-gradient(135deg,#b8860b,#d4af37,#b8860b)", color: "#07070e" }}
              >
                Join as a Designer Partner
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/designer-wardrobe")}
                className="gap-2 px-8 text-sm border-white/15 text-foreground/70 hover:border-amber-500/40 hover:text-amber-400"
              >
                Browse the Wardrobe Library
              </Button>
            </div>

            {/* Social proof micro-line */}
            <div className="mt-10 flex items-center justify-center gap-6 flex-wrap text-xs text-muted-foreground/50">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500/60" /> No listing fees</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500/60" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500/60" /> Direct Stripe payouts</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500/60" /> AI-powered discovery</span>
            </div>
          </div>
        </section>

        {/* ═══════════════ 2 — HOW IT WORKS ═══════════════ */}
        <section className="py-20 px-4 relative">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold mb-3">Process</p>
              <h2 className="text-3xl font-bold gradient-text-gold">How it works</h2>
              <p className="mt-3 text-muted-foreground text-sm max-w-xl mx-auto">From application to your first payout in four straightforward steps.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map(({ step, icon: Icon, title, body }) => (
                <div
                  key={step}
                  className="relative p-6 rounded-2xl border group hover:border-amber-500/30 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  <div className="text-[42px] font-black leading-none mb-4"
                    style={{ color: "rgba(212,175,55,0.12)", fontVariantNumeric: "tabular-nums" }}>
                    {step}
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(212,175,55,0.12)" }}>
                    <Icon className="w-4.5 h-4.5 text-amber-400" style={{ width:"18px", height:"18px" }} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-amber-400 transition-colors">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ 3 — DESIGNER BENEFITS ═══════════════ */}
        <section className="py-20 px-4" style={{ background:"rgba(212,175,55,0.025)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold mb-3">For Designers</p>
              <h2 className="text-3xl font-bold gradient-text-gold">Why partner with Virelle</h2>
              <p className="mt-3 text-muted-foreground text-sm max-w-xl mx-auto">
                We're not replacing designers. We're giving you a direct line into a new creative economy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {DESIGNER_BENEFITS.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="p-6 rounded-2xl border hover:border-amber-500/25 transition-all duration-300 group"
                  style={{ background:"rgba(7,7,14,0.6)", borderColor:"rgba(255,255,255,0.07)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background:"rgba(212,175,55,0.1)" }}>
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-amber-400 transition-colors">{title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ 4 — FILMMAKER BENEFITS ═══════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="lg:flex lg:items-start lg:gap-16">
              {/* Left label column */}
              <div className="lg:w-72 shrink-0 mb-10 lg:mb-0">
                <p className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold mb-3">For Filmmakers</p>
                <h2 className="text-3xl font-bold gradient-text-gold mb-4">Real wardrobe.<br />Real vision.</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  When your production uses the Virelle wardrobe library, AI continuity tools surface partner pieces that match your script, palette, and character — automatically.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/designer-wardrobe")}
                  className="gap-2 text-xs border-amber-500/25 text-amber-400 hover:bg-amber-500/10"
                >
                  Explore the Wardrobe Library <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Right cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {FILMMAKER_BENEFITS.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="p-5 rounded-xl border"
                    style={{ background:"rgba(255,255,255,0.02)", borderColor:"rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background:"rgba(212,175,55,0.1)" }}>
                        <Icon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ 5 — COMMISSION & MEMBERSHIP ═══════════════ */}
        <section className="py-20 px-4" style={{ background:"rgba(212,175,55,0.025)" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold mb-3">Pricing</p>
              <h2 className="text-3xl font-bold gradient-text-gold">Transparent. Simple. Fair.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Membership card */}
              <div
                className="p-8 rounded-2xl border relative overflow-hidden"
                style={{ borderColor:"rgba(212,175,55,0.35)", background:"linear-gradient(135deg,rgba(212,175,55,0.06) 0%,rgba(7,7,14,0.8) 100%)" }}
              >
                {/* Glow */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent)" }} />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background:"rgba(212,175,55,0.15)" }}>
                    <Star className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-500/60 uppercase tracking-widest font-semibold">Designer Membership</p>
                    <p className="text-2xl font-bold text-amber-400">A$150 <span className="text-sm font-normal text-muted-foreground">/ year</span></p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 text-sm text-muted-foreground">
                  {[
                    "Founding-partner rate — locked in for life",
                    "Unlimited collection listings",
                    "AI-powered wardrobe discovery",
                    "Designer Studio dashboard",
                    "Stripe Connect payout account",
                    "Priority support & early features",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full gap-2 font-semibold"
                  onClick={() => setLocation("/designer-register")}
                  style={{ background:"linear-gradient(135deg,#b8860b,#d4af37,#b8860b)", color:"#07070e" }}
                >
                  Join as a Founding Partner
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Commission breakdown */}
              <div
                className="p-8 rounded-2xl border"
                style={{ borderColor:"rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.02)" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background:"rgba(212,175,55,0.1)" }}>
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-amber-500/60 uppercase tracking-widest font-semibold">Per-Transaction Split</p>
                    <p className="text-2xl font-bold text-foreground">95 / 5</p>
                  </div>
                </div>

                {/* Visual bar */}
                <div className="mb-6">
                  <div className="h-3 rounded-full overflow-hidden flex" style={{ background:"rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-l-full" style={{ width:"95%", background:"linear-gradient(90deg,#b8860b,#d4af37)" }} />
                    <div className="h-full rounded-r-full" style={{ width:"5%", background:"rgba(255,255,255,0.15)" }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-amber-400 font-semibold">95% → You</span>
                    <span className="text-muted-foreground/50">5% → Virelle platform</span>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>Every time a filmmaker pays for access to your piece or collection:</p>
                  <div className="p-4 rounded-xl space-y-2" style={{ background:"rgba(212,175,55,0.05)", border:"1px solid rgba(212,175,55,0.15)" }}>
                    <div className="flex justify-between text-xs">
                      <span>Filmmaker pays</span>
                      <span className="text-foreground font-medium">A$100.00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Platform fee (5%)</span>
                      <span className="text-muted-foreground/60">— A$5.00</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-xs" style={{ borderColor:"rgba(212,175,55,0.2)" }}>
                      <span className="font-semibold text-amber-400">You receive</span>
                      <span className="font-bold text-amber-400">A$95.00</span>
                    </div>
                  </div>
                  <p className="text-xs">Payouts land in your Stripe account within 2 business days. No invoicing required.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ 6 — FAQ ═══════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-[10px] uppercase tracking-widest text-amber-500/60 font-semibold mb-3">FAQ</p>
              <h2 className="text-3xl font-bold gradient-text-gold">Common questions</h2>
            </div>
            <div>
              {FAQS.map(({ q, a }) => (
                <FaqItem key={q} q={q} a={a} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ 7 — FINAL CTA ═══════════════ */}
        <section className="py-24 px-4 relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background:"radial-gradient(ellipse 70% 50% at 50% 100%,rgba(212,175,55,0.07) 0%,transparent 70%)" }} />

          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background:"linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.05))", border:"1px solid rgba(212,175,55,0.3)" }}>
              <Palette className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to get your work{" "}
              <span className="gradient-text-gold">on set?</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed max-w-lg mx-auto">
              Apply today. Set up your profile, list your first collection, and start appearing inside Virelle's AI-assisted production tools — where filmmakers are already looking.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation("/designer-register")}
                className="gap-2 px-8 text-sm font-semibold"
                style={{ background:"linear-gradient(135deg,#b8860b,#d4af37,#b8860b)", color:"#07070e" }}
              >
                Join as a Designer Partner
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setLocation("/designer/studio")}
                className="gap-2 px-8 text-sm text-muted-foreground hover:text-amber-400"
              >
                Already a partner? Sign in <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <p className="mt-8 text-xs text-muted-foreground/40">
              Questions? Email{" "}
              <a href="mailto:studiosvirelle@gmail.com" className="text-amber-500/60 hover:text-amber-400 transition-colors">studiosvirelle@gmail.com</a>
            </p>
          </div>
        </section>

        <LeegoFooterLaunch />
      </div>
    );
  }
  