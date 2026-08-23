# Import meals (Calzen PDF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Client-side import of meal diary entries from a CalZen nutrition PDF report into `useDiaryStore`, with adapter framework, preview + dedupe, and `queueDiarySync` for logged-in users.

**Architecture:** `pdf.js` extracts text → registry of `MealImportAdapter`s (first: CalZen) → ephemeral `useImportMealsStore` → `/import-meals` preview → `buildImportedMeal` + `addMeal` + single batched `queueDiarySync`. Entry from Settings → «Данные».

**Tech Stack:** React 18 + TypeScript, Zustand, react-router-dom, Vitest, `pdfjs-dist`, Tailwind + shared `Button` / `SubpageShell`, sonner toasts. Spec: `docs/superpowers/specs/2026-08-24-import-meals-calzen-design.md`.

## Global Constraints

- Cross-slice imports MUST go through `index.ts` barrels (no deep imports across slices).
- FSD: `app → pages → widgets → features → entities → shared`. No same-layer feature→feature imports **except** existing project pattern: features may call `queueDiarySync` from `@/features/diary-sync` (same as `useSaveManualMeal`).
- Named function/component exports; 2-space indent; single quotes; semicolons.
- Import **food only** (no weight/steps/water/targets from the PDF).
- Russian UI copy as specified in tasks.
- After commit of meals: `queueDiarySync({ mode: 'upsert', mealIds })` once for the whole batch (not once per meal if avoidable).
- Do not change JSON backup export/import behavior.

## File map

| Path | Responsibility |
|------|----------------|
| `src/features/import-meals/model/types.ts` | Shared draft / preview types |
| `src/features/import-meals/adapters/types.ts` | `MealImportAdapter` |
| `src/features/import-meals/adapters/calzen.ts` | CalZen detect + parse |
| `src/features/import-meals/adapters/calzen.test.ts` | Parser / detect tests |
| `src/features/import-meals/adapters/fixtures/calzen-diary-sample.txt` | Text fixture |
| `src/features/import-meals/adapters/index.ts` | Adapter registry |
| `src/features/import-meals/model/detectSource.ts` | Pick adapter from text |
| `src/features/import-meals/model/detectSource.test.ts` | Detect tests |
| `src/features/import-meals/lib/parseSpacedNumber.ts` | `1 981` → number |
| `src/features/import-meals/lib/dedupeMeals.ts` | Dedupe key + mark |
| `src/features/import-meals/lib/dedupeMeals.test.ts` | Dedupe tests |
| `src/features/import-meals/model/buildImportedMeal.ts` | Draft → `Meal` |
| `src/features/import-meals/model/buildImportedMeal.test.ts` | Builder tests |
| `src/features/import-meals/model/timestampFromLocalDateTime.ts` | date+time → ISO |
| `src/features/import-meals/lib/pdfText.ts` | PDF → string via pdfjs |
| `src/features/import-meals/model/useImportMealsStore.ts` | Ephemeral drafts |
| `src/features/import-meals/model/useImportMeals.ts` | Pick/parse/commit |
| `src/features/import-meals/ui/ImportMealsPreview.tsx` | Preview list UI |
| `src/features/import-meals/index.ts` | Public barrel |
| `src/pages/import-meals/ui/ImportMealsPage.tsx` | Route shell |
| `src/pages/import-meals/index.ts` | Page barrel |
| `src/app/router.tsx` | `/import-meals` |
| `src/pages/settings/ui/SettingsPage.tsx` | Entry button + file input |
| `src/features/news/model/changelog.ts` | User-facing news line |
| `package.json` | Add `pdfjs-dist` |

---

### Task 1: Types, spaced number, adapter registry stub

**Files:**
- Create: `apps/ai-food/src/features/import-meals/model/types.ts`
- Create: `apps/ai-food/src/features/import-meals/adapters/types.ts`
- Create: `apps/ai-food/src/features/import-meals/lib/parseSpacedNumber.ts`
- Create: `apps/ai-food/src/features/import-meals/lib/parseSpacedNumber.test.ts`
- Create: `apps/ai-food/src/features/import-meals/adapters/index.ts`
- Create: `apps/ai-food/src/features/import-meals/index.ts`

