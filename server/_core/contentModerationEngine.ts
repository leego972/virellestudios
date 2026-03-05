/**
 * Content Moderation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Scans user-submitted content (prompts, character descriptions, scene text,
 * uploaded image descriptions) for policy violations.
 *
 * On detection:
 *  1. Logs the incident to the `moderationIncidents` table
 *  2. Freezes the user account (sets isFrozen = true)
 *  3. Sends an alert email to the admin (legal@virelle.life)
 *  4. Sends a notification email to the user explaining the freeze
 *
 * Severity levels:
 *  - CRITICAL  → CSAM, child exploitation (immediate freeze + law enforcement flag)
 *  - HIGH      → Non-consensual explicit content, extreme violence, terrorism
 *  - MEDIUM    → Hate speech, harassment, impersonation
 *  - LOW       → Suspicious patterns, borderline content (flag for review, no freeze)
 */

import { getDb } from "../db";
import { users, moderationIncidents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./env";
import nodemailer from "nodemailer";

// ─── Email transporter (reuses same Gmail SMTP as main email.ts) ─────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ENV.gmailUser,
    pass: ENV.gmailAppPassword,
  },
});

// ─── Violation Categories ─────────────────────────────────────────────────────
export type ViolationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ViolationCategory =
  | "CSAM"
  | "CHILD_EXPLOITATION"
  | "NON_CONSENSUAL_EXPLICIT"
  | "EXTREME_VIOLENCE"
  | "TERRORISM"
  | "HATE_SPEECH"
  | "HARASSMENT"
  | "IMPERSONATION"
  | "COPYRIGHT_INFRINGEMENT"
  | "SUSPICIOUS_PATTERN";

interface ViolationRule {
  category: ViolationCategory;
  severity: ViolationSeverity;
  keywords: string[];
  freeze: boolean;
  reportToAuthorities: boolean;
}

// ─── Violation Rules ──────────────────────────────────────────────────────────
// NOTE: These are intentionally obfuscated in logs. The actual keyword list
// is kept minimal here — a production deployment should use an AI moderation
// API (e.g., OpenAI Moderation, AWS Rekognition, Google SafeSearch) in addition.
const VIOLATION_RULES: ViolationRule[] = [
  {
    category: "CSAM",
    severity: "CRITICAL",
    keywords: [
      "child porn", "cp porn", "kiddie porn", "pedo", "pedophile",
      "lolita porn", "underage sex", "minor sex", "child sex",
      "child nude", "child naked", "child explicit",
    ],
    freeze: true,
    reportToAuthorities: true,
  },
  {
    category: "CHILD_EXPLOITATION",
    severity: "CRITICAL",
    keywords: [
      "child abuse", "child exploitation", "child trafficking",
      "minor trafficking", "child grooming",
    ],
    freeze: true,
    reportToAuthorities: true,
  },
  {
    category: "NON_CONSENSUAL_EXPLICIT",
    severity: "HIGH",
    keywords: [
      "deepfake porn", "non-consensual nude", "revenge porn",
      "rape scene explicit", "forced sex scene",
    ],
    freeze: true,
    reportToAuthorities: false,
  },
  {
    category: "EXTREME_VIOLENCE",
    severity: "HIGH",
    keywords: [
      "snuff film", "real murder", "real execution", "real torture",
      "gore porn",
    ],
    freeze: true,
    reportToAuthorities: false,
  },
  {
    category: "TERRORISM",
    severity: "HIGH",
    keywords: [
      "isis propaganda", "terrorist recruitment", "bomb making instructions",
      "mass shooting instructions", "how to make explosives",
    ],
    freeze: true,
    reportToAuthorities: true,
  },
  {
    category: "HATE_SPEECH",
    severity: "MEDIUM",
    keywords: [
      "white supremacy film", "nazi propaganda film", "racial extermination",
      "genocide promotion",
    ],
    freeze: false,
    reportToAuthorities: false,
  },
  {
    category: "HARASSMENT",
    severity: "MEDIUM",
    keywords: [
      "dox this person", "swat this person", "harass this person",
    ],
    freeze: false,
    reportToAuthorities: false,
  },
];

