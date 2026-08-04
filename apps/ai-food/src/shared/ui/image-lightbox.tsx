import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './button';

export interface ImageLightboxProps {
  open: boolean;
  /** Single image (legacy). Ignored when `srcs` has length > 0. */
  src?: string;
  /** Multiple images; enables prev/next when length > 1. */
  srcs?: string[];
  /** Starting slide when opening multi-image lightbox. */
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({
  open,
  src,
  srcs,
  initialIndex = 0,
  alt = '',
  onClose,
}: ImageLightboxProps) {
  const images =
    srcs && srcs.length > 0 ? srcs : src ? [src] : [];
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(
        Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)),
      );
    }
  }, [open, initialIndex, images.length]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        setIndex((i) => (i - 1 + images.length) % images.length);
      } else if (e.key === 'ArrowRight') {
        setIndex((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, images.length]);

  const current = images[index];
  const multi = images.length > 1;

  return (
    <AnimatePresence>
      {open && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={
            multi
              ? `Просмотр фото, ${index + 1} из ${images.length}`
              : 'Просмотр фото'
          }
        >
          <motion.div
            className="absolute inset-0 bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X className="h-6 w-6" />
          </Button>
          {multi && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white hover:bg-white/10 hover:text-white sm:left-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + images.length) % images.length);
                }}
                aria-label="Предыдущее фото"
              >
                <ChevronLeft className="h-7 w-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white hover:bg-white/10 hover:text-white sm:right-4"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % images.length);
                }}
                aria-label="Следующее фото"
              >
                <ChevronRight className="h-7 w-7" />
              </Button>
            </>
          )}
          <motion.img
            key={current}
            src={current}
            alt={alt}
            className="relative z-10 max-h-[90vh] max-w-[85vw] object-contain rounded-lg sm:max-w-[95vw]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'tween', duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          />
          {multi && (
            <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={
                    i === index
                      ? 'h-1.5 w-1.5 rounded-full bg-white'
                      : 'h-1.5 w-1.5 rounded-full bg-white/40'
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
