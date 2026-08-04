# Week Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a swipeable 7-day week strip to the home screen so users can browse any day's meals by tapping a day and swipe left/right to move between weeks.

**Architecture:** Local state (`weekOffset`, `selectedDate`) lives in `HomePage`. Pure date helpers in `shared/lib/dateUtils.ts`. `WeekStrip` is a new component inside the `daily-header` widget that uses `framer-motion` drag to detect swipes. `DailyHeader` and `MealList` become controlled via props.

**Tech Stack:** React 18, framer-motion ^11, Vitest, Tailwind CSS, TypeScript strict.

## Global Constraints

- TypeScript strict mode — no `any`, all props typed
- FSD barrel imports only — never import from deep paths like `@/shared/lib/dateUtils` from outside `shared`; always via `@/shared/lib`
- Named exports only — no default exports for app code
- 2-space indentation, single quotes, semicolons
- Tests co-located with source file — `dateUtils.test.ts` next to `dateUtils.ts`
- `pnpm` only — never `npm` or `yarn`
- Run all commands from repo root unless noted otherwise

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `src/shared/lib/dateUtils.ts` | **create** | Pure date helpers: getWeekStart, getWeekDays, isSameDay, formatDayLabel, formatHeaderDate |
| `src/shared/lib/dateUtils.test.ts` | **create** | Unit tests for all dateUtils helpers |
| `src/shared/lib/index.ts` | **modify** | Export dateUtils helpers |
| `src/widgets/daily-header/ui/WeekStrip.tsx` | **create** | 7-day strip with framer-motion swipe |
| `src/widgets/daily-header/ui/DailyHeader.tsx` | **modify** | Accept props, use isSameDay, embed WeekStrip |
| `src/widgets/meal-list/ui/MealList.tsx` | **modify** | Accept selectedDate prop |
| `src/pages/home/ui/HomePage.tsx` | **modify** | Own weekOffset + selectedDate state, wire props |
| `package.json` | **modify** | Add framer-motion dependency |

---

## Task 1: Date utility helpers

**Files:**
- Create: `src/shared/lib/dateUtils.ts`
- Create: `src/shared/lib/dateUtils.test.ts`
- Modify: `src/shared/lib/index.ts`

**Interfaces:**
- Produces:
  - `getWeekStart(date: Date): Date` — Monday 00:00:00 of week containing `date`
  - `getWeekDays(weekOffset: number): Date[]` — 7 Dates Mon–Sun; offset 0 = current week, +1 = next, -1 = prev
  - `isSameDay(a: Date, b: Date): boolean`
  - `formatDayLabel(date: Date): string` — "Пн" | "Вт" | "Ср" | "Чт" | "Пт" | "Сб" | "Вс"
  - `formatHeaderDate(date: Date): string` — "Today" if today, else locale string e.g. "пн, 22 июн."

- [ ] **Step 1: Write failing tests**

