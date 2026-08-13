import { describe, expect, it } from 'vitest';
import { parseNutritionProfile } from './nutritionProfile';

const valid = {
  profile: {
    gender: 'male' as const,
    age: 25,
    height: 170,
    weight: 70,
    targetWeight: 70,
    targetWeightDate: '2026-08-01',
    activity: 'medium' as const,
    goal: 'maintain' as const,
    dietType: 'none' as const,
  },
  targets: { kcal: 2200, protein: 120, fat: 70, carbs: 250, fiber: 30 },
};

describe('parseNutritionProfile (client)', () => {
  it('accepts valid payload without plan start fields (legacy)', () => {
    const parsed = parseNutritionProfile(valid);
    expect(parsed).toEqual(valid);
    expect(parsed?.profile.planStartDate).toBeUndefined();
    expect(parsed?.profile.planStartWeight).toBeUndefined();
  });

  it('round-trips plan start fields when present and valid', () => {
    const withPlanStart = {
      ...valid,
      profile: {
        ...valid.profile,
        planStartDate: '2026-08-12',
        planStartWeight: 70,
      },
    };
    expect(parseNutritionProfile(withPlanStart)).toEqual(withPlanStart);
  });

  it('omits invalid plan start fields without failing parse', () => {
    const invalidPlanStart = {
      ...valid,
      profile: {
        ...valid.profile,
        planStartDate: 'not-a-date',
        planStartWeight: -1,
      },
    };
    expect(parseNutritionProfile(invalidPlanStart)).toEqual(valid);
  });

  it('rejects corrupt', () => {
    expect(parseNutritionProfile({ targets: valid.targets })).toBeNull();
  });

  it('omits micronutrientTargets when absent', () => {
    const parsed = parseNutritionProfile(valid);
    expect(parsed).toEqual(valid);
    expect(parsed).not.toHaveProperty('micronutrientTargets');
  });

  it('includes micronutrientTargets array when present', () => {
    const withMicro = {
      ...valid,
      micronutrientTargets: [
        { id: 'vitaminC', amount: 90, unit: 'mg' as const },
        { id: 'vitaminA', amount: 900, unit: 'µg' as const },
      ],
    };
    expect(parseNutritionProfile(withMicro)).toEqual(withMicro);
  });

  it('includes micronutrientTargets null', () => {
    const withNull = { ...valid, micronutrientTargets: null };
    expect(parseNutritionProfile(withNull)).toEqual(withNull);
  });

  it('filters invalid micronutrient items loosely', () => {
    const mixed = {
      ...valid,
      micronutrientTargets: [
        { id: 'iron', amount: 8, unit: 'mg' },
        { id: 'zinc', amount: 1, unit: 'mg' },
        { id: 'calcium', amount: 'x', unit: 'mg' },
      ],
    };
    expect(parseNutritionProfile(mixed)?.micronutrientTargets).toEqual([
      { id: 'iron', amount: 8, unit: 'mg' },
    ]);
  });
});
