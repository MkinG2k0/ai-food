import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import OpenAI from 'openai';

vi.mock('openai');

vi.mock('../lib/recordGatewayRequest.js', () => ({
  startGatewayRequestTimer: () => {
    const calls: unknown[] = [];
    (globalThis as { __gwFinishes?: unknown[] }).__gwFinishes = calls;
    return {
      markTtfb: vi.fn(),
      finish: vi.fn(async (opts) => {
        calls.push(opts);
      }),
    };
  },
}));

import { createApp } from '../app.js';
import { DEFAULT_OPENROUTER_MODEL, FOOD_TEMPERATURE } from '../food/modelConfig.js';

const ORIGINAL = process.env.API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const ORIGINAL_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;

function mockOpenAI(partial: {
  createChat?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(OpenAI).mockImplementation(
    () =>
      ({
        models: { list: vi.fn() },
        chat: { completions: { create: partial.createChat ?? vi.fn() } },
        embeddings: { create: vi.fn() },
      }) as unknown as OpenAI,
  );
}

describe('POST /v1/food/*', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    delete process.env.API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
    if (ORIGINAL_OPENROUTER_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_KEY;
    if (ORIGINAL_OPENROUTER_MODEL === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = ORIGINAL_OPENROUTER_MODEL;
  });

  it('analyze without images/description returns 400', async () => {
    mockOpenAI({});
    const res = await request(createApp()).post('/v1/food/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('analyze streams SSE with server model + temperature 0 + system message', async () => {
    const chunk = {
      id: 'chatcmpl-food',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: '<analysis>' }, finish_reason: null }],
    };
    const createChat = vi.fn().mockResolvedValue({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        yield chunk;
      },
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/food/analyze')
      .send({ description: 'салат с курицей' })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (part: Buffer) => data.push(part));
        response.on('end', () => callback(null, Buffer.concat(data).toString('utf8')));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(String(res.body)).toContain('data:');
    expect(createChat).toHaveBeenCalledTimes(1);
    const args = createChat.mock.calls[0][0] as {
      model: string;
      temperature: number;
      stream: boolean;
      messages: Array<{ role: string; content: unknown }>;
    };
    expect(args.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(args.temperature).toBe(FOOD_TEMPERATURE);
    expect(args.stream).toBe(true);
    expect(args.messages[0].role).toBe('system');
    const systemContent = args.messages[0].content;
    const systemText =
      typeof systemContent === 'string'
        ? systemContent
        : Array.isArray(systemContent)
          ? String((systemContent[0] as { text?: string }).text ?? '')
          : '';
    expect(systemText.length).toBeGreaterThan(50);
  });

  it('analyze ignores client-supplied model/messages if present (strict body rejects)', async () => {
    mockOpenAI({});
    const res = await request(createApp())
      .post('/v1/food/analyze')
      .send({
        description: 'яблоко',
        model: 'client-injected-model',
        messages: [{ role: 'user', content: 'hack' }],
        temperature: 0.9,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('analyze uses OPENROUTER_MODEL env when set', async () => {
    process.env.OPENROUTER_MODEL = 'openai/gpt-4.1-mini';
    const createChat = vi.fn().mockResolvedValue({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        yield {
          id: 'c',
          object: 'chat.completion.chunk',
          choices: [{ index: 0, delta: { content: 'x' }, finish_reason: null }],
        };
      },
    });
    mockOpenAI({ createChat });

    await request(createApp())
      .post('/v1/food/analyze')
      .send({ description: 'суп' })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (part: Buffer) => data.push(part));
        response.on('end', () => callback(null, Buffer.concat(data).toString('utf8')));
      });

    expect(createChat.mock.calls[0][0].model).toBe('openai/gpt-4.1-mini');
  });

  it('refine returns JSON completion with server model and json_object format', async () => {
    const createChat = vi.fn().mockResolvedValue({
      id: 'chatcmpl-refine',
      choices: [{ message: { role: 'assistant', content: '{"foodName":"Салат"}' } }],
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/food/refine')
      .send({
        correction: 'съел половину',
        mealContext: {
          name: 'Салат',
          items: [
            {
              name: 'Салат',
              calories: 200,
              protein: 10,
              carbs: 10,
              fat: 10,
              grams: 150,
            },
          ],
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('chatcmpl-refine');
    const args = createChat.mock.calls[0][0];
    expect(args.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(args.temperature).toBe(0);
    expect(args.stream).toBe(false);
    expect(args.response_format).toEqual({ type: 'json_object' });
    expect(args.messages[0].role).toBe('system');
    expect(args.messages[0].content).toMatch(/NutritionResult|foodName/i);

    const finishes = (globalThis as { __gwFinishes?: unknown[] }).__gwFinishes;
    expect(finishes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ok: true,
          type: 'food_refine',
          stream: false,
        }),
      ]),
    );
  });

  it('refine rejects empty correction', async () => {
    mockOpenAI({});
    const res = await request(createApp())
      .post('/v1/food/refine')
      .send({
        correction: '',
        mealContext: { items: [] },
      });
    expect(res.status).toBe(400);
  });

  it('ask returns JSON completion', async () => {
    const createChat = vi.fn().mockResolvedValue({
      id: 'chatcmpl-ask',
      choices: [{ message: { role: 'assistant', content: '## Ответ\nОк' } }],
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/food/ask')
      .send({
        mealContext: {
          name: 'Борщ',
          totalCalories: 300,
          items: [{ name: 'Борщ', calories: 300, protein: 10, carbs: 20, fat: 10 }],
        },
        question: 'Сколько белка?',
      });

    expect(res.status).toBe(200);
    expect(res.body.choices[0].message.content).toContain('Ответ');
    const args = createChat.mock.calls[0][0];
    expect(args.model).toBe(DEFAULT_OPENROUTER_MODEL);
    expect(args.temperature).toBe(0);
    expect(args.messages[0].content).toMatch(/OFF_TOPIC|блюде/i);
  });

  it('ask without question and instructions returns 400', async () => {
    mockOpenAI({});
    const res = await request(createApp())
      .post('/v1/food/ask')
      .send({
        mealContext: { totalCalories: 0, items: [] },
      });
    expect(res.status).toBe(400);
  });
});
