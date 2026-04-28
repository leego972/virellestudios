/**
   * useUtmTracking — Virelle Growth Engine v1
   *
   * Captures UTM parameters from the current URL and fires a
   * growth.logGrowthEvent mutation on mount. Drop this hook in
   * any public page you want to track.
   *
   * Field names align with VIRELLE_ZERO_BUDGET_GROWTH_ENGINE_V1.md spec.
   *
   * Usage:
   *   useUtmTracking({ segment: "filmmakers", page: "/filmmakers" });
   */

  import { useEffect } from "react";
  import { trpc } from "@/lib/trpc";

  interface UtmTrackingOptions {
    segment?: string;
    page?: string;
    eventType?: string;
    campaignId?: number;
    audienceId?: number;
    assetId?: number;
    metadata?: Record<string, unknown>;
  }

  export function useUtmTracking(options: UtmTrackingOptions = {}) {
    const logEvent = trpc.growth.logGrowthEvent.useMutation();

    useEffect(() => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const source      = params.get("utm_source")   ?? undefined;
      const utmMedium   = params.get("utm_medium")   ?? undefined;
      const utmCampaign = params.get("utm_campaign") ?? undefined;
      const utmContent  = params.get("utm_content")  ?? undefined;
      const utmTerm     = params.get("utm_term")     ?? undefined;

      logEvent.mutate({
        eventType:   options.eventType ?? "page_view",
        segment:     options.segment,
        page:        options.page ?? window.location.pathname,
        referrer:    document.referrer || undefined,
        source,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        campaignId:  options.campaignId,
        audienceId:  options.audienceId,
        assetId:     options.assetId,
        metadata:    options.metadata,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }

  /** Build a UTM-tagged URL for sharing approved assets */
  export function buildUtmLink(path: string, params: {
    source: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://virelle.life";
    const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
    url.searchParams.set("utm_source", params.source);
    if (params.medium)   url.searchParams.set("utm_medium",   params.medium);
    if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
    if (params.content)  url.searchParams.set("utm_content",  params.content);
    return url.toString();
  }
  