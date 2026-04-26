# Security Policy — Virelle Studios

This document describes how Virelle Studios handles security: what is
protected, how to report a vulnerability, and the operational baseline
the codebase enforces at runtime.

---

## Reporting a vulnerability

If you believe you have found a security issue in Virelle Studios:

1. **Do not** open a public GitHub issue, post on social media, or
   discuss it in public Discord/Slack channels.
2. Email **leego972@gmail.com** with the subject line
   `Virelle Security — <short summary>`.
3. Include enough detail to reproduce: affected endpoint(s), HTTP
   request examples (with sensitive values redacted), expected vs
   observed behaviour, and any proof-of-concept artefacts.
4. We acknowledge reports within **72 hours** and aim to ship a fix
   within **14 days** for high/critical issues. Please give us a
   reasonable disclosure window before going public.

We do not currently run a paid bug-bounty programme but will publicly
credit researchers in release notes (with permission).

Supported version: **only `main` (deployed via Railway).** Older
commits are not patched.

---

## Runtime guarantees

The following invariants are enforced by the application code itself,
not by configuration. They cannot be turned off without a code change.

### 1. JWT signing secret is mandatory in production

`server/_core/context.ts` reads the JWT signing key from the
`JWT_SECRET` environment variable (via `ENV.cookieSecret`). If that
variable is missing **and** `NODE_ENV === "production"`, the process
throws a fatal error on boot:

```
FATAL: JWT_SECRET environment variable is required in production.
Set a strong random secret.
```

In development, a placeholder secret (`dev-secret-change-me`) is used
with a console warning. This guarantees that no production deployment
can ever sign session cookies with a guessable default.

### 2. Direct admin routes require an authenticated admin

Every direct (non-tRPC) `/api/admin/*` route in
`server/_core/index.ts` is mounted behind the `requireAdminExpress`
middleware exported from `server/_core/context.ts`:

| Route                        | Method | Guard                |
| ---------------------------- | ------ | -------------------- |
| `/api/admin/migrate`         | POST   | `requireAdminExpress` |
| `/api/admin/fix-scenes`      | POST   | `requireAdminExpress` |
| `/api/admin/grant-credits`   | POST   | `requireAdminExpress` |
| `/api/admin/reset-project`   | POST   | `requireAdminExpress` |

The middleware:

- Builds a normal request context from the cookie/JWT, so the auth
  path is identical to the rest of the app.
- Returns **HTTP 403** if there is no user, or if `user.role !==
  "admin"`. Logs a warning containing the request path and source IP.
- Returns **HTTP 500** only if the auth path itself throws (e.g. DB
  outage during admin check).
- Runs **before** any `express.json()` body parser on the same route,
  so unauthenticated callers cannot tie up server CPU sending huge
  request bodies.

The corresponding tRPC admin procedures use the existing
`adminProcedure` guard inside the router files. Both paths share the
same `createContext` → `user.role === "admin"` check.

### 3. No hardcoded provider API keys

`server/_core/env.ts` reads all third-party provider keys
(`POLLINATIONS_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`,
`HUGGING_FACE_API_KEY`, `RUNWAYML_API_SECRET`/`RUNWAY_API_KEY`,
`FAL_KEY`, etc.) from `process.env`, defaulting to an empty string if
absent. There are **no** hardcoded fallback keys in the source tree.

If a key is missing, the corresponding feature degrades gracefully
(BYOK fallback or a 4xx error from the relevant route handler) rather
than the server starting with a baked-in credential.

### 4. Stripe webhook integrity

The Stripe webhook handler at `POST /api/stripe/webhook` is mounted
**before** the global `express.json()` parser, using
`express.raw({ type: "application/json" })`. This preserves the raw
request body so `stripe.webhooks.constructEvent(...)` can verify the
`Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`. Any change
that moves the webhook below the JSON parser, or swaps `raw` for
`json`, will silently break signature verification — do not do this.

### 5. Audit logging on admin actions

Every admin action through the four direct routes above is logged via
`logAuditEvent` with the `ADMIN_<ACTION>` event name. Both **successful
and failed** attempts are captured, including:

- The acting admin's user ID and email
- The HTTP method and path (`/api/admin/...`)
- The source IP address (`req.ip`)
- A timestamp (recorded inside `logAuditEvent`)
- The target resource ID where applicable (`targetUserId`, `projectId`)
- The success flag, and the error message on failure

