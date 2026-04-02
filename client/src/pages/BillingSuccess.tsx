import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

const TIER_NAMES: Record<string, string> = {
  amateur: "Indie Filmmaker",
  independent: "Independent Creator",
  creator: "Creator",
  studio: "Studio",
  industry: "Industry",
};

const PACK_NAMES: Record<string, string> = {
  topup_10: "Starter Pack",
  topup_50: "Producer Pack",
  topup_100: "Director Pack",
  topup_200: "Studio Pack",
  topup_500: "Blockbuster Pack",
  topup_1000: "Mogul Pack",
};

export default function BillingSuccess() {
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(8);

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const tier = params.get("tier");
  const type = params.get("type");
  const pack = params.get("pack");

  const isTopUp = type === "topup";
  const tierName = tier ? (TIER_NAMES[tier] || tier) : null;
  const packName = pack ? (PACK_NAMES[pack] || pack) : null;

  // Refetch user to pick up new subscription/credits
  const utils = trpc.useUtils();
  useEffect(() => {
    // Invalidate user and subscription queries so the UI reflects the new state
    utils.auth.me.invalidate();
    utils.subscription.status.invalidate();
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      setLocation("/");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="relative inline-flex">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-amber-400" />
          </div>
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <Badge variant="outline" className="border-amber-500/50 text-amber-400 px-4 py-1">
            Payment Confirmed
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {isTopUp ? "Credits Added!" : "Welcome to Virelle Studios!"}
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            {isTopUp && packName
              ? `Your ${packName} has been added to your account. Start generating immediately.`
              : tierName
              ? `Your ${tierName} membership is now active. Time to make your film.`
              : "Your payment was successful. Your account has been updated."}
          </p>
        </div>

        {/* What's next */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-left space-y-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">What's next</h2>
          {isTopUp ? (
            <ul className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                Credits are live in your account — no delay
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                Use them for video generation, voice acting, film score, and more
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                Credits never expire — use them at your own pace
              </li>
            </ul>
          ) : (
            <ul className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                Your monthly credits are ready to use right now
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                All features for your plan are unlocked immediately
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                A receipt has been sent to your email address
              </li>
            </ul>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-8"
            onClick={() => setLocation("/")}
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
            onClick={() => setLocation("/pricing")}
          >
            View Pricing
          </Button>
        </div>

        {/* Auto-redirect notice */}
        <p className="text-xs text-zinc-600">
          Redirecting to your dashboard in{" "}
          <span className="text-zinc-400 font-medium">{countdown}s</span>
          {" "}—{" "}
          <button
            className="text-amber-500 hover:text-amber-400 underline"
            onClick={() => setCountdown(0)}
          >
            go now
          </button>
        </p>
      </div>
    </div>
  );
}
