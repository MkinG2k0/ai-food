export type AdminStatsSeriesResponse = {
  days: number;
  series: {
    users: Array<{ date: string; new: number; total: number }>;
    payments: Array<{ date: string; sumKopecks: number; totalKopecks: number }>;
    usage: Array<{ date: string; analyze: number; refine: number }>;
  };
};

export type BuildAdminStatsSeriesInput = {
  days: number;
  now: Date;
  userCreatedAts: Date[];
  payments: Array<{ amount: number; at: Date }>;
  usageEvents: Array<{ kind: string; at: Date }>;
};

export function clampSeriesDays(raw: unknown): number {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseInt(raw, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(7, Math.trunc(n)));
}

export function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcDayStart(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function addUtcDays(key: string, delta: number): string {
  const d = utcDayStart(key);
  d.setUTCDate(d.getUTCDate() + delta);
  return utcDayKey(d);
}

function enumerateUtcDays(now: Date, days: number): string[] {
  const end = utcDayKey(now);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(addUtcDays(end, -i));
  }
  return keys;
}

export function buildAdminStatsSeries(
  input: BuildAdminStatsSeriesInput,
): AdminStatsSeriesResponse {
  const days = input.days;
  const keys = enumerateUtcDays(input.now, days);
  const firstStart = utcDayStart(keys[0]!);

  const newByDay = new Map<string, number>();
  let totalBefore = 0;
  for (const at of input.userCreatedAts) {
    const key = utcDayKey(at);
    if (at < firstStart) {
      totalBefore += 1;
      continue;
    }
    if (!keys.includes(key)) continue;
    newByDay.set(key, (newByDay.get(key) ?? 0) + 1);
  }

  const sumByDay = new Map<string, number>();
  let payBefore = 0;
  for (const p of input.payments) {
    const key = utcDayKey(p.at);
    if (p.at < firstStart) {
      payBefore += p.amount;
      continue;
    }
    if (!keys.includes(key)) continue;
    sumByDay.set(key, (sumByDay.get(key) ?? 0) + p.amount);
  }

  const analyzeByDay = new Map<string, number>();
  const refineByDay = new Map<string, number>();
  for (const e of input.usageEvents) {
    const key = utcDayKey(e.at);
    if (!keys.includes(key)) continue;
    if (e.kind.startsWith('analyze')) {
      analyzeByDay.set(key, (analyzeByDay.get(key) ?? 0) + 1);
    } else if (e.kind === 'refine') {
      refineByDay.set(key, (refineByDay.get(key) ?? 0) + 1);
    }
  }

  let runningUsers = totalBefore;
  let runningPay = payBefore;
  const users = keys.map((date) => {
    const neu = newByDay.get(date) ?? 0;
    runningUsers += neu;
    return { date, new: neu, total: runningUsers };
  });
  const payments = keys.map((date) => {
    const sumKopecks = sumByDay.get(date) ?? 0;
    runningPay += sumKopecks;
    return { date, sumKopecks, totalKopecks: runningPay };
  });
  const usage = keys.map((date) => ({
    date,
    analyze: analyzeByDay.get(date) ?? 0,
    refine: refineByDay.get(date) ?? 0,
  }));

  return { days, series: { users, payments, usage } };
}