Unauthorized attempts (no admin session) are logged to the process
console with the request path and source IP for SOC review. Production
maintenance attempts that are blocked by `ENABLE_MAINTENANCE_ROUTES`
are logged as `ADMIN_MAINTENANCE_BLOCKED` with `success=false`.

### 6. Admin maintenance routes

Three of the four direct admin routes are **destructive maintenance**
operations and are gated by an additional `requireMaintenanceEnabled`
middleware on top of `requireAdminExpress`:

| Route                      | Maintenance? | What it does                                  |
| -------------------------- | ------------ | --------------------------------------------- |
| `/api/admin/migrate`       | YES          | Runs `runAutoMigration()` — schema changes    |
| `/api/admin/fix-scenes`    | YES          | `ALTER TABLE scenes ADD COLUMN …`             |
| `/api/admin/reset-project` | YES          | Deletes scenes + resets a project to `draft`  |
| `/api/admin/grant-credits` | NO           | Routine support — adjusts a user's balance    |

**Behaviour in production** (`NODE_ENV=production`):

- If `ENABLE_MAINTENANCE_ROUTES` is anything other than the exact
  string `"true"`, the three maintenance routes return **HTTP 403**
  with `{"error":"Maintenance routes are disabled in production",...}`.
- An `ADMIN_MAINTENANCE_BLOCKED` audit event is recorded for the
  acting admin and the blocked path.
- `grant-credits` is **always** available to authenticated admins;
  it is not affected by this gate.

**Behaviour in development** (`NODE_ENV !== "production"`):

- The gate is a no-op. All four routes are reachable by any
  authenticated admin.

**How to safely enable in production:**

1. In Railway → service → Variables, add `ENABLE_MAINTENANCE_ROUTES`
   with value `true` (case-sensitive).
2. Redeploy or restart the service so the env var is picked up.
3. Hit the maintenance route from an admin session (cookie-based JWT).
4. **Immediately delete `ENABLE_MAINTENANCE_ROUTES`** from Railway
   Variables and redeploy. Leaving it on returns the routes to a
   permanently-callable state, which defeats the safety gate.

If you find `ENABLE_MAINTENANCE_ROUTES=true` set in production and
nobody on the team remembers enabling it, treat it as a security
incident and follow the reporting process at the top of this document.

### 7. Input validation on admin DB-write routes

`grant-credits` and `reset-project` accept a JSON body with numeric
IDs and amounts. Both routes:

- Reject any value that is not a positive integer (`Number.isInteger`).
- Clamp `amount` to `±1,000,000` credits to stop fat-finger billing
  errors. Out-of-range values return HTTP 400 and are audit-logged.
- Clamp `duration` to 1..600 minutes on `reset-project`.
- Use Drizzle's parameterised `sql\`...\`` template — no `sql.raw`
  with user input, no string interpolation into SQL text. The
  database driver binds values as prepared-statement parameters.

The `fix-scenes` route uses `sql.raw` because every column name and
DDL fragment is hardcoded in the source — there is no untrusted input.
If new columns are ever added to that route, they MUST stay
hardcoded in the same way; never accept column names from request
bodies.

### 8. Admin authority model

Admin authority is database-role only.

Rules:

- A user is admin only when `users.role === "admin"`.
- Login must never promote a user to admin.
- Signup must never promote a user to admin.
- Server startup must never bulk-promote users to admin.
- `OWNER_OPEN_ID` is intentionally ignored for admin promotion.
- `ADMIN_EMAIL` is notification/config metadata only. It must not grant admin access.
- Admin role changes must happen through the protected `admin.updateUserRole` procedure or through a deliberate direct database recovery action.
- All admin role changes must be audit logged.
- Admin users should use strong passwords. Add 2FA before public paid launch.

Emergency admin recovery:

If all admin access is lost, restore one admin directly in the database with an owner-approved manual operation, then audit the action in deployment notes. Do not add automatic bootstrap logic back into source code.

### 9. Dependency audit policy

The `Security CI` workflow runs `pnpm audit --audit-level high` on every push to `main` and on every PR. The build fails on any unignored advisory at high or critical severity.

