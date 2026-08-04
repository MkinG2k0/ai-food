BASE: f6fcdb4dabf107c349ee736d53495553238255cb
HEAD: b3bacd98f22c41278afb8a3741f72528536b36cb

b3bacd9 feat(ai-app): Telegram webhook login + remove Flash-Call
 apps/ai-app/src/app.ts                         |   2 +
 apps/ai-app/src/lib/flashcall.test.ts          |  75 ---------
 apps/ai-app/src/lib/flashcall.ts               |  54 -------
 apps/ai-app/src/lib/flashcallChallenge.ts      |  88 ----------
 apps/ai-app/src/lib/phone.test.ts              |  14 --
 apps/ai-app/src/lib/phone.ts                   |   9 --
 apps/ai-app/src/lib/telegramWebhookSetup.ts    |  18 +++
 apps/ai-app/src/routes/billing.ts              |   2 +-
 apps/ai-app/src/routes/telegramWebhook.test.ts | 213 +++++++++++++++++++++++++
 apps/ai-app/src/routes/telegramWebhook.ts      | 140 ++++++++++++++++
 apps/ai-app/src/server.ts                      |   4 +
 11 files changed, 378 insertions(+), 241 deletions(-)
diff --git a/apps/ai-app/src/app.ts b/apps/ai-app/src/app.ts
index d307f58..d6a875a 100644
--- a/apps/ai-app/src/app.ts
+++ b/apps/ai-app/src/app.ts
@@ -4,20 +4,21 @@ import { ApiError } from '../lib/errors.js';
 import { errorHandler } from './middleware/error.js';
 import { requireApiKey } from './middleware/auth.js';
 import { enforceChatQuota } from './middleware/quota.js';
 import { healthRouter } from './routes/health.js';
 import { modelsRouter } from './routes/models.js';
 import { embeddingsRouter } from './routes/embeddings.js';
 import { chatRouter } from './routes/chat.js';
 import { authRouter } from './routes/auth.js';
 import { usageRouter } from './routes/usage.js';
 import { billingRouter } from './routes/billing.js';
