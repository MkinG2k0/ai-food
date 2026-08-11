# Stats weight pace status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На карточке прогресса веса показывать чип «Отстаём на X.X кг» / «Впереди плана на X.X кг», когда факт отличается от идеального веса на сегодня на ≥ 0.5 кг (только lose/gain).

**Architecture:** Чистый `evaluateWeightPaceStatus` в `weightProgress.ts` поверх `idealWeightAtDate`. `WeightProgressCard` вызывает хелпер и рендерит чип + amber для строки остатка при behind.

**Tech Stack:** React, TypeScript, Vitest, FSD (`apps/ai-food`).

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-08-12-stats-weight-pace-status-design.md`

## Global Constraints

- Threshold: `PACE_STATUS_EPS_KG = 0.5`
- gain lag = ideal − current; lose lag = current − ideal; positive lag → behind
- Labels: `Отстаём на ${lagKg.toFixed(1)} кг` / `Впереди плана на ${lagKg.toFixed(1)} кг`
- maintain / reached / missing plan fields → `null`
- Chart unchanged; no store/backend changes
- Commits: PowerShell-safe `-m "..."`; stage only task files

## File map

| File | Role |
|------|------|
| `apps/ai-food/src/features/stats/model/weightProgress.ts` | `evaluateWeightPaceStatus` |
| `apps/ai-food/src/features/stats/model/weightProgress.test.ts` | unit tests |
| `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx` | chip + amber remaining line |

---

### Task 1: `evaluateWeightPaceStatus` + tests

**Files:**
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.ts`
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.test.ts`

- [x] **Step 1: Write failing tests**

```ts
describe('evaluateWeightPaceStatus', () => {
  const base = {
    planStartDate: '2026-08-01',
    planStartWeight: 70,
    targetWeightDate: '2026-08-31',
    goalKg: 80,
    todayYmd: '2026-08-16', // midpoint → ideal 75
    reached: false,
  };

  it('returns behind for gain when current is ≥0.5 below ideal', () => {
    const s = evaluateWeightPaceStatus({
      ...base,
      goal: 'gain',
      currentKg: 74.4,
    });
    expect(s).toEqual({
      kind: 'behind',
      lagKg: 0.6,
      label: 'Отстаём на 0.6 кг',
    });
  });

  it('returns ahead for gain when current is ≥0.5 above ideal', () => {
    const s = evaluateWeightPaceStatus({
      ...base,
      goal: 'gain',
      currentKg: 75.7,
    });
    expect(s).toEqual({
      kind: 'ahead',
      lagKg: 0.7,
      label: 'Впереди плана на 0.7 кг',
    });
  });

  it('returns null when within 0.5 kg', () => {
    expect(
      evaluateWeightPaceStatus({ ...base, goal: 'gain', currentKg: 75.2 }),
    ).toBeNull();
  });

  it('returns behind for lose when current above ideal', () => {
    const s = evaluateWeightPaceStatus({
      planStartDate: '2026-08-01',
      planStartWeight: 80,
      targetWeightDate: '2026-08-31',
      goalKg: 70,
      todayYmd: '2026-08-16', // ideal 75
      goal: 'lose',
      currentKg: 75.8,
      reached: false,
    });
    expect(s?.kind).toBe('behind');
    expect(s?.lagKg).toBe(0.8);
  });

  it('returns null for maintain, reached, or missing plan', () => {
    expect(
      evaluateWeightPaceStatus({
        ...base,
        goal: 'maintain',
        currentKg: 70,
      }),
    ).toBeNull();
    expect(
      evaluateWeightPaceStatus({
        ...base,
        goal: 'gain',
        currentKg: 74,
        reached: true,
      }),
    ).toBeNull();
    expect(
      evaluateWeightPaceStatus({
        goal: 'gain',
        currentKg: 70,
        goalKg: 80,
        reached: false,
        planStartDate: null,
        planStartWeight: 70,
        targetWeightDate: '2026-08-31',
      }),
    ).toBeNull();
  });
});
```

- [x] **Step 2: Run — expect FAIL**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

- [x] **Step 3: Implement**

```ts
export const PACE_STATUS_EPS_KG = 0.5;