**Interfaces:**
- Produces:
  - `ImportedMealDraft` — `{ date: string; time: string; name: string; calories: number; protein: number; fat: number; carbs: number; fiber: number }`
  - `ImportSourceId` — `'calzen'`
  - `ImportPreviewRow` — `ImportedMealDraft & { status: 'new' | 'duplicate' }`
  - `MealImportAdapter` — `{ id: ImportSourceId; detect(text: string): boolean; parse(text: string): ImportedMealDraft[] }`
  - `parseSpacedNumber(raw: string): number`
  - `MEAL_IMPORT_ADAPTERS: MealImportAdapter[]` (empty array until Task 2 registers CalZen)

- [ ] **Step 1: Write failing test for `parseSpacedNumber`**

Create `apps/ai-food/src/features/import-meals/lib/parseSpacedNumber.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseSpacedNumber } from './parseSpacedNumber';

describe('parseSpacedNumber', () => {
  it('parses integers with thousand spaces', () => {
    expect(parseSpacedNumber('1 981')).toBe(1981);
    expect(parseSpacedNumber('2 841')).toBe(2841);
  });

  it('parses plain numbers and trims', () => {
    expect(parseSpacedNumber(' 254 ')).toBe(254);
    expect(parseSpacedNumber('6')).toBe(6);
  });

  it('returns NaN for empty/non-numeric', () => {
    expect(Number.isNaN(parseSpacedNumber(''))).toBe(true);
    expect(Number.isNaN(parseSpacedNumber('abc'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL (module missing)**

Run: `pnpm --filter ai-food exec vitest run src/features/import-meals/lib/parseSpacedNumber.test.ts`

Expected: FAIL (cannot find module / file)

- [ ] **Step 3: Implement types + `parseSpacedNumber` + barrels**

`model/types.ts`:

```ts
export type ImportSourceId = 'calzen';

export interface ImportedMealDraft {
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

export type ImportPreviewRow = ImportedMealDraft & {
  status: 'new' | 'duplicate';
};
```

`adapters/types.ts`:

```ts
import type { ImportSourceId, ImportedMealDraft } from '../model/types';

export interface MealImportAdapter {
  id: ImportSourceId;
  detect(text: string): boolean;
  parse(text: string): ImportedMealDraft[];
}
```

`lib/parseSpacedNumber.ts`:

```ts
/** Parse numbers that may use spaces as thousand separators (`1 981`). */
export function parseSpacedNumber(raw: string): number {
  const cleaned = raw.replace(/\s+/g, '').replace(',', '.');
  if (!cleaned) return Number.NaN;
  return Number(cleaned);
}
```

`adapters/index.ts`:

```ts
import type { MealImportAdapter } from './types';

/** Ordered registry — first `detect === true` wins. */
export const MEAL_IMPORT_ADAPTERS: MealImportAdapter[] = [];
```

`index.ts` (feature barrel — grow in later tasks):

```ts
export type {
  ImportSourceId,
  ImportedMealDraft,
  ImportPreviewRow,
} from './model/types';
export type { MealImportAdapter } from './adapters/types';
export { MEAL_IMPORT_ADAPTERS } from './adapters';
export { parseSpacedNumber } from './lib/parseSpacedNumber';
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm --filter ai-food exec vitest run src/features/import-meals/lib/parseSpacedNumber.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/import-meals
git commit -m "$(cat <<'EOF'
feat(ai-food): scaffold import-meals types and spaced number parser

EOF
)"
```

---

### Task 2: CalZen adapter (detect + parse) with text fixture

**Files:**
- Create: `apps/ai-food/src/features/import-meals/adapters/fixtures/calzen-diary-sample.txt`
- Create: `apps/ai-food/src/features/import-meals/adapters/calzen.ts`
- Create: `apps/ai-food/src/features/import-meals/adapters/calzen.test.ts`
- Create: `apps/ai-food/src/features/import-meals/model/detectSource.ts`
- Create: `apps/ai-food/src/features/import-meals/model/detectSource.test.ts`
- Modify: `apps/ai-food/src/features/import-meals/adapters/index.ts`
- Modify: `apps/ai-food/src/features/import-meals/index.ts`

**Interfaces:**
- Consumes: `ImportedMealDraft`, `MealImportAdapter`, `parseSpacedNumber`, `MEAL_IMPORT_ADAPTERS`
- Produces:
  - `calzenAdapter: MealImportAdapter`
  - `detectSource(text: string): ImportSourceId | null`
  - `parseCalzenReport(text: string): ImportedMealDraft[]` (same as `calzenAdapter.parse`)

- [ ] **Step 1: Add text fixture**

Create `adapters/fixtures/calzen-diary-sample.txt` with content that mirrors real CalZen PDF text extraction (include header year, day headers, meals, a page-break between name and macros, empty days). Exact content:

```text
CalZen
отчёт о питании 26 июля – 24 августа 2026 г. calzen.ai
ДНЕВНИК ПИТАНИЯ
Вт 28 июл. 	757 / 2 841 ккал · Б 20 · Ж 29 · У 104 · Кл 6 г
01:33 йогурт с шоколадным печеньем
Б 6 · Ж 10 · У 34 · Кл 1 г 254 ккал
13:57 чай черный, хлеб пшеничный с маслом, колбаса вареная наре…
Б 5 · Ж 12 · У 20 · Кл 1 г 213 ккал
18:25 овощной суп с фасолью и лапшой, хлеб
Б 9 · Ж 6 · У 49 · Кл 5 г 290 ккал
Ср 29 июл. 	0 / 2 841 ккал · Б 0 · Ж 0 · У 0
Нет записей
Чт 30 июл. 	418 / 2 841 ккал · Б 13 · Ж 25 · У 33 · Кл 1 г
12:20 жареные тосты, жареная колбаса, черный чай
Б 13 · Ж 25 · У 33 · Кл 1 г 418 ккал
Пн 3 авг. 	280 / 2 841 ккал · Б 8 · Ж 4 · У 54 · Кл 3 г
04:21 лапша пшеничная с соусом на томатной основе
Б 8 · Ж 4 · У 54 · Кл 3 г 280 ккал
Вт 17 авг.
14:09 бутерброд с салями и сливочным маслом, черный чай
-- page break --
Б 7 · Ж 17 · У 25 · Кл 1 г 290 ккал
14:17 Хот-дог с сосиской, кетчупом, горчицей, жареным луком и са…
Б 11 · Ж 17 · У 40 · Кл 2 г 356 ккал
```

- [ ] **Step 2: Write failing parser / detect tests**

Create `adapters/calzen.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { calzenAdapter } from './calzen';

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'fixtures/calzen-diary-sample.txt'),
  'utf8',
);

