import crypto from "crypto";
import { ENV } from "./env";
import { logger } from "./logger";
import type { User } from "../../drizzle/schema";

// ============================================================
// ENCRYPTION — Encrypt/decrypt user BYOK API keys at rest
// ============================================================

const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(process.env.JWT_SECRET || "dev-secret-change-me")
  .digest(); // 32 bytes for AES-256
const IV_LENGTH = 16;

export function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptApiKey(ciphertext: string): string {
  try {
    const [ivHex, encrypted] = ciphertext.split(":");
    if (!ivHex || !encrypted) return ciphertext; // Not encrypted, return as-is
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return ciphertext; // Decryption failed, return as-is (might be plaintext)
  }
}

// ============================================================
// FRAUD DETECTION — In-memory tracking with configurable thresholds
// ============================================================

interface FraudSignal {
  type: "rapid_registration" | "excessive_generation" | "payment_failure" | "suspicious_ip" | "account_sharing" | "api_abuse" | "brute_force";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: number;
  userId?: number;
  ip?: string;
  metadata?: Record<string, any>;
}

interface UserActivityTracker {
  userId: number;
  recentIPs: Map<string, number>; // IP -> last seen timestamp
  generationCount1h: number;
  generationCount24h: number;
  loginAttempts1h: number;
  failedLogins1h: number;
  lastActivity: number;
  flagged: boolean;
  flagReason?: string;
  lockoutUntil?: number;
}

// In-memory stores
const userTrackers = new Map<number, UserActivityTracker>();
const ipRegistrations = new Map<string, { count: number; firstSeen: number }>();
const securityEvents: FraudSignal[] = [];
const MAX_EVENTS = 10000;

// Configurable thresholds
const THRESHOLDS = {
  // Registration fraud
  maxRegistrationsPerIPPerHour: 3,
  maxRegistrationsPerIPPerDay: 5,
  // Generation abuse
  maxGenerationsPerHour: 30,
  maxGenerationsPerDay: 200,
  // Login security
  maxLoginAttemptsPerHour: 15,
  maxFailedLoginsBeforeLockout: 5,
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
  // Account sharing detection
  maxUniqueIPsPer24h: 10,
  // API abuse
  maxAPICallsPerMinute: 100,
};

function getTracker(userId: number): UserActivityTracker {
  let tracker = userTrackers.get(userId);
  if (!tracker) {
    tracker = {
      userId,
      recentIPs: new Map(),
      generationCount1h: 0,
      generationCount24h: 0,
      loginAttempts1h: 0,
      failedLogins1h: 0,
      lastActivity: Date.now(),
      flagged: false,
    };
    userTrackers.set(userId, tracker);
  }
  return tracker;
}

function addSecurityEvent(signal: FraudSignal) {
  securityEvents.push(signal);
  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.splice(0, securityEvents.length - MAX_EVENTS);
  }
  const level = signal.severity === "critical" ? "error" : signal.severity === "high" ? "warn" : "info";
  logger[level](`[Security] ${signal.type}: ${signal.description}`, {
    userId: signal.userId,
    ip: signal.ip,
    severity: signal.severity,
  });
}

// ============================================================
// REGISTRATION FRAUD DETECTION
// ============================================================

export function checkRegistrationFraud(ip: string, email: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // Check IP registration rate
  const ipData = ipRegistrations.get(ip);
  if (ipData) {
    const elapsed = now - ipData.firstSeen;
    if (elapsed < oneHour && ipData.count >= THRESHOLDS.maxRegistrationsPerIPPerHour) {
      addSecurityEvent({
        type: "rapid_registration",
        severity: "high",
        description: `IP ${ip} attempted ${ipData.count + 1} registrations in ${Math.round(elapsed / 60000)} minutes. Email: ${email}`,
        timestamp: now,
        ip,
        metadata: { email, count: ipData.count + 1 },
      });
      return { allowed: false, reason: "Too many accounts created from this IP address. Please try again later." };
    }
    if (elapsed < 24 * oneHour && ipData.count >= THRESHOLDS.maxRegistrationsPerIPPerDay) {
      addSecurityEvent({
        type: "rapid_registration",
        severity: "critical",
        description: `IP ${ip} attempted ${ipData.count + 1} registrations in 24 hours. Possible bot. Email: ${email}`,
        timestamp: now,
        ip,
        metadata: { email, count: ipData.count + 1 },
      });
      return { allowed: false, reason: "Account creation limit reached. Please contact support." };
    }
    ipData.count++;
  } else {
    ipRegistrations.set(ip, { count: 1, firstSeen: now });
  }

  // Check for disposable email domains
  const disposableDomains = [
    "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
    "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
    "dispostable.com", "trashmail.com", "10minutemail.com", "temp-mail.org",
    "fakeinbox.com", "mailnesia.com", "maildrop.cc", "discard.email",
  ];
  const emailDomain = email.split("@")[1]?.toLowerCase();
  if (emailDomain && disposableDomains.includes(emailDomain)) {
    addSecurityEvent({
      type: "rapid_registration",
      severity: "medium",
      description: `Registration attempt with disposable email: ${email} from IP ${ip}`,
      timestamp: now,
      ip,
      metadata: { email, domain: emailDomain },
    });
    return { allowed: false, reason: "Please use a valid email address. Disposable emails are not allowed." };
  }

  return { allowed: true };
}

