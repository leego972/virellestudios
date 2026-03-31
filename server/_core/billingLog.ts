/**
 * Billing mutation logging
 * Tracks all credit grants, deductions, and subscription changes for audit trail
 */

import { logger } from "./logger";

export interface BillingLogEntry {
  timestamp: Date;
  userId: number;
  userEmail?: string;
  type: "credit_grant" | "credit_deduction" | "subscription_change" | "webhook_event" | "refund";
  amount?: number;
  reason: string;
  metadata?: Record<string, any>;
  status: "success" | "failure";
  errorMessage?: string;
}

/**
 * Log a billing event
 */
export async function logBillingEvent(entry: BillingLogEntry): Promise<void> {
  try {
    // Log to console for immediate visibility
    const logLevel = entry.status === "failure" ? "error" : "info";
    logger[logLevel](`[BILLING] ${entry.type.toUpperCase()} - ${entry.reason}`, {
      userId: entry.userId,
      userEmail: entry.userEmail,
      amount: entry.amount,
      status: entry.status,
      metadata: entry.metadata,
      error: entry.errorMessage,
    });

    // In production, store in database for audit trail
    // await db.createBillingLog(entry);
  } catch (error) {
    logger.error("[BILLING] Failed to log billing event", { error, entry });
  }
}

/**
 * Helper functions for common billing operations
 */
export const billingActions = {
  creditGrant: async (userId: number, amount: number, reason: string, userEmail?: string) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type: "credit_grant",
      amount,
      reason,
      status: "success",
    });
  },

  creditDeduction: async (userId: number, amount: number, reason: string, userEmail?: string) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type: "credit_deduction",
      amount,
      reason,
      status: "success",
    });
  },

  subscriptionChange: async (
    userId: number,
    oldTier: string,
    newTier: string,
    reason: string,
    userEmail?: string,
  ) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type: "subscription_change",
      reason,
      metadata: { oldTier, newTier },
      status: "success",
    });
  },

  webhookEvent: async (
    userId: number,
    eventType: string,
    eventId: string,
    metadata?: Record<string, any>,
    userEmail?: string,
  ) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type: "webhook_event",
      reason: `Stripe webhook: ${eventType}`,
      metadata: { eventId, ...metadata },
      status: "success",
    });
  },

  refund: async (
    userId: number,
    amount: number,
    reason: string,
    userEmail?: string,
  ) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type: "refund",
      amount,
      reason,
      status: "success",
    });
  },

  error: async (
    userId: number,
    type: "credit_grant" | "credit_deduction" | "subscription_change" | "webhook_event" | "refund",
    reason: string,
    error: string,
    userEmail?: string,
  ) => {
    await logBillingEvent({
      timestamp: new Date(),
      userId,
      userEmail,
      type,
      reason,
      status: "failure",
      errorMessage: error,
    });
  },
};
