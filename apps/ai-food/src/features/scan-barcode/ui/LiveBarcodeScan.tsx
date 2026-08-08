import { useEffect, useRef, type RefObject } from 'react';
import { detectBarcodeInVideo } from '../lib/detectBarcode';

export interface LiveBarcodeScanProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onScan: (code: string) => void;
}

/**
 * Headless live barcode reader over an existing <video> stream
 * (no second getUserMedia — avoids Android WebView play glyph + zoom).
 */
export function LiveBarcodeScan({
  videoRef,
  active,
  onScan,
}: LiveBarcodeScanProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastCodeRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!active) {
      lastCodeRef.current = null;
      return;
    }

    let cancelled = false;
    let timer = 0;

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && !busyRef.current) {
        busyRef.current = true;
        try {
          const code = await detectBarcodeInVideo(video);
          if (
            !cancelled &&
            code &&
            code.length >= 8 &&
            code !== lastCodeRef.current
          ) {
            lastCodeRef.current = code;
            onScanRef.current(code);
          }
        } finally {
          busyRef.current = false;
        }
      }
      if (!cancelled) {
        timer = window.setTimeout(() => {
          void tick();
        }, 350);
      }
    };

    timer = window.setTimeout(() => {
      void tick();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      lastCodeRef.current = null;
    };
  }, [active, videoRef]);

  return null;
}