Two mechanisms keep the audit honest:

- **Overrides** in `package.json > pnpm.overrides` force a patched version of a transitive dependency. Used only when the patched version is API-compatible with the parent package's expected range.
- **Allowlist** in `package.json > pnpm.auditConfig.ignoreGhsas` explicitly accepts an advisory. Every entry must be justified below and revisited at each `Last reviewed` date.

Currently overridden (forced to patched versions):

- `fast-xml-parser ^5.3.5` — clears GHSA-p9ff-h696-f583 (critical, regex injection in DOCTYPE entity names) for the AWS SDK v3 chain.
- `path-to-regexp ^0.1.13` — clears GHSA-37ch-88jc-xwx2 (ReDoS) for the `express@4` chain.
- `axios ^1.13.5` — clears GHSA-43fc-jf86-j433 (DoS via `__proto__`) for direct usage.

Currently allowlisted (with rationale and planned action):

- `GHSA-r5fr-rjxr-66jc` — `lodash`/`lodash-es` "Code Injection via `_.template`". The advisory lists patched versions as `>=4.18.0`, but no such version exists on npm; `4.17.21` is the latest. False positive. Revisit if upstream republishes the advisory or if `recharts`/`mermaid` drop their lodash dependency.
- `GHSA-43p4-m455-4f4j` — `@trpc/server` prototype pollution, patched in `>=11.8.0`. We are on `11.6.0`. Server does not parse untrusted JSON through the affected path; upgrade is scheduled with the next coordinated tRPC client+server bump.
- `GHSA-rcmh-qjqh-p98v` — `nodemailer` addressparser DoS, patched in `>=7.0.11`. We are on `6.10.1`. The `6.x → 7.x` jump is a major API change; deferring to a dedicated mail-stack upgrade.
- `GHSA-379q-355j-w6rj`, `GHSA-7vhp-vf5g-r2fw`, `GHSA-2phv-j68v-wwqx` — three `pnpm` CLI advisories against a transitive `pnpm@10.18.0`. We invoke pnpm via `packageManager` (`pnpm@10.4.1`) and CI's setup-pnpm pin, not the transitive copy. Will bump `packageManager` to `>=10.27.0` in a focused tooling PR.
- `GHSA-34x7-hfp2-rc4v`, `GHSA-8qq5-rm4j-mr97`, `GHSA-83g3-92jg-28cx`, `GHSA-qffp-2rhf-9h96`, `GHSA-9ppj-qmqm-q256`, `GHSA-r6q2-hw4h-h46w` — six `node-tar` advisories pulled in via `@tailwindcss/vite > lightningcss-cli`. Affects build tooling only, never runs on production server traffic. Forcing `tar@^7.5.11` risks breaking the lightningcss build chain; revisit when `@tailwindcss/vite` ships an updated tarball-handling release.
- `GHSA-mw96-cpmx-2vgc` — `rollup@<4.59.0` arbitrary file write via path traversal. Affects build tooling only, never runs on production traffic. Tracking upstream `vite` to ship a newer rollup pin.
- `GHSA-c2c7-rcm5-vvqj` — `picomatch@<4.0.4` ReDoS. Affects build tooling only. The `picomatch@3 → 4` major bump cannot be forced globally without verifying every consumer.

If an entry above is no longer accurate (advisory withdrawn, fix shipped upstream, attack surface changed), remove it from the allowlist and re-run `pnpm audit --audit-level high`.

### 10. Billing and credit integrity

The Stripe webhook handler is the only path through which paid-tier credits enter user balances. Two layers of idempotency, plus a tightened user-resolution policy, prevent the duplicate-grant and impersonation classes of bug.

**Layer 1 — universal event idempotency.** Every Stripe event we receive is recorded in `stripe_webhook_events` keyed on the unique `stripeEventId` column (UNIQUE index). Before doing any work, the handler calls `claimStripeWebhookEvent(event.id, ...)`, which performs an atomic `INSERT IGNORE` and returns `false` if the row already exists with status `processed` (a Stripe retry of a successful delivery, or a concurrent worker still in flight). Duplicate deliveries return `200 { received: true, idempotent: true }` and exit immediately — no credits granted, no state mutated. If the prior attempt errored, the row's status is reset to `processing` so the legitimate retry can recover.

