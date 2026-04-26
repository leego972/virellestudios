# Virelle Studios Deployment Guide

Canonical deployment reference for Virelle Studios on Railway. For
incident response, monitoring, smoke tests, rollback, and
provider-outage playbooks see **[`RUNBOOK.md`](./RUNBOOK.md)**. For
the security model and threat surface see
**[`SECURITY.md`](./SECURITY.md)**.

---

## Required production environment variables

All variables below must be present in Railway → service → **Variables**
*before* the first deploy. The application validates required vars at
boot and exits non-zero on missing values (`server/_core/env.ts`). A
template lives in `.env.example`.

### Core

| Variable | Notes |
|---|---|
| `NODE_ENV=production` | Toggles prod-only safety checks (cookie flags, error redaction, maintenance-route lockdown). |
| `DATABASE_URL` | Auto-injected by the Railway MySQL plugin. Drizzle ORM consumes it. |
| `REDIS_URL` | Optional but recommended for session and rate-limit storage. App falls back to in-memory if unset. |
| `JWT_SECRET` | 64-char random hex. Generate with `openssl rand -hex 32`. Rotation invalidates all sessions. |
| `SESSION_SECRET` | Used for express-session signing. Same generation rule. |

### Auth / admin

| Variable | Notes |
|---|---|
| `ADMIN_EMAIL` | Bootstrap admin address. Recorded only; admin authority is database-role only (see SECURITY.md). |

### Stripe

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…` on staging). Server-side only. |
| `STRIPE_PUBLISHABLE_KEY` (a.k.a. `VITE_STRIPE_PUBLISHABLE_KEY` at build time) | `pk_live_…` for Stripe.js on the client. |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the live webhook endpoint. Verifies signatures. |
| All active Stripe **price IDs** for subscription tiers and top-up packs (see `shared/subscription.ts` for the canonical list). | Each price id is loaded at boot; checkout fails with a clear error if any required id is missing. |

### AI providers

| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | Optional platform key for OpenAI features (BYOK fallback). |
| `GOOGLE_API_KEY` | Optional platform key for Google AI features. |
| `FAL_KEY` | fal.ai API key. |
| `POLLINATIONS_API_KEY` | Server-side Pollinations key. ⚠️ See RUNBOOK §"Rotate exposed Pollinations keys" — the existing hardcoded fallback rotation pool is publicly exposed via git history and must be rotated before public launch. |
| `RUNWAYML_API_SECRET` *or* `RUNWAY_API_KEY` | Runway ML key (variable name depends on Runway SDK version in use). |
| `HUGGING_FACE_API_KEY` | Hugging Face Inference API key. |
| `VENICE_API_KEY` | Venice.ai key. |
| `TITAN_API_URL` | Base URL for the Titan inference service. |
| `TITAN_API_KEY` | Titan API key. |

### Email

| Variable | Notes |
|---|---|
| `GMAIL_USER` | Gmail address used for outbound transactional mail. |
| `GMAIL_APP_PASSWORD` | App-specific password (not the account password). |
| `EMAIL_FROM` | Display "From:" on transactional emails. |

### Downloads

| Variable | Notes |
|---|---|
| `IOS_DOWNLOAD_URL` | App Store URL surfaced on the download landing page. |
| `ANDROID_DOWNLOAD_URL` | Play Store URL. |
| `DESKTOP_MAC_URL` | macOS desktop binary URL. |
| `DESKTOP_WIN_URL` | Windows desktop binary URL. |
| `DESKTOP_LINUX_URL` | Linux desktop binary URL. |

### Maintenance

| Variable | Notes |
|---|---|
| `ENABLE_MAINTENANCE_ROUTES` | **Must be unset or empty by default.** Only set to `true` for the duration of an approved maintenance window — see [§ Maintenance route procedure](#maintenance-route-procedure). |

### Observability (optional but recommended)

| Variable | Notes |
|---|---|
| `SENTRY_DSN` | Server-side error reporting. |
| `VITE_SENTRY_DSN` | Client-side error reporting (build-time). |

> **Tip — secret hygiene.** Never put any secret in the repository. The
> Security CI job (`.github/workflows/security-ci.yml`) scans every push
> for common secret formats (`sk-`, `sk_`, `xox[bp]-`, `ghp_`,
> `github_pat_`, `AKIA…`, `AIza…`) and fails the build if any unknown
> match is found.

---

## Railway deployment steps

1. **Push to `main`.** Railway auto-deploys on every push.
2. **Confirm Security CI passed** for the new commit
   (GitHub → Actions → Security CI → green ✓).
3. **Confirm Railway deploy starts from latest `main`** — Railway →
   service → Deployments → top entry shows the new SHA.
4. **Confirm required env vars exist** — Railway → service → Variables.
   Cross-check against the tables above. Any missing required var causes
   the boot to fail with a clear error.
5. **Confirm maintenance routes are not enabled** —
   `ENABLE_MAINTENANCE_ROUTES` must be **unset** (not just empty,
   not `false` — *deleted*).
6. **Confirm health endpoint responds** —
   `curl -fsS https://virelle.life/api/health` returns `{"ok":true,…}`.
