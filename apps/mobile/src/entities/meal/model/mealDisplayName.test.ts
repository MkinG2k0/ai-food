import { describe, it, expect } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { mealDisplayName } from './mealDisplayName';

function makeMeal(partial: Partial<Meal>): Meal {
  return {
    id: 'm1',
    timestamp: new Date().toISOString(),
    items: [],
    totalCalories: 0,
    ...partial,
  };
}

describe('mealDisplayName', () => {
  it('returns trimmed meal.name when present', () => {
    expect(
      mealDisplayName(
        makeMeal({
          name: '  Салат  ',
          items: [
            {
              id: '1',
              name: 'Помидоры',
              calories: 20,
              protein: 1,
              carbs: 4,
              fat: 0,
              portion: '1 порция',
            },
          ],
        }),
      ),
    ).toBe('Салат');
  });

  it('joins item names when meal.name is missing', () => {
    expect(
      mealDisplayName(
        makeMeal({
          items: [
            {
              id: '1',
              name: 'Помидоры',
              calories: 20,
              protein: 1,
              carbs: 4,
              fat: 0,
              portion: '1 порция',
            },
            {
              id: '2',
              name: 'Огурцы',
              calories: 15,
              protein: 1,
              carbs: 3,
              fat: 0,
              portion: '1 порция',
            },
          ],
        }),
      ),
    ).toBe('Помидоры, Огурцы');
  });

  it('returns Без названия when name and items are empty', () => {
    expect(mealDisplayName(makeMeal({ items: [] }))).toBe('Без названия');
  });
});
