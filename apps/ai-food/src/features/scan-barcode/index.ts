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
export {
  detectBarcodeInFile,
  detectBarcodeInVideo,
  extractBarcodeValue,
} from './lib/detectBarcode';
export { LiveBarcodeScan } from './ui/LiveBarcodeScan';
export type { LiveBarcodeScanProps } from './ui/LiveBarcodeScan';
export { BarcodeProductConfirm } from './ui/BarcodeProductConfirm';
export type { BarcodeProductConfirmProps } from './ui/BarcodeProductConfirm';
