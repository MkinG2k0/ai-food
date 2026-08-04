import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getSubscriptionDurationDays,
  getSubscriptionPriceKopecks,
  hasActiveSubscription,
  subscriptionPublicFields,
  activateYearLicense,
} from './subscription.js';

describe('subscription helpers', () => {
  const prevPrice = process.env.SUBSCRIPTION_PRICE_KOPECKS;
  const prevDays = process.env.SUBSCRIPTION_DURATION_DAYS;

  afterEach(() => {
    if (prevPrice === undefined) delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
    else process.env.SUBSCRIPTION_PRICE_KOPECKS = prevPrice;
    if (prevDays === undefined) delete process.env.SUBSCRIPTION_DURATION_DAYS;
    else process.env.SUBSCRIPTION_DURATION_DAYS = prevDays;
  });

  it('getSubscriptionPriceKopecks defaults to 10000', () => {
    delete process.env.SUBSCRIPTION_PRICE_KOPECKS;
    expect(getSubscriptionPriceKopecks()).toBe(10_000);
    process.env.SUBSCRIPTION_PRICE_KOPECKS = '250000';
    expect(getSubscriptionPriceKopecks()).toBe(250_000);
  });

  it('getSubscriptionDurationDays defaults to 365', () => {
    delete process.env.SUBSCRIPTION_DURATION_DAYS;
    expect(getSubscriptionDurationDays()).toBe(365);
    process.env.SUBSCRIPTION_DURATION_DAYS = '30';
    expect(getSubscriptionDurationDays()).toBe(30);
  });

  it('hasActiveSubscription true only when active and expiresAt in future', () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    expect(
      hasActiveSubscription({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: future,
      }),
    ).toBe(true);
    expect(
      hasActiveSubscription({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: past,
      }),
    ).toBe(false);
    expect(
      hasActiveSubscription({
        subscriptionStatus: 'none',
        subscriptionExpiresAt: future,
      }),
    ).toBe(false);
    expect(
      hasActiveSubscription({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: null,
      }),
    ).toBe(false);
  });

  it('subscriptionPublicFields exposes expiry and hasActiveSubscription', () => {
    const future = new Date(Date.now() + 86_400_000);
    const fields = subscriptionPublicFields({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: future,
    });
    expect(fields).toEqual({
      subscriptionStatus: 'active',
      subscriptionExpiresAt: future.toISOString(),
      hasActiveSubscription: true,
    });
  });

  it('activateYearLicense sets active + expiresAt = paidAt + duration', async () => {
    const paidAt = new Date('2026-01-15T12:00:00.000Z');
    process.env.SUBSCRIPTION_DURATION_DAYS = '365';
    const update = vi.fn().mockResolvedValue({});
    const prisma = { user: { update } } as never;
    await activateYearLicense(prisma, 'user-1', paidAt);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date('2027-01-15T12:00:00.000Z'),
      },
    });
  });
});
