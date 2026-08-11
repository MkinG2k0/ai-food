import { describe, it, expect } from 'vitest';
import { calculateTargets } from './calculateTargets';
import type { UserProfile } from '@ai-food/shared-types';

const now = new Date(2026, 7, 12, 12, 0, 0, 0);

function baseMale(over: Partial<UserProfile> = {}): UserProfile {
  return {
    gender: 'male',
    age: 30,
    height: 175,
    weight: 75,
    targetWeight: 75,
    targetWeightDate: '2026-11-10',
    activity: 'medium',
    goal: 'maintain',
    dietType: 'none',
    ...over,
  };
}

describe('calculateTargets', () => {
  it('kcal equals round(TDEE) when weight nearly unchanged', () => {
    const { targets, pace } = calculateTargets(baseMale(), { now });
    // BMR = 1698.75; TDEE = 2633.0625 → 2633
    expect(targets.kcal).toBe(2633);
    expect(pace.clampedDeltaKcal).toBe(0);
    expect(pace.clamped).toBe(false);
  });

  it('applies moderate loss delta from weight/date (not GOAL_DELTA)', () => {
    // female low: BMR 1345.25; TDEE 1614.3 → 1614
    // -5kg / 90d → -389
    const { targets, pace } = calculateTargets(
      {
        gender: 'female',
        age: 25,
        height: 165,
        weight: 60,
        targetWeight: 55,
        targetWeightDate: '2026-11-10',
        activity: 'low',
        goal: 'lose',
        dietType: 'none',
      },
      { now },
    );
    expect(pace.rawDeltaKcal).toBe(-389);
    expect(pace.clamped).toBe(false);
    // TDEE 1614 − 389 = 1225, but BMR floor → 1345
    expect(targets.kcal).toBe(1345);
  });

  it('clamps +10kg tomorrow to +300 and sets pace.clamped', () => {
    const { targets, pace } = calculateTargets(
      baseMale({
        weight: 70,
        targetWeight: 80,
        targetWeightDate: '2026-08-13',
        goal: 'gain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    // BMR male 25/180/70: 10*70+6.25*180-5*25+5 = 700+1125-125+5 = 1705
    // TDEE low 1705*1.2 = 2046
    expect(pace.rawDeltaKcal).toBe(70000);
    expect(pace.clampedDeltaKcal).toBe(300);
    expect(pace.clamped).toBe(true);
    expect(targets.kcal).toBe(2046 + 300);
  });

  it('never goes below round(BMR)', () => {
    const profile = baseMale({
      activity: 'low',
      weight: 90,
      targetWeight: 60,
      targetWeightDate: '2026-08-13',
      goal: 'lose',
    });
    const { targets } = calculateTargets(profile, { now });
    // BMR male 30/175/90 = 10*90+6.25*175-5*30+5 = 900+1093.75-150+5 = 1848.75 → 1849
    expect(targets.kcal).toBeGreaterThanOrEqual(1849);
  });

  it('ignores goal enum when deltaKg drives surplus', () => {
    const maintainLabeled = calculateTargets(
      baseMale({
        weight: 80,
        targetWeight: 85,
        targetWeightDate: '2026-11-10',
        goal: 'maintain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    const gainLabeled = calculateTargets(
      baseMale({
        weight: 80,
        targetWeight: 85,
        targetWeightDate: '2026-11-10',
        goal: 'gain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    expect(maintainLabeled.targets.kcal).toBe(gainLabeled.targets.kcal);
  });

  it('calculates protein as weight * 1.8 rounded', () => {
    const { targets } = calculateTargets(baseMale(), { now });
    expect(targets.protein).toBe(Math.round(75 * 1.8));
  });

  it('all macros are integers and fiber is 30', () => {
    const { targets } = calculateTargets(
      baseMale({
        gender: 'female',
        age: 35,
        height: 160,
        weight: 65,
        targetWeight: 65,
        activity: 'high',
      }),
      { now },
    );
    expect(Number.isInteger(targets.kcal)).toBe(true);
    expect(Number.isInteger(targets.protein)).toBe(true);
    expect(Number.isInteger(targets.fat)).toBe(true);
    expect(Number.isInteger(targets.carbs)).toBe(true);
    expect(targets.fiber).toBe(30);
  });
});
