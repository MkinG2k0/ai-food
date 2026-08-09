import { useMemo, useState } from 'react';
import { formatCalories, formatMacro } from '@/shared/lib';
import { Button } from '@/shared/ui';
import {
  defaultBarcodeGrams,
  type OffProduct,
} from '../api/fetchProductByBarcode';
import { scaleOffProductToItem } from '../api/mapOffProductToMeal';

export interface BarcodeProductConfirmProps {
  product: OffProduct;
  onConfirm: (grams: number) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function BarcodeProductConfirm({
  product,
  onConfirm,
  onCancel,
  saving = false,
}: BarcodeProductConfirmProps) {
  const [gramsRaw, setGramsRaw] = useState(() =>
    String(defaultBarcodeGrams(product)),
  );

  const grams = useMemo(() => {
    const n = Number(gramsRaw.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n);
  }, [gramsRaw]);

  const preview = useMemo(
    () => (grams > 0 ? scaleOffProductToItem(product, grams) : null),
    [product, grams],
  );

  return (
    <div className="flex min-h-full flex-1 flex-col gap-5">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="mx-auto h-32 w-32 rounded-xl bg-muted object-contain"
        />
      ) : (
        <div
          className="mx-auto h-32 w-32 rounded-xl bg-muted"
          aria-hidden
        />
      )}

      <div className="space-y-1 text-center">
        <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
        {product.brands ? (
          <p className="text-sm text-muted-foreground">{product.brands}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {formatCalories(product.per100g.calories)} / 100 г · Open Food Facts
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-foreground">Порция, г</span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          step={1}
          value={gramsRaw}
          onChange={(e) => setGramsRaw(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {product.servingSize ? (
          <p className="text-xs text-muted-foreground">
            На упаковке: {product.servingSize}
          </p>
        ) : null}
      </label>

      {preview ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border px-4 py-3.5 text-sm">
          <div className="min-w-0">
            <span className="text-muted-foreground">Ккал</span>
            <p className="font-medium tabular-nums">
              {formatCalories(preview.calories)}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Белки</span>
            <p className="font-medium tabular-nums">
              {formatMacro(preview.protein)}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Жиры</span>
            <p className="font-medium tabular-nums">
              {formatMacro(preview.fat)}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Углеводы</span>
            <p className="font-medium tabular-nums">
              {formatMacro(preview.carbs)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={saving}
        >
          Назад
        </Button>
        <Button
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={grams <= 0 || saving}
          onClick={() => onConfirm(grams)}
        >
          Добавить
        </Button>
      </div>
    </div>
  );
}
