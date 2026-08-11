import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  type PanInfo,
} from 'framer-motion';

const DISMISS_OFFSET = 100;
const DISMISS_VELOCITY = 500;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (!open) return;
    void controls.start({
      y: 0,
      transition: { type: 'tween', duration: 0.25 },
    });
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, controls]);

  async function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const shouldClose =
      info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY;

    if (shouldClose) {
      await controls.start({
        y: '100%',
        transition: { type: 'tween', duration: 0.2 },
      });
      onClose();
      return;
    }

    void controls.start({
      y: 0,
      transition: { type: 'spring', stiffness: 400, damping: 35 },
    });
  }

  // Portal to body: sheets mount inside scroll/overflow parents (e.g. Home
  // main), which clip `position: fixed` and leave header/safe-area undimmed.
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-md rounded-t-2xl bg-background p-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.75rem))] shadow-lg"
            initial={{ y: '100%' }}
            animate={controls}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
          >
            <div
              className="mx-auto mb-4 flex h-5 w-full cursor-grab items-center justify-center active:cursor-grabbing"
              aria-hidden
            >
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
