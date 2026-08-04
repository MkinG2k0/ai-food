# Telegram Bot Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Flash-Call phone auth with Telegram bot deep-link login (challenge + webhook confirm + status poll) inside `apps/ai-app`, and rewire `ai-food` `/login` to that flow.

**Architecture:** Login challenges live in-memory on the gateway. Web starts a challenge, opens `t.me/<bot>?start=<nonce>`, bot confirms via webhook, web polls `/auth/telegram/status` once for JWT. User identity is `telegramId` again; Flash-Call and `phone` are removed.

**Tech Stack:** Express, Prisma/Postgres, jose JWT, Vitest + supertest, Vite React (`ai-food`), Telegram Bot HTTP API via `fetch` (no grammY).

**Spec:** `apps/ai-app/docs/superpowers/specs/2026-08-04-telegram-bot-auth-design.md`

## Global Constraints

- Bot lives in `apps/ai-app` — no separate bot service.
- Webhook path: `POST /telegram/webhook`; auth via header `X-Telegram-Bot-Api-Secret-Token` === `TELEGRAM_WEBHOOK_SECRET`.
- Status poll always HTTP 200 with `status: "pending" | "expired" | "ok"`.
- Successful status poll consumes the challenge (one-shot JWT).
- Destructive DB migration OK (wipe User/Payment).
- No Login Widget, no Mini App, no bot features beyond login.
- Thin Bot API client only (`sendMessage`, `answerCallbackQuery`, `setWebhook`, optional `editMessageText`).
- Prefer existing patterns in `apps/ai-app/src` (ApiError, asyncHandler, vitest mocks like flashcall tests).

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-app/src/lib/jwt.ts` | JWT claims: `telegramId` instead of `phone` |
| `apps/ai-app/prisma/schema.prisma` | `User.telegramId` (+ profile fields); drop `phone` |
| `apps/ai-app/prisma/migrations/…_telegram_bot_user/` | Destructive migrate phone → telegram |
| `apps/ai-app/src/lib/telegramLoginChallenge.ts` | In-memory login challenges |
| `apps/ai-app/src/lib/telegramBotApi.ts` | Thin Telegram Bot HTTP client |
| `apps/ai-app/src/routes/auth.ts` | `/telegram/start`, `/telegram/status`, `/me` |
| `apps/ai-app/src/routes/telegramWebhook.ts` | Webhook handler |
| `apps/ai-app/src/lib/telegramWebhookSetup.ts` | `setWebhook` on boot |
| `apps/ai-app/src/app.ts` | Mount `/telegram/webhook` |
| `apps/ai-app/src/server.ts` | Call webhook setup after listen |
| Delete | `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts` + tests; `auth.flashcall.test.ts` |
| `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` | start + poll + store session |
| `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx` | UI replacing Login Widget |
| Docs / `.env.example` / `DOKPLOY.md` / `AI-GATEWAY.md` | Env + endpoint contract |

---

### Task 1: JWT — `phone` → `telegramId`

**Files:**
- Modify: `apps/ai-app/src/lib/jwt.ts`
- Modify: `apps/ai-app/src/lib/jwt.test.ts`
- Modify: `apps/ai-app/src/middleware/quota.test.ts` (mock payloads)
- Modify: `apps/ai-app/src/routes/billing.test.ts` (mock payloads)

**Interfaces:**
- Consumes: none
- Produces: `UserTokenPayload = { sub: string; telegramId: string }`; `signUserToken` / `verifyUserToken` use `telegramId` claim

- [ ] **Step 1: Update failing expectations in `jwt.test.ts`**

Replace phone-based cases with:

```ts
it('round-trips sub and telegramId', async () => {
  const token = await signUserToken({ sub: 'user_1', telegramId: '42' });
  const payload = await verifyUserToken(token);
  expect(payload).toEqual({ sub: 'user_1', telegramId: '42' });
});
```

Also update any other `phone` usages in that file to `telegramId: '42'`.

- [ ] **Step 2: Run test — expect FAIL (still signs `phone`)**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts`
Expected: FAIL (missing `telegramId` / unexpected `phone`)

- [ ] **Step 3: Implement JWT**

Replace `apps/ai-app/src/lib/jwt.ts` contents with:

```ts
import { SignJWT, jwtVerify } from 'jose';
import { ApiError } from '../../lib/errors.js';

export type UserTokenPayload = {
  sub: string;
  telegramId: string;
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
  return new SignJWT({ telegramId: payload.telegramId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .sign(getSecretKey());
}

export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    const telegramId = payload.telegramId;
    if (!sub || typeof telegramId !== 'string') {
      throw new Error('invalid claims');
    }
    return { sub, telegramId };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, 'INVALID_USER_TOKEN', 'Invalid or expired user token.');
  }
}
```

