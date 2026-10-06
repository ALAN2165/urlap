import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as challengeService from '../services/challenge.service';
import { testSqlQuery } from '../services/sqlGrader.service';
import { prisma } from '../config/db';

export async function getLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.listLabs(req.userId));
  } catch (err) { next(err); }
}

export async function getLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.getLabBySlug(req.params.labSlug as string, req.userId));
  } catch (err) { next(err); }
}

export async function getChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.getChallengeBySlug(req.params.slug as string, req.userId));
  } catch (err) { next(err); }
}

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export async function getChallengeSampleData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const challenge = await prisma.challenge.findUniqueOrThrow({ 
      where: { slug: req.params.slug as string } 
    });
    
    const locked = await challengeService.isChallengeLocked(challenge.id, req.userId as string);
    if (locked) return res.status(403).json({ error: 'This challenge is locked.' });
    if (!challenge.schemaJson) return res.json({ tables: [] });

    let schema: { tables: { name: string; columns: { name: string }[] }[] };
    try { schema = JSON.parse(challenge.schemaJson); } catch { return res.json({ tables: [] }); }

    const results = [];
    for (const table of schema.tables ?? []) {
      if (!SAFE_IDENTIFIER.test(table.name)) continue; 
      const result = await testSqlQuery(`SELECT * FROM ${table.name} LIMIT 5`);
      results.push({
        name: table.name,
        columns: result.ok ? result.columns : table.columns.map((c: any) => c.name),
        rows: result.ok ? result.rows : [],
        error: result.ok ? null : result.message,
      });
    }
    res.json({ tables: results });
  } catch (err) { next(err); }
}