import { describe, it, expect } from 'vitest';
import { resolveItemGrams } from './resolveItemGrams';

describe('resolveItemGrams', () => {
  it('rounds finite grams', () => {
    expect(resolveItemGrams({ grams: 85.6 })).toBe(86);
  });

  it('clamps negative grams to 0', () => {
    expect(resolveItemGrams({ grams: -3 })).toBe(0);
  });

  it('parses leading number from legacy portion when grams missing', () => {
    expect(resolveItemGrams({ portion: '120 г' } as { portion?: string })).toBe(
      120,
    );
  });

  it('defaults to 100 when grams and portion are absent', () => {
    expect(resolveItemGrams({})).toBe(100);
  });
});