describe('calzenAdapter.detect', () => {
  it('detects CalZen report text', () => {
    expect(calzenAdapter.detect(fixture)).toBe(true);
  });

  it('rejects unrelated text', () => {
    expect(calzenAdapter.detect('MyFitnessPal export CSV')).toBe(false);
  });
});

describe('calzenAdapter.parse', () => {
  it('parses meals with macros, year, and truncated names', () => {
    const meals = calzenAdapter.parse(fixture);
    expect(meals).toHaveLength(6);
    expect(meals[0]).toEqual({
      date: '2026-07-28',
      time: '01:33',
      name: 'йогурт с шоколадным печеньем',
      calories: 254,
      protein: 6,
      fat: 10,
      carbs: 34,
      fiber: 1,
    });
    expect(meals[1].name).toContain('…');
    expect(meals[3]).toMatchObject({
      date: '2026-07-30',
      time: '12:20',
      calories: 418,
      protein: 13,
      fat: 25,
      carbs: 33,
      fiber: 1,
    });
    expect(meals[4]).toMatchObject({
      date: '2026-08-03',
      time: '04:21',
      calories: 280,
    });
  });

  it('joins meal name and macros across a page break', () => {
    const meals = calzenAdapter.parse(fixture);
    const split = meals.find((m) => m.time === '14:09');
    expect(split).toMatchObject({
      date: '2026-08-17',
      name: 'бутерброд с салями и сливочным маслом, черный чай',
      calories: 290,
      protein: 7,
      fat: 17,
      carbs: 25,
      fiber: 1,
    });
  });

  it('skips empty days', () => {
    const meals = calzenAdapter.parse(fixture);
    expect(meals.every((m) => m.date !== '2026-07-29')).toBe(true);
  });
});
```

Create `model/detectSource.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { detectSource } from './detectSource';

