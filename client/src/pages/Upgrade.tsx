import { useState } from "react";
  import { useLocation } from "wouter";
  import { Check, Zap, Film, Star, Crown, Sparkles, ChevronRight, ArrowLeft } from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";

  // ─── Tier definitions ─────────────────────────────────────────────────────────

  const TIERS = [
    {
      id: "indie" as const,
      name: "Indie",
      tagline: "Perfect for solo filmmakers getting started",
      icon: Film,
      monthlyPrice: 149,
      annualMonthly: 124, // A$1,490/yr ÷ 12
      annualTotal: 1490,
      monthlyCredits: 500,
      color: "amber",
      features: [
        "500 AI credits per month",
        "2 active projects",
        "3 scenes per project",
        "AI Character Generation",
        "AI Script Writer",
        "Director's AI Assistant",
        "Shot List & Mood Board Generator",
        "Budget Estimator AI",
        "Dialogue Editor AI",
        "Location Scout AI",
        "720p standard quality",
        "7-day free trial included",
      ],
      notIncluded: [
        "Movie export",
        "HD / 4K export",
        "Trailer generation",
        "Quick Generate",
        "Storyboard AI",
        "Sound effects & subtitles",
      ],
    },
    {
      id: "amateur" as const,
      name: "Creator",
      tagline: "For professional creators producing real content",
      icon: Zap,
      monthlyPrice: 490,
      annualMonthly: 408, // A$4,900/yr ÷ 12
      annualTotal: 4900,
      monthlyCredits: 2000,
      color: "gold",
      popular: true,
      features: [
        "2,000 AI credits per month",
        "10 active projects",
        "20 scenes per project",
        "Everything in Indie, plus:",
        "Quick Generate (instant scenes)",
        "Color Grading AI",
        "Sound Effects AI",
        "Subtitle Generation AI",
        "Storyboard Generator AI",
        "Continuity Check AI",
        "Credits Editor",
        "1080p HD export",
        "Movie export (10/month)",
      ],
      notIncluded: [
        "Trailer generation",
        "Ad / Poster Maker",
        "Visual Effects",
        "4K Ultra HD export",
        "Team collaboration",
        "Priority rendering",
      ],
    },
    {
      id: "independent" as const,
      name: "Industry",
      tagline: "Full production studio — for directors who mean business",
      icon: Crown,
      monthlyPrice: 1490,
      annualMonthly: 1242, // A$14,900/yr ÷ 12
      annualTotal: 14900,
      monthlyCredits: 6000,
      color: "platinum",
      features: [
        "6,000 AI credits per month",
        "25 active projects",
        "90 scenes per project",
        "Everything in Creator, plus:",
        "Trailer Generation AI",
        "Ad / Poster Maker AI",
        "AI Casting Director",
        "Visual Effects Studio",
        "Multi-Shot Sequencer",
        "Live Action Plate integration",
        "Team collaboration (5 members)",
        "NLE export (Premiere, DaVinci)",
        "4K Ultra HD export",
        "50 movie exports per month",
        "Priority rendering queue",
        "Crowdfunding campaign tools",
      ],
      notIncluded: [],
    },
  ] as const;

  type TierId = (typeof TIERS)[number]["id"];

  // ─── Why Upgrade data ─────────────────────────────────────────────────────────

  const WHY_UPGRADE = [
    {
      icon: "🎬",
      title: "More Credits = More Films",
      body:
        "Every AI generation costs credits. On Indie you get 500/mo — enough to explore. " +
        "Creator gives you 2,000 — enough to produce consistently. Industry's 6,000 means you never have to think about it.",
    },
    {
      icon: "🎞️",
      title: "Unlock the Full Pipeline",
      body:
        "Indie covers the basics. Creator adds HD movie export, storyboards, sound effects, and colour grading — " +
        "the complete post-production toolkit. Industry adds trailer generation, VFX, and 4K output so your work looks theatrical.",
    },
    {
      icon: "⚡",
      title: "Priority Rendering",
      body:
        "Industry members jump to the front of the rendering queue. " +
        "No waiting. Your scenes process immediately, even during peak hours — " +
        "because a professional workflow can't afford to stall.",
    },
    {
      icon: "🤝",
      title: "Collaborate With Your Crew",
      body:
        "Industry unlocks team collaboration for up to 5 members. " +
        "Invite your DP, editor, or co-writer to work on the same project in real time — " +
        "the way a real production runs.",
    },
  ];

  // ─── Component ────────────────────────────────────────────────────────────────

  export default function UpgradePage() {
    const [billing, setBilling] = useState<"monthly" | "annual">("annual");
    const [loadingTier, setLoadingTier] = useState<TierId | null>(null);
    const [, navigate] = useLocation();

    const createCheckout = trpc.subscription.createCheckout.useMutation({
      onSuccess: (data) => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast.error("Could not create checkout session — please try again.");
        }
        setLoadingTier(null);
      },
      onError: (err) => {
        toast.error(err.message || "Something went wrong. Please try again.");
        setLoadingTier(null);
      },
    });

    const handleSelect = (tierId: TierId) => {
      setLoadingTier(tierId);
      const origin = window.location.origin;
      createCheckout.mutate({
        tier: tierId,
        billing,
        successUrl: `${origin}/billing/success?upgraded=1`,
        cancelUrl: `${origin}/upgrade?cancelled=1`,
      });
    };

    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-amber-400">Upgrade Your Studio</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16">

          {/* Hero */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400 uppercase tracking-widest">Choose Your Plan</span>
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Unlock Your Full Creative Power
            </h1>
            <p className="text-muted-foreground text-lg">
              From solo indie director to full production house — pick the tier that matches your ambition.
            </p>

            {/* Billing toggle */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setBilling("monthly")}
                className={`text-sm font-medium transition-colors ${billing === "monthly" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-amber-600/30 border border-amber-500/40 transition-colors hover:bg-amber-600/40"
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-amber-400 shadow transition-transform ${billing === "annual" ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`text-sm font-medium transition-colors ${billing === "annual" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Annual
                <span className="ml-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const price = billing === "annual" ? tier.annualMonthly : tier.monthlyPrice;
              const isLoading = loadingTier === tier.id;

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden
                    ${tier.popular
                      ? "border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-background shadow-[0_0_40px_rgba(217,119,6,0.15)] scale-[1.02]"
                      : "border-border/60 bg-card hover:border-amber-500/30"
                    }`}
                >
                  {tier.popular && (
                    <div className="bg-amber-600 text-white text-xs font-bold text-center py-1.5 tracking-wider uppercase">
                      Most Popular
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1 gap-5">
                    {/* Tier header */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-5 h-5 text-amber-400" />
                        <span className="font-bold text-lg text-foreground">{tier.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">{tier.tagline}</p>
                    </div>

                    {/* Price */}
                    <div>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold text-foreground">A${price}</span>
                        <span className="text-muted-foreground text-sm mb-1">/mo</span>
                      </div>
                      {billing === "annual" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Billed A${tier.annualTotal.toLocaleString()}/year — saves A${((tier.monthlyPrice * 12) - tier.annualTotal).toLocaleString()}
                        </p>
                      )}
                      <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">
                          {tier.monthlyCredits.toLocaleString()} credits / month
                        </span>
                      </div>
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={() => handleSelect(tier.id)}
                      disabled={createCheckout.isPending}
                      className={`w-full font-semibold ${
                        tier.popular
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
                          : "bg-foreground/10 hover:bg-amber-600 hover:text-white text-foreground border border-border/60"
                      }`}
                    >
                      {isLoading ? "Redirecting..." : tier.id === "indie" ? "Start 7-Day Free Trial" : `Upgrade to ${tier.name}`}
                      {!isLoading && <ChevronRight className="w-4 h-4 ml-1" />}
                    </Button>

                    {tier.id === "indie" && (
                      <p className="text-xs text-center text-muted-foreground -mt-3">
                        No charge today. Auto-renews after 7 days.
                      </p>
                    )}

                    {/* Features */}
                    <div className="space-y-2 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">What's included</p>
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${f.endsWith(":") ? "opacity-0" : "text-amber-400"}`} />
                          <span className={`${f.endsWith(":") ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{f}</span>
                        </div>
                      ))}
                      {tier.notIncluded.length > 0 && (
                        <>
                          <div className="h-px bg-border/40 my-3" />
                          {tier.notIncluded.map((f) => (
                            <div key={f} className="flex items-start gap-2 text-sm opacity-40">
                              <span className="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center text-muted-foreground">—</span>
                              <span className="text-muted-foreground line-through">{f}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Why upgrade section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">Why Directors Upgrade</h2>
              <p className="text-muted-foreground mt-2">The difference between tiers isn't just credits — it's what you can make.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {WHY_UPGRADE.map((item) => (
                <div key={item.title} className="flex gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-amber-500/20 transition-colors">
                  <div className="text-3xl shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credit cost reference */}
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-foreground">What Your Credits Buy</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { action: "Generate Scene Video", cost: "10 credits" },
                { action: "Trailer Generation", cost: "20 credits" },
                { action: "Script Writer AI", cost: "8 credits" },
                { action: "AI Character Gen", cost: "Varies" },
                { action: "Storyboard AI", cost: "8 credits" },
                { action: "Subtitle Generation", cost: "8 credits" },
                { action: "Virelle AI Chat", cost: "2 credits/msg" },
                { action: "Export Final Film", cost: "8 credits" },
              ].map((item) => (
                <div key={item.action} className="rounded-lg bg-background/50 border border-border/40 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{item.action}</div>
                  <div className="text-sm font-semibold text-amber-400 mt-0.5">{item.cost}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Creator's 2,000 credits = ~200 scene generations per month. Industry's 6,000 = ~600.
              Top up any time with credit packs if you need more mid-month.
            </p>
          </div>

          {/* FAQ */}
          <div className="space-y-4 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-center text-foreground">Common Questions</h3>
            {[
              {
                q: "Is the 7-day trial really free?",
                a: "Yes. You enter your card, but nothing is charged for 7 days. Cancel anytime before the trial ends and you pay nothing.",
              },
              {
                q: "Can I switch tiers later?",
                a: "Absolutely. Upgrade or downgrade at any time from Account Settings → Billing. Changes take effect at the next billing cycle.",
              },
              {
                q: "Do unused credits roll over?",
                a: "Monthly credits reset each billing cycle. Credit pack top-ups never expire.",
              },
              {
                q: "What happens if I run out of credits?",
                a: "You can top up instantly with a credit pack (from A$19) or wait until your next billing cycle when credits refresh.",
              },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-border/50 bg-card p-4">
                <p className="font-semibold text-foreground text-sm">{item.q}</p>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="text-center py-6 space-y-3">
            <p className="text-muted-foreground text-sm">Questions? We're here.</p>
            <Button variant="outline" onClick={() => navigate("/contact")} className="hover:border-amber-500/50 hover:text-amber-400">
              Contact the Virelle team
            </Button>
          </div>

        </div>
      </div>
    );
  }
  