Create `src/shared/lib/dateUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekDays,
  isSameDay,
  formatDayLabel,
  formatHeaderDate,
} from './dateUtils';

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    // 2026-06-24 is a Wednesday
    const wed = new Date('2026-06-24T12:00:00');
    const result = getWeekStart(wed);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(22);
    expect(result.getHours()).toBe(0);
  });

  it('returns same Monday for a Monday', () => {
    const mon = new Date('2026-06-22T08:00:00');
    const result = getWeekStart(mon);
    expect(result.getDate()).toBe(22);
    expect(result.getDay()).toBe(1);
  });

  it('returns previous Monday for a Sunday', () => {
    // 2026-06-28 is a Sunday
    const sun = new Date('2026-06-28T15:00:00');
    const result = getWeekStart(sun);
    expect(result.getDate()).toBe(22);
    expect(result.getDay()).toBe(1);
  });
});

describe('getWeekDays', () => {
  it('returns exactly 7 days', () => {
    expect(getWeekDays(0)).toHaveLength(7);
  });

  it('first day is Monday (getDay() === 1)', () => {
    expect(getWeekDays(0)[0].getDay()).toBe(1);
  });

  it('last day is Sunday (getDay() === 0)', () => {
    expect(getWeekDays(0)[6].getDay()).toBe(0);
  });

  it('days are consecutive', () => {
    const days = getWeekDays(0);
    for (let i = 1; i < 7; i++) {
      expect(days[i].getDate() - days[i - 1].getDate()).toBe(1);
    }
  });

  it('offset +1 starts 7 days after offset 0', () => {
    const thisMonday = getWeekDays(0)[0];
    const nextMonday = getWeekDays(1)[0];
    const diff = nextMonday.getTime() - thisMonday.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('offset -1 starts 7 days before offset 0', () => {
    const thisMonday = getWeekDays(0)[0];
    const prevMonday = getWeekDays(-1)[0];
    const diff = thisMonday.getTime() - prevMonday.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe('isSameDay', () => {
  it('returns true for same calendar day, different times', () => {
    const a = new Date('2026-06-24T08:00:00');
    const b = new Date('2026-06-24T22:30:00');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different days', () => {
    const a = new Date('2026-06-24T23:59:59');
    const b = new Date('2026-06-25T00:00:00');
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe('formatDayLabel', () => {
  it('Monday → "Пн"', () => {
    expect(formatDayLabel(new Date('2026-06-22'))).toBe('Пн');
  });

  it('Tuesday → "Вт"', () => {
    expect(formatDayLabel(new Date('2026-06-23'))).toBe('Вт');
  });

  it('Wednesday → "Ср"', () => {
    expect(formatDayLabel(new Date('2026-06-24'))).toBe('Ср');
  });

  it('Thursday → "Чт"', () => {
    expect(formatDayLabel(new Date('2026-06-25'))).toBe('Чт');
  });

  it('Friday → "Пт"', () => {
    expect(formatDayLabel(new Date('2026-06-26'))).toBe('Пт');
  });

  it('Saturday → "Сб"', () => {
    expect(formatDayLabel(new Date('2026-06-27'))).toBe('Сб');
  });

  it('Sunday → "Вс"', () => {
    expect(formatDayLabel(new Date('2026-06-28'))).toBe('Вс');
  });
});

describe('formatHeaderDate', () => {
  it('returns "Today" for today', () => {
    expect(formatHeaderDate(new Date())).toBe('Today');
  });

  it('returns a non-empty string for a past date', () => {
    const result = formatHeaderDate(new Date('2026-06-22'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('Today');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
pnpm test -- --reporter=verbose dateUtils
```

Expected: `Cannot find module './dateUtils'` or similar import error.

- [ ] **Step 3: Implement dateUtils.ts**

Create `src/shared/lib/dateUtils.ts`:

```ts
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(weekOffset: number): Date[] {
  const monday = getWeekStart(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function formatDayLabel(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

export function formatHeaderDate(date: Date): string {
  if (isSameDay(date, new Date())) return 'Today';
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
```

- [ ] **Step 4: Export from shared/lib barrel**

Edit `src/shared/lib/index.ts` — add one line:

```ts
export { cn } from './utils';
export { formatCalories, formatMacro, formatDate } from './formatters';
export { queryClient } from './queryClient';
export { getWeekStart, getWeekDays, isSameDay, formatDayLabel, formatHeaderDate } from './dateUtils';
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
pnpm test -- --reporter=verbose dateUtils
```

Expected: 16 tests pass, 0 failures.

- [ ] **Step 6: Type-check**

```bash
pnpm type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/lib/dateUtils.ts src/shared/lib/dateUtils.test.ts src/shared/lib/index.ts
git commit -m "feat(shared): add date utility helpers for week navigation"
```

---

## Task 2: Install framer-motion + WeekStrip component

**Files:**
- Modify: `package.json`
- Create: `src/widgets/daily-header/ui/WeekStrip.tsx`

**Interfaces:**
- Consumes:
  - `getWeekDays(weekOffset: number): Date[]` from `@/shared/lib`
  - `isSameDay(a: Date, b: Date): boolean` from `@/shared/lib`
  - `formatDayLabel(date: Date): string` from `@/shared/lib`
  - `Meal` type from `@ai-food/shared-types`
- Produces:
  ```ts
  interface WeekStripProps {
    weekOffset: number;
    selectedDate: Date;
    meals: Meal[];
    onDaySelect: (date: Date) => void;
    onWeekChange: (delta: 1 | -1) => void;
  }
  export function WeekStrip(props: WeekStripProps): JSX.Element
  ```

- [ ] **Step 1: Install framer-motion**

```bash
pnpm add framer-motion
```

Expected: `package.json` now lists `"framer-motion": "^11.x.x"` in `dependencies`.

- [ ] **Step 2: Create WeekStrip.tsx**

Create `src/widgets/daily-header/ui/WeekStrip.tsx`:

