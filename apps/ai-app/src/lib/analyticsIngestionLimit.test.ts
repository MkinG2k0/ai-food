import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/errors.js';
import {
  assertAnalyticsIngestionAllowed,
  resetAnalyticsIngestionLimitForTests,
} from './analyticsIngestionLimit.js';

describe('assertAnalyticsIngestionAllowed', () => {
  afterEach(() => {
    resetAnalyticsIngestionLimitForTests();
  });

  it('allows a burst under the per-device cap', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(() => assertAnalyticsIngestionAllowed('dev-1')).not.toThrow();
    }
  });

  it('rejects the 31st event in the same window', () => {
    for (let i = 0; i < 30; i += 1) {
      assertAnalyticsIngestionAllowed('dev-1');
    }
    expect(() => assertAnalyticsIngestionAllowed('dev-1')).toThrow(ApiError);
    try {
      assertAnalyticsIngestionAllowed('dev-1');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(429);
      expect((error as ApiError).code).toBe('RATE_LIMITED');
    }
  });

  it('isolates limits per device', () => {
    for (let i = 0; i < 30; i += 1) {
      assertAnalyticsIngestionAllowed('dev-a');
    }
    expect(() => assertAnalyticsIngestionAllowed('dev-b')).not.toThrow();
  });

  it('rejects oversized device ids', () => {
    expect(() => assertAnalyticsIngestionAllowed('x'.repeat(129))).toThrow(
      ApiError,
    );
  });
});
