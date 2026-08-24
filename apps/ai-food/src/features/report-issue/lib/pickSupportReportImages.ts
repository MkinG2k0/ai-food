import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { mediaResultToFile } from '@/shared/lib/takePhoto';

function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code).toLowerCase() : '';
  if (code.includes('cancel')) return true;
  const message = 'message' in error ? String(error.message).toLowerCase() : '';
  return message.includes('cancel') || message.includes('cancelled');
}

/** Pick one or more images from the device gallery (Capacitor native only). */
export async function pickSupportReportImagesFromGallery(
  maxCount: number,
): Promise<File[]> {
  if (!Capacitor.isNativePlatform() || maxCount <= 0) {
    return [];
  }

  try {
    const { results } = await Camera.chooseFromGallery({
      quality: 75,
      allowMultipleSelection: maxCount > 1,
      limit: maxCount,
    });

    const files: File[] = [];
    for (const item of results) {
      files.push(await mediaResultToFile(item));
    }
    return files;
  } catch (error) {
    if (isUserCancelled(error)) return [];
    throw error;
  }
}
