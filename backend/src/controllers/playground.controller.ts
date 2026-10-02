import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { testSqlQuery } from '../services/sqlGrader.service';

const runSchema = z.object({ sql: z.string().min(1).max(5000) });

export async function runPlaygroundQuery(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sql } = runSchema.parse(req.body);
    const result = await testSqlQuery(sql);
    res.json(result);
  } catch (err) { next(err); }
}