declare global {
    interface Window {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    }
  }

  export type AnalyticsEvent =
    | 'sign_up'
    | 'login'
    | 'project_created'
    | 'subscription_started'
    | 'feature_used'
    | 'credits_purchased'
    | 'page_view';

  export function trackEvent(
    name: AnalyticsEvent,
    params?: Record<string, string | number | boolean>
  ): void {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  }

  export function trackPageView(path: string, title?: string): void {
    trackEvent('page_view', {
      page_path: path,
      ...(title ? { page_title: title } : {}),
    });
  }

  export function trackSignUp(method?: string): void {
    trackEvent('sign_up', method ? { method } : undefined);
  }

  export function trackProjectCreated(params?: { genre?: string; mode?: string }): void {
    trackEvent('project_created', params);
  }

  export function trackSubscriptionStarted(tier: string, billingCycle: string): void {
    trackEvent('subscription_started', { tier, billing_cycle: billingCycle });
  }

  export function trackFeatureUsed(featureName: string): void {
    trackEvent('feature_used', { feature_name: featureName });
  }

  export function trackCreditsPurchased(packId: string, credits: number): void {
    trackEvent('credits_purchased', { pack_id: packId, credits });
  }
  