import "./sentry.js";
import "dotenv/config";
import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext, requireAdminExpress } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "./logger";
import { stripe, priceIdToTier, TIER_LIMITS } from "./subscription";
import { sql } from "drizzle-orm";
import { ENV } from "./env";
import { validateProductionEnv } from "./envValidation";
import * as db from "../db";
import { trackPaymentFailure } from "./securityEngine";
import { startBlogScheduler } from "./blogEngine";
import { startAutonomousPipelineScheduler } from "../autonomous-pipeline";
import { startAdScheduler } from "./advertisingEngine";
import { startVideoJobWorker } from "./videoJobWorker";
import { runAutoMigration } from "./autoMigrate";
import { invokeLLMStream, invokeLLM } from "./llm";
import { DIRECTOR_TOOLS, getDirectorToolDescription, buildDirectorSystemPrompt } from "../director-tools";
import { executeDirectorTool } from "../director-executor";
import { runStripeProvisioning } from "./stripeProvisioning";
import { registerSeoRoutes } from "../seo-engine";
import { registerSeoV4Routes } from "../seo-engine-v4";

// Validate production environment on startup
validateProductionEnv();

const startedAt = new Date();

// Rate limiting is now handled via centralized Redis-backed rateLimit.ts
import { rateLimitHeavyAI, rateLimitUpload, rateLimitAI } from "./rateLimit";
import type { Request, Response, NextFunction } from "express";

/**
 * Lightweight Express middleware for IP-based rate limiting on public endpoints
 * (auth, register, password reset). These are unauthenticated routes so the
 * Redis-backed per-user limiter in rateLimit.ts does not apply.
 * Uses an in-memory store per-process — acceptable for public auth endpoints
 * since multi-instance deployments tolerate slightly higher limits on these
 * low-risk paths. Authenticated AI endpoints use the Redis-backed limiter.
 */
