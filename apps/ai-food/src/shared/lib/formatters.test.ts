import { describe, it, expect } from 'vitest';
import { formatCalories, formatMacro, formatDate } from './formatters';

describe('formatCalories', () => {
  it('formats whole number', () => {
    expect(formatCalories(320)).toBe('320 ккал');
  });

  it('rounds decimals', () => {
    expect(formatCalories(320.7)).toBe('321 ккал');
  });

  it('formats zero', () => {
    expect(formatCalories(0)).toBe('0 ккал');
  });
});

describe('formatMacro', () => {
  it('formats whole grams without trailing .0', () => {
    expect(formatMacro(35)).toBe('35 г');
  });

  it('shows one decimal and keeps 5.5', () => {
    expect(formatMacro(5.5)).toBe('5.5 г');
    expect(formatMacro(35.9)).toBe('35.9 г');
  });
});

describe('formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2026-06-24T10:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
