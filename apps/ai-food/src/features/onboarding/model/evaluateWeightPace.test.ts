import { describe, it, expect } from 'vitest';
import { evaluateWeightPace } from './evaluateWeightPace';

describe('evaluateWeightPace', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0, 0); // 2026-08-12 local

  it('returns delta 0 when |deltaKg| < 0.5', () => {
    const r = evaluateWeightPace({
      weight: 75,
      targetWeight: 75.4,
      targetWeightDate: '2026-11-01',
      now,
    });
    expect(r.deltaKg).toBeCloseTo(0.4);
    expect(r.rawDeltaKcal).toBe(0);
    expect(r.clampedDeltaKcal).toBe(0);
    expect(r.clamped).toBe(false);
  });

  it('moderate loss over ~90 days stays inside clamp', () => {
    // 2026-08-12 → 2026-11-10 = 90 days; -5kg → round(-5*7000/90)= -389
    const r = evaluateWeightPace({
      weight: 80,
      targetWeight: 75,
      targetWeightDate: '2026-11-10',
      now,
    });
    expect(r.days).toBe(90);
    expect(r.rawDeltaKcal).toBe(-389);
    expect(r.clampedDeltaKcal).toBe(-389);
    expect(r.clamped).toBe(false);
  });

  it('clamps +10 kg in 1 day to +300', () => {
    const r = evaluateWeightPace({
      weight: 70,
      targetWeight: 80,
      targetWeightDate: '2026-08-13',
      now,
    });
    expect(r.days).toBe(1);
    expect(r.rawDeltaKcal).toBe(70000);
    expect(r.clampedDeltaKcal).toBe(300);
    expect(r.clamped).toBe(true);
  });

  it('clamps aggressive loss to -500', () => {
    const r = evaluateWeightPace({
      weight: 90,
      targetWeight: 70,
      targetWeightDate: '2026-08-13',
      now,
    });
    expect(r.rawDeltaKcal).toBe(-140000);
    expect(r.clampedDeltaKcal).toBe(-500);
    expect(r.clamped).toBe(true);
  });

  it('uses at least 1 day even if date parses oddly', () => {
    const r = evaluateWeightPace({
      weight: 70,
      targetWeight: 71,
      targetWeightDate: '2026-08-12', // same calendar day as now
      now,
    });
    expect(r.days).toBe(1);
  });
});
