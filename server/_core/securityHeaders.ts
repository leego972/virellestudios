import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight security headers middleware (no helmet dependency).
 *
 * Sets the headers a security review / external pen-test would expect:
 *   - Content-Security-Policy (locked down, but allows Stripe + Google Fonts +
 *     known asset CDNs the app already uses)
 *   - Strict-Transport-Security (HTTPS-only, 1 year, includeSubDomains)
 *   - X-Content-Type-Options: nosniff
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - X-Frame-Options: SAMEORIGIN  (clickjacking)
 *   - Permissions-Policy: deny dangerous defaults, allow camera/mic for media
 *   - Cross-Origin-Resource-Policy: cross-origin (for shared assets)
 *
 * Also exposes a lightweight public mobile feature manifest for Swappys Mobile.
 * This is intentionally placed here because securityHeaders() is loaded early by
 * the existing Express bootstrap, avoiding a fragile rewrite of the large server
 * entry file while still serving /api/mobile/features before the SPA fallback.
 */
export function securityHeaders() {
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://browser.sentry-cdn.com https://*.ingest.sentry.io",
    "worker-src 'self' blob:",
    "connect-src 'self' https: wss: blob:",
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), payment=(self \"https://js.stripe.com\"), usb=(), interest-cohort=(), camera=(self), microphone=(self), fullscreen=(self)"
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (isProd) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    if (req.path === "/api/mobile/features") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }

      if (req.method === "GET") {
        res.json({
          ok: true,
          product: "Virelle Studios",
          service: "virelle-studios-mobile-manifest",
          version: "2026.07.swappys-byok-broadcast-v1",
          generatedAt: new Date().toISOString(),
          links: {
            baseUrl: "https://virelle.life",
            signup: "https://virelle.life/register?source=swappys-mobile&product=swappys&intent=creator-upgrade",
            login: "https://virelle.life/login?source=swappys-mobile",
            pricing: "https://virelle.life/pricing?source=swappys-mobile",
            privacy: "https://virelle.life/privacy",
            terms: "https://virelle.life/terms",
            acceptableUse: "https://virelle.life/acceptable-use",
            apiKeys: "https://virelle.life/settings?tab=api-keys&source=swappys-mobile",
          },
          upgrade: {
            name: "Virelle Studios Creator",
            publicLabel: "Full Virelle Studios Creator Access",
            description: "Professional video transforms, BYOK broadcast sessions, studio rendering, project workflows, credit-based orchestration and advanced watermark controls.",
            recommendedPlan: "creator",
            sourceProduct: "swappys-mobile",
          },
          costPolicy: {
            byokRequiredForPremiumVideo: true,
            membershipPaysFor: "access, orchestration, project tools, audit/provenance, workflow management",
            userProviderPaysFor: "video generation, transformation, provider rendering and broadcast transform compute",
            noPlatformFundedUserVideo: true,
          },
          features: {
            creatorUpgrade: true,
            swappysStudio: true,
            digitalDouble: true,
            genderTransform: true,
            ageTransform: true,
            childhoodSelf: true,
            multiImageReference: true,
            sourceVideoUpload: true,
            referenceVideoUpload: true,
            studioRenderQueue: true,
            broadcastMode: true,
            rtmpBroadcast: true,
            webRtcBroadcast: true,
            obsBridge: true,
            byokVideoRequired: true,
            credits: true,
            watermarkControls: true,
            auditProvenance: true,
            mobileEntryWatermarkRequired: true,
          },
          byokProviders: ["runway", "openai", "replicate", "fal", "luma", "huggingface", "seedance", "veo3"],
          transformGoals: [
            "appearance_reference",
            "boy_to_girl",
            "girl_to_boy",
            "younger_self",
            "older_self",
            "adult_to_child",
            "child_to_adult",
            "custom_prompt",
          ],
          limits: {
            swappysMobile: {
              visibleAiMarkRequired: true,
              intendedUse: "preview_record_share",
            },
            virelleCreator: {
              visibleWatermarkControl: true,
              intendedUse: "byok_broadcast_and_professional_studio_render",
            },
          },
        });
        return;
      }

      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    next();
  };
}
