# Virelle Studios Testing Checklist

Use this checklist for production releases. Automated checks are required; manual checks should focus on the workflows changed by the release.

## Automated gate

```bash
pnpm verify
```

The pull request must also pass:

- CI
- Security CI
- App Debug and Parity Gate

Do not deploy when TypeScript, tests, production build, dependency audit, secret scan or applicable parity checks fail.

## Public pages

- [ ] Landing page loads without a blank screen or duplicate branding overlays
- [ ] Official Virelle Studios logo and watermark render correctly
- [ ] Showcase loads and handles empty/error states
- [ ] Pricing displays the active AUD membership, credit and broadcast-minute pricing
- [ ] About, Blog, Contact, FAQ and How It Works load
- [ ] Terms, Privacy, Acceptable Use, AI Content and IP policies load
- [ ] Mobile layouts have no horizontal overflow

## Authentication

- [ ] Registration/onboarding succeeds for a new user
- [ ] Login succeeds with a valid account
- [ ] Invalid or expired sessions fail safely
- [ ] Logout clears the session
- [ ] Protected routes reject unauthenticated users
- [ ] Normal users cannot access administrator procedures

## Core production workflow

- [ ] Dashboard loads projects and handles API errors
- [ ] Project creation succeeds
- [ ] Character and wardrobe workflows load
- [ ] A low-cost generation completes
- [ ] Failed generation does not leave an unrecoverable credit debit
- [ ] Upload and download paths work
- [ ] Final asset links remain accessible under the intended permissions

## Payments and entitlements

- [ ] Stripe checkout opens once and resists duplicate submission
- [ ] Successful membership checkout updates the account
- [ ] Credit-pack checkout grants the documented amount once
- [ ] Broadcast-minute checkout grants the documented amount once
- [ ] Wardrobe or marketplace purchases fulfil once
- [ ] Replayed Stripe events are idempotent
- [ ] Failed payment and cancellation paths remain clear

For local webhook testing:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Broadcast

- [ ] Direct standard broadcast does not require BYOK or managed minutes
- [ ] Managed relay requires sufficient output minutes but not BYOK
- [ ] AI-assisted relay requires output minutes and a funded BYOK provider
- [ ] Adult Studio rejects direct mode
- [ ] Adult Studio managed broadcast records and retains compliance evidence
- [ ] Output-minute calculation equals duration multiplied by destination count
- [ ] Rejected pre-acceptance sessions release minute reservations

## Compliance and security

- [ ] `/api/healthz` reports `status=ok` and `database=ok`
- [ ] `/api/health` reports `status=ok` and `database=ok`
- [ ] No server secret appears in browser source, network responses or logs
- [ ] Security headers are present
- [ ] Compliance archive objects are private
- [ ] Signed compliance URLs expire as configured
- [ ] Administrator and security actions are audit logged

## Clients

- [ ] Web and server parity gate passes
- [ ] Swappys mobile typecheck/doctor passes
- [ ] Desktop Linux smoke build passes
- [ ] Download links remain hidden or unavailable when no verified release exists

## Release sign-off

- [ ] Merged commit matches the deployed Render revision
- [ ] Render container starts and migrations complete
- [ ] Health endpoints pass
- [ ] Changed workflows pass manual smoke tests
- [ ] Stripe webhook deliveries are healthy
- [ ] Logs and Sentry contain no new release-blocking errors
