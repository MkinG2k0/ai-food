import { useEffect, useRef, useState } from 'react';
import { useMealImages } from '../model/useMealImages';

export interface MealPhotoSliderProps {
  imageUris: string[];
  onOpen?: (index: number) => void;
}

export function MealPhotoSlider({ imageUris, onOpen }: MealPhotoSliderProps) {
  const { srcs, settled } = useMealImages(imageUris);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const count = imageUris.length;
  const urisKey = imageUris.join('\0');

  const visible = srcs
    .map((src, i) => ({ src, i }))
    .filter(({ src, i }) => Boolean(src) && !failed.has(i));

  useEffect(() => {
    setIndex(0);
    setFailed(new Set());
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [urisKey]);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(Math.min(Math.max(next, 0), Math.max(visible.length - 1, 0)));
  }

  function markFailed(i: number) {
    setFailed((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }

  if (count === 0) return null;

  if (visible.length === 0) {
    if (!settled) {
      return (
        <div className="w-full aspect-[4/3] rounded-xl bg-muted animate-pulse" />
      );
    }
    return null;
  }

  if (visible.length === 1) {
    const { src, i } = visible[0];
    return (
      <button
        type="button"
        className="w-full rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onOpen?.(i)}
        aria-label="Открыть фото"
      >
        <img
          src={src!}
          alt=""
          className="w-full aspect-[4/3] object-cover"
          onError={() => markFailed(i)}
        />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={scrollerRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={handleScroll}
        role="region"
        aria-roledescription="carousel"
        aria-label={`Фото приёма, ${index + 1} из ${visible.length}`}
      >
        {visible.map(({ src, i }) => (
          <button
            key={imageUris[i] ?? i}
            type="button"
            className="w-full shrink-0 snap-center overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            onClick={() => onOpen?.(i)}
            aria-label={`Открыть фото ${i + 1} из ${count}`}
          >
            <img
              src={src!}
              alt=""
              className="w-full aspect-[4/3] object-cover"
              draggable={false}
              onError={() => markFailed(i)}
            />
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {Array.from({ length: visible.length }, (_, i) => (
          <span
            key={i}
            className={
              i === index
                ? 'h-1.5 w-1.5 rounded-full bg-foreground'
                : 'h-1.5 w-1.5 rounded-full bg-muted-foreground/40'
            }
          />
        ))}
      </div>
    </div>
  );
}
