import { describe, it, expect } from 'vitest';
import { mapTelegramUserToSession } from '../api/signInWithTelegram';

describe('mapTelegramUserToSession', () => {
  it('maps gateway user to TelegramSession', () => {
    const session = mapTelegramUserToSession({
      id: 'cuid1',
      telegramId: '42',
      username: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
      photoUrl: 'https://example.com/a.png',
      name: 'Ada Lovelace',
    });
    expect(session).toEqual({
      id: 'cuid1',
      name: 'Ada Lovelace',
      username: 'ada',
      photo_url: 'https://example.com/a.png',
      telegramId: 42,
    });
  });

  it('falls back when name/photo missing', () => {
    const session = mapTelegramUserToSession({
      id: 'cuid2',
      telegramId: '7',
      username: 'bob',
    });
    expect(session.name).toBe('bob');
    expect(session.username).toBe('bob');
    expect(session.photo_url.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('does not throw on emoji-leading name without photoUrl', () => {
    const session = mapTelegramUserToSession({
      id: 'cuid3',
      telegramId: '99',
      username: 'chef',
      name: '🍕 Pizza',
    });
    expect(session.name).toBe('🍕 Pizza');
    expect(session.photo_url.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('uses telegramId as username when Telegram username is missing', () => {
    const session = mapTelegramUserToSession({
      id: 'cuid4',
      telegramId: '12345',
      username: '',
    });
    expect(session.username).toBe('12345');
    expect(session.name).toBe('12345');
    expect(session.photo_url.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('uses telegramId when username is whitespace only', () => {
    const session = mapTelegramUserToSession({
      id: 'cuid5',
      telegramId: '777',
      username: '   ',
    });
    expect(session.username).toBe('777');
  });
});
