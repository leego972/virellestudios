import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: ENV.gmailUser,
    pass: ENV.gmailAppPassword,
  },
});

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
    await transporter.sendMail({
      from: `"Virelle Studios" <${ENV.gmailUser}>`,
      to,
      subject: "Reset Your Password — Virelle Studios",
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}

/** Verify that the Gmail SMTP connection works */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Gmail SMTP verification failed:", error);
    return false;
  }
}
