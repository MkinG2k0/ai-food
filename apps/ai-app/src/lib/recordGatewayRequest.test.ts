import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
vi.mock('../lib/prisma.js', () => ({
  getPrisma: () => ({ gatewayRequest: { create } }),
}));

const { recordGatewayRequest, startGatewayRequestTimer } = await import(
  './recordGatewayRequest.js'
);

describe('recordGatewayRequest', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: '1' });
  });

  it('creates a row', async () => {
    await recordGatewayRequest({
      type: 'food_refine',
      stream: false,
      ok: true,
      ttfbMs: 100,
      durationMs: 100,
      userId: 'u1',
      deviceId: 'd1',
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        type: 'food_refine',
        stream: false,
        ok: true,
        ttfbMs: 100,
        durationMs: 100,
        userId: 'u1',
        deviceId: 'd1',
      },
    });
  });

  it('swallows create errors', async () => {
    create.mockRejectedValue(new Error('db down'));
    await expect(
      recordGatewayRequest({
        type: 'models',
        stream: false,
        ok: false,
        ttfbMs: null,
        durationMs: 5,
      }),
    ).resolves.toBeUndefined();
  });
});

describe('startGatewayRequestTimer', () => {
  it('finish records duration and optional ttfb', async () => {
    vi.useFakeTimers();
    const timer = startGatewayRequestTimer();
    vi.advanceTimersByTime(40);
    timer.markTtfb();
    vi.advanceTimersByTime(60);
    timer.finish({
      ok: true,
      type: 'chat_completions',
      stream: true,
    });
    await vi.runAllTimersAsync();
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'chat_completions',
        stream: true,
        ok: true,
        ttfbMs: 40,
        durationMs: 100,
      }),
    });
    vi.useRealTimers();
  });
});
