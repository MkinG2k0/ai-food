import { describe, expect, it } from 'vitest';
import { SINGLE_ITEM_COMPOSITION_RULE } from './analyzeFeatures.js';
import {
  buildAnalyzeMessages,
  buildAskMessages,
  buildRefineMessages,
} from './buildMessages.js';

function systemText(messages: ReturnType<typeof buildAnalyzeMessages>): string {
  const content = messages[0]?.content;
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) =>
      typeof part === 'object' && part && 'text' in part
        ? String((part as { text?: string }).text ?? '')
        : '',
    )
    .join('\n');
}

describe('buildAnalyzeMessages', () => {
  it('builds vision user content with text + image_url parts', () => {
    const messages = buildAnalyzeMessages({
      images: ['data:image/jpeg;base64,aaa', 'data:image/jpeg;base64,bbb'],
      description: 'салат',
      model: 'test-model',
    });

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('user');
    const user = messages[1].content;
    expect(Array.isArray(user)).toBe(true);
    const parts = user as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(parts[0]).toMatchObject({ type: 'text' });
    expect(parts[0].text).toMatch(/салат|изображен/i);
    expect(parts.filter((p) => p.type === 'image_url')).toHaveLength(2);
  });

  it('builds plain text user content without images', () => {
    const messages = buildAnalyzeMessages({
      images: [],
      description: 'борщ 300г',
      model: 'test-model',
    });

    expect(typeof messages[1].content).toBe('string');
    expect(messages[1].content).toMatch(/борщ/i);
  });

  it('strips optional prompt sections when features are off', () => {
    const messages = buildAnalyzeMessages({
      images: [],
      description: 'яблоко',
      model: 'test-model',
      features: { vitamins: false, healthiness: false, composition: false },
    });

    const text = systemText(messages);
    expect(text).not.toMatch(/## healthiness/);
    expect(text).not.toMatch(/## Микронутриенты/);
    expect(text).toContain(SINGLE_ITEM_COMPOSITION_RULE);
  });
});

describe('buildRefineMessages', () => {
  it('appends diet + custom instructions to system prompt', () => {
    const messages = buildRefineMessages({
      correction: 'съел половину',
      mealContext: { name: 'Салат', items: [] },
      customInstructions: 'отвечай кратко',
      dietType: 'vegan',
      features: { vitamins: true, healthiness: true, composition: true },
    });

    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toMatch(/vegan|веган/i);
    expect(messages[0].content).toMatch(/User custom instructions/i);
    expect(messages[0].content).toMatch(/отвечай кратко/);
    expect(messages[1].content).toMatch(/съел половину/);
  });

  it('puts data URL image before correction text', () => {
    const messages = buildRefineMessages({
      correction: 'меньше масла',
      mealContext: { items: [] },
      imageDataUrl: 'data:image/png;base64,xyz',
    });

    const content = messages[1].content;
    expect(Array.isArray(content)).toBe(true);
    const parts = content as Array<{ type: string }>;
    expect(parts[0]).toMatchObject({ type: 'image_url' });
    expect(parts[1]).toMatchObject({ type: 'text' });
  });
});

describe('buildAskMessages', () => {
  it('uses question system prompt when question is set', () => {
    const messages = buildAskMessages({
      mealContext: { name: 'Суп', totalCalories: 200, items: [] },
      question: 'Сколько белка?',
    });

    expect(messages[0].content).toMatch(/OFF_TOPIC|блюд/i);
    expect(messages[1].content).toMatch(/Сколько белка/);
  });

  it('uses settings system prompt for custom instructions without question', () => {
    const messages = buildAskMessages({
      mealContext: { name: 'Суп', totalCalories: 200, items: [] },
      customInstructions: 'без глютена',
    });

    expect(messages[0].content).toMatch(/settings|инструкц|предпочтен/i);
    expect(messages[1].content).toMatch(/без глютена/);
  });
});
