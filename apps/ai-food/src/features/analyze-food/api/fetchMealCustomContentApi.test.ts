import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError } from '@ai-food/shared-types';
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

import {
  fetchMealCustomContentApi,
  normalizeCustomContent,
  stripMarkdownFences,
} from './fetchMealCustomContentApi';

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

const mealContext = {
  name: 'Борщ',
  totalCalories: 320,
  items: [
    {
      name: 'Свёкла',
      calories: 80,
      protein: 2,
      carbs: 16,
      fat: 0,
      grams: 100,
    },
  ],
};

function gatewaySuccessBody(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe('stripMarkdownFences / normalizeCustomContent', () => {
  it('strips markdown fences', () => {
    expect(stripMarkdownFences('```md\n# Рецепт\n```')).toBe('# Рецепт');
    expect(stripMarkdownFences('```markdown\nтекст\n```')).toBe('текст');
  });

  it('truncates long content', () => {
    const long = 'a'.repeat(9000);
    expect(normalizeCustomContent(long)).toHaveLength(8000);
  });
});

describe('fetchMealCustomContentApi (food/ask)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.mocked(axios.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns empty string when instructions and question are blank without calling gateway', async () => {
    const result = await fetchMealCustomContentApi({
      mealContext,
      customInstructions: '   ',
    });
    expect(result).toBe('');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('posts clean ask body without model/messages/temperature', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('**Энергия:** 4/5'),
    });

    const result = await fetchMealCustomContentApi({
      mealContext,
      question: 'Ожидаемая энергия 1–5 через час',
    });

    expect(result).toBe('**Энергия:** 4/5');
    const [url, body, config] = vi.mocked(axios.post).mock.calls[0];
    expect(String(url)).toBe(`${GATEWAY_URL}/v1/food/ask`);
    expect(config?.headers?.Authorization).toBe(`Bearer ${GATEWAY_KEY}`);
    expect(config?.headers?.['X-Usage-Kind']).toBe('other');
    expect(body).toMatchObject({
      mealContext,
      question: 'Ожидаемая энергия 1–5 через час',
    });
    expect(body).not.toHaveProperty('model');
    expect(body).not.toHaveProperty('messages');
    expect(body).not.toHaveProperty('temperature');
  });

  it('sends settings instructions without question', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('## Рецепт\n- шаг'),
    });

    await fetchMealCustomContentApi({
      mealContext,
      customInstructions: 'дай краткий рецепт',
    });

    const body = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body.customInstructions).toBe('дай краткий рецепт');
    expect(body.question).toBeUndefined();
  });

  it('prefers question over settings when both provided (question-only body)', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('Айран или минералка'),
    });

    await fetchMealCustomContentApi({
      mealContext,
      customInstructions: 'дай полный рецепт и оценку блюда',
      question: 'что взять попить коротко',
    });

    const body = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(body.question).toBe('что взять попить коротко');
    // Client still may send instructions; server ask route uses question mode when question set.
    // Prefer not sending recipe instructions for follow-ups (previous client behavior).
    expect(body.customInstructions).toBeUndefined();
  });

  it('rejects when gateway env is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', '');
    await expect(
      fetchMealCustomContentApi({
        mealContext,
        customInstructions: 'дай рецепт',
      }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED' } satisfies Partial<ApiError>);
  });

  it('returns trimmed markdown and strips fences', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('```md\n## Рецепт\n- шаг 1\n```'),
    });

    const result = await fetchMealCustomContentApi({
      mealContext,
      customInstructions: 'дай краткий рецепт',
    });

    expect(result).toBe('## Рецепт\n- шаг 1');
  });

  it('allows empty model content', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(''),
    });

    const result = await fetchMealCustomContentApi({
      mealContext,
      customInstructions: 'я веган',
    });
    expect(result).toBe('');
  });

  it('maps RATE_LIMITED from gateway', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: { data: { code: 'RATE_LIMITED', message: 'slow down' }, status: 429 },
    });

    await expect(
      fetchMealCustomContentApi({
        mealContext,
        customInstructions: 'острое ли?',
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });

  it.each(['22', 'кто ты'] as const)(
    'rejects OFF_TOPIC before axios for obvious junk question %s',
    async (question) => {
      await expect(
        fetchMealCustomContentApi({ mealContext, question }),
      ).rejects.toMatchObject({
        code: 'OFF_TOPIC',
        status: 400,
      } satisfies Partial<ApiError>);
      expect(axios.post).not.toHaveBeenCalled();
    },
  );

  it('rejects OFF_TOPIC when model returns OFF_TOPIC sentinel', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('OFF_TOPIC'),
    });

    await expect(
      fetchMealCustomContentApi({
        mealContext,
        question: 'расскажи анекдот про политику',
      }),
    ).rejects.toMatchObject({ code: 'OFF_TOPIC', status: 400 });

    expect(axios.post).toHaveBeenCalled();
  });
});
