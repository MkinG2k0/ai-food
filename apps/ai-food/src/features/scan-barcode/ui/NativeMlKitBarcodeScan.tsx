import { useEffect, useRef } from 'react';
import { extractBarcodeValue } from '../lib/detectBarcode';
import {
  startNativeMlKitBarcodeScan,
  stopNativeMlKitBarcodeScan,
} from '../lib/nativeBarcodeScan';

export interface NativeMlKitBarcodeScanProps {
  active: boolean;
  onScan: (code: string) => void;
}

/**
 * Headless continuous ML Kit barcode scan while `active`.
 * Camera renders behind the WebView; pair with mlkit-barcode-scan-active CSS.
 */
export function NativeMlKitBarcodeScan({
  active,
  onScan,
}: NativeMlKitBarcodeScanProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      lastCodeRef.current = null;
      void stopNativeMlKitBarcodeScan();
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await startNativeMlKitBarcodeScan((raw) => {
          if (cancelled) return;
          const code = extractBarcodeValue(raw);
          if (
            code.length >= 8 &&
            code !== lastCodeRef.current
          ) {
            lastCodeRef.current = code;
            onScanRef.current(code);
          }
        });
      } catch {
        /* permission / start failure — ScanPage keeps chrome; user can leave mode */
        if (!cancelled) {
          void stopNativeMlKitBarcodeScan();
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      lastCodeRef.current = null;
      void stopNativeMlKitBarcodeScan();
    };
  }, [active]);

  return null;
}
