### Task 1: Pure series builder + unit tests

**Files:**
- Create: `apps/ai-app/src/lib/adminStatsSeries.ts`
- Create: `apps/ai-app/src/lib/adminStatsSeries.test.ts`

**Interfaces:**
- Consumes: none (pure)
- Produces:
  - `clampSeriesDays(raw: unknown): number` — default 30, clamp 7–90
  - `utcDayKey(d: Date): string` — `YYYY-MM-DD` UTC
  - `buildAdminStatsSeries(input: BuildAdminStatsSeriesInput): AdminStatsSeriesResponse`

```ts
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
```

- [ ] **Step 1: Write failing unit tests**

Create `apps/ai-app/src/lib/adminStatsSeries.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildAdminStatsSeries,
  clampSeriesDays,
  utcDayKey,
} from './adminStatsSeries.js';

describe('clampSeriesDays', () => {
  it('defaults to 30', () => {
    expect(clampSeriesDays(undefined)).toBe(30);
    expect(clampSeriesDays('')).toBe(30);
    expect(clampSeriesDays('nope')).toBe(30);
  });

  it('clamps to 7..90', () => {
    expect(clampSeriesDays(3)).toBe(7);
    expect(clampSeriesDays(7)).toBe(7);
    expect(clampSeriesDays(30)).toBe(30);
    expect(clampSeriesDays(90)).toBe(90);
    expect(clampSeriesDays(100)).toBe(90);
    expect(clampSeriesDays('45')).toBe(45);
  });
});

describe('buildAdminStatsSeries', () => {
  // Fixed "now": 2026-08-07T12:00:00.000Z → last day key 2026-08-07
  const now = new Date('2026-08-07T12:00:00.000Z');

  it('returns days-length arrays with UTC keys ending at today', () => {
    const result = buildAdminStatsSeries({
      days: 7,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [],
    });
    expect(result.days).toBe(7);
    expect(result.series.users).toHaveLength(7);
    expect(result.series.users[6]?.date).toBe('2026-08-07');
    expect(result.series.users[0]?.date).toBe('2026-08-01');
    expect(result.series.users.every((p) => p.new === 0 && p.total === 0)).toBe(
      true,
    );
  });

  it('counts new users and absolute cumulative totals', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [
        new Date('2026-07-01T00:00:00.000Z'), // before window → total base
        new Date('2026-08-05T10:00:00.000Z'),
        new Date('2026-08-07T01:00:00.000Z'),
        new Date('2026-08-07T23:00:00.000Z'),
      ],
      payments: [],
      usageEvents: [],
    });
    // days: 08-05, 08-06, 08-07
    expect(result.series.users).toEqual([
      { date: '2026-08-05', new: 1, total: 2 },
      { date: '2026-08-06', new: 0, total: 2 },
      { date: '2026-08-07', new: 2, total: 4 },
    ]);
  });

  it('sums confirmed payment day amounts and absolute cumulative', () => {
    const result = buildAdminStatsSeries({
      days: 3,
      now,
      userCreatedAts: [],
      payments: [
        { amount: 1000, at: new Date('2026-07-01T00:00:00.000Z') },
        { amount: 500, at: new Date('2026-08-06T12:00:00.000Z') },
        { amount: 200, at: new Date('2026-08-07T12:00:00.000Z') },
      ],
      usageEvents: [],
    });
    expect(result.series.payments).toEqual([
      { date: '2026-08-05', sumKopecks: 0, totalKopecks: 1000 },
      { date: '2026-08-06', sumKopecks: 500, totalKopecks: 1500 },
      { date: '2026-08-07', sumKopecks: 200, totalKopecks: 1700 },
    ]);
  });

  it('buckets analyze* and refine usage separately', () => {
    const result = buildAdminStatsSeries({
      days: 2,
      now,
      userCreatedAts: [],
      payments: [],
      usageEvents: [
        { kind: 'analyze_photo', at: new Date('2026-08-06T01:00:00.000Z') },
        { kind: 'analyze', at: new Date('2026-08-07T01:00:00.000Z') },
        { kind: 'refine', at: new Date('2026-08-07T02:00:00.000Z') },
        { kind: 'manual', at: new Date('2026-08-07T03:00:00.000Z') },
      ],
    });
    expect(result.series.usage).toEqual([
      { date: '2026-08-06', analyze: 1, refine: 0 },
      { date: '2026-08-07', analyze: 1, refine: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/adminStatsSeries.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement `adminStatsSeries.ts`**

Create `apps/ai-app/src/lib/adminStatsSeries.ts`:

```ts
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
  const days = clampSeriesDays(input.days);
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm --filter openrouter-gateway exec vitest run src/lib/adminStatsSeries.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-app/src/lib/adminStatsSeries.ts apps/ai-app/src/lib/adminStatsSeries.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): add pure stats series day-bucket builder

EOF
)"
```

---