function rateLimit(windowMs: number, max: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  // Prune expired entries every 10 minutes to avoid unbounded growth
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(ip);
    }
  }, 10 * 60 * 1000).unref();
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Auto-migrate database schema on startup — adds missing columns and tables
  try {
    await runAutoMigration();
  } catch (err: any) {
    console.error("[AutoMigrate] Migration failed:", err.message);
    // Continue starting — the server may still work with existing schema
  }

  // v6.82: Admin authority is database-role only. Server startup performs NO
  // promotion. Admin role changes go through admin.updateUserRole or a
  // deliberate direct database recovery action. See SECURITY.md §8.

  // Auto-provision Stripe products and prices on startup
  try {
    await runStripeProvisioning();
  } catch (err: any) {
    console.error("[StripeProvisioning] Failed:", err.message);
    // Continue starting — existing price IDs from ENV will still work
  }

  const app = express();
  const server = createServer(app);

  // Film generation can take 30-90 minutes — disable Node.js HTTP server timeouts
  // so long-running tRPC mutations are never dropped mid-generation.
  server.timeout = 0;          // disable socket inactivity timeout
  server.keepAliveTimeout = 0; // disable keep-alive timeout
  server.headersTimeout = 0;   // disable headers timeout

  // Hardened security headers (CSP, HSTS, frame-options, permissions-policy)
  // applied to every response before route handlers run.
  const { securityHeaders } = await import("./securityHeaders");
  app.use(securityHeaders());

  // Stripe webhook endpoint — MUST be before json body parser
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!stripe) {
      res.status(500).json({ error: "Stripe not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      if (ENV.stripeWebhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret);
      } else {
        // In development without webhook secret, parse directly
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Helper: resolve userId from metadata or fallback to stripeCustomerId lookup
    async function resolveUserId(metadata: any, customerId?: string): Promise<number> {
      const fromMeta = parseInt(metadata?.userId || "0");
      if (fromMeta) return fromMeta;
      // Fallback: look up user by Stripe customer ID
      if (customerId) {
        const user = await db.getUserByStripeCustomerId(customerId);
        if (user) return user.id;
      }
      return 0;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const customerId = session.customer as string;
          const userId = await resolveUserId(session.metadata, customerId);

          // Check if this is a Signature Cast actor unlock
          if (session.metadata?.type === "signature_cast_unlock" && userId) {
            const { actorId, licenseType, projectId } = session.metadata;
            const amountPaidAud = session.amount_total ?? 0; // in cents
            try {
              const dbConn = await db.getDb();
              if (dbConn) {
                // Idempotent insert — skip if already fulfilled for this session
                const existing = await dbConn.execute(sql`
                  SELECT id FROM signatureCastEntitlements
                  WHERE stripeSessionId = ${session.id} LIMIT 1
                `) as any;
                const rows = Array.isArray(existing) ? existing : existing[0] ?? [];
                if (rows.length === 0) {
                  await dbConn.execute(sql`
                    INSERT INTO signatureCastEntitlements
                      (userId, actorId, licenseType, projectId, isCommercial, isEpisodic,
                       source, stripeSessionId, amountPaidAud, status, startedAt, createdAt, updatedAt)
                    VALUES
                      (${userId}, ${actorId}, ${licenseType}, ${projectId ? parseInt(projectId) : null},
                       ${licenseType === "commercial" ? 1 : 0}, ${licenseType === "episodic" ? 1 : 0},
                       'stripe_webhook', ${session.id}, ${amountPaidAud}, 'active', NOW(), NOW(), NOW())
                  `);
                  await dbConn.execute(sql`
                    INSERT INTO signatureCastEvents
                      (userId, actorId, event, licenseType, projectId, metadata, createdAt)
                    VALUES
                      (${userId}, ${actorId}, 'checkout_completed', ${licenseType},
                       ${projectId ? parseInt(projectId) : null},
                       ${JSON.stringify({ stripeSessionId: session.id, amountPaidAud, source: 'webhook' })}, NOW())
                  `);
                  logger.info(`[SignatureCast] Entitlement granted: user=${userId} actor=${actorId} license=${licenseType} session=${session.id}`);
                } else {
                  logger.info(`[SignatureCast] Duplicate webhook skipped: session=${session.id}`);
                }
              }
            } catch (err: any) {
              logger.error(`[SignatureCast] Webhook fulfillment failed: ${err.message}`);
            }
            break;
          }

          // Check if this is a film production package purchase
          if (session.metadata?.type === "film_production" && userId) {
            const packageId = session.metadata.packageId;
            // Film packages grant massive bonus credits based on package size
            const filmPackageCredits: Record<string, number> = {
              short_film: 200,       // 30-min film: ~100 scenes × 2 credits
              feature_film: 400,     // 60-min film: ~200 scenes × 2 credits
              full_feature: 600,     // 90-min film: ~300 scenes × 2 credits
              premium: 1200,         // 180-min film: ~600 scenes × 2 credits
              vfx_single: 10,        // Single VFX scene
              vfx_pack_5: 50,        // 5 VFX scenes
              vfx_pack_15: 150,      // 15 VFX scenes
              vfx_unlimited: 10000,  // Unlimited VFX for a year
            };
            const credits = filmPackageCredits[packageId] || 100;
            await db.addBonusGenerations(userId, credits);
            // Also add to creditBalance so deductCredits() works
            await db.addCredits(userId, credits, "film_package_purchase", `Film package ${packageId} — ${credits} credits added`);
            logger.info(`Film package ${packageId} (+${credits} credits) applied for user ${userId}`);
            break;
          }

          // Check if this is a generation top-up pack purchase (one-time payment)
          if (session.metadata?.type === "generation_topup" && userId) {
            const packId = session.metadata.packId;
            // Credit amounts MUST match TOP_UP_PACKS in subscription.ts
            const packAmounts: Record<string, number> = {
              topup_10:   100,    // Starter Pack     — 100 credits
              topup_50:   300,    // Producer Pack    — 300 credits
              topup_100:  750,    // Director Pack    — 750 credits
              topup_200:  2000,   // Filmmaker Pack   — 2,000 credits
              topup_500:  5000,   // Blockbuster Pack — 5,000 credits
              topup_1000: 12000,  // Mogul Pack       — 12,000 credits
            };
            const credits = packAmounts[packId] || 0;
            if (credits > 0) {
              await db.addBonusGenerations(userId, credits);
              // Also add to creditBalance so deductCredits() works
              await db.addCredits(userId, credits, "credit_pack_purchase", `Top-up pack ${packId} — ${credits} credits added`);
              logger.info(`Top-up pack ${packId} (+${credits} credits) applied for user ${userId}`);
            } else {
              logger.warn(`Unknown top-up pack ID: ${packId} — no credits granted for user ${userId}`);
            }
            break;
          }

          // Otherwise it's a subscription checkout
          const subscriptionId = session.subscription as string;
          if (userId && subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = sub.items.data[0]?.price?.id || "";
            const tier = priceIdToTier(priceId);
            // Activate subscription and reset generation counter for fresh start
            await db.updateUserSubscription(userId, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionTier: tier as any,
              subscriptionStatus: "active",
              subscriptionCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            });
            // Reset generation counter on new subscription (fresh quota)
            await db.resetGenerationCounter(userId);
            // Grant monthly credits to creditBalance based on tier
            const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
            if (tierLimits?.monthlyCredits) {
              await db.addCredits(userId, tierLimits.monthlyCredits, "subscription_activated", `${tier} subscription activated — ${tierLimits.monthlyCredits} monthly credits granted`);
              logger.info(`Granted ${tierLimits.monthlyCredits} credits to user ${userId} for ${tier} subscription`);
            }
            logger.info(`Subscription activated for user ${userId}: ${tier}`);
            // Send subscription confirmation email to user + studio notification
            try {
              const newSubUser = await db.getUserById(userId);
              if (newSubUser?.email) {
                const { sendSubscriptionConfirmationEmail, sendNewSubscriptionNotification } = await import("../email");
                const planLabel = tier === "indie" ? "Indie" : tier === "amateur" ? "Creator" : tier === "creator" ? "Industry" : tier === "studio" ? "Industry" : tier === "industry" ? "Industry" : tier === "independent" ? "Industry" : String(tier);
                const tierPrice = tier === "indie" ? "A$149/mo" : tier === "amateur" ? "A$490/mo" : tier === "independent" ? "A$1,490/mo" : tier === "creator" ? "A$1,490/mo" : tier === "studio" ? "A$1,490/mo" : tier === "industry" ? "A$1,490/mo" : "";
                sendSubscriptionConfirmationEmail(newSubUser.email, newSubUser.name || "Filmmaker", planLabel).catch(() => {});
                sendNewSubscriptionNotification(newSubUser.email, newSubUser.name || "Unknown", planLabel, tierPrice).catch(() => {});
              }
            } catch (_emailErr) { /* non-critical */ }
          }
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const customerId = sub.customer as string;
          const userId = await resolveUserId(sub.metadata, customerId);
          if (userId) {
            const priceId = sub.items.data[0]?.price?.id || "";
            const tier = priceIdToTier(priceId);
            const status = sub.status === "active" ? "active" 
              : sub.status === "past_due" ? "past_due"
              : sub.status === "canceled" ? "canceled"
              : sub.status === "trialing" ? "trialing"
              : sub.status === "unpaid" ? "unpaid" : "none";
            // Check if this is an upgrade (tier changed to higher)
            const existingUser = await db.getUserById(userId);
            const isUpgrade = existingUser && existingUser.subscriptionTier !== tier;
            await db.updateUserSubscription(userId, {
              subscriptionTier: (status === "active" || status === "trialing" ? tier : "independent") as any,
              subscriptionStatus: status,
              subscriptionCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
            // Reset generation counter on tier upgrade (fresh quota for new plan)
            if (isUpgrade && (status === "active" || status === "trialing")) {
              await db.resetGenerationCounter(userId);
            }
            logger.info(`Subscription updated for user ${userId}: ${tier} (${status})`);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const customerId = sub.customer as string;
          const userId = await resolveUserId(sub.metadata, customerId);
          if (userId) {
            await db.updateUserSubscription(userId, {
              subscriptionTier: "independent",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: null,
              subscriptionCurrentPeriodEnd: null,
            });
            logger.info(`Subscription canceled for user ${userId}`);
          }
          break;
        }
        case "invoice.paid": {
          // Successful payment — confirm subscription is active and update period end
          const invoice = event.data.object;
          const customerId = invoice.customer as string;
          const subscriptionId = invoice.subscription as string;
          if (customerId && subscriptionId) {
            const user = await db.getUserByStripeCustomerId(customerId);
            if (user) {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = sub.items.data[0]?.price?.id || "";
              const tier = priceIdToTier(priceId);
              await db.updateUserSubscription(user.id, {
                subscriptionTier: tier as any,
                subscriptionStatus: "active",
                subscriptionCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000),
              });
              // Reset generation counter on renewal (new billing period = fresh quota)
              await db.resetGenerationCounter(user.id);
              // Grant monthly credits to creditBalance for the new billing period
              const renewTierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
              if (renewTierLimits?.monthlyCredits) {
                await db.addCredits(user.id, renewTierLimits.monthlyCredits, "subscription_renewal", `${tier} subscription renewed — ${renewTierLimits.monthlyCredits} monthly credits granted`);
                logger.info(`Granted ${renewTierLimits.monthlyCredits} credits to user ${user.id} for ${tier} renewal`);
              }
              logger.info(`Invoice paid for user ${user.id}: ${tier} renewed`);
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const customerId = invoice.customer as string;
          const user = await db.getUserByStripeCustomerId(customerId);
          if (user) {
            await db.updateUserSubscription(user.id, {
              subscriptionStatus: "past_due",
            });
            // Track payment failure in security engine
            trackPaymentFailure(user.id, "invoice_payment_failed");
            logger.warn(`Payment failed for user ${user.id}`);
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error(`Stripe webhook handler error: ${err.message}`);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  });

  // Body parser: 25mb is plenty for the largest legitimate base64 thumbnail
  // upload (≈18MB raw) while making request smuggling and accidental DoS via
  // pathological payloads materially harder. Stripe webhooks above use
  // express.raw() so this limit does not affect them.
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // Request logging middleware
  app.use("/api/", (req, _res, next) => {
    logger.request(req.method, req.path);
    next();
  });

  // Health check endpoint for Railway monitoring
  app.get("/api/health", (_req, res) => {
    const uptime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    res.json({
      status: "ok",
      uptime,
      startedAt: startedAt.toISOString(),
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ── v6.64 — iCal subscribable shoot-day feed ─────────────────────────────
  // Calendar apps (Apple Calendar, Google Calendar, Outlook) cannot send our
  // session cookies, so this endpoint accepts a stateless HMAC token derived
  // from SESSION_SECRET + projectId. The token is generated server-side via
  // tRPC `script.iCalUrl` once the user has access to the project.
  app.get("/api/ical/:projectId.ics", async (req, res) => {
    try {
      const { createHmac } = await import("crypto");
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId) || projectId <= 0) return res.status(400).send("Bad project id");
      const token = String(req.query.token || "");
      const secret = process.env.SESSION_SECRET || "";
      if (!secret) return res.status(503).send("Calendar feed unavailable: server not configured.");
      const expected = createHmac("sha256", secret).update(`ical:${projectId}`).digest("hex").slice(0, 32);
      if (token !== expected) return res.status(403).send("Invalid token.");
      const dbMod = await import("../db");
      const project = await dbMod.getProjectByIdRaw(projectId);
      const days = await dbMod.listShootDays(projectId);
      const { exportICal } = await import("./scriptFormats");
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/projects/${projectId}` : undefined;
      const ics = exportICal((project as any)?.title || `Project ${projectId}`, (days as any[]).map((d) => ({
        id: d.id, dayNumber: d.dayNumber, shootDate: d.shootDate, callTime: d.callTime, wrapTime: d.wrapTime,
        locationName: d.locationName, generalNotes: d.generalNotes,
      })), baseUrl);
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(ics);
    } catch (e: any) {
      logger.error(`iCal feed error: ${e?.message}`);
      res.status(500).send("Internal error");
    }
  });

  // ── MOBILE APP: Feature Registry ─────────────────────────────────────────
  // The mobile app polls this endpoint to discover all available features.
  // To add a new feature: edit shared/feature-registry.ts — it auto-appears in the app.
  app.get("/api/mobile/features", async (_req, res) => {
    try {
      const { FEATURE_REGISTRY, getFeaturesByCategory } = await import("../../shared/feature-registry");
      res.json({
        version: 1,
        updatedAt: new Date().toISOString(),
        features: FEATURE_REGISTRY,
        byCategory: getFeaturesByCategory(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── MOBILE APP: App Download Links ─────────────────────────────────────────
  // Returns the latest iOS/Android/Desktop download URLs.
  //
  // Resolution order per platform:
  //   1. Explicit env var (IOS_DOWNLOAD_URL, ANDROID_DOWNLOAD_URL,
  //      DESKTOP_MAC_URL, DESKTOP_WIN_URL, DESKTOP_LINUX_URL) — wins.
  //   2. v6.73 — Auto-detect desktop installers from the latest
  //      `desktop-v*` GitHub Release on leego972/virellestudios. As soon as
  //      the desktop-release.yml workflow finishes after a tag push, the
  //      Download page lights up automatically with no manual env-var step.
  //   3. iOS falls back to the live App Store listing (always available).
  //
  // GitHub release lookup is cached in-process for 5 minutes to avoid rate
  // limits and keep the endpoint snappy.
  type DesktopAssets = {
    mac: string | null;
    win: string | null;
    linux: string | null;
    version: string | null;
    fetchedAt: number;
  };
  let _desktopReleaseCache: DesktopAssets | null = null;
  const DESKTOP_RELEASE_CACHE_MS = 5 * 60 * 1000;

  async function fetchLatestDesktopRelease(): Promise<DesktopAssets> {
    const now = Date.now();
    if (_desktopReleaseCache && now - _desktopReleaseCache.fetchedAt < DESKTOP_RELEASE_CACHE_MS) {
      return _desktopReleaseCache;
    }
    const empty: DesktopAssets = {
      mac: null, win: null, linux: null, version: null, fetchedAt: now,
    };
    try {
      // Public repo, no auth required for unauthenticated reads of releases.
      // We pull the most recent 30 releases and pick the first whose tag
      // starts with `desktop-v` so non-desktop tags (e.g. `v6.73`) don't
      // shadow the desktop release.
      const repo = process.env.DESKTOP_RELEASES_REPO || "leego972/virellestudios";
      const headers: Record<string, string> = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "virelle-studios-server",
      };
      if (process.env.GITHUB_TOKEN) {
        headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      const r = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
        headers,
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) {
        _desktopReleaseCache = empty;
        return empty;
      }
      const releases: any[] = await r.json();
      const desktopRel = releases.find((rel) =>
        typeof rel?.tag_name === "string" &&
        rel.tag_name.startsWith("desktop-v") &&
        !rel.draft && !rel.prerelease,
      );
      if (!desktopRel) {
        _desktopReleaseCache = empty;
        return empty;
      }
      const version = String(desktopRel.tag_name).replace(/^desktop-v/, "");
      const assets: any[] = Array.isArray(desktopRel.assets) ? desktopRel.assets : [];
      // Match by extension. Prefer arm64 dmg if both exist (Apple Silicon
      // first, the more common modern Mac); the universal DMG works on x64
      // too via Rosetta-emulated electron-builder targets.
      const findAsset = (predicate: (name: string) => boolean): string | null => {
        const hit = assets.find((a) => typeof a?.name === "string" && typeof a?.browser_download_url === "string" && predicate(a.name));
        return hit ? String(hit.browser_download_url) : null;
      };
      const macArm = findAsset((n) => n.toLowerCase().endsWith(".dmg") && n.toLowerCase().includes("arm64"));
      const macAny = findAsset((n) => n.toLowerCase().endsWith(".dmg"));
      const win = findAsset((n) => n.toLowerCase().endsWith(".exe"));
      const linuxAppImage = findAsset((n) => n.toLowerCase().endsWith(".appimage"));
      const linuxDeb = findAsset((n) => n.toLowerCase().endsWith(".deb"));
      const result: DesktopAssets = {
        mac: macArm || macAny,
        win,
        // AppImage is the most portable Linux format; deb is the fallback.
        linux: linuxAppImage || linuxDeb,
        version,
        fetchedAt: now,
      };
      _desktopReleaseCache = result;
      return result;
    } catch (_err) {
      _desktopReleaseCache = empty;
      return empty;
    }
  }

  app.get("/api/mobile/downloads", async (_req, res) => {
    // iOS: live App Store listing — always available.
    const IOS_LIVE_URL = "https://apps.apple.com/app/virelle-studios/id6761315616";
    const iosUrl = process.env.IOS_DOWNLOAD_URL || IOS_LIVE_URL;

    // Android: only mark available when a real public APK / Play Store URL is configured.
    // Do NOT silently fall back to the EAS dev dashboard — that requires login and breaks user trust.
    const androidUrl = process.env.ANDROID_DOWNLOAD_URL || null;

    // Desktop: env vars win, otherwise auto-detect from the latest GitHub release.
    const envMac = process.env.DESKTOP_MAC_URL || null;
    const envWin = process.env.DESKTOP_WIN_URL || null;
    const envLinux = process.env.DESKTOP_LINUX_URL || null;
    let macUrl = envMac;
    let winUrl = envWin;
    let linuxUrl = envLinux;
    let desktopVersion = process.env.DESKTOP_VERSION || null;
    let source: "env" | "github-release" | "none" = (envMac || envWin || envLinux) ? "env" : "none";

    // If ANY desktop platform is missing an explicit env override, try GitHub.
    if (!envMac || !envWin || !envLinux) {
      const release = await fetchLatestDesktopRelease();
      if (!envMac && release.mac) macUrl = release.mac;
      if (!envWin && release.win) winUrl = release.win;
      if (!envLinux && release.linux) linuxUrl = release.linux;
      if (!desktopVersion && release.version) desktopVersion = release.version;
      if (release.mac || release.win || release.linux) source = "github-release";
    }

    res.json({
      ios: {
        url: iosUrl,
        version: process.env.APP_VERSION || "1.0.0",
        available: true,
      },
      android: {
        url: androidUrl,
        version: process.env.APP_VERSION || "1.0.0",
        available: !!androidUrl,
      },
      desktop: {
        mac: macUrl,
        win: winUrl,
        linux: linuxUrl,
        version: desktopVersion || "1.0.0",
        available: !!(macUrl || winUrl || linuxUrl),
        availability: { mac: !!macUrl, win: !!winUrl, linux: !!linuxUrl },
        source, // "env" | "github-release" | "none" — for debugging only.
      },
    });
  });

  // ─── Admin Protection Middleware ──────────────────────────────────────────
  // The middleware itself lives in ./context.ts as `requireAdminExpress`
  // (imported at the top of this file) so the same guard can be reused
  // anywhere outside the tRPC stack and so the auth path stays in one
  // place. We only define the audit-logger helper inline here.
  //
  // v6.79 — Secure Admin Operations Layer:
  //   - `requireMaintenanceEnabled` blocks destructive maintenance
  //     routes (migrate, fix-scenes, reset-project) in production
  //     unless ENABLE_MAINTENANCE_ROUTES=true. Grant-credits is NOT
  //     gated by this — it is a routine support action.
  //   - `logAdminAction` now accepts an explicit success flag and an
  //     errorMessage so we record both successful AND failed admin
  //     actions, including the acting admin's email and target id.
  //   - grant-credits and reset-project use Drizzle's parameterised
  //     `sql\`...\`` template instead of `sql.raw(...)` with string
  //     interpolation, with strict numeric validation + range clamping
  //     before the DB call.

  const logAdminAction = async (
    req: express.Request,
    action: string,
    details: Record<string, any> = {},
    success: boolean = true,
    errorMessage?: string,
  ): Promise<void> => {
    try {
      const { logAuditEvent } = await import("./securityEngine");
      const user = (req as any).user;
      logAuditEvent(
        user?.id || 0,
        `ADMIN_${action}`,
        req.ip || "unknown",
        success,
        {
          ...details,
          path: req.path,
          method: req.method,
          adminEmail: user?.email,
          ...(errorMessage ? { error: errorMessage } : {}),
        },
      );
    } catch (err) {
      console.error("[Admin] Failed to log audit event:", err);
    }
  };

  // Production safety gate for destructive maintenance routes. In
  // production these routes are off by default and only enable when
  // ENABLE_MAINTENANCE_ROUTES=true. The intended workflow is:
  //   1. Set ENABLE_MAINTENANCE_ROUTES=true in Railway → Variables
  //   2. Hit the route from an admin session
  //   3. Unset / delete ENABLE_MAINTENANCE_ROUTES immediately after
  // This stops accidental schema changes or project wipes against the
  // live DB. Auth still runs first via requireAdminExpress, so this
  // gate only fires for already-authenticated admins.
  const requireMaintenanceEnabled = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ): void => {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ENABLE_MAINTENANCE_ROUTES !== "true"
    ) {
      const user = (req as any).user;
      console.warn(
        `[Admin] Maintenance route blocked in production: ${req.path} ` +
          `(admin=${user?.email || user?.id || "unknown"})`,
      );
      // Best-effort audit log — never block the response if logging fails.
      void logAdminAction(
        req,
        "MAINTENANCE_BLOCKED",
        { route: req.path },
        false,
        "ENABLE_MAINTENANCE_ROUTES is not 'true' in production",
      );
      res.status(403).json({
        error: "Maintenance routes are disabled in production",
        hint:
          "Set ENABLE_MAINTENANCE_ROUTES=true on the Railway service " +
          "to enable temporarily, then unset it after use.",
      });
      return;
    }
    next();
  };

  // Manual migration trigger (admin only, maintenance-gated in prod)
  app.post(
    "/api/admin/migrate",
    requireAdminExpress,
    requireMaintenanceEnabled,
    async (req, res) => {
      try {
        await runAutoMigration();
        await logAdminAction(req, "MIGRATE", { status: "success" });
        res.json({ status: "ok", message: "Migration completed" });
      } catch (err: any) {
        await logAdminAction(req, "MIGRATE", {}, false, err?.message);
        res.status(500).json({ status: "error", message: err.message });
      }
    },
  );

  // Force-fix: directly add missing scene columns (bypasses INFORMATION_SCHEMA)
  // (admin only, maintenance-gated in prod)
  app.post(
    "/api/admin/fix-scenes",
    requireAdminExpress,
    requireMaintenanceEnabled,
    async (req, res) => {
      try {
        const { getDb } = await import("../db");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) {
          await logAdminAction(req, "FIX_SCENES", {}, false, "No DB");
          res.status(500).json({ error: "No DB" });
          return;
        }
        // Column names + DDL fragments are hardcoded here, not user-supplied,
        // so sql.raw is safe — there is no untrusted input on this route.
        const cols: [string, string][] = [
          ["transitionType", "VARCHAR(64) NULL DEFAULT 'cut'"],
          ["transitionDuration", "FLOAT NULL DEFAULT 0.5"],
          ["colorGrading", "VARCHAR(128) NULL"],
          ["productionNotes", "TEXT NULL"],
        ];
        const results: string[] = [];
        for (const [col, def] of cols) {
          try {
            await db.execute(sql.raw(`ALTER TABLE scenes ADD COLUMN \`${col}\` ${def}`));
            results.push(`Added ${col}`);
          } catch (e: any) {
            results.push(`${col}: ${e.message?.slice(0, 100)}`);
          }
        }
        await logAdminAction(req, "FIX_SCENES", { results });
        res.json({ status: "ok", results });
      } catch (e: any) {
        await logAdminAction(req, "FIX_SCENES", {}, false, e?.message);
        res.status(500).json({ error: e.message });
      }
    },
  );

  // Admin: Grant credits to a user.
  // Routine support action — NOT gated by requireMaintenanceEnabled.
  // Validates IDs, clamps amount to ±MAX_GRANT, parameterised SQL.
  const MAX_CREDIT_GRANT = 1_000_000;
  app.post(
    "/api/admin/grant-credits",
    requireAdminExpress,
    express.json(),
    async (req, res) => {
      try {
        const userIdNum = Number(req.body?.userId);
        const amountNum = Number(req.body?.amount);
        if (!Number.isInteger(userIdNum) || userIdNum <= 0) {
          await logAdminAction(
            req,
            "GRANT_CREDITS",
            { reason: "invalid_userId", userId: req.body?.userId },
            false,
            "userId must be a positive integer",
          );
          res.status(400).json({ error: "userId must be a positive integer" });
          return;
        }
        if (!Number.isInteger(amountNum) || amountNum === 0) {
          await logAdminAction(
            req,
            "GRANT_CREDITS",
            { reason: "invalid_amount", amount: req.body?.amount },
            false,
            "amount must be a non-zero integer",
          );
          res.status(400).json({ error: "amount must be a non-zero integer" });
          return;
        }
        if (amountNum < -MAX_CREDIT_GRANT || amountNum > MAX_CREDIT_GRANT) {
          await logAdminAction(
            req,
            "GRANT_CREDITS",
            { reason: "amount_out_of_range", amount: amountNum },
            false,
            `amount outside ±${MAX_CREDIT_GRANT}`,
          );
          res.status(400).json({
            error: `amount must be between -${MAX_CREDIT_GRANT} and ${MAX_CREDIT_GRANT}`,
          });
          return;
        }
        const { getDb } = await import("../db");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) {
          await logAdminAction(req, "GRANT_CREDITS", { targetUserId: userIdNum }, false, "No DB");
          res.status(500).json({ error: "No DB" });
          return;
        }
        // Parameterised — values bound by the driver, not interpolated as text.
        await db.execute(
          sql`UPDATE users SET creditBalance = creditBalance + ${amountNum} WHERE id = ${userIdNum}`,
        );
        const [rows] = await db.execute(
          sql`SELECT creditBalance FROM users WHERE id = ${userIdNum}`,
        );
        const newBalance = (rows as any)?.[0]?.creditBalance ?? 0;
        await logAdminAction(req, "GRANT_CREDITS", {
          targetUserId: userIdNum,
          amount: amountNum,
          newBalance,
        });
        res.json({
          status: "ok",
          userId: userIdNum,
          creditsAdded: amountNum,
          newBalance,
        });
      } catch (e: any) {
        await logAdminAction(
          req,
          "GRANT_CREDITS",
          { targetUserId: req.body?.userId, amount: req.body?.amount },
          false,
          e?.message,
        );
        res.status(500).json({ error: e.message });
      }
    },
  );

  // Admin: Reset project (delete scenes, update duration, reset status).
  // Destructive — gated by requireMaintenanceEnabled in production.
  // Validates IDs + duration, parameterised SQL.
  const MAX_PROJECT_DURATION_MIN = 600; // 10h cap
  app.post(
    "/api/admin/reset-project",
    requireAdminExpress,
    requireMaintenanceEnabled,
    express.json(),
    async (req, res) => {
      try {
        const projectIdNum = Number(req.body?.projectId);
        if (!Number.isInteger(projectIdNum) || projectIdNum <= 0) {
          await logAdminAction(
            req,
            "RESET_PROJECT",
            { reason: "invalid_projectId", projectId: req.body?.projectId },
            false,
            "projectId must be a positive integer",
          );
          res.status(400).json({ error: "projectId must be a positive integer" });
          return;
        }
        let durationNum = 1;
        if (req.body?.duration !== undefined && req.body?.duration !== null) {
          const d = Number(req.body.duration);
          if (!Number.isInteger(d) || d < 1 || d > MAX_PROJECT_DURATION_MIN) {
            await logAdminAction(
              req,
              "RESET_PROJECT",
              { reason: "invalid_duration", duration: req.body?.duration },
              false,
              `duration must be 1..${MAX_PROJECT_DURATION_MIN}`,
            );
            res.status(400).json({
              error: `duration must be an integer between 1 and ${MAX_PROJECT_DURATION_MIN}`,
            });
            return;
          }
          durationNum = d;
        }
        const { getDb } = await import("../db");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) {
          await logAdminAction(req, "RESET_PROJECT", { projectId: projectIdNum }, false, "No DB");
          res.status(500).json({ error: "No DB" });
          return;
        }
        // Parameterised — values bound by the driver.
        await db.execute(sql`DELETE FROM scenes WHERE projectId = ${projectIdNum}`);
        await db.execute(
          sql`UPDATE projects SET duration = ${durationNum}, status = 'draft' WHERE id = ${projectIdNum}`,
        );
        await logAdminAction(req, "RESET_PROJECT", {
          projectId: projectIdNum,
          duration: durationNum,
        });
        res.json({
          status: "ok",
          projectId: projectIdNum,
          duration: durationNum,
          scenesDeleted: true,
        });
      } catch (e: any) {
        await logAdminAction(
          req,
          "RESET_PROJECT",
          { projectId: req.body?.projectId, duration: req.body?.duration },
          false,
          e?.message,
        );
        res.status(500).json({ error: e.message });
      }
    },
  );

  // Rate limiting on auth endpoints (stricter: 10 requests per minute)
  app.use("/api/trpc/auth.login", rateLimit(60_000, 10));
  app.use("/api/trpc/auth.register", rateLimit(60_000, 5));
  app.use("/api/trpc/auth.requestPasswordReset", rateLimit(60_000, 3));

  // Rate limiting on AI generation endpoints (20 requests per minute)
  app.use("/api/trpc/generation.quickGenerate", rateLimit(60_000, 20));
  app.use("/api/trpc/character.aiGenerate", rateLimit(60_000, 20));
  app.use("/api/trpc/character.aiGenerateFromPhoto", rateLimit(60_000, 20));
  app.use("/api/trpc/director.sendMessage", rateLimit(60_000, 30));

  // General API rate limiting (200 requests per minute)
  app.use("/api/", rateLimit(60_000, 200));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // Register SEO Engine routes (sitemap, robots.txt, etc.)
  registerSeoRoutes(app);
  registerSeoV4Routes(app);

  // Dynamic blog sitemap — auto-includes all published articles
  app.get("/sitemap-blog.xml", async (_req, res) => {
    try {
      const articles = await db.getPublishedArticles(500, 0);
      const urls = (articles as any[]).map((a: any) => {
        const lastmod = a.publishedAt
          ? new Date(a.publishedAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        return `  <url><loc>https://virelle.life/blog/${a.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`;
      }).join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
      res.setHeader("Content-Type", "application/xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (_err) {
      res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  });

  // ── Voice Upload & TTS HTTP Routes (Safari iOS safe — no base64 overhead) ────
  // In-memory temp store for voice recordings (id -> { buffer, mimeType, expires })
  const voiceTempStore = new Map<string, { buffer: Buffer; mimeType: string; expires: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of voiceTempStore.entries()) {
      if (entry.expires < now) voiceTempStore.delete(id);
    }
  }, 5 * 60 * 1000);

  // POST /api/voice/upload — accepts multipart audio, returns temp URL
  app.post("/api/voice/upload", async (req, res) => {
    try {
      const ctx = await createContext({ req, res, info: {} } as any);
      if (!ctx.user) return res.status(401).json({ error: "Authentication required" });
      const MAX_SIZE = 16 * 1024 * 1024;
      const contentType = req.headers["content-type"] || "";
      const saveTemp = (buf: Buffer, mime: string) => {
        const id = crypto.randomBytes(16).toString('hex');
        voiceTempStore.set(id, { buffer: buf, mimeType: mime, expires: Date.now() + 10 * 60 * 1000 });
        return `/api/voice/temp/${id}`;
      };
      // Parse raw body (works for both multipart and raw binary)
      // We read the raw body and extract the audio blob from the multipart boundary
      {
        const chunks: Buffer[] = [];
        let total = 0;
        req.on("data", (c: Buffer) => { total += c.length; if (total <= MAX_SIZE) chunks.push(c); });
        req.on("end", () => {
          if (res.headersSent) return;
          const buf = Buffer.concat(chunks);
          if (!buf.length) return res.status(400).json({ error: "No audio data" });
          const mime = contentType.split(";")[0].trim() || "audio/webm";
          res.json({ url: saveTemp(buf, mime), mimeType: mime });
        });
      }
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET /api/voice/temp/:id — serve temp audio for transcription
  app.get("/api/voice/temp/:id", (req, res) => {
    const entry = voiceTempStore.get(req.params.id);
    if (!entry) return res.status(404).json({ error: "Not found" });
    res.setHeader("Content-Type", entry.mimeType);
    res.end(entry.buffer);
  });

  // POST /api/voice/tts — ElevenLabs (user key) → OpenAI TTS fallback, returns audio/mpeg
  app.post("/api/voice/tts", async (req, res) => {
    try {
      const ctx = await createContext({ req, res, info: {} } as any);
      if (!ctx.user) return res.status(401).json({ error: "Authentication required" });
      const { text } = req.body || {};
      if (!text || typeof text !== "string") return res.status(400).json({ error: "Missing text" });
      const trimmed = text.slice(0, 4096);
      // Credits: deduct 2 credits per TTS call (same as virelle_chat) — skip for admins
      const isAdminTts = ctx.user.role === "admin";
      if (!isAdminTts) {
        try {
          await db.deductCredits(ctx.user.id, 2, "voice_tts", `TTS: ${trimmed.substring(0, 40)}`);
        } catch (creditErr: any) {
          if (creditErr.message?.includes("INSUFFICIENT_CREDITS")) {
            return res.status(402).json({ error: "Insufficient credits for TTS generation." });
          }
          console.warn("[Credits] TTS deduction warning:", creditErr.message);
        }
      }
      // Try user's ElevenLabs key first, then system key
      const userKeys = await db.getUserApiKeys(ctx.user.id);
      const elKey = userKeys.elevenlabsKey || process.env.ELEVENLABS_API_KEY || null;
      if (elKey) {
        try {
          // Virelle Director voice: "Rachel" — warm, cinematic female voice
          const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm American female
          const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: "POST",
            headers: { "xi-api-key": elKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
            body: JSON.stringify({
              text: trimmed,
              model_id: "eleven_turbo_v2_5",
              voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
            }),
            signal: AbortSignal.timeout(30000),
          });
          if (elRes.ok) {
            const buf = Buffer.from(await elRes.arrayBuffer());
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Content-Length", buf.length.toString());
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("X-TTS-Provider", "elevenlabs");
            return res.end(buf);
          }
        } catch (_) { /* fall through */ }
      }
      // OpenAI TTS fallback
      const openAiKey = process.env.OPENAI_API_KEY || "";
      if (!openAiKey) return res.status(503).json({ error: "TTS not configured" });
      const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "tts-1-hd", input: trimmed, voice: "nova", speed: 0.95, response_format: "mp3" }),
        signal: AbortSignal.timeout(30000),
      });
      if (!ttsRes.ok) {
        // OpenAI failed (billing limit, etc.) — fall through to free Pollinations TTS
        console.warn(`[TTS] OpenAI failed (${ttsRes.status}), trying Pollinations free TTS`);
      } else {
        const buf = Buffer.from(await ttsRes.arrayBuffer());
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", buf.length.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-TTS-Provider", "openai-fallback");
        return res.end(buf);
      }

      // ── Pollinations free TTS (last resort — always available, no key needed) ──
      try {
        const encodedText = encodeURIComponent(trimmed.slice(0, 500));
        const pollinationsUrl = `https://text.pollinations.ai/${encodedText}?model=openai-audio&voice=nova&format=mp3`;
        const pollRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(20000) });
        if (pollRes.ok) {
          const pollBuf = Buffer.from(await pollRes.arrayBuffer());
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Content-Length", pollBuf.length.toString());
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-TTS-Provider", "pollinations-free");
          return res.end(pollBuf);
        }
      } catch (pollErr) {
        console.warn("[TTS] Pollinations fallback failed:", pollErr);
      }

      return res.status(502).json({ error: "TTS generation failed — all providers exhausted" });
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── SSE Streaming Director Chat ─────────────────────────────────────────
  // Maps sessionId -> SSE Response so the POST handler can write to it
  const activeDirectorStreams = new Map<string, import('express').Response>();

  app.get("/api/director/stream/:sessionId", (_req, res) => {
    const { sessionId } = _req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    activeDirectorStreams.set(sessionId, res);
    _req.on("close", () => activeDirectorStreams.delete(sessionId));
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  });

  app.post("/api/director/stream/:sessionId/send", async (req, res) => {
    const { sessionId } = req.params;
    const { messages, projectContext, directorInstructions } = req.body as {
      messages: Array<{ role: string; content: string }>;
      projectContext?: string;
      directorInstructions?: string;
    };
    const sseRes = activeDirectorStreams.get(sessionId);
    if (!sseRes) { res.status(404).json({ error: "No active stream" }); return; }

    // Authenticate the user for tool execution
    const toolCtx = await createContext({ req, res, info: {} } as any);
    if (!toolCtx.user) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Credits: deduct 2 credits per Director's Assistant message (same as virelle_chat)
    // Admin users are exempt from credit deductions
    const isAdminDirector = toolCtx.user.role === "admin";
    if (!isAdminDirector) {
      try {
        await db.deductCredits(toolCtx.user.id, 2, "director_assistant", "Director's Assistant message");
      } catch (creditErr: any) {
        if (creditErr.message?.includes("INSUFFICIENT_CREDITS")) {
          sseRes.write(`data: ${JSON.stringify({ type: "error", message: "Insufficient credits. Please top up to continue using the Director's Assistant." })}\n\n`);
          res.json({ ok: false, error: "INSUFFICIENT_CREDITS" });
          return;
        }
        // Non-credit errors don't block — log and continue
        console.warn("[Credits] Director stream deduction warning:", creditErr.message);
      }
    }

    const SYSTEM = buildDirectorSystemPrompt(projectContext || "", directorInstructions || "");

    type LLMMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[] };
    const llmMessages: LLMMessage[] = [
      { role: "system", content: SYSTEM },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    sseRes.write(`data: ${JSON.stringify({ type: "thinking", message: "Director is thinking..." })}\n\n`);
    res.json({ ok: true }); // Acknowledge HTTP immediately; SSE continues async

    // Tool-calling loop (max 5 rounds to prevent infinite loops)
    const MAX_TOOL_ROUNDS = 5;
    let round = 0;
    while (round < MAX_TOOL_ROUNDS) {
      round++;
      let llmResult: any;
      try {
        llmResult = await invokeLLM({
          messages: llmMessages as any,
          tools: DIRECTOR_TOOLS,
          tool_choice: "auto",
          maxTokens: 1500,
        });
      } catch (err: any) {
        sseRes.write(`data: ${JSON.stringify({ type: "error", message: err.message || "AI request failed" })}\n\n`);
        return;
      }

      const choice = llmResult.choices?.[0];
      if (!choice) {
        sseRes.write(`data: ${JSON.stringify({ type: "error", message: "No response from AI" })}\n\n`);
        return;
      }

      const assistantMsg = choice.message;

      // If the AI wants to call tools
      if (choice.finish_reason === "tool_calls" && assistantMsg.tool_calls?.length) {
        llmMessages.push({ role: "assistant", content: assistantMsg.content || "", tool_calls: assistantMsg.tool_calls });

        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function?.name;
          let toolArgs: Record<string, unknown> = {};
          try { toolArgs = JSON.parse(toolCall.function?.arguments || "{}"); } catch {}

          const description = getDirectorToolDescription(toolName, toolArgs);
          sseRes.write(`data: ${JSON.stringify({ type: "tool_start", toolName, description })}\n\n`);

          const toolResult = await executeDirectorTool(toolName, toolArgs, {
            userId: toolCtx.user!.id,
            user: toolCtx.user! as any,
          });

          // If the tool result contains a navigation action, send it to the client
          if (toolResult.success && (toolResult.data as any)?.action?.type === "navigate") {
            sseRes.write(`data: ${JSON.stringify({ type: "action", action: (toolResult.data as any).action })}\n\n`);
          }

          sseRes.write(`data: ${JSON.stringify({ type: "tool_done", toolName, success: toolResult.success, data: toolResult.success ? toolResult.data : null, error: !toolResult.success ? (toolResult as any).error : null })}\n\n`);

          llmMessages.push({
            role: "tool",
            content: JSON.stringify(toolResult.success ? toolResult.data : { error: (toolResult as any).error }),
            tool_call_id: toolCall.id,
          });
        }
        continue;
      }

      // No more tool calls — stream the final text response word by word
      const finalText = assistantMsg.content || "";
      if (finalText) {
        const words = finalText.split(" ");
        for (let i = 0; i < words.length; i++) {
          const token = (i === 0 ? "" : " ") + words[i];
          sseRes.write(`data: ${JSON.stringify({ type: "token", token })}\n\n`);
          await new Promise((r) => setTimeout(r, 15));
        }
      }
      sseRes.write(`data: ${JSON.stringify({ type: "done", text: finalText })}\n\n`);
      return;
    }

    sseRes.write(`data: ${JSON.stringify({ type: "error", message: "Exceeded maximum tool execution rounds. Please try again." })}\n\n`);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`, { port });

    // Start autonomous blog engine - generates and publishes SEO articles every 8 hours
    startBlogScheduler(async (article) => {
      try {
        await db.createBlogArticle({
          slug: article.slug,
          title: article.title,
          subtitle: article.subtitle,
          content: article.content,
          excerpt: article.excerpt,
          category: article.category,
          tags: article.tags,
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          generationPrompt: article.generationPrompt,
          coverImageUrl: article.coverImageUrl || null,
          generatedByAI: true,
          status: "published",
          publishedAt: new Date(),
        });
        logger.info(`[BlogEngine] Auto-published: "${article.title}"`);
      } catch (err: any) {
        logger.error(`[BlogEngine] Failed to save article: ${err.message}`);
      }
    });
    logger.info("[BlogEngine] Autonomous blog scheduler initialized");

    // Start autonomous advertising engine - generates text, image, and video ads every 8 hours
    startAdScheduler();
    startAutonomousPipelineScheduler();
    logger.info("[AdEngine] Autonomous advertising scheduler initialized");

    // Start persistent video job worker — polls Runway for pending tasks, survives restarts
    startVideoJobWorker();
    logger.info("[VideoWorker] Persistent video job worker started");

    // v6.72 — One-shot sweep of stuck Auto Recap MP4 renders. If the
    // process died mid-render last time (e.g. Railway redeploy), this
    // releases the reserved credits and reverts the recap to
    // outline_completed so the user can retry. Threshold of 60 minutes
    // is intentionally conservative — anything younger is probably a
    // healthy in-flight render on a sibling worker.
    setTimeout(async () => {
      try {
        const { sweepStuckRecapRenders } = await import("./recapRenderSweeper");
        const res = await sweepStuckRecapRenders({ olderThanMinutes: 60, dryRun: false });
        if (res.checked > 0 || res.repaired > 0) {
          logger.info(`[recapSweeper] boot sweep: checked=${res.checked} repaired=${res.repaired}`);
        }
      } catch (err: any) {
        logger.warn(`[recapSweeper] boot sweep failed: ${err?.message}`);
      }
    }, 10_000).unref();
    logger.info("[recapSweeper] Boot sweep scheduled (in 10s, threshold=60m)");
  });
}

startServer().catch(console.error);

// ── Graceful shutdown ────────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  logger.info(`[Server] Received ${signal} — shutting down gracefully`);
  // Give in-flight requests 10 seconds to complete before forcing exit
  setTimeout(() => {
    logger.info("[Server] Forced exit after 10s timeout");
    process.exit(0);
  }, 10_000).unref();
  process.exit(0);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));

