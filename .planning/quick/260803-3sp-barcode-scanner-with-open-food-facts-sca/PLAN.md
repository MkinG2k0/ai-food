---
phase: quick-260803-3sp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/mobile/package.json
  - apps/mobile/src/features/scan-barcode/api/fetchProductByBarcode.ts
  - apps/mobile/src/features/scan-barcode/api/mapOffProductToMeal.ts
  - apps/mobile/src/features/scan-barcode/api/mapOffProductToMeal.test.ts
  - apps/mobile/src/features/scan-barcode/model/useProductByBarcode.ts
  - apps/mobile/src/features/scan-barcode/model/useSaveBarcodeMeal.ts
  - apps/mobile/src/features/scan-barcode/ui/BarcodeScanner.tsx
  - apps/mobile/src/features/scan-barcode/ui/BarcodeProductConfirm.tsx
  - apps/mobile/src/features/scan-barcode/index.ts
  - apps/mobile/src/pages/barcode/ui/BarcodePage.tsx
  - apps/mobile/src/pages/barcode/index.ts
  - apps/mobile/src/app/router.tsx
  - apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
autonomous: true
requirements:
  - QUICK-3sp

must_haves:
  truths:
    - "AddFoodSheet «Штрих код» navigates to /barcode"
    - "User can scan or type EAN; app fetches Open Food Facts product"
    - "Confirm sheet shows name + КБЖУ scaled by grams; save adds ready Meal to diary"
    - "Missing product / missing kcal shows toast and does not save empty meal"
  artifacts:
    - apps/mobile/src/features/scan-barcode/index.ts
    - apps/mobile/src/pages/barcode/ui/BarcodePage.tsx
  key_links:
    - "AddFoodSheet → /barcode → BarcodeScanner → fetchProductByBarcode → BarcodeProductConfirm → useSaveBarcodeMeal → diary"
---

<objective>
Barcode scan / manual EAN → Open Food Facts lookup → portion grams confirm → save Meal (status ready) like favorites. No AI.
</objective>

<tasks>

<task type="auto">
  <name>Feature scan-barcode API + mapper + hooks</name>
  <files>
    apps/mobile/src/features/scan-barcode/api/fetchProductByBarcode.ts
    apps/mobile/src/features/scan-barcode/api/mapOffProductToMeal.ts
    apps/mobile/src/features/scan-barcode/api/mapOffProductToMeal.test.ts
    apps/mobile/src/features/scan-barcode/model/useProductByBarcode.ts
    apps/mobile/src/features/scan-barcode/model/useSaveBarcodeMeal.ts
    apps/mobile/src/features/scan-barcode/index.ts
  </files>
  <action>
    GET world.openfoodfacts.org/api/v2/product/{code}?fields=product_name,product_name_ru,brands,serving_size,nutriments,image_front_small_url
    Map nutriments *_100g to FoodItem scaled by grams. useQuery for product. useSaveBarcodeMeal mirrors useQuickAddFavorite.
  </action>
  <done>Mapper tests green; fetch returns typed product or not-found error.</done>
</task>

<task type="auto">
  <name>Scanner UI + page + route wire</name>
  <files>
    apps/mobile/package.json
    apps/mobile/src/features/scan-barcode/ui/BarcodeScanner.tsx
    apps/mobile/src/features/scan-barcode/ui/BarcodeProductConfirm.tsx
    apps/mobile/src/pages/barcode/ui/BarcodePage.tsx
    apps/mobile/src/pages/barcode/index.ts
    apps/mobile/src/app/router.tsx
    apps/mobile/src/features/add-food/ui/AddFoodSheet.tsx
  </files>
  <action>
    Add html5-qrcode. BarcodePage: camera scan + manual input; on code → confirm grams UI; save → home.
    Wire AddFoodSheet to navigate('/barcode').
  </action>
  <done>Route works; menu opens barcode page; type-check passes.</done>
</task>

</tasks>