// ─── Scan Result ──────────────────────────────────────────────────────────────
export interface ModerationScanResult {
  flagged: boolean;
  violations: Array<{
    category: ViolationCategory;
    severity: ViolationSeverity;
    matchedKeyword: string;
    freeze: boolean;
    reportToAuthorities: boolean;
  }>;
  highestSeverity: ViolationSeverity | null;
  shouldFreeze: boolean;
  shouldReport: boolean;
}

// ─── Core Scan Function ───────────────────────────────────────────────────────
export function scanContent(text: string): ModerationScanResult {
  const lower = text.toLowerCase();
  const violations: ModerationScanResult["violations"] = [];

  for (const rule of VIOLATION_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        violations.push({
          category: rule.category,
          severity: rule.severity,
          matchedKeyword: keyword,
          freeze: rule.freeze,
          reportToAuthorities: rule.reportToAuthorities,
        });
        break; // one match per rule is enough
      }
    }
  }

  const severityOrder: ViolationSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const highestSeverity = violations.length > 0
    ? severityOrder.find(s => violations.some(v => v.severity === s)) ?? null
    : null;

  return {
    flagged: violations.length > 0,
    violations,
    highestSeverity,
    shouldFreeze: violations.some(v => v.freeze),
    shouldReport: violations.some(v => v.reportToAuthorities),
  };
}

// ─── Handle a Flagged Incident ────────────────────────────────────────────────
export async function handleModerationViolation(opts: {
  userId: number;
  userEmail: string;
  userName: string;
  contentType: string; // "scene_prompt" | "character_description" | "script" | "image_prompt" | etc.
  contentSnippet: string; // first 500 chars of the flagged content (truncated for safety)
  scanResult: ModerationScanResult;
  projectId?: number;
  sceneId?: number;
  characterId?: number;
}): Promise<void> {
  const { userId, userEmail, userName, contentType, contentSnippet, scanResult } = opts;

  console.warn(`[Moderation] VIOLATION DETECTED — User ${userId} (${userEmail}) | Severity: ${scanResult.highestSeverity} | Categories: ${scanResult.violations.map(v => v.category).join(", ")}`);

  // 1. Log to database
  try {
    const db = await getDb();
    if (!db) throw new Error('DB unavailable');
    await db.insert(moderationIncidents).values({
      userId,
      contentType,
      contentSnippet: contentSnippet.substring(0, 500),
      violations: JSON.stringify(scanResult.violations),
      severity: scanResult.highestSeverity ?? "LOW",
      shouldFreeze: scanResult.shouldFreeze,
      shouldReport: scanResult.shouldReport,
      status: "pending_review",
    });
  } catch (err) {
    console.error("[Moderation] Failed to log incident to DB:", err);
  }

  // 2. Freeze account if required
  if (scanResult.shouldFreeze) {
    try {
      const db2 = await getDb();
      if (!db2) throw new Error('DB unavailable');
      await db2.update(users)
        .set({ isFrozen: true, frozenReason: `Policy violation detected: ${scanResult.violations.map(v => v.category).join(", ")}`, frozenAt: new Date() })
        .where(eq(users.id, userId));
      console.warn(`[Moderation] Account ${userId} FROZEN.`);
    } catch (err) {
      console.error("[Moderation] Failed to freeze account:", err);
    }
  }

  // 3. Send admin alert email
  await sendAdminAlert({ userId, userEmail, userName, contentType, contentSnippet, scanResult });

  // 4. Send user notification email
  if (scanResult.shouldFreeze) {
    await sendUserFreezeNotification({ userEmail, userName, scanResult });
  }
}

