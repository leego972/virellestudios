/**
   * useUtmTracking — Virelle Growth Engine
   *
   * Captures UTM parameters from the current URL and fires a
   * growth.logGrowthEvent mutation on mount. Drop this hook in
   * any public page that you want to track.
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
    assetId?: number;
    metadata?: Record<string, unknown>;
  }

  export function useUtmTracking(options: UtmTrackingOptions = {}) {
    const logEvent = trpc.growth.logGrowthEvent.useMutation();

    useEffect(() => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const utmSource   = params.get("utm_source")   ?? undefined;
      const utmMedium   = params.get("utm_medium")   ?? undefined;
      const utmCampaign = params.get("utm_campaign") ?? undefined;
      const utmContent  = params.get("utm_content")  ?? undefined;
      const utmTerm     = params.get("utm_term")     ?? undefined;

      // Only fire if there's meaningful tracking data or the page is specified
      logEvent.mutate({
        eventType:   options.eventType ?? "page_view",
        segment:     options.segment,
        page:        options.page ?? window.location.pathname,
        referrer:    document.referrer || undefined,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        campaignId:  options.campaignId,
        assetId:     options.assetId,
        metadata:    options.metadata,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }

  /** Helper to build a UTM-tagged URL for sharing */
  export function buildUtmLink(path: string, params: {
    source: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }) {
    const base = typeof window !== "undefined" ? window.location.origin : "https://virellestudios.com";
    const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
    url.searchParams.set("utm_source", params.source);
    if (params.medium)   url.searchParams.set("utm_medium",   params.medium);
    if (params.campaign) url.searchParams.set("utm_campaign", params.campaign);
    if (params.content)  url.searchParams.set("utm_content",  params.content);
    return url.toString();
  }
  