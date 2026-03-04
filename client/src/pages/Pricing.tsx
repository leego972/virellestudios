import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Package, Sparkles, Clapperboard, Wand2, Timer } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import LeegoFooter from "@/components/LeegoFooter";
import GoldWatermark from "@/components/GoldWatermark";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const { data: pricing } = trpc.subscription.pricing.useQuery();
  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
  });
  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const filmPackageMutation = trpc.subscription.createFilmPackageCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  const currentTier = status?.tier || "free";

  const handleSubscribe = async (tier: "creator" | "pro" | "industry") => {
    if (!status) {
      setLocation("/register");
      return;
    }

    setLoadingTier(tier);
    try {
      if (status.status === "active" && status.tier !== "free") {
        const result = await portalMutation.mutateAsync({
          returnUrl: window.location.href,
        });
        window.location.href = result.url;
        return;
      }

      const result = await checkoutMutation.mutateAsync({
        tier,
        billing: billingInterval,
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

  const handleFilmPackage = async (packageId: string) => {
    if (!status) {
      setLocation("/register");
      return;
    }

    setLoadingTier(packageId);
    try {
      const result = await filmPackageMutation.mutateAsync({
        packageId,
        useLaunchPrice: pricing?.launchSpecialActive ?? true,
        successUrl: `${window.location.origin}/?film_purchase=success`,
        cancelUrl: `${window.location.origin}/pricing?film_purchase=canceled`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error("Film package error:", err);
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
    free: Zap,
    creator: Film,
    pro: Crown,
    industry: Building2,
  };

  const tierColors: Record<string, string> = {
    free: "border-zinc-700",
    creator: "border-blue-500 ring-2 ring-blue-500/20",
    pro: "border-amber-500 ring-2 ring-amber-500/20",
    industry: "border-violet-500 ring-2 ring-violet-500/20",
  };

  const tierButtonColors: Record<string, string> = {
    free: "bg-zinc-700 hover:bg-zinc-600",
    creator: "bg-blue-600 hover:bg-blue-500",
    pro: "bg-amber-600 hover:bg-amber-500",
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
            Professional AI film production at 10-20% of traditional costs. From short films to full features.
          </p>
          {status?.isAdmin && (
            <Badge variant="outline" className="mt-4 border-amber-500 text-amber-500">
              <Crown className="w-3 h-3 mr-1" /> Admin — Full Access Granted
            </Badge>
          )}
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
              Be among the first studios to use AI-powered film production. Your first film at half price.
            </p>
          </div>
        )}

        {/* Current subscription info */}
        {status && status.tier !== "free" && status.status === "active" && (
          <div className="max-w-md mx-auto mb-10 p-4 rounded-lg border border-green-500/30 bg-green-500/5 text-center">
            <p className="text-sm text-green-400">
              You're on the <strong className="capitalize">{status.tier}</strong> plan
              {status.currentPeriodEnd && (
                <> · Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}</>
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
        {/* SECTION 1: FILM PRODUCTION PACKAGES */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
              <Clapperboard className="w-7 h-7 text-amber-400" />
              Film Production Packages
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              One-time payment per film. Full AI-generated production with voice acting, soundtrack, and visual continuity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricing?.filmPackages?.map((pkg: any) => (
              <Card key={pkg.id} className={`relative flex flex-col border-zinc-700 hover:border-amber-500/50 transition-all ${pkg.id === "full_feature" ? "ring-2 ring-amber-500/30 lg:scale-105" : ""}`}>
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
                <CardFooter className="pt-4">
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                    disabled={loadingTier === pkg.id}
                    onClick={() => handleFilmPackage(pkg.id)}
                  >
                    {loadingTier === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Start Production
                  </Button>
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
        {/* SECTION 2: VFX SCENE STUDIO */}
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
              <Card key={pkg.id} className="relative flex flex-col border-zinc-700 hover:border-violet-500/50 transition-all">
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
                <CardFooter className="pt-4">
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                    disabled={loadingTier === pkg.id}
                    onClick={() => handleFilmPackage(pkg.id)}
                  >
                    {loadingTier === pkg.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: PLATFORM ACCESS SUBSCRIPTION */}
        {/* ============================================================ */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold">Platform Access</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Monthly subscription for ongoing access to the Virelle Studios production platform and all creative tools.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className={`text-sm font-medium ${billingInterval === "monthly" ? "text-white" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === "monthly" ? "annual" : "monthly")}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                billingInterval === "annual" ? "bg-green-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  billingInterval === "annual" ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingInterval === "annual" ? "text-white" : "text-muted-foreground"}`}>
              Annual
            </span>
            {billingInterval === "annual" && (
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                Save 20%
              </Badge>
            )}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricing?.tiers.map((tier: any) => {
              const Icon = tierIcons[tier.id] || Zap;
              const isCurrentTier = currentTier === tier.id;
              const isPopular = tier.popular;
              const displayPrice = tier.id === "free"
                ? "$0"
                : billingInterval === "annual"
                ? formatPrice(tier.annualPrice)
                : formatPrice(tier.monthlyPrice);
              const priceInterval = tier.id === "free" ? "forever" : "/mo";

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
                      <span className="text-3xl font-bold">{displayPrice}</span>
                      <span className="text-muted-foreground ml-1">
                        {priceInterval}
                      </span>
                      {billingInterval === "annual" && tier.id !== "free" && (
                        <div className="text-xs text-green-400 mt-1">
                          {formatPrice(tier.annualTotal)}/year (save {formatPrice((tier.monthlyPrice * 12) - tier.annualTotal)}/yr)
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-2.5">
                      {tier.highlights.map((highlight: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    {tier.id === "free" ? (
                      <Button
                        className="w-full"
                        variant={isCurrentTier ? "outline" : "secondary"}
                        disabled={isCurrentTier}
                      >
                        {isCurrentTier ? "Current Plan" : "Get Started Free"}
                      </Button>
                    ) : (
                      <Button
                        className={`w-full text-white ${tierButtonColors[tier.id] || ""}`}
                        disabled={isCurrentTier || loadingTier === tier.id}
                        onClick={() => handleSubscribe(tier.id as "creator" | "pro" | "industry")}
                      >
                        {loadingTier === tier.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {isCurrentTier
                          ? "Current Plan"
                          : status?.status === "active" && status?.tier !== "free"
                          ? `Switch to ${tier.name}`
                          : `Subscribe to ${tier.name}`}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mb-16 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium text-blue-500">Creator</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-500">Pro</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-500">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { feature: "Projects", free: "1", creator: "10", pro: "50", industry: "Unlimited" },
                  { feature: "AI Generations / Month", free: "3", creator: "100", pro: "500", industry: "Unlimited" },
                  { feature: "Scenes per Project", free: "5", creator: "40", pro: "90", industry: "Unlimited" },
                  { feature: "Characters per Project", free: "3", creator: "20", pro: "50", industry: "Unlimited" },
                  { feature: "Max Film Duration", free: "5 min", creator: "30 min", pro: "90 min", industry: "180 min" },
                  { feature: "Max Resolution", free: "720p", creator: "1080p", pro: "1080p + 4K", industry: "4K + ProRes" },
                  { feature: "Team Members", free: "—", creator: "5", pro: "15", industry: "Unlimited" },
                  { feature: "Full Film Generation", free: false, creator: true, pro: true, industry: true },
                  { feature: "AI Voice Acting", free: false, creator: true, pro: true, industry: true },
                  { feature: "AI Soundtrack", free: false, creator: true, pro: true, industry: true },
                  { feature: "Character Consistency", free: false, creator: true, pro: true, industry: true },
                  { feature: "Scene Continuity", free: false, creator: true, pro: true, industry: true },
                  { feature: "Clip Chaining (30-60s scenes)", free: false, creator: true, pro: true, industry: true },
                  { feature: "Director AI Assistant", free: false, creator: true, pro: true, industry: true },
                  { feature: "VFX Scene Studio", free: false, creator: false, pro: true, industry: true },
                  { feature: "Bulk Generation", free: false, creator: false, pro: true, industry: true },
                  { feature: "White-Label Exports", free: false, creator: false, pro: false, industry: true },
                  { feature: "API Access", free: false, creator: false, pro: false, industry: true },
                  { feature: "Custom Model Fine-Tuning", free: false, creator: false, pro: false, industry: true },
                  { feature: "Priority Rendering", free: false, creator: false, pro: false, industry: true },
                  { feature: "Dedicated Support", free: false, creator: false, pro: false, industry: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    {(["free", "creator", "pro", "industry"] as const).map((tier) => {
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
                              : tier === "pro" ? "text-amber-400" 
                              : tier === "creator" ? "text-blue-400" 
                              : ""
                            }>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
                All plans use BYOK — you provide your own API keys for video generation (Runway, Sora, Replicate, fal.ai, Luma), 
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

        {/* Back to dashboard */}
        <div className="text-center mt-12">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            ← Back to Dashboard
          </Button>
        </div>
        <LeegoFooter />
      </div>
    </div>
  );
}
