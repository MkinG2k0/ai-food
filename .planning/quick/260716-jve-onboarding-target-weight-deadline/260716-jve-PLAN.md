---
phase: quick-260716-jve
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
  - apps/mobile/src/pages/settings/ui/SettingsPage.tsx
autonomous: true
requirements:
  - QUICK-jve

must_haves:
  truths:
    - "На шаге «Желаемый вес» пользователь задаёт целевую дату (до какого числа достичь веса)."
    - "Дата валидируется: только день строго после сегодня; без валидной даты «Далее» недоступна."
    - "targetWeightDate сохраняется в UserProfile через finish() и персистится в ai-food-profile (Zustand persist)."
    - "micronutrientTargetsApi userText включает targetWeightDate рядом с targetWeight."
    - "Settings показывает целевую дату рядом с желаемым весом (если поле есть)."
  artifacts:
    - packages/shared-types/src/index.ts
    - apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
  key_links:
    - "StepTargetWeight onNext → { targetWeight, targetWeightDate } → draft → finish required"
    - "useOnboarding.finish required includes targetWeightDate → setProfile"
    - "micronutrientTargetsApi userText includes targetWeightDate=YYYY-MM-DD"
---

<objective>
Добавить на шаг онбординга «Желаемый вес» поле целевой даты (до какого числа добиться веса) и персистить его в профиле.

Purpose: Пользователь задаёт не только кг, но и срок; AI-контекст микронутриентов и Settings получают ту же дату.

Output: `UserProfile.targetWeightDate` (YYYY-MM-DD), UI date input на `StepTargetWeight`, валидация «строго после сегодня», проброс в micronutrient prompt, строка в Settings, обновлённые тесты.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/shared-types/src/index.ts
@apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx
@apps/mobile/src/features/onboarding/model/useOnboarding.ts
@apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts
@apps/mobile/src/pages/settings/ui/SettingsPage.tsx
@apps/mobile/src/features/stats/ui/LogWeightSheet.tsx
@apps/mobile/src/shared/lib/dateUtils.ts

## Locked decisions (from quick task brief)

- **D-01:** Поле целевой даты на том же шаге, что и желаемый вес (`StepTargetWeight`), не отдельный шаг онбординга. `TOTAL_STEPS` не менять.
- **D-02:** Персистить `targetWeightDate: string` в формате `YYYY-MM-DD` (значение native `input type="date"`) на `UserProfile` рядом с `targetWeight`.
- **D-03:** Валидация: дата должна быть **строго после сегодня** (переиспользовать `isFutureDay` из `@/shared/lib`). Кнопка «Далее» disabled / no-op без валидной даты.
- **D-04:** `useOnboarding.finish` требует `targetWeightDate` в `required` вместе с `targetWeight`.
- **D-05:** В `micronutrientTargetsApi` добавить `targetWeightDate=${profile.targetWeightDate}` в `userText` (и кратко упомянуть в SYSTEM_PROMPT рядом с targetWeight). Не менять `calculateTargets`.
- **D-06:** Settings: показать целевую дату рядом с «Желаемый вес» (русский лейбл вроде «К дате» / «Срок»). Legacy без поля — не падать.
- **D-07:** Scope только deadline на target-weight шаге — без redesign витамин/макросов, без новых npm-пакетов, без отдельного экрана.

## Discretion

- Default даты: разумный future default (например +90 календарных дней) — на усмотрение executor.
- Русский копирайт лейбла: «До какого числа» или «Целевая дата» — на усмотрение, тон как у остальных шагов.
- Стили date input: повторить паттерн `LogWeightSheet` (`type="date"`, border/rounded), но с `min` = завтра (не max=today).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: UserProfile.targetWeightDate + finish + AI prompt + fixtures</name>
  <files>packages/shared-types/src/index.ts, apps/mobile/src/features/onboarding/model/useOnboarding.ts, apps/mobile/src/features/onboarding/model/useOnboarding.test.ts, apps/mobile/src/features/onboarding/model/useProfileStore.test.ts, apps/mobile/src/features/onboarding/model/calculateTargets.test.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.ts, apps/mobile/src/features/onboarding/api/micronutrientTargetsApi.test.ts</files>
  <behavior>
    - finish() без targetWeightDate не вызывает setProfile / navigate
    - finish() с полным draft включая targetWeightDate вызывает setProfile с profile.targetWeightDate
    - все mock UserProfile содержат targetWeightDate: 'YYYY-MM-DD'
    - micronutrientTargetsApi userText содержит targetWeightDate=…
  </behavior>
  <action>
    Per D-02, D-04, D-05, D-07:

    1. В `packages/shared-types/src/index.ts` добавить в `UserProfile` поле `targetWeightDate: string` (ISO calendar date YYYY-MM-DD; JSDoc: deadline to reach targetWeight). Рядом с `targetWeight`.
    2. В `useOnboarding.finish` добавить `'targetWeightDate'` в массив `required`.
    3. Обновить все тестовые/mock объекты `UserProfile` (useOnboarding, useProfileStore, calculateTargets, micronutrientTargetsApi) — добавить `targetWeightDate` (например `'2026-10-16'` или любая валидная future ISO date-string для фикстур).
    4. В `useOnboarding.test.ts`: happy-path `next()` после targetWeight передавать `{ targetWeightDate: '…' }` (можно одним `next({ targetWeight, targetWeightDate })` если удобнее — но текущий паттерн шаг-за-шагом: отдельный next с датой или расширить объект targetWeight-шага). Добавить кейс: без `targetWeightDate` finish — no-op (аналог without targetWeight).
    5. Per D-05: в `micronutrientTargetsApi` включить `targetWeightDate=${profile.targetWeightDate}` в `userText` сразу после `targetWeight=…`; в SYSTEM_PROMPT упомянуть targetWeightDate в списке adjustment factors. Не менять `calculateTargets.ts`.
    6. UI `StepTargetWeight` в этом таске не трогать (типы могут временно расходиться до Task 2 — выполнить оба таска подряд в одной сессии).
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/model/useOnboarding.test.ts src/features/onboarding/model/useProfileStore.test.ts src/features/onboarding/model/calculateTargets.test.ts src/features/onboarding/api/micronutrientTargetsApi.test.ts</automated>
  </verify>
  <done>
    targetWeightDate в типе и required finish; тесты модели/API зелёные; calculateTargets формулы не тронуты.
  </done>