// ============================================================
// LOGIN SECURITY
// ============================================================

export function trackLoginAttempt(userId: number, ip: string, success: boolean): { allowed: boolean; reason?: string } {
  const tracker = getTracker(userId);
  const now = Date.now();

  // Check lockout
  if (tracker.lockoutUntil && now < tracker.lockoutUntil) {
    const remainingMin = Math.ceil((tracker.lockoutUntil - now) / 60000);
    return { allowed: false, reason: `Account temporarily locked. Try again in ${remainingMin} minutes.` };
  }

  // Reset hourly counters if needed
  if (now - tracker.lastActivity > 60 * 60 * 1000) {
    tracker.loginAttempts1h = 0;
    tracker.failedLogins1h = 0;
  }

  tracker.loginAttempts1h++;
  tracker.lastActivity = now;
  tracker.recentIPs.set(ip, now);

  if (!success) {
    tracker.failedLogins1h++;

    if (tracker.failedLogins1h >= THRESHOLDS.maxFailedLoginsBeforeLockout) {
      tracker.lockoutUntil = now + THRESHOLDS.lockoutDurationMs;
      tracker.flagged = true;
      tracker.flagReason = "Too many failed login attempts";

      addSecurityEvent({
        type: "brute_force",
        severity: "high",
        description: `User ${userId} locked out after ${tracker.failedLogins1h} failed login attempts from IP ${ip}`,
        timestamp: now,
        userId,
        ip,
      });

      return { allowed: false, reason: "Account temporarily locked due to too many failed login attempts. Try again in 30 minutes." };
    }
  } else {
    // Successful login — reset failed counter
    tracker.failedLogins1h = 0;
    tracker.lockoutUntil = undefined;
  }

  // Check for excessive login attempts (even successful ones)
  if (tracker.loginAttempts1h > THRESHOLDS.maxLoginAttemptsPerHour) {
    addSecurityEvent({
      type: "brute_force",
      severity: "medium",
      description: `User ${userId} has ${tracker.loginAttempts1h} login attempts in the last hour from IP ${ip}`,
      timestamp: now,
      userId,
      ip,
    });
  }

  return { allowed: true };
}

// ============================================================
// GENERATION ABUSE DETECTION
// ============================================================

