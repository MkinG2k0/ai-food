import { useEffect, useState } from 'react';
import { getMealImageSrc } from '@/shared/lib';

export function useMealImage(imageUri?: string): string | null {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUri) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    getMealImageSrc(imageUri).then((url) => {
      if (cancelled) return;
      objectUrl = url;
      setSrc(url);
    });

    return () => {
      cancelled = true;
      if (objectUrl?.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUri]);

  return src;
}
