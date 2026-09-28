
import { Response, NextFunction } from 'express';

import { AuthRequest } from '../middleware/authMiddleware';

import * as challengeService from '../services/challenge.service';

export async function reveal(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { hintId } = req.params;

    if (typeof hintId !== 'string') {
      return res.status(400).json({
        message: 'Invalid hint ID',
      });
    }

    const hint = await challengeService.revealHint(req.userId!, hintId);

    res.json(hint);
  } catch (err) {
    next(err);
  }
}
