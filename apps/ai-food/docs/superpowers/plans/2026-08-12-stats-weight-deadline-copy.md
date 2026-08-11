# Stats weight deadline copy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На карточке прогресса веса в «Статистике» показывать срок цели в одной строке с остатком: `3.5 кг от цели · до 15 ноября 2026`.

**Architecture:** Чистый хелпер `formatWeightDeadlineCopy` в `weightProgress.ts` склеивает уже готовый `remainingCopy` с отформатированной датой. `StatsPage` прокидывает `profile.targetWeightDate` в `WeightProgressCard`. Store и бэкенд не трогаем.

**Tech Stack:** React, TypeScript, Vitest, FSD (`apps/ai-food`).

**Spec:** `apps/ai-food/docs/superpowers/specs/2026-08-12-stats-weight-deadline-copy-design.md`

## Global Constraints

- Разделитель: ` · ` (пробел · пробел)
- Префикс даты: `до `
- Формат даты: `new Date(\`${ymd}T12:00:00\`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })` — как в Settings
- При `reached === true` или пустой/отсутствующей дате — возвращать только `remaining` без суффикса
- `remainingCopy` не менять
- Не редактировать `targetWeightDate` со статистики
- Не менять `useWeightStore` / серверный контракт

## File map

| File | Role |
|------|------|
| `apps/ai-food/src/features/stats/model/weightProgress.ts` | хелпер `formatWeightDeadlineCopy` |
| `apps/ai-food/src/features/stats/model/weightProgress.test.ts` | unit-тесты хелпера |
| `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx` | prop + вызов хелпера |
| `apps/ai-food/src/pages/stats/ui/StatsPage.tsx` | проброс `profile.targetWeightDate` |

---

### Task 1: `formatWeightDeadlineCopy` + unit tests

**Files:**
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.ts`
- Modify: `apps/ai-food/src/features/stats/model/weightProgress.test.ts`

**Interfaces:**
- Produces: `formatWeightDeadlineCopy(remaining: string, targetWeightDate: string | null | undefined, reached: boolean): string`

- [x] **Step 1: Write the failing tests**

Append to `weightProgress.test.ts` (import `formatWeightDeadlineCopy`):

```ts
describe('formatWeightDeadlineCopy', () => {
  it('appends deadline when not reached and date present', () => {
    const formatted = new Date('2026-11-15T12:00:00').toLocaleDateString(
      'ru-RU',
      { day: 'numeric', month: 'long', year: 'numeric' },
    );
    expect(
      formatWeightDeadlineCopy('3.5 кг от цели', '2026-11-15', false),
    ).toBe(`3.5 кг от цели · до ${formatted}`);
  });

  it('returns remaining only when reached', () => {
    expect(
      formatWeightDeadlineCopy('Цель достигнута', '2026-11-15', true),
    ).toBe('Цель достигнута');
  });

  it('returns remaining only when date missing', () => {
    expect(formatWeightDeadlineCopy('8.0 кг осталось', null, false)).toBe(
      '8.0 кг осталось',
    );
    expect(formatWeightDeadlineCopy('8.0 кг осталось', '', false)).toBe(
      '8.0 кг осталось',
    );
    expect(
      formatWeightDeadlineCopy('8.0 кг осталось', undefined, false),
    ).toBe('8.0 кг осталось');
  });
});
```

- [x] **Step 2: Run tests — expect FAIL**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

Expected: FAIL — `formatWeightDeadlineCopy` is not exported / not defined.

- [x] **Step 3: Implement helper**

Add to `weightProgress.ts`:

```ts
/** Append « · до <ru date>» when deadline exists and goal not yet reached. */
export function formatWeightDeadlineCopy(
  remaining: string,
  targetWeightDate: string | null | undefined,
  reached: boolean,
): string {
  if (reached) return remaining;
  const ymd = targetWeightDate?.trim();
  if (!ymd) return remaining;
  const formatted = new Date(`${ymd}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${remaining} · до ${formatted}`;
}
```

- [x] **Step 4: Run tests — expect PASS**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

Expected: all tests PASS.

- [x] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/stats/model/weightProgress.ts apps/ai-food/src/features/stats/model/weightProgress.test.ts
git commit -m "$(cat <<'EOF'
feat(stats): format weight goal deadline into remaining copy

EOF
)"
```

On Windows PowerShell, if heredoc fails, use:

```powershell
git commit -m "feat(stats): format weight goal deadline into remaining copy"
```

---

### Task 2: Wire `WeightProgressCard` + `StatsPage`

**Files:**
- Modify: `apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx`
- Modify: `apps/ai-food/src/pages/stats/ui/StatsPage.tsx`

**Interfaces:**
- Consumes: `formatWeightDeadlineCopy` from Task 1
- Produces: prop `profileTargetWeightDate?: string | null` on `WeightProgressCard`

- [x] **Step 1: Update `WeightProgressCard`**

1. Import `formatWeightDeadlineCopy` from `../model/weightProgress` (alongside existing imports).
2. Add to props interface:

```ts
  /** Deadline YYYY-MM-DD from profile; shown next to remaining copy. */
  profileTargetWeightDate?: string | null;
```

3. Destructure with default `null`:

```ts
  profileTargetWeightDate = null,
```

4. Replace the remaining paragraph body — compute once:

```ts
  const remaining = remainingCopy(
    currentKg,
    effectiveGoal,
    profileGoal,
    entries,
  );
  const progressLine = formatWeightDeadlineCopy(
    remaining,
    profileTargetWeightDate,
    reached,
  );
```

5. In JSX, use `{progressLine}` instead of calling `remainingCopy(...)` inline.

- [x] **Step 2: Update `StatsPage`**

Pass the date:

```tsx
        <WeightProgressCard
          profileWeight={profile.weight}
          profileGoal={profile.goal}
          profileTargetWeight={profile.targetWeight}
          profileTargetWeightDate={profile.targetWeightDate}
          onTargetWeightChange={(kg) => {
            updateTargetWeight(kg);
            syncNutritionProfileToServer();
          }}
        />
```

- [x] **Step 3: Type-check**

```bash
cd apps/ai-food && pnpm exec tsc --noEmit
```

Expected: exit 0 (or no errors in touched files).

- [x] **Step 4: Re-run unit tests**

```bash
cd apps/ai-food && pnpm exec vitest run src/features/stats/model/weightProgress.test.ts
```

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/stats/ui/WeightProgressCard.tsx apps/ai-food/src/pages/stats/ui/StatsPage.tsx
git commit -m "$(cat <<'EOF'
feat(stats): show target weight deadline on progress card

EOF
)"
```

PowerShell fallback:

```powershell
git commit -m "feat(stats): show target weight deadline on progress card"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Одна строка `остаток · до дата` | 1 + 2 |
| Hide when reached | 1 |
| Legacy без даты | 1 |
| Формат как Settings | 1 |
| `remainingCopy` unchanged | 1 (constraint) |
| StatsPage wiring | 2 |
| No store/backend changes | — (out of scope) |
