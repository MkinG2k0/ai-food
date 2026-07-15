import { Utensils, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { Card, CardContent, Skeleton } from '@/shared/ui';
import { useMealImage } from '../model/useMealImage';
import { mealDisplayName } from '../model/mealDisplayName';
import { FoodMacrosBadges } from './FoodMacrosBadges';

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const navigate = useNavigate();
  const imageSrc = useMealImage(meal.imageUri);
  const status = meal.status ?? 'ready';
  const isAnalyzing = status === 'analyzing';
  const isError = status === 'error';
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const title = mealDisplayName(meal);
  const totals = meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }),
    { protein: 0, carbs: 0, fat: 0 },
  );

  function goToDetail() {
    if (isAnalyzing) return;
    navigate(`/meal/${meal.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (isAnalyzing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDetail();
    }
  }

  return (
    <Card
      role={isAnalyzing ? undefined : 'button'}
      tabIndex={isAnalyzing ? undefined : 0}
      onClick={goToDetail}
      onKeyDown={handleKeyDown}
      aria-label={
        isAnalyzing
          ? 'Анализ еды'
          : isError
            ? `Ошибка анализа приёма пищи в ${time}`
            : `${title} в ${time}`
      }
      aria-busy={isAnalyzing}
      className={isAnalyzing ? '' : 'cursor-pointer '}
    >
      <CardContent className="flex justify-between flex-auto gap-3 p-2 ">
        <div className="h-16 w-16 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : isAnalyzing ? (
            <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          ) : isError ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : (
            <Utensils className="h-6 w-6 text-emerald-600" />
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 space-y-1.5 justify-between">
          {isAnalyzing ? (
            <>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                <span className="text-sm text-muted-foreground">Анализ еды…</span>
              </div>
              <Skeleton className="h-4 w-36" />
              <div className="flex flex-wrap gap-1">
                <Skeleton className="h-5 w-14 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </>
          ) : isError ? (
            <>
              <p className="text-sm font-medium text-destructive">
                Ошибка анализа…{' '}
                <span className="font-normal text-muted-foreground">{time}</span>
              </p>
            </>
          ) : (
            <>
              <div className="flex gap-2 justify-between text-sm font-medium min-w-0">
                <span className="truncate">{title}</span>
                <span className="ml-1.5 shrink-0 font-normal text-muted-foreground">
                  {time}
                </span>
              </div>
              <FoodMacrosBadges
                calories={meal.totalCalories}
                protein={totals.protein}
                fat={totals.fat}
                carbs={totals.carbs}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
