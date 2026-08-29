import type { OpenRouterActivityItem } from './openrouterAdminTypes.js';

const EPS = 1e-9;

/** Snaps binary float noise so USD runway math matches test expectations. */
function normalizeUsd(n: number): number {
  return Math.round(n * 1e10) / 1e10;
}

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoKey(now: Date, days: number): string {
  const t = new Date(now);
  t.setUTCDate(t.getUTCDate() - days);
  return utcDayKey(t);
}

/** UTC calendar days in [startKey, endExclusiveKey). */
function enumerateUtcDaysHalfOpen(
  startKey: string,
  endExclusiveKey: string,
): string[] {
  const days: string[] = [];
  const cursor = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endExclusiveKey}T00:00:00.000Z`);
  while (cursor < end) {
    days.push(utcDayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Last N completed UTC days: [todayUTC - N days, todayUTC). */
export function utcCompletedDaysWindow(
  now: Date,
  days: number,
): { start: Date; end: Date } {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { start, end };
}

export function buildSpendFromActivity(
  items: OpenRouterActivityItem[],
  now: Date,
  usdRub: number | null,
) {
  const today = utcDayKey(now);
  const start7 = daysAgoKey(now, 7);
  const start30 = daysAgoKey(now, 30);

  let last7DaysUsd = 0;
  let last30DaysUsd = 0;
  let requests30d = 0;
  let promptTokens30d = 0;
  let completionTokens30d = 0;
  let reasoningTokens30d = 0;

  const dailyMap = new Map<
    string,
    {
      usageUsd: number;
      requests: number;
      promptTokens: number;
      completionTokens: number;
    }
  >();
  const modelMap = new Map<
    string,
    { usageUsd: number; requests: number }
  >();

  for (const item of items) {
    const in7d = item.date >= start7 && item.date < today;
    const in30d = item.date >= start30 && item.date < today;

    if (in7d) {
      last7DaysUsd += item.usage;
    }
    if (in30d) {
      last30DaysUsd += item.usage;
      requests30d += item.requests;
      promptTokens30d += item.prompt_tokens;
      completionTokens30d += item.completion_tokens;
      reasoningTokens30d += item.reasoning_tokens;

      const modelEntry = modelMap.get(item.model) ?? {
        usageUsd: 0,
        requests: 0,
      };
      modelEntry.usageUsd += item.usage;
      modelEntry.requests += item.requests;
      modelMap.set(item.model, modelEntry);
    }

    if (in30d) {
      const dayEntry = dailyMap.get(item.date) ?? {
        usageUsd: 0,
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
      };
      dayEntry.usageUsd += item.usage;
      dayEntry.requests += item.requests;
      dayEntry.promptTokens += item.prompt_tokens;
      dayEntry.completionTokens += item.completion_tokens;
      dailyMap.set(item.date, dayEntry);
    }
  }

  const seriesDaily = enumerateUtcDaysHalfOpen(start30, today).map((date) => {
    const entry = dailyMap.get(date);
    return {
      date,
      usageUsd: entry?.usageUsd ?? 0,
      requests: entry?.requests ?? 0,
      promptTokens: entry?.promptTokens ?? 0,
      completionTokens: entry?.completionTokens ?? 0,
    };
  });

  const byModel = [...modelMap.entries()]
    .map(([model, stats]) => ({
      model,
      usageUsd: stats.usageUsd,
      requests: stats.requests,
      share: last30DaysUsd > 0 ? stats.usageUsd / last30DaysUsd : 0,
    }))
    .sort((a, b) => b.usageUsd - a.usageUsd)
    .slice(0, 10);

  return {
    spend: {
      last7DaysUsd,
      last30DaysUsd,
      last7DaysRub: usdRub == null ? null : last7DaysUsd * usdRub,
      last30DaysRub: usdRub == null ? null : last30DaysUsd * usdRub,
      requests30d,
      promptTokens30d,
      completionTokens30d,
      reasoningTokens30d,
    },
    seriesDaily,
    byModel,
  };
}

export function buildAvgCostPerGeneration(
  spend30dUsd: number | null,
  generations30d: number,
  usdRub: number | null,
) {
  if (spend30dUsd == null || generations30d <= 0) {
    return { usd: null, rub: null, generations30d };
  }
  const usd = spend30dUsd / generations30d;
  return {
    usd,
    rub: usdRub == null ? null : usd * usdRub,
    generations30d,
  };
}

export type RunwayResult = {
  avgDailySpendUsd: number | null;
  daysLeft: number | null;
  monthsLeft: number | null;
  basedOn: '7d' | '30d' | null;
};

export function buildRunway(
  available: number | null,
  last7DaysUsd: number | null,
  last30DaysUsd: number | null,
): RunwayResult {
  if (
    available == null ||
    last7DaysUsd == null ||
    last30DaysUsd == null
  ) {
    return {
      avgDailySpendUsd: null,
      daysLeft: null,
      monthsLeft: null,
      basedOn: null,
    };
  }
  let avg = last7DaysUsd / 7;
  let basedOn: '7d' | '30d' | null = '7d';
  if (avg < EPS) {
    avg = last30DaysUsd / 30;
    basedOn = '30d';
  }
  if (avg < EPS) {
    return {
      avgDailySpendUsd: 0,
      daysLeft: null,
      monthsLeft: null,
      basedOn: null,
    };
  }
  const daysLeft = normalizeUsd(available / avg);
  return {
    avgDailySpendUsd: normalizeUsd(avg),
    daysLeft,
    monthsLeft: daysLeft / 30,
    basedOn,
  };
}