```tsx
import { motion, type PanInfo } from 'framer-motion';
import type { Meal } from '@ai-food/shared-types';
import { getWeekDays, isSameDay, formatDayLabel } from '@/shared/lib';

interface WeekStripProps {
  weekOffset: number;
  selectedDate: Date;
  meals: Meal[];
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

export function WeekStrip({
  weekOffset,
  selectedDate,
  meals,
  onDaySelect,
  onWeekChange,
}: WeekStripProps) {
  const days = getWeekDays(weekOffset);
  const today = new Date();

  function handleDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -80 || velocity.x < -500) onWeekChange(1);
    else if (offset.x > 80 || velocity.x > 500) onWeekChange(-1);
  }

  return (
    <motion.div
      className="flex justify-between mt-4 cursor-grab active:cursor-grabbing"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
    >
      {days.map((day) => {
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, today);
        const hasMeal = meals.some((m) => isSameDay(new Date(m.timestamp), day));

        return (
          <button
            key={day.toDateString()}
            className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg select-none"
            onClick={() => onDaySelect(day)}
          >
            <span className="text-xs text-emerald-100">{formatDayLabel(day)}</span>
            <span
              className={[
                'w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors',
                isSelected
                  ? 'bg-white text-emerald-600 font-bold'
                  : isToday
                    ? 'text-white font-bold'
                    : 'text-emerald-100',
              ].join(' ')}
            >
              {day.getDate()}
            </span>
            <span
              className={[
                'w-1.5 h-1.5 rounded-full transition-opacity',
                hasMeal ? 'bg-white opacity-70' : 'opacity-0',
              ].join(' ')}
            />
          </button>
        );
      })}
    </motion.div>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: no errors. (WeekStrip is not yet imported anywhere, so no barrel update needed yet — that happens in Task 3.)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/widgets/daily-header/ui/WeekStrip.tsx
git commit -m "feat(daily-header): add WeekStrip component with framer-motion swipe"
```

---

## Task 3: Update DailyHeader to accept props and embed WeekStrip

**Files:**
- Modify: `src/widgets/daily-header/ui/DailyHeader.tsx`

**Interfaces:**
- Consumes:
  - `WeekStrip` from `./WeekStrip`
  - `isSameDay`, `formatHeaderDate` from `@/shared/lib`
- Produces:
  ```ts
  interface DailyHeaderProps {
    selectedDate: Date;
    weekOffset: number;
    onDaySelect: (date: Date) => void;
    onWeekChange: (delta: 1 | -1) => void;
  }
  export function DailyHeader(props: DailyHeaderProps): JSX.Element
  ```

Note: `DailyHeader` still reads `meals` and `targets` from stores internally — it does not take them as props. This keeps `HomePage` lean.

- [ ] **Step 1: Rewrite DailyHeader.tsx**

Replace the full contents of `src/widgets/daily-header/ui/DailyHeader.tsx`:

```tsx
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { formatCalories, isSameDay, formatHeaderDate } from '@/shared/lib';
import { WeekStrip } from './WeekStrip';

interface DailyHeaderProps {
  selectedDate: Date;
  weekOffset: number;
  onDaySelect: (date: Date) => void;
  onWeekChange: (delta: 1 | -1) => void;
}

export function DailyHeader({
  selectedDate,
  weekOffset,
  onDaySelect,
  onWeekChange,
}: DailyHeaderProps) {
  const meals = useDiaryStore((s) => s.meals);
  const targets = useProfileStore((s) => s.targets);

  const dailyGoal = targets?.kcal ?? 2000;

  const dayCalories = meals
    .filter((m) => isSameDay(new Date(m.timestamp), selectedDate))
    .reduce((sum, m) => sum + m.totalCalories, 0);

  const remaining = dailyGoal - dayCalories;
  const progress = Math.min((dayCalories / dailyGoal) * 100, 100);

  return (
    <header className="bg-emerald-500 text-white px-4 pt-12 pb-6">
      <p className="text-emerald-100 text-sm font-medium">{formatHeaderDate(selectedDate)}</p>
      <p className="text-4xl font-bold mt-1">{formatCalories(dayCalories)}</p>
      <p className="text-emerald-100 text-sm mt-1">
        {remaining > 0
          ? `${Math.round(remaining)} kcal remaining`
          : `${Math.round(Math.abs(remaining))} kcal over goal`}
      </p>
      <div className="mt-4 h-1.5 bg-emerald-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <WeekStrip
        weekOffset={weekOffset}
        selectedDate={selectedDate}
        meals={meals}
        onDaySelect={onDaySelect}
        onWeekChange={onWeekChange}
      />
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: TypeScript will report an error in `HomePage.tsx` because `DailyHeader` now requires props that aren't passed yet. That's expected — will be fixed in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/daily-header/ui/DailyHeader.tsx
git commit -m "feat(daily-header): accept selectedDate/weekOffset props, embed WeekStrip"
```

