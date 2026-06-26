# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-step onboarding wizard that collects user profile data, calculates personalised daily КБЖУ targets, and gates access to the app until the profile is complete.

**Architecture:** Single `OnboardingPage` component manages step state via `useOnboarding` hook; completed profile is persisted to localStorage via `useProfileStore` (Zustand + persist). A `ProfileGuard` component wraps the home route and redirects to `/onboarding` when no profile exists. `DailyHeader` is updated to read targets from the store instead of a hardcoded constant.

**Tech Stack:** React 18, React Router DOM 6, Zustand 5 (persist), Vitest 2, Testing Library, Tailwind CSS, shadcn/ui Card + Button primitives.

## Global Constraints

- All files under `apps/mobile/src/` use 2-space indentation, single quotes, semicolons, trailing commas
- FSD import rule: cross-slice imports MUST go through `index.ts` barrels only
- FSD layer order: `app → pages → widgets → features → entities → shared` — higher layers import from lower only
- Named exports only (no default exports except Express routers which are unrelated)
- Types and interfaces in PascalCase; hooks with `use` prefix; handler callbacks with `handle` prefix
- New shared domain types go in `packages/shared-types/src/index.ts`
- localStorage persist key for profile: `ai-food-profile`
- Zustand stores store client/UI state only — never API responses
- Test files: co-located, same base name + `.test.ts` or `.test.tsx`
- Run tests with: `pnpm --filter @ai-food/mobile test` (or `pnpm test` from root via Turbo)
- Run type-check with: `pnpm --filter @ai-food/mobile type-check`

---

## File Map

**Create:**
- `packages/shared-types/src/index.ts` — add `UserProfile`, `DailyTargets`, `ActivityLevel`, `Goal` (modify existing)
- `apps/mobile/src/features/onboarding/model/useProfileStore.ts` — Zustand persist store
- `apps/mobile/src/features/onboarding/model/useProfileStore.test.ts`
- `apps/mobile/src/features/onboarding/model/calculateTargets.ts` — pure Mifflin-St Jeor calculation
- `apps/mobile/src/features/onboarding/model/calculateTargets.test.ts`
- `apps/mobile/src/features/onboarding/model/useOnboarding.ts` — wizard step/draft hook
- `apps/mobile/src/features/onboarding/model/useOnboarding.test.ts`
- `apps/mobile/src/features/onboarding/ui/steps/StepGender.tsx`
- `apps/mobile/src/features/onboarding/ui/steps/StepAge.tsx`
- `apps/mobile/src/features/onboarding/ui/steps/StepHeight.tsx`
- `apps/mobile/src/features/onboarding/ui/steps/StepWeight.tsx`
- `apps/mobile/src/features/onboarding/ui/steps/StepActivity.tsx`
- `apps/mobile/src/features/onboarding/ui/steps/StepGoal.tsx`
- `apps/mobile/src/features/onboarding/ui/OnboardingResult.tsx`
- `apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx`
- `apps/mobile/src/features/onboarding/index.ts`
- `apps/mobile/src/pages/onboarding/ui/OnboardingPage.tsx`
- `apps/mobile/src/pages/onboarding/index.ts`
- `apps/mobile/src/app/ProfileGuard.tsx`

**Modify:**
- `packages/shared-types/src/index.ts` — append new types
- `apps/mobile/src/app/router.tsx` — add `/onboarding` route, wrap `/` with `ProfileGuard`
- `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx` — replace hardcoded `DAILY_GOAL` with `useProfileStore`

---

### Task 1: Add shared types

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Interfaces:**
- Produces: `UserProfile`, `DailyTargets`, `ActivityLevel`, `Goal` — consumed by Tasks 2, 3, 4, 7

- [ ] **Step 1: Append types to shared-types**

Open `packages/shared-types/src/index.ts` and append at the end:

```ts
export type ActivityLevel = 'low' | 'medium' | 'high';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  activity: ActivityLevel;
  goal: Goal;
}

export interface DailyTargets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
pnpm --filter @ai-food/shared-types type-check 2>/dev/null || pnpm type-check
```

