const SUPPORTED_IMAGE_MIME = /^image\/(jpeg|jpg|png|webp)$/i;

function normalizeMime(type: string): string {
  const mime = type.trim().toLowerCase();
  if (!SUPPORTED_IMAGE_MIME.test(mime)) {
    return 'image/jpeg';
  }
  return mime === 'image/jpg' ? 'image/jpeg' : mime;
}

/** Build a gateway-valid data URL from a File (always image/jpeg|png|webp). */
export async function fileToImageDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Не удалось прочитать файл'));
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });

  const comma = raw.indexOf(',');
  if (comma === -1) {
    throw new Error('Не удалось прочитать файл');
  }

  const headerMime = raw.slice(5, comma).toLowerCase();
  const base64 = raw.slice(comma + 1);
  const mime = SUPPORTED_IMAGE_MIME.test(file.type)
    ? normalizeMime(file.type)
    : SUPPORTED_IMAGE_MIME.test(headerMime)
      ? normalizeMime(headerMime)
      : 'image/jpeg';

  return `data:${mime};base64,${base64}`;
}
