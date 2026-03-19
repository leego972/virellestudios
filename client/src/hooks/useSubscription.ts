import { trpc } from "@/lib/trpc";

// All DB tier keys in ascending order of access level
export type SubscriptionTier = "amateur" | "independent" | "creator" | "studio" | "industry";

// Tier order for hasAccess() comparisons (higher = more access)
const TIER_ORDER: Record<string, number> = {
  amateur:     0,  // Creator
  independent: 1,  // Studio
  creator:     1,  // Studio (alias — same limits as independent)
  studio:      2,  // Production
  industry:    3,  // Enterprise
  beta:        3,  // Beta (full access, same as Enterprise)
};

export function useSubscription() {
  const { data, isLoading, error } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000, // Cache for 30 seconds
  });

  const tier = (data?.tier as SubscriptionTier) || "amateur";
  const isAdmin = data?.isAdmin || false;

  /**
   * Returns true if the user's current tier meets or exceeds the required tier.
   * Admins always have full access.
   */
  const hasAccess = (requiredTier: SubscriptionTier): boolean => {
    if (isAdmin) return true;
    return (TIER_ORDER[tier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
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

    // Convenience booleans — using DB keys
    isCreator:    hasAccess("amateur"),     // Creator and above
    isStudio:     hasAccess("independent"), // Studio and above
    isProduction: hasAccess("studio"),      // Production and above
    isEnterprise: hasAccess("industry"),    // Enterprise only

    // Backward-compatibility aliases (old names)
    isIndependent: hasAccess("independent"),
    isIndustry:    hasAccess("industry"),
    isSubscribed:  true, // All users must have a paid membership
    isPro:         hasAccess("independent"),
  };
}
