import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ManualCompositionDraft,
  useSaveManualMeal,
  type ManualCompositionDraftItem,
} from '@/features/manual-entry';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

function parseNutrient(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function parseGrams(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function ManualEntryPage() {
  const navigate = useNavigate();
  const saveManualMeal = useSaveManualMeal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [grams, setGrams] = useState(100);
  const [composition, setComposition] = useState<ManualCompositionDraftItem[]>([]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const compositionTotals = useMemo(() => {
    return composition.reduce(
      (acc, item) => ({
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
        fiber: acc.fiber + (item.fiber || 0),
        grams: acc.grams + (item.grams || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, grams: 0 },
    );
  }, [composition]);

  const compositionActive = composition.length > 0;
  const displayCalories = compositionActive ? compositionTotals.calories : calories;
  const displayProtein = compositionActive ? compositionTotals.protein : protein;
  const displayCarbs = compositionActive ? compositionTotals.carbs : carbs;
  const displayFat = compositionActive ? compositionTotals.fat : fat;
  const displayFiber = compositionActive ? compositionTotals.fiber : fiber;
  const displayGrams = compositionActive ? compositionTotals.grams : grams;

  const compositionValid =
    !compositionActive ||
    composition.every((item) => item.name.trim() && item.calories > 0);

  const canSave =
    name.trim().length > 0 &&
    compositionValid &&
    (compositionActive ? true : calories > 0) &&
    !saving;

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setImage(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.currentTarget.value = '';
  };

  const handleRemovePhoto = () => {
    setImage(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const mealId = await saveManualMeal({
        name,
        calories: compositionActive ? compositionTotals.calories : calories,
        protein: compositionActive ? compositionTotals.protein : protein,
        carbs: compositionActive ? compositionTotals.carbs : carbs,
        fat: compositionActive ? compositionTotals.fat : fat,
        fiber: compositionActive ? compositionTotals.fiber : fiber,
        grams: compositionActive ? compositionTotals.grams : grams,
        composition,
        image,
      });
      if (!mealId) return;
      navigate(`/meal/${mealId}`, { replace: true });
    } catch {
      toast.error('Не удалось сохранить фото');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Вручную</h1>
      </header>

      <main className="flex-1 space-y-6 px-4 py-4 pb-28">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Фото</h2>
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="Фото блюда"
                className="h-48 w-full rounded-xl object-cover"
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" onClick={handlePickPhoto}>
                  Заменить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemovePhoto}
                  className="gap-1 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Убрать
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-start gap-3"
              onClick={handlePickPhoto}
            >
              <ImagePlus className="h-5 w-5 text-emerald-600" />
              Добавить фото
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Выбор фото"
          />
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="manual-name">
            Название
          </label>
          <input
            id="manual-name"
            className={inputClassName}
            placeholder="Напр.: овсянка с ягодами"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">КБЖУ</h2>
          {compositionActive ? (
            <p className="text-xs text-muted-foreground">
              Считается из состава
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ['calories', 'Ккал', displayCalories, setCalories, parseNutrient],
                ['protein', 'Белки', displayProtein, setProtein, parseNutrient],
                ['carbs', 'Углеводы', displayCarbs, setCarbs, parseNutrient],
                ['fat', 'Жиры', displayFat, setFat, parseNutrient],
                ['fiber', 'Клетчатка', displayFiber, setFiber, parseNutrient],
                ['grams', 'Граммы', displayGrams, setGrams, parseGrams],
              ] as const
            ).map(([key, label, value, setter, parser]) => (
              <label key={key} className="space-y-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  readOnly={compositionActive}
                  disabled={compositionActive}
                  className={inputClassName}
                  value={value || ''}
                  onChange={(e) => setter(parser(e.target.value))}
                  aria-label={label}
                />
              </label>
            ))}
          </div>
        </section>

        <ManualCompositionDraft items={composition} onChange={setComposition} />
      </main>

      <div className="sticky bottom-0 border-t bg-background px-4 py-4">
        <Button
          type="button"
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!canSave}
          onClick={() => void handleSave()}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
