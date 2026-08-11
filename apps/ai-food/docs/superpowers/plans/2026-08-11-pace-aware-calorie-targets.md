# Pace-aware calorie targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дневная норма ккал на онбординге считается из разницы веса и срока до даты (7000 ккал/кг), с безопасным клипом (−500…+300) и предупреждением в UI при нереальном темпе.

**Architecture:** Чистый хелпер `evaluateWeightPace` + обновлённый `calculateTargets` → `{ targets, pace }`. Live-баннер в `StepTargetWeight`, короткое предупреждение в `OnboardingResult`. Persist store без изменений (только `DailyTargets`).

**Tech Stack:** TypeScript, Vitest, React, существующий FSD onboarding в `apps/ai-food`.

## Global Constraints

- Рабочий корень пакета: `apps/ai-food` (пути ниже от него, если не указано иное)
- Spec: `docs/superpowers/specs/2026-08-11-pace-aware-calorie-targets-design.md`
- ккал/кг = **7000**; клип = **−500…+300**; `|deltaKg| < 0.5` → delta 0
- `kcal = max(round(TDEE) + clampedDelta, round(BMR))`
- `GOAL_DELTA` / `goal` enum **не** двигают ккал
- `pace` не персистить в `useProfileStore`
- Настройки / DailyHeader — без автопересчёта
- Тесты: `pnpm --filter ai-food test` или из `apps/ai-food`: `pnpm test -- <file>`
- 2 spaces, single quotes, semicolons; FSD barrels для cross-slice

---

## File Map

**Create:**
- `src/features/onboarding/model/evaluateWeightPace.ts` — days, raw/clamped delta, types
- `src/features/onboarding/model/evaluateWeightPace.test.ts`
- `src/features/onboarding/model/paceWarningCopy.ts` — общий текст баннера

**Modify:**
- `src/features/onboarding/model/calculateTargets.ts` — pace-aware kcal; return `{ targets, pace }`
- `src/features/onboarding/model/calculateTargets.test.ts` — новые кейсы + `now` для детерминизма
- `src/features/onboarding/model/useOnboarding.ts` — брать `.targets`
- `src/features/onboarding/ui/OnboardingPage.tsx` — передавать targets + pace
- `src/features/onboarding/ui/steps/StepTargetWeight.tsx` — live warning
- `src/features/onboarding/ui/OnboardingResult.tsx` — warning под ккал
- `src/features/onboarding/index.ts` — реэкспорт при необходимости (evaluateWeightPace / copy — только внутри slice, barrel не обязателен)

---

### Task 1: `evaluateWeightPace` (TDD)

**Files:**
- Create: `src/features/onboarding/model/evaluateWeightPace.ts`
- Create: `src/features/onboarding/model/evaluateWeightPace.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PaceWarning = {
    rawDeltaKcal: number;
    clampedDeltaKcal: number;
    clamped: boolean;
  };

  export type WeightPaceResult = PaceWarning & {
    deltaKg: number;
    days: number;
  };

  export function evaluateWeightPace(input: {
    weight: number;
    targetWeight: number;
    targetWeightDate: string; // YYYY-MM-DD
    now?: Date;
  }): WeightPaceResult;
  ```
- Consumes: none

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateWeightPace } from './evaluateWeightPace';

