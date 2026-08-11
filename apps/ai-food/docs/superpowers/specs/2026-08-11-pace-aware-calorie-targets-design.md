# Pace-aware calorie targets — Design

**Date:** 2026-08-11  
**Project:** AI Food (`apps/ai-food`)  
**Status:** Approved (discussion)

## Problem

Онбординг собирает `targetWeight` и `targetWeightDate`, но `calculateTargets` их игнорирует.
Поправка к TDEE фиксированная: `lose −300` / `maintain 0` / `gain +300`.
Агрессивные сроки (например «+10 кг к завтра») сейчас никак не обрабатываются — дата просто не влияет.

## Goals

1. Дневная норма ккал учитывает **разницу веса** и **срок до даты**.
2. Использовать **консервативную** оценку (безопаснее классических 7700 ккал/кг).
3. Нереалистичный темп → **клип** дневной поправки + **предупреждение** в UI (не блок шага).
4. Сохранить текущую схему макросов (protein / fat / carbs / fiber) от итогового `kcal`.

## Non-goals

- Динамический ежедневный пересчёт «оставшиеся кг / оставшиеся дни» после онбординга.
- Автопересчёт `targets` при изменении веса/даты в настройках (показ полей остаётся; ручной `updateTargets` без автоформулы).
- Медицинские рекомендации, консультации врача, персональные исключения.
- Изменение API gateway / серверного nutrition profile schema сверх уже существующих полей профиля.
- Замена шага `goal` — поле остаётся в профиле как намерение пользователя.

## Decisions

| Тема | Решение |
|------|---------|
| Подход | Формула внутри `calculateTargets` (+ хелпер темпа) — вариант A |
| ккал на 1 кг | **7000** (консервативнее 7700) |
| Клип дневной поправки | **−500 … +300** ккал |
| Пол ккал | `kcal = max(round(TDEE) + clampedDelta, round(BMR))` |
| Источник знака | `deltaKg = targetWeight − weight` (не фиксированный `GOAL_DELTA`) |
| Почти тот же вес | `|deltaKg| < 0.5` кг → поправка **0** (maintain по факту) |
| Нереальный срок | raw delta вне клипа → клип + `paceWarning` |
| UX при клипе | Баннер на шаге веса/даты (live) и на `OnboardingResult` |
| `goal` enum | Не двигает ккал; может использоваться только для копирайта/согласованности UI |
| Настройки | Без автопересчёта в этой фазе |

## Formula

```
BMR     = Mifflin–St Jeor (как сейчас)
TDEE    = BMR × activityMultiplier
days    = max(1, calendarDaysUntil(targetWeightDate))  // дата в будущем уже валидируется шагом
deltaKg = targetWeight − weight

if |deltaKg| < 0.5:
  rawDelta = 0
else:
  rawDelta = round(deltaKg × 7000 / days)

clampedDelta = clamp(rawDelta, −500, +300)
paceClamped  = clampedDelta !== rawDelta

kcal = max(round(TDEE) + clampedDelta, round(BMR))
```

Макросы без изменения логики:

- `protein = round(weight × 1.8)`
- `fat = round((kcal × 0.25) / 9)`
- `carbs = round((kcal − protein×4 − fat×9) / 4)`
- `fiber = 30`

### Example: +10 кг к завтра

- `deltaKg = 10`, `days = 1` → `rawDelta = 70000`
- `clampedDelta = +300`
- `paceClamped = true` → показать предупреждение
- норма ≈ `round(TDEE) + 300` (не ниже BMR)

### Example: −5 кг за 90 дней

- `rawDelta = round(−5 × 7000 / 90) = −389` → внутри клипа, без warning

## API / types

Расширить возврат расчёта (предпочтительно отдельный результат, не ломая `DailyTargets`):

```ts
type PaceWarning = {
  rawDeltaKcal: number;
  clampedDeltaKcal: number;
  /** true when clamp applied */
  clamped: boolean;
};

type CalculateTargetsResult = {
  targets: DailyTargets;
  pace: PaceWarning;
};
```

В `useProfileStore` по-прежнему храним только `DailyTargets` (и профиль).  
`paceWarning` — эфемерный для онбординг-UI; **не** персистить в persist, если нет отдельной нужды.

Альтернатива (хуже): флаг в store — out of scope.

Публичный хелпер для live-preview на шаге:

```ts
function evaluateWeightPace(input: {
  weight: number;
  targetWeight: number;
  targetWeightDate: string; // YYYY-MM-DD
  now?: Date;
}): PaceWarning & { deltaKg: number; days: number }
```

`calculateTargets(profile)` вызывает ту же логику delta/clamp.

## UI

### `StepTargetWeight`

После выбора веса и даты (если дата валидна):

- если `pace.clamped` — компактный баннер (muted / warning), например:  
  «За выбранный срок такой темп небезопасен или нереален. Считаем безопасную поправку к калориям (−500…+300 ккал/день).»
- кнопка «Далее» **не** блокируется (дата по-прежнему должна быть будущим днём).

### `OnboardingResult`

- Показать `targets.kcal` как сейчас.
- Если при расчёте был clamp — тот же смысл предупреждения под ккал (короче).

Копирайт можно вынести в константу рядом с формулой, чтобы шаг и результат совпадали по смыслу.

## Call sites

| Место | Поведение |
|-------|-----------|
| `OnboardingPage` preview | `calculateTargets(draft)` → targets + pace для Result |
| `useOnboarding.completeWithProfile` | `calculateTargets(profile)` → `setProfile(profile, targets)` |
| `StepTargetWeight` | `evaluateWeightPace` для live warning |
| Settings / DailyHeader | без изменений (читают `targets.kcal`) |

Удалить неиспользуемый `GOAL_DELTA` из формулы ккал (или оставить закомментированным нельзя — удалить / не использовать).

## Tests

Обновить / добавить в `calculateTargets.test.ts` (и при выносе — `evaluateWeightPace.test.ts`):

1. maintain-like: `|deltaKg| < 0.5` → delta 0, без clamp.
2. умеренное снижение за ~90 дней → raw внутри клипа.
3. **+10 кг / 1 день** → clamped +300, `clamped: true`.
4. агрессивное снижение (большой минус за 1–7 дней) → clamped −500, `clamped: true`.
5. пол: TDEE + delta не уходит ниже `round(BMR)`.
6. макросы — целые числа; fiber 30.
7. регрессия: male/female BMR и activity multipliers как сейчас.

## Migration / existing users

Уже сохранённые `targets` **не** пересчитываются автоматически.  
Новый расчёт только при новом онбординге / `completeWithProfile`.  
(Пересчёт в настройках — отдельная фаза, non-goal.)

## Risks

- Пользователь с `goal: gain` и целевым весом ниже текущего получит дефицит по `deltaKg` — это осознанно (вес важнее enum).
- Клип +300 при наборе медленный для больших целей — ожидаемо для «безопасного» режима; warning объясняет.
- Расхождение `goal` и фактического знака delta — допустимо; при желании позже подсветить на шаге цели.
