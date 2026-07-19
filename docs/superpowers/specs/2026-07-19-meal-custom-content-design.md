# Meal Custom Content (lazy MD field)

**Date:** 2026-07-19  
**Status:** Approved for planning  
**Scope:** Lazy second AI call that fills a Markdown “Дополнительно” block on meal detail from the existing Settings “Кастомные инструкции” field.

## Problem

Users can already set global **Кастомные инструкции** (diet, units, style). Those instructions only bias the nutrition analyze prompt. There is no place on a meal to show free-form answers driven by the same instructions (e.g. recipe, spiciness notes) as rendered Markdown.

## Goals

- Reuse the single Settings field `customInstructions` for both analysis preferences and content requests.
- Add an optional Markdown field on each meal, loaded **only when opening meal detail**, not during the first scan.
- Show loading UI while the second request runs; persist the result so revisits do not re-fetch.
- Update the Settings copy so users understand both uses of the field.
- On refine (“Дополнить”), keep existing `customContent` unless the user explicitly asks to refresh/rewrite the extra answer.

## Non-goals

- Separate Settings field for “content prompt” vs preferences.
- Second vision call with the meal photo.
- Per-meal custom instructions UI.
- Feature toggle like vitamins/composition (visibility is driven by non-empty instructions + non-empty result).
- Raw HTML in Markdown (`rehype-raw` not used).

## Decisions

| Topic | Decision |
| --- | --- |
| Approach | **B — separate second AI call**, not an extra XML tag in the nutrition response |
| When to call | On `MealDetailPage` mount / open, not after first analyze |
| Source of truth for request text | Existing `useSettingsStore.customInstructions` |
| Storage | `Meal.customContent?: string` (Markdown), persisted via diary store |
| Visibility | Show block only when instructions are non-empty; hide after success if model returns empty; show retry on error |
| Refine | Do not overwrite `customContent` unless refine response explicitly signals an update |
| MD rendering | `react-markdown` (+ `remark-gfm` if needed for lists/tables); no raw HTML |
| Photo on second call | Not sent; meal text context (name, macros, items) is enough |

## Data model

### `packages/shared-types`

Add optional fields:

```ts
// Meal
customContent?: string;

// NutritionResult — only used if refine returns an updated blob;
// primary fill path is the lazy API → diary update, not first analyze.
customContent?: string;
```

Legacy meals without the field behave as “not loaded yet”.

### Diary

- New/extended store action: `updateMealCustomContent(mealId, customContent: string)` (or reuse a general `updateMeal` patch).
- Persist with existing `ai-food-diary` persist middleware.

## Settings UI copy

Keep control id / store key `customInstructions`. Update user-facing strings:

- **Label:** Кастомные инструкции (unchanged)
- **Description:** Укажите предпочтения для анализа (диета, единицы) и дополнительные запросы к блюду (рецепт, острота и т.п.). Ответ на доп. запросы появится на карточке приёма в формате Markdown.
- **Placeholder:** Например: я веган; дай краткий рецепт
- Counter `0/2000` unchanged

## Analyze (first scan)

- Unchanged pipeline for KBJU / composition / vitamins / healthiness.
- Continue appending `customInstructions` to the system prompt for preference bias.
- **Do not** request or expect `customContent` in the first analyze XML/JSON response.

## Lazy custom-content API

### Module

New API in analyze-food (or a small sibling feature), e.g.:

- `fetchMealCustomContentApi(input)`
- Hook: `useMealCustomContent(mealId)` via TanStack Query

### Input

- Meal context: `name` / `foodName`, totals (kcal, P/F/C), `items[]` names + grams if present
- `customInstructions` (trimmed, non-empty)
- `aiModel` from settings (same model picker as analyze)
- Temperature via existing `temperatureForModel`

### Output

- Plain Markdown string (no XML/JSON wrapper, no ``` fences required; strip fences if model adds them)

### Prompt rules

- Answer **only** content-style requests in the instructions (recipe, spiciness, commentary, etc.).
- Do not restate diet/unit preferences as the whole answer unless the user asked for that content.
- If instructions contain only preferences and no content request → return empty string.
- Language: Russian, matching the rest of the app.
- Keep answers reasonably short (practical upper bound ~2–4k chars; truncate on client if needed for storage safety).

### Query behavior

- `enabled`: meal exists, status ok (not analyzing/error), `customInstructions.trim()` non-empty, and `meal.customContent == null` (undefined / missing).
- Treat empty string `""` after a successful fetch as “loaded, no content” → do not re-fetch; hide UI block.
- Distinguish “not loaded” (`undefined`) vs “loaded empty” (`""`) so the query does not loop.
- `onSuccess`: write into diary store so persistence sticks across sessions.
- `queryKey`: include `mealId` + hash/length of instructions (if instructions change after a prior empty/non-empty load, allow refetch — optional v1: only refetch when `customContent` is still `undefined`; changing instructions later requires clear of `customContent` or manual retry — **v1:** if instructions change and content already stored, keep stored content until user hits retry or we add “refresh”; retry button clears and refetches).

### Errors

- Inline error in the “Дополнительно” block + “Повторить”.
- No mandatory toast.

## Meal detail UI

Placement on `MealDetailPage`: after meal summary / before or after composition (prefer **after summary, before “Дополнить” / composition** — single “Дополнительно” section).

States:

1. Instructions empty → no block.
2. `customContent === undefined` and query loading → skeleton / spinner under title «Дополнительно».
3. Success with non-empty Markdown → render via `react-markdown`.
4. Success with empty → hide block.
5. Error → message + retry.

## Refine (“Дополнить”)

- Default: leave `meal.customContent` as-is (including `undefined` / `""`).
- Prompt/schema addition: model may return `customContent` only when the user’s correction text explicitly asks to update the extra/custom answer (recipe, spiciness, “перепиши дополнительно”, etc.).
- Client merge: if refine result includes a defined `customContent` string (including empty to clear), apply it; otherwise do not touch the field.
- Do not auto-trigger the lazy query solely because refine ran, unless `customContent` is still `undefined` and instructions are non-empty (existing lazy rule).

## Architecture sketch

```
Settings.customInstructions
        │
        ├─► analyzeFoodApi (preferences bias only)
        │
        └─► MealDetailPage open
                │
                ├─ customContent === undefined && instructions?
                │       └─► fetchMealCustomContentApi → diary.customContent
                │
                └─ render Markdown | skeleton | retry
```

## Testing

- Settings copy / store unchanged keys; description strings present.
- `fetchMealCustomContentApi`: builds system/user messages with instructions + meal context; strips fences; empty response allowed.
- Hook: does not fetch when instructions empty or `customContent` already set; persists on success.
- Meal detail: loading / content / error / hidden-empty states.
- Refine: does not wipe `customContent` when response omits the field; updates when present.
- Types: `Meal.customContent` optional for legacy.

## Implementation notes

- Follow FSD: API under `features/analyze-food` (or `features/meal-custom-content` if preferred), UI block as small component used by `pages/meal-detail`, store update on `entities/meal`.
- Cross-slice imports via barrels only.
- Add `react-markdown` (and `remark-gfm` if lists/tables need it) to `@ai-food/mobile`.
- GSD workflow: implement via `/gsd-quick` or plan after this spec is accepted.

## Open points resolved in discussion

1. Same Settings field (not a second prompt field); update description.
2. Show MD block only when AI returned text (and while loading when a fetch is in flight).
3. Refine overwrites custom MD only when user explicitly asks.
4. Approach B with **lazy** fetch on card open, not right after first scan.
