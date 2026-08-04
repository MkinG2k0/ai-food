import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createHash } from 'node:crypto';

const mockVerifyUserToken = vi.fn();
const mockGetPrisma = vi.fn();
const mockIsDb = vi.fn();
const mockInitPayment = vi.fn();
const mockGetPaymentState = vi.fn();
const mockIsTbankMock = vi.fn();
const mockIsTbankConfigured = vi.fn();
const mockActivate = vi.fn();
const mockHasActive = vi.fn();
const mockPublicFields = vi.fn();
const mockPrice = vi.fn();

vi.mock('../lib/jwt.js', () => ({
  verifyUserToken: (...args: unknown[]) => mockVerifyUserToken(...args),
}));

vi.mock('../lib/prisma.js', () => ({
  getPrisma: (...args: unknown[]) => mockGetPrisma(...args),
  isDatabaseConfigured: (...args: unknown[]) => mockIsDb(...args),
}));

vi.mock('../lib/tbank.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/tbank.js')>(
    '../lib/tbank.js',
  );
  return {
    ...actual,
    initPayment: (...args: unknown[]) => mockInitPayment(...args),
    getPaymentState: (...args: unknown[]) => mockGetPaymentState(...args),
    isTbankMock: (...args: unknown[]) => mockIsTbankMock(...args),
    isTbankConfigured: (...args: unknown[]) => mockIsTbankConfigured(...args),
  };
});

vi.mock('../lib/subscription.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/subscription.js')>(
    '../lib/subscription.js',
  );
  return {
    ...actual,
    activateYearLicense: (...args: unknown[]) => mockActivate(...args),
    hasActiveSubscription: (...args: unknown[]) => mockHasActive(...args),
    subscriptionPublicFields: (...args: unknown[]) => mockPublicFields(...args),
    getSubscriptionPriceKopecks: (...args: unknown[]) => mockPrice(...args),
  };
});

import { createApp } from '../app.js';
import { buildTbankToken } from '../lib/tbank.js';

