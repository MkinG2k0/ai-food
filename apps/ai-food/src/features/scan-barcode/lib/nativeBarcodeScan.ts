import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

/** @deprecated Kept for CSS cleanup if an old session left the class on. */
export const MLKIT_BARCODE_SCAN_BODY_CLASS = 'mlkit-barcode-scan-active';

const FRAME_PATH = 'mlkit-barcode-frame.jpg';
const LIVE_MAX_SIDE = 720;

function clearMlKitScanActiveClass() {
  document.documentElement.classList.remove(MLKIT_BARCODE_SCAN_BODY_CLASS);
  document.body.classList.remove(MLKIT_BARCODE_SCAN_BODY_CLASS);
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

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function videoFrameToCacheJpeg(
  video: HTMLVideoElement,
): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = Math.min(1, LIVE_MAX_SIDE / Math.max(vw, vh));
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.85);
  });
  if (!blob) return null;

  const data = await blobToBase64(blob);
  const written = await Filesystem.writeFile({
    path: FRAME_PATH,
    data,
    directory: Directory.Cache,
  });
  return written.uri;
}

/**
 * One-shot ML Kit decode from the current getUserMedia video frame.
 * Does NOT use startScan (fullscreen camera-behind) — keeps letterboxed preview.
 */
export async function detectBarcodeInVideoWithMlKit(
  video: HTMLVideoElement,
): Promise<string | null> {
  const { BarcodeScanner, BarcodeFormat } = await import(
    '@capacitor-mlkit/barcode-scanning'
  );

  const path = await videoFrameToCacheJpeg(video);
  if (!path) return null;

  try {
    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path,
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
    return barcodes[0]?.rawValue ?? null;
  } catch {
    return null;
  }
}

/** Clear leftover startScan / transparent body class from older builds. */
export async function stopNativeMlKitBarcodeScan(): Promise<void> {
  clearMlKitScanActiveClass();
  try {
    const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
    await BarcodeScanner.removeAllListeners();
    await BarcodeScanner.stopScan();
  } catch {
    /* ignore */
  }
}

/** @deprecated Use detectBarcodeInVideoWithMlKit + shared getUserMedia preview. */
export async function startNativeMlKitBarcodeScan(): Promise<void> {
  await stopNativeMlKitBarcodeScan();
  throw new Error('startScan-fullscreen-disabled');
}
