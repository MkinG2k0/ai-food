import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDiaryStore, useMealImage } from '@/entities/meal';
import {
  useConfirmDeleteMeal,
  DeleteMealConfirmSheet,
} from '@/features/delete-meal';
import {
  useConfirmDeleteMealItem,
  DeleteItemConfirmSheet,
  EditableFoodItemCard,
  MealSummaryEditor,
} from '@/features/edit-meal';
import { Button } from '@/shared/ui';

export function MealDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const meals = useDiaryStore((s) => s.meals);
  const meal = meals.find((m) => m.id === id);
  const imageSrc = useMealImage(meal?.imageUri);
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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2 flex-1">Детали приёма</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openMealDelete(meal.id)}
          aria-label="Удалить приём пищи"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
        </Button>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            className="w-full h-56 object-cover rounded-xl"
          />
        )}

        <MealSummaryEditor meal={meal} />

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">Состав</h2>
          {meal.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Нет ингредиентов
            </p>
          ) : (
            meal.items.map((item) => (
              <EditableFoodItemCard
                key={item.id}
                mealId={meal.id}
                item={item}
                onRequestDelete={(itemId) => openItemDelete(meal.id, itemId)}
              />
            ))
          )}
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => openMealDelete(meal.id)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить
        </Button>
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
    </div>
  );
}
