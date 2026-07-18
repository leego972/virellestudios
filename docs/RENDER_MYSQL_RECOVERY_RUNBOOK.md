# Virelle Studios — Render/MySQL production recovery

## Decision

Virelle Studios is MySQL-native. The production recovery path is therefore:

- Render Web Service for the application
- External managed MySQL 8.x database
- No Render PostgreSQL database

The code currently depends on `mysql2`, `drizzle-orm/mysql2`, `mysqlTable`, `mysqlEnum`, MySQL auto-increment behaviour and MySQL upsert semantics. Converting the full application to PostgreSQL is a separate migration project and must not be attempted during an emergency recovery.

## Required Render environment

Set these before deployment:

- `NODE_ENV=production`
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl-mode=REQUIRED`
- `JWT_SECRET=<long random value>`
- `SESSION_SECRET=<different long random value>`
- `GMAIL_USER=<password reset sender account>`
- `GMAIL_APP_PASSWORD=<Google app password>`
- `EMAIL_FROM=<verified sender address>`
- `ADMIN_EMAIL=<owner/admin address>`

Retain all existing Stripe, AI provider, storage, OAuth and Sentry variables from the previous working service.

## Database restoration

Preferred order:

1. Restore the latest Railway MySQL dump into the replacement managed MySQL database.
2. If no dump exists, create a fresh MySQL 8.x database and run the repository migrations against it from a trusted workstation or one-off environment containing development dependencies:

```bash
pnpm install --frozen-lockfile
DATABASE_URL='mysql://...' pnpm db:push
```

3. Confirm the `users` and `password_reset_tokens` tables exist before testing authentication.
4. Run `node seed-admin.mjs` with the production `DATABASE_URL` and `ADMIN_EMAIL` only after migrations have completed.

## Deployment

1. Deploy the current default branch containing the recovery commits.
2. Use Docker deployment and `/api/healthz` as the health-check path.
3. Confirm logs do not contain:
   - `DATABASE_URL not set`
   - `DATABASE_URL is not a MySQL connection string`
   - `Database not available`
   - connection refused, access denied or TLS errors
4. Confirm `/api/healthz` returns HTTP 200.

## Acceptance tests

Run in this order:

1. Open the public landing page.
2. Register a temporary user.
3. Log out and log back in.
4. Request a password-reset email.
5. Open the reset link and set a new password.
6. Log in with the new password.
7. Verify the owner/admin account can access the dashboard.
8. Verify one read/write database action, such as creating and reopening a test project.
9. Delete the temporary user/test data if appropriate.

## Recovery commits

- `297cb920d5e9cfcb2d13914054f3b29874972d2f` — mobile Forgot Password layout repair
- `43e0f8d47dc0492d2210f52821845a3040b23b61` — Render blueprint corrected for external MySQL
- `0dbba8ae59b350199aee80903e0b2481603b7c2c` — production environment validation hardened

## Do not do during recovery

- Do not attach Render PostgreSQL to `DATABASE_URL`.
- Do not convert Drizzle schema files to PostgreSQL during the recovery deployment.
- Do not redesign authentication or replace the session system.
- Do not delete existing Stripe, OAuth, email, storage or AI variables.
- Do not mark recovery complete until registration, login and password reset have all been tested live.
