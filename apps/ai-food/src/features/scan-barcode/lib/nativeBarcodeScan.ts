import { Capacitor } from '@capacitor/core';

/** Body/html class toggled while continuous ML Kit scan owns the camera. */
export const MLKIT_BARCODE_SCAN_BODY_CLASS = 'mlkit-barcode-scan-active';

function setMlKitScanActiveClass(active: boolean) {
  const method = active ? 'add' : 'remove';
  document.documentElement.classList[method](MLKIT_BARCODE_SCAN_BODY_CLASS);
  document.body.classList[method](MLKIT_BARCODE_SCAN_BODY_CLASS);
}

/**
 * True only on native Capacitor when ML Kit barcode scanning is supported.
 * Dynamic-imports the plugin so web bundles avoid the native path.
 */
export async function isNativeMlKitBarcodeAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
    const { supported } = await BarcodeScanner.isSupported();
    return supported;
  } catch {
    return false;
  }
}

export type NativeBarcodeScannedHandler = (rawValue: string) => void;

/**
 * Continuous startScan + barcodesScanned listener (not RTU scan()).
 * Makes WebView transparent via body class so the camera behind is visible.
 */
export async function startNativeMlKitBarcodeScan(
  onBarcode: NativeBarcodeScannedHandler,
): Promise<void> {
  const { BarcodeScanner, BarcodeFormat } = await import(
    '@capacitor-mlkit/barcode-scanning'
  );

  const perms = await BarcodeScanner.requestPermissions();
  if (perms.camera !== 'granted' && perms.camera !== 'limited') {
    throw new Error('camera-permission');
  }

  setMlKitScanActiveClass(true);

  await BarcodeScanner.removeAllListeners();

  // Cap 8 API: barcodesScanned (plural) — not legacy barcodeScanned.
  await BarcodeScanner.addListener('barcodesScanned', (event) => {
    const raw = event.barcodes[0]?.rawValue;
    if (raw) onBarcode(raw);
  });

  await BarcodeScanner.startScan({
    formats: [
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
      BarcodeFormat.UpcA,
      BarcodeFormat.UpcE,
      BarcodeFormat.Code128,
      BarcodeFormat.Code39,
      BarcodeFormat.Codabar,
      BarcodeFormat.QrCode,
    ],
  });
}

/** Always clears body class + listeners + stopScan (safe if never started). */
export async function stopNativeMlKitBarcodeScan(): Promise<void> {
  setMlKitScanActiveClass(false);
  try {
    const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
    await BarcodeScanner.removeAllListeners();
    await BarcodeScanner.stopScan();
  } catch {
    /* ignore — plugin may be unavailable on web / already stopped */
  }
}
