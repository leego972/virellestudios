# Virelle Studios — Launch Operations Pack
**Status: READY TO OPERATE WITH WATCH ITEMS**
*Generated: April 2026 | Mode: Operations (not build)*

---

## PART 1 — SHARED LAUNCH OPERATIONS PACK

### Launch-Day Checklist
- [ ] Confirm `virelle.life` DNS resolves to Railway (`151.101.2.15`)
- [ ] Confirm `www.virelle.life` CNAME resolves to Railway
- [ ] Hit `/api/health` — confirm `status: ok` and `version` matches latest commit
- [ ] Log in as admin — confirm `/admin/users`, `/admin/growth`, `/admin/security` load
- [ ] Make a test Stripe checkout (use test card `4242 4242 4242 4242`) — confirm credits granted
- [ ] Trigger a test webhook from Stripe dashboard — confirm `200 OK` response
- [ ] Confirm support email `support@virelle.life` is receiving mail
- [ ] Confirm `hello@virelle.life` forwards correctly
- [ ] Confirm opener video plays fully and golden logo holds for 2 seconds
- [ ] Confirm mobile deep-link returns to app after Stripe checkout
- [ ] Confirm Android APK download link is live and correct
- [ ] Confirm creator showcase page loads and displays content
- [ ] Confirm export/publish flow completes end-to-end

### First 72 Hours Checklist
- [ ] Check Railway logs every 4 hours for ERROR-level entries
- [ ] Check Stripe dashboard for failed payments or disputed charges
- [ ] Check `/admin/users` for new signups — verify plan assignments are correct
- [ ] Check `/admin/growth` for conversion funnel data
- [ ] Respond to any support emails within 4 hours
- [ ] Monitor for any auth failures (JWT errors in logs)
- [ ] Monitor for any webhook failures (Stripe dashboard → Webhooks → Recent deliveries)
- [ ] Check mobile billing return flow works on both iOS and Android
- [ ] Verify no 500 errors on key routes: `/api/health`, `/api/auth/*`, `/api/billing/*`

### Support Triage Flow
```
User reports issue
  → Is it a payment/billing issue?
      → YES → See Billing Triage below
      → NO → Is it a login/auth issue?
                → YES → See Auth Triage below
                → NO → Is it a feature/content issue?
                          → YES → Check Railway logs for errors on that route
                          → NO → Escalate to owner
```

### Billing Issue Triage Flow
1. Check Stripe dashboard → Customers → find user by email
2. Check subscription status: active / past_due / canceled
3. Check webhook delivery log for any failed events
4. If credits missing: check Railway logs for `[BILLING]` entries for that user
5. If plan wrong: check `subscriptions` table in DB for user's current tier
6. Manual fix: use `/admin/users` to adjust credits or plan if needed
7. If Stripe charge succeeded but credits not granted: re-trigger via admin panel or manually update DB