- [ ] **Step 4: Fix test mocks that still return `phone`**

In `quota.test.ts` and `billing.test.ts`, change mock resolved values from `{ sub, phone: '…' }` to `{ sub, telegramId: '42' }` (keep existing `sub` strings).

- [ ] **Step 5: Run tests**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts src/middleware/quota.test.ts src/routes/billing.test.ts`
Expected: PASS (auth route tests may still fail if run later — do not run flashcall suite yet)

- [ ] **Step 6: Commit**

```bash
git add apps/ai-app/src/lib/jwt.ts apps/ai-app/src/lib/jwt.test.ts apps/ai-app/src/middleware/quota.test.ts apps/ai-app/src/routes/billing.test.ts
git commit -m "refactor(ai-app): JWT claims use telegramId instead of phone"
```

---

### Task 2: Prisma — restore Telegram user fields

**Files:**
- Modify: `apps/ai-app/prisma/schema.prisma`
- Create: `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`
- Note: `auth.ts` still references `phone` until Task 5 — type-check may fail until then; do not block on full `tsc` until Task 5.

**Interfaces:**
- Consumes: none
- Produces: `User` with `telegramId String @unique`, optional `username`, `firstName`, `lastName`, `photoUrl`; no `phone`

- [ ] **Step 1: Update schema `User` model**

In `apps/ai-app/prisma/schema.prisma`, replace the `User` model with:

```prisma
model User {
  id                     String             @id @default(cuid())
  telegramId             String             @unique
  username               String?
  firstName              String?
  lastName               String?
  photoUrl               String?
  subscriptionStatus     SubscriptionStatus @default(none)
  subscriptionExpiresAt  DateTime?
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt
  devices                Device[]
  usageEvents            UsageEvent[]
  payments               Payment[]
}
```

- [ ] **Step 2: Add migration SQL**

Create `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`:

```sql
-- Flash-Call phone identities are not migrated to Telegram.
DELETE FROM "Payment";
DELETE FROM "User";

ALTER TABLE "User" DROP COLUMN "phone",
ADD COLUMN "telegramId" TEXT NOT NULL,
ADD COLUMN "username" TEXT,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "photoUrl" TEXT;

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
```

- [ ] **Step 3: Generate client**

Run: `cd apps/ai-app && pnpm exec prisma generate`
Expected: success

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user
git commit -m "feat(ai-app): migrate User identity back to telegramId"
```

---

### Task 3: In-memory Telegram login challenges

**Files:**
- Create: `apps/ai-app/src/lib/telegramLoginChallenge.ts`
- Create: `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`

**Interfaces:**
- Consumes: none
- Produces:
  - `LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed'`
  - `createLoginChallenge(opts?: { deviceId?: string; ttlMs?: number }): { id: string; nonce: string; expiresAt: Date }`
  - `getLoginChallengeById(id: string): Challenge | null`
  - `getLoginChallengeByNonce(nonce: string): Challenge | null`
  - `confirmLoginChallenge(nonce: string, opts: { userId: string; token: string }): boolean`
  - `consumeLoginChallenge(id: string): { token: string; userId: string } | null`
  - `clearAllLoginChallengesForTests(): void`
  - Challenge shape: `{ id, nonce, status, deviceId?, userId?, token?, expiresAt: number }`

- [ ] **Step 1: Write failing tests**

