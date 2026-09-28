import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as challengeService from '../services/challenge.service';

export async function getLabs(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.listLabs(req.userId));
  } catch (err) { next(err); }
}

export async function getLab(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.getLabBySlug(req.params.labSlug as string, req.userId ));
  } catch (err) { next(err); }
}

export async function getChallenge(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await challengeService.getChallengeBySlug(req.params.slug as string, req.userId));
  } catch (err) { next(err); }
}