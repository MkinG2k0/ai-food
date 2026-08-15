import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nutritionResultToXml } from './parseNutritionXml';
import type { NutritionResult } from '@ai-food/shared-types';

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

import { waitForAnalyzeJob } from './fetchAnalyzeJobApi';

const GATEWAY_URL = 'https://gateway.test.example';
const GATEWAY_KEY = 'test-gateway-key';

const validNutrition: NutritionResult = {
  foodName: 'Суп',
  calories: 200,
  protein: 10,
  carbs: 20,
  fat: 8,
  fiber: 2,
  confidence: 0.9,
  healthiness: 8,
  items: [
    {
      name: 'Суп',
      calories: 200,
      protein: 10,
      carbs: 20,
      fat: 8,
      grams: 250,
      fiber: 2,
    },
  ],
};

describe('waitForAnalyzeJob', () => {
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

  it('polls GET until the job is done and returns XML content', async () => {
    const xml = nutritionResultToXml(validNutrition);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ jobId: 'job-1', status: 'running' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ jobId: 'job-1', status: 'done', content: xml }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    const content = await waitForAnalyzeJob('job-1', {
      deadlineAt: Date.now() + 10_000,
      pollMs: 1,
    });
    expect(content).toBe(xml);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      `${GATEWAY_URL}/v1/food/analyze/job-1`,
    );
  });

  it('rejects JOB_NOT_FOUND', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'JOB_NOT_FOUND', message: 'gone' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    await expect(waitForAnalyzeJob('missing')).rejects.toMatchObject({
      code: 'JOB_NOT_FOUND',
      status: 404,
    });
  });
});
