import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { testSqlQuery } from '../services/sqlGrader.service';

const testSchema = z.object({ sql: z.string().min(1) });

export async function adminTestSql(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sql } = testSchema.parse(req.body);
    const result = await testSqlQuery(sql);
    res.json(result);
  } catch (err) { next(err); }
}