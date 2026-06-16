# Virelle Studios — Environment Variables Reference

  See `.env.example` for a template. This document explains each variable.

  ---

  ## Required — Core

  | Variable | Description |
  |---|---|
  | `NODE_ENV` | `development` or `production` |
  | `PORT` | Server port. Railway sets this automatically. Default: `3000` |
  | `DATABASE_URL` | PostgreSQL connection string. **Required.** App will not start without this. |
  | `REDIS_URL` | Redis connection string. Required for rate limiting and job queues in production. |
  | `JWT_SECRET` | Secret used to sign session tokens. Use a random 32+ character string. Changing this invalidates all active sessions. |

  ---

  ## Required — Stripe (Payments)

  | Variable | Description |
  |---|---|
  | `STRIPE_SECRET_KEY` | Stripe secret key. Server-side only. Never expose to client. Use `sk_test_` in dev, `sk_live_` in production. |
  | `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key. Safe to expose to client. |
  | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`). Used to verify webhook authenticity. |
  | `STRIPE_INDIE_MONTHLY_PRICE_ID` | Stripe price ID for Indie monthly plan (AUD) |
  | `STRIPE_INDIE_ANNUAL_PRICE_ID` | Stripe price ID for Indie annual plan (AUD) |
  | `STRIPE_CREATOR_MONTHLY_PRICE_ID` | Stripe price ID for Creator monthly plan (AUD) |
  | `STRIPE_CREATOR_ANNUAL_PRICE_ID` | Stripe price ID for Creator annual plan (AUD) |
  | `STRIPE_STUDIO_MONTHLY_PRICE_ID` | Stripe price ID for Studio monthly plan (AUD) |
  | `STRIPE_STUDIO_ANNUAL_PRICE_ID` | Stripe price ID for Studio annual plan (AUD) |
  | `STRIPE_TOPUP_10_PRICE_ID` | Credit top-up pack price ID (500 credits) |
  | `STRIPE_TOPUP_30_PRICE_ID` | Credit top-up pack price ID (1,500 credits) |
  | `STRIPE_TOPUP_100_PRICE_ID` | Credit top-up pack price ID (3,000 credits) |

  > Create price objects in the Stripe Dashboard → Products before deploying to production.

  ---

  ## Required — Email

  | Variable | Description |
  |---|---|
  | `GMAIL_USER` | Gmail address used for transactional email |
  | `GMAIL_APP_PASSWORD` | Gmail App Password (not your login password — generate in Google Account Security) |
  | `EMAIL_FROM` | From address shown to recipients. Defaults to `studiosvirelle@gmail.com` |

  ---

  ## Optional — AI Generation Providers

  These are platform-level fallback keys. Users can supply their own keys via Settings (BYOK).

  | Variable | Description |
  |---|---|
  | `OPENAI_API_KEY` | OpenAI API key (Director AI, script generation, LLM) |
  | `RUNWAY_API_KEY` | Runway ML API key (video generation) |
  | `FAL_KEY` | fal.ai API key (image and video generation) |
  | `GOOGLE_API_KEY` | Google AI API key (Veo 3, Gemini Imagen) |
  | `HUGGING_FACE_API_KEY` | Hugging Face key (FLUX.1-dev image fallback) |
  | `GROQ_API_KEY` | Groq API key (fast LLM — Llama 3.3 70B) |

  Missing optional AI keys disable platform-level generation for that provider. Users can still use their own keys.

  ---

  ## Optional — Storage

  | Variable | Description |
  |---|---|
  | `AWS_REGION` | AWS region for S3 bucket |
  | `AWS_ACCESS_KEY_ID` | AWS access key |
  | `AWS_SECRET_ACCESS_KEY` | AWS secret key |
  | `AWS_S3_BUCKET` | S3 bucket name for user media uploads |

  ---

  ## Optional — Social Publishing

  Only required if using autonomous social media publishing features.

  `YOUTUBE_API_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `META_ACCESS_TOKEN`, `X_API_KEY`, `X_API_SECRET`, `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `TELEGRAM_BOT_TOKEN`, `LINKEDIN_ACCESS_TOKEN`, `SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET`

  ---

  ## Security Rules

  - **Never commit `.env` to version control.** Only `.env.example` should be committed.
  - `STRIPE_SECRET_KEY`, `JWT_SECRET`, `GMAIL_APP_PASSWORD` are server-side only. They must never appear in client-side code or be exposed in API responses.
  - `STRIPE_PUBLISHABLE_KEY` is the only Stripe key safe to send to the client.
  - Rotating `JWT_SECRET` invalidates all active user sessions immediately.
  - Use Railway's Variables panel to manage secrets in production — never hardcode them.

  ---

  ## Local Development Setup

  ```bash
  cp .env.example .env
  # Edit .env with your values

  npm install
  npm run db:push   # Initialize database schema
  npm run dev       # Start dev server on http://localhost:3000
  ```

  Minimum variables needed to run locally:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + at least one price ID (for payments to work)

  The app will start without most optional keys — missing AI keys just disable those generation providers.
  