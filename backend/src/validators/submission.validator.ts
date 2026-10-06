import { z } from 'zod';

export const submissionSchema = z.object({
  challengeId: z.string(),
  language: z.enum(['SQL', 'JAVASCRIPT', 'PYTHON', 'TYPESCRIPT', 'JAVA', 'CPP', 'GO']),
  code: z.string().min(1).max(20000),
  isPasted: z.boolean().optional(),
  timeSpentSeconds: z.coerce.number().int().nonnegative().max(86400).optional(),
  tabSwitches: z.coerce.number().int().nonnegative().max(10000).optional(),
});