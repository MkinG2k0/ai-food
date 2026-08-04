# Final review package — Promo Codes
MERGE_BASE (pre Task1): 4692d315ef2c71108671c7e50ef2d9655c84d399
HEAD: eb422bf3677792cc40a79566bd652fc886507d68
Scope: promo-related paths only (legal/other commits interleaved on master excluded from this diff)

## Promo commits


## Stat
 .../specs/2026-08-04-promo-codes-design.md         | 120 +++++++++++++++++++++
 apps/ai-app/src/lib/promos.test.ts                 |  44 ++++++++
 apps/ai-app/src/lib/promos.ts                      |  51 +++++++++
 apps/ai-app/src/routes/billing.test.ts             |  55 ++++++++++
 apps/ai-app/src/routes/billing.ts                  |  67 +++++++++++-
 apps/ai-food/docs/AI-GATEWAY.md                    |   3 +-
 .../src/features/billing/api/billingApi.test.ts    |  62 ++++++++++-
 .../ai-food/src/features/billing/api/billingApi.ts |  30 +++++-
 apps/ai-food/src/features/billing/index.ts         |   2 +
 .../src/pages/subscribe/ui/SubscribePage.tsx       | 117 ++++++++++++++++----
 10 files changed, 527 insertions(+), 24 deletions(-)


