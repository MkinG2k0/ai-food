import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

export interface BarcodeScannerProps {
  onScan: (code: string) => void;
  paused?: boolean;
}

export function BarcodeScanner({ onScan, paused = false }: BarcodeScannerProps) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (paused) return;

    const elementId = 'barcode-reader';
    const scanner = new Html5Qrcode(elementId);
    let cancelled = false;

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 8,
            qrbox: { width: 260, height: 140 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            const code = decodedText.replace(/\D/g, '') || decodedText.trim();
            if (!code || code === lastCodeRef.current) return;
            lastCodeRef.current = code;
            onScanRef.current(code);
          },
          () => {
            /* ignore frame misses */
          },
        );
      } catch {
        if (!cancelled) {
          setCameraError('Камера недоступна — введите код вручную');
          toast.message('Камера недоступна — введите код вручную');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      lastCodeRef.current = null;
      if (scanner.isScanning) {
        void scanner.stop().catch(() => undefined);
      }
      try {
        scanner.clear();
      } catch {
        /* element may already be gone */
      }
    };
  }, [paused]);

  return (
    <div className="space-y-2">
      <div
        id="barcode-reader"
        className="overflow-hidden rounded-xl bg-muted [&_video]:w-full"
      />
      {cameraError ? (
        <p className="text-sm text-muted-foreground">{cameraError}</p>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Наведите камеру на штрихкод
        </p>
      )}
    </div>
  );
}
