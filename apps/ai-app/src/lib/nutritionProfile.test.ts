import { describe, expect, it } from 'vitest';
import {
  parseNutritionProfile,
  nutritionProfileBodySchema,
} from './nutritionProfile.js';

const valid = {
  profile: {
    gender: 'male',
    age: 30,
    height: 180,
    weight: 80,
    targetWeight: 75,
    targetWeightDate: '2026-12-01',
    activity: 'medium',
    goal: 'lose',
    dietType: 'none',
  },
  targets: { kcal: 2000, protein: 150, fat: 60, carbs: 200, fiber: 25 },
};

describe('parseNutritionProfile', () => {
  it('returns payload for valid object', () => {
    expect(parseNutritionProfile(valid)).toEqual(valid);
  });

  it('returns null for null/undefined/garbage', () => {
    expect(parseNutritionProfile(null)).toBeNull();
    expect(parseNutritionProfile(undefined)).toBeNull();
    expect(parseNutritionProfile({ profile: {} })).toBeNull();
    expect(parseNutritionProfile('x')).toBeNull();
  });
});

describe('nutritionProfileBodySchema', () => {
  it('rejects bad gender', () => {
    const bad = {
      ...valid,
      profile: { ...valid.profile, gender: 'other' },
    };
    expect(nutritionProfileBodySchema.safeParse(bad).success).toBe(false);
  });

  it('accepts micronutrientTargets array', () => {
    const withMicro = {
      ...valid,
      micronutrientTargets: [
        { id: 'vitaminC', amount: 90, unit: 'mg' },
        { id: 'vitaminA', amount: 900, unit: 'µg' },
      ],
    };
    expect(nutritionProfileBodySchema.safeParse(withMicro).success).toBe(true);
    expect(parseNutritionProfile(withMicro)).toEqual(withMicro);
  });

  it('accepts micronutrientTargets null', () => {
    const withNull = { ...valid, micronutrientTargets: null };
    expect(parseNutritionProfile(withNull)).toEqual(withNull);
  });

  it('omits micronutrientTargets when absent', () => {
    const parsed = parseNutritionProfile(valid);
    expect(parsed).toEqual(valid);
    expect(parsed).not.toHaveProperty('micronutrientTargets');
  });

  it('rejects invalid micronutrient id or unit', () => {
    expect(
      nutritionProfileBodySchema.safeParse({
        ...valid,
        micronutrientTargets: [{ id: 'zinc', amount: 1, unit: 'mg' }],
      }).success,
    ).toBe(false);
    expect(
      nutritionProfileBodySchema.safeParse({
        ...valid,
        micronutrientTargets: [{ id: 'iron', amount: 8, unit: 'g' }],
      }).success,
    ).toBe(false);
  });
});
