---
status: complete
quick_id: 260803-3sp
completed_at: 2026-08-03
---

# Summary: Barcode + Open Food Facts

## Done
- Feature `scan-barcode`: OFF v2 product lookup, mapper to Meal, Query hook, save hook
- UI: live scanner (`html5-qrcode`) + manual EAN + portion confirm
- Route `/barcode`; AddFoodSheet «Штрих код» navigates there
- Tests for mapper; type-check clean

## Flow
AddFoodSheet → `/barcode` → scan/type → OFF API → grams confirm → `addMeal` (status ready) → home

## Notes
- Client calls world.openfoodfacts.org directly (no backend proxy)
- Meal photos from OFF omitted (diary `getMealImageSrc` expects local Capacitor paths)
- Attribution shown on confirm: «Open Food Facts»
