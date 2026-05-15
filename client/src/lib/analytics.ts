declare global {
    interface Window {
      gtag?: (...args: unknown[]) => void;
      dataLayer?: unknown[];
    }
  }

  // Full event catalogue — extend freely
  export type AnalyticsEvent =
    | 'sign_up' | 'login' | 'logout'
    | 'project_created' | 'project_opened'
    | 'subscription_started' | 'subscription_cancelled'
    | 'feature_used' | 'credits_purchased' | 'credits_exhausted'
    | 'page_view'
    | 'scene_generated' | 'scene_generation_failed'
    | 'bulk_generation_started'
    | 'export_completed' | 'trailer_generated'
    | 'showcase_viewed' | 'talent_unlocked' | 'talent_browsed'
    | 'funding_searched' | 'screenplay_generated' | 'storyboard_generated'
    | 'search' | 'share' | 'error' | 'conversion' | 'timing_complete';

  type Params = Record<string, string | number | boolean>;

  function g() {
    return typeof window !== 'undefined' && typeof window.gtag === 'function'
      ? window.gtag
      : undefined;
  }

  // ─── Core ─────────────────────────────────────────────────────────────────────

  export function trackEvent(name: AnalyticsEvent | string, params?: Params): void {
    g()?.('event', name, params);
  }

  export function trackPageView(path: string, title?: string): void {
    trackEvent('page_view', {
      page_path: path,
      page_location: typeof window !== 'undefined' ? window.location.href : path,
      ...(title ? { page_title: title } : {}),
    });
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────────

  export function trackSignUp(method?: string): void {
    trackEvent('sign_up', method ? { method } : undefined);
  }

  export function trackLogin(method?: string): void {
    trackEvent('login', method ? { method } : undefined);
  }

  // ─── Projects ─────────────────────────────────────────────────────────────────

  export function trackProjectCreated(params?: { genre?: string; mode?: string }): void {
    trackEvent('project_created', params as Params | undefined);
  }

  export function trackProjectOpened(projectId: number): void {
    trackEvent('project_opened', { project_id: projectId });
  }

  // ─── Subscription & Billing ───────────────────────────────────────────────────

  export function trackSubscriptionStarted(tier: string, billingCycle: string): void {
    trackEvent('subscription_started', { tier, billing_cycle: billingCycle });
  }

  export function trackFeatureUsed(featureName: string, params?: Params): void {
    trackEvent('feature_used', { feature_name: featureName, ...params });
  }

  export function trackCreditsPurchased(packId: string, credits: number, value?: number): void {
    trackEvent('credits_purchased', {
      pack_id: packId,
      credits,
      ...(value ? { value, currency: 'AUD' } : {}),
    });
  }

  // ─── Generation ───────────────────────────────────────────────────────────────

  export function trackSceneGenerated(params: {
    provider?: string;
    duration?: number;
    sceneId?: number;
    partial?: boolean;
  }): void {
    trackEvent('scene_generated', params as Params);
  }

  export function trackSceneGenerationFailed(reason: string, provider?: string): void {
    trackEvent('scene_generation_failed', { reason, ...(provider ? { provider } : {}) });
  }

  export function trackExportCompleted(params: {
    format?: string;
    projectId?: number;
    duration?: number;
  }): void {
    trackEvent('export_completed', params as Params);
  }

  export function trackTrailerGenerated(params?: { projectId?: number; duration?: number }): void {
    trackEvent('trailer_generated', (params ?? {}) as Params);
  }

  export function trackScreenplayGenerated(projectId: number, sceneCount?: number): void {
    trackEvent('screenplay_generated', { project_id: projectId, ...(sceneCount ? { scene_count: sceneCount } : {}) });
  }

  // ─── Talent ───────────────────────────────────────────────────────────────────

  export function trackTalentUnlocked(
    actorId: string,
    tier: string,
    licenseType: string,
    value: number
  ): void {
    trackEvent('talent_unlocked', { actor_id: actorId, tier, license_type: licenseType, value, currency: 'AUD' });
  }

  export function trackTalentBrowsed(): void {
    trackEvent('talent_browsed');
  }

  // ─── Discovery ────────────────────────────────────────────────────────────────

  export function trackShowcaseViewed(projectTitle?: string): void {
    trackEvent('showcase_viewed', projectTitle ? { project_title: projectTitle } : undefined);
  }

  export function trackFundingSearched(country?: string): void {
    trackEvent('funding_searched', country ? { country } : undefined);
  }

  // ─── Conversion & Timing ─────────────────────────────────────────────────────

  export function trackConversion(conversionType: string, value?: number): void {
    trackEvent('conversion', {
      conversion_type: conversionType,
      ...(value ? { value, currency: 'AUD' } : {}),
    });
  }

  export function trackTiming(
    category: string,
    variable: string,
    timeMs: number,
    label?: string
  ): void {
    trackEvent('timing_complete', {
      event_category: category,
      name: variable,
      value: Math.round(timeMs),
      ...(label ? { event_label: label } : {}),
    });
  }

  // ─── User properties ─────────────────────────────────────────────────────────

  export function setUserProperties(props: {
    user_id?: string;
    subscription_tier?: string;
    credits_balance?: number;
    is_byok?: boolean;
  }): void {
    const fn = g();
    if (!fn) return;
    fn('set', 'user_properties', props);
    if (props.user_id) fn('config', 'G-XXXXXXXXXX', { user_id: props.user_id });
  }

  // ─── Error tracking ───────────────────────────────────────────────────────────

  export function trackError(error: string, context?: string): void {
    trackEvent('error', {
      error_message: error.slice(0, 200),
      ...(context ? { context } : {}),
    });
  }
  