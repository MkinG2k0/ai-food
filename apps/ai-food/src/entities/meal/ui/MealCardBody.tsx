import { Loader2, AlertCircle, Utensils } from 'lucide-react';
import type { Meal } from '@ai-food/shared-types';
import { cn } from '@/shared/lib';
import { Skeleton } from '@/shared/ui';
import { mealDisplayName } from '../model/mealDisplayName';
import { mealFoodTypeUi } from '../model/mealFoodType';
import { FoodMacrosBadges } from './FoodMacrosBadges';
import { MealCardErrorContent } from './MealCardErrorContent';

export interface MealCardBodyProps {
  meal: Meal;
  time: string;
  imageSrc: string | null | undefined;
  imageBroken: boolean;
  photoCount: number;
  isAnalyzing: boolean;
  isError: boolean;
  entranceKey?: string;
  className?: string;
  onImageError: () => void;
  onRetry: (e: React.MouseEvent) => void;
  quotaCtaLabel: string;
  errorLabel: string;
}

export function MealCardBody({
  meal,
  time,
  imageSrc,
  imageBroken,
  photoCount,
  isAnalyzing,
  isError,
  entranceKey,
  className,
  onImageError,
  onRetry,
  quotaCtaLabel,
  errorLabel,
}: MealCardBodyProps) {
  const showPhoto = Boolean(imageSrc) && !imageBroken;
  const foodTypeUi =
    !isAnalyzing && !isError && (photoCount === 0 || imageBroken)
      ? mealFoodTypeUi(meal.foodType)
      : undefined;
  const FoodTypeIcon = foodTypeUi?.Icon;
  const title = mealDisplayName(meal);
  const hasPartialName = Boolean(meal.name?.trim() && meal.name !== 'Анализ…');
  const hasPartialMacros = meal.totalCalories > 0;
  const hasPartialPreview = isAnalyzing && (hasPartialName || hasPartialMacros);
  const totals = meal.items.reduce(
    (acc, item) => ({
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + (item.fiber ?? 0),
    }),
    { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  return (
    <div className={cn('flex justify-between flex-auto gap-3 p-2', className)}>
      <div
        className={cn(
          'relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-kbju-kcal-soft',
          foodTypeUi && `rounded-2xl ${foodTypeUi.tileClass}`,
        )}
        aria-label={foodTypeUi?.label}
        role={foodTypeUi ? 'img' : undefined}
      >
        {showPhoto ? (
          <img
            src={imageSrc!}
            alt=""
            className="h-full w-full object-cover"
            onError={onImageError}
          />
        ) : isAnalyzing ? (
          <Loader2 className="h-6 w-6 text-kbju-kcal animate-spin" />
        ) : isError ? (
          <AlertCircle className="h-6 w-6 text-destructive" />
        ) : foodTypeUi && FoodTypeIcon ? (
          <FoodTypeIcon
            className={`h-7 w-7 ${foodTypeUi.iconClass}`}
            aria-hidden
          />
        ) : (
          <Utensils className="h-6 w-6 text-kbju-kcal" />
        )}
        {showPhoto && photoCount > 1 ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
            {photoCount}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col',
          isError ? 'justify-center gap-2' : 'justify-between space-y-1.5',
        )}
      >
        {isAnalyzing ? (
          hasPartialPreview ? (
            <>
              <div className="flex min-w-0 justify-between gap-2 text-sm font-medium">
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
                <MacroSkeletons />
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
                <MacroSkeletons />
              </div>
            </>
          )
        ) : isError ? (
          <MealCardErrorContent
            errorLabel={errorLabel}
            time={time}
            quotaCtaLabel={quotaCtaLabel}
            onRetry={onRetry}
          />
        ) : (
          <>
            <div className="flex min-w-0 justify-between gap-2 text-sm font-medium">
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
    </div>
  );
}

function MacroSkeletons() {
  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
      <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
    </div>
  );
}
