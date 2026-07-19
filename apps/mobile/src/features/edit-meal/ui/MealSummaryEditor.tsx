import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Meal } from '@ai-food/shared-types';
import {
  formatPortions,
  MAX_PORTIONS,
  mealDisplayName,
  MIN_PORTIONS,
  PORTION_STEP,
  resolveMealPortions,
  useDiaryStore,
} from '@/entities/meal';
import { MicronutrientsBadges } from '@/entities/nutrition';
import { Button, Card, CardContent, CardHeader } from '@/shared/ui';
import { cn, formatDate } from '@/shared/lib';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

function parseNutrient(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function MacroBar({
  value,
  max = 100,
  thick = false,
}: {
  value: number;
  max?: number;
  thick?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div
      className={cn(
        'bg-muted rounded-full overflow-hidden',
        thick ? 'h-2.5' : 'h-1.5',
      )}
    >
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
  const updateMealNutrition = useDiaryStore((s) => s.updateMealNutrition);
  const setMealPortions = useDiaryStore((s) => s.setMealPortions);
  const redefineMealPortions = useDiaryStore((s) => s.redefineMealPortions);
  const [portionsDraft, setPortionsDraft] = useState<string | null>(null);
  const portionsInputRef = useRef<HTMLInputElement>(null);

  const dishName = mealDisplayName(meal);
  const portions = resolveMealPortions(meal);
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totals = meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + (item.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  function commitPortionsRedefine() {
    if (portionsDraft === null) return;
    const parsed = Number(portionsDraft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      redefineMealPortions(meal.id, parsed);
    }
    setPortionsDraft(null);
  }

  return (
    <Card>
      <CardHeader className="space-y-4 pb-2">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{dishName}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(meal.timestamp)} в {time}
          </p>
        </div>
        {meal.healthiness !== undefined && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-muted-foreground">Полезность</span>
                <span className="text-sm tabular-nums font-medium text-foreground">
                  {meal.healthiness}/10
                </span>
              </div>
              <MacroBar value={meal.healthiness} max={10} thick />
            </div>
          </div>
        )}
        {meal.micronutrients && meal.micronutrients.length > 0 && (
          <div>
            <MicronutrientsBadges micronutrients={meal.micronutrients} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-5 pt-2">
        <div className="flex items-end gap-3">
          <label className="block min-w-0 flex-1 space-y-1.5">
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
              value={Math.round(meal.totalCalories)}
              onChange={(e) =>
                updateMealNutrition(meal.id, {
                  calories: parseNutrient(e.target.value),
                })
              }
            />
          </label>
          <div className="shrink-0 space-y-1.5">
            <span className="block text-xs text-muted-foreground text-center">
              Порции
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Уменьшить съеденные порции (меняет КБЖУ)"
                title="Уменьшить съеденное — пересчитать КБЖУ"
                disabled={portions <= MIN_PORTIONS}
                onClick={() => setMealPortions(meal.id, portions - PORTION_STEP)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                ref={portionsInputRef}
                type="text"
                inputMode="decimal"
                aria-label="Исправить число порций без изменения КБЖУ"
                title="Исправить счёт порций (КБЖУ не меняется)"
                aria-live="polite"
                className={cn(
                  inputClassName,
                  'h-9 w-11 px-1 text-center text-base font-semibold tabular-nums',
                )}
                value={portionsDraft ?? formatPortions(portions)}
                onFocus={() => setPortionsDraft(formatPortions(portions))}
                onChange={(e) => setPortionsDraft(e.target.value)}
                onBlur={commitPortionsRedefine}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Увеличить съеденные порции (меняет КБЖУ)"
                title="Увеличить съеденное — пересчитать КБЖУ"
                disabled={portions >= MAX_PORTIONS}
                onClick={() => setMealPortions(meal.id, portions + PORTION_STEP)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
      
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
              {
                label: 'Клетчатка',
                ariaLabel: 'Клетчатка блюда',
                value: totals.fiber,
                field: 'fiber' as const,
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
                value={Math.round(macro.value)}
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
