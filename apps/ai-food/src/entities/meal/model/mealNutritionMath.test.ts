import { describe, expect, it } from 'vitest';
import {
  nutrientsFromPer100,
  nutrientsPer100FromPortion,
  parseNutrientInput,
  sanitizeNutrient,
  scaleItemsNutrient,
  scalePortionNutrientsByGrams,
  type PortionNutrients,
} from './mealNutritionMath';
import type { FoodItem } from '@ai-food/shared-types';

const samplePer100: PortionNutrients = {
  calories: 250,
  protein: 10,
  carbs: 20,
  fat: 5,
  fiber: 2,
};

function item(partial: Partial<FoodItem> & Pick<FoodItem, 'id'>): FoodItem {
  return {
    name: 'Item',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    grams: 50,
    ...partial,
  };
}

describe('sanitizeNutrient', () => {
  it('keeps one decimal and floors at 0', () => {
    expect(sanitizeNutrient(5.5)).toBe(5.5);
    expect(sanitizeNutrient(5.54)).toBe(5.5);
    expect(sanitizeNutrient(2.5)).toBe(2.5);
    expect(sanitizeNutrient(Number.NaN)).toBe(0);
    expect(sanitizeNutrient(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeNutrient(-3)).toBe(0);
  });
});

describe('parseNutrientInput', () => {
  it('accepts comma decimals then sanitizes to tenths', () => {
    expect(parseNutrientInput('5,5')).toBe(5.5);
    expect(parseNutrientInput('5.54')).toBe(5.5);
    expect(parseNutrientInput('abc')).toBe(0);
  });
});

describe('nutrientsFromPer100', () => {
  it('scales density by grams/100 keeping tenths', () => {
    expect(nutrientsFromPer100(samplePer100, 50)).toEqual({
      calories: 125,
      protein: 5,
      carbs: 10,
      fat: 2.5,
      fiber: 1,
    });
  });

  it('keeps 5.5 protein for 10g/100g at 55g', () => {
    expect(nutrientsFromPer100(samplePer100, 55).protein).toBe(5.5);
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

  it('doubles 5.5 protein without rounding to 6 first', () => {
    expect(
      scalePortionNutrientsByGrams(
        { protein: 5.5, calories: 90, carbs: 14, fat: 2, fiber: 0 },
        125,
        250,
      ).protein,
    ).toBe(11);
  });

  it('leaves nutrients unchanged when oldGrams is 0', () => {
    expect(scalePortionNutrientsByGrams(nutrients, 0, 50)).toEqual(nutrients);
  });
});

describe('scaleItemsNutrient', () => {
  it('scales a single item protein 5.5 to target 11', () => {
    const next = scaleItemsNutrient(
      [item({ id: 'a', protein: 5.5 })],
      'protein',
      11,
    );
    expect(next[0]?.protein).toBe(11);
  });

  it('redistributes two 5.5 items to 8.2 with tenths', () => {
    const next = scaleItemsNutrient(
      [item({ id: 'a', protein: 5.5 }), item({ id: 'b', protein: 5.5 })],
      'protein',
      8.2,
    );
    expect(next[0]?.protein).toBe(4.1);
    expect(next[1]?.protein).toBe(4.1);
    expect(next.every((row) => Number.isFinite(row.protein))).toBe(true);
  });
});

describe('per-100 round-trip', () => {
  it('recovers density within 0.2 for grams=80', () => {
    const portion = nutrientsFromPer100(samplePer100, 80);
    const recovered = nutrientsPer100FromPortion({ ...portion, grams: 80 });
    for (const key of [
      'calories',
      'protein',
      'carbs',
      'fat',
      'fiber',
    ] as const) {
      expect(Math.abs(recovered[key] - samplePer100[key])).toBeLessThanOrEqual(
        0.2,
      );
    }
  });
});
