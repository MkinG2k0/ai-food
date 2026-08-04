import type { PrismaClient, SubscriptionStatus } from '../generated/prisma/client.js';

export type SubscriptionUserFields = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Date | null;
};

export type PricingSource = 'db' | 'env';

export type PricingSnapshot = {
  priceKopecks: number;
  durationDays: number;
  priceSource: PricingSource;
  durationSource: PricingSource;
};

function envPriceKopecks(): number {
  const n = Number(process.env.SUBSCRIPTION_PRICE_KOPECKS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10_000;
}

function envDurationDays(): number {
  const n = Number(process.env.SUBSCRIPTION_DURATION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 365;
}

async function loadSettings(prisma?: PrismaClient | null) {
  if (!prisma) return null;
  try {
    return await prisma.appSettings.findUnique({ where: { id: 1 } });
  } catch {
    return null;
  }
}

export async function getSubscriptionPriceKopecks(
  prisma?: PrismaClient | null,
): Promise<number> {
  const row = await loadSettings(prisma);
  const db = row?.subscriptionPriceKopecks;
  if (db != null && Number.isFinite(db) && db > 0) return Math.floor(db);
  return envPriceKopecks();
}

export async function getSubscriptionDurationDays(
  prisma?: PrismaClient | null,
): Promise<number> {
  const row = await loadSettings(prisma);
  const db = row?.subscriptionDurationDays;
  if (db != null && Number.isFinite(db) && db > 0) return Math.floor(db);
  return envDurationDays();
}

export async function getPricingSnapshot(
  prisma?: PrismaClient | null,
): Promise<PricingSnapshot> {
  const row = await loadSettings(prisma);
  const dbPrice = row?.subscriptionPriceKopecks;
  const dbDays = row?.subscriptionDurationDays;
  const priceFromDb = dbPrice != null && Number.isFinite(dbPrice) && dbPrice > 0;
  const daysFromDb = dbDays != null && Number.isFinite(dbDays) && dbDays > 0;
  return {
    priceKopecks: priceFromDb ? Math.floor(dbPrice!) : envPriceKopecks(),
    durationDays: daysFromDb ? Math.floor(dbDays!) : envDurationDays(),
    priceSource: priceFromDb ? 'db' : 'env',
    durationSource: daysFromDb ? 'db' : 'env',
  };
}

/** Active only when status suggests active AND expiresAt is in the future. */
export function hasActiveSubscription(user: SubscriptionUserFields): boolean {
  if (user.subscriptionStatus !== 'active') return false;
  if (!user.subscriptionExpiresAt) return false;
  return user.subscriptionExpiresAt.getTime() > Date.now();
}

export function subscriptionPublicFields(user: SubscriptionUserFields): {
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
} {
  return {
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt
      ? user.subscriptionExpiresAt.toISOString()
      : null,
    hasActiveSubscription: hasActiveSubscription(user),
  };
}

/** Sets status active + expiresAt = paidAt + duration days. Caller owns idempotency. */
export async function activateYearLicense(
  prisma: PrismaClient,
  userId: string,
  paidAt: Date,
): Promise<void> {
  const days = await getSubscriptionDurationDays(prisma);
  const expiresAt = new Date(paidAt.getTime());
  expiresAt.setUTCDate(expiresAt.getUTCDate() + days);
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
    },
  });
}
