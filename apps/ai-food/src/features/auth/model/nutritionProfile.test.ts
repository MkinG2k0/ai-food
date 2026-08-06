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
  it('accepts valid payload', () => {
    expect(parseNutritionProfile(valid)).toEqual(valid);
  });
  it('rejects corrupt', () => {
    expect(parseNutritionProfile({ targets: valid.targets })).toBeNull();
  });
});
