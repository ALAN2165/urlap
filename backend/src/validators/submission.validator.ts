import { z } from 'zod';

export const submissionSchema = z.object({
  challengeId: z.string(),
  language: z.enum(['SQL', 'JAVASCRIPT', 'PYTHON', 'TYPESCRIPT', 'JAVA', 'CPP', 'GO']),
  code: z.string().min(1).max(20000),
});