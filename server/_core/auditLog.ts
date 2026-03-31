/**
 * Audit logging for sensitive operations
 * Tracks admin actions, billing mutations, and security-relevant events
 */

import { logger } from "./logger";
import * as db from "../db";

export interface AuditLogEntry {
  timestamp: Date;
  userId: number | null;
  userEmail: string | null;
  action: string;
  category: "admin" | "billing" | "auth" | "security" | "system";
  resource: string;
  resourceId: string | number;
  changes?: Record<string, any>;
  status: "success" | "failure" | "attempt";
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Log to console for immediate visibility
    const logLevel = entry.status === "failure" ? "error" : "info";
    logger[logLevel](`[AUDIT] ${entry.category.toUpperCase()} - ${entry.action}`, {
      userId: entry.userId,
      userEmail: entry.userEmail,
      resource: entry.resource,
      resourceId: entry.resourceId,
      status: entry.status,
      changes: entry.changes,
      error: entry.errorMessage,
    });

    // Store in database for audit trail
    // This assumes an audit_logs table exists
    // await db.createAuditLog(entry);
  } catch (error) {
    logger.error("[AUDIT] Failed to log audit event", { error, entry });
  }
}

/**
 * Middleware wrapper for logging admin mutations
 */
export function withAuditLog(
  category: "admin" | "billing" | "auth" | "security",
  action: string,
  resource: string,
) {
  return async (
    fn: (ctx: any) => Promise<any>,
    ctx: any,
    input?: any,
  ): Promise<any> => {
    const userId = ctx.user?.id || null;
    const userEmail = ctx.user?.email || null;
    const ipAddress = ctx.req?.ip;
    const userAgent = ctx.req?.headers["user-agent"];

    try {
      const result = await fn(ctx);

      await logAuditEvent({
        timestamp: new Date(),
        userId,
        userEmail,
        action,
        category,
        resource,
        resourceId: input?.id || input?.userId || "unknown",
        changes: input,
        status: "success",
        ipAddress,
        userAgent,
      });

      return result;
    } catch (error) {
      await logAuditEvent({
        timestamp: new Date(),
        userId,
        userEmail,
        action,
        category,
        resource,
        resourceId: input?.id || input?.userId || "unknown",
        changes: input,
        status: "failure",
        ipAddress,
        userAgent,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

/**
 * Helper to create audit log entries for common admin operations
 */
export const auditActions = {
  // User management
  updateUserRole: (userId: number, oldRole: string, newRole: string) => ({
    action: "UPDATE_USER_ROLE",
    resource: "user",
    resourceId: userId,
    changes: { oldRole, newRole },
  }),

  grantCredits: (userId: number, amount: number, reason: string) => ({
    action: "GRANT_CREDITS",
    resource: "credits",
    resourceId: userId,
    changes: { amount, reason },
  }),

  lockUser: (userId: number, reason: string) => ({
    action: "LOCK_USER",
    resource: "user",
    resourceId: userId,
    changes: { reason },
  }),

  // Billing
  refundPayment: (paymentId: string, amount: number, reason: string) => ({
    action: "REFUND_PAYMENT",
    resource: "payment",
    resourceId: paymentId,
    changes: { amount, reason },
  }),

  // System
  configUpdate: (configKey: string, oldValue: any, newValue: any) => ({
    action: "CONFIG_UPDATE",
    resource: "system_config",
    resourceId: configKey,
    changes: { oldValue, newValue },
  }),
};
