import { describe, it, expect } from 'vitest';
import {
  normalizePromoCode,
  lookupPromo,
  applyPromoDiscount,
  resolvePromo,
} from './promos.js';

describe('promos', () => {
  it('normalizePromoCode trims and lowercases', () => {
    expect(normalizePromoCode(' New80 ')).toBe('new80');
  });

  it('lookupPromo finds new80 and new50', () => {
    expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
    expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
  });

  it('lookupPromo returns null for unknown', () => {
    expect(lookupPromo('nope')).toBeNull();
    expect(lookupPromo('')).toBeNull();
    expect(lookupPromo('   ')).toBeNull();
  });

  it('lookupPromo returns null for prototype pollution keys', () => {
    expect(lookupPromo('__proto__')).toBeNull();
    expect(lookupPromo('constructor')).toBeNull();
  });

  it('applyPromoDiscount floors and clamps to min 1', () => {
    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
    expect(applyPromoDiscount(1, 80)).toBe(1);
    expect(applyPromoDiscount(3, 80)).toBe(1);
  });

  it('resolvePromo returns amounts for valid code', () => {
    expect(resolvePromo(' new80 ', 10_000)).toEqual({
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('resolvePromo returns null for invalid', () => {
    expect(resolvePromo('x', 10_000)).toBeNull();
    expect(resolvePromo('__proto__', 10_000)).toBeNull();
  });
});
