import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature: string;
  /** Optional limits-object key. When omitted, requiredTier is enforced directly. */
  featureKey?: string;
  requiredTier: "indie" | "amateur" | "independent" | "studio" | "industry" | "creator" | "pro";
}

/**
 * Wraps a page component and shows an upgrade prompt when the user's
 * subscription does not meet the feature or tier requirement.
 */
export function SubscriptionGate({ children, feature, featureKey, requiredTier }: SubscriptionGateProps) {
  const { canUseFeature, hasAccess, tier, isLoading } = useSubscription();

  // Normalise backward-compatible public aliases to canonical DB keys.
  const mappedTier = (requiredTier === "creator" || requiredTier === "studio" || requiredTier === "pro")
    ? "independent"
    : requiredTier;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const allowed = featureKey
    ? canUseFeature(featureKey)
    : hasAccess(mappedTier as "indie" | "amateur" | "independent" | "industry");

  if (!allowed) {
    return (
      <div className="p-4 sm:p-6">
        <UpgradePrompt
          feature={feature}
          requiredTier={mappedTier as "indie" | "amateur" | "independent" | "studio" | "industry"}
          currentTier={tier}
        />
      </div>
    );
  }

  return <>{children}</>;
}
