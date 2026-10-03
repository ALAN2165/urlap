import { z } from 'zod';

export const reportSchema = z.object({
  challengeId: z.string(),
  reason: z.string().min(5).max(1000),
});