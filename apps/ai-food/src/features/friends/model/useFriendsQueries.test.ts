import { describe, expect, it } from 'vitest';
import { friendsErrorMessage } from './useFriendsQueries';

describe('friendsErrorMessage', () => {
  it('maps known API codes to Russian toasts', () => {
    expect(friendsErrorMessage('USER_NOT_FOUND')).toBe('Пользователь не найден');
    expect(friendsErrorMessage('SELF_REQUEST')).toBe('Нельзя добавить себя');
    expect(friendsErrorMessage('ALREADY_FRIENDS')).toBe('Уже в друзьях');
    expect(friendsErrorMessage('REQUEST_PENDING')).toBe('Заявка уже отправлена');
    expect(friendsErrorMessage('FRIENDS_ONLY')).toBe('Доступ только для друзей');
  });

  it('returns null for unknown codes', () => {
    expect(friendsErrorMessage('OTHER')).toBeNull();
    expect(friendsErrorMessage(undefined)).toBeNull();
  });
});
