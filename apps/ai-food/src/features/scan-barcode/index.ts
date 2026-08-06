export {
  fetchProductByBarcode,
  OffProductError,
  normalizeBarcode,
  parseServingGrams,
  defaultBarcodeGrams,
} from './api/fetchProductByBarcode';
export type { OffProduct, OffNutritionPer100g } from './api/fetchProductByBarcode';
export { buildBarcodeMeal, scaleOffProductToItem } from './api/mapOffProductToMeal';
export { useProductByBarcode } from './model/useProductByBarcode';
export { useSaveBarcodeMeal } from './model/useSaveBarcodeMeal';
export { BarcodeScanner } from './ui/BarcodeScanner';
export type { BarcodeScannerProps } from './ui/BarcodeScanner';
export { BarcodeProductConfirm } from './ui/BarcodeProductConfirm';
export type { BarcodeProductConfirmProps } from './ui/BarcodeProductConfirm';
