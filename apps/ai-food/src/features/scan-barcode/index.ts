export {
  fetchProductByBarcode,
  OffProductError,
  getOffProductErrorMessage,
  normalizeBarcode,
  parseServingGrams,
  defaultBarcodeGrams,
} from './api/fetchProductByBarcode';
export type {
  OffProduct,
  OffNutritionPer100g,
  OffProductErrorCode,
} from './api/fetchProductByBarcode';
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
export { NativeMlKitBarcodeScan } from './ui/NativeMlKitBarcodeScan';
export type { NativeMlKitBarcodeScanProps } from './ui/NativeMlKitBarcodeScan';
export {
  isNativeMlKitBarcodeAvailable,
  detectBarcodeInVideoWithMlKit,
  stopNativeMlKitBarcodeScan,
  MLKIT_BARCODE_SCAN_BODY_CLASS,
} from './lib/nativeBarcodeScan';
export { BarcodeProductConfirm } from './ui/BarcodeProductConfirm';
export type { BarcodeProductConfirmProps } from './ui/BarcodeProductConfirm';
