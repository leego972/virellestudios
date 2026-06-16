# Virelle Studios — Testing Checklist

  Run this checklist before every production deployment.

  ---

  ## Automated Tests

  ```bash
  npm run test        # Vitest unit tests
  npm run check       # TypeScript typecheck
  npm run build       # Full production build
  ```

  All three must pass with zero errors before deploying.

  ---

  ## Manual QA Checklist

  ### Public Pages

  - [ ] **Homepage** loads without blank screen or console errors
  - [ ] **Showcase** page loads; shows spinner while loading, content when done, no crash if API fails
  - [ ] **Pricing** page loads all three tiers with correct AUD amounts
  - [ ] **About**, **Blog**, **Contact**, **FAQ**, **How It Works** all load
  - [ ] **Legal pages** (Terms, Privacy, AUP, AI Content Policy, IP Policy) all load

  ### Auth Flow

  - [ ] **Register** — form validates required fields before submit; button disables during submission; shows error on duplicate email
  - [ ] **Login** — form disables button while submitting; shows clear error on wrong password; redirects to dashboard on success
  - [ ] **Forgot password** — email input, form submits cleanly
  - [ ] **Logout** — clears session, redirects to home
  - [ ] **Protected routes** — visiting /projects while logged out redirects to /login

  ### Dashboard

  - [ ] **Home dashboard** loads projects list with skeleton while loading
  - [ ] **Home dashboard** shows retry button if projects API fails (do not leave blank)
  - [ ] **New project** flow — can create a project
  - [ ] **Projects list** — existing projects appear
  - [ ] **Characters** — page loads
  - [ ] **Settings** — page loads, tabs work

  ### Payments

  - [ ] **Pricing page** — subscribe button disables during checkout loading; shows spinner
  - [ ] **Stripe checkout** — redirects to Stripe; no double-click duplicate sessions
  - [ ] **Billing Success** page — shows confirmation after returning from Stripe
  - [ ] **Stripe webhook** — test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  - [ ] **Missing Stripe keys** — pricing page still loads; shows informative message if checkout fails

  ### Mobile

  - [ ] Homepage hero text scales down on iPhone (no overflow)
  - [ ] Pricing cards stack cleanly on mobile
  - [ ] Navigation/sidebar usable on mobile
  - [ ] No horizontal scrollbar on any public page
  - [ ] Modals fit within viewport

  ### API Health

  - [ ] `GET /api/health` returns `{"success":true,"status":"ok",...}`
  - [ ] `GET /api/healthz` returns same response

  ### Security

  - [ ] No `STRIPE_SECRET_KEY` or `JWT_SECRET` values visible in browser source or network tab
  - [ ] Admin pages (/admin/*) return 401/403 for non-admin users
  - [ ] Console shows no exposed API keys or secrets
  - [ ] Security headers present: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

  ---

  ## Browser Console Check

  Open DevTools → Console on each of these pages and confirm zero red errors:

  - [ ] Landing page (/)
  - [ ] Showcase (/showcase)
  - [ ] Pricing (/pricing)
  - [ ] Dashboard (/projects) — when logged in
  - [ ] Login (/login)

  ---

  ## Performance Spot-Check

  - [ ] Homepage first load < 3s on a standard connection
  - [ ] No obvious layout shift on homepage hero
  - [ ] Showcase images load with stable card dimensions
  - [ ] Pricing cards do not jump when loading

  ---

  ## Pre-Deploy Final Commands

  ```bash
  npm run check    # Must pass
  npm run build    # Must succeed — zero errors
  npm run test     # Must pass
  ```

  Do not deploy if any of these fail.
  