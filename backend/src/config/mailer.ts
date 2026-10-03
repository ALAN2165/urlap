import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || 'urlap <onboarding@resend.dev>';

if (!resend) {
  console.warn('[mailer] RESEND_API_KEY not set — emails will be logged to the console instead of sent.');
} else {
  console.log('[mailer] Resend configured — sending via HTTPS API (bypasses SMTP port blocking entirely).');
}