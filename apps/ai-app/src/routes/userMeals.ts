import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { assertAuthConfigured, verifyUserToken } from '../lib/jwt.js';
import { applyMealSync, mealSyncBodySchema } from '../lib/mealSync.js';

export const userMealsRouter = Router();

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'DATABASE_URL is not configured.',
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Database client is not available.',
    );
  }
  return prisma;
}

userMealsRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    assertAuthConfigured();
    const header = req.header('x-user-token')?.trim();
    if (!header) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
    }

    const payload = await verifyUserToken(header);
    const parsed = mealSyncBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid meal sync body.');
    }

    const prisma = requireDb();
    // Ownership always from JWT sub — never from body.
    const result = await applyMealSync(prisma, payload.sub, parsed.data);
    res.status(200).json(result);
  }),
);
