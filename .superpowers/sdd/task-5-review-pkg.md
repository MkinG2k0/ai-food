BASE: 5a0bd1cdd0f6d68c3f98b9abc30886236dc235cc
HEAD: f6fcdb4dabf107c349ee736d53495553238255cb

f6fcdb4 fix(ai-app): consume Telegram login challenge only after user load
fd7f73b feat(ai-app): Telegram bot start/status auth routes
 .superpowers/sdd/task-5-report.md             |  99 +++++++++++++
 apps/ai-app/src/routes/auth.flashcall.test.ts | 152 -------------------
 apps/ai-app/src/routes/auth.telegram.test.ts  | 204 ++++++++++++++++++++++++++
 apps/ai-app/src/routes/auth.ts                | 164 +++++++++++----------
 4 files changed, 390 insertions(+), 229 deletions(-)
diff --git a/.superpowers/sdd/task-5-report.md b/.superpowers/sdd/task-5-report.md
new file mode 100644
index 0000000..69ffacb
--- /dev/null
+++ b/.superpowers/sdd/task-5-report.md
@@ -0,0 +1,99 @@
+# Task 5 Report: Telegram auth routes
+
+## Status
+
+Implemented the Telegram bot authentication routes and removed the Flash-Call route tests.
+
+## Changes
+
+- Rewrote `apps/ai-app/src/routes/auth.ts`.
+  - Added `POST /auth/telegram/start`.
+  - Added `GET /auth/telegram/status`.
+  - Updated `GET /auth/me` to return Telegram profile and subscription fields.
+  - Removed Flash-Call start and verification routes.
+- Added `apps/ai-app/src/routes/auth.telegram.test.ts` with six route tests.
+- Deleted `apps/ai-app/src/routes/auth.flashcall.test.ts`.
+
+## TDD evidence
+
+RED:
+
+```text
+pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
+Test Files  1 failed (1)
+Tests       6 failed (6)
+```
+
+The Telegram endpoints returned 404 and `/me` lacked Telegram profile fields.
+
+GREEN:
+
+```text
+pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
+Test Files  1 passed (1)
+Tests       6 passed (6)
+```
+
+## Verification
+
+```text
+pnpm --dir apps/ai-app test
+Test Files  16 passed (16)
+Tests       76 passed (76)
+```
+
+IDE lint diagnostics for both changed auth files: none.
+
+## Concern
+
+`pnpm --dir apps/ai-app type-check` still exits with code 2 because of an unrelated pre-existing error:
+
+```text
+src/routes/billing.ts(296,41): error TS2367:
+This comparison appears to be unintentional because the types
+'"pending" | "rejected" | "refunded"' and '"confirmed"' have no overlap.
+```
+
+No TypeScript error was reported in either changed auth file.
+
+## Important review finding fix
+
+- Updated `GET /auth/telegram/status` to load the confirmed challenge's user
+  before consuming the challenge.
+- Database unavailability, query errors, and missing users now return HTTP 200
+  `{ "status": "pending" }`, leaving the confirmed challenge available for retry.
+- The challenge is consumed only after the user loads successfully; a consume
+  race still returns `{ "status": "expired" }`.
+- Added a regression test proving that a failed user query returns `pending`
+  without calling `consumeLoginChallenge`.
+
+RED:
+
+```text
+pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
+Test Files  1 failed (1)
+Tests       1 failed | 6 passed (7)
+Expected { status: 'pending' }, received { status: 'expired' }
+```
+
+GREEN:
+
+```text
+pnpm --dir apps/ai-app exec vitest run src/routes/auth.telegram.test.ts
+Test Files  1 passed (1)
+Tests       7 passed (7)
+```
+
+Full verification:
+
+```text
+pnpm --dir apps/ai-app test
+Test Files  16 passed (16)
+Tests       77 passed (77)
+```
+
+```text
+pnpm --dir apps/ai-app type-check
+Exit code 2: existing src/routes/billing.ts(296,41) TS2367 error.
+No TypeScript error was reported in the changed auth files.
+```
diff --git a/apps/ai-app/src/routes/auth.flashcall.test.ts b/apps/ai-app/src/routes/auth.flashcall.test.ts
deleted file mode 100644
index d389ef0..0000000
--- a/apps/ai-app/src/routes/auth.flashcall.test.ts
+++ /dev/null
@@ -1,152 +0,0 @@
-import { afterEach, describe, expect, it, vi } from 'vitest';
-import express from 'express';
-import request from 'supertest';
-import { errorHandler } from '../middleware/error.js';
-
-const mocks = vi.hoisted(() => ({
-  sendFlashCall: vi.fn(),
-  createChallenge: vi.fn(),
-  getChallenge: vi.fn(),
-  registerFailedAttempt: vi.fn(),
-  consumeChallengeOnSuccess: vi.fn(),
-  countActiveForPhone: vi.fn(),
-  upsert: vi.fn(),
-  findUnique: vi.fn(),
-  ensureDevice: vi.fn(),
-  signUserToken: vi.fn(),
-  verifyUserToken: vi.fn(),
-}));
-
-vi.mock('../lib/flashcall.js', () => ({
-  sendFlashCall: mocks.sendFlashCall,
-}));
-vi.mock('../lib/flashcallChallenge.js', () => ({
-  createChallenge: mocks.createChallenge,
-  getChallenge: mocks.getChallenge,
-  registerFailedAttempt: mocks.registerFailedAttempt,
-  consumeChallengeOnSuccess: mocks.consumeChallengeOnSuccess,
-  countActiveForPhone: mocks.countActiveForPhone,
-}));
-vi.mock('../lib/prisma.js', () => ({
-  isDatabaseConfigured: () => true,
-  getPrisma: () => ({
-    user: {
-      upsert: mocks.upsert,
-      findUnique: mocks.findUnique,
-    },
-  }),
-}));
-vi.mock('../lib/quota.js', () => ({
-  ensureDevice: mocks.ensureDevice,
-}));
-vi.mock('../lib/jwt.js', () => ({
-  signUserToken: mocks.signUserToken,
-  verifyUserToken: mocks.verifyUserToken,
-}));
-
-const { authRouter } = await import('./auth.js');
-
-function createApp() {
-  const app = express();
-  app.use(express.json());
-  app.use('/auth', authRouter);
-  app.use(errorHandler);
-  return app;
-}
-
-describe('Flash-Call auth routes', () => {
-  afterEach(() => {
-    vi.clearAllMocks();
-  });
-
-  it('starts a normalized-phone challenge without returning its code', async () => {
-    mocks.countActiveForPhone.mockReturnValue(0);
-    mocks.sendFlashCall.mockResolvedValue({
-      id: 'provider-1',
-      code: '1234',
-      number: '79991234567',
-    });
-    mocks.createChallenge.mockReturnValue({
-      id: '78d7cad3-5b19-411d-884e-6d8083368721',
-      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
-    });
-
-    const response = await request(createApp())
-      .post('/auth/flashcall/start')
-      .send({ phone: '+7 (999) 123-45-67' });
-
-    expect(response.status).toBe(200);
-    expect(response.body).toEqual({
-      challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
-      expiresAt: '2026-08-04T16:00:00.000Z',
-    });
-    expect(response.body).not.toHaveProperty('code');
-    expect(mocks.sendFlashCall).toHaveBeenCalledWith('79991234567');
-    expect(mocks.createChallenge).toHaveBeenCalledWith({
-      phone: '79991234567',
-      code: '1234',
-      providerId: 'provider-1',
-    });
-  });
-
-  it('rejects an incorrect code and records a failed attempt', async () => {
-    mocks.getChallenge.mockReturnValue({
-      id: '78d7cad3-5b19-411d-884e-6d8083368721',
-      phone: '79991234567',
-      code: '1234',
-      expiresAt: Date.now() + 60_000,
-      attempts: 0,
-    });
-    mocks.registerFailedAttempt.mockReturnValue('ok');
-
-    const response = await request(createApp())
-      .post('/auth/flashcall/verify')
-      .send({ challengeId: '78d7cad3-5b19-411d-884e-6d8083368721', code: '9999' });
-
-    expect(response.status).toBe(401);
-    expect(response.body.code).toBe('INVALID_CODE');
-    expect(mocks.registerFailedAttempt).toHaveBeenCalledWith(
-      '78d7cad3-5b19-411d-884e-6d8083368721',
-    );
-    expect(mocks.upsert).not.toHaveBeenCalled();
-  });
-
-  it('verifies a challenge, creates the user, and returns a token', async () => {
-    mocks.getChallenge.mockReturnValue({
-      id: '78d7cad3-5b19-411d-884e-6d8083368721',
-      phone: '79991234567',
-      code: '1234',
-      expiresAt: Date.now() + 60_000,
-      attempts: 0,
-    });
-    mocks.upsert.mockResolvedValue({
-      id: 'user-1',
-      phone: '79991234567',
-      subscriptionStatus: 'none',
-      subscriptionExpiresAt: null,
-    });
-    mocks.signUserToken.mockResolvedValue('token-1');
-
-    const response = await request(createApp())
-      .post('/auth/flashcall/verify')
-      .send({
-        challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
-        code: '1234',
-        deviceId: 'device-1',
-      });
-
-    expect(response.status).toBe(200);
-    expect(response.body).toMatchObject({
-      token: 'token-1',
-      user: { id: 'user-1', phone: '79991234567' },
-    });
-    expect(mocks.consumeChallengeOnSuccess).toHaveBeenCalledWith(
-      '78d7cad3-5b19-411d-884e-6d8083368721',
-    );
-    expect(mocks.ensureDevice).toHaveBeenCalledWith(expect.anything(), 'device-1', 'user-1');
-    expect(mocks.signUserToken).toHaveBeenCalledWith({
-      sub: 'user-1',
-      phone: '79991234567',
-    });
-  });
-});
diff --git a/apps/ai-app/src/routes/auth.telegram.test.ts b/apps/ai-app/src/routes/auth.telegram.test.ts
new file mode 100644
index 0000000..3e64480
--- /dev/null
+++ b/apps/ai-app/src/routes/auth.telegram.test.ts
@@ -0,0 +1,204 @@
+import { afterEach, describe, expect, it, vi } from 'vitest';
+import express from 'express';
+import request from 'supertest';
+import { errorHandler } from '../middleware/error.js';
+
+const mocks = vi.hoisted(() => ({
+  createLoginChallenge: vi.fn(),
+  getLoginChallengeById: vi.fn(),
+  consumeLoginChallenge: vi.fn(),
+  buildBotDeepLink: vi.fn(),
+  getTelegramBotToken: vi.fn(),
+  getTelegramBotUsername: vi.fn(),
+  findUnique: vi.fn(),
+  verifyUserToken: vi.fn(),
+}));
+
+vi.mock('../lib/telegramLoginChallenge.js', () => ({
+  createLoginChallenge: mocks.createLoginChallenge,
+  getLoginChallengeById: mocks.getLoginChallengeById,
+  consumeLoginChallenge: mocks.consumeLoginChallenge,
+}));
+vi.mock('../lib/telegramBotApi.js', () => ({
+  buildBotDeepLink: mocks.buildBotDeepLink,
+  getTelegramBotToken: mocks.getTelegramBotToken,
+  getTelegramBotUsername: mocks.getTelegramBotUsername,
+}));
+vi.mock('../lib/prisma.js', () => ({
+  isDatabaseConfigured: () => true,
+  getPrisma: () => ({
+    user: { findUnique: mocks.findUnique },
+  }),
+}));
+vi.mock('../lib/jwt.js', () => ({
+  verifyUserToken: mocks.verifyUserToken,
+}));
+
+const { authRouter } = await import('./auth.js');
+
+function createApp() {
+  const app = express();
+  app.use(express.json());
+  app.use('/auth', authRouter);
+  app.use(errorHandler);
+  return app;
+}
+
+const challengeId = '78d7cad3-5b19-411d-884e-6d8083368721';
+const user = {
+  id: 'user-1',
+  telegramId: '42',
+  username: 'ada',
+  firstName: 'Ada',
+  lastName: null,
+  photoUrl: null,
+  subscriptionStatus: 'none',
+  subscriptionExpiresAt: null,
+};
+
+describe('Telegram bot auth routes', () => {
+  afterEach(() => {
+    vi.clearAllMocks();
+  });
+
+  it('starts a login challenge with a bot deep link', async () => {
+    mocks.getTelegramBotToken.mockReturnValue('1:tok');
+    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
+    mocks.createLoginChallenge.mockReturnValue({
+      id: challengeId,
+      nonce: 'nonce1',
+      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
+    });
+    mocks.buildBotDeepLink.mockReturnValue('https://t.me/MyBot?start=nonce1');
+
+    const response = await request(createApp())
+      .post('/auth/telegram/start')
+      .send({ deviceId: 'dev-1' });
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({
+      challengeId,
+      botDeepLink: 'https://t.me/MyBot?start=nonce1',
+      expiresAt: '2026-08-04T16:00:00.000Z',
+    });
+    expect(response.body).not.toHaveProperty('nonce');
+    expect(mocks.createLoginChallenge).toHaveBeenCalledWith({ deviceId: 'dev-1' });
+    expect(mocks.buildBotDeepLink).toHaveBeenCalledWith('nonce1');
+  });
+
+  it('returns 503 when the Telegram bot is misconfigured', async () => {
+    mocks.getTelegramBotToken.mockReturnValue(null);
+    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
+
+    const response = await request(createApp()).post('/auth/telegram/start').send({});
+
+    expect(response.status).toBe(503);
+    expect(response.body.code).toBe('TELEGRAM_MISCONFIGURED');
+    expect(mocks.createLoginChallenge).not.toHaveBeenCalled();
+  });
+
+  it('returns pending for an unconfirmed challenge', async () => {
+    mocks.getLoginChallengeById.mockReturnValue({
+      id: challengeId,
+      status: 'pending',
+      nonce: 'nonce1',
+      expiresAt: Date.now() + 60_000,
+    });
+
+    const response = await request(createApp()).get(
+      `/auth/telegram/status?challengeId=${challengeId}`,
+    );
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ status: 'pending' });
+    expect(mocks.consumeLoginChallenge).not.toHaveBeenCalled();
+  });
+
+  it('returns ok once for a confirmed challenge, then expired', async () => {
+    mocks.getLoginChallengeById
+      .mockReturnValueOnce({
+        id: challengeId,
+        status: 'confirmed',
+        nonce: 'nonce1',
+        expiresAt: Date.now() + 60_000,
+        userId: user.id,
+        token: 'jwt-1',
+      })
+      .mockReturnValueOnce(null);
+    mocks.consumeLoginChallenge.mockReturnValueOnce({
+      token: 'jwt-1',
+      userId: user.id,
+    });
+    mocks.findUnique.mockResolvedValue(user);
+
+    let response = await request(createApp()).get(
+      `/auth/telegram/status?challengeId=${challengeId}`,
+    );
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({
+      status: 'ok',
+      token: 'jwt-1',
+      user: {
+        ...user,
+        subscriptionExpiresAt: null,
+        hasActiveSubscription: false,
+      },
+    });
+
+    response = await request(createApp()).get(
+      `/auth/telegram/status?challengeId=${challengeId}`,
+    );
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ status: 'expired' });
+  });
+
+  it('keeps a confirmed challenge pending when the user query fails', async () => {
+    mocks.getLoginChallengeById.mockReturnValue({
+      id: challengeId,
+      status: 'confirmed',
+      nonce: 'nonce1',
+      expiresAt: Date.now() + 60_000,
+      userId: user.id,
+      token: 'jwt-1',
+    });
+    mocks.findUnique.mockRejectedValue(new Error('database unavailable'));
+
+    const response = await request(createApp()).get(
+      `/auth/telegram/status?challengeId=${challengeId}`,
+    );
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ status: 'pending' });
+    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: user.id } });
+    expect(mocks.consumeLoginChallenge).not.toHaveBeenCalled();
+  });
+
+  it('returns expired for an unknown challenge id', async () => {
+    mocks.getLoginChallengeById.mockReturnValue(null);
+
+    const response = await request(createApp()).get(
+      `/auth/telegram/status?challengeId=${challengeId}`,
+    );
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ status: 'expired' });
+  });
+
+  it('returns the Telegram profile and subscription fields from me', async () => {
+    mocks.verifyUserToken.mockResolvedValue({ sub: user.id, telegramId: user.telegramId });
+    mocks.findUnique.mockResolvedValue(user);
+
+    const response = await request(createApp())
+      .get('/auth/me')
+      .set('x-user-token', 'jwt-1');
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({
+      ...user,
+      subscriptionExpiresAt: null,
+      hasActiveSubscription: false,
+    });
+  });
+});
diff --git a/apps/ai-app/src/routes/auth.ts b/apps/ai-app/src/routes/auth.ts
index 1a872ff..51ced49 100644
--- a/apps/ai-app/src/routes/auth.ts
+++ b/apps/ai-app/src/routes/auth.ts
@@ -1,151 +1,161 @@
 import { Router } from 'express';
 import { z } from 'zod';
 import { ApiError } from '../../lib/errors.js';
 import { asyncHandler } from '../middleware/error.js';
 import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
