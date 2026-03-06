import { trpc } from "@/lib/trpc";

export type SubscriptionTier = "independent" | "industry";

export function useSubscription() {
  const { data, isLoading, error } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000, // Cache for 30 seconds
  });

  const tier: SubscriptionTier = (data?.tier as SubscriptionTier) || "independent";
  const isAdmin = data?.isAdmin || false;

  // Admin always has full access
  const hasAccess = (requiredTier: SubscriptionTier): boolean => {
    if (isAdmin) return true;
    const tierOrder: Record<SubscriptionTier, number> = { independent: 0, industry: 1 };
    return tierOrder[tier] >= tierOrder[requiredTier];
  };

  const canUseFeature = (feature: string): boolean => {
    if (isAdmin) return true;
    if (!data?.limits) return false;
    const val = (data.limits as any)[feature];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    return true;
  };

  return {
    tier,
    isAdmin,
    isLoading,
    error,
    status: data?.status || "inactive",
    generationsUsed: data?.generationsUsed || 0,
    generationsLimit: data?.generationsLimit || 0,
    limits: data?.limits || null,
    currentPeriodEnd: data?.currentPeriodEnd,
    hasAccess,
    canUseFeature,
    isIndependent: tier === "independent" || tier === "industry" || isAdmin,
    isIndustry: tier === "industry" || isAdmin,
    isSubscribed: true, // All users must have a paid membership
    // Backward compatibility aliases
    isCreator: tier === "independent" || tier === "industry" || isAdmin,
    isPro: tier === "independent" || tier === "industry" || isAdmin,
  };
}
