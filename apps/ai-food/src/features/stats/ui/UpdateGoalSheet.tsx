import { useEffect, useState } from 'react';
import { BottomSheet, Button } from '@/shared/ui';

const MIN = 20;
const MAX = 300;

function parseKgDraft(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  if (rounded < MIN || rounded > MAX) return null;
  return rounded;
}

export interface UpdateGoalSheetProps {
  open: boolean;
  onClose: () => void;
  initialGoalKg: number;
  currentKg: number;
  onSave: (goalKg: number) => void;
}

export function UpdateGoalSheet({
  open,
  onClose,
  initialGoalKg,
  currentKg,
  onSave,
}: UpdateGoalSheetProps) {
  const [goalText, setGoalText] = useState(String(initialGoalKg));
  const parsedGoal = parseKgDraft(goalText);

  useEffect(() => {
    if (!open) return;
    setGoalText(String(initialGoalKg));
  }, [open, initialGoalKg]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="w-full space-y-5 px-2 py-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Обновить цель
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Сейчас {currentKg.toFixed(1)} кг. Укажите новый целевой вес.
          </p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Новая цель</span>
          <div className="flex items-baseline gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={MIN}
              max={MAX}
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
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
            disabled={parsedGoal == null}
            onClick={() => {
              if (parsedGoal == null) return;
              onSave(parsedGoal);
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