-import { signUserToken, verifyUserToken } from '../lib/jwt.js';
-import { normalizePhone } from '../lib/phone.js';
-import { sendFlashCall } from '../lib/flashcall.js';
+import { verifyUserToken } from '../lib/jwt.js';
 import {
-  consumeChallengeOnSuccess,
-  countActiveForPhone,
-  createChallenge,
-  getChallenge,
-  registerFailedAttempt,
-} from '../lib/flashcallChallenge.js';
-import { ensureDevice } from '../lib/quota.js';
+  consumeLoginChallenge,
+  createLoginChallenge,
+  getLoginChallengeById,
+} from '../lib/telegramLoginChallenge.js';
+import {
+  buildBotDeepLink,
+  getTelegramBotToken,
+  getTelegramBotUsername,
+} from '../lib/telegramBotApi.js';
 import { subscriptionPublicFields } from '../lib/subscription.js';
 
-const FlashCallStartBodySchema = z.object({
-  phone: z.string().min(1),
-  deviceId: z.string().min(1).optional(),
-});
-
-const FlashCallVerifyBodySchema = z.object({
-  challengeId: z.string().uuid(),
-  code: z.string().length(4),
+const StartBodySchema = z.object({
   deviceId: z.string().min(1).optional(),
 });
 
-const MAX_ACTIVE_CHALLENGES_PER_PHONE = 3;
-
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
 
+function requireTelegramConfigured() {
+  if (!getTelegramBotToken() || !getTelegramBotUsername()) {
+    throw new ApiError(
+      503,
+      'TELEGRAM_MISCONFIGURED',
+      'TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME must be configured.',
+    );
+  }
+}
+
+function publicUser(user: {
+  id: string;
+  telegramId: string;
+  username: string | null;
+  firstName: string | null;
+  lastName: string | null;
+  photoUrl: string | null;
+  subscriptionStatus: Parameters<typeof subscriptionPublicFields>[0]['subscriptionStatus'];
+  subscriptionExpiresAt: Date | null;
+}) {
+  return {
+    id: user.id,
+    telegramId: user.telegramId,
+    username: user.username,
+    firstName: user.firstName,
+    lastName: user.lastName,
+    photoUrl: user.photoUrl,
+    ...subscriptionPublicFields(user),
+  };
+}
+
 export const authRouter = Router();
 
 authRouter.post(
-  '/flashcall/start',
+  '/telegram/start',
   asyncHandler(async (req, res) => {
-    const parsed = FlashCallStartBodySchema.safeParse(req.body);
+    requireTelegramConfigured();
+    const parsed = StartBodySchema.safeParse(req.body ?? {});
     if (!parsed.success) {
-      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Flash-Call start payload.');
-    }
-
-    const phone = normalizePhone(parsed.data.phone);
-    if (!phone) {
-      throw new ApiError(
-        400,
-        'VALIDATION_ERROR',
-        'Invalid Russian mobile phone number.',
-      );
+      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Telegram start payload.');
     }
 
-    if (countActiveForPhone(phone) >= MAX_ACTIVE_CHALLENGES_PER_PHONE) {
-      throw new ApiError(
-        429,
-        'FLASHCALL_RATE_LIMITED',
-        'Too many active Flash-Call challenges. Try again later.',
-      );
-    }
-
-    const flashCall = await sendFlashCall(phone);
-    const challenge = createChallenge({
-      phone,
-      code: flashCall.code,
-      providerId: flashCall.id,
+    const created = createLoginChallenge({
+      deviceId: parsed.data.deviceId,
     });
+    const botDeepLink = buildBotDeepLink(created.nonce);
 
     res.json({
-      challengeId: challenge.id,
-      expiresAt: challenge.expiresAt.toISOString(),
+      challengeId: created.id,
+      botDeepLink,
+      expiresAt: created.expiresAt.toISOString(),
     });
   }),
 );
 
-authRouter.post(
-  '/flashcall/verify',
+authRouter.get(
+  '/telegram/status',
   asyncHandler(async (req, res) => {
-    const parsed = FlashCallVerifyBodySchema.safeParse(req.body);
-    if (!parsed.success) {
-      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Flash-Call verification payload.');
+    const challengeId =
+      typeof req.query.challengeId === 'string' ? req.query.challengeId : '';
+    if (!challengeId) {
+      res.json({ status: 'expired' });
+      return;
     }
 
-    const body = parsed.data;
-    const challenge = getChallenge(body.challengeId);
+    const challenge = getLoginChallengeById(challengeId);
     if (!challenge) {
-      throw new ApiError(401, 'INVALID_CHALLENGE', 'Flash-Call challenge is invalid or expired.');
+      res.json({ status: 'expired' });
+      return;
     }
-
-    if (body.code !== challenge.code) {
-      registerFailedAttempt(body.challengeId);
-      throw new ApiError(401, 'INVALID_CODE', 'Flash-Call code is invalid.');
+    if (challenge.status === 'pending') {
+      res.json({ status: 'pending' });
+      return;
     }
 
-    consumeChallengeOnSuccess(body.challengeId);
-
-    const prisma = requireDb();
-    const user = await prisma.user.upsert({
-      where: { phone: challenge.phone },
-      create: { phone: challenge.phone },
-      update: {},
-    });
+    let user;
+    try {
+      const prisma = requireDb();
+      user = await prisma.user.findUnique({ where: { id: challenge.userId } });
+    } catch {
+      res.json({ status: 'pending' });
+      return;
+    }
+    if (!user) {
+      res.json({ status: 'pending' });
+      return;
+    }
 
-    if (body.deviceId) {
-      await ensureDevice(prisma, body.deviceId, user.id);
+    const consumed = consumeLoginChallenge(challengeId);
+    if (!consumed) {
+      res.json({ status: 'expired' });
+      return;
     }
 
-    const token = await signUserToken({ sub: user.id, phone: user.phone });
     res.json({
-      token,
-      user: { id: user.id, phone: user.phone, ...subscriptionPublicFields(user) },
+      status: 'ok',
+      token: consumed.token,
+      user: publicUser(user),
     });
   }),
 );
 
 authRouter.get(
   '/me',
   asyncHandler(async (req, res) => {
     const header = req.header('x-user-token')?.trim();
     if (!header) {
       throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
     }
+
     const payload = await verifyUserToken(header);
     const prisma = requireDb();
     const user = await prisma.user.findUnique({ where: { id: payload.sub } });
     if (!user) {
       throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
     }
-    res.json({
-      id: user.id,
-      phone: user.phone,
-      ...subscriptionPublicFields(user),
-    });
+
+    res.json(publicUser(user));
   }),
 );
