import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import chatCompletionsRouter from './chat-completions';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', chatCompletionsRouter);
  return app;
}

const OPENROUTER_OK = {
  id: 'chatcmpl-test',
  choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
};

describe('POST /v1/chat/completions', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    delete process.env.OPENROUTER_MODEL;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(OPENROUTER_OK),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
  });

  it('forwards client bare model through toOpenRouterModel', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/')
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
      });

    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body)) as { model: string };
    expect(payload.model).toBe('openai/gpt-4o-mini');
  });

  it('forwards full OpenRouter slug unchanged', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/')
      .send({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [{ role: 'user', content: 'hi' }],
      });

    expect(response.status).toBe(200);
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const payload = JSON.parse(String(init?.body)) as { model: string };
    expect(payload.model).toBe('anthropic/claude-sonnet-4.6');
  });

  it('falls back to getOpenRouterModel when model is omitted or blank', async () => {
    process.env.OPENROUTER_MODEL = 'openai/gpt-4.1';
    const app = buildApp();

    for (const body of [
      { messages: [{ role: 'user', content: 'hi' }] },
      { model: '', messages: [{ role: 'user', content: 'hi' }] },
      { model: '   ', messages: [{ role: 'user', content: 'hi' }] },
    ]) {
      vi.mocked(globalThis.fetch).mockClear();
      const response = await request(app).post('/').send(body);
      expect(response.status).toBe(200);
      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
      const payload = JSON.parse(String(init?.body)) as { model: string };
      expect(payload.model).toBe('openai/gpt-4.1');
    }
  });

  it('returns 400 when messages are missing', async () => {
    const app = buildApp();

    const response = await request(app).post('/').send({ model: 'gpt-4o-mini' });

    expect(response.status).toBe(400);
    expect(response.body.error?.message).toMatch(/messages/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 500 when OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const app = buildApp();

    const response = await request(app)
      .post('/')
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
      });

    expect(response.status).toBe(500);
    expect(response.body.error?.message).toMatch(/OPENROUTER_API_KEY/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
