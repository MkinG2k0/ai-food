import { Html5Qrcode } from 'html5-qrcode';

const BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'codabar',
  'qr_code',
] as const;

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmapSource,
  ) => Promise<Array<{ rawValue: string }>>;
};

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const Detector = (
    globalThis as {
      BarcodeDetector?: new (opts?: {
        formats?: readonly string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: BARCODE_FORMATS });
  } catch {
    return null;
  }
}

/** Digits-only when the code is numeric; otherwise trimmed raw value. */
export function extractBarcodeValue(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 ? digits : raw.trim();
}

export async function detectBarcodeInVideo(
  video: HTMLVideoElement,
): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  if (!video.videoWidth || !video.videoHeight) return null;

  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const results = await detector.detect(video);
      const raw = results[0]?.rawValue;
      if (raw) return extractBarcodeValue(raw);
    } catch {
      /* fall through to canvas + html5-qrcode */
    }
  }

  return detectBarcodeInVideoViaFile(video);
}

async function detectBarcodeInVideoViaFile(
  video: HTMLVideoElement,
): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92);
  });
  if (!blob) return null;
  return detectBarcodeInFile(
    new File([blob], 'frame.jpg', { type: 'image/jpeg' }),
  );
}

let fileScanner: Html5Qrcode | null = null;
let fileScannerHost: HTMLDivElement | null = null;

function getFileScanner(): Html5Qrcode {
  if (fileScanner) return fileScanner;
  const host = document.createElement('div');
  host.id = 'barcode-file-scanner-host';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px';
  document.body.appendChild(host);
  fileScannerHost = host;
  fileScanner = new Html5Qrcode(host.id);
  return fileScanner;
}

export async function detectBarcodeInFile(file: File): Promise<string | null> {
  const detector = getBarcodeDetector();
  if (detector) {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const results = await detector.detect(bitmap);
        const raw = results[0]?.rawValue;
        if (raw) return extractBarcodeValue(raw);
      } finally {
        bitmap.close();
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const scanner = getFileScanner();
    const raw = await scanner.scanFile(file, false);
    return extractBarcodeValue(raw);
  } catch {
    return null;
  }
}

/** Test helper / cleanup for jsdom. */
export function resetBarcodeFileScannerForTests(): void {
  fileScanner = null;
  fileScannerHost?.remove();
  fileScannerHost = null;
}
