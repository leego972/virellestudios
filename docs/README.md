# Virelle Studios Documentation

This directory contains current technical documentation and historical implementation records.

## Canonical operating documents

The following files describe the current production system and take precedence over older reports:

- [`../README.md`](../README.md) — repository overview and development workflow
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — Render, Docker, MySQL, migrations and release process
- [`../RUNBOOK.md`](../RUNBOOK.md) — smoke tests, rollback and incident response
- [`../SECURITY.md`](../SECURITY.md) — security controls and vulnerability reporting
- [`../ENVIRONMENT.md`](../ENVIRONMENT.md) — environment-variable reference
- [`RENDER_MYSQL_RECOVERY_RUNBOOK.md`](./RENDER_MYSQL_RECOVERY_RUNBOOK.md) — database recovery procedures
- [`SWAPPYS_BROADCAST_DEPLOYMENT.md`](./SWAPPYS_BROADCAST_DEPLOYMENT.md) — broadcast bridge deployment details

## Historical reports

Versioned implementation reports, audit checkpoints and design briefs document how features evolved. They are not authoritative for current pricing, hosting, security or runtime behaviour.

Use the current source code, tests and canonical operating documents when a historical report conflicts with the active implementation.

## Documentation rules

- Keep current operational guidance in the canonical documents above.
- Place completed implementation reports and superseded working notes under `docs/archive/`.
- Do not create deployment notes at the repository root.
- Never include passwords, tokens, private keys or live connection strings in documentation.
- Use exact dates and version identifiers for historical reports.
- Update documentation in the same pull request as material runtime or infrastructure changes.
