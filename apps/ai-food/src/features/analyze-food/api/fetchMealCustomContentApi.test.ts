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

describe('fetchMealCustomContentApi', () => {
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
      model: 'google/gemini-3-flash-preview',
    });
    expect(result).toBe('');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('answers a follow-up question without requiring settings instructions', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('**Энергия:** 4/5'),
    });

    const result = await fetchMealCustomContentApi({
      mealContext,
      question: 'Ожидаемая энергия 1–5 через час',
      model: 'openai/gpt-4.1-mini',
    });

    expect(result).toBe('**Энергия:** 4/5');
    const body = vi.mocked(axios.post).mock.calls[0][1] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0].content).toMatch(/ТОЛЬКО на этот вопрос/i);
    expect(body.messages[1].content).toContain('Ожидаемая энергия');
  });

  it('does not pass settings recipe instructions into follow-up question prompt', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('Айран или минералка'),
    });

    await fetchMealCustomContentApi({
      mealContext,
      customInstructions: 'дай полный рецепт и оценку блюда',
      question: 'что взять попить коротко',
    });

    const body = vi.mocked(axios.post).mock.calls[0][1] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[1].content).toContain('что взять попить коротко');
    expect(body.messages[1].content).not.toContain('дай полный рецепт');
    expect(body.messages[1].content).toMatch(/ТОЛЬКО на этот вопрос/);
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
      model: 'openai/gpt-4.1-mini',
    });

    expect(result).toBe('## Рецепт\n- шаг 1');
    expect(String(vi.mocked(axios.post).mock.calls[0][0])).toContain(
      `${GATEWAY_URL}/v1/chat/completions`,
    );
    const config = vi.mocked(axios.post).mock.calls[0][2] as {
      headers?: Record<string, string>;
    };
    expect(config?.headers?.['X-Device-Id']).toBe('test-device-id');
    expect(config?.headers?.['X-Usage-Kind']).toBe('other');
    const body = vi.mocked(axios.post).mock.calls[0][1] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0].content).toMatch(/Markdown/);
    expect(body.messages[1].content).toContain('дай краткий рецепт');
    expect(body.messages[1].content).toContain('Борщ');
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

  it('QUESTION_SYSTEM_PROMPT instructs OFF_TOPIC for off-topic questions', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('Около 320 ккал.'),
    });

    await fetchMealCustomContentApi({
      mealContext,
      question: 'сколько калорий в этом блюде',
    });

    const body = vi.mocked(axios.post).mock.calls[0][1] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages[0].content).toMatch(/OFF_TOPIC/);
    expect(body.messages[1].content).toMatch(/OFF_TOPIC/);
  });

  it('posts valid food question and returns markdown', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody('**Калории:** около 320 ккал'),
    });

    const result = await fetchMealCustomContentApi({
      mealContext,
      question: 'сколько калорий в этом блюде',
    });

    expect(result).toBe('**Калории:** около 320 ккал');
    expect(axios.post).toHaveBeenCalled();
  });
});
