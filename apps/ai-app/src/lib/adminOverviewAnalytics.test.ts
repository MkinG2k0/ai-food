import { describe, expect, it } from 'vitest';
import { buildOverviewAnalytics } from './adminOverviewAnalytics.js';

describe('buildOverviewAnalytics', () => {
  const now = new Date('2026-08-29T12:00:00.000Z');

  it('computes funnel, revenue, promo, referral, and payment statuses', () => {
    const analytics = buildOverviewAnalytics({
      now,
      guestsWithScans: 5,
      usersTotal: 10,
      limitGuest: 3,
      limitAuth: 5,
      guestDeviceIds: ['g1'],
      users: [
        {
          id: 'u1',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
        },
        {
          id: 'u2',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: new Date('2026-08-25T00:00:00.000Z'),
        },
        {
          id: 'u3',
          subscriptionStatus: 'canceled',
          subscriptionExpiresAt: new Date('2026-08-01T00:00:00.000Z'),
        },
        {
          id: 'u4',
          subscriptionStatus: 'none',
          subscriptionExpiresAt: null,
        },
      ],
      payments: [
        {
          userId: 'u1',
          amount: 10_000,
          status: 'confirmed',
          promoCode: 'SAVE10',
          referralGrantedAt: new Date('2026-08-28T10:00:00.000Z'),
          paidAt: new Date('2026-08-28T10:00:00.000Z'),
          createdAt: new Date('2026-08-28T09:00:00.000Z'),
        },
        {
          userId: 'u1',
          amount: 5_000,
          status: 'confirmed',
          promoCode: null,
          referralGrantedAt: null,
          paidAt: new Date('2026-07-01T10:00:00.000Z'),
          createdAt: new Date('2026-07-01T09:00:00.000Z'),
        },
        {
          userId: 'u2',
          amount: 9_000,
          status: 'pending',
          promoCode: null,
          referralGrantedAt: null,
          paidAt: null,
          createdAt: new Date('2026-08-28T11:00:00.000Z'),
        },
        {
          userId: 'u3',
          amount: 1_000,
          status: 'rejected',
          promoCode: null,
          referralGrantedAt: null,
          paidAt: null,
          createdAt: new Date('2026-08-20T11:00:00.000Z'),
        },
      ],
      usageEvents: [],
    });

    expect(analytics.funnel).toEqual({
      guestsWithScans: 5,
      users: 10,
      payingUsers: 1,
      userToPayRate: 0.1,
    });
    expect(analytics.revenue).toEqual({
      last7DaysKopecks: 10_000,
      last30DaysKopecks: 10_000,
    });
    expect(analytics.paymentsByStatus).toEqual({
      pending: 1,
      confirmed: 2,
      rejected: 1,
      refunded: 0,
    });
    expect(analytics.promo).toEqual({
      confirmedCount: 1,
      confirmedSumKopecks: 10_000,
    });
    expect(analytics.referral.confirmedCount).toBe(1);
    expect(analytics.subscriptions).toEqual({
      active: 1,
      expiringSoon7Days: 1,
      expiredOrInactive: 2,
    });
  });

  it('computes DAU/WAU, mix, auth share, quota exhaustion, retention', () => {
    const analytics = buildOverviewAnalytics({
      now,
      guestsWithScans: 1,
      usersTotal: 2,
      limitGuest: 2,
      limitAuth: 3,
      guestDeviceIds: ['guest-dev'],
      users: [
        {
          id: 'u-free',
          subscriptionStatus: 'none',
          subscriptionExpiresAt: null,
        },
        {
          id: 'u-sub',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: new Date('2026-12-01T00:00:00.000Z'),
        },
      ],
      payments: [],
      usageEvents: [
        // free user exhausted (3 billable >= limitAuth 3)
        {
          kind: 'analyze_photo',
          userId: 'u-free',
          deviceId: 'd1',
          createdAt: new Date('2026-08-29T08:00:00.000Z'),
        },
        {
          kind: 'analyze_text',
          userId: 'u-free',
          deviceId: 'd1',
          createdAt: new Date('2026-08-29T09:00:00.000Z'),
        },
        {
          kind: 'refine',
          userId: 'u-free',
          deviceId: 'd1',
          createdAt: new Date('2026-08-28T09:00:00.000Z'),
        },
        // subscriber over limit — not counted
        {
          kind: 'analyze_photo',
          userId: 'u-sub',
          deviceId: 'd2',
          createdAt: new Date('2026-08-29T10:00:00.000Z'),
        },
        {
          kind: 'analyze_photo',
          userId: 'u-sub',
          deviceId: 'd2',
          createdAt: new Date('2026-08-29T11:00:00.000Z'),
        },
        {
          kind: 'analyze_photo',
          userId: 'u-sub',
          deviceId: 'd2',
          createdAt: new Date('2026-08-29T12:00:00.000Z'),
        },
        {
          kind: 'refine',
          userId: 'u-sub',
          deviceId: 'd2',
          createdAt: new Date('2026-08-29T13:00:00.000Z'),
        },
        // guest exhausted (2 billable >= 2)
        {
          kind: 'analyze_photo',
          userId: null,
          deviceId: 'guest-dev',
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
        },
        {
          kind: 'analyze_photo_text',
          userId: null,
          deviceId: 'guest-dev',
          createdAt: new Date('2026-08-21T10:00:00.000Z'),
        },
        // retention cohort: first on 2026-08-15 (= today-14), D1 + D7
        {
          kind: 'analyze_photo',
          userId: 'u-ret',
          deviceId: 'd-ret',
          createdAt: new Date('2026-08-15T10:00:00.000Z'),
        },
        {
          kind: 'analyze_photo',
          userId: 'u-ret',
          deviceId: 'd-ret',
          createdAt: new Date('2026-08-16T10:00:00.000Z'),
        },
        {
          kind: 'analyze_photo',
          userId: 'u-ret',
          deviceId: 'd-ret',
          createdAt: new Date('2026-08-22T10:00:00.000Z'),
        },
      ],
    });

    expect(analytics.product.dau).toBe(2); // u-free + u-sub
    expect(analytics.product.wau).toBe(2);
    expect(analytics.product.usageMix30d.analyze_photo).toBeGreaterThan(0);
    expect(analytics.product.analyzeAuthShare30d.guestOnly).toBe(2);
    expect(analytics.product.quotaExhausted).toMatchObject({
      users: 2, // u-free + u-ret (retention cohort also billable)
      guests: 1,
      limitGuest: 2,
      limitAuth: 3,
    });
    expect(analytics.product.retention).toEqual({
      cohortSize: 2, // u-ret + guest
      d1Count: 2,
      d7Count: 1,
      d1Rate: 1,
      d7Rate: 0.5,
    });
  });
});
