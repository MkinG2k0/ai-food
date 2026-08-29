import type { PrismaClient } from '../generated/prisma/client.js';
import { getQuotaLimits } from './quota.js';
import { utcDayKey } from './adminStatsSeries.js';

export type OverviewAnalytics = {
  funnel: {
    guestsWithScans: number;
    users: number;
    payingUsers: number;
    userToPayRate: number | null;
  };
  revenue: {
    last7DaysKopecks: number;
    last30DaysKopecks: number;
  };
  paymentsByStatus: {
    pending: number;
    confirmed: number;
    rejected: number;
    refunded: number;
  };
  promo: {
    confirmedCount: number;
    confirmedSumKopecks: number;
  };
  referral: {
    confirmedCount: number;
  };
  subscriptions: {
    active: number;
    expiringSoon7Days: number;
    expiredOrInactive: number;
  };
  product: {
    dau: number;
    wau: number;
    usageMix30d: {
      analyze_photo: number;
      analyze_text: number;
      analyze_photo_text: number;
      analyze: number;
      refine: number;
      barcode: number;
      manual: number;
      other: number;
    };
    analyzeAuthShare30d: {
      withUser: number;
      guestOnly: number;
    };
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
};

type UsageRow = {
  kind: string;
  userId: string | null;
  deviceId: string;
  createdAt: Date;
};

type PaymentRow = {
  userId: string;
  amount: number;
  status: string;
  promoCode: string | null;
  referralGrantedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

type UserSubRow = {
  id: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
};

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function paymentAt(p: PaymentRow): Date {
  return p.paidAt ?? p.createdAt;
}

function actorKey(userId: string | null, deviceId: string): string {
  return userId ? `user:${userId}` : `device:${deviceId}`;
}

function addUtcDays(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDayKey(d);
}

function emptyMix(): OverviewAnalytics['product']['usageMix30d'] {
  return {
    analyze_photo: 0,
    analyze_text: 0,
    analyze_photo_text: 0,
    analyze: 0,
    refine: 0,
    barcode: 0,
    manual: 0,
    other: 0,
  };
}

function emptyPaymentsByStatus(): OverviewAnalytics['paymentsByStatus'] {
  return { pending: 0, confirmed: 0, rejected: 0, refunded: 0 };
}

/** Pure builder — unit-tested with fixed `now`. */
export function buildOverviewAnalytics(input: {
  now: Date;
  guestsWithScans: number;
  usersTotal: number;
  payments: PaymentRow[];
  users: UserSubRow[];
  usageEvents: UsageRow[];
  guestDeviceIds: string[];
  limitGuest: number;
  limitAuth: number;
}): OverviewAnalytics {
  const {
    now,
    guestsWithScans,
    usersTotal,
    payments,
    users,
    usageEvents,
    guestDeviceIds,
    limitGuest,
    limitAuth,
  } = input;

  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayKey = utcDayKey(now);
  const wauStartKey = addUtcDays(todayKey, -6);

  const payingUsers = new Set(
    payments.filter((p) => p.status === 'confirmed').map((p) => p.userId),
  ).size;

  const paymentsByStatus = emptyPaymentsByStatus();
  let revenue7 = 0;
  let revenue30 = 0;
  let promoCount = 0;
  let promoSum = 0;
  let referralCount = 0;

  for (const p of payments) {
    if (p.status in paymentsByStatus) {
      paymentsByStatus[p.status as keyof typeof paymentsByStatus] += 1;
    }
    if (p.status !== 'confirmed') continue;
    const at = paymentAt(p);
    if (at >= last7) revenue7 += p.amount;
    if (at >= last30) revenue30 += p.amount;
    if (p.promoCode) {
      promoCount += 1;
      promoSum += p.amount;
    }
    if (p.referralGrantedAt) referralCount += 1;
  }

  let active = 0;
  let expiringSoon = 0;
  let expiredOrInactive = 0;
  const activeSubIds = new Set<string>();

  for (const u of users) {
    const exp = u.subscriptionExpiresAt;
    const isActive =
      u.subscriptionStatus === 'active' && exp != null && exp > now;
    if (isActive) {
      active += 1;
      activeSubIds.add(u.id);
      if (exp <= in7d) expiringSoon += 1;
    } else if (
      u.subscriptionStatus === 'canceled' ||
      u.subscriptionStatus === 'past_due' ||
      (u.subscriptionStatus === 'active' && exp != null && exp <= now)
    ) {
      expiredOrInactive += 1;
    }
  }

  const mix30 = emptyMix();
  let analyzeWithUser = 0;
  let analyzeGuestOnly = 0;
  const actorsToday = new Set<string>();
  const actorsWau = new Set<string>();
  const billableByUser = new Map<string, number>();
  const billableByDevice = new Map<string, number>();
  const analyzeByActorDay = new Map<string, Set<string>>();
  const firstAnalyzeDay = new Map<string, string>();

  const isBillable = (kind: string) =>
    kind === 'refine' || kind.startsWith('analyze');
  const isAnalyze = (kind: string) => kind.startsWith('analyze');

  for (const e of usageEvents) {
    const key = actorKey(e.userId, e.deviceId);
    const day = utcDayKey(e.createdAt);
    const in30 = e.createdAt >= last30;

    if (in30) {
      if (e.kind in mix30) {
        mix30[e.kind as keyof typeof mix30] += 1;
      } else {
        mix30.other += 1;
      }
    }

    if (isAnalyze(e.kind)) {
      if (in30) {
        if (e.userId) analyzeWithUser += 1;
        else analyzeGuestOnly += 1;
      }
      if (day === todayKey) actorsToday.add(key);
      if (day >= wauStartKey && day <= todayKey) actorsWau.add(key);

      const days = analyzeByActorDay.get(key) ?? new Set<string>();
      days.add(day);
      analyzeByActorDay.set(key, days);

      const prev = firstAnalyzeDay.get(key);
      if (!prev || day < prev) firstAnalyzeDay.set(key, day);
    }

    if (isBillable(e.kind)) {
      if (e.userId) {
        billableByUser.set(e.userId, (billableByUser.get(e.userId) ?? 0) + 1);
      }
      billableByDevice.set(
        e.deviceId,
        (billableByDevice.get(e.deviceId) ?? 0) + 1,
      );
    }
  }

  const guestIdSet = new Set(guestDeviceIds);
  let exhaustedUsers = 0;
  for (const [userId, used] of billableByUser) {
    if (activeSubIds.has(userId)) continue;
    if (used >= limitAuth) exhaustedUsers += 1;
  }
  let exhaustedGuests = 0;
  for (const [deviceId, used] of billableByDevice) {
    if (!guestIdSet.has(deviceId)) continue;
    if (used >= limitGuest) exhaustedGuests += 1;
  }

  const cohortStart = addUtcDays(todayKey, -30);
  const cohortEnd = addUtcDays(todayKey, -8);
  let cohortSize = 0;
  let d1Count = 0;
  let d7Count = 0;
  for (const [key, firstDay] of firstAnalyzeDay) {
    if (firstDay < cohortStart || firstDay > cohortEnd) continue;
    cohortSize += 1;
    const days = analyzeByActorDay.get(key) ?? new Set();
    if (days.has(addUtcDays(firstDay, 1))) d1Count += 1;
    if (days.has(addUtcDays(firstDay, 7))) d7Count += 1;
  }

  return {
    funnel: {
      guestsWithScans,
      users: usersTotal,
      payingUsers,
      userToPayRate: rate(payingUsers, usersTotal),
    },
    revenue: {
      last7DaysKopecks: revenue7,
      last30DaysKopecks: revenue30,
    },
    paymentsByStatus,
    promo: {
      confirmedCount: promoCount,
      confirmedSumKopecks: promoSum,
    },
    referral: { confirmedCount: referralCount },
    subscriptions: {
      active,
      expiringSoon7Days: expiringSoon,
      expiredOrInactive,
    },
    product: {
      dau: actorsToday.size,
      wau: actorsWau.size,
      usageMix30d: mix30,
      analyzeAuthShare30d: {
        withUser: analyzeWithUser,
        guestOnly: analyzeGuestOnly,
      },
      quotaExhausted: {
        users: exhaustedUsers,
        guests: exhaustedGuests,
        limitGuest,
        limitAuth,
      },
      retention: {
        cohortSize,
        d1Count,
        d7Count,
        d1Rate: rate(d1Count, cohortSize),
        d7Rate: rate(d7Count, cohortSize),
      },
    },
  };
}

type AnalyticsPrisma = Pick<
  PrismaClient,
  'payment' | 'user' | 'device' | 'usageEvent'
>;

export async function loadOverviewAnalytics(
  prisma: AnalyticsPrisma,
  input: {
    now: Date;
    guestsWithScans: number;
    usersTotal: number;
  },
): Promise<OverviewAnalytics> {
  const usageSince = new Date(
    input.now.getTime() - 90 * 24 * 60 * 60 * 1000,
  );

  const [payments, users, guestDevices, usageEvents, quota] =
    await Promise.all([
      prisma.payment.findMany({
        select: {
          userId: true,
          amount: true,
          status: true,
          promoCode: true,
          referralGrantedAt: true,
          paidAt: true,
          createdAt: true,
        },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
        },
      }),
      prisma.device.findMany({
        where: { userId: null },
        select: { id: true },
      }),
      prisma.usageEvent.findMany({
        where: { createdAt: { gte: usageSince } },
        select: {
          kind: true,
          userId: true,
          deviceId: true,
          createdAt: true,
        },
      }),
      getQuotaLimits(
        prisma as unknown as Parameters<typeof getQuotaLimits>[0],
      ),
    ]);

  return buildOverviewAnalytics({
    now: input.now,
    guestsWithScans: input.guestsWithScans,
    usersTotal: input.usersTotal,
    payments,
    users,
    usageEvents,
    guestDeviceIds: guestDevices.map((d) => d.id),
    limitGuest: quota.freeGenerationLimit,
    limitAuth: quota.freeGenerationLimit + quota.authLoginGenerationBonus,
  });
}