describe('detectSource', () => {
  it('returns calzen for CalZen header', () => {
    expect(detectSource('CalZen\nотчёт о питании 2026 г. calzen.ai\nДНЕВНИК ПИТАНИЯ')).toBe(
      'calzen',
    );
  });

  it('returns null for unknown', () => {
    expect(detectSource('random pdf text without markers')).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

Run: `pnpm --filter ai-food exec vitest run src/features/import-meals/adapters/calzen.test.ts src/features/import-meals/model/detectSource.test.ts`

Expected: FAIL (missing modules)

- [ ] **Step 4: Implement CalZen adapter + detectSource**

`adapters/calzen.ts` — implement:

- `detect`: true if text matches `/calzen/i` **and** (`/ДНЕВНИК\s+ПИТАНИЯ/i` or `/отчёт\s+о\s+питании/i`).
- Extract report year: first `/(20\d{2})\s*г/` in text; if missing, throw or return `[]` (prefer return `[]` and let UI say no meals — but detect still true; better: parse returns `[]` if no year).
- Month map: `янв→01 … дек→12` (prefix match on `июл`/`авг` etc.).
- Day header regex: `/^(Вс|Пн|Вт|Ср|Чт|Пт|Сб)\s+(\d{1,2})\s+(янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)/i`
- Meal start: `/^(\d{1,2}):(\d{2})\s+(.+)$/`
- Macros line: `/Б\s*([\d\s]+)\s*·\s*Ж\s*([\d\s]+)\s*·\s*У\s*([\d\s]+)\s*·\s*Кл\s*([\d\s]+)\s*г\s+([\d\s]+)\s*ккал/i`
- Walk lines (split on `\r?\n`). Ignore lines that are only `-- page break --` / form-feed / empty.
- State machine: `currentDate: string | null`, optional `pendingName: { time, name } | null`.
  - On day header → set `currentDate` = `YYYY-MM-DD`, clear pending if incomplete.
  - On meal start → if pending without macros, drop pending; set pending.
  - On macros → if pending + currentDate, push draft and clear pending.
- Skip «Нет записей».
- Do not parse summary cards (КАЛОРИИ / БЕЛКИ as section titles) as meals — they lack `HH:mm` meal lines.
- Export `export const calzenAdapter: MealImportAdapter = { id: 'calzen', detect, parse }`.

`model/detectSource.ts`:

```ts
import { MEAL_IMPORT_ADAPTERS } from '../adapters';
import type { ImportSourceId } from './types';

export function detectSource(text: string): ImportSourceId | null {
  for (const adapter of MEAL_IMPORT_ADAPTERS) {
    if (adapter.detect(text)) return adapter.id;
  }
  return null;
}

export function getAdapter(id: ImportSourceId) {
  return MEAL_IMPORT_ADAPTERS.find((a) => a.id === id) ?? null;
}
```

Register in `adapters/index.ts`:

```ts
import { calzenAdapter } from './calzen';
import type { MealImportAdapter } from './types';

export const MEAL_IMPORT_ADAPTERS: MealImportAdapter[] = [calzenAdapter];
```

Export `calzenAdapter`, `detectSource`, `getAdapter` from feature `index.ts`.

- [ ] **Step 5: Run tests — expect PASS**

Run: `pnpm --filter ai-food exec vitest run src/features/import-meals/adapters/calzen.test.ts src/features/import-meals/model/detectSource.test.ts`

Expected: PASS. If pdf.js later extracts slightly different whitespace, adjust regex — fixture tests are the contract.

- [ ] **Step 6: Commit**

```bash
git add apps/ai-food/src/features/import-meals
git commit -m "$(cat <<'EOF'
feat(ai-food): add CalZen PDF text adapter for meal import

EOF
)"
```

---

### Task 3: Timestamp helper, `buildImportedMeal`, dedupe

**Files:**
- Create: `apps/ai-food/src/features/import-meals/model/timestampFromLocalDateTime.ts`
- Create: `apps/ai-food/src/features/import-meals/model/timestampFromLocalDateTime.test.ts`
- Create: `apps/ai-food/src/features/import-meals/model/buildImportedMeal.ts`
- Create: `apps/ai-food/src/features/import-meals/model/buildImportedMeal.test.ts`
- Create: `apps/ai-food/src/features/import-meals/lib/dedupeMeals.ts`
- Create: `apps/ai-food/src/features/import-meals/lib/dedupeMeals.test.ts`
- Modify: `apps/ai-food/src/features/import-meals/index.ts`

**Interfaces:**
- Consumes: `ImportedMealDraft`, `ImportPreviewRow`, `Meal` / `FoodItem` from `@ai-food/shared-types`, `sanitizeNutrient` / `sanitizeGrams` from `@/entities/meal`
- Produces:
  - `timestampFromLocalDateTime(date: string, time: string): string`
  - `mealDedupeKeyFromParts(date, time, name, calories): string`
  - `mealDedupeKeyFromMeal(meal: Meal): string`
  - `markImportDuplicates(drafts, existingMeals): ImportPreviewRow[]`
  - `buildImportedMeal(draft, ids: { mealId; itemId }): Meal | null`

- [ ] **Step 1: Write failing tests**

`timestampFromLocalDateTime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { timestampFromLocalDateTime } from './timestampFromLocalDateTime';

describe('timestampFromLocalDateTime', () => {
  it('builds ISO from local Y-M-D and HH:mm', () => {
    const iso = timestampFromLocalDateTime('2026-07-28', '01:33');
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(28);
    expect(d.getHours()).toBe(1);
    expect(d.getMinutes()).toBe(33);
  });
});
```

`buildImportedMeal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildImportedMeal } from './buildImportedMeal';
import type { ImportedMealDraft } from './types';

const draft: ImportedMealDraft = {
  date: '2026-07-28',
  time: '01:33',
  name: 'йогурт',
  calories: 254,
  protein: 6,
  fat: 10,
  carbs: 34,
  fiber: 1,
};

describe('buildImportedMeal', () => {
  it('returns null for blank name or calories <= 0', () => {
    expect(
      buildImportedMeal({ ...draft, name: '  ' }, { mealId: 'm1', itemId: 'i1' }),
    ).toBeNull();
    expect(
      buildImportedMeal({ ...draft, calories: 0 }, { mealId: 'm1', itemId: 'i1' }),
    ).toBeNull();
  });

  it('builds ready single-item meal without totalGrams', () => {
    const meal = buildImportedMeal(draft, { mealId: 'm1', itemId: 'i1' });
    expect(meal).toMatchObject({
      id: 'm1',
      name: 'йогурт',
      status: 'ready',
      portions: 1,
      totalCalories: 254,
    });
    expect(meal!.totalGrams).toBeUndefined();
    expect(meal!.items).toEqual([
      {
        id: 'i1',
        name: 'йогурт',
        calories: 254,
        protein: 6,
        fat: 10,
        carbs: 34,
        fiber: 1,
        grams: 0,
      },
    ]);
    expect(meal!.aiModel).toBeUndefined();
    expect(meal!.imageUri).toBeUndefined();
  });
});
```

`dedupeMeals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Meal } from '@ai-food/shared-types';
import { markImportDuplicates } from './dedupeMeals';
import type { ImportedMealDraft } from '../model/types';
import { timestampFromLocalDateTime } from '../model/timestampFromLocalDateTime';

const draft: ImportedMealDraft = {
  date: '2026-07-28',
  time: '01:33',
  name: 'Йогурт',
  calories: 254,
  protein: 6,
  fat: 10,
  carbs: 34,
  fiber: 1,
};

function mealStub(overrides: Partial<Meal> = {}): Meal {
  return {
    id: 'existing',
    timestamp: timestampFromLocalDateTime('2026-07-28', '01:33'),
    name: 'йогурт',
    items: [],
    totalCalories: 254,
    status: 'ready',
    ...overrides,
  };
}

describe('markImportDuplicates', () => {
  it('marks matching day+time+name+calories as duplicate', () => {
    const rows = markImportDuplicates([draft], [mealStub()]);
    expect(rows[0]?.status).toBe('duplicate');
  });

  it('keeps new when calories differ', () => {
    const rows = markImportDuplicates([draft], [mealStub({ totalCalories: 255 })]);
    expect(rows[0]?.status).toBe('new');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `pnpm --filter ai-food exec vitest run src/features/import-meals/model/timestampFromLocalDateTime.test.ts src/features/import-meals/model/buildImportedMeal.test.ts src/features/import-meals/lib/dedupeMeals.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement**

`timestampFromLocalDateTime.ts`:

```ts
/** Interpret YYYY-MM-DD + HH:mm in the device local timezone → ISO string. */
export function timestampFromLocalDateTime(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  return local.toISOString();
}
```

`buildImportedMeal.ts`: use `sanitizeNutrient` / `sanitizeGrams` from `@/entities/meal`; set `grams: 0`; omit `totalGrams`; set `timestamp` via `timestampFromLocalDateTime`; return `null` if name blank or calories ≤ 0 after sanitize.

`dedupeMeals.ts`:

```ts
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function mealDedupeKeyFromParts(
  date: string,
  time: string,
  name: string,
  calories: number,
): string {
  return `${date}|${time}|${name.trim().toLowerCase()}|${calories}`;
}

export function mealDedupeKeyFromMeal(meal: Meal): string {
  const d = new Date(meal.timestamp);
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const name = meal.name ?? meal.items[0]?.name ?? '';
  return mealDedupeKeyFromParts(date, time, name, meal.totalCalories);
}

export function markImportDuplicates(
  drafts: ImportedMealDraft[],
  existingMeals: Meal[],
): ImportPreviewRow[] {
  const existing = new Set(existingMeals.map(mealDedupeKeyFromMeal));
  return drafts.map((draft) => {
    const key = mealDedupeKeyFromParts(
      draft.date,
      draft.time,
      draft.name,
      draft.calories,
    );
    return {
      ...draft,
      status: existing.has(key) ? 'duplicate' : 'new',
    };
  });
}
```

Export new symbols from feature barrel.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/import-meals
git commit -m "$(cat <<'EOF'
feat(ai-food): build and dedupe imported meal drafts

EOF
)"
```

---

### Task 4: Ephemeral store + parse/commit orchestration

**Files:**
- Create: `apps/ai-food/src/features/import-meals/model/useImportMealsStore.ts`
- Create: `apps/ai-food/src/features/import-meals/model/useImportMeals.ts`
- Create: `apps/ai-food/src/features/import-meals/model/useImportMeals.test.ts`
- Modify: `apps/ai-food/src/features/import-meals/index.ts`

**Interfaces:**
- Consumes: `detectSource`, `getAdapter`, `markImportDuplicates`, `buildImportedMeal`, `useDiaryStore`, `queueDiarySync`
- Produces:
  - Store: `{ drafts: ImportedMealDraft[]; sourceId: ImportSourceId | null; setImport(drafts, sourceId); clear() }` — **no persist**
  - `parseImportText(text: string): { ok: true; count: number } | { ok: false; error: 'unsupported' | 'empty' }`
  - `commitImport(): { added: number }` — only `status === 'new'` after live dedupe against current diary
  - `useImportPreviewRows(): ImportPreviewRow[]` — derived from store drafts + diary

- [ ] **Step 1: Write failing commit test**

`useImportMeals.test.ts` — mock `queueDiarySync`; reset diary store; set drafts via store; call `commitImport`; assert meal count and that `queueDiarySync` called once with all new ids. Pattern: follow `useSaveManualMeal.test.ts` (vi.mock diary-sync).

Sketch:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiaryStore } from '@/entities/meal';
import { queueDiarySync } from '@/features/diary-sync';
import { useImportMealsStore } from './useImportMealsStore';
import { commitImport } from './useImportMeals';

vi.mock('@/features/diary-sync', () => ({
  queueDiarySync: vi.fn(),
}));

describe('commitImport', () => {
  beforeEach(() => {
    useDiaryStore.setState({ meals: [], pendingDeletes: [] });
    useImportMealsStore.getState().clear();
    vi.mocked(queueDiarySync).mockClear();
  });

  it('adds only new drafts and queues one sync batch', () => {
    useImportMealsStore.getState().setImport(
      [
        {
          date: '2026-07-28',
          time: '01:33',
          name: 'йогурт',
          calories: 254,
          protein: 6,
          fat: 10,
          carbs: 34,
          fiber: 1,
        },
      ],
      'calzen',
    );
    const { added } = commitImport();
    expect(added).toBe(1);
    expect(useDiaryStore.getState().meals).toHaveLength(1);
    expect(queueDiarySync).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(queueDiarySync).mock.calls[0]?.[0];
    expect(arg?.mode).toBe('upsert');
    expect(arg?.mealIds).toHaveLength(1);
  });
});
```

Also test: second `commitImport` with same drafts still in store after first commit → `added === 0` (dedupe against diary).

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement store + `parseImportText` / `commitImport`**

`useImportMealsStore.ts` — zustand `create` **without** `persist`.

`useImportMeals.ts`:

- `parseImportText(text)`:
  - `detectSource` → null ⇒ `{ ok: false, error: 'unsupported' }`
  - `getAdapter(id)!.parse(text)` → length 0 ⇒ `{ ok: false, error: 'empty' }`
  - else `setImport(drafts, id)` ⇒ `{ ok: true, count: drafts.length }`
- `commitImport()`:
  - read drafts + `useDiaryStore.getState().meals`
  - `markImportDuplicates` → filter `new`
  - for each: `buildImportedMeal` with `crypto.randomUUID()` ids; skip nulls; `addMeal(meal)`; collect ids
  - if ids.length: `queueDiarySync({ mode: 'upsert', mealIds: ids })`
  - `clear()` store
  - return `{ added: ids.length }`

Export from barrel.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/src/features/import-meals
git commit -m "$(cat <<'EOF'
feat(ai-food): import-meals store and commit with diary sync

EOF
)"
```

---

### Task 5: PDF text extraction (`pdfjs-dist`)

**Files:**
- Modify: `apps/ai-food/package.json` (dependency `pdfjs-dist`)
- Create: `apps/ai-food/src/features/import-meals/lib/pdfText.ts`
- Create: `apps/ai-food/src/features/import-meals/lib/pdfText.test.ts` (lightweight — mock pdfjs module)
- Modify: `apps/ai-food/src/features/import-meals/index.ts`

**Interfaces:**
- Produces: `extractPdfText(data: ArrayBuffer): Promise<string>`

- [ ] **Step 1: Install dependency**

From repo root:

```bash
pnpm --filter ai-food add pdfjs-dist
```

Pin whatever version pnpm resolves (prefer ^4 or ^5 current). Document chosen import path in `pdfText.ts` comments if worker path differs by major.

- [ ] **Step 2: Implement `extractPdfText`**

```ts
import * as pdfjs from 'pdfjs-dist';

// Vite: bundle worker next to the module
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    parts.push(line);
  }
  return parts.join('\n');
}
```

**Note for implementer:** CalZen text items may arrive as many small `str` fragments on one page. Joining with spaces can break `HH:mm` / macros onto one long line. Prefer reconstructing lines using `TextItem.transform` Y-coordinate grouping (same Y → same line, sorted by X) — if the simple join fails against a real PDF in manual QA, switch to Y-clustering in this same task before moving on. Add a unit test on a fake `getDocument` mock that returns two items on different Y values to lock the line grouping helper if you add one (`groupPdfTextItems(items): string`).

- [ ] **Step 3: Unit-test the line grouping helper (if extracted) or mock `extractPdfText` success path**

Keep the test free of real PDF binaries. Mock `pdfjs-dist` with `vi.mock` returning one page of items.

- [ ] **Step 4: Smoke against real PDF (manual / optional script)**

If available at `c:\Users\mk\Downloads\calzen-report-2026-07-26_2026-08-24.pdf`, run a quick node/vite-node snippet or temporary test skipped in CI that expects ≥14 meals after `calzenAdapter.parse(await extractPdfText(...))`. Adjust parser whitespace if needed **in Task 2 files** and keep fixture tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/ai-food/package.json apps/ai-food/pnpm-lock.yaml apps/ai-food/src/features/import-meals
git commit -m "$(cat <<'EOF'
feat(ai-food): extract PDF text for meal import via pdfjs

EOF
)"
```

