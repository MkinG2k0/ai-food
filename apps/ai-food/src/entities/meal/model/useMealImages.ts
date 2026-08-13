import { useEffect, useState } from 'react';
import { getMealImageSrc } from '@/shared/lib';

export interface MealImagesResult {
  srcs: (string | null)[];
  /** False while filesystem/network lookup is in flight. */
  settled: boolean;
}

/** Load display URLs for meal photo paths (order preserved; missing → omitted slot kept as null). */
export function useMealImages(imageUris: string[]): MealImagesResult {
  const [srcs, setSrcs] = useState<(string | null)[]>(() =>
    imageUris.map(() => null),
  );
  const [settled, setSettled] = useState(() => imageUris.length === 0);

  const key = imageUris.join('\0');

  useEffect(() => {
    const uris = key.length > 0 ? key.split('\0') : [];
    if (uris.length === 0) {
      setSrcs([]);
      setSettled(true);
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    setSrcs(uris.map(() => null));
    setSettled(false);

    void Promise.all(
      uris.map(async (uri) => {
        try {
          const url = await getMealImageSrc(uri);
          if (url.startsWith('blob:')) objectUrls.push(url);
          return url;
        } catch {
          return null;
        }
      }),
    ).then((urls) => {
      if (!cancelled) {
        setSrcs(urls);
        setSettled(true);
      }
    });

    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [key]);

  return { srcs, settled };
}
