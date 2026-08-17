import { describe, it, expect } from 'vitest';
import { buildManualMeal, type BuildManualMealInput } from './buildManualMeal';

const ids = {
  mealId: 'meal-1',
  itemId: 'item-1',
  timestamp: '2026-08-03T12:00:00.000Z',
};

function baseInput(overrides: Partial<BuildManualMealInput> = {}): BuildManualMealInput {
  return {
    name: 'Овсянка',
    calories: 350,
    protein: 12,
    carbs: 55,
    fat: 8,
    fiber: 4,
    grams: 250,
    composition: [],
    ...overrides,
  };
}

describe('buildManualMeal', () => {
  it('returns null when name is blank', () => {
    expect(buildManualMeal(baseInput({ name: '   ' }), ids)).toBeNull();
  });

  it('returns null when composition empty and calories <= 0', () => {
    expect(buildManualMeal(baseInput({ calories: 0 }), ids)).toBeNull();
  });

  it('builds single-item meal from dish fields when composition empty', () => {
    const meal = buildManualMeal(baseInput(), ids);
    expect(meal).not.toBeNull();
    expect(meal!.id).toBe('meal-1');
    expect(meal!.name).toBe('Овсянка');
    expect(meal!.status).toBe('ready');
    expect(meal!.portions).toBe(1);
    expect(meal!.aiModel).toBeUndefined();
    expect(meal!.items).toHaveLength(1);
    expect(meal!.items[0]).toMatchObject({
      id: 'item-1',
      name: 'Овсянка',
      calories: 350,
      protein: 12,
      carbs: 55,
      fat: 8,
      fiber: 4,
      grams: 250,
    });
    expect(meal!.totalCalories).toBe(350);
    expect(meal!.totalGrams).toBe(250);
  });

  it('persists protein 5.5 on the fallback FoodItem', () => {
    const meal = buildManualMeal(baseInput({ protein: 5.5 }), ids);
    expect(meal!.items[0]?.protein).toBe(5.5);
  });

  it('uses composition items and sums totals when composition non-empty', () => {
    const meal = buildManualMeal(
      baseInput({
        calories: 999,
        composition: [
          {
            id: 'c1',
            name: 'Овёс',
            calories: 200,
            protein: 8,
            carbs: 30,
            fat: 4,
            fiber: 2,
            grams: 100,
          },
          {
            id: 'c2',
            name: 'Молоко',
            calories: 150,
            protein: 6,
            carbs: 12,
            fat: 5,
            fiber: 0,
            grams: 150,
          },
        ],
      }),
      ids,
    );
    expect(meal).not.toBeNull();
    expect(meal!.items).toHaveLength(2);
    expect(meal!.items.map((i) => i.name)).toEqual(['Овёс', 'Молоко']);
    expect(meal!.totalCalories).toBe(350);
    expect(meal!.totalGrams).toBe(250);
    expect(meal!.name).toBe('Овсянка');
  });

  it('returns null when a composition item has blank name or calories <= 0', () => {
    expect(
      buildManualMeal(
        baseInput({
          composition: [
            {
              id: 'c1',
              name: '  ',
              calories: 100,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              grams: 50,
            },
          ],
        }),
        ids,
      ),
    ).toBeNull();

    expect(
      buildManualMeal(
        baseInput({
          composition: [
            {
              id: 'c1',
              name: 'Овёс',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              grams: 50,
            },
          ],
        }),
        ids,
      ),
    ).toBeNull();
  });

  it('attaches imageUris when provided', () => {
    const meal = buildManualMeal(baseInput(), {
      ...ids,
      imageUris: ['meal-images/a.jpg'],
    });
    expect(meal!.imageUri).toBe('meal-images/a.jpg');
    expect(meal!.imageUris).toEqual(['meal-images/a.jpg']);
  });
});
