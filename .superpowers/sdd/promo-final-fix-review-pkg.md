# Final fix review package
BASE: eb422bf3677792cc40a79566bd652fc886507d68
HEAD: 18d3d01ce33b9b5243c5c08116fe8577be40da4a

## Commits


## Stat
 apps/ai-app/src/lib/promos.test.ts     |  6 ++++++
 apps/ai-app/src/lib/promos.ts          | 10 +++++-----
 apps/ai-app/src/routes/billing.test.ts | 13 +++++++++++++
 apps/ai-app/src/routes/billing.ts      |  2 +-
 4 files changed, 25 insertions(+), 6 deletions(-)


## Diff
diff --git a/apps/ai-app/src/lib/promos.test.ts b/apps/ai-app/src/lib/promos.test.ts
index 7895ea1..38519ad 100644
--- a/apps/ai-app/src/lib/promos.test.ts
+++ b/apps/ai-app/src/lib/promos.test.ts
@@ -15,30 +15,36 @@ describe('promos', () => {
     expect(lookupPromo('new80')).toEqual({ code: 'new80', discountPercent: 80 });
     expect(lookupPromo('NEW50')).toEqual({ code: 'new50', discountPercent: 50 });
   });
 
   it('lookupPromo returns null for unknown', () => {
     expect(lookupPromo('nope')).toBeNull();
     expect(lookupPromo('')).toBeNull();
     expect(lookupPromo('   ')).toBeNull();
   });
 
+  it('lookupPromo returns null for prototype pollution keys', () => {
+    expect(lookupPromo('__proto__')).toBeNull();
+    expect(lookupPromo('constructor')).toBeNull();
+  });
+
   it('applyPromoDiscount floors and clamps to min 1', () => {
     expect(applyPromoDiscount(10_000, 80)).toBe(2_000);
     expect(applyPromoDiscount(10_000, 50)).toBe(5_000);
     expect(applyPromoDiscount(1, 80)).toBe(1);
     expect(applyPromoDiscount(3, 80)).toBe(1);
   });
 
   it('resolvePromo returns amounts for valid code', () => {
     expect(resolvePromo(' new80 ', 10_000)).toEqual({
       code: 'new80',
       discountPercent: 80,
       originalAmount: 10_000,
       finalAmount: 2_000,
     });
   });
 
   it('resolvePromo returns null for invalid', () => {
     expect(resolvePromo('x', 10_000)).toBeNull();
+    expect(resolvePromo('__proto__', 10_000)).toBeNull();
   });
 });
diff --git a/apps/ai-app/src/lib/promos.ts b/apps/ai-app/src/lib/promos.ts
index fabcf98..2c0ea97 100644
--- a/apps/ai-app/src/lib/promos.ts
+++ b/apps/ai-app/src/lib/promos.ts
@@ -3,33 +3,33 @@ export type PromoDefinition = {
   discountPercent: number;
 };
 
 export type ResolvedPromo = {
   code: string;
   discountPercent: number;
   originalAmount: number;
   finalAmount: number;
 };
 
-const PROMOS: Record<string, PromoDefinition> = {
-  new80: { code: 'new80', discountPercent: 80 },
-  new50: { code: 'new50', discountPercent: 50 },
-};
+const PROMOS = new Map<string, PromoDefinition>([
+  ['new80', { code: 'new80', discountPercent: 80 }],
+  ['new50', { code: 'new50', discountPercent: 50 }],
+]);
 
 export function normalizePromoCode(raw: string): string {
   return raw.trim().toLowerCase();
 }
 
 export function lookupPromo(raw: string): PromoDefinition | null {
   const key = normalizePromoCode(raw);
   if (!key) return null;
-  return PROMOS[key] ?? null;
+  return PROMOS.get(key) ?? null;
 }
 
 /** finalAmount in kopecks; never below 1. */
 export function applyPromoDiscount(
   originalAmount: number,
   discountPercent: number,
 ): number {
   const discounted = Math.floor(
     (originalAmount * (100 - discountPercent)) / 100,
   );
diff --git a/apps/ai-app/src/routes/billing.test.ts b/apps/ai-app/src/routes/billing.test.ts
index f81e710..96ad28e 100644
--- a/apps/ai-app/src/routes/billing.test.ts
+++ b/apps/ai-app/src/routes/billing.test.ts
@@ -339,20 +339,33 @@ describe('billing routes', () => {
     const before = paymentStore.size;
     const res = await request(createApp())
       .post('/billing/subscribe')
       .set('X-User-Token', 'jwt')
       .send({ promoCode: 'bad' });
     expect(res.status).toBe(400);
     expect(res.body.code).toBe('INVALID_PROMO');
     expect(paymentStore.size).toBe(before);
   });
 
+  it('POST /billing/subscribe with empty promoCode rejects INVALID_PROMO', async () => {
+    mockIsTbankMock.mockReturnValue(true);
+    mockPrice.mockReturnValue(10_000);
+    const before = paymentStore.size;
+    const res = await request(createApp())
+      .post('/billing/subscribe')
+      .set('X-User-Token', 'jwt')
+      .send({ promoCode: '' });
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
index cff0821..feab0f4 100644
--- a/apps/ai-app/src/routes/billing.ts
+++ b/apps/ai-app/src/routes/billing.ts
@@ -50,21 +50,21 @@ async function requireUser(req: { header: (name: string) => string | undefined }
   }
   return { prisma, user, payload };
 }
 
 function resolveSubscribeAmount(promoCodeRaw: unknown): {
   amount: number;
   originalAmount: number;
   promoCode: string | null;
 } {
   const originalAmount = getSubscriptionPriceKopecks();
-  if (promoCodeRaw == null || promoCodeRaw === '') {
+  if (promoCodeRaw == null) {
     return { amount: originalAmount, originalAmount, promoCode: null };
   }
   if (typeof promoCodeRaw !== 'string') {
     throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
   }
   const resolved = resolvePromo(promoCodeRaw, originalAmount);
   if (!resolved) {
     throw new ApiError(400, 'INVALID_PROMO', 'Invalid promo code.');
   }
   return {

