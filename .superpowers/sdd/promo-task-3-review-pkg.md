# Review package Task 3
BASE: 1e6ffddb9912e4792d3c2a76f086852fafa9758b
HEAD: 3e442d969aba938322717daadae60e67d84b0014

## Commits


## Stat
 .../src/features/billing/api/billingApi.test.ts    | 62 +++++++++++++++++++++-
 .../ai-food/src/features/billing/api/billingApi.ts | 30 ++++++++++-
 apps/ai-food/src/features/billing/index.ts         |  2 +
 3 files changed, 92 insertions(+), 2 deletions(-)


## Diff
diff --git a/apps/ai-food/src/features/billing/api/billingApi.test.ts b/apps/ai-food/src/features/billing/api/billingApi.test.ts
index 04f01f1..874b010 100644
--- a/apps/ai-food/src/features/billing/api/billingApi.test.ts
+++ b/apps/ai-food/src/features/billing/api/billingApi.test.ts
@@ -17,33 +17,93 @@ describe('billingApi', () => {
     vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gw.test');
     vi.unstubAllGlobals();
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
         subscriptionExpiresAt: '2027-01-01T00:00:00.000Z',
         hasActiveSubscription: true,
diff --git a/apps/ai-food/src/features/billing/api/billingApi.ts b/apps/ai-food/src/features/billing/api/billingApi.ts
index 054cdce..1393c1f 100644
--- a/apps/ai-food/src/features/billing/api/billingApi.ts
+++ b/apps/ai-food/src/features/billing/api/billingApi.ts
@@ -19,20 +19,31 @@ async function parseError(res: Response): Promise<never> {
     message: data.message ?? `Billing error ${res.status}`,
     code: data.code ?? 'BILLING_ERROR',
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
     status: string;
     amount: number;
@@ -48,28 +59,45 @@ export type SyncBillingResult = {
   subscriptionExpiresAt?: string | null;
   subscriptionStatus?: string;
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
     method: 'GET',
     headers,
diff --git a/apps/ai-food/src/features/billing/index.ts b/apps/ai-food/src/features/billing/index.ts
index 30948b9..d317b79 100644
--- a/apps/ai-food/src/features/billing/index.ts
+++ b/apps/ai-food/src/features/billing/index.ts
@@ -1,16 +1,18 @@
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
 } from './model/useSubscriptionPrice';
 export {

