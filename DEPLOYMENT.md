# Virelle Studios — Railway Deployment & Domain Setup

## Prerequisites

- A [Railway](https://railway.app) account
- The GitHub repository `leego972/virellestudios` (or your fork)
- Access to GoDaddy DNS for the `Virelle.life` domain

---

## Step 1: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select the `leego972/virellestudios` repository.
4. Railway will auto-detect the `Dockerfile` and `railway.toml`.

### Add a Database

5. In your Railway project, click **New** → **Database** → **MySQL** (or **PostgreSQL** if you switch the driver).
6. Railway will provision the database and inject `DATABASE_URL` automatically.

### Set Environment Variables

7. Go to your service **Variables** tab and add:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway MySQL plugin |
| `JWT_SECRET` | A random 64-character string for signing tokens |
| `OAUTH_SERVER_URL` | Your OAuth provider base URL |
| `VITE_APP_ID` | Your Manus OAuth application ID |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `PORT` | Railway sets this automatically; the app reads it |

> **Tip:** Generate a secure JWT secret with: `openssl rand -hex 32`

### Deploy

8. Railway will build and deploy automatically on every push to the `main` branch.
9. Once deployed, Railway provides a default URL like `virellestudios-production.up.railway.app`.

---

## Step 2: Connect Virelle.life Domain (GoDaddy)

### In Railway

1. Open your deployed service in Railway.
2. Go to **Settings** → **Networking** → **Custom Domain**.
3. Click **Add Custom Domain** and enter: `virelle.life`
4. Railway will show you a **CNAME target** (e.g., `cname.railway.app` or similar).
5. Optionally, also add `www.virelle.life` as a second custom domain.

### In GoDaddy — Exact DNS Settings

1. Log in to [GoDaddy](https://www.godaddy.com) → **My Products** → **DNS** for `Virelle.life`.
2. Click **Manage DNS** (or **DNS Management**).
3. Delete any existing **A** or **CNAME** records for `@` and `www` that point elsewhere.

> **Important:** GoDaddy does **NOT** support CNAME records on the root domain (`@`). Use one of the three options below.

---

**Option A — Recommended: Cloudflare free DNS proxy (supports root CNAME)**

1. Create a free [Cloudflare](https://cloudflare.com) account and add `virelle.life`.
2. In Cloudflare DNS, add these records:

| Type | Name | Content | Proxy | TTL |
|---|---|---|---|---|
| CNAME | `@` | `<Railway CNAME target>` | Proxied ☁️ | Auto |
| CNAME | `www` | `<Railway CNAME target>` | Proxied ☁️ | Auto |

3. In GoDaddy → **DNS** → **Nameservers** → **Change** → **Enter my own nameservers**.
4. Enter the two Cloudflare nameservers shown in your Cloudflare dashboard (e.g., `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
5. Save. Propagation typically takes 5–30 minutes.

---

**Option B — GoDaddy only, using A records**

Add these exact records in GoDaddy DNS:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `66.33.27.47` | 600 |
| A | `@` | `66.33.27.48` | 600 |
| CNAME | `www` | `<Railway CNAME target>` | 600 |

> Check [docs.railway.app](https://docs.railway.app/deploy/exposing-your-app#custom-domains) for the latest Railway IP addresses as they may change.

---

**Option C — GoDaddy Domain Forwarding (simplest)**

1. In GoDaddy DNS → **Forwarding** → add a **Domain** forward: `virelle.life` → `https://www.virelle.life` (301 Permanent).
2. Add a CNAME for `www`:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `www` | `<Railway CNAME target>` | 600 |

---

### Verify in Railway

5. Go back to Railway → **Settings** → **Custom Domain**.
6. Railway will show a **green checkmark** once DNS is verified.
7. Railway automatically provisions an SSL/HTTPS certificate — this takes 2–5 minutes after DNS verification.

### Troubleshooting GoDaddy DNS
- "CNAME records cannot be created for the root domain" — expected on GoDaddy; use Option A or B above.
- Use [dnschecker.org](https://dnschecker.org) or [whatsmydns.net](https://www.whatsmydns.net) to check propagation globally.

---

## Step 3: Verify Deployment

1. Visit `https://virelle.life` in your browser.
2. You should see the Virelle Studios login/landing page.
3. Test the OAuth login flow.
4. Create a test project to verify database connectivity.

---

## Troubleshooting

### DNS not resolving
- DNS changes can take up to 48 hours to propagate globally, but typically resolve within 30 minutes.
- Use [dnschecker.org](https://dnschecker.org) to verify propagation.

### Build fails on Railway
- Check the Railway build logs for errors.
- Ensure all environment variables are set correctly.
- Verify the `Dockerfile` builds successfully locally: `docker build -t virelle .`

### Database connection issues
- Ensure `DATABASE_URL` is correctly set in Railway variables.
- If using Railway's MySQL plugin, the URL is auto-injected.
- Check that the database service is running in your Railway project.

### SSL certificate pending
- Railway auto-provisions SSL certificates via Let's Encrypt.
- This can take a few minutes after DNS verification.
- If it takes longer than 30 minutes, try removing and re-adding the custom domain.

---

## Architecture Notes

- **Frontend:** React + Vite (built to `dist/client/`)
- **Backend:** Express + tRPC (bundled to `dist/index.js`)
- **Database:** MySQL via Drizzle ORM
- **Storage:** S3-compatible storage for file uploads
- **Auth:** JWT-based with Manus OAuth integration
