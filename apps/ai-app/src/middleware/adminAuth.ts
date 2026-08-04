import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '../../lib/errors.js';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const requireAdminKey: RequestHandler = (req, _res, next) => {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Admin API key required.'));
    return;
  }
  const provided = req.header('x-admin-key')?.trim() ?? '';
  if (!provided || !safeEqual(provided, expected)) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Valid admin API key required.'));
    return;
  }
  next();
};
