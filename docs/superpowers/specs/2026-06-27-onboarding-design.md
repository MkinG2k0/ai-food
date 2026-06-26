# Onboarding Screen Design

**Date:** 2026-06-27
**Project:** AI Food
**Status:** Approved

## Overview

Wizard-based onboarding that collects user profile data (gender, age, height, weight, activity level, goal) to calculate a personalised daily КБЖУ target. Shown only on first app open; data stored in localStorage via Zustand persist.

## Goals

- Replace the hardcoded `DAILY_GOAL` constant with a user-specific calculated target
- Collect the minimum data required for Mifflin-St Jeor TDEE calculation
- Provide a smooth, mobile-first step-by-step experience before the user sees the diary

## Non-Goals

- No skip/bypass option (profile is required to use the app)
- No account or server sync — localStorage only
- No ability to edit profile after onboarding in this phase

## User Flow

```
First visit → /onboarding (wizard, 6 steps) → Result screen → /
Subsequent visits → ProfileGuard passes → /
```

## Wizard Steps

| Step | Component | Input type | Range |
|------|-----------|-----------|-------|
| 1 | StepGender | Cards (Мужской / Женский) | — |
| 2 | StepAge | Slider + number input | 15–80 лет |
| 3 | StepHeight | Slider + number input | 140–220 см |
| 4 | StepWeight | Slider + number input | 40–160 кг |
| 5 | StepActivity | Cards (3 options) | — |
| 6 | StepGoal | Cards (3 options) | — |
| — | OnboardingResult | Display only | — |

### Activity Levels

| Value | Label | Description | Multiplier |
|-------|-------|-------------|-----------|
| `low` | Низкая | Сидячая работа, редко хожу в зал | 1.2 |
| `medium` | Средняя | Тренировки 2–4 раза в неделю | 1.55 |
| `high` | Высокая | Ежедневные тренировки или физический труд | 1.725 |

### Goals

| Value | Label | Calorie delta |
|-------|-------|--------------|
| `lose` | Похудеть | −300 ккал |
| `maintain` | Удержать | 0 ккал |
| `gain` | Набрать | +300 ккал |

## Architecture

### File Structure (FSD)

```
packages/shared-types/src/index.ts      # UserProfile, DailyTargets, ActivityLevel, Goal

features/onboarding/
  model/
    useProfileStore.ts                  # Zustand + persist → 'ai-food-profile'
    useOnboarding.ts                    # step state, draft, next/back/finish
  ui/
    OnboardingPage.tsx                  # wizard shell: progress bar, back button, step renderer
    steps/
      StepGender.tsx
      StepAge.tsx
      StepHeight.tsx
      StepWeight.tsx
      StepActivity.tsx
      StepGoal.tsx
    OnboardingResult.tsx                # final screen with calculated КБЖУ
  index.ts

pages/onboarding/
  ui/OnboardingPage.tsx                 # thin route wrapper
  index.ts
```

### Shared Types

```ts
interface UserProfile {
  gender: 'male' | 'female';
  age: number;      // years
  height: number;   // cm
  weight: number;   // kg
  activity: 'low' | 'medium' | 'high';
  goal: 'lose' | 'maintain' | 'gain';
}

interface DailyTargets {
  kcal: number;
  protein: number;  // g
  fat: number;      // g
  carbs: number;    // g
}
```

### Store

```ts
// useProfileStore.ts
interface ProfileState {
  profile: UserProfile | null;
  targets: DailyTargets | null;
  setProfile: (profile: UserProfile, targets: DailyTargets) => void;
  isComplete: () => boolean;
}
// persisted to localStorage key: 'ai-food-profile'
```

### Wizard Hook

```ts
// useOnboarding.ts
// - step: number (1–6), controls which StepX component renders
// - draft: Partial<UserProfile>, accumulates answers
// - next(data) — merge data into draft, increment step
// - back() — decrement step
// - finish() — calculate targets, call setProfile, navigate to /
```

## Calculation (Mifflin-St Jeor)

```
BMR (male)   = 10×weight + 6.25×height − 5×age + 5
BMR (female) = 10×weight + 6.25×height − 5×age − 161

TDEE = BMR × activity_multiplier

kcal_target = TDEE + goal_delta   // −300 / 0 / +300

protein = weight × 1.8            // g  (from body weight)
fat     = kcal_target × 0.25 / 9 // g  (25% of calories)
carbs   = (kcal_target − protein×4 − fat×9) / 4  // g  (remainder)
```

All values rounded to nearest integer.

## Routing

**New route:** `/onboarding` → `OnboardingPage`

**ProfileGuard** wraps the `HomePage` route:
```tsx
{ path: '/', element: <ProfileGuard><HomePage /></ProfileGuard> }
```
`ProfileGuard` calls `useProfileStore().isComplete()` — if false, renders `<Navigate to="/onboarding" replace />`.

## UI Design

### Wizard Shell

- Full-screen layout, no bottom navigation
- Top: progress bar (6 segments, filled up to current step) + step counter "2 / 6"
- Back button (←) visible on steps 2–6, hidden on step 1
- Center: current step content
- Bottom: "Далее" / "Готово" button, disabled until a value is selected

### Card Selection (Gender / Activity / Goal)

- Uses `Card` from `shared/ui`
- Selected state: `border-primary bg-primary/10`
- Each card: icon + title + short description
- Tap to select, then "Далее" becomes enabled

### Slider + Number Input (Age / Height / Weight)

- Native `<input type="range">` styled with Tailwind
- `<input type="number">` synced bidirectionally
- Unit label beside input (лет / см / кг)
- Clamped to allowed range in both directions

### Result Screen (OnboardingResult)

- Heading: "Ваша дневная норма"
- Large kcal value (primary emphasis)
- Three rows: Белки / Жиры / Углеводы in grams
- Reuses `NutritionCard` or equivalent widget from `widgets/nutrition-card`
- Single CTA button: "Начать"

## Testing

- Unit test for TDEE calculation function (pure function, no React dependency)
- Unit test for `useProfileStore` — setProfile, isComplete
- Unit test for `useOnboarding` — next/back step transitions, draft accumulation
- Integration: `ProfileGuard` redirects when profile is null, passes through when complete
