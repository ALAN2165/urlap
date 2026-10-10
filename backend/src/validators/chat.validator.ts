import { z } from 'zod';

export const sendMessageSchema = z.object({ content: z.string().min(1).max(2000) });
export const closeByChallengeSchema = z.object({ challengeId: z.string() });
export const adminMessageUserSchema = z.object({ message: z.string().min(1).max(2000) });