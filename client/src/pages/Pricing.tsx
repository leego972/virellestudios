import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Lock, Sparkles, Clapperboard, Wand2, Timer, Coins, ShoppingCart, Camera, PhoneCall, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

// ─── Tier Definitions ────────────────────────────────────────────────────────
// All prices in AUD. Auteur and Production Pro support monthly/annual toggle.
// Studio and Industry Enterprise are consultative — no toggle, no self-checkout.

const SELF_SERVE_TIERS = [
  {
    id: "amateur",         // Internal DB key — maps to "Auteur" display name
    displayName: "Auteur",
    icon: Camera,
    color: "border-emerald-500 ring-2 ring-emerald-500/20",
    buttonColor: "bg-emerald-600 hover:bg-emerald-500",
    accentColor: "text-emerald-400",
    monthly: 1250,         // AUD 1,250/month
    annual: 12000,         // AUD 12,000/year
    credits: 2000,
    badge: "Entry Tier",
    badgeColor: "bg-emerald-700",
    audience: "Serious solo filmmakers, creator-directors, paid students, and boutique creators.",
    description: "Premium creative development for serious solo filmmakers and creator-directors. Includes your core writing, pre-production, story, character, and cinematic planning toolkit. Best for directors developing proof-of-concept films, trailers, shorts, and high-end creator projects.",
    highlights: [
      "2,000 credits/month included",
      "AI Script Writer & Screenplay Tools",
      "Character Creator & DNA Lock",
      "Director's AI Assistant (Virelle Chat)",
      "Location Scout & Mood Board",
      "Dialogue Editor & Budget Estimator",
      "Shot List Generator",
      "Up to 2 projects, 5 scenes each",
      "720p export",
      "Upgrade anytime to unlock video & export",
    ],
    primaryCTA: "Start Creating",
    secondaryCTA: "View Feature Breakdown",
    selfServe: true,
  },
  {
    id: "independent",     // Internal DB key — maps to "Production Pro" display name
    displayName: "Production Pro",
    icon: Film,
    color: "border-amber-500 ring-2 ring-amber-500/20",
    buttonColor: "bg-amber-600 hover:bg-amber-500",
    accentColor: "text-amber-400",
    monthly: 3900,         // AUD 3,900/month
    annual: 36000,         // AUD 36,000/year
    credits: 5500,
    badge: "Commercial Tier",
    badgeColor: "bg-amber-700",
    audience: "Indie producers, boutique studios, agencies, and commercial directors.",
    description: "Commercial production workflow for indie producers, boutique studios, and paid client work. Adds fuller video generation, export quality, team collaboration, post-production capabilities, and higher project volume. Best for repeat output, paid campaigns, music videos, branded content, and independent film packages.",
    highlights: [
      "5,500 credits/month included",
      "All creative & pre-production tools",
      "AI Script Writer & Storyboard",
      "Character Creator & DNA Lock",
      "Virelle AI Director Chat",
      "Video Generation & Film Export",
      "Film Post-Production (ADR, Foley, Score, Mix)",
      "Subtitles in 130+ languages",
      "Bulk generation tools",
      "Ad & Poster Maker",
      "Up to 25 projects, 90 min per film",
      "1080p + 4K export",
      "5 team members",
    ],
    primaryCTA: "Start Producing",
    secondaryCTA: "See Workflow Features",
    selfServe: true,
  },
];