// ─── Admin Alert Email ────────────────────────────────────────────────────────
async function sendAdminAlert(opts: {
  userId: number;
  userEmail: string;
  userName: string;
  contentType: string;
  contentSnippet: string;
  scanResult: ModerationScanResult;
}): Promise<void> {
  const { userId, userEmail, userName, contentType, contentSnippet, scanResult } = opts;
  const adminEmail = ENV.adminEmail ?? "legal@virelle.life";
  const severityColor = scanResult.highestSeverity === "CRITICAL" ? "#dc2626" :
    scanResult.highestSeverity === "HIGH" ? "#ea580c" :
    scanResult.highestSeverity === "MEDIUM" ? "#d97706" : "#65a30d";

  const violationRows = scanResult.violations.map(v =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #262626;color:#f5f5f5;">${v.category}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #262626;color:${severityColor};font-weight:700;">${v.severity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #262626;color:#a3a3a3;">${v.freeze ? "✅ Frozen" : "⚠️ Flagged"}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #262626;color:#a3a3a3;">${v.reportToAuthorities ? "🚨 YES" : "No"}</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#141414;border-radius:12px;border:2px solid ${severityColor};overflow:hidden;">
        <tr><td style="padding:24px 32px;background-color:${severityColor};text-align:center;">
          <h1 style="margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:1px;">
            🚨 CONTENT MODERATION ALERT — ${scanResult.highestSeverity}
          </h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;width:140px;">User ID</td>
              <td style="padding:8px 0;color:#f5f5f5;font-size:13px;font-weight:600;">${userId}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;">User Name</td>
              <td style="padding:8px 0;color:#f5f5f5;font-size:13px;font-weight:600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;">User Email</td>
              <td style="padding:8px 0;color:#d4a843;font-size:13px;font-weight:600;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;">Content Type</td>
              <td style="padding:8px 0;color:#f5f5f5;font-size:13px;">${contentType}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;">Account Status</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:${scanResult.shouldFreeze ? "#dc2626" : "#65a30d"};">
                ${scanResult.shouldFreeze ? "🔒 FROZEN" : "⚠️ Flagged (active)"}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#a3a3a3;font-size:13px;">Report to Authorities</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:${scanResult.shouldReport ? "#dc2626" : "#65a30d"};">
                ${scanResult.shouldReport ? "🚨 YES — NCMEC / Law Enforcement" : "No"}
              </td>
            </tr>
          </table>

          <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#f5f5f5;">Violations Detected</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #262626;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr style="background-color:#1a1a1a;">
              <th style="padding:8px 12px;text-align:left;color:#a3a3a3;font-size:12px;font-weight:600;">Category</th>
              <th style="padding:8px 12px;text-align:left;color:#a3a3a3;font-size:12px;font-weight:600;">Severity</th>
              <th style="padding:8px 12px;text-align:left;color:#a3a3a3;font-size:12px;font-weight:600;">Action</th>
              <th style="padding:8px 12px;text-align:left;color:#a3a3a3;font-size:12px;font-weight:600;">Report</th>
            </tr>
            ${violationRows}
          </table>

          <h3 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#f5f5f5;">Flagged Content Snippet</h3>
          <div style="background-color:#0d0d0d;border:1px solid #262626;border-radius:6px;padding:12px;font-size:12px;color:#a3a3a3;font-family:monospace;line-height:1.6;margin-bottom:20px;word-break:break-all;">
            ${contentSnippet.substring(0, 500).replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>

          <div style="background-color:#1a0a0a;border:1px solid #dc2626;border-radius:8px;padding:16px;">
            <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.6;">
              <strong>Required Actions:</strong><br>
              1. Review the flagged content in the admin dashboard at <a href="https://virelle.life/admin/moderation" style="color:#d4a843;">virelle.life/admin/moderation</a><br>
              2. ${scanResult.shouldFreeze ? "Account has been automatically frozen. Unfreeze if content is found to be a false positive." : "Account is still active. Consider freezing if content is confirmed as a violation."}<br>
              3. ${scanResult.shouldReport ? "<strong style='color:#dc2626;'>REPORT TO NCMEC AT cybertipline.org AND LOCAL LAW ENFORCEMENT IMMEDIATELY.</strong>" : "Determine if escalation to authorities is warranted."}<br>
              4. Contact user at ${userEmail} to request clarification or notify of account status.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
          <p style="margin:0;font-size:11px;color:#525252;">Virelle Studios Content Moderation System — ${new Date().toISOString()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Virelle Studios Moderation" <${ENV.gmailUser}>`,
      to: adminEmail,
      subject: `🚨 [${scanResult.highestSeverity}] Content Moderation Alert — User ${userId} (${userEmail})`,
      html,
    });
    console.log(`[Moderation] Admin alert sent to ${adminEmail}`);
  } catch (err) {
    console.error("[Moderation] Failed to send admin alert email:", err);
  }
}

