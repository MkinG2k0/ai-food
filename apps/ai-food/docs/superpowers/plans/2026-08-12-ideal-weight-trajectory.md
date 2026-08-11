# Ideal weight trajectory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist onboarding plan start (date + weight), sync it, and show a scrollable 30-day weight chart with a dashed ideal trajectory in a distinct color next to actual logs.

**Architecture:** Snapshot `planStartDate` / `planStartWeight` on onboarding `finish`/`skip`, sync via nutrition profile. Pure helpers in `weightProgress.ts` build calendar-axis ideal segments clipped to a 30-day viewport. `WeightTrendChart` switches from index-based X to date-based X, adds pan, legend, and ideal stroke.

**Tech Stack:** React, TypeScript, Vitest, Zustand profile store, Zod (gateway), custom SVG chart.

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-08-12-ideal-weight-trajectory-design.md`

## Global Constraints

- Ideal line: linear `kg(t) = start + (goal − start) × (t − t0) / max(1, days)`
- Fact stroke stays `hsl(160 84% 39%)` solid; plan stroke distinct slate/blue **dashed**
- Viewport = **30 calendar days** inclusive; default right edge = today
- Horizontal pan only; do not break page vertical scroll (horizontal-dominant gesture)
- Legacy without `planStartDate`/`planStartWeight`: no ideal line
- Do not reset plan start on «Обновить цель»
- Horizontal goal dashed line remains
- Legend: «Факт» / «План»
- Subtitle shows visible window date range (not fixed «Последние 30 дней»)
- Commits: PowerShell-safe `-m "..."` messages; stage only task files

## File map

| File | Role |
|------|------|
| `apps/ai-food/src/shared/types/index.ts` | optional `planStartDate?`, `planStartWeight?` |
| `apps/ai-food/src/features/onboarding/model/defaultProfile.ts` | set plan start on defaults |
| `apps/ai-food/src/features/onboarding/model/useOnboarding.ts` | snapshot on finish/skip path |
| fixtures/tests touching `UserProfile` | add optional fields where required |
| `apps/ai-food/src/features/auth/model/nutritionProfile.ts` (+ test) | parse optional plan start |
| `apps/ai-app/src/lib/nutritionProfile.ts` | zod optional fields |
| `apps/ai-food/src/features/stats/model/weightProgress.ts` (+ test) | date helpers, ideal clip, viewport |
| `apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx` | calendar X, ideal, pan, legend |
| `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx` | pass plan props + viewport wiring |
| `apps/ai-food/src/pages/stats/ui/StatsPage.tsx` | pass planStart* from profile |

---

### Task 1: Profile fields + onboarding snapshot

**Files:**
- Modify: `apps/ai-food/src/shared/types/index.ts`
- Modify: `apps/ai-food/src/features/onboarding/model/defaultProfile.ts`
- Modify: `apps/ai-food/src/features/onboarding/model/useOnboarding.ts`
- Modify: `apps/ai-food/src/features/onboarding/model/useOnboarding.test.ts` (and any fixtures that must compile)

**Interfaces:**
- Produces: `UserProfile.planStartDate?: string`, `UserProfile.planStartWeight?: number`
- Produces: `todayLocalYmd(now?: Date): string` can live in `defaultProfile.ts` or inline in finish

- [ ] **Step 1: Add optional fields to `UserProfile`**

```ts
  /** Onboarding plan start day (YYYY-MM-DD); snapshot at finish */
  planStartDate?: string;
  /** Weight (kg) at onboarding finish — ideal trajectory start */
  planStartWeight?: number;
```

- [ ] **Step 2: Helper + `createDefaultProfile`**

In `defaultProfile.ts`:

```ts
export function todayLocalYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

In `createDefaultProfile`, after weight/target fields:

```ts
    planStartDate: todayLocalYmd(),
    planStartWeight: 70,
```

(`70` matches default `weight`.)

- [ ] **Step 3: Snapshot in `completeWithProfile`**

Before `setProfile`, ensure plan start is set if missing (covers finish draft + skip already having defaults):

```ts
  async function completeWithProfile(profile: UserProfile) {
    const withPlanStart: UserProfile = {
      ...profile,
      planStartDate: profile.planStartDate ?? todayLocalYmd(),
      planStartWeight: profile.planStartWeight ?? profile.weight,
    };
    const { targets } = calculateTargets(withPlanStart);
    setProfile(withPlanStart, targets);
    // ... rest unchanged using withPlanStart for micronutrients
```

Import `todayLocalYmd` from `./defaultProfile`.

- [ ] **Step 4: Update `useOnboarding.test.ts`**

Assert `setProfile` receives `planStartDate` matching `/^\d{4}-\d{2}-\d{2}$/` and `planStartWeight` equal to draft weight on finish happy path. Fix any type errors in other onboarding fixtures only if `tsc`/tests fail (optional fields should not break existing objects).

