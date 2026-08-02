import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib';
import type { ManualCompositionDraftItem } from '../model/buildManualMeal';

const inputClassName = cn(
  'w-full rounded-md border border-input bg-background px-2 py-1 text-sm',
  'ring-offset-background placeholder:text-muted-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
);

export interface ManualCompositionDraftProps {
  items: ManualCompositionDraftItem[];
  onChange: (items: ManualCompositionDraftItem[]) => void;
}

function emptyItem(): ManualCompositionDraftItem {
  return {
    id: crypto.randomUUID(),
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    grams: 100,
  };
}

function patchItem(
  items: ManualCompositionDraftItem[],
  id: string,
  patch: Partial<ManualCompositionDraftItem>,
): ManualCompositionDraftItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function parseNum(raw: string): number {
  const n = Number(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function ManualCompositionDraft({
  items,
  onChange,
}: ManualCompositionDraftProps) {
  const handleAdd = () => {
    onChange([...items, emptyItem()]);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Состав</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Можно сохранить без состава — или добавить ингредиенты. Итог КБЖУ
          тогда станет суммой позиций.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  className={inputClassName}
                  placeholder="Название"
                  value={item.name}
                  onChange={(e) =>
                    onChange(patchItem(items, item.id, { name: e.target.value }))
                  }
                  aria-label="Название позиции состава"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(item.id)}
                  aria-label="Удалить позицию"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(
                  [
                    ['calories', 'Ккал'],
                    ['protein', 'Б'],
                    ['carbs', 'У'],
                    ['fat', 'Ж'],
                    ['grams', 'г'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="space-y-1">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      className={inputClassName}
                      value={item[field] || ''}
                      onChange={(e) =>
                        onChange(
                          patchItem(items, item.id, {
                            [field]:
                              field === 'grams'
                                ? parseNum(e.target.value)
                                : Math.round(parseNum(e.target.value)),
                          }),
                        )
                      }
                      aria-label={`${label} позиции`}
                    />
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
