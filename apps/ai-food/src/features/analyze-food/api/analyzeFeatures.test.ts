import { describe, it, expect } from 'vitest';
import {
  applyAnalyzeFeaturesToPrompt,
  maskNutritionResultByFeatures,
  SINGLE_ITEM_COMPOSITION_RULE,
} from './analyzeFeatures';

describe('applyAnalyzeFeaturesToPrompt', () => {
  const compositionOn = 'COMPOSITION_ON_RULE';
  const base = `## intro
schema
  <healthiness>1–10</healthiness>
  <micronutrients>
    <x/>
  </micronutrients>
${compositionOn}

## healthiness (целое 1–10, не медсовет)
- bands

## Микронутриенты
micronutrients — ровно 25 элементов

## Язык и формат
ok`;

  it('keeps all sections when features are on', () => {
    const out = applyAnalyzeFeaturesToPrompt(
      base,
      { vitamins: true, healthiness: true, composition: true },
      compositionOn,
      SINGLE_ITEM_COMPOSITION_RULE,
    );
    expect(out).toContain('healthiness');
    expect(out).toContain('Микронутриенты');
    expect(out).toContain(compositionOn);
  });

  it('strips healthiness and micronutrients when off', () => {
    const out = applyAnalyzeFeaturesToPrompt(
      base,
      { vitamins: false, healthiness: false, composition: true },
      compositionOn,
      SINGLE_ITEM_COMPOSITION_RULE,
    );
    expect(out).not.toMatch(/## healthiness/);
    expect(out).not.toMatch(/## Микронутриенты/);
    expect(out).not.toMatch(/<healthiness/);
    expect(out).not.toMatch(/<micronutrients/);
  });

  it('replaces composition rule when composition is off', () => {
    const out = applyAnalyzeFeaturesToPrompt(
      base,
      { vitamins: true, healthiness: true, composition: false },
      compositionOn,
      SINGLE_ITEM_COMPOSITION_RULE,
    );
    expect(out).not.toContain(compositionOn);
    expect(out).toContain(SINGLE_ITEM_COMPOSITION_RULE);
  });
});

describe('maskNutritionResultByFeatures', () => {
  it('removes disabled fields', () => {
    const masked = maskNutritionResultByFeatures(
      {
        healthiness: 7,
        healthinessReason: 'ok',
        micronutrients: [{ id: 'iron', amount: 1, unit: 'mg' as const }],
      },
      { vitamins: false, healthiness: false, composition: true },
    );
    expect(masked.healthiness).toBeUndefined();
    expect(masked.healthinessReason).toBeUndefined();
    expect(masked.micronutrients).toBeUndefined();
  });
});
