import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ApiError, NutritionResult } from '@ai-food/shared-types';
import axios from 'axios';
import { COMPOSITION_PROMPT_RULE, FOOD_NAME_PROMPT_RULE } from './analyzeFoodApi';
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

describe('refineMealApi (AI Gateway)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', GATEWAY_URL);
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', GATEWAY_KEY);
    vi.mocked(axios.post).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('resolves AnalyzeFoodResponse on text-only refine with valid NutritionResult', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    const result = await refineMealApi({
      correction: 'съел половину',
      mealContext,
    });

    expect(result.result).toEqual(validNutrition);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);

    const [url, rawBody, config] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as {
      model: string;
      response_format: { type: string };
      messages: Array<{ role: string; content: string }>;
    };

    expect(String(url)).toContain(`${GATEWAY_URL}/v1/chat/completions`);
    expect(config?.headers?.Authorization).toBe(`Bearer ${GATEWAY_KEY}`);
    expect(body).toMatchObject({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
    });
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain(FOOD_NAME_PROMPT_RULE);
    expect(body.messages[0].content).toContain(COMPOSITION_PROMPT_RULE);
    expect(typeof body.messages[1].content).toBe('string');
    expect(body.messages[1].content).toContain('съел половину');
    expect(body.messages[1].content).toContain(JSON.stringify(mealContext));
  });

  it('POSTs multimodal user content when imageDataUrl is provided', async () => {
    const imageDataUrl = 'data:image/jpeg;base64,abc123';
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({
      correction: 'котлета не куриная а мясная',
      mealContext,
      imageDataUrl,
    });

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as {
      messages: Array<{
        role: string;
        content:
          | string
          | Array<{ type: string; image_url?: { url: string }; text?: string }>;
      }>;
    };

    expect(Array.isArray(body.messages[1].content)).toBe(true);
    const parts = body.messages[1].content as Array<{
      type: string;
      image_url?: { url: string };
      text?: string;
    }>;
    const imagePart = parts.find((p) => p.type === 'image_url');
    const textPart = parts.find((p) => p.type === 'text');
    expect(imagePart?.image_url?.url).toBe(imageDataUrl);
    expect(textPart?.text).toContain('котлета не куриная а мясная');
    expect(body.messages[0].content).toContain(FOOD_NAME_PROMPT_RULE);
    expect(body.messages[0].content).toContain(COMPOSITION_PROMPT_RULE);
  });

  it('rejects ANALYSIS_FAILED when gateway env is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    vi.stubEnv('VITE_AI_GATEWAY_API_KEY', '');

    await expect(
      refineMealApi({ correction: 'съел половину', mealContext })
    ).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects ANALYSIS_FAILED when content is empty', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(''),
    });

    await expect(
      refineMealApi({ correction: 'съел половину', mealContext })
    ).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('rejects ANALYSIS_FAILED on invalid NutritionResult schema', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(
        JSON.stringify({ foodName: 'Суп', calories: 'lot', confidence: 2 })
      ),
    });

    await expect(
      refineMealApi({ correction: 'меньше соли', mealContext })
    ).rejects.toMatchObject({
      code: 'ANALYSIS_FAILED',
    } satisfies Partial<ApiError>);
  });

  it('maps RATE_LIMITED from gateway', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: {
        status: 429,
        data: { message: 'rate limited', code: 'RATE_LIMITED', status: 429 },
      },
      message: 'Request failed',
    });

    await expect(
      refineMealApi({ correction: 'съел половину', mealContext })
    ).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
    } satisfies Partial<ApiError>);
  });

  it('appends non-empty trimmed customInstructions to system message', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({
      correction: 'съел половину',
      mealContext,
      customInstructions: '  Безглютеновая диета  ',
    });

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const body = rawBody as { messages: Array<{ role: string; content: string }> };
    const systemContent = body.messages[0].content;

    expect(systemContent).toContain(FOOD_NAME_PROMPT_RULE);
    expect(systemContent).toContain('Безглютеновая диета');
    expect(systemContent).toMatch(/custom instructions|кастомн|user preferences|предпочтен/i);
  });

  it('leaves system prompt unchanged for empty customInstructions', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({ correction: 'съел половину', mealContext });
    const [, bodyWithout] = vi.mocked(axios.post).mock.calls[0];
    const baseSystem = (
      bodyWithout as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    vi.mocked(axios.post).mockClear();
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({
      correction: 'съел половину',
      mealContext,
      customInstructions: '',
    });
    const [, bodyEmpty] = vi.mocked(axios.post).mock.calls[0];
    const emptySystem = (
      bodyEmpty as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    expect(emptySystem).toBe(baseSystem);
  });

  it('includes halal diet section and pork→chicken bias in system message', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({
      correction: 'съел половину',
      mealContext,
      dietType: 'halal',
    });

    const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
    const systemContent = (
      rawBody as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    expect(systemContent).toMatch(/## User diet preference/i);
    expect(systemContent).toMatch(/halal|халяль/i);
    expect(systemContent).toMatch(
      /свинин.*куриц|похож.*свинин.*куриц|lookalike.*chicken|pork.*chicken|если мясо похоже на свинину/i,
    );
  });

  it.each(['vegan', 'vegetarian'] as const)(
    'includes %s diet without pork→chicken bias',
    async (dietType) => {
      vi.mocked(axios.post).mockResolvedValue({
        data: gatewaySuccessBody(JSON.stringify(validNutrition)),
      });

      await refineMealApi({
        correction: 'съел половину',
        mealContext,
        dietType,
      });

      const [, rawBody] = vi.mocked(axios.post).mock.calls[0];
      const systemContent = (
        rawBody as { messages: Array<{ role: string; content: string }> }
      ).messages[0].content;

      expect(systemContent).toMatch(/## User diet preference/i);
      expect(systemContent).not.toMatch(
        /свинин.*куриц|похож.*свинин.*куриц|lookalike.*chicken|pork.*chicken|если мясо похоже на свинину/i,
      );
    },
  );

  it('omits diet preference section when dietType is none or omitted', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({ correction: 'съел половину', mealContext });
    const [, bodyOmitted] = vi.mocked(axios.post).mock.calls[0];
    const omittedSystem = (
      bodyOmitted as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    vi.mocked(axios.post).mockClear();
    vi.mocked(axios.post).mockResolvedValue({
      data: gatewaySuccessBody(JSON.stringify(validNutrition)),
    });

    await refineMealApi({
      correction: 'съел половину',
      mealContext,
      dietType: 'none',
    });
    const [, bodyNone] = vi.mocked(axios.post).mock.calls[0];
    const noneSystem = (
      bodyNone as { messages: Array<{ role: string; content: string }> }
    ).messages[0].content;

    expect(omittedSystem).not.toMatch(/## User diet preference/i);
    expect(noneSystem).not.toMatch(/## User diet preference/i);
  });
});
