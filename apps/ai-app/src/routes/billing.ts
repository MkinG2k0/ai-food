import { Router } from 'express';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { verifyUserToken } from '../lib/jwt.js';
import {
  activateYearLicense,
  getSubscriptionDurationDays,
  getSubscriptionPriceKopecks,
  subscriptionPublicFields,
} from '../lib/subscription.js';
import {
  getPaymentState,
  initPayment,
  isTbankConfigured,
  isTbankMock,
  verifyTbankToken,
} from '../lib/tbank.js';
import { resolvePromo } from '../lib/promos.js';

function requireDb() {
  if (!isDatabaseConfigured()) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'DATABASE_URL is not configured.',
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'Database client is not available.',
    );
  }
  return prisma;
}

async function requireUser(req: { header: (name: string) => string | undefined }) {
  const header = req.header('x-user-token')?.trim();
  if (!header) {
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
  }
  const payload = await verifyUserToken(header);
  const prisma = requireDb();
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
  }
  return { prisma, user, payload };
}

async function resolveSubscribeAmount(
  prisma: PrismaClient | null,
  promoCodeRaw: unknown,
): Promise<{
  amount: number;
  originalAmount: number;
  promoCode: string | null;
}> {
  const originalAmount = await getSubscriptionPriceKopecks(prisma);
  if (promoCodeRaw == null) {
    return { amount: originalAmount, originalAmount, promoCode: null };
  }
  if (typeof promoCodeRaw !== 'string') {
    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
  }
  const resolved = await resolvePromo(prisma, promoCodeRaw, originalAmount);
  if (!resolved) {
    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
  }
  return {
    amount: resolved.finalAmount,
    originalAmount: resolved.originalAmount,
    promoCode: resolved.code,
  };
}

function publicAppUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
    'http://localhost:5173'
  );
}

function gatewayPublicBase(req: {
  protocol: string;
  get: (name: string) => string | undefined;
}): string {
  const proto = req.get('x-forwarded-proto') ?? req.protocol;
  const host = req.get('x-forwarded-host') ?? req.get('host');
  if (host) return `${proto}://${host}`;
  return publicAppUrl();
}

export const billingRouter = Router();

billingRouter.get(
  '/price',
  asyncHandler(async (_req, res) => {
    const prisma = getPrisma();
    res.json({
      amountKopecks: await getSubscriptionPriceKopecks(prisma),
      currency: 'RUB',
      durationDays: await getSubscriptionDurationDays(prisma),
    });
  }),
);

billingRouter.post(
  '/promo/validate',
  asyncHandler(async (req, res) => {
    const { prisma } = await requireUser(req);
    const originalAmount = await getSubscriptionPriceKopecks(prisma);
    const raw = req.body?.promoCode;
    if (typeof raw !== 'string') {
      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
    }
    const resolved = await resolvePromo(prisma, raw, originalAmount);
    if (!resolved) {
      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
    }
    res.json({
      valid: true,
      code: resolved.code,
      discountPercent: resolved.discountPercent,
      originalAmount: resolved.originalAmount,
      finalAmount: resolved.finalAmount,
    });
  }),
);

billingRouter.post(
  '/subscribe',
  asyncHandler(async (req, res) => {
    const { prisma, user } = await requireUser(req);

    if (!isTbankMock() && !isTbankConfigured()) {
      throw new ApiError(
        503,
        'TBANK_MISCONFIGURED',
        'T-Bank terminal keys are not configured. Set TBANK_TERMINAL_KEY and TBANK_PASSWORD, or TBANK_MOCK=true for local development.',
      );
    }

    const { amount, originalAmount, promoCode } =
      await resolveSubscribeAmount(prisma, req.body?.promoCode);
    // Create then set tbankOrderId = Payment.id (D-05 OrderId)
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        status: 'pending',
        tbankOrderId: `tmp_${crypto.randomUUID()}`,
      },
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { tbankOrderId: payment.id },
    });

    const appUrl = publicAppUrl();
    const successUrl = `${appUrl}/subscribe/success?paymentId=${updated.id}`;
    const failUrl = `${appUrl}/subscribe/fail?paymentId=${updated.id}`;
    const notificationUrl = `${gatewayPublicBase(req)}/billing/tbank/notification`;

    if (isTbankMock()) {
      const mockTbankId = `mock_${updated.id}`;
      await prisma.payment.update({
        where: { id: updated.id },
        data: { tbankPaymentId: mockTbankId },
      });
      const paymentUrl = `${appUrl}/subscribe/success?mock=1&paymentId=${updated.id}`;
      res.json({
        paymentUrl,
        paymentId: updated.id,
        amount,
        originalAmount,
        promoCode,
      });
      return;
    }

    const init = await initPayment({
      amount,
      orderId: updated.id,
      customerKey: user.id,
      description: 'AI Food — годовая лицензия',
      notificationUrl,
      successUrl,
      failUrl,
    });

    await prisma.payment.update({
      where: { id: updated.id },
      data: { tbankPaymentId: init.paymentId },
    });

    res.json({
      paymentUrl: init.paymentUrl,
      paymentId: updated.id,
      amount,
      originalAmount,
      promoCode,
    });
  }),
);

