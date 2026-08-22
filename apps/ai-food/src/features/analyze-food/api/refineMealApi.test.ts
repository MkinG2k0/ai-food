import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';
import axios from 'axios';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/device', () => ({
  Device: {
    getId: vi.fn().mockResolvedValue({ identifier: 'test-device-id' }),
  },
}));

import { refineMealApi } from './refineMealApi';

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
  calories: 425,
  protein: 17.5,
  carbs: 39,
  fat: 21,
  fiber: 3.5,
  confidence: 0.88,
  healthiness: 6,
  items: [
    {
      name: 'Булка',
      calories: 100,
      protein: 3,
      carbs: 20,
      fat: 1,
      grams: 40,
    },
    {
      name: 'Котлета',
      calories: 325,
      protein: 14.5,
      carbs: 19,
      fat: 20,
      grams: 75,
    },
  ],
};

const mealContext = {
  name: 'Бургер с картошкой',
  items: [
    {
      name: 'Булка',
      calories: 200,
      protein: 6,
      carbs: 40,
      fat: 2,
      grams: 80,
    },
    {
      name: 'Котлета',
      calories: 650,
      protein: 29,
      carbs: 38,
      fat: 40,
      grams: 150,
    },
  ],
};

function gatewaySuccessBody(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe('refineMealApi (food/refine)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.mocked(axios.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('posts clean body to /v1/food/refine without model/messages/temperature', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const result = await refineMealApi({
      correction: 'съел половину',
      mealContext,
      customInstructions: 'меньше соли',
      dietType: 'vegan',
      features: { vitamins: true, healthiness: true, composition: true },
    });

    expect(result.result).toEqual(validNutrition);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);

    const [url, rawBody, config] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as Record<string, unknown>;

    expect(String(url)).toBe(`${GATEWAY_URL}/v1/food/refine`);
    expect(config?.headers?.Authorization).toBe(`Bearer ${GATEWAY_KEY}`);
    expect(config?.headers?.['X-Device-Id']).toBe('test-device-id');
    expect(config?.headers?.['X-Usage-Kind']).toBe('refine');
    expect(body).toMatchObject({
      correction: 'съел половину',
      mealContext,
      customInstructions: 'меньше соли',
      dietType: 'vegan',
    });
    expect(body).not.toHaveProperty('model');
    expect(body).not.toHaveProperty('messages');
    expect(body).not.toHaveProperty('temperature');
  });

  it('parses NutritionResult wrapped in markdown json fences', async () => {
    const fenced = '```json\n' + JSON.stringify(validNutrition) + '\n```';
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(fenced),
    });

    const result = await refineMealApi({
      correction: 'съел половину',
      mealContext,
    });
    expect(result.result.foodName).toBe(validNutrition.foodName);
  });

  it('includes optional imageDataUrl in body', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });
    const dataUrl = 'data:image/jpeg;base64,abc';
    await refineMealApi({
      correction: 'меньше соли',
      mealContext,
      imageDataUrl: dataUrl,
    });
    const body = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body.imageDataUrl).toBe(dataUrl);
  });

  it('rejects empty correction', async () => {
    await expect(
      refineMealApi({ correction: '  ', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 400 });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it.each(['22', 'кто ты'] as const)(
    'rejects OFF_TOPIC before axios for junk %s',
    async (correction) => {
      await expect(
        refineMealApi({ correction, mealContext }),
      ).rejects.toMatchObject({
        code: 'OFF_TOPIC',
        status: 400,
      } satisfies Partial<ApiError>);
      expect(axios.post).not.toHaveBeenCalled();
    },
  );

  it('rejects OFF_TOPIC when payload has offTopic flag', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ offTopic: true, reason: 'math' })),
    });
    await expect(
      refineMealApi({ correction: 'сколько будет 2+2 для блюда', mealContext }),
    ).rejects.toMatchObject({ code: 'OFF_TOPIC', status: 400 });
  });

  it('maps RATE_LIMITED from gateway', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'RATE_LIMITED', message: 'slow' }, status: 429 },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });

  it('masks healthiness when feature is off', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });
    const { result } = await refineMealApi({
      correction: 'съел половину',
      mealContext,
      features: { vitamins: true, healthiness: false, composition: true },
    });
    expect(result.healthiness).toBeUndefined();
  });

  it('rejects when gateway env is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(
      refineMealApi({ correction: 'fix', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('maps QUOTA_EXCEEDED from gateway', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'QUOTA_EXCEEDED', message: 'no quota' }, status: 402 },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', status: 402 });
  });

  it('maps UPSTREAM_TIMEOUT from gateway', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'UPSTREAM_TIMEOUT' }, status: 504 },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_TIMEOUT', status: 504 });
  });

  it('maps BAD_REQUEST to INVALID_IMAGE', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'BAD_REQUEST', message: 'bad image' }, status: 400 },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'INVALID_IMAGE', status: 400, message: 'bad image' });
  });

  it('rejects empty gateway content', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { choices: [{ message: { content: '' } }] },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
  });

  it('rejects invalid JSON content', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('not-json-at-all'),
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
  });

  it('rejects schema-invalid nutrition payload', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify({ foodName: 'x' })),
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
  });

  it('falls back to ANALYSIS_FAILED for unknown gateway code', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'MYSTERY', message: 'boom' }, status: 500 },
    });
    await expect(
      refineMealApi({ correction: 'съел половину', mealContext }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500, message: 'boom' });
  });
});
