import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';
import {
  analyzeFoodApi,
  appendDietPreference,
  COMPOSITION_PROMPT_RULE,
  FOOD_NAME_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
  MICRONUTRIENTS_PROMPT_RULE,
} from './analyzeFoodApi';
import { noFoodResultToXml, nutritionResultToXml } from './parseNutritionXml';

const PORK_TO_CHICKEN_BIAS =
  /свинин.*куриц|похож.*свинин.*куриц|lookalike.*chicken|pork.*chicken|если мясо похоже на свинину/i;

const DIET_SECTION = /## User diet preference/i;

const GATEWAY_URL = 'https://gateway.test.example';
const GATEWAY_KEY = 'test-gateway-key';

/** Unwrap system message text (string or OpenAI content-block array). */
function systemText(
  content: string | Array<{ type: string; text?: string; cache_control?: unknown }>,
): string {
  if (typeof content === 'string') return content;
  return content.map((part) => part.text ?? '').join('');
}

const validNutrition: NutritionResult = {
  foodName: 'Бургер с картошкой',
  calories: 850,
  protein: 35,
  carbs: 78,
  fat: 42,
  fiber: 7,
  confidence: 0.91,
  healthiness: 7,
  items: [
    {
      name: 'Бургер',
      calories: 550,
      protein: 28,
      carbs: 40,
      fat: 28,
      grams: 150,
      fiber: 3,
    },
    {
      name: 'Картофель фри',
      calories: 300,
      protein: 7,
      carbs: 38,
      fat: 14,
      grams: 100,
      fiber: 4,
    },
  ],
};

function sseBodyFromContent(content: string, chunkSize = 40): string {
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push('');
  return (
    chunks
      .map(
        (c) =>
          `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`,
      )
      .join('') + 'data: [DONE]\n\n'
  );
}

function mockStreamOk(content: string, chunkSize = 40) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(sseBodyFromContent(content, chunkSize), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ),
  );
}

