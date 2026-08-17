import type { PrismaClient } from '../generated/prisma/client.js';
import { hasActiveSubscription } from './subscription.js';

export const REFERRAL_REWARD_DAYS = 30;

export async function grantReferralRewardIfNeeded(
  prisma: PrismaClient,
  payment: {
    id: string;
    userId: string;
    promoCode?: string | null;
    referralGrantedAt?: Date | null;
  },
): Promise<void> {
  if (payment.referralGrantedAt) return;
  const promoCode = payment.promoCode?.trim();
  if (!promoCode) return;

  const admin = await prisma.promoCode.findUnique({ where: { code: promoCode } });
  if (admin) return;

  const referrer = await prisma.user.findUnique({
    where: { referralCode: promoCode },
  });
  if (!referrer || referrer.id === payment.userId) return;

  const now = new Date();
  const expiresAt = new Date(
    hasActiveSubscription(referrer) && referrer.subscriptionExpiresAt
      ? referrer.subscriptionExpiresAt.getTime()
      : now.getTime(),
  );
  expiresAt.setUTCDate(expiresAt.getUTCDate() + REFERRAL_REWARD_DAYS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: referrer.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expiresAt,
      },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: { referralGrantedAt: now },
    });
  });
}
