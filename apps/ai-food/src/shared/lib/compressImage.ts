import { appDebugLog } from './appDebugLog';

/** Max longest edge (px) for Vision / chat image payloads. */
export const AI_IMAGE_MAX_SIDE = 1024;

/** JPEG quality for AI payloads (0–1). */
export const AI_IMAGE_JPEG_QUALITY = 0.8;

/** Camera shutter already emits JPEG at maxSide — skip slow re-encode on WebView. */
export const AI_SKIP_REENCODE_MAX_BYTES = 150_000;

/** Live-preview shutter files from {@link jpegFileFromCanvas} — already ≤ maxSide. */
const SHUTTER_JPEG_NAME = /^food-\d+\.jpg$/i;

function isJpegFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return true;
  return !type && /\.jpe?g$/i.test(file.name);
}

function isShutterJpeg(file: File): boolean {
  return isJpegFile(file) && SHUTTER_JPEG_NAME.test(file.name);
}

function toJpegFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'food';
  return `${base}.jpg`;
}

/**
 * Downscale and re-encode an image for AI analysis (client-side, no backend).
 * Falls back to the original file if decode/compress fails or yields no size win.
 */
export async function compressImageForAi(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const maxSide = options?.maxSide ?? AI_IMAGE_MAX_SIDE;
  const quality = options?.quality ?? AI_IMAGE_JPEG_QUALITY;
  const t0 = performance.now();

  if (isShutterJpeg(file) && file.size <= AI_SKIP_REENCODE_MAX_BYTES) {
    appDebugLog('photo', 'compress', performance.now() - t0, {
      skipped: 'shutter-jpeg',
      inBytes: file.size,
    });
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const decodeMs = performance.now() - t0;
    const { width, height } = bitmap;
    const longest = Math.max(width, height);

    if (
      isJpegFile(file) &&
      longest <= maxSide &&
      file.size <= AI_SKIP_REENCODE_MAX_BYTES
    ) {
      bitmap.close();
      appDebugLog('photo', 'compress', performance.now() - t0, {
        skipped: 'already-ready',
        inBytes: file.size,
        w: width,
        h: height,
      });
      return file;
    }

    const scale = longest > maxSide ? maxSide / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      appDebugLog('photo', 'compress', performance.now() - t0, {
        skipped: 'no-2d',
        inBytes: file.size,
      });
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const tEncode = performance.now();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    const encodeMs = performance.now() - tEncode;

    if (!blob) {
      appDebugLog('photo', 'compress', performance.now() - t0, {
        skipped: 'toBlob-null',
        inBytes: file.size,
      });
      return file;
    }

    // Keep original when already small enough and re-encode did not shrink
    if (scale === 1 && blob.size >= file.size) {
      appDebugLog('photo', 'compress', performance.now() - t0, {
        decodeMs: Math.round(decodeMs),
        encodeMs: Math.round(encodeMs),
        keptOriginal: 1,
        inBytes: file.size,
      });
      return file;
    }

    appDebugLog('photo', 'compress', performance.now() - t0, {
      decodeMs: Math.round(decodeMs),
      encodeMs: Math.round(encodeMs),
      inBytes: file.size,
      outBytes: blob.size,
    });

    return new File([blob], toJpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    appDebugLog('photo', 'compress', performance.now() - t0, {
      skipped: 'error',
      inBytes: file.size,
    });
    return file;
  }
}
