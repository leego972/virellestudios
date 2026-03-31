# Billing & Webhook Hardening Guide

## Overview

This document outlines the billing and webhook hardening measures implemented for production launch. These ensure credit integrity, prevent duplicate charges, and maintain accurate billing records.

---

## 1. Webhook Idempotency

### Problem
Stripe may deliver the same webhook multiple times if it doesn't receive a 2xx response. Without idempotency tracking, this can result in:
- Duplicate credit grants
- Duplicate subscription activations
- Incorrect billing records

### Solution
**File:** `server/_core/webhookIdempotency.ts`

The idempotency module tracks processed webhook IDs to ensure each event is handled exactly once:

```typescript
// Check if webhook was already processed
if (isWebhookProcessed(event.id)) {
  const result = getWebhookResult(event.id);
  res.json(result); // Return cached result
  return;
}

// Process webhook...
markWebhookProcessed(event.id, result);
```

### Implementation Checklist
- [ ] Import `isWebhookProcessed`, `markWebhookProcessed` in webhook handler
- [ ] Check idempotency at start of webhook processing
- [ ] Return cached result if already processed
- [ ] Mark webhook as processed after successful handling
- [ ] Mark webhook as failed if error occurs (for retry)

---

## 2. Billing Event Logging

### Problem
Without comprehensive logging, it's difficult to:
- Audit credit grants and deductions
- Investigate billing disputes
- Detect fraud or anomalies
- Maintain compliance records

### Solution
**File:** `server/_core/billingLog.ts`

The billing log module tracks all credit and subscription changes:

```typescript
// Log credit grant
await billingActions.creditGrant(userId, 500, "Top-up pack purchased", userEmail);

// Log subscription change
await billingActions.subscriptionChange(userId, "indie", "creator", "Upgrade", userEmail);

// Log webhook event
await billingActions.webhookEvent(userId, "checkout.session.completed", event.id, metadata);
```

### Implementation Checklist
- [ ] Add billing log calls to all credit mutations
- [ ] Add billing log calls to subscription changes
- [ ] Add billing log calls to webhook handlers
- [ ] Add billing log calls to refund operations
- [ ] Set up database table for billing logs (optional but recommended)

---

## 3. Credit Pack Validation

### Problem
Unknown or invalid pack IDs can result in:
- Granting incorrect credit amounts
- Silent failures with no audit trail
- Inconsistent credit amounts between frontend and backend

### Solution
**Current Implementation:** `server/_core/index.ts` (lines 186-206)

The webhook handler validates pack IDs against known amounts:

```typescript
const packAmounts: Record<string, number> = {
  topup_10:   500,
  topup_50:   1500,
  topup_100:  3000,
  topup_200:  6000,
  topup_500:  12000,
  topup_1000: 25000,
};

const credits = packAmounts[packId] || 0;
if (credits > 0) {
  // Grant credits
} else {
  logger.warn(`Unknown top-up pack ID: ${packId}`);
}
```

### Maintenance
- [ ] Keep `packAmounts` in sync with frontend pack definitions
- [ ] Update when adding new pack sizes
- [ ] Log warnings for unknown pack IDs
- [ ] Review logs regularly for unexpected pack IDs

---

## 4. Subscription State Consistency

### Problem
Subscription state can become inconsistent between Stripe and local database:
- Subscription marked active but payment failed
- Subscription canceled but credits still granted
- Tier mismatch between Stripe and database

### Solution
**Current Implementation:** `server/_core/index.ts` (webhook handlers)

The webhook handlers maintain consistency:

```typescript
// On checkout.session.completed
await db.updateUserSubscription(userId, {
  stripeCustomerId: customerId,
  stripeSubscriptionId: subscriptionId,
  subscriptionTier: tier,
  subscriptionStatus: "active",
});

// On customer.subscription.updated
await db.updateUserSubscription(userId, {
  subscriptionTier: tier,
  subscriptionStatus: status,
});

// On customer.subscription.deleted
await db.updateUserSubscription(userId, {
  subscriptionTier: "independent",
  subscriptionStatus: "canceled",
});
```

### Maintenance
- [ ] Verify all subscription webhooks update database state
- [ ] Add periodic reconciliation task (daily/weekly)
- [ ] Alert on state mismatches
- [ ] Document subscription state transitions

---

## 5. Rate Limiting on Billing Routes

### Problem
Attackers could:
- Spam checkout endpoints
- Attempt multiple refund requests
- Exploit billing APIs for DoS

### Solution
**File:** `server/_core/rateLimitRedis.ts`

New Redis-based rate limiting with production-safe multi-instance support:

```typescript
// In billing routes
await rateLimitBilling(userId); // 10 requests per minute

// In admin routes
await rateLimitAdmin(userId); // 30 requests per minute
```

