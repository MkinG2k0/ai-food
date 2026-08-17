import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

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
        amount: 10_000,
        originalAmount: 10_000,
        promoCode: null,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { subscribe } = await import('./billingApi');
    const result = await subscribe();
    expect(result).toEqual({
      paymentUrl: 'https://pay.example/x',
      paymentId: 'pay_1',
      amount: 10_000,
      originalAmount: 10_000,
      promoCode: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });

  it('validatePromo POSTs /billing/promo/validate', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        code: 'new80',
        discountPercent: 80,
        originalAmount: 10_000,
        finalAmount: 2_000,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { validatePromo } = await import('./billingApi');
    const result = await validatePromo('new80');
    expect(result.finalAmount).toBe(2_000);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/promo/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ promoCode: 'new80' }),
      }),
    );
  });

  it('subscribe sends promoCode when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentUrl: 'https://pay.example/x',
        paymentId: 'pay_1',
        amount: 5_000,
        originalAmount: 10_000,
        promoCode: 'new50',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { subscribe } = await import('./billingApi');
    const result = await subscribe('new50');
    expect(result.promoCode).toBe('new50');
    expect(result.amount).toBe(5_000);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ promoCode: 'new50' }),
      }),
    );
  });

  it('subscribe sends client native on Capacitor platform', async () => {
    const { Capacitor } = await import('@capacitor/core');
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paymentUrl: 'aifood://subscribe/success?paymentId=pay_1&mock=1',
        paymentId: 'pay_1',
        amount: 10_000,
        originalAmount: 10_000,
        promoCode: null,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { subscribe } = await import('./billingApi');
    await subscribe();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ client: 'native' }),
      }),
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

  it('fetchSubscriptionPrice GETs /billing/price without user headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        amountKopecks: 10_000,
        currency: 'RUB',
        durationDays: 365,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchSubscriptionPrice } = await import('./billingApi');
    const result = await fetchSubscriptionPrice();
    expect(result).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gw.test/billing/price',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
