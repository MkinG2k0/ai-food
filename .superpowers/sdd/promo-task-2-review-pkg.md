# Review package Task 2
BASE: 04f59f6f7521d68a65da03ca69586cefab67a397
HEAD: 1e6ffddb9912e4792d3c2a76f086852fafa9758b

## Commits


## Stat
 apps/ai-app/src/routes/billing.test.ts | 55 ++++++++++++++++++++++++++++
 apps/ai-app/src/routes/billing.ts      | 67 ++++++++++++++++++++++++++++++++--
 2 files changed, 119 insertions(+), 3 deletions(-)


## Diff
diff --git a/apps/ai-app/src/routes/billing.test.ts b/apps/ai-app/src/routes/billing.test.ts
index 4603de3..f81e710 100644
--- a/apps/ai-app/src/routes/billing.test.ts
+++ b/apps/ai-app/src/routes/billing.test.ts
@@ -204,20 +204,23 @@ describe('billing routes', () => {
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
+      amount: 10_000,
+      originalAmount: 10_000,
+      promoCode: null,
     });
     expect(mockInitPayment).toHaveBeenCalled();
     expect(paymentStore.get('pay_1')?.tbankPaymentId).toBe('tb-100');
   });
 
   it('POST /billing/tbank/notification CONFIRMED activates license idempotently', async () => {
     const prisma = mockGetPrisma();
     const payment = await prisma.payment.create({
       data: {
         userId: 'user-1',
@@ -284,20 +287,72 @@ describe('billing routes', () => {
 
   it('GET /billing/price reflects env helpers', async () => {
     mockPrice.mockReturnValue(250_000);
     mockDuration.mockReturnValue(30);
     const res = await request(createApp()).get('/billing/price');
     expect(res.status).toBe(200);
     expect(res.body.amountKopecks).toBe(250_000);
     expect(res.body.durationDays).toBe(30);
   });
 
+  it('POST /billing/promo/validate returns discounted amounts for new80', async () => {
+    mockPrice.mockReturnValue(10_000);
+    const res = await request(createApp())
+      .post('/billing/promo/validate')
+      .set('X-User-Token', 'jwt')
+      .send({ promoCode: ' New80 ' });
+    expect(res.status).toBe(200);
+    expect(res.body).toEqual({
+      valid: true,
+      code: 'new80',
+      discountPercent: 80,
+      originalAmount: 10_000,
+      finalAmount: 2_000,
+    });
+  });
+
+  it('POST /billing/promo/validate rejects unknown code', async () => {
+    const res = await request(createApp())
+      .post('/billing/promo/validate')
+      .set('X-User-Token', 'jwt')
+      .send({ promoCode: 'nope' });
+    expect(res.status).toBe(400);
+    expect(res.body.code).toBe('INVALID_PROMO');
+  });
+
+  it('POST /billing/subscribe with new50 stores discounted amount', async () => {
+    mockIsTbankMock.mockReturnValue(true);
+    mockPrice.mockReturnValue(10_000);
+    const res = await request(createApp())
+      .post('/billing/subscribe')
+      .set('X-User-Token', 'jwt')
+      .send({ promoCode: 'new50' });
+    expect(res.status).toBe(200);
+    expect(res.body.amount).toBe(5_000);
+    expect(res.body.originalAmount).toBe(10_000);
+    expect(res.body.promoCode).toBe('new50');
+    expect(paymentStore.get(res.body.paymentId)?.amount).toBe(5_000);
+  });
+
+  it('POST /billing/subscribe with bad promo does not create payment', async () => {
+    mockIsTbankMock.mockReturnValue(true);
+    mockPrice.mockReturnValue(10_000);
+    const before = paymentStore.size;
+    const res = await request(createApp())
+      .post('/billing/subscribe')
+      .set('X-User-Token', 'jwt')
+      .send({ promoCode: 'bad' });
+    expect(res.status).toBe(400);
+    expect(res.body.code).toBe('INVALID_PROMO');
+    expect(paymentStore.size).toBe(before);
+  });
+
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
diff --git a/apps/ai-app/src/routes/billing.ts b/apps/ai-app/src/routes/billing.ts
index 05fdb90..cff0821 100644
--- a/apps/ai-app/src/routes/billing.ts
+++ b/apps/ai-app/src/routes/billing.ts
@@ -9,20 +9,21 @@ import {
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
+import { resolvePromo } from '../lib/promos.js';
 
 function requireDb() {
   if (!isDatabaseConfigured()) {
     throw new ApiError(
       503,
       'DATABASE_UNAVAILABLE',
       'DATABASE_URL is not configured.',
     );
   }
   const prisma = getPrisma();
@@ -43,20 +44,43 @@ async function requireUser(req: { header: (name: string) => string | undefined }
   }
   const payload = await verifyUserToken(header);
   const prisma = requireDb();
   const user = await prisma.user.findUnique({ where: { id: payload.sub } });
   if (!user) {
     throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
   }
   return { prisma, user, payload };
 }
 
+function resolveSubscribeAmount(promoCodeRaw: unknown): {
+  amount: number;
+  originalAmount: number;
+  promoCode: string | null;
+} {
+  const originalAmount = getSubscriptionPriceKopecks();
+  if (promoCodeRaw == null || promoCodeRaw === '') {
+    return { amount: originalAmount, originalAmount, promoCode: null };
+  }
+  if (typeof promoCodeRaw !== 'string') {
+    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
+  }
+  const resolved = resolvePromo(promoCodeRaw, originalAmount);
+  if (!resolved) {
+    throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
+  }
+  return {
+    amount: resolved.finalAmount,
+    originalAmount: resolved.originalAmount,
+    promoCode: resolved.code,
+  };
+}
+
 function publicAppUrl(): string {
   return (
     process.env.PUBLIC_APP_URL?.trim().replace(/\/$/, '') ||
     'http://localhost:5173'
   );
 }
 
 function gatewayPublicBase(req: {
   protocol: string;
   get: (name: string) => string | undefined;
@@ -73,34 +97,59 @@ billingRouter.get(
   '/price',
   asyncHandler(async (_req, res) => {
     res.json({
       amountKopecks: getSubscriptionPriceKopecks(),
       currency: 'RUB',
       durationDays: getSubscriptionDurationDays(),
     });
   }),
 );
 
+billingRouter.post(
+  '/promo/validate',
+  asyncHandler(async (req, res) => {
+    await requireUser(req);
+    const originalAmount = getSubscriptionPriceKopecks();
+    const raw = req.body?.promoCode;
+    if (typeof raw !== 'string') {
+      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
+    }
+    const resolved = resolvePromo(raw, originalAmount);
+    if (!resolved) {
+      throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
+    }
+    res.json({
+      valid: true,
+      code: resolved.code,
+      discountPercent: resolved.discountPercent,
+      originalAmount: resolved.originalAmount,
+      finalAmount: resolved.finalAmount,
+    });
+  }),
+);
+
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
 
-    const amount = getSubscriptionPriceKopecks();
+    const { amount, originalAmount, promoCode } = resolveSubscribeAmount(
+      req.body?.promoCode,
+    );
     // Create then set tbankOrderId = Payment.id (D-05 OrderId)
     const payment = await prisma.payment.create({
       data: {
         userId: user.id,
         amount,
         status: 'pending',
         tbankOrderId: `tmp_${crypto.randomUUID()}`,
       },
     });
 
@@ -114,40 +163,52 @@ billingRouter.post(
     const failUrl = `${appUrl}/subscribe/fail?paymentId=${updated.id}`;
     const notificationUrl = `${gatewayPublicBase(req)}/billing/tbank/notification`;
 
     if (isTbankMock()) {
       const mockTbankId = `mock_${updated.id}`;
       await prisma.payment.update({
         where: { id: updated.id },
         data: { tbankPaymentId: mockTbankId },
       });
       const paymentUrl = `${appUrl}/subscribe/success?mock=1&paymentId=${updated.id}`;
-      res.json({ paymentUrl, paymentId: updated.id });
+      res.json({
+        paymentUrl,
+        paymentId: updated.id,
+        amount,
+        originalAmount,
+        promoCode,
+      });
       return;
     }
 
     const init = await initPayment({
       amount,
       orderId: updated.id,
       customerKey: user.id,
       description: 'AI Food тАФ ╨│╨╛╨┤╨╛╨▓╨░╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╤П',
       notificationUrl,
       successUrl,
       failUrl,
     });
 
     await prisma.payment.update({
       where: { id: updated.id },
       data: { tbankPaymentId: init.paymentId },
     });
 
-    res.json({ paymentUrl: init.paymentUrl, paymentId: updated.id });
+    res.json({
+      paymentUrl: init.paymentUrl,
+      paymentId: updated.id,
+      amount,
+      originalAmount,
+      promoCode,
+    });
   }),
 );
 
 billingRouter.post(
   '/tbank/notification',
   asyncHandler(async (req, res) => {
     const password = process.env.TBANK_PASSWORD?.trim();
     if (!password && !isTbankMock()) {
       throw new ApiError(
         503,

