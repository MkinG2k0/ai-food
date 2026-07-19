import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatItemGrams,
  resolveItemGrams,
  sanitizeGrams,
  sanitizeNutrient,
  useDiaryStore,
} from '@/entities/meal';
import {
  useConfirmDeleteMealItem,
  DeleteItemConfirmSheet,
} from '@/features/edit-meal';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export function FoodItemEditPage() {
  const navigate = useNavigate();
  const { mealId, itemId } = useParams<{ mealId: string; itemId: string }>();
  const meals = useDiaryStore((s) => s.meals);
  const updateMealItem = useDiaryStore((s) => s.updateMealItem);
  const meal = meals.find((m) => m.id === mealId);
  const item = meal?.items.find((i) => i.id === itemId);
  const {
    isOpen: isItemDeleteOpen,
    openConfirm: openItemDelete,
    closeConfirm: closeItemDelete,
    confirmDelete: confirmItemDelete,
  } = useConfirmDeleteMealItem();

  useEffect(() => {
    if (!mealId) {
      navigate('/', { replace: true });
      return;
    }
    if (!meal || meal.status === 'analyzing') {
      navigate('/', { replace: true });
      return;
    }
    if (!item) {
      navigate(`/meal/${mealId}`, { replace: true });
    }
  }, [meal, item, mealId, navigate]);

  if (!meal || meal.status === 'analyzing' || !item || !mealId || !itemId) {
    return null;
  }

  function patchNumber(
    field: 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber',
    raw: string,
  ) {
    updateMealItem(mealId!, itemId!, {
      [field]: sanitizeNutrient(Number(raw)),
    });
  }

  function handleConfirmItemDelete() {
    const deleted = confirmItemDelete();
    if (deleted) {
      toast.success('Ингредиент удалён');
      navigate(-1);
    }
  }

  function handleBack() {
    navigate(-1);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center px-4 py-4 border-b">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold ml-2 flex-1">Ингредиент</h1>
      </header>

      <main className="flex-1 px-4 py-4 space-y-4">
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">{item.name}</p>
          <label className="block space-y-1">
            <span className="block text-xs text-muted-foreground">Граммы</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              aria-label="Граммы"
              className={cn(inputClassName, 'text-center tabular-nums max-w-[8rem]')}
              value={formatItemGrams(resolveItemGrams(item))}
              onChange={(e) =>
                updateMealItem(mealId, itemId, {
                  grams: sanitizeGrams(Number(e.target.value.replace(',', '.'))),
                })
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                label: 'Ккал',
                ariaLabel: 'Калории',
                field: 'calories' as const,
                value: item.calories,
              },
              {
                label: 'Б',
                ariaLabel: 'Белки',
                field: 'protein' as const,
                value: item.protein,
              },
              {
                label: 'У',
                ariaLabel: 'Углеводы',
                field: 'carbs' as const,
                value: item.carbs,
              },
              {
                label: 'Ж',
                ariaLabel: 'Жиры',
                field: 'fat' as const,
                value: item.fat,
              },
              {
                label: 'Кл',
                ariaLabel: 'Клетчатка',
                field: 'fiber' as const,
                value: item.fiber ?? 0,
              },
            ] as const
          ).map((macro) => (
            <label key={macro.field} className="min-w-0 space-y-1">
              <span className="block text-xs text-muted-foreground">
                {macro.label}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                aria-label={macro.ariaLabel}
                className={cn(inputClassName, 'text-center tabular-nums')}
                value={Math.round(macro.value)}
                onChange={(e) => patchNumber(macro.field, e.target.value)}
              />
            </label>
          ))}
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={() => openItemDelete(mealId, itemId)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить ингредиент
        </Button>
      </main>

      <DeleteItemConfirmSheet
        open={isItemDeleteOpen}
        onClose={closeItemDelete}
        onConfirm={handleConfirmItemDelete}
      />
    </div>
  );
}
