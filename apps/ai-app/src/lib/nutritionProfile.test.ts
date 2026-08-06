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
});