### Auth/Login Issue Triage Flow
1. Check if user can reach login page (DNS/CDN issue vs app issue)
2. Check Railway logs for `JWT` or `auth` errors around the time of complaint
3. Check if Google OAuth is returning errors (check Google Cloud Console → OAuth consent)
4. If session expired: ask user to clear cookies and log in again
5. If account locked: check `/admin/users` for account status
6. If OAuth loop: check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` env vars are set

### Deployment Rollback Checklist
1. Go to Railway dashboard → Virelle Studios → virellestudios service
2. Click "Deployments" → find last known-good deployment
3. Click "Rollback" on that deployment
4. Wait for deploy to complete (watch logs)
5. Hit `/api/health` to confirm rollback succeeded
6. Test login and one core feature
7. Notify users if outage was > 5 minutes

### Bug Severity Levels
| Level | Definition | Response Time |
|-------|-----------|---------------|
| P0 — Critical | Site down, no login, data loss, billing double-charge | Immediate (< 30 min) |
| P1 — High | Checkout broken, credits not granted, export failing | < 2 hours |
| P2 — Medium | Feature partially broken, UI error, slow response | < 24 hours |
| P3 — Low | Minor UI issue, cosmetic bug, non-blocking error | Next deploy |

### Incident Response Checklist
- [ ] Identify scope: is it one user or all users?
- [ ] Check `/api/health` — is the server up?
- [ ] Check Railway logs for ERROR entries
- [ ] Check Stripe dashboard for payment system status
- [ ] Check Railway status page: https://status.railway.app
- [ ] If server down: attempt Railway redeploy
- [ ] If DB issue: check Railway MySQL service health
- [ ] If Redis issue: check Railway Redis service health
- [ ] Communicate to affected users via support email
- [ ] Post-incident: document root cause and fix in `AUDIT_ISSUES.md`

### Owner Daily Review Checklist
- [ ] Check `/api/health` — confirm uptime and version
- [ ] Check Railway logs for overnight errors
- [ ] Check Stripe dashboard — new charges, failed payments, disputes
- [ ] Check `/admin/users` — new signups, plan distribution
- [ ] Check `/admin/growth` — conversion funnel
- [ ] Check support inbox — respond to any open tickets
- [ ] Check `/admin/security` — any suspicious activity
- [ ] Check showcase/creator activity for quality issues

---

## PART 2 — VIRELLE OPERATIONS SETUP

### Monitoring Coverage Assessment

| Event | Monitored? | Where |
|-------|-----------|-------|
| Auth failures | ✅ Yes | Railway logs — `JWT` / `auth` errors |
| Stripe checkout failures | ✅ Yes | Stripe dashboard + `[BILLING]` log entries |
| Webhook failures | ✅ Yes | Stripe dashboard → Webhooks + `logger.error` on sig failure |
| Deep-link return failures | ⚠️ Partial | Mobile app logs only — no server-side tracking |
| Mobile billing return issues | ⚠️ Partial | Stripe events captured; mobile return state not logged |
| Android download/install complaints | ❌ Manual | No automated monitoring — handle via support email |
| Project export/publish failures | ✅ Yes | Railway logs — route-level errors |
| Feature submission/moderation issues | ✅ Yes | Admin moderation panel + logs |

**Watch items:** Deep-link return and mobile billing return need explicit logging added in a future sprint.

### Virelle Support Cheat Sheet

**Failed checkout**
> Check Stripe dashboard for the user's email. If payment_intent shows `succeeded` but credits weren't granted, check Railway logs for `[BILLING] WEBHOOK_EVENT` entries. If webhook was missed, manually grant credits via `/admin/users`. Reply: *"We've confirmed your payment and have manually applied your credits. You should see them now — please refresh."*

**Missing credits**
> Check `/admin/users` → find user → check credit balance. Check Railway logs for `[BILLING] CREDIT_DEDUCTION` entries to see if credits were consumed. If credits were granted but consumed by a failed generation, offer a courtesy re-grant. Reply: *"We can see your credits were applied but consumed during a generation that didn't complete. We've re-granted them — please try again."*

**Wrong plan shown**
> Check `subscriptions` table for user's current tier. Check Stripe for active subscription. If mismatch: the webhook may have failed — check Stripe → Webhooks → Recent deliveries. Re-trigger the `customer.subscription.updated` event manually. Reply: *"We've synced your subscription — your correct plan is now showing. Please log out and back in."*

**Subscription not updating**
> Same as wrong plan. Additionally check if user is on a grandfathered plan. Verify Stripe subscription `status` is `active` not `trialing` or `past_due`. Reply: *"Your subscription has been updated on our end. Please log out and log back in to see the changes."*

**Mobile purchase return failed**
> Check if Stripe payment succeeded (Stripe dashboard). If yes but app didn't update: ask user to close and reopen the app. If still not updated: manually grant credits via `/admin/users`. Reply: *"Your purchase went through successfully. We've applied your credits manually — please close and reopen the app."*

**Android app install issue**
> Confirm the APK download URL is live. Check if user is on Android 8+ (minimum requirement). If install blocked: user needs to enable "Install from unknown sources" in Android settings. Reply: *"To install on Android: go to Settings → Security → enable 'Install unknown apps' for your browser, then retry the download."*

**Creator page/showcase issue**
> Check if the creator's content was moderated/hidden. Check `/admin/users` for account status. Check Railway logs for any errors on the showcase route. Reply: *"We're looking into your showcase page. If content was hidden, it may be under review — we'll notify you within 24 hours."*

**Export/publish issue**
> Check Railway logs for errors on the export route. Check if the generation job completed (check job queue status). If export file is missing: re-trigger export from admin panel. Reply: *"We've identified an issue with your export. We're re-processing it now and you'll receive a notification when it's ready."*

### Virelle Owner Daily Review Dashboard

Access these URLs daily (must be logged in as admin):

| Check | URL | What to look for |
|-------|-----|-----------------|
| New signups | `/admin/users` | Count, plan distribution, any suspicious patterns |
| Conversions | `/admin/growth` | Free → paid conversion rate, plan breakdown |
| Failed payments | Stripe Dashboard | `past_due` subscriptions, failed payment_intents |
| Support tickets | `support@virelle.life` inbox | Open/unanswered emails |
| Top errors | Railway Logs | Filter by `ERROR` level |
| Showcase activity | `/admin/users` → creator filter | New creator pages, flagged content |
| Export success rate | Railway Logs | Filter by export route errors |
| Mobile issues | Support inbox | Android/iOS specific complaints |

### Final Operator Sanity Pass

| Item | Status | Notes |
|------|--------|-------|
| Support contact visible | ✅ | `support@virelle.life` in footer on all pages |
| Billing management path | ✅ | `/billing` page with Stripe portal link |
| Moderation/admin tools | ✅ | `/admin/users`, `/admin/security` accessible |
| Growth dashboard | ✅ | `/admin/growth` with conversion data |
| Logs readable | ✅ | JSON structured logs via Railway log viewer |

---

## PART 4 — CUSTOMER READINESS

### Support Contact
- **Support email:** support@virelle.life
- **General contact:** hello@virelle.life
- **Response SLA:** 4 hours for P0/P1, 24 hours for P2/P3

### Refund/Cancellation Policy Notes
- Subscriptions: cancel anytime via `/billing` → Stripe portal; access continues until period end
- Credit packs: non-refundable once credits are consumed; partial refund if unused and within 24 hours
- Escalate to owner for any disputed charge > $50

### Response Templates

**Payment Issue Reply**
> Hi [Name], thanks for reaching out. We can see your payment was processed on our end. We've manually applied your [credits/plan] to your account. Please refresh the page or log out and back in — you should see the update immediately. If you're still having trouble, reply to this email and we'll sort it out right away. — Virelle Support

**Login Issue Reply**
> Hi [Name], sorry for the trouble logging in. Please try: (1) clearing your browser cookies, (2) using an incognito/private window, (3) trying a different browser. If you signed up with Google, make sure you're selecting the same Google account you used to register. If none of these work, reply with the email address you used to sign up and we'll get you in manually. — Virelle Support

**Subscription Mismatch Reply**
> Hi [Name], we can see there's a mismatch between your payment and what's showing in the app. We've manually synced your account to the correct plan. Please log out and log back in — your [plan name] plan should now be showing correctly. If not, reply and we'll fix it immediately. — Virelle Support

**Download/Install Issue Reply**
> Hi [Name], to install the Virelle app on Android: (1) download the APK from virelle.life, (2) go to Settings → Security → enable "Install unknown apps" for your browser, (3) open the downloaded file to install. If you're on iOS, the web app at virelle.life works fully in your mobile browser — add it to your home screen for the best experience. — Virelle Support

**Temporary Outage/Apology Reply**
> Hi [Name], we experienced a brief service interruption that has now been resolved. We're sorry for any inconvenience. Your account and any in-progress work are safe. If you were in the middle of a generation or export when the outage occurred, please retry — it should complete normally now. We're monitoring closely to prevent recurrence. — Virelle Support

---

## PART 5 — EARLY GROWTH / LIVE OPTIMIZATION

### Week 1 Metrics That Matter
| Metric | Why it matters |
|--------|---------------|
| Signup count | Baseline demand signal |
| Free → paid conversion rate | Product-market fit signal |
| Checkout completion rate | Funnel health |
| First generation completion rate | Onboarding success |
| Support ticket volume | Friction signal |
| Opener video completion rate | First impression quality |

### Month 1 Metrics That Matter
| Metric | Why it matters |
|--------|---------------|
| Monthly recurring revenue (MRR) | Business viability |
| Churn rate | Retention health |
| Credit consumption per user | Engagement depth |
| Creator page creation rate | Platform adoption |
| Export/publish success rate | Core value delivery |
| Mobile vs web split | Platform strategy |

### Immediate Intervention Triggers
- Checkout completion rate drops below 60% → check Stripe, check UI
- More than 3 auth failures per hour → check OAuth config, check JWT secret
- Any webhook failure → investigate immediately (credits at risk)
- Support inbox > 10 unanswered emails → triage and respond
- Railway health check fails → immediate incident response
- Any P0 bug report from a paid user → drop everything

### Do NOT Overreact To
- Single user reporting a bug (investigate but don't deploy hotfix immediately)
- Low signup numbers in first 48 hours (organic growth takes time)
- Occasional slow response times (Railway cold starts are normal)
- One failed payment (Stripe retries automatically)
- Minor UI complaints that don't block core flow

### Real Product Issues vs Onboarding Confusion
| Signal | Likely cause |
|--------|-------------|
| "I can't log in" from multiple users | Real auth issue |
| "I can't log in" from one user | Onboarding confusion — guide them |
| "My credits disappeared" from multiple users | Real billing bug |
| "My credits disappeared" from one user | Check their usage log first |
| "The app is slow" from multiple users | Real performance issue |
| "The app is slow" from one user | Their network or device |
| "I don't understand how to use X" | Onboarding gap — note for docs |

---

## PART 6 — FINAL VERDICT

### Virelle Studios: **READY TO OPERATE WITH WATCH ITEMS**

**Green (working correctly):**
- Health endpoint: `/api/health` ✅
- Structured logging with billing audit trail ✅
- Stripe webhook handling with signature verification ✅
- Admin tools: users, growth, security, autonomous ✅
- Support contact visible in footer on all pages ✅
- Billing management via Stripe portal ✅
- Opener video: self-hosted, plays fully, 2s logo hold ✅
- DNS: `virelle.life` → Railway (propagating) ✅
- `www.virelle.life` CNAME → Railway ✅

**Watch Items (monitor closely):**
1. **Mobile deep-link return logging** — no server-side tracking when user returns from Stripe on mobile; rely on Stripe events only
2. **Billing log persistence** — `logBillingEvent` logs to console but the DB write is commented out (`// await db.createBillingLog(entry)`) — logs are only in Railway log viewer, not queryable from admin panel
3. **DNS propagation** — `virelle.life` A record updated to `151.101.2.15`; allow up to 1 hour for full global propagation
4. **Android install UX** — no in-app guidance for "install unknown apps" setting; support will get these tickets
5. **Webhook retry handling** — if Railway is down during a Stripe webhook, the event will be retried by Stripe but there's no manual retry UI in the admin panel

**Recommended next actions (not build mode — operational only):**
- Enable DB persistence for billing logs (uncomment the DB write in `billingLog.ts`) — 30 min task
- Add a "Retry webhook" button to `/admin/users` for manual credit recovery — 1 hour task
- Set up UptimeRobot (free) to ping `/api/health` every 5 minutes and alert via email

---
*This document is the operational reference for Virelle Studios. Update after each incident.*
