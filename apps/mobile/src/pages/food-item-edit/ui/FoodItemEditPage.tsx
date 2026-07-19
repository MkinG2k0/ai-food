import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatItemGrams,
  nutrientsFromPer100,
  nutrientsPer100FromPortion,
  resolveItemGrams,
  sanitizeGrams,
  sanitizeNutrient,
  useDiaryStore,
  type NutrientKey,
  type PortionNutrients,
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

const ZERO_DENSITY: PortionNutrients = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

type NutrientMode = 'per100' | 'portion';

const MACRO_FIELDS = [
  {
    label: 'Ккал',
    ariaLabel: 'Калории',
    field: 'calories' as const,
  },
  {
    label: 'Б',
    ariaLabel: 'Белки',
    field: 'protein' as const,
  },
  {
    label: 'У',
    ariaLabel: 'Углеводы',
    field: 'carbs' as const,
  },
  {
    label: 'Ж',
    ariaLabel: 'Жиры',
    field: 'fat' as const,
  },
  {
    label: 'Кл',
    ariaLabel: 'Клетчатка',
    field: 'fiber' as const,
  },
] as const;

function densityFromItem(item: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  grams?: number;
}): PortionNutrients {
  return nutrientsPer100FromPortion({
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber ?? 0,
    grams: resolveItemGrams(item),
  });
}

export function FoodItemEditPage() {
  const navigate = useNavigate();
  const { mealId, itemId } = useParams<{ mealId: string; itemId: string }>();
  const meals = useDiaryStore((s) => s.meals);
  const updateMealItem = useDiaryStore((s) => s.updateMealItem);
  const meal = meals.find((m) => m.id === mealId);
  const item = meal?.items.find((i) => i.id === itemId);
  const [nutrientMode, setNutrientMode] = useState<NutrientMode>('portion');
  /** Local draft while typing grams — avoid rescale on every keystroke. */
  const [gramsDraft, setGramsDraft] = useState<string | null>(null);
  /**
   * Last known KBJU density (per 100 g). Survives grams → 0 so restoring
   * weight (e.g. 0 → 150) can rebuild absolute nutrients.
   */
  const [rememberedDensity, setRememberedDensity] =
    useState<PortionNutrients | null>(null);
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

  // Seed density when opening an ingredient. grams → 0 must NOT clear it.
  useEffect(() => {
    setGramsDraft(null);
    if (!itemId || !mealId) {
      setRememberedDensity(null);
      return;
    }
    const current = useDiaryStore
      .getState()
      .meals.find((m) => m.id === mealId)
      ?.items.find((i) => i.id === itemId);
    if (!current) {
      setRememberedDensity(null);
      return;
    }
    const g = resolveItemGrams(current);
    setRememberedDensity(g > 0 ? densityFromItem(current) : null);
  }, [itemId, mealId]);

  // While grams > 0, keep density in sync with store edits.
  useEffect(() => {
    if (!item) return;
    const g = resolveItemGrams(item);
    if (g <= 0) return;
    setRememberedDensity(densityFromItem(item));
  }, [
    item?.calories,
    item?.protein,
    item?.carbs,
    item?.fat,
    item?.fiber,
    item?.grams,
  ]);

  if (!meal || meal.status === 'analyzing' || !item || !mealId || !itemId) {
    return null;
  }

  const grams = resolveItemGrams(item);
  const per100 =
    grams > 0
      ? densityFromItem(item)
      : (rememberedDensity ?? ZERO_DENSITY);

  function patchNumber(field: NutrientKey, raw: string) {
    const value = sanitizeNutrient(Number(raw));
    const next = {
      calories: field === 'calories' ? value : item!.calories,
      protein: field === 'protein' ? value : item!.protein,
      carbs: field === 'carbs' ? value : item!.carbs,
      fat: field === 'fat' ? value : item!.fat,
      fiber: field === 'fiber' ? value : (item!.fiber ?? 0),
    };
    updateMealItem(mealId!, itemId!, { [field]: value });
    const g = resolveItemGrams(item!);
    if (g > 0) {
      setRememberedDensity(densityFromItem({ ...item!, ...next, grams: g }));
    }
  }

  function patchPer100(field: NutrientKey, raw: string) {
    const nextPer100: PortionNutrients = {
      ...per100,
      [field]: sanitizeNutrient(Number(raw)),
    };
    setRememberedDensity(nextPer100);
    const g = resolveItemGrams(item!);
    if (g > 0) {
      updateMealItem(mealId!, itemId!, nutrientsFromPer100(nextPer100, g));
    }
  }

  function commitGrams(raw: string) {
    const newGrams = sanitizeGrams(Number(raw.replace(',', '.')));
    setGramsDraft(null);

    const density =
      rememberedDensity ??
      (grams > 0 ? densityFromItem(item!) : ZERO_DENSITY);

    if (newGrams === 0) {
      // Absolute portion becomes 0, but density stays in rememberedDensity.
      updateMealItem(mealId!, itemId!, {
        grams: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      });
      return;
    }

    updateMealItem(mealId!, itemId!, {
      grams: newGrams,
      ...nutrientsFromPer100(density, newGrams),
    });
  }

  function handleGramsBlur() {
    if (gramsDraft === null) return;
    commitGrams(gramsDraft);
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
              value={gramsDraft ?? formatItemGrams(grams)}
              onFocus={() => setGramsDraft(formatItemGrams(grams))}
              onChange={(e) => setGramsDraft(e.target.value)}
              onBlur={handleGramsBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
            />
          </label>
        </div>

        <section className="space-y-3">
          <div
            role="tablist"
            aria-label="Режим ввода КБЖУ"
            className="grid grid-cols-2 rounded-lg border border-input bg-muted/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={nutrientMode === 'per100'}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                nutrientMode === 'per100'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setNutrientMode('per100')}
            >
              На 100 г
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={nutrientMode === 'portion'}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                nutrientMode === 'portion'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setNutrientMode('portion')}
            >
              На порцию
            </button>
          </div>

          <div
            role="tabpanel"
            className="grid grid-cols-2 gap-3"
            aria-label={
              nutrientMode === 'per100' ? 'КБЖУ на 100 г' : 'КБЖУ на порцию'
            }
          >
            {MACRO_FIELDS.map((macro) => {
              const isPer100 = nutrientMode === 'per100';
              const value = isPer100
                ? per100[macro.field]
                : macro.field === 'fiber'
                  ? (item.fiber ?? 0)
                  : item[macro.field];
              return (
                <label key={macro.field} className="min-w-0 space-y-1">
                  <span className="block text-xs text-muted-foreground">
                    {macro.label}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    aria-label={
                      isPer100
                        ? `${macro.ariaLabel} на 100 г`
                        : macro.ariaLabel
                    }
                    className={cn(inputClassName, 'text-center tabular-nums')}
                    value={Math.round(value)}
                    onChange={(e) =>
                      isPer100
                        ? patchPer100(macro.field, e.target.value)
                        : patchNumber(macro.field, e.target.value)
                    }
                  />
                </label>
              );
            })}
          </div>
        </section>

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