export function trackGeneration(userId: number, ip: string, type: string): { allowed: boolean; reason?: string } {
  const tracker = getTracker(userId);
  const now = Date.now();

  // Reset hourly counter
  if (now - tracker.lastActivity > 60 * 60 * 1000) {
    tracker.generationCount1h = 0;
  }

  tracker.generationCount1h++;
  tracker.generationCount24h++;
  tracker.lastActivity = now;
  tracker.recentIPs.set(ip, now);

  // Check hourly limit
  if (tracker.generationCount1h > THRESHOLDS.maxGenerationsPerHour) {
    addSecurityEvent({
      type: "excessive_generation",
      severity: "high",
      description: `User ${userId} exceeded ${THRESHOLDS.maxGenerationsPerHour} generations/hour (${tracker.generationCount1h}). Type: ${type}`,
      timestamp: now,
      userId,
      ip,
      metadata: { type, count: tracker.generationCount1h },
    });
    return { allowed: false, reason: "Generation rate limit exceeded. Please wait before generating more content." };
  }

  // Check daily limit
  if (tracker.generationCount24h > THRESHOLDS.maxGenerationsPerDay) {
    addSecurityEvent({
      type: "excessive_generation",
      severity: "critical",
      description: `User ${userId} exceeded ${THRESHOLDS.maxGenerationsPerDay} generations/day (${tracker.generationCount24h}). Possible abuse.`,
      timestamp: now,
      userId,
      ip,
      metadata: { type, count: tracker.generationCount24h },
    });
    tracker.flagged = true;
    tracker.flagReason = "Excessive generation activity";
    return { allowed: false, reason: "Daily generation limit reached. Your account has been flagged for review." };
  }

  // Check for account sharing (too many unique IPs)
  const recentIPs = Array.from(tracker.recentIPs.entries())
    .filter(([, ts]) => now - ts < 24 * 60 * 60 * 1000);
  if (recentIPs.length > THRESHOLDS.maxUniqueIPsPer24h) {
    addSecurityEvent({
      type: "account_sharing",
      severity: "high",
      description: `User ${userId} accessed from ${recentIPs.length} unique IPs in 24 hours. Possible account sharing.`,
      timestamp: now,
      userId,
      ip,
      metadata: { uniqueIPs: recentIPs.length },
    });
    tracker.flagged = true;
    tracker.flagReason = "Suspected account sharing";
  }

  return { allowed: true };
}

// ============================================================
// SUBSCRIPTION VERIFICATION — Real-time Stripe sync
// ============================================================

export async function verifySubscriptionForAction(
  user: User,
  requiredTier: "pro" | "industry",
  action: string
): Promise<{ valid: boolean; reason?: string }> {
  const { stripe } = await import("./subscription");

  // Admin bypass
  if (user.email === ENV.adminEmail || user.role === "admin") {
    return { valid: true };
  }

  // Check subscription status
  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "trialing") {
    addSecurityEvent({
      type: "api_abuse",
      severity: "medium",
      description: `User ${user.id} attempted ${action} with inactive subscription (status: ${user.subscriptionStatus})`,
      timestamp: Date.now(),
      userId: user.id,
    });
    return { valid: false, reason: `Your subscription is ${user.subscriptionStatus || "inactive"}. Please reactivate to use ${action}.` };
  }

  // Check subscription period hasn't expired
  if (user.subscriptionCurrentPeriodEnd) {
    const endDate = new Date(user.subscriptionCurrentPeriodEnd);
    if (endDate < new Date()) {
      // Period expired — live-check with Stripe
      if (stripe && user.stripeSubscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (sub.status !== "active" && sub.status !== "trialing") {
            addSecurityEvent({
              type: "api_abuse",
              severity: "high",
              description: `User ${user.id} has expired subscription (Stripe status: ${sub.status}). Attempted: ${action}`,
              timestamp: Date.now(),
              userId: user.id,
              metadata: { stripeStatus: sub.status, action },
            });
            return { valid: false, reason: "Your subscription has expired. Please renew to continue." };
          }
        } catch (err: any) {
          logger.warn(`Stripe verification failed for user ${user.id}: ${err.message}`);
        }
      }
    }
  }

  // Verify tier level
  const tierRank: Record<string, number> = { free: 0, pro: 1, industry: 2 };
  const userTierRank = tierRank[user.subscriptionTier || "free"] || 0;
  const requiredRank = tierRank[requiredTier] || 0;

  if (userTierRank < requiredRank) {
    return { valid: false, reason: `This feature requires the ${requiredTier} plan. You are on the ${user.subscriptionTier || "free"} plan.` };
  }

  return { valid: true };
}

// ============================================================
// PAYMENT FAILURE TRACKING
// ============================================================

export function trackPaymentFailure(userId: number, reason: string) {
  const tracker = getTracker(userId);
  tracker.flagged = true;
  tracker.flagReason = `Payment failure: ${reason}`;

  addSecurityEvent({
    type: "payment_failure",
    severity: "high",
    description: `Payment failed for user ${userId}: ${reason}`,
    timestamp: Date.now(),
    userId,
    metadata: { reason },
  });
}

// ============================================================
// AUDIT TRAIL
// ============================================================

interface AuditEntry {
  timestamp: number;
  userId: number;
  action: string;
  ip: string;
  details?: Record<string, any>;
  success: boolean;
}

const auditLog: AuditEntry[] = [];
const MAX_AUDIT = 50000;

