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
                onClick={() => onRequestDelete(item.id)}
                onPointerDown={stopDrag}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  {
                    label: 'Ккал',
                    ariaLabel: 'Калории',
                    field: 'calories' as const,
                    value: item.calories,
                  },
                  {
                    label: 'Б',
                    ariaLabel: 'Белки',
                    field: 'protein' as const,
                    value: item.protein,
                  },
                  {
                    label: 'У',
                    ariaLabel: 'Углеводы',
                    field: 'carbs' as const,
                    value: item.carbs,
                  },
                  {
                    label: 'Ж',
                    ariaLabel: 'Жиры',
                    field: 'fat' as const,
                    value: item.fat,
                  },
                ] as const
              ).map((macro) => (
                <label key={macro.field} className="min-w-0 space-y-1">
                  <span className="block text-xs text-muted-foreground">
                    {macro.label}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={macro.ariaLabel}
                    className={cn(inputClassName, 'text-center tabular-nums')}
                    value={macro.value}
                    onChange={(e) => patchNumber(macro.field, e.target.value)}
                    onPointerDown={stopDrag}
                  />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
