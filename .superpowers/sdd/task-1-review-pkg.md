BASE: f13c76b471e8b827929485816f90dcbb067d8c1a
HEAD: f8b7a608ac79ee8b5a682286b9f325cb9dc675a1

f8b7a60 refactor(ai-app): JWT claims use telegramId instead of phone
 apps/ai-app/src/lib/jwt.test.ts          |  8 ++++----
 apps/ai-app/src/lib/jwt.ts               | 10 +++++-----
 apps/ai-app/src/middleware/quota.test.ts |  4 ++--
 apps/ai-app/src/routes/billing.test.ts   |  2 +-
 4 files changed, 12 insertions(+), 12 deletions(-)
diff --git a/apps/ai-app/src/lib/jwt.test.ts b/apps/ai-app/src/lib/jwt.test.ts
index e67075c..d7ffb8b 100644
--- a/apps/ai-app/src/lib/jwt.test.ts
+++ b/apps/ai-app/src/lib/jwt.test.ts
@@ -10,26 +10,26 @@ describe('user JWT', () => {
 
   beforeEach(() => {
     process.env.AUTH_SECRET = SECRET;
   });
 
   afterEach(() => {
     if (prev === undefined) delete process.env.AUTH_SECRET;
     else process.env.AUTH_SECRET = prev;
   });
 
-  it('round-trips sub and phone', async () => {
-    const token = await signUserToken({ sub: 'user_1', phone: '+79991234567' });
+  it('round-trips sub and telegramId', async () => {
+    const token = await signUserToken({ sub: 'user_1', telegramId: '42' });
     const payload = await verifyUserToken(token);
-    expect(payload).toEqual({ sub: 'user_1', phone: '+79991234567' });
+    expect(payload).toEqual({ sub: 'user_1', telegramId: '42' });
   });
 
   it('does not set exp claim', async () => {
-    const token = await signUserToken({ sub: 'user_1', phone: '+79991234567' });
+    const token = await signUserToken({ sub: 'user_1', telegramId: '42' });
     const decoded = decodeJwt(token);
     expect(decoded.exp).toBeUndefined();
   });
 
   it('rejects garbage token', async () => {
     await expect(verifyUserToken('not.a.jwt')).rejects.toBeInstanceOf(ApiError);
   });
 });
diff --git a/apps/ai-app/src/lib/jwt.ts b/apps/ai-app/src/lib/jwt.ts
index 099c9de..a8dc184 100644
--- a/apps/ai-app/src/lib/jwt.ts
+++ b/apps/ai-app/src/lib/jwt.ts
@@ -1,42 +1,42 @@
 import { SignJWT, jwtVerify } from 'jose';
 import { ApiError } from '../../lib/errors.js';
 
 export type UserTokenPayload = {
   sub: string;
-  phone: string;
+  telegramId: string;
 };
 
 function getSecretKey(): Uint8Array {
   const secret = process.env.AUTH_SECRET?.trim();
   if (!secret || secret.length < 32) {
     throw new ApiError(
       500,
       'AUTH_MISCONFIGURED',
       'AUTH_SECRET must be set (at least 32 characters).',
     );
   }
   return new TextEncoder().encode(secret);
 }
 
 export async function signUserToken(payload: UserTokenPayload): Promise<string> {
-  return new SignJWT({ phone: payload.phone })
+  return new SignJWT({ telegramId: payload.telegramId })
     .setProtectedHeader({ alg: 'HS256' })
     .setSubject(payload.sub)
     .setIssuedAt()
     .sign(getSecretKey());
 }
 
 export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
   try {
     const { payload } = await jwtVerify(token, getSecretKey());
     const sub = payload.sub;
-    const phone = payload.phone;
-    if (!sub || typeof phone !== 'string') {
+    const telegramId = payload.telegramId;
+    if (!sub || typeof telegramId !== 'string') {
       throw new Error('invalid claims');
     }
-    return { sub, phone };
+    return { sub, telegramId };
   } catch (err) {
     if (err instanceof ApiError) throw err;
     throw new ApiError(401, 'INVALID_USER_TOKEN', 'Invalid or expired user token.');
   }
 }
diff --git a/apps/ai-app/src/middleware/quota.test.ts b/apps/ai-app/src/middleware/quota.test.ts
index 3930e90..2e56225 100644
--- a/apps/ai-app/src/middleware/quota.test.ts
+++ b/apps/ai-app/src/middleware/quota.test.ts
@@ -76,21 +76,21 @@ describe('enforceChatQuota', () => {
     expect(mockAssertGuest).not.toHaveBeenCalled();
   });
 
   it('requires device id for guests on analyze', async () => {
     const { err } = await run({ 'x-usage-kind': 'analyze' });
     expect(err).toBeInstanceOf(ApiError);
     expect((err as ApiError).code).toBe('DEVICE_ID_REQUIRED');
   });
 
   it('skips guest quota when auth user has active subscription', async () => {
-    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', phone: '+79991234567' });
+    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', telegramId: '42' });
     mockFindUnique.mockResolvedValue({
       id: 'u1',
       subscriptionStatus: 'active',
       subscriptionExpiresAt: new Date(Date.now() + 86_400_000),
     });
     mockHasActiveSubscription.mockReturnValue(true);
     mockEnsureDevice.mockResolvedValue({ id: 'drow' });
     const { err, req } = await run({
       'x-usage-kind': 'refine',
       'x-user-token': 'jwt',
@@ -100,21 +100,21 @@ describe('enforceChatQuota', () => {
     expect(req.quota).toMatchObject({
       usageKind: 'refine',
       userId: 'u1',
       deviceRowId: 'drow',
       shouldRecord: true,
     });
     expect(mockAssertGuest).not.toHaveBeenCalled();
   });
 
   it('applies guest device quota when auth user has no subscription', async () => {
-    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', phone: '+79991234567' });
+    mockVerifyUserToken.mockResolvedValue({ sub: 'u1', telegramId: '42' });
     mockFindUnique.mockResolvedValue({
       id: 'u1',
       subscriptionStatus: 'none',
       subscriptionExpiresAt: null,
     });
     mockHasActiveSubscription.mockReturnValue(false);
     mockAssertGuest.mockResolvedValue({
       deviceRowId: 'd1',
       used: 1,
       limit: 50,
diff --git a/apps/ai-app/src/routes/billing.test.ts b/apps/ai-app/src/routes/billing.test.ts
index 14f9cee..fdb85c4 100644
--- a/apps/ai-app/src/routes/billing.test.ts
+++ b/apps/ai-app/src/routes/billing.test.ts
@@ -141,21 +141,21 @@ describe('billing routes', () => {
       },
     };
   }
 
   beforeEach(() => {
     vi.clearAllMocks();
     paymentStore.clear();
     paymentSeq = 0;
     mockIsDb.mockReturnValue(true);
     mockGetPrisma.mockReturnValue(mockPrisma());
-    mockVerifyUserToken.mockResolvedValue({ sub: 'user-1', phone: '+79991234567' });
+    mockVerifyUserToken.mockResolvedValue({ sub: 'user-1', telegramId: '42' });
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
