# Contributing to Virelle Studios

## Branches

- Create focused branches from `main`.
- Use descriptive prefixes such as `fix/`, `feature/`, `chore/` or `docs/`.
- Do not combine unrelated product, infrastructure and billing changes in one pull request.
- Delete merged and superseded branches after the change is safely in `main`.

## Verification

Before opening a pull request:

```bash
pnpm verify
```

Pull requests must pass CI, Security CI and the application parity gates before merge.

## Pull requests

A pull request should state:

- the problem being solved;
- the implementation scope;
- files or systems affected;
- migration, billing, security or deployment risk;
- verification performed;
- rollback considerations for production changes.

Use squash merge for focused changes unless preserving multiple commits is operationally necessary.

## Repository organisation

- Keep application code under `client/`, `server/`, `shared/` and the relevant app directory.
- Keep database migrations under `drizzle/`.
- Keep reusable automation under `scripts/`.
- Keep current operating guidance in `README.md`, `DEPLOYMENT.md`, `RUNBOOK.md`, `SECURITY.md` and `ENVIRONMENT.md`.
- Move completed implementation reports and superseded notes to `docs/archive/`.
- Do not add temporary audit notes, deploy triggers or credential notes to the repository root.

## Secrets

Never commit:

- `.env` files;
- passwords or database URLs;
- API tokens or private keys;
- signed private-media URLs;
- unredacted customer or identity-verification data.

A committed credential must be revoked or rotated even after the file is removed.

## High-risk changes

Use a dedicated pull request and explicit regression tests for changes involving:

- authentication, sessions or administrator authority;
- Stripe, credits, subscriptions or purchase fulfilment;
- database migrations;
- BYOK credentials or provider routing;
- Adult Studio verification and compliance;
- broadcast recording or minute accounting;
- deployment startup, health checks or storage permissions.
