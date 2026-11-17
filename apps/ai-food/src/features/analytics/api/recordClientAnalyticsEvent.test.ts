import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-Usage-Kind': 'other',
  })),
}));

import { recordClientAnalyticsEvent } from './recordClientAnalyticsEvent';

describe('recordClientAnalyticsEvent', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('posts analyze_meal_card_failure on 200 OK', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    await recordClientAnalyticsEvent({
      name: 'analyze_meal_card_failure',
      mealId: 'm1',
      inFlight: true,
      errorCode: null,
      clientAt: '2026-11-17T15:00:00.000Z',
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/analytics/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'analyze_meal_card_failure',
          mealId: 'm1',
          inFlight: true,
          errorCode: null,
          clientAt: '2026-11-17T15:00:00.000Z',
        }),
      }),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('warns on non-OK response without throwing', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      recordClientAnalyticsEvent({
        name: 'analyze_meal_card_failure',
        mealId: 'm1',
        inFlight: false,
        errorCode: 'ANALYSIS_TIMEOUT',
      }),
    ).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      '[analytics] Failed to record event',
      expect.objectContaining({
        name: 'analyze_meal_card_failure',
      }),
    );
  });

  it('no-ops when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await recordClientAnalyticsEvent({
      name: 'analyze_meal_card_failure',
      mealId: 'm1',
      inFlight: true,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