(If lockfile lives at monorepo root, add that path instead.)

---

### Task 6: UI — Settings entry, preview page, router, changelog

**Files:**
- Create: `apps/ai-food/src/features/import-meals/ui/ImportMealsPreview.tsx`
- Create: `apps/ai-food/src/pages/import-meals/ui/ImportMealsPage.tsx`
- Create: `apps/ai-food/src/pages/import-meals/index.ts`
- Modify: `apps/ai-food/src/features/import-meals/index.ts`
- Modify: `apps/ai-food/src/app/router.tsx`
- Modify: `apps/ai-food/src/pages/settings/ui/SettingsPage.tsx`
- Modify: `apps/ai-food/src/features/news/model/changelog.ts`

**Interfaces:**
- Consumes: public API from `@/features/import-meals`, `SubpageShell`, `Button`, `toast`, `useNavigate`
- Produces: user-visible import flow

- [ ] **Step 1: Preview UI component**

`ImportMealsPreview.tsx`:

- Props: `rows: ImportPreviewRow[]`; `onConfirm: () => void`; `onCancel: () => void`; `busy?: boolean`
- Header counters: `Будет добавлено N · пропущено M`
- List rows: date, time, name, `{calories} ккал`; duplicate badge `уже есть` (muted)
- Primary button: `Добавить N` disabled when `N === 0` or `busy`
- Outline: `Отмена`

