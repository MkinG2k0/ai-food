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
});
