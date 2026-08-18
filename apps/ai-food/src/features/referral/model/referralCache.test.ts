import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearReferralCache,
  getCachedReferral,
  setCachedReferral,
} from './referralCache';

describe('referralCache', () => {
  beforeEach(() => {
    clearReferralCache();
  });

  it('round-trips referral info', () => {
    setCachedReferral({ code: 'double_cumboy', conversionCount: 0 });
    expect(getCachedReferral()).toEqual({
      code: 'double_cumboy',
      conversionCount: 0,
    });
  });

  it('ignores corrupt payloads', () => {
    localStorage.setItem('ai-food-referral', '{nope');
    expect(getCachedReferral()).toBeUndefined();
  });
});