describe('evaluateWeightPace', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0, 0); // 2026-08-12 local

  it('returns delta 0 when |deltaKg| < 0.5', () => {
    const r = evaluateWeightPace({
      weight: 75,
      targetWeight: 75.4,
      targetWeightDate: '2026-11-01',
      now,
    });
    expect(r.deltaKg).toBeCloseTo(0.4);
    expect(r.rawDeltaKcal).toBe(0);
    expect(r.clampedDeltaKcal).toBe(0);
    expect(r.clamped).toBe(false);
  });

  it('moderate loss over ~90 days stays inside clamp', () => {
    // 2026-08-12 → 2026-11-10 = 90 days; -5kg → round(-5*7000/90)= -389
    const r = evaluateWeightPace({
      weight: 80,
      targetWeight: 75,
      targetWeightDate: '2026-11-10',
      now,
    });
    expect(r.days).toBe(90);
    expect(r.rawDeltaKcal).toBe(-389);
    expect(r.clampedDeltaKcal).toBe(-389);
    expect(r.clamped).toBe(false);
  });

  it('clamps +10 kg in 1 day to +300', () => {
    const r = evaluateWeightPace({
      weight: 70,
      targetWeight: 80,
      targetWeightDate: '2026-08-13',
      now,
    });
    expect(r.days).toBe(1);
    expect(r.rawDeltaKcal).toBe(70000);
    expect(r.clampedDeltaKcal).toBe(300);
    expect(r.clamped).toBe(true);
  });

  it('clamps aggressive loss to -500', () => {
    const r = evaluateWeightPace({
      weight: 90,
      targetWeight: 70,
      targetWeightDate: '2026-08-13',
      now,
    });
    expect(r.rawDeltaKcal).toBe(-140000);
    expect(r.clampedDeltaKcal).toBe(-500);
    expect(r.clamped).toBe(true);
  });

  it('uses at least 1 day even if date parses oddly', () => {
    const r = evaluateWeightPace({
      weight: 70,
      targetWeight: 71,
      targetWeightDate: '2026-08-12', // same calendar day as now
      now,
    });
    expect(r.days).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- src/features/onboarding/model/evaluateWeightPace.test.ts`  
(from `apps/ai-food`)  
Expected: FAIL — module not found / function not defined

- [ ] **Step 3: Implement**

```ts
export type PaceWarning = {
  rawDeltaKcal: number;
  clampedDeltaKcal: number;
  clamped: boolean;
};

export type WeightPaceResult = PaceWarning & {
  deltaKg: number;
  days: number;
};

const KCAL_PER_KG = 7000;
const DELTA_MIN = -500;
const DELTA_MAX = 300;
const NEAR_ZERO_KG = 0.5;

function parseLocalDateYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

/** Whole calendar days from local start of `now` day to target date (noon-safe). */
export function calendarDaysUntil(
  targetWeightDate: string,
  now: Date = new Date(),
): number {
  const target = parseLocalDateYmd(targetWeightDate);
  if (!target) return 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function evaluateWeightPace(input: {
  weight: number;
  targetWeight: number;
  targetWeightDate: string;
  now?: Date;
}): WeightPaceResult {
  const now = input.now ?? new Date();
  const deltaKg = input.targetWeight - input.weight;
  const days = calendarDaysUntil(input.targetWeightDate, now);

  const rawDeltaKcal =
    Math.abs(deltaKg) < NEAR_ZERO_KG
      ? 0
      : Math.round((deltaKg * KCAL_PER_KG) / days);

  const clampedDeltaKcal = clamp(rawDeltaKcal, DELTA_MIN, DELTA_MAX);

  return {
    deltaKg,
    days,
    rawDeltaKcal,
    clampedDeltaKcal,
    clamped: clampedDeltaKcal !== rawDeltaKcal,
  };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `pnpm test -- src/features/onboarding/model/evaluateWeightPace.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/onboarding/model/evaluateWeightPace.ts apps/ai-food/src/features/onboarding/model/evaluateWeightPace.test.ts
git commit -m "feat(onboarding): add evaluateWeightPace for safe calorie pace"
```

---

### Task 2: Pace-aware `calculateTargets` (TDD)

**Files:**
- Modify: `src/features/onboarding/model/calculateTargets.ts`
- Modify: `src/features/onboarding/model/calculateTargets.test.ts`
- Modify: `src/features/onboarding/model/useOnboarding.ts`

**Interfaces:**
- Consumes: `evaluateWeightPace` from Task 1
- Produces:
  ```ts
  export type CalculateTargetsResult = {
    targets: DailyTargets;
    pace: PaceWarning;
  };

  export function calculateTargets(
    profile: UserProfile,
    options?: { now?: Date },
  ): CalculateTargetsResult;
  ```

- [ ] **Step 1: Rewrite tests for new return shape + pace cases**

Replace `calculateTargets.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { calculateTargets } from './calculateTargets';
import type { UserProfile } from '@ai-food/shared-types';

const now = new Date(2026, 7, 12, 12, 0, 0, 0);

function baseMale(over: Partial<UserProfile> = {}): UserProfile {
  return {
    gender: 'male',
    age: 30,
    height: 175,
    weight: 75,
    targetWeight: 75,
    targetWeightDate: '2026-11-10',
    activity: 'medium',
    goal: 'maintain',
    dietType: 'none',
    ...over,
  };
}

describe('calculateTargets', () => {
  it('kcal equals round(TDEE) when weight nearly unchanged', () => {
    const { targets, pace } = calculateTargets(baseMale(), { now });
    // BMR = 1698.75; TDEE = 2633.0625 → 2633
    expect(targets.kcal).toBe(2633);
    expect(pace.clampedDeltaKcal).toBe(0);
    expect(pace.clamped).toBe(false);
  });

  it('applies moderate loss delta from weight/date (not GOAL_DELTA)', () => {
    // female low: BMR 1345.25; TDEE 1614.3 → 1614
    // -5kg / 90d → -389
    const { targets, pace } = calculateTargets(
      {
        gender: 'female',
        age: 25,
        height: 165,
        weight: 60,
        targetWeight: 55,
        targetWeightDate: '2026-11-10',
        activity: 'low',
        goal: 'lose',
        dietType: 'none',
      },
      { now },
    );
    expect(pace.rawDeltaKcal).toBe(-389);
    expect(pace.clamped).toBe(false);
    expect(targets.kcal).toBe(1614 - 389);
  });

  it('clamps +10kg tomorrow to +300 and sets pace.clamped', () => {
    const { targets, pace } = calculateTargets(
      baseMale({
        weight: 70,
        targetWeight: 80,
        targetWeightDate: '2026-08-13',
        goal: 'gain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    // BMR male 25/180/70: 10*70+6.25*180-5*25+5 = 700+1125-125+5 = 1705
    // TDEE low 1705*1.2 = 2046
    expect(pace.rawDeltaKcal).toBe(70000);
    expect(pace.clampedDeltaKcal).toBe(300);
    expect(pace.clamped).toBe(true);
    expect(targets.kcal).toBe(2046 + 300);
  });

  it('never goes below round(BMR)', () => {
    const profile = baseMale({
      activity: 'low',
      weight: 90,
      targetWeight: 60,
      targetWeightDate: '2026-08-13',
      goal: 'lose',
    });
    const { targets } = calculateTargets(profile, { now });
    // BMR male 30/175/90 = 10*90+6.25*175-5*30+5 = 900+1093.75-150+5 = 1848.75 → 1849
    expect(targets.kcal).toBeGreaterThanOrEqual(1849);
  });

  it('ignores goal enum when deltaKg drives surplus', () => {
    const maintainLabeled = calculateTargets(
      baseMale({
        weight: 80,
        targetWeight: 85,
        targetWeightDate: '2026-11-10',
        goal: 'maintain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    const gainLabeled = calculateTargets(
      baseMale({
        weight: 80,
        targetWeight: 85,
        targetWeightDate: '2026-11-10',
        goal: 'gain',
        activity: 'low',
        age: 25,
        height: 180,
      }),
      { now },
    );
    expect(maintainLabeled.targets.kcal).toBe(gainLabeled.targets.kcal);
  });

  it('calculates protein as weight * 1.8 rounded', () => {
    const { targets } = calculateTargets(baseMale(), { now });
    expect(targets.protein).toBe(Math.round(75 * 1.8));
  });

  it('all macros are integers and fiber is 30', () => {
    const { targets } = calculateTargets(
      baseMale({
        gender: 'female',
        age: 35,
        height: 160,
        weight: 65,
        targetWeight: 65,
        activity: 'high',
      }),
      { now },
    );
    expect(Number.isInteger(targets.kcal)).toBe(true);
    expect(Number.isInteger(targets.protein)).toBe(true);
    expect(Number.isInteger(targets.fat)).toBe(true);
    expect(Number.isInteger(targets.carbs)).toBe(true);
    expect(targets.fiber).toBe(30);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm test -- src/features/onboarding/model/calculateTargets.test.ts`  
Expected: FAIL — still returns flat `DailyTargets` / old GOAL_DELTA behavior

- [ ] **Step 3: Implement `calculateTargets`**

```ts
import type { UserProfile, DailyTargets, ActivityLevel } from '@ai-food/shared-types';
import {
  evaluateWeightPace,
  type PaceWarning,
} from './evaluateWeightPace';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

export type CalculateTargetsResult = {
  targets: DailyTargets;
  pace: PaceWarning;
};

export function calculateTargets(
  profile: UserProfile,
  options?: { now?: Date },
): CalculateTargetsResult {
  const { gender, age, height, weight, activity } = profile;

  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity];
  const pace = evaluateWeightPace({
    weight: profile.weight,
    targetWeight: profile.targetWeight,
    targetWeightDate: profile.targetWeightDate,
    now: options?.now,
  });

  const kcal = Math.max(
    Math.round(tdee) + pace.clampedDeltaKcal,
    Math.round(bmr),
  );
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  return {
    targets: { kcal, protein, fat, carbs, fiber: 30 },
    pace: {
      rawDeltaKcal: pace.rawDeltaKcal,
      clampedDeltaKcal: pace.clampedDeltaKcal,
      clamped: pace.clamped,
    },
  };
}
```

Remove `GOAL_DELTA` and unused `Goal` import entirely.

- [ ] **Step 4: Fix call site in `useOnboarding.ts`**

In `completeWithProfile`:

```ts
const { targets } = calculateTargets(profile);
setProfile(profile, targets);
```

- [ ] **Step 5: Run unit tests**

Run:
```
pnpm test -- src/features/onboarding/model/calculateTargets.test.ts src/features/onboarding/model/useOnboarding.test.ts src/features/onboarding/model/evaluateWeightPace.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/features/onboarding/model/calculateTargets.ts apps/ai-food/src/features/onboarding/model/calculateTargets.test.ts apps/ai-food/src/features/onboarding/model/useOnboarding.ts
git commit -m "feat(onboarding): derive calorie target from weight pace with safe clamp"
```

---

### Task 3: Warning copy + UI (`StepTargetWeight`, `OnboardingResult`, `OnboardingPage`)

**Files:**
- Create: `src/features/onboarding/model/paceWarningCopy.ts`
- Modify: `src/features/onboarding/ui/steps/StepTargetWeight.tsx`
- Modify: `src/features/onboarding/ui/OnboardingResult.tsx`
- Modify: `src/features/onboarding/ui/OnboardingPage.tsx`

**Interfaces:**
- Consumes: `evaluateWeightPace`, `calculateTargets` → `{ targets, pace }`, `PACE_WARNING_*` strings
- Produces: UI warnings when `pace.clamped`

- [ ] **Step 1: Add shared copy**

`src/features/onboarding/model/paceWarningCopy.ts`:

```ts
export const PACE_WARNING_STEP =
  'За выбранный срок такой темп небезопасен или нереален. Считаем безопасную поправку к калориям (−500…+300 ккал/день).';

export const PACE_WARNING_RESULT =
  'Срок до цели слишком жёсткий — норма ограничена безопасным темпом (−500…+300 ккал/день).';
```

- [ ] **Step 2: Live banner in `StepTargetWeight`**

Import `evaluateWeightPace` and `PACE_WARNING_STEP`. After date validity is known, compute:

```ts
const pace =
  dateValid && parsedDate
    ? evaluateWeightPace({
        weight: currentWeight,
        targetWeight: value,
        targetWeightDate,
      })
    : null;
```

Render above the button when `pace?.clamped`:

```tsx
{pace?.clamped && (
  <p
    role="status"
    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-sm text-foreground"
  >
    {PACE_WARNING_STEP}
  </p>
)}
```

Do **not** disable «Далее» because of clamp (only existing `dateValid` rule).

- [ ] **Step 3: Wire `OnboardingPage` + `OnboardingResult`**

`OnboardingPage.tsx`:

```ts
const result = isResult ? calculateTargets(draft as UserProfile) : null;
// ...
{isResult && result && (
  <OnboardingResult
    targets={result.targets}
    paceClamped={result.pace.clamped}
    onStart={finish}
  />
)}
```

`OnboardingResult.tsx` — extend props:

```ts
interface OnboardingResultProps {
  targets: DailyTargets;
  paceClamped?: boolean;
  onStart: () => void;
}
```

Under the «ккал в день» line:

```tsx
{paceClamped && (
  <p role="status" className="mt-2 max-w-sm text-sm text-muted-foreground">
    {PACE_WARNING_RESULT}
  </p>
)}
```

- [ ] **Step 4: Type-check + focused tests**

Run:
```
pnpm type-check
pnpm test -- src/features/onboarding/model/
```
Expected: type-check clean; model tests PASS.  
If `OnboardingPage.test.tsx` breaks on `calculateTargets` shape, update mocks/assertions to `.targets`.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/onboarding/model/paceWarningCopy.ts apps/ai-food/src/features/onboarding/ui/steps/StepTargetWeight.tsx apps/ai-food/src/features/onboarding/ui/OnboardingResult.tsx apps/ai-food/src/features/onboarding/ui/OnboardingPage.tsx apps/ai-food/src/features/onboarding/ui/OnboardingPage.test.tsx
git commit -m "feat(onboarding): show pace clamp warning on target weight and result"
```

---

### Task 4: Manual smoke checklist (no code)

**Files:** none

- [ ] **Step 1: Manual verification**

From app onboarding (or story-like clickthrough):

1. Цель ≈ текущий вес, дата через 90 дней → нет баннера; ккал ≈ TDEE.
2. −5 кг / ~90 дней → нет баннера; ккал ≈ TDEE − ~389.
3. +10 кг / завтра → баннер на шаге 7 и на результате; ккал ≈ TDEE + 300.
4. Finish → `useProfileStore.targets.kcal` совпадает с экраном результата; DailyHeader читает то же значение.

- [ ] **Step 2: Final commit only if Step 1 found fixes**; otherwise done.

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| 7000 ккал/кг | 1 |
| Клип −500…+300 | 1 |
| \|deltaKg\| < 0.5 → 0 | 1 |
| Пол ≥ round(BMR) | 2 |
| Знак из deltaKg, не GOAL_DELTA | 2 |
| +10 кг завтра → +300 + warning | 1–3 |
| Live banner StepTargetWeight | 3 |
| Warning OnboardingResult | 3 |
| Store only DailyTargets | 2 (`useOnboarding` saves `.targets`) |
| No settings auto-recalc | — non-goal, untouched |
| Tests listed in spec | 1–2 |

## Self-review notes

- Нет TBD/placeholder steps.
- Сигнатуры `PaceWarning` / `CalculateTargetsResult` согласованы между Task 1–3.
- Тесты фиксируют `now = 2026-08-12`, чтобы `days` не плавали.
- `goal` остаётся в профиле, но не влияет на kcal (явный тест в Task 2).
