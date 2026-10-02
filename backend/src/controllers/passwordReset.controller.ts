import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { forgotPasswordSchema, resetPasswordSchema } from '../validators/passwordReset.validator';
import { requestPasswordReset, resetPasswordWithToken } from '../services/passwordReset.service';

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(email);
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await resetPasswordWithToken(token, passwordHash);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) { next(err); }
}