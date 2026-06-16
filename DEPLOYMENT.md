# Virelle Studios — Deployment Guide

  ## Stack

  | Layer | Technology |
  |---|---|
  | Frontend | React + Vite |
  | Backend | Express 5 + tRPC + Node.js |
  | Database | PostgreSQL (Drizzle ORM) |
  | Cache / Rate limiting | Redis (ioredis) |
  | Payments | Stripe |
  | Error tracking | Sentry |
  | Deployment | Railway |

  ---

  ## Local Development

  ```bash
  # 1. Install dependencies
  npm install

  # 2. Set up environment
  cp .env.example .env
  # Fill in DATABASE_URL, JWT_SECRET, STRIPE_* at minimum

  # 3. Push database schema
  npm run db:push

  # 4. Start dev server (Vite + Express on the same port)
  npm run dev
  ```

  The dev server runs on `http://localhost:3000` by default.

  ---

  ## Production Build

  ```bash
  npm run build
  # → Builds client with Vite into dist/public
  # → Bundles server with esbuild into dist/index.js

  npm run start
  # → Runs dist/index.js (production Node.js server)
  ```

  ---

  ## Railway Deployment

  ### 1. Required Environment Variables

  Set all of these in the Railway project → Variables panel:

  | Variable | Description |
  |---|---|
  | `DATABASE_URL` | PostgreSQL connection string (Railway provides this automatically when you add the Postgres plugin) |
  | `REDIS_URL` | Redis connection string (Railway provides this automatically when you add the Redis plugin) |
  | `JWT_SECRET` | Random 32+ character secret for session signing |
  | `STRIPE_SECRET_KEY` | Stripe secret key (sk_live_... in production) |
  | `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (pk_live_... in production) |
  | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (whsec_...) |
  | `OPENAI_API_KEY` | OpenAI API key (platform fallback) |
  | `GMAIL_USER` | Gmail address for transactional email |
  | `GMAIL_APP_PASSWORD` | Gmail app password |

  See `.env.example` for the full list of optional variables.

  ### 2. Build & Start Commands

  In Railway → Settings → Deploy:

  - **Build command:** `npm run build`
  - **Start command:** `npm run start`

  ### 3. Health Check

  Railway's health check is configured via `railway.toml`. The platform pings:

  ```
  GET /api/health
  ```

  Expected response:
  ```json
  {
    "success": true,
    "status": "ok",
    "service": "virelle-studios",
    "timestamp": "2026-06-16T00:00:00.000Z",
    "environment": "production",
    "uptime": 42,
    "database": "configured"
  }
  ```

  ### 4. Database Migrations

  After each schema change, run migrations in production via Railway's shell:

  ```bash
  npm run db:push
  ```

  **Never run db:push against production without testing on a staging instance first.**

  ---

  ## Stripe Webhook Setup

  1. In the Stripe Dashboard → Webhooks → Add endpoint:
     - URL: `https://virelle.life/api/stripe/webhook`
     - Events to listen for:
       - `checkout.session.completed`
       - `customer.subscription.updated`
       - `customer.subscription.deleted`
       - `invoice.payment_failed`

  2. Copy the Webhook Signing Secret and set it as `STRIPE_WEBHOOK_SECRET` in Railway.

  3. The webhook route is pre-registered and verifies the signature using `stripe.webhooks.constructEvent()`.

  ---

  ## Troubleshooting

  | Problem | Fix |
  |---|---|
  | Blank page after deploy | Check Railway build logs. Ensure `npm run build` completes. Check that `NODE_ENV=production` is set. |
  | 500 on all routes | Check `DATABASE_URL` is set. Run `npm run db:push`. |
  | Stripe checkout fails | Verify `STRIPE_SECRET_KEY` and all price IDs are set in Railway. |
  | Emails not sending | Verify `GMAIL_USER` and `GMAIL_APP_PASSWORD` (must be an App Password, not your Gmail login password). |
  | Redis errors at startup | Add Railway Redis plugin and copy the `REDIS_URL` to Variables. |
  | Login not persisting | Ensure `JWT_SECRET` is set and not changed between deploys. |

  ---

  ## Optional Services

  These are not required for core functionality:

  - **Social publishing** — TikTok, Instagram, YouTube, etc. (set relevant API tokens)
  - **AI generation** — Runway, fal.ai, Google AI, Groq (users supply BYOK keys; platform keys are optional fallbacks)
  - **Google Search Console indexing** — Set `GOOGLE_INDEXING_SA_KEY`
  - **Sentry error tracking** — Set `SENTRY_DSN` if you want production error reports

  Missing optional keys log a warning at startup but do not crash the server.
  