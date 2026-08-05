import { trpc } from "@/lib/trpc";

// All DB tier keys in ascending order of access level.
// Three public tiers: Indie (indie), Creator (amateur), Industry (independent/creator/studio).
// "industry" DB key = custom/sales-led enterprise, same display name "Industry".
export type SubscriptionTier = "none" | "indie" | "amateur" | "independent" | "creator" | "studio" | "industry" | "beta";

// Tier order for hasAccess() comparisons (higher = more access)
const TIER_ORDER: Record<string, number> = {
  none:        -1, // No active subscription — must subscribe to use any feature
  indie:        0, // Indie (A$149/mo)
  amateur:      1, // Creator (A$490/mo)
  independent:  2, // Industry (A$1,490/mo)
  creator:      2, // Industry alias
  studio:       2, // Industry alias
  industry:     3, // Industry — custom/sales-led
  beta:         3, // Beta (full access)
};

export function useSubscription() {
  const { data, isLoading: subscriptionLoading, error } = trpc.subscription.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000, // Cache for 30 seconds
  });
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  // Resolve admin authority from both authenticated identity and subscription
  // status. This prevents a stale or incomplete subscription payload from
  // displaying paid-feature locks to an administrator.
  const isAdmin = data?.isAdmin === true || me.data?.role === "admin";
  const tier = isAdmin
    ? "industry"
    : ((data?.tier as SubscriptionTier) || "none");
  const isLoading = subscriptionLoading || me.isLoading;

  /**
   * Returns true if the user's current tier meets or exceeds the required tier.
   * Administrators always have full access.
   */
  const hasAccess = (requiredTier: SubscriptionTier): boolean => {
    if (isAdmin) return true;
    return (TIER_ORDER[tier] ?? -1) >= (TIER_ORDER[requiredTier] ?? 0);
  };

  /**
   * Returns true if the user's limits object has the given feature enabled.
   * Administrators bypass every commercial feature limit.
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
    status: isAdmin ? "active" : (data?.status || "none"),
    generationsUsed: isAdmin ? 0 : (data?.generationsUsed || 0),
    generationsLimit: isAdmin ? Number.MAX_SAFE_INTEGER : (data?.generationsLimit || 0),
    limits: isAdmin ? { ...(data?.limits || {}), adminUnlimited: true } : (data?.limits || null),
    currentPeriodEnd: data?.currentPeriodEnd,
    hasAccess,
    canUseFeature,

    // Convenience booleans — using canonical DB keys
    isIndie:    hasAccess("indie"),       // Indie and above
    isCreator:  hasAccess("amateur"),     // Creator and above
    isIndustry: hasAccess("independent"), // Industry and above (all three self-serve tiers)

    // Backward-compatibility aliases (kept for any existing callers)
    isStudio:      hasAccess("independent"), // was "Studio" — now Industry
    isProduction:  hasAccess("independent"), // was "Production" — now Industry
    isEnterprise:  hasAccess("industry"),    // custom/sales-led Industry
    isIndependent: hasAccess("independent"),
    isSubscribed,
    isPro: hasAccess("independent"),
  };
}
