MERGE_BASE: 2f93d8166ef39b60b227a481740183989343ca1a
HEAD: 5dd6acb5cd67a13aec83a231c36e3779bed36470

5dd6acb docs: Telegram bot auth env and gateway contract
81271ed feat(ai-food): Telegram bot deep-link login instead of Login Widget
b3bacd9 feat(ai-app): Telegram webhook login + remove Flash-Call
f6fcdb4 fix(ai-app): consume Telegram login challenge only after user load
fd7f73b feat(ai-app): Telegram bot start/status auth routes
5a0bd1c feat(ai-app): add thin Telegram Bot API client
8db7ba6 feat(ai-app): add Telegram login challenge store
cdde860 feat(ai-app): migrate User identity back to telegramId
f8b7a60 refactor(ai-app): JWT claims use telegramId instead of phone
f13c76b docs(ai-app): Telegram bot auth design and implementation plan
 .superpowers/sdd/task-5-report.md                  |   99 ++
 apps/ai-app/.env.example                           |    9 +-
 .../plans/2026-08-04-telegram-bot-auth.md          | 1317 ++++++++++++++++++++
 .../specs/2026-08-04-telegram-bot-auth-design.md   |  197 +++
 .../20260804180000_telegram_bot_user/migration.sql |   12 +
 apps/ai-app/prisma/schema.prisma                   |    6 +-
 apps/ai-app/src/app.ts                             |    2 +
 apps/ai-app/src/lib/flashcall.test.ts              |   75 --
 apps/ai-app/src/lib/flashcall.ts                   |   54 -
 apps/ai-app/src/lib/flashcallChallenge.ts          |   88 --
 apps/ai-app/src/lib/jwt.test.ts                    |    8 +-
 apps/ai-app/src/lib/jwt.ts                         |   10 +-
 apps/ai-app/src/lib/phone.test.ts                  |   14 -
 apps/ai-app/src/lib/phone.ts                       |    9 -
 apps/ai-app/src/lib/telegramBotApi.test.ts         |   36 +
 apps/ai-app/src/lib/telegramBotApi.ts              |   90 ++
 apps/ai-app/src/lib/telegramLoginChallenge.test.ts |   41 +
 apps/ai-app/src/lib/telegramLoginChallenge.ts      |   91 ++
 apps/ai-app/src/lib/telegramWebhookSetup.ts        |   18 +
 apps/ai-app/src/middleware/quota.test.ts           |    4 +-
 apps/ai-app/src/routes/auth.flashcall.test.ts      |  152 ---
 apps/ai-app/src/routes/auth.telegram.test.ts       |  204 +++
 apps/ai-app/src/routes/auth.ts                     |  164 +--
 apps/ai-app/src/routes/billing.test.ts             |    2 +-
 apps/ai-app/src/routes/billing.ts                  |    2 +-
 apps/ai-app/src/routes/telegramWebhook.test.ts     |  213 ++++
 apps/ai-app/src/routes/telegramWebhook.ts          |  140 +++
 apps/ai-app/src/server.ts                          |    4 +
 apps/ai-food/.env.example                          |   18 +-
 apps/ai-food/docs/AI-GATEWAY.md                    |   13 +-
 .../src/features/auth/api/signInWithTelegram.ts    |   71 +-
 .../auth/api/signInWithTelegramBot.test.ts         |   88 ++
 .../src/features/auth/api/signInWithTelegramBot.ts |   82 ++
 apps/ai-food/src/features/auth/index.ts            |   10 +-
 .../features/auth/ui/TelegramBotLoginButton.tsx    |   54 +
 .../src/features/auth/ui/TelegramLoginButton.tsx   |   87 --
 apps/ai-food/src/pages/login/ui/LoginPage.tsx      |    4 +-
 docs/DOKPLOY.md                                    |    8 +-
 38 files changed, 2841 insertions(+), 655 deletions(-)
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
diff --git a/apps/ai-app/.env.example b/apps/ai-app/.env.example
index fd2f9f9..6236801 100644
--- a/apps/ai-app/.env.example
+++ b/apps/ai-app/.env.example
@@ -19,12 +19,17 @@ OPENROUTER_API_KEY=your_key_here
 # DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
 
 # JWT signing secret (min 32 chars) тАФ generate: openssl rand -base64 32
 # AUTH_SECRET=
 
-# Flash-Call provider key (server only тАФ never expose to Vite)
-# FLASHCALL_API_KEY=
+# Telegram bot auth (server only тАФ never expose to Vite)
+# TELEGRAM_BOT_TOKEN=
+# alias also accepted: AUTH_TELEGRAM_BOT_TOKEN=
+# TELEGRAM_BOT_USERNAME=
+# TELEGRAM_WEBHOOK_SECRET=
+# Public origin of this gateway (webhook URL base; not the frontend)
+# PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
 
 # Guest analyze+refine free budget
 FREE_GENERATION_LIMIT=50
 # Extra generations after sign-in (summed with FREE_GENERATION_LIMIT тЖТ 150)
 AUTH_LOGIN_GENERATION_BONUS=100
