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
import { startBlogScheduler } from "./blogEngine";
import { runAutoMigration } from "./autoMigrate";

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

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = parseInt(session.metadata?.userId || "0");
          const subscriptionId = session.subscription as string;
          if (userId && subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = sub.items.data[0]?.price?.id || "";
            const tier = priceIdToTier(priceId);
            await db.updateUserSubscription(userId, {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              subscriptionTier: tier,
              subscriptionStatus: "active",
              subscriptionCurrentPeriodEnd: new Date((sub as any).current_period_end * 1000),
            });
            logger.info(`Subscription activated for user ${userId}: ${tier}`);
          }
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object;
          const userId = parseInt(sub.metadata?.userId || "0");
          if (userId) {
            const priceId = sub.items.data[0]?.price?.id || "";
            const tier = priceIdToTier(priceId);
            const status = sub.status === "active" ? "active" 
              : sub.status === "past_due" ? "past_due"
              : sub.status === "canceled" ? "canceled"
              : sub.status === "trialing" ? "trialing"
              : sub.status === "unpaid" ? "unpaid" : "none";
            await db.updateUserSubscription(userId, {
              subscriptionTier: status === "active" || status === "trialing" ? tier : "free",
              subscriptionStatus: status,
              subscriptionCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
            });
            logger.info(`Subscription updated for user ${userId}: ${tier} (${status})`);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const userId = parseInt(sub.metadata?.userId || "0");
          if (userId) {
            await db.updateUserSubscription(userId, {
              subscriptionTier: "free",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: null,
              subscriptionCurrentPeriodEnd: null,
            });
            logger.info(`Subscription canceled for user ${userId}`);
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
  });
}

startServer().catch(console.error);
