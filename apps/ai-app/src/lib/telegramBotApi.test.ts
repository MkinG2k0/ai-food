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

  it('buildBotDeepLink throws when username is missing', async () => {
    delete process.env.TELEGRAM_BOT_USERNAME;
    const { buildBotDeepLink } = await import('./telegramBotApi.js');
    expect(() => buildBotDeepLink('abc')).toThrow(/TELEGRAM_BOT_USERNAME/);
  });

  it('getTelegramBotToken falls back to AUTH_TELEGRAM_BOT_TOKEN', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.AUTH_TELEGRAM_BOT_TOKEN = '2:auth-token';
    const { getTelegramBotToken } = await import('./telegramBotApi.js');
    expect(getTelegramBotToken()).toBe('2:auth-token');
  });

  it('telegramApi throws when token is missing', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.AUTH_TELEGRAM_BOT_TOKEN;
    const { telegramApi } = await import('./telegramBotApi.js');
    await expect(telegramApi('getMe', {})).rejects.toMatchObject({
      code: 'TELEGRAM_MISCONFIGURED',
    });
  });

  it('telegramApi throws on Telegram API error response', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '1:token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, description: 'Bad Request: chat not found' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { telegramApi } = await import('./telegramBotApi.js');
    await expect(telegramApi('sendMessage', { chat_id: 1, text: 'x' })).rejects.toMatchObject({
      code: 'TELEGRAM_API_ERROR',
      message: 'Bad Request: chat not found',
    });
  });

  it('answerCallbackQuery posts callback_query_id', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '1:token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { answerCallbackQuery } = await import('./telegramBotApi.js');
    await answerCallbackQuery('cb-1', 'done');
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.callback_query_id).toBe('cb-1');
    expect(body.text).toBe('done');
  });

  it('setWebhook posts url and secret token', async () => {
    process.env.TELEGRAM_BOT_TOKEN = '1:token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { setWebhook } = await import('./telegramBotApi.js');
    await setWebhook({ url: 'https://gw/tg/webhook', secretToken: 'secret' });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.url).toBe('https://gw/tg/webhook');
    expect(body.secret_token).toBe('secret');
    expect(body.allowed_updates).toEqual(['message', 'callback_query']);
  });
});