## Diff
diff --git a/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md b/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md
new file mode 100644
index 0000000..7ece86b
--- /dev/null
+++ b/apps/ai-app/docs/superpowers/specs/2026-08-04-promo-codes-design.md
@@ -0,0 +1,120 @@
+# Promo Codes on Subscribe
+
+**Date:** 2026-08-04  
+**Status:** Approved тАФ implemented  
+**Repos:** `ai-app` (gateway) + `ai-food` (subscribe UI)  
+**Approach:** A тАФ hardcoded catalog on gateway; validate endpoint + discounted subscribe
+
+## Goal
+
+Let users enter a promo code on `/subscribe`, preview the discounted price, and pay the reduced amount through the existing T-Bank / mock flow. Catalog lives in gateway code (no DB).
+
+## Non-goals
+
+- Persisting promo usage or catalog in Postgres / Prisma
+- Per-user or global redemption limits
+- Admin UI for managing codes
+- Fixed-amount (ruble) discounts тАФ percent only
+- Changing license duration or guest quota rules
+
+## Product rules
+
+| Code (case-insensitive) | Discount |
+|-------------------------|----------|
+| `new80` | 80% |
+| `new50` | 50% |
+
+- **No usage limits** тАФ any authenticated user may apply a valid code on every new payment.
+- Normalize: `trim` + lowercase before lookup.
+- Empty / unknown code тЖТ reject (`INVALID_PROMO`); do not create a payment.
+- Missing `promoCode` on subscribe тЖТ full list price (unchanged behavior).
+
+**Price formula (kopecks):**
+
+```
+original = getSubscriptionPriceKopecks()
+final = max(1, floor(original * (100 - discountPercent) / 100))
+```
+
+Minimum **1** kopeck so T-Bank Init never receives `0`.
+
+## Architecture
+
+```mermaid
+sequenceDiagram
+  participant UI as ai-food /subscribe
+  participant GW as ai-app /billing
+  participant TB as T-Bank / mock
+
+  UI->>GW: POST /billing/promo/validate { promoCode }
+  GW-->>UI: originalAmount, finalAmount, discountPercent
+  UI->>UI: show strikethrough + discounted price
+  UI->>GW: POST /billing/subscribe { promoCode? }
+  GW->>GW: resolve same final amount
+  GW->>TB: Init(amount = final)
+  GW-->>UI: paymentUrl, amount, originalAmount, promoCode
+```
+
+Source of truth for discounts is **only** the gateway catalog. Client never computes the paid amount.
+
+## API
+
+### `POST /billing/promo/validate`
+
+- Auth: `X-User-Token`
+- Body: `{ "promoCode": string }`
+- Success `200`:
+
+```json
+{
+  "valid": true,
+  "code": "new80",
+  "discountPercent": 80,
+  "originalAmount": 10000,
+  "finalAmount": 2000
+}
+```
+
+- Failure: `400 INVALID_PROMO` (empty, whitespace-only, or unknown after normalize)
+
+### `POST /billing/subscribe` (extend)
+
+- Body may include optional `promoCode`.
+- On valid promo: `Payment.amount = finalAmount`; Init/mock uses that amount.
+- On invalid promo: `400 INVALID_PROMO`, no `Payment` row.
+- Response adds: `amount`, `originalAmount`, `promoCode` (`null` if none). Existing `paymentUrl` / `paymentId` unchanged.
+
+No Prisma migration: do not store promo on `Payment`.
+
+## Code map
+
+| Area | Change |
+|------|--------|
+| `apps/ai-app/src/lib/promos.ts` | Catalog + `resolvePromo(code)` / amount helper |
+| `apps/ai-app/src/routes/billing.ts` | `POST /promo/validate`; subscribe reads `promoCode` |
+| `apps/ai-app` tests | Unit + route cases below |
+| `apps/ai-food` billing API | `validatePromo`, `subscribe(promoCode?)` |
+| `apps/ai-food` `SubscribePage` | Input + Apply + price preview |
+
+## UI (`/subscribe`)
+
+- Under the price block: text field ┬л╨Я╤А╨╛╨╝╨╛╨║╨╛╨┤┬╗ + button ┬л╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М┬╗.
+- Before apply: show full price (current copy; after apply use amounts from validate).
+- After successful apply: strikethrough original, show `finalAmount`, indicate percent off; keep applied code in state.
+- Invalid code: error toast / field error; clear applied discount.
+- If the user edits the field after a successful apply, clear applied state until they Apply again.
+- ┬л╨Ю╨┐╨╗╨░╤В╨╕╤В╤М┬╗ sends `promoCode` only when apply succeeded for the current field value.
+- Unauthenticated: same as pay today тАФ validate/subscribe need login (redirect / existing copy).
+
+## Testing
+
+- `new80` / `new50` тЖТ correct `finalAmount` for default and custom `SUBSCRIPTION_PRICE_KOPECKS`
+- ` New80 ` normalizes and succeeds
+- Unknown / empty тЖТ `INVALID_PROMO`
+- Subscribe with promo тЖТ `Payment.amount` equals discounted amount
+- Subscribe without promo тЖТ full price
+- Subscribe with bad promo тЖТ 400, no payment created
+
+## Env / ops
+
+No new env vars. Codes change by editing `promos.ts` and redeploying gateway.
diff --git a/apps/ai-app/src/lib/promos.test.ts b/apps/ai-app/src/lib/promos.test.ts
new file mode 100644
index 0000000..7895ea1
--- /dev/null
+++ b/apps/ai-app/src/lib/promos.test.ts
@@ -0,0 +1,44 @@
+import { describe, it, expect } from 'vitest';
+import {
+  normalizePromoCode,
+  lookupPromo,
+  applyPromoDiscount,
+  resolvePromo,
+} from './promos.js';
+
+describe('promos', () => {
+  it('normalizePromoCode trims and lowercases', () => {
+    expect(normalizePromoCode(' New80 ')).toBe('new80');
+  });
+
+  it('lookupPromo finds new80 and new50', () => {
+    expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
+    expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
+  });
+
+  it('lookupPromo returns null for unknown', () => {
+    expect(lookupPromo('nope')).toBeNull();
+    expect(lookupPromo('')).toBeNull();
+    expect(lookupPromo('   ')).toBeNull();
+  });
+
+  it('applyPromoDiscount floors and clamps to min 1', () => {
+    expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
+    expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
+    expect(applyPromoDiscount(1, 80)).toBe(1);
+    expect(applyPromoDiscount(3, 80)).toBe(1);
+  });
+
+  it('resolvePromo returns amounts for valid code', () => {
+    expect(resolvePromo(' new80 ', 10_000)).toEqual({
+      code: 'new80',
+      discountPercent: 80,
+      originalAmount: 10_000,
+      finalAmount: 2_000,
+    });
+  });
+
+  it('resolvePromo returns null for invalid', () => {
+    expect(resolvePromo('x', 10_000)).toBeNull();
+  });
+});
diff --git a/apps/ai-app/src/lib/promos.ts b/apps/ai-app/src/lib/promos.ts
new file mode 100644
index 0000000..fabcf98
--- /dev/null
+++ b/apps/ai-app/src/lib/promos.ts
@@ -0,0 +1,51 @@
+export type PromoDefinition = {
+  code: string;
+  discountPercent: number;
+};
+
+export type ResolvedPromo = {
+  code: string;
+  discountPercent: number;
+  originalAmount: number;
+  finalAmount: number;
+};
+
+const PROMOS: Record<string, PromoDefinition> = {
+  new80: { code: 'new80', discountPercent: 80 },
+  new50: { code: 'new50', discountPercent: 50 },
+};
+
+export function normalizePromoCode(raw: string): string {
+  return raw.trim().toLowerCase();
+}
+
+export function lookupPromo(raw: string): PromoDefinition | null {
+  const key = normalizePromoCode(raw);
+  if (!key) return null;
+  return PROMOS[key] ?? null;
+}
+
+/** finalAmount in kopecks; never below 1. */
+export function applyPromoDiscount(
+  originalAmount: number,
+  discountPercent: number,
+): number {
+  const discounted = Math.floor(
+    (originalAmount * (100 - discountPercent)) / 100,
+  );
+  return Math.max(1, discounted);
+}
+
+export function resolvePromo(
+  raw: string,
+  originalAmount: number,
+): ResolvedPromo | null {
+  const promo = lookupPromo(raw);
+  if (!promo) return null;
+  return {
+    code: promo.code,
+    discountPercent: promo.discountPercent,
+    originalAmount,
+    finalAmount: applyPromoDiscount(originalAmount, promo.discountPercent),
+  };
+}
diff --git a/apps/ai-app/src/routes/billing.test.ts b/apps/ai-app/src/routes/billing.test.ts
index 4603de3..f81e710 100644
--- a/apps/ai-app/src/routes/billing.test.ts
+++ b/apps/ai-app/src/routes/billing.test.ts
@@ -206,16 +206,19 @@ describe('billing routes', () => {
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
@@ -286,16 +289,68 @@ describe('billing routes', () => {
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
diff --git a/apps/ai-app/src/routes/billing.ts b/apps/ai-app/src/routes/billing.ts
index 05fdb90..cff0821 100644
--- a/apps/ai-app/src/routes/billing.ts
+++ b/apps/ai-app/src/routes/billing.ts
@@ -11,16 +11,17 @@ import {
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
@@ -45,16 +46,39 @@ async function requireUser(req: { header: (name: string) => string | undefined }
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
@@ -75,30 +99,55 @@ billingRouter.get(
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
@@ -116,17 +165,23 @@ billingRouter.post(
 
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
@@ -135,17 +190,23 @@ billingRouter.post(
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
diff --git a/apps/ai-food/docs/AI-GATEWAY.md b/apps/ai-food/docs/AI-GATEWAY.md
index 36b44ec..55b10ab 100644
--- a/apps/ai-food/docs/AI-GATEWAY.md
+++ b/apps/ai-food/docs/AI-GATEWAY.md
@@ -64,17 +64,18 @@ ai-app (openrouter-gateway)
 | ╨Ь╨╡╤В╨╛╨┤ | ╨Я╤Г╤В╤М | Auth | ╨Ч╨░╨╝╨╡╤В╨║╨╕ |
 |-------|------|------|---------|
 | `GET` | `/health` | ╨╜╨╡╤В | `{ "status": "ok" }` |
 | `POST` | `/auth/telegram/start` | ╨╜╨╡╤В* | `{ challengeId, botDeepLink, expiresAt }` тАФ ╤Б╤В╨░╤А╤В bot deep-link login |
 | `GET` | `/auth/telegram/status?challengeId=` | ╨╜╨╡╤В* | `{ status: "pending" \| "expired" }` ╨╕╨╗╨╕ `{ status: "ok", token, user }` |
 | `POST` | `/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram Bot API updates; ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ challenge |
 | `GET` | `/auth/me` | `X-User-Token` | ╨Я╤А╨╛╤Д╨╕╨╗╤М + `subscriptionExpiresAt` / `hasActiveSubscription` |
 | `GET` | `/usage` | device (+ optional JWT) | ╨Ъ╨▓╨╛╤В╨░: unlimited **╤В╨╛╨╗╤М╨║╨╛** ╨┐╤А╨╕ active ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
-| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock |
+| `POST` | `/billing/promo/validate` | `X-User-Token` | ╨Я╤А╨╛╨▓╨╡╤А╨║╨░ ╨┐╤А╨╛╨╝╨╛╨║╨╛╨┤╨░ ╨╕ ╤Ж╨╡╨╜╨░ ╤Б╨╛ ╤Б╨║╨╕╨┤╨║╨╛╨╣ |
+| `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock; ╨╛╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛ `{ promoCode }`; ╨╛╤В╨▓╨╡╤В: `amount`, `originalAmount`, `promoCode` |
 | `POST` | `/billing/tbank/notification` | Token T-Bank | ╨Р╨║╤В╨╕╨▓╨░╤Ж╨╕╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `GET` | `/billing/status` | `X-User-Token` | ╨б╤В╨░╤В╤Г╤Б ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `POST` | `/billing/sync` | `X-User-Token` | GetState / mock confirm |
 | `GET` | `/v1/models` | ╨┤╨░* | ╤Б╨┐╨╕╤Б╨╛╨║ ╨╝╨╛╨┤╨╡╨╗╨╡╨╣ OpenRouter |
 | `POST` | `/v1/embeddings` | ╨┤╨░* | embeddings |
 | `POST` | `/v1/chat/completions` | ╨┤╨░* + quota | JSON ╨╕╨╗╨╕ SSE; `402 QUOTA_EXCEEDED` |
 
 \* Gateway API key: `Authorization: Bearer <API_KEY>` ╨╕╨╗╨╕ `X-API-Key`, ╤В╨╛╨╗╤М╨║╨╛ ╨╡╤Б╨╗╨╕ ╨╖╨░╨┤╨░╨╜ `API_KEY`.
diff --git a/apps/ai-food/src/features/billing/api/billingApi.test.ts b/apps/ai-food/src/features/billing/api/billingApi.test.ts
index 04f01f1..874b010 100644
--- a/apps/ai-food/src/features/billing/api/billingApi.test.ts
+++ b/apps/ai-food/src/features/billing/api/billingApi.test.ts
@@ -19,29 +19,89 @@ describe('billingApi', () => {
   });
 
   it('subscribe POSTs /billing/subscribe and returns paymentUrl', async () => {
     const fetchMock = vi.fn().mockResolvedValue({
       ok: true,
       json: async () => ({
         paymentUrl: 'https://pay.example/x',
         paymentId: 'pay_1',
+        amount: 10_000,
+        originalAmount: 10_000,
+        promoCode: null,
       }),
     });
     vi.stubGlobal('fetch', fetchMock);
 
     const { subscribe } = await import('./billingApi');
     const result = await subscribe();
     expect(result).toEqual({
       paymentUrl: 'https://pay.example/x',
       paymentId: 'pay_1',
+      amount: 10_000,
+      originalAmount: 10_000,
+      promoCode: null,
     });
     expect(fetchMock).toHaveBeenCalledWith(
       'https://gw.test/billing/subscribe',
-      expect.objectContaining({ method: 'POST' }),
+      expect.objectContaining({
+        method: 'POST',
+        body: JSON.stringify({}),
+      }),
+    );
+  });
+
+  it('validatePromo POSTs /billing/promo/validate', async () => {
+    const fetchMock = vi.fn().mockResolvedValue({
+      ok: true,
+      json: async () => ({
+        valid: true,
+        code: 'new80',
+        discountPercent: 80,
+        originalAmount: 10_000,
+        finalAmount: 2_000,
+      }),
+    });
+    vi.stubGlobal('fetch', fetchMock);
+
+    const { validatePromo } = await import('./billingApi');
+    const result = await validatePromo('new80');
+    expect(result.finalAmount).toBe(2_000);
+    expect(fetchMock).toHaveBeenCalledWith(
+      'https://gw.test/billing/promo/validate',
+      expect.objectContaining({
+        method: 'POST',
+        body: JSON.stringify({ promoCode: 'new80' }),
+      }),
+    );
+  });
+
+  it('subscribe sends promoCode when provided', async () => {
+    const fetchMock = vi.fn().mockResolvedValue({
+      ok: true,
+      json: async () => ({
+        paymentUrl: 'https://pay.example/x',
+        paymentId: 'pay_1',
+        amount: 5_000,
+        originalAmount: 10_000,
+        promoCode: 'new50',
+      }),
+    });
+    vi.stubGlobal('fetch', fetchMock);
+
+    const { subscribe } = await import('./billingApi');
+    const result = await subscribe('new50');
+    expect(result.promoCode).toBe('new50');
+    expect(result.amount).toBe(5_000);
+    expect(fetchMock).toHaveBeenCalledWith(
+      'https://gw.test/billing/subscribe',
+      expect.objectContaining({
+        method: 'POST',
+        body: JSON.stringify({ promoCode: 'new50' }),
+      }),
     );
   });
 
   it('fetchBillingStatus GETs /billing/status', async () => {
     const fetchMock = vi.fn().mockResolvedValue({
       ok: true,
       json: async () => ({
         subscriptionStatus: 'active',
diff --git a/apps/ai-food/src/features/billing/api/billingApi.ts b/apps/ai-food/src/features/billing/api/billingApi.ts
index 054cdce..1393c1f 100644
--- a/apps/ai-food/src/features/billing/api/billingApi.ts
+++ b/apps/ai-food/src/features/billing/api/billingApi.ts
@@ -21,16 +21,27 @@ async function parseError(res: Response): Promise<never> {
     status: data.status ?? res.status,
   };
   throw err;
 }
 
 export type SubscribeResult = {
   paymentUrl: string;
   paymentId: string;
+  amount: number;
+  originalAmount: number;
+  promoCode: string | null;
+};
+
+export type PromoValidateResult = {
+  valid: true;
+  code: string;
+  discountPercent: number;
+  originalAmount: number;
+  finalAmount: number;
 };
 
 export type BillingStatus = {
   subscriptionStatus: string;
   subscriptionExpiresAt: string | null;
   hasActiveSubscription: boolean;
   latestPayment: {
     id: string;
@@ -50,24 +61,41 @@ export type SyncBillingResult = {
 };
 
 export type SubscriptionPrice = {
   amountKopecks: number;
   currency: string;
   durationDays: number;
 };
 
-export async function subscribe(): Promise<SubscribeResult> {
+export async function validatePromo(
+  promoCode: string,
+): Promise<PromoValidateResult> {
+  const headers = await getQuotaHeaders('other');
+  const res = await fetch(`${gatewayBase()}/billing/promo/validate`, {
+    method: 'POST',
+    headers: {
+      ...headers,
+      'Content-Type': 'application/json',
+    },
+    body: JSON.stringify({ promoCode }),
+  });
+  if (!res.ok) await parseError(res);
+  return (await res.json()) as PromoValidateResult;
+}
+
+export async function subscribe(promoCode?: string): Promise<SubscribeResult> {
   const headers = await getQuotaHeaders('other');
   const res = await fetch(`${gatewayBase()}/billing/subscribe`, {
     method: 'POST',
     headers: {
       ...headers,
       'Content-Type': 'application/json',
     },
+    body: JSON.stringify(promoCode ? { promoCode } : {}),
   });
   if (!res.ok) await parseError(res);
   return (await res.json()) as SubscribeResult;
 }
 
 export async function fetchBillingStatus(): Promise<BillingStatus> {
   const headers = await getQuotaHeaders('other');
   const res = await fetch(`${gatewayBase()}/billing/status`, {
diff --git a/apps/ai-food/src/features/billing/index.ts b/apps/ai-food/src/features/billing/index.ts
index 30948b9..d317b79 100644
--- a/apps/ai-food/src/features/billing/index.ts
+++ b/apps/ai-food/src/features/billing/index.ts
@@ -1,14 +1,16 @@
 export {
   subscribe,
+  validatePromo,
   fetchBillingStatus,
   syncBilling,
   fetchSubscriptionPrice,
   type SubscribeResult,
+  type PromoValidateResult,
   type BillingStatus,
   type SyncBillingResult,
   type SubscriptionPrice,
 } from './api/billingApi';
 export { useBillingStatus, billingStatusQueryKey } from './model/useBillingStatus';
 export {
   useSubscriptionPrice,
   subscriptionPriceQueryKey,
diff --git a/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx b/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
index 1f429c5..19ebfff 100644
--- a/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
+++ b/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
@@ -1,16 +1,17 @@
 import { useCallback, useEffect, useState } from 'react';
 import { useNavigate, useSearchParams } from 'react-router-dom';
 import { toast } from 'sonner';
 import {
   fetchBillingStatus,
   subscribe,
   syncBilling,
   useSubscriptionPrice,
+  validatePromo,
 } from '@/features/billing';
 import { useAuthStore } from '@/features/auth';
 import { Button, SubpageShell } from '@/shared/ui';
 
 function openPaymentUrl(url: string): void {
   window.location.assign(url);
 }
 
@@ -20,16 +21,24 @@ export function SubscribePage() {
   const variant = searchParams.get('result'); // success | fail via query, or path
   const pathname =
     typeof window !== 'undefined' ? window.location.pathname : '';
   const isSuccess =
     pathname.endsWith('/subscribe/success') || variant === 'success';
   const isFail = pathname.endsWith('/subscribe/fail') || variant === 'fail';
   const userToken = useAuthStore((s) => s.userToken);
   const [paying, setPaying] = useState(false);
+  const [promoInput, setPromoInput] = useState('');
+  const [applying, setApplying] = useState(false);
+  const [applied, setApplied] = useState<{
+    code: string;
+    discountPercent: number;
+    originalAmount: number;
+    finalAmount: number;
+  } | null>(null);
   const [pollStatus, setPollStatus] = useState<
     'idle' | 'polling' | 'active' | 'timeout'
   >('idle');
 
   const paymentId = searchParams.get('paymentId') ?? undefined;
   const isMock = searchParams.get('mock') === '1';
   const { data: price, isLoading: priceLoading, isError: priceError } =
     useSubscriptionPrice();
@@ -59,24 +68,59 @@ export function SubscribePage() {
     setPollStatus('timeout');
   }, [isMock, paymentId]);
 
   useEffect(() => {
     if (!isSuccess || !userToken) return;
     void pollUntilActive();
   }, [isSuccess, userToken, pollUntilActive]);
 
+  function clearAppliedIfEdited(next: string) {
+    setPromoInput(next);
+    if (applied && next.trim().toLowerCase() !== applied.code) {
+      setApplied(null);
+    }
+  }
+
+  async function handleApplyPromo() {
+    if (!userToken) {
+      navigate('/login', { replace: true, state: { from: '/subscribe' } });
+      return;
+    }
+    setApplying(true);
+    try {
+      const result = await validatePromo(promoInput);
+      setApplied({
+        code: result.code,
+        discountPercent: result.discountPercent,
+        originalAmount: result.originalAmount,
+        finalAmount: result.finalAmount,
+      });
+      setPromoInput(result.code);
+      toast.success(`╨б╨║╨╕╨┤╨║╨░ ${result.discountPercent}% ╨┐╤А╨╕╨╝╨╡╨╜╨╡╨╜╨░`);
+    } catch (err) {
+      setApplied(null);
+      const message =
+        err && typeof err === 'object' && 'message' in err
+          ? String((err as { message: string }).message)
+          : '╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ ╨┐╤А╨╛╨╝╨╛╨║╨╛╨┤';
+      toast.error(message);
+    } finally {
+      setApplying(false);
+    }
+  }
+
   async function handlePay() {
     if (!userToken) {
       navigate('/login', { replace: true, state: { from: '/subscribe' } });
       return;
     }
     setPaying(true);
     try {
-      const result = await subscribe();
+      const result = await subscribe(applied?.code);
       openPaymentUrl(result.paymentUrl);
     } catch (err) {
       const message =
         err && typeof err === 'object' && 'message' in err
           ? String((err as { message: string }).message)
           : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╤Б╨╛╨╖╨┤╨░╤В╤М ╨┐╨╗╨░╤В╤С╨╢';
       toast.error(message);
       setPaying(false);
@@ -151,36 +195,49 @@ export function SubscribePage() {
 
   return (
     <SubpageShell
       title="╨Я╨╛╨┤╨┐╨╕╤Б╨║╨░"
       onBack={() => navigate(-1)}
       mainClassName="space-y-6"
     >
       <section className="space-y-3">
-        <p className="text-3xl font-semibold tabular-nums">
-          {priceLoading && (
-            <span className="text-base font-normal text-muted-foreground">
-              ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╤Ж╨╡╨╜╤ЛтАж
+        {applied ? (
+          <p className="text-3xl font-semibold tabular-nums">
+            <span className="mr-2 text-base font-normal text-muted-foreground line-through">
+              {(applied.originalAmount / 100).toLocaleString('ru-RU')} тВ╜
             </span>
-          )}
-          {priceError && (
-            <span className="text-base font-normal text-muted-foreground">
-              ╨ж╨╡╨╜╨░ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░
+            {(applied.finalAmount / 100).toLocaleString('ru-RU')} тВ╜
+            <span className="ml-2 text-base font-normal text-muted-foreground">
+              / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'} (тИТ
+              {applied.discountPercent}%)
             </span>
-          )}
-          {priceRub != null && (
-            <>
-              {priceRub.toLocaleString('ru-RU')} тВ╜
-              <span className="ml-2 text-base font-normal text-muted-foreground">
-                / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'}
+          </p>
+        ) : (
+          <p className="text-3xl font-semibold tabular-nums">
+            {priceLoading && (
+              <span className="text-base font-normal text-muted-foreground">
+                ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╤Ж╨╡╨╜╤ЛтАж
               </span>
-            </>
-          )}
-        </p>
+            )}
+            {priceError && (
+              <span className="text-base font-normal text-muted-foreground">
+                ╨ж╨╡╨╜╨░ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░
+              </span>
+            )}
+            {priceRub != null && (
+              <>
+                {priceRub.toLocaleString('ru-RU')} тВ╜
+                <span className="ml-2 text-base font-normal text-muted-foreground">
+                  / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'}
+                </span>
+              </>
+            )}
+          </p>
+        )}
         <p className="text-sm text-muted-foreground">
           ╨а╨░╨╖╨╛╨▓╨░╤П ╨╛╨┐╨╗╨░╤В╨░ тАФ ╨┤╨╛╤Б╤В╤Г╨┐ ╨║ AI ╨╜╨░{' '}
           {durationDays != null ? `${durationDays} ╨┤╨╜╨╡╨╣` : '╤Б╤А╨╛╨║ ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕'}.
           ╨С╨╡╨╖ ╨░╨▓╤В╨╛╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╣.
         </p>
       </section>
 
       <section className="space-y-2">
@@ -195,16 +252,40 @@ export function SubscribePage() {
         <h2 className="text-sm font-medium">╨Т╤Б╨╡╨│╨┤╨░ ╨▒╨╡╤Б╨┐╨╗╨░╤В╨╜╨╛</h2>
         <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
           <li>╨Ф╨╜╨╡╨▓╨╜╨╕╨║ ╨┐╤А╨╕╤С╨╝╨╛╨▓ ╨┐╨╕╤Й╨╕</li>
           <li>╨а╤Г╤З╨╜╨╛╨╣ ╨▓╨▓╨╛╨┤ ╨╕ ╤И╤В╤А╨╕╤Е╨║╨╛╨┤</li>
           <li>╨б╤В╨░╤В╨╕╤Б╤В╨╕╨║╨░, ╨╜╨░╤Б╤В╤А╨╛╨╣╨║╨╕, ╨╛╨╜╨▒╨╛╤А╨┤╨╕╨╜╨│</li>
         </ul>
       </section>
 
+      <section className="space-y-2">
+        <label htmlFor="promo" className="text-sm font-medium">
+          ╨Я╤А╨╛╨╝╨╛╨║╨╛╨┤
+        </label>
+        <div className="flex gap-2">
+          <input
+            id="promo"
+            value={promoInput}
+            onChange={(e) => clearAppliedIfEdited(e.target.value)}
+            placeholder="╨Т╨▓╨╡╨┤╨╕╤В╨╡ ╨║╨╛╨┤"
+            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
+            autoComplete="off"
+          />
+          <Button
+            type="button"
+            variant="secondary"
+            disabled={applying || !promoInput.trim()}
+            onClick={() => void handleApplyPromo()}
+          >
+            {applying ? 'тАж' : '╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М'}
+          </Button>
+        </div>
+      </section>
+
       <Button
         className="w-full"
         disabled={paying}
         onClick={() => void handlePay()}
       >
         {paying ? '╨б╨╛╨╖╨┤╨░╤С╨╝ ╨┐╨╗╨░╤В╤С╨╢тАж' : '╨Ю╨┐╨╗╨░╤В╨╕╤В╤М'}
       </Button>
 

