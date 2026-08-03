import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth', () => ({
  getQuotaHeaders: vi.fn(async () => ({
    'X-Device-Id': 'test-device',
    'X-User-Token': 'jwt-token',
    'X-Usage-Kind': 'other',
  })),
  useAuthStore: {
    getState: () => ({ userToken: 'jwt-token' }),
  },
}));

describe('billingApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
    vi.unstubAllGlobals();
  });

  it('subscribe POSTs /billing/subscribe and returns paymentUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentUrl: 'https://pay.example/x',
        paymentId: 'pay_1',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { subscribe } = await import('./billingApi');
    const result = await subscribe();
    expect(result).toEqual({
      paymentUrl: 'https://pay.example/x',
      paymentId: 'pay_1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/subscribe',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchBillingStatus GETs /billing/status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
        hasActiveSubscription: true,
        latestPayment: null,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchBillingStatus } = await import('./billingApi');
    const status = await fetchBillingStatus();
    expect(status.hasActiveSubscription).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('https://gw.test/billing/status');
  });

  it('syncBilling POSTs /billing/sync', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentId: 'pay_1',
        paymentStatus: 'confirmed',
        hasActiveSubscription: true,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { syncBilling } = await import('./billingApi');
    const result = await syncBilling('pay_1');
    expect(result.hasActiveSubscription).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/sync',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paymentId: 'pay_1' }),
      }),
    );
  });
});
