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
 * Designed to be safe in development and production — only HSTS is
 * production-gated.
 */
export function securityHeaders() {
  const isProd = process.env.NODE_ENV === "production";

  // CSP — deliberately permissive on https: for img/media/connect to cover all
  // the asset CDNs already in active use (files.manuscdn.com, *.cloudfront.net,
  // OpenAI/Anthropic/Google AI providers, Sentry ingestion, payment provider
  // domains, etc.) without enumerating each. `'unsafe-inline'` / `'unsafe-eval'`
  // are tolerated for Vite hydration, sonner toast, and JSON-LD blocks until a
  // nonce strategy is in place. script-src is locked down to specific trusted
  // origins rather than `https:` to materially reduce XSS blast radius.
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com https://browser.sentry-cdn.com https://*.ingest.sentry.io",
    "worker-src 'self' blob:",
    // connect-src kept open on https:/wss: so AI providers, Sentry, Stripe, and
    // CDN telemetry all work without per-vendor allowlisting.
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
    next();
  };
}