### Implementation Checklist
- [ ] Set `REDIS_URL` environment variable in production
- [ ] Add rate limit checks to billing routes
- [ ] Add rate limit checks to admin routes
- [ ] Test multi-instance rate limiting
- [ ] Monitor rate limit hits in logs

---

## 6. Credit Mutation Logging

### Problem
Without detailed logs, it's impossible to:
- Trace credit changes
- Investigate user complaints
- Detect unauthorized mutations

### Solution
**Current Implementation:** `server/_core/index.ts` (webhook handlers)

All credit mutations are logged:

```typescript
logger.info(`Top-up pack ${packId} (+${credits} credits) applied for user ${userId}`);
logger.info(`Granted ${tierLimits.monthlyCredits} credits to user ${userId} for ${tier} subscription`);
```

### Enhancement: Add to All Credit Mutations
- [ ] `grantCredits` admin procedure
- [ ] `addCredits` database function
- [ ] `deductCredits` database function
- [ ] Refund operations
- [ ] Bonus credit grants

---

## 7. Production Checklist

### Before Launch
- [ ] Webhook idempotency tracking enabled
- [ ] Billing event logging configured
- [ ] Credit pack amounts validated
- [ ] Subscription state reconciliation tested
- [ ] Rate limiting on billing routes active
- [ ] Redis connection configured (or fallback verified)
- [ ] Audit logs being written to database
- [ ] Monitoring alerts configured for billing anomalies

### Ongoing Monitoring
- [ ] Review billing logs daily
- [ ] Monitor for unknown pack IDs
- [ ] Check for failed webhooks
- [ ] Verify subscription state consistency
- [ ] Monitor rate limit hits
- [ ] Alert on credit anomalies (e.g., large grants)

### Incident Response
- [ ] Document billing incident procedures
- [ ] Set up alerts for critical billing events
- [ ] Create rollback procedures for credit mutations
- [ ] Maintain audit trail for compliance

---

## 8. Testing

### Unit Tests
- [ ] Test idempotency tracking
- [ ] Test pack amount validation
- [ ] Test credit logging
- [ ] Test subscription state updates

### Integration Tests
- [ ] Test webhook delivery with retries
- [ ] Test duplicate webhook handling
- [ ] Test subscription lifecycle (new → upgrade → cancel)
- [ ] Test refund flow

### Load Tests
- [ ] Test rate limiting under load
- [ ] Test Redis failover
- [ ] Test webhook processing at scale

---

## 9. Database Schema

### Recommended Tables

#### `billing_logs`
```sql
CREATE TABLE billing_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  timestamp DATETIME NOT NULL,
  user_id INT NOT NULL,
  user_email VARCHAR(320),
  type ENUM('credit_grant', 'credit_deduction', 'subscription_change', 'webhook_event', 'refund'),
  amount INT,
  reason VARCHAR(255),
  metadata JSON,
  status ENUM('success', 'failure'),
  error_message TEXT,
  INDEX (user_id, timestamp),
  INDEX (type, timestamp)
);
```

#### `webhook_idempotency`
```sql
CREATE TABLE webhook_idempotency (
  webhook_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100),
  timestamp DATETIME NOT NULL,
  result JSON,
  error_message TEXT,
  INDEX (timestamp)
);
```

---

## 10. Environment Variables

### Required for Production
```bash
# Redis for distributed rate limiting
REDIS_URL=redis://localhost:6379

# Stripe (already required)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Optional
```bash
# Billing monitoring/alerting
BILLING_ALERT_EMAIL=admin@virelle.life
BILLING_ALERT_THRESHOLD=1000  # Alert if credit grant > 1000
```

---

## 11. Deployment Checklist

- [ ] All environment variables set
- [ ] Redis connection tested
- [ ] Database tables created
- [ ] Webhook idempotency enabled
- [ ] Billing logging active
- [ ] Rate limiting configured
- [ ] Monitoring alerts set up
- [ ] Audit logs being written
- [ ] Backup strategy in place
- [ ] Rollback procedures documented

---

## 12. Troubleshooting

### Duplicate Credits Granted
1. Check webhook idempotency tracking
2. Verify webhook IDs are being recorded
3. Look for duplicate webhook events in logs
4. Review billing logs for duplicate entries

### Missing Credits
1. Check billing logs for grant records
2. Verify webhook was received and processed
3. Check for errors in webhook handler
4. Verify pack amount is correct

### Subscription State Mismatch
1. Compare Stripe subscription state with database
2. Check webhook processing logs
3. Verify subscription update webhooks are being received
4. Run manual reconciliation

### Rate Limiting Issues
1. Verify Redis connection
2. Check rate limit logs
3. Verify rate limit thresholds are appropriate
4. Test Redis failover

---

## References

- [Stripe Webhook Reliability](https://stripe.com/docs/webhooks/best-practices)
- [Idempotency Keys](https://stripe.com/docs/api/idempotent_requests)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)

