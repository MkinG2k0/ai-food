import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';
import axios from 'axios';
import { analyzeFoodApi } from './analyzeFoodApi';

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
  items: [
    {
      name: 'Бургер',
      calories: 550,
      protein: 28,
      carbs: 40,
      fat: 28,
      portion: '1 шт',
      fiber: 3,
    },
    {
      name: 'Картофель фри',
      calories: 300,
      protein: 7,
      carbs: 38,
      fat: 14,
      portion: '1 порция',
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

  it('accepts empty items array when top-level NutritionResult fields are valid', async () => {
    const withEmptyItems: NutritionResult = {
      foodName: 'Овсянка с ягодами',
      calories: 350,
      protein: 12,
      carbs: 55,
      fat: 8,
      fiber: 6,
      confidence: 0.91,
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

  it('rejects ANALYSIS_FAILED when items is missing', async () => {
    const withoutItems = {
      foodName: 'Суп',
      calories: 200,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 2,
      confidence: 0.7,
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
});
