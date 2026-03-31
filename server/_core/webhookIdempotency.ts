/**
 * Webhook idempotency tracking
 * Ensures webhooks are processed exactly once, even if delivered multiple times
 * 
 * Stripe can deliver the same webhook multiple times if it doesn't receive
 * a 2xx response. This module tracks processed webhook IDs to prevent duplicate
 * credit grants, subscription updates, etc.
 */

import { logger } from "./logger";

interface IdempotencyEntry {
  timestamp: number;
  result?: any;
  error?: string;
}

// In-memory store for webhook IDs (in production, use Redis or database)
const processedWebhooks = new Map<string, IdempotencyEntry>();

// Clean up old entries every 24 hours (Stripe retries for 3 days, but we keep longer)
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of Array.from(processedWebhooks.entries())) {
    if (now - entry.timestamp > RETENTION_MS) {
      processedWebhooks.delete(id);
    }
  }
  logger.debug(`[Webhook] Cleaned up old idempotency entries. Current size: ${processedWebhooks.size}`);
}, 24 * 60 * 60 * 1000);

/**
 * Check if a webhook has already been processed
 * @param webhookId - The Stripe webhook event ID
 * @returns true if already processed, false if new
 */
export function isWebhookProcessed(webhookId: string): boolean {
  return processedWebhooks.has(webhookId);
}

/**
 * Mark a webhook as processed (successful)
 * @param webhookId - The Stripe webhook event ID
 * @param result - Optional result data to return on retry
 */
export function markWebhookProcessed(webhookId: string, result?: any): void {
  processedWebhooks.set(webhookId, {
    timestamp: Date.now(),
    result,
  });
  logger.debug(`[Webhook] Marked webhook ${webhookId} as processed`);
}

/**
 * Mark a webhook as failed (for retry)
 * @param webhookId - The Stripe webhook event ID
 * @param error - Error message
 */
export function markWebhookFailed(webhookId: string, error: string): void {
  processedWebhooks.set(webhookId, {
    timestamp: Date.now(),
    error,
  });
  logger.warn(`[Webhook] Marked webhook ${webhookId} as failed: ${error}`);
}

/**
 * Get the result of a previously processed webhook
 * @param webhookId - The Stripe webhook event ID
 * @returns The stored result or error, or null if not found
 */
export function getWebhookResult(webhookId: string): IdempotencyEntry | null {
  return processedWebhooks.get(webhookId) || null;
}

/**
 * Clear all idempotency records (use with caution, mainly for testing)
 */
export function clearAllWebhookRecords(): void {
  processedWebhooks.clear();
  logger.warn("[Webhook] Cleared all webhook idempotency records");
}

/**
 * Get statistics about webhook processing
 */
export function getWebhookStats() {
  return {
    totalProcessed: processedWebhooks.size,
    oldestEntry: Array.from(processedWebhooks.values()).reduce(
      (min, entry) => entry.timestamp < min ? entry.timestamp : min,
      Date.now()
    ),
  };
}