function mockStreamHttpError(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

function lastFetchBody(): {
  model?: string;
  stream?: boolean;
  response_format?: unknown;
  messages: Array<{
    role: string;
    content:
      | string
      | Array<{ type: string; image_url?: { url: string }; text?: string; cache_control?: unknown }>;
  }>;
} {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalled();
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(String(init.body));
}

describe('analyzeFoodApi (AI Gateway streaming XML)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('resolves AnalyzeFoodResponse on valid gateway NutritionResult XML', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['fake-image'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);

    expect(result.result).toMatchObject(validNutrition);
    expect(result.result.items).toHaveLength(2);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('rejects NO_FOOD_DETECTED when model returns noFood XML', async () => {
    mockStreamOk(noFoodResultToXml('На фото кот'));

    const file = new File(['fake-image'], 'cat.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'NO_FOOD_DETECTED',
      status: 422,
      message: expect.stringMatching(/не обнаружена еда/i),
    } satisfies Partial<ApiError>);
  });

  it('accepts empty items array when top-level NutritionResult fields are valid', async () => {
    const withEmptyItems: NutritionResult = {
      foodName: 'Овсянка с ягодами',
      calories: 350,
      protein: 12,
      carbs: 55,
      fat: 8,
      fiber: 6,
      confidence: 0.91,
      healthiness: 7,
      items: [],
    };
    mockStreamOk(nutritionResultToXml(withEmptyItems));

    const file = new File(['fake-image'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);

    expect(result.result.items).toEqual([]);
    expect(result.result.foodName).toBe('Овсянка с ягодами');
  });

  it('rejects ANALYSIS_FAILED when an item is missing name or has non-number calories', async () => {
    mockStreamOk(`<analysis>
  <foodName>Тарелка</foodName>
  <calories>500</calories>
  <protein>20</protein>
  <carbs>40</carbs>
  <fat>15</fat>
  <fiber>5</fiber>
  <confidence>0.8</confidence>
  <healthiness>6</healthiness>
  <items>
    <item>
      <name>Суп</name>
      <calories>много</calories>
      <protein>10</protein>
      <carbs>20</carbs>
      <fat>5</fat>
    </item>
  </items>
</analysis>`);

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED when item.grams is a non-number', async () => {
    mockStreamOk(`<analysis>
  <foodName>Бургер</foodName>
  <calories>200</calories>
  <protein>6</protein>
  <carbs>40</carbs>
  <fat>2</fat>
  <fiber>0</fiber>
  <confidence>0.9</confidence>
  <healthiness>5</healthiness>
  <items>
    <item>
      <name>Булка</name>
      <calories>200</calories>
      <protein>6</protein>
      <carbs>40</carbs>
      <fat>2</fat>
      <grams>150 г</grams>
    </item>
  </items>
</analysis>`);

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('accepts NutritionResult when item.grams is an optional number', async () => {
    const withGrams = {
      ...validNutrition,
      items: [
        {
          name: 'Булка',
          calories: 200,
          protein: 6,
          carbs: 40,
          fat: 2,
          grams: 85,
        },
      ],
    };
    mockStreamOk(nutritionResultToXml(withGrams));

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);
    expect(result.result.items[0].grams).toBe(85);
  });

  it('rejects ANALYSIS_FAILED when items is missing', async () => {
    mockStreamOk(`<analysis>
  <foodName>Суп</foodName>
  <calories>200</calories>
  <protein>10</protein>
  <carbs>20</carbs>
  <fat>5</fat>
  <fiber>2</fiber>
  <confidence>0.7</confidence>
  <healthiness>5</healthiness>
</analysis>`);

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('POSTs to /v1/chat/completions with Bearer key, stream, and vision body', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img-bytes'], 'meal.png', { type: 'image/png' });
    await analyzeFoodApi(file, { model: 'openai/gpt-4.1-mini' });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const body = lastFetchBody();

    expect(String(url)).toContain('/v1/chat/completions');
    expect(String(url)).toContain(GATEWAY_URL);
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${GATEWAY_KEY}`,
    });
    expect(body).toMatchObject({
      model: 'openai/gpt-4.1-mini',
      stream: true,
    });
    expect(body.temperature).toBeUndefined();
    expect(body.response_format).toBeUndefined();
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');

    const systemContent = body.messages[0].content;
    expect(Array.isArray(systemContent)).toBe(true);
    const systemPart = (
      systemContent as Array<{ type: string; text?: string; cache_control?: { type: string } }>
    )[0];
    expect(systemPart?.type).toBe('text');
    expect(systemPart?.cache_control).toEqual({ type: 'ephemeral' });
    expect(systemPart?.text).toMatch(/ассистент по анализу питания/i);
    expect(systemPart?.text).toMatch(/XML/i);

    const userContent = body.messages[1].content;
    expect(Array.isArray(userContent)).toBe(true);
    const userParts = userContent as Array<{
      type: string;
      image_url?: { url: string };
      text?: string;
      cache_control?: unknown;
    }>;
    expect(userParts[0]?.type).toBe('text');
    expect(userParts[0]?.text).toBe('Проанализируй изображение.');
    expect(userParts[0]?.cache_control).toBeUndefined();
    expect(userParts[1]?.type).toBe('image_url');
    expect(userParts[1]?.image_url?.url).toMatch(/^data:image\/png;base64,/);
    expect(userParts[1]?.cache_control).toBeUndefined();
  });

  it('sets temperature 0.2 for Gemini models', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { model: 'google/gemini-2.5-flash' });

    expect(lastFetchBody().temperature).toBe(0.2);
  });

  it('calls onPartial as closed XML tags arrive', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition), 25);
    const onPartial = vi.fn();
    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { onPartial });

    expect(onPartial.mock.calls.length).toBeGreaterThan(0);
    const last = onPartial.mock.calls.at(-1)?.[0];
    expect(last).toMatchObject({ foodName: validNutrition.foodName });
  });

  it('rejects ANALYSIS_FAILED when content is empty', async () => {
    mockStreamOk('');

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED on malformed XML content', async () => {
    mockStreamOk('<not-valid');

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED on invalid NutritionResult schema', async () => {
    mockStreamOk(`<analysis>
  <foodName>Суп</foodName>
  <calories>lot</calories>
  <confidence>2</confidence>
</analysis>`);

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED when healthiness is missing', async () => {
    mockStreamOk(`<analysis>
  <foodName>Суп</foodName>
  <calories>200</calories>
  <protein>10</protein>
  <carbs>20</carbs>
  <fat>5</fat>
  <fiber>2</fiber>
  <confidence>0.7</confidence>
  <items></items>
</analysis>`);

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it.each([0, 11, -1] as const)(
    'rejects ANALYSIS_FAILED when healthiness is out of range (%s)',
    async (healthiness) => {
      const outOfRange = { ...validNutrition, healthiness };
      mockStreamOk(nutritionResultToXml(outOfRange));

      const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
      await expect(analyzeFoodApi(file)).rejects.toMatchObject({
        code: 'ANALYSIS_FAILED',
      } satisfies Partial<ApiError>);
    },
  );

  it('SYSTEM_PROMPT documents healthiness 1–10', async () => {
    mockStreamOk(nutritionResultToXml({ ...validNutrition, healthiness: 7 }));

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { model: 'openai/gpt-4.1-mini' });

    const body = lastFetchBody();
    const system = systemText(body.messages[0].content);
    expect(system).toMatch(/<healthiness\b/i);
    expect(system).toMatch(/1\s*[–-]\s*10|1 to 10|integer 1|целое 1/i);
    expect(system).not.toMatch(/<confidence\b/i);
  });

  it.each([
    ['RATE_LIMITED', 'RATE_LIMITED', 429, 429],
    ['UPSTREAM_TIMEOUT', 'ANALYSIS_TIMEOUT', 504, 504],
    ['BAD_REQUEST', 'INVALID_IMAGE', 400, 400],
    ['UNAUTHORIZED', 'ANALYSIS_FAILED', 401, 401],
    ['UPSTREAM_ERROR', 'ANALYSIS_FAILED', 502, 502],
    ['SOMETHING_ELSE', 'ANALYSIS_FAILED', 500, 500],
  ] as const)(
    'maps gateway code %s → %s',
    async (gatewayCode, expectedCode, httpStatus, expectedStatus) => {
      mockStreamHttpError(httpStatus, {
        message: 'gateway error',
        code: gatewayCode,
        status: httpStatus,
      });

      const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
      await expect(analyzeFoodApi(file)).rejects.toMatchObject({
        code: expectedCode,
        status: expectedStatus,
      } satisfies Partial<ApiError>);
    },
  );

  it('rejects ANALYSIS_FAILED when gateway env is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', '');

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('FOOD_NAME_PROMPT_RULE distinguishes dish-level foodName from composition items', () => {
    expect(FOOD_NAME_PROMPT_RULE).toMatch(/foodName/i);
    expect(FOOD_NAME_PROMPT_RULE).toMatch(/items|item\/name/i);
    expect(FOOD_NAME_PROMPT_RULE).toMatch(
      /не.*comma-separated|запрещено.*перечень|не перечисляй|not.*ingredient list|не пиши.*список|не.*перечень состава/i,
    );
  });

  it('COMPOSITION_PROMPT_RULE forces compound dishes into ingredient-level items', () => {
    expect(COMPOSITION_PROMPT_RULE).toMatch(/items|состав|разбив|слой|ингредиент/i);
    expect(COMPOSITION_PROMPT_RULE).toMatch(/булка/i);
    expect(COMPOSITION_PROMPT_RULE).toMatch(/котлета/i);
    expect(COMPOSITION_PROMPT_RULE).toMatch(
      /не оставляй|не склеивай|запрещ.*Гамбургер|запрещ.*Бургер|не.*единственн.*(Гамбургер|Бургер)/i,
    );
    expect(COMPOSITION_PROMPT_RULE).toMatch(/фри|один item|однородн|один элемент/i);
  });

  it('legacy SYSTEM_PROMPT embeds composition rules (non-Gemini models)', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { model: 'openai/gpt-4.1-mini' });

    const systemContent = systemText(lastFetchBody().messages[0].content);

    expect(systemContent).toContain(FOOD_NAME_PROMPT_RULE);
    expect(systemContent).toContain(NO_FOOD_PROMPT_RULE);
    expect(systemContent).toContain(COMPOSITION_PROMPT_RULE);
    expect(systemContent).toContain(MICRONUTRIENTS_PROMPT_RULE);
    expect(systemContent).toMatch(/micronutrients/i);
    expect(systemContent).toMatch(/атомарн.*ингредиент|атомарн.*слой|видимого ингредиента\/слоя/i);
    expect(systemContent).toMatch(/grams/i);
    expect(systemContent).not.toMatch(/portionReference/);
    expect(systemContent).not.toMatch(/amount_mg/);
  });

  it('Gemini SYSTEM_PROMPT uses totals/portionReference schema', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { model: 'google/gemini-2.5-flash' });

    const systemContent = systemText(lastFetchBody().messages[0].content);

    expect(systemContent).toMatch(/portionReference|totals|addedSugar|disclaimers/i);
    expect(systemContent).toMatch(/amount_mg/);
    expect(systemContent).not.toContain(FOOD_NAME_PROMPT_RULE);
  });

  it('legacy SYSTEM_PROMPT requires grams, healthiness bands, portion estimation, and few-shot noFood', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { model: 'openai/gpt-4.1-mini' });

    const systemContent = systemText(lastFetchBody().messages[0].content);

    expect(systemContent).toMatch(/grams/i);
    expect(systemContent).toMatch(/обязательн/i);
    expect(systemContent).toMatch(/порци/i);
    expect(systemContent).toMatch(/1\s*[–-]\s*3|ультрапереработан|цельные продукты/i);
    expect(systemContent).toMatch(/healthiness/i);
    expect(systemContent).toMatch(/<noFood>true<\/noFood>/i);
    expect(systemContent).toMatch(/Пример B|пример B|селфи|человек/i);
  });

  it('vision user text is short ANALYSIS_PROMPT; detailed rules stay in system', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);

    const userContent = lastFetchBody().messages[1].content as Array<{
      type: string;
      text?: string;
    }>;

    expect(userContent[0]?.type).toBe('text');
    expect(userContent[0]?.text).toBe('Проанализируй изображение.');
    expect(userContent[1]?.type).toBe('image_url');
  });

  it('appends non-empty trimmed customInstructions to system message', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, {
      customInstructions: '  Веган, всегда в граммах  ',
    });

    const systemContent = systemText(lastFetchBody().messages[0].content);

    expect(systemContent).toContain(FOOD_NAME_PROMPT_RULE);
    expect(systemContent).toContain('Веган, всегда в граммах');
    expect(systemContent).toMatch(/custom instructions|кастомн|user preferences|предпочтен/i);
    expect(systemContent).not.toMatch(/ {2}Веган/);
  });

  it('leaves system prompt unchanged for empty or whitespace-only customInstructions', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);
    const baseSystem = systemText(lastFetchBody().messages[0].content);

    vi.clearAllMocks();
    mockStreamOk(nutritionResultToXml(validNutrition));

    await analyzeFoodApi(file, { customInstructions: '   ' });
    const blankSystem = systemText(lastFetchBody().messages[0].content);

    expect(blankSystem).toBe(baseSystem);
    expect(blankSystem).not.toMatch(/custom instructions|кастомн|user preferences|предпочтен/i);
  });

  describe('appendDietPreference', () => {
    it('returns prompt unchanged for none, null, or undefined', () => {
      const base = 'BASE_PROMPT';
      expect(appendDietPreference(base, 'none')).toBe(base);
      expect(appendDietPreference(base, null)).toBe(base);
      expect(appendDietPreference(base, undefined)).toBe(base);
    });

    it('appends halal diet rules with pork→chicken bias', () => {
      const result = appendDietPreference('BASE', 'halal');
      expect(result).toMatch(DIET_SECTION);
      expect(result).toMatch(/halal|халяль/i);
      expect(result).toMatch(PORK_TO_CHICKEN_BIAS);
    });

    it('appends vegan constraints without pork→chicken bias', () => {
      const result = appendDietPreference('BASE', 'vegan');
      expect(result).toMatch(DIET_SECTION);
      expect(result).toMatch(/vegan|веган/i);
      expect(result).not.toMatch(PORK_TO_CHICKEN_BIAS);
    });

    it('appends vegetarian constraints without pork→chicken bias', () => {
      const result = appendDietPreference('BASE', 'vegetarian');
      expect(result).toMatch(DIET_SECTION);
      expect(result).toMatch(/vegetarian|вегетариан/i);
      expect(result).not.toMatch(PORK_TO_CHICKEN_BIAS);
    });
  });

  it('includes halal diet section and pork→chicken bias in system message', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { dietType: 'halal' });

    const systemContent = systemText(lastFetchBody().messages[0].content);

    expect(systemContent).toMatch(DIET_SECTION);
    expect(systemContent).toMatch(/halal|халяль/i);
    expect(systemContent).toMatch(PORK_TO_CHICKEN_BIAS);
  });

  it.each(['vegan', 'vegetarian'] as const)(
    'includes %s diet section without pork→chicken bias',
    async (dietType) => {
      mockStreamOk(nutritionResultToXml(validNutrition));

      const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
      await analyzeFoodApi(file, { dietType });

      const systemContent = systemText(lastFetchBody().messages[0].content);

      expect(systemContent).toMatch(DIET_SECTION);
      expect(systemContent).not.toMatch(PORK_TO_CHICKEN_BIAS);
    },
  );

  it('omits diet preference section when dietType is none or omitted', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);
    const omittedSystem = systemText(lastFetchBody().messages[0].content);

    vi.clearAllMocks();
    mockStreamOk(nutritionResultToXml(validNutrition));

    await analyzeFoodApi(file, { dietType: 'none' });
    const noneSystem = systemText(lastFetchBody().messages[0].content);

    expect(omittedSystem).not.toMatch(DIET_SECTION);
    expect(noneSystem).not.toMatch(DIET_SECTION);
  });

  it('POSTs text-only analysis without image_url when description is provided', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));

    const result = await analyzeFoodApi({ description: 'куриный салат с рисом' });

    expect(result.result.foodName).toBe(validNutrition.foodName);
    expect(fetch).toHaveBeenCalledTimes(1);
    const body = lastFetchBody();

    expect(body.messages[1].role).toBe('user');
    expect(typeof body.messages[1].content).toBe('string');
    expect(body.messages[1].content).toContain('куриный салат с рисом');
    expect(String(body.messages[1].content)).toMatch(/grams|порци/i);
    expect(String(body.messages[1].content)).toMatch(/XML/i);
    expect(systemText(body.messages[0].content)).toMatch(/опис|describe|текст/i);
  });

  it('rejects INVALID_INPUT when neither image nor description is provided', async () => {
    await expect(analyzeFoodApi({ description: '   ' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      status: 400,
    } satisfies Partial<ApiError>);
    expect(fetch).not.toHaveBeenCalled();
  });
});