Create `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAllLoginChallengesForTests,
  confirmLoginChallenge,
  consumeLoginChallenge,
  createLoginChallenge,
  getLoginChallengeByNonce,
} from './telegramLoginChallenge.js';

describe('telegramLoginChallenge', () => {
  afterEach(() => {
    clearAllLoginChallengesForTests();
  });

  it('create → confirm → consume → second consume null', () => {
    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');

    expect(
      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
    ).toBe(true);

    const first = consumeLoginChallenge(id);
    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
    expect(consumeLoginChallenge(id)).toBeNull();
  });

  it('rejects confirm for unknown nonce', () => {
    expect(
      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
    ).toBe(false);
  });

  it('expires pending challenges', () => {
    const { id, nonce } = createLoginChallenge({ ttlMs: 1 });
    // force expiry
    const c = getLoginChallengeByNonce(nonce);
    expect(c).not.toBeNull();
    // wait > ttl
    const start = Date.now();
    while (Date.now() - start < 5) {
      /* spin */
    }
    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
      false,
    );
    expect(consumeLoginChallenge(id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement challenge store**

Create `apps/ai-app/src/lib/telegramLoginChallenge.ts`:

```ts
import { randomBytes, randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';

export type LoginChallenge = {
  id: string;
  nonce: string;
  status: LoginChallengeStatus;
  deviceId?: string;
  userId?: string;
  token?: string;
  expiresAt: number;
};

const byId = new Map<string, LoginChallenge>();
const byNonce = new Map<string, string>(); // nonce → id

function isExpired(c: LoginChallenge, now = Date.now()): boolean {
  return now >= c.expiresAt;
}

function purgeIfExpired(id: string): LoginChallenge | null {
  const c = byId.get(id);
  if (!c) return null;
  if (isExpired(c) || c.status === 'consumed') {
    byId.delete(id);
    byNonce.delete(c.nonce);
    return null;
  }
  return c;
}

export function createLoginChallenge(opts?: {
  deviceId?: string;
  ttlMs?: number;
}): { id: string; nonce: string; expiresAt: Date } {
  const id = randomUUID();
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
  const challenge: LoginChallenge = {
    id,
    nonce,
    status: 'pending',
    expiresAt,
    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
  };
  byId.set(id, challenge);
  byNonce.set(nonce, id);
  return { id, nonce, expiresAt: new Date(expiresAt) };
}

export function getLoginChallengeById(id: string): LoginChallenge | null {
  return purgeIfExpired(id);
}

export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
  const id = byNonce.get(nonce);
  if (!id) return null;
  return purgeIfExpired(id);
}

export function confirmLoginChallenge(
  nonce: string,
  opts: { userId: string; token: string },
): boolean {
  const c = getLoginChallengeByNonce(nonce);
  if (!c || c.status !== 'pending') return false;
  c.status = 'confirmed';
  c.userId = opts.userId;
  c.token = opts.token;
  return true;
}

export function consumeLoginChallenge(
  id: string,
): { token: string; userId: string } | null {
  const c = purgeIfExpired(id);
  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
  const result = { token: c.token, userId: c.userId };
  c.status = 'consumed';
  byId.delete(id);
  byNonce.delete(c.nonce);
  return result;
}

export function clearAllLoginChallengesForTests(): void {
  byId.clear();
  byNonce.clear();
}
```

Fix the expiry test if flaky: prefer injecting `ttlMs: -1` or setting `expiresAt` in the past via a test-only helper — if spin wait is flaky, change test to:

```ts
it('expires pending challenges', () => {
  const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
  expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(false);
  expect(consumeLoginChallenge(id)).toBeNull();
});
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/telegramLoginChallenge.ts apps/ai-app/src/lib/telegramLoginChallenge.test.ts
git commit -m "feat(ai-app): add Telegram login challenge store"
```

---

### Task 4: Thin Telegram Bot API client

**Files:**
- Create: `apps/ai-app/src/lib/telegramBotApi.ts`
- Create: `apps/ai-app/src/lib/telegramBotApi.test.ts`

**Interfaces:**
- Consumes: `process.env.TELEGRAM_BOT_TOKEN` or `AUTH_TELEGRAM_BOT_TOKEN`
- Produces:
  - `getTelegramBotToken(): string | null`
  - `getTelegramBotUsername(): string | null` (from `TELEGRAM_BOT_USERNAME`, strip `@`)
  - `buildBotDeepLink(nonce: string): string` → `https://t.me/<username>?start=<nonce>`
  - `telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T>`
  - helpers: `sendMessage`, `answerCallbackQuery`, `setWebhook`

