# Virelle Studios Environment Reference

Use [`.env.example`](./.env.example) as the copyable template and [`DEPLOYMENT.md`](./DEPLOYMENT.md) for production setup. Production secrets belong in Render environment variables, never in source files or Markdown notes.

## Core runtime

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development`, `test` or `production` |
| `PORT` | Public gateway port; Render supplies this automatically |
| `PUBLIC_APP_URL` | Canonical application origin, normally `https://virelle.life` |
| `DATABASE_URL` | MySQL 8-compatible connection string |
| `REDIS_URL` | Redis connection used by distributed rate limiting and queues |
| `JWT_SECRET` | Signs authentication/session tokens; use a random value of at least 32 characters |
| `SESSION_SECRET` | Independent session secret; do not reuse `JWT_SECRET` |

Changing either session secret invalidates active sessions and requires a deployment.

## Application identity and OAuth

| Variable | Purpose |
|---|---|
| `VITE_APP_ID` | Public application identifier |
| `VITE_APP_TITLE` | Public application title |
| `VITE_APP_LOGO` | Public logo path |
| `OAUTH_SERVER_URL` | Configured OAuth broker when used |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Direct Google OAuth |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | Direct GitHub OAuth |
| `ADMIN_EMAIL` | Administrative contact/reference email |

Administrator authority is controlled by the user's database role. Environment variables must not automatically promote users to administrator.

## Stripe

Core Stripe variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Membership catalogue variables:

- `STRIPE_INDIE_MONTHLY_PRICE_ID`
- `STRIPE_INDIE_ANNUAL_PRICE_ID`
- `STRIPE_CREATOR_MONTHLY_PRICE_ID`
- `STRIPE_CREATOR_ANNUAL_PRICE_ID`
- `STRIPE_STUDIO_MONTHLY_PRICE_ID`
- `STRIPE_STUDIO_ANNUAL_PRICE_ID`

Credit-pack variables:

- `STRIPE_TOPUP_10_PRICE_ID`
- `STRIPE_TOPUP_30_PRICE_ID`
- `STRIPE_TOPUP_100_PRICE_ID`
- `STRIPE_TOPUP_200_PRICE_ID`
- `STRIPE_TOPUP_500_PRICE_ID`
- `STRIPE_TOPUP_1000_PRICE_ID`

Marketplace variables include `STRIPE_DESIGNER_YEARLY_PRICE_ID`, `STRIPE_CONNECT_RETURN_URL` and `STRIPE_CONNECT_REFRESH_URL`.

Use the active application constants and Stripe catalogue as the source of truth for quantities and pricing. Do not copy quantities from historical implementation reports.

## Email

Supported transactional email variables include:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Configure at least one intentional delivery path in production.

## Storage

Application storage:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_S3_ENDPOINT`
- `AWS_S3_PUBLIC_URL`

Compliance archive:

- `COMPLIANCE_ARCHIVE_BUCKET`
- `COMPLIANCE_RETENTION_DAYS`
- `COMPLIANCE_ARCHIVE_ENABLED`
- `COMPLIANCE_ARCHIVE_SCAN_INTERVAL_MS`
- `COMPLIANCE_ARCHIVE_BATCH_SIZE`
- `COMPLIANCE_ARCHIVE_MAX_BYTES`
- `COMPLIANCE_SIGNED_URL_SECONDS`

The compliance archive must use private storage. Do not apply a public-read policy to that bucket.

## Broadcast bridge

Managed and AI-assisted broadcasting use:

- `BROADCAST_BRIDGE_URL`
- `BROADCAST_BRIDGE_TOKEN`

Direct standard broadcasting does not require the bridge. Adult Studio broadcasting remains managed because recording and compliance retention are mandatory.

## AI providers

Platform-level provider keys are optional unless that managed integration is intentionally enabled. Users may supply BYOK credentials through the application.

Common variables include:

- `OPENAI_API_KEY`
- `RUNWAY_API_KEY` or legacy `RUNWAYML_API_SECRET`
- `FAL_KEY`
- `GOOGLE_API_KEY`
- `HUGGING_FACE_API_KEY`
- `GROQ_API_KEY`
- `POLLINATIONS_API_KEY`
- `VENICE_API_KEY`
- `TITAN_API_URL`
- `TITAN_API_KEY`

Never log provider keys or return them through client APIs.

## Verification, monitoring and releases

- `SENTRY_DSN`
- `VITE_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `IOS_DOWNLOAD_URL`
- `ANDROID_DOWNLOAD_URL`
- `DESKTOP_RELEASES_REPO`
- `DESKTOP_MAC_URL`
- `DESKTOP_WIN_URL`
- `DESKTOP_LINUX_URL`
- `DESKTOP_VERSION`
- `GITHUB_TOKEN`

Download URLs should remain unset until a verified public release exists.

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Run the full verification gate before pushing:

```bash
pnpm verify
```

## Security rules

- Never commit `.env` or real credentials.
- Never store a live connection string in a note or report.
- Only publish explicitly client-safe variables such as publishable Stripe keys.
- Rotate any credential that enters Git history; deleting the current file is not sufficient.
- Use separate secrets for JWT and session signing.
- Review Render environment changes as production changes.
