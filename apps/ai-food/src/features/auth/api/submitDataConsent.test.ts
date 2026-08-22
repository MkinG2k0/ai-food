import { beforeEach, describe, expect, it, vi } from 'vitest';

const setDataConsent = vi.fn();

vi.mock('../model/useAuthStore', () => ({
  useAuthStore: {
    getState: vi.fn(() => ({ userToken: 'jwt-test', setDataConsent })),
  },
}));

import { submitDataConsent } from './submitDataConsent';
import { useAuthStore } from '../model/useAuthStore';
import { DATA_CONSENT_VERSION } from '../model/dataConsentVersion';

describe('submitDataConsent', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_AI_GATEWAY_URL', 'http://gateway.test');
    setDataConsent.mockReset();
    vi.mocked(useAuthStore.getState).mockReturnValue({
      userToken: 'jwt-test',
      setDataConsent,
    } as never);
    vi.spyOn(globalThis, 'fetch');
  });

  it('POSTs consent version and updates auth store', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          dataConsentAt: '2026-08-06T00:00:00.000Z',
          dataConsentVersion: DATA_CONSENT_VERSION,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await submitDataConsent();

    expect(fetch).toHaveBeenCalledWith(
      'http://gateway.test/auth/consent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ version: DATA_CONSENT_VERSION }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-User-Token': 'jwt-test',
        }),
      }),
    );
    expect(setDataConsent).toHaveBeenCalledWith(
      '2026-08-06T00:00:00.000Z',
      DATA_CONSENT_VERSION,
    );
  });

  it('throws when gateway URL is missing', async () => {
    vi.stubEnv('VITE_AI_GATEWAY_URL', '');
    await expect(submitDataConsent()).rejects.toThrow(/VITE_AI_GATEWAY_URL/);
  });

  it('throws when user token is missing', async () => {
    vi.mocked(useAuthStore.getState).mockReturnValue({
      userToken: null,
      setDataConsent,
    } as never);
    await expect(submitDataConsent()).rejects.toThrow(/необходимо войти/);
  });

  it('throws when response is OK but dataConsentAt is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ dataConsentVersion: DATA_CONSENT_VERSION }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(submitDataConsent()).rejects.toThrow(/Не удалось сохранить согласие/);
    expect(setDataConsent).not.toHaveBeenCalled();
  });

  it('throws gateway message on non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Consent already recorded' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await expect(submitDataConsent()).rejects.toThrow(/Consent already recorded/);
  });
});
