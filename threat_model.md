# Threat Model — Virelle Studios

## Project Overview

Virelle Studios (`virelle.life`, `virellestudios-production.up.railway.app`) is
a Node.js + Express + tRPC + React/Vite + MySQL (Drizzle) AI film production
platform. Users upload reference photos, generate cinematic scenes, voices,
and videos via OpenAI / Pollinations / Runway / ElevenLabs / Replicate, manage
projects, and pay for credits via Stripe Checkout. Deployment is GitHub
(`leego972/virellestudios`) → Railway (Docker) on every push to `main`. Auth
is custom JWT (HS256, signed with `JWT_SECRET`, stored in an `auth_token`
cookie + Authorization header) plus an OAuth bridge (`OAUTH_SERVER_URL` /
Manus). Roles are `user` and `admin`.

## Assets

- **User accounts and sessions** — email, bcrypt password hash, JWT auth
  cookie. Compromise allows full impersonation including spending the user's
  credit balance and reading their projects.
- **Project content** — script text, reference photos, generated images and
  videos, character bios, voice clones, designer wardrobe data. Often the
  user's pre-release creative IP. Leakage = direct creative damage.
- **Credit balance and Stripe state** — `users.credits`, `stripeCustomerId`,
  subscription tier, BYOK fallback flags. Tampering allows free generations
  or refund fraud.
