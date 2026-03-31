import "./sentry.js";
import "dotenv/config";
import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "./logger";
import { stripe, priceIdToTier, TIER_LIMITS } from "./subscription";
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

  // Admin roles are now managed via OWNER_OPEN_ID in db.ts upsertUser/createEmailUser
  // No bulk email-based promotion on startup for better security and auditability.

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
              topup_10:   500,    // Starter Pack     — 500 credits
              topup_50:   1500,   // Producer Pack    — 1,500 credits
              topup_100:  3000,   // Director Pack    — 3,000 credits
              topup_200:  6000,   // Studio Pack      — 6,000 credits
              topup_500:  12000,  // Blockbuster Pack — 12,000 credits
              topup_1000: 25000,  // Mogul Pack       — 25,000 credits
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
                const planLabel = tier === "creator" ? "Creator" : tier === "studio" ? "Studio" : tier === "industry" ? "Industry" : tier === "independent" ? "Independent" : String(tier);
                const tierPrice = tier === "creator" ? "$2,500/mo" : tier === "studio" ? "$5,000/mo" : tier === "industry" ? "$10,000/mo" : "";
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
  // Set IOS_DOWNLOAD_URL, ANDROID_DOWNLOAD_URL, DESKTOP_MAC_URL,
  // DESKTOP_WIN_URL, DESKTOP_LINUX_URL env vars after each build.
  app.get("/api/mobile/downloads", (_req, res) => {
    res.json({
      ios: {
        url: process.env.IOS_DOWNLOAD_URL || null,
        version: process.env.APP_VERSION || "1.0.0",
        available: !!process.env.IOS_DOWNLOAD_URL,
      },
      android: {
        url: process.env.ANDROID_DOWNLOAD_URL || null,
        version: process.env.APP_VERSION || "1.0.0",
        available: !!process.env.ANDROID_DOWNLOAD_URL,
      },
      desktop: {
        mac: process.env.DESKTOP_MAC_URL || null,
        win: process.env.DESKTOP_WIN_URL || null,
        linux: process.env.DESKTOP_LINUX_URL || null,
        version: process.env.DESKTOP_VERSION || "1.0.0",
        available: !!(process.env.DESKTOP_MAC_URL || process.env.DESKTOP_WIN_URL || process.env.DESKTOP_LINUX_URL),
      },
    });
  });

  // ─── Admin Protection Middleware ──────────────────────────────────────────
  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const { createContext } = await import("./context");
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user || ctx.user.role !== "admin") {
        console.warn(`[Admin] Unauthorized access attempt to ${req.path} from ${req.ip}`);
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      (req as any).user = ctx.user;
      next();
    } catch (err) {
      res.status(500).json({ error: "Internal server error during admin check" });
    }
  };

  const logAdminAction = async (req: express.Request, action: string, details: any) => {
    try {
      const { logAuditEvent } = await import("./securityEngine");
      const user = (req as any).user;
      await logAuditEvent({
        userId: user?.id || 0,
        action: `ADMIN_${action}`,
        details: { ...details, ip: req.ip, path: req.path },
        severity: "high"
      });
    } catch (err) {
      console.error("[Admin] Failed to log audit event:", err);
    }
  };

  // Manual migration trigger (admin only)
  app.post("/api/admin/migrate", requireAdmin, async (req, res) => {
    try {
      await runAutoMigration();
      await logAdminAction(req, "MIGRATE", { status: "success" });
      res.json({ status: "ok", message: "Migration completed" });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Force-fix: directly add missing scene columns (bypasses INFORMATION_SCHEMA)
  app.post("/api/admin/fix-scenes", requireAdmin, async (req, res) => {
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
    await logAdminAction(req, "FIX_SCENES", { results });
    res.json({ status: "ok", results });
  });

  // Admin: Grant credits to a user
  app.post("/api/admin/grant-credits", express.json(), requireAdmin, async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || !amount) {
        res.status(400).json({ error: "userId and amount required" });
        return;
      }
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      await db!.execute(sql.raw(`UPDATE users SET creditBalance = creditBalance + ${parseInt(amount)} WHERE id = ${parseInt(userId)}`));
      const [rows] = await db!.execute(sql.raw(`SELECT creditBalance FROM users WHERE id = ${parseInt(userId)}`));
      const newBalance = (rows as any)?.[0]?.creditBalance || 0;
      await logAdminAction(req, "GRANT_CREDITS", { targetUserId: userId, amount, newBalance });
      res.json({ status: "ok", userId: parseInt(userId), creditsAdded: parseInt(amount), newBalance });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // Admin: Reset project (delete scenes, update duration, reset status)
  app.post("/api/admin/reset-project", express.json(), requireAdmin, async (req, res) => {
    try {
      const { projectId, duration } = req.body;
      if (!projectId) { res.status(400).json({ error: "projectId required" }); return; }
      const { getDb } = await import("../db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      // Delete all scenes for this project
      await db!.execute(sql.raw(`DELETE FROM scenes WHERE projectId = ${parseInt(projectId)}`));
      // Update duration and reset status
      const dur = duration ? parseInt(duration) : 1;
      await db!.execute(sql.raw(`UPDATE projects SET duration = ${dur}, status = 'draft' WHERE id = ${parseInt(projectId)}`));
      await logAdminAction(req, "RESET_PROJECT", { projectId, duration: dur });
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
      const isAdminTts = ctx.user.role === "admin" || ctx.user.email === process.env.ADMIN_EMAIL;
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
      if (!ttsRes.ok) return res.status(502).json({ error: "TTS generation failed" });
      const buf = Buffer.from(await ttsRes.arrayBuffer());
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", buf.length.toString());
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("X-TTS-Provider", "openai-fallback");
      res.end(buf);
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
    const isAdminDirector = toolCtx.user.role === "admin" || toolCtx.user.email === process.env.ADMIN_EMAIL;
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
  });
}

startServer().catch(console.error);
