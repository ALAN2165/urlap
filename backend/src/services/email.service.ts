import { mailer, EMAIL_FROM } from '../config/mailer';

function buildResetPasswordEmailHtml(username: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset your password</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0612; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">Reset your urlap password — this link expires in 1 hour.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0612; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:linear-gradient(180deg, #15101f 0%, #0f0a19 100%); border-radius:24px; border:1px solid rgba(168,85,247,0.18); overflow:hidden;">

          <tr>
            <td style="padding:36px 40px 0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); border-radius:14px; padding:10px 20px;">
                    <span style="font-size:20px; font-weight:800; color:#ffffff; letter-spacing:0.5px;">url<span style="color:#c084fc;">ap</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 0 40px;" align="center">
              <span style="display:inline-block; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#c084fc; background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.25); border-radius:999px; padding:6px 14px;">
                Password Reset
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 0 40px;" align="center">
              <h1 style="margin:0; font-size:26px; line-height:1.3; font-weight:800; color:#ffffff;">Reset your password</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0; font-size:15px; line-height:1.7; color:#a1a1b5; text-align:center;">
                Hi ${escapeHtml(username)}, we received a request to reset the password for your urlap account. Click the button below to choose a new one.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:14px; background-color:#9333ea; box-shadow:0 0 24px rgba(147,51,234,0.5);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:16px 40px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:14px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0 40px;" align="center">
              <p style="margin:0; font-size:12px; color:#6b6b80;">This link expires in 1 hour.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; color:#8b8ba3;">Or copy this link</p>
                    <p style="margin:0; font-size:12px; color:#a855f7; word-break:break-all; font-family:monospace;">${resetUrl}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0 40px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b6b80; text-align:center;">
                If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06); padding-top:20px;">
                <tr>
                  <td align="center">
                    <p style="margin:0; font-size:11px; color:#4b4b5c;">© ${new Date().getFullYear()} urlap. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildResetPasswordEmailText(username: string, resetUrl: string): string {
  return `Reset your urlap password

Hi ${username},

We received a request to reset the password for your urlap account.

Reset your password here (expires in 1 hour):
${resetUrl}

If you didn't request this, you can safely ignore this email.

— urlap`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

export async function sendPasswordResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
  if (!mailer) {
    console.log(`\n📧 [password reset — no SMTP configured] Link for ${to}:\n${resetUrl}\n`);
    return;
  }

  try {
    const info = await mailer.sendMail({
      from: EMAIL_FROM,
      to,
      subject: 'Reset your urlap password',
      html: buildResetPasswordEmailHtml(username, resetUrl),
      text: buildResetPasswordEmailText(username, resetUrl),
    });
    console.log(`[mailer] Password reset email sent to ${to} — messageId: ${info.messageId}`);
  } catch (err: any) {
    // Logged loudly but NOT rethrown: the reset token is already created,
    // and the controller always returns the same generic response whether
    // or not the email actually went out, so a send failure here must
    // never 500 the request. This is exactly the failure this logging
    // exists to surface in Railway's logs.
    console.error('[mailer] Failed to send password reset email:', {
      to,
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
  }
}