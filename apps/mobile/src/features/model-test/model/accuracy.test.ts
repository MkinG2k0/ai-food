import { describe, expect, it } from 'vitest';
import { average, kbjuAccuracy, macroAccuracy } from './accuracy';

describe('macroAccuracy', () => {
  it('returns 100 for exact match', () => {
    expect(macroAccuracy(610, 610)).toBe(100);
  });

  it('returns relative accuracy for over/under estimates', () => {
    expect(macroAccuracy(550, 610)).toBeCloseTo(90.16, 1);
    expect(macroAccuracy(671, 610)).toBeCloseTo(90, 0);
  });

  it('floors at 0 when error exceeds 100%', () => {
    expect(macroAccuracy(0, 100)).toBe(0);
    expect(macroAccuracy(250, 100)).toBe(0);
  });

  it('handles zero reference', () => {
    expect(macroAccuracy(0, 0)).toBe(100);
    expect(macroAccuracy(5, 0)).toBe(0);
  });
});

describe('kbjuAccuracy', () => {
  it('averages four macros', () => {
    const score = kbjuAccuracy(
      { calories: 610, protein: 35.2, fat: 25.5, carbs: 60.1 },
      { calories: 610, protein: 35.2, fat: 25.5, carbs: 60.1 },
    );
    expect(score).toBe(100);
  });
});

describe('average', () => {
  it('returns 0 for empty list', () => {
    expect(average([])).toBe(0);
  });

  it('means numbers', () => {
    expect(average([90, 80, 70])).toBe(80);
  });
});
