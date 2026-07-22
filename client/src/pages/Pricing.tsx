import SiteHead from "@/components/SiteHead";
import LeegoFooterLaunch from "@/components/LeegoFooterLaunch";
import GoldWatermarkLaunch from "@/components/GoldWatermarkLaunch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Check,
  Clapperboard,
  Coins,
  Film,
  KeyRound,
  Loader2,
  LockKeyhole,
  RadioTower,
  Shield,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const MEMBERSHIPS = [
  {
    id: "indie",
    name: "Indie",
    monthly: 149,
    annual: 1490,
    credits: 700,
    badge: "Entry",
    description: "Solo filmmakers and creators developing smaller productions.",
    features: [
      "700 credits added each month",
      "Up to 2 active projects",
      "Script, character and planning tools",
      "Director AI assistant",
      "720p export",
      "BYOK provider support",
      "Adult Studio access after verification",
      "60 managed broadcast minutes/month",
    ],
  },
  {
    id: "amateur",
    name: "Creator",
    monthly: 490,
    annual: 4900,
    credits: 3000,
    badge: "Most popular",
    description: "Independent producers creating commercial-grade work.",
    features: [
      "3,000 credits added each month",
      "Up to 10 active projects",
      "Video generation, voice and scoring",
      "Character DNA continuity",
      "1080p export",
      "Premium Signature Cast access",
      "Adult Studio access after verification",
      "180 managed broadcast minutes/month",
    ],
  },
  {
    id: "independent",
    name: "Industry",
    monthly: 1490,
    annual: 14900,
    credits: 9000,
    badge: "Commercial",
    description: "Studios, agencies and directors running repeat production pipelines.",
    features: [
      "9,000 credits added each month",
      "Up to 25 active projects",
      "Full VFX and post-production suite",
      "Multi-shot sequencer and NLE export",
      "4K and ProRes export",
      "5 team members",
      "Full Signature Cast commercial access",
      "600 managed broadcast minutes/month",
    ],
  },
] as const;

const CREDIT_PACKS = [
  { id: "topup_10", label: "Starter", credits: 200, price: 19, popular: false },
  { id: "topup_50", label: "Producer", credits: 600, price: 49, popular: false },
  { id: "topup_100", label: "Director", credits: 1400, price: 99, popular: false },
  { id: "topup_200", label: "Filmmaker", credits: 3500, price: 199, popular: true },
  { id: "topup_500", label: "Blockbuster", credits: 9000, price: 399, popular: false },
  { id: "topup_1000", label: "Mogul", credits: 22000, price: 799, popular: false },
] as const;

const BROADCAST_PACKS = [
  { id: "relay_120", label: "Live Starter", minutes: 120, price: 9, rate: "A$4.50/hour", popular: false },
  { id: "relay_600", label: "Live Creator", minutes: 600, price: 29, rate: "A$2.90/hour", popular: true },
  { id: "relay_1500", label: "Live Producer", minutes: 1500, price: 59, rate: "A$2.36/hour", popular: false },
  { id: "relay_3600", label: "Live Studio", minutes: 3600, price: 119, rate: "A$1.98/hour", popular: false },
] as const;

const FILM_PACKAGES = [
  { name: "Short Film Package", duration: "Up to 30 minutes", launch: 400, standard: 800 },
  { name: "Feature Film Package", duration: "Up to 90 minutes", launch: 1000, standard: 2000 },
] as const;

