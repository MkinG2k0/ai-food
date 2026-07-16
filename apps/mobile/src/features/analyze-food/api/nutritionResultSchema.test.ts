import { describe, expect, it } from 'vitest';
import {
  isNutritionResult,
  normalizeMicronutrients,
  MICRONUTRIENTS_PROMPT_RULE,
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
