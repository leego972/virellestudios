import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  featureKey: string;
  requiredTier: "independent" | "industry" | "creator" | "pro"; // backward compat
}

/**
 * Wraps a page component and shows an upgrade prompt if the user's subscription
 * doesn't include the required feature.
 */
export function SubscriptionGate({ children, feature, featureKey, requiredTier }: SubscriptionGateProps) {
  const { canUseFeature, tier, isLoading } = useSubscription();

  // Map old tier names to new ones for backward compatibility
  const mappedTier = requiredTier === "creator" ? "independent" : requiredTier === "pro" ? "industry" : requiredTier;

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
        <UpgradePrompt feature={feature} requiredTier={mappedTier as "independent" | "industry"} currentTier={tier} />
      </div>
    );
  }

  return <>{children}</>;
}
