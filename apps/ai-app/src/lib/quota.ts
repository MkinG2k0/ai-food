import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from '../../lib/errors.js';

export type BillableUsageKind =
  | 'analyze'
  | 'analyze_photo'
  | 'analyze_text'
  | 'analyze_photo_text'
  | 'refine';

export type UsageKind = BillableUsageKind | 'other';

const BILLABLE_SET = new Set<string>([
  'analyze',
  'analyze_photo',
  'analyze_text',
  'analyze_photo_text',
  'refine',
]);

/** Defaults when AppSettings has no override. */
export const DEFAULT_FREE_GENERATION_LIMIT = 50;
export const DEFAULT_AUTH_LOGIN_GENERATION_BONUS = 100;

export function isBillableUsageKind(kind: string): kind is BillableUsageKind {
  return BILLABLE_SET.has(kind);
}

export function parseUsageKind(raw: string | undefined): UsageKind {
  const v = raw?.trim();
  if (!v) return 'analyze';
  if (isBillableUsageKind(v)) return v;
  return 'other';
}

export function billableUsageWhere() {
  return {
    OR: [{ kind: 'refine' as const }, { kind: { startsWith: 'analyze' } }],
  };
}

export type QuotaLimits = {
  freeGenerationLimit: number;
  authLoginGenerationBonus: number;
  freeSource: 'db' | 'default';
  bonusSource: 'db' | 'default';
};

async function loadQuotaSettings(prisma?: PrismaClient | null) {
  if (!prisma) return null;
  try {
    return await prisma.appSettings.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

function normalizeFreeLimit(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function normalizeBonus(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export async function getQuotaLimits(
  prisma?: PrismaClient | null,
): Promise<QuotaLimits> {
  const row = await loadQuotaSettings(prisma);
  const free = normalizeFreeLimit(row?.freeGenerationLimit);
  const bonus = normalizeBonus(row?.authLoginGenerationBonus);
  return {
    freeGenerationLimit: free ?? DEFAULT_FREE_GENERATION_LIMIT,
    authLoginGenerationBonus: bonus ?? DEFAULT_AUTH_LOGIN_GENERATION_BONUS,
    freeSource: free != null ? 'db' : 'default',
    bonusSource: bonus != null ? 'db' : 'default',
  };
}

export async function getFreeLimit(
  prisma?: PrismaClient | null,
): Promise<number> {
  const limits = await getQuotaLimits(prisma);
  return limits.freeGenerationLimit;
}

/** Extra generations granted after sign-in (summed with guest free limit). */
export async function getAuthLoginBonus(
  prisma?: PrismaClient | null,
): Promise<number> {
  const limits = await getQuotaLimits(prisma);
  return limits.authLoginGenerationBonus;
}

/** Guest: FREE only. Authenticated (no sub): FREE + login bonus. */
export async function getEffectiveLimit(
  authenticated: boolean,
  prisma?: PrismaClient | null,
): Promise<number> {
  const limits = await getQuotaLimits(prisma);
  return (
    limits.freeGenerationLimit +
    (authenticated ? limits.authLoginGenerationBonus : 0)
  );
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
      ...billableUsageWhere(),
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
  freeGenerationLimit: number;
  authLoginGenerationBonus: number;
}> {
  const options: UsageSnapshotOpts =
    typeof opts === 'boolean' ? { authenticated: opts } : opts;
  const hasSub = Boolean(options.hasActiveSubscription);
  const quota = await getQuotaLimits(prisma);
  const limit =
    quota.freeGenerationLimit +
    (options.authenticated ? quota.authLoginGenerationBonus : 0);
  const quotaFields = {
    freeGenerationLimit: quota.freeGenerationLimit,
    authLoginGenerationBonus: quota.authLoginGenerationBonus,
  };

  if (options.authenticated && hasSub) {
    return {
      used: 0,
      limit,
      remaining: null,
      authenticated: true,
      hasActiveSubscription: true,
      ...quotaFields,
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
    ...quotaFields,
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
  const limit = await getEffectiveLimit(authenticated, prisma);
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
    kind: BillableUsageKind;
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