Expected: no errors (shared-types has no build step, types-only package).

- [ ] **Step 3: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add UserProfile, DailyTargets, ActivityLevel, Goal"
```

---

### Task 2: Pure calculation function

**Files:**
- Create: `apps/mobile/src/features/onboarding/model/calculateTargets.ts`
- Create: `apps/mobile/src/features/onboarding/model/calculateTargets.test.ts`

**Interfaces:**
- Consumes: `UserProfile`, `DailyTargets` from `@ai-food/shared-types`
- Produces: `calculateTargets(profile: UserProfile): DailyTargets`

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/features/onboarding/model/calculateTargets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateTargets } from './calculateTargets';

describe('calculateTargets', () => {
  it('calculates kcal for male, medium activity, maintain goal', () => {
    const result = calculateTargets({
      gender: 'male',
      age: 30,
      height: 175,
      weight: 75,
      activity: 'medium',
      goal: 'maintain',
    });
    // BMR = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    // TDEE = 1698.75 * 1.55 = 2633.06 → 2633
    expect(result.kcal).toBe(2633);
  });

  it('calculates kcal for female, low activity, lose goal', () => {
    const result = calculateTargets({
      gender: 'female',
      age: 25,
      height: 165,
      weight: 60,
      activity: 'low',
      goal: 'lose',
    });
    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    // TDEE = 1345.25 * 1.2 = 1614.3 → 1614
    // kcal = 1614 - 300 = 1314
    expect(result.kcal).toBe(1314);
  });

  it('adds 300 kcal for gain goal', () => {
    const base = calculateTargets({
      gender: 'male',
      age: 25,
      height: 180,
      weight: 80,
      activity: 'low',
      goal: 'maintain',
    });
    const gain = calculateTargets({
      gender: 'male',
      age: 25,
      height: 180,
      weight: 80,
      activity: 'low',
      goal: 'gain',
    });
    expect(gain.kcal).toBe(base.kcal + 300);
  });

  it('calculates protein as weight * 1.8 rounded', () => {
    const result = calculateTargets({
      gender: 'male',
      age: 30,
      height: 175,
      weight: 75,
      activity: 'medium',
      goal: 'maintain',
    });
    expect(result.protein).toBe(Math.round(75 * 1.8));
  });

  it('all macros are integers', () => {
    const result = calculateTargets({
      gender: 'female',
      age: 35,
      height: 160,
      weight: 65,
      activity: 'high',
      goal: 'maintain',
    });
    expect(Number.isInteger(result.kcal)).toBe(true);
    expect(Number.isInteger(result.protein)).toBe(true);
    expect(Number.isInteger(result.fat)).toBe(true);
    expect(Number.isInteger(result.carbs)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/calculateTargets.test.ts
```

Expected: FAIL — `calculateTargets` not found.

- [ ] **Step 3: Implement calculateTargets**

Create `apps/mobile/src/features/onboarding/model/calculateTargets.ts`:

```ts
import type { UserProfile, DailyTargets } from '@ai-food/shared-types';

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  low: 1.2,
  medium: 1.55,
  high: 1.725,
};

const GOAL_DELTA: Record<string, number> = {
  lose: -300,
  maintain: 0,
  gain: 300,
};

export function calculateTargets(profile: UserProfile): DailyTargets {
  const { gender, age, height, weight, activity, goal } = profile;

  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIER[activity];
  const kcal = Math.round(tdee) + GOAL_DELTA[goal];
  const protein = Math.round(weight * 1.8);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  return { kcal, protein, fat, carbs };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/calculateTargets.test.ts
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/onboarding/model/calculateTargets.ts \
        apps/mobile/src/features/onboarding/model/calculateTargets.test.ts
git commit -m "feat(onboarding): add calculateTargets with Mifflin-St Jeor formula"
```

---

### Task 3: Profile store

**Files:**
- Create: `apps/mobile/src/features/onboarding/model/useProfileStore.ts`
- Create: `apps/mobile/src/features/onboarding/model/useProfileStore.test.ts`

