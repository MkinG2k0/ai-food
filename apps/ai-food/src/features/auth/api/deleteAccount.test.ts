import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getState } = vi.hoisted(() => ({
  getState: vi.fn(),
}));

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: { getState },
}));

import { deleteAccount } from './deleteAccount';

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test/');
    getState.mockReturnValue({ userToken: 'jwt-del' });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('DELETE /auth/me with X-User-Token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await deleteAccount();

    expect(fetch).toHaveBeenCalledWith('http://gateway.test/auth/me', {
      method: 'DELETE',
      headers: { 'X-User-Token': 'jwt-del' },
    });
  });

  it('throws when URL missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(deleteAccount()).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when not signed in', async () => {
    getState.mockReturnValue({ userToken: null });
    await expect(deleteAccount()).rejects.toThrow(/вход/);
  });

  it('throws on non-204', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Nope' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(deleteAccount()).rejects.toThrow(/Nope/);
  });
});
