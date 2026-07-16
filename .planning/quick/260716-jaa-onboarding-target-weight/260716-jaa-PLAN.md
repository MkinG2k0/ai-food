---
phase: quick-260716-jaa
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/shared-types/src/index.ts
  - apps/mobile/src/features/onboarding/model/useOnboarding.ts
  - apps/mobile/src/features/onboarding/model/useOnboarding.test.ts
  - apps/mobile/src/features/onboarding/model/useProfileStore.test.ts
  - apps/mobile/src/features/onboarding/model/calculateTargets.test.ts
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
  - apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts
  - apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
  - apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx
  - apps/mobile/src/pages/settings/ui/SettingsPage.tsx
autonomous: true
requirements:
  - QUICK-jaa

must_haves:
  truths:
    - "После выбора цели (lose/maintain/gain) пользователь видит шаг «желаемый вес» перед типом питания."
    - "targetWeight (кг) сохраняется в UserProfile через finish() вместе с остальным профилем."
    - "При goal=maintain поле желаемого веса предзаполнено текущим weight; пользователь может подтвердить или изменить."
    - "Формулы calculateTargets по-прежнему считают КБЖУ от текущего weight; targetWeight не ломает legacy-профили без поля."
  artifacts:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
    - apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx
  key_links:
    - "OnboardingPage step after StepGoal → StepTargetWeight → StepDiet → OnboardingResult"
    - "useOnboarding.finish required includes targetWeight → setProfile(profile)"
    - "micronutrientTargetsApi userText includes targetWeight when present"
---

<objective>
Добавить в онбординг шаг желаемого веса (`targetWeight`) и поставить его по смыслу: после текущего веса и после выбора цели.

Purpose: Пользователь явно задаёт целевой вес в контексте lose/maintain/gain; значение персистится в профиле.

Output: Поле `targetWeight` в `UserProfile`, UI-шаг `StepTargetWeight`, обновлённый порядок шагов (TOTAL_STEPS=8), тесты и строка в Settings; лёгкий проброс в micronutrient API без пересчёта макросов.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/PROJECT.md
@packages/shared-types/src/index.ts
@apps/mobile/src/features/onboarding/model/useOnboarding.ts
@apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx
@apps/mobile/src/features/onboarding/ui/steps/StepWeight.tsx
@apps/mobile/src/features/onboarding/ui/steps/StepGoal.tsx
@apps/mobile/src/features/onboarding/model/calculateTargets.ts
@apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
@apps/mobile/src/pages/settings/ui/SettingsPage.tsx

## Current step order (before change)

1 Gender → 2 Age → 3 Height → 4 Weight → 5 Activity → 6 Goal → 7 Diet → Result

## Locked decisions

- **D-01:** Новый шаг сразу после `StepGoal` и до `StepDiet` (после текущего веса и цели). Итоговый порядок: … Weight → Activity → Goal → **TargetWeight** → Diet → Result. `TOTAL_STEPS = 8`.
- **D-02:** Персистить `targetWeight: number` (кг) на `UserProfile` рядом с `weight`.
- **D-03:** UI по паттерну `StepWeight` + `NumericRangeInput` / `useNumericRangeInput`; русский копирайт.
- **D-04:** При `goal === 'maintain'` предзаполнить желаемый вес = текущий `draft.weight`, дать подтвердить/редактировать (не пропускать шаг).
- **D-05:** В `micronutrientTargetsApi` добавить `targetWeight` в строку профиля для AI-контекста. **Не** менять формулы `calculateTargets` (макросы от текущего `weight`).
- **D-06:** Только желаемый вес в онбординге — без vitamin norms redesign, photo tips, no-food detection.

## Discretion

