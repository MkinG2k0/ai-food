# Admin overview: sales + product analytics

**Date:** 2026-08-29  
**Status:** Approved (user: implement with retention)  
**Repos:** `ai-app` (`GET /admin/stats`) + `ai-web` (`/admin` Overview)  
**Approach:** A — extend `/admin/stats` with `analytics` object

## Goal

Add **Продажи** and **Продукт** sections on the admin Overview using existing Prisma data (no new telemetry tables).

## Non-goals

- True MRR formula / OpenRouter cost
- Changing series charts window
- Moving latency/reliability onto Overview
- New admin pages

## API

`GET /admin/stats` gains:

```ts
analytics: {
  funnel: {
    guestsWithScans: number;
    users: number;
    payingUsers: number;
    userToPayRate: number | null; // payingUsers / users
  };
  revenue: { last7DaysKopecks: number; last30DaysKopecks: number };
  paymentsByStatus: {
    pending: number;
    confirmed: number;
    rejected: number;
    refunded: number;
  };
  promo: { confirmedCount: number; confirmedSumKopecks: number };
  referral: { confirmedCount: number };
  subscriptions: {
    active: number;
    expiringSoon7Days: number;
    expiredOrInactive: number;
  };
  product: {
    dau: number;
    wau: number;
    usageMix30d: Record<string, number>; // kinds
    analyzeAuthShare30d: { withUser: number; guestOnly: number };
    quotaExhausted: {
      users: number;
      guests: number;
      limitGuest: number;
      limitAuth: number;
    };
    retention: {
      cohortSize: number;
      d1Count: number;
      d7Count: number;
      d1Rate: number | null;
      d7Rate: number | null;
    };
  };
}
```

## Definitions

- **Paying user:** distinct `userId` with ≥1 `Payment.status = confirmed`
- **Revenue windows:** confirmed payments with `(paidAt ?? createdAt) >= windowStart`
- **Expiring soon:** `subscriptionStatus = active` and `now < expiresAt <= now+7d`
- **Expired/inactive:** active+expired, or status `canceled` / `past_due`
- **DAU/WAU:** unique actors (`user:{id}` or `device:{id}`) with `kind` starting `analyze` today / last 7 UTC days
- **Quota exhausted:** billable usage (`analyze*` + `refine`) ≥ effective free limit; exclude active subscribers
- **Retention:** actors whose **first** analyze UTC day is in `[today-30d, today-8d]`; D1/D7 = any analyze on firstDay+1 / +7

## UI

Two new sections on Overview under existing Users/Payments, above 7-day charts. Same Card + Statistic patterns.
