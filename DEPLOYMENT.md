# Virelle Studios — Deployment Guide

This document is the canonical deployment reference for Virelle Studios on
Railway. For incident response, monitoring, smoke tests, rollback, and
provider-outage playbooks see **[`RUNBOOK.md`](./RUNBOOK.md)**. For the
security model and threat surface see **[`SECURITY.md`](./SECURITY.md)**.

---

## 1. Prerequisites

- A [Railway](https://railway.app) account with billing enabled
- Push access to `leego972/virellestudios` on GitHub
- Access to GoDaddy DNS for the `virelle.life` domain
- A Stripe account in **Live** mode (Test mode for staging)
- Pollinations, OpenRouter, ElevenLabs, and Vast.ai accounts for AI providers

---

## 2. Required Environment Variables

All variables below must be present in Railway → service → **Variables**
*before* the first deploy. The application validates required vars at boot
and exits non-zero on missing values (see `server/_core/env.ts`).

### Core platform

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | yes (`production`) | Toggles prod-only safety checks (cookie flags, error redaction, maintenance-route lockdown). |
| `PORT` | auto | Railway injects this — the app reads it; do not hardcode. |
| `DATABASE_URL` | yes | Auto-injected by the Railway MySQL plugin. Drizzle ORM consumes it. |
| `JWT_SECRET` | yes | 64-char random hex. Generate with `openssl rand -hex 32`. Rotation invalidates all sessions. |
| `SESSION_SECRET` | yes | Used for express-session signing. Same generation rule. |

### OAuth / login

| Variable | Required | Purpose |
|---|---|---|
| `OAUTH_SERVER_URL` | yes | Base URL of the Manus OAuth provider. |
| `VITE_APP_ID` | yes (build-time) | Manus OAuth application ID. Baked into the client bundle. |
| `VITE_OAUTH_PORTAL_URL` | yes (build-time) | Manus login portal URL. Baked into the client bundle. |

> Both `VITE_*` vars must be set **at build time** (Railway exposes them to
> the build container automatically when set on the service).

### Stripe billing

| Variable | Required | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_live_…` (or `sk_test_…` on staging). Server-side only. |
| `STRIPE_WEBHOOK_SECRET` | yes | `whsec_…` from the live webhook endpoint. Verifies signatures. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | yes (build-time) | `pk_live_…` for Stripe.js on the client. |

### AI providers (server-side)

| Variable | Required | Purpose |
|---|---|---|
| `POLLINATIONS_API_KEY` | recommended | Server-side Pollinations key. Falls back to a hardcoded rotation pool — see RUNBOOK §"Rotate exposed Pollinations keys" for the rotation requirement. |
| `OPENROUTER_API_KEY` | yes (script gen) | Required for AI script generation. |
| `ELEVENLABS_API_KEY` | yes (voice) | Required for voice synthesis. |
| `VAST_API_KEY` | yes (GPU) | Vast.ai API token. Already set in the current environment. |
| `VAST_SSH_HOST`, `VAST_SSH_PORT`, `VAST_SSH_USER`, `VAST_SSH_KEY` | optional | Direct SSH into Vast workers for debugging. Set only if you need worker shell access. |

### Storage

| Variable | Required | Purpose |
|---|---|---|
| `S3_ENDPOINT` | yes | S3-compatible storage endpoint. |
| `S3_BUCKET` | yes | Bucket name. |
| `S3_ACCESS_KEY_ID` | yes | IAM user access key. |
| `S3_SECRET_ACCESS_KEY` | yes | IAM user secret. |
| `S3_REGION` | yes | Region (e.g. `us-east-1`). |
| `MAX_STORAGE_OBJECT_BYTES` | optional | Defensive cap on any single uploaded object (default 256 MB — see SECURITY.md §11). |

### Maintenance / admin (DO NOT leave on)

| Variable | Required | Purpose |
|---|---|---|
| `ENABLE_MAINTENANCE_ROUTES` | **never permanently** | Gates one-shot DB-fix routes. See [Section 5](#5-admin-maintenance-route-procedure). |

### Observability (optional but recommended)

| Variable | Required | Purpose |
|---|---|---|
| `SENTRY_DSN` | recommended | Server-side error reporting. |
| `VITE_SENTRY_DSN` | recommended | Client-side error reporting. |

> **Tip — secret hygiene.** Never put any secret in the repository. The
> Security CI job (`.github/workflows/security-ci.yml`) scans every push for
> common secret formats (`sk-`, `sk_`, `xox[bp]-`, `ghp_`, `github_pat_`,
> `AKIA…`, `AIza…`) and fails the build if any unknown match is found.

---

## 3. Railway Deployment Steps

1. Sign in to [railway.app](https://railway.app).
2. **New Project → Deploy from GitHub repo** → select `leego972/virellestudios`.
3. Railway auto-detects the `Dockerfile` and `railway.toml`.
4. **New → Database → MySQL** (or PostgreSQL if the driver is switched).
   `DATABASE_URL` is auto-injected.
5. Open the service **Variables** tab and paste in every variable from
   [Section 2](#2-required-environment-variables) above.
6. Trigger the first deploy. Railway will rebuild on every push to `main`.
7. Once green, Railway exposes a default URL such as
   `virellestudios-production.up.railway.app`.

For the `virelle.life` custom-domain setup (Cloudflare proxy + GoDaddy
nameserver swap, GoDaddy A-record fallback, GoDaddy domain forwarding), see
the original instructions kept in **`DEPLOYMENT_DOMAINS.md`** (legacy DNS
setup notes) — they have not changed since v6.0.

---

## 4. Stripe Webhook Setup

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://virelle.life/api/stripe/webhook`.
3. Listen for at least these events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
4. Copy the **Signing secret** (`whsec_…`) into Railway as
   `STRIPE_WEBHOOK_SECRET`. Restart the service.
5. Use Stripe Dashboard → **Send test webhook** for each event type and
   verify in Railway logs that:
   - Signature verification passes.
   - The event is recorded in `stripe_webhook_events` (claimed exactly once).
   - For `invoice.paid`, the credit grant fires exactly once even on retry.

> **Idempotency layers** (see SECURITY.md §10):
>
> 1. `stripe_webhook_events` table with `UNIQUE(stripeEventId)` blocks
>    duplicate event ids at the database level.
> 2. `invoice.paid` additionally checks
>    `hasStripeInvoiceBeenCredited(invoice.id, event.id)` so a re-fired
>    invoice with a fresh event id does not double-credit.
>
> Stripe's "Resend" button is therefore safe.

---

## 5. Admin Maintenance Route Procedure

Several `/api/admin/*` routes can mutate billing state directly (grant
credits, revoke subscriptions, force-promote admins, fix orphan rows).
They are **off by default** in production and only respond when:

1. `requireAdminExpress` middleware passes (caller is a DB-role admin), AND
2. `ENABLE_MAINTENANCE_ROUTES=true` is set on the Railway service.

### Intended workflow

1. Railway → service → **Variables** → add `ENABLE_MAINTENANCE_ROUTES=true`.
2. Wait for the rolling restart to complete (~30 s).
3. Make exactly the maintenance call you need from a trusted admin
   account (curl with cookie, or admin UI).
4. Railway → service → **Variables** → **Delete** `ENABLE_MAINTENANCE_ROUTES`.
5. Wait for the second rolling restart. Verify the route now returns
   `503 maintenance routes disabled`.

### Audit

Every blocked attempt is logged with `[security] maintenance route blocked`
along with the route, caller userId, and timestamp. Review these in Railway
logs after every maintenance window.

> See SECURITY.md §"Maintenance routes" for the full threat model.

---

## 6. Database Backup Procedure

Railway's MySQL plugin includes daily automated backups, but you should
also take an on-demand snapshot before any of the following:

- Schema migrations
- Stripe billing reconciliation
- Use of `ENABLE_MAINTENANCE_ROUTES`
- A planned rollback

### On-demand backup

1. Railway → MySQL service → **Backups** → **Take snapshot**.
2. Wait for "Backup complete". Note the snapshot id and timestamp.
3. (Recommended) Download the `.sql.gz` to off-site cold storage:

```bash
mysqldump --single-transaction --quick --lock-tables=false \
  -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  | gzip > virelle_$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

### Restore (in disaster recovery only)

1. Stop the application (Railway → service → **Settings → Stop**).
2. Railway MySQL → **Backups → Restore from snapshot**, OR import the
   off-site `.sql.gz` into a fresh MySQL instance.
3. Verify `users`, `subscriptions`, `stripe_webhook_events`, and
   `billing_actions` row counts against pre-disaster expectations.
4. Restart the application.
5. Run the smoke-test checklist in [`RUNBOOK.md`](./RUNBOOK.md).

---

## 7. Rollback Procedure

See [`RUNBOOK.md`](./RUNBOOK.md#rollback-plan) for the full step-by-step
rollback playbook. The summary:

1. Identify the last known-good commit (Railway → **Deployments** → find
   the previous green deploy; or `git log --oneline` on `main`).
2. `git revert` the bad commit(s) and push, OR Railway → **Deployments
   → Redeploy** on the prior green deploy.
3. **Always disable `ENABLE_MAINTENANCE_ROUTES`** before redeploying.
4. If a leaked secret triggered the rollback, rotate it before redeploying.
5. Verify migrations are backwards-compatible. If not, restore the DB
   snapshot taken before the bad deploy.
6. Run the smoke-test checklist.

---

## 8. Verifying Production After Deploy

Run the full smoke-test checklist in
[`RUNBOOK.md`](./RUNBOOK.md#smoke-test-checklist) after every deploy. The
short version:

```bash
# 1. Health check
curl -fsS https://virelle.life/api/health
# Expect: { "ok": true, ... }

# 2. Static assets reachable
curl -fsSI https://virelle.life/ | head -1
# Expect: HTTP/2 200

# 3. tRPC reachable (auth-required endpoint should 401, not 5xx)
curl -fsSI https://virelle.life/api/trpc/auth.me | head -1
# Expect: 401 (auth required), NOT 500
```

If any of those fail, see the corresponding incident playbook in
[`RUNBOOK.md`](./RUNBOOK.md#incident-playbooks).

---

## 9. Architecture Notes

- **Frontend:** React + Vite (built to `dist/client/`)
- **Backend:** Express + tRPC (bundled to `dist/index.js`)
- **Database:** MySQL via Drizzle ORM
- **Storage:** S3-compatible storage for file uploads
- **Auth:** JWT-based with Manus OAuth integration
- **Billing:** Stripe (subscriptions + one-shot credit packs)
- **AI providers:** Pollinations (video), OpenRouter (script), ElevenLabs
  (voice), Vast.ai (GPU rendering)
