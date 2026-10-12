import { z } from 'zod';

const hintInputSchema = z.object({
  contentEn: z.string().min(1),
  contentAr: z.string().min(1),
  pointPenalty: z.coerce.number().int().nonnegative(),
});

const challengeBaseSchema = {
  titleEn: z.string().min(1),
  titleAr: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionAr: z.string().min(1),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']),
  points: z.coerce.number().int().positive(),
  schemaJson: z.string().nullable().optional(),
  referenceAnswer: z.string().min(1),
  hints: z.array(hintInputSchema).length(3),
};

export const adminCreateChallengeSchema = z.object({ labId: z.string(), ...challengeBaseSchema });
export const adminUpdateChallengeSchema = z.object(challengeBaseSchema);
export const adminLabSchema = z.object({ titleEn: z.string().min(1), titleAr: z.string().min(1) });
export const adminReorderSchema = z.object({ challengeIds: z.array(z.string()).min(1) });