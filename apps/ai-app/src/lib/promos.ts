import type { PrismaClient } from '../generated/prisma/client.js';

export type PromoDefinition = {
  code: string;
  discountPercent: number;
};

export type ResolvedPromo = {
  code: string;
  discountPercent: number;
  originalAmount: number;
  finalAmount: number;
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
  if (!promo) return null;
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
  };
}
