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

