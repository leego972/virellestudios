import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Crown, Zap, Building2, Film, Loader2, Gift, Lock, Sparkles, Clapperboard, Wand2, Timer, Coins, ShoppingCart, Camera, PhoneCall, CalendarDays } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import { HollywoodBadge } from "@/components/HollywoodIcon";
import { PRICING_TIER_BADGE, TierBadgeKey } from "@/constants/hollywoodIcons";

// ─── Tier Definitions ────────────────────────────────────────────────────────
// All prices in AUD. Three public tiers: Indie, Creator, Industry — all self-serve.
// Legacy DB keys independent/creator/studio all resolve to Industry.

const SELF_SERVE_TIERS = [
  {
    id: "indie",
    displayName: "Indie",
    icon: Camera,
    color: "border-emerald-500 ring-2 ring-emerald-500/20",
    buttonColor: "bg-emerald-600 hover:bg-emerald-500",
    accentColor: "text-emerald-400",
    monthly: 149,
    annual: 1490,
    credits: 500,
    badge: "Entry Tier",
    badgeColor: "bg-emerald-700",
    audience: "Solo filmmakers and creators exploring AI-assisted production.",
    description: "Core tools for screenplay development, character design, and cinematic planning.",
    highlights: [
      "500 credits/month (~50 video scenes)",
      "AI Script Writer & Screenplay Tools",
      "Character Creator & DNA Lock",
      "Director's AI Assistant (Virelle Chat)",
      "Location Scout & Mood Board",
      "Shot List Generator",
      "Up to 2 projects",
      "720p export",
      "BYOK support (Runway, ElevenLabs, Suno)",
    ],
    primaryCTA: "Start Creating",
    secondaryCTA: "View Feature Breakdown",
    selfServe: true,
  },
  {
    id: "amateur",
    displayName: "Creator",
    icon: Film,
    color: "border-amber-500 ring-2 ring-amber-500/20",
    buttonColor: "bg-amber-600 hover:bg-amber-500",
    accentColor: "text-amber-400",
    monthly: 490,
    annual: 4900,
    credits: 2000,
    badge: "Most Popular",
    badgeColor: "bg-amber-700",
    audience: "Independent producers and creators building commercial-grade projects.",
    description: "Integrated production pipeline including video generation, voice acting, and scoring.",
    highlights: [
      "2,000 credits/month (~200 video scenes)",
      "Everything in Indie, plus:",
      "Video Generation (Runway, Sora, Kling, Veo)",
      "AI Voice Acting (35 emotions, 3,000+ voices)",
      "AI Film Score (Suno v4)",
      "Character DNA Lock across all scenes",
      "Up to 10 projects, 90 min per film",
      "1080p export",
    ],
    primaryCTA: "Start Producing",
    secondaryCTA: "See Workflow Features",
    selfServe: true,
  },
  {
    id: "independent",
    displayName: "Industry",
    icon: Clapperboard,
    color: "border-violet-500 ring-2 ring-violet-500/20",
    buttonColor: "bg-violet-600 hover:bg-violet-500",
    accentColor: "text-violet-400",
    monthly: 1490,
    annual: 14900,
    credits: 6000,
    badge: "Commercial",
    badgeColor: "bg-violet-700",
    audience: "Boutique studios, agencies, and commercial directors with repeat pipelines.",
    description: "Full commercial production workflow. Post-production, 4K export, VFX, multi-shot sequencer, and team collaboration.",
    highlights: [
      "6,000 credits/month (~600 video scenes)",
      "Everything in Creator, plus:",
      "Film Post-Production (ADR, Foley, Score, Mix)",
      "Subtitles in 130+ languages",
      "VFX Suite & Bulk Generation",
      "Multi-Shot Sequencer & NLE Export",
      "Up to 25 projects, 90 min per film",
      "4K + ProRes export",
      "5 team members",
    ],
    primaryCTA: "Scale Production",
    secondaryCTA: "See Workflow Features",
    selfServe: true,
  },
];

