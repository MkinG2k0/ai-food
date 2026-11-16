# Gallery multi-select → separate meals

**Date:** 2026-11-16  
**Status:** ready for review  
**App:** `apps/ai-food`

## Goal

When the user picks several photos from **Галерея** in Add Food, each photo becomes its own diary meal (separate AI analyze). Multi-angle “same dish, several photos” is no longer started from the gallery.

## Decisions (locked)

| Topic | Choice |
|--------|--------|
| Semantics | N gallery photos → N meals (never one meal with `images[]`) |
| Max pick | **10** photos per gallery selection (`MAX_FOOD_IMAGES = 10`) |
| Quota | Truncate to `usage.remaining` when finite; toast «Хватило на X из Y»; if 0 → paywall |
| Approach | Entry-point only (`AddFoodSheet`); keep API/`images[]` for legacy meals + retry |
| Camera / describe / barcode | Unchanged |
| Parallelism | Fire N × `submitFood({ image })`; existing concurrent `runMealAnalyze` |

## Behavior

`handleImagesSelect(files)`:

1. Ignore empty selection.
2. Cap at 10; if `files.length > 10`, toast: `Можно выбрать не больше 10 фото`.
3. If generation locked / remaining is `0` (and not unlimited): close sheet → paywall (existing path).
4. If `remaining` is a finite number and `remaining < picked.length`: take first `remaining` files; toast: `Хватило на ${n} из ${total}`.
5. Close sheet.
6. For each remaining file, call `submitFood({ image: file })` (do **not** pass `images`).

Unlimited / subscription (`remaining === null` or active subscription): no quota truncate beyond the 10 cap.

## Pure helper (for tests)

Extract selection policy from the sheet so unit tests do not need full React mount:

```ts
// features/add-food/lib/limitGalleryMealFiles.ts
limitGalleryMealFiles(files, { max, remaining }): {
  files: File[];
  truncatedByMax: boolean;
  truncatedByQuota: boolean;
  requestedCount: number;
}
```

- `remaining: number | null` — `null` = do not quota-truncate.
- Order preserved (first N after caps).
- Sheet maps result → toasts + N submits.

## UI copy

- Input `aria-label`: `Выбор из галереи (до 10 фото, каждое — отдельное блюдо)`.
- Max toast / quota toast as above (Russian, fixed strings for now; match existing AddFoodSheet style — currently hardcoded, not i18n).

## Out of scope

- Removing `images[]` from analyze API, meal `imageUris`, favorites multi-photo, MealCard badge for legacy multi-angle.
- Changing Scan page gallery (still single file).
- Changelog / marketing copy (optional follow-up).

## Tests (required — primary acceptance)

### Unit: `limitGalleryMealFiles`

| Case | Expect |
|------|--------|
| empty | `files: []`, no truncate flags |
| 1 file | same file, no truncate |
| 11 files, max 10 | 10 files, `truncatedByMax: true` |
| 7 files, remaining 3 | 3 files, `truncatedByQuota: true`, `requestedCount: 7` |
| 7 files, remaining null | 7 files, no quota truncate |
| remaining 0 | `files: []`, `truncatedByQuota: true` |
| max then quota (e.g. 15 files, max 10, remaining 4) | 4 files; both truncate flags true where applicable |

### Unit / component: AddFoodSheet (or thin wrapper)

| Case | Expect |
|------|--------|
| 3 files selected | `submitFood` called **3** times with `{ image: File }` each — **never** `{ images: [...] }` |
| >10 files | toast max; at most 10 submits |
| remaining 3, pick 7 | toast quota; exactly 3 submits |
| remaining 0 / locked | no submit; paywall path |

Mock `useSaveMeal`, `useUsage`, toast, navigate as in existing sheet tests if any; otherwise add focused tests around the handler via helper + one sheet integration test.

### E2E (`analyze-photo.spec.ts`)

| Case | Change |
|------|--------|
| 1 photo → ready meal | keep |
| **Replace** «3 фото → badge 3» | upload 2–3 photos → **2–3 separate meal cards** (or N analyzing/ready rows), **not** a single card with badge `3` |
| Optional | if mock gateway returns same name for all, assert meal count / N analyze bodies via `getCapturedAnalyzeBodies().length === N` |

### Regression

- Existing multi-angle **retry** unit test stays green (legacy path untouched).
- `analyzeFoodApi` multi-image test stays (API still supports batch angles).

## Success criteria

1. Gallery multi-select creates one meal per photo (≤10, ≤quota).
2. No new meal is created with multiple gallery photos as angles.
3. Unit + updated E2E cover the table above and pass.
