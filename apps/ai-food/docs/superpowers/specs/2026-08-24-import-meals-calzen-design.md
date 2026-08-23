# Import meals from other apps (Calzen PDF) — Design

## Problem

Пользователи ведут дневник в других приложениях (например CalZen) и хотят перенести
историю приёмов в AI Food. CalZen умеет отдавать PDF-отчёт о питании с датами, временем,
названиями и КБЖУ (+ клетчатка), но в приложении есть только импорт собственного JSON
backup — чужие отчёты не разбираются.

## Goals

1. Каркас импорта приёмов пищи с адаптерами источников (`detect` / `parse`).
2. Первый адаптер: **CalZen PDF** (отчёт о питании).
3. Из отчёта брать **только еду** (без веса, шагов, воды, целей).
4. Превью найденных приёмов с пометкой дубликатов → подтверждение → запись в дневник.
5. Dedupe: пропускать совпадения по день + время `HH:mm` + название + ккал.
6. После `addMeal` — тот же путь sync, что у ручного/AI создания (`queueDiarySync`),
   чтобы залогиненный пользователь увидел приёмы на других устройствах.

## Non-goals

- Импорт веса, шагов, воды, калорийных целей / профиля из отчёта.
- Другие источники в v1 (FatSecret, MyFitnessPal, CSV и т.п.) — только слот под адаптеры.
- Серверный парсинг PDF / AI-парсинг текста отчёта.
- Редактирование отдельных строк в превью перед импортом.
- Фото приёмов (в PDF их нет; фото по-прежнему не синкаются).
- Изменение JSON backup export/import.

## Decisions (from discussion)

| Тема | Решение |
|------|---------|
| Объём v1 | Каркас импорта + адаптер CalZen; только еда |
| Дубликаты | Пропускать при совпадении день + время + название + ккал |
| UX | Превью со списком → подтверждение → запись |
| Где парсить | Клиент (`pdf.js` + детерминированный line/regex парсер) |
| Sync | `useDiaryStore.addMeal` → `queueDiarySync` (как manual/AI) |
| Entry UI | Settings → «Данные» → «Импорт из другого приложения» |

## Architecture

### Data flow

```
Settings «Данные»
  → pick PDF
  → extractText(pdf)            // pdf.js на клиенте
  → detectSource(text)          // 'calzen' | 'unknown'
  → adapters.calzen.parse()     // → ImportedMealDraft[]
  → markDuplicates(existing)    // new | duplicate
  → preview UI
  → confirm
  → for each new draft:
        buildImportedMeal → diaryStore.addMeal → queueDiarySync
  → toast «Добавлено N»
```

Гость: только Preferences. Залогиненный: те же meals уходят через существующий
`POST /user/meals/sync` (LWW по `clientUpdatedAt`). Новые UUID → на сервере появляются
как новые записи. Фото не участвуют.

### FSD layout

```
features/import-meals/
  lib/pdfText.ts                 # ArrayBuffer/File → plain text (pdf.js)
  lib/dedupeMeals.ts             # ключ и сравнение с diary
  model/types.ts                 # ImportedMealDraft, ImportSourceId, PreviewRow
  model/detectSource.ts
  model/buildImportedMeal.ts     # draft → Meal (status ready)
  model/useImportMealsStore.ts   # ephemeral drafts для /import-meals (no persist)
  model/useImportMeals.ts        # pick → parse → store drafts → navigate / commit
  adapters/types.ts              # MealImportAdapter { id, detect, parse }
  adapters/calzen.ts
  adapters/index.ts              # registry
  ui/ImportMealsButton.tsx       # entry в Settings (или тонкая обёртка)
  ui/ImportMealsPreview.tsx      # список + counters + confirm/cancel
  index.ts

pages/import-meals/
  ui/ImportMealsPage.tsx         # превью + commit
  index.ts
```

Точка входа остаётся в Settings («Данные»). После успешного parse —
навигация на **`/import-meals`**. Черновики превью держим в лёгком
`useImportMealsStore` (не persist): `drafts[]`, `sourceId`, `error`;
при уходе со страницы / «Отмена» — `clear()`. Без drafts на странице —
redirect назад в Settings.

Переиспользовать: `useDiaryStore.addMeal`, `queueDiarySync`, паттерны
`buildManualMeal` / `useSaveManualMeal` (без фото). `addMeal` уже
триггерит sync-очередь; отдельный batch-API не нужен.

