import { describe, expect, it } from 'vitest';
import {
  nutrientsFromPer100,
  nutrientsPer100FromPortion,
  scalePortionNutrientsByGrams,
  type PortionNutrients,
} from './mealNutritionMath';

const samplePer100: PortionNutrients = {
  calories: 250,
  protein: 10,
  carbs: 20,
  fat: 5,
  fiber: 2,
};

describe('nutrientsFromPer100', () => {
  it('scales density by grams/100 with sanitizeNutrient rounding', () => {
    // fat: 5 × 50 / 100 = 2.5 → rounds to 3
    expect(nutrientsFromPer100(samplePer100, 50)).toEqual({
      calories: 125,
      protein: 5,
      carbs: 10,
      fat: 3,
      fiber: 1,
    });
  });

  it('returns all zeros when grams is 0', () => {
    expect(nutrientsFromPer100(samplePer100, 0)).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});

describe('nutrientsPer100FromPortion', () => {
  it('derives per-100 density from absolute portion nutrients', () => {
    expect(
      nutrientsPer100FromPortion({
        calories: 125,
        protein: 5,
        carbs: 10,
        fat: 2,
        fiber: 1,
        grams: 50,
      }),
    ).toEqual({
      calories: 250,
      protein: 10,
      carbs: 20,
      fat: 4,
      fiber: 2,
    });
  });

  it('returns all zeros when grams is 0 without throwing', () => {
    expect(
      nutrientsPer100FromPortion({
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 10,
        fiber: 5,
        grams: 0,
      }),
    ).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});

describe('scalePortionNutrientsByGrams', () => {
  const nutrients: PortionNutrients = {
    calories: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: 2,
  };

  it('scales each nutrient by newGrams/oldGrams', () => {
    expect(scalePortionNutrientsByGrams(nutrients, 100, 200)).toEqual({
      calories: 200,
      protein: 20,
      carbs: 40,
      fat: 10,
      fiber: 4,
    });
  });

  it('leaves nutrients unchanged when oldGrams is 0', () => {
    expect(scalePortionNutrientsByGrams(nutrients, 0, 50)).toEqual(nutrients);
  });
});

describe('per-100 round-trip', () => {
  it('recovers density within sanitize rounding for grams=80', () => {
    const portion = nutrientsFromPer100(samplePer100, 80);
    const recovered = nutrientsPer100FromPortion({ ...portion, grams: 80 });
    expect(recovered).toEqual(samplePer100);
  });
});
