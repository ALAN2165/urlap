import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/authMiddleware';
import { testSqlQuery } from '../services/sqlGrader.service';

const schema = z.object({
  sql: z.string().min(1).max(20000),
  setupSql: z.string().max(20000).nullable().optional(), // the challenge's hidden fixture, run first (same as for students)
});

export async function adminTestSql(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sql, setupSql } = schema.parse(req.body);
    res.json(await testSqlQuery(sql, setupSql));
  } catch (err) { next(err); }
}