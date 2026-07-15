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