</task>

<task type="auto">
  <name>Task 2: StepTargetWeight date UI + Settings</name>
  <files>apps/mobile/src/features/onboarding/ui/steps/StepTargetWeight.tsx, apps/mobile/src/pages/settings/ui/SettingsPage.tsx</files>
  <action>
    Per D-01, D-03, D-06, D-07:

    1. Расширить `StepTargetWeight`:
       - `onNext` принимает Pick от UserProfile по ключам targetWeight и targetWeightDate.
       - Под NumericRangeInput добавить label (русский, напр. «До какого числа») + `input type="date"` по стилю `LogWeightSheet`.
       - State для даты: local `useState` со строкой YYYY-MM-DD; default — future date (discretion: +90 дней).
       - `min` на input = завтра (YYYY-MM-DD локальной зоны). Валидность: парсить выбранную дату и проверять через `isFutureDay` из `@/shared/lib` (D-03).
       - Кнопка «Далее»: disabled если дата пустая или не `isFutureDay`; onClick → `onNext({ targetWeight: getCommittedValue(), targetWeightDate })`.
       - Короткий helper-текст при ошибке/пустой дате не обязателен; disabled кнопки достаточно.
    2. В `SettingsPage` рядом с блоком «Желаемый вес»: если есть `profile.targetWeightDate`, показать строку (лейбл «Срок» или «К дате») с датой, отформатированной через `toLocaleDateString('ru-RU', …)` для читаемости. Legacy без поля — не рендерить.
    3. Не менять порядок шагов / TOTAL_STEPS. Не добавлять npm-пакеты. Не трогать analyze/refine.
  </action>
  <verify>
    <automated>pnpm --filter @ai-food/mobile exec tsc --noEmit && pnpm --filter @ai-food/mobile exec vitest run src/features/onboarding/model/useOnboarding.test.ts src/features/onboarding/api/micronutrientTargetsApi.test.ts</automated>
  </verify>
  <done>
    Шаг желаемого веса собирает кг + целевую дату с future-валидацией; Settings показывает срок; type-check зелёный.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client UI → local profile store | Пользовательский ввод даты персистится в capacitorStorage/localStorage |
| profile → AI Gateway | targetWeightDate уходит в текст запроса micronutrient norms |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jve-01 | Tampering | StepTargetWeight date input | low | mitigate | Клиентская валидация isFutureDay + min=tomorrow; disabled Далее |
| T-jve-02 | Information Disclosure | micronutrientTargetsApi userText | low | accept | Тот же класс PII что weight/targetWeight на клиентском gateway |
| T-jve-03 | Elevation of Privilege | N/A | low | accept | Нет auth / серверного профиля в MVP |
| T-jve-SC | Tampering | npm installs | low | accept | Новых пакетов нет |
</threat_model>

<verification>
- vitest: useOnboarding, useProfileStore, calculateTargets, micronutrientTargetsApi
- `tsc --noEmit` для `@ai-food/mobile`
- Ручной smoke: онбординг → желаемый вес + дата в будущем → Diet → Result → Settings видит срок; дата ≤ сегодня блокирует Далее
</verification>

<success_criteria>
- На StepTargetWeight есть поле целевой даты (D-01)
- targetWeightDate YYYY-MM-DD в UserProfile и persist через finish (D-02, D-04)
- Дата строго после сегодня (D-03)
- micronutrient API получает targetWeightDate (D-05)
- Settings показывает срок (D-06)
- Scope только deadline (D-07)
</success_criteria>

<output>
Create `.planning/quick/260716-jve-onboarding-target-weight-deadline/260716-jve-SUMMARY.md` when done
</output>
