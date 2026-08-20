import { describe, expect, it } from 'vitest';
import { FOOD_TYPES } from '@ai-food/shared-types';
import { mealFoodTypeUi } from './mealFoodType';

describe('mealFoodTypeUi', () => {
  it('maps every food type to a Russian pastel Lucide thumbnail', () => {
    for (const foodType of FOOD_TYPES) {
      const ui = mealFoodTypeUi(foodType);

      expect(ui).toBeDefined();
      expect(ui?.label).toMatch(/[А-Яа-яЁё]/);
      expect(ui?.Icon).toBeDefined();
      expect(ui?.tileClass).toMatch(/^bg-\w+-100$/);
      expect(ui?.iconClass).toMatch(/^text-\w+-700$/);
    }
  });

  it('returns undefined for missing or unknown types', () => {
    expect(mealFoodTypeUi(undefined)).toBeUndefined();
    expect(mealFoodTypeUi('pasta')).toBeUndefined();
  });
});
