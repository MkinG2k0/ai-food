import { useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { FoodItem } from '@ai-food/shared-types';
import { FoodMacrosBadges } from '@/entities/meal';
import { Badge, Card, CardContent } from '@/shared/ui';

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const DRAG_CLICK_GUARD = 10;
const REVEAL_WIDTH = 96;

export interface FoodItemDisplayCardProps {
  mealId: string;
  item: FoodItem;
  onRequestDelete: (itemId: string) => void;
}

export function FoodItemDisplayCard({
  mealId,
  item,
  onRequestDelete,
}: FoodItemDisplayCardProps) {
  const navigate = useNavigate();
  const x = useMotionValue(0);
  const didDrag = useRef(false);

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
      onRequestDelete(item.id);
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (didDrag.current) {
      e.preventDefault();
      e.stopPropagation();
      didDrag.current = false;
    }
  }

  function handleClick() {
    if (didDrag.current) return;
    navigate(`/meal/${mealId}/item/${item.id}`);
  }

  function stopDrag(e: React.PointerEvent) {
    e.stopPropagation();
  }

  return (
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
        <Card
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          className="cursor-pointer"
          aria-label={`Редактировать ${item.name}`}
        >
          <CardContent className="py-3 space-y-2">
            <div className="flex items-center gap-2">
              <p className="flex-1 min-w-0 text-sm font-medium truncate">
                {item.name}
              </p>
              <Badge variant="outline" className="shrink-0">
                {item.portion}
              </Badge>
              <button
                type="button"
                aria-label="Удалить ингредиент"
                className="shrink-0 p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDelete(item.id);
                }}
                onPointerDown={stopDrag}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <FoodMacrosBadges
              calories={item.calories}
              protein={item.protein}
              fat={item.fat}
              carbs={item.carbs}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
