import { useEffect, useState } from 'react';
import { Utensils, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { cn } from '@/shared/lib';
import { Button, Card, CardContent, Skeleton } from '@/shared/ui';
import { useRetryAnalyzeMeal } from '@/features/save-meal';
import { useAuthStore } from '@/features/auth';
import { useMealImage } from '../model/useMealImage';
import { resolveMealImageUris } from '../model/resolveMealImageUris';
import { mealDisplayName } from '../model/mealDisplayName';
import { mealFoodTypeUi } from '../model/mealFoodType';
import {
  mealShowsAnalyzeLoader,
  mealShowsAnalyzeRetry,
} from '../model/mealAnalyzeUi';
import { FoodMacrosBadges } from './FoodMacrosBadges';

/** After this, an analyzing card is treated as stuck and shows «Повторить». */
const ANALYZING_STALE_MS = 45_000;

interface MealCardProps {
  meal: Meal;
  entranceKey?: string;
}

export function MealCard({ meal, entranceKey }: MealCardProps) {
  const navigate = useNavigate();
  const retry = useRetryAnalyzeMeal();
  const photoCount = resolveMealImageUris(meal).length;
  const imageSrc = useMealImage(meal.imageUri);
  const isAnalyzing = mealShowsAnalyzeLoader(meal);
  const isError = mealShowsAnalyzeRetry(meal);
  const foodTypeUi =
    !isAnalyzing && !isError && photoCount === 0
      ? mealFoodTypeUi(meal.foodType)
      : undefined;
  const FoodTypeIcon = foodTypeUi?.Icon;
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
    if (!isAnalyzing || meal.analyzeJobId) {
      setAnalyzingStale(false);
      return;
    }
    setAnalyzingStale(false);
    const timer = window.setTimeout(() => {
      setAnalyzingStale(true);
    }, ANALYZING_STALE_MS);
    return () => window.clearTimeout(timer);
  }, [isAnalyzing, meal.analyzeJobId, meal.id]);

  const showRetry = isError || (isAnalyzing && analyzingStale);
  const canOpenDetail = !isAnalyzing && !isError;
  const showBorderLoader = isAnalyzing && !analyzingStale;
  const hasPartialName =
    Boolean(meal.name?.trim() && meal.name !== 'Анализ…');
  const hasPartialMacros = meal.totalCalories > 0;
  const hasPartialPreview =
    showBorderLoader && (hasPartialName || hasPartialMacros);
  const errorLabel =
    meal.analyzeErrorCode === 'NO_FOOD_DETECTED'
      ? 'На фото не обнаружена еда…'
      : meal.analyzeErrorCode === 'QUOTA_EXCEEDED'
        ? 'Лимит генераций исчерпан…'
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
    if (meal.analyzeErrorCode === 'QUOTA_EXCEEDED') {
      navigate(useAuthStore.getState().userToken ? '/subscribe' : '/login');
      return;
    }
    void retry(meal.id);
  }

  const quotaCtaLabel =
    meal.analyzeErrorCode === 'QUOTA_EXCEEDED'
      ? useAuthStore.getState().userToken
        ? 'Оформить лицензию'
        : 'Войти'
      : 'Повторить';

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
      aria-busy={showBorderLoader}
      className={cn(
        'relative overflow-hidden',
        canOpenDetail && 'cursor-pointer',
        showBorderLoader && 'border-transparent',
      )}
    >
      {showBorderLoader ? (
        <div className="meal-card-border-loader" aria-hidden />
      ) : null}
      <CardContent className="relative z-10 flex justify-between flex-auto gap-3 p-2 ">
        <div
          className={cn(
            'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-emerald-100',
            foodTypeUi && `rounded-2xl ${foodTypeUi.tileClass}`,
          )}
          aria-label={foodTypeUi?.label}
          role={foodTypeUi ? 'img' : undefined}
        >
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : showBorderLoader ? (
            <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          ) : isError || analyzingStale ? (
            <AlertCircle className="h-6 w-6 text-destructive" />
          ) : foodTypeUi && FoodTypeIcon ? (
            <FoodTypeIcon
              className={`h-7 w-7 ${foodTypeUi.iconClass}`}
              aria-hidden
            />
          ) : (
            <Utensils className="h-6 w-6 text-emerald-600" />
          )}
          {photoCount > 1 && (
            <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
              {photoCount}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 min-w-0 space-y-1.5 justify-between">
          {showBorderLoader ? (
            hasPartialPreview ? (
              <>
                <div className="flex gap-2 justify-between text-sm font-medium min-w-0">
                  <span className="truncate">
                    {hasPartialName ? title : 'Анализ еды…'}
                  </span>
                  <span className="ml-1.5 shrink-0 font-normal text-muted-foreground">
                    {time}
                  </span>
                </div>
                {hasPartialMacros ? (
                  <FoodMacrosBadges
                    density="compact"
                    macroDecimals={0}
                    calories={meal.totalCalories}
                    protein={totals.protein}
                    fat={totals.fat}
                    carbs={totals.carbs}
                    fiber={totals.fiber}
                    entranceKey={entranceKey}
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Анализ еды…</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{time}</span>
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
                {quotaCtaLabel}
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
                macroDecimals={0}
                calories={meal.totalCalories}
                protein={totals.protein}
                fat={totals.fat}
                carbs={totals.carbs}
                fiber={totals.fiber}
                entranceKey={entranceKey}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
