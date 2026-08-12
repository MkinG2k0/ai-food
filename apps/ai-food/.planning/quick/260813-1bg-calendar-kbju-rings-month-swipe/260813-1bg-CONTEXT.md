# Quick Task 260813-1bg: Кольца КБЖУ на календаре + свайп вниз полный месяц - Context

**Gathered:** 2026-08-12
**Status:** Ready for planning

<domain>
## Task Boundary

На недельной ленте дней (`WeekStrip` в daily-header) показать concentric progress rings по КБЖУ за каждый день (съедено/цель). Свайп вниз по ленте/хэндлу раскрывает полный месячный календарь с теми же кольцами (референс-скрины пользователя). В настройках — выбор плотности колец.

</domain>

<decisions>
## Implementation Decisions

### Сколько колец / настройка
- В Settings: выбор режима колец календаря — **К / КБ / КБЖУ**
- Дефолт: **КБ** (калории + белки)
- Режим управляет числом concentric rings на day cell (1 / 2 / 4)

### Визуал колец
- Стиль как на скринах + Apple Activity: тонкие concentric arcs вокруг цифры дня
- Цвета согласовать с существующими KBJU rings (Android widget / NutritionSummaryCard): kcal emerald, protein rose, fat amber, carbs sky
- Выбранный день — сплошной круг + кольца снаружи (как на скрине)
- Дни без еды — без колец (или пустой track только если есть данные — prefer: rings only when day has ready meals)

### Свайп вниз → полный месяц
- Хэндл (6 точек) под week strip
- Vertical drag down раскрывает month grid (Пн–Вс), свайп/хэндл вверх сворачивает обратно в неделю
- Горизонтальный swipe недель сохраняется в collapsed mode
- Выбор дня в month view обновляет selectedDate и может свернуть в неделю (или оставить expanded — Claude's Discretion: свернуть после выбора для компактности home)

### Claude's Discretion
- Где именно хранить setting (`useSettingsStore` + UI на SettingsPage)
- Анимация expand/collapse (framer-motion уже в WeekStrip)
- Месячная навигация (стрелки / горизонтальный swipe месяца)
- Нужно ли убрать старую точку-индикатор `hasFood` под днём (заменяется кольцами)

</decisions>

<specifics>
## Specific Ideas

- Референс: week strip с хэндлом + month grid с concentric teal rings (пользовательские скрины в assets)
- Точка входа: `apps/ai-food/src/widgets/daily-header/ui/WeekStrip.tsx`, `DailyHeader.tsx`
- Цели: `useProfileStore.targets` + fallback как в DailyHeader
- Данные: `useDiaryStore.meals` агрегация по дню (ready only), как NutritionSummaryCard

</specifics>

<canonical_refs>
## Canonical References

- `apps/ai-food/src/widgets/daily-header/ui/WeekStrip.tsx` — текущая недельная лента
- `apps/ai-food/src/widgets/daily-header/ui/NutritionSummaryCard.tsx` — SVG ring pattern
- `apps/ai-food/src/features/settings/model/useSettingsStore.ts` — persist settings
- Android KBJU ring colors: kcal `#10B981`, protein `#FB7185`, fat `#FBBF24`, carbs `#0EA5E9`

</canonical_refs>
