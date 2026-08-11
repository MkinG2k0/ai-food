# Ideal weight trajectory on Stats chart — Design

**Дата:** 2026-08-12  
**Статус:** Approved  
**Область:** `apps/ai-food` (+ sync schema в `apps/ai-app` nutrition profile)

## Проблема

На «Динамика веса» видны только фактические записи и горизонтальная пунктирная цель. Пользователь не видит **плановую** траекторию (как должен меняться вес от старта онбординга к `targetWeight` к сроку). Дата старта плана сейчас не сохраняется.

## Цель

1. При завершении онбординга запоминать снимок старта плана: вес + дата.
2. На графике рисовать идеальную линейную динамику **другим цветом**, рядом с фактом.
3. Ось времени — календарная; видимое окно **30 дней** со **скроллом/свайпом** по диапазону плана и факта.

## Не в скоупе

- Пересчёт `planStart*` при «Обновить цель» / смене `targetWeight`
- Редактирование старта плана в Settings
- Нелинейные модели темпа (только линейная интерполяция)
- Отдельный экран «весь план» без окна 30 дней

## Решения

| Тема | Решение |
|------|---------|
| Старт плана | Снимок при `finish()`: `planStartWeight` = `profile.weight`, `planStartDate` = локальный YYYY-MM-DD «сегодня» |
| Persist | Поля на `UserProfile` + sync в nutrition profile (gateway zod + клиентский payload) |
| Legacy без полей | Идеальную линию не показывать |
| Форма плана | Линейная: `kg(t) = start + (goal − start) × (t − t0) / max(1, t1 − t0)` |
| Конец плана | `goalKg` / `profile.targetWeight` и `targetWeightDate` |
| Цвет плана | Не emerald факта: slate/blue stroke, **пунктир** (`strokeDasharray`); факт без изменений |
| Легенда | Короткая: «Факт» (solid) · «План» (dashed), другой цвет |
| Goal line | Горизонтальный пунктир цели **оставить** |
| Окно | Фиксированная ширина viewport = **30 календарных дней** |
| Скролл | Горизонтальный pan/swipe; диапазон данных от `min(planStartDate, earliest entry)` до `max(today, targetWeightDate, latest entry)` |
| Дефолт окна | Прижать к **сегодня** (правый край = сегодня), если диапазон шире 30 дней |
| Подзаголовок | Показывать даты видимого окна (например `1 авг – 30 авг`), не жёсткое «Последние 30 дней» |
| Ось X | По **календарю** (не по индексу точек) — обязательно для совмещения факта и плана |

## Модель данных

```ts
// UserProfile (добавить)
planStartDate: string;   // YYYY-MM-DD
planStartWeight: number; // kg snapshot at onboarding finish
```

- `finish()` / `setProfile` выставляет оба поля один раз при создании профиля из онбординга.
- Gateway: расширить `profileSchema` в `apps/ai-app/src/lib/nutritionProfile.ts` и клиентский `NutritionProfilePayload` / parse-map.
- Старые профили без полей: optional на чтении (parse), идеал не рисуем; новые finish всегда пишут оба.

### Миграция / optional

- На клиенте поля опциональны (`planStartDate?`, `planStartWeight?`) **или** обязательны в типе с безопасным parse с сервера: если отсутствуют → `undefined`, chart без плана.
- Предпочтение: optional на `UserProfile` для legacy; `finish()` всегда заполняет.

## Геометрия графика

1. Построить full-range timeline (дни от rangeStart до rangeEnd).
2. Ideal polyline: минимум 2 точки `(planStartDate, planStartWeight)` → `(targetWeightDate, goalKg)`; для сглаживания в окне можно сэмплировать по дням **внутри viewport** (достаточно 2 клипов на границах окна + внутренних, если нужно).
3. Fact: существующие `entries`, координата X = день на календарной оси.
4. Clip ideal к viewport: пересечение отрезка плана с `[viewStart, viewEnd]`.
5. Y-domain: `niceWeightDomain` по видимым fact + ideal-сегменту + `goalKg`.

### Pan

- State: `viewEndDate` (или `viewStartDate`); `viewEnd - viewStart = 29 дней` (30 inclusive) или эквивалент как в `getWeightTrendPoints`.
- Pointer / touch drag по plot area меняет offset в пределах range.
- Не блокировать вертикальный скролл страницы: pan только при доминирующем горизонтальном жесте (или явном drag на SVG).

## Затронутые зоны

| Зона | Изменение |
|------|-----------|
| `UserProfile` + defaultProfile / fixtures / tests | новые поля |
| `useOnboarding.finish` | снимок старта |
| auth nutritionProfile client + gateway zod | sync |
| `weightProgress.ts` (+ tests) | ideal segment, viewport helpers |
| `WeightTrendChart.tsx` | calendar X, ideal path, legend, pan |
| `WeightProgressCard` / `StatsPage` | прокидка planStart + targetDate + goal |

## Acceptance

1. После нового онбординга в профиле есть `planStartDate` + `planStartWeight`.
2. На графике при наличии старта и `targetWeightDate` видна пунктирная линия плана другим цветом.
3. Факт остаётся solid emerald; есть легенда Факт/План.
4. Видимое окно — 30 дней; можно проскроллить к более ранним/поздним дням в пределах диапазона.
5. По умолчанию окно у «сегодня».
6. Legacy без `planStart*` — график как сейчас (факт + goal line), без плана.
7. Unit-тесты на линейную интерполяцию и clip сегмента к окну.

## Follow-ups (не сейчас)

- Сброс/обновление старта плана при смене цели.
- Показ старта в Settings.
- Snap-скролл по неделям.
