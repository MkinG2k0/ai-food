import {
  compressImageForAi,
  fileToImageDataUrl,
  loadMealImageAsFile,
} from '@/shared/lib';

/** Safe JSON body budget under gateway 10mb limit. */
export const REFINE_IMAGE_DATA_URL_MAX_CHARS = 8_000_000;

export async function prepareRefineMealImageDataUrl(
  imageUri: string,
): Promise<string | undefined> {
  const file = await loadMealImageAsFile(imageUri);
  if (!file) {
    return undefined;
  }

  try {
    const compressed = await compressImageForAi(file);
    const dataUrl = await fileToImageDataUrl(compressed);
    if (dataUrl.length > REFINE_IMAGE_DATA_URL_MAX_CHARS) {
      return undefined;
    }
    return dataUrl;
  } catch {
    return undefined;
  }
}