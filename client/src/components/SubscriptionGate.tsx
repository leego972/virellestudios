import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  featureKey: string;
  // Accepts all DB tier keys plus backward-compat aliases
  requiredTier: "indie" | "amateur" | "independent" | "studio" | "industry" | "creator" | "pro";
}

/**
 * Wraps a page component and shows an upgrade prompt if the user's subscription
 * doesn't include the required feature.
 */
export function SubscriptionGate({ children, feature, featureKey, requiredTier }: SubscriptionGateProps) {
  const { canUseFeature, tier, isLoading } = useSubscription();

  // Normalise backward-compat aliases to canonical DB keys.
  // creator, studio, pro all resolve to independent (Industry).
  const mappedTier = (requiredTier === "creator" || requiredTier === "studio" || requiredTier === "pro")
    ? "independent"
    : requiredTier;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canUseFeature(featureKey)) {
    return (
      <div className="p-4 sm:p-6">
        <UpgradePrompt feature={feature} requiredTier={mappedTier as "indie" | "amateur" | "independent" | "studio" | "industry"} currentTier={tier} />
      </div>
    );
  }

  return <>{children}</>;
}