- [ ] **Step 5: Run tests**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/onboarding/model/useOnboarding.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/ai-food/src/shared/types/index.ts apps/ai-food/src/features/onboarding/model/defaultProfile.ts apps/ai-food/src/features/onboarding/model/useOnboarding.ts apps/ai-food/src/features/onboarding/model/useOnboarding.test.ts
git commit -m "feat(onboarding): snapshot plan start date and weight"
```

(Include any other fixture files you had to touch for compile.)

---

### Task 2: Nutrition profile sync (client + gateway)

**Files:**
- Modify: `apps/ai-food/src/features/auth/model/nutritionProfile.ts`
- Modify: `apps/ai-food/src/features/auth/model/nutritionProfile.test.ts`
- Modify: `apps/ai-app/src/lib/nutritionProfile.ts`
- Update auth test fixtures that build full profiles if zod/parse requires (optional fields — usually no)

**Interfaces:**
- Consumes: optional plan start fields
- Produces: parse preserves `planStartDate`/`planStartWeight` when valid; omits when absent

- [ ] **Step 1: Extend auth `UserProfile` type + parse**

In `nutritionProfile.ts` type and `parseUserProfile` return:

```ts
  planStartDate?: string;
  planStartWeight?: number;
```

After building the base object, if present and valid:

```ts
  if (isNonEmptyString(v.planStartDate) && /^\d{4}-\d{2}-\d{2}$/.test(v.planStartDate)) {
    base.planStartDate = v.planStartDate;
  }
  if (isPositiveNumber(v.planStartWeight)) {
    base.planStartWeight = v.planStartWeight;
  }
```

Do **not** fail parse if missing (legacy).

- [ ] **Step 2: Gateway zod**

In `apps/ai-app/src/lib/nutritionProfile.ts` `profileSchema`:

```ts
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  planStartWeight: z.number().positive().optional(),
```

- [ ] **Step 3: Tests**

In `nutritionProfile.test.ts`: case with plan start fields round-trips; case without still parses.

- [ ] **Step 4: Run**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/auth/model/nutritionProfile.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/ai-food/src/features/auth/model/nutritionProfile.ts apps/ai-food/src/features/auth/model/nutritionProfile.test.ts apps/ai-app/src/lib/nutritionProfile.ts
git commit -m "feat(nutrition-profile): sync optional plan start fields"
```

---

### Task 3: Ideal trajectory + viewport model helpers

**Files:**
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.ts`
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.test.ts`

**Interfaces:**
- Produces:

```ts
export function parseLocalYmd(ymd: string): Date | null;
export function toLocalYmd(date: Date): string;
export function addLocalDays(date: Date, days: number): Date;
export function calendarDaysBetween(aYmd: string, bYmd: string): number; // b - a in whole days

export function idealWeightAtDate(input: {
  planStartDate: string;
  planStartWeight: number;
  targetWeightDate: string;
  goalKg: number;
  atYmd: string;
}): number | null;

/** Clip ideal segment to [viewStartYmd, viewEndYmd] inclusive. 0–2 endpoints. */
export function getIdealSegmentInWindow(input: {
  planStartDate: string;
  planStartWeight: number;
  targetWeightDate: string;
  goalKg: number;
  viewStartYmd: string;
  viewEndYmd: string;
}): WeightChartPoint[];

export const WEIGHT_VIEW_DAYS = 30;

export function defaultViewEndYmd(
  rangeEndYmd: string,
  todayYmd: string = toLocalYmd(new Date()),
): string; // min(today, rangeEnd) as right edge preference

export function clampViewEndYmd(
  viewEndYmd: string,
  rangeStartYmd: string,
  rangeEndYmd: string,
): string; // ensure window of WEIGHT_VIEW_DAYS fits in range

export function viewStartFromEnd(viewEndYmd: string): string; // end - (WEIGHT_VIEW_DAYS - 1)

export function computeWeightRange(input: {
  planStartDate?: string;
  targetWeightDate?: string;
  entryDates: string[]; // YYYY-MM-DD
  todayYmd?: string;
}): { startYmd: string; endYmd: string };
```

- [ ] **Step 1: Write failing tests** for:
  - `idealWeightAtDate` midpoint halfway in kg when halfway in days
  - `getIdealSegmentInWindow` returns 2 points clipped to window
  - empty when plan dates missing / window misses plan entirely
  - `viewStartFromEnd('2026-08-12')` → `'2026-07-14'` (30 inclusive)
  - `computeWeightRange` spans plan + today

- [ ] **Step 2: Run — expect FAIL**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

- [ ] **Step 3: Implement helpers** in `weightProgress.ts` (reuse local noon-safe parse like onboarding). For `idealWeightAtDate`: if `at` outside `[t0,t1]` clamp to endpoints for kg; `getIdealSegmentInWindow` intersects ranges then evaluates kg at clip ends.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```powershell
git add apps/ai-food/src/features/stats/model/weightProgress.ts apps/ai-food/src/features/stats/model/weightProgress.test.ts
git commit -m "feat(stats): ideal weight trajectory and viewport helpers"
```

