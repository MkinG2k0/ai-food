import { useEffect, useRef, type RefObject } from 'react';
import { toast } from 'sonner';
import { extractBarcodeValue } from '../lib/detectBarcode';
import {
  detectBarcodeInVideoWithMlKit,
  stopNativeMlKitBarcodeScan,
} from '../lib/nativeBarcodeScan';

export interface NativeMlKitBarcodeScanProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  onScan: (code: string) => void;
}

/** Min gap between ML Kit frame decodes (ms). */
const MIN_GAP_MS = 200;

type IdleWindow = Window & {
  requestIdleCallback?: (
    cb: IdleRequestCallback,
    opts?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Headless ML Kit decode over the shared getUserMedia video element
 * (same letterboxed canvas preview as food mode — no startScan fullscreen).
 */
export function NativeMlKitBarcodeScan({
  videoRef,
  active,
  onScan,
}: NativeMlKitBarcodeScanProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const lastCodeRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    // Drop any leftover fullscreen startScan from older builds.
    void stopNativeMlKitBarcodeScan();
  }, []);

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
      if (typeof win.requestIdleCallback === 'function') {
        idleId = win.requestIdleCallback(run, { timeout: 250 });
      } else {
        rafId = requestAnimationFrame(run);
      }
    };

    const tick = async () => {
      if (cancelled) return;

      const now = performance.now();
      if (now - lastAttemptAt < MIN_GAP_MS) {
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
        const raw = await detectBarcodeInVideoWithMlKit(video);
        if (!cancelled && raw) {
          const code = extractBarcodeValue(raw);
          if (code.length >= 8 && code !== lastCodeRef.current) {
            lastCodeRef.current = code;
            onScanRef.current(code);
          }
        }
      } catch {
        if (!cancelled) {
          toast.error('Не удалось запустить сканер штрихкода');
          cancelled = true;
          return;
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
