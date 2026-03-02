import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Package, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import LeegoFooter from "@/components/LeegoFooter";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");

  const { data: pricing } = trpc.subscription.pricing.useQuery();
  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
  });
  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const topUpMutation = trpc.subscription.createTopUpCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  const currentTier = status?.tier || "free";

  const handleSubscribe = async (tier: "creator" | "pro" | "industry") => {
    if (!status) {
      setLocation("/register");
      return;
    }

    setLoadingTier(tier);
    try {
      // If user already has a subscription, open billing portal to change plan
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

  const handleTopUp = async (packId: "topup_10" | "topup_30" | "topup_100") => {
    if (!status) {
      setLocation("/register");
      return;
    }

    setLoadingTier(packId);
    try {
      const result = await topUpMutation.mutateAsync({
        packId,
        successUrl: `${window.location.origin}/?topup=success`,
        cancelUrl: `${window.location.origin}/pricing?topup=canceled`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      console.error("Top-up error:", err);
      alert(err.message || "Failed to start top-up checkout");
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            From indie filmmakers to production studios — pick the plan that fits your creative ambition.
          </p>
          {status?.isAdmin && (
            <Badge variant="outline" className="mt-4 border-amber-500 text-amber-500">
              <Crown className="w-3 h-3 mr-1" /> Admin — Full Access Granted
            </Badge>
          )}
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

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {pricing?.tiers.map((tier: any) => {
            const Icon = tierIcons[tier.id] || Zap;
            const isCurrentTier = currentTier === tier.id;
            const isPopular = tier.popular;
            const displayPrice = tier.id === "free"
              ? "$0"
              : billingInterval === "annual"
              ? `$${tier.annualPrice}`
              : `$${tier.monthlyPrice}`;
            const priceInterval = tier.id === "free" ? "forever" : "month";

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
                {tier.trial && !isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-3 py-1">7-Day Free Trial</Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[2.5rem]">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{displayPrice}</span>
                    <span className="text-muted-foreground ml-1">
                      /{priceInterval}
                    </span>
                    {billingInterval === "annual" && tier.id !== "free" && (
                      <div className="text-xs text-green-400 mt-1">
                        ${tier.annualTotal}/year (save ${(tier.monthlyPrice * 12) - tier.annualTotal}/yr)
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
                        : currentTier !== "free" && currentTier !== tier.id
                        ? `Switch to ${tier.name}`
                        : tier.trial
                        ? `Start Free Trial`
                        : `Subscribe to ${tier.name}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Generation Top-Up Packs */}
        {pricing?.topUpPacks && (
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Package className="w-6 h-6" />
                Generation Top-Up Packs
              </h2>
              <p className="text-muted-foreground mt-2">
                Need more generations this month? Grab a pack — bonus generations never expire.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {pricing.topUpPacks.map((pack: any) => (
                <Card key={pack.id} className="border-zinc-700 hover:border-zinc-500 transition-all">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <CardDescription>
                      {pack.generations} extra generations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">${pack.price}</span>
                      <span className="text-muted-foreground text-sm">one-time</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${pack.pricePerGen.toFixed(2)} per generation
                    </p>
                    {pack.savings && (
                      <Badge className="mt-2 bg-green-600/20 text-green-400 border-green-600/30">
                        {pack.savings}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={loadingTier === pack.id}
                      onClick={() => handleTopUp(pack.id)}
                    >
                      {loadingTier === pack.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Buy Pack
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Referral Program */}
        {pricing?.referralRewards && (
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  Referral Program
                </CardTitle>
                <CardDescription>
                  Share Virelle with friends and both of you get free generations
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
                    <div className="text-sm text-muted-foreground mt-1">Your friend gets</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Bonus generations are added instantly and never expire. Find your referral link in Settings.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mt-16 sm:mt-20 max-w-6xl mx-auto">
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
                  { feature: "Projects", free: "2", creator: "5", pro: "25", industry: "Unlimited" },
                  { feature: "AI Generations / Month", free: "5", creator: "30", pro: "200", industry: "Unlimited" },
                  { feature: "Scenes per Project", free: "5", creator: "15", pro: "50", industry: "Unlimited" },
                  { feature: "Characters per Project", free: "3", creator: "10", pro: "30", industry: "Unlimited" },
                  { feature: "Movie Exports", free: "1", creator: "5", pro: "25", industry: "Unlimited" },
                  { feature: "Max Resolution", free: "720p", creator: "1080p", pro: "1080p", industry: "4K" },
                  { feature: "Max Duration", free: "10 min", creator: "30 min", pro: "60 min", industry: "180 min" },
                  { feature: "Collaboration", free: false, creator: "2 members", pro: "5 members", industry: "Unlimited" },
                  { feature: "Quick Generate", free: true, creator: true, pro: true, industry: true },
                  { feature: "Script Writer", free: true, creator: true, pro: true, industry: true },
                  { feature: "Storyboard", free: true, creator: true, pro: true, industry: true },
                  { feature: "AI Character Generation", free: true, creator: true, pro: true, industry: true },
                  { feature: "AI Script Generation", free: true, creator: true, pro: true, industry: true },
                  { feature: "AI Dialogue Generation", free: true, creator: true, pro: true, industry: true },
                  { feature: "Trailer Generation", free: false, creator: true, pro: true, industry: true },
                  { feature: "Director AI Assistant", free: false, creator: true, pro: true, industry: true },
                  { feature: "Sound Effects", free: false, creator: true, pro: true, industry: true },
                  { feature: "Color Grading", free: false, creator: true, pro: true, industry: true },
                  { feature: "Dialogue Editor", free: false, creator: true, pro: true, industry: true },
                  { feature: "Subtitles", free: false, creator: true, pro: true, industry: true },
                  { feature: "Mood Board", free: false, creator: true, pro: true, industry: true },
                  { feature: "Shot List", free: false, creator: true, pro: true, industry: true },
                  { feature: "Bulk Generate", free: false, creator: false, pro: true, industry: true },
                  { feature: "Visual Effects", free: false, creator: false, pro: true, industry: true },
                  { feature: "Location Scout", free: false, creator: false, pro: true, industry: true },
                  { feature: "Continuity Check", free: false, creator: false, pro: true, industry: true },
                  { feature: "Budget Estimator", free: false, creator: false, pro: true, industry: true },
                  { feature: "Ad & Poster Maker", free: false, creator: false, pro: true, industry: true },
                  { feature: "AI Budget Generation", free: false, creator: false, pro: true, industry: true },
                  { feature: "AI Location Suggestions", free: false, creator: false, pro: true, industry: true },
                  { feature: "HD Export (1080p)", free: false, creator: true, pro: true, industry: true },
                  { feature: "Ultra HD Export (4K)", free: false, creator: false, pro: false, industry: true },
                  { feature: "Priority Support", free: false, creator: false, pro: false, industry: true },
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
        <div className="mt-12 max-w-3xl mx-auto text-center">
          <Card className="border-zinc-700 bg-zinc-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold">Bring Your Own API Key (BYOK)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                All plans support BYOK for video generation providers (OpenAI Sora, Runway ML, Replicate, fal.ai, Luma AI).
                Use your own API keys for unlimited video generation at your own cost — no plan limits apply to BYOK generations.
              </p>
            </CardContent>
          </Card>
        </div>

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
