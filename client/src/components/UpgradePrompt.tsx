import { Button } from "@/components/ui/button";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock, Zap, Film } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature: string;
  requiredTier: "independent" | "industry" | "creator" | "pro"; // backward compat
  currentTier?: string;
  compact?: boolean;
}

const tierPricing: Record<string, string> = {
  independent: "$5,000/year",
  industry: "$25,000/year",
  creator: "$5,000/year",
  pro: "$25,000/year",
};

const tierLabels: Record<string, string> = {
  independent: "Independent",
  industry: "Industry",
  creator: "Independent",
  pro: "Industry",
};

export function UpgradePrompt({ feature, requiredTier, currentTier = "independent", compact = false }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  // Map old tier names
  const mappedTier = requiredTier === "creator" ? "independent" : requiredTier === "pro" ? "industry" : requiredTier;
  const mappedCurrent = currentTier === "creator" ? "independent" : currentTier === "pro" ? "industry" : currentTier;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-sm text-amber-400">
          {feature} requires <strong>{tierLabels[mappedTier]}</strong> membership
        </span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          onClick={() => setLocation("/pricing")}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  const iconMap: Record<string, React.ReactNode> = {
    independent: <Film className="w-8 h-8 text-amber-500" />,
    industry: <Zap className="w-8 h-8 text-violet-500" />,
  };

  const buttonColorMap: Record<string, string> = {
    independent: "bg-amber-600 hover:bg-amber-500",
    industry: "bg-violet-600 hover:bg-violet-500",
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-6">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
          {iconMap[mappedTier] || <Crown className="w-8 h-8 text-amber-500" />}
        </div>
        <h3 className="text-xl font-bold mb-2">{feature}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          This feature is available on the{" "}
          <strong className="text-foreground">{tierLabels[mappedTier]}</strong> membership
          {" "}({tierPricing[mappedTier]}).
          Upgrade to unlock {feature.toLowerCase()} and take your filmmaking to the next level.
        </p>
        <Button
          size="lg"
          className={`${buttonColorMap[mappedTier] || "bg-amber-600 hover:bg-amber-500"} text-white`}
          onClick={() => setLocation("/pricing")}
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade to {tierLabels[mappedTier]}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          You're currently on the <span className="capitalize">{mappedCurrent}</span> membership
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Hook-style component that wraps children and shows upgrade prompt if feature is locked.
 */
interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  requiredTier: "independent" | "industry" | "creator" | "pro"; // backward compat
  currentTier?: string;
  hasAccess: boolean;
}

export function FeatureGate({ children, feature, requiredTier, currentTier, hasAccess }: FeatureGateProps) {
  if (hasAccess) return <>{children}</>;
  return <UpgradePrompt feature={feature} requiredTier={requiredTier} currentTier={currentTier} />;
}

/**
 * Small inline badge showing membership tier.
 */
export function IndependentBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
      <Film className="w-2.5 h-2.5" /> INDEPENDENT
    </span>
  );
}

// Backward compat aliases
export function CreatorBadge() {
  return <IndependentBadge />;
}

export function ProBadge() {
  return <IndustryBadge />;
}

export function IndustryBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-500 border border-violet-500/20">
      <Zap className="w-2.5 h-2.5" /> INDUSTRY
    </span>
  );
}
