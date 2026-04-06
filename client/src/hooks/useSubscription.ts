import { trpc } from "@/lib/trpc";

// All DB tier keys in ascending order of access level
export type SubscriptionTier = "none" | "indie" | "amateur" | "independent" | "creator" | "studio" | "industry";

// Tier order for hasAccess() comparisons (higher = more access)
const TIER_ORDER: Record<string, number> = {
  none:        -1, // No active subscription — must subscribe to use any feature
  indie:        0, // Indie — entry tier (A$149/mo)
  amateur:      1, // Creator (A$490/mo)
  independent:  2, // Studio (A$1,490/mo)
  creator:      2, // Studio alias
  studio:       3, // Production
  industry:     4, // Enterprise
  beta:         4, // Beta (full access)
};

export function useSubscription() {
  const { data, isLoading, error } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000, // Cache for 30 seconds
  });

  // Default to "none" (no access) until server confirms a paid tier
  const tier = (data?.tier as SubscriptionTier) || "none";
  const isAdmin = data?.isAdmin || false;

  /**
   * Returns true if the user's current tier meets or exceeds the required tier.
   * Admins always have full access.
   */
  const hasAccess = (requiredTier: SubscriptionTier): boolean => {
    if (isAdmin) return true;
    return (TIER_ORDER[tier] ?? -1) >= (TIER_ORDER[requiredTier] ?? 0);
  };

  /**
   * Returns true if the user's limits object has the given feature enabled.
   * Uses the server-returned limits so it stays in sync with subscription.ts.
   */
  const canUseFeature = (feature: string): boolean => {
    if (isAdmin) return true;
    if (!data?.limits) return false;
    const val = (data.limits as any)[feature];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    return true;
  };

  const isSubscribed = isAdmin || (tier !== "none" && (data?.status === "active" || data?.status === "trialing"));

  return {
    tier,
    isAdmin,
    isLoading,
    error,
    status: data?.status || "none",
    generationsUsed: data?.generationsUsed || 0,
    generationsLimit: data?.generationsLimit || 0,
    limits: data?.limits || null,
    currentPeriodEnd: data?.currentPeriodEnd,
    hasAccess,
    canUseFeature,

    // Convenience booleans — using DB keys
    isIndie:      hasAccess("indie"),       // Indie and above
    isCreator:    hasAccess("amateur"),     // Creator and above
    isStudio:     hasAccess("independent"), // Studio and above
    isProduction: hasAccess("studio"),      // Production and above
    isEnterprise: hasAccess("industry"),    // Enterprise only

    // Backward-compatibility aliases
    isIndependent: hasAccess("independent"),
    isIndustry:    hasAccess("industry"),
    isSubscribed,  // True only if actively subscribed or admin
    isPro:         hasAccess("independent"),
  };
}