// ─── User Freeze Notification Email ──────────────────────────────────────────
async function sendUserFreezeNotification(opts: {
  userEmail: string;
  userName: string;
  scanResult: ModerationScanResult;
}): Promise<void> {
  const { userEmail, userName } = opts;
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #262626;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#d4a843;">Virelle Studios</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f5f5f5;">Your Account Has Been Temporarily Frozen</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#a3a3a3;">
            Dear ${userName},
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#a3a3a3;">
            Our automated content moderation system has flagged activity on your account as a potential violation of our <a href="https://virelle.life/terms" style="color:#d4a843;">Terms of Service</a> and <a href="https://virelle.life/acceptable-use" style="color:#d4a843;">Acceptable Use Policy</a>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#a3a3a3;">
            As a precautionary measure, your account has been <strong style="color:#f5f5f5;">temporarily frozen</strong> pending review by our team. You will not be able to access the Services during this period.
          </p>
          <div style="background-color:#1a1a0a;border:1px solid #d97706;border-radius:8px;padding:16px;margin-bottom:20px;">
            <p style="margin:0;font-size:13px;color:#fde68a;line-height:1.6;">
              <strong>What to do next:</strong><br>
              If you believe this is a mistake, please reply to this email with a brief explanation. Our team will review your case and respond within 48 hours. If the content is found to comply with our policies, your account will be reinstated immediately.
            </p>
          </div>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#a3a3a3;">
            Please note that certain violations — particularly those involving content that exploits or endangers minors — are subject to mandatory reporting to law enforcement and will result in permanent account termination.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#a3a3a3;">
            Contact us at <a href="mailto:legal@virelle.life" style="color:#d4a843;">legal@virelle.life</a> to discuss your case.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
          <p style="margin:0;font-size:11px;color:#525252;">&copy; ${new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Virelle Studios" <${ENV.gmailUser}>`,
      to: userEmail,
      subject: "Important: Your Virelle Studios Account Has Been Temporarily Frozen",
      html,
    });
    console.log(`[Moderation] User freeze notification sent to ${userEmail}`);
  } catch (err) {
    console.error("[Moderation] Failed to send user freeze notification:", err);
  }
}

// ─── Convenience: Scan and Handle in One Call ─────────────────────────────────
export async function moderateContent(opts: {
  userId: number;
  userEmail: string;
  userName: string;
  contentType: string;
  text: string;
  projectId?: number;
  sceneId?: number;
  characterId?: number;
}): Promise<ModerationScanResult> {
  const scanResult = scanContent(opts.text);
  if (scanResult.flagged) {
    await handleModerationViolation({
      userId: opts.userId,
      userEmail: opts.userEmail,
      userName: opts.userName,
      contentType: opts.contentType,
      contentSnippet: opts.text,
      scanResult,
      projectId: opts.projectId,
      sceneId: opts.sceneId,
      characterId: opts.characterId,
    });
  }
  return scanResult;
}
