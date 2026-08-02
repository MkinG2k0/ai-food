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
  it('scales 100g to full per-100 values (rounded)', () => {
    const item = scaleOffProductToItem(product, 100, 'item-1');
    expect(item).toMatchObject({
      id: 'item-1',
      name: 'Nutella',
      calories: 539,
      protein: 6,
      carbs: 58,
      fat: 31,
      fiber: 0,
      grams: 100,
    });
  });

  it('scales 50g to half', () => {
    const item = scaleOffProductToItem(product, 50, 'item-2');
    expect(item.calories).toBe(270);
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
});
