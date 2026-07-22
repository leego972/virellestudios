# Virelle Studios

Virelle Studios is a production web application for AI-assisted film development, character and wardrobe continuity, VFX, post-production, broadcast, commercial packaging, marketplace workflows and verified Adult Studio operations.

Production is served at `https://virelle.life` from the `main` branch using Render's Docker runtime.

## Development

Requirements:

- Node.js 24
- pnpm 10.4.1
- MySQL 8-compatible database
- Redis for distributed rate limiting and production queues

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Do not place real credentials, connection strings or API keys in Markdown files. Store local values in `.env` and production values in Render environment variables.

## Verification

Run the complete local gate before opening a pull request:

```bash
pnpm verify
```

This runs TypeScript checking, unit and integration tests, a production build and the dependency audit. GitHub Actions also runs the normal CI, Security CI and application parity gates for pull requests targeting `main`.

## Deployment

The canonical production configuration is:

- `render.yaml` — Render service and environment-variable declaration
- `Dockerfile` — reproducible build and runtime image
- `start.sh` — migrations, application startup and gateway lifecycle
- `run-migrations.mjs` — production migration runner

Health endpoints:

- `/api/healthz` — Render health check
- `/api/health` — operational health response

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for setup and release procedures and [`RUNBOOK.md`](./RUNBOOK.md) for verification, rollback and incident handling.

## Repository layout

```text
apps/swappys-mobile/  Swappys mobile client
desktop/              Desktop packaging client
client/               React and Vite web application
server/_core/          Server entrypoint, auth, billing and shared runtime services
server/                tRPC routers, workers and business logic
shared/                Shared types and constants
drizzle/               MySQL migrations
scripts/               Verification, synchronization and deployment utilities
docs/                  Current technical documentation and archived reports
.github/workflows/      CI, security and parity automation
```

## Core stack

- **Frontend:** React 19, Vite and Tailwind CSS
- **Backend:** Express 5 and tRPC
- **Database:** MySQL 8 via Drizzle ORM
- **Cache/queues:** Redis
- **Storage:** S3-compatible object storage
- **Billing:** Stripe subscriptions, credit packs, Connect and broadcast-minute purchases
- **Deployment:** Render Docker service
- **AI providers:** User BYOK and configured platform integrations

## Security

Report vulnerabilities using the process in [`SECURITY.md`](./SECURITY.md). Never commit secrets. Any credential accidentally committed must be revoked or rotated because deleting the file does not remove it from Git history.
