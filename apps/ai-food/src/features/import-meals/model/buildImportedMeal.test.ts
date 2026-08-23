import { describe, expect, it } from 'vitest';
import { buildImportedMeal } from './buildImportedMeal';
import type { ImportedMealDraft } from './types';

const draft: ImportedMealDraft = {
  date: '2026-07-28',
  time: '01:33',
  name: 'йогурт',
  calories: 254,
  protein: 6,
  fat: 10,
  carbs: 34,
  fiber: 1,
};

describe('buildImportedMeal', () => {
  it('returns null for blank name or calories <= 0', () => {
    expect(
      buildImportedMeal({ ...draft, name: '  ' }, { mealId: 'm1', itemId: 'i1' }),
    ).toBeNull();
    expect(
      buildImportedMeal({ ...draft, calories: 0 }, { mealId: 'm1', itemId: 'i1' }),
    ).toBeNull();
  });

  it('builds ready single-item meal without totalGrams', () => {
    const meal = buildImportedMeal(draft, { mealId: 'm1', itemId: 'i1' });
    expect(meal).toMatchObject({
      id: 'm1',
      name: 'йогурт',
      status: 'ready',
      portions: 1,
      totalCalories: 254,
    });
    expect(meal!.totalGrams).toBeUndefined();
    expect(meal!.items).toEqual([
      {
        id: 'i1',
        name: 'йогурт',
        calories: 254,
        protein: 6,
        fat: 10,
        carbs: 34,
        fiber: 1,
        grams: 0,
      },
    ]);
    expect(meal!.aiModel).toBeUndefined();
    expect(meal!.imageUri).toBeUndefined();
  });
});
