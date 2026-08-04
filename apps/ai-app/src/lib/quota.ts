import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from '../../lib/errors.js';

export const BILLABLE_KINDS = new Set(['analyze', 'refine']);

export type UsageKind = 'analyze' | 'refine' | 'other';

export function parseUsageKind(raw: string | undefined): UsageKind {
  if (raw === 'analyze' || raw === 'refine') return raw;
  return 'other';
}

export function getFreeLimit(): number {
  const n = Number(process.env.FREE_GENERATION_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50;
}

/** Extra generations granted after sign-in (summed with guest free limit). */
export function getAuthLoginBonus(): number {
  const n = Number(process.env.AUTH_LOGIN_GENERATION_BONUS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 100;
}

/** Guest: FREE only. Authenticated (no sub): FREE + login bonus. */
export function getEffectiveLimit(authenticated: boolean): number {
  return getFreeLimit() + (authenticated ? getAuthLoginBonus() : 0);
}

export function shouldEnforceQuota(): boolean {
  if (process.env.QUOTA_ENFORCE === 'true') return true;
  if (process.env.QUOTA_ENFORCE === 'false') return false;
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function ensureDevice(
  prisma: PrismaClient,
  clientDeviceId: string,
  userId?: string,
) {
  return prisma.device.upsert({
    where: { deviceId: clientDeviceId },
    create: { deviceId: clientDeviceId, userId: userId ?? null },
    update: userId ? { userId } : {},
  });
}

/** Device free-tier usage: all analyze/refine on the device (login alone does not reset). */
export async function countGuestBillableUsage(
  prisma: PrismaClient,
  deviceRowId: string,
): Promise<number> {
  return prisma.usageEvent.count({
    where: {
      deviceId: deviceRowId,
      kind: { in: ['analyze', 'refine'] },
    },
  });
}

export type UsageSnapshotOpts = {
  authenticated: boolean;
  hasActiveSubscription?: boolean;
};

export async function getUsageSnapshot(
  prisma: PrismaClient,
  clientDeviceId: string,
  opts: boolean | UsageSnapshotOpts,
): Promise<{
  used: number;
  limit: number;
  remaining: number | null;
  authenticated: boolean;
  hasActiveSubscription: boolean;
}> {
  const options: UsageSnapshotOpts =
    typeof opts === 'boolean' ? { authenticated: opts } : opts;
  const hasSub = Boolean(options.hasActiveSubscription);
  const limit = getEffectiveLimit(options.authenticated);

  if (options.authenticated && hasSub) {
    return {
      used: 0,
      limit,
      remaining: null,
      authenticated: true,
      hasActiveSubscription: true,
    };
  }

  const device = await prisma.device.findUnique({
    where: { deviceId: clientDeviceId },
  });
  const used = device ? await countGuestBillableUsage(prisma, device.id) : 0;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    authenticated: options.authenticated,
    hasActiveSubscription: false,
  };
}

export async function assertGuestQuotaOrThrow(
  prisma: PrismaClient,
  clientDeviceId: string,
  opts?: { authenticated?: boolean },
): Promise<{ deviceRowId: string; used: number; limit: number }> {
  if (!clientDeviceId.trim()) {
    throw new ApiError(400, 'DEVICE_ID_REQUIRED', 'X-Device-Id header is required.');
  }
  const authenticated = Boolean(opts?.authenticated);
  const device = await ensureDevice(prisma, clientDeviceId.trim());
  const used = await countGuestBillableUsage(prisma, device.id);
  const limit = getEffectiveLimit(authenticated);
  if (used >= limit) {
    const message = authenticated
      ? 'Free generation limit reached. Purchase a yearly license to continue.'
      : 'Free generation limit reached. Sign in to continue.';
    throw new ApiError(402, 'QUOTA_EXCEEDED', message, {
      used,
      limit,
      remaining: 0,
    });
  }
  return { deviceRowId: device.id, used, limit };
}

export async function recordBillableUsage(
  prisma: PrismaClient,
  opts: {
    deviceRowId: string;
    kind: 'analyze' | 'refine';
    userId?: string | null;
  },
): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      kind: opts.kind,
      deviceId: opts.deviceRowId,
      userId: opts.userId ?? null,
    },
  });
}
