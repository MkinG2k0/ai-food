import { Router } from 'express';
import { ApiError } from '../../lib/errors.js';
import { notifyAdminNewSupportReport } from '../lib/notifyAdminSupportReport.js';
import {
  createSupportReportBodySchema,
  supportReportResponse,
} from '../lib/supportReport.js';
import { assertAuthConfigured, verifyUserToken } from '../lib/jwt.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.js';

export const userSupportReportsRouter = Router();

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

function userDisplayName(user: {
  firstName: string | null;
  username: string | null;
}): string | null {
  const name = user.firstName?.trim();
  if (name) return name;
  const username = user.username?.trim();
  if (username) return `@${username.replace(/^@/, '')}`;
  return null;
}

async function resolveReporter(req: {
  header(name: string): string | undefined;
}) {
  assertAuthConfigured();

  const userToken = req.header('x-user-token')?.trim();
  const deviceId = req.header('x-device-id')?.trim();

  if (!userToken && !deviceId) {
    throw new ApiError(
      401,
      'AUTH_REQUIRED',
      'X-User-Token or X-Device-Id required.',
    );
  }

  let userId: string | null = null;
  let displayName: string | null = null;
  if (userToken) {
    const payload = await verifyUserToken(userToken);
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
    }
    userId = user.id;
    displayName = userDisplayName(user);
  }

  return { userId, deviceId: deviceId ?? null, displayName };
}

userSupportReportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createSupportReportBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid support report body.');
    }

    const reporter = await resolveReporter(req);
    const prisma = requireDb();

    const created = await prisma.supportReport.create({
      data: {
        userId: reporter.userId,
        deviceId: reporter.deviceId,
        type: parsed.data.type,
        message: parsed.data.message,
        images: parsed.data.images,
        appVersion: parsed.data.appVersion ?? null,
        platform: parsed.data.platform ?? null,
      },
    });

    const images = Array.isArray(created.images) ? created.images : [];
    void notifyAdminNewSupportReport({
      id: created.id,
      type: created.type,
      message: created.message,
      platform: created.platform,
      appVersion: created.appVersion,
      imageCount: images.length,
      userId: created.userId,
      deviceId: created.deviceId,
      userDisplayName: reporter.displayName,
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[support-reports] notifyAdmin failed:', message);
    });

    res.status(201).json(supportReportResponse(created));
  }),
);
