import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Lock, Sparkles, Clapperboard, Wand2, Timer, Coins, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

const TIERS = [
  {
    id: "independent",
    name: "Independent",
    icon: Film,
    color: "border-amber-500 ring-2 ring-amber-500/20",
    buttonColor: "bg-amber-600 hover:bg-amber-500",
    accentColor: "text-amber-400",
    monthly: 5000,
    annual: 50000,
    credits: 50,
    extraCreditCost: 50,
    description: "For independent filmmakers and solo creators building their vision.",
    highlights: [
      "50 credits/month included",
      "All creative & pre-production tools",
      "AI Script Writer & Storyboard",
      "Character Creator & DNA Lock",
      "Virelle AI Director Chat",
      "Dialogue Editor & Shot List",
      "Up to 25 projects",
      "Up to 90 min per film",
      "1080p + 4K export",
      "5 team members",
    ],
  },
  {
    id: "creator",
    name: "Creator",
    icon: Clapperboard,
    color: "border-cyan-500 ring-2 ring-cyan-500/20",
    buttonColor: "bg-cyan-600 hover:bg-cyan-500",
    accentColor: "text-cyan-400",
    monthly: 10000,
    annual: 100000,
    credits: 150,
    extraCreditCost: 40,
    popular: true,
    description: "For professional creators and small studios scaling their output.",
    highlights: [
      "150 credits/month included",
      "Everything in Independent, plus:",
      "Up to 50 projects",
      "Up to 120 min per film",
      "Priority rendering queue",
      "Bulk generation tools",
      "Advanced color grading",
      "Sound effects library",
      "Subtitle generator",
      "10 team members",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    icon: Building2,
    color: "border-violet-500 ring-2 ring-violet-500/20",
    buttonColor: "bg-violet-600 hover:bg-violet-500",
    accentColor: "text-violet-400",
    monthly: 15000,
    annual: 150000,
    credits: 300,
    extraCreditCost: 30,
    description: "For production studios with multiple projects and larger teams.",
    highlights: [
      "300 credits/month included",
      "Everything in Creator, plus:",
      "Up to 100 projects",
      "Up to 150 min per film",
      "VFX Suite (Advanced Effects)",
      "Multi-Shot Sequencer",
      "NLE / DaVinci Resolve Export",
      "AI Casting Tool",
      "White-Label Exports",
      "25 team members",
    ],
  },
  {
    id: "industry",
    name: "Industry",
    icon: Crown,
    color: "border-yellow-500 ring-2 ring-yellow-500/30 bg-yellow-500/5",
    buttonColor: "bg-yellow-600 hover:bg-yellow-500",
    accentColor: "text-yellow-400",
    monthly: 25000,
    annual: 250000,
    credits: 600,
    extraCreditCost: 25,
    description: "For major studios and enterprise productions. Full power, no limits.",
    highlights: [
      "600 credits/month included",
      "Everything in Studio, plus:",
      "Unlimited projects",
      "Up to 180 min per film",
      "4K + ProRes export",
      "Live Action Plate Compositing",
      "Custom AI Model Fine-Tuning",
      "API Access & Pipeline Integration",
      "Dedicated Account Manager",
      "Unlimited team members",
    ],
  },
];

const CREDIT_PACKS = [
  { id: "pack_10", credits: 10, price: 500, perCredit: 50, label: "Starter" },
  { id: "pack_50", credits: 50, price: 2000, perCredit: 40, label: "Producer" },
  { id: "pack_100", credits: 100, price: 3500, perCredit: 35, label: "Director" },
  { id: "pack_250", credits: 250, price: 7500, perCredit: 30, label: "Studio" },
  { id: "pack_500", credits: 500, price: 12500, perCredit: 25, label: "Blockbuster", popular: true },
  { id: "pack_1000", credits: 1000, price: 20000, perCredit: 20, label: "Mogul" },
];

const CREDIT_COSTS = [
  { action: "Create New Project", cost: 1, icon: "📁" },
  { action: "Generate Film (AI Scene Breakdown)", cost: 10, icon: "🎬" },
  { action: "Generate Scene Video (per scene)", cost: 5, icon: "🎥" },
  { action: "Regenerate Scene Video", cost: 3, icon: "🔄" },
  { action: "Generate Preview Image", cost: 1, icon: "🖼️" },
  { action: "Bulk Generate All Previews (per scene)", cost: 2, icon: "📸" },
  { action: "Bulk Generate All Videos (per scene)", cost: 5, icon: "📹" },
  { action: "Virelle AI Chat (per message)", cost: 1, icon: "💬" },
  { action: "AI Script Writer", cost: 3, icon: "📝" },
  { action: "AI Storyboard Generation", cost: 3, icon: "🎨" },
  { action: "AI Dialogue Polish", cost: 2, icon: "🗣️" },
  { action: "AI Continuity Check", cost: 2, icon: "🔍" },
  { action: "AI Shot List Generation", cost: 2, icon: "📋" },
  { action: "Export Final Film", cost: 5, icon: "💾" },
  { action: "Export Scenes / Trailer", cost: 3, icon: "📤" },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");

  const { data: currentUser } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isLoggedIn = !!currentUser;

  const { data: spotsData } = trpc.subscription.foundingSpots.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const spotsRemaining = spotsData?.spotsRemaining ?? 20;
  const offerFull = spotsData?.isFull ?? false;

  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    enabled: isLoggedIn,
  });

  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  const isActiveMember = isLoggedIn && status?.status === "active";
  const currentTier = status?.tier || null;

  const handleSubscribe = async (tier: string) => {
    if (!isLoggedIn) {
      setLocation("/register");
      return;
    }
    setLoadingTier(tier);
    try {
      if (isActiveMember) {
        const result = await portalMutation.mutateAsync({ returnUrl: window.location.href });
        window.location.href = result.url;
        return;
      }
      const result = await checkoutMutation.mutateAsync({
        tier: tier as any,
        billing: billingCycle,
        successUrl: `${window.location.origin}/?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
      });
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(err.message || "Failed to start checkout");
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
      alert(err.message || "Failed to open billing portal");
    } finally {
      setLoadingTier(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);

  return (
    <div className="min-h-screen bg-background relative">
      <GoldWatermark />
      {/* ─── Founding Offer Banner ─── */}
      {!offerFull && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-black py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
            <span className="text-sm font-black uppercase tracking-widest">🎬 FOUNDING OFFER</span>
            <span className="text-sm font-bold">HALF PRICE on your first year's membership</span>
            <span className="text-xs font-medium opacity-80">— Limited to first 50 founding directors.</span>
            <span className="bg-black/20 text-black text-xs font-black px-2 py-0.5 rounded-full">
              {spotsRemaining} of 50 spots left
            </span>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/vs-watermark.png" alt="Virelle Studios" className="h-10 w-10 rounded-lg" />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Pricing</h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional AI filmmaking starts here. Your membership includes all creative tools plus monthly credits. Every action on the platform uses credits — buy more as you need them.
          </p>
          {status?.isAdmin && (
            <Badge variant="outline" className="mt-4 border-amber-500 text-amber-500">
              <Crown className="w-3 h-3 mr-1" /> Admin — Full Access Granted
            </Badge>
          )}
        </div>

        {/* Current subscription info */}
        {isActiveMember && (
          <div className="max-w-md mx-auto mb-10 p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
            <p className="text-sm text-green-400">
              You're on the <strong className="capitalize">{status!.tier}</strong> membership
              {status!.currentPeriodEnd && (
                <> · Renews {new Date(status!.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </p>
            <Button variant="link" className="text-green-400 mt-1" onClick={handleManageBilling} disabled={loadingTier === "manage"}>
              {loadingTier === "manage" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Manage Billing
            </Button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: MEMBERSHIP TIERS */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Crown className="w-7 h-7 text-amber-400" />
              Membership Plans
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              No free tier. This is a professional filmmaking platform. Choose your level and start creating.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "annual" ? "bg-amber-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-green-400">(Save ~17%)</span>
            </button>
          </div>

          {/* Pricing cards - 4 tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isCurrentTier = currentTier === tier.id;
              const price = billingCycle === "annual" ? tier.annual : tier.monthly;

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${tier.color} ${tier.popular ? "lg:scale-105" : ""} transition-all`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-cyan-600 text-white px-4 py-1">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${tier.accentColor}`} />
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                    </div>
                    <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">{formatPrice(price)}</span>
                      <span className="text-muted-foreground ml-1">/{billingCycle === "annual" ? "year" : "month"}</span>
                      {billingCycle === "annual" && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ({formatPrice(Math.round(tier.annual / 12))}/mo effective)
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Coins className={`w-4 h-4 ${tier.accentColor}`} />
                      <span className={`text-sm font-semibold ${tier.accentColor}`}>
                        {tier.credits} credits/month included
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Extra credits: {formatPrice(tier.extraCreditCost)}/credit
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {tier.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button
                      className={`w-full text-white ${tier.buttonColor}`}
                      disabled={isCurrentTier || loadingTier === tier.id}
                      onClick={() => handleSubscribe(tier.id)}
                    >
                      {loadingTier === tier.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {isCurrentTier
                        ? "Current Membership"
                        : isActiveMember
                        ? `Switch to ${tier.name}`
                        : isLoggedIn
                        ? `Join ${tier.name}`
                        : `Get Started — ${tier.name}`}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            All prices in USD. {billingCycle === "annual" ? "Billed annually." : "Billed monthly."} A paid membership is required to access the platform. No free tier.
          </p>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: CREDIT SYSTEM EXPLANATION */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Coins className="w-7 h-7 text-amber-400" />
              How Credits Work
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Every action on the platform uses credits. Your membership includes monthly credits, and you can purchase additional credit packs anytime.
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
                  Every meaningful action costs credits. Plan your production wisely.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CREDIT_COSTS.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.action}</span>
                      </div>
                      <Badge variant="outline" className="border-amber-500/50 text-amber-400 font-bold">
                        {item.cost} {item.cost === 1 ? "credit" : "credits"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Example production cost */}
          <div className="max-w-3xl mx-auto mb-12">
            <Card className="border-zinc-700">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-4 text-center">Example: 10-Minute Short Film</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Create project</span>
                    <span className="text-amber-400 font-bold">1 credit</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Generate Film (AI scene breakdown)</span>
                    <span className="text-amber-400 font-bold">10 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Preview images (12 scenes)</span>
                    <span className="text-amber-400 font-bold">12 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Virelle AI chat (10 editing messages)</span>
                    <span className="text-amber-400 font-bold">10 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Generate scene videos (12 scenes)</span>
                    <span className="text-amber-400 font-bold">60 credits</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-zinc-900/50">
                    <span>Export final film</span>
                    <span className="text-amber-400 font-bold">5 credits</span>
                  </div>
                  <div className="border-t border-amber-500/30 pt-3 mt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-amber-400">~98 credits</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Independent members get 50 credits/month — you'd need a credit pack top-up to complete this production.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: CREDIT PACKS */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <ShoppingCart className="w-7 h-7 text-green-400" />
              Credit Packs
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Need more credits? Purchase packs anytime. The more you buy, the less you pay per credit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={`relative flex flex-col border-zinc-700 ${pack.popular ? "ring-2 ring-green-500/30 border-green-500" : ""} ${isActiveMember ? "hover:border-green-500/50" : "opacity-80"} transition-all`}
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
                      {pack.credits} credits
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-green-400">{formatPrice(pack.price)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPrice(pack.perCredit)} per credit
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
        {/* SECTION 4: FEATURE COMPARISON TABLE */}
        {/* ============================================================ */}
        <div className="mb-16 max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-400">Independent</th>
                  <th className="text-center py-3 px-4 font-medium text-cyan-400">Creator</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-400">Studio</th>
                  <th className="text-center py-3 px-4 font-medium text-yellow-400">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { feature: "PRICING", section: "header" },
                  { feature: "Monthly Price", independent: "$5,000", creator: "$10,000", studio: "$15,000", industry: "$25,000" },
                  { feature: "Annual Price", independent: "$50,000", creator: "$100,000", studio: "$150,000", industry: "$250,000" },
                  { feature: "Monthly Credits", independent: "50", creator: "150", studio: "300", industry: "600" },
                  { feature: "Extra Credit Cost", independent: "$50", creator: "$40", studio: "$30", industry: "$25" },
                  { feature: "CREATIVE TOOLS (INCLUDED)", section: "header" },
                  { feature: "AI Script Writer", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Storyboard Generator", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Character Creator & DNA Lock", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Virelle AI Director Chat", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Dialogue Editor", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Shot List & Continuity Check", independent: true, creator: true, studio: true, industry: true },
                  { feature: "Color Grading & LUT Presets", independent: true, creator: true, studio: true, industry: true },
                  { feature: "ADVANCED TOOLS", section: "header" },
                  { feature: "Bulk Generation", independent: false, creator: true, studio: true, industry: true },
                  { feature: "VFX Suite", independent: false, creator: false, studio: true, industry: true },
                  { feature: "Multi-Shot Sequencer", independent: false, creator: false, studio: true, industry: true },
                  { feature: "NLE / DaVinci Export", independent: false, creator: false, studio: true, industry: true },
                  { feature: "AI Casting Tool", independent: false, creator: false, studio: true, industry: true },
                  { feature: "White-Label Exports", independent: false, creator: false, studio: true, industry: true },
                  { feature: "Custom AI Fine-Tuning", independent: false, creator: false, studio: false, industry: true },
                  { feature: "API Access", independent: false, creator: false, studio: false, industry: true },
                  { feature: "Dedicated Account Manager", independent: false, creator: false, studio: false, industry: true },
                  { feature: "LIMITS", section: "header" },
                  { feature: "Projects", independent: "25", creator: "50", studio: "100", industry: "Unlimited" },
                  { feature: "Max Film Duration", independent: "90 min", creator: "120 min", studio: "150 min", industry: "180 min" },
                  { feature: "Max Resolution", independent: "1080p + 4K", creator: "1080p + 4K", studio: "4K + ProRes", industry: "4K + ProRes" },
                  { feature: "Team Members", independent: "5", creator: "10", studio: "25", industry: "Unlimited" },
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
                      {(["independent", "creator", "studio", "industry"] as const).map((tier) => {
                        const val = row[tier];
                        const colors: Record<string, string> = {
                          independent: "text-amber-400",
                          creator: "text-cyan-400",
                          studio: "text-violet-400",
                          industry: "text-yellow-400",
                        };
                        return (
                          <td key={tier} className="text-center py-3 px-4">
                            {typeof val === "boolean" ? (
                              val ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-zinc-600 mx-auto" />
                            ) : (
                              <span className={colors[tier]}>{val}</span>
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

        {/* BYOK Notice */}
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

        {/* Referral Program */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-400" />
                Referral Program
              </CardTitle>
              <CardDescription>
                Refer production studios and earn bonus credits for both of you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">+50 credits</div>
                  <div className="text-sm text-muted-foreground mt-1">You get</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">+50 credits</div>
                  <div className="text-sm text-muted-foreground mt-1">They get</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
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
              <Button className="bg-amber-600 hover:bg-amber-500 text-white" onClick={() => setLocation("/register")}>
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