---

### Task 4: Chart calendar axis, ideal line, pan, legend

**Files:**
- Modify: `apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx`
- Modify: `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx`
- Modify: `apps/ai-food/src/pages/stats/ui/StatsPage.tsx`

**Interfaces:**
- Consumes: helpers from Task 3; `planStartDate?`, `planStartWeight?`, `profileTargetWeightDate` from profile
- Produces: updated chart props:

```ts
interface WeightTrendChartProps {
  points: WeightChartPoint[]; // fact in full store; chart filters to viewport OR parent passes window points
  goalKg?: number | null;
  idealPoints?: WeightChartPoint[]; // already clipped to viewport
  viewStart: Date;
  viewEnd: Date;
  onPanDays?: (deltaDays: number) => void; // negative = earlier
}
```

**Recommended parent ownership:** `WeightProgressCard` holds `viewEndYmd` state, computes range via `computeWeightRange`, clamps pan, filters fact points to window with date compare, calls `getIdealSegmentInWindow`, passes into chart.

- [ ] **Step 1: Refactor `WeightTrendChart` X mapping**

Replace index-based `xAt(i,n)` with:

```ts
const xAtDate = (d: Date) => {
  const t0 = viewStart.getTime();
  const t1 = viewEnd.getTime();
  const span = Math.max(1, t1 - t0);
  return PAD.left + ((d.getTime() - t0) / span) * plotW;
};
```

Map fact + ideal with `xAtDate`. Include ideal kg values in `niceWeightDomain`. Draw ideal path **before** fact (under), stroke e.g. `hsl(215 20% 45%)`, `strokeDasharray="5 4"`, `strokeWidth={2}`.

Show empty state only when **no fact points in window and no ideal** — if ideal exists but no logs, still show chart with ideal.

Subtitle: `formatAxisDay(viewStart) + ' – ' + formatAxisDay(viewEnd)`.

Legend row under header or under SVG:

```tsx
<div className="mt-2 flex gap-4 text-xs text-muted-foreground">
  <span className="inline-flex items-center gap-1.5">
    <span className="h-0.5 w-4 rounded bg-[hsl(160_84%_39%)]" /> Факт
  </span>
  <span className="inline-flex items-center gap-1.5">
    <span className="h-0.5 w-4 border-t-2 border-dashed border-[hsl(215_20%_45%)]" /> План
  </span>
</div>
```

Only show «План» legend entry when `idealPoints.length > 0`.

- [ ] **Step 2: Pan handlers**

On SVG: `onPointerDown` / `onPointerMove` / `onPointerUp` / `onPointerCancel`. Track start X; on move, if `|dx| > |dy|` and `|dx| > 8`, call `onPanDays` with days ≈ `-round(dx / (plotW / 29))` (drag right → earlier history). Use `setPointerCapture`. Call `preventDefault` only after horizontal lock to reduce vertical scroll fights.

- [ ] **Step 3: Wire `WeightProgressCard`**

New props (or use existing date prop + new):

```ts
  profilePlanStartDate?: string | null;
  profilePlanStartWeight?: number | null;
```

(`profileTargetWeightDate` already exists.)

State:

```ts
  const todayYmd = toLocalYmd(new Date());
  const range = computeWeightRange({
    planStartDate: profilePlanStartDate ?? undefined,
    targetWeightDate: profileTargetWeightDate ?? undefined,
    entryDates: entries.map((e) => e.date),
    todayYmd,
  });
  const [viewEndYmd, setViewEndYmd] = useState(() =>
    defaultViewEndYmd(range.endYmd, todayYmd),
  );
  // re-clamp when range changes
```

Filter points / ideal; pass `onPanDays` that shifts `viewEndYmd` via `addLocalDays` + `clampViewEndYmd`.

- [ ] **Step 4: `StatsPage`**

```tsx
          profilePlanStartDate={profile.planStartDate}
          profilePlanStartWeight={profile.planStartWeight}
```

- [ ] **Step 5: Type-check + unit tests**

```bash
cd apps/ai-food && pnpm exec tsc --noEmit
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

Expected: exit 0 / PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/ai-food/src/features/stats/ui/WeightTrendChart.tsx apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx apps/ai-food/src/pages/stats/ui/StatsPage.tsx
git commit -m "feat(stats): show scrollable ideal weight plan on chart"
```

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| Snapshot plan start at finish | 1 |
| Sync nutrition profile | 2 |
| Linear ideal + clip to 30d window | 3 |
| Distinct dashed color + legend | 4 |
| Calendar X + pan + default today | 4 |
| Legacy hide ideal | 3–4 |
| Goal horizontal line kept | 4 |
| No reset on update goal | 1 (no code in UpdateGoalSheet) |

## Self-review notes

- Auth `UserProfile` is a **separate** type from `@ai-food/shared-types` — Task 2 must update auth copy.
- Gateway optional fields keep old clients valid.
- Chart empty copy: if only ideal, still render SVG (acceptance: see plan without logs).
