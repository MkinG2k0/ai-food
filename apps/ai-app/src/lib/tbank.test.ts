import { createHash } from 'node:crypto';
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  buildTbankToken,
  verifyTbankToken,
  initPayment,
  getPaymentState,
  isTbankMock,
  isTbankConfigured,
} from './tbank.js';

describe('tbank Token', () => {
  it('buildTbankToken: sorted keys, Password included, values concat, SHA-256 hex', () => {
    // Official T-Bank: root scalars only + Password, sort by key, concat values, SHA-256
    const password = 'secret';
    const params = {
      TerminalKey: 'DemoTerminal',
      Amount: 199000,
      OrderId: 'ord-1',
    };
    const withPassword = { ...params, Password: password };
    const expected = createHash('sha256')
      .update(
        Object.keys(withPassword)
          .sort()
          .map((k) => String(withPassword[k as keyof typeof withPassword]))
          .join(''),
      )
      .digest('hex');
    expect(buildTbankToken(params, password)).toBe(expected);
  });

  it('verifyTbankToken accepts matching Token and rejects bad', () => {
    const password = 'pw';
    const body = {
      TerminalKey: 'T1',
      OrderId: 'o1',
      Status: 'CONFIRMED',
      PaymentId: '123',
      Success: true,
    };
    const token = buildTbankToken(body, password);
    expect(verifyTbankToken({ ...body, Token: token }, password)).toBe(true);
    expect(verifyTbankToken({ ...body, Token: 'deadbeef' }, password)).toBe(false);
  });
});

describe('tbank config helpers', () => {
  const prev = {
    mock: process.env.TBANK_MOCK,
    key: process.env.TBANK_TERMINAL_KEY,
    pass: process.env.TBANK_PASSWORD,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      const envKey =
        k === 'mock'
          ? 'TBANK_MOCK'
          : k === 'key'
            ? 'TBANK_TERMINAL_KEY'
            : 'TBANK_PASSWORD';
      if (v === undefined) delete process.env[envKey];
      else process.env[envKey] = v;
    }
  });

  it('isTbankMock follows TBANK_MOCK=true', () => {
    process.env.TBANK_MOCK = 'true';
    expect(isTbankMock()).toBe(true);
    process.env.TBANK_MOCK = 'false';
    expect(isTbankMock()).toBe(false);
  });

  it('isTbankConfigured requires TerminalKey and Password', () => {
    delete process.env.TBANK_TERMINAL_KEY;
    delete process.env.TBANK_PASSWORD;
    expect(isTbankConfigured()).toBe(false);
    process.env.TBANK_TERMINAL_KEY = 'k';
    process.env.TBANK_PASSWORD = 'p';
    expect(isTbankConfigured()).toBe(true);
  });
});

describe('tbank Init / GetState', () => {
  const prevFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = prevFetch;
    vi.restoreAllMocks();
  });

  it('initPayment posts PayType=O without Recurrent and returns PaymentURL', async () => {
    process.env.TBANK_TERMINAL_KEY = 'term';
    process.env.TBANK_PASSWORD = 'pass';
    process.env.TBANK_API_URL = 'https://securepay.tinkoff.ru';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Success: true,
        ErrorCode: '0',
        PaymentId: '999',
        PaymentURL: 'https://pay.example/x',
        Status: 'NEW',
      }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await initPayment({
      amount: 199000,
      orderId: 'pay-cuid',
      customerKey: 'user-1',
      description: 'Year license',
      notificationUrl: 'https://gw/billing/tbank/notification',
      successUrl: 'https://app/subscribe/success',
      failUrl: 'https://app/subscribe/fail',
    });

    expect(result).toEqual({
      paymentId: '999',
      paymentUrl: 'https://pay.example/x',
      status: 'NEW',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<
      string,
      unknown
    >;
    expect(body.PayType).toBe('O');
    expect(body.Recurrent).toBeUndefined();
    expect(body.Amount).toBe(199000);
    expect(body.OrderId).toBe('pay-cuid');
    expect(body.CustomerKey).toBe('user-1');
    expect(typeof body.Token).toBe('string');
  });

  it('getPaymentState returns Status from GetState', async () => {
    process.env.TBANK_TERMINAL_KEY = 'term';
    process.env.TBANK_PASSWORD = 'pass';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Success: true,
        Status: 'CONFIRMED',
        PaymentId: '999',
        OrderId: 'pay-cuid',
      }),
    }) as unknown as typeof fetch;

    const state = await getPaymentState('999');
    expect(state.status).toBe('CONFIRMED');
    expect(state.paymentId).toBe('999');
  });

  it('initPayment throws TBANK_INIT_FAILED when Success is false', async () => {
    process.env.TBANK_TERMINAL_KEY = 'term';
    process.env.TBANK_PASSWORD = 'pass';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Success: false,
        Message: 'Invalid amount',
        ErrorCode: '7',
      }),
    }) as unknown as typeof fetch;

    await expect(
      initPayment({
        amount: 1,
        orderId: 'o1',
        customerKey: 'u1',
        description: 'x',
        notificationUrl: 'https://gw/n',
        successUrl: 'https://app/ok',
        failUrl: 'https://app/fail',
      }),
    ).rejects.toMatchObject({ code: 'TBANK_INIT_FAILED', message: 'Invalid amount' });
  });

  it('getPaymentState throws TBANK_GETSTATE_FAILED when Success false and no Status', async () => {
    process.env.TBANK_TERMINAL_KEY = 'term';
    process.env.TBANK_PASSWORD = 'pass';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        Success: false,
        Message: 'Payment not found',
        ErrorCode: '101',
      }),
    }) as unknown as typeof fetch;

    await expect(getPaymentState('404')).rejects.toMatchObject({
      code: 'TBANK_GETSTATE_FAILED',
      message: 'Payment not found',
    });
  });

  it('initPayment throws TBANK_MISCONFIGURED without terminal key', async () => {
    delete process.env.TBANK_TERMINAL_KEY;
    process.env.TBANK_PASSWORD = 'pass';
    await expect(
      initPayment({
        amount: 100,
        orderId: 'o1',
        customerKey: 'u1',
        description: 'x',
        notificationUrl: 'https://gw/n',
        successUrl: 'https://app/ok',
        failUrl: 'https://app/fail',
      }),
    ).rejects.toMatchObject({ code: 'TBANK_MISCONFIGURED' });
  });
});