billingRouter.post(
  '/tbank/notification',
  asyncHandler(async (req, res) => {
    const password = process.env.TBANK_PASSWORD?.trim();
    if (!password && !isTbankMock()) {
      throw new ApiError(
        503,
        'TBANK_MISCONFIGURED',
        'TBANK_PASSWORD is not configured.',
      );
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (password) {
      if (!verifyTbankToken(body, password)) {
        throw new ApiError(403, 'INVALID_TBANK_TOKEN', 'Invalid T-Bank notification Token.');
      }
    } else if (!isTbankMock()) {
      throw new ApiError(403, 'INVALID_TBANK_TOKEN', 'Invalid T-Bank notification Token.');
    }

    const status = String(body.Status ?? '');
    const orderId = body.OrderId != null ? String(body.OrderId) : '';
    const tbankPaymentId =
      body.PaymentId != null ? String(body.PaymentId) : undefined;

    if (!orderId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'OrderId is required.');
    }

    const prisma = requireDb();
    const payment =
      (await prisma.payment.findUnique({ where: { tbankOrderId: orderId } })) ??
      (await prisma.payment.findUnique({ where: { id: orderId } }));

    if (!payment) {
      // Acknowledge unknown orders to stop retries, but do not activate
      res.status(200).send('OK');
      return;
    }

    if (status === 'CONFIRMED') {
      if (payment.status === 'confirmed') {
        res.status(200).send('OK');
        return;
      }

      const paidAt = new Date();
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'confirmed',
          paidAt,
          ...(tbankPaymentId ? { tbankPaymentId } : {}),
        },
      });
      await activateYearLicense(prisma, payment.userId, paidAt);
      res.status(200).send('OK');
      return;
    }

    if (status === 'REJECTED' || status === 'CANCELED' || status === 'DEADLINE_EXPIRED') {
      if (payment.status === 'pending') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'rejected' },
        });
      }
    }

    res.status(200).send('OK');
  }),
);

billingRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const { prisma, user } = await requireUser(req);
    const latest = await prisma.payment.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    const fields = subscriptionPublicFields(user);
    res.json({
      ...fields,
      latestPayment: latest
        ? {
            id: latest.id,
            status: latest.status,
            amount: latest.amount,
            paidAt: latest.paidAt?.toISOString() ?? null,
            createdAt: latest.createdAt.toISOString(),
          }
        : null,
    });
  }),
);

billingRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const { prisma, user } = await requireUser(req);
    const paymentId =
      typeof req.body?.paymentId === 'string' ? req.body.paymentId : undefined;

    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : await prisma.payment.findFirst({
          where: { userId: user.id, status: 'pending' },
          orderBy: { createdAt: 'desc' },
        });

    if (!payment || payment.userId !== user.id) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Pending payment not found.');
    }

    if (payment.status === 'confirmed') {
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      res.json({
        paymentId: payment.id,
        paymentStatus: payment.status,
        ...(fresh ? subscriptionPublicFields(fresh) : {}),
      });
      return;
    }

    if (isTbankMock()) {
      // Mock sync: treat as CONFIRMED for local success flow
      const paidAt = new Date();
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'confirmed', paidAt },
      });
      await activateYearLicense(prisma, user.id, paidAt);
      const fresh = await prisma.user.findUnique({ where: { id: user.id } });
      res.json({
        paymentId: payment.id,
        paymentStatus: 'confirmed',
        ...(fresh ? subscriptionPublicFields(fresh) : {}),
      });
      return;
    }

    if (!payment.tbankPaymentId) {
      throw new ApiError(
        400,
        'PAYMENT_NOT_INITIATED',
        'Payment has no T-Bank PaymentId yet.',
      );
    }

    if (!isTbankConfigured()) {
      throw new ApiError(
        503,
        'TBANK_MISCONFIGURED',
        'T-Bank terminal keys are not configured.',
      );
    }

    const state = await getPaymentState(payment.tbankPaymentId);
    if (state.status === 'CONFIRMED') {
      const paidAt = new Date();
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'confirmed', paidAt },
      });
      await activateYearLicense(prisma, user.id, paidAt);
    }

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    res.json({
      paymentId: payment.id,
      paymentStatus:
        state.status === 'CONFIRMED' ? 'confirmed' : payment.status,
      tbankStatus: state.status,
      ...(fresh ? subscriptionPublicFields(fresh) : {}),
    });
  }),
);

/** Confirm mock payment from success page when TBANK_MOCK=true. */
billingRouter.post(
  '/mock/confirm',
  asyncHandler(async (req, res) => {
    if (!isTbankMock()) {
      throw new ApiError(404, 'NOT_FOUND', 'Mock confirm only available when TBANK_MOCK=true.');
    }
    const { prisma, user } = await requireUser(req);
    const paymentId =
      typeof req.body?.paymentId === 'string' ? req.body.paymentId : undefined;
    if (!paymentId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'paymentId is required.');
    }
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== user.id) {
      throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found.');
    }
    if (payment.status === 'confirmed') {
      res.json({ ok: true, alreadyConfirmed: true });
      return;
    }
    const paidAt = new Date();
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'confirmed', paidAt },
    });
    await activateYearLicense(prisma, user.id, paidAt);
    res.json({ ok: true });
  }),
);
