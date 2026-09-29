import { z } from 'zod';

export const updateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  password: z.string().min(8).optional(),
  showInLeaderboard: z.boolean().optional(),
});