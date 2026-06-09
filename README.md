# Virelle Studios

AI-native film studio in the browser. Generate scripts, voices, footage,
soundtracks, and final-cut assemblies via a unified pipeline backed by
Pollinations, OpenRouter, ElevenLabs, Vast.ai (GPU rendering), and a
Stripe-billed credit system.

This repository is the production deployment for `https://virelle.life`,
hosted on Railway.

---

## Local development

```bash
pnpm install
pnpm dev
```

The dev server reads from `.env.example` (copy it to `.env` and fill in
real values for any provider you want to exercise locally).

## Verification

Before pushing or opening a PR:

```bash
pnpm check
pnpm build
pnpm audit --audit-level high
```

Or as one command:

```bash
pnpm verify
```

These same three commands run in **Security CI**
(`.github/workflows/security-ci.yml`) on every push and pull request to
`main`, plus a tracked-file secret-pattern scan.

## Production deployment

`main` is auto-deployed to Railway on every push. The deploy fails
fast if any required environment variable is missing
(`server/_core/env.ts`).

For the full deployment procedure — required environment variables,
Stripe webhook setup, custom-domain DNS, maintenance-route protocol —
see **[`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

For incident response, smoke tests, monitoring, rollback, and
provider-outage playbooks, see **[`RUNBOOK.md`](./RUNBOOK.md)**.

For the security model and how to report a vulnerability, see
**[`SECURITY.md`](./SECURITY.md)**.

---

## Project layout

```
server/_core/   Express + tRPC server entrypoint, env, context, auth
server/         tRPC routers, business logic, Drizzle schema
client/         React + Vite single-page application
shared/         Types and constants shared between client and server
scripts/        One-shot scripts (mobile-constants sync, etc.)
.github/        CI workflows (CI, Security CI, desktop release, …)
```

## Tech stack

- **Frontend:** React + Vite
- **Backend:** Express + tRPC
- **Database:** MySQL via Drizzle ORM
- **Storage:** S3-compatible object storage
- **Auth:** JWT with Manus OAuth
- **Billing:** Stripe (subscriptions + credit packs)
- **AI:** Pollinations · OpenRouter · ElevenLabs · Vast.ai

