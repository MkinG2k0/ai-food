import { describe, expect, it } from 'vitest';
import type { OffProduct } from './fetchProductByBarcode';
import { buildBarcodeMeal, scaleOffProductToItem } from './mapOffProductToMeal';

const product: OffProduct = {
  code: '3017620422003',
  name: 'Nutella',
  brands: 'Ferrero',
  per100g: {
    calories: 539,
    protein: 6.3,
    carbs: 57.5,
    fat: 30.9,
    fiber: 0,
  },
};

describe('scaleOffProductToItem', () => {
  it('keeps OFF tenths at 100g', () => {
    const item = scaleOffProductToItem(product, 100, 'item-1');
    expect(item).toMatchObject({
      id: 'item-1',
      name: 'Nutella',
      calories: 539,
      protein: 6.3,
      carbs: 57.5,
      fat: 30.9,
      fiber: 0,
      grams: 100,
    });
  });

  it('scales 50g calories to tenths', () => {
    const item = scaleOffProductToItem(product, 50, 'item-2');
    expect(item.calories).toBe(269.5);
    expect(item.grams).toBe(50);
  });
});


describe('buildBarcodeMeal', () => {
  it('builds ready meal with brand in name', () => {
    const meal = buildBarcodeMeal(product, 100, {
      mealId: 'm1',
      itemId: 'i1',
      timestamp: '2026-08-03T00:00:00.000Z',
    });
    expect(meal.status).toBe('ready');
    expect(meal.name).toBe('Nutella (Ferrero)');
    expect(meal.totalCalories).toBe(539);
    expect(meal.items).toHaveLength(1);
  });

  it('attaches local imageUri when provided', () => {
    const meal = buildBarcodeMeal(product, 100, {
      mealId: 'm2',
      itemId: 'i2',
      timestamp: '2026-08-03T00:00:00.000Z',
      imageUri: 'meal-images/off.jpg',
    });
    expect(meal.imageUri).toBe('meal-images/off.jpg');
    expect(meal.imageUris).toEqual(['meal-images/off.jpg']);
  });
});
