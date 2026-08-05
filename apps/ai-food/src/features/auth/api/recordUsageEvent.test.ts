import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../model/quotaHeaders', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-Usage-Kind': 'other',
  })),
}));

import { recordUsageEvent } from './recordUsageEvent';

describe('recordUsageEvent', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('posts usage event on 200 OK', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await recordUsageEvent('manual');

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/usage/event',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ kind: 'manual' }),
      }),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns on non-OK response (503)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    await recordUsageEvent('barcode');

    expect(console.warn).toHaveBeenCalledWith(
      '[usage] Failed to record event',
      expect.objectContaining({
        kind: 'barcode',
        error: expect.objectContaining({
          message: 'Usage event failed: 503',
        }),
      }),
    );
  });
});
