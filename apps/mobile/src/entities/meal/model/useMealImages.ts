import { useEffect, useState } from 'react';
import { getMealImageSrc } from '@/shared/lib';

/** Load display URLs for meal photo paths (order preserved; missing → omitted slot kept as null). */
export function useMealImages(imageUris: string[]): (string | null)[] {
  const [srcs, setSrcs] = useState<(string | null)[]>(() =>
    imageUris.map(() => null),
  );

  const key = imageUris.join('\0');

  useEffect(() => {
    const uris = key.length > 0 ? key.split('\0') : [];
    if (uris.length === 0) {
      setSrcs([]);
      return;
    }

    let cancelled = false;
    const objectUrls: string[] = [];
    setSrcs(uris.map(() => null));

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
      if (!cancelled) setSrcs(urls);
    });

    return () => {
      cancelled = true;
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [key]);

  return srcs;
}
