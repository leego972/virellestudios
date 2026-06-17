import { useState } from "react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Zap, CreditCard, ExternalLink, AlertTriangle, Shield } from "lucide-react";
  import { trpc } from "@/lib/trpc";
  import { toast } from "sonner";

  const TOP_UP_PACKS = [
    { id: "topup_10",   name: "Starter",     credits: 200,   price: "A$19",  popular: false },
    { id: "topup_50",   name: "Producer",    credits: 600,   price: "A$49",  popular: false },
    { id: "topup_100",  name: "Director",    credits: 1400,  price: "A$99",  popular: false },
    { id: "topup_200",  name: "Filmmaker",   credits: 3500,  price: "A$199", popular: true  },
    { id: "topup_500",  name: "Blockbuster", credits: 9000,  price: "A$399", popular: false },
    { id: "topup_1000", name: "Mogul",       credits: 22000, price: "A$799", popular: false },
  ] as const;

  type PackId = typeof TOP_UP_PACKS[number]["id"];

  interface CreditTopUpPromptProps {
    reason?: "insufficient_credits" | "generation_limit" | "payment_failed" | "subscription_expired";
    compact?: boolean;
    className?: string;
  }

  const REASON_COPY: Record<NonNullable<CreditTopUpPromptProps["reason"]>, { headline: string; body: string }> = {
    insufficient_credits: {
      headline: "Credits depleted",
      body: "You've used all your generation credits. Top up to continue creating.",
    },
    generation_limit: {
      headline: "Generation limit reached",
      body: "You've hit your plan's generation limit. Top up credits to keep going.",
    },
    payment_failed: {
      headline: "Payment issue — credits paused",
      body: "Your last payment failed. Top up credits directly to restore full access.",
    },
    subscription_expired: {
      headline: "Subscription ended",
      body: "Your subscription has lapsed. Purchase a credit pack to keep producing.",
    },
  };

  export function CreditTopUpPrompt({
    reason = "insufficient_credits",
    compact = false,
    className = "",
  }: CreditTopUpPromptProps) {
    const [buying, setBuying] = useState<string | null>(null);

    const buyTopUp = trpc.system.createTopUpCheckout.useMutation({
      onSuccess: (data) => {
        if (data?.url) window.location.href = data.url;
        else toast.error("Could not start checkout — please try again.");
        setBuying(null);
      },
      onError: (err) => {
        toast.error(err.message || "Checkout failed. Please try again.");
        setBuying(null);
      },
    });

    function handleBuy(packId: PackId) {
      setBuying(packId);
      buyTopUp.mutate({ packId });
    }

    const { headline, body } = REASON_COPY[reason];

    // ── Compact inline variant ─────────────────────────────────────────────────
    if (compact) {
      return (
        <div className={`flex flex-col gap-3 ${className}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">{headline}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOP_UP_PACKS.slice(0, 4).map((pack) => (
              <button
                key={pack.id}
                disabled={!!buying}
                onClick={() => handleBuy(pack.id)}
                className={`relative flex flex-col items-center px-3 py-2 rounded border text-xs transition-all
                  ${pack.popular
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:border-amber-500/40 hover:text-amber-200"}
                  ${buying === pack.id ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-amber-500 text-black px-1.5 rounded-full font-bold">
                    BEST VALUE
                  </span>
                )}
                <span className="font-semibold">{pack.credits.toLocaleString()} cr</span>
                <span className="text-[10px]">{pack.price}</span>
              </button>
            ))}
          </div>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            Secure checkout via Stripe — credits never expire
          </p>
        </div>
      );
    }

    // ── Full card variant ──────────────────────────────────────────────────────
    return (
      <Card
        className={`border border-amber-500/20 bg-gradient-to-b from-[#0d0b1a] to-[#0a0914] ${className}`}
        style={{ boxShadow: "0 0 40px rgba(212,175,55,0.05)" }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="gradient-text-gold">Top Up Credits</span>
          </CardTitle>
          <div className="flex items-start gap-2 mt-1">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-200">{headline}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TOP_UP_PACKS.map((pack) => (
              <button
                key={pack.id}
                disabled={!!buying}
                onClick={() => handleBuy(pack.id)}
                className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded border transition-all text-center
                  ${pack.popular
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-amber-500/30"}
                  ${buying === pack.id ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] bg-amber-500 text-black px-2 rounded-full font-bold whitespace-nowrap">
                    BEST VALUE
                  </span>
                )}
                <span className="text-xs font-semibold text-amber-300">{pack.name}</span>
                <span className="text-lg font-bold text-white leading-none">
                  {pack.credits.toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground">credits</span>
                <span className="text-sm font-semibold text-amber-400 mt-1">{pack.price}</span>
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full border-amber-500/20 hover:border-amber-500/40 text-muted-foreground text-xs gap-2"
            onClick={() => window.open("https://virelle.life/pricing", "_blank")}
          >
            <CreditCard className="h-3 w-3" />
            View full plan options
            <ExternalLink className="h-3 w-3 ml-auto" />
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Shield className="h-3 w-3" />
            Secure checkout via Stripe · Credits never expire · Applied instantly
          </p>
        </CardContent>
      </Card>
    );
  }
  