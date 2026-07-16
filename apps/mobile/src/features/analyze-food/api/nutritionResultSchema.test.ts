import { describe, expect, it } from 'vitest';
import {
  isNoFoodResult,
  isNutritionResult,
  normalizeMicronutrients,
  MICRONUTRIENTS_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
} from './nutritionResultSchema';

describe('nutritionResultSchema micronutrients', () => {
  const base = {
    foodName: 'Салат',
    calories: 200,
    protein: 5,
    carbs: 20,
    fat: 10,
    fiber: 4,
    confidence: 0.8,
    healthiness: 8,
    items: [],
  };

  it('accepts result without micronutrients (legacy)', () => {
    expect(isNutritionResult(base)).toBe(true);
  });

  it('accepts valid micronutrients array', () => {
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [
          { id: 'vitaminC', level: 'high' },
          { id: 'iron', level: 'low' },
        ],
      }),
    ).toBe(true);
  });

  it('rejects invalid micronutrient id or level', () => {
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [{ id: 'zinc', level: 'high' }],
      }),
    ).toBe(false);
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [{ id: 'vitaminC', level: 'plenty' }],
      }),
    ).toBe(false);
  });

  it('normalizeMicronutrients dedupes and drops junk', () => {
    expect(
      normalizeMicronutrients([
        { id: 'vitaminC', level: 'high' },
        { id: 'vitaminC', level: 'low' },
        { id: 'iron', level: 'medium' },
      ]),
    ).toEqual([
      { id: 'vitaminC', level: 'high' },
      { id: 'iron', level: 'medium' },
    ]);
  });

  it('MICRONUTRIENTS_PROMPT_RULE lists all eight ids', () => {
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminA/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminB12/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/magnesium/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/high\|medium\|low\|none/);
  });
});

describe('nutritionResultSchema noFood', () => {
  it('isNoFoodResult accepts valid noFood payload', () => {
    expect(isNoFoodResult({ noFood: true, reason: 'На фото человек' })).toBe(true);
  });

  it('isNoFoodResult rejects nutrition-shaped payload', () => {
    expect(isNoFoodResult({ foodName: 'Суп', calories: 100 })).toBe(false);
    expect(isNoFoodResult({ noFood: false, reason: 'x' })).toBe(false);
    expect(isNoFoodResult({ noFood: true, reason: '' })).toBe(false);
  });

  it('NO_FOOD_PROMPT_RULE forbids inventing dish names for non-food photos', () => {
    expect(NO_FOOD_PROMPT_RULE).toMatch(/noFood/i);
    expect(NO_FOOD_PROMPT_RULE).toMatch(/животн|люди|человек/i);
    expect(NO_FOOD_PROMPT_RULE).toMatch(/Неизвестное блюдо|Нет еды|Человек/);
  });
});
