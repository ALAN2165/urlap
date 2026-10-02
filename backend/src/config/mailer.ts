import nodemailer from 'nodemailer';

const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailer = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })
  : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || '"urlap" <no-reply@urlap.app>';

if (!mailer) {
  console.warn('[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — password reset links will be logged to the console instead of emailed.');
} else {
  // Verifies the SMTP connection once at startup. This is the single most
  // useful diagnostic for "emails fail silently in production": it tells
  // you immediately in the Railway logs whether the problem is
  // connectivity/auth (shows up right here) vs. something failing on a
  // specific send (shows up in email.service.ts's own try/catch instead).
  mailer.verify((err) => {
    if (err) {
      console.error('[mailer] SMTP verification FAILED — emails will not send:', {
        message: err.message,
        code: (err as any).code,
        command: (err as any).command,
      });
    } else {
      console.log('[mailer] SMTP connection verified — ready to send emails.');
    }
  });
}