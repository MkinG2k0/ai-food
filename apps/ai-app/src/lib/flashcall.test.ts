import { describe, it, expect, afterEach, vi } from 'vitest';
import { ApiError } from '../../lib/errors.js';
import { sendFlashCall } from './flashcall.js';

describe('sendFlashCall', () => {
  const prevKey = process.env.FLASHCALL_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevKey === undefined) delete process.env.FLASHCALL_API_KEY;
    else process.env.FLASHCALL_API_KEY = prevKey;
  });

  it('returns id, code, number on ok', async () => {
    process.env.FLASHCALL_API_KEY = 'test-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'ok',
        id: 'prov-123',
        code: '1234',
        number: '74951234567',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendFlashCall('79991234567');
    expect(result).toEqual({
      id: 'prov-123',
      code: '1234',
      number: '74951234567',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://voice.mobilgroup.ru/api/voice-password/send/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'test-key',
        },
        body: JSON.stringify({ number: '79991234567', capacity: '4' }),
      },
    );
  });

  it('throws FLASHCALL_FAILED on provider error', async () => {
    process.env.FLASHCALL_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: 'error', error_code: 'INVALID_NUMBER' }),
      }),
    );

    await expect(sendFlashCall('79991234567')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 502 &&
        err.code === 'FLASHCALL_FAILED',
    );
  });

  it('throws AUTH_MISCONFIGURED when API key missing', async () => {
    delete process.env.FLASHCALL_API_KEY;

    await expect(sendFlashCall('79991234567')).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof ApiError &&
        err.status === 503 &&
        err.code === 'AUTH_MISCONFIGURED',
    );
  });
});
