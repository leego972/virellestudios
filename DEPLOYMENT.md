# Virelle Studios Deployment Guide

This document describes the current production deployment. Render is the active application host. The application is MySQL-native and must not be connected to a PostgreSQL database.

## Production architecture

| Layer | Production implementation |
|---|---|
| Web service | Render Docker service |
| Frontend | React + Vite static bundle served by Express |
| Backend | Express 5 + tRPC on Node.js 24 |
| Database | External managed MySQL 8-compatible service |
| Cache and rate limiting | Redis |
| Storage | S3-compatible object storage |
| Payments | Stripe |
| Error tracking | Sentry when configured |
| Domain | `https://virelle.life` |

The canonical infrastructure files are `render.yaml`, `Dockerfile` and `start.sh`.

## Local development

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Use a non-production MySQL database. Do not paste connection strings or credentials into documentation, issues, pull requests or source files.

Run the verification gate before pushing:

```bash
pnpm verify
```

## Render service setup

Create or update the service from `render.yaml`.

The service uses:

- Docker runtime
- `Dockerfile` at the repository root
- `/api/healthz` as the health-check path
- `start.sh` as the container command
- the `main` branch as the production source

`start.sh` performs the following sequence:

1. Runs `run-migrations.mjs` with bounded retries.
2. Refuses to start when migrations cannot complete.
3. Starts Express on an internal port.
4. Starts the public gateway on Render's assigned `PORT`.
5. Handles termination signals and shuts down both processes cleanly.

Do not attach a Render PostgreSQL database. Set `DATABASE_URL` to an external MySQL 8-compatible service.

## Required environment groups

Set secrets in Render's environment-variable panel. Do not commit real values.

### Core runtime

- `NODE_ENV=production`
- `PUBLIC_APP_URL=https://virelle.life`
- `DATABASE_URL`
- `JWT_SECRET`
- `SESSION_SECRET`
- `REDIS_URL`

### Email

Configure at least one supported transactional email path:

- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `RESEND_API_KEY`
- `EMAIL_FROM`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- the membership and pack price IDs used by the active Stripe catalogue
- Stripe Connect return and refresh URLs when marketplace payouts are enabled

### Storage and compliance archive

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `AWS_S3_ENDPOINT`
- `AWS_REGION`
- `COMPLIANCE_ARCHIVE_BUCKET`
- compliance retention and signed-URL settings from `.env.example`

The compliance archive bucket must be private and encrypted with no public-read policy.

### Authentication and administration

- `OAUTH_SERVER_URL` or the configured direct OAuth provider credentials
- `VITE_APP_ID`
- `ADMIN_EMAIL`

Administrator authority is database-role based. Do not restore automatic admin promotion through environment variables.

### AI providers

Provider keys are optional unless a particular platform-managed integration is enabled. Virelle supports user BYOK for generation and AI-assisted broadcast processing. Configure only the platform integrations that are intentionally operated.

### Broadcast

Managed and AI-assisted broadcasting require:

- `BROADCAST_BRIDGE_URL`
- `BROADCAST_BRIDGE_TOKEN`

Adult Studio broadcasting must use the managed path because recording and compliance retention are mandatory.

## Database migrations

Production migrations run automatically during container startup through `run-migrations.mjs`.

For schema changes:

1. Test the migration against a disposable or staging MySQL database.
2. Confirm rollback or forward-repair steps.
3. Merge only after CI, Security CI and parity checks pass.
4. Allow the Render deployment to run the migration.
5. Verify `/api/healthz` and the affected workflow.

Do not run an unreviewed schema push against production.

## Stripe webhook

Configure this endpoint in Stripe:

```text
https://virelle.life/api/stripe/webhook
```

At minimum, subscribe to the events used by the application, including checkout completion, subscription lifecycle, invoice payment and payment-failure events. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

After deployment, send a Stripe test event and verify a 2xx response. Replaying the same event must not duplicate credits, purchases or subscription effects.

## Health verification

Render checks:

```text
GET /api/healthz
```

Operators may also use:

```text
GET /api/health
```

A healthy response reports `status: "ok"` and `database: "ok"`. A database error should return a degraded status and must block release sign-off.

## Release procedure

1. Open a focused pull request against `main`.
2. Require green CI, Security CI and App Debug/Parity checks.
3. Squash-merge the pull request.
4. Confirm Render deploys the merged commit.
5. Verify both health endpoints.
6. Run the smoke checklist in `RUNBOOK.md`.
7. Check Stripe webhook deliveries, application logs and Sentry.

## Rollback

For a code-only regression, redeploy the previous known-good Render deployment or revert the offending merge commit and redeploy `main`.

For a migration-related incident:

1. Stop or restrict writes when data integrity is at risk.
2. Preserve a forensic snapshot before restoring anything.
3. Restore or forward-repair using the documented migration plan.
4. Redeploy a compatible application revision.
5. Run health, authentication, billing and generation smoke tests.

## Credential incidents

Deleting a secret from the current branch does not remove it from Git history. When any password, token, private key or connection string is committed:

1. Revoke or rotate it immediately at the provider.
2. Update the Render environment variable.
3. Redeploy and verify connectivity.
4. Search the repository for additional copies.
5. Consider history rewriting only as an additional containment step, never as a substitute for rotation.