diff --git a/apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md b/apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md
new file mode 100644
index 0000000..22aff00
--- /dev/null
+++ b/apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md
@@ -0,0 +1,1317 @@
+# Telegram Bot Auth Implementation Plan
+
+> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
+
+**Goal:** Replace Flash-Call phone auth with Telegram bot deep-link login (challenge + webhook confirm + status poll) inside `apps/ai-app`, and rewire `ai-food` `/login` to that flow.
+
+**Architecture:** Login challenges live in-memory on the gateway. Web starts a challenge, opens `t.me/<bot>?start=<nonce>`, bot confirms via webhook, web polls `/auth/telegram/status` once for JWT. User identity is `telegramId` again; Flash-Call and `phone` are removed.
+
+**Tech Stack:** Express, Prisma/Postgres, jose JWT, Vitest + supertest, Vite React (`ai-food`), Telegram Bot HTTP API via `fetch` (no grammY).
+
+**Spec:** `apps/ai-app/docs/superpowers/specs/2026-08-04-telegram-bot-auth-design.md`
+
+## Global Constraints
+
+- Bot lives in `apps/ai-app` тАФ no separate bot service.
+- Webhook path: `POST /telegram/webhook`; auth via header `X-Telegram-Bot-Api-Secret-Token` === `TELEGRAM_WEBHOOK_SECRET`.
+- Status poll always HTTP 200 with `status: "pending" | "expired" | "ok"`.
+- Successful status poll consumes the challenge (one-shot JWT).
+- Destructive DB migration OK (wipe User/Payment).
+- No Login Widget, no Mini App, no bot features beyond login.
+- Thin Bot API client only (`sendMessage`, `answerCallbackQuery`, `setWebhook`, optional `editMessageText`).
+- Prefer existing patterns in `apps/ai-app/src` (ApiError, asyncHandler, vitest mocks like flashcall tests).
+
+## File structure
+
+| Path | Responsibility |
+|------|----------------|
+| `apps/ai-app/src/lib/jwt.ts` | JWT claims: `telegramId` instead of `phone` |
+| `apps/ai-app/prisma/schema.prisma` | `User.telegramId` (+ profile fields); drop `phone` |
+| `apps/ai-app/prisma/migrations/тАж_telegram_bot_user/` | Destructive migrate phone тЖТ telegram |
+| `apps/ai-app/src/lib/telegramLoginChallenge.ts` | In-memory login challenges |
+| `apps/ai-app/src/lib/telegramBotApi.ts` | Thin Telegram Bot HTTP client |
+| `apps/ai-app/src/routes/auth.ts` | `/telegram/start`, `/telegram/status`, `/me` |
+| `apps/ai-app/src/routes/telegramWebhook.ts` | Webhook handler |
+| `apps/ai-app/src/lib/telegramWebhookSetup.ts` | `setWebhook` on boot |
+| `apps/ai-app/src/app.ts` | Mount `/telegram/webhook` |
+| `apps/ai-app/src/server.ts` | Call webhook setup after listen |
+| Delete | `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts` + tests; `auth.flashcall.test.ts` |
+| `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts` | start + poll + store session |
+| `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx` | UI replacing Login Widget |
+| Docs / `.env.example` / `DOKPLOY.md` / `AI-GATEWAY.md` | Env + endpoint contract |
+
+---
+
+### Task 1: JWT тАФ `phone` тЖТ `telegramId`
+
+**Files:**
+- Modify: `apps/ai-app/src/lib/jwt.ts`
+- Modify: `apps/ai-app/src/lib/jwt.test.ts`
+- Modify: `apps/ai-app/src/middleware/quota.test.ts` (mock payloads)
+- Modify: `apps/ai-app/src/routes/billing.test.ts` (mock payloads)
+
+**Interfaces:**
+- Consumes: none
+- Produces: `UserTokenPayload = { sub: string; telegramId: string }`; `signUserToken` / `verifyUserToken` use `telegramId` claim
+
+- [ ] **Step 1: Update failing expectations in `jwt.test.ts`**
+
+Replace phone-based cases with:
+
+```ts
+it('round-trips sub and telegramId', async () => {
+  const token = await signUserToken({ sub: 'user_1', telegramId: '42' });
+  const payload = await verifyUserToken(token);
+  expect(payload).toEqual({ sub: 'user_1', telegramId: '42' });
+});
+```
+
+Also update any other `phone` usages in that file to `telegramId: '42'`.
+
+- [ ] **Step 2: Run test тАФ expect FAIL (still signs `phone`)**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts`
+Expected: FAIL (missing `telegramId` / unexpected `phone`)
+
+- [ ] **Step 3: Implement JWT**
+
+Replace `apps/ai-app/src/lib/jwt.ts` contents with:
+
+```ts
+import { SignJWT, jwtVerify } from 'jose';
+import { ApiError } from '../../lib/errors.js';
+
+export type UserTokenPayload = {
+  sub: string;
+  telegramId: string;
+};
+
+function getSecretKey(): Uint8Array {
+  const secret = process.env.AUTH_SECRET?.trim();
+  if (!secret || secret.length < 32) {
+    throw new ApiError(
+      500,
+      'AUTH_MISCONFIGURED',
+      'AUTH_SECRET must be set (at least 32 characters).',
+    );
+  }
+  return new TextEncoder().encode(secret);
+}
+
+export async function signUserToken(payload: UserTokenPayload): Promise<string> {
+  return new SignJWT({ telegramId: payload.telegramId })
+    .setProtectedHeader({ alg: 'HS256' })
+    .setSubject(payload.sub)
+    .setIssuedAt()
+    .sign(getSecretKey());
+}
+
+export async function verifyUserToken(token: string): Promise<UserTokenPayload> {
+  try {
+    const { payload } = await jwtVerify(token, getSecretKey());
+    const sub = payload.sub;
+    const telegramId = payload.telegramId;
+    if (!sub || typeof telegramId !== 'string') {
+      throw new Error('invalid claims');
+    }
+    return { sub, telegramId };
+  } catch (err) {
+    if (err instanceof ApiError) throw err;
+    throw new ApiError(401, 'INVALID_USER_TOKEN', 'Invalid or expired user token.');
+  }
+}
+```
+
+- [ ] **Step 4: Fix test mocks that still return `phone`**
+
+In `quota.test.ts` and `billing.test.ts`, change mock resolved values from `{ sub, phone: 'тАж' }` to `{ sub, telegramId: '42' }` (keep existing `sub` strings).
+
+- [ ] **Step 5: Run tests**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/jwt.test.ts src/middleware/quota.test.ts src/routes/billing.test.ts`
+Expected: PASS (auth route tests may still fail if run later тАФ do not run flashcall suite yet)
+
+- [ ] **Step 6: Commit**
+
+```bash
+git add apps/ai-app/src/lib/jwt.ts apps/ai-app/src/lib/jwt.test.ts apps/ai-app/src/middleware/quota.test.ts apps/ai-app/src/routes/billing.test.ts
+git commit -m "refactor(ai-app): JWT claims use telegramId instead of phone"
+```
+
+---
+
+### Task 2: Prisma тАФ restore Telegram user fields
+
+**Files:**
+- Modify: `apps/ai-app/prisma/schema.prisma`
+- Create: `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`
+- Note: `auth.ts` still references `phone` until Task 5 тАФ type-check may fail until then; do not block on full `tsc` until Task 5.
+
+**Interfaces:**
+- Consumes: none
+- Produces: `User` with `telegramId String @unique`, optional `username`, `firstName`, `lastName`, `photoUrl`; no `phone`
+
+- [ ] **Step 1: Update schema `User` model**
+
+In `apps/ai-app/prisma/schema.prisma`, replace the `User` model with:
+
+```prisma
+model User {
+  id                     String             @id @default(cuid())
+  telegramId             String             @unique
+  username               String?
+  firstName              String?
+  lastName               String?
+  photoUrl               String?
+  subscriptionStatus     SubscriptionStatus @default(none)
+  subscriptionExpiresAt  DateTime?
+  createdAt              DateTime           @default(now())
+  updatedAt              DateTime           @updatedAt
+  devices                Device[]
+  usageEvents            UsageEvent[]
+  payments               Payment[]
+}
+```
+
+- [ ] **Step 2: Add migration SQL**
+
+Create `apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql`:
+
+```sql
+-- Flash-Call phone identities are not migrated to Telegram.
+DELETE FROM "Payment";
+DELETE FROM "User";
+
+ALTER TABLE "User" DROP COLUMN "phone",
+ADD COLUMN "telegramId" TEXT NOT NULL,
+ADD COLUMN "username" TEXT,
+ADD COLUMN "firstName" TEXT,
+ADD COLUMN "lastName" TEXT,
+ADD COLUMN "photoUrl" TEXT;
+
+CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
+```
+
+- [ ] **Step 3: Generate client**
+
+Run: `cd apps/ai-app && pnpm exec prisma generate`
+Expected: success
+
+- [ ] **Step 4: Commit**
+
+```bash
+git add apps/ai-app/prisma/schema.prisma apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user
+git commit -m "feat(ai-app): migrate User identity back to telegramId"
+```
+
+---
+
+### Task 3: In-memory Telegram login challenges
+
+**Files:**
+- Create: `apps/ai-app/src/lib/telegramLoginChallenge.ts`
+- Create: `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`
+
+**Interfaces:**
+- Consumes: none
+- Produces:
+  - `LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed'`
+  - `createLoginChallenge(opts?: { deviceId?: string; ttlMs?: number }): { id: string; nonce: string; expiresAt: Date }`
+  - `getLoginChallengeById(id: string): Challenge | null`
+  - `getLoginChallengeByNonce(nonce: string): Challenge | null`
+  - `confirmLoginChallenge(nonce: string, opts: { userId: string; token: string }): boolean`
+  - `consumeLoginChallenge(id: string): { token: string; userId: string } | null`
+  - `clearAllLoginChallengesForTests(): void`
+  - Challenge shape: `{ id, nonce, status, deviceId?, userId?, token?, expiresAt: number }`
+
+- [ ] **Step 1: Write failing tests**
+
+Create `apps/ai-app/src/lib/telegramLoginChallenge.test.ts`:
+
+```ts
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  clearAllLoginChallengesForTests,
+  confirmLoginChallenge,
+  consumeLoginChallenge,
+  createLoginChallenge,
+  getLoginChallengeByNonce,
+} from './telegramLoginChallenge.js';
+
+describe('telegramLoginChallenge', () => {
+  afterEach(() => {
+    clearAllLoginChallengesForTests();
+  });
+
+  it('create тЖТ confirm тЖТ consume тЖТ second consume null', () => {
+    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
+    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');
+
+    expect(
+      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
+    ).toBe(true);
+
+    const first = consumeLoginChallenge(id);
+    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+
+  it('rejects confirm for unknown nonce', () => {
+    expect(
+      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
+    ).toBe(false);
+  });
+
+  it('expires pending challenges', () => {
+    const { id, nonce } = createLoginChallenge({ ttlMs: 1 });
+    // force expiry
+    const c = getLoginChallengeByNonce(nonce);
+    expect(c).not.toBeNull();
+    // wait > ttl
+    const start = Date.now();
+    while (Date.now() - start < 5) {
+      /* spin */
+    }
+    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
+      false,
+    );
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+});
+```
+
+- [ ] **Step 2: Run test тАФ expect FAIL**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
+Expected: FAIL (module not found)
+
+- [ ] **Step 3: Implement challenge store**
+
+Create `apps/ai-app/src/lib/telegramLoginChallenge.ts`:
+
+```ts
+import { randomBytes, randomUUID } from 'node:crypto';
+
+const DEFAULT_TTL_MS = 5 * 60 * 1000;
+
+export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';
+
+export type LoginChallenge = {
+  id: string;
+  nonce: string;
+  status: LoginChallengeStatus;
+  deviceId?: string;
+  userId?: string;
+  token?: string;
+  expiresAt: number;
+};
+
+const byId = new Map<string, LoginChallenge>();
+const byNonce = new Map<string, string>(); // nonce тЖТ id
+
+function isExpired(c: LoginChallenge, now = Date.now()): boolean {
+  return now >= c.expiresAt;
+}
+
+function purgeIfExpired(id: string): LoginChallenge | null {
+  const c = byId.get(id);
+  if (!c) return null;
+  if (isExpired(c) || c.status === 'consumed') {
+    byId.delete(id);
+    byNonce.delete(c.nonce);
+    return null;
+  }
+  return c;
+}
+
+export function createLoginChallenge(opts?: {
+  deviceId?: string;
+  ttlMs?: number;
+}): { id: string; nonce: string; expiresAt: Date } {
+  const id = randomUUID();
+  const nonce = randomBytes(24).toString('base64url');
+  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
+  const challenge: LoginChallenge = {
+    id,
+    nonce,
+    status: 'pending',
+    expiresAt,
+    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
+  };
+  byId.set(id, challenge);
+  byNonce.set(nonce, id);
+  return { id, nonce, expiresAt: new Date(expiresAt) };
+}
+
+export function getLoginChallengeById(id: string): LoginChallenge | null {
+  return purgeIfExpired(id);
+}
+
+export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
+  const id = byNonce.get(nonce);
+  if (!id) return null;
+  return purgeIfExpired(id);
+}
+
+export function confirmLoginChallenge(
+  nonce: string,
+  opts: { userId: string; token: string },
+): boolean {
+  const c = getLoginChallengeByNonce(nonce);
+  if (!c || c.status !== 'pending') return false;
+  c.status = 'confirmed';
+  c.userId = opts.userId;
+  c.token = opts.token;
+  return true;
+}
+
+export function consumeLoginChallenge(
+  id: string,
+): { token: string; userId: string } | null {
+  const c = purgeIfExpired(id);
+  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
+  const result = { token: c.token, userId: c.userId };
+  c.status = 'consumed';
+  byId.delete(id);
+  byNonce.delete(c.nonce);
+  return result;
+}
+
+export function clearAllLoginChallengesForTests(): void {
+  byId.clear();
+  byNonce.clear();
+}
+```
+
+Fix the expiry test if flaky: prefer injecting `ttlMs: -1` or setting `expiresAt` in the past via a test-only helper тАФ if spin wait is flaky, change test to:
+
+```ts
+it('expires pending challenges', () => {
+  const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
+  expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(false);
+  expect(consumeLoginChallenge(id)).toBeNull();
+});
+```
+
+- [ ] **Step 4: Run tests тАФ expect PASS**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramLoginChallenge.test.ts`
+Expected: PASS
+
+- [ ] **Step 5: Commit**
+
+```bash
+git add apps/ai-app/src/lib/telegramLoginChallenge.ts apps/ai-app/src/lib/telegramLoginChallenge.test.ts
+git commit -m "feat(ai-app): add Telegram login challenge store"
+```
+
+---
+
+### Task 4: Thin Telegram Bot API client
+
+**Files:**
+- Create: `apps/ai-app/src/lib/telegramBotApi.ts`
+- Create: `apps/ai-app/src/lib/telegramBotApi.test.ts`
+
+**Interfaces:**
+- Consumes: `process.env.TELEGRAM_BOT_TOKEN` or `AUTH_TELEGRAM_BOT_TOKEN`
+- Produces:
+  - `getTelegramBotToken(): string | null`
+  - `getTelegramBotUsername(): string | null` (from `TELEGRAM_BOT_USERNAME`, strip `@`)
+  - `buildBotDeepLink(nonce: string): string` тЖТ `https://t.me/<username>?start=<nonce>`
+  - `telegramApi<T>(method: string, body: Record<string, unknown>): Promise<T>`
+  - helpers: `sendMessage`, `answerCallbackQuery`, `setWebhook`
+
+- [ ] **Step 1: Write failing tests**
+
+```ts
+import { afterEach, describe, expect, it, vi } from 'vitest';
+
+describe('telegramBotApi', () => {
+  afterEach(() => {
+    vi.unstubAllGlobals();
+    vi.resetModules();
+    delete process.env.TELEGRAM_BOT_TOKEN;
+    delete process.env.AUTH_TELEGRAM_BOT_TOKEN;
+    delete process.env.TELEGRAM_BOT_USERNAME;
+  });
+
+  it('buildBotDeepLink uses username without @', async () => {
+    process.env.TELEGRAM_BOT_USERNAME = '@MyFoodBot';
+    process.env.TELEGRAM_BOT_TOKEN = '1:token';
+    const { buildBotDeepLink } = await import('./telegramBotApi.js');
+    expect(buildBotDeepLink('abc')).toBe('https://t.me/MyFoodBot?start=abc');
+  });
+
+  it('sendMessage posts to Bot API', async () => {
+    process.env.TELEGRAM_BOT_TOKEN = '1:token';
+    process.env.TELEGRAM_BOT_USERNAME = 'MyFoodBot';
+    const fetchMock = vi.fn().mockResolvedValue({
+      ok: true,
+      json: async () => ({ ok: true, result: {} }),
+    });
+    vi.stubGlobal('fetch', fetchMock);
+    const { sendMessage } = await import('./telegramBotApi.js');
+    await sendMessage(1, 'hi', {
+      inline_keyboard: [[{ text: 'OK', callback_data: 'c:x' }]],
+    });
+    expect(fetchMock).toHaveBeenCalledWith(
+      'https://api.telegram.org/bot1:token/sendMessage',
+      expect.objectContaining({ method: 'POST' }),
+    );
+  });
+});
+```
+
+- [ ] **Step 2: Run тАФ expect FAIL**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramBotApi.test.ts`
+Expected: FAIL
+
+- [ ] **Step 3: Implement client**
+
+Create `apps/ai-app/src/lib/telegramBotApi.ts`:
+
+```ts
+import { ApiError } from '../../lib/errors.js';
+
+export function getTelegramBotToken(): string | null {
+  const t =
+    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
+    process.env.AUTH_TELEGRAM_BOT_TOKEN?.trim();
+  return t || null;
+}
+
+export function getTelegramBotUsername(): string | null {
+  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
+  if (!raw) return null;
+  return raw.replace(/^@/, '');
+}
+
+export function buildBotDeepLink(nonce: string): string {
+  const username = getTelegramBotUsername();
+  if (!username) {
+    throw new ApiError(
+      503,
+      'TELEGRAM_MISCONFIGURED',
+      'TELEGRAM_BOT_USERNAME is not configured.',
+    );
+  }
+  return `https://t.me/${username}?start=${encodeURIComponent(nonce)}`;
+}
+
+export async function telegramApi(
+  method: string,
+  body: Record<string, unknown>,
+): Promise<unknown> {
+  const token = getTelegramBotToken();
+  if (!token) {
+    throw new ApiError(
+      503,
+      'TELEGRAM_MISCONFIGURED',
+      'TELEGRAM_BOT_TOKEN is not configured.',
+    );
+  }
+  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify(body),
+  });
+  const data = (await res.json().catch(() => ({}))) as {
+    ok?: boolean;
+    description?: string;
+  };
+  if (!res.ok || data.ok === false) {
+    throw new ApiError(
+      502,
+      'TELEGRAM_API_ERROR',
+      data.description || `Telegram API ${method} failed.`,
+    );
+  }
+  return data;
+}
+
+export async function sendMessage(
+  chatId: number,
+  text: string,
+  replyMarkup?: { inline_keyboard: { text: string; callback_data: string }[][] },
+): Promise<void> {
+  await telegramApi('sendMessage', {
+    chat_id: chatId,
+    text,
+    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
+  });
+}
+
+export async function answerCallbackQuery(
+  callbackQueryId: string,
+  text?: string,
+): Promise<void> {
+  await telegramApi('answerCallbackQuery', {
+    callback_query_id: callbackQueryId,
+    ...(text ? { text } : {}),
+  });
+}
+
+export async function setWebhook(opts: {
+  url: string;
+  secretToken: string;
+}): Promise<void> {
+  await telegramApi('setWebhook', {
+    url: opts.url,
+    secret_token: opts.secretToken,
+    allowed_updates: ['message', 'callback_query'],
+  });
+}
+```
+
+- [ ] **Step 4: Run tests тАФ PASS**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/lib/telegramBotApi.test.ts`
+Expected: PASS
+
+- [ ] **Step 5: Commit**
+
+```bash
+git add apps/ai-app/src/lib/telegramBotApi.ts apps/ai-app/src/lib/telegramBotApi.test.ts
+git commit -m "feat(ai-app): add thin Telegram Bot API client"
+```
+
+---
+
+### Task 5: Auth routes тАФ start / status / me (remove Flash-Call)
+
+**Files:**
+- Modify: `apps/ai-app/src/routes/auth.ts` (rewrite)
+- Create: `apps/ai-app/src/routes/auth.telegram.test.ts`
+- Delete: `apps/ai-app/src/routes/auth.flashcall.test.ts`
+
+**Interfaces:**
+- Consumes: `createLoginChallenge`, `consumeLoginChallenge`, `getLoginChallengeById`, `buildBotDeepLink`, `getTelegramBotToken`, `getTelegramBotUsername`, `signUserToken`, prisma User by `telegramId`, `subscriptionPublicFields`, `ensureDevice`
+- Produces:
+  - `POST /auth/telegram/start` тЖТ `{ challengeId, botDeepLink, expiresAt }`
+  - `GET /auth/telegram/status?challengeId=` тЖТ `{ status }` or `{ status:'ok', token, user }`
+  - `GET /auth/me` тЖТ telegram profile + subscription fields
+
+- [ ] **Step 1: Write route tests**
+
+Create `apps/ai-app/src/routes/auth.telegram.test.ts` modeled on the old flashcall test (hoisted mocks). Cover:
+
+1. `start` returns `challengeId`, `botDeepLink`, `expiresAt` when token+username configured; does not return nonce alone without deep link.
+2. `start` тЖТ 503 when bot misconfigured.
+3. `status` pending тЖТ `{ status: 'pending' }`.
+4. `status` after confirm+token on challenge тЖТ `{ status: 'ok', token, user }` and second call тЖТ `{ status: 'expired' }`.
+5. `status` unknown id тЖТ `{ status: 'expired' }`.
+
+Sketch for start (adjust import paths / mocks to match Task 3тАУ4 exports):
+
+```ts
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
+  upsert: vi.fn(),
+  findUnique: vi.fn(),
+  ensureDevice: vi.fn(),
+  signUserToken: vi.fn(),
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
+    user: { upsert: mocks.upsert, findUnique: mocks.findUnique },
+  }),
+}));
+vi.mock('../lib/quota.js', () => ({ ensureDevice: mocks.ensureDevice }));
+vi.mock('../lib/jwt.js', () => ({
+  signUserToken: mocks.signUserToken,
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
+describe('Telegram bot auth routes', () => {
+  afterEach(() => vi.clearAllMocks());
+
+  it('starts a login challenge', async () => {
+    mocks.getTelegramBotToken.mockReturnValue('1:tok');
+    mocks.getTelegramBotUsername.mockReturnValue('MyBot');
+    mocks.createLoginChallenge.mockReturnValue({
+      id: '78d7cad3-5b19-411d-884e-6d8083368721',
+      nonce: 'nonce1',
+      expiresAt: new Date('2026-08-04T16:00:00.000Z'),
+    });
+    mocks.buildBotDeepLink.mockReturnValue('https://t.me/MyBot?start=nonce1');
+
+    const res = await request(createApp())
+      .post('/auth/telegram/start')
+      .send({ deviceId: 'dev-1' });
+
+    expect(res.status).toBe(200);
+    expect(res.body).toEqual({
+      challengeId: '78d7cad3-5b19-411d-884e-6d8083368721',
+      botDeepLink: 'https://t.me/MyBot?start=nonce1',
+      expiresAt: '2026-08-04T16:00:00.000Z',
+    });
+  });
+
+  it('returns pending then ok then expired on status', async () => {
+    mocks.getLoginChallengeById.mockReturnValueOnce({
+      id: '78d7cad3-5b19-411d-884e-6d8083368721',
+      status: 'pending',
+      nonce: 'n',
+      expiresAt: Date.now() + 60_000,
+    });
+    let res = await request(createApp()).get(
+      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
+    );
+    expect(res.body).toEqual({ status: 'pending' });
+
+    mocks.getLoginChallengeById.mockReturnValueOnce({
+      id: '78d7cad3-5b19-411d-884e-6d8083368721',
+      status: 'confirmed',
+      nonce: 'n',
+      expiresAt: Date.now() + 60_000,
+      userId: 'user-1',
+      token: 'jwt-1',
+    });
+    mocks.consumeLoginChallenge.mockReturnValueOnce({
+      token: 'jwt-1',
+      userId: 'user-1',
+    });
+    mocks.findUnique.mockResolvedValue({
+      id: 'user-1',
+      telegramId: '42',
+      username: 'ada',
+      firstName: 'Ada',
+      lastName: null,
+      photoUrl: null,
+      subscriptionStatus: 'none',
+      subscriptionExpiresAt: null,
+    });
+
+    res = await request(createApp()).get(
+      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
+    );
+    expect(res.status).toBe(200);
+    expect(res.body.status).toBe('ok');
+    expect(res.body.token).toBe('jwt-1');
+    expect(res.body.user.telegramId).toBe('42');
+
+    mocks.getLoginChallengeById.mockReturnValueOnce(null);
+    mocks.consumeLoginChallenge.mockReturnValueOnce(null);
+    res = await request(createApp()).get(
+      '/auth/telegram/status?challengeId=78d7cad3-5b19-411d-884e-6d8083368721',
+    );
+    expect(res.body).toEqual({ status: 'expired' });
+  });
+});
+```
+
+- [ ] **Step 2: Run тАФ expect FAIL**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/routes/auth.telegram.test.ts`
+Expected: FAIL (old flashcall routes / missing handlers)
+
+- [ ] **Step 3: Rewrite `auth.ts`**
+
+Replace `apps/ai-app/src/routes/auth.ts` with Telegram start/status/me (keep `requireDb` pattern from current file):
+
+```ts
+import { Router } from 'express';
+import { z } from 'zod';
+import { ApiError } from '../../lib/errors.js';
+import { asyncHandler } from '../middleware/error.js';
+import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
+import { signUserToken, verifyUserToken } from '../lib/jwt.js';
+import {
+  createLoginChallenge,
+  consumeLoginChallenge,
+  getLoginChallengeById,
+} from '../lib/telegramLoginChallenge.js';
+import {
+  buildBotDeepLink,
+  getTelegramBotToken,
+  getTelegramBotUsername,
+} from '../lib/telegramBotApi.js';
+import { ensureDevice } from '../lib/quota.js';
+import { subscriptionPublicFields } from '../lib/subscription.js';
+
+const StartBodySchema = z.object({
+  deviceId: z.string().min(1).optional(),
+});
+
+function requireDb() {
+  if (!isDatabaseConfigured()) {
+    throw new ApiError(
+      503,
+      'DATABASE_UNAVAILABLE',
+      'DATABASE_URL is not configured.',
+    );
+  }
+  const prisma = getPrisma();
+  if (!prisma) {
+    throw new ApiError(
+      503,
+      'DATABASE_UNAVAILABLE',
+      'Database client is not available.',
+    );
+  }
+  return prisma;
+}
+
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
+export const authRouter = Router();
+
+authRouter.post(
+  '/telegram/start',
+  asyncHandler(async (req, res) => {
+    requireTelegramConfigured();
+    const parsed = StartBodySchema.safeParse(req.body ?? {});
+    if (!parsed.success) {
+      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid Telegram start payload.');
+    }
+    const created = createLoginChallenge({
+      deviceId: parsed.data.deviceId,
+    });
+    const botDeepLink = buildBotDeepLink(created.nonce);
+    res.json({
+      challengeId: created.id,
+      botDeepLink,
+      expiresAt: created.expiresAt.toISOString(),
+    });
+  }),
+);
+
+authRouter.get(
+  '/telegram/status',
+  asyncHandler(async (req, res) => {
+    const challengeId =
+      typeof req.query.challengeId === 'string' ? req.query.challengeId : '';
+    if (!challengeId) {
+      res.json({ status: 'expired' });
+      return;
+    }
+
+    const challenge = getLoginChallengeById(challengeId);
+    if (!challenge) {
+      res.json({ status: 'expired' });
+      return;
+    }
+    if (challenge.status === 'pending') {
+      res.json({ status: 'pending' });
+      return;
+    }
+
+    const consumed = consumeLoginChallenge(challengeId);
+    if (!consumed) {
+      res.json({ status: 'expired' });
+      return;
+    }
+
+    const prisma = requireDb();
+    const user = await prisma.user.findUnique({ where: { id: consumed.userId } });
+    if (!user) {
+      res.json({ status: 'expired' });
+      return;
+    }
+
+    res.json({
+      status: 'ok',
+      token: consumed.token,
+      user: {
+        id: user.id,
+        telegramId: user.telegramId,
+        username: user.username,
+        firstName: user.firstName,
+        lastName: user.lastName,
+        photoUrl: user.photoUrl,
+        ...subscriptionPublicFields(user),
+      },
+    });
+  }),
+);
+
+authRouter.get(
+  '/me',
+  asyncHandler(async (req, res) => {
+    const header = req.header('x-user-token')?.trim();
+    if (!header) {
+      throw new ApiError(401, 'INVALID_USER_TOKEN', 'X-User-Token required.');
+    }
+    const payload = await verifyUserToken(header);
+    const prisma = requireDb();
+    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
+    if (!user) {
+      throw new ApiError(401, 'INVALID_USER_TOKEN', 'User not found.');
+    }
+    res.json({
+      id: user.id,
+      telegramId: user.telegramId,
+      username: user.username,
+      firstName: user.firstName,
+      lastName: user.lastName,
+      photoUrl: user.photoUrl,
+      ...subscriptionPublicFields(user),
+    });
+  }),
+);
+```
+
+- [ ] **Step 4: Delete flashcall route test; run telegram auth tests**
+
+Delete `apps/ai-app/src/routes/auth.flashcall.test.ts`.
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/routes/auth.telegram.test.ts`
+Expected: PASS
+
+- [ ] **Step 5: Commit**
+
+```bash
+git add apps/ai-app/src/routes/auth.ts apps/ai-app/src/routes/auth.telegram.test.ts
+git rm apps/ai-app/src/routes/auth.flashcall.test.ts
+git commit -m "feat(ai-app): Telegram bot start/status auth routes"
+```
+
+---
+
+### Task 6: Webhook + boot `setWebhook` + remove Flash-Call libs
+
+**Files:**
+- Create: `apps/ai-app/src/routes/telegramWebhook.ts`
+- Create: `apps/ai-app/src/routes/telegramWebhook.test.ts`
+- Create: `apps/ai-app/src/lib/telegramWebhookSetup.ts`
+- Modify: `apps/ai-app/src/app.ts` тАФ mount webhook
+- Modify: `apps/ai-app/src/server.ts` тАФ call setup
+- Delete: `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts` + their `*.test.ts`
+
+**Interfaces:**
+- Consumes: `getLoginChallengeByNonce`, `confirmLoginChallenge`, `signUserToken`, prisma upsert by `telegramId`, `ensureDevice`, `sendMessage`, `answerCallbackQuery`, `setWebhook`
+- Produces: `telegramWebhookRouter`; `setupTelegramWebhook(): Promise<void>`
+- Callback data format: `auth:<nonce>` (nonce is base64url тЙд 32 chars from 24 bytes; keep under 64-byte Telegram limit тАФ if too long, store map `callback_data: 'auth:' + challengeId` instead and look up by id; **prefer `auth:` + challenge `id` (UUID)** for callback_data, and resolve challenge by id)
+
+**Callback data decision (lock):** use `ok:${challenge.id}` (UUID). On `/start <nonce>`, look up by nonce; button `callback_data = 'ok:' + challenge.id`.
+
+- [ ] **Step 1: Write webhook tests**
+
+Cover:
+1. Wrong/missing `X-Telegram-Bot-Api-Secret-Token` тЖТ 401
+2. `/start <nonce>` with pending challenge тЖТ `sendMessage` called with confirm button
+3. `callback_query` with `ok:<id>` тЖТ upsert user, `confirmLoginChallenge`, answer callback
+4. Unknown start тЖТ soft message, no confirm
+
+Use hoisted mocks for challenge store, bot API, prisma, jwt, quota.
+
+- [ ] **Step 2: Run тАФ FAIL**
+
+Run: `cd apps/ai-app && pnpm exec vitest run src/routes/telegramWebhook.test.ts`
+Expected: FAIL
+
+- [ ] **Step 3: Implement webhook router**
+
+`apps/ai-app/src/routes/telegramWebhook.ts` тАФ outline:
+
+```ts
+import { Router } from 'express';
+import { asyncHandler } from '../middleware/error.js';
+import {
+  getLoginChallengeById,
+  getLoginChallengeByNonce,
+  confirmLoginChallenge,
+} from '../lib/telegramLoginChallenge.js';
+import { sendMessage, answerCallbackQuery } from '../lib/telegramBotApi.js';
+import { getPrisma, isDatabaseConfigured } from '../lib/prisma.js';
+import { signUserToken } from '../lib/jwt.js';
+import { ensureDevice } from '../lib/quota.js';
+
+function checkSecret(req: { header(name: string): string | undefined }): boolean {
+  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
+  if (!expected) return false;
+  return req.header('x-telegram-bot-api-secret-token') === expected;
+}
+
+export const telegramWebhookRouter = Router();
+
+telegramWebhookRouter.post(
+  '/',
+  asyncHandler(async (req, res) => {
+    if (!checkSecret(req)) {
+      res.status(401).json({ error: 'unauthorized' });
+      return;
+    }
+
+    const update = req.body as {
+      message?: {
+        text?: string;
+        chat: { id: number };
+        from?: {
+          id: number;
+          username?: string;
+          first_name?: string;
+          last_name?: string;
+        };
+      };
+      callback_query?: {
+        id: string;
+        data?: string;
+        from: {
+          id: number;
+          username?: string;
+          first_name?: string;
+          last_name?: string;
+        };
+        message?: { chat: { id: number } };
+      };
+    };
+
+    // Always 200 quickly after handling
+    if (update.message?.text) {
+      const text = update.message.text.trim();
+      const startMatch = /^\/start(?:@\w+)?(?:\s+(.+))?$/.exec(text);
+      if (startMatch) {
+        const nonce = startMatch[1]?.trim();
+        const chatId = update.message.chat.id;
+        if (!nonce) {
+          await sendMessage(chatId, '╨н╤В╨╛╤В ╨▒╨╛╤В ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨▓╤Е╨╛╨┤╨░ ╨▓ AI Food.');
+        } else {
+          const challenge = getLoginChallengeByNonce(nonce);
+          if (!challenge || challenge.status !== 'pending') {
+            await sendMessage(
+              chatId,
+              '╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░. ╨Э╨░╤З╨╜╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨╜╨░ ╤Б╨░╨╣╤В╨╡.',
+            );
+          } else {
+            await sendMessage(chatId, '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨▓ AI Food:', {
+              inline_keyboard: [
+                [{ text: '╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╨▓╤Е╨╛╨┤ ╨▓ AI Food', callback_data: `ok:${challenge.id}` }],
+              ],
+            });
+          }
+        }
+      } else {
+        await sendMessage(
+          update.message.chat.id,
+          '╨н╤В╨╛╤В ╨▒╨╛╤В ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨▓╤Е╨╛╨┤╨░ ╨▓ AI Food.',
+        );
+      }
+    }
+
+    if (update.callback_query?.data?.startsWith('ok:')) {
+      const challengeId = update.callback_query.data.slice(3);
+      const challenge = getLoginChallengeById(challengeId);
+      const chatId = update.callback_query.message?.chat.id;
+      const from = update.callback_query.from;
+
+      if (!challenge || challenge.status !== 'pending' || !chatId) {
+        await answerCallbackQuery(update.callback_query.id, '╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░');
+      } else if (!isDatabaseConfigured() || !getPrisma()) {
+        await answerCallbackQuery(update.callback_query.id, '╨Ю╤И╨╕╨▒╨║╨░ ╤Б╨╡╤А╨▓╨╡╤А╨░');
+      } else {
+        const prisma = getPrisma()!;
+        const telegramId = String(from.id);
+        const user = await prisma.user.upsert({
+          where: { telegramId },
+          create: {
+            telegramId,
+            username: from.username ?? null,
+            firstName: from.first_name ?? null,
+            lastName: from.last_name ?? null,
+          },
+          update: {
+            username: from.username ?? null,
+            firstName: from.first_name ?? null,
+            lastName: from.last_name ?? null,
+          },
+        });
+        if (challenge.deviceId) {
+          await ensureDevice(prisma, challenge.deviceId, user.id);
+        }
+        const token = await signUserToken({
+          sub: user.id,
+          telegramId: user.telegramId,
+        });
+        confirmLoginChallenge(challenge.nonce, {
+          userId: user.id,
+          token,
+        });
+        await answerCallbackQuery(update.callback_query.id, '╨У╨╛╤В╨╛╨▓╨╛');
+        await sendMessage(chatId, '╨У╨╛╤В╨╛╨▓╨╛, ╨▓╨╡╤А╨╜╨╕╤В╨╡╤Б╤М ╨▓ ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╨╡.');
+      }
+    }
+
+    res.json({ ok: true });
+  }),
+);
+```
+
+Refine error handling so Bot API failures still return 200 to Telegram when possible (log and swallow after secret check) тАФ avoid retry storms. Prefer try/catch around handlers; still `res.json({ ok: true })`.
+
+- [ ] **Step 4: Mount in `app.ts`**
+
+```ts
+import { telegramWebhookRouter } from './routes/telegramWebhook.js';
+// тАж
+app.use('/telegram/webhook', telegramWebhookRouter);
+```
+
+- [ ] **Step 5: `telegramWebhookSetup.ts` + `server.ts`**
+
+```ts
+// telegramWebhookSetup.ts
+import { getTelegramBotToken, setWebhook } from './telegramBotApi.js';
+
+export async function setupTelegramWebhook(): Promise<void> {
+  const token = getTelegramBotToken();
+  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
+  const base = process.env.PUBLIC_GATEWAY_URL?.trim()?.replace(/\/$/, '');
+  if (!token || !secret || !base) {
+    console.log(
+      'Telegram webhook setup skipped (need TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_GATEWAY_URL)',
+    );
+    return;
+  }
+  const url = `${base}/telegram/webhook`;
+  await setWebhook({ url, secretToken: secret });
+  console.log(`Telegram webhook set to ${url}`);
+}
+```
+
+In `server.ts`, after `listen` callback, `void setupTelegramWebhook().catch((err) => console.error(err))`.
+
+- [ ] **Step 6: Delete Flash-Call / phone modules**
+
+Delete:
+- `apps/ai-app/src/lib/flashcall.ts`
+- `apps/ai-app/src/lib/flashcall.test.ts`
+- `apps/ai-app/src/lib/flashcallChallenge.ts`
+- `apps/ai-app/src/lib/phone.ts`
+- `apps/ai-app/src/lib/phone.test.ts`
+
+Ensure no remaining imports.
+
+- [ ] **Step 7: Run full ai-app tests + type-check**
+
+Run:
+```bash
+cd apps/ai-app && pnpm test && pnpm type-check
+```
+Expected: PASS
+
+- [ ] **Step 8: Commit**
+
+```bash
+git add apps/ai-app/src
+git commit -m "feat(ai-app): Telegram webhook login + remove Flash-Call"
+```
+
+---
+
+### Task 7: Frontend тАФ bot login UX
+
+**Files:**
+- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts`
+- Create: `apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts`
+- Create: `apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx`
+- Modify: `apps/ai-food/src/features/auth/index.ts`
+- Modify: `apps/ai-food/src/pages/login/ui/LoginPage.tsx`
+- Delete or stop exporting: `TelegramLoginButton.tsx`, widget-based `signInWithTelegram.ts` (replace implementation in place **or** delete and update imports тАФ prefer replace `signInWithTelegram.ts` API with bot flow to minimize churn, keep `mapTelegramUserToSession`)
+
+**Interfaces:**
+- Consumes: `POST /auth/telegram/start`, `GET /auth/telegram/status`, `useAuthStore.signIn`, `getDeviceId`, `mapTelegramUserToSession`
+- Produces: `startTelegramBotLogin(): Promise<TelegramSession>` (opens link + polls) OR split `createTelegramLoginChallenge` + `pollTelegramLoginStatus`
+
+- [ ] **Step 1: Rewrite client API (TDD)**
+
+Keep `mapTelegramUserToSession` tests. Replace `signInWithTelegram` body:
+
+```ts
+export async function signInWithTelegramBot(
+  opts?: { signal?: AbortSignal; openLink?: (url: string) => void },
+): Promise<TelegramSession> {
+  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
+  if (!gatewayUrl?.trim()) throw new Error('VITE_AI_GATEWAY_URL ╨╜╨╡ ╨╖╨░╨┤╨░╨╜');
+  const base = gatewayUrl.replace(/\/$/, '');
+  const deviceId = await getDeviceId();
+
+  const startRes = await fetch(`${base}/auth/telegram/start`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ deviceId }),
+    signal: opts?.signal,
+  });
+  const start = (await startRes.json()) as {
+    challengeId?: string;
+    botDeepLink?: string;
+    message?: string;
+  };
+  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
+    throw new Error(start.message ?? `╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨╜╨░╤З╨░╤В╤М ╨▓╤Е╨╛╨┤ (${startRes.status})`);
+  }
+
+  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
+    start.botDeepLink,
+  );
+
+  const deadline = Date.now() + 5 * 60 * 1000;
+  while (Date.now() < deadline) {
+    if (opts?.signal?.aborted) throw new Error('╨Т╤Е╨╛╨┤ ╨╛╤В╨╝╨╡╨╜╤С╨╜');
+    await new Promise((r) => setTimeout(r, 1500));
+    const st = await fetch(
+      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
+      { signal: opts?.signal },
+    );
+    const data = (await st.json()) as {
+      status: string;
+      token?: string;
+      user?: AuthTelegramResponse['user'];
+      message?: string;
+    };
+    if (data.status === 'ok' && data.token && data.user) {
+      const session = mapTelegramUserToSession(data.user);
+      useAuthStore.getState().signIn(session, data.token);
+      return session;
+    }
+    if (data.status === 'expired') {
+      throw new Error('╨б╨╡╤Б╤Б╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨░. ╨Я╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░.');
+    }
+  }
+  throw new Error('╨Т╤А╨╡╨╝╤П ╨╛╨╢╨╕╨┤╨░╨╜╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨╛.');
+}
+```
+
+Unit-test with mocked `fetch` + fake timers: pending тЖТ ok path stores token.
+
+- [ ] **Step 2: UI button**
+
+Replace `TelegramLoginButton` with a normal Button: ┬л╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram┬╗ тЖТ calls `signInWithTelegramBot`, loading state ┬л╨Ю╨╢╨╕╨┤╨░╨╡╨╝ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ ╨▓ TelegramтАж┬╗, cancel via AbortController on unmount.
+
+Remove telegram-widget.js script usage entirely.
+
+- [ ] **Step 3: Wire `LoginPage` + exports**
+
+Update `index.ts` exports; remove widget types if unused.
+
+- [ ] **Step 4: Run ai-food auth tests**
+
+Run: `cd apps/ai-food && pnpm exec vitest run src/features/auth`
+Expected: PASS
+
+- [ ] **Step 5: Commit**
+
+```bash
+git add apps/ai-food/src/features/auth apps/ai-food/src/pages/login
+git commit -m "feat(ai-food): Telegram bot deep-link login instead of Login Widget"
+```
+
+---
+
+### Task 8: Env examples + docs
+
+**Files:**
+- Modify: `apps/ai-app/.env.example`
+- Modify: `apps/ai-food/.env.example`
+- Modify: `docs/DOKPLOY.md`
+- Modify: `apps/ai-food/docs/AI-GATEWAY.md`
+- Modify local `.env` files only if needed for smoke (do **not** commit secrets)
+
+- [ ] **Step 1: Update `apps/ai-app/.env.example`**
+
+Remove `FLASHCALL_API_KEY`. Add:
+
+```env
+TELEGRAM_BOT_TOKEN=
+# alias also accepted: AUTH_TELEGRAM_BOT_TOKEN=
+TELEGRAM_BOT_USERNAME=
+TELEGRAM_WEBHOOK_SECRET=
+PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
+```
+
+- [ ] **Step 2: Update `apps/ai-food/.env.example`**
+
+Document bot deep-link flow (not Login Widget domain). Keep optional `VITE_TELEGRAM_BOT_USERNAME` for copy only.
+
+- [ ] **Step 3: Update `DOKPLOY.md` + `AI-GATEWAY.md`**
+
+- Endpoints: `/auth/telegram/start`, `/auth/telegram/status`, `/telegram/webhook`
+- Env table: Telegram vars; remove Flash-Call
+- Note: `PUBLIC_GATEWAY_URL` = gateway public origin for webhook; `PUBLIC_APP_URL` remains frontend for T-Bank
+
+- [ ] **Step 4: Commit**
+
+```bash
+git add apps/ai-app/.env.example apps/ai-food/.env.example docs/DOKPLOY.md apps/ai-food/docs/AI-GATEWAY.md
+git commit -m "docs: Telegram bot auth env and gateway contract"
+```
+
+---
+
+## Spec coverage checklist
+
+| Spec item | Task |
+|-----------|------|
+| Bot in ai-app, not separate app | 4тАУ6 |
+| start тЖТ deep link тЖТ poll | 5, 7 |
+| webhook confirm + JWT on challenge | 6 |
+| User.telegramId + wipe migration | 2 |
+| JWT telegramId | 1 |
+| Remove Flash-Call | 5тАУ6 |
+| Status 200 pending/expired/ok | 5 |
+| Consume once | 3, 5 |
+| Webhook secret header | 6 |
+| setWebhook on boot | 6 |
+| Frontend replace widget | 7 |
+| Docs / env | 8 |
+| Non-goals (Mini App, bot product, etc.) | not scheduled |
+
+## Plan self-review
+
+- No TBD placeholders left; callback_data locked to `ok:<challengeId>`.
+- Types consistent: `telegramId` string everywhere after Task 1тАУ2.
+- Expiry test uses `ttlMs: -1` to avoid flaky spin.
+
+---
+
+**Plan complete and saved to** `apps/ai-app/docs/superpowers/plans/2026-08-04-telegram-bot-auth.md`.
+
+**╨Ф╨▓╨░ ╨▓╨░╤А╨╕╨░╨╜╤В╨░ ╨╕╤Б╨┐╨╛╨╗╨╜╨╡╨╜╨╕╤П:**
+
+1. **Subagent-Driven (╤А╨╡╨║╨╛╨╝╨╡╨╜╨┤╤Г╤О)** тАФ ╤Б╨▓╨╡╨╢╨╕╨╣ ╤Б╤Г╨▒╨░╨│╨╡╨╜╤В ╨╜╨░ ╨╖╨░╨┤╨░╤З╤Г, ╤А╨╡╨▓╤М╤О ╨╝╨╡╨╢╨┤╤Г ╨╖╨░╨┤╨░╤З╨░╨╝╨╕  
+2. **Inline Execution** тАФ ╨▓╤Л╨┐╨╛╨╗╨╜╤П╤В╤М ╨╖╨░╨┤╨░╤З╨╕ ╨▓ ╤Н╤В╨╛╨╣ ╤Б╨╡╤Б╤Б╨╕╨╕ ╤Б ╤З╨╡╨║╨┐╨╛╨╕╨╜╤В╨░╨╝╨╕  
+
+╨Ъ╨░╨║╨╛╨╣ ╨┐╨╛╨┤╤Е╨╛╨┤?
diff --git a/apps/ai-app/docs/superpowers/specs/2026-08-04-telegram-bot-auth-design.md b/apps/ai-app/docs/superpowers/specs/2026-08-04-telegram-bot-auth-design.md
new file mode 100644
index 0000000..9bb80fd
--- /dev/null
+++ b/apps/ai-app/docs/superpowers/specs/2026-08-04-telegram-bot-auth-design.md
@@ -0,0 +1,197 @@
+# Telegram Bot Auth (replace Flash-Call)
+
+**Date:** 2026-08-04  
+**Status:** Approved (conversation) тАФ awaiting spec file review  
+**Repos:** `ai-app` (gateway) primary; `ai-food` login UX  
+**Approach:** Bot inside `ai-app` (same Express process), webhook + login challenge poll тАФ not a separate bot service
+
+## Goal
+
+Replace Flash-Call phone auth with **Telegram bot login**:
+
+1. User on `/login` starts a challenge and opens `t.me/<bot>?start=<nonce>`.
+2. Bot asks to confirm; on confirm, gateway upserts `User` by `telegramId` and marks challenge ready with JWT.
+3. Web app polls status and receives `{ token, user }` once.
+
+Flash-Call is removed entirely. Guest quota + subscription rules stay as today (login тЙа unlimited; unlimited only with active subscription).
+
+## Non-goals
+
+- Separate `apps/telegram-bot` service
+- Telegram Login Widget (official embed) тАФ replaced by bot deep-link flow
+- Telegram Mini App / WebApp auth
+- Bot commands beyond login (`/start` + confirm callback)
+- Notifications, menus, or product surface in the bot
+- Keeping phone/`FLASHCALL_*` as fallback
+- Multi-device identity merge beyond existing `deviceId` link-on-login
+
+## Architecture
+
+```mermaid
+sequenceDiagram
+  participant App as ai-food
+  participant GW as ai-app gateway
+  participant DB as Postgres
+  participant TG as Telegram Bot API
+
+  App->>GW: POST /auth/telegram/start { deviceId? }
+  GW-->>App: { challengeId, botDeepLink, expiresAt }
+  App->>App: window.open(botDeepLink)
+  loop poll ~1тАУ2s
+    App->>GW: GET /auth/telegram/status?challengeId=
+    GW-->>App: { status: pending }
+  end
+  TG->>GW: POST /telegram/webhook (start nonce)
+  GW->>TG: confirm button
+  TG->>GW: callback_query confirm
+  GW->>DB: upsert User(telegramId, тАж)
+  GW->>GW: challenge = confirmed + sign JWT
+  GW->>TG: ┬л╨У╨╛╤В╨╛╨▓╨╛, ╨▓╨╡╤А╨╜╨╕╤В╨╡╤Б╤М ╨▓ ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╨╡┬╗
+  App->>GW: GET /auth/telegram/status
+  GW-->>App: { status: ok, token, user } (consume)
+  App->>App: authStore.signIn(session, token)
+```
+
+Placement: all bot + auth code lives in `apps/ai-app`. No second deploy unit.
+
+Webhook (not long-polling) in production. On server boot (when `TELEGRAM_BOT_TOKEN` + public gateway URL configured): `setWebhook`. Local/dev: document ngrok or optional polling behind a flag тАФ not required for MVP if webhook URL available.
+
+## Data model
+
+Revert identity from phone to Telegram profile fields:
+
+```prisma
+model User {
+  id                    String             @id @default(cuid())
+  telegramId            String             @unique
+  username              String?
+  firstName             String?
+  lastName              String?
+  photoUrl              String?
+  subscriptionStatus    SubscriptionStatus @default(none)
+  subscriptionExpiresAt DateTime?
+  createdAt             DateTime           @default(now())
+  updatedAt             DateTime           @updatedAt
+  devices               Device[]
+  usageEvents           UsageEvent[]
+  payments              Payment[]
+}
+```
+
+**Migration:** destructive for MVP тАФ drop Flash-Call-era phone users/payments (same stance as prior phone migration). No phoneтЖТtelegram mapping.
+
+**JWT** (`AUTH_SECRET`): `{ sub: userId, telegramId }` (replace `phone` claim).
+
+**Login challenge** (in-memory store, same pattern as former `flashcallChallenge`):
+
+| Field | Notes |
+|-------|--------|
+| `id` | UUID тАФ returned to client as `challengeId` |
+| `nonce` | opaque token in `?start=` (URL-safe, unguessable) |
+| `status` | `pending` \| `confirmed` \| `consumed` \| `expired` |
+| `deviceId` | optional, from start |
+| `userId` / `token` | set on confirm |
+| `expiresAt` | ~5 minutes from create |
+
+Rules:
+
+- Confirm only if `pending` and not expired.
+- Successful status poll **consumes** challenge (one-shot JWT delivery).
+- Replay poll after consume тЖТ `expired` / not found, never re-issue same token via this endpoint.
+
+## HTTP API
+
+| Method | Path | Auth | Body / query | Response |
+|--------|------|------|--------------|----------|
+| `POST` | `/auth/telegram/start` | none* | `{ deviceId?: string }` | `{ challengeId, botDeepLink, expiresAt }` |
+| `GET` | `/auth/telegram/status` | none* | `challengeId` | see below |
+| `GET` | `/auth/me` | `X-User-Token` | тАФ | user + subscription public fields |
+| `POST` | `/telegram/webhook` | webhook secret | Telegram Update JSON | `200` quickly |
+
+\* Gateway `API_KEY` does **not** gate `/auth/*` or webhook (same as current flashcall auth routes).
+
+### Status responses
+
+Always HTTP **200** (poll loop stays simple):
+
+- Pending: `{ status: "pending" }`
+- Expired / unknown / consumed: `{ status: "expired" }`
+- Ready (first successful poll): `{ status: "ok", token, user }` where `user` includes `id`, `telegramId`, profile fields, `hasActiveSubscription` / `subscriptionExpiresAt`
+
+### Delete
+
+- Routes: `/auth/flashcall/start`, `/auth/flashcall/verify`
+- Libs: `flashcall.ts`, `flashcallChallenge.ts`, `phone.ts` (+ tests)
+- Env: `FLASHCALL_API_KEY`
+
+## Bot behavior
+
+1. `/start <nonce>`  
+   - Valid pending challenge тЖТ message + inline button ┬л╨Я╨╛╨┤╤В╨▓╨╡╤А╨┤╨╕╤В╤М ╨▓╤Е╨╛╨┤ ╨▓ AI Food┬╗ (`callback_data` binds challenge/nonce).  
+   - Missing/expired тЖТ ┬л╨б╤Б╤Л╨╗╨║╨░ ╤Г╤Б╤В╨░╤А╨╡╨╗╨░. ╨Э╨░╤З╨╜╨╕╤В╨╡ ╨▓╤Е╨╛╨┤ ╨╜╨░ ╤Б╨░╨╣╤В╨╡.┬╗
+2. Callback confirm тЖТ upsert user from Telegram `from` (+ photo if present), attach `deviceId` if any, sign JWT onto challenge, answer callback, edit/send success text.
+3. Any other text тЖТ short ┬л╨н╤В╨╛╤В ╨▒╨╛╤В ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨▓╤Е╨╛╨┤╨░ ╨▓ AI Food.┬╗
+
+Webhook security: fixed path `POST /telegram/webhook`; verify Telegram header `X-Telegram-Bot-Api-Secret-Token` against `TELEGRAM_WEBHOOK_SECRET` (set via `setWebhook.secret_token`). Missing/mismatch тЖТ `401`. Required whenever webhook is enabled.
+
+Library: thin `fetch` to Bot API only (no grammY). Methods: `sendMessage`, `answerCallbackQuery`, `editMessageText` (optional), `setWebhook`, `deleteWebhook`.
+
+## Frontend (`ai-food`)
+
+- Replace `TelegramLoginButton` (Login Widget) with bot-login flow: start тЖТ open deep link тЖТ poll тЖТ `useAuthStore.signIn`.
+- Keep `VITE_AUTH_MOCK` demo path.
+- `VITE_TELEGRAM_BOT_USERNAME` optional for copy; **canonical** bot username for deep links comes from gateway (`botDeepLink`).
+- Update copy on `/login` (no widget domain requirement).
+- Remove client calls to `/auth/telegram` widget payload exchange; wire to `/auth/telegram/start` + `/status`.
+
+## Env
+
+**`apps/ai-app/.env`**
+
+| Var | Role |
+|-----|------|
+| `TELEGRAM_BOT_TOKEN` | BotFather token (accept `AUTH_TELEGRAM_BOT_TOKEN` alias if already present) |
+| `TELEGRAM_BOT_USERNAME` | Without `@` тАФ build deep links |
+| `TELEGRAM_WEBHOOK_SECRET` | Value for `setWebhook.secret_token` / header check |
+| `PUBLIC_GATEWAY_URL` | Public origin of **gateway** (e.g. `https://api.example.com`) for `setWebhook`; distinct from frontend `PUBLIC_APP_URL` |
+| `AUTH_SECRET`, `DATABASE_URL` | unchanged |
+
+If `PUBLIC_GATEWAY_URL` is unset, skip auto-`setWebhook` at boot (manual webhook ok for ops).
+
+Remove `FLASHCALL_API_KEY` from examples and Dokploy docs.
+
+**`apps/ai-food/.env`**
+
+- Keep `VITE_AI_GATEWAY_*`, `VITE_AUTH_MOCK`
+- `VITE_TELEGRAM_BOT_USERNAME` optional UX only
+- Drop Login Widget domain comments as authoritative auth path
+
+## Errors
+
+| Case | Behavior |
+|------|----------|
+| Missing bot token / username | `503` on start; webhook disabled |
+| Invalid/expired nonce on bot | Soft message in chat, no JWT |
+| Poll after consume / unknown id | `status: "expired"` |
+| Webhook secret mismatch | `401` |
+| DB down | `503 DATABASE_UNAVAILABLE` (existing pattern) |
+
+## Tests
+
+- Challenge lifecycle: create тЖТ confirm тЖТ consume тЖТ second poll expired
+- Webhook: confirm upserts user, wrong secret rejected
+- Route tests replacing `auth.flashcall.test.ts`
+- JWT round-trip with `telegramId`
+- Frontend: start+poll happy path (unit/mock fetch) тАФ optional if time-boxed
+
+## Docs to update
+
+- `apps/ai-food/docs/AI-GATEWAY.md` тАФ endpoints, env (remove flashcall / fix stale widget docs)
+- `docs/DOKPLOY.md` тАФ env list, webhook URL note
+- `.env.example` in both apps
+
+## Out of scope follow-ups
+
+- Persist challenges in Redis/Postgres if multi-instance gateway is required
+- Long-polling dev mode polish
+- Linking old phone users (none kept)
diff --git a/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql b/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql
new file mode 100644
index 0000000..1f10a71
--- /dev/null
+++ b/apps/ai-app/prisma/migrations/20260804180000_telegram_bot_user/migration.sql
@@ -0,0 +1,12 @@
+-- Flash-Call phone identities are not migrated to Telegram.
+DELETE FROM "Payment";
+DELETE FROM "User";
+
+ALTER TABLE "User" DROP COLUMN "phone",
+ADD COLUMN "telegramId" TEXT NOT NULL,
+ADD COLUMN "username" TEXT,
+ADD COLUMN "firstName" TEXT,
+ADD COLUMN "lastName" TEXT,
+ADD COLUMN "photoUrl" TEXT;
+
+CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
diff --git a/apps/ai-app/prisma/schema.prisma b/apps/ai-app/prisma/schema.prisma
index 2b715bf..d2ea3b9 100644
--- a/apps/ai-app/prisma/schema.prisma
+++ b/apps/ai-app/prisma/schema.prisma
@@ -21,11 +21,15 @@ enum PaymentStatus {
   refunded
 }
 
 model User {
   id                     String             @id @default(cuid())
-  phone                  String             @unique
+  telegramId             String             @unique
+  username               String?
+  firstName              String?
+  lastName               String?
+  photoUrl               String?
   subscriptionStatus     SubscriptionStatus @default(none)
   subscriptionExpiresAt  DateTime?
   createdAt              DateTime           @default(now())
   updatedAt              DateTime           @updatedAt
   devices                Device[]
diff --git a/apps/ai-app/src/app.ts b/apps/ai-app/src/app.ts
index d307f58..d6a875a 100644
--- a/apps/ai-app/src/app.ts
+++ b/apps/ai-app/src/app.ts
@@ -9,10 +9,11 @@ import { modelsRouter } from './routes/models.js';
 import { embeddingsRouter } from './routes/embeddings.js';
 import { chatRouter } from './routes/chat.js';
 import { authRouter } from './routes/auth.js';
 import { usageRouter } from './routes/usage.js';
 import { billingRouter } from './routes/billing.js';
+import { telegramWebhookRouter } from './routes/telegramWebhook.js';
 
 export function createApp() {
   const app = express();
 
   app.use(
@@ -33,10 +34,11 @@ export function createApp() {
 
   app.use('/health', healthRouter);
   app.use('/auth', authRouter);
   app.use('/usage', usageRouter);
   app.use('/billing', billingRouter);
+  app.use('/telegram/webhook', telegramWebhookRouter);
 
   const v1 = express.Router();
   v1.use(requireApiKey);
   v1.use('/models', modelsRouter);
   v1.use('/embeddings', embeddingsRouter);
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
diff --git a/apps/ai-app/src/lib/jwt.test.ts b/apps/ai-app/src/lib/jwt.test.ts
index e67075c..d7ffb8b 100644
--- a/apps/ai-app/src/lib/jwt.test.ts
+++ b/apps/ai-app/src/lib/jwt.test.ts
@@ -15,18 +15,18 @@ describe('user JWT', () => {
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
diff --git a/apps/ai-app/src/lib/jwt.ts b/apps/ai-app/src/lib/jwt.ts
index 099c9de..a8dc184 100644
--- a/apps/ai-app/src/lib/jwt.ts
+++ b/apps/ai-app/src/lib/jwt.ts
@@ -1,11 +1,11 @@
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
@@ -17,26 +17,26 @@ function getSecretKey(): Uint8Array {
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
diff --git a/apps/ai-app/src/lib/telegramBotApi.test.ts b/apps/ai-app/src/lib/telegramBotApi.test.ts
new file mode 100644
index 0000000..02b42f2
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramBotApi.test.ts
@@ -0,0 +1,36 @@
+import { afterEach, describe, expect, it, vi } from 'vitest';
+
+describe('telegramBotApi', () => {
+  afterEach(() => {
+    vi.unstubAllGlobals();
+    vi.resetModules();
+    delete process.env.TELEGRAM_BOT_TOKEN;
+    delete process.env.AUTH_TELEGRAM_BOT_TOKEN;
+    delete process.env.TELEGRAM_BOT_USERNAME;
+  });
+
+  it('buildBotDeepLink uses username without @', async () => {
+    process.env.TELEGRAM_BOT_USERNAME = '@MyFoodBot';
+    process.env.TELEGRAM_BOT_TOKEN = '1:token';
+    const { buildBotDeepLink } = await import('./telegramBotApi.js');
+    expect(buildBotDeepLink('abc')).toBe('https://t.me/MyFoodBot?start=abc');
+  });
+
+  it('sendMessage posts to Bot API', async () => {
+    process.env.TELEGRAM_BOT_TOKEN = '1:token';
+    process.env.TELEGRAM_BOT_USERNAME = 'MyFoodBot';
+    const fetchMock = vi.fn().mockResolvedValue({
+      ok: true,
+      json: async () => ({ ok: true, result: {} }),
+    });
+    vi.stubGlobal('fetch', fetchMock);
+    const { sendMessage } = await import('./telegramBotApi.js');
+    await sendMessage(1, 'hi', {
+      inline_keyboard: [[{ text: 'OK', callback_data: 'c:x' }]],
+    });
+    expect(fetchMock).toHaveBeenCalledWith(
+      'https://api.telegram.org/bot1:token/sendMessage',
+      expect.objectContaining({ method: 'POST' }),
+    );
+  });
+});
diff --git a/apps/ai-app/src/lib/telegramBotApi.ts b/apps/ai-app/src/lib/telegramBotApi.ts
new file mode 100644
index 0000000..917a58d
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramBotApi.ts
@@ -0,0 +1,90 @@
+import { ApiError } from '../../lib/errors.js';
+
+export function getTelegramBotToken(): string | null {
+  const t =
+    process.env.TELEGRAM_BOT_TOKEN?.trim() ||
+    process.env.AUTH_TELEGRAM_BOT_TOKEN?.trim();
+  return t || null;
+}
+
+export function getTelegramBotUsername(): string | null {
+  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
+  if (!raw) return null;
+  return raw.replace(/^@/, '');
+}
+
+export function buildBotDeepLink(nonce: string): string {
+  const username = getTelegramBotUsername();
+  if (!username) {
+    throw new ApiError(
+      503,
+      'TELEGRAM_MISCONFIGURED',
+      'TELEGRAM_BOT_USERNAME is not configured.',
+    );
+  }
+  return `https://t.me/${username}?start=${encodeURIComponent(nonce)}`;
+}
+
+export async function telegramApi(
+  method: string,
+  body: Record<string, unknown>,
+): Promise<unknown> {
+  const token = getTelegramBotToken();
+  if (!token) {
+    throw new ApiError(
+      503,
+      'TELEGRAM_MISCONFIGURED',
+      'TELEGRAM_BOT_TOKEN is not configured.',
+    );
+  }
+  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify(body),
+  });
+  const data = (await res.json().catch(() => ({}))) as {
+    ok?: boolean;
+    description?: string;
+  };
+  if (!res.ok || data.ok === false) {
+    throw new ApiError(
+      502,
+      'TELEGRAM_API_ERROR',
+      data.description || `Telegram API ${method} failed.`,
+    );
+  }
+  return data;
+}
+
+export async function sendMessage(
+  chatId: number,
+  text: string,
+  replyMarkup?: { inline_keyboard: { text: string; callback_data: string }[][] },
+): Promise<void> {
+  await telegramApi('sendMessage', {
+    chat_id: chatId,
+    text,
+    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
+  });
+}
+
+export async function answerCallbackQuery(
+  callbackQueryId: string,
+  text?: string,
+): Promise<void> {
+  await telegramApi('answerCallbackQuery', {
+    callback_query_id: callbackQueryId,
+    ...(text ? { text } : {}),
+  });
+}
+
+export async function setWebhook(opts: {
+  url: string;
+  secretToken: string;
+}): Promise<void> {
+  await telegramApi('setWebhook', {
+    url: opts.url,
+    secret_token: opts.secretToken,
+    allowed_updates: ['message', 'callback_query'],
+  });
+}
diff --git a/apps/ai-app/src/lib/telegramLoginChallenge.test.ts b/apps/ai-app/src/lib/telegramLoginChallenge.test.ts
new file mode 100644
index 0000000..cd494d5
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramLoginChallenge.test.ts
@@ -0,0 +1,41 @@
+import { afterEach, describe, expect, it } from 'vitest';
+import {
+  clearAllLoginChallengesForTests,
+  confirmLoginChallenge,
+  consumeLoginChallenge,
+  createLoginChallenge,
+  getLoginChallengeByNonce,
+} from './telegramLoginChallenge.js';
+
+describe('telegramLoginChallenge', () => {
+  afterEach(() => {
+    clearAllLoginChallengesForTests();
+  });
+
+  it('create тЖТ confirm тЖТ consume тЖТ second consume null', () => {
+    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
+    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');
+
+    expect(
+      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
+    ).toBe(true);
+
+    const first = consumeLoginChallenge(id);
+    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+
+  it('rejects confirm for unknown nonce', () => {
+    expect(
+      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
+    ).toBe(false);
+  });
+
+  it('expires pending challenges', () => {
+    const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
+    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
+      false,
+    );
+    expect(consumeLoginChallenge(id)).toBeNull();
+  });
+});
diff --git a/apps/ai-app/src/lib/telegramLoginChallenge.ts b/apps/ai-app/src/lib/telegramLoginChallenge.ts
new file mode 100644
index 0000000..3a574d5
--- /dev/null
+++ b/apps/ai-app/src/lib/telegramLoginChallenge.ts
@@ -0,0 +1,91 @@
+import { randomBytes, randomUUID } from 'node:crypto';
+
+const DEFAULT_TTL_MS = 5 * 60 * 1000;
+
+export type LoginChallengeStatus = 'pending' | 'confirmed' | 'consumed';
+
+export type LoginChallenge = {
+  id: string;
+  nonce: string;
+  status: LoginChallengeStatus;
+  deviceId?: string;
+  userId?: string;
+  token?: string;
+  expiresAt: number;
+};
+
+const byId = new Map<string, LoginChallenge>();
+const byNonce = new Map<string, string>();
+
+function isExpired(c: LoginChallenge, now = Date.now()): boolean {
+  return now >= c.expiresAt;
+}
+
+function purgeIfExpired(id: string): LoginChallenge | null {
+  const c = byId.get(id);
+  if (!c) return null;
+  if (isExpired(c) || c.status === 'consumed') {
+    byId.delete(id);
+    byNonce.delete(c.nonce);
+    return null;
+  }
+  return c;
+}
+
+export function createLoginChallenge(opts?: {
+  deviceId?: string;
+  ttlMs?: number;
+}): { id: string; nonce: string; expiresAt: Date } {
+  const id = randomUUID();
+  const nonce = randomBytes(24).toString('base64url');
+  const expiresAt = Date.now() + (opts?.ttlMs ?? DEFAULT_TTL_MS);
+  const challenge: LoginChallenge = {
+    id,
+    nonce,
+    status: 'pending',
+    expiresAt,
+    ...(opts?.deviceId ? { deviceId: opts.deviceId } : {}),
+  };
+  byId.set(id, challenge);
+  byNonce.set(nonce, id);
+  return { id, nonce, expiresAt: new Date(expiresAt) };
+}
+
+export function getLoginChallengeById(id: string): LoginChallenge | null {
+  return purgeIfExpired(id);
+}
+
+export function getLoginChallengeByNonce(nonce: string): LoginChallenge | null {
+  const id = byNonce.get(nonce);
+  if (!id) return null;
+  return purgeIfExpired(id);
+}
+
+export function confirmLoginChallenge(
+  nonce: string,
+  opts: { userId: string; token: string },
+): boolean {
+  const c = getLoginChallengeByNonce(nonce);
+  if (!c || c.status !== 'pending') return false;
+  c.status = 'confirmed';
+  c.userId = opts.userId;
+  c.token = opts.token;
+  return true;
+}
+
+export function consumeLoginChallenge(
+  id: string,
+): { token: string; userId: string } | null {
+  const c = purgeIfExpired(id);
+  if (!c || c.status !== 'confirmed' || !c.token || !c.userId) return null;
+  const result = { token: c.token, userId: c.userId };
+  c.status = 'consumed';
+  byId.delete(id);
+  byNonce.delete(c.nonce);
+  return result;
+}
+
+export function clearAllLoginChallengesForTests(): void {
+  byId.clear();
+  byNonce.clear();
+}
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
diff --git a/apps/ai-app/src/middleware/quota.test.ts b/apps/ai-app/src/middleware/quota.test.ts
index 3930e90..2e56225 100644
--- a/apps/ai-app/src/middleware/quota.test.ts
+++ b/apps/ai-app/src/middleware/quota.test.ts
@@ -81,11 +81,11 @@ describe('enforceChatQuota', () => {
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
@@ -105,11 +105,11 @@ describe('enforceChatQuota', () => {
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
@@ -1,36 +1,27 @@
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
@@ -46,87 +37,108 @@ function requireDb() {
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
@@ -134,18 +146,16 @@ authRouter.get(
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
diff --git a/apps/ai-app/src/routes/billing.test.ts b/apps/ai-app/src/routes/billing.test.ts
index 14f9cee..fdb85c4 100644
--- a/apps/ai-app/src/routes/billing.test.ts
+++ b/apps/ai-app/src/routes/billing.test.ts
@@ -146,11 +146,11 @@ describe('billing routes', () => {
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
diff --git a/apps/ai-app/src/routes/billing.ts b/apps/ai-app/src/routes/billing.ts
index 7949e0d..3f1177c 100644
--- a/apps/ai-app/src/routes/billing.ts
+++ b/apps/ai-app/src/routes/billing.ts
@@ -291,11 +291,11 @@ billingRouter.post(
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
diff --git a/apps/ai-food/.env.example b/apps/ai-food/.env.example
index 20dabd7..9f5c39b 100644
--- a/apps/ai-food/.env.example
+++ b/apps/ai-food/.env.example
@@ -9,21 +9,23 @@ VITE_AI_GATEWAY_URL=
 VITE_AI_GATEWAY_API_KEY=
 
 # ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛: legacy API base (axios client)
 # VITE_API_URL=http://localhost:3001
 
-# тФАтФАтФА Telegram Auth (╨║╨╗╨╕╨╡╨╜╤В) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
-# Username ╨▒╨╛╤В╨░ ╨▒╨╡╨╖ @: ╨╕╨╖ @BotFather (╨╜╨░╨┐╤А╨╕╨╝╨╡╤А my_food_bot)
-VITE_TELEGRAM_BOT_USERNAME=
+# тФАтФАтФА Telegram Auth (bot deep-link) тФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФАтФА
+# ╨Ы╨╛╨│╨╕╨╜: POST /auth/telegram/start тЖТ ╨╛╤В╨║╤А╤Л╤В╤М botDeepLink тЖТ poll /auth/telegram/status.
+# Login Widget ╨╕ domain ╨▓ BotFather ╨╜╨╡ ╨╜╤Г╨╢╨╜╤Л.
+# ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╨╛: username ╨▒╨╛╤В╨░ ╨▒╨╡╨╖ @ тАФ ╤В╨╛╨╗╤М╨║╨╛ ╨┤╨╗╤П ╨┐╨╛╨┤╨┐╨╕╤Б╨╕ ╨╜╨░ ╨║╨╜╨╛╨┐╨║╨╡ ┬л╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram┬╗
+# VITE_TELEGRAM_BOT_USERNAME=
 
-# ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╤П (Login Widget domain ╨▓ BotFather)
-# ╨б╨╡╨╣╤З╨░╤Б: ai-food-mobile.vercel.app
+# ╨Я╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╤Д╤А╨╛╨╜╤В╨░ (╤А╨╡╨┤╨╕╤А╨╡╨║╤В╤Л ╨┐╨╛╤Б╨╗╨╡ ╨╛╨┐╨╗╨░╤В╤Л ╨╕ ╤В.╨┐.)
 VITE_APP_URL=https://ai-food-mobile.vercel.app
 
-# true = ╨║╨╜╨╛╨┐╨║╨░ ┬л╨Т╨╛╨╣╤В╨╕ (╨┤╨╡╨╝╨╛)┬╗ ╨╜╨░ /login; false = ╤В╨╛╨╗╤М╨║╨╛ ╤А╨╡╨░╨╗╤М╨╜╤Л╨╣ ╨▓╨╕╨┤╨╢╨╡╤В (╨║╨╛╨│╨┤╨░ ╨▒╤Г╨┤╨╡╤В)
+# true = ╨║╨╜╨╛╨┐╨║╨░ ┬л╨Т╨╛╨╣╤В╨╕ (╨┤╨╡╨╝╨╛)┬╗ ╨╜╨░ /login; false = ╤В╨╛╨╗╤М╨║╨╛ bot deep-link
 VITE_AUTH_MOCK=true
 
 # Server-side тЖТ apps/ai-app/.env only (never VITE_*):
-# DATABASE_URL=  AUTH_SECRET=  TELEGRAM_BOT_TOKEN=  FREE_GENERATION_LIMIT=50
-# SUBSCRIPTION_PRICE_KOPECKS=10000  SUBSCRIPTION_DURATION_DAYS=365
+# DATABASE_URL=  AUTH_SECRET=  TELEGRAM_BOT_TOKEN=  TELEGRAM_BOT_USERNAME=
+# TELEGRAM_WEBHOOK_SECRET=  PUBLIC_GATEWAY_URL=http://127.0.0.1:3000
+# FREE_GENERATION_LIMIT=50  SUBSCRIPTION_PRICE_KOPECKS=10000  SUBSCRIPTION_DURATION_DAYS=365
 # TBANK_TERMINAL_KEY=  TBANK_PASSWORD=  TBANK_API_URL=  TBANK_MOCK=true
 # PUBLIC_APP_URL=http://localhost:5173
diff --git a/apps/ai-food/docs/AI-GATEWAY.md b/apps/ai-food/docs/AI-GATEWAY.md
index e969253..36b44ec 100644
--- a/apps/ai-food/docs/AI-GATEWAY.md
+++ b/apps/ai-food/docs/AI-GATEWAY.md
@@ -43,25 +43,32 @@ ai-app (openrouter-gateway)
 | `VITE_AI_GATEWAY_URL` | тАФ (URL ╤Б╨╡╤А╨▓╨╕╤Б╨░) | ╨С╨░╨╖╨╛╨▓╤Л╨╣ URL gateway, ╨▒╨╡╨╖ `/v1` |
 | `VITE_AI_GATEWAY_API_KEY` | `API_KEY` | ╨Ю╨▒╤Й╨╕╨╣ ╤Б╨╡╨║╤А╨╡╤В ╨║╨╗╨╕╨╡╨╜╤В╨░; ╨╡╤Б╨╗╨╕ `API_KEY` ╨╜╨╡ ╨╖╨░╨┤╨░╨╜ ╨╜╨░ ╨▒╤Н╨║╨╡ тАФ auth ╨╛╤В╨║╨╗╤О╤З╤С╨╜ |
 | тАФ | `OPENROUTER_API_KEY` | ╨Ъ╨╗╤О╤З ╨┐╤А╨╛╨▓╨░╨╣╨┤╨╡╤А╨░ (╤В╨╛╨╗╤М╨║╨╛ ╨╜╨░ ╤Б╨╡╤А╨▓╨╡╤А╨╡) |
 | тАФ | `PORT` | HTTP-╨┐╨╛╤А╤В (╨┐╨╛ ╤Г╨╝╨╛╨╗╤З╨░╨╜╨╕╤О **3000**) |
 | тАФ | `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` | ╨Ю╨┐╤Ж╨╕╨╛╨╜╨░╨╗╤М╨╜╤Л╨╡ ╨╖╨░╨│╨╛╨╗╨╛╨▓╨║╨╕ ╨░╤В╤А╨╕╨▒╤Г╤Ж╨╕╨╕ OpenRouter |
-| тАФ | `DATABASE_URL`, `AUTH_SECRET`, `TELEGRAM_BOT_TOKEN` | Auth + ╨║╨▓╨╛╤В╨░ |
+| тАФ | `DATABASE_URL`, `AUTH_SECRET` | Auth + ╨║╨▓╨╛╤В╨░ |
+| тАФ | `TELEGRAM_BOT_TOKEN` (╨╕╨╗╨╕ `AUTH_TELEGRAM_BOT_TOKEN`), `TELEGRAM_BOT_USERNAME` | Bot deep-link login |
+| тАФ | `TELEGRAM_WEBHOOK_SECRET`, `PUBLIC_GATEWAY_URL` | Webhook `POST /telegram/webhook` + `setWebhook` ╨┐╤А╨╕ ╤Б╤В╨░╤А╤В╨╡ |
 | тАФ | `FREE_GENERATION_LIMIT` | Guest AI budget (default 50) |
 | тАФ | `AUTH_LOGIN_GENERATION_BONUS` | Extra AI after Telegram login (default 100; summed with free тЖТ 150) |
+| `VITE_TELEGRAM_BOT_USERNAME` (╨╛╨┐╤Ж.) | тАФ | ╨Я╨╛╨┤╨┐╨╕╤Б╤М ╨║╨╜╨╛╨┐╨║╨╕ ┬л╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram┬╗ ╨╜╨░ ╤Д╤А╨╛╨╜╤В╨╡ |
 | тАФ | `SUBSCRIPTION_*`, `TBANK_*`, `PUBLIC_APP_URL` | ╨У╨╛╨┤╨╛╨▓╨░╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╤П (╤Б╨╝. [SUBSCRIPTION.md](./SUBSCRIPTION.md)) |
 
+`PUBLIC_GATEWAY_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ origin **gateway** (webhook). `PUBLIC_APP_URL` тАФ origin **╤Д╤А╨╛╨╜╤В╨░** (T-Bank redirects).
+
 ╨Ы╨╛╨║╨░╨╗╤М╨╜╨╛ ╨╕╨╖ ╨║╨╛╤А╨╜╤П monorepo: `pnpm dev` (╨╛╨▒╨░), ╨╕╨╗╨╕ `pnpm dev:food` (:5173) + `pnpm dev:app` (:3000). Turbo **╨╜╨╡** ╨┐╨╛╨┤╨│╤А╤Г╨╢╨░╨╡╤В `.env` тАФ ╤Н╤В╨╛ ╨┤╨╡╨╗╨░╤О╤В Vite ╨╕ `tsx --env-file=.env`.
 
 `VITE_API_URL` ╨▓ `src/shared/api/client.ts` тАФ ╨╛╤В╨┤╨╡╨╗╤М╨╜╤Л╨╣ axios base (legacy). AI ╤Е╨╛╨┤╨╕╤В ╤З╨╡╤А╨╡╨╖ `fetch` ╨╜╨░ `VITE_AI_GATEWAY_URL`.
 
 ## ╨н╨╜╨┤╨┐╨╛╨╕╨╜╤В╤Л gateway
 
 | ╨Ь╨╡╤В╨╛╨┤ | ╨Я╤Г╤В╤М | Auth | ╨Ч╨░╨╝╨╡╤В╨║╨╕ |
 |-------|------|------|---------|
 | `GET` | `/health` | ╨╜╨╡╤В | `{ "status": "ok" }` |
-| `POST` | `/auth/telegram` | ╨╜╨╡╤В* | Telegram Login тЖТ JWT; ╨╛╤В╨▓╨╡╤В ╨▓╨║╨╗╤О╤З╨░╨╡╤В `hasActiveSubscription` |
+| `POST` | `/auth/telegram/start` | ╨╜╨╡╤В* | `{ challengeId, botDeepLink, expiresAt }` тАФ ╤Б╤В╨░╤А╤В bot deep-link login |
+| `GET` | `/auth/telegram/status?challengeId=` | ╨╜╨╡╤В* | `{ status: "pending" \| "expired" }` ╨╕╨╗╨╕ `{ status: "ok", token, user }` |
+| `POST` | `/telegram/webhook` | `X-Telegram-Bot-Api-Secret-Token` | Telegram Bot API updates; ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ challenge |
 | `GET` | `/auth/me` | `X-User-Token` | ╨Я╤А╨╛╤Д╨╕╨╗╤М + `subscriptionExpiresAt` / `hasActiveSubscription` |
 | `GET` | `/usage` | device (+ optional JWT) | ╨Ъ╨▓╨╛╤В╨░: unlimited **╤В╨╛╨╗╤М╨║╨╛** ╨┐╤А╨╕ active ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `POST` | `/billing/subscribe` | `X-User-Token` | T-Bank Init / mock |
 | `POST` | `/billing/tbank/notification` | Token T-Bank | ╨Р╨║╤В╨╕╨▓╨░╤Ж╨╕╤П ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
 | `GET` | `/billing/status` | `X-User-Token` | ╨б╤В╨░╤В╤Г╤Б ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕ |
@@ -81,11 +88,11 @@ ai-app (openrouter-gateway)
 | `src/features/analyze-food/api/analyzeFoodApi.ts` | ╨Р╨╜╨░╨╗╨╕╨╖ ╤Д╨╛╤В╨╛/╤В╨╡╨║╤Б╤В╨░ тЖТ XML ╨Ъ╨С╨Ц╨г (stream) |
 | `src/features/analyze-food/api/streamChatCompletions.ts` | ╨Ю╨▒╤Й╨╕╨╣ SSE-╨║╨╗╨╕╨╡╨╜╤В `/v1/chat/completions` |
 | `src/features/analyze-food/api/refineMealApi.ts` | ╨г╤В╨╛╤З╨╜╨╡╨╜╨╕╨╡ ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╨░ |
 | `src/features/analyze-food/api/fetchMealCustomContentApi.ts` | ╨Ф╨╛╨┐. markdown-╨║╨╛╨╜╤В╨╡╨╜╤В ╨┐╨╛ ╨▒╨╗╤О╨┤╤Г |
 | `src/features/onboarding/api/micronutrientTargetsApi.ts` | ╨ж╨╡╨╗╨╕ ╨┐╨╛ ╨╝╨╕╨║╤А╨╛╨╜╤Г╤В╤А╨╕╨╡╨╜╤В╨░╨╝ |
-| `src/features/auth/*` | Telegram login, `/usage` |
+| `src/features/auth/*` | Bot deep-link login (`/auth/telegram/start` + poll), `/usage` |
 | `src/features/billing/*` | Subscribe / status / sync |
 
 ╨Ю╤И╨╕╨▒╨║╨╕ gateway (`RATE_LIMITED`, `UPSTREAM_TIMEOUT`, `QUOTA_EXCEEDED`, тАж) ╨╝╨░╨┐╤П╤В╤Б╤П ╨▓ ╨║╨╗╨╕╨╡╨╜╤В╤Б╨║╨╕╨╡ `ApiError`. ╨Я╤А╨╕ `402` UI ╨▓╨╡╨┤╤С╤В ╨│╨╛╤Б╤В╤П ╨╜╨░ `/login`, ╨░╨▓╤В╨╛╤А╨╕╨╖╨╛╨▓╨░╨╜╨╜╨╛╨│╨╛ тАФ ╨╜╨░ `/subscribe`.
 
 ## ╨б╤В╤А╤Г╨║╤В╤Г╤А╨░ ai-app (╨║╤А╨░╤В╨║╨╛)
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegram.ts b/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
index ef3017d..f7e1f0c 100644
--- a/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegram.ts
@@ -1,30 +1,15 @@
-import { getDeviceId } from '@/shared/lib';
 import type { TelegramSession } from '../model/telegramSession';
-import { useAuthStore } from '../model/useAuthStore';
 
-export type TelegramLoginPayload = {
-  id: number;
-  first_name?: string;
-  last_name?: string;
-  username?: string;
-  photo_url?: string;
-  auth_date: number;
-  hash: string;
-};
-
-type AuthTelegramResponse = {
-  token: string;
-  user: {
-    id: string;
-    telegramId: string;
-    username?: string | null;
-    firstName?: string | null;
-    lastName?: string | null;
-    photoUrl?: string | null;
-    name?: string | null;
-  };
+type TelegramGatewayUser = {
+  id: string;
+  telegramId: string;
+  username?: string | null;
+  firstName?: string | null;
+  lastName?: string | null;
+  photoUrl?: string | null;
+  name?: string | null;
 };
 
 function placeholderAvatar(name: string): string {
   const letter = (name.trim()[0] || 'T').toUpperCase();
   return (
@@ -37,11 +22,11 @@ function placeholderAvatar(name: string): string {
     )
   );
 }
 
 export function mapTelegramUserToSession(
-  user: AuthTelegramResponse['user'],
+  user: TelegramGatewayUser,
 ): TelegramSession {
   const name =
     user.name?.trim() ||
     [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
     user.username ||
@@ -52,43 +37,5 @@ export function mapTelegramUserToSession(
     username: user.username ?? '',
     photo_url: user.photoUrl || placeholderAvatar(name),
     telegramId: Number(user.telegramId) || undefined,
   };
 }
-
-/**
- * Exchange Telegram Login Widget payload for gateway JWT + local session.
- */
-export async function signInWithTelegram(
-  payload: TelegramLoginPayload,
-): Promise<TelegramSession> {
-  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
-  if (!gatewayUrl?.trim()) {
-    throw new Error('VITE_AI_GATEWAY_URL ╨╜╨╡ ╨╖╨░╨┤╨░╨╜');
-  }
-
-  const deviceId = await getDeviceId();
-  const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/auth/telegram`, {
-    method: 'POST',
-    headers: { 'Content-Type': 'application/json' },
-    body: JSON.stringify({ ...payload, deviceId }),
-  });
-
-  const data = (await res.json().catch(() => ({}))) as AuthTelegramResponse & {
-    message?: string;
-    code?: string;
-  };
-
-  if (!res.ok || !data.token || !data.user) {
-    throw new Error(data.message ?? `╨Т╤Е╨╛╨┤ ╨╜╨╡ ╤Г╨┤╨░╨╗╤Б╤П (${res.status})`);
-  }
-
-  const session = mapTelegramUserToSession(data.user);
-  useAuthStore.getState().signIn(session, data.token);
-  return session;
-}
-
-export function getTelegramBotUsername(): string | null {
-  const raw = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined)?.trim();
-  if (!raw) return null;
-  return raw.replace(/^@/, '');
-}
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts
new file mode 100644
index 0000000..bea4953
--- /dev/null
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.test.ts
@@ -0,0 +1,88 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
+
+const signIn = vi.fn();
+
+vi.mock('@/shared/lib', () => ({
+  getDeviceId: vi.fn(async () => 'test-device'),
+}));
+
+vi.mock('../model/useAuthStore', () => ({
+  useAuthStore: {
+    getState: () => ({ signIn }),
+  },
+}));
+
+describe('signInWithTelegramBot', () => {
+  beforeEach(() => {
+    vi.useFakeTimers();
+    vi.stubEnv('VITE_AI_GATEWAY_URL', 'https://gateway.example/');
+    signIn.mockReset();
+  });
+
+  afterEach(() => {
+    vi.useRealTimers();
+    vi.unstubAllEnvs();
+    vi.unstubAllGlobals();
+  });
+
+  it('opens the bot link and stores the token after pending status', async () => {
+    const user = {
+      id: 'user-1',
+      telegramId: '42',
+      username: 'ada',
+      name: 'Ada Lovelace',
+      photoUrl: 'https://example.com/ada.png',
+    };
+    const fetchMock = vi
+      .fn<typeof fetch>()
+      .mockResolvedValueOnce(
+        new Response(
+          JSON.stringify({
+            challengeId: 'challenge-1',
+            botDeepLink: 'https://t.me/example_bot?start=challenge-1',
+          }),
+          { status: 200 },
+        ),
+      )
+      .mockResolvedValueOnce(
+        new Response(JSON.stringify({ status: 'pending' }), { status: 200 }),
+      )
+      .mockResolvedValueOnce(
+        new Response(
+          JSON.stringify({ status: 'ok', token: 'jwt-token', user }),
+          { status: 200 },
+        ),
+      );
+    vi.stubGlobal('fetch', fetchMock);
+    const openLink = vi.fn();
+    const { signInWithTelegramBot } = await import('./signInWithTelegramBot');
+
+    const resultPromise = signInWithTelegramBot({ openLink });
+    await vi.advanceTimersByTimeAsync(3_000);
+    const session = await resultPromise;
+
+    expect(openLink).toHaveBeenCalledWith(
+      'https://t.me/example_bot?start=challenge-1',
+    );
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      1,
+      'https://gateway.example/auth/telegram/start',
+      expect.objectContaining({
+        method: 'POST',
+        body: JSON.stringify({ deviceId: 'test-device' }),
+      }),
+    );
+    expect(fetchMock).toHaveBeenNthCalledWith(
+      3,
+      'https://gateway.example/auth/telegram/status?challengeId=challenge-1',
+      { signal: undefined },
+    );
+    expect(signIn).toHaveBeenCalledWith(session, 'jwt-token');
+    expect(session).toMatchObject({
+      id: 'user-1',
+      name: 'Ada Lovelace',
+      username: 'ada',
+      telegramId: 42,
+    });
+  });
+});
diff --git a/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts
new file mode 100644
index 0000000..c25d1dd
--- /dev/null
+++ b/apps/ai-food/src/features/auth/api/signInWithTelegramBot.ts
@@ -0,0 +1,82 @@
+import { getDeviceId } from '@/shared/lib';
+import type { TelegramSession } from '../model/telegramSession';
+import { useAuthStore } from '../model/useAuthStore';
+import { mapTelegramUserToSession } from './signInWithTelegram';
+
+type TelegramGatewayUser = {
+  id: string;
+  telegramId: string;
+  username?: string | null;
+  firstName?: string | null;
+  lastName?: string | null;
+  photoUrl?: string | null;
+  name?: string | null;
+};
+
+type TelegramBotLoginOptions = {
+  signal?: AbortSignal;
+  openLink?: (url: string) => void;
+};
+
+export async function signInWithTelegramBot(
+  opts?: TelegramBotLoginOptions,
+): Promise<TelegramSession> {
+  const gatewayUrl = import.meta.env.VITE_AI_GATEWAY_URL as string | undefined;
+  if (!gatewayUrl?.trim()) {
+    throw new Error('VITE_AI_GATEWAY_URL ╨╜╨╡ ╨╖╨░╨┤╨░╨╜');
+  }
+
+  const base = gatewayUrl.replace(/\/$/, '');
+  const deviceId = await getDeviceId();
+  const startRes = await fetch(`${base}/auth/telegram/start`, {
+    method: 'POST',
+    headers: { 'Content-Type': 'application/json' },
+    body: JSON.stringify({ deviceId }),
+    signal: opts?.signal,
+  });
+  const start = (await startRes.json()) as {
+    challengeId?: string;
+    botDeepLink?: string;
+    message?: string;
+  };
+
+  if (!startRes.ok || !start.challengeId || !start.botDeepLink) {
+    throw new Error(
+      start.message ?? `╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨╜╨░╤З╨░╤В╤М ╨▓╤Е╨╛╨┤ (${startRes.status})`,
+    );
+  }
+
+  (opts?.openLink ?? ((url: string) => window.open(url, '_blank')))(
+    start.botDeepLink,
+  );
+
+  const deadline = Date.now() + 5 * 60 * 1000;
+  while (Date.now() < deadline) {
+    if (opts?.signal?.aborted) {
+      throw new Error('╨Т╤Е╨╛╨┤ ╨╛╤В╨╝╨╡╨╜╤С╨╜');
+    }
+
+    await new Promise((resolve) => setTimeout(resolve, 1_500));
+    const statusRes = await fetch(
+      `${base}/auth/telegram/status?challengeId=${encodeURIComponent(start.challengeId)}`,
+      { signal: opts?.signal },
+    );
+    const status = (await statusRes.json()) as {
+      status: string;
+      token?: string;
+      user?: TelegramGatewayUser;
+      message?: string;
+    };
+
+    if (status.status === 'ok' && status.token && status.user) {
+      const session = mapTelegramUserToSession(status.user);
+      useAuthStore.getState().signIn(session, status.token);
+      return session;
+    }
+    if (status.status === 'expired') {
+      throw new Error('╨б╨╡╤Б╤Б╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨░. ╨Я╨╛╨┐╤А╨╛╨▒╤Г╨╣╤В╨╡ ╤Б╨╜╨╛╨▓╨░.');
+    }
+  }
+
+  throw new Error('╨Т╤А╨╡╨╝╤П ╨╛╨╢╨╕╨┤╨░╨╜╨╕╤П ╨▓╤Е╨╛╨┤╨░ ╨╕╤Б╤В╨╡╨║╨╗╨╛.');
+}
diff --git a/apps/ai-food/src/features/auth/index.ts b/apps/ai-food/src/features/auth/index.ts
index 2b05c78..b8c32b6 100644
--- a/apps/ai-food/src/features/auth/index.ts
+++ b/apps/ai-food/src/features/auth/index.ts
@@ -15,12 +15,8 @@ export {
   GUEST_FREE_USAGE_LIMIT,
   AUTH_LOGIN_GENERATION_BONUS,
   type UsageSnapshot,
 } from './api/fetchUsage';
 export { useUsage, usageQueryKey } from './model/useUsage';
-export {
-  signInWithTelegram,
-  getTelegramBotUsername,
-  mapTelegramUserToSession,
-  type TelegramLoginPayload,
-} from './api/signInWithTelegram';
-export { TelegramLoginButton } from './ui/TelegramLoginButton';
+export { mapTelegramUserToSession } from './api/signInWithTelegram';
+export { signInWithTelegramBot } from './api/signInWithTelegramBot';
+export { TelegramBotLoginButton } from './ui/TelegramBotLoginButton';
diff --git a/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx b/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx
new file mode 100644
index 0000000..a171c43
--- /dev/null
+++ b/apps/ai-food/src/features/auth/ui/TelegramBotLoginButton.tsx
@@ -0,0 +1,54 @@
+import { useEffect, useRef, useState } from 'react';
+import { Button } from '@/shared/ui';
+import { signInWithTelegramBot } from '../api/signInWithTelegramBot';
+
+type TelegramBotLoginButtonProps = {
+  onSuccess: () => void;
+  onError: (message: string) => void;
+};
+
+export function TelegramBotLoginButton({
+  onSuccess,
+  onError,
+}: TelegramBotLoginButtonProps) {
+  const [busy, setBusy] = useState(false);
+  const controllerRef = useRef<AbortController | null>(null);
+
+  useEffect(
+    () => () => {
+      controllerRef.current?.abort();
+    },
+    [],
+  );
+
+  const handleLogin = async () => {
+    const controller = new AbortController();
+    controllerRef.current = controller;
+    setBusy(true);
+
+    try {
+      await signInWithTelegramBot({ signal: controller.signal });
+      onSuccess();
+    } catch (error) {
+      if (!controller.signal.aborted) {
+        onError(
+          error instanceof Error
+            ? error.message
+            : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨▓╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram',
+        );
+      }
+    } finally {
+      if (!controller.signal.aborted) {
+        setBusy(false);
+      }
+    }
+  };
+
+  return (
+    <Button className="w-full" disabled={busy} onClick={() => void handleLogin()}>
+      {busy
+        ? '╨Ю╨╢╨╕╨┤╨░╨╡╨╝ ╨┐╨╛╨┤╤В╨▓╨╡╤А╨╢╨┤╨╡╨╜╨╕╨╡ ╨▓ TelegramтАж'
+        : '╨Т╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram'}
+    </Button>
+  );
+}
diff --git a/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx b/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx
deleted file mode 100644
index 3936e78..0000000
--- a/apps/ai-food/src/features/auth/ui/TelegramLoginButton.tsx
+++ /dev/null
@@ -1,87 +0,0 @@
-import { useEffect, useRef, useState } from 'react';
-import {
-  getTelegramBotUsername,
-  signInWithTelegram,
-  type TelegramLoginPayload,
-} from '../api/signInWithTelegram';
-
-declare global {
-  interface Window {
-    onTelegramAuth?: (user: TelegramLoginPayload) => void;
-  }
-}
-
-type TelegramLoginButtonProps = {
-  onSuccess: () => void;
-  onError: (message: string) => void;
-};
-
-/**
- * Official Telegram Login Widget (works on BotFather Login Widget domain).
- */
-export function TelegramLoginButton({ onSuccess, onError }: TelegramLoginButtonProps) {
-  const containerRef = useRef<HTMLDivElement>(null);
-  const [busy, setBusy] = useState(false);
-  const botUsername = getTelegramBotUsername();
-  const onSuccessRef = useRef(onSuccess);
-  const onErrorRef = useRef(onError);
-  onSuccessRef.current = onSuccess;
-  onErrorRef.current = onError;
-
-  useEffect(() => {
-    const el = containerRef.current;
-    if (!el || !botUsername) return;
-
-    window.onTelegramAuth = (user: TelegramLoginPayload) => {
-      setBusy(true);
-      void signInWithTelegram(user)
-        .then(() => onSuccessRef.current())
-        .catch((err: unknown) => {
-          const message =
-            err instanceof Error ? err.message : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╨▓╨╛╨╣╤В╨╕ ╤З╨╡╤А╨╡╨╖ Telegram';
-          onErrorRef.current(message);
-        })
-        .finally(() => setBusy(false));
-    };
-
-    el.innerHTML = '';
-    const script = document.createElement('script');
-    script.async = true;
-    script.src = 'https://telegram.org/js/telegram-widget.js?22';
-    script.setAttribute('data-telegram-login', botUsername);
-    script.setAttribute('data-size', 'large');
-    script.setAttribute('data-radius', '8');
-    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
-    // Do not request `write`: after user revokes site access in Telegram,
-    // write permission is also revoked and re-login often hangs waiting for
-    // a confirmation that never arrives. Profile login alone is enough for JWT.
-    el.appendChild(script);
-
-    return () => {
-      delete window.onTelegramAuth;
-      el.innerHTML = '';
-    };
-  }, [botUsername]);
-
-  if (!botUsername) {
-    return (
-      <p className="text-sm text-muted-foreground">
-        ╨Ч╨░╨┤╨░╨╣╤В╨╡ <code className="text-xs">VITE_TELEGRAM_BOT_USERNAME</code> ╨▓
-        .env, ╤З╤В╨╛╨▒╤Л ╨┐╨╛╨║╨░╨╖╨░╤В╤М Telegram Login.
-      </p>
-    );
-  }
-
-  return (
-    <div className="space-y-2">
-      <div
-        ref={containerRef}
-        className="flex min-h-[40px] justify-center [color-scheme:light] [&_iframe]:bg-transparent"
-        aria-busy={busy}
-      />
-      {busy && (
-        <p className="text-center text-sm text-muted-foreground">╨Т╤Е╨╛╨┤╨╕╨╝тАж</p>
-      )}
-    </div>
-  );
-}
diff --git a/apps/ai-food/src/pages/login/ui/LoginPage.tsx b/apps/ai-food/src/pages/login/ui/LoginPage.tsx
index 8ea6d86..9fe1783 100644
--- a/apps/ai-food/src/pages/login/ui/LoginPage.tsx
+++ b/apps/ai-food/src/pages/login/ui/LoginPage.tsx
@@ -5,11 +5,11 @@ import {
   GUEST_FREE_USAGE_LIMIT,
   getEffectiveFreeLimit,
   isAuthMockEnabled,
   signInWithMockTelegram,
   signOut,
-  TelegramLoginButton,
+  TelegramBotLoginButton,
   useAuthStore,
 } from '@/features/auth';
 import { Button, SubpageShell } from '@/shared/ui';
 
 export function LoginPage() {
@@ -66,11 +66,11 @@ export function LoginPage() {
             ╨╛╨┐╨╗╨░╤В╤Л.
           </p>
 
           <div className="rounded-md border border-border bg-card px-4 py-5">
             <p className="mb-3 text-center text-sm font-medium">Telegram</p>
-            <TelegramLoginButton
+            <TelegramBotLoginButton
               onSuccess={handleTelegramSuccess}
               onError={(message) => toast.error(message)}
             />
           </div>
 
diff --git a/docs/DOKPLOY.md b/docs/DOKPLOY.md
index 763282a..4e12e73 100644
--- a/docs/DOKPLOY.md
+++ b/docs/DOKPLOY.md
@@ -31,12 +31,14 @@ PORT=3000
 IS_LOCAL=false
 OPENROUTER_API_KEY=
 API_KEY=
 DATABASE_URL=
 AUTH_SECRET=
-FLASHCALL_API_KEY=
 TELEGRAM_BOT_TOKEN=
+TELEGRAM_BOT_USERNAME=
+TELEGRAM_WEBHOOK_SECRET=
+PUBLIC_GATEWAY_URL=https://<gateway-domain>
 FREE_GENERATION_LIMIT=50
 AUTH_LOGIN_GENERATION_BONUS=100
 PUBLIC_APP_URL=https://<frontend-domain>
 SUBSCRIPTION_PRICE_KOPECKS=10000
 SUBSCRIPTION_DURATION_DAYS=365
@@ -44,10 +46,13 @@ TBANK_TERMINAL_KEY=
 TBANK_PASSWORD=
 TBANK_API_URL=https://securepay.tinkoff.ru
 # TBANK_MOCK=true
 ```
 
+`PUBLIC_GATEWAY_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ origin gateway (╨┤╨╗╤П `setWebhook` тЖТ `/telegram/webhook`).  
+`PUBLIC_APP_URL` тАФ ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL **╤Д╤А╨╛╨╜╤В╨░** (Success/Fail/Notification T-Bank).
+
 `start:prod` = `prisma migrate deploy` + ╤Б╨╡╤А╨▓╨╡╤А. Postgres ╨┤╨╛╨╗╨╢╨╡╨╜ ╨▒╤Л╤В╤М ╨┤╨╛╤Б╤В╤Г╨┐╨╡╨╜ ╨║ ╨╝╨╛╨╝╨╡╨╜╤В╤Г ╤Б╤В╨░╤А╤В╨░ (Dokploy Postgres / ╨▓╨╜╨╡╤И╨╜╨╕╨╣ URL).
 
 ╨Ф╨╛╨╝╨╡╨╜ тЖТ ╨┐╨╛╤А╤В **3000**.
 
 ## 2. Frontend (`ai-food`)
@@ -82,10 +87,11 @@ VITE_AUTH_MOCK=false
 
 1. ╨Ч╨░╨┤╨╡╨┐╨╗╨╛╨╣ gateway, ╨┐╨╛╨╗╤Г╤З╨╕ URL.
 2. ╨Т env ╤Д╤А╨╛╨╜╤В╨░ ╤Г╨║╨░╨╢╨╕ `VITE_AI_GATEWAY_URL` ╨╜╨░ ╤Н╤В╨╛╤В URL (╨▒╨╡╨╖ `/v1`).
 3. `VITE_AI_GATEWAY_API_KEY` = `API_KEY` gateway.
 4. ╨Э╨░ gateway `PUBLIC_APP_URL` = ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL ╤Д╤А╨╛╨╜╤В╨░ (╤А╨╡╨┤╨╕╤А╨╡╨║╤В╤Л T-Bank).
+5. ╨Э╨░ gateway `PUBLIC_GATEWAY_URL` = ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Л╨╣ URL gateway (Telegram webhook). ╨Ч╨░╨┤╨░╨╣ `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` тАФ ╨┐╤А╨╕ ╤Б╤В╨░╤А╤В╨╡ gateway ╨▓╤Л╨╖╨╛╨▓╨╡╤В `setWebhook`.
 
 ## Nixpacks (╨░╨╗╤М╤В╨╡╤А╨╜╨░╤В╨╕╨▓╨░)
 
 Build path: `/` (╨║╨╛╤А╨╡╨╜╤М).
 