7. **Run the smoke-test checklist** in
   [`RUNBOOK.md`](./RUNBOOK.md#smoke-test-checklist).

---

## Stripe webhook setup

- **Webhook route:** `/api/stripe/webhook` (server: `server/_core/index.ts`).
- **Must use the raw body parser** — `express.raw({ type: "application/json" })`
  is mounted *only* on this route (currently L142 in
  `server/_core/index.ts`).
- **Do not move the webhook below `express.json`.** The global
  `express.json()` mount at L534 must come *after* the webhook route
  registration. If it is moved before, signature verification breaks
  silently — the body is already parsed and `stripe.webhooks.constructEvent`
  throws "No signatures found matching the expected signature for
  payload."
- **Configure `STRIPE_WEBHOOK_SECRET`** from the Stripe Dashboard →
  Developers → Webhooks → endpoint → **Signing secret**. Update
  Railway → Variables and redeploy.
- **Monitor failed webhooks** — Stripe Dashboard → Webhooks →
  endpoint → "Failures" tab. Alert when any 5xx response is returned by
  the endpoint. Replays of failed events are safe — see SECURITY.md
  §10 (idempotency layers 1 + 2).

Subscribed events at minimum:

- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_intent.succeeded`

---

## Maintenance route procedure

Several `/api/admin/*` routes can mutate billing state directly (grant
credits, revoke subscriptions, fix orphan rows). They are **off by
default** in production and only respond when:

1. `requireAdminExpress` middleware passes (caller is a DB-role admin), AND
2. `ENABLE_MAINTENANCE_ROUTES=true` is set on the Railway service.

### Intended workflow

1. **Set `ENABLE_MAINTENANCE_ROUTES=true`** only during the approved
   maintenance window — Railway → service → Variables → add the var.
2. **Redeploy after setting it** (Railway auto-redeploys on variable
   change; wait for green).
3. **Run the required admin route** from a trusted admin account
   (curl with cookie, or admin UI).
4. **Immediately remove the variable** — Railway → service →
   Variables → delete `ENABLE_MAINTENANCE_ROUTES`. Do not leave it set
   "for next time".
5. **Redeploy again** (auto-triggers on variable removal).
6. **Log what was done** — record the maintenance route called,
   target user/row, before/after values, the maintainer who ran it,
   and the start/end times of the window. Store this log alongside the
   Stripe reconciliation record.

### Audit

Every blocked attempt is logged with `[security] maintenance route
blocked` along with the route, caller userId, and timestamp. Review
these in Railway logs after every maintenance window.

> See SECURITY.md §"Maintenance routes" for the full threat model.

---

## Database backup procedure

Railway's MySQL plugin includes daily automated backups, but you should
also take an on-demand snapshot before any of the following:

- Schema migrations
- Stripe billing reconciliation
- Use of `ENABLE_MAINTENANCE_ROUTES`
- A planned rollback

### On-demand snapshot

1. Railway → MySQL service → **Backups** → **Take snapshot**.
2. Wait for "Backup complete". Note the snapshot id and timestamp.
3. (Recommended) Download the `.sql.gz` to off-site cold storage:

```bash
mysqldump --single-transaction --quick --lock-tables=false \
  -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" \
  | gzip > virelle_$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

---

## Rollback summary

Full step-by-step rollback playbook lives in
[`RUNBOOK.md`](./RUNBOOK.md#rollback-procedure). Short version:

1. Identify the last known-good commit.
2. Redeploy the previous commit in Railway (Deployments → ⋯ → Redeploy)
   OR `git revert <bad-sha> && git push origin main`.
3. Confirm `ENABLE_MAINTENANCE_ROUTES` is unset.
4. Run `/api/health`.
5. Run the smoke-test checklist.
6. Check Stripe webhooks and Sentry.
7. If data corruption is suspected, **stop writes** before restoring a
   DB snapshot.

---

## Architecture notes

- **Frontend:** React + Vite (built to `dist/client/`)
- **Backend:** Express + tRPC (bundled to `dist/index.js`)
- **Database:** MySQL via Drizzle ORM
- **Storage:** S3-compatible storage for file uploads
- **Auth:** JWT-based with Manus OAuth integration
- **Billing:** Stripe (subscriptions + one-shot credit packs)
- **AI providers:** Pollinations (video), OpenRouter (script),
  ElevenLabs (voice), Vast.ai (GPU rendering)