// Enterprise / custom-pricing tier (contact sales — not shown in main grid)
const ENTERPRISE_TIERS = [
  {
    id: "industry",
    displayName: "Industry (Enterprise)",
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
    description: "Contract-led deployment for major studios and broadcasters. Custom model tuning and bespoke commercial terms.",
    highlights: [
      "Credits tailored to deployment scope",
      "Everything in Industry, plus:",
      "Unlimited projects, 180 min per film",
      "Live Action Plate Compositing",
      "Custom AI Model Fine-Tuning",
      "Dedicated Account Manager",
      "Unlimited team members",
      "Bespoke commercial terms",
    ],
    primaryCTA: "Discuss Enterprise Workflow",
    secondaryCTA: "Contact Sales",
    selfServe: false,
  },
];

const ALL_TIERS = [...SELF_SERVE_TIERS, ...ENTERPRISE_TIERS];

const CREDIT_PACKS = [
  { id: "topup_10",   credits: 100,   price: 19,    perCredit: 0.19, label: "Starter Pack",     saving: "" },
  { id: "topup_50",   credits: 300,   price: 49,    perCredit: 0.16, label: "Producer Pack",    saving: "Save 16%" },
  { id: "topup_100",  credits: 750,   price: 99,    perCredit: 0.13, label: "Director Pack",    saving: "Save 32%" },
  { id: "topup_200",  credits: 2000,  price: 199,   perCredit: 0.10, label: "Filmmaker Pack",      saving: "Save 47%", popular: true },
  { id: "topup_500",  credits: 5000,  price: 399,   perCredit: 0.08, label: "Blockbuster Pack", saving: "Save 58%" },
  { id: "topup_1000", credits: 12000, price: 799,   perCredit: 0.07, label: "Mogul Pack",       saving: "Save 63%" },
];

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
  { action: "Budget Estimator", cost: 5, icon: "💰" },
  { action: "Location Scout", cost: 3, icon: "📍" },
  { action: "Mood Board", cost: 3, icon: "🎨" },
  { action: "Color Grading Plan", cost: 4, icon: "🌈" },
  { action: "Sound Effects (AI)", cost: 5, icon: "🔊" },
  { action: "ADR Suggestions", cost: 5, icon: "🎙️" },
  { action: "Foley Suggestions", cost: 5, icon: "🎵" },
  { action: "Score Cues", cost: 8, icon: "🎼" },
  { action: "Mix Summary Export", cost: 2, icon: "🎚️" },
  { action: "Funding Application", cost: 10, icon: "💼" },
];

const FAQ = [
  {
    q: "What is Virelle Studios?",
    a: "Virelle Studios is a premium AI-powered film production platform that lets you create professional-quality films using AI-assisted tools for scripting, character generation, scene production, and post-processing.",
  },
  {
    q: "How do credits work?",
    a: "Credits are consumed each time you use a generative feature — such as generating a scene video, creating a storyboard, or running the AI script writer. Your subscription includes a monthly credit allowance, and you can purchase additional credit packs at any time.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Yes. You can cancel at any time from your billing settings. Your subscription remains active until the end of the current billing period, after which it will not renew.",
  },
  {
    q: "What is the Founding Director offer?",
    a: "The Founding Director offer gives early members 50% off their first year on any annual Creator or Industry plan. This is a limited offer available to the first 150 members.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Yes — all credits accumulate in your balance and never expire. Each month, your subscription's monthly allowance is added on top of any remaining balance. Credits purchased as top-up packs work the same way: they are added to your balance and carry forward indefinitely.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards via Stripe. Monthly billing also supports ACH bank transfers for Australian and US customers.",
  },
];

