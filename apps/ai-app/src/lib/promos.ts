import type { PrismaClient } from '../generated/prisma/client.js';

export type PromoDefinition = {
  code: string;
  discountPercent: number;
};

export const REFERRAL_DISCOUNT_PERCENT = 10;

export type ResolvedPromo = {
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
  source: 'admin' | 'referral';
  referrerId?: string;
};

export function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function lookupPromo(
  prisma: PrismaClient | null | undefined,
  raw: string,
): Promise<PromoDefinition | null> {
  const key = normalizePromoCode(raw);
  if (!key || !prisma) return null;
  const row = await prisma.promoCode.findUnique({ where: { code: key } });
  if (!row) return null;
  return { code: row.code, discountPercent: row.discountPercent };
}

/** finalAmount in kopecks; never below 1. */
export function applyPromoDiscount(
  originalAmount: number,
  discountPercent: number,
): number {
  const discounted = Math.floor(
    (originalAmount * (100 - discountPercent)) / 100,
  );
  return Math.max(1, discounted);
}

export async function resolvePromo(
  prisma: PrismaClient | null | undefined,
  raw: string,
  originalAmount: number,
): Promise<ResolvedPromo | null> {
  const promo = await lookupPromo(prisma, raw);
  if (promo) {
    return {
      code: promo.code,
      discountPercent: promo.discountPercent,
      originalAmount,
      finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
      source: 'admin',
    };
  }
  const key = normalizePromoCode(raw.trim().replace(/^@+/, ''));
  if (!key || !prisma) return null;
  const referrer = await prisma.user.findUnique({ where: { referralCode: key } });
  if (!referrer) return null;
  return {
    code: key,
    discountPercent: REFERRAL_DISCOUNT_PERCENT,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, REFERRAL_DISCOUNT_PERCENT),
    source: 'referral',
    referrerId: referrer.id,
  };
}