describe('billing routes', () => {
  const paymentStore = new Map<string, Record<string, unknown>>();
  let paymentSeq = 0;

  function mockPrisma() {
    return {
      payment: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          paymentSeq += 1;
          const id = `pay_${paymentSeq}`;
          const row = {
            id,
            ...data,
            tbankOrderId: data.tbankOrderId ?? id,
            status: data.status ?? 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          paymentStore.set(id, row);
          return row;
        }),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id?: string; tbankPaymentId?: string };
            data: Record<string, unknown>;
          }) => {
            const key =
              where.id ??
              [...paymentStore.entries()].find(
                ([, v]) => v.tbankPaymentId === where.tbankPaymentId,
              )?.[0];
            if (!key) throw new Error('not found');
            const next = { ...paymentStore.get(key)!, ...data };
            paymentStore.set(key, next);
            return next;
          },
        ),
        findUnique: vi.fn(
          async ({
            where,
          }: {
            where: { id?: string; tbankPaymentId?: string; tbankOrderId?: string };
          }) => {
            if (where.id) return paymentStore.get(where.id) ?? null;
            if (where.tbankPaymentId) {
              return (
                [...paymentStore.values()].find(
                  (p) => p.tbankPaymentId === where.tbankPaymentId,
                ) ?? null
              );
            }
            if (where.tbankOrderId) {
              return (
                [...paymentStore.values()].find(
                  (p) => p.tbankOrderId === where.tbankOrderId,
                ) ?? null
              );
            }
            return null;
          },
        ),
        findFirst: vi.fn(
          async ({
            where,
          }: {
            where: { userId?: string; status?: string };
            orderBy?: unknown;
          }) => {
            const rows = [...paymentStore.values()].filter((p) => {
              if (where.userId && p.userId !== where.userId) return false;
              if (where.status && p.status !== where.status) return false;
              return true;
            });
            return rows[rows.length - 1] ?? null;
          },
        ),
      },
      user: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          subscriptionStatus: 'none',
          subscriptionExpiresAt: null,
        })),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    paymentStore.clear();
    paymentSeq = 0;
    mockIsDb.mockReturnValue(true);
    mockGetPrisma.mockReturnValue(mockPrisma());
    mockVerifyUserToken.mockResolvedValue({ sub: 'user-1', phone: '+79991234567' });
    mockPrice.mockReturnValue(199000);
    mockIsTbankMock.mockReturnValue(false);
    mockIsTbankConfigured.mockReturnValue(true);
    mockPublicFields.mockReturnValue({
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
      hasActiveSubscription: false,
    });
    mockHasActive.mockReturnValue(false);
    process.env.PUBLIC_APP_URL = 'http://localhost:5173';
    process.env.TBANK_PASSWORD = 'term-pass';
    process.env.TBANK_TERMINAL_KEY = 'term-key';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST /billing/subscribe requires X-User-Token', async () => {
    const res = await request(createApp()).post('/billing/subscribe');
    expect(res.status).toBe(401);
  });

  it('POST /billing/subscribe returns 503 when not configured and not mock', async () => {
    mockIsTbankConfigured.mockReturnValue(false);
    mockIsTbankMock.mockReturnValue(false);
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('TBANK_MISCONFIGURED');
  });

  it('POST /billing/subscribe mock mode returns paymentUrl without Init', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockIsTbankConfigured.mockReturnValue(false);
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.paymentId).toMatch(/^pay_/);
    expect(res.body.paymentUrl).toContain('/subscribe/success');
    expect(res.body.paymentUrl).toContain('mock=1');
    expect(mockInitPayment).not.toHaveBeenCalled();
  });

  it('POST /billing/subscribe real Init stores tbankPaymentId', async () => {
    mockInitPayment.mockResolvedValue({
      paymentId: 'tb-100',
      paymentUrl: 'https://pay.tbank/1',
      status: 'NEW',
    });
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      paymentUrl: 'https://pay.tbank/1',
      paymentId: 'pay_1',
    });
    expect(mockInitPayment).toHaveBeenCalled();
    expect(paymentStore.get('pay_1')?.tbankPaymentId).toBe('tb-100');
  });

  it('POST /billing/tbank/notification CONFIRMED activates license idempotently', async () => {
    const prisma = mockGetPrisma();
    const payment = await prisma.payment.create({
      data: {
        userId: 'user-1',
        amount: 199000,
        status: 'pending',
        tbankOrderId: 'pay_pending',
        tbankPaymentId: 'tb-55',
      },
    });
    // fix id to match order id used in notification
    paymentStore.delete(payment.id);
    const row = { ...payment, id: 'pay_pending', tbankOrderId: 'pay_pending' };
    paymentStore.set('pay_pending', row);

    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_pending',
      PaymentId: 'tb-55',
      Status: 'CONFIRMED',
      Success: true,
      Amount: 199000,
    };
    const token = buildTbankToken(notif, 'term-pass');

    const res1 = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res1.status).toBe(200);
    expect(res1.text).toBe('OK');
    expect(mockActivate).toHaveBeenCalledTimes(1);

    const res2 = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res2.status).toBe(200);
    expect(mockActivate).toHaveBeenCalledTimes(1);
  });

  it('POST /billing/tbank/notification rejects bad Token', async () => {
    const res = await request(createApp())
      .post('/billing/tbank/notification')
      .send({
        TerminalKey: 'term-key',
        OrderId: 'x',
        PaymentId: 'y',
        Status: 'CONFIRMED',
        Success: true,
        Token: createHash('sha256').update('bad').digest('hex'),
      });
    expect(res.status).toBe(403);
  });

  it('GET /billing/status returns subscription snapshot', async () => {
    mockPublicFields.mockReturnValue({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
      hasActiveSubscription: true,
    });
    mockHasActive.mockReturnValue(true);
    const res = await request(createApp())
      .get('/billing/status')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body.hasActiveSubscription).toBe(true);
    expect(res.body.subscriptionExpiresAt).toBe('2027-01-01T00:00:00.000Z');
  });
});
