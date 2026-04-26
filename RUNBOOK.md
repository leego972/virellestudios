# Virelle Studios Production Runbook

Practical playbooks for everyday operation, incident response, and
launch readiness. For *deployment* (Railway setup, env vars, Stripe
wiring) see [`DEPLOYMENT.md`](./DEPLOYMENT.md). For the security model
see [`SECURITY.md`](./SECURITY.md). Older general procedures (log
rotation, DR RTO/RPO targets) remain in
[`OPERATIONAL_RUNBOOK.md`](./OPERATIONAL_RUNBOOK.md) for reference.

---

## Emergency contacts / ownership

- **Repository owner:** `leego972` (GitHub).
- **Security contact:** see [`SECURITY.md`](./SECURITY.md) §"Reporting
  a vulnerability" — `leego972@gmail.com` with subject
  `Virelle Security — <short summary>`.
- **Deploy target:** Railway service for `https://virelle.life`.
- **DB:** Railway MySQL plugin attached to the same project.
- **Status page:** *not yet set up* — see "Known launch risks" below.

---

## Standard production verification

Run after every deploy. Each item must pass before declaring the
service healthy.

- `/api/health` returns `ok`
- Login works
- Signup works
- Create project works
- Generate a small test asset works
- Credits deduct correctly
- Upload test works
- Download/access test works
- Normal user cannot access `/api/admin/grant-credits`
- Admin user can access an allowed admin route (or gets `503` if
  `ENABLE_MAINTENANCE_ROUTES` is intentionally off — that's still a pass)
- Stripe test webhook succeeds

---

## Smoke test checklist

Run this **exact** checklist after every production deploy and after
every rollback. Tick off each box. If any item fails, halt the deploy
verification and consult the [Incident playbooks](#incident-playbooks).

```
[ ] Security CI passed
[ ] Railway deploy succeeded
[ ] /api/health returns ok
[ ] Login works
[ ] Signup works
[ ] Create project works
[ ] Small generation test works
[ ] Credit deduction works
[ ] Upload test works
[ ] Download/access test works
[ ] Normal user blocked from /api/admin/grant-credits
[ ] Admin user can access /api/admin/grant-credits
[ ] Stripe test webhook succeeds
[ ] Sentry/logs checked
[ ] Maintenance routes disabled
```

### How to verify each line

| Check | Command / where |
|---|---|
| Security CI | GitHub → Actions → Security CI for the deployed SHA → green. |
| Railway deploy | Railway → service → Deployments → top entry status `Active`. |
| `/api/health` | `curl -fsS https://virelle.life/api/health` returns `{"ok":true,…}`. |
| Login | `https://virelle.life/login`, complete OAuth, land on `/dashboard`. Cookie has `Secure; HttpOnly; SameSite=Lax`. |
| Signup | Fresh email through OAuth signup → onboarding. Verify `users` row with `role='user'`. |
| Create project | Dashboard → New project → row appears in `projects`. |
| Small generation | Lowest-credit-cost generation completes and asset URL is reachable. |
| Credit deduction | Before/after `SELECT credits FROM users WHERE id=?` differ by exactly the documented cost. |
| Upload test | UI → upload ~100 KB PNG → object exists in S3 and URL is fetchable. |
| Download test | Re-download the asset → bytes match. |
| Normal user blocked | `curl -i -b "<normal-cookie>" https://virelle.life/api/admin/grant-credits` → **403**. |
| Admin user allowed | Same call with admin cookie → **200** (or **503** if maintenance routes are off — also acceptable). |
| Stripe test webhook | Stripe Dashboard → Webhooks → endpoint → **Send test event** → `invoice.paid` → 2xx response, idempotent claim recorded. |
| Sentry/logs | Sentry top issues empty or unchanged; Railway logs show no new ERROR. |
| Maintenance routes disabled | Railway → Variables → `ENABLE_MAINTENANCE_ROUTES` is **unset** (not just empty). |

---

## Monitoring checklist

Confirm each of the following monitors is wired up. Re-check quarterly
or after any infrastructure change.

- **Railway deploy logs** — green on every push to `main`; red runs
  page someone immediately.
- **Railway runtime logs** — continuous tail; no gaps > 5 min during
  business hours; ERROR-level lines tagged for review.
- **Sentry errors** — server (`SENTRY_DSN`) and client
  (`VITE_SENTRY_DSN`) projects both receiving events; alert on any new
  issue or error rate > 10 events/min.
- **Stripe failed webhook alerts** — Stripe Dashboard → Webhooks →
  endpoint → Failures; page on any 5xx or ≥3 consecutive non-2xx.
- **Database connection errors** — Railway logs filtered for
  `ECONNREFUSED` / `PROTOCOL_CONNECTION_LOST`; alert on burst.
- **Storage errors** — S3 4xx/5xx returned to upload routes; alert on
  burst.
- **Provider API failures** — Pollinations / OpenRouter / ElevenLabs /
  Vast.ai 4xx-5xx counted in Sentry breadcrumb tag `provider`; alert
  on ≥10 failures in 5 min for any single provider.
- **Upload volume / disk usage** — Railway service disk > 80%; S3
  bucket size growth > 2× weekly baseline.
- **Unusual admin audit events** — Railway logs filtered for
  `[security]` and `[admin]`; weekly review for blocked maintenance
  attempts and admin-route access patterns.
- **Payment failure spikes** — Stripe Dashboard → Failed payments;
  alert on > 3× hourly baseline.

---

## Rollback procedure

A staged playbook. Steps 1–8 are typical; step 9 is conditional on
suspected data corruption.

1. **Identify last known good commit** —
   `git log --oneline -10 origin/main`, or Railway → Deployments → find
   the last green deploy. Confirm the SHA precedes the suspected bad
   change.
2. **Redeploy previous commit in Railway** (Deployments → ⋯ →
   Redeploy on the prior green deploy) **OR** revert and push:
   `git revert <bad-sha> && git push origin main`.
3. **Confirm env vars were not changed accidentally** — Railway →
   service → Variables. Cross-check against the lists in
   [`DEPLOYMENT.md`](./DEPLOYMENT.md). If any variable was changed by
   the bad deploy, restore the previous value.
4. **Ensure `ENABLE_MAINTENANCE_ROUTES` is unset** — Railway →
   Variables → delete the variable if present. Wait for the rolling
   restart.
5. **Run health check** —
   `curl -fsS https://virelle.life/api/health` returns
   `{"ok":true,…}`.
6. **Run smoke tests** — full
   [smoke-test checklist](#smoke-test-checklist) (15 items).
7. **Check Stripe webhooks** — Stripe Dashboard → Webhooks → endpoint
   → recent deliveries; replay any failures.
8. **Check logs / Sentry** — Sentry for new server/client errors;
   Railway logs for `ERROR`, `[security]`, `[admin]`.
9. **If data corruption is suspected, stop writes before restoring
   backup.** Railway → service → Settings → Stop. Take a forensic
   snapshot of the current (possibly-corrupt) DB before any restore
   (Railway → MySQL → Backups → Take snapshot, label
   `forensic-<UTC-timestamp>`). Then restore the most recent
   pre-corruption snapshot. After restore, run integrity probes:
   ```sql
   SELECT s.id FROM subscriptions s
   LEFT JOIN users u ON u.id = s.userId
   WHERE u.id IS NULL;

   SELECT stripeEventId, COUNT(*) FROM stripe_webhook_events
   GROUP BY stripeEventId HAVING COUNT(*) > 1;
   ```
   Escalate before restarting if either query returns rows.

---

## Incident playbooks

### If login breaks

**Symptoms:** users get 401/500 on `/login`, OAuth callback errors,
existing sessions evicted.

1. **Check `JWT_SECRET`** — Railway → Variables; must be set and
   non-empty. If missing, the app exits at boot.
2. **Check `DATABASE_URL`** — Railway → MySQL service status; verify
   the `users` table is reachable.
3. **Check cookie / domain config** — under HTTPS the auth cookie must
   be `Secure; HttpOnly; SameSite=Lax`. If `Secure` is missing the
   browser silently rejects it; usually means `NODE_ENV` is not
   `production`.
4. **Check `users` table** for the affected user. If the row is missing
   or has `role='disabled'`, that's the issue.
5. **Check recent auth/admin commits** — `git log -p --since=24h --
   server/_core/context.ts server/_core/auth/`. A bad change to JWT
   handling, cookie middleware, or admin-role checks usually shows up
   here.
6. **Roll back if needed** — see [Rollback procedure](#rollback-procedure).

### If Stripe webhook breaks

**Symptoms:** Stripe Dashboard → Webhooks → endpoint shows red /
"Failures". Users complete checkout but credits are not granted.

1. **Confirm webhook route order was not changed** —
   `server/_core/index.ts` must register
   `app.post("/api/stripe/webhook", express.raw(...))` *before*
   `app.use(express.json(...))`. If reordered, signature verification
   breaks silently. Revert the reorder.
2. **Confirm `STRIPE_WEBHOOK_SECRET`** — Stripe Dashboard → Webhooks
   → endpoint → Signing secret matches Railway → Variables. Update
   and redeploy if rotated.
3. **Confirm Stripe endpoint URL** —
   `https://virelle.life/api/stripe/webhook` (no trailing slash, no
   typo). 404s in deliveries indicate URL drift.
4. **Replay one test event from Stripe dashboard** — Webhooks →
   endpoint → Send test event → `invoice.paid`. Verify Railway logs
   show signature OK + idempotent claim + (for new event id) credit
   grant.
5. **Check duplicate / idempotency behavior** — replay a previously
   delivered event id. Expected behavior: 2xx response, log line
   "duplicate webhook event ignored", no credit grant. If credits are
   re-granted, that's a regression in the idempotency layers (see
   SECURITY.md §10) — escalate.

### If AI providers fail

**Symptoms:** generations return 401/403, "invalid API key" in logs,
or all generations time out.

1. **Check provider env vars** — Railway → Variables for the affected
   provider (`POLLINATIONS_API_KEY`, `OPENROUTER_API_KEY`,
   `ELEVENLABS_API_KEY`, `VAST_API_KEY`, `OPENAI_API_KEY`,
   `GOOGLE_API_KEY`, `FAL_KEY`, `RUNWAYML_API_SECRET`,
   `HUGGING_FACE_API_KEY`, `VENICE_API_KEY`, `TITAN_API_KEY`).
2. **Check provider status pages manually** — most providers have a
   `status.<provider>.com` page. If down, post a status update; we
   cannot self-mitigate.
3. **Confirm BYOK fallback behavior** — when the platform key is
   missing or rejected, the app should attempt the user's BYOK key (if
   they have one) and surface a clear error otherwise. Verify in
   logs.
4. **Confirm credit deduction did not occur on failed generation** —
   for any user who reported a failed generation, query
   `SELECT * FROM billing_actions WHERE userId=? ORDER BY createdAt DESC
   LIMIT 5`. There should be **no** debit row tied to the failed
   generation. If there is, refund manually via the maintenance route
   (see DEPLOYMENT §"Maintenance route procedure").

#### Rotate exposed Pollinations keys

The repository contains hardcoded fallback keys in
`server/_core/byokVideoEngine.ts:59-60`:

```ts
const POLLINATIONS_KEY_POOL: string[] = [
  ENV.pollinationsApiKey || "sk_<KEY-A>",
  "sk_<KEY-B>",
].filter(k => k && k.length > 0);
```

These keys are **publicly exposed via git history** (committed as
plain text in v6.83 and earlier). Treat them as burned.

**Rotation steps:**

1. Log in to [enter.pollinations.ai](https://enter.pollinations.ai).
2. Revoke both `KEY-A` and `KEY-B` (look for the "petite-primate" key
   and any sibling keys created at the same time).
3. Generate a new secret key, set it in Railway as
   `POLLINATIONS_API_KEY`.
4. (Optional second key for the rotation pool) generate a second key
   and set it as `POLLINATIONS_API_KEY_BACKUP`. Then in a future
   commit, replace the hardcoded second entry of `POLLINATIONS_KEY_POOL`
   with `process.env.POLLINATIONS_API_KEY_BACKUP`.

### If all admin access is lost

**Symptoms:** no user has `role='admin'` in the `users` table; admin
UI returns 403 for everyone; no one can run maintenance routes.

1. **Do not re-add automatic owner/email bootstrap.** The
   `OWNER_OPEN_ID` env var was deprecated in v6.80 specifically because
   automatic admin promotion is a privilege-escalation foothold. Re-adding
   it would undo that work.
2. **Restore one admin by deliberate direct DB recovery.** From a
   trusted operator machine with database credentials:
   ```sql
   -- Replace with the exact userId of the chosen admin.
   UPDATE users SET role = 'admin' WHERE id = '<userId>';
   ```
   Use the Railway MySQL console or a one-off `mysql` shell. Do **not**
   embed a script in the codebase that does this.
3. **Record the recovery in deployment notes.** Add a dated entry to
   the maintenance log including: who ran the SQL, which userId was
   promoted, why all admin access was lost, and how the situation will
   be prevented (e.g. always have ≥ 2 admin accounts).
4. **Rotate credentials if compromise is suspected** — JWT_SECRET,
   SESSION_SECRET, all Stripe keys, all provider API keys. See the
   "If login breaks" rollback for forced re-login expectations.

---

## Routine maintenance

| Task | Frequency | Procedure |
|---|---|---|
| Verify last DB backup is < 24 h old | daily | Railway → MySQL → Backups |
| Review Sentry top issues | daily | Sentry dashboard |
| Review Stripe failed webhooks | daily | Stripe → Webhooks → endpoint |
| Run `pnpm verify` (or `pnpm audit --audit-level high`) | weekly | locally + on every PR via Security CI |
| Review `[security]` log lines | weekly | Railway logs → search `[security]` |
| Rotate `JWT_SECRET` and `SESSION_SECRET` | quarterly | See "If login breaks" — expect forced re-login. |
| Rotate AI provider keys | quarterly | See "If AI providers fail". |
| Verify off-site backup restore works | quarterly | Restore the latest `.sql.gz` to a scratch MySQL instance and run integrity probes. |

---

## Known launch risks

Honest list of items that should be fixed but are out of scope for the
v6.86 / v6.88 production-readiness gate:

1. **Burned Pollinations keys in `byokVideoEngine.ts`.** Two real
   secret keys are hardcoded as the fallback rotation pool and are
   publicly visible via git history (v6.83 and earlier). The
   `byokVideoEngine.ts` file is excluded from the secret-scan to keep
   CI green while this is tracked. **Mitigation:** rotate per
   [Rotate exposed Pollinations keys](#rotate-exposed-pollinations-keys)
   before any public launch announcement.
2. **In-memory voice temp-upload store.** Voice clips uploaded to
   `/api/voice/temp/:id` live in process memory only. If Railway scales
   beyond a single web replica, voice uploads break (the GET would land
   on a different instance). **Mitigation:** stay single-instance until
   this is moved to Redis or signed-URL S3 hand-off.
3. **tRPC upload routes have no MIME allowlist.** Schemas validate
   size only; any `contentType` string is accepted. The standalone
   `/api/voice/temp` endpoint *does* enforce an 11-entry audio
   allowlist (see SECURITY.md §11). **Mitigation:** add a tRPC-level
   allowlist if upload categories diversify.
4. **Existing S3 objects remain public-read.** The `{ public: false }`
   opt-in added in v6.86 only affects future uploads. Migrating any
   currently-private content categories to private ACLs is a separate
   task.
5. **`OPERATIONAL_RUNBOOK.md` references generic CLI tools** (`mysql`,
   `redis-cli`) that are not part of the Railway runtime. Use the
   playbooks in this `RUNBOOK.md` for production troubleshooting; treat
   the older doc as a reference for self-hosted deployments.
6. **No formal status page yet.** User-facing incident communication is
   ad-hoc. Set up a status page (e.g. Statuspage, Instatus, Better
   Uptime) and link it from the marketing site before public launch.
