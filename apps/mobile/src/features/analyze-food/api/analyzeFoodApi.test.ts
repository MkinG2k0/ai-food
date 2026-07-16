import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';
import axios from 'axios';
import {
  analyzeFoodApi,
  appendDietPreference,
  COMPOSITION_PROMPT_RULE,
  FOOD_NAME_PROMPT_RULE,
  NO_FOOD_PROMPT_RULE,
  MICRONUTRIENTS_PROMPT_RULE,
} from './analyzeFoodApi';

const PORK_TO_CHICKEN_BIAS =
  /свинин.*куриц|похож.*свинин.*куриц|lookalike.*chicken|pork.*chicken|если мясо похоже на свинину/i;

const DIET_SECTION = /## User diet preference/i;

vi.mock('axios', () => {
  const post = vi.fn();
  return {
    default: {
      post,
      create: () => ({
        post,
        interceptors: { response: { use: vi.fn() } },
      }),
    },
  };
});

const GATEWAY_URL = 'https://gateway.test.example';
const GATEWAY_KEY = 'test-gateway-key';

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

function gatewaySuccessBody(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe('analyzeFoodApi (AI Gateway)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.mocked(axios.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('resolves AnalyzeFoodResponse on valid gateway NutritionResult JSON', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['fake-image'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);

    expect(result.result).toEqual(validNutrition);
    expect(result.result.items).toHaveLength(2);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('rejects NO_FOOD_DETECTED when model returns noFood JSON', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ noFood: true, reason: 'На фото кот' })),
    });

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
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(withEmptyItems)),
    });

    const file = new File(['fake-image'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);

    expect(result.result.items).toEqual([]);
    expect(result.result.foodName).toBe('Овсянка с ягодами');
  });

  it('rejects ANALYSIS_FAILED when an item is missing name or has non-number calories', async () => {
    const invalidItems = {
      foodName: 'Тарелка',
      calories: 500,
      protein: 20,
      carbs: 40,
      fat: 15,
      fiber: 5,
      confidence: 0.8,
      healthiness: 6,
      items: [{ name: 'Суп', calories: 'много', protein: 10, carbs: 20, fat: 5 }],
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(invalidItems)),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED when item.grams is a non-number', async () => {
    const invalidGrams = {
      ...validNutrition,
      items: [
        {
          name: 'Булка',
          calories: 200,
          protein: 6,
          carbs: 40,
          fat: 2,
          grams: '150 г',
        },
      ],
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(invalidGrams)),
    });

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
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(withGrams)),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file);
    expect(result.result.items[0].grams).toBe(85);
  });

  it('rejects ANALYSIS_FAILED when items is missing', async () => {
    const withoutItems = {
      foodName: 'Суп',
      calories: 200,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
      confidence: 0.7,
      healthiness: 5,
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(withoutItems)),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('POSTs to /v1/chat/completions with Bearer key and vision body', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img-bytes'], 'meal.png', { type: 'image/png' });
    await analyzeFoodApi(file);

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, rawBody, config] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as {
      model: string;
      response_format: { type: string };
      messages: Array<{
        role: string;
        content:
          | string
          | Array<{ type: string; image_url?: { url: string }; text?: string }>;
      }>;
    };

    expect(String(url)).toContain('/v1/chat/completions');
    expect(String(url)).toContain(GATEWAY_URL);
    expect(config?.headers?.Authorization).toBe(`Bearer ${GATEWAY_KEY}`);
    expect(body).toMatchObject({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
    });
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1].role).toBe('user');

    const userContent = body.messages[1].content;
    expect(Array.isArray(userContent)).toBe(true);
    const imagePart = (userContent as Array<{ type: string; image_url?: { url: string } }>).find(
      (part) => part.type === 'image_url'
    );
    expect(imagePart?.image_url?.url).toMatch(/^data:image\/png;base64,/);
  });

  it('rejects ANALYSIS_FAILED when content is empty', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(''),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED on malformed JSON content', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('{not-json'),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED on invalid NutritionResult schema', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(
        JSON.stringify({ foodName: 'Суп', calories: 'lot', confidence: 2 })
      ),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED when healthiness is missing', async () => {
    const withoutHealthiness = {
      foodName: 'Суп',
      calories: 200,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
      confidence: 0.7,
      items: [],
    };
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(withoutHealthiness)),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it.each([0, 11, -1] as const)(
    'rejects ANALYSIS_FAILED when healthiness is out of range (%s)',
    async (healthiness) => {
      const outOfRange = { ...validNutrition, healthiness };
      vi.mocked(axios.post).mockResolvedValue({
        data: gatewaySuccessBody(JSON.stringify(outOfRange)),
      });

      const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
      await expect(analyzeFoodApi(file)).rejects.toMatchObject({
        code: 'ANALYSIS_FAILED',
      } satisfies Partial<ApiError>);
    }
  );

  it('SYSTEM_PROMPT documents healthiness 1–10 alongside confidence', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ ...validNutrition, healthiness: 7 })),
    });

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as { messages: Array<{ role: string; content: string }> };
    const system = body.messages[0].content;
    expect(system).toMatch(/"healthiness"\s*:\s*number/i);
    expect(system).toMatch(/1\s*[–-]\s*10|1 to 10|integer 1/i);
    expect(system).toMatch(/"confidence"\s*:\s*number/i);
  });

  it.each([
    ['RATE_LIMITED', 'RATE_LIMITED', 429],
    ['UPSTREAM_TIMEOUT', 'ANALYSIS_TIMEOUT', 504],
    ['BAD_REQUEST', 'INVALID_IMAGE', 400],
    ['UNAUTHORIZED', 'ANALYSIS_FAILED', 500],
    ['UPSTREAM_ERROR', 'ANALYSIS_FAILED', 500],
    ['SOMETHING_ELSE', 'ANALYSIS_FAILED', 500],
  ] as const)(
    'maps gateway code %s → %s',
    async (gatewayCode, expectedCode, expectedStatus) => {
      vi.mocked(axios.post).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'gateway error', code: gatewayCode, status: 400 },
        },
        message: 'Request failed',
      });

      const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
      await expect(analyzeFoodApi(file)).rejects.toMatchObject({
        code: expectedCode,
        status: expectedStatus,
      } satisfies Partial<ApiError>);
    }
  );

  it('rejects ANALYSIS_FAILED when gateway env is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', '');

    const file = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('FOOD_NAME_PROMPT_RULE distinguishes dish-level foodName from composition items', () => {
    expect(FOOD_NAME_PROMPT_RULE).toMatch(/foodName/i);
    expect(FOOD_NAME_PROMPT_RULE).toMatch(/items\[\]\.name|items\[\]\.name/i);
    expect(FOOD_NAME_PROMPT_RULE).toMatch(
      /never.*comma-separated|запрещено.*перечень|не перечисляй|not.*ingredient list|не пиши.*список|не.*перечень состава/i,
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

  it('SYSTEM_PROMPT embeds COMPOSITION_PROMPT_RULE alongside FOOD_NAME_PROMPT_RULE', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as { messages: Array<{ role: string; content: string }> };
    const systemContent = body.messages[0].content;

    expect(systemContent).toContain(FOOD_NAME_PROMPT_RULE);
    expect(systemContent).toContain(NO_FOOD_PROMPT_RULE);
    expect(systemContent).toContain(COMPOSITION_PROMPT_RULE);
    expect(systemContent).toContain(MICRONUTRIENTS_PROMPT_RULE);
    expect(systemContent).toMatch(/"micronutrients"/);
    expect(systemContent).toMatch(/атомарн.*ингредиент|атомарн.*слой|видимого ингредиента\/слоя/i);
    expect(systemContent).toMatch(/grams/i);
    expect(systemContent).toMatch(/items\[\]\.grams|"grams".*number|grams.*estimate|оценки.*вес|вес.*грамм/i);
    expect(systemContent).not.toMatch(/"portion"/);
    expect(systemContent).not.toMatch(/1 шт|1 порция|piece-count|serving-count|шт»|порция»/i);
  });

  it('appends non-empty trimmed customInstructions to system message', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, {
      customInstructions: '  Веган, всегда в граммах  ',
    });

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as { messages: Array<{ role: string; content: string }> };
    const systemContent = body.messages[0].content;

    expect(systemContent).toContain(FOOD_NAME_PROMPT_RULE);
    expect(systemContent).toContain('Веган, всегда в граммах');
    expect(systemContent).toMatch(/custom instructions|кастомн|user preferences|предпочтен/i);
    expect(systemContent).not.toMatch(/ {2}Веган/);
  });

  it('leaves system prompt unchanged for empty or whitespace-only customInstructions', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);
    const [, bodyWithout] = vi.mocked(axios.post).mock.calls[0];
    const baseSystem = (
      bodyWithout as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    vi.mocked(axios.post).mockClear();
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await analyzeFoodApi(file, { customInstructions: '   ' });
    const [, bodyBlank] = vi.mocked(axios.post).mock.calls[0];
    const blankSystem = (
      bodyBlank as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

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
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { dietType: 'halal' });

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const systemContent = (
      rawBody as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    expect(systemContent).toMatch(DIET_SECTION);
    expect(systemContent).toMatch(/halal|халяль/i);
    expect(systemContent).toMatch(PORK_TO_CHICKEN_BIAS);
  });

  it.each(['vegan', 'vegetarian'] as const)(
    'includes %s diet section without pork→chicken bias',
    async (dietType) => {
      vi.mocked(axios.post).mockResolvedValue({
        data: gatewaySuccessBody(JSON.stringify(validNutrition)),
      });

      const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
      await analyzeFoodApi(file, { dietType });

      const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
      const systemContent = (
        rawBody as { messages: Array<{ role: string; content: string }> }
      ).messages[0].content;

      expect(systemContent).toMatch(DIET_SECTION);
      expect(systemContent).not.toMatch(PORK_TO_CHICKEN_BIAS);
    },
  );

  it('omits diet preference section when dietType is none or omitted', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file);
    const [, bodyOmitted] = vi.mocked(axios.post).mock.calls[0];
    const omittedSystem = (
      bodyOmitted as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    vi.mocked(axios.post).mockClear();
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await analyzeFoodApi(file, { dietType: 'none' });
    const [, bodyNone] = vi.mocked(axios.post).mock.calls[0];
    const noneSystem = (
      bodyNone as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    expect(omittedSystem).not.toMatch(DIET_SECTION);
    expect(noneSystem).not.toMatch(DIET_SECTION);
  });

  it('POSTs text-only analysis without image_url when description is provided', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const result = await analyzeFoodApi({ description: 'куриный салат с рисом' });

    expect(result.result.foodName).toBe(validNutrition.foodName);
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as {
      messages: Array<{
        role: string;
        content: string | Array<{ type: string; image_url?: unknown; text?: string }>;
      }>;
    };

    expect(body.messages[1].role).toBe('user');
    expect(typeof body.messages[1].content).toBe('string');
    expect(body.messages[1].content).toContain('куриный салат с рисом');
    expect(String(body.messages[0].content)).toMatch(/опис|describe|текст/i);
  });

  it('rejects INVALID_INPUT when neither image nor description is provided', async () => {
    await expect(analyzeFoodApi({ description: '   ' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      status: 400,
    } satisfies Partial<ApiError>);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
