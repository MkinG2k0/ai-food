import type { RequestHandler } from 'express';
import { ApiError } from '../../lib/errors.js';

export const requireApiKey: RequestHandler = (req, _res, next) => {
  const expected = process.env.API_KEY;
  if (!expected) {
    next();
    return;
  }

  const authHeader = req.header('authorization');
  const bearer =
    authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : undefined;
  const headerKey = req.header('x-api-key')?.trim();
  const provided = bearer || headerKey;

  if (!provided || provided !== expected) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Valid API key required.'));
    return;
  }

  next();
};
