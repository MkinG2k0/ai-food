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
