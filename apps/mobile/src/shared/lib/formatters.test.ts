import { describe, it, expect } from 'vitest';
import { formatCalories, formatMacro, formatDate } from './formatters';

describe('formatCalories', () => {
  it('formats whole number', () => {
    expect(formatCalories(320)).toBe('320 kcal');
  });

  it('rounds decimals', () => {
    expect(formatCalories(320.7)).toBe('321 kcal');
  });

  it('formats zero', () => {
    expect(formatCalories(0)).toBe('0 kcal');
  });
});

describe('formatMacro', () => {
  it('formats whole grams', () => {
    expect(formatMacro(35)).toBe('35g');
  });

  it('rounds fractional grams', () => {
    expect(formatMacro(35.9)).toBe('36g');
  });
});

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-06-24T10:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