**Interfaces:**
- Consumes: `UserProfile`, `DailyTargets` from `@ai-food/shared-types`
- Produces: `useProfileStore` — hook with `{ profile, targets, setProfile, isComplete }`; consumed by Tasks 5 (DailyHeader), 6 (ProfileGuard), 7 (OnboardingPage)

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/features/onboarding/model/useProfileStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useProfileStore } from './useProfileStore';

const mockProfile = {
  gender: 'male' as const,
  age: 28,
  height: 178,
  weight: 78,
  activity: 'medium' as const,
  goal: 'maintain' as const,
};

const mockTargets = { kcal: 2500, protein: 140, fat: 69, carbs: 288 };

beforeEach(() => {
  useProfileStore.setState({ profile: null, targets: null });
});

describe('useProfileStore', () => {
  it('starts with no profile', () => {
    expect(useProfileStore.getState().profile).toBeNull();
  });

  it('isComplete returns false when profile is null', () => {
    expect(useProfileStore.getState().isComplete()).toBe(false);
  });

  it('setProfile stores profile and targets', () => {
    useProfileStore.getState().setProfile(mockProfile, mockTargets);
    expect(useProfileStore.getState().profile).toEqual(mockProfile);
    expect(useProfileStore.getState().targets).toEqual(mockTargets);
  });

  it('isComplete returns true after setProfile', () => {
    useProfileStore.getState().setProfile(mockProfile, mockTargets);
    expect(useProfileStore.getState().isComplete()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/useProfileStore.test.ts
```

Expected: FAIL — `useProfileStore` not found.

- [ ] **Step 3: Implement store**

Create `apps/mobile/src/features/onboarding/model/useProfileStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, DailyTargets } from '@ai-food/shared-types';

interface ProfileState {
  profile: UserProfile | null;
  targets: DailyTargets | null;
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  isComplete: () => boolean;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      targets: null,
      setProfile: (profile, targets) => set({ profile, targets }),
      isComplete: () => get().profile !== null,
    }),
    { name: 'ai-food-profile' }
  )
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/useProfileStore.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/onboarding/model/useProfileStore.ts \
        apps/mobile/src/features/onboarding/model/useProfileStore.test.ts
git commit -m "feat(onboarding): add useProfileStore with persist"
```

---

### Task 4: Wizard hook

**Files:**
- Create: `apps/mobile/src/features/onboarding/model/useOnboarding.ts`
- Create: `apps/mobile/src/features/onboarding/model/useOnboarding.test.ts`

**Interfaces:**
- Consumes: `useProfileStore.setProfile`, `calculateTargets`, `UserProfile` from `@ai-food/shared-types`
- Produces: `useOnboarding()` → `{ step, draft, next, back, finish }` — consumed by Task 7 (OnboardingPage)

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/features/onboarding/model/useOnboarding.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnboarding } from './useOnboarding';
import { useProfileStore } from './useProfileStore';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

beforeEach(() => {
  useProfileStore.setState({ profile: null, targets: null });
});

describe('useOnboarding', () => {
  it('starts at step 1 with empty draft', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.step).toBe(1);
    expect(result.current.draft).toEqual({});
  });

  it('next() advances step and merges data', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.next({ gender: 'female' }));
    expect(result.current.step).toBe(2);
    expect(result.current.draft.gender).toBe('female');
  });

  it('back() decrements step (not below 1)', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => result.current.next({ gender: 'male' }));
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it('finish() calls setProfile and navigates', () => {
    const setProfile = vi.fn();
    useProfileStore.setState({ profile: null, targets: null, setProfile, isComplete: () => false });

    const navigate = vi.fn();
    vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(navigate);

    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.next({ gender: 'male' });
      result.current.next({ age: 30 });
      result.current.next({ height: 175 });
      result.current.next({ weight: 75 });
      result.current.next({ activity: 'medium' });
      result.current.next({ goal: 'maintain' });
    });
    act(() => result.current.finish());
    expect(setProfile).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/useOnboarding.test.ts
```

Expected: FAIL — `useOnboarding` not found.

- [ ] **Step 3: Implement hook**

Create `apps/mobile/src/features/onboarding/model/useOnboarding.ts`:

```ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@ai-food/shared-types';
import { useProfileStore } from './useProfileStore';
import { calculateTargets } from './calculateTargets';

export function useOnboarding() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Partial<UserProfile>>({});
  const setProfile = useProfileStore((s) => s.setProfile);
  const navigate = useNavigate();

  function next(data: Partial<UserProfile>) {
    setDraft((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  function finish() {
    const profile = draft as UserProfile;
    const targets = calculateTargets(profile);
    setProfile(profile, targets);
    navigate('/');
  }

  return { step, draft, next, back, finish };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @ai-food/mobile test src/features/onboarding/model/useOnboarding.test.ts
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/onboarding/model/useOnboarding.ts \
        apps/mobile/src/features/onboarding/model/useOnboarding.test.ts
git commit -m "feat(onboarding): add useOnboarding wizard hook"
```

---

### Task 5: Step components + OnboardingResult

**Files:**
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepGender.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepAge.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepHeight.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepWeight.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepActivity.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/steps/StepGoal.tsx`
- Create: `apps/mobile/src/features/onboarding/ui/OnboardingResult.tsx`

**Interfaces:**
- Consumes: `Button`, `Card` from `@/shared/ui`; `DailyTargets`, `UserProfile` from `@ai-food/shared-types`
- Step props pattern: `{ onNext: (data: Partial<UserProfile>) => void }`
- `OnboardingResult` props: `{ targets: DailyTargets; onStart: () => void }`

- [ ] **Step 1: Create StepGender**

Create `apps/mobile/src/features/onboarding/ui/steps/StepGender.tsx`:

```tsx
import { useState } from 'react';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { UserProfile } from '@ai-food/shared-types';

interface StepGenderProps {
  onNext: (data: Pick<UserProfile, 'gender'>) => void;
}

const OPTIONS = [
  { value: 'male' as const, label: 'Мужской', icon: '♂' },
  { value: 'female' as const, label: 'Женский', icon: '♀' },
];

export function StepGender({ onNext }: StepGenderProps) {
  const [selected, setSelected] = useState<'male' | 'female' | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваш пол</h2>
        <p className="text-muted-foreground mt-1">Это влияет на расчёт нормы калорий</p>
      </div>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            <span className="text-3xl">{opt.icon}</span>
            <span className="text-lg font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={selected === null}
        onClick={() => selected && onNext({ gender: selected })}
      >
        Далее
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Create SliderInput shared component inline in steps**

Create `apps/mobile/src/features/onboarding/ui/steps/StepAge.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/shared/ui';
import type { UserProfile } from '@ai-food/shared-types';

interface StepAgeProps {
  onNext: (data: Pick<UserProfile, 'age'>) => void;
}

export function StepAge({ onNext }: StepAgeProps) {
  const [value, setValue] = useState(25);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(Number(e.target.value));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(80, Math.max(15, Number(e.target.value)));
    setValue(v);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваш возраст</h2>
        <p className="text-muted-foreground mt-1">Используется в формуле расчёта метаболизма</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={15}
          max={80}
          value={value}
          onChange={handleSlider}
          className="flex-1 accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={15}
            max={80}
            value={value}
            onChange={handleInput}
            className="w-16 border rounded-lg px-2 py-1 text-center text-lg font-semibold"
          />
          <span className="text-muted-foreground text-sm">лет</span>
        </div>
      </div>
      <Button className="w-full" onClick={() => onNext({ age: value })}>
        Далее
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create StepHeight**

Create `apps/mobile/src/features/onboarding/ui/steps/StepHeight.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/shared/ui';
import type { UserProfile } from '@ai-food/shared-types';

interface StepHeightProps {
  onNext: (data: Pick<UserProfile, 'height'>) => void;
}

export function StepHeight({ onNext }: StepHeightProps) {
  const [value, setValue] = useState(170);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(Number(e.target.value));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(220, Math.max(140, Number(e.target.value)));
    setValue(v);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваш рост</h2>
        <p className="text-muted-foreground mt-1">Нужен для точного расчёта нормы</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={140}
          max={220}
          value={value}
          onChange={handleSlider}
          className="flex-1 accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={140}
            max={220}
            value={value}
            onChange={handleInput}
            className="w-16 border rounded-lg px-2 py-1 text-center text-lg font-semibold"
          />
          <span className="text-muted-foreground text-sm">см</span>
        </div>
      </div>
      <Button className="w-full" onClick={() => onNext({ height: value })}>
        Далее
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Create StepWeight**

Create `apps/mobile/src/features/onboarding/ui/steps/StepWeight.tsx`:

```tsx
import { useState } from 'react';
import { Button } from '@/shared/ui';
import type { UserProfile } from '@ai-food/shared-types';

interface StepWeightProps {
  onNext: (data: Pick<UserProfile, 'weight'>) => void;
}

export function StepWeight({ onNext }: StepWeightProps) {
  const [value, setValue] = useState(70);

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(Number(e.target.value));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.min(160, Math.max(40, Number(e.target.value)));
    setValue(v);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваш вес</h2>
        <p className="text-muted-foreground mt-1">Нужен для расчёта нормы белка и калорий</p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={40}
          max={160}
          value={value}
          onChange={handleSlider}
          className="flex-1 accent-primary"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={40}
            max={160}
            value={value}
            onChange={handleInput}
            className="w-16 border rounded-lg px-2 py-1 text-center text-lg font-semibold"
          />
          <span className="text-muted-foreground text-sm">кг</span>
        </div>
      </div>
      <Button className="w-full" onClick={() => onNext({ weight: value })}>
        Далее
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Create StepActivity**

Create `apps/mobile/src/features/onboarding/ui/steps/StepActivity.tsx`:

```tsx
import { useState } from 'react';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { UserProfile, ActivityLevel } from '@ai-food/shared-types';

interface StepActivityProps {
  onNext: (data: Pick<UserProfile, 'activity'>) => void;
}

const OPTIONS: { value: ActivityLevel; label: string; description: string; icon: string }[] = [
  { value: 'low', label: 'Низкая', description: 'Сидячая работа, редко хожу в зал', icon: '🪑' },
  { value: 'medium', label: 'Средняя', description: 'Тренировки 2–4 раза в неделю', icon: '🏃' },
  { value: 'high', label: 'Высокая', description: 'Ежедневные тренировки или физический труд', icon: '💪' },
];

export function StepActivity({ onNext }: StepActivityProps) {
  const [selected, setSelected] = useState<ActivityLevel | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Уровень активности</h2>
        <p className="text-muted-foreground mt-1">Влияет на суточный расход энергии</p>
      </div>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            <span className="text-3xl">{opt.icon}</span>
            <div>
              <p className="font-semibold">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={selected === null}
        onClick={() => selected && onNext({ activity: selected })}
      >
        Далее
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Create StepGoal**

Create `apps/mobile/src/features/onboarding/ui/steps/StepGoal.tsx`:

```tsx
import { useState } from 'react';
import { cn } from '@/shared/lib';
import { Button } from '@/shared/ui';
import type { UserProfile, Goal } from '@ai-food/shared-types';

interface StepGoalProps {
  onNext: (data: Pick<UserProfile, 'goal'>) => void;
}

const OPTIONS: { value: Goal; label: string; description: string; icon: string }[] = [
  { value: 'lose', label: 'Похудеть', description: 'Дефицит −300 ккал от нормы', icon: '📉' },
  { value: 'maintain', label: 'Удержать вес', description: 'Питаться по норме', icon: '⚖️' },
  { value: 'gain', label: 'Набрать массу', description: 'Профицит +300 ккал от нормы', icon: '📈' },
];

export function StepGoal({ onNext }: StepGoalProps) {
  const [selected, setSelected] = useState<Goal | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваша цель</h2>
        <p className="text-muted-foreground mt-1">Определяет вашу целевую калорийность</p>
      </div>
      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSelected(opt.value)}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors',
              selected === opt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            <span className="text-3xl">{opt.icon}</span>
            <div>
              <p className="font-semibold">{opt.label}</p>
              <p className="text-sm text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        ))}
      </div>
      <Button
        className="w-full"
        disabled={selected === null}
        onClick={() => selected && onNext({ goal: selected })}
      >
        Готово
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Create OnboardingResult**

Create `apps/mobile/src/features/onboarding/ui/OnboardingResult.tsx`:

```tsx
import { Button } from '@/shared/ui';
import type { DailyTargets } from '@ai-food/shared-types';

interface OnboardingResultProps {
  targets: DailyTargets;
  onStart: () => void;
}

export function OnboardingResult({ targets, onStart }: OnboardingResultProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ваша дневная норма</h2>
        <p className="text-muted-foreground mt-1">Рассчитана на основе ваших данных</p>
      </div>
      <div className="bg-primary/10 rounded-2xl p-6 text-center">
        <p className="text-5xl font-bold text-primary">{targets.kcal}</p>
        <p className="text-muted-foreground mt-1">ккал в день</p>
      </div>
      <div className="flex flex-col gap-3">
        {[
          { label: 'Белки', value: targets.protein, unit: 'г' },
          { label: 'Жиры', value: targets.fat, unit: 'г' },
          { label: 'Углеводы', value: targets.carbs, unit: 'г' },
        ].map((row) => (
          <div key={row.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold">
              {row.value} {row.unit}
            </span>
          </div>
        ))}
      </div>
      <Button className="w-full" size="lg" onClick={onStart}>
        Начать
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Commit step components**

```bash
git add apps/mobile/src/features/onboarding/ui/
git commit -m "feat(onboarding): add step components and result screen"
```

---

### Task 6: OnboardingPage wizard shell + barrel

**Files:**
- Create: `apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx`
- Create: `apps/mobile/src/features/onboarding/index.ts`
- Create: `apps/mobile/src/pages/onboarding/ui/OnboardingPage.tsx`
- Create: `apps/mobile/src/pages/onboarding/index.ts`

**Interfaces:**
- Consumes: `useOnboarding`, `useProfileStore`; all Step components; `OnboardingResult`
- Produces: `OnboardingPage` exported from `@/features/onboarding` and `@/pages/onboarding`

- [ ] **Step 1: Create feature OnboardingPage (wizard shell)**

Create `apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx`:

```tsx
import { useOnboarding } from '../model/useOnboarding';
import { useProfileStore } from '../model/useProfileStore';
import { calculateTargets } from '../model/calculateTargets';
import { StepGender } from './steps/StepGender';
import { StepAge } from './steps/StepAge';
import { StepHeight } from './steps/StepHeight';
import { StepWeight } from './steps/StepWeight';
import { StepActivity } from './steps/StepActivity';
import { StepGoal } from './steps/StepGoal';
import { OnboardingResult } from './OnboardingResult';
import type { UserProfile } from '@ai-food/shared-types';

const TOTAL_STEPS = 6;

export function OnboardingPage() {
  const { step, draft, next, back, finish } = useOnboarding();

  const isResult = step > TOTAL_STEPS;
  const targets = isResult ? calculateTargets(draft as UserProfile) : null;

  return (
    <div className="flex flex-col min-h-screen bg-background px-6 py-8">
      {!isResult && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {step > 1 && (
              <button
                onClick={back}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                ← Назад
              </button>
            )}
            <span className="ml-auto text-sm text-muted-foreground">
              {step} / {TOTAL_STEPS}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1">
        {step === 1 && <StepGender onNext={next} />}
        {step === 2 && <StepAge onNext={next} />}
        {step === 3 && <StepHeight onNext={next} />}
        {step === 4 && <StepWeight onNext={next} />}
        {step === 5 && <StepActivity onNext={next} />}
        {step === 6 && <StepGoal onNext={next} />}
        {isResult && targets && (
          <OnboardingResult targets={targets} onStart={finish} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create feature barrel**

Create `apps/mobile/src/features/onboarding/index.ts`:

```ts
export { OnboardingPage } from './ui/OnboardingPage';
export { useProfileStore } from './model/useProfileStore';
```

- [ ] **Step 3: Create page wrapper**

Create `apps/mobile/src/pages/onboarding/ui/OnboardingPage.tsx`:

```tsx
import { OnboardingPage as OnboardingFeature } from '@/features/onboarding';

export function OnboardingPage() {
  return <OnboardingFeature />;
}
```

- [ ] **Step 4: Create page barrel**

Create `apps/mobile/src/pages/onboarding/index.ts`:

```ts
export { OnboardingPage } from './ui/OnboardingPage';
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx \
        apps/mobile/src/features/onboarding/index.ts \
        apps/mobile/src/pages/onboarding/
git commit -m "feat(onboarding): add OnboardingPage wizard shell and barrels"
```

---

### Task 7: ProfileGuard + routing + DailyHeader update

**Files:**
- Create: `apps/mobile/src/app/ProfileGuard.tsx`
- Modify: `apps/mobile/src/app/router.tsx`
- Modify: `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`

**Interfaces:**
- Consumes: `useProfileStore` from `@/features/onboarding`; `OnboardingPage` from `@/pages/onboarding`

- [ ] **Step 1: Create ProfileGuard**

Create `apps/mobile/src/app/ProfileGuard.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useProfileStore } from '@/features/onboarding';

interface ProfileGuardProps {
  children: React.ReactNode;
}

export function ProfileGuard({ children }: ProfileGuardProps) {
  const isComplete = useProfileStore((s) => s.isComplete());
  if (!isComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 2: Update router**

Replace contents of `apps/mobile/src/app/router.tsx`:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from '@/pages/home';
import { AddFoodPage } from '@/pages/add-food';
import { ResultPage } from '@/pages/result';
import { DiaryPage } from '@/pages/diary';
import { OnboardingPage } from '@/pages/onboarding';
import { ProfileGuard } from './ProfileGuard';

const router = createBrowserRouter([
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> },
  { path: '/add', element: <ProfileGuard><AddFoodPage /></ProfileGuard> },
  { path: '/result', element: <ProfileGuard><ResultPage /></ProfileGuard> },
  { path: '/diary', element: <ProfileGuard><DiaryPage /></ProfileGuard> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 3: Update DailyHeader to use profile targets**

Replace contents of `apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx`:

```tsx
import { useDiaryStore } from '@/entities/meal';
import { useProfileStore } from '@/features/onboarding';
import { formatCalories } from '@/shared/lib';

export function DailyHeader() {
  const meals = useDiaryStore((s) => s.meals);
  const targets = useProfileStore((s) => s.targets);

  const dailyGoal = targets?.kcal ?? 2000;

  const today = new Date().toDateString();
  const todayCalories = meals
    .filter((m) => new Date(m.timestamp).toDateString() === today)
    .reduce((sum, m) => sum + m.totalCalories, 0);

  const remaining = dailyGoal - todayCalories;
  const progress = Math.min((todayCalories / dailyGoal) * 100, 100);

  return (
    <header className="bg-emerald-500 text-white px-4 pt-12 pb-6">
      <p className="text-emerald-100 text-sm font-medium">Today</p>
      <p className="text-4xl font-bold mt-1">{formatCalories(todayCalories)}</p>
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
    </header>
  );
}
```

- [ ] **Step 4: Run type-check**

```bash
pnpm --filter @ai-food/mobile type-check
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
pnpm --filter @ai-food/mobile test
```

Expected: all passing (including new onboarding tests).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/ProfileGuard.tsx \
        apps/mobile/src/app/router.tsx \
        apps/mobile/src/widgets/daily-header/ui/DailyHeader.tsx
git commit -m "feat(onboarding): wire ProfileGuard, routing, and DailyHeader to profile store"
```