**Layer 2 — per-invoice credit-grant idempotency.** Subscription renewal credits in `invoice.paid` are additionally gated on `hasStripeInvoiceBeenCredited(invoice.id, event.id)`. Layer 1 catches Stripe retries of the same `event.id`; Layer 2 catches the rarer case where Stripe sends a NEW `event.id` for the SAME invoice — for example, a manual re-fire from the Stripe dashboard, or a void-then-repay cycle. Subscription state (tier, period end) is set unconditionally because those are SET ops; only the credit grant and the `resetGenerationCounter` call are gated, so a duplicate invoice cannot zero out a user's mid-cycle usage.

**User identity resolution.** Stripe customers are created server-side at `subscription.ts:createOrGetStripeCustomer`, which both tags the customer with `metadata.userId` AND persists the resulting `customerId` on the user row. The customer-owned mapping is therefore the canonical source of truth. The webhook's `resolveUserId(metadata, customerId)` always looks up the user via `getUserByStripeCustomerId(customerId)` first; if `metadata.userId` disagrees with that result, the discrepancy is logged as a warning and the customer-owned mapping wins. Falling back to `metadata.userId` is only allowed when no `customerId` is present (orphan checkout). This prevents a tampered or replayed event with a forged `metadata.userId` from crediting the wrong account.

**Single source of truth for pack credit amounts.** Top-up pack credit amounts are read from `TOP_UP_PACKS` in `subscription.ts` — the same list the checkout UI uses. The webhook no longer carries an inline duplicate of the pack-id → credits map, so a future edit to `TOP_UP_PACKS` cannot drift from what the webhook actually grants. Subscription monthly credits come from `TIER_LIMITS[tier].monthlyCredits`, also defined in `subscription.ts`.

**Audit trail.** Every credit grant in the webhook calls `billingActions.creditGrant(userId, amount, reason)`, which logs to `billingLog` alongside the `credit_transactions` row written by `addCredits`. The `stripe_webhook_events` row records the resolved userId, total `creditsGranted`, and final `status` (`processed` / `error` with the error message). Together this gives three independent ledgers that should always reconcile: `credit_transactions`, `billingLog`, and `stripe_webhook_events`.

**Known consolidation debt.** `FILM_PACKAGES` in `subscription.ts` defines only `short_film` and `feature_film`; the webhook's `filmPackageCredits` map additionally includes `full_feature`, `premium`, `vfx_single`, `vfx_pack_5`, `vfx_pack_15`, `vfx_unlimited`. There is no checkout flow today that creates sessions with those legacy ids — they are dead branches kept defensively. Future work: migrate the canonical list into `FILM_PACKAGES` (with credit amounts) and have the webhook read from there, mirroring the `TOP_UP_PACKS` pattern.

### 11. File upload and storage safety

Two attack surfaces handle user-supplied bytes: HTTP upload routes and the storage helper that pushes them to S3/R2. Each has size, type, and access-control guards.

**HTTP upload routes — request size.** The global JSON parser caps every request at `25 MB` (`server/_core/index.ts:534`). Per-route Zod schemas tighten that further: `upload.image` caps base64 at 14 MB (~10 MB binary), `upload.footage` at 200 MB base64 (~150 MB binary), and so on. The Stripe webhook is mounted with `express.raw()` BEFORE the JSON parser, so the 25 MB cap does not apply to it; signature verification on the raw body is what protects that route. The two admin-only `express.json()` mounts (`/api/admin/grant-credits`, `/api/admin/reset-project`) use the Express default 100 KB limit — they only accept tiny JSON payloads.

**HTTP upload routes — auth.** All tRPC upload mutations are wrapped in `protectedProcedure` (auth required). The single non-tRPC upload route, `POST /api/voice/upload`, calls `createContext` and rejects unauthenticated requests with `401`.

**HTTP upload routes — content type allowlist.** `POST /api/voice/upload` enforces an audio MIME allowlist (`audio/webm`, `audio/ogg`, `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/mp4`, `audio/x-m4a`, `audio/mpeg`, `audio/mp3`, `audio/aac`, `audio/flac`); anything else returns `415`. tRPC upload routes pass `input.contentType` straight through to S3 — those routes are gated by auth and per-route size caps and are not enumerated to the public, so we do not enforce a server-side allowlist there beyond the schema.