- Диапазон слайдера: те же MIN/MAX что у веса (40–160), если иное не нужно для UX.
- Для lose/gain: разумный default стартового значения (например текущий weight) — на усмотрение executor; для maintain — строго D-04.
- Legacy-профили без `targetWeight`: `isComplete()` остаётся true; Settings показывает желаемый вес только если поле есть (или fallback на weight — на усмотрение, без миграции store).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: UserProfile.targetWeight + finish validation</name>
  <files>packages/shared-types/src/index.ts, apps/mobile/src/features/onboarding/model/useOnboarding.ts, apps/mobile/src/features/onboarding/model/useOnboarding.test.ts, apps/mobile/src/features/onboarding/model/useProfileStore.test.ts, apps/mobile/src/features/onboarding/model/calculateTargets.test.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts</files>
  <behavior>
    - finish() без targetWeight не вызывает setProfile / navigate
    - finish() с полным draft включая targetWeight вызывает setProfile с profile.targetWeight
    - mock-профили в тестах содержат targetWeight: number
    - micronutrientTargetsApi userText содержит targetWeight=… при наличии поля
  </behavior>
  <action>
    Per D-02, D-05, D-06:

    1. В `packages/shared-types/src/index.ts` добавить в `UserProfile` поле `targetWeight: number` (кг, рядом с `weight`).
    2. В `useOnboarding.finish` добавить `'targetWeight'` в массив `required` ключей.
    3. Обновить все тестовые/mock `UserProfile` объекты (useOnboarding, useProfileStore, calculateTargets, micronutrientTargetsApi), чтобы TypeScript и тесты проходили с новым полем.
    4. В `useOnboarding.test.ts`: в happy-path `next()` добавить вызов с `{ targetWeight: … }` (после goal, до dietType); добавить/обновить кейс что без `targetWeight` finish — no-op.
    5. Per D-05: в `micronutrientTargetsApi` включить `targetWeight=${profile.targetWeight}` в `userText` (и при желании упомянуть в SYSTEM_PROMPT рядом с weight — без смены контракта ответа). Не менять `calculateTargets.ts` формулы.
    6. Не трогать UI шагов в этом таске (кроме типов, которые могут временно ломать OnboardingPage до Task 2 — выполнить Task 1 и Task 2 в одной сессии подряд).
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/model/useOnboarding.test.ts src/features/onboarding/model/useProfileStore.test.ts src/features/onboarding/model/calculateTargets.test.ts src/features/onboarding/api/micronutrientTargetsApi.test.ts</automated>
  </verify>
  <done>
    `targetWeight` в типе и required finish; тесты модели/API зелёные; calculateTargets без изменения формул.
  </done>
</task>

<task type="auto">
  <name>Task 2: StepTargetWeight + порядок шагов онбординга</name>
  <files>apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx, apps/mobile/src/features/onboarding/ui/OnboardingPage.tsx, apps/mobile/src/pages/settings/ui/SettingsPage.tsx</files>
  <action>
    Per D-01, D-03, D-04, D-06:

    1. Создать `StepTargetWeight.tsx` по образцу `StepWeight.tsx`:
       - Props: onNext принимает Pick UserProfile targetWeight; плюс currentWeight: number и goal: Goal (из draft в OnboardingPage).
       - `OnboardingStepHeader` с русским заголовком вроде «Желаемый вес»; emoji на усмотрение.
       - `useNumericRangeInput` + `NumericRangeInput`, unit «кг», диапазон как у веса (40–160).
       - Initial value: если `goal === 'maintain'` → `currentWeight` (D-04); иначе разумный default (допустимо `currentWeight`).
       - Кнопка «Далее» → `onNext({ targetWeight: getCommittedValue() })`.
    2. В `OnboardingPage.tsx` per D-01:
       - `TOTAL_STEPS = 8`.
       - step 1–6 без изменений (Gender…Goal).
       - step 7 → `StepTargetWeight` с `currentWeight={draft.weight!}` / `goal={draft.goal!}` (к этому моменту оба уже в draft).
       - step 8 → `StepDiet` (сдвинуть с 7).
       - Result по-прежнему при `step > TOTAL_STEPS`.
    3. В `SettingsPage` после строки «Вес» показать «Желаемый вес» с `profile.targetWeight` (если отсутствует у legacy — не падать: optional chaining / не рендерить строку).
    4. Не добавлять barrel-export шага (шаги импортируются локально в OnboardingPage, как сейчас). Не менять analyze/refine/no-food/photo tips.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec tsc --noEmit && pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/model/useOnboarding.test.ts</automated>
  </verify>
  <done>
    Онбординг: Goal → Желаемый вес → Diet → Result; Settings показывает желаемый вес; type-check зелёный.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client UI → local profile store | Пользовательский ввод веса персистится в capacitorStorage/localStorage |
| profile → AI Gateway | targetWeight уходит в текст запроса micronutrient norms |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jaa-01 | Information Disclosure | micronutrientTargetsApi userText | low | accept | Уже отправлялись gender/age/weight; targetWeight — тот же класс PII на клиентском gateway |
| T-jaa-02 | Tampering | useNumericRangeInput range | low | mitigate | Клампать ввод к MIN/MAX как в StepWeight |
| T-jaa-03 | Elevation of Privilege | N/A | low | accept | Нет auth / серверного профиля в MVP |
| T-jaa-SC | Tampering | npm installs | low | accept | Новых пакетов нет |
</threat_model>

<verification>
- vitest: useOnboarding, useProfileStore, calculateTargets, micronutrientTargetsApi
- `tsc --noEmit` для `@ai-food/mobile`
- Ручной smoke: Goal → желаемый вес (maintain ≈ текущий) → Diet → Result → Settings видит желаемый вес
</verification>

<success_criteria>
- Шаг желаемого веса стоит после Goal и до Diet (D-01)
- `targetWeight` в UserProfile и required для finish (D-02)
- UI на паттерне StepWeight, русский текст (D-03)
- maintain: prefill = current weight (D-04)
- micronutrient API получает targetWeight; макро-формулы не тронуты (D-05)
- Scope только target weight (D-06)
</success_criteria>

<output>
Create `.planning/quick/260716-jaa-onboarding-target-weight/260716-jaa-SUMMARY.md` when done
</output>
