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

_Last reviewed: 2026-04-25_