- [ ] **Step 1: Write failing tests**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('telegramBotApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.AUTH_TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_USERNAME;
  });

  it('buildBotDeepLink uses username without @', async () => {
    process.env.TELEGRAM_BOT_USERNAME = '@MyFoodBot';
    process.env.TELEGRAM_BOT_TOKEN = '1:token';
    const { buildBotDeepLink } = await import('./telegramBotApi.js');
    expect(buildBotDeepLink('abc')).toBe('https://t.me/MyFoodBot?start=abc');
  });

  it('sendMessage posts to Bot API', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '1:token';
    process.env.TELEGRAM_BOT_USERNAME = 'MyFoodBot';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { sendMessage } = await import('./telegramBotApi.js');
    await sendMessage(1, 'hi', {
      inline_keyboard: [[{ text: 'OK', callback_data: 'c:x' }]],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bot1:token/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramBotApi.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement client**

Create `apps/ai-app/src/lib/telegramBotApi.ts`:

```ts
import { ApiError } from '../../lib/errors.js';

export function getTelegramBotToken(): string | null {
  const t =
    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.AUTH_TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

export function getTelegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!raw) return null;
  return raw.replace(/^@/, '');
}

export function buildBotDeepLink(nonce: string): string {
  const username = getTelegramBotUsername();
  if (!username) {
    throw new ApiError(
      503,
      'TELEGRAM_MISCONFIGURED',
      'TELEGRAM_BOT_USERNAME is not configured.',
    );
  }
  return `https://t.me/${username}?start=${encodeURIComponent(nonce)}`;
}

export async function telegramApi(
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const token = getTelegramBotToken();
  if (!token) {
    throw new ApiError(
      503,
      'TELEGRAM_MISCONFIGURED',
      'TELEGRAM_BOT_TOKEN is not configured.',
    );
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!res.ok || data.ok === false) {
    throw new ApiError(
      502,
      'TELEGRAM_API_ERROR',
      data.description || `Telegram API ${method} failed.`,
    );
  }
  return data;
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: { inline_keyboard: { text: string; callback_data: string }[][] },
): Promise<void> {
  await telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await telegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export async function setWebhook(opts: {
  url: string;
  secretToken: string;
}): Promise<void> {
  await telegramApi('setWebhook', {
    url: opts.url,
    secret_token: opts.secretToken,
    allowed_updates: ['message', 'callback_query'],
  });
}
```

- [ ] **Step 4: Run tests — PASS**

Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramBotApi.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/telegramBotApi.ts apps/ai-app/src/lib/telegramBotApi.test.ts
git commit -m "feat(ai-app): add thin Telegram Bot API client"
```

---

### Task 5: Auth routes — start / status / me (remove Flash-Call)

**Files:**
- Modify: `apps/ai-app/src/routes/auth.ts` (rewrite)
- Create: `apps/ai-app/src/routes/auth.telegram.test.ts`
- Delete: `apps/ai-app/src/routes/auth.flashcall.test.ts`

**Interfaces:**
- Consumes: `createLoginChallenge`, `consumeLoginChallenge`, `getLoginChallengeById`, `buildBotDeepLink`, `getTelegramBotToken`, `getTelegramBotUsername`, `signUserToken`, prisma User by `telegramId`, `subscriptionPublicFields`, `ensureDevice`
- Produces:
  - `POST /auth/telegram/start` → `{ challengeId, botDeepLink, expiresAt }`
  - `GET /auth/telegram/status?challengeId=` → `{ status }` or `{ status:'ok', token, user }`
  - `GET /auth/me` → telegram profile + subscription fields

- [ ] **Step 1: Write route tests**

Create `apps/ai-app/src/routes/auth.telegram.test.ts` modeled on the old flashcall test (hoisted mocks). Cover:

1. `start` returns `challengeId`, `botDeepLink`, `expiresAt` when token+username configured; does not return nonce alone without deep link.
2. `start` → 503 when bot misconfigured.
3. `status` pending → `{ status: 'pending' }`.
4. `status` after confirm+token on challenge → `{ status: 'ok', token, user }` and second call → `{ status: 'expired' }`.
5. `status` unknown id → `{ status: 'expired' }`.

Sketch for start (adjust import paths / mocks to match Task 3–4 exports):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/error.js';

const mocks = vi.hoisted(() => ({
  createLoginChallenge: vi.fn(),
  getLoginChallengeById: vi.fn(),
  consumeLoginChallenge: vi.fn(),
  buildBotDeepLink: vi.fn(),
  getTelegramBotToken: vi.fn(),
  getTelegramBotUsername: vi.fn(),
  upsert: vi.fn(),
  findUnique: vi.fn(),
  ensureDevice: vi.fn(),
  signUserToken: vi.fn(),
  verifyUserToken: vi.fn(),
}));

vi.mock('../lib/telegramLoginChallenge.js', () => ({
  createLoginChallenge: mocks.createLoginChallenge,
  getLoginChallengeById: mocks.getLoginChallengeById,
  consumeLoginChallenge: mocks.consumeLoginChallenge,
}));
vi.mock('../lib/telegramBotApi.js', () => ({
  buildBotDeepLink: mocks.buildBotDeepLink,
  getTelegramBotToken: mocks.getTelegramBotToken,
  getTelegramBotUsername: mocks.getTelegramBotUsername,
}));
vi.mock('../lib/prisma.js', () => ({
  isDatabaseConfigured: () => true,
  getPrisma: () => ({
    user: { upsert: mocks.upsert, findUnique: mocks.findUnique },
  }),
}));
vi.mock('../lib/quota.js', () => ({ ensureDevice: mocks.ensureDevice }));
vi.mock('../lib/jwt.js', () => ({
  signUserToken: mocks.signUserToken,
  verifyUserToken: mocks.verifyUserToken,
}));

const { authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('Telegram bot auth routes', () => {
  afterEach(() => vi.clearAllMocks());

  it('starts a login challenge', async () => {
    mocks.getTelegramBotToken.mockReturnValue('1:tok');
    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
    mocks.createLoginChallenge.mockReturnValue({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      nonce: 'nonce1',
      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
    });
    mocks.buildBotDeepLink.mockReturnValue('https://t.me/MyBot?start=nonce1');

    const res = await request(createApp())
      .post('/auth/telegram/start')
      .send({ deviceId: 'dev-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
      botDeepLink: 'https://t.me/MyBot?start=nonce1',
      expiresAt: '2026-08-04T16:00:00.000Z',
    });
  });

  it('returns pending then ok then expired on status', async () => {
    mocks.getLoginChallengeById.mockReturnValueOnce({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      status: 'pending',
      nonce: 'n',
      expiresAt: Date.now() + 60_000,
    });
    let res = await request(createApp()).get(
      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
    );
    expect(res.body).toEqual({ status: 'pending' });

    mocks.getLoginChallengeById.mockReturnValueOnce({
      id: '78d7cad3-5b19-411d-884e-6d8083368721',
      status: 'confirmed',
      nonce: 'n',
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
      token: 'jwt-1',
    });
    mocks.consumeLoginChallenge.mockReturnValueOnce({
      token: 'jwt-1',
      userId: 'user-1',
    });
    mocks.findUnique.mockResolvedValue({
      id: 'user-1',
      telegramId: '42',
      username: 'ada',
      firstName: 'Ada',
      lastName: null,
      photoUrl: null,
      subscriptionStatus: 'none',
      subscriptionExpiresAt: null,
    });

    res = await request(createApp()).get(
      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
    );
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.token).toBe('jwt-1');
    expect(res.body.user.telegramId).toBe('42');

    mocks.getLoginChallengeById.mockReturnValueOnce(null);
    mocks.consumeLoginChallenge.mockReturnValueOnce(null);
    res = await request(createApp()).get(
      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
    );
    expect(res.body).toEqual({ status: 'expired' });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/auth.telegram.test.ts`
Expected: FAIL (old flashcall routes / missing handlers)

- [ ] **Step 3: Rewrite `auth.ts`**

Replace `apps/ai-app/src/routes/auth.ts` with Telegram start/status/me (keep `requireDb` pattern from current file):

```ts
import { Router } from 'express';
import { z } from 'zod';
import { ApiError } from '../../lib/errors.js';
import { asyncHandler } from '../middleware/error.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { signUserToken, verifyUserToken } from '../lib/jwt.js';
import {
  createLoginChallenge,
  consumeLoginChallenge,
  getLoginChallengeById,
} from '../lib/telegramLoginChallenge.js';
import {
  buildBotDeepLink,
  getTelegramBotToken,
  getTelegramBotUsername,
} from '../lib/telegramBotApi.js';
import { ensureDevice } from '../lib/quota.js';
import { subscriptionPublicFields } from '../lib/subscription.js';

const StartBodySchema = z.object({
  deviceId: z.string().min(1).optional(),
});

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

function requireTelegramConfigured() {
  if (!getTelegramBotToken() || !getTelegramBotUsername()) {
    throw new ApiError(
      503,
      'TELEGRAM_MISCONFIGURED',
      'TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME must be configured.',
    );
  }
}

export const authRouter = Router();

authRouter.post(
  '/telegram/start',
  asyncHandler(async (req, res) => {
    requireTelegramConfigured();
    const parsed = StartBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Telegram start payload.');
    }
    const created = createLoginChallenge({
      deviceId: parsed.data.deviceId,
    });
    const botDeepLink = buildBotDeepLink(created.nonce);
    res.json({
      challengeId: created.id,
      botDeepLink,
      expiresAt: created.expiresAt.toISOString(),
    });
  }),
);

authRouter.get(
  '/telegram/status',
  asyncHandler(async (req, res) => {
    const challengeId =
      typeof req.query.challengeId === 'string' ? req.query.challengeId : '';
    if (!challengeId) {
      res.json({ status: 'expired' });
      return;
    }

    const challenge = getLoginChallengeById(challengeId);
    if (!challenge) {
      res.json({ status: 'expired' });
      return;
    }
    if (challenge.status === 'pending') {
      res.json({ status: 'pending' });
      return;
    }

    const consumed = consumeLoginChallenge(challengeId);
    if (!consumed) {
      res.json({ status: 'expired' });
      return;
    }

    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: consumed.userId } });
    if (!user) {
      res.json({ status: 'expired' });
      return;
    }

    res.json({
      status: 'ok',
      token: consumed.token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        ...subscriptionPublicFields(user),
      },
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
    const payload = await verifyUserToken(header);
    const prisma = requireDb();
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
    }
    res.json({
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      ...subscriptionPublicFields(user),
    });
  }),
);
```

- [ ] **Step 4: Delete flashcall route test; run telegram auth tests**

Delete `apps/ai-app/src/routes/auth.flashcall.test.ts`.

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/auth.telegram.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/routes/auth.ts apps/ai-app/src/routes/auth.telegram.test.ts
git rm apps/ai-app/src/routes/auth.flashcall.test.ts
git commit -m "feat(ai-app): Telegram bot start/status auth routes"
```

---

### Task 6: Webhook + boot `setWebhook` + remove Flash-Call libs

**Files:**
- Create: `apps/ai-app/src/routes/telegramWebhook.ts`
- Create: `apps/ai-app/src/routes/telegramWebhook.test.ts`
- Create: `apps/ai-app/src/lib/telegramWebhookSetup.ts`
- Modify: `apps/ai-app/src/app.ts` — mount webhook
- Modify: `apps/ai-app/src/server.ts` — call setup
- Delete: `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts` + their `*.test.ts`

**Interfaces:**
- Consumes: `getLoginChallengeByNonce`, `confirmLoginChallenge`, `signUserToken`, prisma upsert by `telegramId`, `ensureDevice`, `sendMessage`, `answerCallbackQuery`, `setWebhook`
- Produces: `telegramWebhookRouter`; `setupTelegramWebhook(): Promise<void>`
- Callback data format: `auth:<nonce>` (nonce is base64url ≤ 32 chars from 24 bytes; keep under 64-byte Telegram limit — if too long, store map `callback_data: 'auth:' + challengeId` instead and look up by id; **prefer `auth:` + challenge `id` (UUID)** for callback_data, and resolve challenge by id)

**Callback data decision (lock):** use `ok:${challenge.id}` (UUID). On `/start <nonce>`, look up by nonce; button `callback_data = 'ok:' + challenge.id`.

- [ ] **Step 1: Write webhook tests**

Cover:
1. Wrong/missing `X-Telegram-Bot-Api-Secret-Token` → 401
2. `/start <nonce>` with pending challenge → `sendMessage` called with confirm button
3. `callback_query` with `ok:<id>` → upsert user, `confirmLoginChallenge`, answer callback
4. Unknown start → soft message, no confirm

Use hoisted mocks for challenge store, bot API, prisma, jwt, quota.

- [ ] **Step 2: Run — FAIL**

Run: `cd apps/ai-app && pnpm exec vitest run src/routes/telegramWebhook.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement webhook router**

`apps/ai-app/src/routes/telegramWebhook.ts` — outline:

```ts
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.js';
import {
  getLoginChallengeById,
  getLoginChallengeByNonce,
  confirmLoginChallenge,
} from '../lib/telegramLoginChallenge.js';
import { sendMessage, answerCallbackQuery } from '../lib/telegramBotApi.js';
import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
import { signUserToken } from '../lib/jwt.js';
import { ensureDevice } from '../lib/quota.js';

function checkSecret(req: { header(name: string): string | undefined }): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  return req.header('x-telegram-bot-api-secret-token') === expected;
}

export const telegramWebhookRouter = Router();

telegramWebhookRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!checkSecret(req)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const update = req.body as {
      message?: {
        text?: string;
        chat: { id: number };
        from?: {
          id: number;
          username?: string;
          first_name?: string;
          last_name?: string;
        };
      };
      callback_query?: {
        id: string;
        data?: string;
        from: {
          id: number;
          username?: string;
          first_name?: string;
          last_name?: string;
        };
        message?: { chat: { id: number } };
      };
    };

    // Always 200 quickly after handling
    if (update.message?.text) {
      const text = update.message.text.trim();
      const startMatch = /^\/start(?:@\w+)?(?:\s+(.+))?$/.exec(text);
      if (startMatch) {
        const nonce = startMatch[1]?.trim();
        const chatId = update.message.chat.id;
        if (!nonce) {
          await sendMessage(chatId, 'Этот бот только для входа в AI Food.');
        } else {
          const challenge = getLoginChallengeByNonce(nonce);
          if (!challenge || challenge.status !== 'pending') {
            await sendMessage(
              chatId,
              'Ссылка устарела. Начните вход на сайте.',
            );
          } else {
            await sendMessage(chatId, 'Подтвердите вход в AI Food:', {
              inline_keyboard: [
                [{ text: 'Подтвердить вход в AI Food', callback_data: `ok:${challenge.id}` }],
              ],
            });
          }
        }
      } else {
        await sendMessage(
          update.message.chat.id,
          'Этот бот только для входа в AI Food.',
        );
      }
    }

    if (update.callback_query?.data?.startsWith('ok:')) {
      const challengeId = update.callback_query.data.slice(3);
      const challenge = getLoginChallengeById(challengeId);
      const chatId = update.callback_query.message?.chat.id;
      const from = update.callback_query.from;

      if (!challenge || challenge.status !== 'pending' || !chatId) {
        await answerCallbackQuery(update.callback_query.id, 'Ссылка устарела');
      } else if (!isDatabaseConfigured() || !getPrisma()) {
        await answerCallbackQuery(update.callback_query.id, 'Ошибка сервера');
      } else {
        const prisma = getPrisma()!;
        const telegramId = String(from.id);
        const user = await prisma.user.upsert({
          where: { telegramId },
          create: {
            telegramId,
            username: from.username ?? null,
            firstName: from.first_name ?? null,
            lastName: from.last_name ?? null,
          },
          update: {
            username: from.username ?? null,
            firstName: from.first_name ?? null,
            lastName: from.last_name ?? null,
          },
        });
        if (challenge.deviceId) {
          await ensureDevice(prisma, challenge.deviceId, user.id);
        }
        const token = await signUserToken({
          sub: user.id,
          telegramId: user.telegramId,
        });
        confirmLoginChallenge(challenge.nonce, {
          userId: user.id,
          token,
        });
        await answerCallbackQuery(update.callback_query.id, 'Готово');
        await sendMessage(chatId, 'Готово, вернитесь в приложение.');
      }
    }

    res.json({ ok: true });
  }),
);
```

Refine error handling so Bot API failures still return 200 to Telegram when possible (log and swallow after secret check) — avoid retry storms. Prefer try/catch around handlers; still `res.json({ ok: true })`.

- [ ] **Step 4: Mount in `app.ts`**

```ts
import { telegramWebhookRouter } from './routes/telegramWebhook.js';
// …
app.use('/telegram/webhook', telegramWebhookRouter);
```

- [ ] **Step 5: `telegramWebhookSetup.ts` + `server.ts`**

```ts
// telegramWebhookSetup.ts
import { getTelegramBotToken, setWebhook } from './telegramBotApi.js';

