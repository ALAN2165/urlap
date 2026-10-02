import { mailer, EMAIL_FROM } from '../config/mailer';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
function buildResetPasswordEmailHtml(username: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset your password</title>
</head>
<body style="margin:0; padding:0; background-color:#050109; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">&gt; ACCESS_RESET.EXE initiated — link expires in 60 minutes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050109; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#0c0714; border-radius:20px; border:1px solid #a855f7; box-shadow:0 0 0 1px rgba(168,85,247,0.15), 0 0 40px rgba(168,85,247,0.25); overflow:hidden;">

          <!-- terminal title bar -->
          <tr>
            <td style="background-color:#120a1f; padding:14px 20px; border-bottom:1px solid rgba(168,85,247,0.25);">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:6px;"><div style="width:10px; height:10px; border-radius:50%; background-color:#ff5f57;"></div></td>
                  <td style="padding-right:6px;"><div style="width:10px; height:10px; border-radius:50%; background-color:#febc2e;"></div></td>
                  <td style="padding-right:14px;"><div style="width:10px; height:10px; border-radius:50%; background-color:#c084fc;"></div></td>
                  <td>
                    <span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:12px; color:#8b7aa8;">urlap://security-terminal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.4); border-radius:14px; padding:10px 20px;">
                    <span style="font-size:20px; font-weight:800; color:#ffffff; letter-spacing:0.5px; font-family:'SFMono-Regular',Consolas,monospace;">url<span style="color:#c084fc;">ap</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0 40px;" align="center">
              <span style="display:inline-block; font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#4ade80; background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.35); border-radius:999px; padding:7px 16px;">
                &gt; AUTH_REQUEST_DETECTED
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 40px 0 40px;" align="center">
              <h1 style="margin:0; font-size:28px; line-height:1.3; font-weight:800; color:#ffffff; text-shadow:0 0 18px rgba(168,85,247,0.6);">
                Password Reset Initiated
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0; font-size:15px; line-height:1.7; color:#a79cc2; text-align:center;">
                Identity check: <strong style="color:#e9d8ff;">${escapeHtml(username)}</strong>. A password reset was requested for your urlap account. Confirm below to continue.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:34px 40px 0 40px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:999px; background-color:#9333ea; background-image:linear-gradient(135deg, #9333ea 0%, #c026d3 100%); box-shadow:0 0 10px rgba(192,38,211,0.8), 0 0 36px rgba(147,51,234,0.55);">
                    <a href="${resetUrl}" target="_blank" style="display:inline-block; padding:16px 42px; font-size:14px; font-weight:800; letter-spacing:1px; color:#ffffff; text-decoration:none; border-radius:999px; font-family:'SFMono-Regular',Consolas,monospace;">
                      [ RESET_PASSWORD ]
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px 0 40px;" align="center">
              <span style="display:inline-block; font-family:'SFMono-Regular',Consolas,monospace; font-size:11px; color:#f472b6; background:rgba(244,114,182,0.08); border:1px solid rgba(244,114,182,0.3); border-radius:8px; padding:6px 14px;">
                SESSION_EXPIRES: 60:00
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0611; border:1px solid rgba(168,85,247,0.3); border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px 0; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#8b7aa8;">manual_override // copy link</p>
                    <p style="margin:0; font-family:'SFMono-Regular',Consolas,monospace; font-size:12px; color:#c084fc; word-break:break-all;">
                      <span style="color:#4ade80;">$</span> ${resetUrl}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 40px 0 40px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#6b5e85; text-align:center;">
                Didn't request this? No action needed — your credentials remain unchanged and this link will simply expire.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 32px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(168,85,247,0.15); padding-top:20px;">
                <tr>
                  <td align="center">
                    <p style="margin:0; font-family:'SFMono-Regular',Consolas,monospace; font-size:10px; color:#4b3f61; letter-spacing:0.5px;">© ${new Date().getFullYear()} URLAP_SYSTEMS // ALL_RIGHTS_RESERVED</p>
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
  return `urlap — Password Reset Initiated

Identity check: ${username}

A password reset was requested for your urlap account.
Reset your password here (expires in 60 minutes):
${resetUrl}

Didn't request this? No action needed — your credentials remain unchanged.

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
    console.error('[mailer] Failed to send password reset email:', {
      to, message: err.message, code: err.code, command: err.command, response: err.response, responseCode: err.responseCode,
    });
  }
}