import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

// ─── Gmail SMTP Transport ─────────────────────────────────────────────────────
// Uses Gmail free SMTP service. Set GMAIL_USER and GMAIL_APP_PASSWORD in env.
// Generate an App Password at: https://myaccount.google.com/apppasswords
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: ENV.gmailUser,
      pass: ENV.gmailAppPassword,
    },
  });
}

const FROM = `Virelle Studios <${ENV.emailFromAddress}>`;

/**
 * Studio notification email — always BCC'd on all transactional emails
 * so the studio owner gets a copy of every signup, subscription, etc.
 */
const STUDIO_BCC = ENV.adminEmail || "Studiosvirelle@gmail.com";

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  origin: string
): Promise<boolean> {
  const resetUrl = `${origin}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#d4a843;letter-spacing:0.5px;">
                Virelle Studios
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f5f5f5;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong style="color:#f5f5f5;">1 hour</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background-color:#d4a843;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#737373;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#d4a843;word-break:break-all;">
                ${resetUrl}
              </p>
              <div style="border-top:1px solid #262626;padding-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#525252;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
              <p style="margin:0;font-size:11px;color:#525252;">
                &copy; ${new Date().getFullYear()} Virelle Studios. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: "Reset Your Password — Virelle Studios",
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending password reset email:", err);
    return false;
  }
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#d4a843;letter-spacing:0.5px;">Virelle Studios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f5f5f5;">Welcome, ${name}!</h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                Your account is ready. Start creating AI films, VFX scenes, and more — all from your browser.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                Here's what you can do right now:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#a3a3a3;">
                    🎬 <strong style="color:#f5f5f5;">Quick Generate</strong> — Create a full AI film in minutes
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#a3a3a3;">
                    🎨 <strong style="color:#f5f5f5;">Scene Editor</strong> — Build cinematic scenes with AI
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#a3a3a3;">
                    📝 <strong style="color:#f5f5f5;">Screenplay Writer</strong> — AI-powered script generation
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:13px;color:#a3a3a3;">
                    🎭 <strong style="color:#f5f5f5;">Character Studio</strong> — Create consistent characters
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="https://www.virelle.life/dashboard" style="display:inline-block;padding:12px 32px;background-color:#d4a843;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
              <p style="margin:0;font-size:11px;color:#525252;">&copy; ${new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      bcc: STUDIO_BCC !== to ? STUDIO_BCC : undefined,
      subject: "Welcome to Virelle Studios 🎬",
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending welcome email:", err);
    return false;
  }
}

// ─── Subscription Confirmation ────────────────────────────────────────────────

export async function sendSubscriptionConfirmationEmail(
  to: string,
  name: string,
  planName: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#d4a843;letter-spacing:0.5px;">Virelle Studios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f5f5f5;">Subscription Confirmed</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                Hi ${name}, your <strong style="color:#d4a843;">${planName}</strong> subscription is now active. You have full access to all features included in your plan.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="https://www.virelle.life/dashboard" style="display:inline-block;padding:12px 32px;background-color:#d4a843;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Start Creating
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
              <p style="margin:0;font-size:11px;color:#525252;">&copy; ${new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      bcc: STUDIO_BCC !== to ? STUDIO_BCC : undefined,
      subject: `Your ${planName} Subscription is Active — Virelle Studios`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending subscription confirmation email:", err);
    return false;
  }
}

// ─── Studio New Signup Notification ──────────────────────────────────────────
/**
 * Notify the studio owner when a new user registers.
 * Sent ONLY to the studio — not to the user.
 */
export async function sendNewSignupNotification(
  userEmail: string,
  userName: string,
  userRole?: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:18px;font-weight:700;color:#d4a843;">🎬 New Signup — Virelle Studios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Name:</strong> ${userName}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Email:</strong> ${userEmail}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Role:</strong> ${userRole || "user"}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Time:</strong> ${new Date().toUTCString()}</p>
              <a href="https://www.virelle.life/admin" style="display:inline-block;padding:10px 24px;background-color:#d4a843;color:#0a0a0a;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">
                View in Admin
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: STUDIO_BCC,
      subject: `New Signup: ${userName} (${userEmail})`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending new signup notification:", err);
    return false;
  }
}

// ─── Studio New Subscription Notification ────────────────────────────────────
/**
 * Notify the studio owner when a user subscribes to a paid plan.
 * Sent ONLY to the studio — not to the user.
 */
export async function sendNewSubscriptionNotification(
  userEmail: string,
  userName: string,
  planName: string,
  amount: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:18px;font-weight:700;color:#d4a843;">💰 New Subscription — Virelle Studios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Customer:</strong> ${userName}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Email:</strong> ${userEmail}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Plan:</strong> ${planName}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Amount:</strong> ${amount}</p>
              <p style="margin:0 0 24px;font-size:14px;color:#a3a3a3;"><strong style="color:#f5f5f5;">Time:</strong> ${new Date().toUTCString()}</p>
              <a href="https://www.virelle.life/admin" style="display:inline-block;padding:10px 24px;background-color:#d4a843;color:#0a0a0a;font-size:13px;font-weight:600;text-decoration:none;border-radius:6px;">
                View in Admin
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await getTransporter().sendMail({
      from: FROM,
      to: STUDIO_BCC,
      subject: `💰 New Subscription: ${userName} — ${planName} (${amount})`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending new subscription notification:", err);
    return false;
  }
}

/** Verify that the Gmail SMTP connection works by checking credentials are set */
export async function verifyEmailConnection(): Promise<boolean> {
  if (!ENV.gmailUser || !ENV.gmailAppPassword) {
    console.error("GMAIL_USER or GMAIL_APP_PASSWORD is not set");
    return false;
  }
  return true;
}

// ─── Collaboration Invite ─────────────────────────────────────────────────────
export async function sendCollaborationInviteEmail(
  to: string,
  inviterName: string,
  projectTitle: string,
  role: string,
  inviteUrl: string
): Promise<boolean> {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:12px;border:1px solid #262626;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #262626;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#d4a843;letter-spacing:0.5px;">Virelle Studios</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f5f5f5;">You've been invited to collaborate</h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                <strong style="color:#f5f5f5;">${inviterName}</strong> has invited you to join the project
                <strong style="color:#d4a843;">${projectTitle}</strong> on Virelle Studios as a <strong style="color:#f5f5f5;">${roleLabel}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a3a3a3;">
                Click the button below to accept the invitation and start collaborating on this film project.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;background-color:#d4a843;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#737373;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;color:#d4a843;word-break:break-all;">${inviteUrl}</p>
              <div style="border-top:1px solid #262626;padding-top:20px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#525252;">
                  If you weren't expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0d0d0d;text-align:center;border-top:1px solid #262626;">
              <p style="margin:0;font-size:11px;color:#525252;">&copy; ${new Date().getFullYear()} Virelle Studios. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  try {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `${inviterName} invited you to collaborate on "${projectTitle}" — Virelle Studios`,
      html,
    });
    return true;
  } catch (err) {
    console.error("Gmail: unexpected error sending collaboration invite email:", err);
    return false;
  }
}
