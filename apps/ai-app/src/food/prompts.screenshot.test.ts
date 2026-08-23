import { describe, expect, it } from 'vitest';
import { SINGLE_ITEM_COMPOSITION_RULE } from './analyzeFeatures.js';
import { buildAnalyzeMessages } from './buildMessages.js';
import {
  ANALYSIS_PROMPT,
  ANALYSIS_PROMPT_MULTI,
  ANALYZE_COMPOSITION_PROMPT_RULE,
  FOREGROUND_SUBJECT_PROMPT_RULE,
  buildAnalyzeVisionUserText,
  selectAnalyzeSystemPrompt,
} from './prompts.js';

/** Distinctive composition-on instruction for a readable dish list on a screenshot. */
const SCREENSHOT_SPLIT_SENTENCE = 'разбивай items по этому списку';

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
  it('vision system prompt treats a dish/product screenshot as food (D-01)', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expectScreenshotIsFood(prompt);
  });

  it('vision system prompt keeps true noFood cases (D-03)', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expectTrueNoFoodCases(prompt);
  });

  it('vision system prompt does not treat screenshots as a blanket noFood category', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expectNoBlanketScreenshotNoFood(prompt);
  });

  it('buildAnalyzeMessages vision path includes screenshot-is-food in system text', () => {
    const messages = buildAnalyzeMessages({
      images: ['data:image/png;base64,xx'],
      model: 'google/gemini-3-flash-preview',
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

  it('text-only prompt has no screenshot-is-food section (D-04)', () => {
    const prompt = selectAnalyzeSystemPrompt(false);
    expect(prompt).not.toMatch(/скриншот блюда/);
    expect(prompt).not.toMatch(/трекер калорий/);
    expect(prompt).not.toMatch(/приложени[яие] доставк/);
  });
});

describe('vision prompts: screenshot dish composition splits when composition is on', () => {
  const compositionOff = {
    vitamins: true,
    healthiness: true,
    composition: false,
  };

  it('composition-on vision prompt splits a screenshot ingredient list into items (D-02)', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expect(prompt).toMatch(/если это скриншот/i);
    expect(prompt).toContain(SCREENSHOT_SPLIT_SENTENCE);
    expect(prompt).toMatch(/доставка/);
    expect(prompt).toMatch(/карточка блюда/);
  });

  it('composition-on vision prompt still forbids splitting a packaged product from the physical label (D-04)', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expect(prompt).toMatch(/йогурт/);
    expect(prompt).toMatch(/не разбивай.*этикетк/i);
  });

  it('composition-off vision prompt swaps to a single item and drops screenshot-split (D-01 still holds)', () => {
    const prompt = selectAnalyzeSystemPrompt(true, compositionOff);
    expect(prompt).toContain(SINGLE_ITEM_COMPOSITION_RULE);
    expect(prompt).not.toContain(ANALYZE_COMPOSITION_PROMPT_RULE);
    expect(prompt).not.toContain(SCREENSHOT_SPLIT_SENTENCE);
    expectScreenshotIsFood(prompt);
  });
});

describe('vision prompts: foreground subject only, ignore background food', () => {
  it('vision system prompt requires foreground-only analysis', () => {
    const prompt = selectAnalyzeSystemPrompt(true);
    expect(prompt).toContain(FOREGROUND_SUBJECT_PROMPT_RULE);
    expect(prompt).toMatch(/ПЕРЕДНЕМ ПЛАНЕ/);
    expect(prompt).toMatch(/заднем плане/);
    expect(prompt).toMatch(/НЕ суммируй «всё съедобное в кадре»/);
    expect(prompt).not.toMatch(/включи все компоненты всех блюд/);
  });

  it('text-only prompt has no foreground-subject section', () => {
    const prompt = selectAnalyzeSystemPrompt(false);
    expect(prompt).not.toContain(FOREGROUND_SUBJECT_PROMPT_RULE);
    expect(prompt).not.toMatch(/ПЕРЕДНЕМ ПЛАНЕ/);
  });

  it('vision user text reminds to ignore background food', () => {
    expect(ANALYSIS_PROMPT).toMatch(/переднем плане/i);
    expect(ANALYSIS_PROMPT).toMatch(/заднем плане/i);
    expect(ANALYSIS_PROMPT_MULTI).toMatch(/переднем плане/i);
  });
});
