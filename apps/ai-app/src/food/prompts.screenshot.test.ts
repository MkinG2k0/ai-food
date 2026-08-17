import { describe, expect, it } from 'vitest';
import {
  GEMINI_SINGLE_ITEM_COMPOSITION_RULE,
  SINGLE_ITEM_COMPOSITION_RULE,
} from './analyzeFeatures.js';
import { buildAnalyzeMessages } from './buildMessages.js';
import {
  ANALYSIS_PROMPT,
  ANALYSIS_PROMPT_MULTI,
  COMPOSITION_PROMPT_RULE,
  GEMINI_COMPOSITION_PROMPT_RULE,
  buildAnalyzeVisionUserText,
  selectAnalyzeSystemPrompt,
} from './prompts.js';

/** Distinctive composition-on instruction for a readable dish list on a screenshot. */
const SCREENSHOT_SPLIT_SENTENCE = 'разбивай items по этому списку';

const GEMINI = 'google/gemini-3-flash-preview';
const LEGACY = 'openai/gpt-4.1-mini';

function extractSystemText(
  messages: ReturnType<typeof buildAnalyzeMessages>,
): string {
  const content = messages[0]?.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) =>
      typeof part === 'object' && part && 'text' in part
        ? String(part.text ?? '')
        : '',
    )
    .join('\n');
}

function expectScreenshotIsFood(prompt: string) {
  expect(prompt).toMatch(/скриншот/i);
  expect(prompt).toMatch(/не noFood/i);
  expect(prompt).toMatch(/доставк/i);
  expect(prompt).toMatch(/трекер калорий/i);
  expect(prompt).toMatch(/карточка блюда/i);
  expect(prompt).toMatch(/КБЖУ/i);
  expect(prompt).toMatch(/анализируй/i);
}

function expectTrueNoFoodCases(prompt: string) {
  expect(prompt).toMatch(/люди/);
  expect(prompt).toMatch(/животн/);
  expect(prompt).toMatch(/пейзаж/);
  expect(prompt).toMatch(/непищев/);
  expect(prompt).toMatch(/размыт/);
  expect(prompt).toMatch(/пустая тарелка/);
  expect(prompt).toMatch(/мусор/);
  expect(prompt).toMatch(/пустая\/выброшенная упаковка/);
  expect(prompt).toMatch(/меню/);
  expect(prompt).toMatch(/назван/);
}

function expectNoBlanketScreenshotNoFood(prompt: string) {
  expect(prompt).not.toMatch(/меню\/скриншоты без продукта/);
  expect(prompt).not.toMatch(/меню\/скриншот без продукта/);
  expect(prompt).not.toMatch(/Меню \/ скриншот \/ пустая упаковка/);
}

describe('vision prompts: screenshot of food is food, not noFood', () => {
  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s vision system prompt treats a dish/product screenshot as food (D-01)',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(true, model);
      expectScreenshotIsFood(prompt);
    },
  );

  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s vision system prompt keeps true noFood cases (D-03)',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(true, model);
      expectTrueNoFoodCases(prompt);
    },
  );

  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s vision system prompt does not treat screenshots as a blanket noFood category',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(true, model);
      expectNoBlanketScreenshotNoFood(prompt);
    },
  );

  it('buildAnalyzeMessages vision path includes screenshot-is-food in Gemini system text', () => {
    const messages = buildAnalyzeMessages({
      images: ['data:image/png;base64,xx'],
      model: GEMINI,
    });
    const system = extractSystemText(messages);
    expectScreenshotIsFood(system);
    expectNoBlanketScreenshotNoFood(system);
  });

  it('buildAnalyzeVisionUserText tells the model a dish/product screenshot is food (D-01)', () => {
    const single = buildAnalyzeVisionUserText(1);
    const multi = buildAnalyzeVisionUserText(2);
    expect(single).toBe(ANALYSIS_PROMPT);
    expect(multi).toBe(ANALYSIS_PROMPT_MULTI);
    for (const text of [single, multi]) {
      expect(text).toMatch(/скриншот блюда\/продукта — это еда/i);
      expect(text).toMatch(/не noFood/i);
      expect(text).toMatch(/состав/i);
      expect(text).toMatch(/КБЖУ/i);
    }
  });

  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s text-only prompt has no screenshot-is-food section (D-04)',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(false, model);
      expect(prompt).not.toMatch(/скриншот блюда/);
      expect(prompt).not.toMatch(/трекер калорий/);
      expect(prompt).not.toMatch(/приложени[яие] доставк/);
    },
  );
});

describe('vision prompts: screenshot dish composition splits when composition is on', () => {
  const compositionOff = {
    vitamins: true,
    healthiness: true,
    composition: false,
  };

  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s composition-on vision prompt splits a screenshot ingredient list into items (D-02)',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(true, model);
      expect(prompt).toMatch(/если это скриншот/i);
      expect(prompt).toContain(SCREENSHOT_SPLIT_SENTENCE);
      expect(prompt).toMatch(/доставка/);
      expect(prompt).toMatch(/карточка блюда/);
    },
  );

  it.each([
    ['gemini', GEMINI],
    ['legacy', LEGACY],
  ] as const)(
    '%s composition-on vision prompt still forbids splitting a packaged product from the physical label (D-04)',
    (_label, model) => {
      const prompt = selectAnalyzeSystemPrompt(true, model);
      expect(prompt).toMatch(/йогурт/);
      expect(prompt).toMatch(/не разбивай.*этикетк/i);
    },
  );

  it('composition-off Gemini vision prompt swaps to a single item and drops screenshot-split (D-01 still holds)', () => {
    const prompt = selectAnalyzeSystemPrompt(true, GEMINI, compositionOff);
    expect(prompt).toContain(GEMINI_SINGLE_ITEM_COMPOSITION_RULE);
    expect(prompt).not.toContain(GEMINI_COMPOSITION_PROMPT_RULE);
    expect(prompt).not.toContain(SCREENSHOT_SPLIT_SENTENCE);
    expectScreenshotIsFood(prompt);
  });

  it('composition-off legacy vision prompt swaps to a single item and drops screenshot-split (D-01 still holds)', () => {
    const prompt = selectAnalyzeSystemPrompt(true, LEGACY, compositionOff);
    expect(prompt).toContain(SINGLE_ITEM_COMPOSITION_RULE);
    expect(prompt).not.toContain(COMPOSITION_PROMPT_RULE);
    expect(prompt).not.toContain(SCREENSHOT_SPLIT_SENTENCE);
    expectScreenshotIsFood(prompt);
  });
});