const ENTERPRISE_TIERS = [
  {
    id: "studio",
    displayName: "Studio",
    icon: Building2,
    color: "border-violet-500 ring-2 ring-violet-500/20 bg-violet-500/5",
    buttonColor: "bg-violet-600 hover:bg-violet-500",
    accentColor: "text-violet-400",
    priceDisplay: "From A$150,000",
    priceNote: "/year",
    credits: 15500,
    badge: "Most Popular",
    badgeColor: "bg-violet-700",
    popular: true,
    audience: "Production companies, VFX teams, and repeat-output studios.",
    description: "Production infrastructure for companies operating multiple active projects and client pipelines. Adds VFX workflow, sequencing, white-label exports, API access, pipeline integration, and priority rendering. Route all high-intent buyers into a private demo.",
    highlights: [
      "15,500 credits/month included",
      "Everything in Production Pro, plus:",
      "Up to 100 projects, 150 min per film",
      "VFX Suite (Advanced Effects)",
      "Multi-Shot Sequencer",
      "NLE / DaVinci Resolve Export",
      "AI Casting Tool",
      "White-Label Exports",
      "Priority rendering queue",
      "25 team members",
      "API Access & Pipeline Integration",
      "Global Funding Directory (94 funders, 73 countries)",
    ],
    primaryCTA: "Book a Private Demo",
    secondaryCTA: "Request Studio Pricing",
    selfServe: false,
  },
  {
    id: "industry",
    displayName: "Industry Enterprise",
    icon: Crown,
    color: "border-yellow-500 ring-2 ring-yellow-500/30 bg-yellow-500/5",
    buttonColor: "bg-yellow-600 hover:bg-yellow-500",
    accentColor: "text-yellow-400",
    priceDisplay: "Custom Pricing",
    priceNote: "",
    credits: 50500,
    badge: "Enterprise",
    badgeColor: "bg-yellow-700",
    audience: "Major studios, broadcasters, enterprise brands, and agencies.",
    description: "Contract-led deployment for major studios, broadcasters, agency groups, and high-volume enterprise buyers. Adds custom model tuning, dedicated account support, advanced export and compositing options, and bespoke commercial terms. Emphasise private consultation, procurement support, and scaled deployment design.",
    highlights: [
      "Credits tailored to deployment scope",
      "Everything in Studio, plus:",
      "Unlimited projects, 180 min per film",
      "4K + ProRes export",
      "Live Action Plate Compositing",
      "Custom AI Model Fine-Tuning",
      "Dedicated Account Manager",
      "Unlimited team members",
      "Custom onboarding & workflow design",
      "Bespoke commercial terms",
    ],
    primaryCTA: "Discuss Enterprise Workflow",
    secondaryCTA: "Contact Sales",
    selfServe: false,
  },
];

const ALL_TIERS = [...SELF_SERVE_TIERS, ...ENTERPRISE_TIERS];

// ─── Credit Packs ─────────────────────────────────────────────────────────────
const CREDIT_PACKS = [
  { id: "topup_10",   credits: 500,   price: 750,   perCredit: 1.50, label: "Starter Pack",     saving: "" },
  { id: "topup_50",   credits: 1500,  price: 1800,  perCredit: 1.20, label: "Producer Pack",    saving: "Save 20%" },
  { id: "topup_100",  credits: 3000,  price: 3150,  perCredit: 1.05, label: "Director Pack",    saving: "Save 30%" },
  { id: "topup_200",  credits: 6000,  price: 5400,  perCredit: 0.90, label: "Studio Pack",      saving: "Save 40%", popular: true },
  { id: "topup_500",  credits: 12000, price: 9000,  perCredit: 0.75, label: "Blockbuster Pack", saving: "Save 50%" },
  { id: "topup_1000", credits: 25000, price: 15000, perCredit: 0.60, label: "Mogul Pack",       saving: "Save 60%" },
];

