import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export class NutritionReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NutritionReportError';
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve(base64);
    };
    reader.onerror = () =>
      reject(new NutritionReportError('Не удалось подготовить PDF'));
    reader.readAsDataURL(blob);
  });
}

export async function saveNutritionReportPdf(
  blob: Blob,
  filename: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      recursive: true,
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.parentNode?.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function shareNutritionReportPdf(
  blob: Blob,
  filename: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const data = await blobToBase64(blob);
    const path = `reports/${filename}`;
    await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });
    await Share.share({
      title: 'Отчёт о питании',
      url: uri,
      dialogTitle: 'Отправить отчёт',
    });
    return;
  }

  const file = new File([blob], filename, { type: 'application/pdf' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: 'Отчёт о питании',
      files: [file],
    });
    return;
  }

  throw new NutritionReportError(
    'Поделиться недоступно в этом браузере — используйте «Скачать PDF»',
  );
}
