/** Max longest edge (px) for Vision / chat image payloads. */
export const AI_IMAGE_MAX_SIDE = 1024;

/** JPEG quality for AI payloads (0–1). */
export const AI_IMAGE_JPEG_QUALITY = 0.8;

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

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) {
      return file;
    }

    // Keep original when already small enough and re-encode did not shrink
    if (scale === 1 && blob.size >= file.size) {
      return file;
    }

    return new File([blob], toJpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
