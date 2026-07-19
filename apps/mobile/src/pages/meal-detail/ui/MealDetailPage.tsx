import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, PenLine, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiError } from '@ai-food/shared-types';
import { useDiaryStore, useMealImage } from '@/entities/meal';
import { MealCustomContentBlock } from '@/features/analyze-food';
import {
  useConfirmDeleteMeal,
  DeleteMealConfirmSheet,
} from '@/features/delete-meal';
import {
  useConfirmDeleteMealItem,
  DeleteItemConfirmSheet,
  FoodItemDisplayCard,
  MealSummaryEditor,
} from '@/features/edit-meal';
import { useFavoritesStore } from '@/features/favorites';
import { RefineMealSheet, useRefineMeal } from '@/features/refine-meal';
import { useSettingsStore } from '@/features/settings';
import { Button, ImageLightbox } from '@/shared/ui';
export function MealDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const meals = useDiaryStore((s) => s.meals);
  const meal = meals.find((m) => m.id === id);
  const imageSrc = useMealImage(meal?.imageUri);
  const featureComposition = useSettingsStore((s) => s.featureComposition);
  const isFavorite = useFavoritesStore((s) =>
    meal ? s.isFavorite(meal.id) : false,
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [refineOpen, setRefineOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const refine = useRefineMeal();
  const {
    isOpen: isMealDeleteOpen,
    openConfirm: openMealDelete,
    closeConfirm: closeMealDelete,
    confirmDelete: confirmMealDelete,
  } = useConfirmDeleteMeal();
  const {
    isOpen: isItemDeleteOpen,
    openConfirm: openItemDelete,
    closeConfirm: closeItemDelete,
    confirmDelete: confirmItemDelete,
  } = useConfirmDeleteMealItem();

  useEffect(() => {
    if (!meal || meal.status === 'analyzing') {
      navigate('/', { replace: true });
    }
  }, [meal, navigate]);

  if (!meal || meal.status === 'analyzing') {
    return null;
  }

  const currentMeal = meal;
  const mealId = currentMeal.id;

  function handleConfirmMealDelete() {
    const deletedId = confirmMealDelete();
    if (deletedId) {
      toast.success('Приём пищи удалён');
      navigate('/', { replace: true });
    }
  }

  function handleConfirmItemDelete() {
    const deleted = confirmItemDelete();
    if (deleted) {
      toast.success('Ингредиент удалён');
    }
  }

  async function handleRefine(correction: string) {
    setIsRefining(true);
    try {
      await refine(mealId, correction);
      toast.success('Приём обновлён');
    } catch (error) {
      const apiError = error as Partial<ApiError>;
      toast.error(
        apiError.message ?? 'Не удалось обновить приём. Попробуйте ещё раз.',
      );
    } finally {
      setIsRefining(false);
    }
  }

  const canFavorite = currentMeal.status !== 'error';

  function handleToggleFavorite() {
    const result = toggleFavorite(currentMeal);
    if (result === 'added') {
      toast.success('Добавлено в избранное');
    } else if (result === 'removed') {
      toast.success('Удалено из избранного');
    } else if (result === 'limit') {
      toast.error('Достигнут лимит избранного (50)');
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 pt-safe-header pb-3 border-b">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2 flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">Детали приёма</h1>
        </div>
        {canFavorite && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            aria-label={
              isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'
            }
          >
            <Star
              className={
                isFavorite
                  ? 'h-5 w-5 fill-current text-amber-500'
                  : 'h-5 w-5 text-muted-foreground'
              }
            />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openMealDelete(mealId)}
          aria-label="Удалить приём пищи"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </Button>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5 pb-safe">
        {imageSrc && (
          <button
            type="button"
            className="w-full rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setLightboxOpen(true)}
            aria-label="Открыть фото"
          >
            <img
              src={imageSrc}
              alt=""
              className="w-full aspect-[4/3] object-cover"
            />
          </button>
        )}

        <MealSummaryEditor meal={currentMeal} />

        <MealCustomContentBlock mealId={mealId} />

        <Button
          variant="outline"
          className="w-full"
          disabled={isRefining}
          onClick={() => setRefineOpen(true)}
        >
          {isRefining ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <PenLine className="h-4 w-4 mr-2" />
          )}
          {isRefining ? 'Дополняем…' : 'Дополнить'}
        </Button>

        {featureComposition && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Состав</h2>
            {meal.items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Нет ингредиентов
              </p>
            ) : (
              meal.items.map((item) => (
                <FoodItemDisplayCard
                  key={item.id}
                  mealId={mealId}
                  item={item}
                  onRequestDelete={(itemId) => openItemDelete(mealId, itemId)}
                />
              ))
            )}
          </div>
        )}
      </main>

      <DeleteMealConfirmSheet
        open={isMealDeleteOpen}
        onClose={closeMealDelete}
        onConfirm={handleConfirmMealDelete}
      />
      <DeleteItemConfirmSheet
        open={isItemDeleteOpen}
        onClose={closeItemDelete}
        onConfirm={handleConfirmItemDelete}
      />
      <RefineMealSheet
        open={refineOpen}
        onClose={() => setRefineOpen(false)}
        onSubmit={(correction) => void handleRefine(correction)}
      />
      {imageSrc && (
        <ImageLightbox
          open={lightboxOpen}
          src={imageSrc}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
