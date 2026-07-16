import { useEffect, useState } from 'react';
import { BottomSheet, Button } from '@/shared/ui';

const MIN = 20;
const MAX = 300;

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateInputValue(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export interface LogWeightSheetProps {
  open: boolean;
  onClose: () => void;
  initialKg: number;
  onSave: (kg: number, date: Date) => void;
}

export function LogWeightSheet({
  open,
  onClose,
  initialKg,
  onSave,
}: LogWeightSheetProps) {
  const today = toDateInputValue(new Date());
  const [kg, setKg] = useState(initialKg);
  const [dateValue, setDateValue] = useState(today);

  useEffect(() => {
    if (!open) return;
    setKg(initialKg);
    setDateValue(toDateInputValue(new Date()));
  }, [open, initialKg]);

  function clamp(raw: number): number {
    if (Number.isNaN(raw)) return MIN;
    return Math.min(MAX, Math.max(MIN, Math.round(raw * 10) / 10));
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="w-full space-y-5 px-2 py-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Записать вес</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите день и сохраните значение — оно появится на графике.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Дата</span>
          <input
            type="date"
            value={dateValue}
            max={today}
            onChange={(e) => setDateValue(e.target.value || today)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base tabular-nums"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Вес</span>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={MIN}
              max={MAX}
              value={kg}
              onChange={(e) => setKg(clamp(Number(e.target.value)))}
              className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-center text-2xl font-bold tabular-nums"
            />
            <span className="text-muted-foreground">кг</span>
          </div>
        </label>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onSave(kg, parseDateInputValue(dateValue));
              onClose();
            }}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
