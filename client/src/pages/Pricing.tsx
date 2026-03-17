import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Lock, Sparkles, Clapperboard, Wand2, Timer, Coins, ShoppingCart, Camera } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

const TIERS = [
  {
    id: "amateur",
    name: "Amateur Filmmaker",
    icon: Camera,
    color: "border-emerald-500 ring-2 ring-emerald-500/20",
    buttonColor: "bg-emerald-600 hover:bg-emerald-500",
    accentColor: "text-emerald-400",
    monthly: 10000,
    annual: 100000,
    credits: 2000,
    extraCreditCost: 15,
    description: "Dip your toes in AI filmmaking. Write, plan, and start your first project.",
    highlights: [
      "2,000 credits/month included",
      "AI Script Writer",
      "AI Director Chat (Virelle)",
      "Character Creator",
      "Shot List Generator",
      "Mood Board",
      "Location Scout AI",
      "AI Dialogue Editor",
      "Up to 2 projects, 5 scenes each",
      "Upgrade anytime to unlock video & export",
    ],
    hookBadge: "Try It Out",
  },
  {
    id: "independent",
    name: "Independent",
    icon: Film,
    color: "border-amber-500 ring-2 ring-amber-500/20",
    buttonColor: "bg-amber-600 hover:bg-amber-500",
    accentColor: "text-amber-400",
    monthly: 25000,
    annual: 250000,
    credits: 5500,
    extraCreditCost: 12,
    description: "For independent filmmakers and solo creators building their vision.",
    highlights: [
      "5,500 credits/month included",
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
    id: "studio",
    name: "Studio",
    icon: Building2,
    color: "border-violet-500 ring-2 ring-violet-500/20",
    buttonColor: "bg-violet-600 hover:bg-violet-500",
    accentColor: "text-violet-400",
    monthly: 35000,
    annual: 350000,
    credits: 15500,
    extraCreditCost: 10,
    popular: true,
    description: "For production studios with multiple projects and larger teams.",
    highlights: [
      "15,500 credits/month included",
      "Everything in Independent, plus:",
      "Up to 100 projects",
      "Up to 150 min per film",
      "VFX Suite (Advanced Effects)",
      "Multi-Shot Sequencer",
      "NLE / DaVinci Resolve Export",
      "AI Casting Tool",
      "API Access & Pipeline Integration",
      "Priority rendering queue",
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
    monthly: 50000,
    annual: 500000,
    credits: 50500,
    extraCreditCost: 8,
    description: "For major studios and enterprise productions. Full power, no limits.",
    highlights: [
      "50,500 credits/month included",
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
  { id: "topup_10",  credits: 500,   price: 7500,   perCredit: 15,  label: "Starter",  saving: "25% off" },
  { id: "topup_50",  credits: 1500,  price: 18000,  perCredit: 12,  label: "Producer", saving: "40% off" },
  { id: "topup_100", credits: 3000,  price: 33000,  perCredit: 11,  label: "Director", saving: "45% off" },
  { id: "topup_200", credits: 6000,  price: 60000,  perCredit: 10,  label: "Studio",   saving: "50% off", popular: true },
  { id: "topup_500", credits: 15000, price: 120000, perCredit: 8,   label: "Mogul",    saving: "60% off" },
];

const CREDIT_COSTS = [
  { action: "Create New Project", cost: 5, icon: "📁" },
  { action: "Generate Film (AI Scene Breakdown)", cost: 50, icon: "🎬" },
  { action: "Generate Scene Video (per scene)", cost: 25, icon: "🎥" },
  { action: "Regenerate Scene Video", cost: 15, icon: "🔄" },
  { action: "Generate Preview Image", cost: 5, icon: "🖼️" },
  { action: "Bulk Generate All Previews (per scene)", cost: 10, icon: "📸" },
  { action: "Bulk Generate All Videos (per scene)", cost: 25, icon: "📹" },
  { action: "Virelle AI Chat (per message)", cost: 5, icon: "💬" },
  { action: "AI Script Writer", cost: 15, icon: "📝" },
  { action: "AI Storyboard Generation", cost: 15, icon: "🎨" },
  { action: "AI Dialogue Polish", cost: 10, icon: "🗣️" },
  { action: "AI Continuity Check", cost: 10, icon: "🔍" },
  { action: "AI Shot List Generation", cost: 10, icon: "📋" },
  { action: "Export Final Film", cost: 25, icon: "💾" },
  { action: "Export Scenes / Trailer", cost: 15, icon: "📤" },
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

  const { data: spotsData, refetch: refetchSpots } = trpc.subscription.foundingSpots.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const spotsRemaining = spotsData?.spotsRemaining ?? 19;
  const offerFull = spotsData?.isFull ?? false;

  // Handle Stripe return params — show success/canceled toasts and clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      toast.success("You're now a member! Welcome to Virelle Studios.");
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
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663418605762/hxRQQgsmyjgcByim.png" alt="Virelle Studios" className="h-14 w-14 rounded-lg" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
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
                  {(tier as any).hookBadge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-600 text-white px-4 py-1">{(tier as any).hookBadge}</Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${tier.accentColor}`} />
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                    </div>
                    <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
                    <div className="mt-4">
                      {billingCycle === "annual" && !offerFull && tier.id !== "amateur" ? (
                        <>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-amber-400">{formatPrice(Math.round(price / 2))}</span>
                            <span className="text-lg line-through text-muted-foreground">{formatPrice(price)}</span>
                          </div>
                          <p className="text-xs text-amber-400/80 font-semibold mt-0.5">50% off first year — founding member*</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ({formatPrice(Math.round(price / 2 / 12))}/mo effective)
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">{formatPrice(price)}</span>
                          <span className="text-muted-foreground ml-1">/{billingCycle === "annual" ? "year" : "month"}</span>
                          {billingCycle === "annual" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ({formatPrice(Math.round(tier.annual / 12))}/mo effective)
                            </p>
                          )}
                        </>
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
          {!offerFull && billingCycle === "annual" && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              * 50% founding discount applied automatically at checkout for all annual memberships. Valid for founding directors only. Discount applies to first year; renews at full price.
            </p>
          )}
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

          {/* Example production costs */}
          <div className="max-w-4xl mx-auto mb-12">
            <h3 className="text-xl font-bold mb-6 text-center">How many credits does a real project use?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Short Film */}
              <Card className="border-zinc-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><span>🎬</span> 10-Min Short Film</CardTitle>
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
                  <p className="text-muted-foreground pt-1">Fits within the <span className="text-emerald-400 font-semibold">Amateur</span> monthly allowance (500 cr)</p>
                </CardContent>
              </Card>

              {/* Feature Film */}
              <Card className="border-amber-500/30 ring-1 ring-amber-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><span>🎥</span> 90-Min Feature Film</CardTitle>
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
                  <p className="text-muted-foreground pt-1">Fits within the <span className="text-amber-400 font-semibold">Independent</span> monthly allowance (1,500 cr) with credits to spare</p>
                </CardContent>
              </Card>

              {/* Music Video + Ad Campaign */}
              <Card className="border-zinc-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><span>🎵</span> Music Video + Ad Campaign</CardTitle>
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
                  <p className="text-muted-foreground pt-1">Well within the <span className="text-emerald-400 font-semibold">Amateur</span> monthly allowance (500 cr)</p>
                </CardContent>
              </Card>
            </div>

            {/* Credit to dollar translation */}
            <div className="mt-8 p-5 rounded-xl border border-border/50 bg-card/40">
              <h4 className="text-sm font-semibold mb-3 text-center">What does a credit cost in real terms?</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { tier: "Amateur", credits: 2000, monthly: 10000, perCredit: 5.0, color: "text-emerald-400" },
                  { tier: "Independent", credits: 5500, monthly: 25000, perCredit: 4.55, color: "text-amber-400" },
                  { tier: "Studio", credits: 15500, monthly: 35000, perCredit: 2.26, color: "text-violet-400" },
                  { tier: "Industry", credits: 50500, monthly: 50000, perCredit: 0.99, color: "text-yellow-400" },
                ].map((t) => (
                  <div key={t.tier} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                    <p className={`text-xs font-bold ${t.color}`}>{t.tier}</p>
                    <p className="text-lg font-bold mt-1">${t.perCredit.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">per credit</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">Higher tiers = lower cost per credit. A 90-min feature film at Studio tier costs ~$5,880 in credits.</p>
            </div>
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
                  <th className="text-center py-3 px-4 font-medium text-emerald-400">Amateur</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-400">Independent</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-400">Studio</th>
                  <th className="text-center py-3 px-4 font-medium text-yellow-400">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { feature: "PRICING", section: "header" },
                  { feature: "Monthly Price", amateur: "$10,000", independent: "$25,000", studio: "$35,000", industry: "$50,000" },
                  { feature: "Annual Price", amateur: "$100,000", independent: "$250,000", studio: "$350,000", industry: "$500,000" },
                  { feature: "Founder Annual (50% off yr 1)", amateur: "$50,000", independent: "$125,000", studio: "$175,000", industry: "$250,000" },
                  { feature: "Monthly Credits", amateur: "500", independent: "1,500", studio: "5,000", industry: "15,000" },
                  { feature: "Extra Credit Cost", amateur: "$15/credit", independent: "$12/credit", studio: "$10/credit", industry: "$8/credit" },
                  { feature: "CREATIVE TOOLS (INCLUDED)", section: "header" },
                  { feature: "AI Script Writer", amateur: true, independent: true, studio: true, industry: true },
                  { feature: "Storyboard Generator", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Character Creator & DNA Lock", amateur: true, independent: true, studio: true, industry: true },
                  { feature: "Virelle AI Director Chat", amateur: true, independent: true, studio: true, industry: true },
                  { feature: "Dialogue Editor", amateur: true, independent: true, studio: true, industry: true },
                  { feature: "Shot List & Continuity Check", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Color Grading & LUT Presets", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "ADVANCED TOOLS", section: "header" },
                  { feature: "Video Generation", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Film Export", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Bulk Generation", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "VFX Suite", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "Multi-Shot Sequencer", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "NLE / DaVinci Export", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "AI Casting Tool", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "White-Label Exports", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "Custom AI Fine-Tuning", amateur: false, independent: false, studio: false, industry: true },
                  { feature: "API Access", amateur: false, independent: false, studio: true, industry: true },
                  { feature: "Dedicated Account Manager", amateur: false, independent: false, studio: false, industry: true },
                  { feature: "AD MAKER & DISTRIBUTION", section: "header" },
                  { feature: "Ad & Poster Maker", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Platform Templates (Instagram, TikTok, Facebook, Discord, YouTube)", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Direct Publish to Social Platforms", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Connected Platform Accounts", amateur: false, independent: "2 platforms", studio: "5 platforms", industry: "Unlimited" },
                  { feature: "AI Video Ad Generation", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Press Kit Builder", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Billboard & Outdoor Ad Templates", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Festival & Distribution Hub (FilmFreeway, WithoutABox)", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "Influencer Outreach Kit Generator", amateur: false, independent: true, studio: true, industry: true },
                  { feature: "LIMITS", section: "header" },
                  { feature: "Projects", amateur: "2", independent: "25", studio: "100", industry: "Unlimited" },
                  { feature: "Max Film Duration", amateur: "5 min", independent: "90 min", studio: "150 min", industry: "180 min" },
                  { feature: "Max Resolution", amateur: "720p", independent: "1080p + 4K", studio: "4K + ProRes", industry: "4K + ProRes" },
                  { feature: "Team Members", amateur: "1", independent: "5", studio: "25", industry: "Unlimited" },
                ].map((row: any, i: number) => {
                  if (row.section === "header") {
                    return (
                      <tr key={i} className="bg-zinc-900/80">
                        <td colSpan={6} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-amber-400/80">
                          {row.feature}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i} className="hover:bg-zinc-900/50">
                      <td className="py-3 px-4 font-medium">{row.feature}</td>
                  {(["amateur", "independent", "studio", "industry"] as const).map((tier) => {
                        const val = row[tier];
                        const colors: Record<string, string> = {
                          amateur: "text-emerald-400",
                          independent: "text-amber-400",
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
                  <div className="text-2xl font-bold text-purple-400">+7,000 credits</div>
                  <div className="text-sm text-muted-foreground mt-1">You get</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10">
                  <div className="text-2xl font-bold text-purple-400">+7,000 credits</div>
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
