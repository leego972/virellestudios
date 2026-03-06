import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Lock, Sparkles, Clapperboard, Wand2, Timer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");

  // ── PUBLIC query: always works, never triggers auth redirect ──
  const { data: pricing } = trpc.subscription.pricing.useQuery();

  // ── PUBLIC query: auth.me returns user or null, never throws UNAUTHORIZED ──
  const { data: currentUser } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isLoggedIn = !!currentUser;

  // ── PROTECTED query: ONLY called when user is logged in ──
  // This prevents the UNAUTHORIZED error that was causing the redirect
  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    enabled: isLoggedIn,
  });

  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  // Determine membership state
  const isActiveMember = isLoggedIn && status?.status === "active";
  const currentTier = status?.tier || null;

  const handleSubscribe = async (tier: "independent" | "industry") => {
    // Not logged in — send to register
    if (!isLoggedIn) {
      setLocation("/register");
      return;
    }

    setLoadingTier(tier);
    try {
      // Already active — open billing portal to switch
      if (isActiveMember) {
        const result = await portalMutation.mutateAsync({
          returnUrl: window.location.href,
        });
        window.location.href = result.url;
        return;
      }

      // Logged in but no active sub — create checkout
      const result = await checkoutMutation.mutateAsync({
        tier,
        billing: billingCycle,
        successUrl: `${window.location.origin}/?subscription=success`,
        cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
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
      const result = await portalMutation.mutateAsync({
        returnUrl: window.location.href,
      });
      window.location.href = result.url;
    } catch (err: any) {
      console.error("Portal error:", err);
      alert(err.message || "Failed to open billing portal");
    } finally {
      setLoadingTier(null);
    }
  };

  const tierIcons: Record<string, any> = {
    independent: Film,
    industry: Building2,
  };

  const tierColors: Record<string, string> = {
    independent: "border-amber-500 ring-2 ring-amber-500/20",
    industry: "border-violet-500 ring-2 ring-violet-500/20",
  };

  const tierButtonColors: Record<string, string> = {
    independent: "bg-amber-600 hover:bg-amber-500",
    industry: "bg-violet-600 hover:bg-violet-500",
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="min-h-screen bg-background relative">
      <GoldWatermark />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/vs-watermark.png"
              alt="Virelle Studios"
              className="h-10 w-10 rounded-lg"
            />
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Pricing
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
            Your membership unlocks all creative and pre-production tools. When you're ready to generate your film, pay per project based on length and complexity.
          </p>
          {status?.isAdmin && (
            <Badge variant="outline" className="mt-4 border-amber-500 text-amber-500">
              <Crown className="w-3 h-3 mr-1" /> Admin — Full Access Granted
            </Badge>
          )}
        </div>

        {/* Current subscription info — only shown for active members */}
        {isActiveMember && (
          <div className="max-w-md mx-auto mb-10 p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
            <p className="text-sm text-green-400">
              You're on the <strong className="capitalize">{status!.tier}</strong> membership
              {status!.currentPeriodEnd && (
                <> · Renews {new Date(status!.currentPeriodEnd).toLocaleDateString()}</>
              )}
            </p>
            <Button
              variant="link"
              className="text-green-400 mt-1"
              onClick={handleManageBilling}
              disabled={loadingTier === "manage"}
            >
              {loadingTier === "manage" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
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
              Membership gives you full access to all creative and pre-production tools — script writing, storyboarding, character creation, and more. Film generation is charged separately per project.
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Monthly (Direct Debit)
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs text-green-400">(Save ~8%)</span>
            </button>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricing?.tiers.map((tier: any) => {
              const Icon = tierIcons[tier.id] || Zap;
              const isCurrentTier = currentTier === tier.id;
              const isPopular = tier.popular;

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${tierColors[tier.id] || "border-zinc-700"} ${isPopular ? "lg:scale-105" : ""} transition-all`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-amber-600 text-white px-4 py-1">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5" />
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                    </div>
                    <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
                    <div className="mt-4">
                      {billingCycle === "annual" ? (
                        <>
                          <span className="text-3xl font-bold">{tier.priceLabel}</span>
                          <span className="text-muted-foreground ml-1">/year</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">{tier.monthlyPriceLabel}</span>
                          <span className="text-muted-foreground ml-1">/month</span>
                          <p className="text-xs text-muted-foreground mt-1">via ACH direct debit or card</p>
                        </>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2.5">
                      {tier.highlights.map((highlight: string, i: number) => {
                        // Section headers (──...──) render as dividers
                        if (highlight.startsWith("──")) {
                          return (
                            <li key={i} className="pt-3 pb-1 border-t border-zinc-700 first:border-t-0 first:pt-0">
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
                                {highlight.replace(/──/g, "").trim()}
                              </span>
                            </li>
                          );
                        }
                        return (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <span>{highlight}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button
                      className={`w-full text-white ${tierButtonColors[tier.id] || ""}`}
                      disabled={isCurrentTier || loadingTier === tier.id}
                      onClick={() => handleSubscribe(tier.id as "independent" | "industry")}
                    >
                      {loadingTier === tier.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
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
            {billingCycle === "annual"
              ? "Billed annually. A paid membership is required to access the platform and purchase film production packages."
              : "Billed monthly via ACH direct debit or card. Cancel anytime. A paid membership is required to access the platform."}
          </p>
        </div>

        {/* Launch Special Banner */}
        {pricing?.launchSpecialActive && (
          <div className="max-w-3xl mx-auto mb-10 p-6 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-amber-400">Launch Special — 50% Off Your First Film</h2>
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <p className="text-muted-foreground">
              Exclusive for members — your first film production at half price. Must have an active membership to qualify.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 2: FILM PRODUCTION PACKAGES */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Clapperboard className="w-7 h-7 text-amber-400" />
              Film Production Packages
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              One-time payment per film. Full AI-generated production with voice acting, soundtrack, and visual continuity.
              {!isActiveMember && " Become a member to start your production."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricing?.filmPackages?.map((pkg: any) => (
              <Card key={pkg.id} className={`relative flex flex-col border-zinc-700 ${isActiveMember ? "hover:border-amber-500/50" : "opacity-80"} transition-all ${pkg.id === "full_feature" ? "ring-2 ring-amber-500/30 lg:scale-105" : ""}`}>
                {pkg.id === "full_feature" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-600 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                {pricing.launchSpecialActive && (
                  <div className="absolute -top-3 right-3">
                    <Badge className="bg-red-600 text-white px-2 py-0.5 text-xs">50% OFF</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <CardDescription className="min-h-[2.5rem] text-xs">{pkg.description}</CardDescription>
                  <div className="mt-3">
                    {pricing.launchSpecialActive ? (
                      <>
                        <div className="text-sm text-muted-foreground line-through">{formatPrice(pkg.fullPrice)}</div>
                        <span className="text-3xl font-bold text-amber-400">{formatPrice(pkg.launchPrice)}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">{formatPrice(pkg.fullPrice)}</span>
                    )}
                    <span className="text-muted-foreground ml-1 text-sm">per film</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Timer className="w-3 h-3" />
                    Up to {pkg.maxDurationMinutes} minutes
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {pkg.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4 flex flex-col gap-2">
                  {isActiveMember ? (
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                      onClick={() => setLocation("/projects/new")}
                    >
                      Start Production
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        disabled
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Membership Required
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Join a membership above to purchase film packages
                      </p>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Extension pricing note */}
          {pricing?.extensionPricing && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Need more than 90 minutes? Add {formatPrice(pricing.launchSpecialActive ? pricing.extensionPricing.launchPricePer30Min : pricing.extensionPricing.fullPricePer30Min)} per additional 30 minutes.
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: SCENE-BY-SCENE PRICING */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Film className="w-7 h-7 text-cyan-400" />
              Scene-by-Scene Production
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Pay per individual scene for maximum flexibility. Ideal for hybrid productions, single VFX shots, or testing the platform.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">Individual Scene</h3>
                    <p className="text-sm text-muted-foreground mb-4">30–60 seconds of AI-generated cinematic footage per scene</p>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-cyan-400">$10,000</span>
                      <span className="text-muted-foreground ml-2">/ scene</span>
                    </div>
                    <ul className="space-y-2">
                      {(pricing as any)?.sceneByScenePricing?.features?.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      )) || [
                        "30-60 seconds of AI-generated cinematic footage",
                        "AI voice acting & dialogue",
                        "AI soundtrack per scene",
                        "Character consistency",
                        "Art direction control",
                        "Color grading",
                        "2 revision passes per scene",
                        "1080p or 4K export",
                      ].map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 w-full md:w-64">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-4">
                      <p className="text-sm font-semibold text-amber-400 mb-3">Why Choose a Full Package?</p>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>90 scenes × $10K</span>
                          <span className="text-red-400 font-bold">$900,000</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Full Feature (90 min)</span>
                          <span className="text-green-400 font-bold">$100,000</span>
                        </div>
                        <div className="border-t border-amber-500/20 pt-2 mt-2">
                          <div className="flex justify-between font-semibold">
                            <span className="text-amber-400">You save</span>
                            <span className="text-green-400">up to 89%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isActiveMember ? (
                      <Button
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                        onClick={() => setLocation("/projects/new")}
                      >
                        Purchase Scene
                      </Button>
                    ) : (
                      <>
                        <Button
                          className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed"
                          disabled
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Membership Required
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                          Join a membership above to purchase scenes
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: VFX SCENE STUDIO */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Wand2 className="w-7 h-7 text-violet-400" />
              VFX Scene Studio
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Generate impossible VFX scenes for your live-action production. Explosions, alien worlds, space battles — at a fraction of traditional VFX costs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricing?.vfxScenePackages?.map((pkg: any) => (
              <Card key={pkg.id} className={`relative flex flex-col border-zinc-700 ${isActiveMember ? "hover:border-violet-500/50" : "opacity-80"} transition-all`}>
                {pricing.launchSpecialActive && (
                  <div className="absolute -top-3 right-3">
                    <Badge className="bg-red-600 text-white px-2 py-0.5 text-xs">50% OFF</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <CardDescription className="min-h-[2rem] text-xs">{pkg.description}</CardDescription>
                  <div className="mt-3">
                    {pricing.launchSpecialActive ? (
                      <>
                        <div className="text-sm text-muted-foreground line-through">{formatPrice(pkg.fullPrice)}</div>
                        <span className="text-3xl font-bold text-violet-400">{formatPrice(pkg.launchPrice)}</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">{formatPrice(pkg.fullPrice)}</span>
                    )}
                    <span className="text-muted-foreground ml-1 text-sm">
                      {pkg.scenesIncluded === -1 ? "unlimited" : `${pkg.scenesIncluded} scene${pkg.scenesIncluded > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {pkg.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4 flex flex-col gap-2">
                  {isActiveMember ? (
                    <Button
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                      onClick={() => setLocation("/projects/new")}
                    >
                      Get Started
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full bg-zinc-700 text-zinc-400 cursor-not-allowed"
                        disabled
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Membership Required
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        Join a membership above to access VFX packages
                      </p>
                    </>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mb-16 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included vs. What's Paid Separately</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-500">Independent</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-500">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  // Pricing
                  { feature: "Annual Price", independent: "$10,000", industry: "$50,000", section: "" },
                  { feature: "Monthly (Direct Debit)", independent: "$900/mo", industry: "$4,500/mo", section: "" },
                  // Section: Included in Membership
                  { feature: "INCLUDED IN MEMBERSHIP", independent: "", industry: "", section: "header" },
                  { feature: "AI Script Writer & Screenplay", independent: true, industry: true, section: "" },
                  { feature: "Storyboard Generator", independent: true, industry: true, section: "" },
                  { feature: "Character Creator & DNA Lock", independent: true, industry: true, section: "" },
                  { feature: "Director's AI Assistant", independent: true, industry: true, section: "" },
                  { feature: "Location Scout & Mood Board", independent: true, industry: true, section: "" },
                  { feature: "Dialogue Editor", independent: true, industry: true, section: "" },
                  { feature: "Budget Estimator", independent: true, industry: true, section: "" },
                  { feature: "Color Grading & LUT Presets", independent: true, industry: true, section: "" },
                  { feature: "Shot List & Continuity Check", independent: true, industry: true, section: "" },
                  { feature: "Ad & Poster Maker", independent: true, industry: true, section: "" },
                  { feature: "Trailer Studio", independent: true, industry: true, section: "" },
                  { feature: "TV Commercial Creator", independent: true, industry: true, section: "" },
                  { feature: "Subtitle Generator", independent: true, industry: true, section: "" },
                  { feature: "Sound Effects Library", independent: true, industry: true, section: "" },
                  // Section: Industry-Only Tools
                  { feature: "INDUSTRY-EXCLUSIVE TOOLS", independent: "", industry: "", section: "header" },
                  { feature: "VFX Suite (Advanced Effects)", independent: false, industry: true, section: "" },
                  { feature: "Multi-Shot Sequencer", independent: false, industry: true, section: "" },
                  { feature: "Live Action Plate Compositing", independent: false, industry: true, section: "" },
                  { feature: "NLE / DaVinci Resolve Export", independent: false, industry: true, section: "" },
                  { feature: "AI Casting Tool", independent: false, industry: true, section: "" },
                  { feature: "Bulk / Parallel Generation", independent: false, industry: true, section: "" },
                  { feature: "White-Label Exports", independent: false, industry: true, section: "" },
                  { feature: "API Access & Pipeline Integration", independent: false, industry: true, section: "" },
                  { feature: "Custom AI Model Fine-Tuning", independent: false, industry: true, section: "" },
                  { feature: "Priority Rendering Queue", independent: false, industry: true, section: "" },
                  { feature: "Dedicated Account Manager", independent: false, industry: true, section: "" },
                  // Section: Film Generation (paid separately)
                  { feature: "FILM GENERATION (PAID PER PROJECT)", independent: "", industry: "", section: "header" },
                  { feature: "Full Film Generation", independent: "from $40K", industry: "from $40K", section: "" },
                  { feature: "Scene-by-Scene Generation", independent: "$10K/scene", industry: "$10K/scene", section: "" },
                  { feature: "AI Voice Acting & Dialogue", independent: "Included in film", industry: "Included in film", section: "" },
                  { feature: "AI-Generated Film Score", independent: "Included in film", industry: "Included in film", section: "" },
                  { feature: "Character Consistency Across Scenes", independent: "Included in film", industry: "Included in film", section: "" },
                  { feature: "Scene-to-Scene Visual Continuity", independent: "Included in film", industry: "Included in film", section: "" },
                  // Limits
                  { feature: "PLATFORM LIMITS", independent: "", industry: "", section: "header" },
                  { feature: "Projects", independent: "25", industry: "Unlimited", section: "" },
                  { feature: "AI Generations / Month", independent: "200", industry: "Unlimited", section: "" },
                  { feature: "Max Film Duration", independent: "90 min", industry: "180 min", section: "" },
                  { feature: "Max Resolution", independent: "1080p + 4K", industry: "4K + ProRes", section: "" },
                  { feature: "Team Members", independent: "5", industry: "Unlimited", section: "" },
                ].map((row: any, i: number) => {
                  // Section header rows
                  if (row.section === "header") {
                    return (
                      <tr key={i} className="bg-zinc-900/80">
                        <td colSpan={3} className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-amber-400/80">
                          {row.feature}
                        </td>
                      </tr>
                    );
                  }
                  return (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    {(["independent", "industry"] as const).map((tier) => {
                      const val = row[tier];
                      return (
                        <td key={tier} className="text-center py-3 px-4">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-600 mx-auto" />
                            )
                          ) : (
                            <span className={
                              tier === "industry" ? "text-violet-400" 
                              : tier === "independent" ? "text-amber-400" 
                              : ""
                            }>{val}</span>
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
                voice acting (ElevenLabs, OpenAI TTS), and soundtrack generation (Suno). 
                This keeps your costs transparent and gives you full control over quality and spend.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Program */}
        {pricing?.referralRewards && (
          <div className="max-w-2xl mx-auto mb-12">
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  Referral Program
                </CardTitle>
                <CardDescription>
                  Refer production studios and earn bonus generations for both of you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-400">+{pricing.referralRewards.referrerGenerations}</div>
                    <div className="text-sm text-muted-foreground mt-1">You get</div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10">
                    <div className="text-2xl font-bold text-purple-400">+{pricing.referralRewards.newUserGenerations}</div>
                    <div className="text-sm text-muted-foreground mt-1">They get</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom CTA / Navigation */}
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
