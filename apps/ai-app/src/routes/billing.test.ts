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
const mockDuration = vi.fn();

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
    getSubscriptionDurationDays: (...args: unknown[]) => mockDuration(...args),
  };
});

import { createApp } from '../app.js';
import { buildTbankToken } from '../lib/tbank.js';

describe('billing routes', () => {
  const paymentStore = new Map<string, Record<string, unknown>>();
  const promoStore = new Map<string, { id: string; code: string; discountPercent: number }>();
  const userStore = new Map<string, Record<string, unknown>>();
  let paymentSeq = 0;

  function mockPrisma() {
    const prisma = {
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
        count: vi.fn(
          async ({
            where,
          }: {
            where: { promoCode?: string; status?: string };
          }) =>
            [...paymentStore.values()].filter((p) => {
              if (where.promoCode && p.promoCode !== where.promoCode) return false;
              if (where.status && p.status !== where.status) return false;
              return true;
            }).length,
        ),
      },
      user: {
        findUnique: vi.fn(
          async ({
            where,
          }: {
            where: { id?: string; referralCode?: string };
          }) => {
            if (where.referralCode) {
              return (
                [...userStore.values()].find(
                  (u) => u.referralCode === where.referralCode,
                ) ?? null
              );
            }
            if (where.id) {
              return (
                userStore.get(where.id) ?? {
                  id: where.id,
                  username: null,
                  referralCode: null,
                  subscriptionStatus: 'none',
                  subscriptionExpiresAt: null,
                }
              );
            }
            return null;
          },
        ),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            const prev = userStore.get(where.id) ?? {
              id: where.id,
              username: null,
              referralCode: null,
              subscriptionStatus: 'none',
              subscriptionExpiresAt: null,
            };
            const next = { ...prev, ...data };
            userStore.set(where.id, next);
            return next;
          },
        ),
      },
      promoCode: {
        findUnique: vi.fn(
          async ({ where }: { where: { code: string } }) =>
            promoStore.get(where.code) ?? null,
        ),
      },
      $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
        fn(prisma),
      ),
    };
    return prisma;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    paymentStore.clear();
    promoStore.clear();
    userStore.clear();
    userStore.set('user-1', {
      id: 'user-1',
      username: 'alice',
      referralCode: null,
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    promoStore.set('new80', {
      id: 'promo-new80',
      code: 'new80',
      discountPercent: 80,
    });
    promoStore.set('new50', {
      id: 'promo-new50',
      code: 'new50',
      discountPercent: 50,
    });
    paymentSeq = 0;
    mockIsDb.mockReturnValue(true);
    mockGetPrisma.mockReturnValue(mockPrisma());
    mockVerifyUserToken.mockResolvedValue({ sub: 'user-1', telegramId: '42' });
    mockPrice.mockResolvedValue(10_000);
    mockDuration.mockResolvedValue(365);
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
      amount: 10_000,
      originalAmount: 10_000,
      promoCode: null,
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

  it('GET /billing/price returns amount and duration without auth', async () => {
    mockPrice.mockResolvedValue(10_000);
    mockDuration.mockResolvedValue(365);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      amountKopecks: 10_000,
      currency: 'RUB',
      durationDays: 365,
    });
  });

  it('GET /billing/price reflects env helpers', async () => {
    mockPrice.mockResolvedValue(250_000);
    mockDuration.mockResolvedValue(30);
    const res = await request(createApp()).get('/billing/price');
    expect(res.status).toBe(200);
    expect(res.body.amountKopecks).toBe(250_000);
    expect(res.body.durationDays).toBe(30);
  });

  it('POST /billing/promo/validate returns discounted amounts for new80', async () => {
    mockPrice.mockResolvedValue(10_000);
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: ' New80 ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      valid: true,
      code: 'new80',
      discountPercent: 80,
      originalAmount: 10_000,
      finalAmount: 2_000,
    });
  });

  it('POST /billing/promo/validate rejects unknown code', async () => {
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PROMO');
  });

  it('POST /billing/subscribe with new50 stores discounted amount', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockPrice.mockResolvedValue(10_000);
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'new50' });
    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(5_000);
    expect(res.body.originalAmount).toBe(10_000);
    expect(res.body.promoCode).toBe('new50');
    expect(paymentStore.get(res.body.paymentId)?.amount).toBe(5_000);
    expect(paymentStore.get(res.body.paymentId)?.promoCode).toBe('new50');
  });

  it('POST /billing/subscribe with bad promo does not create payment', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockPrice.mockResolvedValue(10_000);
    const before = paymentStore.size;
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PROMO');
    expect(paymentStore.size).toBe(before);
  });

  it('POST /billing/subscribe with empty promoCode rejects INVALID_PROMO', async () => {
    mockIsTbankMock.mockReturnValue(true);
    mockPrice.mockResolvedValue(10_000);
    const before = paymentStore.size;
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_PROMO');
    expect(paymentStore.size).toBe(before);
  });

  it('GET /billing/referral without token returns 401', async () => {
    const res = await request(createApp()).get('/billing/referral');
    expect(res.status).toBe(401);
  });

  it('GET /billing/referral returns code and confirmed conversion count', async () => {
    userStore.set('user-1', {
      id: 'user-1',
      username: 'alice',
      referralCode: 'alice',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const prisma = mockGetPrisma();
    await prisma.payment.create({
      data: {
        userId: 'other',
        amount: 9_000,
        status: 'confirmed',
        promoCode: 'alice',
        tbankOrderId: 'pay_ref_1',
      },
    });
    await prisma.payment.create({
      data: {
        userId: 'other',
        amount: 9_000,
        status: 'pending',
        promoCode: 'alice',
        tbankOrderId: 'pay_ref_2',
      },
    });
    const res = await request(createApp())
      .get('/billing/referral')
      .set('X-User-Token', 'jwt');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ code: 'alice', conversionCount: 1 });
  });

  it('POST /billing/promo/validate accepts a referral nick at 10%', async () => {
    userStore.set('ref-1', {
      id: 'ref-1',
      username: 'bob',
      referralCode: 'bob',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      valid: true,
      code: 'bob',
      discountPercent: 10,
      originalAmount: 10_000,
      finalAmount: 9_000,
    });
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

  it('POST /billing/promo/validate rejects own referralCode as SELF_REFERRAL', async () => {
    userStore.set('user-1', {
      id: 'user-1',
      username: 'alice',
      referralCode: 'alice',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const res = await request(createApp())
      .post('/billing/promo/validate')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_REFERRAL');
    expect(res.body.message).toBe('Нельзя использовать свой промокод');
  });

  it('POST /billing/subscribe rejects own referralCode as SELF_REFERRAL', async () => {
    mockIsTbankMock.mockReturnValue(true);
    userStore.set('user-1', {
      id: 'user-1',
      username: 'alice',
      referralCode: 'alice',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const before = paymentStore.size;
    const res = await request(createApp())
      .post('/billing/subscribe')
      .set('X-User-Token', 'jwt')
      .send({ promoCode: 'alice' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('SELF_REFERRAL');
    expect(paymentStore.size).toBe(before);
  });

  it('CONFIRMED notification grants referrer 30 days once', async () => {
    userStore.set('ref-1', {
      id: 'ref-1',
      username: 'bob',
      referralCode: 'bob',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const prisma = mockGetPrisma();
    const payment = await prisma.payment.create({
      data: {
        userId: 'user-1',
        amount: 9_000,
        status: 'pending',
        promoCode: 'bob',
        tbankOrderId: 'pay_ref_grant',
        tbankPaymentId: 'tb-ref',
        referralGrantedAt: null,
      },
    });
    paymentStore.delete(payment.id);
    paymentStore.set('pay_ref_grant', {
      ...payment,
      id: 'pay_ref_grant',
      tbankOrderId: 'pay_ref_grant',
    });

    const notif = {
      TerminalKey: 'term-key',
      OrderId: 'pay_ref_grant',
      PaymentId: 'tb-ref',
      Status: 'CONFIRMED',
      Success: true,
      Amount: 9000,
    };
    const token = buildTbankToken(notif, 'term-pass');

    const res1 = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res1.status).toBe(200);
    expect(mockActivate).toHaveBeenCalledTimes(1);
    const expiry1 = userStore.get('ref-1')?.subscriptionExpiresAt as Date;
    expect(userStore.get('ref-1')?.subscriptionStatus).toBe('active');
    expect(expiry1).toBeInstanceOf(Date);
    expect(paymentStore.get('pay_ref_grant')?.referralGrantedAt).toBeInstanceOf(
      Date,
    );

    const res2 = await request(createApp())
      .post('/billing/tbank/notification')
      .send({ ...notif, Token: token });
    expect(res2.status).toBe(200);
    expect(mockActivate).toHaveBeenCalledTimes(1);
    expect(userStore.get('ref-1')?.subscriptionExpiresAt).toEqual(expiry1);
  });

  it('already-confirmed sync and mock/confirm still grant once', async () => {
    mockIsTbankMock.mockReturnValue(true);
    userStore.set('ref-1', {
      id: 'ref-1',
      username: 'bob',
      referralCode: 'bob',
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });
    const prisma = mockGetPrisma();
    await prisma.payment.create({
      data: {
        userId: 'user-1',
        amount: 9_000,
        status: 'confirmed',
        promoCode: 'bob',
        tbankOrderId: 'pay_1',
        referralGrantedAt: null,
      },
    });

    const sync = await request(createApp())
      .post('/billing/sync')
      .set('X-User-Token', 'jwt')
      .send({ paymentId: 'pay_1' });
    expect(sync.status).toBe(200);
    expect(userStore.get('ref-1')?.subscriptionStatus).toBe('active');
    const expiry = userStore.get('ref-1')?.subscriptionExpiresAt as Date;

    const mockConfirm = await request(createApp())
      .post('/billing/mock/confirm')
      .set('X-User-Token', 'jwt')
      .send({ paymentId: 'pay_1' });
    expect(mockConfirm.status).toBe(200);
    expect(mockConfirm.body.alreadyConfirmed).toBe(true);
    expect(userStore.get('ref-1')?.subscriptionExpiresAt).toEqual(expiry);
  });
});
