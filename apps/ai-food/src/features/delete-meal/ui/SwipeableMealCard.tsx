import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { toast } from 'sonner';
import type { Meal } from '@ai-food/shared-types';
import { MealCard } from '@/entities/meal';
import { useConfirmDeleteMeal } from '../model/useConfirmDeleteMeal';
import { DeleteMealConfirmSheet } from './DeleteMealConfirmSheet';

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const DRAG_CLICK_GUARD = 10;
const REVEAL_WIDTH = 96;

interface SwipeableMealCardProps {
  meal: Meal;
}

export function SwipeableMealCard({ meal }: SwipeableMealCardProps) {
  const x = useMotionValue(0);
  const didDrag = useRef(false);
  const { isOpen, openConfirm, closeConfirm, confirmDelete } =
    useConfirmDeleteMeal();

  const isAnalyzing = meal.status === 'analyzing';

  if (isAnalyzing) {
    return <MealCard meal={meal} />;
  }

  function handleDragStart() {
    didDrag.current = false;
  }

  function handleDrag(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    if (Math.abs(info.offset.x) > DRAG_CLICK_GUARD) {
      didDrag.current = true;
    }
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) {
    const shouldConfirm =
      info.offset.x < -SWIPE_OFFSET_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD;

    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });

    if (shouldConfirm) {
      openConfirm(meal.id);
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }

  function handleConfirmDelete() {
    const deletedId = confirmDelete();
    if (deletedId) {
      toast.success('Приём пищи удалён');
    }
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-destructive"
          aria-hidden
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>
        <motion.div
          drag="x"
          style={{ x }}
          dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onClickCapture={handleClickCapture}
          className="relative touch-pan-y bg-background"
        >
          <MealCard meal={meal} />
        </motion.div>
      </div>

      <DeleteMealConfirmSheet
        open={isOpen}
        onClose={closeConfirm}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
