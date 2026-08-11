# Stats: срок цели по весу в одной строке с остатком

**Дата:** 2026-08-12  
**Статус:** Approved  
**Область:** `apps/ai-food` — карточка прогресса веса на экране «Статистика»

## Проблема

Онбординг сохраняет `UserProfile.targetWeightDate` (YYYY-MM-DD). Срок уже виден в Settings («Срок»), но на карточке цели в «Статистике» показывается только остаток в кг (`3.5 кг от цели` / `X кг осталось`), без даты. Пользователь не видит, **до какого дня** нужно набрать/сбросить вес.

## Цель

На карточке `WeightProgressCard` в одной строке с текстом остатка показывать дедлайн, если он есть и цель ещё не достигнута.

**Пример:** `3.5 кг от цели · до 15 ноября 2026`

## Не в скоупе

- Редактирование `targetWeightDate` со статистики
- Изменение `useWeightStore` / серверного контракта
- Смена заголовка цели (`Поддерживать вес` / `Набрать вес` / …) — отдельная логика `goalTitle`
- Предупреждения о темпе на stats

## Решение

### Данные

- Источник истины: `profile.targetWeightDate` из `useProfileStore` (уже персистится).
- `StatsPage` передаёт дату в `WeightProgressCard` новым опциональным prop: `profileTargetWeightDate?: string | null`.
- `remainingCopy` **не** меняем — остаётся чистой функцией кг/цели/goal.

### UI-сборка (в карточке)

Строка под блоком сейчас/цель:

```
{remaining}[ · до {formattedDate}]
```

Правила:

| Условие | Поведение |
|--------|-----------|
| Цель достигнута (`reached`) | Только `remainingCopy` (обычно «Цель достигнута»); срок **не** дописываем |
| Нет / пустой `targetWeightDate` | Только `remainingCopy` (legacy-safe) |
| Есть дата и цель не достигнута | `remainingCopy` + ` · до ` + дата |

Формат даты — как в Settings:

```ts
new Date(`${ymd}T12:00:00`).toLocaleDateString('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
```

Префикс: `до ` (нижний регистр, без «к дате»).

Разделитель: middle dot ` · ` (пробелы с обеих сторон).

### Вспомогательная функция (опционально, предпочтительно)

Чистый хелпер рядом с `weightProgress.ts`, например:

```ts
formatWeightDeadlineCopy(remaining: string, targetWeightDate: string | null | undefined, reached: boolean): string
```

- unit-тест на склейку / hide when reached / empty date;
- карточка вызывает хелпер вместо инлайн-логики.

## Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `features/stats/model/weightProgress.ts` (+ test) | хелпер форматирования/склейки |
| `features/stats/ui/WeightProgressCard.tsx` | prop + использование хелпера |
| `pages/stats/ui/StatsPage.tsx` | проброс `profile.targetWeightDate` |

## Acceptance

1. При валидном `targetWeightDate` и недостигнутой цели строка вида `… · до <ru date>`.
2. После достижения цели срок не показывается.
3. Без даты UI как сейчас.
4. Формат даты совпадает с Settings.
5. Существующие тесты `remainingCopy` / `goalTitle` зелёные; новый unit-тест на склейку.

## Out of scope follow-ups

- Если `goal === 'maintain'`, а `targetWeight` отличается от текущего — заголовок может оставаться «Поддерживать вес»; это не чинится здесь.
