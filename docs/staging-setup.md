# Virelle Studios — Staging Environment Setup

This document describes how to set up and maintain the staging environment for Virelle Studios.

## Overview

| Environment | Domain | Branch | Railway Project |
|-------------|--------|--------|-----------------|
| Production | `virelle.life` | `main` | `virellestudios` |
| Staging | `staging.virelle.life` | `staging` | `virellestudios-staging` |

## Railway Setup

### 1. Create the Staging Project

1. Log in to [Railway](https://railway.app) and create a new project named `virellestudios-staging`.
2. Add a **MySQL** service (Railway provides managed MySQL).
3. Add a **Web Service** pointing to the `virellestudios` GitHub repo, branch `staging`.

### 2. Configure Environment Variables

Copy all variables from `.env.staging` into the Railway staging project's environment variables panel. Replace every `REPLACE_WITH_*` placeholder with real values.

**Critical rules for staging:**
- Always use **Stripe test mode** keys (`sk_test_*`, `pk_test_*`). Never use live keys in staging.
- Use a **separate Sentry DSN** for staging so staging errors are isolated from production alerts.
- The `DATABASE_URL` must point to the Railway staging MySQL instance, not production.

### 3. Database Migration

After provisioning the staging MySQL service, run:

```bash
DATABASE_URL=<staging_db_url> pnpm db:push
```

### 4. Custom Domain

In Railway, add `staging.virelle.life` as a custom domain for the staging web service. Then add a CNAME record in your DNS provider:

```
staging.virelle.life  CNAME  <railway-generated-domain>.railway.app
```

## GitHub Actions Integration

The CI pipeline (`.github/workflows/ci.yml`) runs Playwright E2E tests against the staging URL on every push to the `staging` branch. The `E2E_BASE_URL` secret must be set to `https://staging.virelle.life` in the GitHub repo settings for the `staging` environment.

### Setting up GitHub Environments

1. Go to **Settings → Environments** in the GitHub repo.
2. Create a `staging` environment.
3. Add the following secrets:
   - `E2E_BASE_URL` = `https://staging.virelle.life`
   - `STRIPE_PUBLISHABLE_KEY` = Stripe test publishable key

## Stripe Test Mode

To create test price IDs for staging:

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com) and switch to **Test mode**.
2. Navigate to **Products** and create products matching the production tier names.
3. Copy the price IDs (format: `price_test_*`) into the Railway staging environment variables.

Alternatively, the auto-provisioning system in `stripeProvisioning.ts` will create the products and prices automatically on first server startup if the price IDs are not set.

## Sentry Staging Project

1. In [Sentry](https://sentry.io), create a new project named `virellestudios-staging`.
2. Copy the DSN and add it as `SENTRY_DSN` and `VITE_SENTRY_DSN` in Railway staging.
3. Set `SENTRY_ENVIRONMENT=staging` so alerts are tagged correctly.

## Deployment Workflow

```
feature branch → PR → staging branch (auto-deploy to staging) → PR → main (auto-deploy to production)
```

The staging deployment is triggered automatically by Railway when commits are pushed to the `staging` branch.
