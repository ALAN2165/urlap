import nodemailer from 'nodemailer';

const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailer = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || '"urlap" <no-reply@urlap.app>';

if (!mailer) {
  console.warn('[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — password reset links will be logged to the console instead of emailed.');
}