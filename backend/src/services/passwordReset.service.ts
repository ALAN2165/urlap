import crypto from 'crypto';
import { prisma } from '../config/db';
import { sendPasswordResetEmail } from './email.service';

const TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  try {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    console.log(`[password-reset] Generated reset link for ${user.email} using FRONTEND_URL="${frontendUrl}"`);

    await sendPasswordResetEmail(user.email, user.username, resetUrl);
  } catch (err: any) {
    // Logged loudly on purpose: this is exactly where a silent production
    // failure happens — e.g. the password_reset_tokens table missing
    // because `prisma migrate deploy` was never run against this database,
    // or FRONTEND_URL pointing at a stale/wrong origin. Never rethrown —
    // the controller must always return the same generic response either way.
    console.error('[password-reset] Failed to generate/send a reset link:', {
      email: user.email,
      message: err.message,
      code: err.code,
    });
  }
}

export async function resetPasswordWithToken(rawToken: string, newPasswordHash: string): Promise<{ ok: boolean; error?: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return { ok: false, error: 'This reset link is invalid or has expired. Please request a new one.' };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: newPasswordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);

  return { ok: true };
}