---

## Task 4: Update MealList to accept selectedDate prop

**Files:**
- Modify: `src/widgets/meal-list/ui/MealList.tsx`

**Interfaces:**
- Consumes: `isSameDay` from `@/shared/lib`
- Produces:
  ```ts
  interface MealListProps {
    selectedDate: Date;
  }
  export function MealList(props: MealListProps): JSX.Element
  ```

- [ ] **Step 1: Rewrite MealList.tsx**

Replace the full contents of `src/widgets/meal-list/ui/MealList.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { useDiaryStore } from '@/entities/meal';
import { MealCard } from '@/entities/meal';
import { Button } from '@/shared/ui';
import { isSameDay } from '@/shared/lib';

interface MealListProps {
  selectedDate: Date;
}

export function MealList({ selectedDate }: MealListProps) {
  const navigate = useNavigate();
  const meals = useDiaryStore((s) => s.meals);

  const isToday = isSameDay(selectedDate, new Date());
  const dayMeals = meals.filter((m) =>
    isSameDay(new Date(m.timestamp), selectedDate)
  );

  if (dayMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-base font-medium">
          {isToday ? 'No meals tracked today' : 'No meals on this day'}
        </p>
        {isToday && (
          <p className="text-sm mt-1">Tap + to add your first meal</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-foreground">
          {isToday ? "Today's Meals" : 'Meals'}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/diary')}>
          View All
        </Button>
      </div>
      {dayMeals.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm type-check
```

Expected: error in `HomePage.tsx` (MealList now requires `selectedDate` prop not yet passed). That's expected.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/meal-list/ui/MealList.tsx
git commit -m "feat(meal-list): accept selectedDate prop, filter by selected day"
```

---

## Task 5: Wire state in HomePage

**Files:**
- Modify: `src/pages/home/ui/HomePage.tsx`

**Interfaces:**
- Consumes:
  - `getWeekDays(weekOffset: number): Date[]` from `@/shared/lib`
  - `isSameDay(a: Date, b: Date): boolean` from `@/shared/lib`
  - `DailyHeader` with props `{ selectedDate, weekOffset, onDaySelect, onWeekChange }`
  - `MealList` with prop `{ selectedDate }`

- [ ] **Step 1: Rewrite HomePage.tsx**

Replace the full contents of `src/pages/home/ui/HomePage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { DailyHeader } from '@/widgets/daily-header';
import { MealList } from '@/widgets/meal-list';
import { Button } from '@/shared/ui';
import { getWeekDays, isSameDay } from '@/shared/lib';

export function HomePage() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());

  function handleWeekChange(delta: 1 | -1) {
    const newOffset = weekOffset + delta;
    setWeekOffset(newOffset);
    const newWeekDays = getWeekDays(newOffset);
    const stillInWeek = newWeekDays.some((d) => isSameDay(d, selectedDate));
    if (!stillInWeek) setSelectedDate(newWeekDays[0]);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DailyHeader
        selectedDate={selectedDate}
        weekOffset={weekOffset}
        onDaySelect={setSelectedDate}
        onWeekChange={handleWeekChange}
      />
      <main className="flex-1 px-4 py-4 pb-24">
        <MealList selectedDate={selectedDate} />
      </main>
      <div className="fixed bottom-6 right-6">
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => navigate('/add')}
          aria-label="Add food"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check — must be clean**

```bash
pnpm type-check
```

Expected: **0 errors**.

- [ ] **Step 3: Run full test suite**

```bash
pnpm test
```

Expected: all existing tests + new dateUtils tests pass. (WeekStrip and DailyHeader have no unit tests — they are visual components tested manually.)

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Open `http://localhost:5173`. Verify:
1. Home screen shows week strip (Mon–Sun) inside the green header
2. Today's day number appears bold/highlighted
3. Tapping a different day updates the calorie header label and meal list
4. Swiping the strip left moves to next week; swiping right moves to previous week
5. After swiping to a new week where the selected day no longer exists, Monday of the new week is auto-selected
6. "+ button" still opens add-food flow

- [ ] **Step 5: Commit**

```bash
git add src/pages/home/ui/HomePage.tsx
git commit -m "feat(home): wire week navigation state, connect DailyHeader and MealList"
```
