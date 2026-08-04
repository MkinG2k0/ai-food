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

const PROMOS = new Map<string, PromoDefinition>([
  ['new80', { code: 'new80', discountPercent: 80 }],
  ['new50', { code: 'new50', discountPercent: 50 }],
]);

export function normalizePromoCode(raw: string): string {
  return raw.trim().toLowerCase();
}

export function lookupPromo(raw: string): PromoDefinition | null {
  const key = normalizePromoCode(raw);
  if (!key) return null;
  return PROMOS.get(key) ?? null;
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

export function resolvePromo(
  raw: string,
  originalAmount: number,
): ResolvedPromo | null {
  const promo = lookupPromo(raw);
  if (!promo) return null;
  return {
    code: promo.code,
    discountPercent: promo.discountPercent,
    originalAmount,
    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
  };
}
