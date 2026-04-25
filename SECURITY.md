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

Successful admin actions through the four direct routes above are
logged to the `auditLog` table via `logAuditEvent` with the
`ADMIN_<ACTION>` event name. Unauthorized attempts are logged to the
process console with the request path and source IP for SOC review.

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
