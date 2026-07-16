import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const MEAL_IMAGES_DIR = 'meal-images';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function saveMealImage(file: File): Promise<string> {
  const data = await fileToBase64(file);
  const path = `${MEAL_IMAGES_DIR}/${crypto.randomUUID()}.jpg`;
  await Filesystem.writeFile({ path, data, directory: Directory.Data, recursive: true });
  return path;
}

export async function getMealImageSrc(path: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data });
    return Capacitor.convertFileSrc(uri);
  }
  const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
  if (typeof data === 'string') {
    return `data:image/jpeg;base64,${data}`;
  }
  return URL.createObjectURL(data);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Load a persisted meal image as a File for re-analyze. Returns null on read failure. */
export async function loadMealImageAsFile(path: string): Promise<File | null> {
  try {
    const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
    if (typeof data === 'string' && data.length > 0) {
      const bytes = base64ToUint8Array(data);
      return new File([bytes], 'retry.jpg', { type: 'image/jpeg' });
    }
    if (data instanceof Blob) {
      return new File([data], 'retry.jpg', { type: 'image/jpeg' });
    }
  } catch {
    // Missing or unreadable meal image — caller keeps meal in error
  }
  return null;
}
