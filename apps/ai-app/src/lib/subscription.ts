import type { PrismaClient, SubscriptionStatus } from '../generated/prisma/client.js';

export type SubscriptionUserFields = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: Date | null;
};

export function getSubscriptionPriceKopecks(): number {
  const n = Number(process.env.SUBSCRIPTION_PRICE_KOPECKS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10_000;
}

export function getSubscriptionDurationDays(): number {
  const n = Number(process.env.SUBSCRIPTION_DURATION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 365;
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
  const days = getSubscriptionDurationDays();
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
