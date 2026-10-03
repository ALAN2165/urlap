import dns from 'dns';
// السطر ده لازم يكون أول حاجة تتنفذ عشان يلغي الـ IPv6 تماماً من السيرفر
dns.setDefaultResultOrder('ipv4first');

import nodemailer from 'nodemailer';

const hasSmtpConfig = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

export const mailer = hasSmtpConfig
  ? nodemailer.createTransport({
      service: 'gmail', // الكلمة دي بتخلي Nodemailer يظبط الـ host والـ port والـ secure بالطريقة اللي جوجل بتحبها
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })
  : null;

export const EMAIL_FROM = process.env.EMAIL_FROM || '"urlap" <urlap.support@gmail.com>';

if (!mailer) {
  console.warn('[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS not set — password reset links will be logged to the console instead of emailed.');
} else {
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