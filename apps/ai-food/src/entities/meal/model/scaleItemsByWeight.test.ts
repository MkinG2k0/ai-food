import { describe, expect, it } from 'vitest';
import {
  applyFoodItemPatch,
  foodItemWithScaledGrams,
  scaleMealItemsToTotalGrams,
  sumItemMacros,
} from './scaleItemsByWeight';
import { sumItemCalories } from './mealNutritionMath';
import {
  burgerFries,
  glazedChicken,
  tempuraSushiSet,
} from './weightKbjuFixtures';

describe('foodItemWithScaledGrams', () => {
  it('doubles KBJU when item weight doubles', () => {
    const base = tempuraSushiSet[0]!;
    const next = foodItemWithScaledGrams(base, 240);
    expect(next.grams).toBe(240);
    expect(next.calories).toBe(560);
    expect(next.protein).toBe(28);
    expect(next.carbs).toBe(44);
    expect(next.fat).toBe(28);
  });

  it('zeros KBJU when weight becomes 0', () => {
    const next = foodItemWithScaledGrams(glazedChicken[0]!, 0);
    expect(next).toMatchObject({
      grams: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
    });
  });
});

describe('applyFoodItemPatch', () => {
  it('grams-only patch scales KBJU (bug: previously left macros static)', () => {
    const next = applyFoodItemPatch(burgerFries[1]!, { grams: 60 });
    expect(next.grams).toBe(60);
    expect(next.calories).toBe(160);
    expect(next.protein).toBe(12);
    expect(next.fat).toBe(12);
  });

  it('explicit nutrient patch wins over auto-scale', () => {
    const next = applyFoodItemPatch(burgerFries[0]!, {
      grams: 160,
      calories: 999,
      protein: 1,
      carbs: 2,
      fat: 3,
      fiber: 4,
    });
    expect(next.grams).toBe(160);
    expect(next.calories).toBe(999);
    expect(next.protein).toBe(1);
  });
});

describe('scaleMealItemsToTotalGrams', () => {
  it('scales every item KBJU and rolls up meal totals (tempura set ×2)', () => {
    const beforeKcal = sumItemCalories(tempuraSushiSet);
    const beforeMacros = sumItemMacros(tempuraSushiSet);
    const { items, totalGrams, totalCalories } = scaleMealItemsToTotalGrams(
      tempuraSushiSet,
      700,
    );

    expect(totalGrams).toBe(700);
    expect(totalCalories).toBe(beforeKcal * 2);
    expect(sumItemMacros(items)).toEqual({
      protein: beforeMacros.protein * 2,
      carbs: beforeMacros.carbs * 2,
      fat: beforeMacros.fat * 2,
      fiber: beforeMacros.fiber * 2,
    });
    expect(items[0]!.grams).toBe(240);
    expect(items[0]!.calories).toBe(560);
    expect(items[1]!.grams).toBe(160);
    expect(items[2]!.grams).toBe(300);
  });

  it('halves glazed chicken composition when dish weight halves', () => {
    const { items, totalCalories } = scaleMealItemsToTotalGrams(
      glazedChicken,
      150,
    );
    expect(totalCalories).toBe(210);
    expect(items[0]!.calories).toBe(180);
    expect(items[0]!.protein).toBe(18);
    expect(items[1]!.calories).toBe(30);
    expect(sumItemMacros(items).protein).toBe(19.5);
  });

  it('item weight edit then same-total dish scale keeps rolled-up KBJU', () => {
    const editedPatty = applyFoodItemPatch(burgerFries[1]!, { grams: 240 });
    const composition = [burgerFries[0]!, editedPatty, burgerFries[2]!];
    expect(sumItemCalories(composition)).toBe(1310);
    expect(sumItemMacros(composition).protein).toBe(6 + 48 + 5);

    const dishGrams = composition.reduce((sum, row) => sum + row.grams, 0);
    const { totalCalories, items } = scaleMealItemsToTotalGrams(
      composition,
      dishGrams,
    );
    expect(totalCalories).toBe(1310);
    expect(items[1]!.calories).toBe(640);
    expect(sumItemMacros(items).fat).toBe(4 + 48 + 22);
  });
});
