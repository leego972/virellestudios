# Virelle Studios Production Runbook

Operational procedures for `https://virelle.life`. Deployment configuration is documented in [`DEPLOYMENT.md`](./DEPLOYMENT.md); security reporting and controls are documented in [`SECURITY.md`](./SECURITY.md).

## Ownership

- Repository: `leego972/virellestudios`
- Production branch: `main`
- Application host: Render
- Database: external managed MySQL 8-compatible service
- Public health endpoint: `https://virelle.life/api/healthz`

## Post-deployment smoke test

Run after every production deployment or rollback.

```text
[ ] CI, Security CI and App Debug/Parity passed for the deployed commit
[ ] Render deployment is live and uses the expected commit
[ ] /api/healthz reports status=ok and database=ok
[ ] /api/health reports status=ok and database=ok
[ ] Login succeeds
[ ] New-user registration/onboarding succeeds
[ ] Dashboard loads without client errors
[ ] Project creation succeeds
[ ] A low-cost test generation completes
[ ] Credits or entitlements change by the documented amount
[ ] Upload and download paths work
[ ] Normal users cannot access administrator procedures
[ ] Stripe test webhook returns 2xx without duplicate fulfilment
[ ] Managed broadcast configuration validates the bridge
[ ] Compliance archive worker is healthy when enabled
[ ] Logs and Sentry contain no new release-blocking errors
```

Do not declare the release healthy when the database reports `error` or when billing fulfilment is not idempotent.

## Monitoring

Review these signals during and after deployment:

- Render deployment and runtime logs
- `/api/healthz` availability and database status
- Sentry server and client errors
- Stripe webhook failures and payment failures
- Redis connection or rate-limit errors
- MySQL connection, migration and deadlock errors
- S3 upload/download failures
- AI provider error rates and timeouts
- Broadcast bridge authentication, recording and completion callbacks
- Compliance archive ingestion failures or retention exceptions
- Unusual administrator or security audit events

## Rollback procedure

1. Identify the last known-good commit and Render deployment.
2. Determine whether the incident is code-only, configuration-related or data-related.
3. For a code-only regression, redeploy the previous Render deployment or revert the offending merge commit.
4. For configuration drift, restore the previous Render environment values and redeploy.
5. For suspected data corruption, restrict writes before restoring data and preserve a forensic snapshot.
6. Verify both health endpoints.
7. Run the complete smoke test above.
8. Check Stripe, logs, Sentry, broadcast and compliance processing before reopening normal traffic.

Never roll back application code across an incompatible database migration without a reviewed database recovery plan.

## Incident playbooks

### Authentication failure

Check, in order:

1. `JWT_SECRET` and `SESSION_SECRET` are present and unchanged.
2. OAuth provider configuration and callback URLs match `https://virelle.life`.
3. `DATABASE_URL` is reachable and the user record exists.
4. Secure cookie settings are active under HTTPS.
5. Recent authentication or context changes did not alter role/session handling.

Administrator access is granted by the database role. Do not add environment-driven automatic promotion as a recovery shortcut.

### Database or migration failure

1. Inspect Render startup logs for the exact migration error.
2. Confirm the external MySQL service is reachable from Render.
3. Confirm `DATABASE_URL` uses the correct MySQL database and credentials.
4. Compare the migration ledger with files in `drizzle/`.
5. Test any corrective migration against a copy or staging database.
6. Redeploy only after the migration path is understood.

When credentials may be exposed, rotate them rather than merely editing documentation or source files.

### Stripe webhook or fulfilment failure

1. Confirm the webhook URL is `https://virelle.life/api/stripe/webhook`.
2. Confirm `STRIPE_WEBHOOK_SECRET` matches the active endpoint.
3. Confirm the raw-body webhook route is registered before JSON parsing.
4. Replay one failed event from Stripe.
5. Verify the event/session/invoice is recorded once and fulfilment is idempotent.
6. Confirm credits, subscriptions, wardrobe purchases and broadcast-minute purchases were not duplicated.

### Generation provider failure

1. Identify whether the request used a platform integration or user BYOK.
2. Check the provider response status and current provider availability.
3. Confirm the selected key is present and valid without logging it.
4. Confirm failed work did not consume credits permanently.
5. Confirm any reservation was released or refunded according to the workflow.
6. Disable only the affected provider path when a narrower mitigation is available.

### Broadcast failure

1. Determine the selected service mode: direct, managed or AI-assisted.
2. Direct standard broadcasting should not require BYOK or managed minutes.
3. Managed broadcasting requires bridge connectivity and sufficient output minutes, but not BYOK.
4. AI-assisted broadcasting requires bridge connectivity, output minutes and a funded user BYOK provider.
5. Adult Studio broadcasts must remain managed and recorded.
6. Verify minute reservations are released when the bridge rejects a session before acceptance.
7. Verify accepted sessions consume the correct duration multiplied by destination count.

### Compliance archive failure

1. Confirm `COMPLIANCE_ARCHIVE_ENABLED` is intentionally enabled.
2. Confirm the private archive bucket and storage credentials are valid.
3. Check archive-worker logs and pending items.
4. Confirm retained objects are private and signed URLs are short-lived.
5. Do not delete evidence under legal hold.
6. Escalate before bypassing retention or recording requirements.

### Storage failure

1. Confirm S3 endpoint, region, bucket and credentials.
2. Test a small upload and download without exposing signed URLs in logs.
3. Check object permissions; production assets and compliance evidence have different privacy requirements.
4. Confirm failed uploads do not leave completed jobs pointing at unavailable objects.

## Credential exposure response

When a secret enters Git, logs, screenshots, issues or documentation:

1. Revoke or rotate the credential immediately.
2. Update the Render environment variable.
3. Redeploy and confirm the affected service works.
4. Search the current repository for duplicates.
5. Review access logs where available.
6. Record the incident without reproducing the secret.

Removing the current file is necessary repository hygiene but does not invalidate a credential preserved in Git history.

## Routine maintenance

Monthly:

- Review dependency audit results.
- Remove closed, merged and superseded branches from GitHub.
- Review stale environment aliases and provider integrations.
- Confirm backup and restore procedures.
- Confirm Stripe webhook health and catalogue consistency.
- Confirm compliance retention jobs are completing.
- Review repository root files and move historical reports to `docs/archive/`.

Quarterly:

- Exercise a Render rollback.
- Exercise a MySQL restore in a non-production environment.
- Rotate high-value operational secrets according to provider policy.
- Review administrator accounts and audit logs.
