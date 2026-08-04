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

