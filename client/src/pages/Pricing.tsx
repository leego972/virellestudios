import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const { data: pricing } = trpc.subscription.pricing.useQuery();
  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
  });
  const checkoutMutation = trpc.subscription.createCheckout.useMutation();
  const portalMutation = trpc.subscription.createBillingPortal.useMutation();

  const currentTier = status?.tier || "free";

  const handleSubscribe = async (tier: "pro" | "industry") => {
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

  const tierIcons = {
    free: Zap,
    pro: Crown,
    industry: Building2,
  };

  const tierColors = {
    free: "border-zinc-700",
    pro: "border-amber-500 ring-2 ring-amber-500/20",
    industry: "border-violet-500 ring-2 ring-violet-500/20",
  };

  const tierButtonColors = {
    free: "bg-zinc-700 hover:bg-zinc-600",
    pro: "bg-amber-600 hover:bg-amber-500",
    industry: "bg-violet-600 hover:bg-violet-500",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {pricing?.tiers.map((tier) => {
            const Icon = tierIcons[tier.id as keyof typeof tierIcons] || Zap;
            const isCurrentTier = currentTier === tier.id;
            const isPopular = tier.id === "pro";

            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${tierColors[tier.id as keyof typeof tierColors] || "border-zinc-700"} ${isPopular ? "scale-[1.02] sm:scale-105" : ""} transition-all`}
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
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.priceLabel}</span>
                    <span className="text-muted-foreground ml-1">
                      /{tier.interval}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.highlights.map((highlight, i) => (
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
                      className={`w-full text-white ${tierButtonColors[tier.id as keyof typeof tierButtonColors] || ""}`}
                      disabled={isCurrentTier || loadingTier === tier.id}
                      onClick={() => handleSubscribe(tier.id as "pro" | "industry")}
                    >
                      {loadingTier === tier.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {isCurrentTier
                        ? "Current Plan"
                        : currentTier !== "free" && currentTier !== tier.id
                        ? tier.id === "industry"
                          ? "Upgrade to Industry"
                          : "Change to Pro"
                        : `Subscribe to ${tier.name}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="mt-16 sm:mt-20 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium text-amber-500">Pro</th>
                  <th className="text-center py-3 px-4 font-medium text-violet-500">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { feature: "Projects", free: "1", pro: "25", industry: "Unlimited" },
                  { feature: "AI Generations / Month", free: "3", pro: "100", industry: "Unlimited" },
                  { feature: "Scenes per Project", free: "5", pro: "50", industry: "Unlimited" },
                  { feature: "Characters per Project", free: "3", pro: "30", industry: "Unlimited" },
                  { feature: "Movie Exports", free: "1", pro: "25", industry: "Unlimited" },
                  { feature: "Max Resolution", free: "720p", pro: "1080p", industry: "4K" },
                  { feature: "Quick Generate", free: true, pro: true, industry: true },
                  { feature: "Trailer Generation", free: false, pro: true, industry: true },
                  { feature: "Director AI Assistant", free: false, pro: true, industry: true },
                  { feature: "Script Writer", free: false, pro: true, industry: true },
                  { feature: "Dialogue Editor", free: false, pro: true, industry: true },
                  { feature: "Sound Effects", free: false, pro: true, industry: true },
                  { feature: "Visual Effects", free: false, pro: true, industry: true },
                  { feature: "Color Grading", free: false, pro: true, industry: true },
                  { feature: "Subtitles", free: false, pro: true, industry: true },
                  { feature: "Location Scout", free: false, pro: true, industry: true },
                  { feature: "Mood Board", free: false, pro: true, industry: true },
                  { feature: "Shot List", free: false, pro: true, industry: true },
                  { feature: "Continuity Check", free: false, pro: true, industry: true },
                  { feature: "Storyboard", free: false, pro: true, industry: true },
                  { feature: "Budget Estimator", free: false, pro: true, industry: true },
                  { feature: "Ad & Poster Maker", free: false, pro: true, industry: true },
                  { feature: "Collaboration", free: false, pro: "5 members", industry: "Unlimited" },
                  { feature: "AI Character Generation", free: false, pro: true, industry: true },
                  { feature: "AI Script Generation", free: false, pro: true, industry: true },
                  { feature: "Ultra Quality Export", free: false, pro: false, industry: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="py-3 px-4 font-medium">{row.feature}</td>
                    {(["free", "pro", "industry"] as const).map((tier) => {
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
                            <span className={tier === "industry" ? "text-violet-400" : tier === "pro" ? "text-amber-400" : ""}>{val}</span>
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

        {/* Back to dashboard */}
        <div className="text-center mt-12">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
