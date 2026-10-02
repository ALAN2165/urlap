import crypto from 'crypto';
import { prisma } from '../config/db';
import { sendPasswordResetEmail } from './email.service';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Deliberately a no-op (not an error) if the email doesn't exist — the
  // controller always returns the same response either way, so this
  // endpoint can never be used to find out which emails are registered.
  if (!user) return;

  // Invalidate any earlier unused tokens so only the most recent link works.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, used: false } });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

  await sendPasswordResetEmail(user.email, user.username, resetUrl);
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