- **Provider API keys (server-side)** — `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `ELEVENLABS_API_KEY`, `REPLICATE_API_TOKEN`,
  `RUNWAY_API_KEY`, `POLLINATIONS_API_KEY`, `JWT_SECRET`, `DATABASE_URL`.
  Compromise of `STRIPE_SECRET_KEY` allows arbitrary charges; compromise of
  `JWT_SECRET` allows minting valid sessions for any user.
- **User BYOK keys** — per-user provider keys stored in `user_byok_keys`.
  Leakage exposes individual users' upstream provider quotas / billing.
- **Funding sources catalog** — public reference data, but tampering would
  redirect filmmakers to fraudulent funding sites. Treat write paths as
  admin-only.
- **Admin tooling** — `/api/admin/migrate`, `/api/admin/fix-scenes`,
  `/api/admin/grant-credits`, `/api/admin/reset-project`, plus tRPC
  `adminProcedure` routers (users, growth, security). Direct DB write power.

## Trust Boundaries

- **Browser → API** — every client request crosses this boundary. Only
  `/api/health`, `/api/mobile/features`, `/api/mobile/downloads`,
  `/api/ical/:projectId.ics`, the Stripe webhook, and the public marketing
  pages are reachable without a session. Everything else MUST validate the
  JWT cookie or Authorization header server-side.
- **API → MySQL** — Drizzle ORM with parameterised statements. No raw string
  concatenation into SQL is permitted.
- **API → Stripe** — outbound calls use `STRIPE_SECRET_KEY`. Inbound webhook
  at `POST /api/stripe/webhook` is the only Stripe trust ingress and MUST
  verify `stripe-signature` against `STRIPE_WEBHOOK_SECRET` before mutating
  state.
- **API → AI providers** — OpenAI, Pollinations, Runway, ElevenLabs,
  Replicate, Anthropic. All keys live server-side in `ENV` (see `env.ts`); no
  hardcoded fallbacks are permitted.
- **User vs Admin** — `user.role === "admin"` is the only privilege gate.
  Enforced server-side by `adminProcedure` (tRPC) and `requireAdminExpress`
  (Express). Frontend role checks are cosmetic and untrusted.
- **Production vs Development** — `NODE_ENV=production` triggers the
  `JWT_SECRET` hard-fail in `context.ts` and disables the Stripe webhook
  "parse without signature" dev fallback in `index.ts:142–146`.

## Scan Anchors

- Production entry point: `server/_core/index.ts` (Express bootstrap, route
  mounts, middleware order).
- Auth + admin guards: `server/_core/context.ts` (`createContext`,
  `adminProcedure`, `requireAdminExpress`).
- Env / secrets surface: `server/_core/env.ts` (every secret MUST resolve
  via `process.env.* ?? ""`, never a literal).
- Stripe webhook (raw body, signature verified BEFORE any json parser):
  `server/_core/index.ts:131–158`.
- Direct admin REST routes (all behind `requireAdminExpress`):
  `server/_core/index.ts:635, 646, 671, 693`.
- tRPC admin routers: `server/routers.ts` — every admin-only procedure MUST
  use `adminProcedure`, never `protectedProcedure`.
- Rate limiters: `server/_core/index.ts:713–724` (per-route on auth + heavy
  generation, global 200/min cap on `/api/`).
- Funding seed (idempotent, INSERT IGNORE only): `server/_core/autoMigrate.ts`
  Steps 7 + 8, plus `server/_core/fundingSourcesV678.ts`.
- Object storage / file upload surfaces: `/api/voice/upload`,
  `/api/voice/tts`, character photo upload tRPC procedures.
- Dev-only and untouched by security review: any file under `client/src/`
  that only renders the marketing site, the logo, the opener video, or the
  watermark. These have no security surface.

## Threat Categories

### Spoofing

- **Session forgery.** All authenticated routes MUST validate the `auth_token`
  cookie (or `Authorization: Bearer …` header) via `verifyJWT` and load the
  user from the DB before honouring the request. `JWT_SECRET` MUST be set
  under `NODE_ENV=production` — `context.ts` throws on boot if it isn't, and
  this hard-fail MUST stay.
- **Stripe webhook spoofing.** `POST /api/stripe/webhook` MUST call
  `stripe.webhooks.constructEvent(req.body, sig, ENV.stripeWebhookSecret)`
  with the raw request body. The dev fallback that parses without signature
  (`index.ts:144–146`) MUST remain gated on `ENV.stripeWebhookSecret` being
  empty and MUST never be reached in production (production env always sets
  the secret).
- **Mobile / SSO bridge.** OAuth callbacks via `OAUTH_SERVER_URL` MUST
  validate state and origin; tokens minted from third-party identity MUST
  be re-signed with the local `JWT_SECRET` before being trusted as session
  cookies.

### Tampering

- **Credit balance.** `users.credits` MUST only be mutated server-side, by
  the Stripe webhook handler (after signature verification) or by an admin
  via `/api/admin/grant-credits`. Generation handlers MUST debit credits
  inside the same transaction as the generation request.
- **Project ownership.** Every `projects.*`, `scenes.*`, `characters.*`,
  `wardrobe.*`, `voices.*` mutation MUST filter by `userId === ctx.user.id`
  server-side. Never trust a `userId` field from the client body.
- **Funding sources.** `funding_sources` is seeded via `INSERT IGNORE` only.
  No public-facing endpoint MUST be allowed to write to this table; admin
  procedures only.
- **Drizzle queries.** All queries MUST use Drizzle's parameterised
  builders. Raw SQL via `db.execute(sql\`…\`)` MUST only interpolate values
  through the `sql` tagged template, never via string concatenation.

### Repudiation

- **Admin actions.** `grant-credits`, `reset-project`, `migrate`, and
  `fix-scenes` SHOULD log the acting `ctx.user.id`, target ID, timestamp,
  and a server-generated request ID. The existing `logger` already captures
  per-request context — admin routers MUST emit at least one INFO line per
  successful mutation.
- **Stripe events.** Every received webhook event MUST be logged with its
  `event.id` and `event.type` so reconciliation against Stripe's dashboard
  is possible.

### Information Disclosure

- **Provider keys.** Server-side keys MUST stay server-side. No
  `process.env.*_API_KEY` reference may appear in `client/`. `env.ts` MUST
  never contain a hardcoded key fallback (the recently fixed
  `pollinationsApiKey: process.env.POLLINATIONS_API_KEY ?? ""` is the
  canonical pattern).
- **PII in logs.** Logger MUST NOT log raw passwords, JWT tokens, Stripe
  secrets, or full credit-card data. Stripe webhook logs MUST log only
  `event.id`, `event.type`, and resolved `userId`.
- **Cross-user reads.** `projects.list`, `scenes.get`, `voices.list`, and
  every other read procedure MUST scope by `ctx.user.id` server-side.
- **Error responses.** Production responses MUST NOT include stack traces
  or raw DB error strings — tRPC `errorFormatter` already redacts these and
  Express `app.use((err, req, res, next) => …)` MUST keep doing so.

### Denial of Service

- **Public-route abuse.** `/api/trpc/auth.login`, `auth.register`,
  `auth.requestPasswordReset` are rate-limited per IP at
  `index.ts:713–715`. Generation endpoints (`generation.quickGenerate`,
  `character.aiGenerate*`, `director.sendMessage`) are rate-limited at
  `index.ts:718–721`. The global `/api/` cap of 200/min/IP at line 724
  catches everything else, including the admin routes — keep both layers
  in place.
- **Body parsing before auth.** Admin routes that accept a JSON body
  (`grant-credits`, `reset-project`) mount `requireAdminExpress` BEFORE
  `express.json()` so unauthenticated callers cannot make the server parse
  large bodies. Never reorder these.
- **Stripe webhook ordering.** `POST /api/stripe/webhook` with
  `express.raw()` MUST stay registered BEFORE the global `express.json()`
  parser — otherwise signature verification breaks because the body is
  consumed.
- **AI provider timeouts.** Every outbound call to OpenAI / Pollinations /
  Runway / ElevenLabs / Replicate MUST set a finite timeout. Long-running
  generations MUST run async (job queue or director stream), never block
  an HTTP request thread indefinitely.

### Elevation of Privilege

- **Admin-only routes.** Every direct (non-tRPC) admin route MUST use
  `requireAdminExpress` from `server/_core/context.ts`. Every tRPC
  admin-only procedure MUST use `adminProcedure`, never `protectedProcedure`.
  Inline ad-hoc role checks are forbidden — they drift.
- **IDOR.** Procedures that take a project/scene/character/voice id MUST
  re-load the row by id AND `userId` in a single query, or load by id then
  reject if `row.userId !== ctx.user.id`. Never trust that the client only
  asks about its own resources.
- **File uploads.** `/api/voice/upload` and character photo uploads MUST
  validate MIME type and size, MUST store under a per-user prefix in object
  storage, and MUST NOT echo the upload path back to other users.
- **SQL / command / template injection.** Drizzle parameterisation
  everywhere; no `child_process.exec` with user input; no
  `eval`/`Function` from request data; no template engine receiving raw
  user input as a template (only as data).
- **Path traversal.** Any filesystem path built from a request value (e.g.
  `/api/voice/temp/:id`) MUST normalise + reject `..` segments and confine
  the resolved path to a fixed base directory.

### Cryptographic Failures (cross-cutting)

- `JWT_SECRET` MUST be a random ≥32-byte secret. Production hard-fail in
  `context.ts` MUST stay.
- Passwords MUST be hashed with bcrypt (existing implementation). MD5 /
  SHA1 / plaintext storage is forbidden.
- HTTPS is terminated by Railway and Cloudflare/GoDaddy DNS — application
  code MUST NOT downgrade or proxy traffic over plain HTTP.
- The hardened security headers middleware (`server/_core/securityHeaders.ts`,
  mounted at `index.ts:128`) provides CSP, HSTS, X-Frame-Options, and
  Permissions-Policy on every response. MUST stay mounted before route
  handlers.

## Required Guarantees Summary

1. `JWT_SECRET` is set in production and `context.ts` throws on boot if not.
2. Every admin endpoint (Express + tRPC) is gated by `requireAdminExpress`
   or `adminProcedure`. No inline `req.user.role === "admin"` checks.
3. Auth middleware runs BEFORE `express.json()` on every admin route that
   accepts a JSON body.
4. Stripe webhook keeps `express.raw()` ordering and signature verification.
5. `env.ts` never contains a hardcoded fallback for any provider secret.
6. Every per-user resource read/write filters by `ctx.user.id` server-side.
7. Funding sources are seeded with `INSERT IGNORE` only — never UPDATE or
   DELETE existing rows from the seed code.
8. Rate limiting stays on the auth, generation, and global `/api/` paths.
9. The hardened security-headers middleware stays mounted at the top of the
   middleware chain.
10. Logo / opener / StudioOpener / watermark / branding / export-watermark /
    homepage hero / Designer Wardrobe assets are out of scope for security
    review — they have no security surface and MUST NOT be modified by
    security work.