export default function Pricing() {
  // Read URL params — source=mobile means the user came from the mobile app
  const urlParams = new URLSearchParams(window.location.search);
  const urlSource = urlParams.get("source") ?? "";
  const urlTier = urlParams.get("tier") ?? "";
  const urlPack = urlParams.get("pack") ?? "";
  const urlBilling = (urlParams.get("billing") ?? "annual") as "monthly" | "annual";
  const isMobileSource = urlSource === "mobile";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(urlBilling);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const isLoggedIn = !!user;
  const currentTier = user?.subscriptionTier || "free";
  const isActiveMember = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const createCheckout = trpc.subscription.createCheckout.useMutation();
  const createTopUpCheckout = trpc.subscription.createTopUpCheckout.useMutation();

  // Auto-trigger checkout when source=mobile and tier is pre-selected in URL
  useEffect(() => {
    if (isMobileSource && urlTier && isLoggedIn) {
      handleSubscribe(urlTier);
    }
  }, [isLoggedIn, isMobileSource, urlTier]);
  // Auto-trigger top-up checkout when source=mobile and pack is pre-selected in URL
  useEffect(() => {
    if (isMobileSource && urlPack && isLoggedIn) {
      handleTopUp(urlPack);
    }
  }, [isLoggedIn, isMobileSource, urlPack]);

  const formatAUD = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubscribe = async (tierId: string) => {
    if (!isLoggedIn) {
      const redirect = isMobileSource
        ? `/register?redirect=/pricing?tier=${tierId}&billing=${billingCycle}&source=mobile`
        : `/register?redirect=/pricing`;
      setLocation(redirect);
      return;
    }
    // If already on this tier, open billing portal
    if (currentTier === tierId && isActiveMember) {
      setLocation("/settings?tab=billing");
      return;
    }
    setLoadingTier(tierId);
    try {
      // When source=mobile, append source param so BillingSuccess can redirect back to the app
      const sourceParam = isMobileSource ? "&source=mobile" : "";
      const successUrl = `${window.location.origin}/billing/success?tier=${tierId}${sourceParam}`;
      const cancelUrl = isMobileSource
        ? `virelle://billing/cancel?subscription=canceled`
        : `${window.location.origin}/pricing`;
      const result = await createCheckout.mutateAsync({
        tier: tierId as any,
        billing: billingCycle,
        successUrl,
        cancelUrl,
      });
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Failed to create checkout session. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingTier(null);
    }
  };

  const handleTopUp = async (packId: string) => {
    if (!isLoggedIn) {
      setLocation("/register?redirect=/pricing");
      return;
    }
    setLoadingPack(packId);
    try {
      const sourceParam = isMobileSource ? "&source=mobile" : "";
      const successUrl = `${window.location.origin}/billing/success?type=topup&pack=${packId}${sourceParam}`;
      const cancelUrl = isMobileSource
        ? `virelle://billing/cancel?subscription=canceled`
        : `${window.location.origin}/pricing#credits`;
      const result = await createTopUpCheckout.mutateAsync({
        packId: packId as any,
        successUrl,
        cancelUrl,
      });
      if (result.url) {
        window.location.href = result.url;
      } else {
        toast.error("Failed to create checkout session. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoadingPack(null);
    }
  };

  const handleEnterpriseContact = (type: string) => {
    setLocation(`/contact?type=${type}`);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-amber-500/30">
      <GoldWatermarkLaunch />
      
      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-amber-500/50 text-amber-400 px-4 py-1">
            Virelle Studios Membership
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Professional AI <span className="text-amber-400">Film Production</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From screenplay to final mix. Choose the membership that fits your production volume.
          </p>

          {/* Billing Toggle */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <span className={`text-sm ${billingCycle === "monthly" ? "text-white" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="relative w-14 h-7 bg-zinc-800 rounded-full p-1 transition-colors hover:bg-zinc-700"
            >
              <div className={`w-5 h-5 bg-amber-500 rounded-full transition-transform ${billingCycle === "annual" ? "translate-x-7" : "translate-x-0"}`} />
            </button>
            <span className={`text-sm ${billingCycle === "annual" ? "text-white" : "text-muted-foreground"}`}>
              Annual <span className="text-amber-400 font-semibold ml-1">(Save ~17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-20">
          {SELF_SERVE_TIERS.map((tier) => {
            const price = billingCycle === "annual" ? tier.annual : tier.monthly;
            const isCurrentTier = currentTier === tier.id;
            const Icon = tier.icon;

            return (
              <Card key={tier.id} className={`relative flex flex-col border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700 ${tier.color}`}>
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${tier.badgeColor} text-white px-4 py-1`}>{tier.badge}</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {PRICING_TIER_BADGE[tier.id] && (
                      <HollywoodBadge
                        tier={PRICING_TIER_BADGE[tier.id] as TierBadgeKey}
                        size={36}
                        className="shrink-0"
                      />
                    )}
                    <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[3rem]">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{formatAUD(price)}</span>
                    <span className="text-muted-foreground ml-1">/{billingCycle === "annual" ? "year" : "month"}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium text-amber-400">
                    <Coins className="w-4 h-4" />
                    {tier.credits.toLocaleString()} credits/mo included
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full text-white ${tier.buttonColor}`}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={loadingTier === tier.id}
                  >
                    {loadingTier === tier.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : tier.primaryCTA}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Enterprise Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {ENTERPRISE_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card key={tier.id} className={`relative flex flex-col border-zinc-800 bg-zinc-900/50 backdrop-blur-sm ${tier.color}`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className={`${tier.badgeColor} text-white px-4 py-1`}>{tier.badge}</Badge>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {PRICING_TIER_BADGE[tier.id] && (
                      <HollywoodBadge
                        tier={PRICING_TIER_BADGE[tier.id] as TierBadgeKey}
                        size={36}
                        className="shrink-0"
                      />
                    )}
                    <CardTitle className="text-2xl">{tier.displayName}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[3rem]">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.priceDisplay}</span>
                    <span className="text-muted-foreground ml-1">{tier.priceNote}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline"
                    className="w-full border-zinc-700 hover:bg-zinc-800"
                    onClick={() => handleEnterpriseContact(tier.id)}
                  >
                    {tier.primaryCTA}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div id="comparison" className="max-w-7xl mx-auto mb-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/30">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="py-4 px-6 font-semibold">Feature</th>
                  <th className="py-4 px-6 text-center font-semibold text-blue-400">
                    <div className="flex flex-col items-center gap-1">
                      <HollywoodBadge tier="indie" size={24} />
                      <span>Indie</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-emerald-400">
                    <div className="flex flex-col items-center gap-1">
                      <HollywoodBadge tier="creator" size={24} />
                      <span>Creator</span>
                    </div>
                  </th>
                  <th className="py-4 px-6 text-center font-semibold text-amber-400">
                    <div className="flex flex-col items-center gap-1">
                      <HollywoodBadge tier="industry" size={24} />
                      <span>Industry</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { name: "Monthly Credits", indie: "500", creator: "2,000", industry: "6,000" },
                  { name: "Max Projects", indie: "2", creator: "10", industry: "25" },
                  { name: "AI Script Writer", indie: true, creator: true, industry: true },
                  { name: "Character DNA Lock", indie: true, creator: true, industry: true },
                  { name: "Video Generation", indie: false, creator: true, industry: true },
                  { name: "AI Voice Acting", indie: false, creator: true, industry: true },
                  { name: "AI Film Score", indie: false, creator: true, industry: true },
                  { name: "4K Export", indie: false, creator: false, industry: true },
                  { name: "VFX Suite", indie: false, creator: false, industry: true },
                  { name: "Multi-Shot Sequencer", indie: false, creator: false, industry: true },
                  { name: "NLE Export", indie: false, creator: false, industry: true },
                  { name: "Team Members", indie: "1", creator: "1", industry: "5" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-zinc-300">{row.name}</td>
                    {[row.indie, row.creator, row.industry].map((val, j) => (
                      <td key={j} className="py-4 px-6 text-center">
                        {typeof val === "boolean" ? (
                          val ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-zinc-600 mx-auto" />
                        ) : (
                          <span className="text-zinc-400">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Packs */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Credit Top-ups</h2>
            <p className="text-muted-foreground">Need more credits mid-production? Purchase a one-time pack.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.id} className={`border-zinc-800 bg-zinc-900/50 ${pack.popular ? "ring-1 ring-amber-500/50 border-amber-500/50" : ""}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{pack.label}</CardTitle>
                    {pack.popular && <Badge className="bg-amber-600">Best Value</Badge>}
                  </div>
                  <div className="text-2xl font-bold mt-2">{formatAUD(pack.price)}</div>
                  <CardDescription>{pack.credits.toLocaleString()} credits</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full border-zinc-700 hover:bg-zinc-800"
                    onClick={() => handleTopUp(pack.id)}
                    disabled={loadingPack === pack.id}
                  >
                    {loadingPack === pack.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loadingPack === pack.id ? "Redirecting..." : isLoggedIn ? "Purchase" : "Sign in to Purchase"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {FAQ.map((item, i) => (
              <div key={i}>
                <h3 className="text-lg font-semibold mb-2 text-amber-400">{item.q}</h3>
                <p className="text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LeegoFooterLaunch />
    </div>
  );
}
