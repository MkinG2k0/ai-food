import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import OpenAI from 'openai';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

vi.mock('openai');

import { createApp } from './app.js';

const ORIGINAL = process.env.API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

function mockOpenAI(partial: {
  listModels?: ReturnType<typeof vi.fn>;
  createChat?: ReturnType<typeof vi.fn>;
  createEmbeddings?: ReturnType<typeof vi.fn>;
}) {
  vi.mocked(OpenAI).mockImplementation(
    () =>
      ({
        models: { list: partial.listModels ?? vi.fn() },
        chat: { completions: { create: partial.createChat ?? vi.fn() } },
        embeddings: { create: partial.createEmbeddings ?? vi.fn() },
      }) as unknown as OpenAI,
  );
}

describe('createApp 404 handling', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await request(createApp()).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Route not found.',
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('returns JSON 404 for unmatched /v1 routes when auth passes', async () => {
    delete process.env.API_KEY;
    const res = await request(createApp()).get('/v1/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Route not found.',
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('gateway /v1 models + embeddings + chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    delete process.env.API_KEY;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = ORIGINAL;
    if (ORIGINAL_OPENROUTER_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_KEY;
  });

  it('GET /v1/models returns 200 with data array', async () => {
    const listModels = vi.fn().mockResolvedValue({
      data: [{ id: 'gpt-4o-mini', object: 'model' }],
      object: 'list',
    });
    mockOpenAI({ listModels });

    const res = await request(createApp()).get('/v1/models');
    expect(res.status).toBe(200);
    expect(res.body.data[0].id).toBe('gpt-4o-mini');
  });

  it('POST /v1/embeddings returns embeddings JSON', async () => {
    const createEmbeddings = vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2], index: 0 }],
      model: 'text-embedding-3-small',
    });
    mockOpenAI({ createEmbeddings });

    const res = await request(createApp())
      .post('/v1/embeddings')
      .send({ model: 'text-embedding-3-small', input: 'hello' });
    expect(res.status).toBe(200);
    expect(res.body.data[0].embedding).toEqual([0.1, 0.2]);
  });

  it('POST /v1/chat/completions returns completion JSON', async () => {
    const createChat = vi.fn().mockResolvedValue({
      id: 'chatcmpl-1',
      choices: [{ message: { role: 'assistant', content: 'hello' } }],
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('chatcmpl-1');
  });

  it('POST /v1/chat/completions with missing messages returns 400 VALIDATION_ERROR', async () => {
    mockOpenAI({});

    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('POST /v1/chat/completions stream=true returns SSE chunks', async () => {
    const chunk = {
      id: 'chatcmpl-stream',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }],
    };
    const createChat = vi.fn().mockResolvedValue({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {
        yield chunk;
      },
    });
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      })
      .buffer(true)
      .parse((response, callback) => {
        const data: Buffer[] = [];
        response.on('data', (part: Buffer) => data.push(part));
        response.on('end', () => callback(null, Buffer.concat(data).toString('utf8')));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.body).toContain(`data: ${JSON.stringify(chunk)}`);
    expect(res.body).toContain('data: [DONE]');
    expect(createChat).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true }),
      expect.objectContaining({ timeout: 120_000 }),
    );
  });

  it('aborts a stream request disconnected while create is pending', async () => {
    const heldResolvers: Array<(stream: unknown) => void> = [];
    let resolveCreate!: (stream: unknown) => void;
    let requestSignal: AbortSignal | undefined;
    const streamAbort = vi.fn();
    const emptyStream = () => ({
      controller: { abort: streamAbort },
      async *[Symbol.asyncIterator]() {},
    });
    const probeCompletion = {
      id: 'chatcmpl-probe',
      choices: [{ message: { role: 'assistant', content: 'probe' } }],
    };
    const createChat = vi.fn(
      (params: { model: string }, options?: { signal?: AbortSignal }) => {
        if (heldResolvers.length < 4) {
          return new Promise((resolve) => {
            heldResolvers.push(resolve);
          });
        }
        if (params.model === 'gpt-4o-mini') {
          requestSignal = options?.signal;
          return new Promise((resolve) => {
            resolveCreate = resolve;
          });
        }
        return Promise.resolve(probeCompletion);
      },
    );
    mockOpenAI({ createChat });

    const server = createApp().listen(0);
    const address = server.address() as AddressInfo;
    const heldRequests: http.ClientRequest[] = [];
    const startStream = (model: string) => {
      const clientRequest = http.request({
        host: '127.0.0.1',
        port: address.port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      clientRequest.on('error', () => {});
      clientRequest.end(
        JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          stream: true,
        }),
      );
      heldRequests.push(clientRequest);
      return clientRequest;
    };

    let responseStarted = false;
    const clientRequest = http.request(
      {
        host: '127.0.0.1',
        port: address.port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (response) => {
        responseStarted = true;
        response.resume();
      },
    );
    clientRequest.on('error', () => {});

    try {
      for (let index = 0; index < 4; index += 1) {
        startStream(`held-${index}`);
      }
      await vi.waitFor(() => expect(createChat).toHaveBeenCalledTimes(4));

      clientRequest.end(
        JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'hi' }],
          stream: true,
        }),
      );
      await vi.waitFor(() => expect(createChat).toHaveBeenCalledTimes(5));

      clientRequest.destroy();
      await vi.waitFor(() => expect(requestSignal?.aborted).toBe(true));

      let probeStatus = 0;
      const probeResPromise = new Promise<void>((resolve, reject) => {
        const probeReq = http.request(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          (response) => {
            probeStatus = response.statusCode ?? 0;
            response.on('data', () => {});
            response.on('end', () => resolve());
          },
        );
        probeReq.on('error', reject);
        probeReq.end(
          JSON.stringify({
            model: 'probe',
            messages: [{ role: 'user', content: 'hi' }],
          }),
        );
      });

      await vi.waitFor(() =>
        expect(createChat.mock.calls.some(([params]) => params.model === 'probe')).toBe(
          true,
        ),
      );

      resolveCreate(emptyStream());
      await vi.waitFor(() => expect(streamAbort).toHaveBeenCalledOnce());
      expect(responseStarted).toBe(false);

      await probeResPromise;
      expect(probeStatus).toBe(200);
    } finally {
      resolveCreate?.(emptyStream());
      for (const resolve of heldResolvers) resolve(emptyStream());
      for (const heldRequest of heldRequests) heldRequest.destroy();
      clientRequest.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('skips upstream create when a queued stream request disconnects', async () => {
    const heldResolvers: Array<(stream: unknown) => void> = [];
    const emptyStream = () => ({
      controller: { abort: vi.fn() },
      async *[Symbol.asyncIterator]() {},
    });
    const createChat = vi.fn((params: { model: string }) => {
      if (heldResolvers.length < 5) {
        return new Promise((resolve) => {
          heldResolvers.push(resolve);
        });
      }
      return Promise.resolve(emptyStream());
    });
    mockOpenAI({ createChat });

    const server = createApp().listen(0);
    const address = server.address() as AddressInfo;
    const requests: http.ClientRequest[] = [];
    const startStream = (model: string) => {
      const clientRequest = http.request({
        host: '127.0.0.1',
        port: address.port,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      clientRequest.on('error', () => {});
      clientRequest.end(
        JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'hi' }],
          stream: true,
        }),
      );
      requests.push(clientRequest);
      return clientRequest;
    };
    const nextTurn = () => new Promise<void>((resolve) => setImmediate(resolve));

    try {
      for (let index = 0; index < 5; index += 1) {
        startStream(`held-${index}`);
      }
      await vi.waitFor(() => expect(createChat).toHaveBeenCalledTimes(5));

      const disconnectedRequest = startStream('queued-disconnect');
      await new Promise<void>((resolve) => disconnectedRequest.once('finish', resolve));
      await nextTurn();
      disconnectedRequest.destroy();
      await new Promise<void>((resolve) => disconnectedRequest.once('close', resolve));

      startStream('queued-probe');
      await nextTurn();
      heldResolvers[0](emptyStream());

      await vi.waitFor(() => expect(createChat.mock.calls.length).toBeGreaterThanOrEqual(6));
      expect(createChat.mock.calls[5][0]).toEqual(
        expect.objectContaining({ model: 'queued-probe' }),
      );
    } finally {
      for (const resolve of heldResolvers) resolve(emptyStream());
      for (const clientRequest of requests) clientRequest.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('maps OpenAI RateLimitError on chat to 429 RATE_LIMITED', async () => {
    const rateLimitError = new OpenAI.RateLimitError(
      429,
      { error: { message: 'Rate limited', type: 'rate_limit_error' } },
      'Rate limit exceeded',
      {} as ConstructorParameters<typeof OpenAI.RateLimitError>[3],
    );
    const createChat = vi.fn().mockRejectedValue(rateLimitError);
    mockOpenAI({ createChat });

    const res = await request(createApp())
      .post('/v1/chat/completions')
      .send({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
  });

  it('rejects protected routes with 401 when API_KEY set and missing', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    mockOpenAI({});
    const res = await request(createApp()).get('/v1/models');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('allows protected routes with valid Bearer token', async () => {
    process.env.API_KEY = 'secret-gateway-key';
    const listModels = vi.fn().mockResolvedValue({
      data: [{ id: 'gpt-4o-mini', object: 'model' }],
      object: 'list',
    });
    mockOpenAI({ listModels });
    const res = await request(createApp())
      .get('/v1/models')
      .set('Authorization', 'Bearer secret-gateway-key');
    expect(res.status).toBe(200);
  });
});
