// Virelle Studios — Analytics wrapper
  // Thin layer over GA4 (gtag). Replace G-XXXXXXXXXX in index.html with your
  // real GA4 Measurement ID to activate. All calls are no-ops until gtag loads.

  declare function gtag(...args: unknown[]): void;

  function safeGtag(...args: unknown[]) {
    if (typeof gtag === "function") (gtag as (...a: unknown[]) => void)(...args);
  }

  /** Track a page view (called automatically on route change). */
  export function trackPageView(path: string, title?: string) {
    safeGtag("event", "page_view", {
      page_path: path,
      page_title: title ?? document.title,
      page_location: window.location.href,
    });
  }

  /** Track a named event with optional metadata. */
  export function trackEvent(
    name: string,
    params?: Record<string, string | number | boolean>
  ) {
    safeGtag("event", name, params ?? {});
  }

  // ── Convenience helpers — fire these at key conversion moments ────────────

  export const analytics = {
    /** User completed registration */
    signUp: (method: "email" | "google" = "email") =>
      trackEvent("sign_up", { method }),

    /** User started a new project */
    projectCreated: (genre?: string) =>
      trackEvent("project_created", genre ? { genre } : {}),

    /** User clicked a subscription upgrade CTA */
    upgradeStarted: (tier: string, interval: "monthly" | "annual") =>
      trackEvent("upgrade_started", { tier, interval }),

    /** User completed a subscription purchase */
    subscriptionStarted: (tier: string, value: number) =>
      trackEvent("purchase", { currency: "AUD", value, item_name: tier }),

    /** User ran an AI generation */
    featureUsed: (feature: string, creditCost: number) =>
      trackEvent("feature_used", { feature, credit_cost: creditCost }),

    /** User ran out of credits */
    creditsExhausted: () => trackEvent("credits_exhausted"),

    /** User clicked "Buy Credits" */
    creditsPurchaseStarted: (pack: string) =>
      trackEvent("credits_purchase_started", { pack }),
  };
  