**HTTP upload routes — size enforcement.** `POST /api/voice/upload` honours `Content-Length` to short-circuit oversized uploads before reading any body bytes, then re-enforces the 16 MB cap as bytes arrive. If the streaming total exceeds the cap, the connection is destroyed and the response is `413`. (Earlier behaviour silently truncated the buffer, which would have stored a corrupt audio file under the user's account.)

**Temporary asset access.** Voice uploads land in an in-memory store keyed on a 128-bit crypto-random id (`/api/voice/temp/:id`) with a 10-minute TTL and a 5-minute background sweep. The fetch route requires auth AND verifies that the entry's stored `userId` matches the requester — so even a leaked temp URL cannot be replayed by another account. Cache-Control on the response is `private, no-store`.

**Storage layer — size cap.** `storagePut` enforces a hard `MAX_STORAGE_OBJECT_BYTES` (env-overridable; default 256 MB) on every call. This is a defensive cap intended to catch programming errors that would buffer something huge into memory; per-route Zod schemas remain the primary size guard.

**Storage layer — public vs private objects.** `storagePut(key, data, contentType, opts?)` accepts an optional `opts.public` flag. Public-read is the default to preserve long-standing behaviour for assets that are embedded directly in the UI (generated images, generated videos, soundtracks, etc.), but callers handling user-private content can pass `{ public: false }` to omit the public ACL. Object keys for user uploads are namespaced by `${ctx.user.id}` (eg. `uploads/${userId}/...`, `footage/${userId}/...`) so even a directory listing leak would not cross-mix users; for stricter cases, `{ public: false }` plus a server-side signed-URL hand-off is the right pattern. The legacy Manus FORGE backend always returns a public URL and ignores the flag.

**Path traversal.** All upload keys are constructed server-side from `${ctx.user.id}` plus a `nanoid()` plus a sanitised filename — user input never determines the directory. `storagePut` strips leading slashes from the relative key for safety.

---

## Operational checklist for deploys

Before promoting a new commit to production:

1. **`JWT_SECRET`** is set to a 32+ char random value (Railway →
   project → Variables). Rotate any time a maintainer leaves.
2. **`STRIPE_WEBHOOK_SECRET`** matches the live endpoint's signing
   secret (Stripe Dashboard → Developers → Webhooks).
3. **`ADMIN_EMAIL`** is set to the single bootstrap admin address.
4. Provider keys (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `FAL_KEY`,
   `POLLINATIONS_API_KEY`, `HUGGING_FACE_API_KEY`,
   `RUNWAYML_API_SECRET`, etc.) are set as needed for the features
   you want to be platform-funded; missing keys fall back to BYOK.
5. The deploy logs do **not** contain the
   `Using default JWT_SECRET in development` warning. If they do, the
   environment is mis-flagged as non-production — fix before serving
   user traffic.
6. `pnpm check` and `pnpm build` are clean against `main`.

---

## Out of scope

- Self-hosted forks of this repo. The runtime guarantees above apply
  to the canonical deployment under `leego972/virelle` running on
  Railway. Forks must re-verify them.
- Third-party AI providers. Vulnerabilities in OpenAI, Google, fal.ai,
  Pollinations, Runway, Hugging Face, or any other upstream provider
  should be reported to that provider directly.
- Browser extensions injecting into the Virelle UI. We cannot defend
  against attacker-installed browser extensions.

---

## Final production-readiness gate

Before returning to product work or launching public paid traffic:

- Security CI must pass.
- `pnpm check` must pass.
- `pnpm build` must pass.
- `pnpm audit --audit-level high` must exit 0.
- No hardcoded provider secrets may exist in source. (Existing
  documented exceptions, such as the Pollinations rotation pool in
  `server/_core/byokVideoEngine.ts`, must be tracked as launch risks
  in `RUNBOOK.md` with a rotation procedure.)
- Direct `/api/admin` routes must require `requireAdminExpress`.
- Maintenance routes must be disabled in production unless explicitly
  enabled for a short maintenance window.
- Admin authority must be database-role only.
- Stripe webhook must stay above global `express.json`.
- Rollback plan must be documented.
- Smoke test checklist must be completed after every deploy.

---

_Last reviewed: 2026-04-26_