export async function setupTelegramWebhook(): Promise<void> {
  const token = getTelegramBotToken();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const base = process.env.PUBLIC_GATEWAY_URL?.trim()?.replace(/\/$/, '');
  if (!token || !secret || !base) {
    console.log(
      'Telegram webhook setup skipped (need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_GATEWAY_URL)',
    );
    return;
  }
  const url = `${base}/telegram/webhook`;
  await setWebhook({ url, secretToken: secret });
  console.log(`Telegram webhook set to ${url}`);
}
```

In `server.ts`, after `listen` callback, `void setupTelegramWebhook().catch((err) => console.error(err))`.

- [ ] **Step 6: Delete Flash-Call / phone modules**

Delete:
- `apps/ai-app/src/lib/flashcall.ts`
- `apps/ai-app/src/lib/flashcall.test.ts`
- `apps/ai-app/src/lib/flashcallChallenge.ts`
- `apps/ai-app/src/lib/phone.ts`
- `apps/ai-app/src/lib/phone.test.ts`

Ensure no remaining imports.

- [ ] **Step 7: Run full ai-app tests + type-check**

Run:
```bash
cd apps/ai-app && pnpm test && pnpm type-check
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/ai-app/src
git commit -m "feat(ai-app): Telegram webhook login + remove Flash-Call"
```

---

### Task 7: Frontend — bot login UX

**Files:**
- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts`
- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts`
- Create: `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx`
- Modify: `apps/ai-food/src/features/auth/index.ts`
- Modify: `apps/ai-food/src/pages/login/ui/LoginPage.tsx`
- Delete or stop exporting: `TelegramLoginButton.tsx`, widget-based `signInWithTelegram.ts` (replace implementation in place **or** delete and update imports — prefer replace `signInWithTelegram.ts` API with bot flow to minimize churn, keep `mapTelegramUserToSession`)

**Interfaces:**
- Consumes: `POST /auth/telegram/start`, `GET /auth/telegram/status`, `useAuthStore.signIn`, `getDeviceId`, `mapTelegramUserToSession`
- Produces: `startTelegramBotLogin(): Promise<TelegramSession>` (opens link + polls) OR split `createTelegramLoginChallenge` + `pollTelegramLoginStatus`

- [ ] **Step 1: Rewrite client API (TDD)**

Keep `mapTelegramUserToSession` tests. Replace `signInWithTelegram` body:

```ts
export async function signInWithTelegramBot(
  opts?: { signal?: AbortSignal; openLink?: (url: string) => void },
): Promise<TelegramSession> {
  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
  if (!gatewayUrl?.trim()) throw new Error('VITE_AI_GATEWAY_URL не задан');
  const base = gatewayUrl.replace(/\/$/, '');
  const deviceId = await getDeviceId();

  const startRes = await fetch(`${base}/auth/telegram/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
    signal: opts?.signal,
  });
  const start = (await startRes.json()) as {
    challengeId?: string;
    botDeepLink?: string;
    message?: string;
  };
  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
    throw new Error(start.message ?? `Не удалось начать вход (${startRes.status})`);
  }

  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
    start.botDeepLink,
  );

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) throw new Error('Вход отменён');
    await new Promise((r) => setTimeout(r, 1500));
    const st = await fetch(
      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
      { signal: opts?.signal },
    );
    const data = (await st.json()) as {
      status: string;
      token?: string;
      user?: AuthTelegramResponse['user'];
      message?: string;
    };
    if (data.status === 'ok' && data.token && data.user) {
      const session = mapTelegramUserToSession(data.user);
      useAuthStore.getState().signIn(session, data.token);
      return session;
    }
    if (data.status === 'expired') {
      throw new Error('Сессия входа истекла. Попробуйте снова.');
    }
  }
  throw new Error('Время ожидания входа истекло.');
}
```

Unit-test with mocked `fetch` + fake timers: pending → ok path stores token.

- [ ] **Step 2: UI button**

Replace `TelegramLoginButton` with a normal Button: «Войти через Telegram» → calls `signInWithTelegramBot`, loading state «Ожидаем подтверждение в Telegram…», cancel via AbortController on unmount.

Remove telegram-widget.js script usage entirely.

- [ ] **Step 3: Wire `LoginPage` + exports**

Update `index.ts` exports; remove widget types if unused.

- [ ] **Step 4: Run ai-food auth tests**

Run: `cd apps/ai-food && pnpm exec vitest run src/features/auth`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/auth apps/ai-food/src/pages/login
git commit -m "feat(ai-food): Telegram bot deep-link login instead of Login Widget"
```

---

### Task 8: Env examples + docs

**Files:**
- Modify: `apps/ai-app/.env.example`
- Modify: `apps/ai-food/.env.example`
- Modify: `docs/DOKPLOY.md`
- Modify: `apps/ai-food/docs/AI-GATEWAY.md`
- Modify local `.env` files only if needed for smoke (do **not** commit secrets)

- [ ] **Step 1: Update `apps/ai-app/.env.example`**

Remove `FLASHCALL_API_KEY`. Add:

```env
TELEGRAM_BOT_TOKEN=
# alias also accepted: AUTH_TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=
PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
```

- [ ] **Step 2: Update `apps/ai-food/.env.example`**

Document bot deep-link flow (not Login Widget domain). Keep optional `VITE_TELEGRAM_BOT_USERNAME` for copy only.

- [ ] **Step 3: Update `DOKPLOY.md` + `AI-GATEWAY.md`**

- Endpoints: `/auth/telegram/start`, `/auth/telegram/status`, `/telegram/webhook`
- Env table: Telegram vars; remove Flash-Call
- Note: `PUBLIC_GATEWAY_URL` = gateway public origin for webhook; `PUBLIC_APP_URL` remains frontend for T-Bank

- [ ] **Step 4: Commit**

```bash
git add apps/ai-app/.env.example apps/ai-food/.env.example docs/DOKPLOY.md apps/ai-food/docs/AI-GATEWAY.md
git commit -m "docs: Telegram bot auth env and gateway contract"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Bot in ai-app, not separate app | 4–6 |
| start → deep link → poll | 5, 7 |
| webhook confirm + JWT on challenge | 6 |
| User.telegramId + wipe migration | 2 |
| JWT telegramId | 1 |
| Remove Flash-Call | 5–6 |
| Status 200 pending/expired/ok | 5 |
| Consume once | 3, 5 |
| Webhook secret header | 6 |
| setWebhook on boot | 6 |
| Frontend replace widget | 7 |
| Docs / env | 8 |
| Non-goals (Mini App, bot product, etc.) | not scheduled |

## Plan self-review

- No TBD placeholders left; callback_data locked to `ok:<challengeId>`.
- Types consistent: `telegramId` string everywhere after Task 1–2.
- Expiry test uses `ttlMs: -1` to avoid flaky spin.

---

**Plan complete and saved to** `apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md`.

**Два варианта исполнения:**

1. **Subagent-Driven (рекомендую)** — свежий субагент на задачу, ревью между задачами  
2. **Inline Execution** — выполнять задачи в этой сессии с чекпоинтами  

Какой подход?
