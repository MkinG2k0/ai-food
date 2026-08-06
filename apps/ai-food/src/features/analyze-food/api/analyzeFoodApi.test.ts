import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';

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

import { analyzeFoodApi } from './analyzeFoodApi';
import { noFoodResultToXml, nutritionResultToXml } from './parseNutritionXml';

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

function lastFetch(): { url: string; body: Record<string, unknown>; headers: HeadersInit } {
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock).toHaveBeenCalled();
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return {
    url: String(url),
    body: JSON.parse(String(init.body)),
    headers: init.headers as HeadersInit,
  };
}

describe('analyzeFoodApi (food/analyze SSE)', () => {
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

  it('posts clean body to /v1/food/analyze without model/messages/temperature', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));
    const file = new File(['fake-image'], 'food.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, {
      customInstructions: 'меньше соли',
      dietType: 'halal',
      features: { vitamins: true, healthiness: true, composition: true },
    });

    const { url, body, headers } = lastFetch();
    expect(url).toBe(`${GATEWAY_URL}/v1/food/analyze`);
    const h = headers as Record<string, string>;
    expect(h.Authorization).toBe(`Bearer ${GATEWAY_KEY}`);
    expect(h['X-Device-Id'] ?? h['x-device-id']).toBeTruthy();
    expect(body).toMatchObject({
      customInstructions: 'меньше соли',
      dietType: 'halal',
      features: { vitamins: true, healthiness: true, composition: true },
    });
    expect(body.images).toEqual(expect.any(Array));
    expect(Array.isArray(body.images) && (body.images as string[]).length).toBe(1);
    expect(body).not.toHaveProperty('model');
    expect(body).not.toHaveProperty('messages');
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('stream');
  });

  it('resolves AnalyzeFoodResponse on valid NutritionResult XML', async () => {
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

  it('sends description-only body without images', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));
    await analyzeFoodApi({ description: 'куриный салат с рисом' });
    const { body } = lastFetch();
    expect(body.description).toBe('куриный салат с рисом');
    expect(body.images).toBeUndefined();
  });

  it('rejects INVALID_INPUT when neither image nor description', async () => {
    await expect(analyzeFoodApi({ description: '   ' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      status: 400,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps RATE_LIMITED from gateway', async () => {
    mockStreamHttpError(429, { code: 'RATE_LIMITED', message: 'slow' });
    const file = new File(['x'], 'f.jpg', { type: 'image/jpeg' });
    await expect(analyzeFoodApi(file)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    });
  });

  it('calls onPartial as XML tags close during stream', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition), 20);
    const onPartial = vi.fn();
    const file = new File(['x'], 'f.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi(file, { onPartial });
    expect(onPartial).toHaveBeenCalled();
  });

  it('masks micronutrients when vitamins feature is off', async () => {
    const withMicros: NutritionResult = {
      ...validNutrition,
      micronutrients: [
        { id: 'vitaminC', amount: 10, unit: 'mg' },
      ],
    };
    mockStreamOk(nutritionResultToXml(withMicros));
    const file = new File(['x'], 'f.jpg', { type: 'image/jpeg' });
    const result = await analyzeFoodApi(file, {
      features: { vitamins: false, healthiness: true, composition: true },
    });
    expect(result.result.micronutrients).toBeUndefined();
  });

  it('sends multiple compressed images for multi-angle input', async () => {
    mockStreamOk(nutritionResultToXml(validNutrition));
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
    await analyzeFoodApi({ images: [a, b] });
    const { body } = lastFetch();
    expect(Array.isArray(body.images) && (body.images as string[]).length).toBe(2);
  });
});
