import type { Meal } from '@ai-food/shared-types';
import { mealDisplayName, useDiaryStore } from '@/entities/meal';
import { Card, CardContent, CardHeader } from '@/shared/ui';
import { cn, formatDate } from '@/shared/lib';

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

function MacroBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-emerald-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export interface MealSummaryEditorProps {
  meal: Meal;
}

export function MealSummaryEditor({ meal }: MealSummaryEditorProps) {
  const updateMeal = useDiaryStore((s) => s.updateMeal);
  const updateMealNutrition = useDiaryStore((s) => s.updateMealNutrition);

  const dishName = mealDisplayName(meal);
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totals = meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <input
          type="text"
          aria-label="Название блюда"
          className={cn(inputClassName, 'text-base font-semibold')}
          value={dishName}
          onChange={(e) => updateMeal(meal.id, { name: e.target.value })}
        />
        <p className="text-sm text-muted-foreground">
          {formatDate(meal.timestamp)} в {time}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Калории, ккал</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            aria-label="Калории блюда"
            className={cn(
              inputClassName,
              'text-2xl font-semibold text-emerald-600',
            )}
            value={meal.totalCalories}
            onChange={(e) =>
              updateMealNutrition(meal.id, {
                calories: parseNutrient(e.target.value),
              })
            }
          />
        </label>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Белки, г</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Белки блюда"
                className={cn(inputClassName, 'w-24 text-right')}
                value={Number(totals.protein.toFixed(1))}
                onChange={(e) =>
                  updateMealNutrition(meal.id, {
                    protein: parseNutrient(e.target.value),
                  })
                }
              />
            </div>
            <MacroBar value={totals.protein} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Углеводы, г</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Углеводы блюда"
                className={cn(inputClassName, 'w-24 text-right')}
                value={Number(totals.carbs.toFixed(1))}
                onChange={(e) =>
                  updateMealNutrition(meal.id, {
                    carbs: parseNutrient(e.target.value),
                  })
                }
              />
            </div>
            <MacroBar value={totals.carbs} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Жиры, г</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label="Жиры блюда"
                className={cn(inputClassName, 'w-24 text-right')}
                value={Number(totals.fat.toFixed(1))}
                onChange={(e) =>
                  updateMealNutrition(meal.id, {
                    fat: parseNutrient(e.target.value),
                  })
                }
              />
            </div>
            <MacroBar value={totals.fat} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
