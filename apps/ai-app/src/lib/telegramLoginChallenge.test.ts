import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAllLoginChallengesForTests,
  confirmLoginChallenge,
  consumeLoginChallenge,
  createLoginChallenge,
  getLoginChallengeByNonce,
} from './telegramLoginChallenge.js';

describe('telegramLoginChallenge', () => {
  afterEach(() => {
    clearAllLoginChallengesForTests();
  });

  it('create → confirm → consume → second consume null', () => {
    const { id, nonce } = createLoginChallenge({ deviceId: 'dev-1' });
    expect(getLoginChallengeByNonce(nonce)?.status).toBe('pending');

    expect(
      confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt-1' }),
    ).toBe(true);

    const first = consumeLoginChallenge(id);
    expect(first).toEqual({ userId: 'u1', token: 'jwt-1' });
    expect(consumeLoginChallenge(id)).toBeNull();
  });

  it('rejects confirm for unknown nonce', () => {
    expect(
      confirmLoginChallenge('nope', { userId: 'u1', token: 'jwt' }),
    ).toBe(false);
  });

  it('expires pending challenges', () => {
    const { id, nonce } = createLoginChallenge({ ttlMs: -1 });
    expect(confirmLoginChallenge(nonce, { userId: 'u1', token: 'jwt' })).toBe(
      false,
    );
    expect(consumeLoginChallenge(id)).toBeNull();
  });
});
