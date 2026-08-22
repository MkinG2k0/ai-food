import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@ai-food/shared-types';
import { streamChatCompletions, streamFoodAnalyze } from './streamChatCompletions';

const GATEWAY_URL = 'https://gateway.test.example';
const GATEWAY_KEY = 'test-gateway-key';

function sseBodyFromEvents(events: string[]): string {
  return events.map((e) => `data: ${e}\n\n`).join('') + 'data: [DONE]\n\n';
}

function sseDelta(content: string): string {
  return JSON.stringify({ choices: [{ delta: { content } }] });
}

function mockStreamResponse(body: string, init?: { status?: number; jobId?: string }) {
  return new Response(body, {
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'text/event-stream',
      ...(init?.jobId ? { 'X-Analyze-Job-Id': init.jobId } : {}),
    },
  });
}

describe('streamFoodAnalyze', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('accumulates SSE delta content and reports job id from header', async () => {
    const onDelta = vi.fn();
    const onJobId = vi.fn();
    vi.mocked(fetch).mockResolvedValue(
      mockStreamResponse(
        sseBodyFromEvents([sseDelta('<food>'), sseDelta('salad</food>')]),
        { jobId: 'job-header' },
      ),
    );

    const result = await streamFoodAnalyze({
      gatewayUrl: GATEWAY_URL,
      apiKey: GATEWAY_KEY,
      body: { description: 'salad' },
      onDelta,
      onJobId,
    });

    expect(result.content).toBe('<food>salad</food>');
    expect(result.jobId).toBe('job-header');
    expect(onJobId).toHaveBeenCalledWith('job-header');
    expect(onDelta).toHaveBeenLastCalledWith('<food>salad</food>');
  });

  it('reads jobId from SSE payload when not in header', async () => {
    const onJobId = vi.fn();
    vi.mocked(fetch).mockResolvedValue(
      mockStreamResponse(
        sseBodyFromEvents([
          JSON.stringify({ jobId: 'job-sse' }),
          sseDelta('ok'),
        ]),
      ),
    );

    const result = await streamFoodAnalyze({
      gatewayUrl: GATEWAY_URL,
      apiKey: GATEWAY_KEY,
      body: { description: 'x' },
      onJobId,
    });

    expect(result.jobId).toBe('job-sse');
    expect(onJobId).toHaveBeenCalledWith('job-sse');
  });

  it('maps QUOTA_EXCEEDED from HTTP error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: 'QUOTA_EXCEEDED', message: 'limit' }), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      streamFoodAnalyze({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: { description: 'x' },
      }),
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', status: 402 } satisfies Partial<ApiError>);
  });

  it('rejects inline SSE error payload', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockStreamResponse(
        sseBodyFromEvents([
          JSON.stringify({
            error: { code: 'ANALYSIS_FAILED', message: 'bad stream', status: 500 },
          }),
        ]),
      ),
    );

    await expect(
      streamFoodAnalyze({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: { description: 'x' },
      }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
  });

  it('throws STREAM_INTERRUPTED when reader fails after jobId is known', async () => {
    const encoder = new TextEncoder();
    let readCount = 0;
    const body = {
      getReader: () => ({
        read: async () => {
          readCount += 1;
          if (readCount === 1) {
            return {
              done: false,
              value: encoder.encode(`data: ${JSON.stringify({ jobId: 'job-1' })}\n\n`),
            };
          }
          throw new Error('connection lost');
        },
      }),
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      body,
    } as Response);

    await expect(
      streamFoodAnalyze({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: { description: 'x' },
      }),
    ).rejects.toMatchObject({ code: 'STREAM_INTERRUPTED', jobId: 'job-1' });
  });

  it('maps aborted signal to ANALYSIS_TIMEOUT', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    await expect(
      streamFoodAnalyze({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: { description: 'x' },
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_TIMEOUT', status: 504 });
  });

  it('rejects empty response body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers(),
      body: null,
    } as Response);

    await expect(
      streamFoodAnalyze({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: { description: 'x' },
      }),
    ).rejects.toMatchObject({ code: 'ANALYSIS_FAILED', status: 500 });
  });
});

describe('streamChatCompletions (deprecated)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('posts stream=true and returns accumulated content', async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockStreamResponse(sseBodyFromEvents([sseDelta('hello')])),
    );

    const content = await streamChatCompletions({
      gatewayUrl: GATEWAY_URL,
      apiKey: GATEWAY_KEY,
      body: { messages: [{ role: 'user', content: 'hi' }] },
    });

    expect(content).toBe('hello');
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body)).stream).toBe(true);
    expect(String(init.headers && (init.headers as Record<string, string>).Accept)).toBe(
      'text/event-stream',
    );
  });

  it('maps RATE_LIMITED from HTTP 429', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ code: 'RATE_LIMITED' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      streamChatCompletions({
        gatewayUrl: GATEWAY_URL,
        apiKey: GATEWAY_KEY,
        body: {},
      }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });
});
