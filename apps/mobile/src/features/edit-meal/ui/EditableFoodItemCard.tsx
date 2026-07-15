import { Trash2 } from 'lucide-react';
import { motion, useMotionValue, animate, type PanInfo } from 'framer-motion';
import type { FoodItem } from '@ai-food/shared-types';
import { useDiaryStore } from '@/entities/meal';
import { Badge, Card, CardContent } from '@/shared/ui';
import { cn } from '@/shared/lib';

const SWIPE_OFFSET_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;
const REVEAL_WIDTH = 96;

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

function parseNutrient(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export interface EditableFoodItemCardProps {
  mealId: string;
  item: FoodItem;
  onRequestDelete: (itemId: string) => void;
}

export function EditableFoodItemCard({
  mealId,
  item,
  onRequestDelete,
}: EditableFoodItemCardProps) {
  const updateMealItem = useDiaryStore((s) => s.updateMealItem);
  const x = useMotionValue(0);

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

  function patchNumber(
    field: 'calories' | 'protein' | 'carbs' | 'fat',
    raw: string,
  ) {
    updateMealItem(mealId, item.id, { [field]: parseNutrient(raw) });
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
        onDragEnd={handleDragEnd}
        className="relative touch-pan-y bg-background"
      >
        <Card>
          <CardContent className="py-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                aria-label="Название ингредиента"
                className={cn(inputClassName, 'flex-1 min-w-0')}
                value={item.name}
                onChange={(e) =>
                  updateMealItem(mealId, item.id, { name: e.target.value })
                }
                onPointerDown={stopDrag}
              />
              <Badge variant="outline" className="shrink-0">
                {item.portion}
              </Badge>
              <button
                type="button"
                aria-label="Удалить ингредиент"
                className="shrink-0 p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                onClick={() => onRequestDelete(item.id)}
                onPointerDown={stopDrag}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Ккал</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  aria-label="Калории"
                  className={inputClassName}
                  value={item.calories}
                  onChange={(e) => patchNumber('calories', e.target.value)}
                  onPointerDown={stopDrag}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Б</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  aria-label="Белки"
                  className={inputClassName}
                  value={item.protein}
                  onChange={(e) => patchNumber('protein', e.target.value)}
                  onPointerDown={stopDrag}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">У</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  aria-label="Углеводы"
                  className={inputClassName}
                  value={item.carbs}
                  onChange={(e) => patchNumber('carbs', e.target.value)}
                  onPointerDown={stopDrag}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Ж</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  aria-label="Жиры"
                  className={inputClassName}
                  value={item.fat}
                  onChange={(e) => patchNumber('fat', e.target.value)}
                  onPointerDown={stopDrag}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