- [ ] **Step 2: `ImportMealsPage`**

- `SubpageShell` title «Импорт еды», back → `/settings` and `clear()` store
- On mount: if `drafts.length === 0`, `navigate('/settings', { replace: true })`
- Derive rows via `markImportDuplicates(drafts, meals)` (or hook from Task 4)
- Confirm → `commitImport()` → `toast.success(\`Добавлено ${added}\`)` → navigate `/settings`
- Empty-all-dupes: disabled button + short text «Все записи уже есть в дневнике»

- [ ] **Step 3: Router**

In `apps/ai-food/src/app/router.tsx`, next to `/manual-entry`:

```tsx
import { ImportMealsPage } from '@/pages/import-meals';
// ...
{
  path: '/import-meals',
  element: (
    <ConsentGuard>
      <ProfileGuard><ImportMealsPage /></ProfileGuard>
    </ConsentGuard>
  ),
},
```

- [ ] **Step 4: Settings «Данные» entry**

In `SettingsPage.tsx` inside the `dataOpen` block, after the JSON buttons:

- Hidden `<input type="file" accept="application/pdf,.pdf" />`
- Outline button «Импорт из другого приложения»
- Helper text: `Пока поддерживается CalZen (PDF-отчёт о питании).`
- On file: read `arrayBuffer` → `extractPdfText` → `parseImportText`
  - errors: toast `Не удалось прочитать файл` / `Этот формат пока не поддерживается` / `В отчёте нет записей о еде`
  - success: `navigate('/import-meals')`
