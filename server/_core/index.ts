import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "./logger";
import { stripe, priceIdToTier } from "./subscription";
import { ENV } from "./env";
import * as db from "../db";
import { trackPaymentFailure } from "./securityEngine";
import { startBlogScheduler } from "./blogEngine";
import { startAdScheduler } from "./advertisingEngine";
import { runAutoMigration } from "./autoMigrate";
import { runStripeProvisioning } from "./stripeProvisioning";

const startedAt = new Date();

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimit(windowMs: number, maxRequests: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    next();
  };
}

// Periodically clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitMap.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  });
}, 60_000);

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

  // Auto-provision Stripe products and prices on startup
  try {
    await runStripeProvisioning();
  } catch (err: any) {
    console.error("[StripeProvisioning] Failed:", err.message);
    // Continue starting — existing price IDs from ENV will still work
  }

  const app = express();
  const server = createServer(app);

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
            logger.info(`Film package ${packageId} (+${credits} credits) applied for user ${userId}`);
            break;
          }

          // Check if this is a generation top-up pack purchase (one-time payment)
          if (session.metadata?.type === "generation_topup" && userId) {
            const packId = session.metadata.packId;
            const packAmounts: Record<string, number> = {
              topup_10: 10,
              topup_30: 30,
              topup_100: 100,
            };
            const generations = packAmounts[packId] || 0;
            if (generations > 0) {
              await db.addBonusGenerations(userId, generations);
              logger.info(`Top-up pack ${packId} (+${generations} gens) applied for user ${userId}`);
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
              subscriptionTier: tier,
              subscriptionStatus: "active",
              subscriptionCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            });
            // Reset generation counter on new subscription (fresh quota)
            await db.resetGenerationCounter(userId);
            logger.info(`Subscription activated for user ${userId}: ${tier}`);
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
              subscriptionTier: status === "active" || status === "trialing" ? tier : "independent",
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
                subscriptionTier: tier,
                subscriptionStatus: "active",
                subscriptionCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000),
              });
              // Reset generation counter on renewal (new billing period = fresh quota)
              await db.resetGenerationCounter(user.id);
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

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

  // Manual migration trigger (admin only)
  app.post("/api/admin/migrate", async (_req, res) => {
    try {
      await runAutoMigration();
      res.json({ status: "ok", message: "Migration completed" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Force-fix: directly add missing scene columns (bypasses INFORMATION_SCHEMA)
  app.post("/api/admin/fix-scenes", async (_req, res) => {
    const { getDb } = await import("../db");
    const { sql } = await import("drizzle-orm");
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "No DB" });
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
    res.json({ status: "ok", results });
  });

  // Admin: Grant credits to a user
  app.post("/api/admin/grant-credits", express.json(), async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || !amount) {
        res.status(400).json({ error: "userId and amount required" });
        return;
      }
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      await db.execute(sql.raw(`UPDATE users SET creditBalance = creditBalance + ${parseInt(amount)} WHERE id = ${parseInt(userId)}`));
      const [rows] = await db.execute(sql.raw(`SELECT creditBalance FROM users WHERE id = ${parseInt(userId)}`));
      const newBalance = (rows as any)?.[0]?.creditBalance || 0;
      res.json({ status: "ok", userId: parseInt(userId), creditsAdded: parseInt(amount), newBalance });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Admin: Reset project (delete scenes, update duration, reset status)
  app.post("/api/admin/reset-project", express.json(), async (req, res) => {
    try {
      const { projectId, duration } = req.body;
      if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      // Delete all scenes for this project
      await db.execute(sql.raw(`DELETE FROM scenes WHERE projectId = ${parseInt(projectId)}`));
      // Update duration and reset status
      const dur = duration ? parseInt(duration) : 1;
      await db.execute(sql.raw(`UPDATE projects SET duration = ${dur}, status = 'draft' WHERE id = ${parseInt(projectId)}`));
      res.json({ status: "ok", projectId: parseInt(projectId), duration: dur, scenesDeleted: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
    logger.info("[AdEngine] Autonomous advertising scheduler initialized");
  });
}

startServer().catch(console.error);
