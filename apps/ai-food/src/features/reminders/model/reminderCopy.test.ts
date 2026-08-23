import { describe, it, expect } from 'vitest';
import {
  hashSeed,
  pickAnalyzeErrorCopy,
  pickMealReminderCopy,
  pickStreakMilestoneCopy,
  pickStreakRiskCopy,
  pickWeightWeeklyCopy,
} from './reminderCopy';

describe('reminderCopy', () => {
  it('exposes 10 unique variants per meal slot', () => {
    for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
      const bodies = new Set(
        Array.from({ length: 10 }, (_, i) => pickMealReminderCopy(slot, i).body),
      );
      expect(bodies.size).toBe(10);
    }
  });

  it('picks stably for the same seed', () => {
    const a = pickMealReminderCopy('dinner', 42);
    const b = pickMealReminderCopy('dinner', 42);
    expect(a).toEqual(b);
  });

  it('interpolates streak length into risk and milestone copy', () => {
    expect(pickStreakRiskCopy(12, 0).body).toContain('12');
    expect(pickStreakMilestoneCopy(7, 1).body).toContain('7');
  });

  it('exposes 10 variants for weight and analyze-error', () => {
    expect(
      new Set(Array.from({ length: 10 }, (_, i) => pickWeightWeeklyCopy(i).body))
        .size,
    ).toBe(10);
    expect(
      new Set(Array.from({ length: 10 }, (_, i) => pickAnalyzeErrorCopy(i).body))
        .size,
    ).toBe(10);
  });

  it('hashSeed is deterministic', () => {
    expect(hashSeed('meal-abc')).toBe(hashSeed('meal-abc'));
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });
});
