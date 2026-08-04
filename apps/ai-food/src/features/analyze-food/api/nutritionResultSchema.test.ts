import { describe, expect, it } from 'vitest';
import {
  isMicronutrientEstimate,
  isNoFoodResult,
  isNutritionResult,
  normalizeMicronutrients,
  MICRONUTRIENTS_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
  GEMINI_NO_FOOD_PROMPT_RULE,
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

  it('accepts optional positive itemCount', () => {
    expect(isNutritionResult({ ...base, itemCount: 2 })).toBe(true);
    expect(isNutritionResult({ ...base, itemCount: 0 })).toBe(false);
    expect(isNutritionResult({ ...base, itemCount: -1 })).toBe(false);
  });

  it('accepts optional non-negative totalGrams', () => {
    expect(isNutritionResult({ ...base, totalGrams: 350 })).toBe(true);
    expect(isNutritionResult({ ...base, totalGrams: 0 })).toBe(true);
    expect(isNutritionResult({ ...base, totalGrams: -1 })).toBe(false);
  });

  it('isMicronutrientEstimate accepts amount+unit matching MICRONUTRIENT_UNITS', () => {
    expect(
      isMicronutrientEstimate({ id: 'vitaminC', amount: 45, unit: 'mg' }),
    ).toBe(true);
    expect(
      isMicronutrientEstimate({ id: 'vitaminA', amount: 300, unit: 'µg' }),
    ).toBe(true);
    expect(
      isMicronutrientEstimate({ id: 'vitaminC', amount: 0, unit: 'mg' }),
    ).toBe(true);
  });

  it('isMicronutrientEstimate rejects qualitative-only level rows', () => {
    expect(
      isMicronutrientEstimate({ id: 'vitaminC', level: 'high' }),
    ).toBe(false);
  });

  it('isMicronutrientEstimate rejects wrong unit or negative amount', () => {
    expect(
      isMicronutrientEstimate({ id: 'vitaminC', amount: 45, unit: 'µg' }),
    ).toBe(false);
    expect(
      isMicronutrientEstimate({ id: 'vitaminA', amount: 300, unit: 'mg' }),
    ).toBe(false);
    expect(
      isMicronutrientEstimate({ id: 'iron', amount: -1, unit: 'mg' }),
    ).toBe(false);
  });

  it('accepts valid micronutrients array', () => {
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [
          { id: 'vitaminC', amount: 45, unit: 'mg' },
          { id: 'iron', amount: 2.5, unit: 'mg' },
        ],
      }),
    ).toBe(true);
  });

  it('rejects invalid micronutrient id or unit', () => {
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [{ id: 'zinc', amount: 1, unit: 'mg' }],
      }),
    ).toBe(false);
    expect(
      isNutritionResult({
        ...base,
        micronutrients: [{ id: 'vitaminC', amount: 45, unit: 'g' }],
      }),
    ).toBe(false);
  });

  it('normalizeMicronutrients coerces unit, dedupes, drops junk and legacy level', () => {
    expect(
      normalizeMicronutrients([
        { id: 'vitaminC', amount: 45, unit: 'µg' },
        { id: 'vitaminC', amount: 10, unit: 'mg' },
        { id: 'iron', amount: 2, unit: 'mg' },
        { id: 'vitaminD', level: 'high' },
        { id: 'calcium', amount: Number.NaN, unit: 'mg' },
        { id: 'magnesium', amount: -3, unit: 'mg' },
      ] as never),
    ).toEqual([
      { id: 'vitaminC', amount: 45, unit: 'mg' },
      { id: 'iron', amount: 2, unit: 'mg' },
    ]);
  });

  it('MICRONUTRIENTS_PROMPT_RULE requires amount and units for all eight ids', () => {
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminA/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminB12/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/magnesium/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/amount/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/µg|mg/);
    expect(MICRONUTRIENTS_PROMPT_RULE).not.toMatch(/high\|medium\|low\|none/);
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
    expect(NO_FOOD_PROMPT_RULE).toMatch(/НЕ noFood.*йогурт|йогурт.*анализируй/i);
  });

  it('GEMINI_NO_FOOD_PROMPT_RULE does not treat retail packaging as noFood', () => {
    expect(GEMINI_NO_FOOD_PROMPT_RULE).toMatch(/НЕ noFood.*йогурт|йогурт.*анализируй/i);
    expect(GEMINI_NO_FOOD_PROMPT_RULE).not.toMatch(
      /упаковка продукта без видимой порции/,
    );
  });
});
