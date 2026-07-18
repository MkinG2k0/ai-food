import { useEffect, useState } from 'react';
import { Utensils, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { Button, Card, CardContent, Skeleton } from '@/shared/ui';
import { useRetryAnalyzeMeal } from '@/features/save-meal';
import { useMealImage } from '../model/useMealImage';
import { mealDisplayName } from '../model/mealDisplayName';
import { FoodMacrosBadges } from './FoodMacrosBadges';

/** After this, an analyzing card is treated as stuck and shows «Повторить». */
const ANALYZING_STALE_MS = 45_000;

interface MealCardProps {
  meal: Meal;
}

export function MealCard({ meal }: MealCardProps) {
  const navigate = useNavigate();
  const retry = useRetryAnalyzeMeal();
  const imageSrc = useMealImage(meal.imageUri);
  const status = meal.status ?? 'ready';
  const isAnalyzing = status === 'analyzing';
  const isError = status === 'error';
  const [analyzingStale, setAnalyzingStale] = useState(false);
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
      fiber: acc.fiber + (item.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalyzingStale(false);
      return;
    }
    setAnalyzingStale(false);
    const timer = window.setTimeout(() => {
      setAnalyzingStale(true);
    }, ANALYZING_STALE_MS);
    return () => window.clearTimeout(timer);
  }, [isAnalyzing, meal.id]);

  const showRetry = isError || (isAnalyzing && analyzingStale);
  const canOpenDetail = !isAnalyzing && !isError;
  const hasPartialName =
    Boolean(meal.name?.trim() && meal.name !== 'Анализ…');
  const hasPartialMacros = meal.totalCalories > 0;
  const hasPartialPreview =
    isAnalyzing && !analyzingStale && (hasPartialName || hasPartialMacros);
  const errorLabel =
    meal.analyzeErrorCode === 'NO_FOOD_DETECTED'
      ? 'На фото не обнаружена еда…'
      : isError
        ? 'Ошибка анализа…'
        : 'Анализ не завершился…';

  function goToDetail() {
    if (!canOpenDetail) return;
    navigate(`/meal/${meal.id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!canOpenDetail) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDetail();
    }
  }

  function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    void retry(meal.id);
  }

  return (
    <Card
      role={canOpenDetail ? 'button' : undefined}
      tabIndex={canOpenDetail ? 0 : undefined}
      onClick={goToDetail}
      onKeyDown={handleKeyDown}
      aria-label={
        isAnalyzing
          ? analyzingStale
            ? `Анализ не завершился, ${time}`
            : 'Анализ еды'
          : isError
            ? `${errorLabel} приёма пищи в ${time}`
            : `${title} в ${time}`
      }
      aria-busy={isAnalyzing && !analyzingStale}
      className={canOpenDetail ? 'cursor-pointer ' : ''}
    >
      <CardContent className="flex justify-between flex-auto gap-3 p-2 ">
        <div className="h-20 w-20 rounded-md bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : isAnalyzing && !analyzingStale ? (
            <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          ) : isError || analyzingStale ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : (
            <Utensils className="h-6 w-6 text-emerald-600" />
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 space-y-1.5 justify-between">
          {isAnalyzing && !analyzingStale ? (
            hasPartialPreview ? (
              <>
                <div className="flex gap-2 justify-between text-sm font-medium min-w-0">
                  <span className="truncate flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 animate-spin" />
                    {hasPartialName ? title : 'Анализ еды…'}
                  </span>
                  <span className="ml-1.5 shrink-0 font-normal text-muted-foreground">
                    {time}
                  </span>
                </div>
                {hasPartialMacros ? (
                  <FoodMacrosBadges
                    density="compact"
                    calories={meal.totalCalories}
                    protein={totals.protein}
                    fat={totals.fat}
                    carbs={totals.carbs}
                    fiber={totals.fiber}
                  />
                ) : (
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="text-sm text-muted-foreground">Анализ еды…</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
                  <Skeleton className="h-5 w-14 shrink-0" />
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
                  </div>
                </div>
              </>
            )
          ) : showRetry ? (
            <>
              <p className="text-sm font-medium text-destructive">
                {errorLabel}{' '}
                <span className="font-normal text-muted-foreground">{time}</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={handleRetry}
              >
                Повторить
              </Button>
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
                density="compact"
                calories={meal.totalCalories}
                protein={totals.protein}
                fat={totals.fat}
                carbs={totals.carbs}
                fiber={totals.fiber}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
