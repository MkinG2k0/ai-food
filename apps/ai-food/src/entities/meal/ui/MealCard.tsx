import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Meal } from '@ai-food/shared-types';
import { cn } from '@/shared/lib';
import { Card, CardContent } from '@/shared/ui';
import { useRetryAnalyzeMeal } from '@/features/save-meal';
import { useAuthStore } from '@/features/auth';
import { useMealImage } from '../model/useMealImage';
import { resolveMealImageUris } from '../model/resolveMealImageUris';
import { mealDisplayName } from '../model/mealDisplayName';
import {
  mealShowsAnalyzeLoader,
  mealShowsAnalyzeRetry,
} from '../model/mealAnalyzeUi';
import { MealCardBody } from './MealCardBody';

interface MealCardProps {
  meal: Meal;
  entranceKey?: string;
}

function resolveErrorLabel(code: string | undefined): string {
  if (code === 'NO_FOOD_DETECTED') return 'На фото не обнаружена еда…';
  if (code === 'QUOTA_EXCEEDED') return 'Лимит генераций исчерпан…';
  return 'Анализ не завершился…';
}

export function MealCard({ meal, entranceKey }: MealCardProps) {
  const navigate = useNavigate();
  const retry = useRetryAnalyzeMeal();
  const photoCount = resolveMealImageUris(meal).length;
  const imageSrc = useMealImage(meal.imageUri);
  const [imageBroken, setImageBroken] = useState(false);
  const isAnalyzing = mealShowsAnalyzeLoader(meal);
  const isError = mealShowsAnalyzeRetry(meal);
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const canOpenDetail = !isAnalyzing && !isError;
  const title = mealDisplayName(meal);
  const errorLabel = resolveErrorLabel(meal.analyzeErrorCode);
  const quotaCtaLabel =
    meal.analyzeErrorCode === 'QUOTA_EXCEEDED'
      ? useAuthStore.getState().userToken
        ? 'Оформить лицензию'
        : 'Войти'
      : 'Повторить';

  useEffect(() => {
    setImageBroken(false);
  }, [meal.imageUri]);

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

  return (
    <Card
      role={canOpenDetail ? 'button' : undefined}
      tabIndex={canOpenDetail ? 0 : undefined}
      onClick={goToDetail}
      onKeyDown={handleKeyDown}
      aria-label={
        isAnalyzing
          ? 'Анализ еды'
          : isError
            ? `${errorLabel} приёма пищи в ${time}`
            : `${title} в ${time}`
      }
      aria-busy={isAnalyzing}
      className={cn(
        'relative overflow-hidden',
        canOpenDetail && 'cursor-pointer',
        isAnalyzing && 'border-transparent',
      )}
    >
      {isAnalyzing ? (
        <div className="meal-card-border-loader" aria-hidden />
      ) : null}
      <CardContent className="relative z-10 p-0">
        <MealCardBody
          meal={meal}
          time={time}
          imageSrc={imageSrc}
          imageBroken={imageBroken}
          photoCount={photoCount}
          isAnalyzing={isAnalyzing}
          isError={isError}
          entranceKey={entranceKey}
          errorLabel={errorLabel}
          quotaCtaLabel={quotaCtaLabel}
          onImageError={() => setImageBroken(true)}
          onRetry={handleRetry}
        />
      </CardContent>
    </Card>
  );
}
