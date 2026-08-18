import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearBillingCache,
  getCachedBillingStatus,
  setCachedBillingStatus,
} from './billingCache';

const sample = {
  subscriptionStatus: 'active',
  subscriptionExpiresAt: '2027-08-18T00:00:00.000Z',
  hasActiveSubscription: true,
  latestPayment: null,
};

describe('billingCache', () => {
  beforeEach(() => {
    clearBillingCache();
  });

  it('round-trips billing status', () => {
    setCachedBillingStatus(sample);
    expect(getCachedBillingStatus()).toEqual(sample);
  });

  it('ignores corrupt payloads', () => {
    localStorage.setItem('ai-food-billing-status', '{nope');
    expect(getCachedBillingStatus()).toBeUndefined();
  });
});