- Show brief busy state («Читаем отчёт…») on the button / disable while parsing

Keep JSON import/export unchanged.

- [ ] **Step 5: Changelog**

Prepend or add item under newest release in `changelog.ts` (date `2026-08-24` new release or append to latest — prefer **new release** if date differs):

```ts
{
  date: '2026-08-24',
  title: 'Импорт дневника',
  emoji: '📥',
  items: [
    {
      emoji: '📄',
      text: 'Импорт приёмов из PDF-отчёта CalZen — в Настройки → Данные',
    },
  ],
},
```

- [ ] **Step 6: Type-check + unit tests**

Run:

```bash
pnpm --filter ai-food type-check
pnpm --filter ai-food exec vitest run src/features/import-meals
```

Expected: clean type-check; all import-meals tests PASS.

- [ ] **Step 7: Manual QA checklist**

1. Settings → Данные → импорт sample CalZen PDF → preview shows ~14 meals → Добавить → diary has entries on correct dates/times.
2. Repeat import → all marked duplicate → Добавить disabled / added 0.
3. Logged-in account: after import, meals appear after sync / on second device (or network tab shows `/user/meals/sync`).
4. Non-CalZen PDF → unsupported toast.
5. JSON export/import still works.

- [ ] **Step 8: Commit**

```bash
git add apps/ai-food/src/features/import-meals apps/ai-food/src/pages/import-meals apps/ai-food/src/app/router.tsx apps/ai-food/src/pages/settings/ui/SettingsPage.tsx apps/ai-food/src/features/news/model/changelog.ts
git commit -m "$(cat <<'EOF'
feat(ai-food): CalZen meal import UI in Settings and preview page

EOF
)"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Adapter framework detect/parse | 1–2 |
| CalZen PDF food-only | 2, 5 |
| Preview + confirm | 6 |
| Dedupe day+time+name+kcal | 3–4 |
| `addMeal` + `queueDiarySync` | 4 |
| Settings → Данные entry | 6 |
| grams=0, no totalGrams, status ready | 3 |
| Page-break meal join | 2 |
| Errors unsupported/empty/read fail | 6 |
| Unit fixtures without PDF binary | 2–4 |
| Changelog | 6 |

No TBD placeholders. Types consistent: `ImportedMealDraft`, `ImportPreviewRow`, `ImportSourceId`, `MealImportAdapter` across tasks.
