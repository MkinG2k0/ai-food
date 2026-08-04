BASE: 8db7ba6a29edc811b9108e4c7e78fbb65cf6b12d
HEAD: 5a0bd1cdd0f6d68c3f98b9abc30886236dc235cc

5a0bd1c feat(ai-app): add thin Telegram Bot API client
 apps/ai-app/src/lib/telegramBotApi.test.ts | 36 ++++++++++++
 apps/ai-app/src/lib/telegramBotApi.ts      | 90 ++++++++++++++++++++++++++++++
 2 files changed, 126 insertions(+)
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
