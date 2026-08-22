import { describe, expect, it } from 'vitest';
import { MICRONUTRIENTS_PROMPT_RULE, selectAnalyzeSystemPrompt } from './prompts.js';

describe('analyze prompts: canonical micronutrient units (P0)', () => {
  it('MICRONUTRIENTS_PROMPT_RULE requires id/amount/unit with µg for A/D/K/B7/folate/B12/minerals', () => {
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/<micronutrient>/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/<id>/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminA/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminB12/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/vitaminE/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/zinc/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(/ровно 25/);
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(
      /vitaminA\/vitaminD\/vitaminK\/vitaminB7\/folate\/vitaminB12\/iodine\/selenium\/chromium\/molybdenum → µg/,
    );
    expect(MICRONUTRIENTS_PROMPT_RULE).toMatch(
      /vitaminC\/vitaminE\/vitaminB1\/vitaminB2\/vitaminB3\/vitaminB5\/vitaminB6\/calcium\/magnesium\/zinc\/iron\/copper\/manganese\/potassium\/phosphorus → mg/,
    );
    expect(MICRONUTRIENTS_PROMPT_RULE).not.toMatch(/приводи к миллиграммам/i);
    expect(MICRONUTRIENTS_PROMPT_RULE).not.toMatch(/1 мкг = 0\.001 мг/);
  });

  it('vision and text prompts use canonical micronutrient schema, not mg-only conversion', () => {
    for (const prompt of [selectAnalyzeSystemPrompt(true), selectAnalyzeSystemPrompt(false)]) {
      expect(prompt).not.toMatch(/приводи к миллиграммам/i);
      expect(prompt).not.toMatch(/1 мкг = 0\.001 мг/);
      expect(prompt).not.toMatch(/<nutrient[^>]*amount_mg/);
      expect(prompt).toMatch(/<micronutrient>/);
      expect(prompt).toMatch(
        /vitaminA\/vitaminD\/vitaminK\/vitaminB7\/folate\/vitaminB12\/iodine\/selenium\/chromium\/molybdenum → µg/,
      );
    }
  });
});
