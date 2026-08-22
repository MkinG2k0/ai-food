import { describe, expect, it } from 'vitest';
import {
  applyAnalyzeFeaturesToPrompt,
  SINGLE_ITEM_COMPOSITION_RULE,
} from './analyzeFeatures.js';

const COMPOSITION_ON = 'ALWAYS_SPLIT_COMPOSITION_RULE_MARKER';

const SAMPLE_PROMPT = `You are a nutrition assistant.

## healthiness
Score healthiness 1–10 with a short reason.
  <healthiness>7</healthiness>
  "healthiness": number,
  "healthinessReason": string,

## Микронутриенты
List all micronutrients for the portion.
  <micronutrients>
    <micronutrient id="vitaminC" />
  </micronutrients>
- Все микронутриенты должны быть в ответе.
. В реальных ответах всегда возвращай все 25 micronutrients; в примере массив может быть опущен
  "micronutrients": [{ "id": "vitaminC" }],
micronutrients — ровно 25 элементов

## Состав
${COMPOSITION_ON}

## Other
Keep going.
`;

describe('applyAnalyzeFeaturesToPrompt', () => {
  it('strips vitamins, healthiness, and swaps composition when all off', () => {
    const result = applyAnalyzeFeaturesToPrompt(
      SAMPLE_PROMPT,
      { vitamins: false, healthiness: false, composition: false },
      COMPOSITION_ON,
      SINGLE_ITEM_COMPOSITION_RULE,
    );

    expect(result).not.toMatch(/## healthiness/);
    expect(result).not.toMatch(/<healthiness/i);
    expect(result).not.toMatch(/"healthiness"/);
    expect(result).not.toMatch(/## Микронутриенты/);
    expect(result).not.toMatch(/<micronutrients/i);
    expect(result).not.toMatch(/"micronutrients"/);
    expect(result).not.toContain(COMPOSITION_ON);
    expect(result).toContain(SINGLE_ITEM_COMPOSITION_RULE);
  });

  it('keeps sections when features are on', () => {
    const result = applyAnalyzeFeaturesToPrompt(
      SAMPLE_PROMPT,
      { vitamins: true, healthiness: true, composition: true },
      COMPOSITION_ON,
      SINGLE_ITEM_COMPOSITION_RULE,
    );

    expect(result).toContain('## healthiness');
    expect(result).toContain('## Микронутриенты');
    expect(result).toContain(COMPOSITION_ON);
    expect(result).not.toContain(SINGLE_ITEM_COMPOSITION_RULE);
  });

  it('appends composition-off rule when on-rule marker is missing', () => {
    const result = applyAnalyzeFeaturesToPrompt(
      'Plain prompt without composition marker.',
      { vitamins: true, healthiness: true, composition: false },
      COMPOSITION_ON,
      SINGLE_ITEM_COMPOSITION_RULE,
    );

    expect(result).toContain('## Состав');
    expect(result).toContain(SINGLE_ITEM_COMPOSITION_RULE);
  });
});
