import { describe, expect, it } from 'vitest';
import { apiClient } from './client';

describe('apiClient', () => {
  it('maps axios errors to ApiError shape', async () => {
    const handlers = (
      apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }
    ).handlers;
    const rejected = handlers[0]?.rejected;
    expect(rejected).toBeTypeOf('function');

    await expect(
      rejected({
        message: 'Network Error',
        response: {
          status: 422,
          data: { message: 'Validation failed', code: 'VALIDATION' },
        },
      }),
    ).rejects.toEqual({
      message: 'Validation failed',
      code: 'VALIDATION',
      status: 422,
    });
  });

  it('falls back to generic message when response body is missing', async () => {
    const handlers = (
      apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<never> }>;
      }
    ).handlers;
    const rejected = handlers[0]?.rejected;

    await expect(
      rejected({
        message: 'timeout of 30000ms exceeded',
      }),
    ).rejects.toEqual({
      message: 'timeout of 30000ms exceeded',
      code: 'UNKNOWN',
      status: 0,
    });
  });
});