export type WeightPaceStatus = {
  kind: 'behind' | 'ahead';
  lagKg: number;
  label: string;
};

export function evaluateWeightPaceStatus(input: {
  goal: Goal;
  currentKg: number;
  planStartDate?: string | null;
  planStartWeight?: number | null;
  targetWeightDate?: string | null;
  goalKg: number;
  todayYmd?: string;
  reached: boolean;
}): WeightPaceStatus | null {
  if (input.reached) return null;
  if (input.goal !== 'lose' && input.goal !== 'gain') return null;
  if (
    !input.planStartDate ||
    input.planStartWeight == null ||
    !input.targetWeightDate
  ) {
    return null;
  }
  const todayYmd = input.todayYmd ?? toLocalYmd(new Date());
  const idealKg = idealWeightAtDate({
    planStartDate: input.planStartDate,
    planStartWeight: input.planStartWeight,
    targetWeightDate: input.targetWeightDate,
    goalKg: input.goalKg,
    atYmd: todayYmd,
  });
  if (idealKg == null) return null;

  const signed =
    input.goal === 'gain'
      ? idealKg - input.currentKg
      : input.currentKg - idealKg;
  const abs = Math.round(Math.abs(signed) * 10) / 10;
  if (abs < PACE_STATUS_EPS_KG) return null;
  if (signed > 0) {
    return {
      kind: 'behind',
      lagKg: abs,
      label: `Отстаём на ${abs.toFixed(1)} кг`,
    };
  }
  return {
    kind: 'ahead',
    lagKg: abs,
    label: `Впереди плана на ${abs.toFixed(1)} кг`,
  };
}
```

- [x] **Step 4: Run — expect PASS**

- [x] **Step 5: Commit**

```powershell
git add apps/ai-food/src/features/stats/model/weightProgress.ts apps/ai-food/src/features/stats/model/weightProgress.test.ts
git commit -m "feat(stats): evaluate weight pace behind/ahead vs ideal"
```

---

### Task 2: Wire chip + remaining line on `WeightProgressCard`

**Files:**
- Modify: `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx`

- [x] **Step 1: Import + compute**

Import `evaluateWeightPaceStatus` (and `AlertTriangle` optional — prefer text-only chip like reached).

After `reached` / `progressLine`:

```ts
  const paceStatus = evaluateWeightPaceStatus({
    goal: profileGoal,
    currentKg,
    planStartDate: profilePlanStartDate,
    planStartWeight: profilePlanStartWeight,
    targetWeightDate: profileTargetWeightDate,
    goalKg: effectiveGoal,
    todayYmd,
    reached,
  });
```

- [x] **Step 2: Chip under title**

After the reached chip block, add:

```tsx
            {!reached && paceStatus && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  paceStatus.kind === 'behind'
                    ? 'bg-amber-500/15 text-amber-800'
                    : 'bg-primary/15 text-primary'
                }`}
              >
                {paceStatus.label}
              </span>
            )}
```

- [x] **Step 3: Remaining line color**

```tsx
        <p
          className={`mt-3 text-sm ${
            reached
              ? 'font-medium text-primary'
              : paceStatus?.kind === 'behind'
                ? 'text-amber-800'
                : 'text-muted-foreground'
          }`}
        >
          {progressLine}
        </p>
```

- [x] **Step 4: Type-check + tests**

```bash
cd apps/ai-food && pnpm exec tsc --noEmit
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

- [x] **Step 5: Commit**

```powershell
git add apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx
git commit -m "feat(stats): show behind/ahead pace chip on weight card"
```

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| fact vs ideal, ≥0.5 kg | 1 |
| lose/gain only; maintain/legacy/reached null | 1 |
| Copy with kg | 1 |
| Chip + amber remaining | 2 |
| Chart untouched | — |