// ─── Credit Cost Reference ────────────────────────────────────────────────────
const CREDIT_COSTS = [
  { action: "Create New Project", cost: 0, icon: "📁" },
  { action: "Generate Film (AI Scene Breakdown)", cost: 10, icon: "🎬" },
  { action: "Generate Scene Video (≤45s)", cost: 10, icon: "🎥" },
  { action: "Regenerate Scene Video", cost: 8, icon: "🔄" },
  { action: "Generate Preview Image", cost: 3, icon: "🖼️" },
  { action: "Bulk Generate All Previews (per scene)", cost: 3, icon: "📸" },
  { action: "Bulk Generate All Videos (per scene)", cost: 10, icon: "📹" },
  { action: "Virelle AI Chat (per message)", cost: 2, icon: "💬" },
  { action: "AI Script Writer", cost: 8, icon: "📝" },
  { action: "AI Storyboard Generation", cost: 8, icon: "🎨" },
  { action: "AI Dialogue Polish", cost: 5, icon: "🗣️" },
  { action: "AI Continuity Check", cost: 5, icon: "🔍" },
  { action: "AI Shot List Generation", cost: 5, icon: "📋" },
  { action: "Trailer Generation", cost: 20, icon: "🎞️" },
  { action: "Ad/Poster Generation", cost: 5, icon: "🖼️" },
  { action: "Subtitle Generation", cost: 8, icon: "💬" },
  { action: "Export Final Film", cost: 8, icon: "💾" },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: "Why are Studio and Industry Enterprise plans custom-priced?",
    a: "Because production volume, credits, support scope, onboarding, integrations, and deployment terms vary significantly across professional teams. We tailor the commercial structure to your pipeline rather than forcing enterprise production into a consumer subscription model.",
  },
  {
    q: "Is Virelle a low-cost creator tool?",
    a: "No. Virelle is premium cinematic production infrastructure built for serious creative and commercial output. It is priced accordingly — from boutique creator-directors through to major studio and broadcast pipelines.",
  },
  {
    q: "Can I start smaller and scale later?",
    a: "Yes. Teams can begin on Auteur or Production Pro and expand into Studio or Industry Enterprise contracts as throughput and workflow complexity increase. Your credits and project history carry forward.",
  },
  {
    q: "Do enterprise plans include credits and support?",
    a: "Yes. Enterprise scope is tailored to usage volume, team size, workflow design, and support requirements. Credits, onboarding, dedicated account management, and deployment terms are all negotiated as part of the contract.",
  },
  {
    q: "What is the Founding Member offer?",
    a: "The first 50 directors who join on an annual plan receive 50% off their first year. This is a one-time founding discount applied automatically at checkout. It renews at the standard annual rate.",
  },
  {
    q: "How does the credits system work?",
    a: "Every action on the platform uses credits — video generation, script writing, storyboarding, exports, and more. Your membership includes a monthly credit allocation. You can purchase additional credit packs at any time at a discounted rate versus the per-credit membership rate.",
  },
  {
    q: "What is BYOK?",
    a: "BYOK stands for Bring Your Own Key. You connect your own API keys for video generation (Runway, Sora, Replicate, fal.ai, Luma), voice acting (ElevenLabs), AI chat (OpenAI, Anthropic, Google), and music (Suno). This keeps your costs transparent and gives you full control over quality and spend.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: currentUser } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isLoggedIn = !!currentUser;

  const { data: spotsData, refetch: refetchSpots } = trpc.subscription.foundingSpots.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const spotsRemaining = spotsData?.spotsRemaining ?? 19;
  const offerFull = spotsData?.isFull ?? false;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      toast.success("You're now a member. Welcome to Virelle Studios.");
      refetchSpots();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("subscription") === "canceled") {
      toast.info("Checkout was canceled. You can subscribe anytime.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refetchSpots]);

  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    enabled: isLoggedIn,
  });

  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  const isActiveMember = isLoggedIn && status?.status === "active";
  const currentTier = status?.tier || null;

  // Map DB tier IDs to display names
  const tierDisplayNames: Record<string, string> = {
    amateur: "Auteur",
    independent: "Production Pro",
    studio: "Studio",
    industry: "Industry Enterprise",
    creator: "Production Pro",
    beta: "Beta",
  };

  const handleSubscribe = async (tierId: string) => {
    if (!isLoggedIn) {
      setLocation("/register");
      return;
    }
    setLoadingTier(tierId);
    try {
      if (isActiveMember) {
        const result = await portalMutation.mutateAsync({ returnUrl: window.location.href });
        window.location.href = result.url;
        return;
      }
      const result = await checkoutMutation.mutateAsync({
        tier: tierId as any,
        billing: billingCycle,
        successUrl: `${window.location.origin}/?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
      });
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManageBilling = async () => {
    setLoadingTier("manage");
    try {
      const result = await portalMutation.mutateAsync({ returnUrl: window.location.href });
      window.location.href = result.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleEnterpriseContact = (type: "demo" | "sales" | "studio") => {
    const subject = type === "demo"
      ? "Virelle Studios — Book a Private Demo"
      : type === "studio"
      ? "Virelle Studios — Studio Pricing Enquiry"
      : "Virelle Studios — Industry Enterprise Enquiry";
    window.location.href = `mailto:Studiosvirelle@gmail.com?subject=${encodeURIComponent(subject)}`;
  };

  const formatAUD = (amount: number) =>
    new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-screen bg-background relative">
      <GoldWatermark />

      {/* ─── Founding Offer Banner ─── */}
      {!offerFull && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm font-black uppercase tracking-widest">🎬 FOUNDING OFFER</span>
            <span className="text-sm font-bold">50% off your first year's membership</span>
            <span className="text-xs font-medium opacity-80">— Limited to the first 50 founding directors.</span>
            <span className="bg-black/20 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {spotsRemaining} of 50 spots remaining
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">

        {/* ─── Page Header ─── */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png"
              alt="Virelle Studios"
              className="h-14 w-14 rounded-lg"
            />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Pricing</h1>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground/90 max-w-3xl mx-auto mb-3">
            Choose the production stack that matches your output, team size, and cinematic ambition.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto">
            From solo auteur development to studio-scale AI production infrastructure, Virelle is priced for serious creators, production teams, and enterprise pipelines.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-3 max-w-2xl mx-auto">
            For high-volume studios and enterprise production pipelines, custom contracts are available.
          </p>
          {status?.isAdmin && (
            <Badge variant="outline" className="mt-4 border-amber-500 text-amber-500">
              <Crown className="w-3 h-3 mr-1" /> Admin — Full Access Granted
            </Badge>
          )}
        </div>

        {/* ─── Current Subscription Info ─── */}
        {isActiveMember && (
          <div className="max-w-md mx-auto mb-10 p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
            <p className="text-sm text-green-400">
              You're on the <strong>{tierDisplayNames[currentTier || ""] || currentTier}</strong> membership
              {status!.currentPeriodEnd && (
                <> · Renews {new Date(status!.currentPeriodEnd).toLocaleDateString("en-AU")}</>
              )}
            </p>
            <Button
              variant="link"
              className="text-green-400 mt-1"
              onClick={handleManageBilling}
              disabled={loadingTier === "manage"}
            >
              {loadingTier === "manage" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Manage Billing
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: MEMBERSHIP TIERS                                  */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Crown className="w-7 h-7 text-amber-400" />
              Membership Plans
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              No free tier. Virelle is professional cinematic production infrastructure. Choose your level and start creating.
            </p>
          </div>

          {/* ─── Billing Toggle — Auteur & Production Pro only ─── */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingCycle === "annual"
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs text-green-400 font-semibold">(Save ~20%)</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Billing toggle applies to Auteur and Production Pro. Studio and Industry Enterprise are priced by consultation.
            </p>
          </div>

          {/* ─── Self-Serve Tier Cards (Auteur + Production Pro) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
            {SELF_SERVE_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrentTier = currentTier === tier.id || currentTier === (tier.id === "independent" ? "creator" : "");
              const price = billingCycle === "annual" ? tier.annual : tier.monthly;
              const showFounderPrice = billingCycle === "annual" && !offerFull;

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${tier.color} transition-all`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${tier.badgeColor} text-white px-4 py-1`}>{tier.badge}</Badge>
                  </div>

                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-5 h-5 ${tier.accentColor}`} />
                      <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-3">{tier.audience}</p>
                    <CardDescription className="text-sm leading-relaxed min-h-[4rem]">
                      {tier.description}
                    </CardDescription>

                    <div className="mt-4">
                      {showFounderPrice ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className={`text-3xl font-bold ${tier.accentColor}`}>
                              {formatAUD(Math.round(price / 2))}
                            </span>
                            <span className="text-lg line-through text-muted-foreground">
                              {formatAUD(price)}
                            </span>
                          </div>
                          <p className={`text-xs font-semibold mt-0.5 ${tier.accentColor}`}>
                            50% off first year — founding member
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ({formatAUD(Math.round(price / 2 / 12))}/mo effective)
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">{formatAUD(price)}</span>
                          <span className="text-muted-foreground ml-1">
                            /{billingCycle === "annual" ? "year" : "month"}
                          </span>
                          {billingCycle === "annual" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ({formatAUD(Math.round(tier.annual / 12))}/mo effective)
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${tier.accentColor}`} />
                      <span className={`text-sm font-semibold ${tier.accentColor}`}>
                        {tier.credits.toLocaleString()} credits/month included
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-4">
                    <Button
                      className={`w-full text-white ${tier.buttonColor}`}
                      disabled={isCurrentTier || loadingTier === tier.id}
                      onClick={() => handleSubscribe(tier.id)}
                    >
                      {loadingTier === tier.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {isCurrentTier
                        ? "Current Membership"
                        : isActiveMember
                        ? `Switch to ${tier.displayName}`
                        : isLoggedIn
                        ? tier.primaryCTA
                        : tier.primaryCTA}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setLocation("/pricing#comparison")}
                    >
                      {tier.secondaryCTA}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* ─── Enterprise Tier Cards (Studio + Industry Enterprise) ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
            {ENTERPRISE_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrentTier = currentTier === tier.id;

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${tier.color} transition-all ${tier.popular ? "lg:scale-[1.02]" : ""}`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${tier.badgeColor} text-white px-4 py-1`}>{tier.badge}</Badge>
                  </div>

                  <CardHeader className="pb-4 pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-5 h-5 ${tier.accentColor}`} />
                      <CardTitle className="text-xl">{tier.displayName}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-3">{tier.audience}</p>
                    <CardDescription className="text-sm leading-relaxed min-h-[4rem]">
                      {tier.description}
                    </CardDescription>

                    <div className="mt-4">
                      <span className={`text-3xl font-bold ${tier.accentColor}`}>{tier.priceDisplay}</span>
                      {tier.priceNote && (
                        <span className="text-muted-foreground ml-1">{tier.priceNote}</span>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Pricing tailored to production volume, team size, and deployment scope.
                      </p>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${tier.accentColor}`} />
                      <span className={`text-sm font-semibold ${tier.accentColor}`}>
                        {tier.id === "industry"
                          ? "Credits tailored to scope"
                          : `${tier.credits.toLocaleString()} credits/month included`}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2 pt-4">
                    <Button
                      className={`w-full text-white ${tier.buttonColor}`}
                      onClick={() =>
                        handleEnterpriseContact(
                          tier.id === "studio" ? "demo" : "sales"
                        )
                      }
                    >
                      <CalendarDays className="w-4 h-4 mr-2" />
                      {tier.primaryCTA}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        handleEnterpriseContact(
                          tier.id === "studio" ? "studio" : "sales"
                        )
                      }
                    >
                      <PhoneCall className="w-3.5 h-3.5 mr-1" />
                      {tier.secondaryCTA}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          {/* ─── Trust Notes ─── */}
          <div className="max-w-3xl mx-auto mt-6 space-y-2 text-center">
            {!offerFull && billingCycle === "annual" && (
              <p className="text-xs text-muted-foreground">
                * 50% founding discount applied automatically at checkout for annual Auteur and Production Pro memberships. Valid for the first 50 founding directors only. Applies to the first year; renews at the standard annual rate.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              All prices in AUD. Auteur and Production Pro billed monthly or annually. Studio and Industry Enterprise priced by consultation.
            </p>
            <p className="text-xs text-amber-400/80 font-medium">
              Enterprise plans include onboarding, workflow design, custom credits, support scope, and deployment terms tailored to production volume.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: CREDITS SYSTEM                                    */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Coins className="w-7 h-7 text-amber-400" />
              How Credits Work
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Every action on the platform uses credits. Your membership includes a monthly credit allocation. Purchase additional credit packs at any time at a discounted rate.
            </p>
          </div>

          {/* Credit cost table */}
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Credit Costs Per Action
                </CardTitle>
                <CardDescription>
                  Every meaningful action costs credits. Plan your production accordingly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CREDIT_COSTS.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.action}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`border-amber-500/50 font-bold ${item.cost === 0 ? "text-green-400 border-green-500/50" : "text-amber-400"}`}
                      >
                        {item.cost === 0 ? "FREE" : `${item.cost} cr`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Example production costs */}
          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-xl font-bold mb-6 text-center">How many credits does a real project use?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-zinc-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>🎬</span> 10-Min Short Film
                  </CardTitle>
                  <CardDescription className="text-xs">12 scenes, AI voice, soundtrack, export</CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">AI scene breakdown</span><span className="text-amber-400 font-bold">10 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Preview images × 12</span><span className="text-amber-400 font-bold">36 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Scene videos × 12</span><span className="text-amber-400 font-bold">120 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Script + storyboard</span><span className="text-amber-400 font-bold">16 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Export film</span><span className="text-amber-400 font-bold">8 cr</span></div>
                  <div className="border-t border-amber-500/30 pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span><span className="text-amber-400">~190 credits</span>
                  </div>
                  <p className="text-muted-foreground pt-1">
                    Fits within the <span className="text-emerald-400 font-semibold">Auteur</span> monthly allowance (2,000 cr)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-500/30 ring-1 ring-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>🎥</span> 90-Min Feature Film
                  </CardTitle>
                  <CardDescription className="text-xs">60 scenes, full pipeline, trailer</CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">AI scene breakdown</span><span className="text-amber-400 font-bold">10 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Preview images × 60</span><span className="text-amber-400 font-bold">180 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Scene videos × 60</span><span className="text-amber-400 font-bold">600 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Script + storyboard</span><span className="text-amber-400 font-bold">16 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Trailer generation</span><span className="text-amber-400 font-bold">20 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Export + subtitles</span><span className="text-amber-400 font-bold">16 cr</span></div>
                  <div className="border-t border-amber-500/30 pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span><span className="text-amber-400">~842 credits</span>
                  </div>
                  <p className="text-muted-foreground pt-1">
                    Fits within the <span className="text-amber-400 font-semibold">Production Pro</span> monthly allowance (5,500 cr) with credits to spare
                  </p>
                </CardContent>
              </Card>

              <Card className="border-zinc-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>🎵</span> Music Video + Ad Campaign
                  </CardTitle>
                  <CardDescription className="text-xs">8 scenes, poster, social assets</CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Scene videos × 8</span><span className="text-amber-400 font-bold">80 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Poster image</span><span className="text-amber-400 font-bold">5 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">AI taglines + brand kit</span><span className="text-amber-400 font-bold">8 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Video ad</span><span className="text-amber-400 font-bold">10 cr</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Influencer kit</span><span className="text-amber-400 font-bold">5 cr</span></div>
                  <div className="border-t border-amber-500/30 pt-2 mt-2 flex justify-between font-bold">
                    <span>Total</span><span className="text-amber-400">~108 credits</span>
                  </div>
                  <p className="text-muted-foreground pt-1">
                    Well within the <span className="text-emerald-400 font-semibold">Auteur</span> monthly allowance (2,000 cr)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Credit value per tier */}
            <div className="mt-8 p-5 rounded-xl border border-border/50 bg-card/40">
              <h4 className="text-sm font-semibold mb-3 text-center">Included credit value by tier</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { tier: "Auteur",           credits: 2000,  monthly: 1250,  perCredit: 0.63, color: "text-emerald-400" },
                  { tier: "Production Pro",   credits: 5500,  monthly: 3900,  perCredit: 0.71, color: "text-amber-400" },
                  { tier: "Studio",           credits: 15500, monthly: null,  perCredit: null, color: "text-violet-400" },
                  { tier: "Industry Ent.",    credits: 50500, monthly: null,  perCredit: null, color: "text-yellow-400" },
                ].map((t) => (
                  <div key={t.tier} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <p className={`text-xs font-bold ${t.color}`}>{t.tier}</p>
                    <p className="text-lg font-bold mt-1">
                      {t.perCredit !== null ? `A$${t.perCredit.toFixed(2)}` : "Custom"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">per included credit</p>
                    <p className={`text-xs mt-1 font-semibold ${t.color}`}>
                      {t.credits.toLocaleString()} cr/mo
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Higher tiers include more credits at a lower effective rate. Studio and Enterprise credit allocations are negotiated as part of the contract.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: CREDIT PACKS                                      */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <ShoppingCart className="w-7 h-7 text-green-400" />
              Credit Packs
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Need more credits mid-production? Purchase packs at any time. The more you buy, the lower the per-credit rate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={`relative flex flex-col border-zinc-700 ${
                  pack.popular ? "ring-2 ring-green-500/30 border-green-500" : ""
                } ${isActiveMember ? "hover:border-green-500/50" : "opacity-80"} transition-all`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600 text-white px-4 py-1">Best Value</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{pack.label}</CardTitle>
                    <Badge variant="outline" className="border-green-500/50 text-green-400">
                      {pack.credits.toLocaleString()} credits
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-green-400">{formatAUD(pack.price)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatAUD(pack.perCredit)} per credit
                    {pack.saving && <span className="ml-2 text-green-400 font-semibold">{pack.saving}</span>}
                  </p>
                </CardHeader>
                <CardFooter className="pt-2">
                  {isActiveMember ? (
                    <Button className="w-full bg-green-600 hover:bg-green-500 text-white">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Purchase Pack
                    </Button>
                  ) : (
                    <Button className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed" disabled>
                      <Lock className="w-4 h-4 mr-2" />
                      Membership Required
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: FEATURE COMPARISON TABLE                          */}
        {/* ============================================================ */}
        <div id="comparison" className="mb-16 max-w-7xl mx-auto scroll-mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-emerald-400">Auteur</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-400">Production Pro</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-400">Studio</th>
                  <th className="text-center py-3 px-4 font-medium text-yellow-400">Industry Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { feature: "PRICING", section: "header" },
                  { feature: "Monthly Price",          auteur: "A$1,250",    pro: "A$3,900",    studio: "Contact Sales", industry: "Custom" },
                  { feature: "Annual Price",            auteur: "A$12,000",   pro: "A$36,000",   studio: "From A$150,000", industry: "Custom" },
                  { feature: "Founder Annual (50% yr 1)", auteur: "A$6,000", pro: "A$18,000",   studio: "—",             industry: "—" },
                  { feature: "Monthly Credits Included", auteur: "2,000",    pro: "5,500",      studio: "15,500",        industry: "Custom" },
                  { feature: "CREATIVE TOOLS", section: "header" },
                  { feature: "AI Script Writer",                 auteur: true,  pro: true,  studio: true,  industry: true },
                  { feature: "Storyboard Generator",             auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Character Creator & DNA Lock",     auteur: true,  pro: true,  studio: true,  industry: true },
                  { feature: "Virelle AI Director Chat",         auteur: true,  pro: true,  studio: true,  industry: true },
                  { feature: "Dialogue Editor",                  auteur: true,  pro: true,  studio: true,  industry: true },
                  { feature: "Shot List & Continuity Check",     auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Color Grading & LUT Presets",      auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "PRODUCTION PIPELINE", section: "header" },
                  { feature: "Video Generation",                 auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Film Export",                      auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Bulk Generation",                  auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Film Post-Production (ADR, Foley, Score, Mix)", auteur: false, pro: true, studio: true, industry: true },
                  { feature: "Subtitles (130+ languages)",       auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "ADVANCED & ENTERPRISE", section: "header" },
                  { feature: "VFX Suite",                        auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "Multi-Shot Sequencer",             auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "NLE / DaVinci Resolve Export",     auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "AI Casting Tool",                  auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "White-Label Exports",              auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "API Access & Pipeline Integration",auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "Priority Rendering Queue",         auteur: false, pro: false, studio: true,  industry: true },
                  { feature: "Custom AI Model Fine-Tuning",      auteur: false, pro: false, studio: false, industry: true },
                  { feature: "Live Action Plate Compositing",    auteur: false, pro: false, studio: false, industry: true },
                  { feature: "Dedicated Account Manager",        auteur: false, pro: false, studio: false, industry: true },
                  { feature: "Global Funding Directory (94 funders)", auteur: false, pro: false, studio: true, industry: true },
                  { feature: "AD MAKER & DISTRIBUTION", section: "header" },
                  { feature: "Ad & Poster Maker",                auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Platform Templates (Instagram, TikTok, YouTube)", auteur: false, pro: true, studio: true, industry: true },
                  { feature: "Direct Publish to Social Platforms", auteur: false, pro: true, studio: true, industry: true },
                  { feature: "AI Video Ad Generation",           auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "Press Kit Builder",                auteur: false, pro: true,  studio: true,  industry: true },
                  { feature: "LIMITS", section: "header" },
                  { feature: "Projects",                         auteur: "2",        pro: "25",        studio: "100",       industry: "Unlimited" },
                  { feature: "Max Film Duration",                auteur: "5 min",    pro: "90 min",    studio: "150 min",   industry: "180 min" },
                  { feature: "Max Resolution",                   auteur: "720p",     pro: "1080p + 4K", studio: "4K + ProRes", industry: "4K + ProRes" },
                  { feature: "Team Members",                     auteur: "1",        pro: "5",         studio: "25",        industry: "Unlimited" },
                  { feature: "Storage",                          auteur: "1 GB",     pro: "50 GB",     studio: "250 GB",    industry: "Unlimited" },
                ].map((row: any, i: number) => {
                  if (row.section === "header") {
                    return (
                      <tr key={i} className="bg-zinc-900/80">
                        <td colSpan={5} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-amber-400/80">
                          {row.feature}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className="hover:bg-zinc-900/50">
                      <td className="py-3 px-4 font-medium">{row.feature}</td>
                      {(["auteur", "pro", "studio", "industry"] as const).map((col) => {
                        const val = row[col];
                        const colors: Record<string, string> = {
                          auteur: "text-emerald-400",
                          pro: "text-amber-400",
                          studio: "text-violet-400",
                          industry: "text-yellow-400",
                        };
                        return (
                          <td key={col} className="text-center py-3 px-4">
                            {typeof val === "boolean" ? (
                              val
                                ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                                : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                            ) : (
                              <span className={colors[col]}>{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 5: BYOK NOTICE                                       */}
        {/* ============================================================ */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Card className="border-zinc-700 bg-zinc-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold">Bring Your Own API Key (BYOK)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                All memberships use BYOK — you provide your own API keys for video generation (Runway, Sora, Replicate, fal.ai, Luma),
                voice acting (ElevenLabs, OpenAI TTS), AI chat (OpenAI, Anthropic, Google), and soundtrack generation (Suno).
                This keeps your costs transparent and gives you full control over quality and spend.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* SECTION 6: REFERRAL PROGRAM                                  */}
        {/* ============================================================ */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-400" />
                Referral Program
              </CardTitle>
              <CardDescription>
                Refer production studios and earn bonus credits for both of you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">+7,000 credits</div>
                  <div className="text-sm text-muted-foreground mt-1">You receive</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">+7,000 credits</div>
                  <div className="text-sm text-muted-foreground mt-1">They receive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* SECTION 7: FAQ                                               */}
        {/* ============================================================ */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
            <Clapperboard className="w-6 h-6 text-amber-400" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="border border-zinc-700 rounded-lg overflow-hidden"
              >
                <button
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm pr-4">{item.q}</span>
                  <span className="text-amber-400 shrink-0 text-lg font-bold">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-zinc-800">
                    <p className="pt-3">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Bottom CTA ─── */}
        <div className="text-center mt-12 flex items-center justify-center gap-4">
          {isLoggedIn ? (
            <Button variant="ghost" onClick={() => setLocation("/")}>
              ← Back to Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setLocation("/welcome")}>
                ← Back to Home
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={() => setLocation("/register")}
              >
                Create Account
              </Button>
            </>
          )}
        </div>

        <LeegoFooter />
      </div>
    </div>
  );
}
