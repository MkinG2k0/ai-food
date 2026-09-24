import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMessage = vi.fn();

vi.mock('./telegramBotApi.js', () => ({
  sendMessage: (...args: unknown[]) => sendMessage(...args),
}));

import {
  buildSupportReportAdminMessage,
  notifyAdminNewSupportReport,
  parseAdminTelegramChatIds,
} from './notifyAdminSupportReport.js';

describe('parseAdminTelegramChatIds', () => {
  it('parses comma/space separated ids', () => {
    expect(parseAdminTelegramChatIds('111, 222;333')).toEqual([111, 222, 333]);
  });

  it('returns empty when unset', () => {
    expect(parseAdminTelegramChatIds(undefined)).toEqual([]);
    expect(parseAdminTelegramChatIds('  ')).toEqual([]);
  });
});

describe('buildSupportReportAdminMessage', () => {
  const prevAdminUrl = process.env.PUBLIC_ADMIN_URL;

  afterEach(() => {
    if (prevAdminUrl === undefined) delete process.env.PUBLIC_ADMIN_URL;
    else process.env.PUBLIC_ADMIN_URL = prevAdminUrl;
  });

  it('formats Russian summary with admin link', () => {
    process.env.PUBLIC_ADMIN_URL = 'https://admin.example.com/';
    const text = buildSupportReportAdminMessage({
      id: 'r1',
      type: 'bug',
      message: 'Не могу войти',
      platform: 'android',
      appVersion: '1.0.13',
      imageCount: 2,
      userId: 'u1',
      deviceId: null,
      userDisplayName: 'Кама',
    });
    expect(text).toContain('Новое обращение: Ошибка');
    expect(text).toContain('Кама');
    expect(text).toContain('android-1.0.13 · 2 фото');
    expect(text).toContain('Не могу войти');
    expect(text).toContain('https://admin.example.com/admin/support-reports');
  });
});

describe('notifyAdminNewSupportReport', () => {
  const prevChat = process.env.ADMIN_TELEGRAM_CHAT_ID;

  afterEach(() => {
    if (prevChat === undefined) delete process.env.ADMIN_TELEGRAM_CHAT_ID;
    else process.env.ADMIN_TELEGRAM_CHAT_ID = prevChat;
    vi.clearAllMocks();
  });

  it('no-ops when chat id unset', async () => {
    delete process.env.ADMIN_TELEGRAM_CHAT_ID;
    await notifyAdminNewSupportReport({
      id: 'r1',
      type: 'bug',
      message: 'x',
      platform: null,
      appVersion: null,
      imageCount: 0,
      userId: null,
      deviceId: 'd1',
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends to each configured chat', async () => {
    process.env.ADMIN_TELEGRAM_CHAT_ID = '10,20';
    sendMessage.mockResolvedValue(undefined);
    await notifyAdminNewSupportReport({
      id: 'r1',
      type: 'question',
      message: 'Как?',
      platform: 'web',
      appVersion: null,
      imageCount: 0,
      userId: null,
      deviceId: 'device-abc',
    });
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(
      10,
      expect.stringContaining('Новое обращение: Вопрос'),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      20,
      expect.stringContaining('Гость · device-abc'),
    );
  });
});