const OTHER_PRICING = [
  { name: "Designer marketplace membership", price: "A$299/year", note: "Founding price may be A$150 for the first year while available." },
  { name: "Lamalo virtual wardrobe", price: "From A$0.30/item", note: "Each colour variant is a separate production asset." },
  { name: "Signature Cast", price: "Actor and licence dependent", note: "The final price is shown before checkout." },
  { name: "Direct OBS broadcast", price: "A$0/minute", note: "No Virelle relay, no BYOK and no AI generation." },
] as const;

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Pricing() {
  const params = new URLSearchParams(window.location.search);
  const isMobileSource = params.get("source") === "mobile";
  const selectedTier = params.get("tier") || "";
  const selectedPack = params.get("pack") || "";
  const initialBilling = params.get("billing") === "monthly" ? "monthly" : "annual";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(initialBilling);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const createCheckout = trpc.subscription.createCheckout.useMutation();
  const createTopUpCheckout = trpc.subscription.createTopUpCheckout.useMutation();

  const isLoggedIn = Boolean(user);
  const currentTier = user?.subscriptionTier || "free";
  const activeMembership = user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";

  const subscribe = async (tierId: string) => {
    if (!isLoggedIn) {
      const redirect = encodeURIComponent(`/pricing?tier=${tierId}&billing=${billingCycle}${isMobileSource ? "&source=mobile" : ""}`);
      setLocation(`/register?redirect=${redirect}`);
      return;
    }
    if (currentTier === tierId && activeMembership) {
      setLocation("/settings?tab=billing");
      return;
    }
    setLoadingTier(tierId);
    try {
      const sourceParam = isMobileSource ? "&source=mobile" : "";
      const result = await createCheckout.mutateAsync({
        tier: tierId as any,
        billing: billingCycle,
        successUrl: `${window.location.origin}/billing/success?tier=${tierId}${sourceParam}`,
        cancelUrl: isMobileSource
          ? "virelle://billing/cancel?subscription=canceled"
          : `${window.location.origin}/pricing`,
      });
      if (!result.url) throw new Error("Stripe checkout did not return a URL.");
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not open subscription checkout.");
    } finally {
      setLoadingTier(null);
    }
  };

  const purchaseCredits = async (packId: string) => {
    if (!isLoggedIn) {
      setLocation("/register?redirect=/pricing#credits");
      return;
    }
    setLoadingPack(packId);
    try {
      const sourceParam = isMobileSource ? "&source=mobile" : "";
      const result = await createTopUpCheckout.mutateAsync({
        packId: packId as any,
        successUrl: `${window.location.origin}/billing/success?type=topup&pack=${packId}${sourceParam}`,
        cancelUrl: isMobileSource
          ? "virelle://billing/cancel?subscription=canceled"
          : `${window.location.origin}/pricing#credits`,
      });
      if (!result.url) throw new Error("Stripe checkout did not return a URL.");
      window.location.href = result.url;
    } catch (error: any) {
      toast.error(error?.message || "Could not open credit checkout.");
    } finally {
      setLoadingPack(null);
    }
  };

  useEffect(() => {
    if (isLoggedIn && isMobileSource && selectedTier) subscribe(selectedTier);
    // URL-driven mobile checkout should run only after authentication resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isMobileSource, selectedTier]);

  useEffect(() => {
    if (isLoggedIn && isMobileSource && selectedPack) purchaseCredits(selectedPack);
    // URL-driven mobile checkout should run only after authentication resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, isMobileSource, selectedPack]);

  return (
    <div
      className="min-h-screen text-white selection:bg-amber-500/30"
      style={{ background: "linear-gradient(135deg,#07070e 0%,#0c0b18 60%,#07070a 100%)" }}
    >
      <SiteHead
        title="Plans & Pricing"
        description="Current Virelle Studios membership, credits, film package, Adult Studio and broadcast pricing in Australian dollars."
      />
      <GoldWatermarkLaunch />

      <div className="border-b border-amber-500/20 bg-amber-500 px-4 py-2 text-center text-xs font-bold text-black">
        Founding Director offer: 50% off the first year of eligible annual Creator and Industry memberships while available.
      </div>

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mx-auto mb-14 max-w-4xl text-center">
          <Badge variant="outline" className="mb-4 border-amber-500/40 text-amber-300">All prices in AUD</Badge>
          <h1 className="mb-5 text-4xl font-black tracking-tight sm:text-6xl">One clear production price list.</h1>
          <p className="text-lg leading-relaxed text-white/55">
            Membership unlocks the platform. Credits pay for Virelle generative and orchestration actions. BYOK provider charges are paid directly to the selected AI provider. Plain broadcasting does not require BYOK.
          </p>
        </header>

        <section className="mb-20">
          <div className="mb-9 flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400/70">Membership</p>
              <h2 className="mt-2 text-3xl font-bold">Choose your production tier</h2>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 p-1">
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${billingCycle === "monthly" ? "bg-white text-black" : "text-white/50"}`}
                onClick={() => setBillingCycle("monthly")}
              >Monthly</button>
              <button
                className={`rounded-full px-4 py-2 text-sm font-semibold ${billingCycle === "annual" ? "bg-amber-500 text-black" : "text-white/50"}`}
                onClick={() => setBillingCycle("annual")}
              >Annual · save about 17%</button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {MEMBERSHIPS.map((tier) => {
              const price = billingCycle === "monthly" ? tier.monthly : tier.annual;
              return (
                <Card key={tier.id} className="relative flex flex-col border-amber-500/20 bg-black/25 text-white backdrop-blur-sm">
                  <Badge className="absolute -top-3 left-6 bg-amber-600 text-white">{tier.badge}</Badge>
                  <CardHeader className="pt-8">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <p className="min-h-12 text-sm leading-relaxed text-white/50">{tier.description}</p>
                    <div className="pt-3">
                      <span className="text-4xl font-black text-amber-300">{formatAUD(price)}</span>
                      <span className="ml-1 text-sm text-white/40">/{billingCycle === "monthly" ? "month" : "year"}</span>
                    </div>
                    <p className="text-sm font-semibold text-amber-400">{tier.credits.toLocaleString()} credits/month</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-white/65">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      className="w-full bg-amber-500 font-bold text-black hover:bg-amber-400"
                      disabled={loadingTier !== null || loadingPack !== null}
                      onClick={() => subscribe(tier.id)}
                    >
                      {loadingTier === tier.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Film className="mr-2 h-4 w-4" />}
                      {currentTier === tier.id && activeMembership ? "Manage membership" : `Choose ${tier.name}`}
                    </Button>
                    <p className="flex items-center gap-1 text-xs text-white/30"><Shield className="h-3 w-3" /> Stripe checkout · cancel anytime</p>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="broadcast" className="mb-20 scroll-mt-20">
          <div className="mb-9 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-red-200">
              <LockKeyhole className="h-3.5 w-3.5" /> Adult Studio and broadcast
            </div>
            <h2 className="mb-4 text-3xl font-bold">Broadcast charges depend on the route selected</h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-white/50">
              Direct OBS broadcasting is included with membership and does not use BYOK. Managed relay minutes cover Virelle routing, multi-output delivery, recording and compliance retention. AI-assisted broadcast additionally requires a funded provider key selected during setup.
            </p>
          </div>

          <div className="mb-6 grid gap-5 md:grid-cols-3">
            {[
              { icon: RadioTower, title: "Direct broadcast", price: "A$0/min", text: "OBS connects directly to the destination. No Virelle relay, no AI processing and no BYOK." },
              { icon: Clapperboard, title: "Managed relay", price: "Uses minute wallet", text: "Virelle handles one or more outputs, recording and the retained compliance copy." },
              { icon: Sparkles, title: "AI-assisted live", price: "Minutes + BYOK", text: "Swappys or another AI transformation is enabled. Provider usage is charged by the provider through the user's key." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-white/10 bg-white/[0.025] text-white">
                  <CardContent className="p-6">
                    <Icon className="mb-4 h-6 w-6 text-amber-400" />
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 text-lg font-black text-amber-300">{item.price}</p>
                    <p className="mt-3 text-sm leading-relaxed text-white/50">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BROADCAST_PACKS.map((pack) => (
              <Card key={pack.id} className={`border-amber-500/20 bg-black/25 text-white ${pack.popular ? "ring-1 ring-amber-400/60" : ""}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{pack.label}</CardTitle>
                    {pack.popular && <Badge className="bg-amber-600">Best value</Badge>}
                  </div>
                  <p className="text-3xl font-black text-amber-300">{formatAUD(pack.price)}</p>
                  <p className="text-sm text-white/55">{pack.minutes.toLocaleString()} managed minutes</p>
                  <p className="text-xs text-white/35">{pack.rate}</p>
                </CardHeader>
                <CardFooter>
                  <Button className="w-full" variant="outline" onClick={() => setLocation(`/virelle-broadcast-render?adult=1&pack=${pack.id}`)}>
                    Buy in Adult Studio <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-white/35">Managed minute balances do not expire. Admin accounts have unrestricted internal access.</p>
        </section>

        <section id="credits" className="mb-20 scroll-mt-20">
          <div className="mb-9 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400/70">One-time top-ups</p>
            <h2 className="mt-2 text-3xl font-bold">Virelle production credits</h2>
            <p className="mt-3 text-sm text-white/50">Credits never expire. BYOK provider charges remain separate and are paid directly to the provider.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.id} className={`border-amber-500/20 bg-black/25 text-white ${pack.popular ? "ring-1 ring-amber-400/60" : ""}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{pack.label}</CardTitle>
                    {pack.popular && <Badge className="bg-amber-600">Best value</Badge>}
                  </div>
                  <p className="text-3xl font-black text-amber-300">{formatAUD(pack.price)}</p>
                  <p className="flex items-center gap-2 text-sm text-white/55"><Coins className="h-4 w-4" /> {pack.credits.toLocaleString()} credits</p>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={loadingTier !== null || loadingPack !== null}
                    onClick={() => purchaseCredits(pack.id)}
                  >
                    {loadingPack === pack.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
                    Purchase
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-9 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-400/70">Production packages</p>
            <h2 className="mt-2 text-3xl font-bold">Per-film package pricing</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {FILM_PACKAGES.map((pack) => (
              <Card key={pack.name} className="border-amber-500/20 bg-black/25 text-white">
                <CardContent className="p-7">
                  <Clapperboard className="mb-4 h-6 w-6 text-amber-400" />
                  <h3 className="text-xl font-bold">{pack.name}</h3>
                  <p className="mt-1 text-sm text-white/45">{pack.duration}</p>
                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-3xl font-black text-amber-300">{formatAUD(pack.launch)}</span>
                    <span className="pb-1 text-sm text-white/30 line-through">{formatAUD(pack.standard)}</span>
                  </div>
                  <p className="mt-2 text-xs text-white/35">Launch package price while available.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-9 text-center">
            <h2 className="text-3xl font-bold">Other current platform prices</h2>
          </div>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {OTHER_PRICING.map((item, index) => (
              <div key={item.name} className={`grid gap-2 p-5 sm:grid-cols-[1.2fr_0.6fr_1.5fr] sm:items-center ${index ? "border-t border-white/10" : ""}`}>
                <p className="font-semibold">{item.name}</p>
                <p className="font-bold text-amber-300">{item.price}</p>
                <p className="text-sm text-white/45">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/[0.05] p-8 text-center sm:p-12">
          <KeyRound className="mx-auto mb-4 h-7 w-7 text-amber-400" />
          <h2 className="mb-4 text-3xl font-bold">The BYOK rule is function-specific.</h2>
          <p className="mx-auto mb-7 max-w-3xl text-sm leading-relaxed text-white/55">
            A provider key is required for video generation, Studio Render and any AI-assisted broadcast transformation. A normal direct broadcast does not generate video and therefore does not require BYOK. Managed relay can operate without AI, using only the member's broadcast-minute balance.
          </p>
          <Button className="bg-amber-500 font-bold text-black hover:bg-amber-400" onClick={() => setLocation("/virelle-broadcast-render")}>Open Broadcast setup <ArrowRight className="ml-2 h-4 w-4" /></Button>
        </section>
      </main>

      <LeegoFooterLaunch />
    </div>
  );
}