export function logAuditEvent(
  userId: number,
  action: string,
  ip: string,
  success: boolean,
  details?: Record<string, any>
) {
  auditLog.push({
    timestamp: Date.now(),
    userId,
    action,
    ip,
    details,
    success,
  });
  if (auditLog.length > MAX_AUDIT) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT);
  }
}

// ============================================================
// ADMIN QUERIES — For the security dashboard
// ============================================================

export function getSecurityEvents(limit = 100, severity?: string): FraudSignal[] {
  let events = [...securityEvents].reverse();
  if (severity) {
    events = events.filter(e => e.severity === severity);
  }
  return events.slice(0, limit);
}

export function getFlaggedUsers(): Array<{
  userId: number;
  flagReason: string;
  generationCount1h: number;
  generationCount24h: number;
  uniqueIPs: number;
  lockedOut: boolean;
  lockoutUntil?: number;
}> {
  const flagged: ReturnType<typeof getFlaggedUsers> = [];
  userTrackers.forEach((tracker) => {
    if (tracker.flagged) {
      const recentIPs = Array.from(tracker.recentIPs.entries())
        .filter(([, ts]) => Date.now() - ts < 24 * 60 * 60 * 1000);
      flagged.push({
        userId: tracker.userId,
        flagReason: tracker.flagReason || "Unknown",
        generationCount1h: tracker.generationCount1h,
        generationCount24h: tracker.generationCount24h,
        uniqueIPs: recentIPs.length,
        lockedOut: !!(tracker.lockoutUntil && Date.now() < tracker.lockoutUntil),
        lockoutUntil: tracker.lockoutUntil,
      });
    }
  });
  return flagged;
}

export function getAuditLog(limit = 100, userId?: number): AuditEntry[] {
  let entries = [...auditLog].reverse();
  if (userId) {
    entries = entries.filter(e => e.userId === userId);
  }
  return entries.slice(0, limit);
}

export function getSecurityStats(): {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  flaggedUsers: number;
  lockedOutUsers: number;
  totalAuditEntries: number;
  registrationAttempts24h: number;
} {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  let criticalCount = 0;
  let highCount = 0;
  securityEvents.forEach(e => {
    if (e.severity === "critical") criticalCount++;
    if (e.severity === "high") highCount++;
  });

  let flaggedCount = 0;
  let lockedCount = 0;
  userTrackers.forEach(t => {
    if (t.flagged) flaggedCount++;
    if (t.lockoutUntil && now < t.lockoutUntil) lockedCount++;
  });

  let regAttempts = 0;
  ipRegistrations.forEach(r => {
    if (r.firstSeen > oneDayAgo) regAttempts += r.count;
  });

  return {
    totalEvents: securityEvents.length,
    criticalEvents: criticalCount,
    highEvents: highCount,
    flaggedUsers: flaggedCount,
    lockedOutUsers: lockedCount,
    totalAuditEntries: auditLog.length,
    registrationAttempts24h: regAttempts,
  };
}

// Unflag a user (admin action)
export function unflagUser(userId: number) {
  const tracker = userTrackers.get(userId);
  if (tracker) {
    tracker.flagged = false;
    tracker.flagReason = undefined;
    tracker.lockoutUntil = undefined;
    tracker.failedLogins1h = 0;
  }
}

// Lock a user (admin action)
export function lockUser(userId: number, durationMs: number, reason: string) {
  const tracker = getTracker(userId);
  tracker.lockoutUntil = Date.now() + durationMs;
  tracker.flagged = true;
  tracker.flagReason = reason;
  addSecurityEvent({
    type: "api_abuse",
    severity: "critical",
    description: `Admin locked user ${userId} for ${Math.round(durationMs / 60000)} minutes: ${reason}`,
    timestamp: Date.now(),
    userId,
  });
}

// ============================================================
// PERIODIC CLEANUP — Reset daily counters
// ============================================================

setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Reset 24h generation counters
  userTrackers.forEach(tracker => {
    if (tracker.lastActivity < oneDayAgo) {
      tracker.generationCount24h = 0;
      // Clean old IPs
      tracker.recentIPs.forEach((ts, ip) => {
        if (ts < oneDayAgo) tracker.recentIPs.delete(ip);
      });
    }
  });

  // Clean old IP registration data
  ipRegistrations.forEach((data, ip) => {
    if (data.firstSeen < oneDayAgo) ipRegistrations.delete(ip);
  });
}, 60 * 60 * 1000); // Every hour
