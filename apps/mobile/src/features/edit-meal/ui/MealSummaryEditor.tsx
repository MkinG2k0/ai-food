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
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              {
                label: 'Белки',
                ariaLabel: 'Белки блюда',
                value: totals.protein,
                field: 'protein' as const,
              },
              {
                label: 'Углеводы',
                ariaLabel: 'Углеводы блюда',
                value: totals.carbs,
                field: 'carbs' as const,
              },
              {
                label: 'Жиры',
                ariaLabel: 'Жиры блюда',
                value: totals.fat,
                field: 'fat' as const,
              },
            ] as const
          ).map((macro) => (
            <div key={macro.field} className="space-y-1.5 min-w-0">
              <span className="block text-xs text-muted-foreground truncate">
                {macro.label}, г
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label={macro.ariaLabel}
                className={cn(inputClassName, 'text-center tabular-nums')}
                value={Number(macro.value.toFixed(1))}
                onChange={(e) =>
                  updateMealNutrition(meal.id, {
                    [macro.field]: parseNutrient(e.target.value),
                  })
                }
              />
              <MacroBar value={macro.value} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
