import { useEffect, useRef, type RefObject } from 'react';
import { detectBarcodeInVideo } from '../lib/detectBarcode';

export interface LiveBarcodeScanProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onScan: (code: string) => void;
}

/** Min gap between decode starts (ms) — soft backoff, not a fixed polling cadence. */
const MIN_GAP_MS = 120;

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: IdleRequestCallback,
    opts?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

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
    let rafId = 0;
    let idleId = 0;
    let lastAttemptAt = 0;
    const win = window as IdleWindow;

    const cancelPending = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (idleId && win.cancelIdleCallback) {
        win.cancelIdleCallback(idleId);
        idleId = 0;
      }
    };

    const scheduleNext = () => {
      if (cancelled) return;
      cancelPending();
      const run = () => {
        rafId = 0;
        idleId = 0;
        void tick();
      };
      // Prefer idle so decode yields to camera paint frames when the browser supports it.
      if (typeof win.requestIdleCallback === 'function') {
        idleId = win.requestIdleCallback(run, { timeout: 200 });
      } else {
        rafId = requestAnimationFrame(run);
      }
    };

    const tick = async () => {
      if (cancelled) return;

      const now = performance.now();
      if (now - lastAttemptAt < MIN_GAP_MS) {
        // Keep chaining via rAF/idle until the soft gap elapses.
        scheduleNext();
        return;
      }

      const video = videoRef.current;
      if (!video || busyRef.current) {
        scheduleNext();
        return;
      }

      lastAttemptAt = now;
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
        if (!cancelled) scheduleNext();
      }
    };

    scheduleNext();

    return () => {
      cancelled = true;
      cancelPending();
      lastCodeRef.current = null;
    };
  }, [active, videoRef]);

  return null;
}
