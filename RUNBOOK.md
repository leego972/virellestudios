# Virelle Studios — Operations Runbook

Practical playbooks for everyday operation, incident response, and launch
readiness. For *deployment* (Railway setup, env vars, Stripe wiring) see
[`DEPLOYMENT.md`](./DEPLOYMENT.md). For the security model see
[`SECURITY.md`](./SECURITY.md). Older general procedures (log rotation,
disaster-recovery RTO/RPO targets) remain in
[`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md).

---

## Table of Contents

1. [Smoke Test Checklist](#smoke-test-checklist)
2. [Monitoring & Alerting Checklist](#monitoring--alerting-checklist)
3. [Rollback Plan](#rollback-plan)
4. [Incident Playbooks](#incident-playbooks)
   - [Login broken](#login-broken)
   - [Stripe webhook broken](#stripe-webhook-broken)
   - [AI provider keys fail](#ai-provider-keys-fail)
   - [Database corruption suspected](#database-corruption-suspected)
5. [Routine Maintenance](#routine-maintenance)
6. [Known Launch Risks](#known-launch-risks)

---

## Smoke Test Checklist

Run this checklist after **every** production deploy and after every
rollback. All steps should pass before declaring the deploy healthy.

| # | Check | How to verify | Pass |
|---|---|---|:---:|
| 1 | **Health endpoint** | `curl -fsS https://virelle.life/api/health` returns `{ ok: true, ... }` and HTTP 200. | ☐ |
| 2 | **Static assets** | `curl -fsSI https://virelle.life/` returns HTTP 200, `Content-Type: text/html`. | ☐ |
| 3 | **Login (existing user)** | Open `https://virelle.life/login`, complete OAuth, land on `/dashboard`. Cookie set with `Secure; HttpOnly; SameSite=Lax`. | ☐ |
| 4 | **Signup (new user)** | Use a fresh email, complete OAuth signup, land on onboarding. Verify a row exists in `users` with `role='user'`. | ☐ |
| 5 | **Create project** | From the dashboard, create a new project. Verify a row exists in `projects` for the test user. | ☐ |
| 6 | **Generate small test asset** | Generate a 1-frame test image (lowest credit cost). Verify the asset URL is reachable and stored. | ☐ |
| 7 | **Credit deduction** | Before/after the generation in step 6, query `users.credits` for the test user. Difference must equal the documented credit cost. | ☐ |
| 8 | **Stripe test webhook** | From Stripe Dashboard → Webhooks → endpoint → **Send test event** → `invoice.paid`. Verify Railway logs show signature OK + idempotent claim + (for new event id) credit grant. | ☐ |
| 9 | **Admin route denied for normal user** | `curl -i -b "<normal-user-cookie>" https://virelle.life/api/admin/users` returns **403**. | ☐ |
| 10 | **Admin route allowed for admin** | Same call with an admin cookie returns **200** (or **503** if `ENABLE_MAINTENANCE_ROUTES` is intentionally off — that's still a pass). | ☐ |
| 11 | **Upload test** | From the UI, upload a small (~100 KB) PNG. Verify object exists in S3 and URL is fetchable. | ☐ |
| 12 | **Download test** | Download the asset uploaded in step 11. Bytes must match. | ☐ |

If **any** step fails, halt the deploy verification and consult the
[Incident Playbooks](#incident-playbooks).

---

## Monitoring & Alerting Checklist

Confirm each of the following monitors is wired up. Re-check quarterly
or after any infrastructure change.

| Monitor | Where | Alert when | Pass |
|---|---|---|:---:|
| **Railway logs streaming** | Railway → service → Logs | Continuous tail; no gaps > 5 min during business hours. | ☐ |
| **Uptime ping** | UptimeRobot / Better Uptime / Pingdom | `GET https://virelle.life/api/health` fails for 2 consecutive minutes. | ☐ |
| **Sentry — server errors** | Sentry project (DSN in `SENTRY_DSN`) | New issue OR rate > 10 events/min. | ☐ |
| **Sentry — client errors** | Sentry project (DSN in `VITE_SENTRY_DSN`) | New issue OR rate > 20 events/min. | ☐ |
| **Stripe — failed webhooks** | Stripe Dashboard → Webhooks → endpoint → "Failures" | Any 5xx response from our endpoint, OR `≥3` consecutive non-2xx. | ☐ |
| **Database backup health** | Railway → MySQL → Backups | Last successful backup older than 26 h. | ☐ |
| **Disk / storage usage** | Railway service metrics | Service disk > 80%. S3 bucket size growth > 2× weekly baseline. | ☐ |
| **AI provider failures** | App logs (Sentry breadcrumb tag `provider`) | `≥10` Pollinations / OpenRouter / ElevenLabs / Vast.ai 4xx-5xx in 5 min. | ☐ |
| **Security CI failure** | GitHub Actions → Security CI workflow | Any failure on `main`. (GitHub emails go to commit author by default — confirm this is monitored.) | ☐ |

> **Pager rotation** — at minimum the Stripe-webhook and uptime alerts
> should page someone 24/7. Sentry and Security-CI failures can be
> business-hours.

---

## Rollback Plan

A staged playbook. Steps 1–3 are typical; steps 4–7 are conditional.

### 1. Identify the last known-good commit

```bash
# Show recent deploy history
git log --oneline -10 origin/main

# Or in Railway: service → Deployments — find the previous deploy
# whose status is "Active" / green.
```

Pick the SHA of the last green deploy. Confirm it precedes the suspected
bad change.

### 2. Redeploy the previous commit

**Option A — Railway "Redeploy" (fastest, no git history change):**

1. Railway → service → **Deployments**.
2. Find the prior green deploy.
3. Click **⋯ → Redeploy**.
4. Wait for green. Run the [smoke-test checklist](#smoke-test-checklist).

**Option B — `git revert` (preferred when you want history):**

```bash
git revert <bad-sha>           # creates a revert commit
git push origin main            # Railway picks it up automatically
```

### 3. Disable maintenance routes

If the bad deploy left `ENABLE_MAINTENANCE_ROUTES=true` set:

1. Railway → service → **Variables** → delete `ENABLE_MAINTENANCE_ROUTES`.
2. Wait for the rolling restart.
3. Verify a maintenance route returns `503` to confirm it's off.

### 4. Rotate exposed secrets (conditional)

If the rollback was triggered by a leaked or suspected-leaked secret
(Stripe key, JWT secret, AI provider key, S3 credentials):

1. Generate a new value in the provider dashboard.
2. Update Railway → **Variables** with the new value.
3. Revoke the old value in the provider dashboard.
4. (For `JWT_SECRET` / `SESSION_SECRET`) all sessions are invalidated —
   announce the forced re-login.

### 5. Verify migrations are backwards-compatible

If the bad deploy applied a schema migration:

```bash
# List recent migrations applied
ls server/migrations/ | tail -5

# Inspect each for breaking changes (column drops, type narrowings,
# NOT-NULL additions to populated columns)
```

If the migration is **not** backwards-compatible, the simple rollback
will fail. Skip to step 6 (restore backup) instead.

### 6. Restore database backup (only if data corruption is confirmed)

1. Stop the application: Railway → service → **Settings → Stop**.
2. Railway → MySQL → **Backups → Restore from snapshot** (use the
   snapshot taken immediately before the bad deploy).
3. Verify `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM subscriptions;`
   match pre-disaster numbers.
4. Restart the application.

### 7. Run smoke tests

Run the full [smoke-test checklist](#smoke-test-checklist). All 12
steps must pass before declaring the rollback complete.

---

## Incident Playbooks

### Login broken

**Symptom:** users get 401/500 on `/login`, OAuth callback errors,
existing sessions evicted.

**Triage in order:**

1. **Check the health endpoint** —
   `curl -fsS https://virelle.life/api/health` — confirms the service is
   running at all.
2. **Check Railway logs** for `[auth]` or `[oauth]` errors. Common
   causes:
   - `JWT_SECRET` missing → app exits at boot. Set it and restart.
   - `JWT_SECRET` rotated → all sessions invalid; expected if you just
     rotated. Announce forced re-login.
   - `OAUTH_SERVER_URL` wrong / unreachable → curl it from a Railway
     shell to confirm.
3. **Check Manus OAuth provider status** — try a manual login flow with
   curl/browser dev tools. If the provider is down, post a status
   update; we cannot self-mitigate.
4. **Check the `users` table** for the affected user. If the row is
   missing or has `role='disabled'`, that's the issue.
5. **Check cookie flags in the browser** — under HTTPS the cookie must
   be `Secure; HttpOnly; SameSite=Lax`. If `Secure` is missing the
   browser will reject it.

**Mitigation:** if `JWT_SECRET` is the cause, restoring the previous
value re-validates outstanding sessions. Otherwise, treat as critical
and roll back per [Rollback Plan](#rollback-plan).

### Stripe webhook broken

**Symptom:** Stripe Dashboard → Webhooks → endpoint shows red /
"Failures". Users complete checkout but credits are not granted.

**Triage in order:**

1. Stripe Dashboard → **Webhooks → endpoint → recent deliveries**.
   Note the HTTP status returned by `/api/stripe/webhook`.
   - **400 "signature verification failed"** → `STRIPE_WEBHOOK_SECRET`
     is wrong or stale. Copy the **Signing secret** from Stripe again
     and update Railway → Variables. Restart the service.
   - **500** → see Railway logs. Most common: DB connection pool
     exhausted, or the `stripe_webhook_events` table missing (the
     auto-migration should create it; if not, run the migration
     manually via maintenance route).
   - **404** → URL changed. Confirm the endpoint URL in Stripe matches
     `https://virelle.life/api/stripe/webhook`.
   - **5xx with timeout** → app is unhealthy, run the smoke checklist.
2. **Replay missed events:** Stripe Dashboard → Webhook → recent
   deliveries → click each red row → **Resend**. Idempotency layers
   (see SECURITY.md §10) make this safe; duplicates are silently
   no-op'd.
3. **Verify credit grant after replay:** for each affected user, query
   `SELECT credits, lastResetAt FROM users WHERE id = ?` and confirm
   the expected delta. Cross-check `billing_actions` for a
   `creditGrant` audit row tagged with the original event id.

**Mitigation:** the idempotency design (Layer 1 = `stripe_webhook_events`
unique index, Layer 2 = `hasStripeInvoiceBeenCredited`) makes "resend
all failed deliveries" the standard recovery action. Do **not** grant
credits manually unless replay also fails.

### AI provider keys fail

**Symptom:** generations return 401/403, "invalid API key" in logs,
or all generations time out.

**Per provider:**

| Provider | Env var | Where to verify | Where to rotate |
|---|---|---|---|
| Pollinations | `POLLINATIONS_API_KEY` | [enter.pollinations.ai](https://enter.pollinations.ai) → dashboard | Same dashboard → **New secret key** |
| OpenRouter | `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | Same page → **Create key** |
| ElevenLabs | `ELEVENLABS_API_KEY` | ElevenLabs Profile → API Keys | Same page → **Create key** |
| Vast.ai | `VAST_API_KEY` | Vast.ai → Account → API Keys | Same page → **Generate key** |

**Standard rotation workflow:**

1. Generate the new key in the provider dashboard.
2. Update Railway → **Variables** with the new value.
3. Wait for the rolling restart (~30 s).
4. Verify with a small test generation.
5. **Revoke** the old key in the provider dashboard.

**If the provider itself is down:** all keys appear "invalid". Check
the provider's status page first (most have one at
`status.<provider>.com`). If down, post a status update; queue
generations gracefully degrade with a user-visible "provider unavailable"
message — verify this is happening rather than 500-ing.

#### Rotate exposed Pollinations keys

The repository contains hardcoded fallback keys in
`server/_core/byokVideoEngine.ts:59-60`:

```ts
const POLLINATIONS_KEY_POOL: string[] = [
  ENV.pollinationsApiKey || "sk_<KEY-A>",
  "sk_<KEY-B>",
].filter(k => k && k.length > 0);
```

These keys are **publicly exposed via git history** (they were
committed as plain text in v6.83 and earlier). Treat them as burned.

**Rotation steps:**

1. Log in to [enter.pollinations.ai](https://enter.pollinations.ai).
2. Revoke both `KEY-A` and `KEY-B` (whichever names they were assigned —
   look for the "petite-primate" key and any sibling keys created at
   the same time).
3. Generate a new secret key, set it in Railway as
   `POLLINATIONS_API_KEY`.
4. (Optional second key for the rotation pool) — generate a second key
   and set it as `POLLINATIONS_API_KEY_BACKUP`. Then in a future commit,
   replace the hardcoded second entry of `POLLINATIONS_KEY_POOL` with
   `process.env.POLLINATIONS_API_KEY_BACKUP`.

This is tracked under [Known Launch Risks](#known-launch-risks).

### Database corruption suspected

**Symptom:** consistency errors in logs (foreign-key violations on
operations that should not violate, "duplicate key" on PK inserts,
`SELECT COUNT(*)` returns wildly different values across replicas).

1. **Stop writes immediately** — Railway → service → **Settings → Stop**.
2. Take a forensic snapshot of the current (possibly-corrupt) DB before
   any restore — Railway → MySQL → **Backups → Take snapshot**. Label
   it `forensic-<UTC-timestamp>`.
3. Restore the most recent **pre-corruption** backup (see Rollback
   Plan step 6).
4. After restore, run integrity probes:
   ```sql
   -- Orphan subscriptions
   SELECT s.id FROM subscriptions s
   LEFT JOIN users u ON u.id = s.userId
   WHERE u.id IS NULL;

   -- Duplicate webhook events (should be 0)
   SELECT stripeEventId, COUNT(*) FROM stripe_webhook_events
   GROUP BY stripeEventId HAVING COUNT(*) > 1;
   ```
5. If any rows return, escalate before restarting the application.
6. Restart and run the smoke checklist.

---

## Routine Maintenance

| Task | Frequency | Procedure |
|---|---|---|
| Verify last DB backup is < 24 h old | daily | Railway → MySQL → Backups |
| Review Sentry top issues | daily | Sentry dashboard |
| Review Stripe failed webhooks | daily | Stripe → Webhooks → endpoint |
| Run `pnpm audit --audit-level high` | weekly | locally + on every PR via Security CI |
| Review `[security]` log lines for blocked maintenance attempts | weekly | Railway logs → search `[security]` |
| Rotate `JWT_SECRET` and `SESSION_SECRET` | quarterly | See incident playbook for "Login broken" — expect forced re-login. |
| Rotate AI provider keys | quarterly | See [AI provider keys fail](#ai-provider-keys-fail). |
| Verify off-site backup restore works | quarterly | Restore the latest `.sql.gz` to a scratch MySQL instance and run integrity probes. |

---

## Known Launch Risks

Honest list of items that should be fixed but are out of scope for the
v6.86 production-readiness gate:

1. **Burned Pollinations keys in `byokVideoEngine.ts`.** Two real
   secret keys are hardcoded as the fallback rotation pool and are
   publicly visible via git history (v6.83 and earlier). The
   `byokVideoEngine.ts` file is excluded from the secret-scan to keep CI
   green while this is tracked. **Mitigation:** rotate per
   [Rotate exposed Pollinations keys](#rotate-exposed-pollinations-keys)
   before any public launch announcement.
2. **In-memory voice temp-upload store.** Voice clips uploaded to
   `/api/voice/temp/:id` live in process memory only. If Railway scales
   beyond a single web replica, voice uploads break (the GET would land
   on a different instance). **Mitigation:** stay single-instance until
   this is moved to Redis or signed-URL S3 hand-off.
3. **tRPC upload routes have no MIME allowlist.** Schemas validate size
   only; any `contentType` string is accepted. The standalone
   `/api/voice/temp` endpoint *does* enforce an 11-entry audio
   allowlist (see SECURITY.md §11). **Mitigation:** add a tRPC-level
   allowlist if upload categories diversify.
4. **Existing S3 objects remain public-read.** The `{ public: false }`
   opt-in added in v6.86 only affects future uploads. Migrating any
   currently-private content categories to private ACLs is a separate
   task.
5. **`OPERATIONAL_RUNBOOK.md` references generic CLI tools** (`mysql`,
   `redis-cli`) that are not part of the Railway runtime. Use the
   playbooks in this RUNBOOK for production troubleshooting; treat the
   older doc as a reference for self-hosted deployments.
6. **No formal status page yet.** User-facing incident communication is
   ad-hoc. Set up a status page (e.g. Statuspage, Instatus, Better
   Uptime) and link from the marketing site before public launch.