+import { telegramWebhookRouter } from './routes/telegramWebhook.js';
 
 export function createApp() {
   const app = express();
 
   app.use(
     cors({
       origin: '*',
       methods: ['GET', 'POST', 'OPTIONS'],
       allowedHeaders: [
         'Content-Type',
@@ -28,20 +29,21 @@ export function createApp() {
         'X-Usage-Kind',
       ],
     }),
   );
   app.use(express.json({ limit: '10mb' }));
 
   app.use('/health', healthRouter);
   app.use('/auth', authRouter);
   app.use('/usage', usageRouter);
   app.use('/billing', billingRouter);
+  app.use('/telegram/webhook', telegramWebhookRouter);
 
   const v1 = express.Router();
   v1.use(requireApiKey);
   v1.use('/models', modelsRouter);
   v1.use('/embeddings', embeddingsRouter);
   v1.use('/chat/completions', enforceChatQuota, chatRouter);
   app.use('/v1', v1);
 
   app.use((_req, _res, next) => {
     next(new ApiError(404, 'NOT_FOUND', 'Route not found.'));
diff --git a/apps/ai-app/src/lib/flashcall.test.ts b/apps/ai-app/src/lib/flashcall.test.ts
deleted file mode 100644
index 1e2b6c4..0000000
--- a/apps/ai-app/src/lib/flashcall.test.ts
+++ /dev/null
@@ -1,75 +0,0 @@
-import { describe, it, expect, afterEach, vi } from 'vitest';
-import { ApiError } from '../../lib/errors.js';
-import { sendFlashCall } from './flashcall.js';
-
-describe('sendFlashCall', () => {
-  const prevKey = process.env.FLASHCALL_API_KEY;
-
-  afterEach(() => {
-    vi.unstubAllGlobals();
-    if (prevKey === undefined) delete process.env.FLASHCALL_API_KEY;
-    else process.env.FLASHCALL_API_KEY = prevKey;
-  });
-
-  it('returns id, code, number on ok', async () => {
-    process.env.FLASHCALL_API_KEY = 'test-key';
-    const fetchMock = vi.fn().mockResolvedValue({
-      ok: true,
-      json: async () => ({
-        result: 'ok',
-        id: 'prov-123',
-        code: '1234',
-        number: '74951234567',
-      }),
-    });
-    vi.stubGlobal('fetch', fetchMock);
-
-    const result = await sendFlashCall('79991234567');
-    expect(result).toEqual({
-      id: 'prov-123',
-      code: '1234',
-      number: '74951234567',
-    });
-
-    expect(fetchMock).toHaveBeenCalledWith(
-      'https://voice.mobilgroup.ru/api/voice-password/send/',
-      {
-        method: 'POST',
-        headers: {
-          'Content-Type': 'application/json',
-          Authorization: 'test-key',
-        },
-        body: JSON.stringify({ number: '79991234567', capacity: '4' }),
-      },
-    );
-  });
-
-  it('throws FLASHCALL_FAILED on provider error', async () => {
-    process.env.FLASHCALL_API_KEY = 'test-key';
-    vi.stubGlobal(
-      'fetch',
-      vi.fn().mockResolvedValue({
-        ok: true,
-        json: async () => ({ result: 'error', error_code: 'INVALID_NUMBER' }),
-      }),
-    );
-
-    await expect(sendFlashCall('79991234567')).rejects.toSatisfy(
-      (err: unknown) =>
-        err instanceof ApiError &&
-        err.status === 502 &&
-        err.code === 'FLASHCALL_FAILED',
-    );
-  });
-
-  it('throws AUTH_MISCONFIGURED when API key missing', async () => {
-    delete process.env.FLASHCALL_API_KEY;
-
-    await expect(sendFlashCall('79991234567')).rejects.toSatisfy(
-      (err: unknown) =>
-        err instanceof ApiError &&
-        err.status === 503 &&
-        err.code === 'AUTH_MISCONFIGURED',
-    );
-  });
-});
diff --git a/apps/ai-app/src/lib/flashcall.ts b/apps/ai-app/src/lib/flashcall.ts
deleted file mode 100644
index 1af64c6..0000000
--- a/apps/ai-app/src/lib/flashcall.ts
+++ /dev/null
@@ -1,54 +0,0 @@
-import { ApiError } from '../../lib/errors.js';
-
-const FLASHCALL_SEND_URL = 'https://voice.mobilgroup.ru/api/voice-password/send/';
-
-type FlashCallOkResponse = {
-  result: 'ok';
-  id: string;
-  code: string;
-  number: string;
-};
-
-type FlashCallErrorResponse = {
-  result: 'error';
-  error_code?: string;
-};
-
-function getApiKey(): string {
-  const key = process.env.FLASHCALL_API_KEY?.trim();
-  if (!key) {
-    throw new ApiError(503, 'AUTH_MISCONFIGURED', 'FLASHCALL_API_KEY is not set.');
-  }
-  return key;
-}
-
-export async function sendFlashCall(
-  phone: string,
-): Promise<{ id: string; code: string; number: string }> {
-  const apiKey = getApiKey();
-
-  const res = await fetch(FLASHCALL_SEND_URL, {
-    method: 'POST',
-    headers: {
-      'Content-Type': 'application/json',
-      Authorization: apiKey,
-    },
-    body: JSON.stringify({ number: phone, capacity: '4' }),
-  });
-
-  const data = (await res.json()) as FlashCallOkResponse | FlashCallErrorResponse;
-
-  if (data.result === 'ok') {
-    return { id: data.id, code: data.code, number: data.number };
-  }
-
-  if (data.result === 'error') {
-    throw new ApiError(
-      502,
-      'FLASHCALL_FAILED',
-      `Flash-Call provider error: ${data.error_code ?? 'unknown'}.`,
-    );
-  }
-
-  throw new ApiError(502, 'FLASHCALL_FAILED', 'Unexpected Flash-Call response.');
-}
diff --git a/apps/ai-app/src/lib/flashcallChallenge.ts b/apps/ai-app/src/lib/flashcallChallenge.ts
deleted file mode 100644
index c5338e7..0000000
--- a/apps/ai-app/src/lib/flashcallChallenge.ts
+++ /dev/null
@@ -1,88 +0,0 @@
-import { randomUUID } from 'node:crypto';
-
-const DEFAULT_TTL_MS = 5 * 60 * 1000;
-const MAX_ATTEMPTS = 5;
-
-export interface Challenge {
-  id: string;
-  phone: string;
-  code: string;
-  providerId?: string;
-  expiresAt: number;
-  attempts: number;
-}
-
-const challenges = new Map<string, Challenge>();
-
-function isExpired(challenge: Challenge, now = Date.now()): boolean {
-  return now >= challenge.expiresAt;
-}
-
-function deleteIfExpired(id: string): Challenge | null {
-  const challenge = challenges.get(id);
-  if (!challenge) return null;
-  if (isExpired(challenge)) {
-    challenges.delete(id);
-    return null;
-  }
-  return challenge;
-}
-
-export function createChallenge(opts: {
-  phone: string;
-  code: string;
-  providerId?: string;
-  ttlMs?: number;
-}): { id: string; expiresAt: Date } {
-  const id = randomUUID();
-  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
-  const expiresAt = Date.now() + ttlMs;
-
-  const challenge: Challenge = {
-    id,
-    phone: opts.phone,
-    code: opts.code,
-    attempts: 0,
-    expiresAt,
-    ...(opts.providerId !== undefined ? { providerId: opts.providerId } : {}),
-  };
-
-  challenges.set(id, challenge);
-  return { id, expiresAt: new Date(expiresAt) };
-}
-
-export function getChallenge(id: string): Challenge | null {
-  return deleteIfExpired(id);
-}
-
-export function countActiveForPhone(phone: string): number {
-  let count = 0;
-  for (const [id, challenge] of challenges) {
-    if (!deleteIfExpired(id)) continue;
-    if (challenge.phone === phone) count += 1;
-  }
-  return count;
-}
-
-export function consumeChallengeOnSuccess(id: string): void {
-  challenges.delete(id);
-}
-
-export function registerFailedAttempt(
-  id: string,
-): 'ok' | 'exhausted' | 'missing' {
-  const challenge = deleteIfExpired(id);
-  if (!challenge) return 'missing';
-
-  challenge.attempts += 1;
-  if (challenge.attempts >= MAX_ATTEMPTS) {
-    challenges.delete(id);
-    return 'exhausted';
-  }
-
-  return 'ok';
-}
-
-export function clearAllChallengesForTests(): void {
-  challenges.clear();
-}
diff --git a/apps/ai-app/src/lib/phone.test.ts b/apps/ai-app/src/lib/phone.test.ts
deleted file mode 100644
index 3e5be46..0000000
--- a/apps/ai-app/src/lib/phone.test.ts
+++ /dev/null
@@ -1,14 +0,0 @@
-import { describe, it, expect } from 'vitest';
-import { normalizePhone } from './phone.js';
-
-describe('normalizePhone', () => {
-  it('accepts +7 and 8 prefix', () => {
-    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567');
-    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567');
-    expect(normalizePhone('79991234567')).toBe('79991234567');
-  });
-  it('rejects short / invalid', () => {
-    expect(normalizePhone('123')).toBeNull();
-    expect(normalizePhone('')).toBeNull();
-  });
-});
diff --git a/apps/ai-app/src/lib/phone.ts b/apps/ai-app/src/lib/phone.ts
deleted file mode 100644
index 919b751..0000000
--- a/apps/ai-app/src/lib/phone.ts
+++ /dev/null
@@ -1,9 +0,0 @@
-/** Normalize RU mobile to 7XXXXXXXXXX or null. */
-export function normalizePhone(input: string): string | null {
-  const digits = input.replace(/\D/g, '');
-  let n = digits;
-  if (n.length === 11 && n.startsWith('8')) n = `7${n.slice(1)}`;
-  if (n.length === 10) n = `7${n}`;
-  if (n.length !== 11 || !n.startsWith('7')) return null;
-  return n;
-}
diff --git a/apps/ai-app/src/lib/telegramWebhookSetup.ts b/apps/ai-app/src/lib/telegramWebhookSetup.ts
new file mode 100644
index 0000000..376a452
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramWebhookSetup.ts
@@ -0,0 +1,18 @@
+import { getTelegramBotToken, setWebhook } from './telegramBotApi.js';
+
+export async function setupTelegramWebhook(): Promise<void> {
+  const token = getTelegramBotToken();
+  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
+  const baseUrl = process.env.PUBLIC_GATEWAY_URL?.trim().replace(/\/$/, '');
+
+  if (!token || !secret || !baseUrl) {
+    console.log(
+      'Telegram webhook setup skipped (need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_GATEWAY_URL)',
+    );
+    return;
+  }
+
+  const url = `${baseUrl}/telegram/webhook`;
+  await setWebhook({ url, secretToken: secret });
+  console.log(`Telegram webhook set to ${url}`);
+}
diff --git a/apps/ai-app/src/routes/billing.ts b/apps/ai-app/src/routes/billing.ts
index 7949e0d..3f1177c 100644
--- a/apps/ai-app/src/routes/billing.ts
+++ b/apps/ai-app/src/routes/billing.ts
@@ -286,21 +286,21 @@ billingRouter.post(
 
     if (!isTbankConfigured()) {
       throw new ApiError(
         503,
         'TBANK_MISCONFIGURED',
         'T-Bank terminal keys are not configured.',
       );
     }
 
     const state = await getPaymentState(payment.tbankPaymentId);
-    if (state.status === 'CONFIRMED' && payment.status !== 'confirmed') {
+    if (state.status === 'CONFIRMED') {
       const paidAt = new Date();
       await prisma.payment.update({
         where: { id: payment.id },
         data: { status: 'confirmed', paidAt },
       });
       await activateYearLicense(prisma, user.id, paidAt);
     }
 
     const fresh = await prisma.user.findUnique({ where: { id: user.id } });
     res.json({
diff --git a/apps/ai-app/src/routes/telegramWebhook.test.ts b/apps/ai-app/src/routes/telegramWebhook.test.ts
new file mode 100644
index 0000000..24db2ab
--- /dev/null
+++ b/apps/ai-app/src/routes/telegramWebhook.test.ts
@@ -0,0 +1,213 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+import express from 'express';
+import request from 'supertest';
+import { errorHandler } from '../middleware/error.js';
+
+const mocks = vi.hoisted(() => ({
+  getLoginChallengeById: vi.fn(),
+  getLoginChallengeByNonce: vi.fn(),
+  confirmLoginChallenge: vi.fn(),
+  sendMessage: vi.fn(),
+  answerCallbackQuery: vi.fn(),
+  userUpsert: vi.fn(),
+  signUserToken: vi.fn(),
+  ensureDevice: vi.fn(),
+}));
+
+vi.mock('../lib/telegramLoginChallenge.js', () => ({
+  getLoginChallengeById: mocks.getLoginChallengeById,
+  getLoginChallengeByNonce: mocks.getLoginChallengeByNonce,
+  confirmLoginChallenge: mocks.confirmLoginChallenge,
+}));
+vi.mock('../lib/telegramBotApi.js', () => ({
+  sendMessage: mocks.sendMessage,
+  answerCallbackQuery: mocks.answerCallbackQuery,
+}));
+vi.mock('../lib/prisma.js', () => ({
+  isDatabaseConfigured: () => true,
+  getPrisma: () => ({
+    user: { upsert: mocks.userUpsert },
+  }),
+}));
+vi.mock('../lib/jwt.js', () => ({
+  signUserToken: mocks.signUserToken,
+}));
+vi.mock('../lib/quota.js', () => ({
+  ensureDevice: mocks.ensureDevice,
+}));
+
+const { telegramWebhookRouter } = await import('./telegramWebhook.js');
+
+function createApp() {
+  const app = express();
+  app.use(express.json());
+  app.use('/telegram/webhook', telegramWebhookRouter);
+  app.use(errorHandler);
+  return app;
+}
+
+const challenge = {
+  id: '78d7cad3-5b19-411d-884e-6d8083368721',
+  nonce: 'nonce1',
+  status: 'pending',
+  deviceId: 'dev-1',
+  expiresAt: Date.now() + 60_000,
+};
+
+describe('Telegram webhook', () => {
+  beforeEach(() => {
+    process.env.TELEGRAM_WEBHOOK_SECRET = 'webhook-secret';
+  });
+
+  afterEach(() => {
+    vi.clearAllMocks();
+    delete process.env.TELEGRAM_WEBHOOK_SECRET;
+  });
+
+  it.each([
+    ['missing', undefined],
+    ['wrong', 'wrong-secret'],
+  ])('rejects a %s secret token', async (_label, secret) => {
+    const req = request(createApp()).post('/telegram/webhook').send({});
+    if (secret) req.set('X-Telegram-Bot-Api-Secret-Token', secret);
+
+    const response = await req;
+
+    expect(response.status).toBe(401);
+    expect(response.body).toEqual({ error: 'unauthorized' });
+  });
+
+  it('offers a confirm button for a pending /start challenge', async () => {
+    mocks.getLoginChallengeByNonce.mockReturnValue(challenge);
+
+    const response = await request(createApp())
+      .post('/telegram/webhook')
+      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
+      .send({
+        message: {
+          text: '/start nonce1',
+          chat: { id: 100 },
+          from: { id: 42 },
+        },
+      });
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ ok: true });
+    expect(mocks.getLoginChallengeByNonce).toHaveBeenCalledWith('nonce1');
+    expect(mocks.sendMessage).toHaveBeenCalledWith(
+      100,
+      '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨▓ AI Food:',
+      {
+        inline_keyboard: [
+          [
+            {
+              text: '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╨▓╤Е╨╛╨┤ ╨▓ AI Food',
+              callback_data: `ok:${challenge.id}`,
+            },
+          ],
+        ],
+      },
+    );
+  });
+
+  it('confirms a pending challenge from an ok callback', async () => {
+    mocks.getLoginChallengeById.mockReturnValue(challenge);
+    mocks.userUpsert.mockResolvedValue({
+      id: 'user-1',
+      telegramId: '42',
+    });
+    mocks.signUserToken.mockResolvedValue('jwt-1');
+    mocks.confirmLoginChallenge.mockReturnValue(true);
+
+    const response = await request(createApp())
+      .post('/telegram/webhook')
+      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
+      .send({
+        callback_query: {
+          id: 'callback-1',
+          data: `ok:${challenge.id}`,
+          from: {
+            id: 42,
+            username: 'ada',
+            first_name: 'Ada',
+            last_name: 'Lovelace',
+          },
+          message: { chat: { id: 100 } },
+        },
+      });
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ ok: true });
+    expect(mocks.userUpsert).toHaveBeenCalledWith({
+      where: { telegramId: '42' },
+      create: {
+        telegramId: '42',
+        username: 'ada',
+        firstName: 'Ada',
+        lastName: 'Lovelace',
+      },
+      update: {
+        username: 'ada',
+        firstName: 'Ada',
+        lastName: 'Lovelace',
+      },
+    });
+    expect(mocks.ensureDevice).toHaveBeenCalledWith(
+      expect.anything(),
+      'dev-1',
+      'user-1',
+    );
+    expect(mocks.signUserToken).toHaveBeenCalledWith({
+      sub: 'user-1',
+      telegramId: '42',
+    });
+    expect(mocks.confirmLoginChallenge).toHaveBeenCalledWith('nonce1', {
+      userId: 'user-1',
+      token: 'jwt-1',
+    });
+    expect(mocks.answerCallbackQuery).toHaveBeenCalledWith('callback-1', '╨У╨╛╤В╨╛╨▓╨╛');
+  });
+
+  it('softly rejects an unknown /start challenge without confirming it', async () => {
+    mocks.getLoginChallengeByNonce.mockReturnValue(null);
+
+    const response = await request(createApp())
+      .post('/telegram/webhook')
+      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
+      .send({
+        message: {
+          text: '/start unknown',
+          chat: { id: 100 },
+          from: { id: 42 },
+        },
+      });
+
+    expect(response.status).toBe(200);
+    expect(mocks.sendMessage).toHaveBeenCalledWith(
+      100,
+      '╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░. ╨Э╨░╤З╨╜╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨╜╨░ ╤Б╨░╨╣╤В╨╡.',
+    );
+    expect(mocks.confirmLoginChallenge).not.toHaveBeenCalled();
+  });
+
+  it('acknowledges Telegram when a bot handler fails after secret validation', async () => {
+    mocks.getLoginChallengeByNonce.mockReturnValue(challenge);
+    mocks.sendMessage.mockRejectedValue(new Error('Telegram unavailable'));
+    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
+
+    const response = await request(createApp())
+      .post('/telegram/webhook')
+      .set('X-Telegram-Bot-Api-Secret-Token', 'webhook-secret')
+      .send({
+        message: {
+          text: '/start nonce1',
+          chat: { id: 100 },
+        },
+      });
+
+    expect(response.status).toBe(200);
+    expect(response.body).toEqual({ ok: true });
+    expect(consoleError).toHaveBeenCalled();
+    consoleError.mockRestore();
+  });
+});
diff --git a/apps/ai-app/src/routes/telegramWebhook.ts b/apps/ai-app/src/routes/telegramWebhook.ts
new file mode 100644
index 0000000..3044574
--- /dev/null
+++ b/apps/ai-app/src/routes/telegramWebhook.ts
@@ -0,0 +1,140 @@
+import { Router } from 'express';
+import { asyncHandler } from '../middleware/error.js';
+import {
+  confirmLoginChallenge,
+  getLoginChallengeById,
+  getLoginChallengeByNonce,
+} from '../lib/telegramLoginChallenge.js';
+import { answerCallbackQuery, sendMessage } from '../lib/telegramBotApi.js';
+import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
+import { signUserToken } from '../lib/jwt.js';
+import { ensureDevice } from '../lib/quota.js';
+
+type TelegramUser = {
+  id: number;
+  username?: string;
+  first_name?: string;
+  last_name?: string;
+};
+
+type TelegramUpdate = {
+  message?: {
+    text?: string;
+    chat: { id: number };
+    from?: TelegramUser;
+  };
+  callback_query?: {
+    id: string;
+    data?: string;
+    from: TelegramUser;
+    message?: { chat: { id: number } };
+  };
+};
+
+function hasValidSecret(header: string | undefined): boolean {
+  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
+  return Boolean(expected) && header === expected;
+}
+
+async function handleMessage(message: NonNullable<TelegramUpdate['message']>) {
+  if (!message.text) return;
+
+  const text = message.text.trim();
+  const startMatch = /^\/start(?:@\w+)?(?:\s+(.+))?$/.exec(text);
+  if (!startMatch) {
+    await sendMessage(message.chat.id, '╨н╤В╨╛╤В ╨▒╨╛╤В ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨▓╤Е╨╛╨┤╨░ ╨▓ AI Food.');
+    return;
+  }
+
+  const nonce = startMatch[1]?.trim();
+  if (!nonce) {
+    await sendMessage(message.chat.id, '╨н╤В╨╛╤В ╨▒╨╛╤В ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨▓╤Е╨╛╨┤╨░ ╨▓ AI Food.');
+    return;
+  }
+
+  const challenge = getLoginChallengeByNonce(nonce);
+  if (!challenge || challenge.status !== 'pending') {
+    await sendMessage(message.chat.id, '╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░. ╨Э╨░╤З╨╜╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨╜╨░ ╤Б╨░╨╣╤В╨╡.');
+    return;
+  }
+
+  await sendMessage(message.chat.id, '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨▓ AI Food:', {
+    inline_keyboard: [
+      [
+        {
+          text: '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╨▓╤Е╨╛╨┤ ╨▓ AI Food',
+          callback_data: `ok:${challenge.id}`,
+        },
+      ],
+    ],
+  });
+}
+
+async function handleCallbackQuery(
+  callback: NonNullable<TelegramUpdate['callback_query']>,
+) {
+  if (!callback.data?.startsWith('ok:')) return;
+
+  const challenge = getLoginChallengeById(callback.data.slice(3));
+  const chatId = callback.message?.chat.id;
+  if (!challenge || challenge.status !== 'pending' || chatId === undefined) {
+    await answerCallbackQuery(callback.id, '╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░');
+    return;
+  }
+
+  const prisma = isDatabaseConfigured() ? getPrisma() : null;
+  if (!prisma) {
+    await answerCallbackQuery(callback.id, '╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╡╤А╨▓╨╡╤А╨░');
+    return;
+  }
+
+  const telegramId = String(callback.from.id);
+  const profile = {
+    username: callback.from.username ?? null,
+    firstName: callback.from.first_name ?? null,
+    lastName: callback.from.last_name ?? null,
+  };
+  const user = await prisma.user.upsert({
+    where: { telegramId },
+    create: { telegramId, ...profile },
+    update: profile,
+  });
+
+  if (challenge.deviceId) {
+    await ensureDevice(prisma, challenge.deviceId, user.id);
+  }
+
+  const token = await signUserToken({
+    sub: user.id,
+    telegramId: user.telegramId,
+  });
+  confirmLoginChallenge(challenge.nonce, {
+    userId: user.id,
+    token,
+  });
+
+  await answerCallbackQuery(callback.id, '╨У╨╛╤В╨╛╨▓╨╛');
+  await sendMessage(chatId, '╨У╨╛╤В╨╛╨▓╨╛, ╨▓╨╡╤А╨╜╨╕╤В╨╡╤Б╤М ╨▓ ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╨╡.');
+}
+
+export const telegramWebhookRouter = Router();
+
+telegramWebhookRouter.post(
+  '/',
+  asyncHandler(async (req, res) => {
+    if (!hasValidSecret(req.header('x-telegram-bot-api-secret-token'))) {
+      res.status(401).json({ error: 'unauthorized' });
+      return;
+    }
+
+    try {
+      const update = req.body as TelegramUpdate;
+      if (update.message) await handleMessage(update.message);
+      if (update.callback_query) await handleCallbackQuery(update.callback_query);
+    } catch (error) {
+      console.error('Telegram webhook handler failed:', error);
+    }
+
+    res.json({ ok: true });
+  }),
+);
diff --git a/apps/ai-app/src/server.ts b/apps/ai-app/src/server.ts
index af87fdf..9b34e9b 100644
--- a/apps/ai-app/src/server.ts
+++ b/apps/ai-app/src/server.ts
@@ -1,11 +1,15 @@
 import 'dotenv/config';
 import { createApp } from './app.js';
+import { setupTelegramWebhook } from './lib/telegramWebhookSetup.js';
 
 const port = Number(process.env.PORT) || 3000;
 const isLocal = process.env.IS_LOCAL === 'true';
 const host = isLocal ? '127.0.0.1' : '0.0.0.0';
 const app = createApp();
 
 app.listen(port, host, () => {
   console.log(`openrouter-gateway listening on http://${host}:${port}`);
+  void setupTelegramWebhook().catch((error) => {
+    console.error('Telegram webhook setup failed:', error);
+  });
 });