### Adapter contract

```ts
interface ImportedMealDraft {
  /** Local calendar date YYYY-MM-DD from report */
  date: string;
  /** HH:mm from report */
  time: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

type ImportSourceId = 'calzen'; // union растёт с новыми адаптерами

interface MealImportAdapter {
  id: ImportSourceId;
  detect(text: string): boolean;
  parse(text: string): ImportedMealDraft[];
}
```

`detectSource` обходит registry; первый `detect === true` побеждает.
Если никто не сматчился → ошибка «формат не поддерживается».

## Calzen mapping

Строка приёма: `01:33 йогурт с шоколадным печеньем`  
Макросы: `Б 6 · Ж 10 · У 34 · Кл 1 г 254 ккал`  
День: `Вт 28 июл.` + год из шапки (`… 2026 г.`).

| Calzen | Meal / FoodItem |
|--------|-----------------|
| дата + `HH:mm` | `timestamp` (локальная TZ устройства; год из шапки отчёта) |
| название | `meal.name` + единственный `FoodItem.name` |
| ккал | `totalCalories` / `item.calories` |
| Б / Ж / У / Кл | `protein` / `fat` / `carbs` / `fiber` |
| вес порции отсутствует | `item.grams = 0`; `totalGrams` не задаём |
| — | `status: 'ready'`, `portions: 1`, без фото / AI-мета / микронутриентов |

Один приём Calzen = один `Meal` с одним `FoodItem`. Имена с «…» — как в PDF.

**Парсер обязан:**

- Игнорировать сводку, калории/белки-карточки, шаги, воду, динамику веса.
- Пропускать дни «Нет записей».
- Склеивать запись, разорванную границами страниц (название на одной «странице»
  текста, макросы на следующей).
- Нормализовать числа с пробелами-разделителями тысяч (`1 981`, `2 841`).

### Dedupe

Ключ нормализации:

1. календарный день `timestamp` (local date);
2. время `HH:mm`;
3. `name.trim().toLowerCase()`;
4. `calories` (число).

Совпадение с любым meal в `useDiaryStore.meals` → статус `duplicate` в превью,
в commit не входит. Выбор «импортировать только non-dupes» в v1 фиксирован
(отдельного чекбокса по строкам нет).

## UI

**Entry:** Settings → collapsible «Данные» → кнопка «Импорт из другого приложения»
с короткой подписью: поддерживается CalZen (PDF-отчёт). Рядом остаются
«Экспорт JSON» / «Импорт JSON».

**Flow:**

1. File picker (web `<input type="file" accept="application/pdf">`; на Capacitor —
   тот же input / Filesystem, как принято в проекте для файлов).
2. Состояние загрузки: «Читаем отчёт…».
3. Превью:
   - счётчики: «Будет добавлено N · пропущено M»;
   - список: дата, время, название, ккал; у дубликатов бейдж «уже есть»;
   - «Добавить N» (disabled при N=0) / «Отмена».
4. Commit → toast «Добавлено N» → назад в Settings.

**Errors (user-facing):**

| Ситуация | Сообщение |
|----------|-----------|
| Битый/пустой PDF | Не удалось прочитать файл |
| Текст есть, источник unknown | Этот формат пока не поддерживается |
| 0 приёмов еды | В отчёте нет записей о еде |
| Все дубликаты | Превью с N=0, кнопка disabled + пояснение |

## Testing

**Unit (предпочтительно на текстовых фикстурах, без бинарного PDF в CI):**

- `calzen.parse` на фикстуре текста из реального отчёта
  (`calzen-report-2026-07-26_2026-08-24`) → ожидаемые drafts (даты, время, КБЖУ, клетчатка).
- Перенос записи через разрыв «страницы» в тексте.
- `detectSource`: CalZen vs произвольный текст.
- `dedupeMeals`: hit / miss по названию или ккал.
- `buildImportedMeal` → валидный `Meal` для `addMeal`.

**Manual:**

- Импорт того же PDF на web (и при возможности Capacitor).
- Повторный импорт → все skipped.
- Залогиненный пользователь → после импорта meals уходят в sync.

## Out of scope / later

- Адаптеры других приложений и CSV.
- Серверный парсер / LLM-структурирование.
- Импорт веса и целей.
- Построчный выбор / правка в превью.
- Хранение «source = calzen» на Meal (не требуется для sync; при желании позже).
